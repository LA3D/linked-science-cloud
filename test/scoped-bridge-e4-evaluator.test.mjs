import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,answerKey,score,structuralOnly} from '../scripts/scoped-bridge-e4-evaluator.mjs';
const oracle=()=>({findings:fixture.annotations.map((a,i)=>({id:a.id,claim:{subject:a.subject,relation:a.relation,object:a.object,verdict:answerKey[i].split(':')[0]},evidence:i>=10?[a.id,'g01','g02']:[a.id],uncertainty:answerKey[i].split(':')[1]}))});
test('E4 evaluator rejects invented references, target drift, duplicate coverage and uncertainty loss',()=>{
  assert.equal(score(oracle()).correct,12);
  let r=oracle();r.findings[0].evidence=['invented'];assert.equal(score(r).validReferences,11);
  r=oracle();r.findings[0].claim.subject='Other';assert.equal(score(r).schemaValid,false);
  r=oracle();r.findings[1]=r.findings[0];assert.equal(score(r).schemaValid,false);assert.equal(score(r).completed,10);
  r=oracle();r.findings[2].uncertainty='none';assert.equal(score(r).correct,11);
  assert.equal(score({findings:'bad'}).schemaValid,false);
});
test('E4 structural baseline does not reverse subclass edges or interpret annotation prose',()=>{
  const r=structuralOnly();assert.equal(score(r).correct,6);assert.equal(r.findings[10].claim.verdict,'supported');assert.equal(r.findings[11].claim.verdict,'undetermined');assert.equal(r.findings[0].claim.verdict,'undetermined');
});
