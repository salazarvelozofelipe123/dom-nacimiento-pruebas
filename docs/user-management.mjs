// Identity remains the Firebase UID. Email is a verified contact, never a key.
const rolesAllowed=['administrativo','profesional','director'];
const requireValue=(v,m)=>{if(!v)throw Error(m);};
export const emailKey=v=>String(v||'').trim().toLowerCase();
export function effectiveRoles(profile,now=Date.now()){
 const roles=[...(profile?.roles||[])],d=profile?.delegation;
 if(profile?.enabled===true&&d&&d.startMs<=Number(now)&&Number(now)<d.endMs&&!roles.includes('director'))roles.push('director');
 return roles;
}
export function googleIdentity(auth){
 requireValue(auth?.uid&&auth.token?.email_verified===true&&auth.token?.email,'Verifica tu correo antes de operar con el sistema.');
 requireValue(auth.token.firebase?.sign_in_provider==='google.com','El acceso municipal requiere iniciar sesión con Google.');
 return {uid:auth.uid,email:emailKey(auth.token.email),name:String(auth.token.name||'Funcionario').slice(0,180),authTime:Number(auth.token.auth_time||0)};
}
export function sessionIssue(profile,auth){
 const cutoff=Number(profile?.sessionValidAfter||0);
 return cutoff&&Number(auth.token?.auth_time||0)<=cutoff?'La sesión fue revocada. Ingresa nuevamente con Google.':'';
}
export function accessChange(prior,p,actor,now){
 requireValue(actor?.enabled===true&&actor.baseRoles?.includes('director'),'Solo el director titular puede administrar las cuentas.');
 requireValue(prior&&p.expectedRevision===(prior.accessRevision||0),'La cuenta cambió. Actualiza antes de guardar.');
 requireValue(p.uid!==actor.id,'No puedes modificar tus propios permisos ni deshabilitar tu cuenta.');
 requireValue(typeof p.reason==='string'&&p.reason.trim().length>0&&p.reason.length<=800,'Indica el motivo del cambio de acceso.');
 requireValue(['approve','permissions','disable','reactivate','delegate','endDelegation'].includes(p.action),'Acción de acceso no válida.');
 let next={...prior},revokes=false;
 if(['approve','permissions','reactivate'].includes(p.action)){
  requireValue(Array.isArray(p.roles)&&p.roles.length>0&&p.roles.length<=3&&p.roles.every(r=>rolesAllowed.includes(r)),'Selecciona funciones municipales válidas.');
  requireValue(p.action!=='approve'||prior.status==='PENDING','Esta cuenta ya fue revisada.');
  requireValue(p.action!=='reactivate'||prior.enabled===false&&prior.status!=='PENDING','La cuenta no está de baja.');
  requireValue(p.action!=='permissions'||prior.enabled===true,'Habilita primero la cuenta.');
  next.roles=[...new Set(p.roles)];next.enabled=true;next.status='ACTIVE';next.delegation=null;revokes=true;
 }
 if(p.action==='disable'){next.enabled=false;next.status='DISABLED';next.delegation=null;revokes=true;}
 if(p.action==='delegate'){
  requireValue(prior.enabled===true&&prior.roles?.includes('profesional')&&!prior.roles.includes('director'),'La subrogancia requiere un profesional habilitado sin función titular de director.');
  const startMs=Number(p.startMs),endMs=Number(p.endMs);
  requireValue(Number.isFinite(startMs)&&Number.isFinite(endMs)&&startMs<endMs&&endMs>now&&endMs-startMs<=90*86400000,'Define un período de subrogancia válido de hasta 90 días.');
  requireValue(typeof p.reference==='string'&&p.reference.trim()&&p.reference.length<=500,'Registra el acto o referencia que autoriza la subrogancia.');
  next.delegation={startMs,endMs,reference:p.reference.trim(),grantedBy:actor.id,at:new Date(now).toISOString()};revokes=true;
 }
 if(p.action==='endDelegation'){requireValue(prior.delegation,'La cuenta no tiene subrogancia.');next.delegation=null;revokes=true;}
 next.accessRevision=(prior.accessRevision||0)+1;next.updatedAt=new Date(now).toISOString();next.updatedBy=actor.id;
 if(revokes){next.sessionValidAfter=Math.max(Number(prior.sessionValidAfter||0),Math.floor(now/1000));next.revocationStatus='PENDING';}
 return next;
}
