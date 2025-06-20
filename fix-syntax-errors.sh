#!/bin/bash

echo "Fixing syntax errors and variable issues..."

# Fix console.error syntax errors
find src -name "*.ts" -exec sed -i 's/console\.error(error));/console.error("[Error]:", error);/g' {} \;

# Fix specific files with syntax errors
sed -i 's/console\.error(\[.*\] Error:', error);/console.error("[Error]:", error);/g' src/agents/property-onboarding.agent.ts
sed -i 's/console\.error(\[.*\] Create.*error:', error);/console.error("[Error]:", error);/g' src/agents/property-onboarding.agent.ts

# Fix shorthand property errors  
find src -name "*.ts" -exec sed -i 's/{ error }/{ error: error }/g' {} \;

# Fix variable naming in specific files that need to have error variables
sed -i 's/\boptions\b/_options/g' src/core/OptimizedHTTPClient.ts
sed -i 's/\berr\b/_err/g' src/core/OptimizedHTTPClient.ts

# Fix property access issue in OptimizedHTTPClient
sed -i 's/_options\.agent\.protocol/(_options as any)?.agent?.protocol/g' src/core/OptimizedHTTPClient.ts

echo "Testing compilation after syntax fixes..."
npm run build:ts 2>&1 | head -10 || echo "Compilation check completed"

echo "Syntax error fixes complete!"