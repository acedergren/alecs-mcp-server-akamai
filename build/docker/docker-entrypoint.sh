#!/bin/sh
set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_color() {
    color=$1
    shift
    printf "${color}%s${NC}\n" "$*"
}

# Check if .edgerc file exists
EDGERC_FILE="${EDGERC_PATH:-$HOME/.edgerc}"
if [ ! -f "$EDGERC_FILE" ]; then
    print_color "$RED" "❌ Error: .edgerc file not found at $EDGERC_FILE"
    echo ""
    echo "Please mount your .edgerc file:"
    echo "  docker run -v ~/.edgerc:/home/alecs/.edgerc:ro alecs-mcp-server-akamai"
    echo ""
    echo "Or set EDGERC_PATH environment variable:"
    echo "  docker run -e EDGERC_PATH=/custom/path/.edgerc alecs-mcp-server-akamai"
    exit 1
fi

# Validate .edgerc permissions
if [ ! -r "$EDGERC_FILE" ]; then
    print_color "$RED" "❌ Error: Cannot read .edgerc file at $EDGERC_FILE"
    echo "Please check file permissions"
    exit 1
fi

# Validate .edgerc has required sections
if [ -f "$EDGERC_FILE" ]; then
    if ! grep -q "^\[.*\]$" "$EDGERC_FILE"; then
        print_color "$YELLOW" "⚠️  Warning: .edgerc file appears to be invalid (no sections found)"
    else
        # Count available sections
        sections=$(grep -c "^\[.*\]$" "$EDGERC_FILE" || true)
        print_color "$GREEN" "✅ Found $sections customer section(s) in .edgerc"
        
        # List available sections
        if [ "$DEBUG" = "1" ] || [ "$DEBUG" = "true" ]; then
            echo "   Available sections:"
            grep "^\[.*\]$" "$EDGERC_FILE" | sed 's/^\[//;s/\]$//' | while read -r section; do
                echo "   • $section"
            done
        fi
    fi
fi

# Display startup message
print_color "$BLUE" "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
print_color "$BLUE" "🚀 Starting ALECS - MCP Server for Akamai v1.3.0"
print_color "$BLUE" "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
print_color "$GREEN" "📍 Configuration:"
echo "   • EdgeRC: $EDGERC_FILE"
echo "   • Node.js: $(node --version)"
echo "   • Environment: ${NODE_ENV:-production}"
echo "   • User: $(whoami) ($(id -u):$(id -g))"

if [ -n "$DEFAULT_CUSTOMER" ]; then
    echo "   • Default Customer: $DEFAULT_CUSTOMER"
fi

if [ "$DEBUG" = "1" ] || [ "$DEBUG" = "true" ]; then
    echo "   • Debug Mode: ENABLED"
fi

# Show available servers
echo ""
print_color "$GREEN" "📡 Available Services:"
echo "   • Property Server (32 tools)"
echo "   • DNS Server (24 tools)"
echo "   • Certificates Server (22 tools)"
echo "   • Security Server (95 tools)"
echo "   • Reporting Server (25 tools)"

echo ""
print_color "$BLUE" "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Execute the main command
exec "$@"