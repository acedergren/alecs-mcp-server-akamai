# FastPurge Operations Guide

This guide provides comprehensive information for operating and managing the Akamai FastPurge functionality within the MCP server.

## Table of Contents

1. [Overview](#overview)
2. [Service Architecture](#service-architecture)
3. [Configuration](#configuration)
4. [Operations](#operations)
5. [Monitoring and Alerting](#monitoring-and-alerting)
6. [Troubleshooting](#troubleshooting)
7. [Performance Tuning](#performance-tuning)
8. [Security Considerations](#security-considerations)

## Overview

The FastPurge system provides comprehensive content invalidation capabilities for Akamai CDN customers through:

- **FastPurgeService**: Core API integration with Akamai's FastPurge v3 API
- **PurgeQueueManager**: Queue management with customer isolation and priority handling
- **PurgeStatusTracker**: Real-time operation tracking and progress monitoring
- **FastPurgeMonitor**: Production monitoring with alerting and metrics collection

### Key Features

- Multi-customer support with complete isolation
- Priority-based queue processing
- Automatic retry logic with exponential backoff
- Real-time status tracking and progress monitoring
- Comprehensive monitoring and alerting
- Rate limiting and throttling protection
- Batch processing for high-volume operations

## Service Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   MCP Client    │────│  FastPurge Tools │────│  Queue Manager  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                        │
                                │                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│    Monitor      │────│ FastPurge Service│────│ Status Tracker  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌──────────────────┐
│   Alerting      │    │   Akamai API     │
└─────────────────┘    └──────────────────┘
```

### Component Responsibilities

- **FastPurge Tools**: MCP protocol interface and parameter validation
- **Queue Manager**: Request queuing, prioritization, and customer isolation
- **FastPurge Service**: Akamai API integration and rate limiting
- **Status Tracker**: Operation lifecycle management and progress tracking
- **Monitor**: Health monitoring, metrics collection, and alerting

## Configuration

### Environment Variables

```bash
# Required: Akamai EdgeGrid credentials
AKAMAI_CLIENT_TOKEN=your_client_token
AKAMAI_CLIENT_SECRET=your_client_secret
AKAMAI_ACCESS_TOKEN=your_access_token
AKAMAI_HOST=your_akamai_host

# Optional: FastPurge configuration
FASTPURGE_RATE_LIMIT=100          # Requests per minute
FASTPURGE_BATCH_SIZE=100          # Items per batch request
FASTPURGE_RETRY_ATTEMPTS=3        # Maximum retry attempts
FASTPURGE_QUEUE_SIZE=10000        # Maximum queue size per customer
FASTPURGE_MONITOR_INTERVAL=30000  # Monitoring interval in ms

# Optional: Alerting configuration
SLACK_WEBHOOK_URL=your_slack_webhook
DATADOG_API_KEY=your_datadog_key
NEW_RELIC_LICENSE_KEY=your_newrelic_key
```

### .edgerc Configuration

Ensure your `.edgerc` file contains proper credentials for each customer:

```ini
[default]
client_token = your_client_token
client_secret = your_client_secret
access_token = your_access_token
host = your_akamai_host

[customer1]
client_token = customer1_client_token
client_secret = customer1_client_secret
access_token = customer1_access_token
host = customer1_akamai_host
account_switch_key = customer1_account_key

[customer2]
client_token = customer2_client_token
client_secret = customer2_client_secret
access_token = customer2_access_token
host = customer2_akamai_host
account_switch_key = customer2_account_key
```

## Operations

### Starting the FastPurge System

```typescript
import { FastPurgeService } from './services/FastPurgeService';
import { PurgeQueueManager } from './services/PurgeQueueManager';
import { PurgeStatusTracker } from './services/PurgeStatusTracker';
import { FastPurgeMonitor } from './monitoring/FastPurgeMonitor';

// Initialize services
const fastPurgeService = new FastPurgeService(auth, 'default');
const queueManager = new PurgeQueueManager();
const statusTracker = new PurgeStatusTracker();
const monitor = new FastPurgeMonitor(fastPurgeService, queueManager, statusTracker);

// Configure integrations
queueManager.setFastPurgeService(fastPurgeService);
statusTracker.setFastPurgeService(fastPurgeService);

// Start processing
queueManager.startProcessing();
statusTracker.startTracking(30000); // 30 second interval
await monitor.startMonitoring(30000); // 30 second interval

console.log('FastPurge system started successfully');
```

### Basic Operations

#### URL Purging

```bash
# Single URL
curl -X POST "http://localhost:3000/mcp/tools/fastpurge_purge_urls" \
  -H "Content-Type: application/json" \
  -d '{
    "urls": ["https://example.com/page1"],
    "network": "production",
    "customer": "customer1"
  }'

# Multiple URLs
curl -X POST "http://localhost:3000/mcp/tools/fastpurge_purge_urls" \
  -H "Content-Type: application/json" \
  -d '{
    "urls": [
      "https://example.com/page1",
      "https://example.com/page2",
      "https://example.com/page3"
    ],
    "network": "staging",
    "customer": "customer1"
  }'
```

#### Cache Tag Purging

```bash
curl -X POST "http://localhost:3000/mcp/tools/fastpurge_purge_tags" \
  -H "Content-Type: application/json" \
  -d '{
    "tags": ["product-123", "category-electronics"],
    "network": "production",
    "customer": "customer1"
  }'
```

#### CP Code Purging

```bash
curl -X POST "http://localhost:3000/mcp/tools/fastpurge_purge_cpcodes" \
  -H "Content-Type: application/json" \
  -d '{
    "cpCodes": [12345, 67890],
    "network": "production",
    "customer": "customer1"
  }'
```

### Checking Status

#### Individual Purge Status

```bash
curl -X GET "http://localhost:3000/mcp/tools/fastpurge_get_status" \
  -H "Content-Type: application/json" \
  -d '{
    "purgeId": "12345678-1234-1234-1234-123456789012",
    "customer": "customer1"
  }'
```

#### Queue Status

```bash
curl -X GET "http://localhost:3000/mcp/tools/fastpurge_get_queue_status" \
  -H "Content-Type: application/json" \
  -d '{
    "customer": "customer1"
  }'
```

#### List Customer Requests

```bash
# All requests
curl -X GET "http://localhost:3000/mcp/tools/fastpurge_list_requests" \
  -H "Content-Type: application/json" \
  -d '{
    "customer": "customer1"
  }'

# Filter by status
curl -X GET "http://localhost:3000/mcp/tools/fastpurge_list_requests" \
  -H "Content-Type: application/json" \
  -d '{
    "customer": "customer1",
    "status": "in-progress"
  }'
```

### Bulk Operations

```bash
curl -X POST "http://localhost:3000/mcp/tools/fastpurge_bulk_purge" \
  -H "Content-Type: application/json" \
  -d '{
    "operations": [
      {
        "type": "url",
        "items": ["https://example.com/page1", "https://example.com/page2"],
        "network": "production"
      },
      {
        "type": "tag",
        "items": ["product-123", "category-electronics"],
        "network": "production"
      },
      {
        "type": "cpcode",
        "items": [12345, 67890],
        "network": "staging"
      }
    ],
    "customer": "customer1"
  }'
```

## Monitoring and Alerting

### Health Checks

The system provides several health check endpoints:

```bash
# Overall system health
curl -X GET "http://localhost:3000/health/fastpurge"

# Queue health
curl -X GET "http://localhost:3000/health/fastpurge/queue"

# API health
curl -X GET "http://localhost:3000/health/fastpurge/api"

# Monitor health
curl -X GET "http://localhost:3000/health/fastpurge/monitor"
```

### Metrics

Key metrics collected by the monitor:

#### Queue Metrics
- `queue.pending`: Number of pending requests
- `queue.processing`: Number of requests being processed
- `queue.completed`: Number of completed requests
- `queue.failed`: Number of failed requests
- `queue.processing_rate`: Requests processed per minute

#### API Metrics
- `api.success_rate`: Percentage of successful API calls
- `api.error_rate`: Percentage of failed API calls
- `api.average_response_time`: Average API response time in ms
- `api.response_time_p95`: 95th percentile response time

#### Performance Metrics
- `performance.average_completion_time`: Average purge completion time
- `performance.completion_time_p95`: 95th percentile completion time
- `performance.throughput`: Operations completed per minute

### Alerts

The system generates alerts for various conditions:

#### Critical Alerts
- **API Failure**: When API success rate drops below 95%
- **High Error Rate**: When error rate exceeds 10%
- **Service Unavailable**: When API becomes completely unavailable

#### Warning Alerts
- **Queue Backlog**: When queue size exceeds 100 pending requests
- **Slow Purge**: When operations take longer than 5 minutes
- **Low Success Rate**: When success rate drops below 90%
- **High Response Time**: When API response time exceeds 10 seconds

### Prometheus Integration

Metrics are exported in Prometheus format at `/metrics`:

```
# HELP fastpurge_queue_pending Number of pending purge requests
# TYPE fastpurge_queue_pending gauge
fastpurge_queue_pending{customer="customer1"} 5

# HELP fastpurge_api_success_rate API success rate percentage
# TYPE fastpurge_api_success_rate gauge
fastpurge_api_success_rate 0.98

# HELP fastpurge_completion_time_seconds Average completion time in seconds
# TYPE fastpurge_completion_time_seconds gauge
fastpurge_completion_time_seconds 45.2
```

### Grafana Dashboard

A sample Grafana dashboard configuration:

```json
{
  "dashboard": {
    "title": "FastPurge Monitoring",
    "panels": [
      {
        "title": "Queue Status",
        "type": "stat",
        "targets": [
          {"expr": "fastpurge_queue_pending"},
          {"expr": "fastpurge_queue_processing"},
          {"expr": "fastpurge_queue_completed"}
        ]
      },
      {
        "title": "API Performance",
        "type": "graph",
        "targets": [
          {"expr": "fastpurge_api_success_rate"},
          {"expr": "fastpurge_api_average_response_time"}
        ]
      },
      {
        "title": "Throughput",
        "type": "graph",
        "targets": [
          {"expr": "rate(fastpurge_queue_completed[5m])"}
        ]
      }
    ]
  }
}
```

## Troubleshooting

### Common Issues

#### High Queue Backlog

**Symptoms:**
- Queue pending count continuously growing
- Slow processing times
- Queue backlog alerts

**Diagnosis:**
```bash
# Check queue status
curl -X GET "http://localhost:3000/health/fastpurge/queue"

# Check processing rate
curl -X GET "http://localhost:3000/metrics" | grep processing_rate
```

**Solutions:**
1. Increase processing concurrency:
   ```typescript
   queueManager.updateConfig({
     maxConcurrentRequests: 10  // Increase from default 5
   });
   ```

2. Check API rate limits:
   ```bash
   # Monitor API errors
   curl -X GET "http://localhost:3000/metrics" | grep api_error_rate
   ```

3. Review customer request patterns:
   ```bash
   # List recent requests
   curl -X GET "http://localhost:3000/mcp/tools/fastpurge_list_requests" \
     -d '{"customer": "customer1"}'
   ```

#### API Authentication Failures

**Symptoms:**
- 401/403 errors in logs
- API error rate above normal
- Authentication failure alerts

**Diagnosis:**
```bash
# Check API health
curl -X GET "http://localhost:3000/health/fastpurge/api"

# Review credentials
cat ~/.edgerc
```

**Solutions:**
1. Verify EdgeGrid credentials:
   ```bash
   # Test API connectivity
   curl -H "Authorization: EG1-HMAC-SHA256 ..." \
     "https://your-host.luna.akamaiapis.net/ccu/v3/delete/status"
   ```

2. Check account switch keys:
   ```ini
   [customer1]
   account_switch_key = correct_account_key
   ```

3. Rotate credentials if compromised

#### Slow Purge Operations

**Symptoms:**
- Operations taking longer than 5 minutes
- Slow purge alerts
- High completion times

**Diagnosis:**
```bash
# Check completion times
curl -X GET "http://localhost:3000/metrics" | grep completion_time

# List in-progress operations
curl -X GET "http://localhost:3000/mcp/tools/fastpurge_list_requests" \
  -d '{"customer": "customer1", "status": "in-progress"}'
```

**Solutions:**
1. Check Akamai queue status:
   ```bash
   curl -X GET "http://localhost:3000/mcp/tools/fastpurge_get_queue_status"
   ```

2. Review operation types and sizes:
   - Large URL lists may take longer
   - CP code purges are typically slower than URL/tag purges

3. Monitor for network issues:
   ```bash
   # Check API response times
   curl -X GET "http://localhost:3000/metrics" | grep response_time
   ```

### Debug Mode

Enable debug logging for detailed troubleshooting:

```bash
export LOG_LEVEL=debug
export FASTPURGE_DEBUG=true

# Start server with debug logging
npm run dev
```

Debug logs include:
- Request/response details
- Queue processing events
- Status tracking updates
- API call timing
- Error stack traces

### Log Analysis

Key log patterns to monitor:

```bash
# API errors
grep "API Error" logs/fastpurge.log

# Queue processing issues
grep "Queue.*failed" logs/fastpurge.log

# Rate limiting
grep "Rate limit" logs/fastpurge.log

# Customer isolation issues
grep "Customer.*isolation" logs/fastpurge.log
```

## Performance Tuning

### Queue Configuration

Optimize queue performance based on your workload:

```typescript
// High-volume, low-latency
queueManager.updateConfig({
  maxConcurrentRequests: 15,
  processingInterval: 1000,    // 1 second
  retryDelay: 2000,           // 2 seconds
  maxRetries: 2
});

// Batch processing, high-throughput
queueManager.updateConfig({
  maxConcurrentRequests: 5,
  processingInterval: 5000,    // 5 seconds
  batchSize: 100,             // Process in larger batches
  maxRetries: 5
});

// Conservative, high-reliability
queueManager.updateConfig({
  maxConcurrentRequests: 3,
  processingInterval: 10000,   // 10 seconds
  retryDelay: 5000,           // 5 seconds
  maxRetries: 10
});
```

### Rate Limiting

Adjust rate limiting based on your Akamai contract:

```typescript
// Standard contract (100 requests/minute)
fastPurgeService.updateRateLimit({
  requestsPerMinute: 100,
  burstLimit: 10
});

// Premium contract (200 requests/minute)
fastPurgeService.updateRateLimit({
  requestsPerMinute: 200,
  burstLimit: 20
});

// Enterprise contract (500 requests/minute)
fastPurgeService.updateRateLimit({
  requestsPerMinute: 500,
  burstLimit: 50
});
```

### Memory Management

For high-volume operations:

```typescript
// Limit historical data retention
statusTracker.updateConfig({
  maxOperationsPerCustomer: 1000,
  dataRetentionDays: 7,
  cleanupInterval: 3600000  // 1 hour
});

// Configure garbage collection
queueManager.updateConfig({
  maxCompletedRequests: 500,
  cleanupCompletedAfter: 24 * 60 * 60 * 1000  // 24 hours
});
```

### Network Optimization

For better API performance:

```typescript
// Connection pooling
fastPurgeService.updateConfig({
  maxSockets: 10,
  keepAlive: true,
  timeout: 30000  // 30 seconds
});

// Request compression
fastPurgeService.updateConfig({
  compression: true,
  compressionLevel: 6
});
```

## Security Considerations

### Credential Management

1. **Store credentials securely:**
   ```bash
   # Use environment variables or secure vaults
   export AKAMAI_CLIENT_TOKEN=$(vault kv get -field=token secret/akamai)
   ```

2. **Rotate credentials regularly:**
   ```bash
   # Script for credential rotation
   ./scripts/rotate-akamai-credentials.sh customer1
   ```

3. **Use least-privilege access:**
   - Only grant FastPurge permissions
   - Separate credentials per customer
   - Monitor credential usage

### Access Control

1. **Customer isolation:**
   - Verify customer parameter in all requests
   - Prevent cross-customer access
   - Audit customer operations

2. **Rate limiting per customer:**
   ```typescript
   queueManager.setCustomerRateLimit('customer1', {
     requestsPerMinute: 50,
     maxQueueSize: 1000
   });
   ```

3. **Request validation:**
   - Validate all URLs and domains
   - Check purge permissions
   - Log all operations for audit

### Network Security

1. **API endpoint security:**
   - Use HTTPS only
   - Verify SSL certificates
   - Implement request signing

2. **Internal communication:**
   - Encrypt inter-service communication
   - Use secure service discovery
   - Implement mutual TLS

3. **Monitoring security:**
   - Monitor for suspicious patterns
   - Alert on unusual activity
   - Implement request throttling

### Compliance

1. **Audit logging:**
   ```typescript
   // Log all purge operations
   auditLogger.log({
     customer: 'customer1',
     operation: 'url_purge',
     urls: ['https://example.com/page'],
     user: 'api_user',
     timestamp: new Date(),
     result: 'success'
   });
   ```

2. **Data retention:**
   - Follow customer data retention policies
   - Implement secure data deletion
   - Maintain compliance documentation

3. **Privacy protection:**
   - Anonymize sensitive URLs in logs
   - Protect customer metadata
   - Implement data minimization

## Appendix

### API Endpoints Reference

#### FastPurge v3 API Endpoints

```
POST /ccu/v3/delete/url/{network}
POST /ccu/v3/delete/tag/{network}
POST /ccu/v3/delete/cpcode/{network}
GET /ccu/v3/delete/status/{purgeId}
GET /ccu/v3/delete/url/{network}/queue
```

#### MCP Tool Mappings

| MCP Tool | API Endpoint | Description |
|----------|--------------|-------------|
| `fastpurge_purge_urls` | `POST /ccu/v3/delete/url/{network}` | Purge by URL |
| `fastpurge_purge_tags` | `POST /ccu/v3/delete/tag/{network}` | Purge by cache tag |
| `fastpurge_purge_cpcodes` | `POST /ccu/v3/delete/cpcode/{network}` | Purge by CP code |
| `fastpurge_get_status` | `GET /ccu/v3/delete/status/{purgeId}` | Get purge status |
| `fastpurge_get_queue_status` | `GET /ccu/v3/delete/url/{network}/queue` | Get queue status |

### Rate Limits by Contract Type

| Contract Type | Requests/Minute | Burst Limit | Notes |
|---------------|-----------------|-------------|-------|
| Standard | 100 | 10 | Basic Akamai contract |
| Premium | 200 | 20 | Enhanced SLA contract |
| Enterprise | 500 | 50 | Custom enterprise agreement |

### Error Codes Reference

| Error Code | Description | Resolution |
|------------|-------------|------------|
| 400 | Bad Request | Check request format and parameters |
| 401 | Unauthorized | Verify EdgeGrid credentials |
| 403 | Forbidden | Check account permissions |
| 404 | Not Found | Verify purge ID or endpoint |
| 429 | Rate Limited | Reduce request frequency |
| 500 | Server Error | Retry with exponential backoff |

### Performance Benchmarks

Expected performance metrics for different operation types:

| Operation Type | Typical Duration | Max Duration | Throughput |
|----------------|------------------|--------------|------------|
| URL Purge | 30-60 seconds | 5 minutes | 100+ URLs/minute |
| Tag Purge | 45-90 seconds | 8 minutes | 50+ tags/minute |
| CP Code Purge | 2-5 minutes | 15 minutes | 10+ codes/minute |

### Maintenance Procedures

#### Weekly Maintenance

```bash
# Review queue performance
curl -X GET "http://localhost:3000/metrics" | grep queue

# Check error rates
curl -X GET "http://localhost:3000/metrics" | grep error_rate

# Cleanup old operations
curl -X POST "http://localhost:3000/admin/cleanup" \
  -d '{"retentionDays": 7}'
```

#### Monthly Maintenance

```bash
# Generate comprehensive report
curl -X GET "http://localhost:3000/admin/report" \
  -d '{"period": "monthly"}' > monthly-report.json

# Review customer usage patterns
curl -X GET "http://localhost:3000/admin/analytics" \
  -d '{"period": "monthly"}' > usage-analytics.json

# Update rate limits if needed
curl -X POST "http://localhost:3000/admin/rate-limits" \
  -d '{"customer": "customer1", "requestsPerMinute": 150}'
```

### Support Contacts

For additional support and escalation:

- **Technical Issues**: Development Team
- **API Limits**: Akamai Support
- **Performance Issues**: Operations Team
- **Security Concerns**: Security Team

---

This operations guide provides comprehensive information for successfully deploying, operating, and maintaining the FastPurge system in production environments. For additional support, refer to the troubleshooting section or contact the development team.