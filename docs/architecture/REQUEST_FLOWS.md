# ALECS Request Flow Documentation

## Overview

This document details the various request flows through the ALECS MCP Server, from client request to Akamai API response. Understanding these flows is crucial for debugging, performance optimization, and system maintenance.

## Table of Contents

1. [Standard Request Flow](#standard-request-flow)
2. [Cached Request Flow](#cached-request-flow)
3. [Coalesced Request Flow](#coalesced-request-flow)
4. [Streaming Request Flow](#streaming-request-flow)
5. [Error Handling Flow](#error-handling-flow)
6. [Multi-Customer Request Flow](#multi-customer-request-flow)
7. [Bulk Operation Flow](#bulk-operation-flow)
8. [Activation Workflow](#activation-workflow)

## Standard Request Flow

The standard flow represents a typical request without caching or coalescing.

```mermaid
sequenceDiagram
    participant C as Client
    participant T as Transport
    participant S as ALECSCore
    participant M as Middleware
    participant V as Validator
    participant D as Domain
    participant E as EdgeGrid
    participant A as Akamai API
    
    C->>T: MCP Request
    Note over T: Parse JSON-RPC
    T->>S: Route Request
    
    S->>M: Process Middleware
    Note over M: Auth, Logging, Metrics
    
    M->>V: Validate Input
    Note over V: Zod Schema Validation
    
    alt Validation Fails
        V-->>C: Error Response
    else Validation Passes
        V->>D: Execute Operation
        
        D->>E: Prepare Request
        Note over E: Sign with EdgeGrid
        
        E->>A: HTTPS Request
        A-->>E: API Response
        
        E-->>D: Parse Response
        D-->>V: Validate Output
        
        V-->>S: Format Response
        S-->>T: MCP Response
        T-->>C: JSON-RPC Response
    end
```

### Detailed Steps

1. **Client Request**: Client sends MCP request via chosen transport
2. **Transport Parsing**: Transport layer parses JSON-RPC format
3. **Request Routing**: ALECSCore identifies target tool and handler
4. **Middleware Pipeline**: 
   - Authentication check
   - Request logging
   - Metrics collection
   - Rate limiting
5. **Input Validation**: Zod schemas validate all parameters
6. **Domain Execution**: Business logic processes request
7. **API Preparation**: EdgeGrid authentication signs request
8. **Akamai API Call**: HTTPS request to Akamai endpoint
9. **Response Processing**: Parse and validate API response
10. **Response Formatting**: Convert to MCP format
11. **Client Response**: Return formatted result

## Cached Request Flow

Demonstrates how the Smart Cache intercepts repeated requests.

```mermaid
sequenceDiagram
    participant C as Client
    participant S as ALECSCore
    participant SC as Smart Cache
    participant D as Domain
    participant A as Akamai API
    
    C->>S: Request (property.list)
    S->>SC: Check Cache
    
    alt Cache Hit
        SC-->>C: Cached Response (5ms)
    else Cache Miss
        SC->>D: Execute Request
        D->>A: API Call
        A-->>D: Response
        D-->>SC: Store in Cache
        SC-->>C: Fresh Response (500ms)
    end
    
    Note over SC: TTL: 5 minutes
    
    C->>S: Same Request (within TTL)
    S->>SC: Check Cache
    SC-->>C: Cached Response (5ms)
```

### Cache Key Generation

```typescript
function generateCacheKey(request: MCPRequest): string {
    return crypto.createHash('sha256')
        .update(JSON.stringify({
            method: request.method,
            params: request.params,
            customer: request.context.customer,
            account: request.context.accountSwitchKey
        }))
        .digest('hex');
}
```

### Cache Invalidation Triggers

- CREATE operations invalidate LIST caches
- UPDATE operations invalidate GET and LIST caches
- DELETE operations invalidate all related caches
- Manual invalidation via cache.invalidate(pattern)
- TTL expiration (default: 5 minutes)

## Coalesced Request Flow

Shows how identical concurrent requests are deduplicated.

```mermaid
sequenceDiagram
    participant C1 as Client 1
    participant C2 as Client 2
    participant C3 as Client 3
    participant RC as Request Coalescer
    participant D as Domain
    participant A as Akamai API
    
    par Concurrent Requests
        C1->>RC: property.get(123)
        C2->>RC: property.get(123)
        C3->>RC: property.get(123)
    end
    
    Note over RC: Detect duplicates
    RC->>D: Single Request
    D->>A: One API Call
    A-->>D: Response
    D-->>RC: Single Response
    
    par Broadcast Response
        RC-->>C1: Response
        RC-->>C2: Response
        RC-->>C3: Response
    end
```

### Coalescing Window

- Default: 100ms window for request aggregation
- Configurable per operation type
- Automatic retry for failed coalesced requests

## Streaming Request Flow

For large responses that benefit from streaming.

```mermaid
sequenceDiagram
    participant C as Client
    participant T as Transport
    participant S as ALECSCore
    participant SR as Stream Handler
    participant A as Akamai API
    
    C->>T: Request Large Dataset
    T->>S: Route to Handler
    S->>SR: Initialize Stream
    
    SR->>A: API Request
    Note over A: Large Response
    
    loop Streaming Chunks
        A-->>SR: Data Chunk
        SR-->>T: Process & Forward
        T-->>C: Stream Chunk
    end
    
    A-->>SR: End Stream
    SR-->>C: Complete Response
```

### Streaming Benefits

- 80% memory reduction for large responses
- Progressive rendering in client
- Timeout prevention for long operations
- Backpressure handling

## Error Handling Flow

Comprehensive error handling with recovery strategies.

```mermaid
flowchart TD
    A[Request] --> B{Validation}
    B -->|Fail| C[Validation Error]
    B -->|Pass| D{Authentication}
    D -->|Fail| E[Auth Error]
    D -->|Pass| F{Rate Limit}
    F -->|Exceeded| G[Rate Limit Error]
    F -->|OK| H{API Call}
    H -->|Network Error| I[Retry Logic]
    I -->|Max Retries| J[Network Error]
    I -->|Success| K[Process Response]
    H -->|4xx Error| L[Client Error]
    H -->|5xx Error| M[Server Error]
    H -->|Success| K
    K --> N{Response Valid}
    N -->|Invalid| O[Parse Error]
    N -->|Valid| P[Success Response]
    
    C --> Q[RFC 7807 Format]
    E --> Q
    G --> Q
    J --> Q
    L --> Q
    M --> Q
    O --> Q
    Q --> R[Error Response]
```

### Error Response Format (RFC 7807)

```json
{
    "type": "https://errors.akamai.com/property/not-found",
    "title": "Property Not Found",
    "status": 404,
    "detail": "Property 'prp_123456' not found in contract 'ctr_C-1234'",
    "instance": "/property/get/prp_123456",
    "propertyId": "prp_123456",
    "contractId": "ctr_C-1234",
    "suggestion": "Verify the property ID or check contract access"
}
```

## Multi-Customer Request Flow

Demonstrates account switching and customer isolation.

```mermaid
sequenceDiagram
    participant C as Client
    participant S as ALECSCore
    participant CM as Config Manager
    participant EG as EdgeGrid
    participant A as Akamai API
    
    C->>S: Request (customer: "production")
    S->>CM: Load Customer Config
    
    alt Config Exists
        CM->>EG: Get Credentials
        Note over EG: .edgerc[production]
        
        alt Has Account Switch Key
            EG->>A: Request + Switch Header
            Note over A: Switch to Account X
        else Direct Access
            EG->>A: Direct Request
        end
        
        A-->>C: Customer-Specific Response
    else Config Missing
        CM-->>C: Customer Not Found Error
    end
```

### Customer Configuration

```typescript
interface CustomerConfig {
    name: string;
    edgercSection: string;
    accountSwitchKey?: string;
    rateLimit?: {
        requests: number;
        window: number;
    };
    cache?: {
        ttl: number;
        maxSize: number;
    };
}
```

## Bulk Operation Flow

Efficient handling of bulk operations with progress tracking.

```mermaid
sequenceDiagram
    participant C as Client
    participant S as ALECSCore
    participant BO as Bulk Orchestrator
    participant WQ as Work Queue
    participant W1 as Worker 1
    participant W2 as Worker 2
    participant A as Akamai API
    
    C->>S: Bulk Create (100 items)
    S->>BO: Initialize Bulk Op
    BO->>WQ: Queue Items
    
    Note over WQ: Chunking: 10 items/batch
    
    par Parallel Processing
        WQ->>W1: Batch 1-10
        WQ->>W2: Batch 11-20
        
        W1->>A: Create Items 1-10
        W2->>A: Create Items 11-20
        
        A-->>W1: Results 1-10
        A-->>W2: Results 11-20
    end
    
    W1-->>BO: Batch Complete
    W2-->>BO: Batch Complete
    
    BO-->>C: Progress Update (20%)
    
    Note over BO: Continue until complete
    
    BO-->>C: Final Results
```

### Bulk Operation Optimizations

- Parallel processing with configurable concurrency
- Automatic retry for failed items
- Progress reporting via callbacks
- Partial success handling
- Memory-efficient streaming for results

## Activation Workflow

Complex multi-step workflow for property activation.

```mermaid
stateDiagram-v2
    [*] --> Validate
    Validate --> CreateVersion: Valid
    Validate --> [*]: Invalid
    
    CreateVersion --> UpdateRules
    UpdateRules --> ValidateRules
    
    ValidateRules --> AddHostnames: Valid
    ValidateRules --> UpdateRules: Invalid
    
    AddHostnames --> ActivateStaging
    ActivateStaging --> WaitForStaging
    
    WaitForStaging --> TestStaging: Active
    WaitForStaging --> WaitForStaging: Pending
    
    TestStaging --> ActivateProduction: Pass
    TestStaging --> Rollback: Fail
    
    ActivateProduction --> WaitForProduction
    WaitForProduction --> [*]: Active
    WaitForProduction --> WaitForProduction: Pending
    
    Rollback --> [*]
```

### Activation Status Polling

```typescript
async function pollActivationStatus(
    activationId: string,
    network: 'STAGING' | 'PRODUCTION'
): Promise<ActivationStatus> {
    const maxAttempts = 60; // 30 minutes
    const pollInterval = 30000; // 30 seconds
    
    for (let i = 0; i < maxAttempts; i++) {
        const status = await checkActivation(activationId, network);
        
        if (status === 'ACTIVE') {
            return status;
        }
        
        if (status === 'FAILED' || status === 'ABORTED') {
            throw new ActivationError(status);
        }
        
        await sleep(pollInterval);
    }
    
    throw new TimeoutError('Activation timeout');
}
```

## Performance Metrics

### Request Flow Performance

| Flow Type | Average Response Time | P95 Response Time | API Calls Saved |
|-----------|----------------------|-------------------|-----------------|
| Cached | 5ms | 10ms | 100% |
| Coalesced | 500ms | 800ms | 66-75% |
| Standard | 500ms | 1200ms | 0% |
| Streaming | 100ms (first byte) | 200ms | 0% |
| Bulk (100) | 5000ms | 8000ms | 90% |

### Optimization Impact

1. **Cache Hit Ratio**: 85-90% for read operations
2. **Coalescing Rate**: 30-40% reduction in API calls
3. **Streaming Memory**: 80% reduction for large datasets
4. **Bulk Efficiency**: 10x faster than individual operations

## Monitoring and Observability

### Request Tracing

Each request is assigned a unique trace ID:

```typescript
interface RequestTrace {
    traceId: string;
    spanId: string;
    parentSpanId?: string;
    startTime: number;
    endTime?: number;
    attributes: {
        'mcp.tool': string;
        'mcp.customer': string;
        'akamai.endpoint': string;
        'cache.hit': boolean;
        'coalesce.hit': boolean;
    };
}
```

### Metrics Collection

- Request count by tool
- Response time histograms
- Cache hit/miss ratios
- API error rates
- Coalescing effectiveness

## Best Practices

### For Optimal Performance

1. **Use Batch Operations**: Prefer bulk endpoints over loops
2. **Leverage Caching**: Design cache-friendly request patterns
3. **Enable Streaming**: For large dataset operations
4. **Coalesce Requests**: Group similar operations together

### For Reliability

1. **Handle Partial Failures**: Bulk operations may partially succeed
2. **Implement Retries**: Use exponential backoff
3. **Monitor Rate Limits**: Stay within customer quotas
4. **Validate Early**: Catch errors before API calls

### For Debugging

1. **Use Trace IDs**: Correlate logs across services
2. **Check Cache Headers**: Verify cache behavior
3. **Monitor Coalescing**: Ensure proper deduplication
4. **Review Error Details**: RFC 7807 provides rich context

## Conclusion

Understanding these request flows is essential for:
- Debugging performance issues
- Optimizing API usage
- Implementing new features
- Troubleshooting customer problems

The ALECS architecture's sophisticated request handling enables enterprise-scale operations while maintaining excellent performance and reliability.