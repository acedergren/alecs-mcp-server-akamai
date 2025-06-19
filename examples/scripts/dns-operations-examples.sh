#!/bin/bash
# DNS Operations Examples - Executable scripts for Akamai MCP Server

# Set up the MCP server command
MCP_SERVER="npx tsx src/index.ts"

echo "=== DNS Operations Examples ==="
echo

# Example 1: List all DNS zones
echo "1. Listing all DNS zones:"
echo '{"method": "mcp__alecs-full__list-zones", "params": {}}' | $MCP_SERVER
echo

# Example 2: Create a new DNS zone
echo "2. Creating a new DNS zone:"
cat << EOF | $MCP_SERVER
{
  "method": "mcp__alecs-full__create-zone",
  "params": {
    "zone": "example.com",
    "type": "PRIMARY",
    "contractId": "ctr_123456",
    "comment": "Main website DNS zone"
  }
}
EOF
echo

# Example 3: Add A record
echo "3. Adding an A record:"
cat << EOF | $MCP_SERVER
{
  "method": "mcp__alecs-full__create-record",
  "params": {
    "zone": "example.com",
    "name": "www",
    "type": "A",
    "ttl": 300,
    "rdata": ["192.0.2.1"]
  }
}
EOF
echo

# Example 4: Add CNAME record
echo "4. Adding a CNAME record:"
cat << EOF | $MCP_SERVER
{
  "method": "mcp__alecs-full__create-record",
  "params": {
    "zone": "example.com",
    "name": "blog",
    "type": "CNAME",
    "ttl": 300,
    "rdata": ["blog.cdn.example.com."]
  }
}
EOF
echo

# Example 5: Add MX records
echo "5. Adding MX records:"
cat << EOF | $MCP_SERVER
{
  "method": "mcp__alecs-full__create-record",
  "params": {
    "zone": "example.com",
    "name": "@",
    "type": "MX",
    "ttl": 3600,
    "rdata": [
      "10 mail1.example.com.",
      "20 mail2.example.com."
    ]
  }
}
EOF
echo

# Example 6: Add TXT record for SPF
echo "6. Adding SPF TXT record:"
cat << EOF | $MCP_SERVER
{
  "method": "mcp__alecs-full__create-record",
  "params": {
    "zone": "example.com",
    "name": "@",
    "type": "TXT",
    "ttl": 3600,
    "rdata": ["v=spf1 include:_spf.example.com ~all"]
  }
}
EOF
echo

# Example 7: List records in a zone
echo "7. Listing all records in a zone:"
cat << EOF | $MCP_SERVER
{
  "method": "mcp__alecs-full__list-records",
  "params": {
    "zone": "example.com"
  }
}
EOF
echo

# Example 8: Update a record
echo "8. Updating an A record:"
cat << EOF | $MCP_SERVER
{
  "method": "mcp__alecs-full__update-record",
  "params": {
    "zone": "example.com",
    "name": "www",
    "type": "A",
    "ttl": 600,
    "rdata": ["192.0.2.2"]
  }
}
EOF
echo

# Example 9: Delete a record
echo "9. Deleting a record:"
cat << EOF | $MCP_SERVER
{
  "method": "mcp__alecs-full__delete-record",
  "params": {
    "zone": "example.com",
    "name": "old",
    "type": "CNAME"
  }
}
EOF
echo

# Example 10: Activate DNS changes
echo "10. Activating DNS changes:"
cat << EOF | $MCP_SERVER
{
  "method": "mcp__alecs-full__activate-zone-changes",
  "params": {
    "zone": "example.com",
    "comment": "Adding new web server IPs"
  }
}
EOF
echo

echo "=== End of DNS Operations Examples ==="