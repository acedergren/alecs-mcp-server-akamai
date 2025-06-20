/**
 * MCP 2025-06-18 Compliant Type Definitions
 * Updated to match new Model Context Protocol requirements
 */

import { z } from 'zod';

/**
 * MCP 2025 Response Meta Type
 * All responses must include optional _meta field
 */
export interface McpResponseMeta {
  /** Execution timestamp */
  timestamp?: string;
  /** Execution duration in milliseconds */
  duration?: number;
  /** Tool version */
  version?: string;
  /** Additional metadata */
  [key: string]: unknown;
}

/**
 * Base MCP 2025 tool parameters
 * All tools should accept optional customer parameter
 */
export interface BaseMcp2025Params {
  /** Customer section name from .edgerc */
  customer?: string;
}

/**
 * MCP 2025 tool response wrapper
 * Includes optional _meta field for compliance
 */
export interface Mcp2025ToolResponse<T = unknown> {
  /** Success indicator */
  success: boolean;
  /** Response data */
  data?: T;
  /** Error message if failed */
  error?: string;
  /** Optional metadata for MCP 2025 compliance */
  _meta?: McpResponseMeta;
}

/**
 * MCP 2025 Tool Definition
 * Uses proper JSON Schema format for parameters
 */
export interface Mcp2025ToolDefinition {
  /** Tool name in snake_case */
  name: string;
  /** Tool description */
  description: string;
  /** JSON Schema for input parameters */
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
    additionalProperties?: boolean;
  };
}

/**
 * Property Manager tool schemas using JSON Schema format
 */
export const PropertyManagerSchemas2025 = {
  list_properties: {
    type: 'object' as const,
    properties: {
      customer: { type: 'string', description: 'Optional: Customer section name' },
      contractId: { type: 'string', description: 'Filter by contract ID' },
      groupId: { type: 'string', description: 'Filter by group ID' },
      limit: { type: 'number', description: 'Maximum number of results' },
      includeSubgroups: { type: 'boolean', description: 'Include properties from subgroups' },
    },
    additionalProperties: false,
  },

  get_property: {
    type: 'object' as const,
    properties: {
      customer: { type: 'string', description: 'Optional: Customer section name' },
      propertyId: { type: 'string', description: 'Property ID' },
    },
    required: ['propertyId'],
    additionalProperties: false,
  },

  create_property: {
    type: 'object' as const,
    properties: {
      customer: { type: 'string', description: 'Optional: Customer section name' },
      propertyName: { type: 'string', description: 'Property name' },
      productId: { type: 'string', description: 'Product ID' },
      contractId: { type: 'string', description: 'Contract ID' },
      groupId: { type: 'string', description: 'Group ID' },
      ruleFormat: { type: 'string', description: 'Rule format version' },
    },
    required: ['propertyName', 'productId', 'contractId', 'groupId'],
    additionalProperties: false,
  },

  activate_property: {
    type: 'object' as const,
    properties: {
      customer: { type: 'string', description: 'Optional: Customer section name' },
      propertyId: { type: 'string', description: 'Property ID' },
      version: { type: 'number', description: 'Version to activate' },
      network: {
        type: 'string',
        enum: ['STAGING', 'PRODUCTION'],
        description: 'Target network',
      },
      emails: {
        type: 'array',
        items: { type: 'string' },
        description: 'Notification emails',
      },
      note: { type: 'string', description: 'Activation note' },
    },
    required: ['propertyId', 'version', 'network'],
    additionalProperties: false,
  },
};

/**
 * DNS tool schemas using JSON Schema format
 */
export const DnsSchemas2025 = {
  list_zones: {
    type: 'object' as const,
    properties: {
      customer: { type: 'string', description: 'Optional: Customer section name' },
      contractId: { type: 'string', description: 'Filter by contract ID' },
      type: {
        type: 'string',
        enum: ['PRIMARY', 'SECONDARY', 'ALIAS'],
        description: 'Filter by zone type',
      },
    },
    additionalProperties: false,
  },

  create_zone: {
    type: 'object' as const,
    properties: {
      customer: { type: 'string', description: 'Optional: Customer section name' },
      zone: { type: 'string', description: 'Zone name' },
      type: {
        type: 'string',
        enum: ['PRIMARY', 'SECONDARY', 'ALIAS'],
        description: 'Zone type',
      },
      contractId: { type: 'string', description: 'Contract ID' },
      comment: { type: 'string', description: 'Zone comment' },
      signAndServe: { type: 'boolean', description: 'Enable DNSSEC' },
    },
    required: ['zone', 'type', 'contractId'],
    additionalProperties: false,
  },

  create_record: {
    type: 'object' as const,
    properties: {
      customer: { type: 'string', description: 'Optional: Customer section name' },
      zone: { type: 'string', description: 'Zone name' },
      name: { type: 'string', description: 'Record name' },
      type: { type: 'string', description: 'Record type' },
      ttl: { type: 'number', description: 'TTL in seconds' },
      rdata: {
        type: 'array',
        items: { type: 'string' },
        description: 'Record data',
      },
    },
    required: ['zone', 'name', 'type', 'ttl', 'rdata'],
    additionalProperties: false,
  },
};

/**
 * Network List tool schemas using JSON Schema format
 */
export const NetworkListSchemas2025 = {
  list_network_lists: {
    type: 'object' as const,
    properties: {
      customer: { type: 'string', description: 'Optional: Customer section name' },
      type: {
        type: 'string',
        enum: ['IP', 'GEO'],
        description: 'Filter by list type',
      },
      includeElements: { type: 'boolean', description: 'Include list elements' },
    },
    additionalProperties: false,
  },

  create_network_list: {
    type: 'object' as const,
    properties: {
      customer: { type: 'string', description: 'Optional: Customer section name' },
      name: { type: 'string', description: 'List name' },
      type: {
        type: 'string',
        enum: ['IP', 'GEO'],
        description: 'List type',
      },
      description: { type: 'string', description: 'List description' },
      list: {
        type: 'array',
        items: { type: 'string' },
        description: 'Initial list elements',
      },
    },
    required: ['name', 'type'],
    additionalProperties: false,
  },

  activate_network_list: {
    type: 'object' as const,
    properties: {
      customer: { type: 'string', description: 'Optional: Customer section name' },
      listId: { type: 'string', description: 'Network list ID' },
      network: {
        type: 'string',
        enum: ['STAGING', 'PRODUCTION'],
        description: 'Target network',
      },
      comments: { type: 'string', description: 'Activation comments' },
      notificationRecipients: {
        type: 'array',
        items: { type: 'string' },
        description: 'Notification emails',
      },
    },
    required: ['listId', 'network'],
    additionalProperties: false,
  },
};

/**
 * Purge tool schemas using JSON Schema format
 */
export const PurgeSchemas2025 = {
  purge_by_url: {
    type: 'object' as const,
    properties: {
      customer: { type: 'string', description: 'Optional: Customer section name' },
      urls: {
        type: 'array',
        items: { type: 'string' },
        description: 'URLs to purge',
      },
      network: {
        type: 'string',
        enum: ['STAGING', 'PRODUCTION'],
        description: 'Target network',
      },
    },
    required: ['urls'],
    additionalProperties: false,
  },

  purge_by_cpcode: {
    type: 'object' as const,
    properties: {
      customer: { type: 'string', description: 'Optional: Customer section name' },
      cpCodes: {
        type: 'array',
        items: { type: 'string' },
        description: 'CP codes to purge',
      },
      network: {
        type: 'string',
        enum: ['STAGING', 'PRODUCTION'],
        description: 'Target network',
      },
    },
    required: ['cpCodes'],
    additionalProperties: false,
  },

  purge_by_cache_tag: {
    type: 'object' as const,
    properties: {
      customer: { type: 'string', description: 'Optional: Customer section name' },
      cacheTags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Cache tags to purge',
      },
      network: {
        type: 'string',
        enum: ['STAGING', 'PRODUCTION'],
        description: 'Target network',
      },
    },
    required: ['cacheTags'],
    additionalProperties: false,
  },
};

/**
 * Zod schemas for runtime validation
 * These mirror the JSON Schema definitions for validation
 */
export const PropertyManagerZodSchemas = {
  list_properties: z.object({
    customer: z.string().optional(),
    contractId: z.string().optional(),
    groupId: z.string().optional(),
    limit: z.number().optional(),
    includeSubgroups: z.boolean().optional(),
  }),

  get_property: z.object({
    customer: z.string().optional(),
    propertyId: z.string(),
  }),

  create_property: z.object({
    customer: z.string().optional(),
    propertyName: z.string(),
    productId: z.string(),
    contractId: z.string(),
    groupId: z.string(),
    ruleFormat: z.string().optional(),
  }),

  activate_property: z.object({
    customer: z.string().optional(),
    propertyId: z.string(),
    version: z.number(),
    network: z.enum(['STAGING', 'PRODUCTION']),
    emails: z.array(z.string()).optional(),
    note: z.string().optional(),
  }),
};

/**
 * Helper function to create MCP 2025 compliant response
 */
export function createMcp2025Response<T>(
  success: boolean,
  data?: T,
  error?: string,
  meta?: McpResponseMeta,
): Mcp2025ToolResponse<T> {
  const response: Mcp2025ToolResponse<T> = {
    success,
  };

  if (data !== undefined) {
    response.data = data;
  }

  if (_error) {
    response.error = error;
  }

  if (meta || success) {
    response._meta = {
      timestamp: new Date().toISOString(),
      ...meta,
    };
  }

  return response;
}

/**
 * Type guard for MCP 2025 responses
 */
export function isMcp2025Response(response: unknown): response is Mcp2025ToolResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'success' in response &&
    typeof (response as any).success === 'boolean'
  );
}

/**
 * Tool name converter for snake_case compliance
 */
export function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '')
    .replace(/-/g, '_');
}

/**
 * Migration helper to convert old tool names to new format
 */
export const TOOL_NAME_MIGRATION: Record<string, string> = {
  'list-properties': 'list_properties',
  'get-property': 'get_property',
  'create-property': 'create_property',
  'activate-property': 'activate_property',
  'list-zones': 'list_zones',
  'create-zone': 'create_zone',
  'create-record': 'create_record',
  'list-network-lists': 'list_network_lists',
  'create-network-list': 'create_network_list',
  'activate-network-list': 'activate_network_list',
  'purge-by-url': 'purge_by_url',
  'purge-by-cpcode': 'purge_by_cpcode',
  'purge-by-cache-tag': 'purge_by_cache_tag',
};
