#!/bin/bash
# Security Configuration Examples - Executable scripts for Akamai MCP Server

# Set up the MCP server command
MCP_SERVER="npx tsx src/index.ts"

echo "=== Security Configuration Examples ==="
echo

# Example 1: Create network list
echo "1. Creating a network list:"
cat << EOF | $MCP_SERVER
{
  "method": "mcp__alecs-full__create-network-list",
  "params": {
    "name": "Blocked IPs",
    "type": "IP",
    "description": "Known malicious IP addresses",
    "contractId": "ctr_123456",
    "groupId": "grp_123456"
  }
}
EOF
echo

# Example 2: Add IPs to network list
echo "2. Adding IPs to network list:"
cat << EOF | $MCP_SERVER
{
  "method": "mcp__alecs-full__add-to-network-list",
  "params": {
    "networkListId": "12345",
    "list": [
      "192.0.2.100",
      "192.0.2.101",
      "192.0.2.102",
      "203.0.113.50"
    ]
  }
}
EOF
echo

# Example 3: Add CIDR blocks
echo "3. Adding CIDR blocks to network list:"
cat << EOF | $MCP_SERVER
{
  "method": "mcp__alecs-full__add-to-network-list",
  "params": {
    "networkListId": "12346",
    "list": [
      "192.0.2.0/24",
      "203.0.113.0/24",
      "198.51.100.0/24"
    ]
  }
}
EOF
echo

# Example 4: Create geo-based network list
echo "4. Creating geo-based network list:"
cat << EOF | $MCP_SERVER
{
  "method": "mcp__alecs-full__create-network-list",
  "params": {
    "name": "Allowed Countries",
    "type": "GEO",
    "description": "Countries allowed to access the site",
    "list": ["US", "CA", "GB", "DE", "FR"]
  }
}
EOF
echo

# Example 5: Activate network list
echo "5. Activating network list:"
cat << EOF | $MCP_SERVER
{
  "method": "mcp__alecs-full__activate-network-list",
  "params": {
    "networkListId": "12345",
    "network": "PRODUCTION",
    "comment": "Blocking newly identified malicious IPs"
  }
}
EOF
echo

# Example 6: Create security policy
echo "6. Creating a security policy:"
cat << EOF | $MCP_SERVER
{
  "method": "mcp__alecs-full__create-security-policy",
  "params": {
    "configId": "123456",
    "policyName": "API Protection",
    "policyPrefix": "API1"
  }
}
EOF
echo

# Example 7: Add rate limiting rule
echo "7. Adding rate limiting rule:"
cat << EOF | $MCP_SERVER
{
  "method": "mcp__alecs-full__add-rate-limit",
  "params": {
    "configId": "123456",
    "policyId": "API1_12345",
    "rate": 100,
    "burst": 150,
    "path": "/api/*",
    "method": "POST"
  }
}
EOF
echo

# Example 8: Add custom rule
echo "8. Adding custom security rule:"
cat << EOF | $MCP_SERVER
{
  "method": "mcp__alecs-full__add-custom-rule",
  "params": {
    "configId": "123456",
    "policyId": "API1_12345",
    "rules": [
      {
        "name": "Block SQL Injection",
        "action": "DENY",
        "condition": {
          "type": "requestHeaderValueMatch",
          "header": "User-Agent",
          "match": "sqlmap"
        }
      }
    ]
  }
}
EOF
echo

# Example 9: Add IP whitelist exception
echo "9. Adding IP whitelist exception:"
cat << EOF | $MCP_SERVER
{
  "method": "mcp__alecs-full__add-exception",
  "params": {
    "configId": "123456",
    "policyId": "API1_12345",
    "ipWhitelist": ["192.0.2.50", "192.0.2.51"],
    "description": "Office IP addresses"
  }
}
EOF
echo

# Example 10: Activate security configuration
echo "10. Activating security configuration:"
cat << EOF | $MCP_SERVER
{
  "method": "mcp__alecs-full__activate-security-config",
  "params": {
    "configId": "123456",
    "version": 5,
    "network": "STAGING",
    "notificationEmails": ["security@example.com"],
    "comment": "Testing new rate limiting rules"
  }
}
EOF
echo

echo "=== End of Security Configuration Examples ==="