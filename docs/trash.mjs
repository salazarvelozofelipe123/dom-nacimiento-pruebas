// Only discarded, unnumbered inputs can be permanently removed.
export function purgeIssue(r,actor){
 if(!actor?.enabled||!actor.roles?.some(role=>['administrativo','profesional','director'].includes(role)))return 'Cuenta sin permisos para vaciar la papelera.';
 if(r.stage!=='DELETED')return 'El ingreso ya no está en la papelera.';
 if(r.createdBy!==actor.id&&!actor.roles.includes('director'))return 'Solo puedes eliminar definitivamente tus ingresos; dirección puede gestionar toda la papelera.';
 if(r.number!=null||r.payment?.verified||r.parentId||r.signedFile||['SENT_EXTERNAL','VERIFIED_EXTERNAL'].includes(r.signatureStatus))return 'El registro conserva numeración, pago o firma y requiere mantener su trazabilidad.';
 return '';
}
export function trashSelection(records,actor){const deleted=records.filter(r=>r.stage==='DELETED');return {items:deleted.filter(r=>!purgeIssue(r,actor)).map(r=>({id:r.id,revision:r.revision,type:r.type,rol:r.rol,applicant:r.applicant})),retained:deleted.filter(r=>purgeIssue(r,actor)).length};}
export function validatePurgeConfirmation(p){if(p.confirmation!=='VACIAR PAPELERA'||p.confirmed!==true)throw Error('Confirma la eliminación definitiva escribiendo VACIAR PAPELERA.');if(!Array.isArray(p.items)||!p.items.length||p.items.length>50||new Set(p.items.map(x=>x.id)).size!==p.items.length||p.items.some(x=>!x||typeof x.id!=='string'||!/^[a-zA-Z0-9_-]{8,100}$/.test(x.id)||!Number.isInteger(x.revision)||x.revision<1))throw Error('Selección de papelera no válida o superior a 50 ingresos.');}
