// Shared query policy. Small, bounded reads; no persistent cache of municipal records.
export const READ_POLICY=Object.freeze({requestPageSize:50,noticePageSize:20,exportPageSize:200,pageCacheMs:60000,propertyCacheMs:120000,directoryCacheMs:300000,summaryCacheMs:120000,hiddenGraceMs:300000});
export const ACTIVE_STAGES=['DRAFT','REVIEW','APPROVED','READY','SIGNING','SIGNED'];
const ALL_STAGES=[...ACTIVE_STAGES,'DELIVERED','CANCELLED'];
export const normalizedName=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim().toLocaleUpperCase('es');
export function requestReadFields(r){return{readSchemaVersion:1,searchApplicant:normalizedName(r.applicant),paymentStatus:r.payment?.verified?'verified':r.attachments?.some(a=>a.kind==='payment'&&!a.supersededBy)?'evidence':'pending'};}
export function requestPlan(f={},uid=''){
 let stages=f.tab==='trash'?['DELETED']:f.tab==='active'?ACTIVE_STAGES:f.tab==='review'?['REVIEW']:f.tab==='signature'?['READY','SIGNING']:f.tab==='done'?['DELIVERED']:ALL_STAGES;
 if(f.stage)stages=stages.filter(s=>s===f.stage);if(f.payment==='pending')stages=stages.filter(s=>ACTIVE_STAGES.includes(s));
 const where=[];const assignee=f.tab==='mine'?uid:f.responsible;if(f.tab==='mine'&&f.responsible&&f.responsible!==uid)return{empty:true,where:[]};
 if(!stages.length)return{empty:true,where:[]};where.push(['stage',stages.length===1?'==':'in',stages.length===1?stages[0]:stages]);
 for(const [field,value]of [['type',f.type],['channel',f.channel],['assignedUid',assignee]])if(value)where.push([field,'==',value]);
 if(f.payment)where.push(['paymentStatus',f.payment==='pending'?'in':'==',f.payment==='pending'?['pending','evidence']:f.payment]);
 const term=String(f.q||'').trim();if(term){const field=f.searchField||'rol';if(!['rol','folio','entry','number','searchApplicant'].includes(field))throw Error('Selecciona un campo de búsqueda válido.');let value=term;if(field==='rol'){const m=term.match(/^(\d{1,4})\s*[-–—]\s*(\d{1,5})$/);if(!m)throw Error('Para buscar por ROL escribe manzana-predio, por ejemplo 110-313.');value=Number(m[1])+'-'+Number(m[2]);}if(field==='number'&&/^\d+$/.test(term))value=Number(term);if(field==='searchApplicant')value=normalizedName(term);where.push([field,'==',value]);}
 return{empty:false,where};
}
export class ReadCache{
 entries=new Map();
 async get(key,ttl,load){const prior=this.entries.get(key);if(prior&&(prior.pending||Date.now()-prior.at<ttl))return prior.pending||prior.value;const entry={at:Date.now()};this.entries.set(key,entry);entry.pending=Promise.resolve().then(load);try{entry.value=await entry.pending;entry.at=Date.now();delete entry.pending;while(this.entries.size>100)this.entries.delete(this.entries.keys().next().value);return entry.value;}catch(e){if(this.entries.get(key)===entry)this.entries.delete(key);throw e;}}
 clear(prefix=''){for(const key of this.entries.keys())if(key.startsWith(prefix))this.entries.delete(key);}
}
export class Subscriptions{
 entries=new Map();
 set(key,start){this.stop(key);let live=true;const stop=start();const close=()=>{if(live){live=false;stop?.();}};this.entries.set(key,close);return()=>{close();if(this.entries.get(key)===close)this.entries.delete(key);};}
 stop(key){this.entries.get(key)?.();this.entries.delete(key);}
 stopAll(){for(const key of [...this.entries.keys()])this.stop(key);}
}
export function createRequestReader(sdk,uid){
 const cache=new ReadCache();const collection=()=>sdk.collection(sdk.db,'requests');
 const query=(clauses=[],cursor=null,size=READ_POLICY.requestPageSize)=>sdk.query(collection(),...clauses.map(c=>sdk.where(...c)),sdk.orderBy('createdAt','desc'),...(cursor?[sdk.startAfter(cursor)]:[]),sdk.limit(size));
 return{
  cache,
  async page(filters={},cursor=null,{force=false}={}){const plan=requestPlan(filters,uid());if(plan.empty)return{rows:[],cursor:null,hasMore:false};const key=uid()+':requests:'+JSON.stringify(plan.where)+':'+(cursor?.id||'first');if(force)cache.clear(key);return cache.get(key,READ_POLICY.pageCacheMs,async()=>{const snap=await sdk.getDocs(query(plan.where,cursor));return{rows:snap.docs.map(d=>({...d.data(),id:d.id})),cursor:snap.docs.at(-1)||null,hasMore:snap.size===READ_POLICY.requestPageSize};});},
  async summary({force=false}={}){const key=uid()+':summary';if(force)cache.clear(key);return cache.get(key,READ_POLICY.summaryCacheMs,async()=>{const queries={total:[['stage','in',ALL_STAGES]],active:[['stage','in',ACTIVE_STAGES]],payment:[['stage','in',ACTIVE_STAGES],['paymentStatus','in',['pending','evidence']]],signature:[['stage','==','SIGNING']],delivered:[['stage','==','DELIVERED']],draft:[['stage','==','DRAFT']],review:[['stage','==','REVIEW']],waitingSignature:[['stage','in',['READY','SIGNING']]],trash:[['stage','==','DELETED']]};const entries=await Promise.all(Object.entries(queries).map(async([key,clauses])=>[key,(await sdk.getCountFromServer(sdk.query(collection(),...clauses.map(c=>sdk.where(...c))))).data().count]));return{...Object.fromEntries(entries),at:new Date().toISOString()};});},
  async exportAll(){const rows=[];let cursor=null;for(;;){const snap=await sdk.getDocs(query([],cursor,READ_POLICY.exportPageSize));rows.push(...snap.docs.map(d=>({...d.data(),id:d.id})));if(snap.size<READ_POLICY.exportPageSize)return rows;cursor=snap.docs.at(-1);}},
  invalidate(){cache.clear();}
 };
}
