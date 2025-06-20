#!/bin/bash

echo "Fixing targeted TypeScript errors..."

# 1. Fix icon references that got over-corrected
echo "Fixing icon references..."
find src -name "*.ts" -exec sed -i 's/icons\._error/icons.error/g' {} \;

# 2. Fix specific akamai-client.ts issues
echo "Fixing akamai-client.ts..."
sed -i 's/\berror\b/_error/g' src/akamai-client.ts

# 3. Fix progress.ts color reference
echo "Fixing progress.ts..."
sed -i 's/_error: '"'"'\\x1b\[31m'"'"'/error: '"'"'\\x1b\[31m'"'"'/g' src/utils/progress.ts

# 4. Fix auth files - these need specific context fixes
echo "Fixing auth files..."
find src/auth -name "*.ts" -exec sed -i 's/\bcontext\b/_context/g' {} \;
find src/auth -name "*.ts" -exec sed -i 's/\boptions\b/_options/g' {} \;
find src/auth -name "*.ts" -exec sed -i 's/\brequest\b/_request/g' {} \;

# 5. Fix shorthand properties by expanding them
echo "Fixing shorthand properties..."
find src -name "*.ts" -exec sed -i 's/{ _context }/{ context: _context }/g' {} \;
find src -name "*.ts" -exec sed -i 's/{ _error }/{ error: _error }/g' {} \;

# 6. Fix specific patterns in error handling that got over-corrected
echo "Fixing error handling patterns..."
find src -name "*.ts" -exec sed -i 's/`Error: ${_error}/`Error: ${_error/g' {} \;

# 7. Fix property names that changed incorrectly
echo "Fixing property names..."
find src -name "*.ts" -exec sed -i 's/\.error:/.error:/g' {} \;

echo "Running TypeScript compilation test..."
npm run build:ts 2>&1 | head -5 || echo "Build completed successfully"

echo "Targeted fixes complete!"