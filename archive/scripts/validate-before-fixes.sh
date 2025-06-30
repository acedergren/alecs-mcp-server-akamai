#!/bin/bash

# Pre-fix validation script
# Run this before making any TypeScript fixes to ensure we have a stable baseline

set -e

echo "🔍 Pre-Fix Validation Check"
echo "=========================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

VALIDATION_PASSED=true

# 1. Check current branch
echo "1. Checking Git state..."
CURRENT_BRANCH=$(git branch --show-current)
if [[ "$CURRENT_BRANCH" == "typescript-fixes-baseline" ]]; then
  echo -e "  ${GREEN}✓ On baseline branch${NC}"
else
  echo -e "  ${RED}✗ Not on baseline branch (current: $CURRENT_BRANCH)${NC}"
  VALIDATION_PASSED=false
fi

# Check for uncommitted changes
if [[ -n $(git status --porcelain) ]]; then
  echo -e "  ${YELLOW}⚠ Uncommitted changes detected${NC}"
  git status --short
fi

# 2. Run tests
echo ""
echo "2. Running tests..."
if npm test -- --passWithNoTests > /dev/null 2>&1; then
  echo -e "  ${GREEN}✓ All tests pass${NC}"
else
  echo -e "  ${RED}✗ Tests failed${NC}"
  VALIDATION_PASSED=false
fi

# 3. Check TypeScript errors
echo ""
echo "3. Checking TypeScript errors..."
ERROR_COUNT=$(npm run typecheck 2>&1 | grep -c "error TS" || true)
echo -e "  Current error count: ${YELLOW}$ERROR_COUNT${NC}"
if [[ $ERROR_COUNT -eq 457 ]]; then
  echo -e "  ${GREEN}✓ Error count matches baseline (457)${NC}"
else
  echo -e "  ${YELLOW}⚠ Error count differs from baseline (expected 457)${NC}"
fi

# 4. Check build
echo ""
echo "4. Checking build..."
if npm run build > /dev/null 2>&1; then
  echo -e "  ${GREEN}✓ Build succeeds (with TS errors)${NC}"
else
  echo -e "  ${RED}✗ Build completely fails${NC}"
  VALIDATION_PASSED=false
fi

# 5. Check for snapshot
echo ""
echo "5. Checking for snapshot..."
LATEST_SNAPSHOT=$(ls -dt typescript-snapshot-* 2>/dev/null | head -1)
if [[ -n "$LATEST_SNAPSHOT" ]]; then
  echo -e "  ${GREEN}✓ Snapshot exists: $LATEST_SNAPSHOT${NC}"
else
  echo -e "  ${RED}✗ No snapshot found${NC}"
  VALIDATION_PASSED=false
fi

# Summary
echo ""
echo "=========================="
if [[ "$VALIDATION_PASSED" == true ]]; then
  echo -e "${GREEN}✅ VALIDATION PASSED${NC}"
  echo ""
  echo "Ready to proceed with TypeScript fixes!"
  echo "Remember to:"
  echo "  1. Fix one error at a time"
  echo "  2. Run 'npm run typecheck' after each fix"
  echo "  3. Commit successful fixes immediately"
  echo "  4. If errors cascade, run: git reset --hard HEAD"
else
  echo -e "${RED}❌ VALIDATION FAILED${NC}"
  echo ""
  echo "Please address the issues above before proceeding."
  exit 1
fi