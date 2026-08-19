import { DataFactory } from 'n3';

const { blankNode, literal, namedNode, quad } = DataFactory;

export const EX = 'https://example.test/science/';
export const RDF = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
export const RDFS = 'http://www.w3.org/2000/01/rdf-schema#';
export const XSD = 'http://www.w3.org/2001/XMLSchema#';
export const OWL = 'http://www.w3.org/2002/07/owl#';
export const SH = 'http://www.w3.org/ns/shacl#';

const ontologyGraph = namedNode(`${EX}graph/ontology`);
const shaclGraph = namedNode(`${EX}graph/shacl`);
const sourceAGraph = namedNode(`${EX}graph/source-a`);
const sourceBGraph = namedNode(`${EX}graph/source-b`);

export const ontologyQuads = Object.freeze([
  quad(namedNode(`${EX}Measurement`), namedNode(`${RDF}type`), namedNode(`${OWL}Class`), ontologyGraph),
  quad(namedNode(`${EX}Measurement`), namedNode(`${RDFS}label`), literal('Scientific measurement', 'en'), ontologyGraph),
  quad(namedNode(`${EX}hasValue`), namedNode(`${RDF}type`), namedNode(`${OWL}DatatypeProperty`), ontologyGraph),
  quad(namedNode(`${EX}hasValue`), namedNode(`${RDFS}domain`), namedNode(`${EX}Measurement`), ontologyGraph),
  quad(namedNode(`${EX}hasValue`), namedNode(`${RDFS}range`), namedNode(`${XSD}decimal`), ontologyGraph),
  quad(namedNode(`${EX}Measurement`), namedNode(`${RDFS}subClassOf`), blankNode('measurement-restriction'), ontologyGraph),
  quad(blankNode('measurement-restriction'), namedNode(`${OWL}onProperty`), namedNode(`${EX}hasValue`), ontologyGraph),
]);

export const shaclQuads = Object.freeze([
  quad(namedNode(`${EX}MeasurementShape`), namedNode(`${RDF}type`), namedNode(`${SH}NodeShape`), shaclGraph),
  quad(namedNode(`${EX}MeasurementShape`), namedNode(`${SH}targetClass`), namedNode(`${EX}Measurement`), shaclGraph),
  quad(namedNode(`${EX}MeasurementShape`), namedNode(`${SH}property`), blankNode('value-property-shape'), shaclGraph),
  quad(blankNode('value-property-shape'), namedNode(`${SH}path`), namedNode(`${EX}hasValue`), shaclGraph),
  quad(blankNode('value-property-shape'), namedNode(`${SH}datatype`), namedNode(`${XSD}decimal`), shaclGraph),
]);

export const sourceAQuads = Object.freeze([
  quad(namedNode(`${EX}sample-a`), namedNode(`${RDF}type`), namedNode(`${EX}Measurement`), sourceAGraph),
  quad(namedNode(`${EX}sample-a`), namedNode(`${EX}hasValue`), literal('4.2', namedNode(`${XSD}decimal`)), sourceAGraph),
  quad(namedNode(`${EX}sample-a`), namedNode(`${RDFS}label`), literal('Alpha sample', 'en'), sourceAGraph),
  quad(namedNode(`${EX}sample-a`), namedNode(`${EX}note`), literal('duplicate-preserved'), sourceAGraph),
  quad(namedNode(`${EX}sample-a`), namedNode(`${EX}note`), literal('duplicate-preserved'), sourceAGraph),
]);

export const sourceBQuads = Object.freeze([
  quad(namedNode(`${EX}sample-b`), namedNode(`${RDF}type`), namedNode(`${EX}Measurement`), sourceBGraph),
  quad(namedNode(`${EX}sample-b`), namedNode(`${EX}hasValue`), literal('8.7', namedNode(`${XSD}decimal`)), sourceBGraph),
  quad(namedNode(`${EX}sample-b`), namedNode(`${RDFS}label`), literal('Échantillon bêta', 'fr'), sourceBGraph),
]);

export const measurementQuery = `
PREFIX ex: <${EX}>
PREFIX rdf: <${RDF}>
SELECT ?sample ?value WHERE {
  GRAPH ?sourceGraph { ?sample rdf:type ex:Measurement ; ex:hasValue ?value . }
}
ORDER BY ?sample
LIMIT 10`;
