import { RdfXmlParser } from 'rdfxml-streaming-parser';
import { DataFactory } from 'n3';

// Parse retained bytes only. DTDs are deliberately unsupported: no external
// entity retrieval or document-controlled entity expansion is permitted.
class RetainedRdfXmlParser extends RdfXmlParser {
  attachSaxListeners() {
    super.attachSaxListeners();
    // Stop at the first XML error; the upstream listener only emits and lets
    // SAX continue, potentially producing more errors and partial triples.
    this.saxParser.on('error', error => { throw error; });
  }

  onDoctype() {
    throw new Error('RDF/XML DOCTYPE declarations are unsupported; obtain a DTD-free RDF representation.');
  }

  _flush(callback) {
    // The upstream transform does not close SAX on stream completion. Closing
    // is required to reject truncated XML instead of retaining partial triples.
    try { this.saxParser.close(); callback(); }
    catch (error) { callback(error); }
  }
}

export async function parseRetainedRdfXml(text, { baseIRI, maxQuads }) {
  const parser = new RetainedRdfXmlParser({ baseIRI, dataFactory: DataFactory });
  const quads = [];
  const completed = new Promise((resolve, reject) => {
    parser.on('data', quad => {
      if (quads.length >= maxQuads) {
        // Abort the synchronous SAX write immediately, rather than continuing
        // to parse the rest of the document after destroying its stream.
        throw new Error('RDF/XML exceeds the resident graph quad quota');
      } else quads.push(quad);
    });
    parser.on('error', reject);
    parser.once('end', resolve);
  });
  parser.end(text);
  await completed;
  return quads;
}
