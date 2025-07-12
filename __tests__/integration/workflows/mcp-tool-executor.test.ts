/**
 * MCP Tool Executor Test Suite
 * 
 * Tests for the MCP tool executor that integrates with workflow engine
 */

import { z } from 'zod';

// Mock dependencies first before any imports
jest.mock('../../akamai-client');
jest.mock('../../utils/pino-logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  },
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }))
}));

// Mock cache service to prevent initialization issues
jest.mock('../../core/server/performance/smart-cache', () => ({
  getGlobalCache: jest.fn(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    clear: jest.fn()
  }))
}));

// Mock tool registry
jest.mock('../../tools/registry', () => ({
  getAllToolDefinitions: jest.fn(() => []),
  getToolByName: jest.fn()
}));

// Now import the modules after mocking
import { MCPAkamaiOperationExecutor } from '../../orchestration/mcp-tool-executor';
import { AkamaiClient } from '../../akamai-client';
import * as allToolsRegistry from '../../tools/registry';

describe('MCPToolExecutor', () => {
  let executor: MCPToolExecutor;
  let mockClient: jest.Mocked<AkamaiClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = new AkamaiClient() as jest.Mocked<AkamaiClient>;
    executor = new MCPToolExecutor(mockClient);
  });

  describe('Tool Execution', () => {
    it('should execute a tool successfully', async () => {
      const mockTool = {
        name: 'test.tool',
        description: 'Test tool',
        schema: z.object({
          value: z.string()
        }),
        handler: jest.fn(async (_client, args) => ({
          content: [{
            type: 'text',
            text: JSON.stringify({ result: 'success', args })
          }]
        }))
      };

      (allToolsRegistry.getToolByName as jest.Mock).mockReturnValue(mockTool);

      const result = await executor.execute('test.tool', { value: 'test' });

      expect(mockTool.handler).toHaveBeenCalledWith(mockClient, { value: 'test' });
      expect(result).toEqual({ result: 'success', args: { value: 'test' } });
    });

    it('should handle tool that returns non-JSON text', async () => {
      const mockTool = {
        name: 'test.text',
        description: 'Text tool',
        handler: jest.fn(async () => ({
          content: [{
            type: 'text',
            text: 'Plain text response'
          }]
        }))
      };

      (allToolsRegistry.getToolByName as jest.Mock).mockReturnValue(mockTool);

      const result = await executor.execute('test.text', {});

      expect(result).toBe('Plain text response');
    });

    it('should handle tool that returns raw object', async () => {
      const mockTool = {
        name: 'test.raw',
        description: 'Raw tool',
        handler: jest.fn(async () => ({ raw: 'response' }))
      };

      (allToolsRegistry.getToolByName as jest.Mock).mockReturnValue(mockTool);

      const result = await executor.execute('test.raw', {});

      expect(result).toEqual({ raw: 'response' });
    });

    it('should throw error for non-existent tool', async () => {
      (allToolsRegistry.getToolByName as jest.Mock).mockReturnValue(null);

      await expect(
        executor.execute('non.existent', {})
      ).rejects.toThrow('Tool not found: non.existent');
    });

    it('should validate arguments with Zod schema', async () => {
      const mockTool = {
        name: 'test.validated',
        description: 'Validated tool',
        schema: z.object({
          required: z.string(),
          optional: z.number().optional()
        }),
        handler: jest.fn(async () => ({ content: [{ type: 'text', text: 'ok' }] }))
      };

      (allToolsRegistry.getToolByName as jest.Mock).mockReturnValue(mockTool);

      // Valid args
      await executor.execute('test.validated', { required: 'test' });
      expect(mockTool.handler).toHaveBeenCalled();

      // Invalid args - missing required field
      await expect(
        executor.execute('test.validated', {})
      ).rejects.toThrow('Validation failed');

      // Invalid args - wrong type
      await expect(
        executor.execute('test.validated', { required: 123 })
      ).rejects.toThrow('Validation failed');
    });

    it('should use customer-specific client', async () => {
      const mockTool = {
        name: 'test.customer',
        description: 'Customer tool',
        handler: jest.fn(async () => ({ content: [{ type: 'text', text: 'ok' }] }))
      };

      (allToolsRegistry.getToolByName as jest.Mock).mockReturnValue(mockTool);

      await executor.execute('test.customer', { customer: 'acme-corp' });

      // Verify new client was created with customer
      expect(AkamaiClient).toHaveBeenCalledWith('acme-corp');
    });

    it('should handle tool execution errors', async () => {
      const mockTool = {
        name: 'test.error',
        description: 'Error tool',
        handler: jest.fn(async () => {
          throw new Error('Tool failed');
        })
      };

      (allToolsRegistry.getToolByName as jest.Mock).mockReturnValue(mockTool);

      await expect(
        executor.execute('test.error', {})
      ).rejects.toThrow('Tool test.error failed: Tool failed');
    });

    it('should handle missing content in response', async () => {
      const mockTool = {
        name: 'test.empty',
        description: 'Empty tool',
        handler: jest.fn(async () => ({
          content: []
        }))
      };

      (allToolsRegistry.getToolByName as jest.Mock).mockReturnValue(mockTool);

      const result = await executor.execute('test.empty', {});
      expect(result).toEqual({ content: [] });
    });
  });

  describe('Argument Validation', () => {
    it('should validate with plain JSON schema', async () => {
      const mockTool = {
        name: 'test.json',
        description: 'JSON schema tool',
        schema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            age: { type: 'number' }
          },
          required: ['name']
        },
        handler: jest.fn(async () => ({ content: [{ type: 'text', text: 'ok' }] }))
      };

      (allToolsRegistry.getToolByName as jest.Mock).mockReturnValue(mockTool);

      // Valid args
      await executor.execute('test.json', { name: 'test', age: 25 });
      expect(mockTool.handler).toHaveBeenCalled();

      // Missing required field
      await expect(
        executor.execute('test.json', { age: 25 })
      ).rejects.toThrow('Missing required field: name');

      // Wrong type
      await expect(
        executor.execute('test.json', { name: 123 })
      ).rejects.toThrow('expected string, got number');

      // Unknown property with additionalProperties: false
      const strictTool = {
        ...mockTool,
        schema: {
          ...mockTool.schema,
          additionalProperties: false
        }
      };
      (allToolsRegistry.getToolByName as jest.Mock).mockReturnValue(strictTool);

      await expect(
        executor.execute('test.json', { name: 'test', unknown: 'field' })
      ).rejects.toThrow('Unknown property: unknown');
    });

    it('should validate string constraints', async () => {
      const mockTool = {
        name: 'test.string',
        description: 'String validation tool',
        schema: {
          type: 'object',
          properties: {
            short: { type: 'string', minLength: 3, maxLength: 5 },
            pattern: { type: 'string', pattern: '^[A-Z]+$' },
            choice: { type: 'string', enum: ['one', 'two', 'three'] }
          }
        },
        handler: jest.fn(async () => ({ content: [{ type: 'text', text: 'ok' }] }))
      };

      (allToolsRegistry.getToolByName as jest.Mock).mockReturnValue(mockTool);

      // Min length
      await expect(
        executor.execute('test.string', { short: 'ab' })
      ).rejects.toThrow('minimum length is 3');

      // Max length
      await expect(
        executor.execute('test.string', { short: 'toolong' })
      ).rejects.toThrow('maximum length is 5');

      // Pattern
      await expect(
        executor.execute('test.string', { pattern: 'lowercase' })
      ).rejects.toThrow('does not match pattern');

      // Enum
      await expect(
        executor.execute('test.string', { choice: 'four' })
      ).rejects.toThrow('must be one of one, two, three');
    });

    it('should validate number constraints', async () => {
      const mockTool = {
        name: 'test.number',
        description: 'Number validation tool',
        schema: {
          type: 'object',
          properties: {
            age: { type: 'integer', minimum: 0, maximum: 150 },
            price: { type: 'number', minimum: 0.01 }
          }
        },
        handler: jest.fn(async () => ({ content: [{ type: 'text', text: 'ok' }] }))
      };

      (allToolsRegistry.getToolByName as jest.Mock).mockReturnValue(mockTool);

      // Integer check
      await expect(
        executor.execute('test.number', { age: 25.5 })
      ).rejects.toThrow('must be an integer');

      // Minimum
      await expect(
        executor.execute('test.number', { age: -1 })
      ).rejects.toThrow('minimum value is 0');

      // Maximum
      await expect(
        executor.execute('test.number', { age: 200 })
      ).rejects.toThrow('maximum value is 150');
    });

    it('should validate array constraints', async () => {
      const mockTool = {
        name: 'test.array',
        description: 'Array validation tool',
        schema: {
          type: 'object',
          properties: {
            tags: { type: 'array', minItems: 1, maxItems: 3 }
          }
        },
        handler: jest.fn(async () => ({ content: [{ type: 'text', text: 'ok' }] }))
      };

      (allToolsRegistry.getToolByName as jest.Mock).mockReturnValue(mockTool);

      // Min items
      await expect(
        executor.execute('test.array', { tags: [] })
      ).rejects.toThrow('minimum 1 items required');

      // Max items
      await expect(
        executor.execute('test.array', { tags: [1, 2, 3, 4] })
      ).rejects.toThrow('maximum 3 items allowed');
    });
  });

  describe('Tool Discovery', () => {
    it('should list available tools', () => {
      const mockTools = [
        { name: 'tool1', description: 'Tool 1' },
        { name: 'tool2', description: 'Tool 2' }
      ];

      (allToolsRegistry.getAllToolDefinitions as jest.Mock).mockReturnValue(mockTools);

      const tools = executor.getAvailableTools();
      expect(tools).toEqual(['tool1', 'tool2']);
    });

    it('should get tool metadata', () => {
      const mockTool = {
        name: 'property.list',
        description: 'List properties',
        schema: z.object({ customer: z.string() })
      };

      (allToolsRegistry.getToolByName as jest.Mock).mockReturnValue(mockTool);

      const metadata = executor.getToolMetadata('property.list');
      expect(metadata).toEqual({
        name: 'property.list',
        description: 'List properties',
        schema: mockTool.schema,
        category: 'property'
      });
    });

    it('should return null for non-existent tool metadata', () => {
      (allToolsRegistry.getToolByName as jest.Mock).mockReturnValue(null);

      const metadata = executor.getToolMetadata('non.existent');
      expect(metadata).toBeNull();
    });

    it('should extract category from tool name', () => {
      const mockTool = {
        name: 'dns.zone.create',
        description: 'Create DNS zone'
      };

      (allToolsRegistry.getToolByName as jest.Mock).mockReturnValue(mockTool);

      const metadata = executor.getToolMetadata('dns.zone.create');
      expect(metadata?.category).toBe('dns');
    });
  });
});