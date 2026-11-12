import{CPYR_WORD_TEMPLATE}from'./templates/cpyr-word-template.mjs';
const date=v=>/^\d{4}-\d\d-\d\d$/.test(v||'')?v.split('-').reverse().join('.'):String(v||'');
export function municipalValues(r){const f=r.fields||{};return{number:r.number?String(r.number)+(r.isPreview?'':'/'+r.year):'BORRADOR',description:'El inmueble ubicado en '+[f.street,f.houseNumber?'N° '+f.houseNumber:'',f.neighborhood,f.sector].filter(Boolean).join(', ')+', Rol de Avalúo Nº '+r.rol+', de la Comuna de Nacimiento, cuenta con:',surfaceParagraph:'Superficie Total Construida con Permiso y Recepción: '+(f.certifiedSurface?f.certifiedSurface+' m².':'[por verificar].')+(f.technicalNotes?' '+f.technicalNotes:''),requestParagraph:'Se extiende el presente certificado a petición de Don (ña) '+r.applicant+(r.applicantRut?', RUT N° '+r.applicantRut:'')+', para los fines que estime pertinentes.',entry:r.entry||'Por definir',date:date(r.certificateDate)};}
const xml=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
// A single row model keeps the municipal Word, preview and editable PDF consistent.
export function municipalRows(r){
 const acts=r.acts||[];
 if(!acts.length)return [
  {key:'empty_permit',label:'PERMISO EDIFICACIÓN',value:'N° [por completar] de fecha [por completar]'},
  {key:'empty_surface',label:'SUPERFICIE',value:'[por verificar] m²'},
  {key:'empty_reception',label:'RECEPCIÓN',value:'N° [por completar] de fecha [por completar]'}
 ];
 return acts.flatMap((a,i)=>[
  {key:'act_'+i,label:String(a.type||'TIPO DE ACTO POR COMPLETAR').replace(/^Permiso de edificación$/i,'PERMISO EDIFICACIÓN').toUpperCase(),value:'N° '+(a.number||'[por completar]')+' de fecha '+(date(a.date)||'[por completar]')+(a.scope?' · '+a.scope:''),labelPrefix:'cpyr_act_'+i+'_',valuePrefix:'cpyr_act_value_'+i+'_'},
  ...(a.surface?[{key:'act_surface_'+i,label:'SUPERFICIE',value:a.surface+' m²'}]:[])
 ]);
}
function editedText(r,prefix,value){for(const[id,e]of Object.entries(r.documentEdits||{}))if(id.startsWith(prefix)&&e.original&&value.includes(e.original))value=value.replace(e.original,e.value);return value;}
export function municipalWordEntries(r,logo){const t=CPYR_WORD_TEMPLATE,values=municipalValues(r),entries={...t.entries};for(const [key,prefix]of [['description','cpyr_description_'],['surfaceParagraph','cpyr_surface_'],['requestParagraph','cpyr_request_']])for(const [id,edit]of Object.entries(r.documentEdits||{}))if(id.startsWith(prefix)&&values[key].includes(edit.original))values[key]=values[key].replace(edit.original,edit.value);let rows='';const rowModel=municipalRows(r);for(const[i,row]of rowModel.entries()){
  // Retain the master's outer frame; only the first and last rows carry horizontal borders.
  const border=(side,visible)=>'<w:'+side+' w:val="'+(visible?'single':'nil')+'"'+(visible?' w:sz="4" w:space="0" w:color="auto"':'')+'/>';
  const nativeRow=t.actRow.replace(/<w:top\b[^>]*\/>/g,border('top',i===0)).replace(/<w:bottom\b[^>]*\/>/g,border('bottom',i===rowModel.length-1));
  rows+=nativeRow.replace('{{actType}}',xml(editedText(r,row.labelPrefix||'cpyr_'+row.key+'_label_',row.label))).replace('{{actValue}}',xml(editedText(r,row.valuePrefix||'cpyr_'+row.key+'_value_',row.value)));
 }let doc=entries['word/document.xml'].replace('<!--ACT_ROWS-->',rows);for(const[k,v]of Object.entries(values))doc=doc.replaceAll('{{'+k+'}}',xml(v));
 // Preserve previous free-text amendments in an explicit annex rather than silently discarding them.
 const unhandled=Object.entries(r.documentEdits||{}).filter(([id])=>!/^cpyr_(description|surface|request|act|empty)_/.test(id)).map(([,e])=>e);if(unhandled.length){const edits=unhandled.map(e=>`<w:p><w:r><w:t xml:space="preserve">${xml(e.value)}</w:t></w:r></w:p>`).join('');doc=doc.replace('<w:sectPr',`<w:p><w:r><w:br w:type="page"/></w:r></w:p><w:p><w:r><w:t>Ediciones de redacción conservadas</w:t></w:r></w:p>${edits}<w:sectPr`);}
 doc=doc.replace('<w:sectPr',`<w:p><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr><w:r><w:rPr><w:sz w:val="14"/></w:rPr><w:t>BORRADOR SIN FIRMA · Revisión ${r.documentVersion||1}</w:t></w:r></w:p><w:sectPr`);entries['word/document.xml']=doc;entries['word/media/image1.png']=logo;return entries;}
export function municipalScene(r,schema){
 const values=municipalValues(r),pages=[{width:612,height:792,background:'cpyr-native-1',ops:[{kind:'rect',x:84,y:220,w:10,h:18,fill:'#ffffff',mask:true}]}];let p=pages[0],y=192;
 const used=new Set(['street','houseNumber','neighborhood','sector','certifiedSurface','technicalNotes','directorName']);
 const wrap=(value,width,size)=>{
  const max=Math.max(1,Math.floor(width/(size*.56))),out=[];
  for(const para of String(value??'').split('\n')){let line='';for(const token of para.split(/\s+/)){let word=token;while(word.length>max){if(line){out.push(line);line='';}out.push(word.slice(0,max));word=word.slice(max);}if(line&&line.length+word.length+1>max){out.push(line);line='';}line+=(line?' ':'')+word;}out.push(line);}return out;
 };
 const newPage=()=>{p={width:612,height:792,ops:[]};pages.push(p);y=75;};
 const text=(value,key,x,width,size,bold=false)=>{const lines=wrap(value,width,size);for(const [i,line]of lines.entries())p.ops.push({kind:'text',x,y:y+i*14,size,width,text:line,original:line,id:'cpyr_'+key+'_'+i,system:false,bold});return lines.length;};
 const flow=(value,key,bold=false,size=12)=>{const original=wrap(value,440,size);for(const[i,line]of original.entries()){
  const id='cpyr_'+key+'_'+i,e=r.documentEdits?.[id],actual=e?.original===line?e.value:line;
  for(const[j,part]of wrap(actual,440,size).entries()){if(y>680)newPage();p.ops.push({kind:'text',x:85.15,y,size,width:440,text:part,original:line,id:id+(j?'_continued_'+j:''),system:false,bold});y+=16;}
 }y+=14;};
 p.ops.push({kind:'text',x:306,y:115,size:14,bold:true,align:'center',underline:true,width:310,text:'CERTIFICADO Nº '+values.number,original:'CERTIFICADO Nº '+values.number,id:'cpyr_number',system:true});
 flow(values.description,'description');
 let frame;
 for(const row of municipalRows(r)){
  const label=editedText(r,row.labelPrefix||'cpyr_'+row.key+'_label_',row.label),value=editedText(r,row.valuePrefix||'cpyr_'+row.key+'_value_',row.value);
  const lines=Math.max(wrap(label,122,10).length,wrap(value,295,11).length),height=Math.max(22,lines*14+8);
  if(y+height>660){newPage();frame=null;}
  if(!frame){frame={kind:'rect',x:85.15,y:y-12,w:442.8,h:0};p.ops.push(frame);}
  frame.h+=height;
  text(label,(row.labelPrefix||'cpyr_'+row.key+'_label_').slice(5,-1),90.8,122,10,true);
  text(value,(row.valuePrefix||'cpyr_'+row.key+'_value_').slice(5,-1),225.25,295,11);
  y+=height;
 }
 y+=18;flow(values.surfaceParagraph,'surface');y+=15;flow(values.requestParagraph,'request');
 if(r.fields?.directorName){y=Math.max(y+35,535);flow(r.fields.directorName,'director',true,11);}
 y=Math.max(y+20,597);flow('Ingreso N° '+values.entry,'entry',false,9);y-=13;flow('Fecha        '+values.date,'date',false,9);
 const legacy=Object.entries(r.documentEdits||{}).filter(([key])=>!key.startsWith('cpyr_'));
 if(legacy.length){newPage();flow('EDICIONES CONSERVADAS DEL FORMATO ANTERIOR','legacy',true);for(const[key,e]of legacy)flow(e.value,key,false,10);}
 const extra=schema.filter(f=>r.fields?.[f.id]&&!used.has(f.id));
 if(extra.length){newPage();flow('ANEXO DE ANTECEDENTES DEL CERTIFICADO','annex',true);for(const f of extra)flow(f.label+': '+r.fields[f.id],f.id,false,10);}
 for(const[i,page]of pages.entries())page.ops.push({kind:'text',x:38,y:774,size:7,text:`BORRADOR SIN FIRMA · Revisión ${r.documentVersion||1} · ${i+1}/${pages.length}`,original:'',id:'cpyr_draft_'+i,system:true});
 return{pages,template:'CPYR',municipal:true};
}
