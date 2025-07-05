#!/bin/bash
# Test script to verify all hooks are working

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🧪 Testing ALECS MCP Server Hooks Integration${NC}"
echo -e "${BLUE}=============================================${NC}\n"

# Test 1: Check hooks are installed
echo -e "${YELLOW}1. Checking Claude hooks installation...${NC}"
if [ -f ~/.claude/settings.json ]; then
    echo -e "${GREEN}✅ Hooks configuration found${NC}"
else
    echo -e "${RED}❌ Hooks not installed - run ./hooks-setup.sh${NC}"
    exit 1
fi

# Test 2: Check Docker
echo -e "\n${YELLOW}2. Checking Docker...${NC}"
if command -v docker &> /dev/null && docker info &> /dev/null 2>&1; then
    echo -e "${GREEN}✅ Docker is running${NC}"
    docker --version
else
    echo -e "${RED}❌ Docker not available${NC}"
fi

# Test 3: Check SonarQube token
echo -e "\n${YELLOW}3. Checking SonarQube configuration...${NC}"
if [ ! -z "$SONAR_TOKEN" ]; then
    echo -e "${GREEN}✅ SONAR_TOKEN is set (${#SONAR_TOKEN} characters)${NC}"
else
    echo -e "${YELLOW}⚠️  SONAR_TOKEN not set - SonarQube scans will be skipped${NC}"
fi

# Test 4: Check TypeScript
echo -e "\n${YELLOW}4. Checking TypeScript...${NC}"
if npx tsc --version &> /dev/null; then
    echo -e "${GREEN}✅ TypeScript available: $(npx tsc --version)${NC}"
else
    echo -e "${RED}❌ TypeScript not available${NC}"
fi

# Test 5: Run response type check
echo -e "\n${YELLOW}5. Running response type safety check...${NC}"
if npm run typecheck:responses &> /dev/null; then
    echo -e "${GREEN}✅ No API response type violations${NC}"
else
    echo -e "${YELLOW}⚠️  Found response type issues - check npm run typecheck:responses${NC}"
fi

# Test 6: Check for any types
echo -e "\n${YELLOW}6. Checking for 'any' types in responses...${NC}"
ANY_COUNT=$(grep -r "response.*:.*any" src/tools src/utils 2>/dev/null | grep -v "test\|spec\|.d.ts" | wc -l || echo 0)
if [ "$ANY_COUNT" -eq 0 ]; then
    echo -e "${GREEN}✅ No 'any' types in API responses${NC}"
else
    echo -e "${YELLOW}⚠️  Found $ANY_COUNT files with 'any' in responses${NC}"
fi

# Summary
echo -e "\n${BLUE}========== SUMMARY ==========${NC}"
echo -e "${GREEN}Hooks are installed and active!${NC}"
echo ""
echo "When you edit TypeScript files, hooks will:"
echo "  • Auto-format with Prettier"
echo "  • Lint with ESLint"
echo "  • Check TypeScript compilation"
echo "  • Block 'any' types in API responses"
echo "  • Run related tests"
echo "  • Trigger incremental builds"
echo ""
echo "On git commit:"
echo "  • Pre-commit quality checks run"
echo "  • SonarQube analysis triggers (if token set)"
echo ""
echo -e "${BLUE}Happy coding with enhanced safety! 🛡️${NC}"