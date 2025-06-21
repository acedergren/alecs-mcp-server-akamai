#!/bin/bash

echo "Fixing remaining property access issues..."

# Fix this.todoList issues in intelligent-bug-analyzer.ts
echo "Fixing todoList references..."
sed -i 's/this\.todoList/todoList/g' src/tools/analysis/intelligent-bug-analyzer.ts

# Fix _context vs context issues in CustomerContextManager.ts
echo "Fixing context references..."
sed -i 's/customer _context/customer context/g' src/services/CustomerContextManager.ts
sed -i 's/_context\./_context\./g' src/services/CustomerContextManager.ts

# Fix request vs _request parameter issues
echo "Fixing request parameter references..."
sed -i 's/const { sessionId, targetCustomerId, reason } = request;/const { sessionId, targetCustomerId, reason } = _request;/g' src/services/CustomerContextManager.ts

# Fix .request() calls that should be .request()
echo "Fixing client._request() calls..."
find src -name "*.ts" -exec grep -l "client\._request(" {} \; | while read file; do
  echo "Processing $file..."
  sed -i 's/client\._request(/client.request(/g' "$file"
done

# Fix error vs _error issues
echo "Fixing remaining error references..."
sed -i 's/instrumentation\.finish(error as Error);/instrumentation.finish(_error as Error);/g' src/observability/mcp-server-integration.ts
sed -i 's/apiInstrumentation\.finish(error as Error);/apiInstrumentation.finish(_error as Error);/g' src/observability/mcp-server-integration.ts

# Clean up any double underscores
echo "Cleaning up double underscores..."
find src -name "*.ts" -exec sed -i 's/__error/_error/g' {} \;
find src -name "*.ts" -exec sed -i 's/__req/_req/g' {} \;
find src -name "*.ts" -exec sed -i 's/__res/_res/g' {} \;

echo "Done!"