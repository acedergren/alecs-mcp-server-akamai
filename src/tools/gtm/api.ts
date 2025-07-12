/**
 * GTM API Implementation Details
 * 
 * Contains endpoints, schemas, and formatters for GTM tools
 */

import { z } from 'zod';

// Base schema for customer parameter
const CustomerSchema = z.object({
  customer: z.string().optional()
});

/**
 * GTM API Base Path
 */
export const GTM_API_BASE = '/config-gtm/v1';

/**
 * GTM API Endpoints
 */
export const GTMEndpoints = {
  // Domain Management
  createDomain: () => `${GTM_API_BASE}/domains`,
  listDomains: () => `${GTM_API_BASE}/domains`,
  getDomain: (domainName: string) => `${GTM_API_BASE}/domains/${domainName}`,
  updateDomain: (domainName: string) => `${GTM_API_BASE}/domains/${domainName}`,
  getDomainStatus: (domainName: string) => `${GTM_API_BASE}/domains/${domainName}/status/current`,
  getDomainHistory: (domainName: string) => `${GTM_API_BASE}/domains/${domainName}/history`,
  
  // Datacenter Management
  createDatacenter: (domainName: string) => `${GTM_API_BASE}/domains/${domainName}/datacenters`,
  listDatacenters: (domainName: string) => `${GTM_API_BASE}/domains/${domainName}/datacenters`,
  getDatacenter: (domainName: string, datacenterId: number) => 
    `${GTM_API_BASE}/domains/${domainName}/datacenters/${datacenterId}`,
  updateDatacenter: (domainName: string, datacenterId: number) => 
    `${GTM_API_BASE}/domains/${domainName}/datacenters/${datacenterId}`,
  deleteDatacenter: (domainName: string, datacenterId: number) => 
    `${GTM_API_BASE}/domains/${domainName}/datacenters/${datacenterId}`,
  
  // Property Management
  listProperties: (domainName: string) => `${GTM_API_BASE}/domains/${domainName}/properties`,
  getProperty: (domainName: string, propertyName: string) => 
    `${GTM_API_BASE}/domains/${domainName}/properties/${propertyName}`,
  updateProperty: (domainName: string, propertyName: string) => 
    `${GTM_API_BASE}/domains/${domainName}/properties/${propertyName}`,
  deleteProperty: (domainName: string, propertyName: string) => 
    `${GTM_API_BASE}/domains/${domainName}/properties/${propertyName}`,
  
  // Resource Management
  listResources: (domainName: string) => `${GTM_API_BASE}/domains/${domainName}/resources`,
  getResource: (domainName: string, resourceName: string) => 
    `${GTM_API_BASE}/domains/${domainName}/resources/${resourceName}`,
  updateResource: (domainName: string, resourceName: string) => 
    `${GTM_API_BASE}/domains/${domainName}/resources/${resourceName}`,
  deleteResource: (domainName: string, resourceName: string) => 
    `${GTM_API_BASE}/domains/${domainName}/resources/${resourceName}`
};

/**
 * GTM Domain Types
 */
export const DomainTypes = {
  basic: 'Basic - Simple load balancing',
  failover: 'Failover - Active/passive failover',
  weighted: 'Weighted - Weighted round-robin',
  performance: 'Performance - Geographic routing',
  qtr: 'QTR - Query/response time routing',
  'geographic-based': 'Geographic-based routing'
} as const;

/**
 * GTM Tool Schemas
 */
export const GTMToolSchemas = {
  listDomains: CustomerSchema,

  getDomain: CustomerSchema.extend({
    domainName: z.string().min(1, 'Domain name is required')
  }),

  createDomain: CustomerSchema.extend({
    domainName: z.string().min(1, 'Domain name is required'),
    type: z.enum(['basic', 'failover', 'weighted', 'performance', 'qtr', 'geographic-based']),
    emailNotificationList: z.array(z.string().email()).optional(),
    loadImbalancePercentage: z.number().min(0).max(100).optional(),
    comment: z.string().optional()
  }),

  getDomainStatus: CustomerSchema.extend({
    domainName: z.string().min(1, 'Domain name is required')
  }),

  listDatacenters: CustomerSchema.extend({
    domainName: z.string().min(1, 'Domain name is required')
  }),

  createDatacenter: CustomerSchema.extend({
    domainName: z.string().min(1, 'Domain name is required'),
    nickname: z.string().min(1, 'Datacenter nickname is required'),
    city: z.string().min(1, 'City is required'),
    stateOrProvince: z.string().optional(),
    country: z.string().min(2, 'Country code is required'),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    continent: z.enum(['AF', 'AS', 'EU', 'NA', 'OC', 'SA']).optional(),
    defaultLoadObject: z.object({
      loadObject: z.string(),
      loadObjectPort: z.number().optional(),
      loadServers: z.array(z.string()).optional()
    }).optional(),
    enabled: z.boolean().optional()
  }),

  listProperties: CustomerSchema.extend({
    domainName: z.string().min(1, 'Domain name is required')
  }),

  getProperty: CustomerSchema.extend({
    domainName: z.string().min(1, 'Domain name is required'),
    propertyName: z.string().min(1, 'Property name is required')
  }),

  createProperty: CustomerSchema.extend({
    domainName: z.string().min(1, 'Domain name is required'),
    propertyName: z.string().min(1, 'Property name is required'),
    type: z.enum(['A', 'AAAA', 'CNAME', 'MX', 'PTR', 'SRV', 'TXT']),
    scoreAggregationType: z.enum(['mean', 'median', 'sum']).optional(),
    handoutMode: z.enum(['normal', 'all']).optional(),
    handoutLimit: z.number().min(1).max(8).optional(),
    failoverDelay: z.number().min(0).optional(),
    failbackDelay: z.number().min(0).optional(),
    loadImbalancePercentage: z.number().min(0).max(100).optional(),
    healthThreshold: z.number().min(0).max(100).optional(),
    trafficTargets: z.array(z.object({
      datacenterId: z.number(),
      enabled: z.boolean(),
      weight: z.number().min(0),
      servers: z.array(z.string()).optional(),
      name: z.string().optional(),
      handoutCName: z.string().optional()
    })).optional(),
    livenessTests: z.array(z.object({
      name: z.string(),
      testType: z.enum(['HTTP', 'HTTPS', 'FTP', 'POP', 'IMAP', 'SMTP', 'TCP', 'DNS']),
      testObject: z.string(),
      testObjectProtocol: z.enum(['HTTP', 'HTTPS', 'FTP', 'POP', 'IMAP', 'SMTP', 'TCP', 'DNS']).optional(),
      testObjectPort: z.number().optional(),
      enabled: z.boolean()
    })).optional()
  })
};

/**
 * Format domains list response
 */
export function formatDomainsList(response: unknown): string {
  const typedResponse = response as {
    items?: Array<{
      name: string;
      type: string;
      status: string;
      lastModified: string;
      lastModifiedBy?: string;
    }>;
  };

  const domains = typedResponse.items || [];
  
  let text = `🌐 **GTM Domains**\n`;
  text += `Total Domains: ${domains.length}\n\n`;
  
  if (domains.length > 0) {
    domains.forEach((domain, index) => {
      text += `${index + 1}. **${domain.name}** (${DomainTypes[domain.type as keyof typeof DomainTypes] || domain.type})\n`;
      text += `   • Status: ${domain.status}\n`;
      text += `   • Last Modified: ${new Date(domain.lastModified).toLocaleString()}\n`;
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
 * Format domain details response
 */
export function formatDomainDetails(response: unknown): string {
  const domain = response as {
    name: string;
    type: string;
    status: string;
    lastModified: string;
    lastModifiedBy?: string;
    loadImbalancePercentage?: number;
    datacenters?: Array<{
      nickname: string;
      datacenterId: number;
      city: string;
      country: string;
      enabled: boolean;
    }>;
    properties?: Array<{
      name: string;
      type: string;
      enabled: boolean;
    }>;
  };

  let text = `🌐 **GTM Domain Details**\n\n`;
  text += `**Name**: ${domain.name}\n`;
  text += `**Type**: ${DomainTypes[domain.type as keyof typeof DomainTypes] || domain.type}\n`;
  text += `**Status**: ${domain.status}\n`;
  
  if (domain.loadImbalancePercentage) {
    text += `**Load Imbalance**: ${domain.loadImbalancePercentage}%\n`;
  }
  
  text += `**Last Modified**: ${new Date(domain.lastModified).toLocaleString()}\n`;
  if (domain.lastModifiedBy) {
    text += `**Modified By**: ${domain.lastModifiedBy}\n`;
  }
  
  if (domain.datacenters && domain.datacenters.length > 0) {
    text += `\n**Datacenters** (${domain.datacenters.length}):\n`;
    domain.datacenters.forEach((dc, index) => {
      text += `${index + 1}. ${dc.nickname} (ID: ${dc.datacenterId})\n`;
      text += `   • Location: ${dc.city}, ${dc.country}\n`;
      text += `   • Enabled: ${dc.enabled ? 'Yes' : 'No'}\n`;
    });
  }
  
  if (domain.properties && domain.properties.length > 0) {
    text += `\n**Properties** (${domain.properties.length}):\n`;
    domain.properties.forEach((prop, index) => {
      text += `${index + 1}. ${prop.name} (${prop.type}) - ${prop.enabled ? 'Enabled' : 'Disabled'}\n`;
    });
  }
  
  return text;
}

/**
 * Format datacenters list response
 */
export function formatDatacentersList(response: unknown): string {
  const typedResponse = response as {
    items?: Array<{
      nickname: string;
      datacenterId: number;
      city: string;
      stateOrProvince?: string;
      country: string;
      continent: string;
      enabled: boolean;
      latitude: number;
      longitude: number;
    }>;
  };

  const datacenters = typedResponse.items || [];
  
  let text = `🏢 **GTM Datacenters**\n`;
  text += `Total Datacenters: ${datacenters.length}\n\n`;
  
  if (datacenters.length > 0) {
    datacenters.forEach((dc, index) => {
      text += `${index + 1}. **${dc.nickname}** (ID: ${dc.datacenterId})\n`;
      text += `   • Location: ${dc.city}${dc.stateOrProvince ? `, ${dc.stateOrProvince}` : ''}, ${dc.country}\n`;
      text += `   • Coordinates: ${dc.latitude}, ${dc.longitude}\n`;
      text += `   • Continent: ${dc.continent}\n`;
      text += `   • Status: ${dc.enabled ? 'Enabled' : 'Disabled'}\n`;
      text += `\n`;
    });
  } else {
    text += '⚠️ No datacenters found.\n';
  }
  
  return text;
}

/**
 * Format properties list response
 */
export function formatPropertiesList(response: unknown): string {
  const typedResponse = response as {
    items?: Array<{
      name: string;
      type: string;
      enabled: boolean;
      scoreAggregationType: string;
      handoutMode: string;
      trafficTargets?: Array<{ datacenterId: number; enabled: boolean; weight: number }>;
    }>;
  };

  const properties = typedResponse.items || [];
  
  let text = `🎯 **GTM Properties**\n`;
  text += `Total Properties: ${properties.length}\n\n`;
  
  if (properties.length > 0) {
    properties.forEach((prop, index) => {
      text += `${index + 1}. **${prop.name}** (${prop.type})\n`;
      text += `   • Status: ${prop.enabled ? 'Enabled' : 'Disabled'}\n`;
      text += `   • Score Aggregation: ${prop.scoreAggregationType}\n`;
      text += `   • Handout Mode: ${prop.handoutMode}\n`;
      
      if (prop.trafficTargets && prop.trafficTargets.length > 0) {
        text += `   • Traffic Targets: ${prop.trafficTargets.length} configured\n`;
      }
      text += `\n`;
    });
  } else {
    text += '⚠️ No properties found.\n';
  }
  
  return text;
}