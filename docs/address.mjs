import {canonicalRol} from './history.mjs';
export const ADDRESS_FIELDS=['street','houseNumber','neighborhood','sector','lot','block'];
const fold=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().trim();
const key=v=>fold(v).replace(/[^A-Z0-9]/g,'');
export const streetKey=v=>key(fold(v).replace(/^(?:AVENIDA|AVDA|AVD|AV|CALLE|PASAJE|PJE|CAMINO|CAM)\.?\s+/,'').replace(/^P\.?\s+/,'PASAJE '));
const numKey=v=>key(v).replace(/^0+(?=\d)/,'');
export function parsePropertyAddress(address){const s=String(address||'').trim(),parts=s.split(/,\s*/),main=parts.shift()||'',m=main.match(/^(.*?)\s+(?:N[°º.]?\s*|NUMERO\s+)([\w/-]+)(.*)$/i);return m?{street:m[1].trim(),houseNumber:m[2],neighborhood:[m[3].trim(),...parts].filter(Boolean).join(', ')}:{street:main,neighborhood:parts.join(', ')};}
const signature=f=>[streetKey(f.street),numKey(f.houseNumber),key(f.neighborhood?.replace(/\bPOBL\.?\s*/ig,'POBLACION ')),key(f.lot),key(f.block)].join('|');
const distinct=items=>[...new Map(items.map(c=>[signature(c.fields),c])).values()];
const display=f=>[f.street,f.houseNumber?'N° '+f.houseNumber:'',f.neighborhood].filter(Boolean).join(' ');
export function resolvePropertyAddress({rol,validated={},history=null,parcels=[]}){
 rol=canonicalRol(rol);const matches=history&&canonicalRol(history.rol)===rol,events=matches?(history.events||[]):[],addressEvents=events.filter(e=>e.address),eligible=addressEvents.filter(e=>(e.roles||[]).length===1&&canonicalRol(e.roles[0])===rol&&!e.variants?.address?.length);
 const raw=eligible.length?eligible.map(e=>({raw:e.address,refs:e.sources||[]})):matches&&!addressEvents.length?(history.addresses||[]).map(raw=>({raw,refs:[]})):[];
 const documentary=distinct(raw.map(a=>({kind:'HISTORY',label:'Planilla de permisos y obra menor',raw:a.raw,fields:parsePropertyAddress(a.raw),refs:a.refs})));
 const cadastral=distinct(parcels.filter(p=>canonicalRol(p.rol)===rol).filter(p=>p.street).map(p=>({kind:'GIS',label:'Catastro QGIS',raw:display({street:p.street,houseNumber:p.number,neighborhood:p.neighborhood}),fields:{street:p.street,houseNumber:p.number||'',neighborhood:p.neighborhood||'',lot:p.lot||''},featureId:p.id})));
 const conflicts=[],warnings=[];const conflict=(code,field,candidates)=>{conflicts.push({code,field,values:[...new Set(candidates.map(c=>c.raw||display(c.fields)).filter(Boolean))],source:candidates.map(c=>c.label).filter((v,i,a)=>a.indexOf(v)===i).join(' / ')});};
 const validatedCandidate=validated.street?{kind:'PROPERTY',label:'Ficha predial validada',raw:display(validated),fields:Object.fromEntries(ADDRESS_FIELDS.filter(k=>validated[k]).map(k=>[k,validated[k]]))}:null;
 const ambiguousHistory=matches&&(documentary.length>1||addressEvents.length>eligible.length);
 if(ambiguousHistory)conflict('HISTORY_ADDRESS_AMBIGUOUS','street',documentary.length?documentary:(history.addresses||[]).map(raw=>({raw,label:'Historial con ROL o dirección ambiguos'})));
 if(cadastral.length>1)conflict('GIS_ADDRESS_AMBIGUOUS','street',cadastral);
 if(parcels.length&&!parcels.some(p=>canonicalRol(p.rol)===rol))conflict('SECONDARY_ROL_ONLY','street',parcels.map(p=>({raw:display({street:p.street,houseNumber:p.number}),label:'ROL secundario del catastro'})));
 let chosen=validatedCandidate||(!ambiguousHistory&&documentary.length===1?documentary[0]:!ambiguousHistory&&documentary.length===0&&cadastral.length===1?cadastral[0]:null);
 const candidates=[...(validatedCandidate?[validatedCandidate]:[]),...documentary,...cadastral];
 for(let i=0;i<candidates.length;i++)for(let j=i+1;j<candidates.length;j++){const a=candidates[i],b=candidates[j];if(streetKey(a.fields.street)!==streetKey(b.fields.street))conflict('ADDRESS_STREET_MISMATCH','street',[a,b]);else if(a.fields.houseNumber&&b.fields.houseNumber&&numKey(a.fields.houseNumber)!==numKey(b.fields.houseNumber))conflict('ADDRESS_NUMBER_MISMATCH','houseNumber',[a,b]);}
 const fields=chosen?{...chosen.fields}:{};
 // Missing components can only come from a compatible documentary tuple.
 if(chosen===validatedCandidate&&documentary.length===1&&!ambiguousHistory){const f=documentary[0].fields;if(streetKey(f.street)===streetKey(fields.street)&&(!fields.houseNumber||!f.houseNumber||numKey(fields.houseNumber)===numKey(f.houseNumber)))for(const k of ADDRESS_FIELDS)if(!fields[k]&&f[k])fields[k]=f[k];}
 if(!validatedCandidate&&ADDRESS_FIELDS.some(k=>k!=='street'&&validated[k]))warnings.push('Hay componentes prediales validados sin calle validada; no se mezclaron con otra dirección.');
 const uniqueConflicts=[...new Map(conflicts.map(c=>[c.code+'|'+c.values.slice().sort().join('|'),c])).values()];
 if(uniqueConflicts.length)warnings.push('Direcciones discordantes: revisa el antecedente documental y confirma la identificación del predio antes de enviar a dirección. La zona cartográfica no se precarga mientras exista esta discrepancia.');
 if(chosen?.kind==='HISTORY')warnings.push('Dirección precargada desde la planilla DOM; el profesional debe cotejar su vigencia. El catastro no sustituye esta dirección.');
 return {fields,candidates,selectedSource:chosen?.kind||null,selectedLabel:chosen?.label||'',selectedReferences:chosen?.refs||[],conflicts:uniqueConflicts,warnings,requiresReview:uniqueConflicts.length>0,geometryReliable:uniqueConflicts.length===0,documentaryAddressCount:documentary.length,cadastralAddressCount:cadastral.length};
}
