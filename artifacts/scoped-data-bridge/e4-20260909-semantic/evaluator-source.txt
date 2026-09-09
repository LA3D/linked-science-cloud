// Frozen E4 evaluator: factual support is judged only against this synthetic fixture.
export const fixture = {
  annotations: [
    {id:'a01',subject:'A',relation:'binds',object:'B',text:'Repeated direct measurements establish that A binds B.'},
    {id:'a02',subject:'C',relation:'inhibits',object:'D',text:'The controlled assay establishes that C does not inhibit D under the stated conditions.'},
    {id:'a03',subject:'E',relation:'transports',object:'F',text:'Preliminary observations suggest that E transports F; confirmation is pending.'},
    {id:'a04',subject:'G',relation:'catalyzes',object:'H',text:'The available observations cannot determine whether G catalyzes H.'},
    {id:'a05',subject:'I',relation:'locatedIn',object:'J',text:'No localization information for I is supplied. Its presence in J has not been assessed.'},
    {id:'a06',subject:'K',relation:'binds',object:'L',text:'An earlier binding proposal was overturned: the definitive follow-up establishes that K does not bind L.'},
    {id:'a07',subject:'M',relation:'regulates',object:'N',text:'M may regulate N according to an indirect observation; this remains a working hypothesis.'},
    {id:'a08',subject:'O',relation:'produces',object:'P',text:'A direct observation confirms that O produces P.'},
    {id:'a09',subject:'Q',relation:'inhibits',object:'R',text:'Two equally credible observations conflict about Q inhibiting R. The conflict is unresolved.'},
    {id:'a10',subject:'S',relation:'transports',object:'T',text:'The data do not rule out S transporting T, but supply no positive demonstration or preferred hypothesis.'},
    {id:'a11',subject:'U',relation:'subClassOf',object:'Root',text:'Using only the supplied subclass graph and transitivity, assess whether U is a subclass of Root.'},
    {id:'a12',subject:'Root',relation:'subClassOf',object:'U',text:'Using only the supplied subclass graph and transitivity, assess whether Root is a subclass of U. Missing paths do not prove disjointness or a negative assertion.'},
  ],
  graph: [
    {id:'g01',subject:'U',predicate:'http://www.w3.org/2000/01/rdf-schema#subClassOf',object:'V'},
    {id:'g02',subject:'V',predicate:'http://www.w3.org/2000/01/rdf-schema#subClassOf',object:'Root'},
  ],
};
export const contract = {
  task:'Assess each target claim using only the supplied annotation and graph. No external knowledge. Tentative positive evidence means supported with tentative uncertainty. Missing or unresolved evidence means undetermined, never contradicted merely by absence.',
  schema:{findings:[{id:'annotation id',claim:{subject:'exact target subject',relation:'exact target relation',object:'exact target object',verdict:'supported | contradicted | undetermined'},evidence:['annotation id and graph edge ids used'],uncertainty:'none | tentative | unknown'}]},
  requirements:'Exactly one finding per annotation, no additional fields. Cite its annotation and, for graph questions, both relevant graph edges. Preserve explicit negation, tentative language and unresolved uncertainty. No free-text rationale is requested.'
};
export const answerKey = ['supported:none','contradicted:none','supported:tentative','undetermined:unknown','undetermined:unknown','contradicted:none','supported:tentative','supported:none','undetermined:unknown','undetermined:unknown','supported:none','undetermined:unknown'];
const sameKeys=(x,keys)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).sort().join('|')===[...keys].sort().join('|');
export function score(value) {
  const shape=sameKeys(value,['findings'])&&Array.isArray(value.findings);
  const rows=shape?value.findings:[], ids=new Set(), checks=[];
  for(const [i,a] of fixture.annotations.entries()) {
    const matches=rows.filter(x=>x?.id===a.id), r=matches[0];
    const schema=matches.length===1&&sameKeys(r,['id','claim','evidence','uncertainty'])&&sameKeys(r.claim,['subject','relation','object','verdict'])&&['supported','contradicted','undetermined'].includes(r.claim.verdict)&&['none','tentative','unknown'].includes(r.uncertainty)&&Array.isArray(r.evidence)&&r.evidence.every(x=>typeof x==='string')&&new Set(r.evidence).size===r.evidence.length;
    const targets=!!schema&&['subject','relation','object'].every(k=>r.claim[k]===a[k]);
    const required=i>=10?[a.id,'g01','g02']:[a.id];
    const references=!!schema&&required.length===r.evidence.length&&required.every(x=>r.evidence.includes(x));
    const meaning=!!schema&&`${r.claim.verdict}:${r.uncertainty}`===answerKey[i];
    checks.push({id:a.id,schema:!!schema,targets,references,meaning,correct:targets&&references&&meaning});
    if(matches.length===1)ids.add(a.id);
  }
  return {assigned:12,completed:ids.size,extraRows:rows.length-ids.size,schemaValid:!!shape&&rows.length===12&&checks.every(x=>x.schema&&x.targets),validReferences:checks.filter(x=>x.references).length,correct:checks.filter(x=>x.correct).length,checks};
}
export function structuralOnly() {
  const reachable=(a,b,seen=new Set())=>a===b||(!seen.has(a)&&(seen.add(a),fixture.graph.some(e=>e.subject===a&&reachable(e.object,b,seen))));
  return {findings:fixture.annotations.map((a,i)=>({id:a.id,claim:{subject:a.subject,relation:a.relation,object:a.object,verdict:i>=10&&reachable(a.subject,a.object)?'supported':'undetermined'},evidence:i>=10?[a.id,'g01','g02']:[a.id],uncertainty:i>=10&&reachable(a.subject,a.object)?'none':'unknown'}))};
}
