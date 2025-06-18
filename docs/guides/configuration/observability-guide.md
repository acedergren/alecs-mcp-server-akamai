# Observability Guide for Akamai MCP Server

This guide covers the comprehensive observability system for the Akamai MCP Server, providing monitoring, metrics, debugging, diagnostics, and telemetry export capabilities.

## Overview

The observability stack provides four main components:

1. **Metrics API** - Push-based metrics collection and export
2. **Debug API** - Real-time debugging and distributed tracing
3. **Diagnostics API** - System health monitoring and alerting
4. **Telemetry Exporter** - Multi-platform telemetry export

## Quick Start

### Development Setup

```typescript
import { ObservabilityFactory } from './src/observability/index.js';

// Create development observability stack
const observability = ObservabilityFactory.createDevelopment();

// Wait for initialization
await new Promise(resolve => {
  observability.once('initialized', resolve);
});

console.log('Observability ready!');
```

### Production Setup

```typescript
import { ObservabilityFactory, DestinationFactory } from './src/observability/index.js';

// Configure telemetry destinations
const destinations = [
  DestinationFactory.createPrometheus('prometheus', 'http://prometheus:9091'),
  DestinationFactory.createDataDog('datadog', process.env.DATADOG_API_KEY),
  DestinationFactory.createNewRelic('newrelic', process.env.NEW_RELIC_LICENSE_KEY),
];

// Create production observability stack
const observability = ObservabilityFactory.createProduction(destinations);
```

### MCP Server Integration

```typescript
import { InstrumentedMCPServer, ServerFactory } from './src/observability/mcp-server-integration.js';

// Create instrumented MCP server
const server = ServerFactory.createProductionServer(destinations);

// Start with observability
await server.start();
```

## Components

### 1. Metrics API

Collects and exports metrics in multiple formats with push-based delivery.

#### Features
- Counter, gauge, histogram metrics
- Prometheus, OpenTelemetry, JSON export formats
- HTTP push targets with authentication
- System metrics collection
- Custom metric collectors

#### Usage

```typescript
import MetricsAPI, { HTTPPushTarget } from './src/observability/metrics-api.js';

const metrics = new MetricsAPI();

// Register metric
metrics.registerMetric({
  name: 'http_requests_total',
  type: 'counter',
  help: 'Total HTTP requests',
  labels: ['method', 'status'],
});

// Record values
metrics.incrementCounter('http_requests_total', 1, { method: 'GET', status: '200' });
metrics.setGauge('memory_usage_bytes', process.memoryUsage().heapUsed);
metrics.recordHistogram('request_duration_seconds', 0.125, { endpoint: '/api' });

// Add push target
const pushTarget = new HTTPPushTarget(
  'prometheus',
  'http://localhost:9091/metrics/job/mcp-server',
  'prometheus',
  {},
  { type: 'bearer', token: 'your-token' }
);

metrics.addPushTarget('prometheus', pushTarget);

// Push metrics
await metrics.pushMetrics();

// Export formats
const prometheus = metrics.exportPrometheus();
const openTelemetry = metrics.exportOpenTelemetry();
const json = metrics.exportCustomFormat();
```

### 2. Debug API

Provides real-time debugging, event logging, and distributed tracing.

#### Features
- Event logging with filtering
- Distributed tracing with spans
- Real-time subscriptions
- Streaming connections (WebSocket, SSE, webhooks)
- Request/response correlation

#### Usage

```typescript
import DebugAPI from './src/observability/debug-api.js';

const debug = new DebugAPI();

// Log events
debug.logEvent('info', 'mcp-request', 'Processing request', {
  tool: 'property.list',
  customer: 'example',
}, 'mcp-server');

// Distributed tracing
const traceId = 'trace-123';
const trace = debug.startTrace(traceId, {
  service: 'mcp',
  endpoint: 'property.list',
  customer: 'example',
});

const spanId = debug.startSpan(traceId, 'api-call', undefined, {
  'service.name': 'akamai-api',
  'http.method': 'GET',
});

debug.logToSpan(traceId, spanId, { step: 'authenticating' });
debug.finishSpan(traceId, spanId, undefined, { status: 'success' });

// Subscribe to events
const subscriptionId = debug.subscribe(
  { levels: ['error'], categories: ['tool-execution'] },
  (event) => console.log('Error:', event.message)
);

// Search events
const results = debug.searchEvents('timeout', { levels: ['error'] });
```

### 3. Diagnostics API

System health monitoring, diagnostics collection, and alerting.

#### Features
- Health checks with status tracking
- System diagnostics collection
- Alert rules with conditions
- Diagnostic reports
- Performance monitoring

#### Usage

```typescript
import DiagnosticsAPI from './src/observability/diagnostics-api.js';

const diagnostics = new DiagnosticsAPI();

// Register health check
diagnostics.registerHealthCheck({
  name: 'database_connectivity',
  category: 'system',
  async execute() {
    try {
      // Check database connection
      const isConnected = await checkDatabaseConnection();
      
      return {
        name: 'database_connectivity',
        status: isConnected ? 'healthy' : 'critical',
        message: isConnected ? 'Database connected' : 'Database unreachable',
        lastCheck: Date.now(),
        duration: 0,
      };
    } catch (error) {
      return {
        name: 'database_connectivity',
        status: 'critical',
        message: `Connection failed: ${error.message}`,
        lastCheck: Date.now(),
        duration: 0,
      };
    }
  },
});

// Register alert rule
diagnostics.registerAlertRule({
  name: 'high_error_rate',
  condition: (systemDiagnostics, healthChecks) => {
    const criticalChecks = healthChecks.filter(c => c.status === 'critical');
    return criticalChecks.length > 0;
  },
  severity: 'warning',
  message: 'Critical health checks detected',
  cooldownMs: 300000,
});

// Run health checks
const healthStatus = await diagnostics.runHealthChecks();
console.log('Overall health:', healthStatus);

// Generate diagnostic report
const report = await diagnostics.generateDiagnosticReport();
```

### 4. Telemetry Exporter

Exports telemetry data to external observability platforms.

#### Supported Platforms
- Prometheus Push Gateway
- DataDog
- New Relic
- Grafana Cloud
- Custom webhooks

#### Usage

```typescript
import TelemetryExporter, { DestinationFactory } from './src/observability/telemetry-exporter.js';

const exporter = new TelemetryExporter(metrics, debug, diagnostics);

// Add destinations
const promDestination = DestinationFactory.createPrometheus(
  'prometheus',
  'http://localhost:9091',
  'alecs-mcp-akamai'
);

const datadogDestination = DestinationFactory.createDataDog(
  'datadog',
  'your-api-key'
);

exporter.addDestination(promDestination);
exporter.addDestination(datadogDestination);

// Start batch export
exporter.startBatchExport(30000); // Every 30 seconds

// Manual export
const results = await exporter.exportAll();

// Test connectivity
const testResult = await exporter.testDestination('prometheus');
```

## Configuration

### Environment Variables

```bash
# Observability settings
OBSERVABILITY_ENABLED=true
OBSERVABILITY_ENVIRONMENT=production
OBSERVABILITY_LOG_LEVEL=info

# Prometheus
PROMETHEUS_PUSH_GATEWAY_URL=http://localhost:9091
PROMETHEUS_JOB_NAME=alecs-mcp-akamai-server

# DataDog
DATADOG_API_KEY=your-api-key
DATADOG_SITE=datadoghq.com

# New Relic
NEW_RELIC_LICENSE_KEY=your-license-key
NEW_RELIC_REGION=US

# Custom monitoring
MONITORING_WEBHOOK_URL=https://your-monitoring.com/webhook
MONITORING_WEBHOOK_TOKEN=your-webhook-token

# Development options
INTERACTIVE=true
EXPORT_ON_SHUTDOWN=true
```

### Programmatic Configuration

```typescript
import { ObservabilityConfig } from './src/observability/index.js';

const config: ObservabilityConfig = {
  metrics: {
    enabled: true,
    pushIntervalMs: 15000,
    maxHistory: 10000,
    enableSystemMetrics: true,
  },
  debugging: {
    enabled: true,
    maxEvents: 50000,
    maxTraces: 5000,
    traceRetentionMs: 3600000,
    enableStackTraces: false,
  },
  diagnostics: {
    enabled: true,
    healthCheckIntervalMs: 10000,
    diagnosticsIntervalMs: 30000,
    enablePerformanceMonitoring: true,
  },
  telemetry: {
    enabled: true,
    destinations: [...],
    batchExportIntervalMs: 30000,
    maxRetryAttempts: 3,
  },
  general: {
    enableRealTimeStreaming: false,
    enableAlerts: true,
    logLevel: 'info',
  },
};

const observability = new ObservabilityStack(config);
```

## Instrumentation

### MCP Request Instrumentation

```typescript
// Instrument MCP requests
const instrumentation = observability.instrumentMCPRequest(
  'property.list',
  'customer-123',
  { requestId: 'req-456' }
);

try {
  const result = await executePropertyList();
  instrumentation.finish(undefined, result);
} catch (error) {
  instrumentation.finish(error);
  throw error;
}
```

### Akamai API Instrumentation

```typescript
// Instrument Akamai API calls
const apiInstrumentation = observability.instrumentAkamaiAPIRequest(
  'papi',
  'properties',
  'customer-123'
);

try {
  const response = await akamaiClient.get('/papi/v1/properties');
  apiInstrumentation.finish(undefined, response);
} catch (error) {
  apiInstrumentation.finish(error);
  throw error;
}
```

### Custom Metrics

```typescript
// Business metrics
observability.metrics.incrementCounter('properties_created_total', 1, {
  customer: 'example',
  product: 'ion',
});

observability.metrics.setGauge('active_properties', propertyCount, {
  customer: 'example',
});

observability.metrics.recordHistogram('property_activation_duration_seconds', 
  activationTime, { network: 'production' });
```

## Monitoring Dashboards

### Grafana Dashboard

Use the exported Prometheus metrics in Grafana:

```promql
# Request rate
rate(akamai_mcp_requests_total[5m])

# Error rate
rate(akamai_mcp_requests_total{status="error"}[5m]) / 
rate(akamai_mcp_requests_total[5m])

# Response time
histogram_quantile(0.95, 
  rate(akamai_mcp_request_duration_seconds_bucket[5m]))

# Memory usage
akamai_mcp_memory_usage_bytes{type="heap_used"}
```

### DataDog Dashboard

Create dashboards using the exported metrics:

- `alecs.mcp.akamai.requests.total` - Request volume
- `alecs.mcp.akamai.request.duration` - Response times
- `akamai.api.requests.total` - Akamai API calls
- `nodejs.memory.usage` - Memory consumption

### Custom Dashboard

```typescript
import { MonitoringDashboard } from '../examples/observability-integration-demo.js';

const dashboard = new MonitoringDashboard(observability);

// Get dashboard data
const data = await dashboard.getDashboardData();

// Start real-time updates
const cleanup = dashboard.startRealTimeUpdates((data) => {
  updateUI(data);
}, 5000);
```

## Alerting

### Alert Rules

Configure alerts based on system conditions:

```typescript
// High error rate
diagnostics.registerAlertRule({
  name: 'high_error_rate',
  condition: () => {
    const events = debug.getRecentEvents(100);
    const errors = events.filter(e => e.level === 'error');
    return errors.length / events.length > 0.1;
  },
  severity: 'warning',
  message: 'Error rate exceeds 10%',
  cooldownMs: 300000,
});

// Memory leak detection
diagnostics.registerAlertRule({
  name: 'memory_leak',
  condition: (diagnostics) => {
    const memUsage = diagnostics.process.memoryUsage;
    return memUsage.heapUsed > memUsage.heapTotal * 0.95;
  },
  severity: 'critical',
  message: 'Memory usage critical',
  cooldownMs: 180000,
});
```

### Alert Handling

```typescript
// Listen for alerts
diagnostics.on('alertTriggered', (alert) => {
  console.log(`ALERT [${alert.severity}]: ${alert.message}`);
  
  // Send to external alerting system
  sendToSlack(alert);
  sendToEmail(alert);
});

// Acknowledge alerts
const alerts = diagnostics.getAlerts({ acknowledged: false });
for (const alert of alerts) {
  diagnostics.acknowledgeAlert(alert.id, 'ops-team');
}
```

## CLI Tools

### Monitoring Commands

```bash
# Start with interactive monitoring
INTERACTIVE=true npm run dev

# Commands available:
# - stats: Show current statistics
# - export: Export metrics
# - dashboard: Show dashboard data
# - quit: Exit
```

### Export Tools

```bash
# Export observability data
node -e "
const observability = require('./dist/observability/index.js');
const stack = observability.ObservabilityFactory.createDevelopment();
stack.exportObservabilityData('json').then(data => {
  require('fs').writeFileSync('observability-export.json', data);
});
"
```

## Performance Considerations

### Memory Usage
- Configure `maxEvents` and `maxTraces` based on available memory
- Use trace retention policies to prevent memory leaks
- Monitor heap usage with built-in metrics

### Network Impact
- Batch telemetry exports to reduce network overhead
- Use compression for large payloads
- Configure appropriate flush intervals

### CPU Usage
- Disable stack traces in production for performance
- Use sampling for high-volume tracing
- Configure appropriate collection intervals

## Best Practices

### Development
1. Enable all observability features for debugging
2. Use debug events liberally for troubleshooting
3. Test telemetry destinations before production

### Production
1. Configure multiple telemetry destinations for redundancy
2. Set up alerting for critical conditions
3. Monitor observability system performance
4. Regular health check reviews

### Security
1. Use secure authentication for telemetry destinations
2. Sanitize sensitive data in metrics and logs
3. Implement proper access controls for monitoring data

## Troubleshooting

### Common Issues

**Observability not starting:**
```bash
# Check configuration
DEBUG=observability:* npm run dev

# Verify destinations
curl -X POST http://prometheus:9091/metrics/job/test
```

**High memory usage:**
```typescript
// Reduce retention
const config = {
  debugging: { maxEvents: 1000, maxTraces: 100 },
  metrics: { maxHistory: 500 },
};
```

**Telemetry export failures:**
```typescript
// Test connectivity
const testResults = await exporter.testAllDestinations();
console.log(testResults);

// Check authentication
const destination = DestinationFactory.createDataDog('test', 'invalid-key');
await exporter.testDestination('test'); // Will throw error
```

### Debug Mode

```bash
# Enable debug logging
DEBUG=observability:*,metrics:*,debug:*,diagnostics:*,telemetry:* npm run dev
```

## API Reference

See [API Documentation](./api/observability.md) for complete API reference.

## Examples

- [Basic Usage](../examples/observability-integration-demo.ts)
- [Production Setup](../examples/production-observability.ts)
- [Custom Collectors](../examples/custom-metrics.ts)
- [Dashboard Integration](../examples/dashboard-integration.ts)

## Contributing

When adding new observability features:

1. Add appropriate metrics for new functionality
2. Include health checks for new services
3. Add debugging events for troubleshooting
4. Update alert rules for new failure modes
5. Test with multiple telemetry destinations