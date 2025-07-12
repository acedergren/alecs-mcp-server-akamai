/**
 * Edge Hostname Domain Tools
 * 
 * Unified implementation using AkamaiOperation.execute pattern
 * Provides comprehensive edge hostname management operations
 * 
 * Updated: 2025-07-12 - Converted from class-based to unified functional pattern
 */

import { type MCPToolResponse, AkamaiOperation } from '../common';
import { 
  EdgeHostnameToolSchemas, 
  EdgeHostnameEndpoints,
  formatEdgeHostnameList,
  formatEdgeHostnameDetails,
  formatEdgeHostnameCreated
} from './api';
import type { z } from 'zod';

/**
 * Create edge hostname
 */
export async function createEdgeHostname(args: z.infer<typeof EdgeHostnameToolSchemas.create>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'edge-hostname',
    'edge_hostname_create',
    args,
    async (client) => {
      const response = await client.request({
        method: 'POST',
        path: EdgeHostnameEndpoints.create(),
        body: {
          domainPrefix: args.domainPrefix,
          domainSuffix: args.domainSuffix,
          productId: args.productId,
          secureNetwork: args.secureNetwork,
          ipVersionBehavior: args.ipVersionBehavior,
          ...(args.certificateEnrollmentId && {
            certEnrollmentId: args.certificateEnrollmentId
          }),
          ...(args.slotNumber !== undefined && {
            slotNumber: args.slotNumber
          }),
          ...(args.comments && { comments: args.comments })
        },
        queryParams: {
          // These would normally come from customer context
          contractId: 'ctr_DEFAULT',
          groupId: 'grp_DEFAULT'
        }
      });

      const edgeHostnameId = response.edgeHostnameLink?.split('/').pop() || response.edgeHostnameId;
      
      return {
        edgeHostnameId,
        domainPrefix: args.domainPrefix,
        domainSuffix: args.domainSuffix,
        secureNetwork: args.secureNetwork,
        ipVersionBehavior: args.ipVersionBehavior,
        domainName: `${args.domainPrefix}.${args.domainSuffix}`
      };
    },
    {
      format: 'text',
      formatter: formatEdgeHostnameCreated
    }
  );
}

/**
 * List edge hostnames
 */
export async function listEdgeHostnames(args: z.infer<typeof EdgeHostnameToolSchemas.list>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'edge-hostname',
    'edge_hostname_list',
    args,
    async (client) => {
      const queryParams: any = {};
      
      if (args.contractId) queryParams.contractId = args.contractId;
      if (args.groupId) queryParams.groupId = args.groupId;
      if (args.limit) queryParams.limit = args.limit;
      if (args.offset) queryParams.offset = args.offset;
      
      // Add default contract/group if not provided
      if (!args.contractId) queryParams.contractId = 'ctr_DEFAULT';
      if (!args.groupId) queryParams.groupId = 'grp_DEFAULT';
      
      const response = await client.request({
        method: 'GET',
        path: EdgeHostnameEndpoints.list(),
        queryParams
      });

      return {
        edgeHostnames: response.edgeHostnames?.items || response.edgeHostnames || [],
        totalCount: response.edgeHostnames?.items?.length || 0
      };
    },
    {
      format: 'text',
      formatter: formatEdgeHostnameList,
      cacheKey: (p) => `edge-hostname:list:${p.contractId || 'all'}:${p.groupId || 'all'}:${p.offset || 0}`,
      cacheTtl: 300
    }
  );
}

/**
 * Get edge hostname details
 */
export async function getEdgeHostname(args: z.infer<typeof EdgeHostnameToolSchemas.get>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'edge-hostname',
    'edge_hostname_get',
    args,
    async (client) => {
      const queryParams: any = {};
      
      if (args.contractId) queryParams.contractId = args.contractId;
      if (args.groupId) queryParams.groupId = args.groupId;
      
      // Add defaults if not provided
      if (!args.contractId) queryParams.contractId = 'ctr_DEFAULT';
      if (!args.groupId) queryParams.groupId = 'grp_DEFAULT';

      const response = await client.request({
        method: 'GET',
        path: EdgeHostnameEndpoints.get(args.edgeHostnameId),
        queryParams
      });

      return response.edgeHostname || response;
    },
    {
      format: 'text',
      formatter: formatEdgeHostnameDetails,
      cacheKey: (p) => `edge-hostname:${p.edgeHostnameId}`,
      cacheTtl: 300
    }
  );
}

/**
 * Update edge hostname
 */
export async function updateEdgeHostname(args: z.infer<typeof EdgeHostnameToolSchemas.update>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'edge-hostname',
    'edge_hostname_update',
    args,
    async (client) => {
      const updateData: any = {};
      
      if (args.ipVersionBehavior) updateData.ipVersionBehavior = args.ipVersionBehavior;
      if (args.certificateEnrollmentId !== undefined) updateData.certificateEnrollmentId = args.certificateEnrollmentId;
      if (args.comments !== undefined) updateData.comments = args.comments;

      const response = await client.request({
        method: 'PUT',
        path: EdgeHostnameEndpoints.update(args.edgeHostnameId),
        body: updateData
      });

      return {
        edgeHostnameId: args.edgeHostnameId,
        updates: updateData,
        ...response
      };
    },
    {
      format: 'text',
      formatter: (data) => {
        let text = `Edge Hostname Updated\n\n`;
        text += `Edge Hostname ID: ${data.edgeHostnameId}\n`;
        
        Object.keys(data.updates).forEach(key => {
          text += `${key}: ${data.updates[key]}\n`;
        });
        
        text += `\nNext Steps:\n`;
        text += `1. Verify changes: edge_hostname_list\n`;
        text += `2. Update properties using this edge hostname\n`;
        text += `3. Test configuration changes\n`;
        
        return text;
      }
    }
  );
}

/**
 * Delete edge hostname
 */
export async function deleteEdgeHostname(args: z.infer<typeof EdgeHostnameToolSchemas.delete>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'edge-hostname',
    'edge_hostname_delete',
    args,
    async (client) => {
      // Check if hostname is in use unless force is true
      if (!args.force) {
        try {
          const usageResponse = await client.request({
            method: 'GET',
            path: EdgeHostnameEndpoints.usage(args.edgeHostnameId)
          });
          
          const properties = usageResponse.properties?.items || [];
          if (properties.length > 0) {
            return {
              error: 'Edge hostname is in use',
              properties: properties.map((p: any) => p.propertyName || p.propertyId),
              suggestion: 'Remove from properties first or use force=true'
            };
          }
        } catch (error) {
          // Usage check failed, proceed with caution
        }
      }

      await client.request({
        method: 'DELETE',
        path: EdgeHostnameEndpoints.delete(args.edgeHostnameId)
      });

      return {
        edgeHostnameId: args.edgeHostnameId,
        deleted: true
      };
    },
    {
      format: 'text',
      formatter: (data) => {
        if (data.error) {
          let text = `Cannot Delete Edge Hostname\n\n`;
          text += `Reason: ${data.error}\n`;
          text += `Properties Using This Hostname:\n`;
          data.properties.forEach((prop: string) => {
            text += `- ${prop}\n`;
          });
          text += `\nSuggestion: ${data.suggestion}\n`;
          return text;
        }

        let text = `Edge Hostname Deleted\n\n`;
        text += `Edge Hostname ID: ${data.edgeHostnameId}\n`;
        text += `Status: Successfully deleted\n\n`;
        text += `Warning: This action cannot be undone.\n`;
        text += `Make sure no properties are using this edge hostname.\n`;
        
        return text;
      }
    }
  );
}