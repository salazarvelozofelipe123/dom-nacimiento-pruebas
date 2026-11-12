// Municipal template values supplied by DOM Nacimiento on 05-11-2026.
// These are template defaults, not a cadastral finding or a legal verification.
export const CIP_DEFAULTS_VERSION='DOM-CIP-2026-11-05';
export const CIP_DEFAULT_FIELDS=Object.freeze({
 prc:'NACIMIENTO',
 prcDate:'2009-07-13',
 allowedUses:'SE ADJUNTA CERTIFICADO DETALLADO DE ZONIFICACIÓN Y NORMAS URBANÍSTICAS APLICABLES AL PREDIO',
 slope:'70%',
 adjoining:'2.6.2 OGUC',
 distances:'2.6.3 OGUC',
 fenceHeight:'2 m',
 fenceTransparency:'60',
 chamfers:'ART. 2.5.4. O.G.U.C.',
 parking:[
  '-Estacionamientos para personas con discapacidad según artículo 2.4.2 O.G.U.C.',
  '-C. ocupación > 50 personas: Estacionamientos para bicicletas (artículo 2.4.1 bis O.G.U.C. y artículo transitorio D.S. 109)',
  '-Estacionamientos para personas con discapacidad según artículo 2.4.2 O.G.U.C.'
 ].join('\n')
});
export const isCipDefaultField=(type,key)=>type==='CIP'&&Object.hasOwn(CIP_DEFAULT_FIELDS,key);
export function withCertificateDefaults(type,fields={}){
 const next={...fields};if(type==='CIP')for(const[k,v]of Object.entries(CIP_DEFAULT_FIELDS))if(next[k]===undefined||next[k]===null||String(next[k]).trim()==='')next[k]=v;
 return next;
}
