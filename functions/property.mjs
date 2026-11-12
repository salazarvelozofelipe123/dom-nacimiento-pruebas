import {ADDRESS_FIELDS,streetKey} from './address.mjs';
import {withCertificateDefaults,isCipDefaultField} from './certificate-defaults.mjs';
import {schema,required,text,assertRole,normalizeRol} from './domain.mjs';
// A reusable property fact is never a payment, owner assertion or certificate total.
const excluded=new Set(['owner','ownerRut','directorName','technicalNotes','sourceNotes','certifiedSurface','surfaceBasis','annexes','annexCatastro','annexStreet','annexRules','paymentResolution','paymentResolutionDate']);
export const PROPERTY_FIELDS=[...new Map(['CNU','CIP','AUP'].flatMap(t=>schema(t)).filter(f=>!excluded.has(f.id)&&!f.id.startsWith('official_')).map(f=>[f.id,f])).values()];
const keys=new Set(PROPERTY_FIELDS.map(f=>f.id));
export function propertyRol(value){const rol=normalizeRol(value);required(/^\d+-\d+$/.test(rol),'Indica un ROL válido para guardar antecedentes.');return rol.split('-').map(v=>v.replace(/^0+(?=\d)/,'')).join('-');}
const day=now=>new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Santiago'}).format(new Date(now));
function validDay(value){return /^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value+'T12:00:00Z'))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;}
export function propertyEntries(prior){const entries={};for(const [k,v]of Object.entries(prior?.entries||{}))if(keys.has(k))entries[k]=structuredClone(v);for(const [k,v]of Object.entries(prior?.fields||{}))if(keys.has(k)&&!entries[k])entries[k]={value:String(v),status:'PENDING',source:'',scope:'',legacy:true};return entries;}
export function reusablePropertyFields(prior,type,now=new Date().toISOString()){
 const fields={},facts={};for(const f of schema(type)){if(isCipDefaultField(type,f.id))continue;if(ADDRESS_FIELDS.includes(f.id)&&f.id!=='street'){const primary=prior?.entries?.street;if(primary?.status!=='VALIDATED'||!primary.value||primary.validUntil&&primary.validUntil<day(now))continue;}const e=prior?.entries?.[f.id],front=f.id.match(/^front([1-4])_/),street=front?prior?.entries?.[`front${front[1]}_street`]:null;if(front&&(!street||street.status!=='VALIDATED'||street.validUntil&&street.validUntil<day(now)))continue;if(keys.has(f.id)&&e?.status==='VALIDATED'&&e.value&&e.source&&e.scope&&e.validatedBy&&e.checkedOn&&(!e.validUntil||e.validUntil>=day(now))){fields[f.id]=e.value;facts[f.id]={source:e.source,scope:e.scope,checkedOn:e.checkedOn,validUntil:e.validUntil||null,validatedBy:e.validatedBy,validatedAt:e.validatedAt};}}
 return {fields,provenance:{rol:prior?.rol||null,revision:prior?.revision||0,facts}};
}
export function updatePropertyData(prior,p,actor,now,{sourceRequest=null}={}){
 assertRole(actor,'profesional','director');const rol=propertyRol(p.rol);required(!prior?.rol||propertyRol(prior.rol)===rol,'La ficha corresponde a otro ROL.');required(Number.isInteger(p.expectedRevision)&&p.expectedRevision===(prior?.revision||0),'La ficha predial cambió. Cierra y vuelve a editar.');required(text(p.reason||'',800),'Indica el motivo del cambio predial.');
 required(p.changes&&typeof p.changes==='object'&&!Array.isArray(p.changes),'Antecedentes prediales no válidos.');const changed=Object.keys(p.changes);required(changed.every(k=>keys.has(k)),'Hay campos que no se pueden reutilizar como antecedentes del predio.');required(Array.isArray(p.validateKeys||[])&&(p.validateKeys||[]).every(k=>keys.has(k)),'Selección de validación no válida.');const validateKeys=[...new Set(p.validateKeys||[])];
 const entries=propertyEntries(prior),touched=new Set();const base={recordedBy:actor.id,recordedEmail:actor.email||null,recordedName:actor.name,recordedAt:now,sourceRequest,reason:text(p.reason,800)};
 for(const k of changed){const value=text(p.changes[k]);if(value===(entries[k]?.value||''))continue;entries[k]={value,status:value?'PENDING':'WITHDRAWN',source:'',scope:'',...base};touched.add(k);}
 if(touched.has('street'))for(const k of ADDRESS_FIELDS.filter(k=>k!=='street'))if(entries[k]?.value&&!touched.has(k)){entries[k]={...entries[k],status:'PENDING',...base};touched.add(k);}
 // A different frontage cannot inherit widths for the former street.
 for(let i=1;i<=4;i++)if(touched.has(`front${i}_street`))for(const f of PROPERTY_FIELDS.filter(f=>f.id.startsWith(`front${i}_`)&&f.id!==`front${i}_street`))if(entries[f.id]?.value){entries[f.id]={...entries[f.id],status:'PENDING',...base};touched.add(f.id);}
 // A new zone/instrument requires rechecking the numerical planning conditions.
 if(['zones','prc','prcDate','prcVersion'].some(k=>touched.has(k)))for(const f of PROPERTY_FIELDS.filter(f=>f.group==='Normas urbanísticas'))if(entries[f.id]?.value){entries[f.id]={...entries[f.id],status:'PENDING',...base};touched.add(f.id);}
 if(validateKeys.length){required(p.confirmed===true,'Confirma la comprobación de los antecedentes seleccionados.');const source=text(p.source||'',2000),scope=text(p.scope||'',2000);required(source&&scope,'Para validar, indica la fuente documental y el alcance: porción del predio, zona, frente o tramo.');required(validDay(p.checkedOn||'')&&p.checkedOn<=day(now),'Indica una fecha de comprobación válida, sin fechas futuras.');const validUntil=p.validUntil||'';required(!validUntil||validDay(validUntil)&&validUntil>=p.checkedOn&&validUntil>=day(now),'Revisa la fecha de revisión límite del antecedente.');
  for(const k of validateKeys){required(entries[k]?.value,'Completa el dato antes de validarlo.');const front=k.match(/^front([1-4])_/);if(front){const street=`front${front[1]}_street`;required(entries[street]?.value,'Identifica la calle de cada frente antes de validar sus medidas.');required(k===street||entries[street]?.status==='VALIDATED'||validateKeys.includes(street),'Valida también la calle del frente junto con sus medidas.');}entries[k]={...entries[k],status:'VALIDATED',source,scope,checkedOn:p.checkedOn,validUntil:validUntil||null,validatedBy:actor.id,validatedEmail:actor.email||null,validatedName:actor.name,validatedAt:now,...base};touched.add(k);}
 }
 required(touched.size,'No hay cambios ni datos seleccionados para validar.');const result={rol,commune:'8405',entries,revision:(prior?.revision||0)+1,updatedAt:now,updatedBy:actor.id,updatedEmail:actor.email||null,reason:text(p.reason,800),sourceRequest};result.fields=Object.fromEntries(Object.entries(entries).filter(([,e])=>e.status==='VALIDATED'&&e.value).map(([k,e])=>[k,e.value]));return result;
}
export function certificatePropertyUpdate(prior,before,record,p,actor,now){
 required(propertyRol(before.rol)===propertyRol(record.rol),'Guarda primero la corrección del ROL; luego abre nuevamente los antecedentes para actualizar la ficha predial.');
 const changes=Object.fromEntries(PROPERTY_FIELDS.filter(f=>Object.hasOwn(p.fields||{},f.id)&&(record.fields[f.id]||'')!==(before.fields[f.id]||'')).map(f=>[f.id,record.fields[f.id]||'']));
 const validateKeys=p.updateProperty===true?(p.propertyValidation?.keys||[]):[];
 if(p.updateProperty===true)required(validateKeys.length,'Selecciona los datos que has verificado para la ficha predial.');
 if(!Object.keys(changes).length&&!validateKeys.length)return null;
 // Validation may include unchanged certificate values not yet stored in the property.
 for(const k of validateKeys)changes[k]=record.fields[k]||'';
 return updatePropertyData(prior,{rol:record.rol,changes,validateKeys,expectedRevision:p.expectedPropertyRevision,reason:p.reason,...(p.propertyValidation?{source:p.propertyValidation.source,scope:p.propertyValidation.scope,checkedOn:p.propertyValidation.checkedOn,validUntil:p.propertyValidation.validUntil,confirmed:p.propertyValidation.confirmed}:{})},actor,now,{sourceRequest:record.id});
}

export function propertyCertificateInput(prior,type,input={},now=new Date().toISOString()){
 const reused=reusablePropertyFields(prior,type,now),explicit=Object.fromEntries(Object.entries(input).filter(([,v])=>v));
 const incompatible=explicit.street&&reused.fields.street&&streetKey(explicit.street)!==streetKey(reused.fields.street)||explicit.houseNumber&&reused.fields.houseNumber&&explicit.houseNumber!==reused.fields.houseNumber;if(incompatible)for(const k of ADDRESS_FIELDS){delete reused.fields[k];delete reused.provenance.facts[k];}
 const facts=Object.fromEntries(Object.entries(reused.provenance.facts).filter(([k])=>!Object.hasOwn(explicit,k)||explicit[k]===reused.fields[k]));
 return {fields:withCertificateDefaults(type,{...reused.fields,...explicit}),provenance:{...reused.provenance,facts}};
}

// Director approval is the authoritative consolidation boundary for structured facts.
export function approvedCertificateProperty(prior,record,p,actor,now){
 required(record.approvedVersion===record.documentVersion&&record.approvedBy===actor.id,'La consolidación requiere la versión aprobada por dirección.');
 const changes=Object.fromEntries(PROPERTY_FIELDS.filter(f=>!isCipDefaultField(record.type,f.id)&&String(record.fields[f.id]||'').trim()).map(f=>[f.id,record.fields[f.id]]));
 if(!Object.keys(changes).length)return null;
 required(p.confirmed===true,'Confirma la revisión y consolidación de los antecedentes.');
 const source=[record.fields.sourceNotes,record.fields.numberingSource,record.fields.normSource].filter(Boolean).join(' · ').slice(0,1500);
 required(source,'Registra las fuentes de los antecedentes antes de validar.');
 const next=updatePropertyData(prior,{rol:record.rol,changes,validateKeys:Object.keys(changes),expectedRevision:p.expectedPropertyRevision,reason:'Consolidación desde certificado '+record.type+' validado por dirección',confirmed:true,source:'Certificado '+record.id+' · versión '+record.documentVersion+' · '+source,scope:p.propertyScope,checkedOn:day(now)},actor,now,{sourceRequest:record.id});
 for(const key of Object.keys(changes))Object.assign(next.entries[key],{sourceDocumentVersion:record.documentVersion,preparedBy:record.reviewedBy});
 next.sourceDocumentVersion=record.documentVersion;
 return next;
}
