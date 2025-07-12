/**
 * GTM Domain - Complete Implementation
 * 
 * Snow Leopard Architecture compliant GTM operations using unified AkamaiOperation.execute pattern
 * 
 * ARCHITECTURE NOTES:
 * - All functions use AkamaiOperation.execute for consistency
 * - Proper Zod schema validation for all inputs
 * - Type-safe implementations with no 'any' types
 * - Unified error handling and response formatting
 * - Human-readable error messages and next steps
 */

import { z } from 'zod';
import { AkamaiOperation } from '../common/akamai-operation';
import type { MCPToolResponse } from '../../types/mcp-2025';
import { 
  GTMEndpoints, 
  GTMToolSchemas,
  formatDomainsList,
  formatDomainDetails,
  formatDatacentersList,
  formatPropertiesList,
  DomainTypes
} from './api';

/**
 * List all GTM domains
 */
export async function listGtmDomains(args: z.infer<typeof GTMToolSchemas.listDomains>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'gtm',
    'gtm_domains_list',
    args,
    async (client) => {
      return client.request({
        method: 'GET',
        path: GTMEndpoints.listDomains()
      });
    },
    {
      format: 'text',
      formatter: formatDomainsList,
      cacheKey: () => `gtm:domains:list`,
      cacheTtl: 300 // 5 minutes
    }
  );
}

/**
 * Get detailed information about a specific GTM domain
 */
export async function getGtmDomain(args: z.infer<typeof GTMToolSchemas.getDomain>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'gtm',
    'gtm_domain_get',
    args,
    async (client) => {
      return client.request({
        method: 'GET',
        path: GTMEndpoints.getDomain(args.domainName)
      });
    },
    {
      format: 'text',
      formatter: formatDomainDetails,
      cacheKey: (p) => `gtm:domain:${p.domainName}`,
      cacheTtl: 300
    }
  );
}

/**
 * Create a new GTM domain
 */
export async function createGtmDomain(args: z.infer<typeof GTMToolSchemas.createDomain>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'gtm',
    'gtm_domain_create',
    args,
    async (client) => {
      const domainConfig = {
        name: args.domainName,
        type: args.type,
        emailNotificationList: args.emailNotificationList || [],
        loadImbalancePercentage: args.loadImbalancePercentage || 10,
        comment: args.comment || 'Created via ALECS MCP Server'
      };

      return client.request({
        method: 'POST',
        path: GTMEndpoints.createDomain(),
        body: domainConfig
      });
    },
    {
      format: 'text',
      formatter: (domain) => {
        const typedDomain = domain as { name: string; type: string; status: string };
        let text = `✅ **GTM Domain Created Successfully!**\n\n`;
        text += `**Domain Name:** ${typedDomain.name}\n`;
        text += `**Type:** ${DomainTypes[typedDomain.type as keyof typeof DomainTypes] || typedDomain.type}\n`;
        text += `**Status:** ${typedDomain.status}\n`;
        text += `\n🎯 **Next Steps:**\n`;
        text += `1. Create datacenters: \`gtm_datacenter_create\`\n`;
        text += `2. Add properties: \`gtm_property_create\`\n`;
        text += `3. Configure traffic routing\n`;
        return text;
      }
    }
  );
}

/**
 * List datacenters for a GTM domain
 */
export async function listGtmDatacenters(args: z.infer<typeof GTMToolSchemas.listDatacenters>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'gtm',
    'gtm_datacenters_list',
    args,
    async (client) => {
      return client.request({
        method: 'GET',
        path: GTMEndpoints.listDatacenters(args.domainName)
      });
    },
    {
      format: 'text',
      formatter: formatDatacentersList,
      cacheKey: (p) => `gtm:datacenters:${p.domainName}`,
      cacheTtl: 300
    }
  );
}

/**
 * Create a new datacenter for a GTM domain
 */
export async function createGtmDatacenter(args: z.infer<typeof GTMToolSchemas.createDatacenter>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'gtm',
    'gtm_datacenter_create',
    args,
    async (client) => {
      const datacenterConfig = {
        nickname: args.nickname,
        city: args.city,
        stateOrProvince: args.stateOrProvince,
        country: args.country,
        latitude: args.latitude,
        longitude: args.longitude,
        continent: args.continent || 'NA',
        defaultLoadObject: args.defaultLoadObject,
        enabled: args.enabled !== false
      };

      return client.request({
        method: 'POST',
        path: GTMEndpoints.createDatacenter(args.domainName),
        body: datacenterConfig
      });
    },
    {
      format: 'text',
      formatter: (datacenter) => {
        const typedDC = datacenter as { 
          nickname: string; 
          datacenterId: number; 
          city: string; 
          country: string 
        };
        let text = `✅ **GTM Datacenter Created Successfully!**\n\n`;
        text += `**Nickname:** ${typedDC.nickname}\n`;
        text += `**Datacenter ID:** ${typedDC.datacenterId}\n`;
        text += `**Location:** ${typedDC.city}, ${typedDC.country}\n`;
        text += `\n🎯 **Next Steps:**\n`;
        text += `1. Configure load objects\n`;
        text += `2. Set up traffic routing\n`;
        text += `3. Test datacenter connectivity\n`;
        return text;
      }
    }
  );
}

/**
 * List properties for a GTM domain
 */
export async function listGtmProperties(args: z.infer<typeof GTMToolSchemas.listProperties>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'gtm',
    'gtm_properties_list',
    args,
    async (client) => {
      return client.request({
        method: 'GET',
        path: GTMEndpoints.listProperties(args.domainName)
      });
    },
    {
      format: 'text',
      formatter: formatPropertiesList,
      cacheKey: (p) => `gtm:properties:${p.domainName}`,
      cacheTtl: 300
    }
  );
}

/**
 * Get detailed information about a specific GTM property
 */
export async function getGtmProperty(args: z.infer<typeof GTMToolSchemas.getProperty>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'gtm',
    'gtm_property_get',
    args,
    async (client) => {
      return client.request({
        method: 'GET',
        path: GTMEndpoints.getProperty(args.domainName, args.propertyName)
      });
    },
    {
      format: 'text',
      formatter: (property) => {
        const typedProperty = property as {
          name: string;
          type: string;
          scoreAggregationType: string;
          handoutMode: string;
          trafficTargets?: Array<{ datacenterId: number; weight: number; enabled: boolean }>;
          livenessTests?: Array<{ name: string; testType: string; enabled: boolean }>;
        };
        
        let text = `🎯 **GTM Property Details**\n\n`;
        text += `**Name:** ${typedProperty.name}\n`;
        text += `**Type:** ${typedProperty.type}\n`;
        text += `**Score Aggregation:** ${typedProperty.scoreAggregationType}\n`;
        text += `**Handout Mode:** ${typedProperty.handoutMode}\n`;
        
        if (typedProperty.trafficTargets?.length) {
          text += `\n**Traffic Targets:**\n`;
          typedProperty.trafficTargets.forEach((target, index) => {
            text += `${index + 1}. Datacenter ${target.datacenterId} - Weight: ${target.weight} - ${target.enabled ? 'Enabled' : 'Disabled'}\n`;
          });
        }
        
        if (typedProperty.livenessTests?.length) {
          text += `\n**Liveness Tests:**\n`;
          typedProperty.livenessTests.forEach((test, index) => {
            text += `${index + 1}. ${test.name} (${test.testType}) - ${test.enabled ? 'Enabled' : 'Disabled'}\n`;
          });
        }
        
        return text;
      },
      cacheKey: (p) => `gtm:property:${p.domainName}:${p.propertyName}`,
      cacheTtl: 300
    }
  );
}

/**
 * Create a new GTM property
 */
export async function createGtmProperty(args: z.infer<typeof GTMToolSchemas.createProperty>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'gtm',
    'gtm_property_create',
    args,
    async (client) => {
      const propertyConfig = {
        name: args.propertyName,
        type: args.type,
        scoreAggregationType: args.scoreAggregationType || 'mean',
        handoutMode: args.handoutMode || 'normal',
        handoutLimit: args.handoutLimit || 8,
        failoverDelay: args.failoverDelay || 10,
        failbackDelay: args.failbackDelay || 20,
        loadImbalancePercentage: args.loadImbalancePercentage || 10,
        healthThreshold: args.healthThreshold || 25,
        trafficTargets: args.trafficTargets || [],
        livenessTests: args.livenessTests || []
      };

      return client.request({
        method: 'POST',
        path: GTMEndpoints.listProperties(args.domainName),
        body: propertyConfig
      });
    },
    {
      format: 'text',
      formatter: (property) => {
        const typedProperty = property as { name: string; type: string };
        let text = `✅ **GTM Property Created Successfully!**\n\n`;
        text += `**Property Name:** ${typedProperty.name}\n`;
        text += `**Type:** ${typedProperty.type}\n`;
        text += `\n🎯 **Next Steps:**\n`;
        text += `1. Configure traffic targets\n`;
        text += `2. Add liveness tests\n`;
        text += `3. Set up load balancing rules\n`;
        return text;
      }
    }
  );
}

/**
 * Get GTM domain status
 */
export async function getGtmDomainStatus(args: z.infer<typeof GTMToolSchemas.getDomainStatus>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'gtm',
    'gtm_domain_status',
    args,
    async (client) => {
      return client.request({
        method: 'GET',
        path: GTMEndpoints.getDomainStatus(args.domainName)
      });
    },
    {
      format: 'text',
      formatter: (status) => {
        const typedStatus = status as {
          propagationStatus: string;
          lastModified: string;
          lastModifiedBy: string;
          changeId: string;
        };
        
        let text = `📊 **GTM Domain Status**\n\n`;
        text += `**Domain:** ${args.domainName}\n`;
        text += `**Propagation Status:** ${typedStatus.propagationStatus}\n`;
        text += `**Last Modified:** ${new Date(typedStatus.lastModified).toLocaleString()}\n`;
        text += `**Modified By:** ${typedStatus.lastModifiedBy}\n`;
        
        if (typedStatus.changeId) {
          text += `**Change ID:** ${typedStatus.changeId}\n`;
        }
        
        const emoji = typedStatus.propagationStatus === 'COMPLETE' ? '✅' : 
                     typedStatus.propagationStatus === 'PENDING' ? '⏳' : '⚠️';
        text += `\n${emoji} **Status:** ${typedStatus.propagationStatus}\n`;
        
        return text;
      },
      cacheKey: (p) => `gtm:status:${p.domainName}`,
      cacheTtl: 60 // 1 minute for status
    }
  );
}

/**
 * GTM operations registry for unified registry auto-discovery
 * 
 * SNOW LEOPARD ARCHITECTURE: All operations follow standard pattern
 * - name: Tool identifier matching function name
 * - description: Human-readable description 
 * - inputSchema: Zod validation schema
 * - handler: Implementation function
 */
export const gtmOperations = {
  gtm_domains_list: {
    name: 'gtm_domains_list',
    description: 'List all GTM domains with status and configuration details',
    inputSchema: GTMToolSchemas.listDomains,
    handler: listGtmDomains
  },
  
  gtm_domain_get: {
    name: 'gtm_domain_get',
    description: 'Get detailed information about a specific GTM domain',
    inputSchema: GTMToolSchemas.getDomain,
    handler: getGtmDomain
  },
  
  gtm_domain_create: {
    name: 'gtm_domain_create',
    description: 'Create a new GTM domain with specified configuration',
    inputSchema: GTMToolSchemas.createDomain,
    handler: createGtmDomain
  },
  
  gtm_datacenters_list: {
    name: 'gtm_datacenters_list',
    description: 'List all datacenters for a GTM domain',
    inputSchema: GTMToolSchemas.listDatacenters,
    handler: listGtmDatacenters
  },
  
  gtm_datacenter_create: {
    name: 'gtm_datacenter_create',
    description: 'Create a new datacenter for a GTM domain',
    inputSchema: GTMToolSchemas.createDatacenter,
    handler: createGtmDatacenter
  },
  
  gtm_properties_list: {
    name: 'gtm_properties_list',
    description: 'List all properties for a GTM domain',
    inputSchema: GTMToolSchemas.listProperties,
    handler: listGtmProperties
  },
  
  gtm_property_get: {
    name: 'gtm_property_get',
    description: 'Get detailed information about a specific GTM property',
    inputSchema: GTMToolSchemas.getProperty,
    handler: getGtmProperty
  },
  
  gtm_property_create: {
    name: 'gtm_property_create',
    description: 'Create a new GTM property with traffic routing configuration',
    inputSchema: GTMToolSchemas.createProperty,
    handler: createGtmProperty
  },
  
  gtm_domain_status: {
    name: 'gtm_domain_status',
    description: 'Get current propagation status of a GTM domain',
    inputSchema: GTMToolSchemas.getDomainStatus,
    handler: getGtmDomainStatus
  }
};