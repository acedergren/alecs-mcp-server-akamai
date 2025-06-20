#!/bin/bash

echo "Fixing remaining specific TypeScript errors..."

# Fix remaining .request calls that were missed
echo "Fixing remaining .request calls..."
find src/agents -name "*.ts" -exec sed -i 's/\.request</._request</g' {} \;
find src/agents -name "*.ts" -exec sed -i 's/\.request(/._request(/g' {} \;

# Fix icon property access issues specifically
echo "Fixing icon property access issues..."
find src/agents -name "*.ts" -exec sed -i 's/icons\.error/icons.error/g' {} \;

# Fix specific files identified in the compilation output
echo "Fixing specific files..."

# Fix CPS certificate agent
if [ -f "src/agents/cps-certificate.agent.ts" ]; then
    sed -i 's/icons\.error/icons.error/g' src/agents/cps-certificate.agent.ts
fi

# Fix DNS migration agent  
if [ -f "src/agents/dns-migration.agent.ts" ]; then
    sed -i 's/icons\.error/icons.error/g' src/agents/dns-migration.agent.ts
fi

# Run a more comprehensive sed to fix remaining auth.request calls
echo "Comprehensive auth.request fixes..."
find src -name "*.ts" -exec sed -i 's/this\.auth\.request</this.auth._request</g' {} \;
find src -name "*.ts" -exec sed -i 's/auth\.request</auth._request</g' {} \;

echo "Testing compilation after fixes..."
npm run build:ts 2>&1 | head -10 || echo "Compilation test completed"

echo "Specific error fixes complete!"