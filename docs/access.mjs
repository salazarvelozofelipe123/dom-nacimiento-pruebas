import {effectiveRoles} from './user-management.mjs';
// Shared authorization used by UI and the trusted server. No roles are accepted from forms.
const allowed={editEntry:['administrativo','profesional','director'],deleteEntry:['administrativo','profesional','director'],restoreEntry:['administrativo','profesional','director'],assign:['director'],edit:['profesional'],submit:['profesional'],reserve:['profesional'],archive:['profesional'],rectify:['profesional'],approve:['director'],return:['director'],cancel:['director'],payment:['administrativo','profesional'],attach:['administrativo','profesional'],sendSign:['administrativo','profesional'],signed:['administrativo','profesional'],deliver:['administrativo','profesional'],wait:['administrativo','profesional','director'],resume:['administrativo','profesional','director']};
export const normalizeEmail=v=>String(v||'').trim().toLowerCase();
export function commandIssue(r,command,actor,{preview=false}={}){
 if(r.purgeLock)return 'Eliminación definitiva iniciada; pendiente de completar la limpieza.';
 if(actor?.enabled===false)return 'La cuenta está deshabilitada.';
 if(!allowed[command]?.some(role=>actor?.roles?.includes(role)))return 'Tu función no permite realizar esta acción.';
 if(r.stage==='DELETED'&&command!=='restoreEntry')return 'Recupera el ingreso desde la papelera antes de modificarlo.';
 if(['deleteEntry','restoreEntry'].includes(command)&&r.createdBy!==actor.id&&!actor.roles.includes('director'))return 'Solo quien registró el ingreso o el director puede eliminarlo o recuperarlo.';
 if(command==='editEntry'&&!actor.roles.some(role=>['administrativo','director'].includes(role))&&r.createdBy!==actor.id&&r.assignedUid!==actor.id)return 'Solo puedes corregir tus ingresos o las solicitudes asignadas a tu cuenta.';
 if(command==='deleteEntry'&&(r.stage!=='DRAFT'||r.number!=null||r.payment?.verified||r.parentId))return 'Solo se eliminan ingresos en preparación, sin número ni pago validado. Para otros estados utiliza devolución, rectificación o anulación.';
 if(command==='restoreEntry'&&r.stage!=='DELETED')return 'El ingreso no está en la papelera.';
 if(command==='editEntry'&&(!['DRAFT','REVIEW','APPROVED'].includes(r.stage)||r.number!=null))return 'Este ingreso ya no admite corrección administrativa; requiere rectificación o anulación.';
 if(!preview&&(['edit','submit','reserve','archive','rectify'].includes(command)||!actor.roles.includes('administrativo')&&['payment','attach','sendSign','signed','deliver'].includes(command))&&r.assignedUid!==actor.id)return 'Solo el profesional asignado puede asumir esta acción. Solicita la asignación al director.';
 if(command==='approve'&&(!r.reviewedBy||r.reviewedBy===actor.id||r.lastEditedBy===actor.id))return 'La validación final debe realizarla un director distinto de quien preparó o envió este borrador.';
 return '';
}
export const canCommand=(r,command,actor,options)=>!commandIssue(r,command,actor,options);
export function verifiedProfile(profile,identity){
 if(!identity?.uid||identity.email_verified!==true||!identity.email)throw Error('Verifica tu correo antes de operar con el sistema.');
 if(profile?.enabled!==true)throw Error('Esta cuenta aún no está habilitada por el municipio.');
 if(!profile.email||normalizeEmail(profile.email)!==normalizeEmail(identity.email))throw Error('El correo no coincide con la cuenta municipal autorizada.');
 if(!Array.isArray(profile.roles)||!profile.roles.length||profile.roles.some(r=>!['administrativo','profesional','director','admin'].includes(r)))throw Error('Perfil municipal no válido.');
 return {id:identity.uid,name:profile.name,email:normalizeEmail(identity.email),baseRoles:profile.roles,roles:effectiveRoles(profile),delegation:profile.delegation||null,enabled:true};
}
