#!/bin/bash

# Claude CLI MCP Add Commands for ALECS Akamai Server

# Add the minimal server (7 core tools)
claude mcp add alecs-akamai node /Users/acedergr/Projects/alecs-mcp-server-akamai/alecs-mcp-server-akamai/dist/index.js

# Add the full server (ALL tools)
claude mcp add alecs-akamai-full node /Users/acedergr/Projects/alecs-mcp-server-akamai/alecs-mcp-server-akamai/dist/index-full.js

# List all MCP servers to verify
claude mcp list

# Remove servers if needed
# claude mcp remove alecs-akamai
# claude mcp remove alecs-akamai-full