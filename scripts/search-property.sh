#!/bin/bash

# Universal Property Search Script
# Usage: ./search-property.sh <query> [customer]

QUERY="${1:-www.solutionsedge.io}"
CUSTOMER="${2:-default}"

echo "🔍 Searching for: $QUERY"
echo "Using customer: $CUSTOMER"
echo ""

# Start the property server and send the search request
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"akamai.search","arguments":{"query":"'$QUERY'","customer":"'$CUSTOMER'","detailed":true}}}' | \
timeout 30s node dist/servers/property-server.js 2>&1 | \
grep -A 200 "Search Results" | \
grep -B 200 "content" | \
tail -n +2 | \
head -n -2 | \
sed 's/\\n/\n/g' | \
sed 's/\\"/"/g' | \
sed 's/text"[[:space:]]*:[[:space:]]*"//g' | \
sed 's/"}],"data":.*$//' | \
sed 's/"}]$//'

echo ""
echo "Search complete."