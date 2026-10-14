#!/bin/sh
# Run from repository root, with authorized public network access.
# Output uses replay names to preserve captured evidence.
curl -q --silent --show-error --location --max-time 45 --max-redirs 5 --max-filesize 10000000 \
  --header 'Accept: application/sparql-results+json' --header 'Accept-Encoding: identity' \
  --user-agent 'LinkedScience/1.0' --get \
  --data-urlencode 'query@artifacts/scientific-inspections/uniprot-example49-20260927/original-exact.rq' \
  --dump-header /tmp/uniprot49-replay-headers.txt --output /tmp/uniprot49-replay-body.txt \
  --write-out '%{json}' 'https://sparql.uniprot.org/sparql/'
