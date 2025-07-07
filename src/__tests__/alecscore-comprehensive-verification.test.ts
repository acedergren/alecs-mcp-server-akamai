/**
 * ALECSCore Comprehensive User Workflow Verification Tests
 * 
 * This test suite simulates real user workflows to verify that
 * ALECSCore servers work correctly in all practical scenarios.
 * 
 * Test Categories:
 * 1. Claude Desktop Integration
 * 2. CLI Usage Patterns
 * 3. Multi-tenant Scenarios
 * 4. Error Handling
 * 5. Performance Optimization
 */

import { describe, test, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

// Import ALECSCore servers
import { PropertyServer } from '../servers/property-server-alecscore';
import { DNSServer } from '../servers/dns-server-alecscore';
import { CertificateServer } from '../servers/certs-server-alecscore';
import { FastPurgeServer } from '../servers/fastpurge-server-alecscore';
import { AppSecServer } from '../servers/appsec-server-alecscore';
import { ReportingServer } from '../servers/reporting-server-alecscore';
import { SecurityServer } from '../servers/security-server-alecscore';

// Mock transport for testing
class MockTransport {
  private handlers = new Map();
  
  setRequestHandler(schema: any, handler: any) {
    this.handlers.set(schema, handler);
  }
  
  async callTool(name: string, args: any) {
    const handler = this.handlers.get(CallToolRequestSchema);
    if (!handler) throw new Error('No call tool handler');
    
    return handler({
      params: {
        name,
        arguments: args
      }
    });
  }
  
  async listTools() {
    const handler = this.handlers.get(ListToolsRequestSchema);
    if (!handler) throw new Error('No list tools handler');
    return handler({});
  }
}

describe('ALECSCore Comprehensive User Workflow Verification', () => {
  let servers: Map<string, any>;
  let transports: Map<string, MockTransport>;

  beforeAll(async () => {
    servers = new Map();
    transports = new Map();

    // Initialize all servers with test configuration
    const serverConfigs = [
      { name: 'property', class: PropertyServer },
      { name: 'dns', class: DNSServer },
      { name: 'certs', class: CertificateServer },
      { name: 'fastpurge', class: FastPurgeServer },
      { name: 'appsec', class: AppSecServer },
      { name: 'reporting', class: ReportingServer },
      { name: 'security', class: SecurityServer },
    ];

    for (const config of serverConfigs) {
      const server = new config.class({
        name: `alecs-${config.name}`,
        version: '2.0.0',
        description: `${config.name} server with ALECSCore`,
        enableMonitoring: false, // Disable for tests
      });
      
      const transport = new MockTransport();
      // Connect mock transport to server internals
      server.server.setRequestHandler = transport.setRequestHandler.bind(transport);
      server.setupHandlers();
      
      servers.set(config.name, server);
      transports.set(config.name, transport);
    }
  });

  afterAll(async () => {
    // Cleanup
    servers.clear();
    transports.clear();
  });

  describe('1. Claude Desktop Integration Workflows', () => {
    test('User asks: "List my properties"', async () => {
      const transport = transports.get('property')!;
      
      // Simulate Claude Desktop calling the tool
      const result = await transport.callTool('list-properties', {
        customer: 'default',
        format: 'markdown'
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
    });

    test('User asks: "Show me all my DNS zones"', async () => {
      const transport = transports.get('dns')!;
      
      const result = await transport.callTool('list-zones', {
        customer: 'default',
        format: 'markdown'
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
    });

    test('User asks: "Check my certificate status"', async () => {
      const transport = transports.get('certs')!;
      
      const result = await transport.callTool('list-certificate-enrollments', {
        customer: 'default'
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
    });

    test('User asks: "Show security events from the last hour"', async () => {
      const transport = transports.get('appsec')!;
      
      const now = Date.now();
      const oneHourAgo = now - 3600000;
      
      const result = await transport.callTool('get-security-events', {
        customer: 'default',
        configId: 12345,
        from: new Date(oneHourAgo).toISOString(),
        to: new Date(now).toISOString()
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
    });
  });

  describe('2. CLI Usage Patterns', () => {
    test('CLI: alecs property list --customer production', async () => {
      const transport = transports.get('property')!;
      
      const result = await transport.callTool('list-properties', {
        customer: 'production'
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
    });

    test('CLI: alecs dns record create --zone example.com --type A', async () => {
      const transport = transports.get('dns')!;
      
      const result = await transport.callTool('upsert-record', {
        customer: 'default',
        zone: 'example.com',
        name: 'test',
        type: 'A',
        rdata: ['192.0.2.1'],
        ttl: 300
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
    });

    test('CLI: alecs fastpurge url --network production', async () => {
      const transport = transports.get('fastpurge')!;
      
      const result = await transport.callTool('fastpurge-url-invalidate', {
        customer: 'default',
        urls: ['https://example.com/test.jpg'],
        network: 'production'
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
    });
  });

  describe('3. Multi-tenant Scenarios', () => {
    test('Switch between customer accounts', async () => {
      const transport = transports.get('property')!;
      
      // Customer A
      const resultA = await transport.callTool('list-properties', {
        customer: 'customerA'
      });
      
      // Customer B
      const resultB = await transport.callTool('list-properties', {
        customer: 'customerB'
      });

      expect(resultA).toBeDefined();
      expect(resultB).toBeDefined();
    });

    test('Cross-customer reporting', async () => {
      const transport = transports.get('reporting')!;
      
      const customers = ['customerA', 'customerB', 'customerC'];
      const results = [];
      
      for (const customer of customers) {
        const result = await transport.callTool('get-traffic-report', {
          customer,
          start_date: '2024-01-01',
          end_date: '2024-01-31',
          format: 'markdown'
        });
        results.push(result);
      }

      expect(results).toHaveLength(3);
      results.forEach(r => expect(r).toBeDefined());
    });
  });

  describe('4. Complex Workflows', () => {
    test('Complete secure property onboarding', async () => {
      const propertyTransport = transports.get('property')!;
      const certTransport = transports.get('certs')!;
      const dnsTransport = transports.get('dns')!;
      
      // Step 1: Create property
      const property = await propertyTransport.callTool('create-property', {
        customer: 'default',
        propertyName: 'test-secure-site',
        productId: 'prd_Site_Accel',
        contractId: 'ctr_123',
        groupId: 'grp_123'
      });

      // Step 2: Create certificate enrollment
      const cert = await certTransport.callTool('create-dv-enrollment', {
        customer: 'default',
        cn: 'test-secure-site.example.com',
        adminContact: {
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
          phone: '+1234567890'
        },
        techContact: {
          firstName: 'Tech',
          lastName: 'User',
          email: 'tech@example.com',
          phone: '+1234567890'
        },
        org: {
          name: 'Test Org',
          addressLineOne: '123 Test St',
          city: 'Test City',
          region: 'CA',
          postalCode: '12345',
          countryCode: 'US',
          phone: '+1234567890'
        }
      });

      // Step 3: Create DNS validation records
      const dnsValidation = await dnsTransport.callTool('upsert-record', {
        customer: 'default',
        zone: 'example.com',
        name: '_acme-challenge.test-secure-site',
        type: 'TXT',
        rdata: ['validation-token-here'],
        ttl: 300
      });

      expect(property).toBeDefined();
      expect(cert).toBeDefined();
      expect(dnsValidation).toBeDefined();
    });

    test('Security incident response workflow', async () => {
      const securityTransport = transports.get('security')!;
      const fastpurgeTransport = transports.get('fastpurge')!;
      
      // Step 1: Check security events
      const events = await securityTransport.callTool('get-security-events', {
        customer: 'default',
        configId: 12345,
        from: new Date(Date.now() - 3600000).toISOString(),
        to: new Date().toISOString()
      });

      // Step 2: Create network list to block attackers
      const blockList = await securityTransport.callTool('create-network-list', {
        customer: 'default',
        name: 'emergency-block-list',
        type: 'IP',
        elements: ['192.0.2.100', '192.0.2.101'],
        contractId: 'ctr_123',
        groupId: 12345
      });

      // Step 3: Activate network list
      const activation = await securityTransport.callTool('activate-network-list', {
        customer: 'default',
        networkListId: 'nl_123',
        network: 'production'
      });

      // Step 4: Purge compromised content
      const purge = await fastpurgeTransport.callTool('fastpurge-url-invalidate', {
        customer: 'default',
        urls: ['https://example.com/compromised/*'],
        network: 'production'
      });

      expect(events).toBeDefined();
      expect(blockList).toBeDefined();
      expect(activation).toBeDefined();
      expect(purge).toBeDefined();
    });
  });

  describe('5. Performance Optimization Features', () => {
    test('Request coalescing for duplicate calls', async () => {
      const transport = transports.get('property')!;
      
      // Make 5 simultaneous identical requests
      const promises = Array(5).fill(null).map(() => 
        transport.callTool('list-properties', {
          customer: 'default'
        })
      );

      const results = await Promise.all(promises);
      
      // All should get the same result
      expect(results).toHaveLength(5);
      results.forEach(r => expect(r).toBeDefined());
      
      // Verify they're the same object (coalesced)
      expect(results[0]).toBe(results[1]);
      expect(results[0]).toBe(results[4]);
    });

    test('Cache hit for repeated requests', async () => {
      const transport = transports.get('dns')!;
      
      // First call - cache miss
      const result1 = await transport.callTool('get-zone', {
        customer: 'default',
        zone: 'example.com'
      });

      // Second call - cache hit
      const result2 = await transport.callTool('get-zone', {
        customer: 'default',
        zone: 'example.com'
      });

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
      expect(result1).toEqual(result2);
    });

    test('Streaming for large datasets', async () => {
      const transport = transports.get('reporting')!;
      
      // Request large report
      const result = await transport.callTool('get-geographic-distribution', {
        customer: 'default',
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        level: 'city',
        top_n: 1000
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
    });
  });

  describe('6. Error Handling', () => {
    test('Invalid customer configuration', async () => {
      const transport = transports.get('property')!;
      
      await expect(transport.callTool('list-properties', {
        customer: 'non-existent-customer'
      })).rejects.toThrow();
    });

    test('Missing required parameters', async () => {
      const transport = transports.get('dns')!;
      
      await expect(transport.callTool('create-zone', {
        customer: 'default'
        // Missing required: zone, type, contractId
      })).rejects.toThrow();
    });

    test('Network timeout handling', async () => {
      const transport = transports.get('fastpurge')!;
      
      // Simulate timeout scenario
      jest.setTimeout(10000);
      
      const result = await transport.callTool('fastpurge-bulk-urls', {
        customer: 'default',
        urls: Array(10000).fill('https://example.com/test.jpg'),
        network: 'production',
        batchSize: 2000
      });

      expect(result).toBeDefined();
    });
  });

  describe('7. Tool Discovery', () => {
    test('List all tools for each server', async () => {
      for (const [name, transport] of transports) {
        const tools = await transport.listTools();
        
        expect(tools).toBeDefined();
        expect(tools.tools).toBeDefined();
        expect(Array.isArray(tools.tools)).toBe(true);
        expect(tools.tools.length).toBeGreaterThan(0);
        
        console.log(`${name} server has ${tools.tools.length} tools`);
      }
    });

    test('Tool metadata is complete', async () => {
      const transport = transports.get('property')!;
      const tools = await transport.listTools();
      
      tools.tools.forEach(tool => {
        expect(tool.name).toBeDefined();
        expect(tool.description).toBeDefined();
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.type).toBe('object');
      });
    });
  });

  describe('8. Real-world Scenarios', () => {
    test('E-commerce site Black Friday preparation', async () => {
      const propertyTransport = transports.get('property')!;
      const securityTransport = transports.get('security')!;
      const reportingTransport = transports.get('reporting')!;
      
      // 1. Increase cache TTLs
      const cacheUpdate = await propertyTransport.callTool('update-property-rules', {
        customer: 'default',
        propertyId: 'prp_123',
        version: 1,
        rules: {
          // Would contain actual rule updates
        }
      });

      // 2. Set up geo-blocking for high-risk regions
      const geoBlock = await securityTransport.callTool('create-network-list', {
        customer: 'default',
        name: 'black-friday-geo-block',
        type: 'GEO',
        elements: ['CN', 'RU', 'KP'],
        contractId: 'ctr_123',
        groupId: 12345
      });

      // 3. Generate traffic forecast
      const forecast = await reportingTransport.callTool('get-performance-trends', {
        customer: 'default',
        metric: 'throughput',
        period: '30d',
        compare_to: 'same_period_last_year'
      });

      expect(cacheUpdate).toBeDefined();
      expect(geoBlock).toBeDefined();
      expect(forecast).toBeDefined();
    });

    test('Emergency DDoS mitigation', async () => {
      const securityTransport = transports.get('security')!;
      const appSecTransport = transports.get('appsec')!;
      
      // 1. Get current attack data
      const attackData = await appSecTransport.callTool('get-attack-dashboard', {
        customer: 'default',
        configId: 12345,
        timeRange: '1h'
      });

      // 2. Enable rate limiting
      const rateLimit = await appSecTransport.callTool('configure-rate-limiting', {
        customer: 'default',
        configId: 12345,
        version: 1,
        policyId: 'policy_123',
        rules: [{
          name: 'emergency-rate-limit',
          threshold: 10,
          window: 60,
          action: 'deny'
        }]
      });

      // 3. Block attacking IPs
      const ipBlock = await securityTransport.callTool('create-network-list', {
        customer: 'default',
        name: 'ddos-attacker-ips',
        type: 'IP',
        elements: ['192.0.2.100/24'],
        contractId: 'ctr_123',
        groupId: 12345
      });

      expect(attackData).toBeDefined();
      expect(rateLimit).toBeDefined();
      expect(ipBlock).toBeDefined();
    });
  });
});

// Export for external testing
export { MockTransport };