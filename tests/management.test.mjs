import test from 'node:test';
import assert from 'node:assert/strict';
import {createCase,reduceCase,contractSummary,bnupEstimate,caseAlerts,deadline,caseCSV,validDate,MODULES} from '../docs/management-domain.mjs';
import {createCaseRepository,CASE_KEY} from '../docs/management-store.mjs';
const actors=Object.fromEntries(['administrativo','profesional','director','inspector','ito','finanzas','consulta','admin'].map(role=>[role,{id:role,name:role,roles:[role],enabled:true}]));
const directory=Object.values(actors),now='2026-11-13T14:00:00Z';let seq=0;
const fresh=(module,extra={},actor=actors.director)=>createCase(module,{title:'Caso ficticio',type:MODULES[module].types[0],receivedDate:'2026-11-13',location:'Sector ficticio',description:'Antecedentes de prueba',...extra},actor,{id:'case-'+(++seq),now});
const cmd=(r,command,p={},role='director',allCases=[])=>reduceCase(r,command,{reason:'Actuación de prueba',expectedRevision:r.revision,itemId:'item-'+(++seq),...p},actors[role],{now,directory,allCases});
const assign=(r,role)=>cmd(r,'assign',{assignedUid:role});
const move=(r,to,role='director')=>cmd(r,'transition',{to},role);
const edit=(r,fields,role='director')=>cmd(r,'edit',{fields},role);

test('Los cinco módulos admiten ubicación sin ROL; normalizan múltiples ROL sin convertirlos en identidad',()=>{
 for(const key of Object.keys(MODULES))assert.equal(fresh(key).rols.length,0);
 const r=fresh('expedientes',{rols:'009999-01, 9999-2;9999-1'});assert.deepEqual(r.rols,['9999-1','9999-2']);assert.notEqual(r.id,r.rols[0]);
 assert.throws(()=>fresh('expedientes',{location:''}),/ROL o una ubicación/);
});
test('La fecha debe existir y DOMEL exige folio; administrador técnico y consulta no ingresan casos',()=>{
 assert.equal(validDate('2026-02-30'),false);assert.throws(()=>fresh('expedientes',{receivedDate:'2026-02-30'}),/Fecha/);
 assert.throws(()=>fresh('expedientes',{channel:'DOMEL'}),/folio/);
 for(const a of [actors.admin,actors.consulta])assert.throws(()=>fresh('expedientes',{},a),/función/);
});
test('Solo dirección asigna cuentas habilitadas con la función adecuada',()=>{
 const r=fresh('contratos');assert.throws(()=>cmd(r,'assign',{assignedUid:'ito'},'ito'),/función/);
 assert.throws(()=>cmd(r,'assign',{assignedUid:'profesional'}),/habilitada/);
 assert.equal(assign(r,'ito').assignedUid,'ito');
 const disabled=[...directory.filter(a=>a.id!=='ito'),{...actors.ito,enabled:false}];
 assert.throws(()=>reduceCase(r,'assign',{expectedRevision:r.revision,reason:'Asignación',assignedUid:'ito'},actors.director,{now,directory:disabled}),/habilitada/);
});
test('Motivos, versiones y concurrencia se verifican antes de editar',()=>{
 const original=assign(fresh('expedientes'),'profesional');
 assert.throws(()=>cmd(original,'edit',{reason:''}),/motivo/);
 assert.throws(()=>cmd(original,'edit',{expectedRevision:1}),/otra pestaña/);
 const changed=cmd(original,'edit',{description:'Cambio de prueba',stage:'CERRADO',fields:{unknown:'dato',admissibilityRef:'Lista 1'}},'profesional');
 assert.equal(changed.stage,'INGRESADO');assert.equal(changed.revision,3);assert.equal(changed.versions.at(-1).description,original.description);assert.equal(original.description,'Antecedentes de prueba');assert.equal(changed.fields.unknown,undefined);
 assert.equal(changed.history.at(-1).actorId,'profesional');
});
test('Un profesional distinto del asignado no modifica ni avanza el caso',()=>{
 const r=assign(fresh('expedientes'),'profesional');
 const other={...actors.profesional,id:'otro'};
 assert.throws(()=>reduceCase(r,'edit',{expectedRevision:r.revision,reason:'Intento',fields:{}},other,{now}),/responsable/);
 assert.throws(()=>cmd(r,'transition',{to:'CERRADO'}),/Transición/);
});
test('Expediente recorre admisibilidad, acta, respuesta, evaluación y cierre con evidencia',()=>{
 let r=assign(fresh('expedientes'),'profesional');
 assert.throws(()=>move(r,'ADMISIBLE'),/admisibilidad/);
 r=edit(r,{admissibilityRef:'Lista revisada'});r=move(r,'ADMISIBLE');r=move(r,'REVISION','profesional');
 r=edit(r,{decision:'APROBACION'});r=cmd(r,'observation',{text:'Aclarar superficie',basis:'Cotejo de plano',document:'Plano A'},'profesional');const oid=r.observations[0].id;
 assert.throws(()=>move(r,'RESOLUCION','profesional'),/sin subsanar/);
 r=edit(r,{actRef:'Acta 1',notificationRef:'Constancia 1'},'profesional');r=move(r,'OBSERVADO','profesional');
 assert.throws(()=>move(r,'SUBSANACION'),/antecedente/);
 r=cmd(r,'respond',{observationId:oid,response:'Plano corregido',reference:'Plano B'},'administrativo');r=edit(r,{submissionRef:'Reingreso 1'},'profesional');r=move(r,'SUBSANACION');
 r=cmd(r,'reviewObservation',{observationId:oid,status:'SUBSANADA',review:'Cotejado con Plano B'},'profesional');r=move(r,'REVISION','profesional');r=edit(r,{decision:'APROBACION'},'profesional');r=move(r,'RESOLUCION','profesional');
 assert.throws(()=>edit(r,{decision:'Otra decisión'}),/Devuelve/);
 r=cmd(r,'reference',{key:'resolutionRef',value:'Resolución ficticia'});r=cmd(r,'reference',{key:'deliveryRef',value:'Entrega ficticia'},'administrativo');r=move(r,'CERRADO');
 assert.throws(()=>cmd(r,'note',{text:'Cambiar cerrado'}),/cerrado/);assert.equal(r.observations[0].status,'SUBSANADA');
});
test('Las DJ se clasifican dentro del módulo de expedientes',()=>assert.equal(fresh('expedientes',{type:'Declaración jurada'}).module,'expedientes'));
test('Denuncia sin ROL exige visita e informe antes del cierre de seguimiento',()=>{
 let r=assign(fresh('fiscalizacion',{type:'Denuncia de posible infracción'}),'inspector');r=move(r,'EVALUACION','inspector');
 assert.throws(()=>move(r,'CERRADO'),/resultado/);r=edit(r,{outcome:'Pendiente',actionRef:'Respuesta'},'inspector');assert.throws(()=>move(r,'CERRADO'),/seguimiento/);
 assert.throws(()=>move(r,'VISITA','inspector'),/fecha de visita/);r=edit(r,{visitDate:'2026-11-14'},'inspector');r=move(r,'VISITA','inspector');
 assert.throws(()=>move(r,'INFORME','inspector'),/hechos/);r=cmd(r,'visit',{date:'2026-11-14',location:'Sector de prueba',facts:'Hechos constatados ficticios',evidence:'Fotografías de prueba'},'inspector');r=move(r,'INFORME','inspector');r=edit(r,{reportRef:'Informe 1'},'inspector');r=move(r,'SEGUIMIENTO');r=move(r,'CERRADO');assert.equal(r.visits.length,1);
});
test('Un reclamo de atención puede cerrar con respuesta sin declarar infracción',()=>{
 let r=assign(fresh('fiscalizacion',{type:'Reclamo de atención'}),'profesional');r=move(r,'EVALUACION');r=edit(r,{outcome:'Respondido',actionRef:'Respuesta 1'});r=move(r,'CERRADO');assert.equal(r.visits.length,0);
});
function runningContract(){let r=assign(fresh('contratos'),'ito');r=edit(r,{originalAmount:'1000000',originalEnd:'2026-12-20',startDate:'2026-11-14',contractRef:'Contrato de prueba',handoverRef:'Acta de terreno'});r=move(r,'PREPARACION');return move(r,'EJECUCION','ito');}
test('Las modificaciones mantienen línea base y solo cambian monto vigente al ser aprobadas',()=>{
 let r=runningContract();assert.throws(()=>edit(r,{originalAmount:'2000000'},'ito'),/línea base/);
 r=cmd(r,'variation',{title:'Ampliación',amountDelta:100000,newEnd:'2026-12-30',reference:'Solicitud'},'ito');assert.equal(contractSummary(r).current,1000000);
 const vid=r.variations[0].id;assert.throws(()=>cmd(r,'decideVariation',{variationId:vid,status:'APROBADA',reference:'Acto'},'ito'),/función/);
 r=cmd(r,'decideVariation',{variationId:vid,status:'APROBADA',reference:'Acto aprobado'});assert.equal(contractSummary(r).current,1100000);assert.equal(contractSummary(r).end,'2026-12-30');assert.equal(r.fields.originalAmount,'1000000');
});
test('Avance físico no se obtiene del pago y requiere evidencia y períodos posteriores',()=>{
 let r=runningContract();r=cmd(r,'progress',{date:'2026-11-15',planned:30,actual:20,evidence:'Informe'},'ito');assert.equal(contractSummary(r).physical,20);assert.equal(contractSummary(r).paid,0);
 assert.throws(()=>cmd(r,'progress',{date:'2026-11-15',planned:40,actual:30,evidence:'Informe'},'ito'),/posteriores/);
 assert.throws(()=>move(r,'RECEPCION','ito'),/100/);
});
test('Estados de pago controlan monto, duplicados y separación entre visación y confirmación financiera',()=>{
 let r=runningContract();r=cmd(r,'payment',{reference:'EP 1',amount:500000,retention:25000},'ito');const pid=r.payments[0].id;
 assert.throws(()=>cmd(r,'payment',{reference:'ep 1',amount:1},'ito'),/duplicada/);
 assert.throws(()=>cmd(r,'payment',{reference:'EP 2',amount:600000},'ito'),/superan/);
 assert.throws(()=>cmd(r,'paymentStatus',{paymentId:pid,status:'PAGADO',reference:'Ref'},'finanzas'),/no permitido/);
 r=cmd(r,'paymentStatus',{paymentId:pid,status:'VISADO',reference:'Visación'},'ito');assert.equal(contractSummary(r).paid,0);
 r=cmd(r,'paymentStatus',{paymentId:pid,status:'REMITIDO',reference:'Envío a Finanzas'},'ito');
 assert.throws(()=>cmd(r,'paymentStatus',{paymentId:pid,status:'PAGADO',reference:'Ref'}),/función/);
 r=cmd(r,'paymentStatus',{paymentId:pid,status:'PAGADO',reference:'Confirmación ficticia'},'finanzas');assert.equal(contractSummary(r).paid,475000);
});
test('Contrato exige recepción, conciliación y pagos concluidos para cerrar',()=>{
 let r=runningContract();r=cmd(r,'progress',{date:'2026-12-20',planned:100,actual:100,evidence:'Informe final'},'ito');r=move(r,'RECEPCION','ito');assert.throws(()=>move(r,'CERRADO'),/recepción/);
 r=cmd(r,'reference',{key:'receptionRef',value:'Acta final'});r=cmd(r,'reference',{key:'financialCloseRef',value:'Conciliación'});r=move(r,'CERRADO');assert.equal(r.stage,'CERRADO');
});
test('BNUP calcula referencia, exige pago y registra restitución sin ROL obligatorio',()=>{
 let r=assign(fresh('bnup'),'profesional');r=edit(r,{purpose:'Faena ficticia',startDate:'2026-11-13',endDate:'2026-11-15',quantity:'10',unit:'m²-día',unitRate:'100',tariffSource:'Tarifa ficticia'});assert.equal(bnupEstimate(r),1000);r=move(r,'REVISION');r=move(r,'CALCULO');r=move(r,'AUTORIZACION');r=cmd(r,'reference',{key:'authorizationRef',value:'Permiso de prueba'});assert.throws(()=>move(r,'VIGENTE'),/pago/);
 r=cmd(r,'payment',{reference:'Giro prueba',amount:1000,retention:0});const pid=r.payments[0].id;for(const status of ['VISADO','REMITIDO'])r=cmd(r,'paymentStatus',{paymentId:pid,status,reference:'Prueba'});r=cmd(r,'paymentStatus',{paymentId:pid,status:'PAGADO',reference:'Prueba'},'finanzas');r=move(r,'VIGENTE');r=move(r,'RESTITUCION');assert.throws(()=>move(r,'CERRADO'),/restitución/);r=cmd(r,'reference',{key:'restitutionRef',value:'Acta de restitución'});r=move(r,'CERRADO');assert.equal(r.stage,'CERRADO');
});
test('Correspondencia permite devolución y no cierra sin constancia de despacho',()=>{
 let r=assign(fresh('correspondencia'),'administrativo');r=move(r,'DERIVADO');r=move(r,'RESPUESTA','administrativo');r=edit(r,{responseRef:'Oficio de respuesta'});r=move(r,'VISTOBUENO','administrativo');r=move(r,'RESPUESTA');r=move(r,'VISTOBUENO','administrativo');r=move(r,'DESPACHO');assert.throws(()=>move(r,'CERRADO','administrativo'),/despacho/);r=cmd(r,'reference',{key:'dispatchRef',value:'Comprobante'},'administrativo');r=move(r,'CERRADO','administrativo');assert.equal(r.stage,'CERRADO');
});
test('Objetivos operativos, garantías vencidas y casos cerrados producen alertas distintas',()=>{
 let r=runningContract();r=cmd(r,'guarantee',{reference:'G1',issuer:'Emisor ficticio',amount:10000,expires:'2026-11-10',custodian:'Prueba'},'ito');assert(caseAlerts(r,'2026-11-13').some(a=>a.label.includes('vencida')));assert.equal(deadline({...r,targetDate:'2026-11-12'},'2026-11-13').days,-1);assert.deepEqual(caseAlerts({...r,stage:'CERRADO'},'2026-11-13'),[]);
});
test('Vínculos verifican caso destino; referencias no se confunden con archivos firmados',()=>{
 let r=assign(fresh('expedientes'),'profesional');const other=fresh('correspondencia');
 assert.throws(()=>cmd(r,'link',{targetId:'missing',relation:'Relación'}),/existente/);r=cmd(r,'link',{targetId:other.id,relation:'Antecedente de ingreso'},'director',[r,other]);assert.equal(r.links[0].id,other.id);
 r=cmd(r,'document',{title:'Plano',date:'2026-11-13',reference:'Referencia 1',status:'SIGNED'});assert.equal(r.documents[0].status,'REFERENCIA_SIN_ARCHIVO');
});
test('CSV protege fórmulas y conserva clasificación de módulo y materia',()=>{
 const csv=caseCSV([fresh('expedientes',{title:'=HYPERLINK("x")',type:'Declaración jurada'})]);assert(csv.includes("'=HYPERLINK"));assert(csv.includes('Declaración jurada'));assert(csv.includes('Expedientes'));
});
test('Repositorio serializa pestañas y rechaza revisiones antiguas sin perder escrituras',async()=>{
 const data=new Map(),storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};let tail=Promise.resolve();const locks={request:(key,fn)=>{const result=tail.then(fn);tail=result.catch(()=>{});return result;}};
 const repo=createCaseRepository({storage,locks,actor:()=>actors.director,directory:()=>directory,id:()=>String(++seq),now:()=>now});const r=await repo.create('expedientes',{title:'Prueba',type:'Obra menor',receivedDate:'2026-11-13',location:'Sector',description:'Caso'});
 const results=await Promise.allSettled([repo.command(r.id,'note',{expectedRevision:1,reason:'A',text:'A'}),repo.command(r.id,'note',{expectedRevision:1,reason:'B',text:'B'})]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(repo.list()[0].notes.length,1);
 storage.setItem(CASE_KEY,'broken');assert.throws(()=>repo.list(),/No se puede leer/);assert.equal(storage.getItem(CASE_KEY),'broken');
});
test('Sin bloqueo entre pestañas se permite leer pero se bloquea guardar',async()=>{
 const repo=createCaseRepository({storage:{getItem:()=>null},actor:()=>actors.director,directory:()=>directory});assert.deepEqual(repo.list(),[]);await assert.rejects(repo.create('expedientes',{}),/bloquear escrituras/);
});
test('La propuesta de rechazo admite observaciones mantenidas con resultado explícito',()=>{
 let r=assign(fresh('expedientes'),'profesional');r=edit(r,{admissibilityRef:'Lista'});r=move(r,'ADMISIBLE');r=move(r,'REVISION');r=cmd(r,'observation',{text:'Antecedente pendiente',basis:'Revisión',document:'Plano'});r=edit(r,{decision:'RECHAZO'});r=move(r,'RESOLUCION');assert.equal(r.observations[0].status,'PENDIENTE');
});
test('La segunda inspección exige hechos del nuevo ciclo, no reutiliza una visita anterior',()=>{
 let r=assign(fresh('fiscalizacion',{type:'Denuncia de posible infracción'}),'inspector');r=edit(r,{visitDate:'2026-11-14',reportRef:'Informe'});r=move(r,'EVALUACION');r=move(r,'VISITA');r=cmd(r,'visit',{date:'2026-11-14',location:'Sector',facts:'Hecho',evidence:'Respaldo'});r=move(r,'INFORME');r=move(r,'SEGUIMIENTO');r=move(r,'VISITA');assert.throws(()=>move(r,'INFORME'),/este ciclo/);
});
test('BNUP no se autoriza con un pago inferior al cálculo vigente',()=>{
 let r=assign(fresh('bnup'),'profesional');r=edit(r,{purpose:'Trabajo',startDate:'2026-11-13',endDate:'2026-11-15',quantity:'10',unit:'unidad',unitRate:'100',tariffSource:'Fuente'});r=move(r,'REVISION');r=move(r,'CALCULO');r=move(r,'AUTORIZACION');r=cmd(r,'reference',{key:'authorizationRef',value:'Permiso'});r=cmd(r,'payment',{reference:'Pago',amount:500,retention:0});const pid=r.payments[0].id;for(const status of ['VISADO','REMITIDO'])r=cmd(r,'paymentStatus',{paymentId:pid,status,reference:'Respaldo'});r=cmd(r,'paymentStatus',{paymentId:pid,status:'PAGADO',reference:'Respaldo'},'finanzas');assert.throws(()=>move(r,'VIGENTE'),/no coincide/);
});
test('Falla de almacenamiento no devuelve éxito ni cambia los datos persistidos',async()=>{
 let content=null;const storage={getItem:()=>content,setItem:()=>{throw Error('QuotaExceededError');}};const repo=createCaseRepository({storage,locks:{request:(_,fn)=>Promise.resolve().then(fn)},actor:()=>actors.director,directory:()=>directory,id:()=>String(++seq),now:()=>now});await assert.rejects(repo.create('expedientes',{title:'Prueba',type:'Obra menor',receivedDate:'2026-11-13',location:'Sector',description:'Prueba'}),/Quota/);assert.equal(content,null);
});

test('Borradores de expedientes conservan versiones, limitan editores y no aprueban actuaciones',()=>{
 const original=assign(fresh('expedientes'),'profesional');
 const saved=cmd(original,'saveForm',{formId:'edificacion',values:{owner:'Propietario ficticio',projectArea:'123.5',unknown:'ignorar'}},'profesional');
 assert.equal(saved.stage,original.stage);assert.equal(saved.formDrafts[0].version,1);assert.equal(saved.formDrafts[0].values.projectArea,'123.5');assert.equal(saved.formDrafts[0].values.unknown,undefined);
 assert.equal(original.formDrafts,undefined);
 const changed=cmd(saved,'saveForm',{formId:'edificacion',values:{projectArea:'124'}},'profesional');
 assert.equal(changed.formDrafts.length,1);assert.equal(changed.formDrafts[0].version,2);assert.equal(changed.versions.at(-1).formDrafts[0].values.projectArea,'123.5');
 for(const role of ['administrativo','consulta','ito'])assert.throws(()=>cmd(saved,'saveForm',{formId:'edificacion',values:{}},role),/función/);
 const outsider={...actors.profesional,id:'otra-persona'};
 assert.throws(()=>reduceCase(saved,'saveForm',{expectedRevision:saved.revision,reason:'Prueba',formId:'edificacion',values:{}},outsider,{now}),/responsable/);
 assert.throws(()=>cmd(saved,'saveForm',{formId:'inventado',values:{}}),/no válido/);
 assert.throws(()=>cmd(saved,'saveForm',{formId:'recepcion',values:{projectArea:'-1'}}),/superficie/);
 assert.throws(()=>cmd({...saved,stage:'RESOLUCION'},'saveForm',{formId:'recepcion',values:{}}),/revisión/);
 assert.throws(()=>cmd(fresh('contratos'),'saveForm',{formId:'edificacion',values:{}}),/expedientes/);
});
