/**
 * Type definitions for CDN Provisioning Agent
 * 
 * CODE KAI PRINCIPLES:
 * - No 'any' types
 * - Full type safety
 * - Runtime validation where needed
 */

export interface PropertyVersion {
  propertyId: string;
  propertyVersion: number;
  etag: string;
  note: string;
  productionStatus: string;
  stagingStatus: string;
  updatedByUser: string;
  updatedDate: string;
}

// Request types
export interface CreateEdgeHostnameRequest {
  productId: string;
  domainPrefix: string;
  domainSuffix: string;
  ipVersionBehavior: 'IPV4' | 'IPV6' | 'IPV4_IPV6';
  secureNetwork: 'STANDARD_TLS' | 'ENHANCED_TLS' | 'SHARED_CERT';
  certEnrollmentId?: number;
}

export interface RuleTree {
  name: string;
  children: RuleTreeNode[];
  behaviors: Behavior[];
  criteria?: Criterion[];
  criteriaMustSatisfy?: 'all' | 'any';
  comments?: string;
  uuid?: string;
  options?: {
    is_secure?: boolean;
  };
  variables?: Variable[];
}

export interface RuleTreeNode {
  name: string;
  children?: RuleTreeNode[];
  behaviors?: Behavior[];
  criteria?: Criterion[];
  criteriaMustSatisfy?: 'all' | 'any';
  comments?: string;
  uuid?: string;
}

export interface Behavior {
  name: string;
  options: Record<string, unknown>;
  uuid?: string;
}

export interface Criterion {
  name: string;
  options: Record<string, unknown>;
  uuid?: string;
}

export interface Variable {
  name: string;
  value: string;
  description?: string;
  hidden?: boolean;
  sensitive?: boolean;
}

export interface EdgeHostname {
  edgeHostnameId: string;
  edgeHostnameDomain: string;
  productId: string;
  domainPrefix: string;
  domainSuffix: string;
  secure: boolean;
  ipVersionBehavior: string;
  mapDetails?: {
    serialNumber?: number;
    slotNumber?: number;
    staging?: string[];
    production?: string[];
  };
  recordName?: string;
  dnsZone?: string;
  securityType?: string;
  useDefaultTtl?: boolean;
  useDefaultMap?: boolean;
  ipv6?: boolean;
  status?: string;
}

export interface ActivationStatus {
  activationId: string;
  status: string;
  network: 'STAGING' | 'PRODUCTION';
  propertyId: string;
  propertyVersion: number;
  note?: string;
  submitDate?: string;
  updateDate?: string;
  notifyEmails?: string[];
  activatedBy?: string;
  fallbackInfo?: {
    fastFallbackAttempted: boolean;
    fallbackVersion?: number;
    canFastFallback: boolean;
    steadyStateTime?: number;
    fastFallbackExpirationTime?: number;
    fastFallbackRecoveryState?: string;
  };
}

export interface DnsRecord {
  name: string;
  type: string;
  ttl: number;
  rdata: string[];
  active?: boolean;
}

export interface PropertyMetrics {
  timestamp: string;
  value: number;
}

export interface TimeSeriesData {
  label: string;
  data: PropertyMetrics[];
}

export interface LoggerOptions {
  level: 'info' | 'warn' | 'error' | 'debug';
  category?: string;
}

export interface ActivationRequest {
  propertyVersion: number;
  network: 'STAGING' | 'PRODUCTION';
  activationType: 'FAST' | 'STANDARD';
  notifyEmails: string[];
  acknowledgeWarnings: string[];
  complianceRecord?: {
    noncomplianceReason?: string;
  };
  note?: string;
}