import test from 'node:test';
import assert from 'node:assert/strict';
import {EXPEDIENTE_FORMS,cleanFormValues,expedienteDraftHTML} from '../docs/expediente-forms.mjs';
test('La ficha exportada distingue el borrador, conserva texto y escapa contenido activo',()=>{
 for(const f of EXPEDIENTE_FORMS){assert.equal(new URL(f.source).hostname,'www.minvu.gob.cl');const html=expedienteDraftHTML({id:'caso-1',title:'<script>alert(1)</script>'},{formId:f.id,version:2,updatedAt:'2026-11-13',values:cleanFormValues({work:'<img src=x onerror=alert(1)>',owner:'Ficticio & ejemplo'})});assert.match(html,/SIN FIRMA NI VALIDEZ OFICIAL/);assert.match(html,/no reproduce ni reemplaza/);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>|<img /);assert.match(html,/Ficticio &amp; ejemplo/);}
});
