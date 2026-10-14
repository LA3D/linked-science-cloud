"""Build bounded is_a/label/definition excerpts of official OBO basic releases.
This is an explicit OBO-to-RDF excerpt mapper, not a complete OWL conversion.
Keep source stanzas and enumerate omitted tags; no ontology imports or reasoning.
"""
import sys,pathlib,re,json,hashlib
BASE=pathlib.Path(__file__).resolve().parent
for p in sorted(pathlib.Path('/Users/cvardema/.cache/uv/archive-v0').iterdir()):
    if p.is_dir():sys.path.append(str(p))
import yaml
from rdflib import Graph,URIRef,Literal,RDF,RDFS,OWL
source=yaml.safe_load((BASE/'Fabry_Disease.yaml').read_text())
seeds={'CL':set(),'UBERON':set()}
def scan(v):
    if isinstance(v,dict):
        for k,x in v.items():
            if k=='id' and isinstance(x,str) and x.split(':')[0] in seeds:seeds[x.split(':')[0]].add(x)
            scan(x)
    elif isinstance(v,list):
        for x in v:scan(x)
scan(source)
paths={'CL':'artifacts/resources/resource-9rvPV7/content/clObo.obo','UBERON':'artifacts/resources/resource-08lESN/content/uberonObo.obo'}
reports={}
for ont,path in paths.items():
    text=pathlib.Path(path).read_text();header=text.split('\n[Term]')[0]
    stanzas={}
    for block in re.split(r'\n(?=\[)',text):
        if block.startswith('[Term]\n'):
            m=re.search(r'^id: (\S+)',block,re.M)
            if m:stanzas[m[1]]=block
    selected=set();pending=list(seeds[ont]);missing=set()
    while pending:
        term=pending.pop()
        if term in selected:continue
        if term not in stanzas:missing.add(term);continue
        selected.add(term)
        if len(selected)>400:raise RuntimeError('Excerpt exceeds 400-class bound')
        pending.extend(re.findall(r'^is_a: (\S+)',stanzas[term],re.M))
    g=Graph();g.bind('rdfs',RDFS);g.bind('owl',OWL)
    omitted={};is_a_count=0
    for term in sorted(selected):
        uri=URIRef('http://purl.obolibrary.org/obo/'+term.replace(':','_'))
        g.add((uri,RDF.type,OWL.Class))
        for line in stanzas[term].splitlines():
            if ': ' not in line:continue
            tag,value=line.split(': ',1)
            if tag=='name':g.add((uri,RDFS.label,Literal(value)))
            elif tag=='is_a':
                target=value.split()[0]
                g.add((uri,RDFS.subClassOf,URIRef('http://purl.obolibrary.org/obo/'+target.replace(':','_'))));is_a_count+=1
            elif tag=='def':
                m=re.match(r'("(?:[^"\\]|\\.)*")',value)
                if not m:raise ValueError('Unparsed definition '+term)
                # OBO escaped text: JSON handles the escaped quotes/newlines used here.
                definition=json.loads(m[1])
                g.add((uri,URIRef('http://purl.obolibrary.org/obo/IAO_0000115'),Literal(definition)))
            elif tag!='id':omitted[tag]=omitted.get(tag,0)+1
    out=BASE/(ont.lower()+'-excerpt.ttl');g.serialize(destination=out,format='turtle')
    (BASE/(ont.lower()+'-selected-stanzas.obo')).write_text(header+'\n\n'+'\n\n'.join(stanzas[t] for t in sorted(selected)))
    reports[ont]={'sourcePath':path,'sourceSha256':hashlib.sha256(pathlib.Path(path).read_bytes()).hexdigest(),
                  'dataVersion':re.search(r'^data-version: (.+)',header,re.M)[1],
                  'seedIds':sorted(seeds[ont]),'selectedClasses':len(selected),'subClassAxioms':is_a_count,
                  'triples':len(g),'missingIds':sorted(missing),'omittedTagOccurrences':omitted,
                  'selection':'all record term IDs in this ontology plus recursive named is_a parents, max 400 classes',
                  'mappedTags':['id','name','def','is_a'],'rdfSha256':hashlib.sha256(out.read_bytes()).hexdigest()}
(BASE/'ontology-report.json').write_text(json.dumps(reports,indent=2)+'\n')
print(json.dumps(reports,indent=2))
