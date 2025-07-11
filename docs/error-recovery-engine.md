# Error Recovery Engine

## Overview

The Error Recovery Engine is an intelligent system that analyzes errors and provides automatic recovery strategies. It learns from successful recoveries to improve future suggestions and integrates seamlessly with the existing error handling infrastructure.

## Key Features

### 1. Automatic Recovery Strategies

The engine implements several recovery patterns:

- **Retry with Exponential Backoff**: For rate limiting (429) and transient errors
- **Account Switching**: For permission errors (403) when alternative accounts are available
- **Timeout Increase**: For timeout errors (408, 504)
- **Cache Fallback**: Use cached data when services are unavailable
- **Circuit Breaker Integration**: Prevents cascading failures
- **Validation Correction**: Suggests fixes for validation errors (400)

### 2. Learning Capabilities

The service tracks:
- Success rates by strategy
- Error patterns and successful recovery strategies
- Average recovery times
- Learns which strategies work best for specific error patterns

### 3. MCP Tools

Three tools are provided for error recovery:

#### error_recovery_suggest
Analyzes an error and suggests recovery strategies based on:
- Error type and status code
- Previous successful recoveries
- Current context and state
- Available recovery options

Example:
```json
{
  "error": {
    "message": "Rate limit exceeded",
    "status": 429
  },
  "context": {
    "tool": "property_list",
    "operation": "list",
    "customer": "production"
  }
}
```

#### error_recovery_execute
Executes a recovery strategy with monitoring and tracking:
```json
{
  "strategy": "retry_with_backoff",
  "context": {
    "tool": "property_list",
    "operation": "list"
  },
  "error": {
    "message": "Rate limit exceeded",
    "status": 429
  },
  "originalRequest": {
    "path": "/papi/v1/properties",
    "method": "GET"
  }
}
```

#### error_recovery_analyze
Provides analytics on error recovery patterns:
```json
{
  "filter": {
    "strategy": "retry_with_backoff",
    "minSuccessRate": 0.8,
    "sortBy": "success_rate"
  }
}
```

## Integration Points

### 1. BaseTool Integration

The Error Recovery Engine is automatically integrated into the BaseTool's error handling:
- Errors are analyzed for recovery options
- Recovery suggestions are added to error responses
- Circuit breaker states are tracked per operation

### 2. User Hint Service Integration

Recovery suggestions appear in error responses with:
- Top 3 recovery options
- Confidence levels
- Automatic vs manual execution options
- Clear instructions for using recovery tools

### 3. Circuit Breaker Integration

Each tool operation has its own circuit breaker:
- Prevents repeated failures to failing services
- Automatic recovery after timeout period
- Half-open state for testing recovery

## Recovery Strategies

### 1. Retry with Exponential Backoff
- **When**: Rate limiting (429), transient server errors
- **How**: Retries with increasing delays (1s, 2s, 4s, etc.)
- **Max**: 3 attempts by default, max 30s delay

### 2. Account Switching
- **When**: Permission errors (403)
- **How**: Retry with alternative customer account
- **Requires**: User confirmation and alternative account

### 3. Timeout Increase
- **When**: Timeout errors (408, 504)
- **How**: Retry with extended timeout (2-5 minutes)
- **Fallback**: Reduce batch size if still failing

### 4. Cache Fallback
- **When**: Service unavailable (503), internal errors (500)
- **How**: Return cached data if available
- **Note**: May return stale data

### 5. Circuit Breaker Wait
- **When**: Circuit breaker is open
- **How**: Wait for reset period before retry
- **Duration**: 1 minute default

## Best Practices

1. **Always check recovery suggestions** in error responses
2. **Use automatic recovery** for transient errors
3. **Monitor recovery analytics** to identify patterns
4. **Configure appropriate timeouts** for long-running operations
5. **Implement proper error context** in tools for better recovery

## Example Workflow

1. Tool operation fails with error
2. Error Recovery Engine analyzes the error
3. Recovery suggestions appear in error response
4. User can:
   - Use `error_recovery_suggest` for detailed analysis
   - Use `error_recovery_execute` to run recovery
   - Use `error_recovery_analyze` to view patterns
5. Successful recoveries improve future suggestions

## Performance Considerations

- Recovery analytics are cached for 24 hours
- Circuit breakers prevent excessive retries
- Exponential backoff prevents API flooding
- Learning data persists across sessions

## Future Enhancements

- Custom recovery strategies per domain
- Recovery workflow automation
- Advanced pattern matching
- Multi-step recovery chains
- Recovery success prediction