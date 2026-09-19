import json,re,pathlib,hashlib
arm=pathlib.Path(__file__).parent
r4=json.loads((arm/'runtime-call-04.json').read_text())
first=r4['response']['content'][1]['text']
matches=re.findall(r"sample: \{ termType: 'NamedNode', value: '([^']+)' \},\s+group: \{ termType: 'Literal', value: '([^']+)'[^\n]*\n\s+value: \{ termType: 'Literal', value: '([^']+)'",first)
rows=[dict(sample=s,group=g,value=int(v)) for s,g,v in matches]
assert len(rows)==10
r5=json.loads((arm/'runtime-call-05.json').read_text())
pages=[json.loads(c['text']) for c in r5['response']['content']]
assert [p['offset'] for p in pages]==[10,20,30]
assert [len(p['rows']) for p in pages]==[10,10,6]
assert all(p['total']==36 and p['provenance']['completion']['complete'] for p in pages)
assert pages[-1]['truncated'] is False
for p in pages:
 for r in p['rows']: rows.append(dict(sample=r['sample']['value'],group=r['group']['value'],value=int(r['value']['value'])))
assert len(rows)==len(set(r['sample'] for r in rows))==36
groups={}
for g in ['A','B','C']:
 vals=[r['value'] for r in rows if r['group']==g and r['value']>45]
 groups[g]={'count':len(vals),'mean':sum(vals)/len(vals)}
answer={'groups':groups,'winners':[g for g in groups if groups[g]['count']==max(x['count'] for x in groups.values())],'coverage':{'rowsObserved':len(rows),'complete':True}}
(arm/'answer.json').write_text(json.dumps(answer,indent=2)+'\n')
(arm/'observed-rows.json').write_text(json.dumps({'sourceFiles':['runtime-call-04.json','runtime-call-05.json'],'rows':rows},indent=2)+'\n')
feedback={'assessment':'helped','note':'Self-report: the consulted candidate informed checking retained handles and repairing only pagination. Saved actual calls show a presentation-bound failure, surviving handles, and complete 36-row coverage without another query or graph load. This does not establish causal benefit; runtime error and skill also provide repair guidance.','evidence':[{'path':str((arm/'answer.json').relative_to(pathlib.Path.cwd())),'sha256':hashlib.sha256((arm/'answer.json').read_bytes()).hexdigest(),'hashDomain':'file-bytes','pointer':'/coverage'},{'path':str((arm/'runtime-call-04.json').relative_to(pathlib.Path.cwd())),'sha256':hashlib.sha256((arm/'runtime-call-04.json').read_bytes()).hexdigest(),'hashDomain':'file-bytes','pointer':'/response'}]}
(arm/'memory-feedback.json').write_text(json.dumps(feedback,indent=2)+'\n')
print(json.dumps(answer))
