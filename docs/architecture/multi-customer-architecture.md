# Multi-Customer MCP Server Architecture for Akamai EdgeGrid

## Overview

This document outlines the architecture for an MCP (Model Context Protocol) server that supports multiple Akamai customers with account switching capabilities, customer context management, and minimal infrastructure requirements.

## Architecture Components

### 1. EdgeGrid Client Factory with Customer Switching

```typescript
// src/edgegrid/ClientFactory.ts
import EdgeGrid from 'akamai-edgegrid';
import { CustomerConfig, NetworkEnvironment } from '../types';

export class EdgeGridClientFactory {
  private static instances: Map<string, EdgeGrid> = new Map();
  
  static getClient(
    customerId: string, 
    environment: NetworkEnvironment = 'production'
  ): EdgeGrid {
    const key = `${customerId}-${environment}`;
    
    if (!this.instances.has(key)) {
      const config = CustomerConfigManager.getConfig(customerId, environment);
      const client = new EdgeGrid({
        path: config.edgercPath,
        section: config.section,
        debug: process.env.DEBUG === 'true'
      });
      
      this.instances.set(key, client);
    }
    
    return this.instances.get(key)!;
  }
  
  static clearCache(customerId?: string): void {
    if (customerId) {
      const keysToDelete = Array.from(this.instances.keys())
        .filter(key => key.startsWith(`${customerId}-`));
      keysToDelete.forEach(key => this.instances.delete(key));
    } else {
      this.instances.clear();
    }
  }
}
```

### 2. Customer Configuration Management

```typescript
// src/config/CustomerConfigManager.ts
import * as fs from 'fs';
import * as path from 'path';
import * as ini from 'ini';

export interface CustomerConfig {
  customerId: string;
  customerName: string;
  edgercPath: string;
  section: string;
  environment: NetworkEnvironment;
  capabilities: string[];
  metadata?: Record<string, any>;
}

export type NetworkEnvironment = 'production' | 'staging';

export class CustomerConfigManager {
  private static configs: Map<string, CustomerConfig[]> = new Map();
  private static configPath = process.env.MCP_CUSTOMER_CONFIG_PATH || 
    path.join(process.env.HOME || '', '.mcp', 'akamai-customers.json');
  
  static initialize(): void {
    this.loadConfigurations();
  }
  
  private static loadConfigurations(): void {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
        
        data.customers.forEach((customer: any) => {
          const configs: CustomerConfig[] = [];
          
          // Load each environment configuration
          ['production', 'staging'].forEach(env => {
            if (customer.environments[env]) {
              configs.push({
                customerId: customer.id,
                customerName: customer.name,
                edgercPath: customer.environments[env].edgercPath || 
                  path.join(process.env.HOME || '', '.edgerc'),
                section: customer.environments[env].section || `${customer.id}-${env}`,
                environment: env as NetworkEnvironment,
                capabilities: customer.capabilities || [],
                metadata: customer.metadata
              });
            }
          });
          
          this.configs.set(customer.id, configs);
        });
      }
    } catch (error) {
      console.error('Failed to load customer configurations:', error);
    }
  }
  
  static getConfig(customerId: string, environment: NetworkEnvironment): CustomerConfig {
    const customerConfigs = this.configs.get(customerId);
    if (!customerConfigs) {
      throw new Error(`Customer ${customerId} not found`);
    }
    
    const config = customerConfigs.find(c => c.environment === environment);
    if (!config) {
      throw new Error(`Environment ${environment} not configured for customer ${customerId}`);
    }
    
    return config;
  }
  
  static getAllCustomers(): string[] {
    return Array.from(this.configs.keys());
  }
  
  static validateEdgercSection(config: CustomerConfig): boolean {
    try {
      const edgerc = ini.parse(fs.readFileSync(config.edgercPath, 'utf-8'));
      return !!edgerc[config.section];
    } catch {
      return false;
    }
  }
}
```

### 3. MCP Tool Naming Convention and Structure

```typescript
// src/tools/BaseAkamaiTool.ts
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { EdgeGridClientFactory } from '../edgegrid/ClientFactory';
import { CustomerContext } from '../context/CustomerContext';

export abstract class BaseAkamaiTool implements Tool {
  abstract name: string;
  abstract description: string;
  
  protected async executeWithCustomerContext(
    params: any,
    handler: (client: any, context: CustomerContext) => Promise<any>
  ): Promise<any> {
    // Extract customer context from parameters
    const { customerId, environment = 'production', ...toolParams } = params;
    
    if (!customerId) {
      throw new Error('customerId is required for all operations');
    }
    
    // Get client and context
    const client = EdgeGridClientFactory.getClient(customerId, environment);
    const context = CustomerContextManager.getContext(customerId);
    
    // Execute tool logic with customer context
    return handler(client, context);
  }
}

// Example tool implementations
// src/tools/property/PropertyListTool.ts
export class PropertyListTool extends BaseAkamaiTool {
  name = 'property.list';
  description = 'List all properties for a customer';
  
  inputSchema = {
    type: 'object',
    properties: {
      customerId: { type: 'string', description: 'Customer identifier' },
      environment: { 
        type: 'string', 
        enum: ['production', 'staging'],
        default: 'production'
      },
      groupId: { type: 'string', description: 'Optional group filter' }
    },
    required: ['customerId']
  };
  
  async execute(params: any): Promise<any> {
    return this.executeWithCustomerContext(params, async (client, context) => {
      const response = await client.auth({
        path: '/papi/v1/properties',
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        qs: params.groupId ? { groupId: params.groupId } : {}
      });
      
      // Log to customer context
      context.logActivity('property.list', { count: response.properties.length });
      
      return response;
    });
  }
}

// src/tools/dns/DnsZoneCreateTool.ts
export class DnsZoneCreateTool extends BaseAkamaiTool {
  name = 'dns.zone.create';
  description = 'Create a new DNS zone for a customer';
  
  inputSchema = {
    type: 'object',
    properties: {
      customerId: { type: 'string' },
      environment: { type: 'string', enum: ['production', 'staging'] },
      zone: { type: 'string', description: 'Zone name (e.g., example.com)' },
      type: { type: 'string', enum: ['PRIMARY', 'SECONDARY'] },
      contractId: { type: 'string' },
      groupId: { type: 'string' }
    },
    required: ['customerId', 'zone', 'type', 'contractId']
  };
  
  async execute(params: any): Promise<any> {
    return this.executeWithCustomerContext(params, async (client, context) => {
      // Implementation here
    });
  }
}
```

### 4. Customer Context Management

```typescript
// src/context/CustomerContext.ts
export class CustomerContext {
  private customerId: string;
  private sessionData: Map<string, any> = new Map();
  private activityLog: ActivityLog[] = [];
  
  constructor(customerId: string) {
    this.customerId = customerId;
  }
  
  // Store customer-specific session data
  setData(key: string, value: any): void {
    this.sessionData.set(key, value);
  }
  
  getData(key: string): any {
    return this.sessionData.get(key);
  }
  
  // Activity logging for audit trail
  logActivity(action: string, details: any): void {
    this.activityLog.push({
      timestamp: new Date(),
      action,
      details,
      customerId: this.customerId
    });
  }
  
  getRecentActivity(limit: number = 10): ActivityLog[] {
    return this.activityLog.slice(-limit);
  }
  
  clear(): void {
    this.sessionData.clear();
    this.activityLog = [];
  }
}

interface ActivityLog {
  timestamp: Date;
  action: string;
  details: any;
  customerId: string;
}

// src/context/CustomerContextManager.ts
export class CustomerContextManager {
  private static contexts: Map<string, CustomerContext> = new Map();
  
  static getContext(customerId: string): CustomerContext {
    if (!this.contexts.has(customerId)) {
      this.contexts.set(customerId, new CustomerContext(customerId));
    }
    return this.contexts.get(customerId)!;
  }
  
  static clearContext(customerId: string): void {
    const context = this.contexts.get(customerId);
    if (context) {
      context.clear();
      this.contexts.delete(customerId);
    }
  }
  
  static getAllActiveContexts(): string[] {
    return Array.from(this.contexts.keys());
  }
}
```

### 5. MCP Server Implementation

```typescript
// src/AkamaiMCPServer.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CustomerConfigManager } from './config/CustomerConfigManager';
import { PropertyListTool } from './tools/property/PropertyListTool';
import { DnsZoneCreateTool } from './tools/dns/DnsZoneCreateTool';
import { NetworkListAddTool } from './tools/networklist/NetworkListAddTool';
import { CertificateProvisionDVTool } from './tools/certificate/CertificateProvisionDVTool';

export class AkamaiMCPServer {
  private server: Server;
  private tools: Map<string, BaseAkamaiTool> = new Map();
  
  constructor() {
    this.server = new Server({
      name: 'alecs-mcp-server-akamai',
      version: '1.0.0'
    }, {
      capabilities: {
        tools: {}
      }
    });
    
    this.initializeTools();
    this.setupHandlers();
  }
  
  private initializeTools(): void {
    // Initialize customer configurations
    CustomerConfigManager.initialize();
    
    // Register tools
    const toolInstances = [
      new PropertyListTool(),
      new DnsZoneCreateTool(),
      new NetworkListAddTool(),
      new CertificateProvisionDVTool(),
      // Add more tools as needed
    ];
    
    toolInstances.forEach(tool => {
      this.tools.set(tool.name, tool);
    });
  }
  
  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler('tools/list', async () => {
      return {
        tools: Array.from(this.tools.values()).map(tool => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema
        }))
      };
    });
    
    // Execute tool
    this.server.setRequestHandler('tools/call', async (request) => {
      const { name, arguments: args } = request.params;
      const tool = this.tools.get(name);
      
      if (!tool) {
        throw new Error(`Tool ${name} not found`);
      }
      
      try {
        const result = await tool.execute(args);
        return { result };
      } catch (error) {
        return {
          error: {
            code: 'TOOL_EXECUTION_ERROR',
            message: error.message
          }
        };
      }
    });
    
    // Customer management endpoints
    this.server.setRequestHandler('customers/list', async () => {
      return {
        customers: CustomerConfigManager.getAllCustomers()
      };
    });
    
    this.server.setRequestHandler('customers/switch', async (request) => {
      const { customerId } = request.params;
      // Validate customer exists
      CustomerConfigManager.getConfig(customerId, 'production');
      return { success: true, customerId };
    });
  }
  
  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Akamai MCP Server started');
  }
}

// src/index.ts
import { AkamaiMCPServer } from './AkamaiMCPServer';

const server = new AkamaiMCPServer();
server.start().catch(console.error);
```

## Configuration Files

### Customer Configuration Example

```json
{
  "customers": [
    {
      "id": "customer-abc",
      "name": "ABC Corporation",
      "environments": {
        "production": {
          "edgercPath": "/Users/user/.edgerc",
          "section": "abc-prod"
        },
        "staging": {
          "edgercPath": "/Users/user/.edgerc",
          "section": "abc-staging"
        }
      },
      "capabilities": ["property", "dns", "certificate", "networklist"],
      "metadata": {
        "contractId": "C-123456",
        "groupId": "grp_123456"
      }
    },
    {
      "id": "customer-xyz",
      "name": "XYZ Industries",
      "environments": {
        "production": {
          "section": "xyz-prod"
        }
      },
      "capabilities": ["property", "dns"],
      "metadata": {
        "contractId": "C-789012"
      }
    }
  ]
}
```

### .edgerc File Structure

```ini
[abc-prod]
client_secret = abc_prod_secret
host = akab-abc-prod.luna.akamaiapis.net
access_token = akab-abc-prod-token
client_token = akab-abc-prod-client

[abc-staging]
client_secret = abc_staging_secret
host = akab-abc-staging.luna.akamaiapis.net
access_token = akab-abc-staging-token
client_token = akab-abc-staging-client

[xyz-prod]
client_secret = xyz_prod_secret
host = akab-xyz-prod.luna.akamaiapis.net
access_token = akab-xyz-prod-token
client_token = akab-xyz-prod-client
```

## Usage Examples

### 1. List Properties for a Customer

```javascript
// Request
{
  "method": "tools/call",
  "params": {
    "name": "property.list",
    "arguments": {
      "customerId": "customer-abc",
      "environment": "production"
    }
  }
}
```

### 2. Create DNS Zone with Customer Context

```javascript
// Request
{
  "method": "tools/call",
  "params": {
    "name": "dns.zone.create",
    "arguments": {
      "customerId": "customer-xyz",
      "environment": "staging",
      "zone": "example.com",
      "type": "PRIMARY",
      "contractId": "C-789012"
    }
  }
}
```

### 3. Switch Customer Context

```javascript
// Request
{
  "method": "customers/switch",
  "params": {
    "customerId": "customer-abc"
  }
}
```

## State Management

### Per-Customer State

- **Session Data**: Temporary data stored per customer session
- **Activity Logs**: Audit trail of all operations per customer
- **Cache Management**: EdgeGrid client instances cached per customer/environment
- **Context Isolation**: Each customer has isolated context preventing cross-contamination

### State Persistence

For production deployments, consider implementing:

1. **Redis/Memory Cache**: For session data and temporary state
2. **File-based Storage**: For activity logs and audit trails
3. **Database**: For long-term storage of customer configurations and history

## Security Considerations

1. **Credential Isolation**: Each customer's credentials are stored in separate .edgerc sections
2. **Access Control**: Implement authentication/authorization at the MCP server level
3. **Audit Logging**: All operations are logged with customer context
4. **Environment Separation**: Clear distinction between staging and production environments
5. **Credential Validation**: Validate .edgerc sections exist before attempting operations

## Deployment

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
CMD ["node", "dist/index.js"]
```

### Environment Variables

```bash
# Required
MCP_CUSTOMER_CONFIG_PATH=/path/to/customers.json

# Optional
DEBUG=true
LOG_LEVEL=info
PORT=3000
```

## Monitoring and Observability

1. **Metrics**: Track API calls per customer, error rates, response times
2. **Logging**: Structured logging with customer context
3. **Health Checks**: Endpoint to verify server and customer configurations
4. **Alerts**: Set up alerts for failed operations or invalid configurations

## Future Enhancements

1. **Dynamic Customer Loading**: Hot-reload customer configurations without restart
2. **Rate Limiting**: Per-customer rate limiting based on contract terms
3. **Caching Strategy**: Implement intelligent caching for frequently accessed resources
4. **Webhook Support**: Notify external systems of customer operations
5. **Multi-region Support**: Handle customers across different Akamai regions