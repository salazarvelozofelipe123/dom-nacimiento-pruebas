// Working drafts are separate from the Ministry's official forms and issued acts.
const root='https://www.minvu.gob.cl/elementos-tecnicos/formularios/';
const building=root+'formularios-de-permisos-de-edificacion/';
const minor=root+'formularios-de-permisos-de-obra-menor/';
export const EXPEDIENTE_FORMS=[
 {id:'edificacion',title:'Permiso de edificación',types:['Edificación'],source:building},
 {id:'obra-menor',title:'Permiso de obra menor',types:['Obra menor'],source:minor},
 {id:'modificacion',title:'Modificación de proyecto',types:['Modificación de proyecto'],source:building},
 {id:'recepcion',title:'Recepción definitiva',types:['Recepción definitiva'],source:building},
 {id:'alteracion',title:'Alteración',types:['Alteración'],source:building},
 {id:'dj',title:'Declaración jurada',types:['Declaración jurada'],source:minor,otherSource:building}
];
export const EXPEDIENTE_FIELDS=[
 ['owner','Propietario o mandante ficticio'],['professional','Profesional patrocinante ficticio'],
 ['address','Dirección del proyecto'],['rol','ROL del proyecto'],['destination','Destino'],
 ['work','Descripción de las obras','textarea'],['landArea','Superficie del terreno (m²)','number'],
 ['existingArea','Superficie existente (m²)','number'],['projectArea','Superficie de la actuación (m²)','number'],
 ['previousPermit','Permiso anterior: número y fecha'],['scope','Variante y alcance de la actuación','textarea'],
 ['background','Antecedentes y planos revisados','textarea'],['grounds','Fundamentos y condiciones propuestas','textarea']
];
export function formDefinition(id){const f=EXPEDIENTE_FORMS.find(f=>f.id===id);if(!f)throw Error('Formato de expediente no válido.');return f;}
export function cleanFormValues(input={}){const out={};for(const [key,label,type]of EXPEDIENTE_FIELDS){const value=String(input[key]??'').trim();if(value.length>2000)throw Error(label+': máximo 2000 caracteres.');if(type==='number'&&value!==''&&(!Number.isFinite(Number(value))||Number(value)<0))throw Error(label+': indica una superficie válida.');out[key]=value;}return out;}
const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function expedienteDraftHTML(r,draft){const f=formDefinition(draft.formId);return `<!doctype html><html lang="es"><meta charset="utf-8"><title>Borrador · ${escape(f.title)}</title><style>body{font:15px Arial;margin:36px;color:#162f40}h1{font-size:24px}aside{padding:14px;border:2px solid #a96b13}dl{display:grid;grid-template-columns:1fr 1fr;gap:18px}dt{font-weight:bold}dd{margin:5px 0;white-space:pre-wrap;overflow-wrap:anywhere}footer{border-top:1px solid #aaa;margin-top:24px;padding-top:12px}@media print{body{margin:15mm}aside{break-inside:avoid}}</style><h1>DOM Nacimiento · ${escape(f.title)}</h1><aside>BORRADOR DE TRABAJO · DATOS FICTICIOS · SIN FIRMA NI VALIDEZ OFICIAL<br>Esta ficha no reproduce ni reemplaza el formulario único nacional MINVU.</aside><p>Expediente: ${escape(r.title)} · ${escape(r.id)}<br>Versión del borrador: ${draft.version} · Guardado: ${escape(draft.updatedAt)}</p><dl>${EXPEDIENTE_FIELDS.map(([key,label])=>`<div><dt>${escape(label)}</dt><dd>${escape(draft.values[key]||'Por completar')}</dd></div>`).join('')}</dl><footer>Fuente para seleccionar el formulario oficial y su variante: <a href="${f.source}">MINVU · ${escape(f.title)}</a>${f.otherSource?` · <a href="${f.otherSource}">DJ de edificación</a>`:''}<p>Selección de variante, verificación normativa, numeración, revisión y firma pendientes. Preparar este borrador no cambia la etapa ni aprueba el expediente.</p></footer></html>`;}
