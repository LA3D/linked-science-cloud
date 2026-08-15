import { QueryEngine } from '@comunica/query-sparql';
import { queryBindingsGuarded } from '../lib/guarded-sparql-transport.mjs';

const query = `
PREFIX dcat: <http://www.w3.org/ns/dcat#>
PREFIX idot: <http://identifiers.org/idot/>
SELECT ?mir ?resource ?providerCode ?urlPattern WHERE {
  ?namespace a dcat:Dataset, idot:Namespace ;
    idot:prefix "uniprot" ;
    idot:mirid ?mir .
  OPTIONAL {
    ?resource a dcat:DataService, idot:Resource ; dcat:servesDataset ?namespace .
    OPTIONAL { ?resource idot:providerCode ?providerCode }
    OPTIONAL { ?resource idot:urlPattern ?urlPattern }
  }
}
LIMIT 10`;

const result = await queryBindingsGuarded({ engine: new QueryEngine(), query });
console.log(JSON.stringify({
  rows: result.rows.map(row => Object.fromEntries([ ...row ].map(([ key, value ]) => [ key.value, value.value ]))),
  provenance: result.provenance,
}, null, 2));
