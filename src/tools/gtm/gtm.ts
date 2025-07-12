/**
 * GTM Domain Tools
 * 
 * Complete implementation of Akamai Global Traffic Management (GTM) tools
 * 
 * CODE KAI PRINCIPLES APPLIED:
 * Key: Production-grade GTM operations
 * Approach: Type-safe implementation with comprehensive error handling
 * Implementation: Full API coverage for Global Traffic Management
 * 
 * Updated on 2025-01-11 to use AkamaiOperation.execute pattern
 */

import { type MCPToolResponse, AkamaiOperation } from '../common';
import { 
  GTMEndpoints, 
  GTMToolSchemas,
  formatDatacenterLocation,
  formatPropertyType,
  formatTestProtocol,
  formatTrafficDistribution,
  DomainTypes
} from './api';
import type { z } from 'zod';

interface GTMResponse {
  domains?: any[];
  domain?: any;
  datacenters?: any[];
  properties?: any[];
  resources?: any[];
  maps?: any[];
  geographicMaps?: any[];
  cidrMaps?: any[];
  asMaps?: any[];
  status?: any;
  history?: any[];
  identity?: any;
  contracts?: any[];
  groups?: any[];
  datacenterId?: number;
  name?: string;
  type?: string;
  nickname?: string;
  lastModified?: string;
  lastModifiedBy?: string;
  propagationStatus?: string;
}

/**
 * Format domains list for display
 */
function formatDomainsList(response: GTMResponse): string {
  const domains = (response as any).domains || [];
  
  let text = `🌐 **GTM Domains**\n`;
  text += `Total Domains: ${domains.length}\n\n`;
  
  if (domains.length > 0) {
    domains.forEach((domain: any, index: number) => {
      text += `${index + 1}. **${domain.name}** (${DomainTypes[domain.type as keyof typeof DomainTypes] || domain.type})\n`;
      text += `   • Status: ${domain.status}\n`;
      text += `   • Last Modified: ${domain.lastModified}\n`;
      if (domain.lastModifiedBy) {
        text += `   • Modified By: ${domain.lastModifiedBy}\n`;
      }
      text += `\n`;
    });
  } else {
    text += '⚠️ No GTM domains found.\n';
  }
  
  return text;
}

/**
 * Format domain details
 */
function formatDomainDetails(domain: any): string {
  let text = `🌐 **GTM Domain Details**\n\n`;
  text += `**Name**: ${domain.name}\n`;
  text += `**Type**: ${DomainTypes[domain.type as keyof typeof DomainTypes] || domain.type}\n`;
  text += `**Status**: ${domain.status}\n`;
  
  if (domain.loadImbalancePercentage) {
    text += `**Load Imbalance**: ${domain.loadImbalancePercentage}%\n`;
  }
  
  text += `**Last Modified**: ${domain.lastModified}\n`;
  if (domain.lastModifiedBy) {
    text += `**Modified By**: ${domain.lastModifiedBy}\n`;
  }
  
  if (domain.datacenters && domain.datacenters.length > 0) {
    text += `\n**Datacenters** (${domain.datacenters.length}):\n`;
    domain.datacenters.forEach((dc: any, index: number) => {
      text += `${index + 1}. ${dc.nickname} (ID: ${dc.datacenterId})\n`;
      text += `   • Location: ${formatDatacenterLocation(dc)}\n`;
      text += `   • Enabled: ${dc.enabled ? 'Yes' : 'No'}\n`;
    });
  }
  
  if (domain.properties && domain.properties.length > 0) {
    text += `\n**Properties** (${domain.properties.length}):\n`;
    domain.properties.forEach((prop: any, index: number) => {
      text += `${index + 1}. ${prop.name} (${formatPropertyType(prop.type)})\n`;
      text += `   • Score Aggregation: ${prop.scoreAggregationType}\n`;
      text += `   • Traffic Targets: ${prop.trafficTargets?.length || 0}\n`;
    });
  }
  
  return text;
}

/**
 * Format datacenters list
 */
function formatDatacentersList(response: GTMResponse, domainName: string): string {
  const datacenters = (response as any).datacenters || [];
  
  let text = `🏢 **GTM Datacenters** for ${domainName}\n`;
  text += `Total Datacenters: ${datacenters.length}\n\n`;
  
  if (datacenters.length > 0) {
    datacenters.forEach((dc: any, index: number) => {
      text += `${index + 1}. **${dc.nickname}** (ID: ${dc.datacenterId})\n`;
      text += `   • Location: ${formatDatacenterLocation(dc)}\n`;
      text += `   • Enabled: ${dc.enabled ? 'Yes' : 'No'}\n`;
      text += `   • Virtual: ${dc.virtual ? 'Yes' : 'No'}\n`;
      text += `\n`;
    });
  } else {
    text += '⚠️ No datacenters found.\n';
  }
  
  return text;
}

/**
 * Format properties list
 */
function formatPropertiesList(response: GTMResponse, domainName: string): string {
  const properties = (response as any).properties || [];
  
  let text = `📊 **GTM Properties** for ${domainName}\n`;
  text += `Total Properties: ${properties.length}\n\n`;
  
  if (properties.length > 0) {
    properties.forEach((prop: any, index: number) => {
      text += `${index + 1}. **${prop.name}** (${formatPropertyType(prop.type)})\n`;
      text += `   • Score Aggregation: ${prop.scoreAggregationType}\n`;
      text += `   • Handout Mode: ${prop.handoutMode}\n`;
      text += `   • Traffic Targets: ${prop.trafficTargets?.length || 0}\n`;
      text += `   • Liveness Tests: ${prop.livenessTests?.length || 0}\n`;
      text += `\n`;
    });
  } else {
    text += '⚠️ No properties found.\n';
  }
  
  return text;
}

/**
 * Format property details with traffic distribution
 */
function formatPropertyDetails(property: any, domainName: string): string {
  let text = `📊 **GTM Property Details**\n\n`;
  text += `**Domain**: ${domainName}\n`;
  text += `**Name**: ${(property as any).name}\n`;
  text += `**Type**: ${formatPropertyType((property as any).type)}\n`;
  text += `**Score Aggregation**: ${(property as any).scoreAggregationType}\n`;
  text += `**Handout Mode**: ${(property as any).handoutMode}\n`;
  
  if ((property as any).trafficTargets && (property as any).trafficTargets.length > 0) {
    text += `\n**Traffic Distribution**:\n`;
    text += formatTrafficDistribution((property as any).trafficTargets);
  }
  
  if ((property as any).livenessTests && (property as any).livenessTests.length > 0) {
    text += `\n**Liveness Tests**:\n`;
    (property as any).livenessTests.forEach((test: any, index: number) => {
      text += `${index + 1}. ${test.name} (${formatTestProtocol(test.testProtocol)})\n`;
      text += `   • Test Object: ${test.testObject}\n`;
      text += `   • Interval: ${test.testInterval}s\n`;
      text += `   • Timeout: ${test.testTimeout}s\n`;
    });
  }
  
  return text;
}

/**
 * List all GTM domains
 */
export async function listDomains(args: z.infer<typeof GTMToolSchemas.listDomains>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'gtm',
    'gtm_list_domains',
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
      cacheKey: () => 'gtm:domains:list',
      cacheTtl: 300 // 5 minutes
    }
  );
}

/**
 * Get GTM domain details
 */
export async function getDomain(args: z.infer<typeof GTMToolSchemas.getDomain>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'gtm',
    'gtm_get_domain',
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
      cacheTtl: 300 // 5 minutes
    }
  );
}

/**
 * Create GTM domain
 */
export async function createDomain(args: z.infer<typeof GTMToolSchemas.createDomain>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'gtm',
    'gtm_create_domain',
    args,
    async (client) => {
      return client.request({
        method: 'POST',
        path: GTMEndpoints.createDomain(),
        body: {
          name: args.name,
          type: args.type,
          comment: args.comment,
          emailNotificationList: args.emailNotificationList
        }
      });
    },
    {
      format: 'text',
      formatter: (domain: any) => {
        let text = `✅ **GTM Domain Created**\n\n`;
        text += `**Name**: ${domain.name}\n`;
        text += `**Type**: ${DomainTypes[domain.type as keyof typeof DomainTypes] || domain.type}\n`;
        text += `**Status**: ${domain.status}\n`;
        text += `\n📝 **Next Steps**:\n`;
        text += `1. Create datacenters with gtm_create_datacenter\n`;
        text += `2. Create properties with gtm_create_property\n`;
        text += `3. Configure traffic distribution\n`;
        return text;
      }
    }
  );
}

/**
 * List GTM datacenters
 */
export async function listDatacenters(args: z.infer<typeof GTMToolSchemas.listDatacenters>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'gtm',
    'gtm_list_datacenters',
    args,
    async (client) => {
      return client.request({
        method: 'GET',
        path: GTMEndpoints.listDatacenters(args.domainName)
      });
    },
    {
      format: 'text',
      formatter: (result) => formatDatacentersList(result as GTMResponse, args.domainName),
      cacheKey: (p) => `gtm:datacenters:${p.domainName}`,
      cacheTtl: 300 // 5 minutes
    }
  );
}

/**
 * Create GTM datacenter
 */
export async function createDatacenter(args: z.infer<typeof GTMToolSchemas.createDatacenter>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'gtm',
    'gtm_create_datacenter',
    args,
    async (client) => {
      return client.request({
        method: 'POST',
        path: GTMEndpoints.createDatacenter(args.domainName),
        body: {
          nickname: args.nickname,
          city: args.city,
          stateOrProvince: args.stateOrProvince,
          country: args.country,
          continent: args.continent,
          latitude: args.latitude,
          longitude: args.longitude
        }
      });
    },
    {
      format: 'text',
      formatter: (dc: any) => {
        let text = `✅ **GTM Datacenter Created**\n\n`;
        text += `**Nickname**: ${dc.nickname}\n`;
        text += `**ID**: ${dc.datacenterId}\n`;
        text += `**Location**: ${formatDatacenterLocation(dc)}\n`;
        text += `**Enabled**: ${dc.enabled ? 'Yes' : 'No'}\n`;
        return text;
      }
    }
  );
}

/**
 * List GTM properties
 */
export async function listProperties(args: z.infer<typeof GTMToolSchemas.listProperties>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'gtm',
    'gtm_list_properties',
    args,
    async (client) => {
      return client.request({
        method: 'GET',
        path: GTMEndpoints.listProperties(args.domainName)
      });
    },
    {
      format: 'text',
      formatter: (result) => formatPropertiesList(result as GTMResponse, args.domainName),
      cacheKey: (p) => `gtm:properties:${p.domainName}`,
      cacheTtl: 300 // 5 minutes
    }
  );
}

/**
 * Get GTM property details
 */
export async function getProperty(args: z.infer<typeof GTMToolSchemas.updateProperty>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'gtm',
    'gtm_get_property',
    args,
    async (client) => {
      return client.request({
        method: 'GET',
        path: GTMEndpoints.getProperty(args.domainName, args.propertyName)
      });
    },
    {
      format: 'text',
      formatter: (result) => formatPropertyDetails(result, args.domainName),
      cacheKey: (p) => `gtm:property:${p.domainName}:${p.propertyName}`,
      cacheTtl: 300 // 5 minutes
    }
  );
}

/**
 * Create GTM property
 */
export async function createProperty(args: z.infer<typeof GTMToolSchemas.createProperty>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'gtm',
    'gtm_create_property',
    args,
    async (client) => {
      return client.request({
        method: 'POST',
        path: GTMEndpoints.updateProperty(args.domainName, args.name),
        body: {
          name: args.name,
          type: args.type,
          scoreAggregationType: args.scoreAggregationType,
          handoutMode: args.handoutMode,
          trafficTargets: args.trafficTargets || []
        }
      });
    },
    {
      format: 'text',
      formatter: (property: any) => {
        let text = `✅ **GTM Property Created**\n\n`;
        text += `**Name**: ${(property as any).name}\n`;
        text += `**Type**: ${formatPropertyType((property as any).type)}\n`;
        text += `**Score Aggregation**: ${(property as any).scoreAggregationType}\n`;
        text += `**Handout Mode**: ${(property as any).handoutMode}\n`;
        text += `\n📝 **Next Steps**:\n`;
        text += `1. Configure traffic targets\n`;
        text += `2. Add liveness tests\n`;
        text += `3. Set up load balancing rules\n`;
        return text;
      }
    }
  );
}

/**
 * Update GTM property traffic targets
 */
export async function updatePropertyTraffic(args: z.infer<typeof GTMToolSchemas.updateProperty>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'gtm',
    'gtm_update_property_traffic',
    args,
    async (client) => {
      // First get the property
      const property = await client.request({
        method: 'GET',
        path: GTMEndpoints.getProperty(args.domainName, args.propertyName)
      });
      
      // Update traffic targets
      (property as any).trafficTargets = args.trafficTargets;
      
      // Update the property
      return client.request({
        method: 'PUT',
        path: GTMEndpoints.updateProperty(args.domainName, args.propertyName),
        body: property
      });
    },
    {
      format: 'text',
      formatter: (property: any) => {
        let text = `✅ **GTM Property Traffic Updated**\n\n`;
        text += `**Property**: ${(property as any).name}\n`;
        text += `**Domain**: ${args.domainName}\n\n`;
        text += `**New Traffic Distribution**:\n`;
        text += formatTrafficDistribution((property as any).trafficTargets);
        return text;
      }
    }
  );
}

/**
 * Legacy class exports for backward compatibility
 * @deprecated Use direct function exports instead
 */
export const gtmOperations = {
  listDomains,
  getDomain,
  createDomain,
  listDatacenters,
  createDatacenter,
  listProperties,
  getProperty,
  createProperty,
  updatePropertyTraffic
};