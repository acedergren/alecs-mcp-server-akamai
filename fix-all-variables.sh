#!/bin/bash

echo "Fixing all variable reference errors in TypeScript files..."

# Fix enhanced-error-handling.ts
echo "Fixing enhanced-error-handling.ts..."
sed -i 's/\bcontext\b/_context/g' src/utils/enhanced-error-handling.ts
sed -i 's/\bhttpStatus\b/_httpStatus/g' src/utils/enhanced-error-handling.ts
sed -i 's/property \x27_error\x27/property '\''error'\''/g' src/utils/enhanced-error-handling.ts
sed -i 's/\berror\b/_error/g' src/utils/enhanced-error-handling.ts

# Fix error-handling.ts  
echo "Fixing error-handling.ts..."
sed -i 's/\berror\b/_error/g' src/utils/error-handling.ts
sed -i 's/\bcontext\b/_context/g' src/utils/error-handling.ts

# Fix performance-monitor.ts
echo "Fixing performance-monitor.ts..."
sed -i 's/request\b/_request/g' src/utils/performance-monitor.ts

# Fix progress.ts
echo "Fixing progress.ts..."
sed -i 's/\boptions\b/_options/g' src/utils/progress.ts

# Fix resilience-manager.ts
echo "Fixing resilience-manager.ts..."
perl -i -pe 's/(?<!_)_error(?![\w_])/_error/g' src/utils/resilience-manager.ts

# Fix response-parsing.ts
echo "Fixing response-parsing.ts..."
sed -i 's/\berror\b/_error/g' src/utils/response-parsing.ts

# Fix tool-error-handling.ts
echo "Fixing tool-error-handling.ts..."
sed -i 's/\berror\b/_error/g' src/utils/tool-error-handling.ts
sed -i 's/\bcontext\b/_context/g' src/utils/tool-error-handling.ts

echo "Checking for remaining issues..."
find src/utils -name "*.ts" -exec grep -Hn "Cannot find name" {} \; 2>/dev/null || echo "No obvious patterns found"

echo "Done!"