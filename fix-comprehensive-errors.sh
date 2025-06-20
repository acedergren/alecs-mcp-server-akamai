#!/bin/bash

echo "Starting comprehensive TypeScript error fixes..."

# 1. Fix import statement corruptions
echo "Fixing import statements..."
find src -name "*.ts" -exec sed -i 's/enhanced-_error-handling/enhanced-error-handling/g' {} \;

# 2. Fix over-corrected interface properties
echo "Fixing interface properties..."
find src -name "*.ts" -exec sed -i 's/property '\''_error'\''/property '\''error'\''/g' {} \;
find src -name "*.ts" -exec sed -i 's/relevantFailu_res/relevantFailures/g' {} \;
find src -name "*.ts" -exec sed -i 's/criticalFailu_res/criticalFailures/g' {} \;
find src -name "*.ts" -exec sed -i 's/customerFacingFailu_res/customerFacingFailures/g' {} \;
find src -name "*.ts" -exec sed -i 's/failu_res/failures/g' {} \;

# 3. Fix variable name inconsistencies (keep parameter names consistent)
echo "Fixing variable name consistency..."
# Fix specific patterns where variable names got corrupted
find src -name "*.ts" -exec sed -i 's/\bpersonaId\b/_personaId/g' {} \;
find src -name "*.ts" -exec sed -i 's/personaImpacts\[_personaId\]/personaImpacts[personaId]/g' {} \;

# 4. Fix property access issues
echo "Fixing property access..."
find src -name "*.ts" -exec sed -i 's/this\.customerPersonas\[_personaId\]/this.customerPersonas[personaId]/g' {} \;

# 5. Fix shorthand property issues
echo "Fixing shorthand properties..."
find src -name "*.ts" -exec sed -i 's/{ _error }/{ error: _error }/g' {} \;
find src -name "*.ts" -exec sed -i 's/{ context }/{ context: _context }/g' {} \;

# 6. Fix specific parameter naming issues
echo "Fixing parameter naming..."
# Fix cases where parameters got double-prefixed
find src -name "*.ts" -exec sed -i 's/__personaId/_personaId/g' {} \;
find src -name "*.ts" -exec sed -i 's/__journeyId/_journeyId/g' {} \;
find src -name "*.ts" -exec sed -i 's/__analysisResults/_analysisResults/g' {} \;
find src -name "*.ts" -exec sed -i 's/__options/_options/g' {} \;
find src -name "*.ts" -exec sed -i 's/__request/_request/g' {} \;

# 7. Fix middlewares property name
echo "Fixing middleware properties..."
find src -name "*.ts" -exec sed -i 's/middlewa_res/middlewares/g' {} \;

# 8. Fix request/response variable names in specific contexts
echo "Fixing req/res variables..."
find src -name "*.ts" -exec perl -i -pe 's/(?<!_)req(?![_a-zA-Z])/req/g' {} \;
find src -name "*.ts" -exec perl -i -pe 's/(?<!_)res(?![_a-zA-Z])/res/g' {} \;

# 9. Fix specific function parameter issues
echo "Fixing function parameters..."
find src -name "*.ts" -exec sed -i 's/_error\.field || _error\.type === '\''field-_error'\''/_error.field || _error.type === '\''field-error'\''/g' {} \;

# 10. Fix specific variable reference issues in cx-impact-analyzer
echo "Fixing cx-impact-analyzer specific issues..."
sed -i 's/return 100 - failures\.length \* 10/return 100 - failu_res.length * 10/g' src/tools/analysis/cx-impact-analyzer.ts

echo "Running TypeScript compilation check..."
npm run build:ts 2>&1 | grep "error TS" | head -10 || echo "No TypeScript errors found in first 10 results"

echo "Comprehensive fix complete!"