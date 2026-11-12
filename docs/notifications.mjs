// Shared by the pilot and Firebase: numbering and payment commit together.
export function workflowNotification(command,record,actor){
 const definitions={submit:['review','Borrador pendiente de validación'],approve:['approve','Borrador validado por dirección'],return:['return','Borrador devuelto con observaciones'],reserve:['signature','Certificado pendiente de firma'],create:['assignment','Nueva asignación'],assign:['assignment','Nueva asignación']};
 const definition=definitions[command];if(!definition)return null;
 if(command==='reserve'&&!(record.stage==='READY'&&record.number!=null&&record.payment?.verified))return null;
 const [type,title]=definition;
 return {type,title:title+' · '+record.type,body:command==='reserve'?`${record.type} N.º ${record.number}/${record.year} · ROL ${record.rol} · Pago validado · Preparado por ${actor.name}. Descarga el documento para tramitar la firma externa.`:`${actor.name} · ROL ${record.rol}`};
}
export function workflowRecipients(command,record,directory,actor){
 if(['submit','reserve'].includes(command))return [...new Set(directory.filter(u=>u.enabled===true&&u.roles?.includes('director')&&(command==='reserve'||u.id!==actor.id)).map(u=>u.id))];
 return ['create','assign','approve','return'].includes(command)&&record.assignedUid?[record.assignedUid]:[];
}
