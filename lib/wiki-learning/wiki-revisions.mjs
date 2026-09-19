import { mkdir, open, readFile, rename, lstat, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { validateRecord, validateEpisode } from './contracts.mjs';
import { readConfinedFile, readEvidenceArtifact, sha256, inspectEpisodeEvidence } from './evidence.mjs';
import { inspectCorpusRecord } from './corpus.mjs';

const check = (ok, message) => { if (!ok) throw new Error(`Scientific wiki: ${message}`); };
const digest = value => sha256(JSON.stringify(value));
const encode = value => JSON.stringify(value, null, 2) + '\n';
const revisionId = id => check(typeof id === 'string' && /^[a-f0-9]{64}$/u.test(id), 'invalid revision');
const unique = (values, name) => check(new Set(values).size === values.length, `duplicate ${name}`);
const neutral = s => s.replace(/[&<>"']/gu, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const listing = s => neutral(s).replace(/[\r\n|\[\]`*_\\]/gu, ' ');

async function jsonEvidence(root, descriptor) {
  const result = await readEvidenceArtifact(root, descriptor);
  check(result, `missing citation ${descriptor.path}`);
  return JSON.parse(result.bytes.toString('utf8'));
}

export async function inspectPattern(input, { root }) {
  const pattern = validateRecord('pattern', input);
  check(!/[\r\n]/u.test(pattern.title), 'title must be one line');
  const observations = [];
  for (const citation of pattern.citations) {
    check(citation.corpus.path.startsWith('artifacts/wiki-learning/corpus/'), 'citation must name an explicit corpus record');
    const corpus = await jsonEvidence(root, citation.corpus);
    const eligible = await inspectCorpusRecord(corpus, { root });
    const unit = corpus.units.find(u => u.id === citation.unitId);
    const decision = eligible.units.find(u => u.id === citation.unitId);
    check(eligible.eligible && decision?.eligible && decision.evidenceStatus === 'observed-within-scope', 'ineligible or incomplete scientific citation');
    check(unit.lessonKind === pattern.lessonKind, 'cannot convert a source finding into a procedure');
    const episode = validateEpisode(await jsonEvidence(root, corpus.episode));
    const evidence = await inspectEpisodeEvidence(episode, { root });
    const witnesses = [...unit.actionWitnesses, unit.outcomeWitness];
    const unitJoins=episode.joins.filter(j=>witnesses.some(w=>w.eventId===j.eventId));
    for (const field of ['evidenceIds','eventIds','operationIds']) unique(citation[field], field);
    check(witnesses.every(w => citation.eventIds.includes(w.eventId)), 'citation omits a selected unit witness');
    check(citation.eventIds.every(id => witnesses.some(w => w.eventId === id)), 'unknown unit event citation');
    check(unit.sourceEvidenceIds.every(id => citation.evidenceIds.includes(id)), 'citation omits source evidence');
    for (const id of citation.evidenceIds) {
      const entry = episode.evidence.find(e => e.id === id);
      check(entry?.artifact, 'missing evidence ID/artifact');
      check(unit.sourceEvidenceIds.includes(id)||unitJoins.some(j=>j.evidenceId===id)||witnesses.some(w=>w.exchange.path===entry.artifact.path&&w.exchange.sha256===entry.artifact.sha256),'evidence is outside selected unit');
      await jsonEvidence(root, entry.artifact);
    }
    const joins = episode.joins.filter(j => citation.eventIds.includes(j.eventId));
    for (const id of citation.operationIds) check(joins.some(j => j.operationId === id && citation.evidenceIds.includes(j.evidenceId) && evidence.joins.some(e => e.id === j.id && e.status === 'verified')), 'unknown or unverified operation citation');
    check(joins.every(j => citation.operationIds.includes(j.operationId) && citation.evidenceIds.includes(j.evidenceId)), 'citation omits joined operation/receipt');
    observations.push({corpusId:corpus.id,unitId:unit.id,outcome:unit.outcome,episodeId:episode.id});
  }
  return {pattern, observations, scope:'citation-integrity-and-eligibility-only', scientificTruth:'not-established'};
}

export function renderPattern(pattern) {
  // JSON is valid YAML front matter; deterministic metadata and escaped prose.
  const bullets = values => values.map(x => `- ${neutral(x)}`).join('\n');
  return `---\n${JSON.stringify(pattern,null,2)}\n---\n# ${neutral(pattern.title)}\n\nStatus: **${pattern.status}**. Validation: **candidate-not-generalized**. Citation integrity is not scientific truth or authorization.\n\n## Observation\n\n${neutral(pattern.claim)}\n\n## Applicability\n\n${neutral(pattern.applicability)}\n\n## Competing explanations\n\n${bullets(pattern.competingExplanations)}\n\n## Missing evidence\n\n${bullets(pattern.missingEvidence)}\n\n## Revalidation\n\n${neutral(pattern.revalidateWhen)}\n\n## Evidence\n\n${pattern.citations.map(c=>`- Corpus: ${c.corpus.path} (SHA-256 ${c.corpus.sha256}); unit: ${c.unitId}; events: ${c.eventIds.join(', ')}; evidence: ${c.evidenceIds.join(', ')}; operations: ${c.operationIds.join(', ')||'none'}.`).join('\n')}\n`;
}

export function buildIndex(patterns) {
  check(patterns.length <= 256, 'pattern count bound');
  const rows = [...patterns].sort((a,b)=>a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const section=(title,predicate)=>`## ${title}\n\n${rows.filter(predicate).map(p=>`- [${listing(p.title)}](patterns/${p.id}.md) — ${p.status}; ${p.lessonKind}; candidate-not-generalized`).join('\n')||'None.'}\n`;
  const result='# Scientific workflow wiki\n\nEvidence for authorized maintenance; not automatically injected task instructions. Review does not establish generality. Validate citations before use.\n\n'+section('Reviewed procedural candidates',p=>p.status==='reviewed'&&p.lessonKind==='procedure')+'\n'+section('Reviewed source snapshots',p=>p.status==='reviewed'&&p.lessonKind==='scientific-finding')+'\n'+section('Proposed candidates — not current advice',p=>p.status==='proposed')+'\n'+section('Inactive history — not current advice',p=>['contradicted','superseded','withdrawn'].includes(p.status));
  check(Buffer.byteLength(result)<=65536,'index byte bound'); return result;
}

async function head(root) {
  try { const id=(await readConfinedFile(root,'wiki/HEAD',128)).toString().trim();revisionId(id);return id; }
  catch(e){if(e.code==='ENOENT')return null;throw e;}
}

async function snapshot(root,id) {
  revisionId(id);const prefix=`wiki/revisions/${id}`;
  const state=JSON.parse(await readConfinedFile(root,`${prefix}/state.json`,2*1024*1024));
  check(state.schemaVersion==='1.0.0' && state.revision===id,'state version/revision');
  check(Array.isArray(state.patterns)&&state.patterns.length<=256,'state bound');
  const patterns=state.patterns.map(p=>validateRecord('pattern',p));unique(patterns.map(p=>p.id),'patterns');
  const expectedFiles={};
  for(const p of patterns)expectedFiles[`patterns/${p.id}.md`]=renderPattern(p);
  expectedFiles['index.md']=buildIndex(patterns);
  check(Array.isArray(state.history)&&state.history.length<=256,'history bound');
  check(state.history.length>0&&state.history.at(-1).baseRevision===state.parent,'history parent');
  unique(state.history.map(e=>e.proposalId),'history proposal');
  const proposal=validateRecord('wiki-proposal',JSON.parse(await readConfinedFile(root,`${prefix}/proposal.json`)));
  check(digest(proposal)===state.history.at(-1).proposalSha256&&proposal.baseRevision===state.parent,'proposal/history integrity');
  expectedFiles['evolution.jsonl']=state.history.map(x=>JSON.stringify(x)+'\n').join('');
  check(digest({parent:state.parent,files:state.files})===id,'revision hash');
  check(JSON.stringify(Object.keys(expectedFiles).sort())===JSON.stringify(Object.keys(state.files).sort()),'unexpected revision file manifest');
  for(const [path,content] of Object.entries(expectedFiles)) {
    check(state.files[path]===sha256(content),'manifest/content disagreement');
    check((await readConfinedFile(root,`${prefix}/${path}`,2*1024*1024)).toString()===content,`modified canonical file ${path}`);
  }
  return state;
}

export async function readWiki({root, verifyEvidence=true}) {
  const id=await head(root);if(!id)return {revision:null,patterns:[],history:[],parent:null};
  const state=await snapshot(root,id);let child=state;let depth=0;
  while(child.parent){check(++depth<256,'revision chain bound');const parent=await snapshot(root,child.parent);check(JSON.stringify(child.history.slice(0,-1))===JSON.stringify(parent.history),'history is not append-only');child=parent;}
  check(child.history.length===1,'invalid genesis history');
  if(verifyEvidence)for(const p of state.patterns)await inspectPattern(p,{root});
  return state;
}

export async function inspectProposal(input,{root, review=null}) {
  const proposal=validateRecord('wiki-proposal',input);
  check(proposal.batch.maxUnits<=64,'batch unit bound');
  unique(proposal.changes.map(p=>p.id),'changed pattern');
  unique(proposal.batch.selectedCorpus.map(c=>c.path),'selected corpus');
  unique(proposal.batch.outcomeStrata,'outcome strata');
  const current=await readWiki({root});check(current.revision===proposal.baseRevision,'base revision conflict');
  check(!current.history.some(e=>e.proposalId===proposal.id),'proposal ID already applied');
  const map=new Map(current.patterns.map(p=>[p.id,p]));const observations=[];
  const needsReview=proposal.changes.some(p=>p.status!=='proposed'||(map.has(p.id)&&map.get(p.id).status!=='proposed'));
  if(needsReview)check(review&&typeof review.reviewer==='string'&&review.reviewer.trim()&&typeof review.authorization==='string'&&review.authorization.trim(),'reviewed application requires explicit reviewer and authorization');
  if(review)check(Object.keys(review).sort().join(',')==='authorization,reviewer'&&JSON.stringify(review).length<=4096,'invalid review record');
  for(const p of proposal.changes){
    for(const c of p.citations)check(proposal.batch.selectedCorpus.some(s=>JSON.stringify(s)===JSON.stringify(c.corpus)),'citation outside selected batch');
    const inspected=await inspectPattern(p,{root});observations.push(...inspected.observations);map.set(p.id,p);
  }
  check(new Set(observations.map(o=>`${o.corpusId}/${o.unitId}`)).size<=proposal.batch.maxUnits,'selected unit budget exceeded');
  check(observations.every(o=>proposal.batch.outcomeStrata.includes(o.outcome))&&proposal.batch.outcomeStrata.every(s=>observations.some(o=>o.outcome===s)),'outcome strata differ from observations');
  for(const p of map.values())for(const [relation,status] of [['supersedes','superseded'],['contradicts','contradicted']])for(const id of p.relations[relation]){
    check(id!==p.id&&map.has(id),'unknown/self related pattern');check(map.get(id).status===status,'related advice must be made inactive in the same revision');
  }
  const patterns=[...map.values()].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);buildIndex(patterns);
  return {proposal,current,patterns,observations,review:review?{reviewer:review.reviewer,authorization:review.authorization}:null};
}

async function directory(root,relative) {
  let path=root;
  for(const part of relative.split('/')){path=join(path,part);try{await mkdir(path);}catch(e){if(e.code!=='EEXIST')throw e;}const s=await lstat(path);check(s.isDirectory()&&!s.isSymbolicLink(),'unsafe wiki directory');}
}
async function durableFile(path,content){const h=await open(path,'wx',0o600);try{await h.writeFile(content);await h.sync();}finally{await h.close();}}

/** Cooperative same-user coordinator. Authorization is recorded, not authenticated.
 * Immutable snapshots + atomic HEAD ensure a failed pre-commit write leaves current
 * advice intact. Orphan snapshots are ignored. A crash-held lock is never auto-stolen.
 */
export async function applyProposal(input,{root,review=null, beforeCommit}={}) {
  await directory(root,'wiki/revisions');
  const lock=await open(join(root,'wiki/.write-lock'),'wx',0o600).catch(e=>{if(e.code==='EEXIST')throw new Error('Scientific wiki: writer lock held; inspect interrupted writer before manual recovery');throw e;});
  const temporary=join(root,'wiki',`.HEAD-${randomUUID()}`);
  try {
    await lock.writeFile(encode({pid:process.pid,createdAt:new Date().toISOString()}));await lock.sync();
    const {proposal,current,patterns,observations,review:authorization}=await inspectProposal(input,{root,review});
    const event={schemaVersion:'1.0.0',proposalId:proposal.id,proposalSha256:digest(proposal),baseRevision:current.revision,appliedAt:new Date().toISOString(),review:authorization,batch:proposal.batch,changes:proposal.changes.map(p=>({id:p.id,from:current.patterns.find(x=>x.id===p.id)?.status??null,to:p.status})),scope:'reference-integrity-not-scientific-truth'};
    const history=[...current.history,event];check(history.length<=256,'history bound');
    const contents={};for(const p of patterns)contents[`patterns/${p.id}.md`]=renderPattern(p);
    contents['index.md']=buildIndex(patterns);contents['evolution.jsonl']=history.map(e=>JSON.stringify(e)+'\n').join('');
    const files=Object.fromEntries(Object.entries(contents).map(([p,c])=>[p,sha256(c)]));
    const revision=digest({parent:current.revision,files});const dir=join(root,'wiki/revisions',revision);
    await mkdir(dir);await mkdir(join(dir,'patterns'));
    for(const [p,c] of Object.entries(contents))await durableFile(join(dir,p),c);
    const state={schemaVersion:'1.0.0',revision,parent:current.revision,patterns,history,files};
    check(Buffer.byteLength(encode(state))<=2*1024*1024,'snapshot byte bound');
    await durableFile(join(dir,'state.json'),encode(state));
    // Retain exact proposal data alongside the snapshot; it is never executed.
    await durableFile(join(dir,'proposal.json'),encode(proposal));
    await snapshot(root,revision);
    if(beforeCommit)await beforeCommit(); // Fault injection for recovery regression.
    check(await head(root)===current.revision,'base revision conflict at commit');
    await durableFile(temporary,revision+'\n');await rename(temporary,join(root,'wiki/HEAD'));
    return {status:'applied',revision,parent:current.revision,patternCount:patterns.length,observations,scientificTruth:'not-established'};
  } finally {await lock.close();await rm(temporary,{force:true});await rm(join(root,'wiki/.write-lock'));}
}
