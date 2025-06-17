/**
 * MCP (Model Context Protocol) tool type definitions
 */

import { z } from 'zod';
import { NetworkEnvironment } from './config';

/**
 * Base MCP tool parameters
 */
export interface BaseMcpParams {
  /** Customer section name from .edgerc */
  customer?: string;
}

/**
 * MCP tool response wrapper
 */
export interface McpToolResponse<T = unknown> {
  /** Success indicator */
  success: boolean;
  /** Response data */
  data?: T;
  /** Error message if failed */
  error?: string;
  /** Additional metadata */
  metadata?: {
    /** Customer context */
    customer: string;
    /** Request duration */
    duration: number;
    /** Tool name */
    tool: string;
  };
}

/**
 * Property Manager tool parameters
 */
export interface ListPropertiesParams extends BaseMcpParams {
  /** Filter by contract ID */
  contractId?: string;
  /** Filter by group ID */
  groupId?: string;
}

export interface GetPropertyParams extends BaseMcpParams {
  /** Property ID */
  propertyId: string;
}

export interface CreatePropertyParams extends BaseMcpParams {
  /** Property name */
  propertyName: string;
  /** Product ID */
  productId: string;
  /** Contract ID */
  contractId: string;
  /** Group ID */
  groupId: string;
  /** Rule format version */
  ruleFormat?: string;
}

export interface ClonePropertyParams extends BaseMcpParams {
  /** Source property ID */
  propertyId: string;
  /** New property name */
  newPropertyName: string;
  /** Target contract ID */
  contractId?: string;
  /** Target group ID */
  groupId?: string;
}

export interface GetPropertyVersionParams extends BaseMcpParams {
  /** Property ID */
  propertyId: string;
  /** Version number */
  version: number;
}

export interface CreatePropertyVersionParams extends BaseMcpParams {
  /** Property ID */
  propertyId: string;
  /** Create from version number */
  createFromVersion?: number;
  /** Create from version etag */
  createFromVersionEtag?: string;
}

export interface UpdatePropertyRulesParams extends BaseMcpParams {
  /** Property ID */
  propertyId: string;
  /** Version number */
  version: number;
  /** Rule tree */
  rules: Record<string, unknown>;
}

export interface ActivatePropertyParams extends BaseMcpParams {
  /** Property ID */
  propertyId: string;
  /** Version to activate */
  version: number;
  /** Target network */
  network: NetworkEnvironment;
  /** Notification emails */
  emails?: string[];
  /** Activation note */
  note?: string;
}

/**
 * DNS tool parameters
 */
export interface ListZonesParams extends BaseMcpParams {
  /** Filter by contract ID */
  contractId?: string;
  /** Filter by zone type */
  type?: 'PRIMARY' | 'SECONDARY' | 'ALIAS';
}

export interface GetZoneParams extends BaseMcpParams {
  /** Zone name */
  zone: string;
}

export interface CreateZoneParams extends BaseMcpParams {
  /** Zone name */
  zone: string;
  /** Zone type */
  type: 'PRIMARY' | 'SECONDARY' | 'ALIAS';
  /** Contract ID */
  contractId: string;
  /** Comment */
  comment?: string;
  /** Sign and serve */
  signAndServe?: boolean;
}

export interface GetRecordsParams extends BaseMcpParams {
  /** Zone name */
  zone: string;
  /** Filter by record type */
  type?: string;
  /** Filter by record name */
  name?: string;
}

export interface CreateRecordParams extends BaseMcpParams {
  /** Zone name */
  zone: string;
  /** Record name */
  name: string;
  /** Record type */
  type: string;
  /** TTL in seconds */
  ttl: number;
  /** Record data */
  rdata: string[];
}

export interface UpdateRecordParams extends BaseMcpParams {
  /** Zone name */
  zone: string;
  /** Record name */
  name: string;
  /** Record type */
  type: string;
  /** New TTL */
  ttl?: number;
  /** New record data */
  rdata?: string[];
}

export interface DeleteRecordParams extends BaseMcpParams {
  /** Zone name */
  zone: string;
  /** Record name */
  name: string;
  /** Record type */
  type: string;
}

/**
 * Certificate tool parameters
 */
export interface UpdatePropertyDvParams extends BaseMcpParams {
  /** Property ID */
  propertyId: string;
  /** Property version */
  propertyVersion: number;
  /** Hostname to secure */
  hostname: string;
}

export interface UpdatePropertyCpsParams extends BaseMcpParams {
  /** Property ID */
  propertyId: string;
  /** Property version */
  propertyVersion: number;
  /** Certificate enrollment ID */
  enrollmentId: number;
}

/**
 * Network list tool parameters
 */
export interface ListNetworkListsParams extends BaseMcpParams {
  /** Filter by list type */
  type?: 'IP' | 'GEO';
  /** Include elements */
  includeElements?: boolean;
}

export interface GetNetworkListParams extends BaseMcpParams {
  /** Network list ID */
  listId: string;
  /** Include elements */
  includeElements?: boolean;
}

export interface CreateNetworkListParams extends BaseMcpParams {
  /** List name */
  name: string;
  /** List type */
  type: 'IP' | 'GEO';
  /** Description */
  description?: string;
  /** Initial elements */
  list?: string[];
}

export interface UpdateNetworkListParams extends BaseMcpParams {
  /** Network list ID */
  listId: string;
  /** New name */
  name?: string;
  /** New description */
  description?: string;
  /** Updated elements */
  list?: string[];
}

export interface ActivateNetworkListParams extends BaseMcpParams {
  /** Network list ID */
  listId: string;
  /** Target network */
  network: NetworkEnvironment;
  /** Comments */
  comments?: string;
  /** Notification emails */
  notificationRecipients?: string[];
}

/**
 * Purge tool parameters
 */
export interface PurgeByUrlParams extends BaseMcpParams {
  /** URLs to purge */
  urls: string[];
  /** Target network */
  network?: NetworkEnvironment;
}

export interface PurgeByCpCodeParams extends BaseMcpParams {
  /** CP codes to purge */
  cpCodes: string[];
  /** Target network */
  network?: NetworkEnvironment;
}

export interface PurgeByCacheTagParams extends BaseMcpParams {
  /** Cache tags to purge */
  cacheTags: string[];
  /** Target network */
  network?: NetworkEnvironment;
}

/**
 * Reporting tool parameters
 */
export interface GetTrafficReportParams extends BaseMcpParams {
  /** Start date (ISO format) */
  startDate: string;
  /** End date (ISO format) */
  endDate: string;
  /** CP codes to include */
  cpCodes?: string[];
  /** Report interval */
  interval?: 'FIVE_MINUTES' | 'HOUR' | 'DAY' | 'WEEK' | 'MONTH';
}

export interface GetCacheStatsParams extends BaseMcpParams {
  /** Start date (ISO format) */
  startDate: string;
  /** End date (ISO format) */
  endDate: string;
  /** CP codes to include */
  cpCodes?: string[];
}

/**
 * Security tool parameters
 */
export interface ListSecurityConfigsParams extends BaseMcpParams {
  /** Filter by contract ID */
  contractId?: string;
}

export interface GetSecurityConfigParams extends BaseMcpParams {
  /** Configuration ID */
  configId: number;
  /** Version number */
  version?: number;
}

export interface CreateSecurityConfigParams extends BaseMcpParams {
  /** Configuration name */
  name: string;
  /** Contract ID */
  contractId: string;
  /** Group ID */
  groupId: string;
  /** Hostnames to protect */
  hostnames: string[];
}

export interface UpdateWafRulesParams extends BaseMcpParams {
  /** Configuration ID */
  configId: number;
  /** Version number */
  version: number;
  /** WAF rules */
  rules: Array<{
    ruleId: string;
    action: 'ALERT' | 'DENY' | 'BLOCK';
  }>;
}

export interface ActivateSecurityConfigParams extends BaseMcpParams {
  /** Configuration ID */
  configId: number;
  /** Version to activate */
  version: number;
  /** Target network */
  network: NetworkEnvironment;
  /** Notification emails */
  notificationEmails?: string[];
  /** Activation notes */
  notes?: string;
}

/**
 * Tool schemas for validation
 */
export const ListPropertiesSchema = z.object({
  customer: z.string().optional(),
  contractId: z.string().optional(),
  groupId: z.string().optional()
});

export const GetPropertySchema = z.object({
  customer: z.string().optional(),
  propertyId: z.string()
});

export const CreatePropertySchema = z.object({
  customer: z.string().optional(),
  propertyName: z.string(),
  productId: z.string(),
  contractId: z.string(),
  groupId: z.string(),
  ruleFormat: z.string().optional()
});

export const ActivatePropertySchema = z.object({
  customer: z.string().optional(),
  propertyId: z.string(),
  version: z.number(),
  network: z.enum(['STAGING', 'PRODUCTION']),
  emails: z.array(z.string()).optional(),
  note: z.string().optional()
});

export const CreateZoneSchema = z.object({
  customer: z.string().optional(),
  zone: z.string(),
  type: z.enum(['PRIMARY', 'SECONDARY', 'ALIAS']),
  contractId: z.string(),
  comment: z.string().optional(),
  signAndServe: z.boolean().optional()
});

export const CreateRecordSchema = z.object({
  customer: z.string().optional(),
  zone: z.string(),
  name: z.string(),
  type: z.string(),
  ttl: z.number(),
  rdata: z.array(z.string())
});

export const PurgeByUrlSchema = z.object({
  customer: z.string().optional(),
  urls: z.array(z.string()),
  network: z.enum(['STAGING', 'PRODUCTION']).optional()
});

export const CreateNetworkListSchema = z.object({
  customer: z.string().optional(),
  name: z.string(),
  type: z.enum(['IP', 'GEO']),
  description: z.string().optional(),
  list: z.array(z.string()).optional()
});

/**
 * Tool metadata for registration
 */
export interface McpToolMetadata {
  /** Tool name */
  name: string;
  /** Tool description */
  description: string;
  /** Input schema */
  inputSchema: z.ZodSchema;
  /** Handler function */
  handler: (params: unknown) => Promise<McpToolResponse>;
}