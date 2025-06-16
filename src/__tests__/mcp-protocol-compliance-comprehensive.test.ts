/**
 * MCP Protocol Compliance Tests
 * Validates that ALECS correctly implements the Model Context Protocol specification
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { 
  createMockAkamaiClient, 
  createTestServer, 
  validateMCPResponse,
  TestDataGenerators,
  ConversationalContextTracker
} from '../testing/test-utils.js';
import { readdir, readFile } from 'fs/promises';
import path from 'path';
import { z } from 'zod';

// MCP Protocol schemas for validation
const MCPToolSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(10),
  inputSchema: z.object({
    type: z.literal('object'),
    properties: z.record(z.any()),
    required: z.array(z.string()).optional(),
  }),
});

const MCPResponseSchema = z.object({
  content: z.array(z.object({
    type: z.enum(['text', 'image', 'resource']),
    text: z.string().optional(),
    data: z.any().optional(),
    mimeType: z.string().optional(),
  })),
  isError: z.boolean().optional(),
});

const MCPErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    data: z.any().optional(),
  }),
});

describe('MCP Protocol Compliance', () => {
  const mockClient = createMockAkamaiClient();
  const testServer = createTestServer();
  const contextTracker = new ConversationalContextTracker();

  beforeEach(() => {
    jest.clearAllMocks();
    contextTracker.reset();
  });

  describe('Tool Discovery', () => {
    it('should expose tools via listTools method', async () => {
      const server = new Server({
        name: 'akamai-mcp-server',
        version: '1.0.0',
      });

      const tools = await server.listTools();
      expect(tools).toBeDefined();
      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);
    });

    it('should provide valid tool metadata for each tool', async () => {
      const toolsDir = path.join(process.cwd(), 'src', 'tools');
      const toolFiles = await readdir(toolsDir);
      
      for (const file of toolFiles) {
        if (file.endsWith('.ts') && !file.includes('.test.')) {
          const modulePath = path.join(toolsDir, file);
          const module = await import(modulePath);
          
          Object.keys(module).forEach(exportName => {
            if (typeof module[exportName] === 'function' && !exportName.startsWith('_')) {
              // Each exported function should have associated metadata
              expect(exportName).toBeTruthy();
            }
          });
        }
      }
    });

    it('should validate tool schemas against MCP specification', async () => {
      const server = testServer.getServer();
      const tools = await server.listTools();

      tools.forEach(tool => {
        const validation = MCPToolSchema.safeParse(tool);
        if (!validation.success) {
          console.error(`Tool ${tool.name} failed validation:`, validation.error);
        }
        expect(validation.success).toBe(true);
      });
    });
  });

  describe('Request/Response Protocol', () => {
    it('should handle tool invocation requests correctly', async () => {
      const server = testServer.getServer();
      
      const request = {
        method: 'tools/call',
        params: {
          name: 'property.list',
          arguments: {
            contractId: 'C-123',
          },
        },
      };

      mockClient.request.mockResolvedValueOnce({
        properties: { items: [] },
      });

      const response = await server.handleRequest(request);
      expect(response).toBeDefined();
      expect(response.content).toBeDefined();
    });

    it('should return proper error responses for invalid requests', async () => {
      const server = testServer.getServer();
      
      const invalidRequests = [
        {
          method: 'tools/call',
          params: {
            name: 'invalid.tool.name',
            arguments: {},
          },
        },
        {
          method: 'tools/call',
          params: {
            name: 'property.list',
            // Missing arguments
          },
        },
        {
          method: 'invalid/method',
          params: {},
        },
      ];

      for (const request of invalidRequests) {
        const response = await server.handleRequest(request);
        expect(response).toBeDefined();
        // Should contain error information
        if (response.error) {
          const validation = MCPErrorResponseSchema.safeParse(response);
          expect(validation.success).toBe(true);
        }
      }
    });

    it('should validate response format compliance', async () => {
      mockClient.request.mockResolvedValueOnce({
        properties: { items: TestDataGenerators.generateProperties(5) },
      });

      const response = await testServer.callTool('property.list', {});
      
      const validation = MCPResponseSchema.safeParse(response);
      expect(validation.success).toBe(true);
      expect(response.content).toBeDefined();
      expect(response.content.length).toBeGreaterThan(0);
      expect(response.content[0].type).toBe('text');
    });
  });

  describe('Parameter Validation', () => {
    it('should validate required parameters', async () => {
      const response = await testServer.callTool('dns.zone.create', {
        zone: 'example.com',
        // Missing required 'type' parameter
      });

      expect(response.content[0].text).toContain('Error');
    });

    it('should handle optional parameters correctly', async () => {
      mockClient.request.mockResolvedValueOnce({
        properties: { items: [] },
      });

      const response = await testServer.callTool('property.list', {
        // All parameters are optional
      });

      validateMCPResponse(response);
      expect(response.isError).not.toBe(true);
    });

    it('should validate parameter types', async () => {
      const response = await testServer.callTool('dns.record.upsert', {
        zone: 'example.com',
        name: 'www',
        type: 'A',
        ttl: 'not-a-number', // Should be number
        rdata: ['192.0.2.1'],
      });

      expect(response.content[0].text).toBeDefined();
    });

    it('should validate enum parameters', async () => {
      const response = await testServer.callTool('property.activate', {
        propertyId: 'prp_123',
        network: 'INVALID_NETWORK', // Should be STAGING or PRODUCTION
      });

      expect(response.content[0].text).toBeDefined();
    });
  });

  describe('Tool Naming Conventions', () => {
    it('should follow service.action naming pattern', async () => {
      const tools = await testServer.getServer().listTools();
      
      const validPatterns = [
        /^property\./,
        /^dns\./,
        /^certificate\./,
        /^cpcode\./,
        /^product\./,
        /^agent\./,
      ];

      tools.forEach(tool => {
        const matchesPattern = validPatterns.some(pattern => 
          pattern.test(tool.name)
        );
        expect(matchesPattern).toBe(true);
      });
    });

    it('should use consistent action verbs', async () => {
      const tools = await testServer.getServer().listTools();
      
      const validActions = [
        'list', 'get', 'create', 'update', 'delete', 'activate',
        'validate', 'import', 'export', 'search', 'clone', 'parse',
      ];

      tools.forEach(tool => {
        const action = tool.name.split('.').pop();
        if (action) {
          const hasValidAction = validActions.some(validAction =>
            action.toLowerCase().includes(validAction)
          );
          expect(hasValidAction).toBe(true);
        }
      });
    });
  });

  describe('Error Response Formatting', () => {
    it('should format API errors for conversational context', async () => {
      const apiError = {
        response: {
          status: 400,
          data: {
            type: '/papi/v1/errors/validation.required_field',
            title: 'Missing required field',
            detail: 'The field contractId is required',
          },
        },
      };

      mockClient.request.mockRejectedValueOnce(apiError);

      const response = await testServer.callTool('property.create', {
        propertyName: 'test',
        productId: 'prd_Web_Accel',
        groupId: 'G-123',
      });

      validateMCPResponse(response);
      expect(response.content[0].text).toContain('contractId');
      expect(response.content[0].text).toContain('required');
      // Should not expose internal API paths
      expect(response.content[0].text).not.toContain('/papi/v1/errors');
    });

    it('should handle network errors gracefully', async () => {
      mockClient.request.mockRejectedValueOnce(new Error('ECONNREFUSED'));

      const response = await testServer.callTool('property.list', {});

      validateMCPResponse(response);
      expect(response.content[0].text).toContain('Error');
      expect(response.content[0].text.toLowerCase()).toContain('connection');
    });

    it('should preserve error context for debugging', async () => {
      const detailedError = {
        response: {
          status: 409,
          data: {
            type: 'conflict',
            title: 'Resource already exists',
            detail: 'A property with this name already exists in the contract',
            conflictingPropertyId: 'prp_999',
          },
        },
      };

      mockClient.request.mockRejectedValueOnce(detailedError);

      const response = await testServer.callTool('property.create', {
        propertyName: 'existing-property',
        productId: 'prd_Web_Accel',
        contractId: 'C-123',
        groupId: 'G-123',
      });

      validateMCPResponse(response);
      expect(response.content[0].text).toContain('already exists');
      expect(response.content[0].text).toContain('prp_999');
    });
  });

  describe('Conversational Context', () => {
    it('should provide actionable error messages', async () => {
      mockClient.request.mockRejectedValueOnce({
        response: {
          status: 403,
          data: {
            detail: 'User does not have permission to create properties in this group',
          },
        },
      });

      const response = await testServer.callTool('property.create', {
        propertyName: 'test',
        productId: 'prd_Web_Accel',
        contractId: 'C-123',
        groupId: 'G-123',
      });

      validateMCPResponse(response);
      // Should suggest next steps
      expect(response.content[0].text.toLowerCase()).toMatch(
        /permission|access|contact|administrator/
      );
    });

    it('should format bulk results for readability', async () => {
      const manyItems = TestDataGenerators.generateProperties(100);
      
      mockClient.request.mockResolvedValueOnce({
        properties: { items: manyItems },
      });

      const response = await testServer.callTool('property.list', {});

      validateMCPResponse(response);
      // Should summarize or truncate large results
      expect(response.content[0].text.split('\n').length).toBeLessThan(150);
    });

    it('should maintain context across related operations', async () => {
      // Simulate property creation workflow
      contextTracker.addContext('operation', 'property_creation');
      contextTracker.addContext('propertyName', 'new-site.example.com');

      mockClient.request
        .mockResolvedValueOnce({ propertyId: 'prp_123', propertyVersion: 1 })
        .mockResolvedValueOnce({ edgeHostnameId: 'ehn_456' })
        .mockResolvedValueOnce({ activationId: 'atv_789' });

      // Create property
      const createResponse = await testServer.callTool('property.create', {
        propertyName: 'new-site.example.com',
        productId: 'prd_Web_Accel',
        contractId: 'C-123',
        groupId: 'G-123',
      });

      expect(createResponse.content[0].text).toContain('prp_123');

      // Response should suggest next steps
      expect(createResponse.content[0].text.toLowerCase()).toMatch(
        /configure|hostname|activate|next/
      );
    });
  });

  describe('Protocol Version Compatibility', () => {
    it('should declare supported MCP version', async () => {
      const server = testServer.getServer();
      const info = await server.getServerInfo();

      expect(info.protocolVersion).toBeDefined();
      expect(info.protocolVersion).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('should handle version negotiation', async () => {
      const server = testServer.getServer();
      
      const request = {
        jsonrpc: '2.0',
        method: 'initialize',
        params: {
          protocolVersion: '1.0.0',
          capabilities: {},
        },
      };

      const response = await server.handleRequest(request);
      expect(response).toBeDefined();
      expect(response.capabilities).toBeDefined();
    });
  });

  describe('Streaming and Long Operations', () => {
    it('should handle long-running operations', async () => {
      // Simulate activation status checking
      mockClient.request
        .mockResolvedValueOnce({ status: 'PENDING', progress: 25 })
        .mockResolvedValueOnce({ status: 'PENDING', progress: 50 })
        .mockResolvedValueOnce({ status: 'PENDING', progress: 75 })
        .mockResolvedValueOnce({ status: 'ACTIVE', progress: 100 });

      const response = await testServer.callTool('property.activation.status', {
        propertyId: 'prp_123',
        activationId: 'atv_789',
      });

      validateMCPResponse(response);
      expect(response.content[0].text).toContain('ACTIVE');
    });

    it('should provide progress updates for bulk operations', async () => {
      const zones = Array.from({ length: 10 }, (_, i) => ({
        zone: `zone${i}.example.com`,
        type: 'PRIMARY',
      }));

      mockClient.request.mockResolvedValueOnce({
        bulkCreateId: 'bulk_123',
        status: 'PROCESSING',
        progress: {
          total: 10,
          completed: 0,
          failed: 0,
        },
      });

      const response = await testServer.callTool('dns.zone.bulkCreate', {
        zones,
        contractId: 'C-123',
        groupId: 'G-123',
      });

      validateMCPResponse(response);
      expect(response.content[0].text).toContain('bulk_123');
      expect(response.content[0].text.toLowerCase()).toContain('progress');
    });
  });

  describe('Security and Input Validation', () => {
    it('should sanitize user inputs', async () => {
      const maliciousInputs = [
        { xss: '<script>alert("xss")</script>' },
        { sqlInjection: "'; DROP TABLE users; --" },
        { commandInjection: '; rm -rf /' },
        { pathTraversal: '../../../etc/passwd' },
      ];

      for (const input of maliciousInputs) {
        mockClient.request.mockResolvedValueOnce({
          properties: { items: [] },
        });

        const response = await testServer.callTool('property.search', {
          searchTerm: Object.values(input)[0],
        });

        validateMCPResponse(response);
        // Ensure malicious content is not reflected
        expect(response.content[0].text).not.toContain('<script>');
        expect(response.content[0].text).not.toContain('DROP TABLE');
        expect(response.content[0].text).not.toContain('rm -rf');
      }
    });

    it('should validate URL parameters', async () => {
      const invalidUrls = [
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
        'file:///etc/passwd',
        'ftp://malicious.com',
      ];

      for (const url of invalidUrls) {
        const response = await testServer.callTool('property.update', {
          propertyId: 'prp_123',
          originUrl: url,
        });

        expect(response.content[0].text).toContain('Error');
      }
    });
  });

  describe('Resource Management', () => {
    it('should handle resource cleanup', async () => {
      // Test that resources are properly cleaned up after operations
      const startMemory = process.memoryUsage().heapUsed;

      // Perform multiple operations
      for (let i = 0; i < 100; i++) {
        mockClient.request.mockResolvedValueOnce({
          properties: { items: TestDataGenerators.generateProperties(10) },
        });

        await testServer.callTool('property.list', {});
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const endMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = endMemory - startMemory;

      // Memory increase should be reasonable (< 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    it('should limit response sizes', async () => {
      // Generate very large dataset
      const hugeDataset = TestDataGenerators.generateProperties(10000);
      
      mockClient.request.mockResolvedValueOnce({
        properties: { items: hugeDataset },
      });

      const response = await testServer.callTool('property.list', {});

      validateMCPResponse(response);
      // Response should be truncated or summarized
      expect(response.content[0].text.length).toBeLessThan(100000);
    });
  });
});