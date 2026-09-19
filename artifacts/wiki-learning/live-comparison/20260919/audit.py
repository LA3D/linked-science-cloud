"""Bounded run-specific audit of saved outputs; never evaluates captured code."""
import json,re,hashlib
from pathlib import Path
base=Path(__file__).parent
root=Path.cwd()
load=lambda p:json.loads(p.read_text())
expected=load(base/'evaluator.json')
score=load(base/'answer-scores.json')
audit={}
for arm,prefix in [('enabled','runtime-call-'),('disabled','call-')]:
 files=sorted((base/arm).glob(prefix+'*.json'));calls=[load(p) for p in files]
 response=lambda r:r.get('response',r.get('rawResponse'))
 raw=lambda r:'\n'.join(c.get('text','') for c in response(r)['content'])
 rows=[];offsets=[]
 for r in calls:
  for c in response(r)['content']:
   text=c.get('text','')
   if 'linked-science-page' not in text:continue
   try:
    page=json.loads(text)
    if page.get('kind')!='linked-science-page':continue
    offsets.append(page['offset'])
    rows.extend(dict(sample=x['sample']['value'],group=x['group']['value'],value=int(x['value']['value'])) for x in page['rows'])
   except json.JSONDecodeError:
    offsets.append(int(re.search(r'\boffset: (\d+)',text)[1]))
    matches=re.findall(r"sample: \{ termType: 'NamedNode', value: '([^']+)' \},\s+group: \{ termType: 'Literal', value: '([^']+)'[^\n]*\n\s+value: \{ termType: 'Literal', value: '([^']+)'",text)
    rows.extend(dict(sample=s,group=g,value=int(v)) for s,g,v in matches)
 assert offsets==[0,10,20,30],offsets
 assert len(rows)==len(set(r['sample'] for r in rows))==36
 groups={}
 for g in ['A','B','C']:
  vals=[r['value'] for r in rows if r['group']==g and r['value']>45]
  groups[g]={'count':len(vals),'mean':sum(vals)/len(vals)}
 assert groups==expected['groups']
 assert calls[2]['arguments']['code']==load(base/'fixture.json')['requiredNextCode']
 error=json.loads(response(calls[2])['content'][0]['text'])
 assert error['error']['code']=='LS_BOUND_EXCEEDED'
 assert '@linked-science/runtime' in raw(calls[0]) and 'authoritative-production-implementation' in raw(calls[0])
 assert 'persistence:' in raw(calls[3])
 assert 'disposed: true' in raw(calls[-1])
 repeats=sum(c['arguments']['code'].count('trial.query.run(') for c in calls[3:])
 reloads=sum(c['arguments']['code'].count('trial.graphs.load(') for c in calls[3:])
 assert repeats==reloads==0
 audit[arm]={'savedRuntimeCalls':len(calls),'pageOffsets':offsets,'rowsIndependentlyParsed':len(rows),'groupsFromSavedPages':groups,'queryRepeatsAfterFailure':repeats,'graphReloadsAfterFailure':reloads,'requiredError':error['error']['code'],'identityMarkersObserved':True,'persistenceMarkerObserved':True,'ownWorkspaceDisposed':True,'callsCapturedBy':'worker; complete host event stream not independently obtained'}
assert score['arms']['enabled']['numericAnswerCorrect'] and score['arms']['disabled']['numericAnswerCorrect']
enabled=load(base/'enabled/report.json')
refs=enabled['memoryReceipts'];search=load(root/refs['search']);read=load(root/refs['read']);feedback=load(root/refs['feedback'])
assert search['consultationId']==read['consultationId']==feedback['consultationId']
assert read['patternId']=='retained-query-after-display-limit'
for ref in feedback['evidence']:
 assert hashlib.sha256((root/ref['path']).read_bytes()).hexdigest()==ref['sha256']
receipt={'format':'wiki-live-comparison-audit/v1','scope':'saved-page-content-and-captured-runtime-calls','arms':audit,'memory':{'enabledSelectedPattern':read['patternId'],'readReceipt':refs['read'],'feedback':feedback['assessment'],'feedbackScope':feedback['scope'],'disabledNoMemory':'worker-reported; no independent complete file-access audit'},'sharedDataEquality':audit['enabled']['groupsFromSavedPages']==audit['disabled']['groupsFromSavedPages']}
(base/'audit.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps({'audit':'passed','independentlyParsedRowsPerArm':36}))
