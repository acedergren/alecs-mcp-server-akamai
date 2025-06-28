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
  
  list_property_versions: {
    type: 'object' as const,
    properties: {
      customer: { type: 'string', description: 'Optional: Customer section name' },
      propertyId: { type: 'string', description: 'Property ID to list versions for' },
      limit: { type: 'number', description: 'Maximum number of versions to return', default: 50 },
    },
    required: ['propertyId'],
    additionalProperties: false,
  },
  
  get_property_version: {
    type: 'object' as const,
    properties: {
      customer: { type: 'string', description: 'Optional: Customer section name' },
      propertyId: { type: 'string', description: 'Property ID to get version for' },
      version: { type: 'number', description: 'Version number to retrieve' },
    },
    required: ['propertyId', 'version'],
    additionalProperties: false,
  },
  
  list_property_activations: {
    type: 'object' as const,
    properties: {
      customer: { type: 'string', description: 'Optional: Customer section name' },
      propertyId: { type: 'string', description: 'Property ID to list activations for' },
      network: { 
        type: 'string',
        enum: ['STAGING', 'PRODUCTION'],
        description: 'Filter by network environment'
      },
    },
    required: ['propertyId'],
    additionalProperties: false,
  },
  
  validate_rule_tree: {
    type: 'object' as const,
    properties: {
      customer: { type: 'string', description: 'Optional: Customer section name' },
      propertyId: { type: 'string', description: 'Property ID to validate rules for' },
      version: { type: 'number', description: 'Property version (optional, uses latest if not specified)' },
      rules: { type: 'object', description: 'Custom rule tree to validate (optional, uses property rules if not specified)' },
      includeOptimizations: { type: 'boolean', description: 'Include optimization suggestions', default: false },
      includeStatistics: { type: 'boolean', description: 'Include validation statistics', default: false },
    },
    required: ['propertyId'],
    additionalProperties: false,
  },
  
  list_products: {
    type: 'object' as const,
    properties: {
      customer: { type: 'string', description: 'Optional: Customer section name' },
      contractId: { type: 'string', description: 'Contract ID to list products for' },
    },
    required: ['contractId'],
    additionalProperties: false,
  },
  
  search: {
    type: 'object' as const,
    properties: {
      customer: { type: 'string', description: 'Optional: Customer section name' },
      query: { type: 'string', description: 'Search query for properties, hostnames, or other resources' },
      detailed: { type: 'boolean', description: 'Return detailed results', default: true },
      useCache: { type: 'boolean', description: 'Use cached results for performance', default: true },
      warmCache: { type: 'boolean', description: 'Pre-warm cache with related resources', default: false },
    },
    required: ['query'],
    additionalProperties: false,
  },
  
  remove_property_hostname: {
    type: 'object' as const,
    properties: {
      customer: { type: 'string', description: 'Optional: Customer section name' },
      propertyId: { type: 'string', description: 'Property ID to remove hostname from' },
      version: { type: 'number', description: 'Property version to modify' },
      hostnames: {
        type: 'array',
        items: { type: 'string' },
        description: 'Hostnames to remove from property'
      },
      contractId: { type: 'string', description: 'Contract ID (optional)' },
      groupId: { type: 'string', description: 'Group ID (optional)' },
    },
    required: ['propertyId', 'version', 'hostnames'],
    additionalProperties: false,
  },
  
  list_property_hostnames: {
    type: 'object' as const,
    properties: {
      customer: { type: 'string', description: 'Optional: Customer section name' },
      propertyId: { type: 'string', description: 'Property ID to list hostnames for' },
      version: { type: 'number', description: 'Property version (optional, uses latest if not specified)' },
      validateCnames: { type: 'boolean', description: 'Validate CNAME records (optional)' },
    },
    required: ['propertyId'],
    additionalProperties: false,
  },
  
  add_property_hostname: {
    type: 'object' as const,
    properties: {
      customer: { type: 'string', description: 'Optional: Customer section name' },
      propertyId: { type: 'string', description: 'Property ID to add hostname to' },
      hostname: { type: 'string', description: 'Hostname to add to property' },
      edgeHostname: { type: 'string', description: 'Edge hostname (CNAME target)' },
      version: { type: 'number', description: 'Property version (optional, uses latest if not specified)' },
    },
    required: ['propertyId', 'hostname', 'edgeHostname'],
    additionalProperties: false,
  },
  
  list_edge_hostnames: {
    type: 'object' as const,
    properties: {
      customer: { type: 'string', description: 'Optional: Customer section name' },
      contractId: { type: 'string', description: 'Filter by contract ID (optional)' },
      groupId: { type: 'string', description: 'Filter by group ID (optional)' },
    },
    additionalProperties: false,
  },
  
  create_edge_hostname: {
    type: 'object' as const,
    properties: {
      customer: { type: 'string', description: 'Optional: Customer section name' },
      propertyId: { type: 'string', description: 'Property ID to create edge hostname for' },
      domainPrefix: { type: 'string', description: 'Domain prefix (e.g., "www-example-com")' },
      domainSuffix: { type: 'string', description: 'Domain suffix (e.g., "edgekey.net", "edgesuite.net")' },
      productId: { type: 'string', description: 'Product ID (optional, uses property product)' },
      secure: { type: 'boolean', description: 'Enable secure delivery (HTTPS)' },
      ipVersion: {
        type: 'string',
        enum: ['IPV4', 'IPV6', 'IPV4_IPV6'],
        description: 'IP version behavior'
      },
      certificateEnrollmentId: { type: 'number', description: 'Certificate enrollment ID for secure delivery' },
    },
    required: ['propertyId', 'domainPrefix'],
    additionalProperties: false,
  },
  
  list_cpcodes: {
    type: 'object' as const,
    properties: {
      customer: { type: 'string', description: 'Optional: Customer section name' },
      contractId: { type: 'string', description: 'Filter by contract ID (optional)' },
      groupId: { type: 'string', description: 'Filter by group ID (optional)' },
    },
    additionalProperties: false,
  },
  
  create_cpcode: {
    type: 'object' as const,
    properties: {
      customer: { type: 'string', description: 'Optional: Customer section name' },
      cpcodeName: { type: 'string', description: 'CP Code name' },
      contractId: { type: 'string', description: 'Contract ID' },
      groupId: { type: 'string', description: 'Group ID' },
      productId: { type: 'string', description: 'Product ID' },
    },
    required: ['cpcodeName', 'contractId', 'groupId', 'productId'],
    additionalProperties: false,
  },
  
  get_cpcode: {
    type: 'object' as const,
    properties: {
      customer: { type: 'string', description: 'Optional: Customer section name' },
      cpcodeId: { type: 'string', description: 'CP Code ID' },
      contractId: { type: 'string', description: 'Contract ID (optional)' },
      groupId: { type: 'string', description: 'Group ID (optional)' },
    },
    required: ['cpcodeId'],
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
  
  list_property_versions: z.object({
    customer: z.string().optional(),
    propertyId: z.string(),
    limit: z.number().optional().default(50),
  }),
  
  get_property_version: z.object({
    customer: z.string().optional(),
    propertyId: z.string(),
    version: z.number(),
  }),
  
  list_property_activations: z.object({
    customer: z.string().optional(),
    propertyId: z.string(),
    network: z.enum(['STAGING', 'PRODUCTION']).optional(),
  }),
  
  validate_rule_tree: z.object({
    customer: z.string().optional(),
    propertyId: z.string(),
    version: z.number().optional(),
    rules: z.object({}).passthrough().optional(),
    includeOptimizations: z.boolean().optional().default(false),
    includeStatistics: z.boolean().optional().default(false),
  }),
  
  list_products: z.object({
    customer: z.string().optional(),
    contractId: z.string(),
  }),
  
  search: z.object({
    customer: z.string().optional(),
    query: z.string(),
    detailed: z.boolean().optional().default(true),
    useCache: z.boolean().optional().default(true),
    warmCache: z.boolean().optional().default(false),
  }),
  
  remove_property_hostname: z.object({
    customer: z.string().optional(),
    propertyId: z.string(),
    version: z.number(),
    hostnames: z.array(z.string()),
    contractId: z.string().optional(),
    groupId: z.string().optional(),
  }),
  
  list_property_hostnames: z.object({
    customer: z.string().optional(),
    propertyId: z.string(),
    version: z.number().optional(),
    validateCnames: z.boolean().optional(),
  }),
  
  add_property_hostname: z.object({
    customer: z.string().optional(),
    propertyId: z.string(),
    hostname: z.string(),
    edgeHostname: z.string(),
    version: z.number().optional(),
  }),
  
  list_edge_hostnames: z.object({
    customer: z.string().optional(),
    contractId: z.string().optional(),
    groupId: z.string().optional(),
  }),
  
  create_edge_hostname: z.object({
    customer: z.string().optional(),
    propertyId: z.string(),
    domainPrefix: z.string(),
    domainSuffix: z.string().optional(),
    productId: z.string().optional(),
    secure: z.boolean().optional(),
    ipVersion: z.enum(['IPV4', 'IPV6', 'IPV4_IPV6']).optional(),
    certificateEnrollmentId: z.number().optional(),
  }),
  
  list_cpcodes: z.object({
    customer: z.string().optional(),
    contractId: z.string().optional(),
    groupId: z.string().optional(),
  }),
  
  create_cpcode: z.object({
    customer: z.string().optional(),
    cpcodeName: z.string(),
    contractId: z.string(),
    groupId: z.string(),
    productId: z.string(),
  }),
  
  get_cpcode: z.object({
    customer: z.string().optional(),
    cpcodeId: z.string(),
    contractId: z.string().optional(),
    groupId: z.string().optional(),
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

  if (error) {
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
