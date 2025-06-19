#!/bin/bash
# Content Purge Examples - Executable scripts for Akamai MCP Server

# Set up the MCP server command
MCP_SERVER="npx tsx src/index.ts"

echo "=== Content Purge Examples ==="
echo

# Example 1: Purge single URL
echo "1. Purging a single URL:"
cat << EOF | $MCP_SERVER
{
  "method": "mcp__alecs-full__purge-by-url",
  "params": {
    "urls": ["https://www.example.com/images/logo.png"]
  }
}
EOF
echo

# Example 2: Purge multiple URLs
echo "2. Purging multiple URLs:"
cat << EOF | $MCP_SERVER
{
  "method": "mcp__alecs-full__purge-by-url",
  "params": {
    "urls": [
      "https://www.example.com/page1.html",
      "https://www.example.com/page2.html",
      "https://www.example.com/assets/style.css",
      "https://www.example.com/assets/script.js"
    ]
  }
}
EOF
echo

# Example 3: Purge by CP Code
echo "3. Purging by CP Code:"
cat << EOF | $MCP_SERVER
{
  "method": "mcp__alecs-full__purge-by-cpcode",
  "params": {
    "cpcode": "12345",
    "network": "production"
  }
}
EOF
echo

# Example 4: Purge by Cache Tag
echo "4. Purging by Cache Tag:"
cat << EOF | $MCP_SERVER
{
  "method": "mcp__alecs-full__purge-by-tag",
  "params": {
    "tags": ["homepage", "navigation"],
    "network": "production"
  }
}
EOF
echo

# Example 5: Delete purge (remove from cache completely)
echo "5. Delete purge (complete removal):"
cat << EOF | $MCP_SERVER
{
  "method": "mcp__alecs-full__purge-delete",
  "params": {
    "urls": ["https://www.example.com/old-page.html"],
    "network": "production"
  }
}
EOF
echo

# Example 6: Invalidate URLs (mark as stale)
echo "6. Invalidate URLs (mark as stale):"
cat << EOF | $MCP_SERVER
{
  "method": "mcp__alecs-full__purge-invalidate",
  "params": {
    "urls": [
      "https://www.example.com/api/data.json",
      "https://www.example.com/api/config.json"
    ],
    "network": "production"
  }
}
EOF
echo

# Example 7: Check purge status
echo "7. Checking purge status:"
cat << EOF | $MCP_SERVER
{
  "method": "mcp__alecs-full__get-purge-status",
  "params": {
    "purgeId": "12345678-1234-1234-1234-123456789012"
  }
}
EOF
echo

# Example 8: Purge with wildcards
echo "8. Purging with wildcards:"
cat << EOF | $MCP_SERVER
{
  "method": "mcp__alecs-full__purge-by-url",
  "params": {
    "urls": ["https://www.example.com/images/*"],
    "network": "production"
  }
}
EOF
echo

# Example 9: Purge staging network
echo "9. Purging on staging network:"
cat << EOF | $MCP_SERVER
{
  "method": "mcp__alecs-full__purge-by-url",
  "params": {
    "urls": ["https://www.example.com/test-page.html"],
    "network": "staging"
  }
}
EOF
echo

# Example 10: Bulk purge with mixed types
echo "10. Bulk purge operation:"
cat << EOF | $MCP_SERVER
{
  "method": "mcp__alecs-full__bulk-purge",
  "params": {
    "purgeRequests": [
      {
        "type": "url",
        "values": ["https://www.example.com/page1.html", "https://www.example.com/page2.html"]
      },
      {
        "type": "cpcode",
        "values": ["12345"]
      },
      {
        "type": "tag",
        "values": ["product-update"]
      }
    ],
    "network": "production"
  }
}
EOF
echo

echo "=== End of Content Purge Examples ==="