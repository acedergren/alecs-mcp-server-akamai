/**
 * Consolidated Utility Tools for ALECS MCP Server
 * 
 * CODE KAI IMPLEMENTATION:
 * - Consolidates FastPurge, CP Codes, Includes, and Reporting tools
 * - Provides type-safe utility API interactions
 * - Implements consistent patterns across utility functions
 * - Eliminates 'unknown' type errors through proper schemas
 * 
 * This module handles content purging, CP code management,
 * property includes, and reporting functionality.
 */

import { z } from 'zod';
import { 
  AkamaiOperation,
  CustomerSchema,
  ContractIdSchema,
  GroupIdSchema,
  PropertyIdSchema,
  type MCPToolResponse
} from '../common';

/**
 * FastPurge schemas
 */
const FastPurgeNetworkSchema = z.enum(['staging', 'production']).default('production');

const FastPurgeByURLSchema = CustomerSchema.extend({
  urls: z.array(z.string().url()),
  network: FastPurgeNetworkSchema
});

const FastPurgeByCPCodeSchema = CustomerSchema.extend({
  cpcodes: z.array(z.string()),
  network: FastPurgeNetworkSchema
});

const FastPurgeByTagSchema = CustomerSchema.extend({
  tags: z.array(z.string()),
  network: FastPurgeNetworkSchema
});

const FastPurgeStatusSchema = CustomerSchema.extend({
  purgeId: z.string()
});

/**
 * CP Code schemas
 */
const CreateCPCodeSchema = CustomerSchema.extend({
  cpcodeName: z.string().min(1).max(128),
  contractId: ContractIdSchema,
  groupId: GroupIdSchema,
  productId: z.string()
});

const ListCPCodesSchema = CustomerSchema.extend({
  contractId: ContractIdSchema.optional(),
  groupId: GroupIdSchema.optional()
});

/**
 * Includes schemas
 */
const CreateIncludeSchema = CustomerSchema.extend({
  includeName: z.string().min(1).max(128),
  includeType: z.enum(['MICROSERVICES', 'COMMON_SETTINGS']),
  contractId: ContractIdSchema,
  groupId: GroupIdSchema,
  productId: z.string().optional()
});

/*
const ActivateIncludeSchema = CustomerSchema.extend({ // Unused schema
  includeId: z.string(),
  version: z.number().int().positive(),
  network: z.enum(['STAGING', 'PRODUCTION'])
});
*/

/**
 * Reporting schemas
 */
const GetTrafficReportSchema = CustomerSchema.extend({
  propertyId: PropertyIdSchema,
  startDate: z.string(),
  endDate: z.string(),
  granularity: z.enum(['FIVE_MINUTES', 'HOUR', 'DAY', 'WEEK', 'MONTH']).default('DAY'),
  metrics: z.array(z.enum(['edge_hits', 'edge_bandwidth', 'origin_hits', 'origin_bandwidth'])).default(['edge_hits', 'edge_bandwidth']),
  groupBy: z.enum(['cpcode', 'hostname', 'geo', 'protocol']).optional()
});

/**
 * Response schemas
 */
const PurgeResponseSchema = z.object({
  purgeId: z.string(),
  estimatedSeconds: z.number(),
  httpStatus: z.number(),
  detail: z.string(),
  supportId: z.string()
});

const CPCodeSchema = z.object({
  cpcodeId: z.number(),
  cpcodeName: z.string(),
  productIds: z.array(z.string()),
  createdDate: z.string().optional()
});

const IncludeSchema = z.object({
  includeId: z.string(),
  includeName: z.string(),
  includeType: z.string(),
  latestVersion: z.number()
});

/**
 * Consolidated utility tools implementation
 */
export class UtilityOperations extends AkamaiOperation {
  protected readonly domain = 'utility';

  /**
   * Invalidate content by URL
   */
  async fastPurgeByURL(args: z.infer<typeof FastPurgeByURLSchema>): Promise<MCPToolResponse> {
    const params = FastPurgeByURLSchema.parse(args);

    return this.executeStandardOperation(
      'fastpurge-url',
      params,
      async (client) => {
        const response = await this.makeTypedRequest(
          client,
          {
            path: '/ccu/v3/invalidate/url/' + params.network,
            method: 'POST',
            schema: PurgeResponseSchema,
            body: {
              objects: params.urls
            }
          }
        );

        return {
          purgeId: (response as any).purgeId,
          urls: params.urls,
          network: params.network,
          estimatedSeconds: (response as any).estimatedSeconds,
          message: `✅ Purge submitted (ID: ${response.purgeId}) - Estimated completion: ${response.estimatedSeconds}s`
        };
      },
      {
        customer: params.customer,
        format: 'text',
        successMessage: (result: any) => result.message
      }
    );
  }

  /**
   * Invalidate content by CP Code
   */
  async fastPurgeByCPCode(args: z.infer<typeof FastPurgeByCPCodeSchema>): Promise<MCPToolResponse> {
    const params = FastPurgeByCPCodeSchema.parse(args);

    return this.executeStandardOperation(
      'fastpurge-cpcode',
      params,
      async (client) => {
        const response = await this.makeTypedRequest(
          client,
          {
            path: '/ccu/v3/invalidate/cpcode/' + params.network,
            method: 'POST',
            schema: PurgeResponseSchema,
            body: {
              objects: params.cpcodes.map(cp => parseInt(cp.replace(/\D/g, '')))
            }
          }
        );

        return {
          purgeId: (response as any).purgeId,
          cpcodes: params.cpcodes,
          network: params.network,
          estimatedSeconds: (response as any).estimatedSeconds,
          message: `✅ CP Code purge submitted (ID: ${response.purgeId}) - Estimated completion: ${response.estimatedSeconds}s`
        };
      },
      {
        customer: params.customer,
        format: 'text',
        successMessage: (result: any) => result.message
      }
    );
  }

  /**
   * Invalidate content by cache tag
   */
  async fastPurgeByTag(args: z.infer<typeof FastPurgeByTagSchema>): Promise<MCPToolResponse> {
    const params = FastPurgeByTagSchema.parse(args);

    return this.executeStandardOperation(
      'fastpurge-tag',
      params,
      async (client) => {
        const response = await this.makeTypedRequest(
          client,
          {
            path: '/ccu/v3/invalidate/tag/' + params.network,
            method: 'POST',
            schema: PurgeResponseSchema,
            body: {
              objects: params.tags
            }
          }
        );

        return {
          purgeId: (response as any).purgeId,
          tags: params.tags,
          network: params.network,
          estimatedSeconds: (response as any).estimatedSeconds,
          message: `✅ Tag purge submitted (ID: ${response.purgeId}) - Estimated completion: ${response.estimatedSeconds}s`
        };
      },
      {
        customer: params.customer,
        format: 'text',
        successMessage: (result: any) => result.message
      }
    );
  }

  /**
   * Check FastPurge operation status
   */
  async fastPurgeStatus(args: z.infer<typeof FastPurgeStatusSchema>): Promise<MCPToolResponse> {
    const params = FastPurgeStatusSchema.parse(args);

    return this.executeStandardOperation(
      'fastpurge-status',
      params,
      async (client) => {
        const response = await this.makeTypedRequest(
          client,
          {
            path: `/ccu/v3/purges/${params.purgeId}`,
            method: 'GET',
            schema: z.object({
              purgeId: z.string(),
              purgeStatus: z.string(),
              completedTime: z.string().optional(),
              submittedTime: z.string(),
              progressUri: z.string().optional()
            })
          }
        );

        const statusEmoji = {
          'Done': '✅',
          'In-Progress': '🔄',
          'Submitted': '⏳',
          'Failed': '❌'
        }[response.purgeStatus] || '❓';

        return {
          purgeId: (response as any).purgeId,
          status: (response as any).purgeStatus,
          statusEmoji,
          submittedTime: (response as any).submittedTime,
          completedTime: (response as any).completedTime,
          message: `${statusEmoji} Purge ${params.purgeId} status: ${response.purgeStatus}`
        };
      },
      {
        customer: params.customer,
        cacheKey: (p) => `purge:${p.purgeId}:status`,
        cacheTtl: 10 // 10 seconds for status checks
      }
    );
  }

  /**
   * List CP codes
   */
  async listCPCodes(args: z.infer<typeof ListCPCodesSchema>): Promise<MCPToolResponse> {
    const params = ListCPCodesSchema.parse(args);

    return this.executeStandardOperation(
      'list-cpcodes',
      params,
      async (client) => {
        const response = await this.makeTypedRequest(
          client,
          {
            path: '/papi/v1/cpcodes',
            method: 'GET',
            schema: z.object({
              cpcodes: z.object({
                items: z.array(CPCodeSchema)
              })
            }),
            queryParams: {
              ...(params.contractId && { contractId: params.contractId }),
              ...(params.groupId && { groupId: params.groupId })
            }
          }
        );

        return {
          cpcodes: (response as any).cpcodes.items.map((cp: any) => ({
            cpcodeId: cp.cpcodeId,
            cpcodeName: cp.cpcodeName,
            productIds: cp.productIds,
            createdDate: cp.createdDate
          })),
          totalCount: (response as any).cpcodes.items.length
        };
      },
      {
        customer: params.customer,
        cacheKey: () => `cpcodes:list:${params.contractId || 'all'}:${params.groupId || 'all'}`,
        cacheTtl: 600 // 10 minutes
      }
    );
  }

  /**
   * Create a new CP code
   */
  async createCPCode(args: z.infer<typeof CreateCPCodeSchema>): Promise<MCPToolResponse> {
    const params = CreateCPCodeSchema.parse(args);

    return this.executeStandardOperation(
      'create-cpcode',
      params,
      async (client) => {
        const response = await this.makeTypedRequest(
          client,
          {
            path: '/papi/v1/cpcodes',
            method: 'POST',
            schema: z.object({
              cpcodeLink: z.string()
            }),
            body: {
              cpcodeName: params.cpcodeName,
              productId: params.productId
            },
            queryParams: {
              contractId: params.contractId,
              groupId: params.groupId
            }
          }
        );

        const cpcodeId = (response as any).cpcodeLink.split('/').pop();
        
        // Invalidate list cache
        await this.invalidateCache(['cpcodes:list:*']);

        return {
          cpcodeId,
          cpcodeName: params.cpcodeName,
          productId: params.productId,
          message: `✅ Created CP code "${params.cpcodeName}" with ID ${cpcodeId}`
        };
      },
      {
        customer: params.customer,
        format: 'text',
        successMessage: (result: any) => result.message
      }
    );
  }

  /**
   * List property includes
   */
  async listIncludes(args: {
    contractId?: string;
    groupId?: string;
    customer?: string;
  }): Promise<MCPToolResponse> {
    const params = z.object({
      contractId: ContractIdSchema.optional(),
      groupId: GroupIdSchema.optional(),
      customer: z.string().optional()
    }).parse(args);

    return this.executeStandardOperation(
      'list-includes',
      params,
      async (client) => {
        const response = await this.makeTypedRequest(
          client,
          {
            path: '/papi/v1/includes',
            method: 'GET',
            schema: z.object({
              includes: z.object({
                items: z.array(IncludeSchema)
              })
            }),
            queryParams: {
              ...(params.contractId && { contractId: params.contractId }),
              ...(params.groupId && { groupId: params.groupId })
            }
          }
        );

        return {
          includes: (response as any).includes.items.map((inc: any) => ({
            includeId: inc.includeId,
            includeName: inc.includeName,
            includeType: inc.includeType,
            latestVersion: inc.latestVersion
          })),
          totalCount: (response as any).includes.items.length
        };
      },
      {
        customer: params.customer,
        cacheKey: () => `includes:list:${params.contractId || 'all'}:${params.groupId || 'all'}`,
        cacheTtl: 600 // 10 minutes
      }
    );
  }

  /**
   * Create a new include
   */
  async createInclude(args: z.infer<typeof CreateIncludeSchema>): Promise<MCPToolResponse> {
    const params = CreateIncludeSchema.parse(args);

    return this.executeStandardOperation(
      'create-include',
      params,
      async (client) => {
        const response = await this.makeTypedRequest(
          client,
          {
            path: '/papi/v1/includes',
            method: 'POST',
            schema: z.object({
              includeLink: z.string()
            }),
            body: {
              includeName: params.includeName,
              includeType: params.includeType,
              productId: params.productId
            },
            queryParams: {
              contractId: params.contractId,
              groupId: params.groupId
            }
          }
        );

        const includeId = (response as any).includeLink.split('/').pop();
        
        // Invalidate list cache
        await this.invalidateCache(['includes:list:*']);

        return {
          includeId,
          includeName: params.includeName,
          includeType: params.includeType,
          message: `✅ Created ${params.includeType} include "${params.includeName}" with ID ${includeId}`
        };
      },
      {
        customer: params.customer,
        format: 'text',
        successMessage: (result: any) => result.message
      }
    );
  }

  /**
   * List contracts
   */
  async listContracts(args: { customer?: string }): Promise<MCPToolResponse> {
    const params = z.object({
      customer: z.string().optional()
    }).parse(args);

    return this.executeStandardOperation(
      'list-contracts',
      params,
      async (client) => {
        const response = await this.makeTypedRequest(
          client,
          {
            path: '/papi/v1/contracts',
            method: 'GET',
            schema: z.object({
              contracts: z.object({
                items: z.array(z.object({
                  contractId: z.string(),
                  contractTypeName: z.string()
                }))
              })
            })
          }
        );

        return {
          contracts: (response as any).contracts.items.map((contract: any) => ({
            contractId: contract.contractId,
            contractTypeName: contract.contractTypeName
          })),
          totalCount: (response as any).contracts.items.length
        };
      },
      {
        customer: params.customer,
        cacheKey: () => 'contracts:list',
        cacheTtl: 3600 // 1 hour
      }
    );
  }

  /**
   * List products
   */
  async listProducts(args: { customer?: string; contractId?: string }): Promise<MCPToolResponse> {
    const params = z.object({
      customer: z.string().optional(),
      contractId: ContractIdSchema.optional()
    }).parse(args);

    return this.executeStandardOperation(
      'list-products',
      params,
      async (client) => {
        const response = await this.makeTypedRequest(
          client,
          {
            path: '/papi/v1/products',
            method: 'GET',
            schema: z.object({
              products: z.object({
                items: z.array(z.object({
                  productId: z.string(),
                  productName: z.string()
                }))
              })
            }),
            queryParams: {
              ...(params.contractId && { contractId: params.contractId })
            }
          }
        );

        return {
          products: (response as any).products.items.map((product: any) => ({
            productId: product.productId,
            productName: product.productName
          })),
          totalCount: (response as any).products.items.length
        };
      },
      {
        customer: params.customer,
        cacheKey: () => `products:list:${params.contractId || 'all'}`,
        cacheTtl: 3600 // 1 hour
      }
    );
  }

  /**
   * Get traffic report
   */
  async getTrafficReport(args: z.infer<typeof GetTrafficReportSchema>): Promise<MCPToolResponse> {
    const params = GetTrafficReportSchema.parse(args);

    return this.executeStandardOperation(
      'get-traffic-report',
      params,
      async (client) => {
        const response = await this.makeTypedRequest(
          client,
          {
            path: '/reporting-api/v1/reports/traffic/http-requests-by-time',
            method: 'POST',
            schema: z.object({
              data: z.array(z.object({
                startTime: z.string(),
                edgeHits: z.number().optional(),
                edgeBandwidth: z.number().optional(),
                originHits: z.number().optional(),
                originBandwidth: z.number().optional()
              })),
              metadata: z.object({
                startTime: z.string(),
                endTime: z.string(),
                aggregation: z.string()
              })
            }),
            body: {
              objectIds: [params.propertyId],
              objectType: 'property',
              metrics: params.metrics,
              start: params.startDate,
              end: params.endDate,
              interval: params.granularity,
              ...(params.groupBy && { groupBy: [params.groupBy] })
            }
          }
        );

        // Format traffic data
        const formatBytes = (bytes: number) => {
          if (bytes === 0) return '0 Bytes';
          const k = 1024;
          const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
          const i = Math.floor(Math.log(bytes) / Math.log(k));
          return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        };

        const formatNumber = (num: number) => {
          return num.toLocaleString();
        };

        const data = (response as any).data.map((d: any) => ({
          time: d.startTime,
          edgeHits: d.edgeHits ? formatNumber(d.edgeHits) : '0',
          edgeBandwidth: d.edgeBandwidth ? formatBytes(d.edgeBandwidth) : '0 Bytes',
          originHits: d.originHits ? formatNumber(d.originHits) : '0',
          originBandwidth: d.originBandwidth ? formatBytes(d.originBandwidth) : '0 Bytes'
        }));

        return {
          propertyId: params.propertyId,
          period: {
            start: params.startDate,
            end: params.endDate
          },
          granularity: params.granularity,
          dataPoints: data.length,
          data
        };
      },
      {
        customer: params.customer,
        cacheKey: (p) => `traffic:${p.propertyId}:${p.startDate}:${p.endDate}:${p.granularity}`,
        cacheTtl: 3600 // 1 hour for reports
      }
    );
  }
}

// Export singleton instance
export const utilityOperations = new UtilityOperations();
export const utilityTools = utilityOperations; // @deprecated - use utilityOperations