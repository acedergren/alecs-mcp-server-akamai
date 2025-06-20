#!/bin/bash

# Fix TypeScript compilation errors systematically

echo "Fixing TypeScript compilation errors..."

# Fix _error -> error issues (variable name conflicts)
find src -type f -name "*.ts" -exec sed -i 's/Cannot find name '\''_error'\''/Cannot find name '\''error'\''/g' {} \;
find src -type f -name "*.ts" -exec sed -i 's/_error instanceof Error/error instanceof Error/g' {} \;
find src -type f -name "*.ts" -exec sed -i 's/_error as Error/error as Error/g' {} \;
find src -type f -name "*.ts" -exec sed -i 's/_error\.message/error.message/g' {} \;
find src -type f -name "*.ts" -exec sed -i 's/String(_error)/String(error)/g' {} \;
find src -type f -name "*.ts" -exec sed -i 's/throw _error/throw error/g' {} \;
find src -type f -name "*.ts" -exec sed -i 's/console\.error.*_error/console.error(error)/g' {} \;

# Fix specific property access issues
find src -type f -name "*.ts" -exec sed -i "s/icons\._error/icons.error/g" {} \;
find src -type f -name "*.ts" -exec sed -i "s/response\._errors/response.errors/g" {} \;

# Fix undefined variable references
find src -type f -name "*.ts" -exec sed -i 's/Cannot find name '\''options'\''/Cannot find name '\''_options'\''/g' {} \;
find src -type f -name "*.ts" -exec sed -i 's/Cannot find name '\''err'\''/Cannot find name '\''error'\''/g' {} \;
find src -type f -name "*.ts" -exec sed -i 's/Cannot find name '\''res'\''/Cannot find name '\''response'\''/g' {} \;

# Fix method name conflicts
find src -type f -name "*.ts" -exec sed -i 's/\.request(/._request(/g' {} \;

# Fix property access typos
find src -type f -name "*.ts" -exec sed -i "s/'_error'/'error'/g" {} \;

echo "TypeScript error fixes applied. Running typecheck to verify..."
npm run typecheck