/**
 * Utilities Domain Tools
 * 
 * Unified implementation using AkamaiOperation.execute pattern
 * Handles FastPurge, CP Codes, Includes, Contracts, Products, and Traffic Reports
 * 
 * Updated: 2025-07-12 - Converted from class-based to unified functional pattern
 */

import { type MCPToolResponse, AkamaiOperation } from '../common';
import { 
  UtilityToolSchemas, 
  UtilityEndpoints,
  formatPurgeResponse,
  formatCPCodeList,
  formatIncludeList,
  formatContractList,
  formatProductList,
  formatTrafficReport
} from './api';
import type { z } from 'zod';

/**
 * FastPurge by URL
 */
export async function fastPurgeByURL(args: z.infer<typeof UtilityToolSchemas.fastPurgeByURL>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'utility',
    'fastpurge_url',
    args,
    async (client) => {
      const response = await client.request({
        method: 'POST',
        path: UtilityEndpoints.fastPurgeByURL(args.network),
        body: {
          objects: args.urls
        }
      });

      return {
        purgeId: response.purgeId,
        urls: args.urls,
        network: args.network,
        estimatedSeconds: response.estimatedSeconds,
        supportId: response.supportId,
        message: `Purge submitted (ID: ${response.purgeId}) - Estimated completion: ${response.estimatedSeconds}s`
      };
    },
    {
      format: 'text',
      formatter: formatPurgeResponse
    }
  );
}

/**
 * FastPurge by CP Code
 */
export async function fastPurgeByCPCode(args: z.infer<typeof UtilityToolSchemas.fastPurgeByCPCode>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'utility',
    'fastpurge_cpcode',
    args,
    async (client) => {
      const response = await client.request({
        method: 'POST',
        path: UtilityEndpoints.fastPurgeByCPCode(args.network),
        body: {
          objects: args.cpcodes.map(cp => parseInt(cp.replace(/\D/g, '')))
        }
      });

      return {
        purgeId: response.purgeId,
        cpcodes: args.cpcodes,
        network: args.network,
        estimatedSeconds: response.estimatedSeconds,
        supportId: response.supportId,
        message: `CP Code purge submitted (ID: ${response.purgeId}) - Estimated completion: ${response.estimatedSeconds}s`
      };
    },
    {
      format: 'text',
      formatter: formatPurgeResponse
    }
  );
}

/**
 * FastPurge by Tag
 */
export async function fastPurgeByTag(args: z.infer<typeof UtilityToolSchemas.fastPurgeByTag>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'utility',
    'fastpurge_tag',
    args,
    async (client) => {
      const response = await client.request({
        method: 'POST',
        path: UtilityEndpoints.fastPurgeByTag(args.network),
        body: {
          objects: args.tags
        }
      });

      return {
        purgeId: response.purgeId,
        tags: args.tags,
        network: args.network,
        estimatedSeconds: response.estimatedSeconds,
        supportId: response.supportId,
        message: `Tag purge submitted (ID: ${response.purgeId}) - Estimated completion: ${response.estimatedSeconds}s`
      };
    },
    {
      format: 'text',
      formatter: formatPurgeResponse
    }
  );
}

/**
 * Check FastPurge status
 */
export async function fastPurgeStatus(args: z.infer<typeof UtilityToolSchemas.fastPurgeStatus>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'utility',
    'fastpurge_status',
    args,
    async (client) => {
      const response = await client.request({
        method: 'GET',
        path: UtilityEndpoints.fastPurgeStatus(args.purgeId)
      });

      const statusEmoji = {
        'Done': 'Complete',
        'In-Progress': 'Processing',
        'Submitted': 'Queued',
        'Failed': 'Failed'
      }[response.purgeStatus] || response.purgeStatus;

      return {
        purgeId: response.purgeId,
        status: response.purgeStatus,
        statusEmoji,
        submittedTime: response.submittedTime,
        completedTime: response.completedTime,
        message: `${statusEmoji} Purge ${args.purgeId} status: ${response.purgeStatus}`
      };
    },
    {
      format: 'text',
      formatter: formatPurgeResponse,
      cacheKey: (p) => `purge:${p.purgeId}:status`,
      cacheTtl: 10 // 10 seconds for status checks
    }
  );
}

/**
 * Create CP Code
 */
export async function createCPCode(args: z.infer<typeof UtilityToolSchemas.createCPCode>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'utility',
    'cpcode_create',
    args,
    async (client) => {
      const response = await client.request({
        method: 'POST',
        path: UtilityEndpoints.createCPCode(),
        body: {
          cpcodeName: args.cpcodeName,
          productId: args.productId
        },
        queryParams: {
          contractId: args.contractId,
          groupId: args.groupId
        }
      });

      const cpcodeId = response.cpcodeLink?.split('/').pop();
      
      return {
        cpcodeId,
        cpcodeName: args.cpcodeName,
        productId: args.productId,
        message: `Created CP code "${args.cpcodeName}" with ID ${cpcodeId}`
      };
    },
    {
      format: 'text',
      formatter: (data) => {
        let text = `CP Code Created Successfully!\n\n`;
        text += `Name: ${data.cpcodeName}\n`;
        text += `ID: ${data.cpcodeId}\n`;
        text += `Product: ${data.productId}\n`;
        return text;
      }
    }
  );
}

/**
 * List CP Codes
 */
export async function listCPCodes(args: z.infer<typeof UtilityToolSchemas.listCPCodes>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'utility',
    'cpcode_list',
    args,
    async (client) => {
      const queryParams: any = {};
      if (args.contractId) queryParams.contractId = args.contractId;
      if (args.groupId) queryParams.groupId = args.groupId;

      const response = await client.request({
        method: 'GET',
        path: UtilityEndpoints.listCPCodes(),
        queryParams
      });

      return {
        cpcodes: response.cpcodes?.items || [],
        totalCount: response.cpcodes?.items?.length || 0
      };
    },
    {
      format: 'text',
      formatter: formatCPCodeList,
      cacheKey: (p) => `cpcodes:list:${p.contractId || 'all'}:${p.groupId || 'all'}`,
      cacheTtl: 600 // 10 minutes
    }
  );
}

/**
 * Create Include
 */
export async function createInclude(args: z.infer<typeof UtilityToolSchemas.createInclude>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'utility',
    'include_create',
    args,
    async (client) => {
      const response = await client.request({
        method: 'POST',
        path: UtilityEndpoints.createInclude(),
        body: {
          includeName: args.includeName,
          includeType: args.includeType,
          productId: args.productId
        },
        queryParams: {
          contractId: args.contractId,
          groupId: args.groupId
        }
      });

      const includeId = response.includeLink?.split('/').pop();
      
      return {
        includeId,
        includeName: args.includeName,
        includeType: args.includeType,
        message: `Created ${args.includeType} include "${args.includeName}" with ID ${includeId}`
      };
    },
    {
      format: 'text',
      formatter: (data) => {
        let text = `Include Created Successfully!\n\n`;
        text += `Name: ${data.includeName}\n`;
        text += `ID: ${data.includeId}\n`;
        text += `Type: ${data.includeType}\n`;
        return text;
      }
    }
  );
}

/**
 * List Includes
 */
export async function listIncludes(args: z.infer<typeof UtilityToolSchemas.listIncludes>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'utility',
    'include_list',
    args,
    async (client) => {
      const queryParams: any = {};
      if (args.contractId) queryParams.contractId = args.contractId;
      if (args.groupId) queryParams.groupId = args.groupId;

      const response = await client.request({
        method: 'GET',
        path: UtilityEndpoints.listIncludes(),
        queryParams
      });

      return {
        includes: response.includes?.items || [],
        totalCount: response.includes?.items?.length || 0
      };
    },
    {
      format: 'text',
      formatter: formatIncludeList,
      cacheKey: (p) => `includes:list:${p.contractId || 'all'}:${p.groupId || 'all'}`,
      cacheTtl: 600 // 10 minutes
    }
  );
}

/**
 * List Contracts
 */
export async function listContracts(args: z.infer<typeof UtilityToolSchemas.listContracts>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'utility',
    'contract_list',
    args,
    async (client) => {
      const response = await client.request({
        method: 'GET',
        path: UtilityEndpoints.listContracts()
      });

      return {
        contracts: response.contracts?.items || [],
        totalCount: response.contracts?.items?.length || 0
      };
    },
    {
      format: 'text',
      formatter: formatContractList,
      cacheKey: () => 'contracts:list',
      cacheTtl: 3600 // 1 hour
    }
  );
}

/**
 * List Products
 */
export async function listProducts(args: z.infer<typeof UtilityToolSchemas.listProducts>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'utility',
    'product_list',
    args,
    async (client) => {
      const queryParams: any = {};
      if (args.contractId) queryParams.contractId = args.contractId;

      const response = await client.request({
        method: 'GET',
        path: UtilityEndpoints.listProducts(),
        queryParams
      });

      return {
        products: response.products?.items || [],
        totalCount: response.products?.items?.length || 0
      };
    },
    {
      format: 'text',
      formatter: formatProductList,
      cacheKey: (p) => `products:list:${p.contractId || 'all'}`,
      cacheTtl: 3600 // 1 hour
    }
  );
}

/**
 * Get Traffic Report
 */
export async function getTrafficReport(args: z.infer<typeof UtilityToolSchemas.getTrafficReport>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'utility',
    'traffic_report',
    args,
    async (client) => {
      const response = await client.request({
        method: 'POST',
        path: UtilityEndpoints.trafficReport(),
        body: {
          objectIds: [args.propertyId],
          objectType: 'property',
          metrics: args.metrics,
          start: args.startDate,
          end: args.endDate,
          interval: args.granularity,
          ...(args.groupBy && { groupBy: [args.groupBy] })
        }
      });

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

      const data = response.data?.map((d: any) => ({
        time: d.startTime,
        edgeHits: d.edgeHits ? formatNumber(d.edgeHits) : '0',
        edgeBandwidth: d.edgeBandwidth ? formatBytes(d.edgeBandwidth) : '0 Bytes',
        originHits: d.originHits ? formatNumber(d.originHits) : '0',
        originBandwidth: d.originBandwidth ? formatBytes(d.originBandwidth) : '0 Bytes'
      })) || [];

      return {
        propertyId: args.propertyId,
        period: {
          start: args.startDate,
          end: args.endDate
        },
        granularity: args.granularity,
        dataPoints: data.length,
        data
      };
    },
    {
      format: 'text',
      formatter: formatTrafficReport,
      cacheKey: (p) => `traffic:${p.propertyId}:${p.startDate}:${p.endDate}:${p.granularity}`,
      cacheTtl: 3600 // 1 hour for reports
    }
  );
}