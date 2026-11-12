import {STAGES} from './domain.mjs';
export const PROCESS_STAGES=['DRAFT','REVIEW','APPROVED','READY','SIGNING','SIGNED','DELIVERED'];
export const isRemoved=r=>r.stage==='DELETED';
export const isActive=r=>!['CANCELLED','DELETED','DELIVERED'].includes(r.stage);
export function paymentState(r){if(r.payment?.verified)return {id:'verified',label:'Pago validado',detail:'$'+Number(r.payment.amount||0).toLocaleString('es-CL')+(r.payment.giro?' · Giro '+r.payment.giro:'')};const evidence=r.attachments?.some(a=>a.kind==='payment'&&!a.supersededBy);return {id:evidence?'evidence':'pending',label:evidence?'Comprobante por validar':'Pago sin corroborar',detail:r.channel==='PRESENCIAL'?'Presencial · revisar giro y comprobante':'DOM en Línea · verificar antes de numerar'};}
export function registerRows(records,{q='',type='',channel='',stage='',payment='',responsible='',tab='all',actorId=''}={}){const term=q.trim().toLocaleLowerCase('es');return records.filter(r=>{
 if(tab==='trash'?!isRemoved(r):isRemoved(r))return false;
 if(term&&![r.rol,r.applicant,r.entry,r.folio,r.number,r.fields?.street,r.assignedTo].some(v=>String(v||'').toLocaleLowerCase('es').includes(term)))return false;
 if(type&&r.type!==type||channel&&r.channel!==channel||stage&&r.stage!==stage||responsible&&r.assignedUid!==responsible)return false;
 const pay=paymentState(r);if(payment==='pending'&&(!isActive(r)||pay.id==='verified')||payment==='verified'&&pay.id!=='verified'||payment==='evidence'&&pay.id!=='evidence')return false;
 return tab==='all'||tab==='trash'||tab==='mine'&&r.assignedUid===actorId||tab==='active'&&isActive(r)||tab==='review'&&r.stage==='REVIEW'||tab==='done'&&r.stage==='DELIVERED'||tab==='signature'&&['READY','SIGNING'].includes(r.stage);
 }).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));}
export function processState(r){return {index:PROCESS_STAGES.indexOf(r.stage),label:STAGES[r.stage]||r.stage,stopped:['CANCELLED','DELETED'].includes(r.stage)};}
