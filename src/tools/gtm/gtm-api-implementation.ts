/**
 * GTM API Implementation
 * 
 * Complete implementation of Akamai Global Traffic Management (GTM) API v1
 * 
 * CODE KAI PRINCIPLES APPLIED:
 * Key: Type-safe GTM operations with full API coverage
 * Approach: Zod schemas for runtime validation and comprehensive endpoints
 * Implementation: Production-ready Global Traffic Management integration
 * 
 * API Documentation: https://techdocs.akamai.com/gtm/reference
 */

import { z } from 'zod';

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
    `${GTM_API_BASE}/domains/${domainName}/resources/${resourceName}`,
  
  // Geographic Maps
  getGeographicMaps: (domainName: string) => `${GTM_API_BASE}/domains/${domainName}/geographic-maps`,
  getGeographicMap: (domainName: string, mapName: string) => 
    `${GTM_API_BASE}/domains/${domainName}/geographic-maps/${mapName}`,
  updateGeographicMap: (domainName: string, mapName: string) => 
    `${GTM_API_BASE}/domains/${domainName}/geographic-maps/${mapName}`,
  deleteGeographicMap: (domainName: string, mapName: string) => 
    `${GTM_API_BASE}/domains/${domainName}/geographic-maps/${mapName}`,
  
  // CIDR Maps
  getCidrMaps: (domainName: string) => `${GTM_API_BASE}/domains/${domainName}/cidr-maps`,
  getCidrMap: (domainName: string, mapName: string) => 
    `${GTM_API_BASE}/domains/${domainName}/cidr-maps/${mapName}`,
  updateCidrMap: (domainName: string, mapName: string) => 
    `${GTM_API_BASE}/domains/${domainName}/cidr-maps/${mapName}`,
  deleteCidrMap: (domainName: string, mapName: string) => 
    `${GTM_API_BASE}/domains/${domainName}/cidr-maps/${mapName}`,
  
  // AS Maps
  getAsMaps: (domainName: string) => `${GTM_API_BASE}/domains/${domainName}/as-maps`,
  getAsMap: (domainName: string, mapName: string) => 
    `${GTM_API_BASE}/domains/${domainName}/as-maps/${mapName}`,
  updateAsMap: (domainName: string, mapName: string) => 
    `${GTM_API_BASE}/domains/${domainName}/as-maps/${mapName}`,
  deleteAsMap: (domainName: string, mapName: string) => 
    `${GTM_API_BASE}/domains/${domainName}/as-maps/${mapName}`,
  
  // Identity Management
  getIdentity: () => `${GTM_API_BASE}/identity`,
  getContracts: () => `${GTM_API_BASE}/identity/contracts`,
  getGroups: () => `${GTM_API_BASE}/identity/groups`
};

/**
 * GTM Domain Types
 */
export const DomainTypes = {
  basic: 'Basic - Simple load balancing',
  failover: 'Failover - Active/passive failover',
  weighted: 'Weighted - Weighted round-robin',
  full: 'Full - All GTM features',
  static: 'Static - Static mapping only'
} as const;

/**
 * GTM Property Types
 */
export const PropertyTypes = {
  failover: 'Failover property',
  weighted: 'Weighted round-robin',
  geographic: 'Geographic mapping',
  cidrmapping: 'CIDR mapping',
  asmapping: 'AS mapping',
  qtr: 'QTR (Quality Threshold Routing)',
  performance: 'Performance-based'
} as const;

/**
 * Liveness Test Protocols
 */
export const TestProtocols = {
  HTTP: 'HTTP',
  HTTPS: 'HTTPS',
  FTP: 'FTP',
  POP: 'POP',
  POPS: 'POPS',
  SMTP: 'SMTP',
  SMTPS: 'SMTPS',
  TCP: 'TCP'
} as const;

/**
 * GTM Tool Schemas
 */
export const GTMToolSchemas = {
  // Domain Management
  listDomains: z.object({
    customer: z.string().optional().describe('Akamai customer account (from .edgerc)'),
    format: z.enum(['json', 'text']).optional().default('text')
  }),
  
  createDomain: z.object({
    customer: z.string().optional().describe('Akamai customer account (from .edgerc)'),
    name: z.string().describe('Domain name (e.g., example.akadns.net)'),
    type: z.enum(['basic', 'failover', 'weighted', 'full', 'static']).default('weighted'),
    comment: z.string().optional(),
    emailNotificationList: z.array(z.string()).optional()
  }),
  
  getDomain: z.object({
    customer: z.string().optional().describe('Akamai customer account (from .edgerc)'),
    domainName: z.string().describe('GTM domain name')
  }),
  
  updateDomain: z.object({
    customer: z.string().optional().describe('Akamai customer account (from .edgerc)'),
    domainName: z.string().describe('GTM domain name'),
    comment: z.string().optional(),
    emailNotificationList: z.array(z.string()).optional(),
    loadImbalancePercentage: z.number().optional()
  }),
  
  getDomainStatus: z.object({
    customer: z.string().optional().describe('Akamai customer account (from .edgerc)'),
    domainName: z.string().describe('GTM domain name')
  }),
  
  // Datacenter Management
  listDatacenters: z.object({
    customer: z.string().optional().describe('Akamai customer account (from .edgerc)'),
    domainName: z.string().describe('GTM domain name')
  }),
  
  createDatacenter: z.object({
    customer: z.string().optional().describe('Akamai customer account (from .edgerc)'),
    domainName: z.string().describe('GTM domain name'),
    nickname: z.string().describe('Datacenter nickname'),
    city: z.string().optional(),
    country: z.string().optional(),
    continent: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    stateOrProvince: z.string().optional()
  }),
  
  updateDatacenter: z.object({
    customer: z.string().optional().describe('Akamai customer account (from .edgerc)'),
    domainName: z.string().describe('GTM domain name'),
    datacenterId: z.number().describe('Datacenter ID'),
    nickname: z.string().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional()
  }),
  
  deleteDatacenter: z.object({
    customer: z.string().optional().describe('Akamai customer account (from .edgerc)'),
    domainName: z.string().describe('GTM domain name'),
    datacenterId: z.number().describe('Datacenter ID'),
    confirm: z.boolean().describe('Confirm deletion')
  }),
  
  // Property Management
  listProperties: z.object({
    customer: z.string().optional().describe('Akamai customer account (from .edgerc)'),
    domainName: z.string().describe('GTM domain name')
  }),
  
  createProperty: z.object({
    customer: z.string().optional().describe('Akamai customer account (from .edgerc)'),
    domainName: z.string().describe('GTM domain name'),
    name: z.string().describe('Property name'),
    type: z.enum(['failover', 'weighted', 'geographic', 'cidrmapping', 'asmapping', 'qtr', 'performance']),
    scoreAggregationType: z.enum(['mean', 'median', 'worst']).optional().default('mean'),
    handoutMode: z.enum(['normal', 'persistent', 'all']).optional().default('normal'),
    trafficTargets: z.array(z.object({
      datacenterId: z.number(),
      enabled: z.boolean().default(true),
      weight: z.number().optional(),
      servers: z.array(z.string()).optional()
    }))
  }),
  
  updateProperty: z.object({
    customer: z.string().optional().describe('Akamai customer account (from .edgerc)'),
    domainName: z.string().describe('GTM domain name'),
    propertyName: z.string().describe('Property name'),
    trafficTargets: z.array(z.object({
      datacenterId: z.number(),
      enabled: z.boolean(),
      weight: z.number().optional(),
      servers: z.array(z.string()).optional()
    })).optional(),
    livenessTests: z.array(z.object({
      name: z.string(),
      testObjectProtocol: z.enum(['HTTP', 'HTTPS', 'FTP', 'POP', 'POPS', 'SMTP', 'SMTPS', 'TCP']),
      testObject: z.string(),
      testObjectPort: z.number(),
      testInterval: z.number().default(60),
      testTimeout: z.number().default(10)
    })).optional()
  }),
  
  deleteProperty: z.object({
    customer: z.string().optional().describe('Akamai customer account (from .edgerc)'),
    domainName: z.string().describe('GTM domain name'),
    propertyName: z.string().describe('Property name'),
    confirm: z.boolean().describe('Confirm deletion')
  }),
  
  // Geographic Maps
  createGeographicMap: z.object({
    customer: z.string().optional().describe('Akamai customer account (from .edgerc)'),
    domainName: z.string().describe('GTM domain name'),
    name: z.string().describe('Map name'),
    defaultDatacenterId: z.number().describe('Default datacenter ID'),
    assignments: z.array(z.object({
      datacenterId: z.number(),
      countries: z.array(z.string()).optional(),
      continents: z.array(z.string()).optional()
    }))
  }),
  
  updateGeographicMap: z.object({
    customer: z.string().optional().describe('Akamai customer account (from .edgerc)'),
    domainName: z.string().describe('GTM domain name'),
    mapName: z.string().describe('Map name'),
    assignments: z.array(z.object({
      datacenterId: z.number(),
      countries: z.array(z.string()).optional(),
      continents: z.array(z.string()).optional()
    }))
  }),
  
  // Resource Management
  listResources: z.object({
    customer: z.string().optional().describe('Akamai customer account (from .edgerc)'),
    domainName: z.string().describe('GTM domain name')
  }),
  
  createResource: z.object({
    customer: z.string().optional().describe('Akamai customer account (from .edgerc)'),
    domainName: z.string().describe('GTM domain name'),
    name: z.string().describe('Resource name'),
    type: z.enum(['XML load object', 'Download score']),
    hostHeader: z.string().optional(),
    resourceInstances: z.array(z.object({
      datacenterId: z.number(),
      useDefaultLoadObject: z.boolean().default(false),
      loadObject: z.string().optional(),
      loadServers: z.array(z.string()).optional()
    }))
  })
};

/**
 * Response formatting utilities
 */
export function formatDatacenterLocation(datacenter: any): string {
  const parts = [];
  if (datacenter.city) parts.push(datacenter.city);
  if (datacenter.stateOrProvince) parts.push(datacenter.stateOrProvince);
  if (datacenter.country) parts.push(datacenter.country);
  return parts.length > 0 ? parts.join(', ') : 'Unknown Location';
}

export function formatPropertyType(type: string): string {
  return PropertyTypes[type as keyof typeof PropertyTypes] || type;
}

export function formatTestProtocol(protocol: string): string {
  return TestProtocols[protocol as keyof typeof TestProtocols] || protocol;
}

export function formatTrafficDistribution(targets: any[]): string {
  const enabledTargets = targets.filter(t => t.enabled);
  if (enabledTargets.length === 0) return 'No active targets';
  
  const totalWeight = enabledTargets.reduce((sum, t) => sum + (t.weight || 1), 0);
  return enabledTargets
    .map(t => {
      const percentage = ((t.weight || 1) / totalWeight * 100).toFixed(1);
      return `DC ${t.datacenterId}: ${percentage}%`;
    })
    .join(', ');
}