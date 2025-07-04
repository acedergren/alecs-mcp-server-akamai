#!/bin/bash
# Find all instances of 'any' type in the codebase
# This helps identify and fix existing violations

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Scanning for 'any' type usage in TypeScript files...${NC}"
echo -e "${BLUE}===============================================${NC}\n"

# Patterns to search for
ANY_PATTERNS=(
  ':\s*any(\s|\[|\)|,|;|$|>)'
  '\<any\>'
  'as\s+any'
  'Array<any>'
  'Promise<any>'
  'Record<[^,]+,\s*any>'
  ': {\[key: string\]: any}'
)

# Track totals
TOTAL_FILES=0
TOTAL_VIOLATIONS=0
VIOLATION_FILES=()

# Function to check a single file
check_file() {
  local file="$1"
  local violations=0
  local file_violations=""
  
  for pattern in "${ANY_PATTERNS[@]}"; do
    if matches=$(grep -En "$pattern" "$file" 2>/dev/null | grep -v '// eslint-disable\|// @ts-ignore\|// @ts-expect-error\|\.d\.ts:'); then
      violations=$((violations + $(echo "$matches" | wc -l)))
      file_violations="${file_violations}${matches}\n"
    fi
  done
  
  if [ $violations -gt 0 ]; then
    echo -e "${RED}❌ ${file}${NC} - ${violations} violations"
    echo -e "${file_violations}" | head -10
    echo ""
    VIOLATION_FILES+=("$file:$violations")
  fi
  
  return $violations
}

# Find all TypeScript files (excluding tests and type definitions)
echo "Scanning TypeScript files..."
while IFS= read -r -d '' file; do
  TOTAL_FILES=$((TOTAL_FILES + 1))
  if violations=$(check_file "$file"); then
    :
  else
    TOTAL_VIOLATIONS=$((TOTAL_VIOLATIONS + violations))
  fi
done < <(find src -name "*.ts" -not -path "*/node_modules/*" -not -name "*.test.ts" -not -name "*.spec.ts" -not -name "*.d.ts" -print0)

# Summary
echo -e "\n${BLUE}========== SUMMARY ==========${NC}"
echo -e "Total files scanned: ${TOTAL_FILES}"
echo -e "Files with violations: ${#VIOLATION_FILES[@]}"
echo -e "Total violations: ${RED}${TOTAL_VIOLATIONS}${NC}"

if [ ${#VIOLATION_FILES[@]} -gt 0 ]; then
  echo -e "\n${YELLOW}Top offenders:${NC}"
  # Sort by violation count and show top 10
  printf '%s\n' "${VIOLATION_FILES[@]}" | sort -t: -k2 -rn | head -10 | while IFS=: read -r file count; do
    echo -e "  ${count} violations: ${file}"
  done
  
  echo -e "\n${YELLOW}📋 Recommended fixes:${NC}"
  echo "1. Replace 'any' with 'unknown' and add type guards"
  echo "2. Import proper types from '../types/api-responses'"
  echo "3. Use Zod schemas for runtime validation"
  echo "4. Define interfaces for complex objects"
  echo ""
  echo -e "${BLUE}Example fix:${NC}"
  echo "  // Before:"
  echo "  const response: any = await client.request(...);"
  echo ""
  echo "  // After:"
  echo "  const response: unknown = await client.request(...);"
  echo "  if (!isValidPropertyResponse(response)) {"
  echo "    throw new Error('Invalid response');"
  echo "  }"
  echo ""
  echo -e "${YELLOW}To automatically fix some issues:${NC}"
  echo "  npm run audit:fix"
  
  exit 1
else
  echo -e "\n${GREEN}✅ No 'any' type violations found!${NC}"
  echo -e "${GREEN}🎉 Your code follows CODE KAI principles!${NC}"
  exit 0
fi