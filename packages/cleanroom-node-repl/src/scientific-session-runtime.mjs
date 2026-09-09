import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
let DataFactory;
async function loadDataFactory() {DataFactory ??= (await import('n3')).DataFactory;}

const error = code => { throw Object.assign(new Error(code), {code}); };
const term = t => {
  if (!t || !['NamedNode','BlankNode','Variable','DefaultGraph','Literal'].includes(t.termType) || typeof t.value !== 'string') error('SESSION_TERM');
  return {termType:t.termType,value:t.value,...(t.termType==='Literal'?{language:t.language,datatype:t.datatype.value}:{})};
};
const native = t => {
  if (!t || typeof t.value !== 'string') error('SESSION_TERM');
  switch(t.termType) {
    case 'NamedNode': return DataFactory.namedNode(t.value);
    case 'BlankNode': return DataFactory.blankNode(t.value);
    case 'Variable': return DataFactory.variable(t.value);
    case 'DefaultGraph': if(t.value==='')return DataFactory.defaultGraph();break;
    case 'Literal': if(typeof t.language==='string'&&typeof t.datatype==='string')return DataFactory.literal(t.value,t.language||DataFactory.namedNode(t.datatype));break;
  }
  error('SESSION_TERM');
};
const bounded = value => {
  if(Buffer.byteLength(JSON.stringify(value))>128*1024)error('SESSION_RESPONSE_LIMIT');
  return value;
};
function paging(args) {
  const offset=args.offset??0,limit=args.limit??32;
  if(!Number.isSafeInteger(offset)||offset<0||!Number.isInteger(limit)||limit<1||limit>128)error('SESSION_PAGE');
  return {offset,limit};
}

// Native handles never leave this registry. Remote references are meaningful
// only after the service has authorized a connection, object and operation.
export function createScientificSessionRuntime({control}) {
  const objects=new Map(),outputs=new Map();
  const resolve = id => {
    const record=objects.get(id);if(!record)error('SESSION_OBJECT_UNKNOWN');
    record.workspace.results.profile(record.handle);
    if(record.parent)resolve(record.parent);
    return record;
  };
  const publish=(workspace,handle)=>{
    const profile=workspace.results.profile(handle);
    const id=randomUUID();objects.set(id,{workspace,handle,kind:profile.type});
    return {object:id,kind:profile.type,count:profile.count,epoch:handle.epoch};
  };
  const dispatch=async ({operation,args={}}) => {
    if(operation==='deposit') {
      if(typeof args.slot!=='string'||!args.slot||typeof args.value!=='object'||args.value===null)error('SESSION_OUTPUT_SCHEMA');
      bounded(args.value);
      if(outputs.has(args.slot))error('SESSION_DUPLICATE_DEPOSIT');
      outputs.set(args.slot,structuredClone(args.value));return {slot:args.slot,status:'deposited'};
    }
    if(operation==='result') {
      if(!outputs.has(args.slot))error('SESSION_RESULT_PENDING');
      return bounded({slot:args.slot,value:structuredClone(outputs.get(args.slot))});
    }
    const r=resolve(args.object);
    if(operation==='describe') {const p=r.workspace.results.profile(r.handle);return {object:args.object,kind:r.kind,count:p.count,columns:p.columns,epoch:r.handle.epoch};}
    if(operation==='match') {
      await loadDataFactory();
      const {offset,limit}=paging(args),pattern=args.pattern??{};
      if(Object.keys(pattern).some(k=>!['subject','predicate','object','graph'].includes(k)))error('SESSION_PATTERN');
      const values=['subject','predicate','object','graph'].map(k=>pattern[k]?native(pattern[k]):null);
      const quads=[];let index=0,more=false;
      for await(const q of r.workspace.rdf.source(r.handle).match(...values)) {
        resolve(args.object);if(index++<offset)continue;
        if(quads.length===limit){more=true;break;}
        quads.push([q.subject,q.predicate,q.object,q.graph].map(term));bounded(quads);
      }
      resolve(args.object);return bounded({quads,nextOffset:offset+quads.length,complete:!more});
    }
    if(operation==='bindings') {
      const {offset,limit}=paging(args),rows=[];let index=0,more=false;
      for await(const row of r.workspace.results.iterate(r.handle,{batchSize:32})) {
        resolve(args.object);if(index++<offset)continue;
        if(rows.length===limit){more=true;break;}
        rows.push([...row].map(([name,t])=>[name,term(t)]));bounded(rows);
      }
      resolve(args.object);return bounded({rows,nextOffset:offset+rows.length,complete:!more});
    }
    if(operation==='query') {
      if(typeof args.sparql!=='string'||args.sparql.length>65536||args.sources!==undefined)error('SESSION_QUERY');
      let ast;try{const {default:sparqljs}=await import('sparqljs');ast=new sparqljs.Parser().parse(args.sparql);}catch{error('SESSION_QUERY');}
      if(ast.type!=='query'||ast.from)error('SESSION_QUERY_SCOPE');
      const inspect=v=>{if(!v||typeof v!=='object')return;if(v.type==='service')error('SESSION_QUERY_SCOPE');for(const x of Object.values(v))if(Array.isArray(x))x.forEach(inspect);else inspect(x);};inspect(ast);
      const result=await r.workspace.query.run({sources:[r.handle],sparql:args.sparql});
      try{resolve(args.object);}catch(e){await r.workspace.release(result);throw e;}
      const published=publish(r.workspace,result);objects.get(published.object).parent=args.object;return published;
    }
    error('SESSION_OPERATION');
  };
  const request=(operation,args)=> (args.object&&objects.has(args.object)) || (operation==='result'&&outputs.has(args.slot))
    ? dispatch({operation,args}) : control({operation:'request',args:{operation,args}});
  return Object.freeze({
    publish,
    unpublish(reference){const id=typeof reference==='string'?reference:reference.object;if(!objects.delete(id))error('SESSION_OBJECT_UNKNOWN');return {object:id,status:'unpublished'};},
    dispatch,
    create:args=>control({operation:'create',args}),
    attach:args=>control({operation:'attach',args}),
    grant:args=>control({operation:'grant',args}),
    status:()=>control({operation:'status',args:{}}),
    describe:object=>request('describe',{object}),
    query:(object,sparql)=>request('query',{object,sparql}),
    deposit:(slot,value)=>request('deposit',{slot,value}),
    result:slot=>request('result',{slot}),
    source(object) {
      return Object.freeze({match(subject,predicate,objectTerm,graph){
        const pattern=Object.fromEntries([['subject',subject],['predicate',predicate],['object',objectTerm],['graph',graph]].filter(([,v])=>v!=null).map(([k,v])=>[k,term(v)]));
        return Readable.from((async function*(){await loadDataFactory();let offset=0;for(;;){const page=await request('match',{object,pattern,offset,limit:32});for(const q of page.quads)yield DataFactory.quad(...q.map(native));if(page.complete)return;if(page.nextOffset<=offset)error('SESSION_CURSOR');offset=page.nextOffset;}})(),{objectMode:true});
      }});
    },
    bindings(object) {return (async function*(){await loadDataFactory();let offset=0;for(;;){const page=await request('bindings',{object,offset,limit:32});for(const row of page.rows)yield new Map(row.map(([name,t])=>[name,native(t)]));if(page.complete)return;if(page.nextOffset<=offset)error('SESSION_CURSOR');offset=page.nextOffset;}})();}
  });
}
