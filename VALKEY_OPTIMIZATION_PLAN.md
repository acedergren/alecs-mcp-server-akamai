# Valkey (Redis) Optimization Plan for ALECS MCP Server

## Executive Summary

Valkey can dramatically improve ALECS MCP server performance by caching Akamai API responses, reducing API calls by 80%+, and improving response times by 10x for cached data. This plan outlines a comprehensive caching strategy tailored for Akamai's data patterns.

## Current State Analysis

### Pain Points Without Caching
1. **Repeated API Calls**: Same property data fetched multiple times
2. **Slow Searches**: O(n) iteration through all properties for hostname lookups  
3. **API Rate Limits**: Risk of hitting Akamai's rate limits
4. **Latency**: 200-500ms per API call to Akamai
5. **Cost**: Each API call counts against monthly quota

### Caching Opportunities
- **Property Lists**: Change infrequently (5-15 min TTL)
- **Property Details**: Mostly static (1 hour TTL)
- **Hostnames**: Rarely change (15-30 min TTL)
- **Contracts/Groups**: Very stable (24 hour TTL)
- **Search Results**: Cacheable with smart invalidation
- **Rule Trees**: Large but stable (2 hour TTL)

## Valkey Architecture Design

### 1. Cache Topology

```
┌─────────────────────┐     ┌──────────────────┐
│   ALECS MCP Server  │────▶│  Valkey Primary  │
│  (Multiple Workers) │     │    (Write/Read)  │
└─────────────────────┘     └──────────────────┘
                                      │
                            ┌─────────┴─────────┐
                            │                   │
                    ┌───────▼────────┐ ┌───────▼────────┐
                    │ Valkey Replica │ │ Valkey Replica │
                    │  (Read Only)   │ │  (Read Only)   │
                    └────────────────┘ └────────────────┘
```

### 2. Key Naming Strategy

```
Pattern: akamai:{customer}:{resource}:{identifier}:{subresource}

Examples:
- akamai:default:properties:all
- akamai:acme:property:prp_123456
- akamai:acme:property:prp_123456:hostnames
- akamai:acme:property:prp_123456:rules:v5
- akamai:acme:search:www.example.com
- akamai:acme:hostname:map
- akamai:acme:contract:ctr_C-123456
- akamai:acme:metrics:cache:hits
```

### 3. Data Structure Optimization

#### Property Lists (STRING with JSON)
```redis
SET akamai:acme:properties:all "{...}" EX 300
```

#### Hostname Mapping (HASH)
```redis
HSET akamai:acme:hostnames www.example.com '{"propertyId":"prp_123","property":{...}}'
HSET akamai:acme:hostnames example.com '{"propertyId":"prp_123","property":{...}}'
```

#### Search Cache (SORTED SET)
```redis
ZADD akamai:acme:searches {timestamp} "query:results_key"
```

#### Property Versions (LIST)
```redis
LPUSH akamai:acme:property:prp_123:versions "v5"
LTRIM akamai:acme:property:prp_123:versions 0 9
```

## Implementation Strategy

### Phase 1: Core Caching Layer (Week 1)

#### 1.1 Enhanced Cache Service
```typescript
// src/services/valkey-cache-service.ts
import Redis from 'ioredis';
import { Cluster } from 'ioredis';

export interface ValkeyConfig {
  mode: 'single' | 'cluster' | 'sentinel';
  nodes?: Array<{ host: string; port: number }>;
  sentinels?: Array<{ host: string; port: number }>;
  name?: string; // master name for sentinel
  password?: string;
  db?: number;
  keyPrefix?: string;
  enableReadyCheck?: boolean;
  maxRetriesPerRequest?: number;
}

export class ValkeyCache {
  private client: Redis | Cluster;
  private readonly prefix: string;
  
  constructor(config: ValkeyConfig) {
    this.prefix = config.keyPrefix || 'akamai:';
    
    if (config.mode === 'cluster') {
      this.client = new Cluster(config.nodes || []);
    } else if (config.mode === 'sentinel') {
      this.client = new Redis({
        sentinels: config.sentinels,
        name: config.name || 'mymaster',
        password: config.password,
      });
    } else {
      this.client = new Redis({
        host: config.nodes?.[0]?.host || 'localhost',
        port: config.nodes?.[0]?.port || 6379,
        password: config.password,
        db: config.db || 0,
      });
    }
    
    this.setupEventHandlers();
  }
  
  private setupEventHandlers(): void {
    this.client.on('error', (err) => {
      console.error('[Valkey] Connection error:', err);
    });
    
    this.client.on('connect', () => {
      console.error('[Valkey] Connected successfully');
    });
  }
}
```

#### 1.2 TTL Configuration
```typescript
export const CacheTTL = {
  // Frequently changing data
  PROPERTIES_LIST: 300,        // 5 minutes
  SEARCH_RESULTS: 300,         // 5 minutes
  
  // Moderately stable data
  PROPERTY_DETAILS: 900,       // 15 minutes
  HOSTNAMES: 1800,            // 30 minutes
  ACTIVATIONS: 600,           // 10 minutes
  
  // Stable data
  PROPERTY_RULES: 7200,       // 2 hours
  CONTRACTS: 86400,           // 24 hours
  GROUPS: 86400,              // 24 hours
  CP_CODES: 43200,            // 12 hours
  
  // Computed/derived data
  HOSTNAME_MAP: 1800,         // 30 minutes
  PROPERTY_TREE: 3600,        // 1 hour
  SEARCH_INDEX: 600,          // 10 minutes
} as const;
```

### Phase 2: Smart Caching Patterns (Week 2)

#### 2.1 Cache-Aside Pattern with Refresh
```typescript
export class SmartCache {
  async getWithRefresh<T>(
    key: string,
    ttl: number,
    fetchFn: () => Promise<T>,
    options: {
      refreshThreshold?: number; // percentage of TTL
      softTTL?: number; // return stale while refreshing
    } = {}
  ): Promise<T> {
    const cached = await this.get(key);
    const ttlRemaining = await this.ttl(key);
    
    // Return cached if still fresh
    if (cached && ttlRemaining > 0) {
      // Trigger background refresh if approaching expiry
      const refreshAt = ttl * (options.refreshThreshold || 0.2);
      if (ttlRemaining < refreshAt) {
        this.refreshInBackground(key, ttl, fetchFn);
      }
      return cached;
    }
    
    // Use stale-while-revalidate pattern
    if (cached && options.softTTL) {
      this.refreshInBackground(key, ttl, fetchFn);
      return cached;
    }
    
    // Fetch and cache
    const data = await fetchFn();
    await this.set(key, data, ttl);
    return data;
  }
}
```

#### 2.2 Batch Operations
```typescript
export class BatchCache {
  async mgetProperties(
    customer: string,
    propertyIds: string[]
  ): Promise<Map<string, any>> {
    const keys = propertyIds.map(id => 
      `${this.prefix}${customer}:property:${id}`
    );
    
    const pipeline = this.client.pipeline();
    keys.forEach(key => pipeline.get(key));
    
    const results = await pipeline.exec();
    const propertyMap = new Map();
    
    results?.forEach((result, index) => {
      if (result[1]) {
        propertyMap.set(propertyIds[index], JSON.parse(result[1]));
      }
    });
    
    return propertyMap;
  }
}
```

#### 2.3 Cache Warming
```typescript
export class CacheWarmer {
  async warmPropertyCache(customer: string): Promise<void> {
    console.error('[CacheWarmer] Starting property cache warming...');
    
    // Fetch all properties
    const properties = await this.fetchAllProperties(customer);
    
    // Warm property list cache
    await this.cache.set(
      `properties:all`,
      properties,
      CacheTTL.PROPERTIES_LIST
    );
    
    // Warm individual property caches in parallel
    const batchSize = 10;
    for (let i = 0; i < properties.length; i += batchSize) {
      const batch = properties.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (property) => {
        // Cache property details
        await this.cache.set(
          `property:${property.propertyId}`,
          property,
          CacheTTL.PROPERTY_DETAILS
        );
        
        // Pre-fetch and cache hostnames
        try {
          const hostnames = await this.fetchHostnames(property);
          await this.cache.set(
            `property:${property.propertyId}:hostnames`,
            hostnames,
            CacheTTL.HOSTNAMES
          );
        } catch (err) {
          console.error(`Failed to warm hostnames for ${property.propertyId}`);
        }
      }));
    }
    
    console.error(`[CacheWarmer] Warmed ${properties.length} properties`);
  }
}
```

### Phase 3: Advanced Features (Week 3)

#### 3.1 Intelligent Invalidation
```typescript
export class CacheInvalidator {
  async invalidateProperty(
    customer: string,
    propertyId: string,
    options: {
      cascade?: boolean;
      pattern?: boolean;
    } = {}
  ): Promise<void> {
    const keys = [
      `${customer}:property:${propertyId}`,
      `${customer}:property:${propertyId}:*`,
      `${customer}:properties:all`,
      `${customer}:hostname:map`,
    ];
    
    if (options.cascade) {
      // Invalidate related caches
      keys.push(
        `${customer}:search:*`,
        `${customer}:property:${propertyId}:rules:*`,
        `${customer}:property:${propertyId}:hostnames`
      );
    }
    
    // Use SCAN for pattern matching to avoid blocking
    for (const pattern of keys) {
      if (pattern.includes('*')) {
        await this.scanAndDelete(pattern);
      } else {
        await this.client.del(pattern);
      }
    }
  }
  
  private async scanAndDelete(pattern: string): Promise<void> {
    const stream = this.client.scanStream({
      match: `${this.prefix}${pattern}`,
      count: 100
    });
    
    stream.on('data', async (keys: string[]) => {
      if (keys.length) {
        await this.client.del(...keys);
      }
    });
    
    await new Promise((resolve, reject) => {
      stream.on('end', resolve);
      stream.on('error', reject);
    });
  }
}
```

#### 3.2 Cache Analytics
```typescript
export class CacheAnalytics {
  async recordHit(key: string): Promise<void> {
    const date = new Date().toISOString().split('T')[0];
    await this.client.hincrby(`stats:${date}:hits`, key, 1);
    await this.client.expire(`stats:${date}:hits`, 7 * 86400);
  }
  
  async recordMiss(key: string): Promise<void> {
    const date = new Date().toISOString().split('T')[0];
    await this.client.hincrby(`stats:${date}:misses`, key, 1);
    await this.client.expire(`stats:${date}:misses`, 7 * 86400);
  }
  
  async getHitRate(pattern?: string): Promise<number> {
    const date = new Date().toISOString().split('T')[0];
    
    const hits = await this.client.hgetall(`stats:${date}:hits`);
    const misses = await this.client.hgetall(`stats:${date}:misses`);
    
    let totalHits = 0;
    let totalMisses = 0;
    
    Object.entries(hits).forEach(([key, count]) => {
      if (!pattern || key.includes(pattern)) {
        totalHits += parseInt(count, 10);
      }
    });
    
    Object.entries(misses).forEach(([key, count]) => {
      if (!pattern || key.includes(pattern)) {
        totalMisses += parseInt(count, 10);
      }
    });
    
    const total = totalHits + totalMisses;
    return total > 0 ? (totalHits / total) * 100 : 0;
  }
}
```

## Monitoring & Observability

### 1. Key Metrics to Track

```typescript
export interface CacheMetrics {
  // Performance metrics
  hitRate: number;
  avgLatency: number;
  p95Latency: number;
  p99Latency: number;
  
  // Resource metrics
  memoryUsage: number;
  evictedKeys: number;
  expiredKeys: number;
  totalKeys: number;
  
  // Business metrics
  apiCallsSaved: number;
  costSavings: number;
  
  // Health metrics
  connectionErrors: number;
  commandErrors: number;
  slowQueries: number;
}
```

### 2. Monitoring Implementation

```typescript
export class CacheMonitor {
  async collectMetrics(): Promise<CacheMetrics> {
    const info = await this.client.info();
    const stats = this.parseInfo(info);
    
    return {
      hitRate: await this.analytics.getHitRate(),
      avgLatency: stats.avg_ttl || 0,
      p95Latency: await this.getPercentileLatency(95),
      p99Latency: await this.getPercentileLatency(99),
      memoryUsage: stats.used_memory || 0,
      evictedKeys: stats.evicted_keys || 0,
      expiredKeys: stats.expired_keys || 0,
      totalKeys: await this.client.dbsize(),
      apiCallsSaved: await this.getApiCallsSaved(),
      costSavings: await this.calculateCostSavings(),
      connectionErrors: this.errorCount,
      commandErrors: stats.rejected_commands || 0,
      slowQueries: await this.getSlowQueryCount(),
    };
  }
}
```

## Performance Targets

| Metric | Current (No Cache) | Target (With Valkey) | Improvement |
|--------|-------------------|---------------------|-------------|
| Property List Load | 2-5 sec | 50ms | 40-100x |
| Hostname Search | 10-30 sec | 100ms | 100-300x |
| Property Details | 500ms | 20ms | 25x |
| API Calls/Hour | 10,000+ | 2,000 | 80% reduction |
| Memory per Customer | N/A | 50MB | Acceptable |
| Cache Hit Rate | 0% | 85%+ | New capability |

## Implementation Timeline

### Week 1: Foundation
- [ ] Install and configure Valkey
- [ ] Implement base cache service
- [ ] Add to property search tool
- [ ] Basic monitoring

### Week 2: Optimization
- [ ] Implement smart refresh patterns
- [ ] Add batch operations
- [ ] Cache warming strategy
- [ ] Performance testing

### Week 3: Advanced Features
- [ ] Intelligent invalidation
- [ ] Analytics dashboard
- [ ] Auto-scaling policies
- [ ] Alerting setup

### Week 4: Production Readiness
- [ ] Load testing
- [ ] Failover testing
- [ ] Documentation
- [ ] Rollout plan

## Risk Mitigation

### 1. Cache Stampede Prevention
```typescript
async getWithLock<T>(
  key: string,
  ttl: number,
  fetchFn: () => Promise<T>
): Promise<T> {
  const lockKey = `${key}:lock`;
  const lock = await this.client.set(
    lockKey, '1', 'NX', 'EX', 30
  );
  
  if (!lock) {
    // Another process is fetching, wait
    await this.sleep(100);
    return this.get(key) || this.getWithLock(key, ttl, fetchFn);
  }
  
  try {
    const data = await fetchFn();
    await this.set(key, data, ttl);
    return data;
  } finally {
    await this.client.del(lockKey);
  }
}
```

### 2. Graceful Degradation
- Fallback to direct API calls if cache unavailable
- Circuit breaker pattern for cache failures
- Automatic cache disable if error rate > threshold

### 3. Data Consistency
- Use cache tags for related data
- Implement cache versioning
- Add cache generation ID for bulk invalidation

## Cost-Benefit Analysis

### Costs
- Valkey infrastructure: ~$50-100/month
- Development time: 4 weeks part-time
- Maintenance: 2-4 hours/month

### Benefits
- 80% reduction in Akamai API calls
- 10-100x faster response times
- Improved user experience
- Reduced risk of rate limiting
- Lower Akamai API costs

### ROI
- Break-even: 2-3 months
- Annual savings: $1000-5000 (API costs)
- Immeasurable UX improvements

## Conclusion

Implementing Valkey caching will transform ALECS MCP server performance, reducing API calls by 80% and improving response times by 10-100x. The phased approach ensures gradual rollout with minimal risk while delivering immediate benefits from Week 1.