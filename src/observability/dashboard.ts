// @ts-nocheck
/**
 * Lightweight debugging dashboard for ALECS
 * Provides real-time visibility into operations without external dependencies
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'http';

import { logger } from './logger';
// import { healthMonitor } from './health';

export class DebugDashboard {
  private server: any = null;
  private port: number;
  private recentOperations: any[] = [];
  private maxOperations = 100;

  constructor(port = 8080) {
    this.port = port;
  }

  recordOperation(operation: {
    toolName: string;
    parameters: any;
    result: any;
    duration: number;
    correlationId: string;
    timestamp: string;
  }): void {
    this.recentOperations.unshift(operation);
    if (this.recentOperations.length > this.maxOperations) {
      this.recentOperations = this.recentOperations.slice(0, this.maxOperations);
    }
  }

  start(): void {
    if (this.server) {
      return;
    }

    this.server = createServer((_req: IncomingMessage, _res: ServerResponse) => {
      const url = new URL(_req.url || '/', `http://localhost:${this.port}`);

      _res.setHeader('Access-Control-Allow-Origin', '*');
      _res.setHeader('Access-Control-Allow-Methods', 'GET');

      switch (url.pathname) {
        case '/':
          this.serveDashboard(_res);
          break;
        case '/api/health':
          this.serveHealth(_res);
          break;
        case '/api/metrics':
          this.serveMetrics(_res);
          break;
        case '/api/operations':
          this.serveOperations(_res);
          break;
        case '/api/correlations':
          this.serveCorrelations(_res, url);
          break;
        default:
          _res.writeHead(404);
          _res.end('Not Found');
      }
    });

    this.server.listen(this.port, () => {
      logger.info('Debug dashboard started', {
        correlationId: 'dashboard',
        port: this.port,
        url: `http://localhost:${this.port}`,
      });
    });
  }

  stop(): void {
    if (this.server) {
      this.server.close();
      this.server = null;
      logger.info('Debug dashboard stopped', {
        correlationId: 'dashboard',
      });
    }
  }

  private serveDashboard(_res: ServerResponse): void {
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>ALECS Debug Dashboard</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
            color: #333;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        h1 {
            color: #0066cc;
            margin-bottom: 30px;
        }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .card {
            background: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .card h2 {
            margin-top: 0;
            color: #0066cc;
            font-size: 18px;
        }
        .status {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
        }
        .status.healthy { background: #d4edda; color: #155724; }
        .status.degraded { background: #fff3cd; color: #856404; }
        .status.unhealthy { background: #f8d7da; color: #721c24; }
        .metric {
            display: flex;
            justify-content: space-between;
            margin: 10px 0;
            padding: 10px;
            background: #f8f9fa;
            border-radius: 4px;
        }
        .operations {
            max-height: 400px;
            overflow-y: auto;
        }
        .operation {
            margin: 10px 0;
            padding: 10px;
            background: #f8f9fa;
            border-radius: 4px;
            border-left: 3px solid #0066cc;
        }
        .operation.error {
            border-left-color: #dc3545;
        }
        .timestamp {
            color: #6c757d;
            font-size: 12px;
        }
        .auto-refresh {
            position: fixed;
            top: 20px;
            right: 20px;
            background: white;
            padding: 10px;
            border-radius: 4px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>ALECS Debug Dashboard</h1>
        
        <div class="auto-refresh">
            <label>
                <input type="checkbox" id="autoRefresh" checked> Auto-refresh (5s)
            </label>
        </div>

        <div class="grid">
            <div class="card">
                <h2>System Health</h2>
                <div id="health">Loading...</div>
            </div>
            
            <div class="card">
                <h2>Performance Metrics</h2>
                <div id="metrics">Loading...</div>
            </div>
        </div>

        <div class="card">
            <h2>Recent Operations</h2>
            <div id="operations" class="operations">Loading...</div>
        </div>
    </div>

    <script>
        let refreshInterval;
        
        async function fetchData() {
            try {
                const [health, metrics, operations] = await Promise.all([
                    fetch('/api/health').then(r => r.json()),
                    fetch('/api/metrics').then(r => r.json()),
                    fetch('/api/operations').then(r => r.json())
                ]);
                
                updateHealth(health);
                updateMetrics(metrics);
                updateOperations(operations);
            } catch (_error) {
                console.error("[Error]:", error);
            }
        }

        function updateHealth(health) {
            const el = document.getElementById('health');
            if (!health.status) {
                el.innerHTML = '<p>No health data available</p>';
                return;
            }
            
            el.innerHTML = \`
                <div class="status \${health.status}">\${health.status.toUpperCase()}</div>
                <p>Uptime: \${formatDuration(health.metadata.uptime)}</p>
                \${Object.entries(health.checks).map(([name, check]) => \`
                    <div class="metric">
                        <span>\${name}</span>
                        <span class="status \${check.status === 'pass' ? 'healthy' : check.status === 'warn' ? 'degraded' : 'unhealthy'}">
                            \${check.status}
                        </span>
                    </div>
                \`).join('')}
            \`;
        }

        function updateMetrics(metrics) {
            const el = document.getElementById('metrics');
            if (!metrics || Object.keys(metrics).length === 0) {
                el.innerHTML = '<p>No metrics available</p>';
                return;
            }
            
            el.innerHTML = Object.entries(metrics).map(([tool, stats]) => \`
                <div class="metric">
                    <span>\${tool}</span>
                    <span>\${stats.count} calls, \${Math.round(stats.avgDuration)}ms avg</span>
                </div>
            \`).join('');
        }

        function updateOperations(operations) {
            const el = document.getElementById('operations');
            if (!operations || operations.length === 0) {
                el.innerHTML = '<p>No recent operations</p>';
                return;
            }
            
            el.innerHTML = operations.map(op => \`
                <div class="operation \${op.error ? 'error' : ''}">
                    <strong>\${op.toolName}</strong>
                    <span class="timestamp">\${new Date(op.timestamp).toLocaleTimeString()}</span>
                    <br>
                    <small>Duration: \${op.duration}ms | Correlation: \${op.correlationId.slice(-8)}</small>
                </div>
            \`).join('');
        }

        function formatDuration(ms) {
            const seconds = Math.floor(ms / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);
            
            if (days > 0) return \`\${days}d \${hours % 24}h\`;
            if (hours > 0) return \`\${hours}h \${minutes % 60}m\`;
            if (minutes > 0) return \`\${minutes}m \${seconds % 60}s\`;
            return \`\${seconds}s\`;
        }

        function toggleAutoRefresh() {
            const checkbox = document.getElementById('autoRefresh');
            if (checkbox.checked) {
                refreshInterval = setInterval(fetchData, 5000);
            } else {
                clearInterval(refreshInterval);
            }
        }

        document.getElementById('autoRefresh').addEventListener('change', toggleAutoRefresh);
        
        // Initial load
        fetchData();
        toggleAutoRefresh();
    </script>
</body>
</html>
    `;

    _res.writeHead(200, { 'Content-Type': 'text/html' });
    _res.end(html);
  }

  private serveHealth(_res: ServerResponse): void {
    // const health = healthMonitor.getLastStatus() || { status: 'unknown' };
    const health = { status: 'unknown', message: 'Health monitoring not yet implemented' };
    _res.writeHead(200, { 'Content-Type': 'application/json' });
    _res.end(JSON.stringify(health));
  }

  private serveMetrics(_res: ServerResponse): void {
    const metrics = logger.getMetrics();
    _res.writeHead(200, { 'Content-Type': 'application/json' });
    _res.end(JSON.stringify(metrics));
  }

  private serveOperations(_res: ServerResponse): void {
    _res.writeHead(200, { 'Content-Type': 'application/json' });
    _res.end(JSON.stringify(this.recentOperations));
  }

  private serveCorrelations(_res: ServerResponse, url: URL): void {
    const correlationId = url.searchParams.get('id');
    if (!correlationId) {
      _res.writeHead(400);
      _res.end('Missing correlation ID');
      return;
    }

    const logs = logger.getCorrelationLogs(correlationId);
    _res.writeHead(200, { 'Content-Type': 'application/json' });
    _res.end(JSON.stringify(logs));
  }
}

// Export singleton instance
export const dashboard = new DebugDashboard(
  parseInt(process.env.ALECS_DASHBOARD_PORT || '8080', 10),
);
