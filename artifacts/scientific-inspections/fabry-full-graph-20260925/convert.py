"""Checkpoint-local schema-driven LinkML conversion, not an upstream exporter.
Run with bundled Python 3.12; reuse existing cached dependencies without installation.
Explicit adapter changes: enum/scalar union handling, safe local name IRIs,
and post-conversion source-path skolemization. All deviations are reported.
No remote access is allowed in this script; schema imports have been broker-acquired.
"""
import sys, pathlib, json, importlib.util, hashlib, urllib.parse, importlib.metadata
BASE = pathlib.Path(__file__).resolve().parent
for p in sorted(pathlib.Path('/Users/cvardema/.cache/uv/archive-v0').iterdir()):
    if p.is_dir(): sys.path.append(str(p))
import yaml
from rdflib import URIRef, Literal, Graph, BNode
from linkml_runtime.utils.schemaview import SchemaView
from linkml_runtime.loaders import yaml_loader
from linkml_runtime.dumpers import json_dumper
from linkml_runtime.dumpers.rdflib_dumper import RDFLibDumper

sv = SchemaView(str(BASE/'schema/dismech.yaml'))
spec = importlib.util.spec_from_file_location('dismech_model', BASE/'dismech_model.py')
model = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = model
spec.loader.exec_module(model)
source = yaml.safe_load((BASE/'Fabry_Disease.yaml').read_text())
obj = yaml_loader.load(str(BASE/'Fabry_Disease.yaml'), target_class=model.Disease)
typed = json.loads(json_dumper.dumps(obj))

class CheckpointDumper(RDFLibDumper):
    anomalies = []
    object_nodes = {}
    def inject_triples(self, element, schemaview, graph, target_type=None):
        if target_type in schemaview.all_enums() and isinstance(element, str):
            enum = schemaview.get_enum(target_type)
            pv = enum.permissible_values.get(str(element))
            if pv is None:
                self.anomalies.append({'kind':'undeclared-enum-value-preserved-as-literal','range':str(target_type),'value':str(element)})
                return Literal(str(element))
            return URIRef(schemaview.expand_curie(pv.meaning)) if pv.meaning else Literal(str(element))
        if isinstance(element, (str,int,float,bool)) and target_type not in schemaview.all_enums() and target_type not in schemaview.all_types() and target_type not in schemaview.all_classes():
            self.anomalies.append({'kind':'unspecified-union-range-preserved-as-literal','range':str(target_type),'value':str(element)})
            return Literal(element)
        result = super().inject_triples(element, schemaview, graph, target_type)
        if hasattr(type(element), 'class_name'):
            self.object_nodes[id(element)] = result
        return result

    def _as_uri(self, element_id, id_slot, schemaview):
        if id_slot is None:
            self.anomalies.append({'kind':'scalar-without-identifier-slot-preserved-as-literal','value':str(element_id)})
            return Literal(element_id)
        if id_slot and id_slot.name == 'name':
            return URIRef('https://example.org/fabry-checkpoint/name/'+urllib.parse.quote(str(element_id), safe=''))
        return super()._as_uri(element_id, id_slot, schemaview)

dumper = CheckpointDumper()
graph = dumper.as_rdf_graph(obj, sv, prefix_map={'@base':'https://example.org/fabry-checkpoint/'})
graph.serialize(destination=BASE/'fabry-linkml-raw.ttl', format='turtle')
(BASE/'typed-record.json').write_text(json.dumps(typed, indent=2)+'\n')

def leaves(x, path=''):
    if isinstance(x, dict):
        for k,v in x.items(): yield from leaves(v, path+'/'+str(k))
    elif isinstance(x, list):
        for i,v in enumerate(x): yield from leaves(v, path+'/'+str(i))
    else: yield path,x

sl,tl = dict(leaves(source)),dict(leaves(typed))
changes = [{'path':p,'source':v,'typed':tl.get(p)} for p,v in sl.items() if p not in tl or tl[p]!=v]
# Verify every supplied source field against the actual emitted graph, using
# schema-induced predicates and the exact typed object identities from conversion.
field_audit=[]
skolem={}
def audit(raw, element, path=''):
    cn=type(element).class_name
    subject=dumper.object_nodes[id(element)]
    if isinstance(subject,BNode):
        skolem[subject]=URIRef('https://example.org/fabry-checkpoint/node/'+urllib.parse.quote(path or '/',safe=''))
    for key,raw_value in raw.items():
        slot=sv.induced_slot(key,cn); value=getattr(element,key)
        values=value if isinstance(value,list) else list(value.values()) if isinstance(value,dict) else [value]
        raw_values=raw_value if isinstance(raw_value,list) else [raw_value]
        assert len(values)==len(raw_values),(path,key,len(values),len(raw_values))
        for i,(rv,v) in enumerate(zip(raw_values,values)):
            ptr=path+'/'+key+('/'+str(i) if isinstance(raw_value,list) else '')
            if slot.identifier:
                ok=subject==dumper._as_uri(v,slot,sv)
                field_audit.append({'path':ptr,'kind':'identifier','subject':str(subject),'ok':ok})
            else:
                target=dumper.object_nodes[id(v)] if isinstance(rv,dict) else dumper.inject_triples(v,sv,Graph(),slot.range)
                predicate=URIRef(sv.get_uri(slot,expand=True))
                ok=(subject,predicate,target) in graph
                field_audit.append({'path':ptr,'kind':'edge','subject':str(subject),'predicate':str(predicate),'object':str(target),'ok':ok})
                if isinstance(rv,dict):audit(rv,v,ptr)
audit(source,obj)
assert all(x['ok'] for x in field_audit)
(BASE/'field-audit.json').write_text(json.dumps(field_audit,indent=2)+'\n')
# Optional queryability links, kept apart from schema-generated assertions.
from rdflib import Namespace, RDF
APP=Namespace('urn:fabry-full-graph:')
bridge=Graph();bridge.bind('app',APP)
name_index={}
for section in ['pathophysiology','phenotypes','biochemical']:
    for item in getattr(obj,section):
        name_index.setdefault(str(item.name),[]).append(dumper.object_nodes[id(item)])
target_audit=[]
for node in obj.pathophysiology:
    node_uri=dumper.object_nodes[id(node)];bridge.add((node_uri,APP.sourceName,Literal(str(node.name))))
    for edge in node.downstream:
        edge_uri=dumper.object_nodes[id(edge)];matches=name_index.get(str(edge.target),[])
        target_audit.append({'source':str(node.name),'target':str(edge.target),'matches':[str(m) for m in matches],'edge':str(edge_uri)})
        if len(matches)==1:bridge.add((edge_uri,APP.resolvedTarget,matches[0]))
def normalize(g):
    out=Graph()
    for p,n in g.namespaces():out.bind(p,n)
    for triple in g:out.add(tuple(skolem.get(t,t) for t in triple))
    return out
graph=normalize(graph);bridge=normalize(bridge)
graph.serialize(destination=BASE/'fabry-generated.ttl',format='turtle')
bridge.serialize(destination=BASE/'application-links.ttl',format='turtle')
(BASE/'skolem-map.json').write_text(json.dumps({str(k):str(v) for k,v in skolem.items()},indent=2)+'\n')
report = {'converter':'LinkML RDFLibDumper with checkpoint-local subclass',
          'runtimeVersion':importlib.metadata.version('linkml-runtime'),
          'python':sys.version,'rdflibVersion':importlib.metadata.version('rdflib'),
          'schemaClasses':len(sv.all_classes()),'schemaSlots':len(sv.all_slots()),
          'triples':len(graph),'sourceScalarLeaves':len(sl),'typedScalarLeaves':len(tl),
          'sourceToTypedChanges':changes,
          'fieldAuditEntries':len(field_audit),'fieldAuditFailures':sum(not x['ok'] for x in field_audit),
          'sourceMechanisms':len(source['pathophysiology']),
          'sourceCausalEdges':sum(len(x.get('downstream',[])) for x in source['pathophysiology']),
          'causalTargetAudit':target_audit,'applicationLinkTriples':len(bridge),
          'skolemizedBlankNodes':len(skolem),
          'adapterAnomalies':dumper.anomalies,
          'modulePaths':{n:getattr(m,'__file__',None) for n,m in sorted(sys.modules.items()) if n in ['linkml_runtime','yaml','rdflib','pydantic','curies']},
          'sourceSha256':hashlib.sha256((BASE/'Fabry_Disease.yaml').read_bytes()).hexdigest(),
          'rdfSha256':hashlib.sha256((BASE/'fabry-generated.ttl').read_bytes()).hexdigest()}
(BASE/'conversion-report.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k not in ['modulePaths','causalTargetAudit','adapterAnomalies']},indent=2))
