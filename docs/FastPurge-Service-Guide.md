# FastPurge Service Guide

## Overview

The FastPurge service provides enterprise-grade content invalidation capabilities for Akamai CDN, leveraging the FastPurge v3 API with intelligent rate limiting, batching, and queue management.

## Key Features

### 1. **Intelligent Rate Limiting**
- Token bucket algorithm: 100 requests/minute with 50 burst capacity
- Per-customer isolation prevents noisy neighbors
- Automatic request scheduling for optimal throughput

### 2. **Advanced Batching**
- Automatic batching up to 50KB (2,000-5,000 URLs)
- Intelligent batch optimization for network efficiency
- Preserves request atomicity within batches

### 3. **Priority Queue Management**
- Three-tier priority system:
  - High: Cache tags (fastest propagation)
  - Medium: CP codes (moderate scope)
  - Low: Individual URLs (granular control)
- Automatic deduplication within 5-minute windows
- FIFO ordering within priority levels

### 4. **Resilient Error Handling**
- Circuit breaker pattern (5 failures → 60s recovery)
- Exponential backoff for rate limits (1s → 16s)
- RFC 7807 compliant error responses
- Automatic retry with jitter

### 5. **Real-time Status Tracking**
- Operation progress monitoring
- Intelligent polling intervals (5s → 60s)
- Customer-specific dashboards
- 24-hour retention for completed operations

## MCP Tools

### 1. **fastpurge.url.invalidate**
Invalidate content by URL(s).

```json
{
  "customer": "production",
  "network": "production",
  "urls": [
    "https://www.example.com/image.jpg",
    "https://www.example.com/styles.css"
  ]
}
```

### 2. **fastpurge.cpcode.invalidate**
Invalidate all content for CP code(s).

```json
{
  "customer": "production",
  "network": "staging",
  "cpCodes": ["12345", "67890"]
}
```

### 3. **fastpurge.tag.invalidate**
Invalidate content by cache tag(s).

```json
{
  "customer": "production",
  "network": "production",
  "tags": ["homepage", "product-123"]
}
```

### 4. **fastpurge.status.check**
Check purge operation status.

```json
{
  "customer": "production",
  "purgeId": "purge-12345"
}
```

### 5. **fastpurge.queue.status**
View queue status and pending operations.

```json
{
  "customer": "production",
  "includeCompleted": false
}
```

### 6. **fastpurge.estimate**
Estimate purge completion time.

```json
{
  "customer": "production",
  "type": "url",
  "count": 5000
}
```

## Best Practices

### 1. **Use Cache Tags When Possible**
- Fastest propagation (typically 5 seconds)
- Most efficient for related content
- Ideal for dynamic content updates

### 2. **Batch URL Purges**
- Combine related URLs in single requests
- Leverage automatic batching for large sets
- Monitor queue depth for optimal timing

### 3. **Respect Rate Limits**
- Monitor rate limit headers in responses
- Use queue status to plan large purges
- Consider spreading large operations over time

### 4. **Error Recovery**
- Check operation status for failed purges
- Use purge IDs for tracking and debugging
- Monitor circuit breaker status

## Architecture

### Components

1. **FastPurgeService**: Core service with API integration
2. **PurgeQueueManager**: Intelligent queue management
3. **PurgeStatusTracker**: Real-time operation tracking
4. **FastPurgeMonitor**: Production monitoring and alerting

### Data Flow

```
User Request → MCP Tool → Queue Manager → FastPurge Service → Akamai API
                              ↓                    ↓
                        Status Tracker ← ← ← ← Progress Updates
```

## Monitoring

### Key Metrics
- Request rate and burst capacity
- Queue depth by priority
- Success/failure rates
- Average completion times
- Circuit breaker status

### Alert Conditions
- Rate limit exhaustion
- Circuit breaker open
- Queue depth exceeds threshold
- High failure rate
- Slow completion times

## Troubleshooting

### Common Issues

1. **Rate Limit Exceeded**
   - Check current rate with queue status
   - Review burst capacity usage
   - Consider request batching

2. **Circuit Breaker Open**
   - Check recent error patterns
   - Verify API connectivity
   - Review error logs

3. **Slow Purge Completion**
   - Check network selection
   - Verify content exists
   - Review Akamai network status

4. **Queue Backup**
   - Monitor queue depth trends
   - Consider priority adjustments
   - Implement backpressure