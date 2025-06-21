#!/bin/bash

echo "Fixing final lint errors..."

# Fix unused imports in type files
echo "Fixing unused type imports..."
sed -i 's/^import { Property, DnsZone, Certificate, NetworkList }/import type { Property, DnsZone, Certificate, NetworkList }/g' src/types/oauth.ts
sed -i 's/^import { OAuthProtectedResource }/import type { OAuthProtectedResource }/g' src/utils/oauth-resource-indicators.ts

# Fix unused function parameters
echo "Fixing unused function parameters..."
sed -i 's/context: ValidationContext/_context: ValidationContext/g' src/utils/response-parsing.ts

# Fix unused variables in mcp-2025.ts
sed -i 's/interface NetworkEnvironment/interface _NetworkEnvironment/g' src/types/mcp-2025.ts

# Fix specific unused parameters in multiple files  
find src -name "*.ts" -type f | while read -r file; do
  # Fix common unused parameters
  sed -i 's/\([(,]\s*\)error\s*:/\1_error:/g' "$file"
  sed -i 's/\([(,]\s*\)err\s*:/\1_err:/g' "$file"
  sed -i 's/\([(,]\s*\)e\s*:/\1_e:/g' "$file"
done

echo "Done fixing final lint errors!"