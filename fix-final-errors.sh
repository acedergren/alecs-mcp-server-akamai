#!/bin/bash

echo "Fixing final TypeScript errors..."

# Fix mcp-server-integration.ts
echo "Fixing mcp-server-integration.ts..."
sed -i 's/console\.error(\[Error\]:\x27, error);/console.error(\x27[Error]:\x27, _error);/g' src/observability/mcp-server-integration.ts
sed -i "s/console\.error('\[Error\]:', error);/console.error('[Error]:', _error);/g" src/observability/mcp-server-integration.ts

# Fix CircuitBreaker.ts
echo "Fixing CircuitBreaker.ts..."
sed -i 's/recordError(error: Error)/recordError(_error: Error)/g' src/resilience/CircuitBreaker.ts
sed -i 's/this\.lastError = error;/this.lastError = _error;/g' src/resilience/CircuitBreaker.ts
sed -i 's/this\.emit(\x27error\x27, error);/this.emit(\x27error\x27, _error);/g' src/resilience/CircuitBreaker.ts

# Fix BaseAkamaiClient.ts
echo "Fixing BaseAkamaiClient.ts..."
sed -i 's/message: error\./message: _error./g' src/services/BaseAkamaiClient.ts

# Fix all files with specific 'options' issues
echo "Fixing options references..."
find src/tools -name "*.ts" | xargs grep -l "Cannot find name 'options'" 2>/dev/null | while read file; do
  echo "Processing $file for options..."
  sed -i 's/\boptions\b/this.options/g' "$file"
done

# Fix context references in specific files
echo "Fixing context references..."
sed -i 's/\bcontext\b/_context/g' src/services/CustomerContextManager.ts
sed -i 's/\bcontext\b/_context/g' src/services/certificate-validation-monitor.ts

# Fix todoList references
echo "Fixing todoList references..."
find src/tools -name "*.ts" | xargs grep -l "todoList" 2>/dev/null | while read file; do
  echo "Processing $file for todoList..."
  sed -i 's/\btodoList\b/this.todoList/g' "$file"
done

# Fix category references
echo "Fixing category references..."
find src/tools -name "*.ts" | xargs grep -l "\bcategory\b" 2>/dev/null | while read file; do
  echo "Processing $file for category..."
  sed -i 's/category: category/category: _category/g' "$file"
done

# Clean up temp files
rm -f fix-remaining-errors.sh fix-more-errors.sh fix-more-errors-v2.sh

echo "Done!"