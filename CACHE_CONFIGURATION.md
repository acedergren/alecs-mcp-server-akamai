# Cache Configuration Guide

## Overview

The ALECS MCP Server uses **SmartCache** by default - a zero-dependency, in-memory caching solution that works out of the box without any external services.

> **⚠️ DEPRECATION NOTICE**: External cache support (Redis/Valkey) is deprecated and will be removed in v2.0.0. SmartCache provides excellent performance for most use cases without external dependencies.

## Cache Types

### 1. SmartCache (Default)
- **Zero external dependencies**
- **Works immediately** without configuration
- **In-memory LRU cache** with automatic eviction
- **Perfect for simple deployments**

### 2. External Cache (Deprecated)
- **⚠️ DEPRECATED**: Will be removed in v2.0.0
- Only use if you absolutely need distributed caching
- Consider implementing a custom cache adapter instead
- Requires manual installation: `npm install ioredis`

## Configuration

### Environment Variables

```bash
# Cache type selection
CACHE_TYPE=smart        # Use SmartCache (default)
CACHE_TYPE=external     # Use external cache (Redis-compatible)
CACHE_TYPE=auto         # Auto-detect (default behavior)

# SmartCache configuration
CACHE_MAX_SIZE=10000           # Maximum number of entries (default: 10000)
CACHE_MAX_MEMORY_MB=100        # Maximum memory usage in MB (default: 100)
CACHE_DEFAULT_TTL=300          # Default TTL in seconds (default: 300)
CACHE_EVICTION_POLICY=LRU      # Eviction policy: LRU, LFU, FIFO (default: LRU)
CACHE_METRICS=true             # Enable metrics collection (default: true)

# Performance optimizations (NEW!)
CACHE_COMPRESSION=true         # Enable compression for large values (default: true)
CACHE_COMPRESSION_THRESHOLD=10240  # Compress values > this size in bytes (default: 10KB)
CACHE_PERSISTENCE=false        # Enable cache persistence to disk (default: false)
CACHE_PERSISTENCE_PATH=.cache/smart-cache.json  # Where to save cache
CACHE_ADAPTIVE_TTL=true        # Adjust TTL based on update patterns (default: true)
CACHE_REQUEST_COALESCING=true  # Merge duplicate requests (default: true)

# External cache configuration (Redis-compatible: Redis, Valkey, KeyDB, etc.)
CACHE_HOST=localhost          # Cache server host
CACHE_PORT=6379              # Cache server port
CACHE_PASSWORD=              # Cache server password (optional)
CACHE_KEY_PREFIX=akamai:      # Key prefix for namespacing

# Note: ioredis must be manually installed for external cache:
# npm install ioredis

# Debug mode
DEBUG=true                     # Enable cache debug logging
```

## Usage Examples

### 1. Simple Deployment (Default)
No configuration needed! SmartCache works out of the box:

```bash
npm start
```

### 2. Development with Debug Logging
```bash
DEBUG=true npm start
```

### 3. Production with Maximum Performance
```bash
CACHE_MAX_SIZE=50000 \
CACHE_MAX_MEMORY_MB=500 \
CACHE_EVICTION_POLICY=LFU \
CACHE_COMPRESSION=true \
CACHE_PERSISTENCE=true \
CACHE_ADAPTIVE_TTL=true \
CACHE_REQUEST_COALESCING=true \
npm start
```

### 4. Using External Cache (Redis-compatible)
```bash
CACHE_TYPE=external \
CACHE_HOST=redis.example.com \
CACHE_PASSWORD=secretpassword \
npm start
```

## Cache Behavior

### TTL (Time To Live) Settings

| Data Type | TTL | Description |
|-----------|-----|-------------|
| Properties List | 5 minutes | Frequently accessed, changes occasionally |
| Property Details | 15 minutes | More stable than lists |
| Hostnames | 30 minutes | Rarely changes |
| Contracts | 24 hours | Very stable |
| Groups | 24 hours | Very stable |
| Search Results | 5 minutes | Dynamic data |

### Eviction Policies

- **LRU (Least Recently Used)**: Default. Evicts least recently accessed items
- **LFU (Least Frequently Used)**: Evicts items with lowest access count
- **FIFO (First In First Out)**: Evicts oldest items first

### Memory Management

SmartCache automatically manages memory:
- Monitors memory usage
- Evicts entries when approaching limit
- Estimates entry sizes
- Cleans up expired entries every minute

## Performance Features

### 🚀 Request Coalescing (NEW!)
- **Prevents duplicate API calls** when multiple requests arrive for the same key
- Automatically merges concurrent requests
- Massive performance boost under load

### 📦 Compression (NEW!)
- **10x more effective cache** by compressing large values
- Automatic compression for values > 10KB
- Only stores compressed if 20%+ space savings
- Transparent decompression on retrieval

### 🧠 Adaptive TTL (NEW!)
- **Learns from your access patterns**
- Shortens TTL for frequently updated data
- Extends TTL for stable data
- Reduces cache misses automatically

### 💾 Persistence (NEW!)
- **Survives server restarts**
- Saves cache state to disk periodically
- Fast cache warming on startup
- Optional feature for stateful deployments

### 🔄 Background Refresh
- Refreshes entries before expiration
- Serves stale data while fetching
- Prevents cache stampedes

### 🎯 Negative Caching (NEW!)
- **Prevents repeated 404 lookups**
- Tracks non-existent keys temporarily
- Reduces unnecessary API calls

### 📊 Enhanced Metrics
- Hit/miss rates with trends
- Compression statistics
- Coalescing effectiveness
- Memory efficiency metrics

Access metrics via:
```javascript
const stats = await cacheService.getStats();
console.log(stats);
// {
//   hits: 1234,
//   misses: 56,
//   hitRate: 0.956,
//   hitRatePercent: "95.60%",
//   apiCallsSaved: 1234,
//   estimatedCostSavings: "$1.23",
//   memoryUsage: 12582912,
//   totalEntries: 523,
//   compressionRatio: 0.35,      // NEW: 65% space savings
//   coalescedRequests: 89,       // NEW: Duplicate requests prevented
//   negativeHits: 12,            // NEW: 404s prevented
//   adaptiveTTLAdjustments: 45   // NEW: Smart TTL changes
// }
```

## Migration from External Cache

### Migrating to SmartCache (Recommended)

If you're currently using an external cache (Redis/Valkey):

1. Remove cache environment variables (`CACHE_HOST`, etc.)
2. Uninstall ioredis: `npm uninstall ioredis`
3. Restart the server

SmartCache will be used automatically with better performance and zero dependencies.

### If You Must Keep External Cache

1. Install ioredis manually: `npm install ioredis`
2. Set `CACHE_TYPE=external`
3. Configure `CACHE_HOST`, `CACHE_PORT`, etc.
4. Note: You will see deprecation warnings

### Custom Cache Implementation

For advanced distributed caching needs, implement the `ICache` interface:

```typescript
import { ICache } from './types/cache-interface';

class MyCustomCache implements ICache {
  // Implement required methods
}
```

## Performance Tips

1. **Adjust cache size based on your workload**:
   - Small deployments: 1,000-10,000 entries
   - Medium deployments: 10,000-50,000 entries
   - Large deployments: 50,000-100,000 entries
   - For distributed caching needs: Implement custom cache adapter

2. **Monitor memory usage**:
   - Check `getStats()` regularly
   - Adjust `CACHE_MAX_MEMORY_MB` as needed

3. **Choose appropriate eviction policy**:
   - LRU: Best for general use
   - LFU: Good when some items are accessed much more than others
   - FIFO: Simple and predictable

4. **Warm cache on startup** for better initial performance:
   ```javascript
   await cacheService.warmCache(client, 'default');
   ```

## Troubleshooting

### High Memory Usage
- Reduce `CACHE_MAX_SIZE`
- Lower TTL values
- Check for memory leaks with `getDetailedStats()`

### Low Hit Rate
- Increase cache size
- Adjust TTL values
- Check access patterns

### Debug Logging
Enable debug mode to see cache operations:
```bash
DEBUG=true npm start
```

This will log:
- Cache hits/misses
- Evictions
- Refresh operations
- Error conditions