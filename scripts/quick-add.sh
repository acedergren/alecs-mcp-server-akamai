#!/bin/bash

# Quick one-liner commands for adding ALECS to Claude Desktop

echo "# Quick Add Commands for ALECS MCP Servers"
echo ""
echo "# Add all modular servers:"
echo "./scripts/add-to-claude.sh all"
echo ""
echo "# Or use these one-liners directly:"
echo ""
echo "# Add essentials (recommended for testing):"
cat << 'EOF'
jq '.mcpServers["alecs-essentials"] = {"command": "node", "args": ["'$(pwd)'/dist/index-essential.js"], "env": {"AKAMAI_EDGERC_PATH": "'$HOME'/.edgerc"}}' "$HOME/Library/Application Support/Claude/claude_desktop_config.json" > /tmp/claude_config.json && mv /tmp/claude_config.json "$HOME/Library/Application Support/Claude/claude_desktop_config.json"
EOF

echo ""
echo "# Add all modular servers with one command:"
cat << 'EOF'
CONFIG="$HOME/Library/Application Support/Claude/claude_desktop_config.json" && \
jq '.mcpServers["alecs-property"] = {"command": "node", "args": ["'$(pwd)'/dist/servers/property-server.js"], "env": {"AKAMAI_EDGERC_PATH": "'$HOME'/.edgerc"}} | 
   .mcpServers["alecs-dns"] = {"command": "node", "args": ["'$(pwd)'/dist/servers/dns-server.js"], "env": {"AKAMAI_EDGERC_PATH": "'$HOME'/.edgerc"}} |
   .mcpServers["alecs-certs"] = {"command": "node", "args": ["'$(pwd)'/dist/servers/certs-server.js"], "env": {"AKAMAI_EDGERC_PATH": "'$HOME'/.edgerc"}} |
   .mcpServers["alecs-reporting"] = {"command": "node", "args": ["'$(pwd)'/dist/servers/reporting-server.js"], "env": {"AKAMAI_EDGERC_PATH": "'$HOME'/.edgerc"}} |
   .mcpServers["alecs-security"] = {"command": "node", "args": ["'$(pwd)'/dist/servers/security-server.js"], "env": {"AKAMAI_EDGERC_PATH": "'$HOME'/.edgerc"}}' \
   "$CONFIG" > /tmp/claude_config.json && mv /tmp/claude_config.json "$CONFIG"
EOF

echo ""
echo "# Using npx (if published to npm):"
echo 'npx alecs-mcp-server-akamai install --mode modular'
echo ""
echo "# Remove all ALECS servers:"
cat << 'EOF'
jq 'del(.mcpServers | to_entries[] | select(.key | startswith("alecs")))' "$HOME/Library/Application Support/Claude/claude_desktop_config.json" > /tmp/claude_config.json && mv /tmp/claude_config.json "$HOME/Library/Application Support/Claude/claude_desktop_config.json"
EOF