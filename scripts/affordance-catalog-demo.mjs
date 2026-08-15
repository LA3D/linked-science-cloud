import { uniprotRheaWikidataAffordances } from '../lib/linked-data-affordances.mjs';

// Deterministic documentation fixture only; it makes no endpoint request.
const lookup = uniprotRheaWikidataAffordances.lookupAffordances({ tags: [ 'protein', 'catalytic-activity', 'rhea', 'interpro' ] });
const plan = uniprotRheaWikidataAffordances.createAffordancePlan({ motifId: lookup.motifs[0].id, limit: 5 });
console.log(JSON.stringify({ lookup, plan }, null, 2));
