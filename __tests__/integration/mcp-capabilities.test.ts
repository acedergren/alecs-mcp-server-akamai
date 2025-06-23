/**
 * MCP Capabilities Integration Test Suite
 * Tests the alecs-full MCP server capabilities through the MCP protocol
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';
import * as path from 'path';

describe('ALECS Full MCP Server Capabilities', () => {
  let client: Client;
  let transport: StdioClientTransport;
  let serverProcess: any;

  beforeAll(async () => {
    // Start the MCP server process
    const serverPath = path.join(__dirname, '../../dist/index-full.js');
    serverProcess = spawn('node', [serverPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        NODE_ENV: 'test',
      },
    });

    // Create transport and client
    transport = new StdioClientTransport({
      command: 'node',
      args: [serverPath],
    });

    client = new Client({
      name: 'test-client',
      version: '1.0.0',
    }, {
      capabilities: {}
    });

    // Connect to server
    await client.connect(transport);

    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    // Disconnect and cleanup
    await client.close();
    serverProcess?.kill();
  });

  describe('Server Information', () => {
    test('should provide server information', async () => {
      const serverInfo = await client.getServerInformation();
      
      expect(serverInfo).toBeDefined();
      expect(serverInfo.name).toBe('alecs-mcp-server-akamai-full');
      expect(serverInfo.version).toBe('1.4.0');
      expect(serverInfo.capabilities).toBeDefined();
      expect(serverInfo.capabilities.tools).toBeDefined();
    });
  });

  describe('Tool Discovery', () => {
    test('should list all available tools', async () => {
      const tools = await client.listTools();
      
      expect(tools).toBeDefined();
      expect(Array.isArray(tools.tools)).toBe(true);
      expect(tools.tools.length).toBeGreaterThan(150); // Full server has 180+ tools
      
      // Check for key tools
      const toolNames = tools.tools.map(t => t.name);
      expect(toolNames).toContain('list-properties');
      expect(toolNames).toContain('create-zone');
      expect(toolNames).toContain('list-contracts');
      expect(toolNames).toContain('domain-assistant');
      expect(toolNames).toContain('workflow-assistant');
    });

    test('should provide proper tool schemas', async () => {
      const tools = await client.listTools();
      
      // Check schema structure for a specific tool
      const listPropertiesTool = tools.tools.find(t => t.name === 'list-properties');
      expect(listPropertiesTool).toBeDefined();
      expect(listPropertiesTool?.inputSchema).toBeDefined();
      expect(listPropertiesTool?.inputSchema.type).toBe('object');
      expect(listPropertiesTool?.inputSchema.properties).toBeDefined();
    });
  });

  describe('Property Management Tools', () => {
    test('should list contracts', async () => {
      const result = await client.callTool('list-contracts', {});
      
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0].type).toBe('text');
      
      const content = result.content[0].text;
      expect(content).toContain('Contract');
      expect(content).toContain('AKAMAI_INTERNAL');
    });

    test('should list properties with filters', async () => {
      const result = await client.callTool('list-properties', {
        contractId: 'ctr_1-5C13O2',
      });
      
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      const content = result.content[0].text;
      expect(content).toMatch(/Properties|No properties found/);
    });

    test('should handle property creation parameters', async () => {
      // Test parameter validation without actually creating
      try {
        await client.callTool('create-property', {
          // Missing required parameters
        });
      } catch (error: any) {
        expect(error.message).toContain('Invalid parameters');
      }
    });
  });

  describe('DNS Management Tools', () => {
    test('should list DNS zones', async () => {
      const result = await client.callTool('list-zones', {});
      
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      const content = result.content[0].text;
      expect(content).toMatch(/zones|No zones found/);
    });

    test('should validate zone creation parameters', async () => {
      try {
        await client.callTool('create-zone', {
          zone: 'example.com',
          type: 'invalid-type', // Invalid type
          contractId: 'ctr_1-5C13O2',
        });
      } catch (error: any) {
        expect(error.message).toContain('Invalid parameters');
      }
    });

    test('should validate DNS record creation', async () => {
      try {
        await client.callTool('create-record', {
          zone: 'example.com',
          name: 'test',
          type: 'A',
          ttl: 300,
          // Missing rdata
        });
      } catch (error: any) {
        expect(error.message).toContain('Invalid parameters');
      }
    });
  });

  describe('Workflow Assistant Tools', () => {
    test('should handle domain assistant requests', async () => {
      const result = await client.callTool('domain-assistant', {
        intent: 'onboard example.com',
        domain: 'example.com',
      });
      
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      const content = result.content[0].text;
      expect(content).toContain('example.com');
    });

    test('should handle workflow assistant requests', async () => {
      const result = await client.callTool('workflow-assistant', {
        intent: 'list all my properties',
      });
      
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('should handle non-existent tools gracefully', async () => {
      try {
        await client.callTool('non-existent-tool', {});
      } catch (error: any) {
        expect(error.code).toBe(-32601); // Method not found
        expect(error.message).toContain('Tool not found');
      }
    });

    test('should handle invalid parameters gracefully', async () => {
      try {
        await client.callTool('list-properties', {
          invalidParam: 'test',
        });
      } catch (error: any) {
        expect(error.code).toBe(-32602); // Invalid params
      }
    });

    test('should handle customer context errors', async () => {
      try {
        await client.callTool('list-properties', {
          customer: 'non-existent-customer',
        });
      } catch (error: any) {
        expect(error.message).toContain('Customer section');
      }
    });
  });

  describe('MCP 2025 Compliance', () => {
    test('should include metadata in responses', async () => {
      const result = await client.callTool('list-contracts', {});
      const content = result.content[0].text;
      
      // Check if response includes metadata (when present)
      if (content.includes('_meta')) {
        const metaMatch = content.match(/_meta:.*?({.*?})/s);
        if (metaMatch) {
          const meta = JSON.parse(metaMatch[1]);
          expect(meta).toHaveProperty('timestamp');
          expect(meta).toHaveProperty('duration');
          expect(meta).toHaveProperty('version');
          expect(meta).toHaveProperty('tool');
        }
      }
    });
  });

  describe('Performance and Concurrency', () => {
    test('should handle concurrent tool calls', async () => {
      const promises = [
        client.callTool('list-contracts', {}),
        client.callTool('list-properties', {}),
        client.callTool('list-zones', {}),
      ];
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.content).toBeDefined();
      });
    });

    test('should track request IDs', async () => {
      const result1 = await client.callTool('list-contracts', {});
      const result2 = await client.callTool('list-contracts', {});
      
      // If metadata is included, request IDs should be different
      const content1 = result1.content[0].text;
      const content2 = result2.content[0].text;
      
      if (content1.includes('requestId') && content2.includes('requestId')) {
        expect(content1).not.toBe(content2);
      }
    });
  });

  describe('Tool Categories Coverage', () => {
    test('should have property management tools', async () => {
      const tools = await client.listTools();
      const propertyTools = tools.tools.filter(t => 
        t.name.includes('property') || 
        t.name.includes('contract') || 
        t.name.includes('group')
      );
      
      expect(propertyTools.length).toBeGreaterThan(20);
    });

    test('should have DNS management tools', async () => {
      const tools = await client.listTools();
      const dnsTools = tools.tools.filter(t => 
        t.name.includes('zone') || 
        t.name.includes('record') || 
        t.name.includes('dns')
      );
      
      expect(dnsTools.length).toBeGreaterThan(15);
    });

    test('should have certificate management tools', async () => {
      const tools = await client.listTools();
      const certTools = tools.tools.filter(t => 
        t.name.includes('certificate') || 
        t.name.includes('enrollment') || 
        t.name.includes('dv')
      );
      
      expect(certTools.length).toBeGreaterThan(10);
    });

    test('should have security tools', async () => {
      const tools = await client.listTools();
      const securityTools = tools.tools.filter(t => 
        t.name.includes('security') || 
        t.name.includes('waf') || 
        t.name.includes('appsec') ||
        t.name.includes('network-list')
      );
      
      expect(securityTools.length).toBeGreaterThan(15);
    });

    test('should have performance and reporting tools', async () => {
      const tools = await client.listTools();
      const perfTools = tools.tools.filter(t => 
        t.name.includes('performance') || 
        t.name.includes('report') || 
        t.name.includes('metric') ||
        t.name.includes('traffic')
      );
      
      expect(perfTools.length).toBeGreaterThan(10);
    });
  });
});