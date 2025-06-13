#!/bin/sh
set -e

# Check if .edgerc file exists
if [ ! -f "$HOME/.edgerc" ] && [ ! -f "${EDGERC_PATH:-$HOME/.edgerc}" ]; then
    echo "❌ Error: .edgerc file not found!"
    echo ""
    echo "Please mount your .edgerc file:"
    echo "  docker run -v ~/.edgerc:/home/alecs/.edgerc:ro alecs-mcp-server-akamai"
    echo ""
    echo "Or set EDGERC_PATH environment variable:"
    echo "  docker run -e EDGERC_PATH=/custom/path/.edgerc alecs-mcp-server-akamai"
    exit 1
fi

# Validate .edgerc has required sections
if [ -f "${EDGERC_PATH:-$HOME/.edgerc}" ]; then
    if ! grep -q "\[default\]" "${EDGERC_PATH:-$HOME/.edgerc}" && ! grep -q "\[" "${EDGERC_PATH:-$HOME/.edgerc}"; then
        echo "⚠️  Warning: .edgerc file appears to be invalid (no sections found)"
    fi
fi

# Display startup message
echo "🚀 Starting ALECS - MCP Server for Akamai"
echo "📍 Using .edgerc from: ${EDGERC_PATH:-$HOME/.edgerc}"

if [ -n "$DEFAULT_CUSTOMER" ]; then
    echo "👤 Default customer: $DEFAULT_CUSTOMER"
fi

# Execute the main command
exec "$@"