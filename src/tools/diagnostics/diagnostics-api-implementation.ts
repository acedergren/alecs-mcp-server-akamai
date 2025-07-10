/**
 * Edge Diagnostics API Implementation
 * 
 * Comprehensive implementation of Akamai's Edge Diagnostics API
 * for troubleshooting and debugging edge delivery issues
 * 
 * API Documentation: https://techdocs.akamai.com/edge-diagnostics/reference
 */

import { z } from 'zod';

/**
 * Base URL for Edge Diagnostics API
 */
export const DIAGNOSTICS_API_BASE = '/edge-diagnostics/v1';

/**
 * Edge Diagnostics API Endpoints
 */
export const DiagnosticsEndpoints = {
  // Core Diagnostic Tools
  curl: () => `${DIAGNOSTICS_API_BASE}/curl`,
  dig: () => `${DIAGNOSTICS_API_BASE}/dig`,
  mtr: () => `${DIAGNOSTICS_API_BASE}/mtr`,
  grep: () => `${DIAGNOSTICS_API_BASE}/grep`,
  getGrepRequest: (requestId: string) => `${DIAGNOSTICS_API_BASE}/grep/requests/${requestId}`,
  estats: () => `${DIAGNOSTICS_API_BASE}/estats`,
  
  // URL and Content Analysis
  urlHealthCheck: () => `${DIAGNOSTICS_API_BASE}/url-health-check`,
  getUrlHealthCheckRequest: (requestId: string) => `${DIAGNOSTICS_API_BASE}/url-health-check/requests/${requestId}`,
  translatedUrl: () => `${DIAGNOSTICS_API_BASE}/translated-url`,
  
  // Metadata and Error Analysis
  metadataTracer: () => `${DIAGNOSTICS_API_BASE}/metadata-tracer`,
  metadataTracerLocations: () => `${DIAGNOSTICS_API_BASE}/metadata-tracer/locations`,
  getMetadataTracerRequest: (requestId: string) => `${DIAGNOSTICS_API_BASE}/metadata-tracer/requests/${requestId}`,
  errorTranslator: () => `${DIAGNOSTICS_API_BASE}/error-translator`,
  getErrorTranslatorRequest: (requestId: string) => `${DIAGNOSTICS_API_BASE}/error-translator/requests/${requestId}`,
  
  // Problem Scenarios
  connectivityProblems: () => `${DIAGNOSTICS_API_BASE}/connectivity-problems`,
  getConnectivityProblemsRequest: (requestId: string) => `${DIAGNOSTICS_API_BASE}/connectivity-problems/requests/${requestId}`,
  contentProblems: () => `${DIAGNOSTICS_API_BASE}/content-problems`,
  getContentProblemsRequest: (requestId: string) => `${DIAGNOSTICS_API_BASE}/content-problems/requests/${requestId}`,
  
  // Edge Locations and IPs
  edgeLocations: () => `${DIAGNOSTICS_API_BASE}/edge-locations`,
  locateIp: () => `${DIAGNOSTICS_API_BASE}/locate-ip`,
  verifyEdgeIp: () => `${DIAGNOSTICS_API_BASE}/verify-edge-ip`,
  verifyLocateIp: () => `${DIAGNOSTICS_API_BASE}/verify-locate-ip`,
  
  // GTM Support
  gtmProperties: () => `${DIAGNOSTICS_API_BASE}/gtm/gtm-properties`,
  gtmPropertyIps: (property: string, domain: string) => `${DIAGNOSTICS_API_BASE}/gtm/${property}/${domain}/gtm-property-ips`,
  
  // User Diagnostic Data
  userDiagnosticGroups: () => `${DIAGNOSTICS_API_BASE}/user-diagnostic-data/groups`,
  userDiagnosticRecords: (groupId: string) => `${DIAGNOSTICS_API_BASE}/user-diagnostic-data/groups/${groupId}/records`,
  
  // IPA Support
  ipaHostnames: () => `${DIAGNOSTICS_API_BASE}/ipa/hostnames`,
  
  // ESI Debugger
  esiDebugger: () => `${DIAGNOSTICS_API_BASE}/esi-debugger-api/v1/debug`
};

/**
 * Common IP version enum
 */
const IpVersionEnum = z.enum(['IPV4', 'IPV6']);

/**
 * Common packet type enum
 */
const PacketTypeEnum = z.enum(['ICMP', 'TCP']);

/**
 * Common port enum
 */
const PortEnum = z.union([z.literal(80), z.literal(443)]);

/**
 * Common request status enum
 */
const RequestStatusEnum = z.enum(['IN_PROGRESS', 'COMPLETE', 'FAILED']);

/**
 * Curl request schema
 */
export const CurlRequestSchema = z.object({
  url: z.string().describe('URL to test with cURL'),
  ipVersion: IpVersionEnum.optional(),
  edgeLocationId: z.string().optional().describe('Edge server location ID'),
  spoofEdgeIp: z.string().optional().describe('Edge IP to spoof in the request'),
  requestHeaders: z.array(z.string()).optional().describe('Custom headers in format "header: value"'),
  runFromSiteShield: z.boolean().optional()
});

/**
 * Dig request schema
 */
export const DigRequestSchema = z.object({
  hostname: z.string().describe('Hostname to perform DNS lookup'),
  queryType: z.enum(['A', 'AAAA', 'CNAME', 'MX', 'NS', 'PTR', 'SOA', 'TXT']).default('A'),
  edgeLocationId: z.string().optional(),
  clientIp: z.string().optional(),
  ipVersion: IpVersionEnum.optional()
});

/**
 * MTR request schema
 */
export const MtrRequestSchema = z.object({
  destinationDomain: z.string().describe('Destination domain for MTR trace'),
  edgeLocationId: z.string().optional(),
  ipVersion: IpVersionEnum.optional(),
  packetType: PacketTypeEnum.optional(),
  port: PortEnum.optional(),
  spoofEdgeIp: z.string().optional()
});

/**
 * Grep request schema
 */
export const GrepRequestSchema = z.object({
  edgeIp: z.string().describe('Edge server IP to search logs'),
  cpCode: z.string().describe('CP code to filter logs'),
  hostnames: z.array(z.string()).optional(),
  userAgents: z.array(z.string()).optional(),
  start: z.string().optional().describe('Start time in ISO format'),
  end: z.string().optional().describe('End time in ISO format'),
  logType: z.enum(['R', 'F']).optional().describe('R for request logs, F for forward logs'),
  httpStatusCodes: z.array(z.union([
    z.object({ start: z.number(), end: z.number() }),
    z.number()
  ])).optional()
});

/**
 * Error translator request schema
 */
export const ErrorTranslatorRequestSchema = z.object({
  url: z.string().describe('URL to analyze for errors'),
  userAgent: z.string().optional(),
  acceptLanguage: z.string().optional(),
  edgeLocationId: z.string().optional(),
  clientIp: z.string().optional()
});

/**
 * URL health check request schema
 */
export const UrlHealthCheckRequestSchema = z.object({
  url: z.string().describe('URL to check health status'),
  spoofEdgeIp: z.string().optional(),
  edgeLocationId: z.string().optional(),
  ipVersion: IpVersionEnum.optional(),
  port: PortEnum.optional(),
  requestHeaders: z.array(z.string()).optional()
});

/**
 * Metadata tracer request schema
 */
export const MetadataTracerRequestSchema = z.object({
  url: z.string().describe('URL to trace metadata'),
  pragmaHeaders: z.boolean().optional().default(true),
  getCachedContent: z.boolean().optional().default(false),
  edgeLocationId: z.string().optional(),
  spoofEdgeIp: z.string().optional()
});

/**
 * Edge location schema
 */
export const EdgeLocationSchema = z.object({
  id: z.string(),
  value: z.string(),
  region: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional()
});

/**
 * Async request response schema
 */
export const AsyncRequestResponseSchema = z.object({
  requestId: z.string(),
  status: RequestStatusEnum,
  createdTime: z.string(),
  completedTime: z.string().optional(),
  result: z.unknown().optional(),
  error: z.string().optional()
});

/**
 * Tool Schemas for Edge Diagnostics
 */
export const DiagnosticsToolSchemas = {
  // Network Diagnostic Tools
  runCurl: CurlRequestSchema.extend({
    customer: z.string().optional().describe('Akamai account name/ID (defaults to "default")')
  }),
  
  runDig: DigRequestSchema.extend({
    customer: z.string().optional().describe('Akamai account name/ID (defaults to "default")')
  }),
  
  runMtr: MtrRequestSchema.extend({
    customer: z.string().optional().describe('Akamai account name/ID (defaults to "default")')
  }),
  
  // Log Analysis
  grepLogs: GrepRequestSchema.extend({
    customer: z.string().optional().describe('Akamai account name/ID (defaults to "default")')
  }),
  
  getGrepResult: z.object({
    requestId: z.string().describe('Request ID from grep operation'),
    customer: z.string().optional().describe('Akamai account name/ID (defaults to "default")')
  }),
  
  runEstats: z.object({
    url: z.string().describe('URL to analyze with eStats'),
    customer: z.string().optional().describe('Akamai account name/ID (defaults to "default")')
  }),
  
  // URL Analysis
  checkUrlHealth: UrlHealthCheckRequestSchema.extend({
    customer: z.string().optional().describe('Akamai account name/ID (defaults to "default")')
  }),
  
  getUrlHealthCheckResult: z.object({
    requestId: z.string().describe('Request ID from URL health check'),
    customer: z.string().optional().describe('Akamai account name/ID (defaults to "default")')
  }),
  
  getTranslatedUrl: z.object({
    url: z.string().describe('URL to translate'),
    customer: z.string().optional().describe('Akamai account name/ID (defaults to "default")')
  }),
  
  // Error Analysis
  translateError: ErrorTranslatorRequestSchema.extend({
    customer: z.string().optional().describe('Akamai account name/ID (defaults to "default")')
  }),
  
  getErrorTranslation: z.object({
    requestId: z.string().describe('Request ID from error translation'),
    customer: z.string().optional().describe('Akamai account name/ID (defaults to "default")')
  }),
  
  // Metadata Tracing
  traceMetadata: MetadataTracerRequestSchema.extend({
    customer: z.string().optional().describe('Akamai account name/ID (defaults to "default")')
  }),
  
  getMetadataTrace: z.object({
    requestId: z.string().describe('Request ID from metadata trace'),
    customer: z.string().optional().describe('Akamai account name/ID (defaults to "default")')
  }),
  
  listMetadataLocations: z.object({
    customer: z.string().optional().describe('Akamai account name/ID (defaults to "default")')
  }),
  
  // Problem Scenarios
  runConnectivityTest: z.object({
    url: z.string().describe('URL to test connectivity'),
    edgeLocationId: z.string().optional(),
    clientIp: z.string().optional(),
    ipVersion: IpVersionEnum.optional(),
    packetType: PacketTypeEnum.optional(),
    port: PortEnum.optional(),
    customer: z.string().optional().describe('Akamai account name/ID (defaults to "default")')
  }),
  
  getConnectivityTestResult: z.object({
    requestId: z.string().describe('Request ID from connectivity test'),
    customer: z.string().optional().describe('Akamai account name/ID (defaults to "default")')
  }),
  
  runContentTest: z.object({
    url: z.string().describe('URL to test content delivery'),
    edgeLocationId: z.string().optional(),
    spoofEdgeIp: z.string().optional(),
    customer: z.string().optional().describe('Akamai account name/ID (defaults to "default")')
  }),
  
  getContentTestResult: z.object({
    requestId: z.string().describe('Request ID from content test'),
    customer: z.string().optional().describe('Akamai account name/ID (defaults to "default")')
  }),
  
  // Edge Locations
  listEdgeLocations: z.object({
    customer: z.string().optional().describe('Akamai account name/ID (defaults to "default")')
  }),
  
  locateIp: z.object({
    ip: z.string().describe('IP address to locate'),
    customer: z.string().optional().describe('Akamai account name/ID (defaults to "default")')
  }),
  
  verifyEdgeIp: z.object({
    ip: z.string().describe('IP to verify as edge server'),
    customer: z.string().optional().describe('Akamai account name/ID (defaults to "default")')
  })
};

/**
 * Response types for diagnostics operations
 */
export interface DiagnosticsAsyncResponse {
  requestId: string;
  status: 'IN_PROGRESS' | 'COMPLETE' | 'FAILED';
  message?: string;
}

export interface CurlResponse {
  httpStatus: number;
  headers: Record<string, string>;
  body: string;
  timing: {
    dns: number;
    connect: number;
    ssl: number;
    firstByte: number;
    total: number;
  };
}

export interface DigResponse {
  answers: Array<{
    name: string;
    type: string;
    ttl: number;
    data: string;
  }>;
  queryTime: number;
  server: string;
}

export interface MtrResponse {
  hops: Array<{
    hopNumber: number;
    hostname: string;
    ip: string;
    loss: number;
    sent: number;
    last: number;
    avg: number;
    best: number;
    worst: number;
    stdDev: number;
  }>;
}

export interface GrepResponse {
  logs: Array<{
    timestamp: string;
    clientIp: string;
    httpStatus: number;
    method: string;
    path: string;
    userAgent: string;
    responseSize: number;
    cacheStatus: string;
  }>;
  totalMatches: number;
}

export interface EdgeLocation {
  id: string;
  value: string;
  region?: string;
  country?: string;
  city?: string;
}