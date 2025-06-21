#!/bin/bash

echo "=== Fixing specific TypeScript errors ==="

# 1. Fix OptimizedHTTPClient.ts - req should not have underscore
echo "Fixing OptimizedHTTPClient.ts..."
sed -i 's/_req\./req./g' src/core/OptimizedHTTPClient.ts

# 2. Fix index files - context is a variable, not a parameter
echo "Fixing index-full.ts context references..."
sed -i 's/_context\./context./g' src/index-full.ts
sed -i 's/_context\./context./g' src/index.ts

# 3. Fix index-oauth.ts - define context variable
echo "Fixing index-oauth.ts context references..."
sed -i 's/_context\./context./g' src/index-oauth.ts

# 4. Fix jsonrpc-middleware.ts - error vs _error
echo "Fixing jsonrpc-middleware.ts error references..."
sed -i 's/if (_error instanceof Error)/if (error instanceof Error)/g' src/middleware/jsonrpc-middleware.ts
sed -i 's/_error\.message/error.message/g' src/middleware/jsonrpc-middleware.ts
sed -i 's/_error\.stack/error.stack/g' src/middleware/jsonrpc-middleware.ts
sed -i 's/String(_error)/String(error)/g' src/middleware/jsonrpc-middleware.ts

# 5. Fix oauth-protected-server.ts - res vs _res
echo "Fixing oauth-protected-server.ts..."
sed -i 's/_res\./res./g' src/servers/oauth-protected-server.ts
sed -i 's/(req)/(\_req)/g' src/servers/oauth-protected-server.ts

# 6. Fix intelligent-bug-analyzer.ts context references
echo "Fixing intelligent-bug-analyzer.ts..."
sed -i 's/_context\./_context./g' src/tools/analysis/intelligent-bug-analyzer.ts
# But fix the constructor context parameter
sed -i 's/analysisId: _context\.analysisId/analysisId: context.analysisId/g' src/tools/analysis/intelligent-bug-analyzer.ts
sed -i 's/phase: _context\.phase/phase: context.phase/g' src/tools/analysis/intelligent-bug-analyzer.ts
sed -i 's/originalError: _context\.originalError/originalError: context.originalError/g' src/tools/analysis/intelligent-bug-analyzer.ts

echo "=== Fixes applied ==="