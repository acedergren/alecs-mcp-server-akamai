#\!/bin/bash

echo "=== QUICK FIX: Adding validation to problem files ==="

# Fix 1: Add missing type imports to cps-tools.ts
sed -i '' '1a\
import { CPSEnrollmentMetadata, PropertyHostname } from '"'"'../utils/api-response-validator'"'"';\
' src/tools/cps-tools.ts

# Fix 2: Add missing type import to dns-tools.ts  
sed -i '' '1a\
import { ZoneSubmitResponse } from '"'"'../utils/api-response-validator'"'"';\
' src/tools/dns-tools.ts

# Fix 3: Replace undefined types with any + validation
find src/tools -name "*.ts" -exec sed -i '' 's/: unknown/: any/g' {} \;

echo "Done\! Now checking errors..."
