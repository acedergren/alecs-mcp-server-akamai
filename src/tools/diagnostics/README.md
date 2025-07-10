# Edge Diagnostics Domain

Comprehensive edge diagnostics and troubleshooting tools for analyzing content delivery, network connectivity, and edge behavior.

## Overview

The Edge Diagnostics domain provides powerful tools for troubleshooting and debugging Akamai edge delivery issues. It includes network diagnostic tools, log analysis, URL health checks, error translation, and comprehensive problem scenario testing.

## Available Tools (22 tools)

### Network Diagnostic Tools

#### diagnostics_run_curl
Request content with cURL for testing edge behavior.
- **Parameters**: url, ipVersion, edgeLocationId, spoofEdgeIp, requestHeaders
- **Returns**: HTTP status, headers, body (truncated), timing metrics

#### diagnostics_run_dig
Perform DNS lookup with dig for hostname resolution testing.
- **Parameters**: hostname, queryType (A, AAAA, CNAME, etc.), edgeLocationId, clientIp
- **Returns**: DNS answers, query time, server information

#### diagnostics_run_mtr
Test network connectivity with MTR for route tracing.
- **Parameters**: destinationDomain, edgeLocationId, ipVersion, packetType, port
- **Returns**: Network hops with latency and packet loss statistics

### Log Analysis

#### diagnostics_grep_logs
Search edge server logs with GREP for troubleshooting (async).
- **Parameters**: edgeIp, cpCode, hostnames, userAgents, start/end times, httpStatusCodes
- **Returns**: Request ID for async operation

#### diagnostics_get_grep_result
Get results from a GREP log search request.
- **Parameters**: requestId
- **Returns**: Log entries matching search criteria

#### diagnostics_run_estats
Run eStats analysis for edge server statistics.
- **Parameters**: url
- **Returns**: Edge server statistics and performance metrics

### URL Analysis

#### diagnostics_check_url_health
Check URL health status and performance (async).
- **Parameters**: url, spoofEdgeIp, edgeLocationId, ipVersion, port, requestHeaders
- **Returns**: Request ID for async operation

#### diagnostics_get_url_health_result
Get results from a URL health check request.
- **Parameters**: requestId
- **Returns**: URL health status and diagnostic information

#### diagnostics_get_translated_url
Get Akamai translated URL for a given URL.
- **Parameters**: url
- **Returns**: Translated URL and type code

### Error Analysis

#### diagnostics_translate_error
Translate Akamai error codes and messages (async).
- **Parameters**: url, userAgent, acceptLanguage, edgeLocationId, clientIp
- **Returns**: Request ID for async operation

#### diagnostics_get_error_translation
Get results from an error translation request.
- **Parameters**: requestId
- **Returns**: Human-readable error explanation and troubleshooting steps

### Metadata Tracing

#### diagnostics_trace_metadata
Trace metadata through edge network for debugging (async).
- **Parameters**: url, pragmaHeaders, getCachedContent, edgeLocationId, spoofEdgeIp
- **Returns**: Request ID for async operation

#### diagnostics_get_metadata_trace
Get results from a metadata trace request.
- **Parameters**: requestId
- **Returns**: Detailed metadata trace through edge network

#### diagnostics_list_metadata_locations
List available metadata tracer locations.
- **Returns**: List of edge locations available for metadata tracing

### Problem Scenarios

#### diagnostics_run_connectivity_test
Run comprehensive connectivity test scenario (async).
- **Parameters**: url, edgeLocationId, clientIp, ipVersion, packetType, port
- **Returns**: Request ID for async operation

#### diagnostics_get_connectivity_result
Get results from a connectivity test request.
- **Parameters**: requestId
- **Returns**: Combined results from GREP, cURL, and MTR tests

#### diagnostics_run_content_test
Run content delivery test scenario (async).
- **Parameters**: url, edgeLocationId, spoofEdgeIp
- **Returns**: Request ID for async operation

#### diagnostics_get_content_result
Get results from a content test request.
- **Parameters**: requestId
- **Returns**: Comprehensive content delivery analysis

### Edge Locations

#### diagnostics_list_edge_locations
List available edge server locations for testing.
- **Returns**: List of edge locations with IDs, regions, countries, and cities

#### diagnostics_locate_ip
Locate an IP address geographically.
- **Parameters**: ip
- **Returns**: Geographic location information for the IP

#### diagnostics_verify_edge_ip
Verify if an IP address is an Akamai edge server.
- **Parameters**: ip
- **Returns**: Verification status and edge server details

## Usage Examples

### Basic Network Diagnostics

```typescript
// Run cURL test
await diagnostics_run_curl({
  url: "https://example.com",
  ipVersion: "IPV4",
  edgeLocationId: "dallas-tx-us"
});

// Perform DNS lookup
await diagnostics_run_dig({
  hostname: "example.com",
  queryType: "A"
});

// Trace network route
await diagnostics_run_mtr({
  destinationDomain: "example.com",
  packetType: "TCP",
  port: 443
});
```

### Log Analysis

```typescript
// Search edge logs
const grepResult = await diagnostics_grep_logs({
  edgeIp: "23.45.67.89",
  cpCode: "12345",
  httpStatusCodes: [404, 500]
});

// Get search results
await diagnostics_get_grep_result({
  requestId: grepResult.data.requestId
});
```

### URL Health Check

```typescript
// Initiate health check
const healthCheck = await diagnostics_check_url_health({
  url: "https://example.com/api/endpoint",
  port: 443
});

// Retrieve results
await diagnostics_get_url_health_result({
  requestId: healthCheck.data.requestId
});
```

### Problem Scenario Testing

```typescript
// Run connectivity test
const connTest = await diagnostics_run_connectivity_test({
  url: "https://example.com",
  ipVersion: "IPV4",
  packetType: "TCP",
  port: 443
});

// Get comprehensive results
await diagnostics_get_connectivity_result({
  requestId: connTest.data.requestId
});
```

## Best Practices

1. **Async Operations**: Many diagnostic tools are asynchronous. Always save the requestId and poll for results.

2. **Edge Location Selection**: Use `diagnostics_list_edge_locations` to find the closest edge location to your users experiencing issues.

3. **Comprehensive Testing**: Use problem scenario tools (connectivity/content tests) for thorough analysis that combines multiple diagnostic techniques.

4. **Log Analysis**: When using GREP, be specific with your search criteria to avoid overwhelming results.

5. **Error Translation**: Always translate error codes to get human-readable explanations and troubleshooting steps.

## Common Workflows

### Troubleshooting Slow Performance
1. Run `diagnostics_run_connectivity_test` from affected edge location
2. Check `diagnostics_run_mtr` results for network latency
3. Analyze `diagnostics_run_estats` for edge server statistics
4. Review `diagnostics_grep_logs` for error patterns

### Debugging 404/500 Errors
1. Use `diagnostics_translate_error` to understand the error
2. Run `diagnostics_trace_metadata` to see request flow
3. Check `diagnostics_grep_logs` for error logs
4. Verify with `diagnostics_run_curl` from edge location

### DNS Resolution Issues
1. Run `diagnostics_run_dig` for DNS lookup
2. Verify edge IPs with `diagnostics_verify_edge_ip`
3. Check multiple locations with `diagnostics_list_edge_locations`
4. Test end-to-end with `diagnostics_run_connectivity_test`

## API Documentation

For detailed API documentation, see:
- [Edge Diagnostics API Reference](https://techdocs.akamai.com/edge-diagnostics/reference)
- [Akamai Pragma Headers](https://techdocs.akamai.com/edge-diagnostics/docs/pragma-headers)

## Notes

- All tools support multi-customer configuration via the `customer` parameter
- Async operations typically complete within 30-60 seconds
- Some tools require specific edge server IPs or CP codes
- Rate limiting applies to prevent overwhelming edge servers