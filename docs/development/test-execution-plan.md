#!/bin/bash

# Comprehensive Test Runner for ALECS - MCP server for Akamai
# This script runs all tests in the recommended order

set -e

echo "🚀 Starting Comprehensive Test Suite for ALECS - MCP server for Akamai"
echo "=========================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to run command with error handling
run_command() {
    local cmd="$1"
    local description="$2"
    
    print_status "Running: $description"
    echo "Command: $cmd"
    
    if eval "$cmd"; then
        print_success "$description completed"
        return 0
    else
        print_error "$description failed"
        return 1
    fi
}

# Initialize
START_TIME=$(date +%s)
FAILED_TESTS=()

echo ""
print_status "Phase 1: Environment Validation"
echo "================================"

# Check Node.js version
print_status "Checking Node.js version..."
node --version

# Check dependencies
run_command "npm ci" "Installing dependencies" || FAILED_TESTS+=("npm install")

# Type checking
run_command "npm run typecheck" "TypeScript type checking" || FAILED_TESTS+=("typecheck")

# Linting
run_command "npm run lint:check" "ESLint checking" || FAILED_TESTS+=("linting")

# Formatting
run_command "npm run format:check" "Prettier format checking" || FAILED_TESTS+=("formatting")

echo ""
print_status "Phase 2: Unit Tests (TypeScript)"
echo "================================="

# Core unit tests
run_command "npm test -- --testPathPattern='fastpurge.*test.ts$' --verbose" "FastPurge unit tests" || FAILED_TESTS+=("fastpurge-units")

run_command "npm test -- --testPathPattern='property.*test.ts$' --verbose" "Property Manager unit tests" || FAILED_TESTS+=("property-units")

run_command "npm test -- --testPathPattern='dns.*test.ts$' --verbose" "DNS unit tests" || FAILED_TESTS+=("dns-units")

run_command "npm test -- --testPathPattern='(mcp|error|performance).*test.ts$' --verbose" "Core system unit tests" || FAILED_TESTS+=("core-units")

# All unit tests with coverage
run_command "npm run test:coverage" "Full unit test suite with coverage" || FAILED_TESTS+=("unit-coverage")

echo ""
print_status "Phase 3: MCP Protocol & Health Tests"
echo "====================================="

# MCP health check
run_command "npm run test:health" "MCP health diagnostics" || FAILED_TESTS+=("mcp-health")

# Customer journey
run_command "npm run test:journey" "Customer journey simulation" || FAILED_TESTS+=("customer-journey")

# Error scenarios
run_command "npm run test:errors" "Error scenario testing" || FAILED_TESTS+=("error-scenarios")

echo ""
print_status "Phase 4: Customer Experience Tests"
echo "=================================="

# Customer scenarios
run_command "node tests/personas/customer-scenarios.js" "Customer persona testing" || FAILED_TESTS+=("customer-personas")

# UX interaction
run_command "node tests/ux/interaction-testing.js" "UX interaction testing" || FAILED_TESTS+=("ux-interaction")

# End-to-end integration
run_command "node tests/integration/end-to-end.js" "End-to-end integration tests" || FAILED_TESTS+=("e2e-integration")

echo ""
print_status "Phase 5: Production Readiness Tests"
echo "==================================="

# Reliability testing
run_command "node tests/reliability/resilience-test.js" "Reliability and resilience testing" || FAILED_TESTS+=("reliability")

# Security compliance
run_command "node tests/security/compliance-check.js" "Security compliance checks" || FAILED_TESTS+=("security")

# Operational excellence
run_command "node tests/operations/monitoring-test.js" "Operational monitoring tests" || FAILED_TESTS+=("operations")

# Business continuity
run_command "node tests/continuity/disaster-recovery.js" "Business continuity testing" || FAILED_TESTS+=("continuity")

echo ""
print_status "Phase 6: Analysis & Improvement Tests"
echo "====================================="

# Bug analysis
run_command "node tests/analysis/bug-detector.js" "Bug detection analysis" || FAILED_TESTS+=("bug-analysis")

# Journey analytics
run_command "node tests/analytics/journey-analyzer.js" "Journey analytics testing" || FAILED_TESTS+=("journey-analytics")

# Quality gates
run_command "node tests/gates/quality-gates.js" "Quality gates validation" || FAILED_TESTS+=("quality-gates")

echo ""
print_status "Phase 7: Performance & Load Tests"
echo "================================="

# Performance testing
run_command "npm run test:performance" "Performance and load testing" || FAILED_TESTS+=("performance")

echo ""
print_status "Phase 8: Legacy Integration Tests"
echo "================================="

# Basic connectivity (only if credentials available)
if [ -f ".edgerc" ]; then
    print_status "Found .edgerc file, running integration tests..."
    
    run_command "node tests/integration/test-connection.js" "Basic connectivity test" || FAILED_TESTS+=("connectivity")
    
    run_command "node tests/integration/test-papi-format.js" "PAPI format test" || FAILED_TESTS+=("papi-format")
    
    run_command "node tests/integration/test-cpcodes.js" "CP Codes test" || FAILED_TESTS+=("cpcodes")
else
    print_warning "No .edgerc file found, skipping live integration tests"
fi

# Calculate total time
END_TIME=$(date +%s)
TOTAL_TIME=$((END_TIME - START_TIME))
MINUTES=$((TOTAL_TIME / 60))
SECONDS=$((TOTAL_TIME % 60))

echo ""
echo "=========================================================="
print_status "Test Execution Summary"
echo "=========================================================="

if [ ${#FAILED_TESTS[@]} -eq 0 ]; then
    print_success "🎉 ALL TESTS PASSED!"
    print_success "Total execution time: ${MINUTES}m ${SECONDS}s"
    echo ""
    print_status "Test Coverage Summary:"
    echo "- ✅ Unit Tests: All passed"
    echo "- ✅ Integration Tests: All passed" 
    echo "- ✅ Customer Experience: All passed"
    echo "- ✅ Production Readiness: All passed"
    echo "- ✅ Performance Tests: All passed"
    echo ""
    print_success "System is ready for production deployment! 🚀"
    exit 0
else
    print_error "❌ Some tests failed:"
    for test in "${FAILED_TESTS[@]}"; do
        echo "  - $test"
    done
    echo ""
    print_warning "Total execution time: ${MINUTES}m ${SECONDS}s"
    print_warning "Please review failed tests before deployment"
    exit 1
fi