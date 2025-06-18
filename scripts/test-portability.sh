#!/bin/bash

# Comprehensive portability test for ALECS MCP Server
# This script clones the repository to a temporary location and verifies it works

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results
TESTS_PASSED=0
TESTS_FAILED=0

# Function to print test result
print_test_result() {
    local test_name="$1"
    local result="$2"
    
    if [ "$result" = "pass" ]; then
        echo -e "${GREEN}✅ $test_name${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}❌ $test_name${NC}"
        ((TESTS_FAILED++))
    fi
}

# Function to run a test
run_test() {
    local test_name="$1"
    local command="$2"
    
    echo -e "\n${BLUE}Running: $test_name${NC}"
    if eval "$command" > /dev/null 2>&1; then
        print_test_result "$test_name" "pass"
        return 0
    else
        print_test_result "$test_name" "fail"
        return 1
    fi
}

echo "🧪 ALECS MCP Server Portability Test"
echo "===================================="

# Get the current repository URL
REPO_URL=$(git config --get remote.origin.url || echo "https://github.com/anthropics/alecs-mcp-server-akamai.git")
echo "Repository URL: $REPO_URL"

# Create a temporary directory with a random name
TEMP_DIR=$(mktemp -d -t alecs-portability-test-XXXXXX)
echo "Test directory: $TEMP_DIR"

# Change to temp directory
cd "$TEMP_DIR" || exit 1

# Test 1: Clone the repository
echo -e "\n${YELLOW}Test Suite 1: Repository Setup${NC}"
if run_test "Clone repository" "git clone '$REPO_URL' test-repo"; then
    cd test-repo || exit 1
else
    echo "Failed to clone repository. Using current directory for testing..."
    # If clone fails, copy current directory (for local testing)
    cp -r "$(git rev-parse --show-toplevel)" test-repo
    cd test-repo || exit 1
fi

# Test 2: Check for hardcoded paths
echo -e "\n${YELLOW}Test Suite 2: Path Validation${NC}"
run_test "Check for hardcoded paths" "./scripts/check-hardcoded-paths.sh"

# Test 3: Install dependencies
echo -e "\n${YELLOW}Test Suite 3: Dependencies${NC}"
run_test "Install npm dependencies" "npm install"

# Test 4: Build the project
echo -e "\n${YELLOW}Test Suite 4: Build Process${NC}"
run_test "Build TypeScript" "npm run build"
run_test "Check dist directory exists" "[ -d dist ]"
run_test "Check main server exists" "[ -f dist/index.js ]"
run_test "Check property server exists" "[ -f dist/servers/property-server.js ]"

# Test 5: Run tests
echo -e "\n${YELLOW}Test Suite 5: Test Execution${NC}"
run_test "Run unit tests" "npm test -- --testPathPattern=unit --passWithNoTests"
run_test "Run linting" "npm run lint:check"
run_test "Run type checking" "npm run typecheck"

# Test 6: Check scripts work
echo -e "\n${YELLOW}Test Suite 6: Script Functionality${NC}"
run_test "Make scripts executable" "chmod +x scripts/*.sh examples/scripts/*.sh"
run_test "Send MCP command script exists" "[ -f examples/scripts/send-mcp-command.sh ]"
run_test "Path check script runs" "./scripts/check-hardcoded-paths.sh"

# Test 7: Configuration files
echo -e "\n${YELLOW}Test Suite 7: Configuration${NC}"
run_test "Check package.json exists" "[ -f package.json ]"
run_test "Check tsconfig.json exists" "[ -f tsconfig.json ]"
run_test "Check .gitignore exists" "[ -f .gitignore ]"

# Test 8: Documentation
echo -e "\n${YELLOW}Test Suite 8: Documentation${NC}"
run_test "Check README.md exists" "[ -f README.md ]"
run_test "Check CLAUDE.md exists" "[ -f CLAUDE.md ]"
run_test "Check docs directory exists" "[ -d docs ]"

# Clean up
cd "$TEMP_DIR" || exit 1
echo -e "\n${YELLOW}Cleaning up...${NC}"
rm -rf test-repo

# Summary
echo -e "\n${BLUE}===================================="
echo "Test Summary"
echo "====================================${NC}"
echo -e "Tests passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests failed: ${RED}$TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}✅ All portability tests passed!${NC}"
    echo "The repository can be cloned and used on any machine."
    exit 0
else
    echo -e "\n${RED}❌ Some portability tests failed!${NC}"
    echo "Please fix the issues before distributing the repository."
    exit 1
fi