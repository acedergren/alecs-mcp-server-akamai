#!/bin/bash

echo "Fixing last batch of lint errors..."

# Fix unused function parameters by prefixing with underscore
find src -name "*.ts" -type f | while read -r file; do
  # Fix specific unused parameters
  sed -i 's/\([(,]\s*\)options\s*:/\1_options:/g' "$file"
  sed -i 's/\([(,]\s*\)output\s*:/\1_output:/g' "$file"
  sed -i 's/\([(,]\s*\)category\s*:/\1_category:/g' "$file"
  sed -i 's/\([(,]\s*\)report\s*:/\1_report:/g' "$file"
  sed -i 's/\([(,]\s*\)fixStrategy\s*:/\1_fixStrategy:/g' "$file"
  sed -i 's/\([(,]\s*\)customerImpact\s*:/\1_customerImpact:/g' "$file"
  sed -i 's/\([(,]\s*\)testAnalysis\s*:/\1_testAnalysis:/g' "$file"
done

# Fix unused variable assignments
sed -i 's/const results =/const _results =/g' src/tools/analysis/output-analyzer.ts

# Fix unused imports
sed -i 's/interface ErrorPattern/interface _ErrorPattern/g' src/tools/analysis/output-analyzer.ts

echo "Done fixing last batch of lint errors!"