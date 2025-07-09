/**
 * Certificate Domain Types - Consolidated Type Definitions
 * 
 * CODE KAI: Single source of truth for all certificate-related types
 * Eliminates duplication and provides type safety across the domain
 */

// import { z } from 'zod'; // Available for future use

// Import validated types from CPS API responses
import type {
  Contact,
  CSR,
  NetworkConfiguration,
  DVChallenge,
  AllowedDomain,
  CPSEnrollmentCreateResponse,
  CPSEnrollmentStatusResponse,
  CPSEnrollmentListItem,
  CPSEnrollmentsListResponse,
  CPSCSRResponse,
} from '../../types/api-responses/cps-certificates';

// Re-export for external use
export type {
  Contact,
  CSR,
  NetworkConfiguration,
  DVChallenge,
  AllowedDomain,
  CPSEnrollmentCreateResponse,
  CPSEnrollmentStatusResponse,
  CPSEnrollmentListItem,
  CPSEnrollmentsListResponse,
  CPSCSRResponse,
};

export {
  // Schemas
  ContactSchema,
  CSRSchema,
  NetworkConfigurationSchema,
  DVChallengeSchema,
  AllowedDomainSchema,
  CPSEnrollmentCreateResponseSchema,
  CPSEnrollmentStatusResponseSchema,
  CPSEnrollmentListItemSchema,
  CPSEnrollmentsListResponseSchema,
  CPSCSRResponseSchema,
  // Type guards
  isCPSEnrollmentCreateResponse,
  isCPSEnrollmentStatusResponse,
  isCPSEnrollmentsListResponse,
  isCPSCSRResponse,
  // Error classes
  CPSValidationError,
} from '../../types/api-responses/cps-certificates';

/**
 * Certificate Types
 */
export enum CertificateType {
  DV_SAN = 'dv-san-sni',
  DV_SINGLE = 'dv-single',
  DV_WILDCARD = 'dv-wildcard',
  OV = 'ov',
  EV = 'ev',
  THIRD_PARTY = 'third-party',
  DEFAULT_DV = 'default-dv',
}

export enum ValidationType {
  DV = 'dv',
  OV = 'ov', 
  EV = 'ev',
  THIRD_PARTY = 'third-party',
}

export enum NetworkType {
  STANDARD_TLS = 'standard-tls',
  ENHANCED_TLS = 'enhanced-tls',
  SHARED_CERT = 'shared-cert',
}

export enum Geography {
  CORE = 'core',
  CHINA_CORE = 'china+core',
  RUSSIA_CORE = 'russia+core',
}

export enum EnrollmentStatus {
  PENDING = 'pending',
  WAIT_VALIDATION = 'wait-validation',
  WAIT_APPROVAL = 'wait-approval',
  COORDINATES = 'coordinates',
  WAIT_UPLOAD = 'wait-upload',
  PENDING_DEPLOYMENT = 'pending-deployment',
  DEPLOYED = 'deployed',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
}

/**
 * Enrollment Configuration
 */
export interface EnrollmentConfig {
  certificateType: CertificateType;
  validationType: ValidationType;
  ra: string; // Registration Authority
  networkConfiguration: {
    geography: Geography;
    secureNetwork: NetworkType;
    sniOnly: boolean;
    quicEnabled?: boolean;
    disallowedTlsVersions?: string[];
    cloneDnsNames?: boolean;
    mustHaveCiphers?: string[];
    preferredCiphers?: string[];
  };
  signatureAlgorithm: string;
  changeManagement: boolean;
  autoRenewalStartTime?: string;
}

export interface DomainValidationChallenge {
  domain: string;
  type: 'dns-01' | 'http-01';
  status: 'pending' | 'processing' | 'valid' | 'invalid' | 'expired';
  token?: string;
  keyAuthorization?: string;
  // DNS-01 specific
  recordName?: string;
  recordValue?: string;
  recordType?: 'TXT' | 'CNAME';
  // HTTP-01 specific
  fullPath?: string;
  responseBody?: string;
  redirectFullPath?: string;
  error?: {
    type: string;
    detail: string;
    status: number;
  };
}

export interface EnrollmentDetails {
  enrollmentId: number;
  commonName: string;
  sans?: string[];
  status: EnrollmentStatus;
  validationType: ValidationType;
  certificateType: CertificateType;
  ra: string;
  assignedSlots?: string[];
  stagingSlots?: string[];
  productionSlots?: string[];
  pendingChanges?: string[];
  allowedDomains?: AllowedDomain[];
  validationChallenges?: DomainValidationChallenge[];
  networkConfiguration?: NetworkConfiguration;
  csr?: {
    cn: string;
    sans?: string[];
    c?: string;
    st?: string;
    l?: string;
    o?: string;
    ou?: string;
  };
  adminContact?: Contact;
  techContact?: Contact;
  org?: Contact;
  certificateChainType?: string;
  signatureAlgorithm?: string;
  keyAlgorithm?: string;
  enableMultiStackedCertificates?: boolean;
  changeManagement?: boolean;
  autoRenewalStartTime?: string;
  createdOn?: string;
  lastUpdated?: string;
  expirationDate?: string;
  deploymentSchedule?: {
    notBefore?: string;
    notAfter?: string;
  };
}

/**
 * Certificate Lifecycle Types
 */
export interface CertificateDeployment {
  enrollmentId: number;
  network: 'staging' | 'production';
  status: 'pending' | 'in-progress' | 'deployed' | 'failed';
  slotNumber?: number;
  deploymentId?: string;
  certificateId?: string;
  deployedDate?: string;
  expirationDate?: string;
  networkChanges?: Array<{
    type: 'slot-assignment' | 'certificate-deployment' | 'network-validation';
    status: 'pending' | 'in-progress' | 'complete' | 'failed';
    description: string;
    timestamp: string;
  }>;
}

export interface CertificateValidation {
  enrollmentId: number;
  validationType: ValidationType;
  status: 'pending' | 'in-progress' | 'complete' | 'failed';
  challenges: DomainValidationChallenge[];
  validationErrors?: Array<{
    domain: string;
    error: string;
    resolution?: string;
  }>;
  dnsRecordsCreated?: Array<{
    zone: string;
    name: string;
    type: string;
    value: string;
    ttl: number;
    status: 'pending' | 'active' | 'failed';
  }>;
}

export interface CertificateRenewal {
  enrollmentId: number;
  currentCertificateId?: string;
  renewalType: 'auto' | 'manual';
  status: 'pending' | 'in-progress' | 'complete' | 'failed';
  scheduledDate?: string;
  completedDate?: string;
  newCertificateId?: string;
  autoRenewalSettings?: {
    enabled: boolean;
    daysBeforeExpiration: number;
    notificationEmails: string[];
  };
}

/**
 * Third-party Certificate Types
 */
export interface ThirdPartyCertificate {
  enrollmentId: number;
  certificateChain: string; // PEM format
  privateKey?: string; // Only for upload, never stored
  trustChain?: string; // Intermediate certificates
  certificateInfo: {
    subject: string;
    issuer: string;
    serialNumber: string;
    notBefore: string;
    notAfter: string;
    subjectAlternativeNames: string[];
    signatureAlgorithm: string;
    keySize: number;
    fingerprint: string;
  };
  validationStatus: 'pending' | 'valid' | 'invalid';
  validationErrors?: string[];
}

/**
 * Property Manager Integration Types
 */
export interface PropertyHostname {
  cnameFrom: string;
  cnameTo?: string;
  cnameType?: 'EDGE_HOSTNAME';
  certProvisioningType: 'DEFAULT' | 'CPS_MANAGED' | 'THIRD_PARTY';
  certStatus?: {
    hostname: string;
    target: string;
    status: string;
    statusUpdateDate?: string;
  };
  edgeHostnameId?: string;
  enrollmentId?: number;
}

export interface PropertyCertificateLink {
  propertyId: string;
  propertyVersion: number;
  enrollmentId: number;
  hostnames: string[];
  linkStatus: 'pending' | 'active' | 'failed';
  linkDate?: string;
  edgeHostnames?: Array<{
    edgeHostnameId: string;
    domainPrefix: string;
    domainSuffix: string;
    ipVersionBehavior: string;
    secure: boolean;
    slotNumber?: number;
  }>;
}

/**
 * Certificate Monitoring Types
 */
export interface CertificateHealth {
  enrollmentId: number;
  overallStatus: 'healthy' | 'warning' | 'critical';
  lastChecked: string;
  expirationDate?: string;
  daysUntilExpiration?: number;
  renewalStatus?: 'not-scheduled' | 'scheduled' | 'in-progress' | 'failed';
  validationStatus?: 'valid' | 'invalid' | 'pending';
  deploymentStatus?: {
    staging: 'deployed' | 'not-deployed' | 'failed';
    production: 'deployed' | 'not-deployed' | 'failed';
  };
  issues?: Array<{
    severity: 'info' | 'warning' | 'error';
    type: 'expiration' | 'validation' | 'deployment' | 'configuration';
    message: string;
    recommendation?: string;
  }>;
}

/**
 * API Operation Parameters
 */
export interface CreateEnrollmentParams {
  commonName: string;
  sans?: string[];
  certificateType: CertificateType;
  validationType: ValidationType;
  networkConfiguration: EnrollmentConfig['networkConfiguration'];
  adminContact: Contact;
  techContact: Contact;
  org: Contact;
  ra?: string;
  signatureAlgorithm?: string;
  enableMultiStackedCertificates?: boolean;
  changeManagement?: boolean;
  autoRenewalStartTime?: string;
  contractId?: string;
  customer?: string;
}

export interface UpdateEnrollmentParams {
  enrollmentId: number;
  commonName?: string;
  sans?: string[];
  adminContact?: Partial<Contact>;
  techContact?: Partial<Contact>;
  org?: Partial<Contact>;
  networkConfiguration?: Partial<EnrollmentConfig['networkConfiguration']>;
  changeManagement?: boolean;
  autoRenewalStartTime?: string;
  customer?: string;
}

export interface ListEnrollmentsParams {
  contractId?: string;
  status?: EnrollmentStatus;
  certificateType?: CertificateType;
  validationType?: ValidationType;
  search?: string;
  customer?: string;
}

export interface GetValidationChallengesParams {
  enrollmentId: number;
  customer?: string;
}

export interface DeployCertificateParams {
  enrollmentId: number;
  network: 'staging' | 'production';
  allowedNetworks?: string[];
  notBefore?: string;
  notAfter?: string;
  customer?: string;
}

export interface LinkCertificateParams {
  enrollmentId: number;
  propertyId: string;
  propertyVersion: number;
  hostnames?: string[];
  customer?: string;
}

/**
 * Response Types
 */
export interface ValidationChallengesResponse {
  enrollmentId: number;
  challenges: DomainValidationChallenge[];
  dnsInstructions?: Array<{
    domain: string;
    recordName: string;
    recordType: string;
    recordValue: string;
    ttl: number;
  }>;
  httpInstructions?: Array<{
    domain: string;
    fullPath: string;
    responseBody: string;
  }>;
}

export interface DeploymentStatusResponse {
  enrollmentId: number;
  network: 'staging' | 'production';
  status: 'pending' | 'in-progress' | 'deployed' | 'failed';
  progress?: {
    percentage: number;
    currentStep: string;
    estimatedTimeRemaining?: string;
  };
  deploymentDetails?: {
    slotNumber?: number;
    certificateId?: string;
    deployedDate?: string;
    expirationDate?: string;
  };
  issues?: Array<{
    type: string;
    message: string;
    resolution?: string;
  }>;
}

/**
 * Utility Types
 */
export interface CertificateMetadata {
  enrollmentId: number;
  commonName: string;
  sans: string[];
  certificateType: CertificateType;
  validationType: ValidationType;
  status: EnrollmentStatus;
  expirationDate?: string;
  daysUntilExpiration?: number;
  autoRenewal: boolean;
  lastUpdated: string;
}

export interface CertificateStatistics {
  totalEnrollments: number;
  byStatus: Record<EnrollmentStatus, number>;
  byType: Record<CertificateType, number>;
  byValidation: Record<ValidationType, number>;
  expiringIn30Days: number;
  expiringIn90Days: number;
  autoRenewalEnabled: number;
  pendingValidation: number;
  deploymentIssues: number;
}

/**
 * Error Types
 */
export class CertificateError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'CertificateError';
  }

  static enrollmentNotFound(enrollmentId: number): CertificateError {
    return new CertificateError(
      `Certificate enrollment ${enrollmentId} not found`,
      'ENROLLMENT_NOT_FOUND'
    );
  }

  static validationFailed(domain: string, reason: string): CertificateError {
    return new CertificateError(
      `Domain validation failed for ${domain}: ${reason}`,
      'VALIDATION_FAILED'
    );
  }

  static deploymentFailed(enrollmentId: number, network: string, reason: string): CertificateError {
    return new CertificateError(
      `Certificate deployment failed for enrollment ${enrollmentId} on ${network}: ${reason}`,
      'DEPLOYMENT_FAILED'
    );
  }

  static invalidConfiguration(details: unknown): CertificateError {
    return new CertificateError(
      'Invalid certificate configuration',
      'INVALID_CONFIGURATION',
      details
    );
  }

  static renewalFailed(enrollmentId: number, reason: string): CertificateError {
    return new CertificateError(
      `Certificate renewal failed for enrollment ${enrollmentId}: ${reason}`,
      'RENEWAL_FAILED'
    );
  }
}

/**
 * Service Configuration Types
 */
export interface CertificateServiceConfig {
  customer?: string;
  autoCreateDNSRecords?: boolean;
  autoActivateDNS?: boolean;
  enableNotifications?: boolean;
  notificationEmails?: string[];
  retryAttempts?: number;
  retryDelay?: number;
  timeoutMs?: number;
  validateDomainOwnership?: boolean;
  allowWildcardValidation?: boolean;
}

export interface AutomationOptions {
  autoValidate?: boolean;
  autoDeploy?: boolean;
  autoActivate?: boolean;
  targetNetwork?: 'staging' | 'production';
  waitForCompletion?: boolean;
  maxWaitTime?: number;
  pollInterval?: number;
}