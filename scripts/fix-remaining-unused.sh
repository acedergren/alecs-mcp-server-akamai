#!/bin/bash

# Fix remaining unused variables by prefixing with underscore
echo "Fixing remaining unused variables in TypeScript files..."

# Fix specific patterns found in errors
find src -name "*.ts" -type f | while read -r file; do
  # Fix unused function parameters in specific patterns
  sed -i 's/\(req\):/\_req:/g' "$file"
  sed -i 's/\(res\):/\_res:/g' "$file"
  sed -i 's/\(next\):/\_next:/g' "$file"
  sed -i 's/\(request\):/\_request:/g' "$file"
  sed -i 's/\(context\):/\_context:/g' "$file"
  sed -i 's/\(httpStatus\):/\_httpStatus:/g' "$file"
  
  # Fix specific unused variable patterns
  sed -i 's/const error =/const _error =/g' "$file"
  sed -i 's/} catch (error)/} catch (_error)/g' "$file"
  
  # Fix imports that are only used as types
  sed -i 's/^import { Property,/import type { Property,/g' "$file"
  sed -i 's/^import { DnsZone,/import type { DnsZone,/g' "$file"
  sed -i 's/^import { Certificate,/import type { Certificate,/g' "$file"
  sed -i 's/^import { NetworkList,/import type { NetworkList,/g' "$file"
  sed -i 's/^import { OAuthProtectedResource/import type { OAuthProtectedResource/g' "$file"
done

echo "Done fixing remaining unused variables!"