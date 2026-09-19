// Scores numeric answers only. Runtime/evidence/consultation auditing is separate.
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const load=async path=>JSON.parse(await readFile(new URL(path,import.meta.url),'utf8'));
const expected=await load('evaluator.json');
const arms={};
for(const arm of ['enabled','disabled']) {
 const answer=await load(`${arm}/answer.json`);
 const checks=Object.entries(expected.groups).map(([group,value])=>({group,
   count:answer.groups?.[group]?.count===value.count,
   mean:typeof answer.groups?.[group]?.mean==='number'&&Math.abs(answer.groups[group].mean-value.mean)<1e-8}));
 const winners=JSON.stringify([...(answer.winners??[])].sort())===JSON.stringify([...expected.winners].sort());
 const coverageReported=answer.coverage?.rowsObserved===expected.total&&answer.coverage?.complete===true;
 arms[arm]={checks,winners,coverageReported,numericAnswerCorrect:checks.every(c=>c.count&&c.mean)&&winners,
   answerSha256:createHash('sha256').update(await readFile(new URL(`${arm}/answer.json`,import.meta.url))).digest('hex')};
}
console.log(JSON.stringify({format:'wiki-live-pilot-answer-score/v1',scope:'numeric-answer-and-reported-coverage-only',arms},null,2));
