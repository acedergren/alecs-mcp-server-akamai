/**
 * MCP 2025-06-18 Protocol Test Fixtures
 * Standard request/response fixtures for protocol compliance testing
 */

import { 
  JsonRpcRequest, 
  JsonRpcResponse, 
  JsonRpcErrorCode 
} from '../../../src/types/jsonrpc';

/**
 * Valid protocol requests
 */
export const validRequests = {
  /**
   * Tool list request
   */
  listTools: {
    jsonrpc: '2.0' as const,
    id: 'test-list-tools-1',
    method: 'tools/list',
    params: {}
  } as JsonRpcRequest,

  /**
   * Tool call request with valid snake_case name
   */
  callToolValid: {
    jsonrpc: '2.0' as const,
    id: 'test-call-tool-1',
    method: 'tools/call',
    params: {
      name: 'list_properties',
      arguments: {
        customer: 'test-customer',
        contractId: 'ctr-123',
        groupId: 'grp-456'
      }
    }
  } as JsonRpcRequest,

  /**
   * Tool call with minimal params
   */
  callToolMinimal: {
    jsonrpc: '2.0' as const,
    id: 'test-call-tool-2',
    method: 'tools/call',
    params: {
      name: 'get_property',
      arguments: {
        propertyId: 'prp-789'
      }
    }
  } as JsonRpcRequest,

  /**
   * Notification (no id)
   */
  notification: {
    jsonrpc: '2.0' as const,
    method: 'log',
    params: {
      level: 'info',
      message: 'Test notification'
    }
  } as JsonRpcRequest,

  /**
   * Request with metadata
   */
  withMetadata: {
    jsonrpc: '2.0' as const,
    id: 'test-with-meta-1',
    method: 'tools/call',
    params: {
      name: 'list_zones'
    },
    _meta: {
      client: 'test-client',
      version: '1.0.0'
    }
  } as JsonRpcRequest
};

/**
 * Invalid protocol requests
 */
export const invalidRequests = {
  /**
   * Missing JSON-RPC version
   */
  missingVersion: {
    id: 'test-invalid-1',
    method: 'tools/list'
  },

  /**
   * Wrong JSON-RPC version
   */
  wrongVersion: {
    jsonrpc: '1.0',
    id: 'test-invalid-2',
    method: 'tools/list'
  },

  /**
   * Missing method
   */
  missingMethod: {
    jsonrpc: '2.0',
    id: 'test-invalid-3'
  },

  /**
   * Invalid method type
   */
  invalidMethodType: {
    jsonrpc: '2.0',
    id: 'test-invalid-4',
    method: 123
  },

  /**
   * Null request ID (invalid in strict mode)
   */
  nullId: {
    jsonrpc: '2.0' as const,
    id: null,
    method: 'tools/list'
  } as JsonRpcRequest,

  /**
   * Invalid tool name (not snake_case)
   */
  invalidToolName: {
    jsonrpc: '2.0' as const,
    id: 'test-invalid-5',
    method: 'tools/call',
    params: {
      name: 'listProperties', // Should be list_properties
      arguments: {}
    }
  } as JsonRpcRequest,

  /**
   * Reserved metadata prefix
   */
  reservedMetadata: {
    jsonrpc: '2.0' as const,
    id: 'test-invalid-6',
    method: 'tools/call',
    params: {
      name: 'list_properties',
      arguments: {
        'mcp.internal': 'value' // Reserved prefix
      }
    }
  } as JsonRpcRequest
};

/**
 * Valid protocol responses
 */
export const validResponses = {
  /**
   * Successful tool list response
   */
  toolListSuccess: {
    jsonrpc: '2.0' as const,
    id: 'test-list-tools-1',
    result: {
      tools: [
        {
          name: 'list_properties',
          description: 'List all properties in an account',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string', description: 'Customer section name' },
              contractId: { type: 'string', description: 'Filter by contract' },
              groupId: { type: 'string', description: 'Filter by group' }
            },
            additionalProperties: false
          }
        },
        {
          name: 'get_property',
          description: 'Get details of a specific property',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string', description: 'Customer section name' },
              propertyId: { type: 'string', description: 'Property ID' }
            },
            required: ['propertyId'],
            additionalProperties: false
          }
        }
      ]
    }
  } as JsonRpcResponse,

  /**
   * Successful tool call response with metadata
   */
  toolCallSuccess: {
    jsonrpc: '2.0' as const,
    id: 'test-call-tool-1',
    result: {
      content: [
        {
          type: 'text',
          text: 'Found 3 properties:\n1. example.com (prp-123)\n2. api.example.com (prp-456)\n3. cdn.example.com (prp-789)'
        }
      ]
    },
    _meta: {
      timestamp: '2025-06-19T12:00:00Z',
      duration: 150,
      version: '2.0.0',
      tool: 'list_properties'
    }
  } as JsonRpcResponse,

  /**
   * Empty result
   */
  emptyResult: {
    jsonrpc: '2.0' as const,
    id: 'test-empty-1',
    result: {
      content: [
        {
          type: 'text',
          text: 'No properties found matching the criteria'
        }
      ]
    }
  } as JsonRpcResponse
};

/**
 * Error responses
 */
export const errorResponses = {
  /**
   * Parse error
   */
  parseError: {
    jsonrpc: '2.0' as const,
    id: null,
    error: {
      code: JsonRpcErrorCode.ParseError,
      message: 'Parse error',
      data: 'Invalid JSON at position 42'
    }
  } as JsonRpcResponse,

  /**
   * Invalid request
   */
  invalidRequest: {
    jsonrpc: '2.0' as const,
    id: null,
    error: {
      code: JsonRpcErrorCode.InvalidRequest,
      message: 'Invalid Request',
      data: 'Missing required field: method'
    }
  } as JsonRpcResponse,

  /**
   * Method not found
   */
  methodNotFound: {
    jsonrpc: '2.0' as const,
    id: 'test-error-1',
    error: {
      code: JsonRpcErrorCode.MethodNotFound,
      message: 'Method not found',
      data: 'Unknown method: tools/invalid'
    }
  } as JsonRpcResponse,

  /**
   * Invalid params
   */
  invalidParams: {
    jsonrpc: '2.0' as const,
    id: 'test-error-2',
    error: {
      code: JsonRpcErrorCode.InvalidParams,
      message: 'Invalid params',
      data: {
        field: 'propertyId',
        reason: 'Required field missing'
      }
    }
  } as JsonRpcResponse,

  /**
   * Internal error with stack trace
   */
  internalError: {
    jsonrpc: '2.0' as const,
    id: 'test-error-3',
    error: {
      code: JsonRpcErrorCode.InternalError,
      message: 'Internal error',
      data: {
        error: 'Connection timeout',
        stack: 'Error: Connection timeout\n    at AkamaiClient.request...'
      }
    }
  } as JsonRpcResponse,

  /**
   * Authentication required
   */
  authRequired: {
    jsonrpc: '2.0' as const,
    id: 'test-error-4',
    error: {
      code: JsonRpcErrorCode.ServerError,
      message: 'Authentication required',
      data: {
        realm: 'https://api.example.com/mcp',
        scopes_required: ['mcp:read']
      }
    }
  } as JsonRpcResponse
};

/**
 * Batch request fixtures
 */
export const batchRequests = {
  /**
   * Valid batch request
   */
  validBatch: [
    validRequests.listTools,
    validRequests.callToolValid,
    validRequests.notification
  ],

  /**
   * Mixed valid and invalid batch
   */
  mixedBatch: [
    validRequests.listTools,
    invalidRequests.missingMethod,
    validRequests.callToolMinimal
  ],

  /**
   * Empty batch (invalid)
   */
  emptyBatch: [],

  /**
   * Single item batch
   */
  singleBatch: [validRequests.listTools]
};

/**
 * Tool definitions for testing
 */
export const toolDefinitions = {
  propertyManager: [
    {
      name: 'list_properties',
      description: 'List all properties in an account',
      inputSchema: {
        type: 'object' as const,
        properties: {
          customer: { type: 'string', description: 'Customer section name' },
          contractId: { type: 'string', description: 'Filter by contract ID' },
          groupId: { type: 'string', description: 'Filter by group ID' }
        },
        additionalProperties: false
      }
    },
    {
      name: 'create_property',
      description: 'Create a new property',
      inputSchema: {
        type: 'object' as const,
        properties: {
          customer: { type: 'string', description: 'Customer section name' },
          propertyName: { type: 'string', description: 'Property name' },
          contractId: { type: 'string', description: 'Contract ID' },
          groupId: { type: 'string', description: 'Group ID' },
          productId: { type: 'string', description: 'Product ID' }
        },
        required: ['propertyName', 'contractId', 'groupId', 'productId'],
        additionalProperties: false
      }
    }
  ],
  
  dns: [
    {
      name: 'list_zones',
      description: 'List DNS zones',
      inputSchema: {
        type: 'object' as const,
        properties: {
          customer: { type: 'string', description: 'Customer section name' },
          type: { 
            type: 'string', 
            enum: ['PRIMARY', 'SECONDARY', 'ALIAS'],
            description: 'Zone type filter' 
          }
        },
        additionalProperties: false
      }
    }
  ]
};

/**
 * Request ID tracking test cases
 */
export const requestIdTestCases = {
  /**
   * Unique string IDs
   */
  stringIds: [
    'req-001',
    'req-002',
    'req-003',
    'mcp-1234567890-1',
    'uuid-550e8400-e29b-41d4-a716-446655440000'
  ],

  /**
   * Unique numeric IDs
   */
  numericIds: [1, 2, 3, 100, 999999],

  /**
   * Duplicate IDs (should fail)
   */
  duplicateIds: ['dup-1', 'dup-1'],

  /**
   * Mixed ID types
   */
  mixedIds: ['string-1', 123, 'string-2', 456]
};