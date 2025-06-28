#!/bin/bash

# ALECS API Discovery - Bash Wrapper Script
# 
# This script provides a simple bash interface to the TypeScript API discovery script
# and integrates seamlessly with the main TypeScript debugging script.
#
# Usage:
#   ./scripts/api-discover.sh <endpoint> [customer]
#   ./scripts/api-discover.sh property.list testing
#   ./scripts/api-discover.sh mcp.tools.list testing
#   ./scripts/api-discover.sh all testing

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
ENDPOINT=${1:-"help"}
CUSTOMER=${2:-"testing"}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DISCOVERY_SCRIPT="$PROJECT_ROOT/scripts/api-discover-pure.js"
RESULTS_DIR="$PROJECT_ROOT/api-discovery-results"

# Function to log with timestamp
log() {
    echo -e "$(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Function to check command success
check_command() {
    if [ $? -eq 0 ]; then
        log "${GREEN}✅ $1 - SUCCESS${NC}"
    else
        log "${RED}❌ $1 - FAILED${NC}"
        return 1
    fi
}

# Ensure results directory exists
mkdir -p "$RESULTS_DIR"

# Available endpoints
AKAMAI_ENDPOINTS=(
    "property.list"
    "property.details"
    "dns.zone.list"
    "dns.zone.details"
    "dns.records"
    "reporting.traffic"
    "cps.certificates"
    "cps.enrollments"
    "fastpurge.status"
    "cpcodes.list"
    "appsec.configurations"
    "appsec.policies"
    "networklists.list"
)

MCP_ENDPOINTS=(
    "mcp.tools.list"
    "mcp.initialize"
    "mcp.protocol.compliance"
)

ALL_ENDPOINTS=("${AKAMAI_ENDPOINTS[@]}" "${MCP_ENDPOINTS[@]}")

# Function to show help
show_help() {
    echo -e "${CYAN}🔍 ALECS API Discovery Tool${NC}"
    echo -e "${BLUE}==============================${NC}"
    echo ""
    echo "Usage: $0 <endpoint> [customer]"
    echo ""
    echo -e "${PURPLE}Available Endpoints:${NC}"
    echo ""
    echo -e "${YELLOW}Akamai APIs:${NC}"
    for endpoint in "${AKAMAI_ENDPOINTS[@]}"; do
        echo "  $endpoint"
    done
    echo ""
    echo -e "${YELLOW}MCP Protocol:${NC}"
    for endpoint in "${MCP_ENDPOINTS[@]}"; do
        echo "  $endpoint"
    done
    echo ""
    echo -e "${YELLOW}Special Commands:${NC}"
    echo "  all              - Test all endpoints"
    echo "  akamai          - Test all Akamai endpoints"
    echo "  mcp             - Test all MCP endpoints"
    echo "  validate        - Run comprehensive validation"
    echo ""
    echo -e "${BLUE}Examples:${NC}"
    echo "  $0 property.list testing"
    echo "  $0 mcp.tools.list testing"
    echo "  $0 all testing"
    echo "  $0 validate testing"
}

# Function to test individual endpoint
test_endpoint() {
    local endpoint=$1
    local customer=$2
    
    log "${BLUE}Testing endpoint: ${endpoint} for customer: ${customer}${NC}"
    
    # Use pure Node.js (no TypeScript dependencies)
    if ! command -v node &> /dev/null; then
        log "${RED}Node.js not found. Please install Node.js.${NC}"
        return 1
    fi
    
    cd "$PROJECT_ROOT"
    node "$DISCOVERY_SCRIPT" discover "$endpoint" "$customer"
    
    check_command "Discovery for $endpoint"
}

# Function to test multiple endpoints
test_multiple_endpoints() {
    local endpoints=("$@")
    local customer="$CUSTOMER"
    local success_count=0
    local total_count=${#endpoints[@]}
    
    log "${BLUE}Testing ${total_count} endpoints for customer: ${customer}${NC}"
    
    for endpoint in "${endpoints[@]}"; do
        echo ""
        if test_endpoint "$endpoint" "$customer"; then
            success_count=$((success_count + 1))
        fi
    done
    
    echo ""
    log "${PURPLE}📊 Test Results Summary:${NC}"
    log "  Total endpoints: $total_count"
    log "  Successful: ${GREEN}$success_count${NC}"
    log "  Failed: ${RED}$((total_count - success_count))${NC}"
    log "  Success rate: $(( (success_count * 100) / total_count ))%"
}

# Function to run comprehensive validation
run_validation() {
    local customer=$1
    
    log "${BLUE}Running comprehensive API validation for customer: ${customer}${NC}"
    
    cd "$PROJECT_ROOT"
    node "$DISCOVERY_SCRIPT" validate "$customer"
    
    check_command "Comprehensive validation"
    
    # Generate summary report
    if [ -f "$PROJECT_ROOT/api-discovery-report.md" ]; then
        log "${GREEN}📋 Validation report generated: api-discovery-report.md${NC}"
        
        # Show quick summary
        echo ""
        log "${PURPLE}📊 Quick Summary:${NC}"
        if command -v grep &> /dev/null; then
            local high_confidence=$(grep -c "High confidence" "$PROJECT_ROOT/api-discovery-report.md" 2>/dev/null || echo "0")
            local medium_confidence=$(grep -c "Medium confidence" "$PROJECT_ROOT/api-discovery-report.md" 2>/dev/null || echo "0")
            local low_confidence=$(grep -c "Low confidence" "$PROJECT_ROOT/api-discovery-report.md" 2>/dev/null || echo "0")
            
            log "  High confidence: ${GREEN}$high_confidence${NC}"
            log "  Medium confidence: ${YELLOW}$medium_confidence${NC}"
            log "  Low confidence: ${RED}$low_confidence${NC}"
        fi
    fi
}

# Function to show available results
show_results() {
    echo ""
    log "${PURPLE}📁 Available Discovery Results:${NC}"
    
    if [ -d "$RESULTS_DIR" ]; then
        local result_count=$(find "$RESULTS_DIR" -name "*.json" | wc -l)
        log "  Results directory: $RESULTS_DIR"
        log "  Total result files: $result_count"
        
        if [ $result_count -gt 0 ]; then
            echo ""
            log "${BLUE}Recent results:${NC}"
            find "$RESULTS_DIR" -name "*.json" -type f -exec ls -la {} \; | head -5 | while read -r line; do
                echo "  $line"
            done
            
            if [ $result_count -gt 5 ]; then
                log "  ... and $((result_count - 5)) more files"
            fi
        fi
    else
        log "  No results directory found. Run discovery first."
    fi
}

# Main script logic
main() {
    echo -e "${CYAN}🚀 ALECS API Discovery${NC}"
    echo -e "${BLUE}=====================${NC}"
    echo ""
    
    # Validate inputs
    case "$ENDPOINT" in
        "help"|"-h"|"--help")
            show_help
            exit 0
            ;;
        "all")
            test_multiple_endpoints "${ALL_ENDPOINTS[@]}"
            ;;
        "akamai")
            test_multiple_endpoints "${AKAMAI_ENDPOINTS[@]}"
            ;;
        "mcp")
            test_multiple_endpoints "${MCP_ENDPOINTS[@]}"
            ;;
        "validate")
            run_validation "$CUSTOMER"
            ;;
        "results")
            show_results
            ;;
        *)
            # Check if it's a valid individual endpoint
            local valid_endpoint=false
            for endpoint in "${ALL_ENDPOINTS[@]}"; do
                if [ "$endpoint" = "$ENDPOINT" ]; then
                    valid_endpoint=true
                    break
                fi
            done
            
            if [ "$valid_endpoint" = true ]; then
                test_endpoint "$ENDPOINT" "$CUSTOMER"
            else
                echo -e "${RED}❌ Unknown endpoint: $ENDPOINT${NC}"
                echo ""
                show_help
                exit 1
            fi
            ;;
    esac
    
    # Show results summary
    show_results
    
    echo ""
    log "${GREEN}🎉 Discovery completed!${NC}"
    echo ""
    log "${YELLOW}Next Steps:${NC}"
    log "  1. Review results in: ${CYAN}$RESULTS_DIR/${NC}"
    log "  2. Check validation report: ${CYAN}$PROJECT_ROOT/api-discovery-report.md${NC}"
    log "  3. Run TypeScript debugging: ${CYAN}./scripts/complete-typescript-debugging.sh $CUSTOMER${NC}"
}

# Ensure we're in the right directory
if [ ! -f "$DISCOVERY_SCRIPT" ]; then
    log "${RED}❌ Discovery script not found at: $DISCOVERY_SCRIPT${NC}"
    log "${YELLOW}Please run this script from the project root or scripts directory.${NC}"
    exit 1
fi

# Run main function
main "$@"