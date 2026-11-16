// Optional operational planning; never computes payments or contractual amendments.
const assert=(ok,message)=>{if(!ok)throw Error(message);};
export const planningDay=date=>Date.parse(date+'T00:00:00Z')/86400000;
export function planningDate(value){assert(typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(planningDay(value))&&new Date(planningDay(value)*86400000).toISOString().slice(0,10)===value,'Fecha de planificación no válida.');return value;}
const label=(v,name)=>{assert(typeof v==='string'&&v.trim()&&v.length<=2000,'Completa '+name+' (máximo 2000 caracteres).');return v.trim();};
const numeric=(v,name,max)=>{assert(v!==''&&v!=null&&Number.isFinite(Number(v))&&Number(v)>0&&Number(v)<=max,'Indica '+name+' mayor que cero y dentro del rango permitido.');return Number(v);};
export function cleanTask(p,id){const start=planningDate(p.start),end=planningDate(p.end);assert(start<=end,'El término de la partida no puede preceder al inicio.');return{id,name:label(p.name,'la partida'),unit:label(p.unit,'la unidad'),quantity:numeric(p.quantity,'una cantidad',1e12),weight:numeric(p.weight,'una ponderación',100),start,end};}
export const planningWeight=tasks=>tasks.reduce((sum,t)=>sum+t.weight,0);
export function requireCompletePlan(tasks){assert(tasks.length>0,'Agrega al menos una partida.');assert(Math.abs(planningWeight(tasks)-100)<1e-6,'Las ponderaciones deben sumar 100 % para calcular el avance global.');}
export function taskPlanned(task,date){const day=planningDay(date),start=planningDay(task.start),end=planningDay(task.end);return Math.max(0,Math.min(1,(day-start+1)/(end-start+1)));}
export function plannedPercent(tasks,date){requireCompletePlan(tasks);planningDate(date);return Math.min(100,tasks.reduce((sum,t)=>sum+t.weight*taskPlanned(t,date),0));}
export function measurePlan(tasks,input,date){requireCompletePlan(tasks);planningDate(date);assert(input&&typeof input==='object','Completa las cantidades acumuladas.');const quantities={};let actual=0,complete=true;
 for(const task of tasks){const value=input[task.id];assert(value!==''&&value!=null&&Number.isFinite(Number(value))&&Number(value)>=0&&Number(value)<=task.quantity,'Cantidad acumulada fuera de rango para '+task.name+'.');quantities[task.id]=Number(value);complete&&=Number(value)===task.quantity;actual+=task.weight*(Number(value)/task.quantity);}
 return{planned:plannedPercent(tasks,date),actual:complete?100:Math.min(actual,99.9999999999),quantities};
}
export function curveData(r){const tasks=r.planning?.tasks||[];requireCompletePlan(tasks);const start=tasks.reduce((s,t)=>t.start<s?t.start:s,tasks[0].start),end=tasks.reduce((s,t)=>t.end>s?t.end:s,tasks[0].end);const first=planningDay(start)-1,last=planningDay(end),days=new Set([first,last,...tasks.flatMap(t=>[planningDay(t.start)-1,planningDay(t.end)]),...r.progress.map(p=>planningDay(p.date))]);for(let i=0;i<=40;i++)days.add(Math.round(first+(last-first)*i/40));return{planned:[...days].sort((a,b)=>a-b).map(day=>{const date=new Date(day*86400000).toISOString().slice(0,10);return{date,value:plannedPercent(tasks,date)};}),actual:r.progress.map(p=>({date:p.date,value:p.actual,source:p.source||'MANUAL'}))};}
