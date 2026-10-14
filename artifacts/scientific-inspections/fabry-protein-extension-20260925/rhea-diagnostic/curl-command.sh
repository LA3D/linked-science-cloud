#!/bin/sh
# Run from this diagnostic directory. Requires public network permission.
curl -q --silent --show-error --location --max-time 20 --max-redirs 5 --max-filesize 2000000 --header 'Accept: application/rdf+xml' --header 'Accept-Encoding: identity' --user-agent 'LinkedScience/1.0' --dump-header curl-replay-headers.txt --output curl-replay-body.txt --write-out '%{json}' 'https://www.rhea-db.org/rhea/21112/rdf' > curl-replay-result.json
