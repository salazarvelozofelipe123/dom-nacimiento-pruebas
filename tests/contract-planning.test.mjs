import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanTask,measurePlan,plannedPercent,curveData} from '../docs/contract-planning.mjs';
import {ganttHTML,curveHTML} from '../docs/contract-planning-ui.mjs';
const tasks=[cleanTask({name:'Fundaciones',unit:'m³',quantity:100,weight:30,start:'2026-11-01',end:'2026-11-05'},'a'),cleanTask({name:'Estructura',unit:'m²',quantity:200,weight:70,start:'2026-11-06',end:'2026-11-15'},'b')];
test('Avance por partidas pondera unidades distintas; programación inclusiva y cantidades acumuladas',()=>{
 assert.equal(plannedPercent(tasks,'2026-10-31'),0);assert.equal(plannedPercent(tasks,'2026-11-01'),6);assert.equal(plannedPercent(tasks,'2026-11-05'),30);assert.equal(plannedPercent(tasks,'2026-11-15'),100);
 const p=measurePlan(tasks,{a:50,b:20},'2026-11-05');assert.equal(p.actual,22);assert.equal(p.planned,30);assert.deepEqual(p.quantities,{a:50,b:20});
 assert.equal(measurePlan(tasks,{a:100,b:200},'2026-11-15').actual,100);
 assert.ok(measurePlan(tasks,{a:100,b:199.999999},'2026-11-15').actual<100);
});
test('Rechaza planes incompletos, cantidades ausentes, excesos y fechas inexistentes',()=>{
 assert.throws(()=>measurePlan(tasks,{a:50},'2026-11-05'),/fuera de rango/);
 for(const value of [-1,101,'',null,'Infinity'])assert.throws(()=>measurePlan(tasks,{a:value,b:0},'2026-11-05'),/rango/);
 assert.throws(()=>plannedPercent([tasks[0]],'2026-11-05'),/100/);
 assert.throws(()=>plannedPercent([],'2026-11-05'),/partida/);
 for(const patch of [{quantity:0},{weight:0},{weight:101},{start:'2026-11-31'},{end:'2026-10-31'}])assert.throws(()=>cleanTask({...tasks[0],...patch},'a'));
 const one=cleanTask({...tasks[0],weight:100,start:'2028-02-29',end:'2028-02-29'},'a');assert.equal(plannedPercent([one],'2028-02-28'),0);assert.equal(plannedPercent([one],'2028-02-29'),100);
});
test('Curva conserva fecha y origen reales sin inventar avance futuro; gráficos escapan nombres',()=>{
 const r={planning:{tasks},progress:[{date:'2026-11-05',actual:22,planned:30,source:'PARTIDAS'}]};const curve=curveData(r);
 assert.deepEqual(curve.actual,[{date:'2026-11-05',value:22,source:'PARTIDAS'}]);assert.equal(curve.planned.at(-1).value,100);assert.ok(curve.planned.some(p=>p.date==='2026-11-05'&&p.value===30));
 const chart=curveHTML(r);assert.match(chart,/22 %/);assert.match(chart,/no proyecta avances futuros/);
 const html=ganttHTML([{...tasks[0],name:'<script>prueba</script>'}]);assert.doesNotMatch(html,/<script>/);assert.match(html,/&lt;script&gt;/);
 const manual=curveHTML({progress:[{date:'2026-11-05',planned:60,actual:45}]});assert.match(manual,/porcentajes manuales/);assert.match(manual,/45 %/);
});
