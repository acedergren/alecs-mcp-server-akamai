#!/bin/bash
# Property Management Examples - Executable scripts for Akamai MCP Server
# These scripts demonstrate how to interact with the MCP server using the CLI

# Set up the MCP server command (adjust path as needed)
MCP_SERVER="npx tsx src/index.ts"

echo "=== Property Management Examples ==="
echo

# Example 1: List all properties
echo "1. Listing all properties:"
echo '{"method": "mcp__alecs-full__list-properties", "params": {}}' | $MCP_SERVER
echo

# Example 2: Get specific property details
echo "2. Getting property details:"
echo '{"method": "mcp__alecs-full__get-property", "params": {"propertyId": "prp_123456"}}' | $MCP_SERVER
echo

# Example 3: Create a new property
echo "3. Creating a new property:"
cat << EOF | $MCP_SERVER
{
  "method": "mcp__alecs-full__create-property",
  "params": {
    "propertyName": "example-website",
    "productId": "SPM",
    "contractId": "ctr_123456",
    "groupId": "grp_123456"
  }
}
EOF
echo

# Example 4: Activate property to staging
echo "4. Activating property to staging:"
cat << EOF | $MCP_SERVER
{
  "method": "mcp__alecs-full__activate-property",
  "params": {
    "propertyId": "prp_123456",
    "version": 1,
    "network": "STAGING",
    "emails": "devops@example.com",
    "note": "Testing new caching rules"
  }
}
EOF
echo

# Example 5: Search for properties
echo "5. Searching for properties by name:"
cat << EOF | $MCP_SERVER
{
  "method": "mcp__alecs-full__search-properties",
  "params": {
    "propertyName": "example.com"
  }
}
EOF
echo

# Example 6: Get property versions
echo "6. Getting property versions:"
cat << EOF | $MCP_SERVER
{
  "method": "mcp__alecs-full__list-property-versions",
  "params": {
    "propertyId": "prp_123456"
  }
}
EOF
echo

# Example 7: Create new property version
echo "7. Creating new property version:"
cat << EOF | $MCP_SERVER
{
  "method": "mcp__alecs-full__create-property-version",
  "params": {
    "propertyId": "prp_123456",
    "baseVersion": 3,
    "note": "Adding new caching behaviors"
  }
}
EOF
echo

# Example 8: Get property rules
echo "8. Getting property rules:"
cat << EOF | $MCP_SERVER
{
  "method": "mcp__alecs-full__get-property-rules",
  "params": {
    "propertyId": "prp_123456",
    "version": 5
  }
}
EOF
echo

# Example 9: Update property rules
echo "9. Updating property rules:"
cat << EOF | $MCP_SERVER
{
  "method": "mcp__alecs-full__update-property-rules",
  "params": {
    "propertyId": "prp_123456",
    "version": 5,
    "rules": {
      "name": "default",
      "children": [
        {
          "name": "Cache Images",
          "criteria": [
            {
              "name": "fileExtension",
              "options": {
                "matchOperator": "IS_ONE_OF",
                "values": ["jpg", "jpeg", "png", "gif", "webp"]
              }
            }
          ],
          "behaviors": [
            {
              "name": "caching",
              "options": {
                "behavior": "MAX_AGE",
                "ttl": "1d"
              }
            }
          ]
        }
      ]
    }
  }
}
EOF
echo

# Example 10: Check activation status
echo "10. Checking activation status:"
cat << EOF | $MCP_SERVER
{
  "method": "mcp__alecs-full__get-activation-status",
  "params": {
    "propertyId": "prp_123456",
    "activationId": "act_123456"
  }
}
EOF
echo

echo "=== End of Property Management Examples ==="