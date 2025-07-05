#!/bin/bash
# Find all instances of 'any' type used for API responses
# This is the critical violation we want to prevent

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Scanning for 'any' type in API response contexts...${NC}"
echo -e "${BLUE}===================================================${NC}\n"

# Response-specific patterns to search for
RESPONSE_PATTERNS=(
  'response.*:\s*any'
  'data.*:\s*any'
  'result.*:\s*any'
  'body.*:\s*any'
  'payload.*:\s*any'
  'apiResponse.*:\s*any'
  'await.*\.request.*:\s*any'
  'await.*\.get.*:\s*any'
  'await.*\.post.*:\s*any'
  'await.*\.makeRequest.*:\s*any'
  'Promise<any>'
  'Observable<any>'
  ': any\s*=.*await'
  'catch.*:.*any'
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
  
  for pattern in "${RESPONSE_PATTERNS[@]}"; do
    if matches=$(grep -En "$pattern" "$file" 2>/dev/null | grep -v '// eslint-disable\|// @ts-ignore\|// @ts-expect-error\|\.d\.ts:'); then
      violations=$((violations + $(echo "$matches" | wc -l)))
      file_violations="${file_violations}${matches}\n"
    fi
  done
  
  if [ $violations -gt 0 ]; then
    echo -e "${RED}❌ ${file}${NC} - ${violations} response type violations"
    echo -e "${file_violations}" | head -10
    echo ""
    VIOLATION_FILES+=("$file:$violations")
  fi
  
  return $violations
}

# Find all TypeScript files in tools and utils (where API calls happen)
echo "Scanning for API response type violations..."
while IFS= read -r -d '' file; do
  TOTAL_FILES=$((TOTAL_FILES + 1))
  if violations=$(check_file "$file"); then
    :
  else
    TOTAL_VIOLATIONS=$((TOTAL_VIOLATIONS + violations))
  fi
done < <(find src -name "*.ts" \( -path "*/tools/*" -o -path "*/utils/*" -o -path "*/servers/*" \) -not -name "*.test.ts" -not -name "*.spec.ts" -not -name "*.d.ts" -print0)

# Summary
echo -e "\n${BLUE}========== API RESPONSE TYPE SAFETY REPORT ==========${NC}"
echo -e "Total files scanned: ${TOTAL_FILES}"
echo -e "Files with violations: ${#VIOLATION_FILES[@]}"
echo -e "Total response type violations: ${RED}${TOTAL_VIOLATIONS}${NC}"

if [ ${#VIOLATION_FILES[@]} -gt 0 ]; then
  echo -e "\n${YELLOW}Files with API response type violations:${NC}"
  # Sort by violation count and show all
  printf '%s\n' "${VIOLATION_FILES[@]}" | sort -t: -k2 -rn | while IFS=: read -r file count; do
    echo -e "  ${count} violations: ${file}"
  done
  
  echo -e "\n${YELLOW}📋 CODE KAI REQUIRED FIXES:${NC}"
  echo "1. Replace 'any' with 'unknown' for all API responses"
  echo "2. Add runtime validation with validateApiResponse()"
  echo "3. Use type guards like isValidPropertyResponse()"
  echo "4. Import proper types from '../types/api-responses'"
  echo ""
  echo -e "${BLUE}Correct patterns to follow:${NC}"
  echo ""
  echo "  // Pattern 1: Unknown with validation"
  echo "  const response: unknown = await client.request(...);"
  echo "  validateApiResponse(response, PropertyResponseSchema);"
  echo "  const typedResponse = response as PropertyResponse;"
  echo ""
  echo "  // Pattern 2: Type assertion with guard"
  echo "  const response = await client.request(...) as PropertyResponse;"
  echo "  if (!isValidPropertyResponse(response)) {"
  echo "    throw new Error('Invalid response structure');"
  echo "  }"
  echo ""
  echo "  // Pattern 3: Zod schema validation"
  echo "  const response = await client.request(...);"
  echo "  const validated = PropertyResponseSchema.parse(response);"
  echo ""
  echo -e "${YELLOW}To fix these issues:${NC}"
  echo "  1. Run: npm run audit:fix"
  echo "  2. Or manually update each file following the patterns above"
  
  exit 1
else
  echo -e "\n${GREEN}✅ No API response type violations found!${NC}"
  echo -e "${GREEN}🎉 All API responses have proper type safety!${NC}"
  echo -e "${GREEN}   Your code follows CODE KAI principles for type safety.${NC}"
  exit 0
fi