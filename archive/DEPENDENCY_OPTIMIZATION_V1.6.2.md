# Dependency Optimization Analysis - v1.6.2

## Executive Summary

After deep analysis and sequential thinking, the focus should shift from removing dependencies to **optimizing usage of existing ones** and adding only critical missing pieces for production readiness.

## Part 1: Optimizing Existing Dependencies

### 1. **lru-cache** (v11) - Currently Underutilized
**Current Usage**: Only DNS caching in OptimizedHTTPClient
**Optimization Opportunities**:
```typescript
// 1. API Response Cache
const apiCache = new LRUCache<string, any>({
  max: 1000,
  ttl: 1000 * 60 * 5, // 5 minutes
  sizeCalculation: (value) => JSON.stringify(value).length,
  maxSize: 50 * 1024 * 1024, // 50MB
});

// 2. EdgeGrid Token Cache
const tokenCache = new LRUCache<string, string>({
  max: 100,
  ttl: 1000 * 60 * 60, // 1 hour
});

// 3. Compiled Schema Cache
const schemaCache = new LRUCache<string, ZodSchema>({
  max: 200,
  // No TTL - schemas don't change
});

// 4. MCP Response Cache for identical requests
const mcpResponseCache = new LRUCache<string, MCPToolResponse>({
  max: 500,
  ttl: 1000 * 60, // 1 minute for real-time data
});
```

### 2. **zod** - Enhanced Validation Patterns
**Current Usage**: Basic validation
**Optimization Opportunities**:
```typescript
// 1. Transform during validation
const PropertyIdSchema = z.string()
  .transform(val => val.startsWith('prp_') ? val : `prp_${val}`)
  .refine(val => /^prp_\d+$/.test(val), 'Invalid property ID format');

// 2. Reusable schema compositions
const BaseToolSchema = z.object({
  customer: z.string().optional().default('default'),
  timeout: z.number().optional().default(30000),
});

const PropertyToolSchema = BaseToolSchema.extend({
  propertyId: PropertyIdSchema,
});

// 3. Better error messages
const NetworkSchema = z.enum(['STAGING', 'PRODUCTION'], {
  errorMap: () => ({ message: 'Network must be either STAGING or PRODUCTION' }),
});

// 4. Complex business rules
const ActivationSchema = z.object({
  network: NetworkSchema,
  emails: z.array(z.string().email()),
}).refine(
  data => data.network !== 'PRODUCTION' || data.emails.length > 0,
  'Production activations require at least one notification email'
);
```

### 3. **express** - Production-Ready Middleware
**Current Usage**: Basic SSE endpoint
**Optimization Opportunities**:
```typescript
import compression from 'compression';
import helmet from 'helmet';

// 1. Compression for responses
app.use(compression());

// 2. Security headers
app.use(helmet());

// 3. Request logging
app.use((req, res, next) => {
  logger.info('HTTP Request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
  });
  next();
});

// 4. Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    version: process.env.npm_package_version,
    uptime: process.uptime(),
  });
});

// 5. Metrics endpoint
app.get('/metrics', (req, res) => {
  res.json({
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    connections: getActiveConnections(),
  });
});
```

### 4. **ws** - Robust WebSocket Implementation
**Current Usage**: Basic WebSocket server
**Optimization Opportunities**:
```typescript
// 1. Heartbeat implementation
const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

// 2. Reconnection with backoff
class ReconnectingWebSocket {
  private retries = 0;
  private maxRetries = 5;
  
  connect() {
    this.ws = new WebSocket(this.url);
    this.ws.on('close', () => {
      if (this.retries < this.maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, this.retries), 30000);
        setTimeout(() => this.connect(), delay);
        this.retries++;
      }
    });
  }
}

// 3. Message queuing
const messageQueue = new Map<string, any[]>();
ws.on('open', () => {
  const queued = messageQueue.get(ws.id);
  queued?.forEach(msg => ws.send(msg));
  messageQueue.delete(ws.id);
});
```

### 5. **commander** - Enhanced CLI Experience
**Current Usage**: Basic command parsing
**Optimization Opportunities**:
```typescript
// 1. Command aliases
program
  .command('ls')
  .alias('list')
  .description('List resources');

// 2. Global options
program
  .option('-c, --customer <name>', 'Customer context', 'default')
  .option('--json', 'Output as JSON')
  .option('--no-color', 'Disable colored output');

// 3. Interactive mode
program
  .command('interactive')
  .action(async () => {
    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: ['List Properties', 'Create Property', 'Activate', 'Exit']
      }
    ]);
  });

// 4. Custom help
program.configureHelp({
  sortSubcommands: true,
  subcommandTerm: (cmd) => cmd.name() + ' ' + cmd.aliases().join('|')
});
```

### 6. **jest** - Advanced Testing Patterns
**Current Usage**: Basic unit tests
**Optimization Opportunities**:
```typescript
// 1. Custom matchers
expect.extend({
  toBeValidPropertyId(received) {
    const pass = /^prp_\d+$/.test(received);
    return {
      pass,
      message: () => `expected ${received} to be a valid property ID`,
    };
  },
});

// 2. Parameterized tests
test.each([
  ['STAGING', true],
  ['PRODUCTION', true],
  ['INVALID', false],
])('validates network %s as %s', (network, expected) => {
  expect(isValidNetwork(network)).toBe(expected);
});

// 3. Snapshot testing for API responses
test('property list response', async () => {
  const response = await listProperties();
  expect(response).toMatchSnapshot();
});
```

## Part 2: Critical Dependencies to Add

### 1. **pino** - Structured Logging (HIGH PRIORITY)
```bash
npm install pino pino-pretty
```
```typescript
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
    },
  },
});

// Replace console.log throughout codebase
logger.info({ propertyId, customer }, 'Creating property');
logger.error({ err, context }, 'API call failed');
```

### 2. **p-limit** - Rate Limiting (HIGH PRIORITY)
```bash
npm install p-limit
```
```typescript
import pLimit from 'p-limit';

const limit = pLimit(5); // Max 5 concurrent Akamai API calls

const results = await Promise.all(
  propertyIds.map(id => 
    limit(() => getPropertyDetails(id))
  )
);
```

### 3. **p-retry** - Sophisticated Retry Logic (MEDIUM PRIORITY)
```bash
npm install p-retry
```
```typescript
import pRetry from 'p-retry';

const fetchWithRetry = (url) => pRetry(
  () => fetch(url),
  {
    retries: 3,
    onFailedAttempt: error => {
      logger.warn(`Attempt ${error.attemptNumber} failed. ${error.retriesLeft} left.`);
    },
    minTimeout: 1000,
    maxTimeout: 30000,
    factor: 2,
  }
);
```

### 4. **dotenv-cli** - Environment Management (LOW PRIORITY)
```bash
npm install --save-dev dotenv-cli
```
```json
{
  "scripts": {
    "dev": "dotenv -- tsx watch src/index.ts",
    "test": "dotenv -e .env.test -- jest"
  }
}
```

## Part 3: Dependencies to Reconsider

### Keep These (Previously Marked for Removal):
1. **eslint-plugin-import** - Configure it properly instead:
```javascript
// eslint.config.js
import importPlugin from 'eslint-plugin-import';

export default [
  {
    plugins: {
      import: importPlugin,
    },
    rules: {
      'import/order': ['error', {
        'groups': ['builtin', 'external', 'internal'],
        'newlines-between': 'always',
      }],
      'import/no-cycle': 'error',
      'import/no-unused-modules': 'error',
    },
  },
];
```

2. **tsconfig-paths** - May be needed for Jest path resolution
3. **supertest** - Keep for future Express route testing

### Actually Remove:
1. **@types/supertest** - Only if not using supertest

## Part 4: Modern Node.js Native Replacements

### Replace glob with native Node.js (if Node.js 18+):
```typescript
// Old (with glob package)
import glob from 'glob';
const files = glob.sync('src/**/*.ts');

// New (Node.js 20.1+)
import { glob } from 'node:fs/promises';
const files = await Array.fromAsync(glob('src/**/*.ts'));
```

## Implementation Priority

### Phase 1 - Immediate (v1.6.2)
1. ✅ Fix dependency placements (move types to dev, uuid to prod)
2. ✅ Configure eslint-plugin-import properly
3. ✅ Implement API response caching with lru-cache
4. ✅ Add structured logging with pino

### Phase 2 - Short Term (v1.6.3)
1. ⏳ Add p-limit for rate limiting
2. ⏳ Enhance zod schemas with transforms
3. ⏳ Add Express middleware (compression, helmet)
4. ⏳ Implement WebSocket heartbeat

### Phase 3 - Medium Term (v1.7.0)
1. 📋 Add p-retry for resilience
2. 📋 Implement comprehensive caching strategy
3. 📋 Add monitoring/metrics endpoints
4. 📋 Consider replacing glob with native Node.js

## Expected Benefits

### Performance Improvements
- 50-70% reduction in Akamai API calls through caching
- 30% faster response times with compressed responses
- Better resource utilization with rate limiting

### Reliability Improvements
- Automatic retry with exponential backoff
- WebSocket reconnection handling
- Circuit breaker pattern for API failures

### Developer Experience
- Structured logging for easier debugging
- Better error messages from enhanced zod schemas
- Interactive CLI mode for common tasks

## Conclusion

The project has good dependency choices but underutilizes them. Focus should be on:
1. **Maximizing existing dependency usage** (80% of effort)
2. **Adding only critical missing pieces** (20% of effort)
3. **Avoiding dependency sprawl**

This approach will yield better results than adding many new dependencies or removing potentially useful ones.