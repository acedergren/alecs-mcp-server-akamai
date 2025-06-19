#!/bin/bash
# Reporting and Analytics Examples - Executable scripts for Akamai MCP Server

# Set up the MCP server command
MCP_SERVER="npx tsx src/index.ts"

echo "=== Reporting and Analytics Examples ==="
echo

# Example 1: Traffic report
echo "1. Getting traffic report:"
cat << EOF | $MCP_SERVER
{
  "method": "mcp__alecs-full__get-traffic-report",
  "params": {
    "propertyId": "prp_123456",
    "startDate": "2024-01-01",
    "endDate": "2024-01-07",
    "metrics": ["bytesOut", "hitsTotal", "reqPerSec"]
  }
}
EOF
echo

# Example 2: Bandwidth usage
echo "2. Getting bandwidth usage:"
cat << EOF | $MCP_SERVER
{
  "method": "mcp__alecs-full__get-bandwidth-usage",
  "params": {
    "groupId": "grp_123456",
    "period": "LAST_30_DAYS",
    "granularity": "DAILY"
  }
}
EOF
echo

# Example 3: Cache hit ratio
echo "3. Getting cache hit ratio:"
cat << EOF | $MCP_SERVER
{
  "method": "mcp__alecs-full__get-cache-stats",
  "params": {
    "propertyId": "prp_123456",
    "startTime": "2024-01-07T00:00:00Z",
    "endTime": "2024-01-07T23:59:59Z",
    "metrics": ["cacheHitRatio", "cacheMisses", "cacheHits"]
  }
}
EOF
echo

# Example 4: Error rate report
echo "4. Getting error rate statistics:"
cat << EOF | $MCP_SERVER
{
  "method": "mcp__alecs-full__get-error-stats",
  "params": {
    "propertyId": "prp_123456",
    "period": "LAST_24_HOURS",
    "errorTypes": ["4xx", "5xx"],
    "groupBy": "errorCode"
  }
}
EOF
echo

# Example 5: Top URLs report
echo "5. Getting top URLs report:"
cat << EOF | $MCP_SERVER
{
  "method": "mcp__alecs-full__get-top-urls",
  "params": {
    "propertyId": "prp_123456",
    "startDate": "2024-01-07",
    "endDate": "2024-01-07",
    "limit": 20,
    "sortBy": "hits"
  }
}
EOF
echo

# Example 6: Geographic distribution
echo "6. Getting geographic distribution:"
cat << EOF | $MCP_SERVER
{
  "method": "mcp__alecs-full__get-geo-report",
  "params": {
    "propertyId": "prp_123456",
    "period": "LAST_7_DAYS",
    "metrics": ["requests", "bandwidth"],
    "groupBy": "country"
  }
}
EOF
echo

# Example 7: Real-time stats
echo "7. Getting real-time statistics:"
cat << EOF | $MCP_SERVER
{
  "method": "mcp__alecs-full__get-realtime-stats",
  "params": {
    "propertyId": "prp_123456",
    "metrics": ["reqPerSec", "bandwidth", "activeConnections"]
  }
}
EOF
echo

# Example 8: Performance metrics
echo "8. Getting performance metrics:"
cat << EOF | $MCP_SERVER
{
  "method": "mcp__alecs-full__get-performance-metrics",
  "params": {
    "propertyId": "prp_123456",
    "period": "LAST_24_HOURS",
    "metrics": ["avgResponseTime", "originResponseTime", "downloadTime"]
  }
}
EOF
echo

# Example 9: Security events report
echo "9. Getting security events report:"
cat << EOF | $MCP_SERVER
{
  "method": "mcp__alecs-full__get-security-events",
  "params": {
    "configId": "123456",
    "startTime": "2024-01-07T00:00:00Z",
    "endTime": "2024-01-07T23:59:59Z",
    "eventTypes": ["waf_deny", "rate_limit", "bot_detected"]
  }
}
EOF
echo

# Example 10: Custom report
echo "10. Creating custom report:"
cat << EOF | $MCP_SERVER
{
  "method": "mcp__alecs-full__create-custom-report",
  "params": {
    "name": "Weekly Executive Summary",
    "properties": ["prp_123456", "prp_789012"],
    "metrics": [
      "totalBandwidth",
      "totalRequests",
      "cacheHitRatio",
      "avgResponseTime",
      "errorRate"
    ],
    "period": "LAST_7_DAYS",
    "format": "PDF",
    "emailTo": ["executives@example.com"]
  }
}
EOF
echo

echo "=== End of Reporting and Analytics Examples ==="