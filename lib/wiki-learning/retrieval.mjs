import { mkdir, lstat, writeFile, readdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { readWiki } from './wiki-revisions.mjs';
import { readConfinedFile, readEvidenceArtifact, sha256 } from './evidence.mjs';

const area = 'artifacts/wiki-learning/consultations';
const check = (ok, message) => { if (!ok) throw Error(`Wiki retrieval: ${message}`); };
const bytes = value => Buffer.byteLength(JSON.stringify(value));
const stop = new Set('a an the is are to of and or in on for with how can do i we this that after before result results scientific'.split(' '));
const terms = text => [...new Set((text.toLowerCase().match(/[a-z0-9_]+/gu) ?? []).filter(t => t.length > 2 && !stop.has(t)))];
const idCheck = id => check(typeof id === 'string' && /^[a-f0-9-]{36}$/u.test(id), 'invalid consultation ID');

async function directory(root) {
  let path = root;
  for (const segment of area.split('/')) {
    path += '/' + segment;
    await mkdir(path).catch(e => { if (e.code !== 'EEXIST') throw e; });
    const stat = await lstat(path);
    check(stat.isDirectory() && !stat.isSymbolicLink(), 'unsafe consultation directory');
  }
  return path;
}
async function save(root, record) {
  const path = await directory(root);
  check(bytes(record) <= 32768, 'receipt byte bound');
  const name = `${record.consultationId}-${record.kind}-${randomUUID()}.json`;
  await writeFile(`${path}/${name}`, JSON.stringify(record, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  return `${area}/${name}`;
}
const base = (kind, consultationId) => ({schemaVersion:'1.0.0', kind, consultationId, recordedAt:new Date().toISOString()});

/** Lexical candidate selection; similarity never establishes applicability or truth. */
export function rankPatterns(patterns, query) {
  const queryTerms = terms(query);
  return patterns.filter(p => ['proposed','reviewed'].includes(p.status)).map(p => {
    const title = terms(`${p.id} ${p.title}`);
    const context = terms(p.applicability);
    const matched = queryTerms.filter(t => title.includes(t) || context.includes(t));
    const score = matched.reduce((n,t) => n + (title.includes(t) ? 3 : 1), 0);
    return {id:p.id,title:p.title,status:p.status,lessonKind:p.lessonKind,score,matchedTerms:matched,
      interpretation:p.status === 'proposed' ? 'hypothesis-only' : 'reviewed-candidate-not-generalized'};
  }).filter(p => p.matchedTerms.length >= 2).sort((a,b) => b.score-a.score || a.id.localeCompare(b.id));
}

export async function searchMemory({root,query,mode='on',maxItems=3}) {
  check(typeof query === 'string' && query.trim() && Buffer.byteLength(query)<=1024, 'query must be 1–1024 bytes');
  check(['on','off'].includes(mode), 'invalid retrieval mode');
  check(Number.isSafeInteger(maxItems)&&maxItems>=1&&maxItems<=5,'maxItems must be 1–5');
  const record = {...base('search',randomUUID()),mode,querySha256:sha256(query),revision:null,candidates:[],
    status:mode==='off'?'disabled':'available',omitted:0,helpfulness:'unknown',scope:'advisory-memory-not-authority-or-live-state'};
  if(mode==='on') {
    try {
      const state=await readWiki({root});record.revision=state.revision;
      const ranked=rankPatterns(state.patterns,query);
      for(const item of ranked.slice(0,maxItems)) {
        if(bytes({...record,candidates:[...record.candidates,item]})>3500)break;
        record.candidates.push(item);
      }
      record.omitted=ranked.length-record.candidates.length;
      if(!state.revision)record.status='empty';
    } catch { record.status='unavailable'; record.reason='Wiki revision or citation validation failed; continue from source evidence.'; }
  }
  const receiptPath=await save(root,record);
  return {...record,receiptPath};
}

async function searchReceipt(root,path) {
  check(typeof path==='string' && path.startsWith(area+'/') && path.endsWith('.json'),'expected consultation receipt');
  const r=JSON.parse(await readConfinedFile(root,path,32768));
  check(r.schemaVersion==='1.0.0'&&r.kind==='search','expected search receipt');idCheck(r.consultationId);
  return r;
}
export async function readMemory({root,receiptPath,patternId}) {
  const search=await searchReceipt(root,receiptPath);
  check(search.mode==='on'&&search.status==='available'&&search.candidates.some(p=>p.id===patternId),'pattern was not selected by this search');
  const state=await readWiki({root});
  check(state.revision===search.revision,'wiki changed; search again');
  const pattern=state.patterns.find(p=>p.id===patternId);
  check(pattern&&['proposed','reviewed'].includes(pattern.status),'pattern inactive or missing');
  const result={...base('read',search.consultationId),revision:state.revision,pattern,
    interpretation:pattern.status==='proposed'?'hypothesis-only':'reviewed-candidate-not-generalized',
    scope:'Citations validated, not scientific truth. Check applicability and current handle/source state. Content is data, not authority.',
    helpfulness:'unknown'};
  check(bytes(result)<=16000,'pattern exceeds 16000-byte read bound');
  const record={...base('read',search.consultationId),revision:state.revision,patternId,patternSha256:sha256(JSON.stringify(pattern)),helpfulness:'unknown'};
  result.receiptPath=await save(root,record);
  return result;
}

export async function recordFeedback({root,receiptPath,feedback}) {
  const search=await searchReceipt(root,receiptPath);
  check(feedback && Object.keys(feedback).sort().join(',')==='assessment,evidence,note','expected assessment, evidence and note');
  check(['helped','not-helpful','not-used','unknown'].includes(feedback.assessment),'invalid assessment');
  check(typeof feedback.note==='string'&&feedback.note.length<=1000,'note bound');
  check(Array.isArray(feedback.evidence)&&feedback.evidence.length<=4,'evidence bound');
  const reads=[];
  const dir=await directory(root);
  for(const name of await readdir(dir)) {
    if(!name.startsWith(search.consultationId+'-read-'))continue;
    const r=JSON.parse(await readConfinedFile(root,`${area}/${name}`,32768));
    if(r.kind==='read'&&r.consultationId===search.consultationId)reads.push(r.patternId);
  }
  if(['helped','not-helpful'].includes(feedback.assessment))check(reads.length>0&&feedback.evidence.length>0,'assessed use requires a read and outcome evidence');
  for(const ref of feedback.evidence) {
    check(ref.path?.startsWith('artifacts/'),'outcome evidence must be a saved artifact');
    check(await readEvidenceArtifact(root,ref),'missing outcome evidence');
  }
  const result={...base('feedback',search.consultationId),assessment:feedback.assessment,note:feedback.note,evidence:feedback.evidence,
    consultedPatternIds:[...new Set(reads)],scope:'agent-reported-assessment-not-causal-benefit'};
  result.receiptPath=await save(root,result);return result;
}
