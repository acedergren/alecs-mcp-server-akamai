/**
 * Certificate Provisioning System (CPS) API Response Types
 * @see https://techdocs.akamai.com/cps/reference/api
 */

import { ListResponse } from './common';

/**
 * Certificate validation types
 */
export enum ValidationType {
  DV = 'dv', // Domain Validation
  OV = 'ov', // Organization Validation
  EV = 'ev', // Extended Validation
  THIRD_PARTY = 'third-party',
}

/**
 * Certificate types
 */
export enum CertificateType {
  SINGLE = 'single',
  SAN = 'san', // Subject Alternative Name
  WILDCARD = 'wildcard',
}

/**
 * Registration Authority
 */
export type RegistrationAuthority = 'lets-encrypt' | 'symantec' | 'third-party';

/**
 * Enrollment status
 */
export type EnrollmentStatus = 
  | 'new'
  | 'incomplete' 
  | 'awaiting-input'
  | 'pending'
  | 'coordinating-validation'
  | 'running-validation'
  | 'validation-failed'
  | 'awaiting-approval'
  | 'approved'
  | 'awaiting-deployment'
  | 'in-progress'
  | 'deployed'
  | 'failed'
  | 'cancelled'
  | 'deleted';

/**
 * Deployment status
 */
export type DeploymentStatus = 
  | 'active'
  | 'modified'
  | 'ready'
  | 'pending'
  | 'deployed-to-staging'
  | 'deployed-to-production'
  | 'failed';

/**
 * Network configuration
 */
export interface NetworkConfiguration {
  geography: 'core' | 'china' | 'russia';
  secureNetwork: 'standard-tls' | 'enhanced-tls';
  mustHaveCiphers?: string;
  preferredCiphers?: string;
  sniOnly: boolean;
  quicEnabled?: boolean;
  disallowedTlsVersions?: string[];
  ocspStapling?: 'on' | 'off' | 'not-set';
  dnsNames?: string[];
}

/**
 * CSR (Certificate Signing Request) details
 */
export interface CSR {
  cn: string; // Common Name
  c?: string; // Country
  st?: string; // State
  l?: string; // Locality
  o?: string; // Organization
  ou?: string; // Organizational Unit
  sans?: string[]; // Subject Alternative Names
}

/**
 * Contact information
 */
export interface Contact {
  firstName: string;
  lastName: string;
  title?: string;
  organizationName?: string;
  email: string;
  phone: string;
  addressLineOne?: string;
  addressLineTwo?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  countryCode?: string;
}

/**
 * Enrollment object
 */
export interface Enrollment {
  id: number;
  ra: RegistrationAuthority;
  validationType: ValidationType;
  certificateType: CertificateType;
  certificateChainType?: 'default' | 'trust-chain';
  csr: CSR;
  networkConfiguration: NetworkConfiguration;
  signatureAlgorithm?: string;
  changeManagement?: boolean;
  enableMultiStackedCertificates?: boolean;
  adminContact: Contact;
  techContact: Contact;
  orgId?: number;
  org?: {
    name: string;
    addressLineOne?: string;
    addressLineTwo?: string;
    city?: string;
    region?: string;
    postalCode?: string;
    countryCode?: string;
    phone?: string;
  };
  thirdParty?: {
    excludeSans?: boolean;
  };
  location?: string;
  pendingChanges?: string[];
  status?: EnrollmentStatus;
  deploymentStatus?: DeploymentStatus;
  autoRenewalStartTime?: string;
  maxAllowedSanNames?: number;
  maxAllowedWildcardSanNames?: number;
}

/**
 * Response from /cps/v2/enrollments
 */
export interface EnrollmentListResponse {
  enrollments: Enrollment[];
}

/**
 * Response from POST /cps/v2/enrollments
 */
export interface EnrollmentCreateResponse {
  enrollment: string; // Location header value
}

/**
 * Response from GET /cps/v2/enrollments/{enrollmentId}
 */
export interface EnrollmentDetailResponse extends Enrollment {
  allowedDomains?: Array<{
    domain: string;
    validationStatus: 'VALIDATED' | 'NOT_VALIDATED' | 'IN_PROGRESS' | 'FAILED';
    validationExpiry?: string;
    validationMethod?: 'dns-01' | 'http-01' | 'email';
  }>;
  pendingCertificate?: {
    deploymentStatus: DeploymentStatus;
    fullCertificate?: string;
    leafCertificate?: string;
    trustChain?: string;
  };
  currentCertificate?: {
    fullCertificate?: string;
    leafCertificate?: string;
    trustChain?: string;
    expiry?: string;
  };
}

/**
 * DV Challenge information
 */
export interface DVChallenge {
  type: 'dns-01' | 'http-01';
  status: 'pending' | 'valid' | 'invalid' | 'deactivated' | 'expired';
  expires: string;
  token?: string;
  keyAuthorization?: string;
  url?: string;
  validationRecords?: Array<{
    hostname?: string;
    value?: string;
  }>;
  error?: {
    type: string;
    detail: string;
  };
}

/**
 * Domain validation information
 */
export interface DomainValidation {
  domain: string;
  challenges: DVChallenge[];
  expires: string;
  status: string;
  validationStatus: 'VALIDATED' | 'NOT_VALIDATED' | 'IN_PROGRESS' | 'FAILED';
}

/**
 * Response from /cps/v2/enrollments/{enrollmentId}/dv
 */
export interface DVValidationResponse {
  validations: DomainValidation[];
  error?: string;
}

/**
 * Response from POST /cps/v2/enrollments/{enrollmentId}/changes
 */
export interface ChangeResponse {
  change: string; // Location header
}

/**
 * Response from POST /cps/v2/enrollments/{enrollmentId}/changes/{changeId}/input/update/change-management-ack
 */
export interface ChangeManagementAckResponse {
  acknowledgement: string;
  changeId: number;
}

/**
 * Deployment object
 */
export interface Deployment {
  deploymentId: number;
  enrollmentId: number;
  targetEnvironment: 'STAGING' | 'PRODUCTION';
  deploymentDate: string;
  deploymentStatus: DeploymentStatus;
  primaryCertificate?: {
    certificate?: string;
    trustChain?: string;
    expiry?: string;
    keyAlgorithm?: string;
  };
  multiStackedCertificates?: Array<{
    certificate?: string;
    trustChain?: string;
    keyAlgorithm?: string;
  }>;
}

/**
 * Response from /cps/v2/enrollments/{enrollmentId}/deployments
 */
export interface DeploymentListResponse {
  results: Deployment[];
}

/**
 * Response from POST /cps/v2/enrollments/{enrollmentId}/deployments
 */
export interface DeploymentCreateResponse {
  location: string; // Header with deployment URL
}

/**
 * Response from GET /cps/v2/enrollments/{enrollmentId}/deployments/{deploymentId}
 */
export interface DeploymentDetailResponse extends Deployment {
  deploymentProgress?: {
    status: string;
    message?: string;
    percentComplete?: number;
  };
}

/**
 * History entry
 */
export interface HistoryEntry {
  actionType: string;
  status: string;
  createdBy: string;
  createdOn: string;
  deploymentId?: number;
  changeId?: number;
  actionDescription?: string;
  actionMetadata?: Record<string, any>;
}

/**
 * Response from /cps/v2/enrollments/{enrollmentId}/history
 */
export interface HistoryResponse {
  results: HistoryEntry[];
}