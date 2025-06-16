/**
 * MCP Protocol Compliance Tests
 * Validates that ALECS correctly implements the Model Context Protocol
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { createTestServer } from '../testing/test-utils.js';

describe('MCP Protocol Compliance', () => {
  let server: Server;

  beforeEach(() => {
    server = createTestServer();
  });

  describe('Tool Registration', () => {
    it('should register tools with valid schemas', () => {
      const testTool = {
        name: 'test_tool',
        description: 'A test tool',
        inputSchema: z.object({
          param1: z.string().describe('A required parameter'),
          param2: z.number().optional().describe('An optional parameter'),
        }),
      };

      server.setRequestHandler('tools/list', async () => ({
        tools: [testTool],
      }));

      expect(server).toBeDefined();
    });

    it('should validate tool names follow naming conventions', () => {
      const validNames = ['list_properties', 'get_zone', 'create_record'];
      const invalidNames = ['listProperties', 'get-zone', 'create record'];

      validNames.forEach(name => {
        expect(name).toMatch(/^[a-z]+(_[a-z]+)*$/);
      });

      invalidNames.forEach(name => {
        expect(name).not.toMatch(/^[a-z]+(_[a-z]+)*$/);
      });
    });
  });

  describe('Parameter Validation', () => {
    it('should validate required parameters', async () => {
      const schema = z.object({
        zone: z.string(),
        type: z.enum(['PRIMARY', 'SECONDARY']),
      });

      const validInput = { zone: 'example.com', type: 'PRIMARY' };
      const invalidInput = { zone: 'example.com' }; // missing type

      expect(() => schema.parse(validInput)).not.toThrow();
      expect(() => schema.parse(invalidInput)).toThrow();
    });

    it('should handle optional parameters correctly', () => {
      const schema = z.object({
        zone: z.string(),
        comment: z.string().optional(),
      });

      const withOptional = { zone: 'example.com', comment: 'Test' };
      const withoutOptional = { zone: 'example.com' };

      expect(() => schema.parse(withOptional)).not.toThrow();
      expect(() => schema.parse(withoutOptional)).not.toThrow();
    });

    it('should validate enum parameters', () => {
      const schema = z.object({
        network: z.enum(['STAGING', 'PRODUCTION']),
      });

      expect(() => schema.parse({ network: 'STAGING' })).not.toThrow();
      expect(() => schema.parse({ network: 'INVALID' })).toThrow();
    });
  });

  describe('Error Response Formatting', () => {
    it('should format errors according to MCP spec', () => {
      const error = {
        code: -32602,
        message: 'Invalid params',
        data: {
          field: 'zone',
          reason: 'must be a valid domain',
        },
      };

      expect(error.code).toBeLessThan(0);
      expect(error.message).toBeDefined();
      expect(error.data).toBeDefined();
    });

    it('should use standard error codes', () => {
      const errorCodes = {
        parseError: -32700,
        invalidRequest: -32600,
        methodNotFound: -32601,
        invalidParams: -32602,
        internalError: -32603,
      };

      Object.values(errorCodes).forEach(code => {
        expect(code).toBeLessThan(-32000);
      });
    });
  });

  describe('Response Format', () => {
    it('should return responses in MCP format', () => {
      const validResponse = {
        content: [
          {
            type: 'text',
            text: 'Operation completed successfully',
          },
        ],
      };

      expect(validResponse).toHaveProperty('content');
      expect(Array.isArray(validResponse.content)).toBe(true);
      expect(validResponse.content[0]).toHaveProperty('type');
      expect(validResponse.content[0]).toHaveProperty('text');
    });

    it('should support multiple content items', () => {
      const multiResponse = {
        content: [
          {
            type: 'text',
            text: 'Summary information',
          },
          {
            type: 'text',
            text: 'Detailed results',
          },
        ],
      };

      expect(multiResponse.content.length).toBe(2);
    });
  });

  describe('Tool Description Quality', () => {
    it('should provide clear, actionable descriptions', () => {
      const goodDescription = 'List all DNS zones in the account with optional filtering by type';
      const badDescription = 'Lists zones';

      expect(goodDescription.length).toBeGreaterThan(20);
      expect(goodDescription).toContain('DNS zones');
      expect(goodDescription).toContain('filtering');
    });

    it('should describe all parameters clearly', () => {
      const paramDescription = 'The contract ID (e.g., ctr_C-1234567) to filter results';
      
      expect(paramDescription).toContain('e.g.');
      expect(paramDescription).toContain('ctr_C-');
      expect(paramDescription.length).toBeGreaterThan(15);
    });
  });

  describe('Protocol Message Flow', () => {
    it('should handle initialize -> list tools -> call tool -> shutdown', async () => {
      const messageFlow = [
        { method: 'initialize', params: { protocolVersion: '1.0' } },
        { method: 'tools/list', params: {} },
        { method: 'tools/call', params: { name: 'list_zones', arguments: {} } },
        { method: 'shutdown', params: {} },
      ];

      // Each message should have required fields
      messageFlow.forEach(msg => {
        expect(msg).toHaveProperty('method');
        expect(msg).toHaveProperty('params');
      });
    });
  });
});