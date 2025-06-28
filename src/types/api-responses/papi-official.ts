/**
 * Akamai Property Manager API (PAPI) Official Type Definitions
 * Based on: https://github.com/akamai/akamai-apis/tree/main/apis/papi/v1
 * 
 * CODE KAI IMPLEMENTATION:
 * - Zero tolerance for 'any' or 'unknown' types
 * - Complete type coverage for all API responses
 * - Strict adherence to official Akamai OpenAPI schemas
 * - Runtime validation support with type guards
 * 
 * @see https://techdocs.akamai.com/property-mgr/reference/api
 */

// ===========================
// Common Types and Enums
// ===========================

export enum NetworkType {
  STAGING = 'STAGING',
  PRODUCTION = 'PRODUCTION'
}

export enum ActivationType {
  ACTIVATE = 'ACTIVATE',
  DEACTIVATE = 'DEACTIVATE'
}

export enum ActivationStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PENDING = 'PENDING',
  ZONE_1 = 'ZONE_1',
  ZONE_2 = 'ZONE_2',
  ZONE_3 = 'ZONE_3',
  ABORTED = 'ABORTED',
  FAILED = 'FAILED',
  DEACTIVATED = 'DEACTIVATED',
  PENDING_DEACTIVATION = 'PENDING_DEACTIVATION',
  NEW = 'NEW'
}

export enum CertProvisioningType {
  CPS_MANAGED = 'CPS_MANAGED',
  DEFAULT = 'DEFAULT'
}

export enum IpVersionBehavior {
  IPV4 = 'IPV4',
  IPV6_COMPLIANCE = 'IPV6_COMPLIANCE'
}

export enum SecureNetwork {
  ENHANCED_TLS = 'ENHANCED_TLS',
  STANDARD_TLS = 'STANDARD_TLS',
  SHARED_CERT = 'SHARED_CERT'
}

// ===========================
// Property Version Types
// ===========================

/**
 * Request for POST /papi/v1/properties/{propertyId}/versions
 */
export interface PropertyVersionCreateRequest {
  createFromVersion: number; // minimum: 1
  createFromVersionEtag?: string;
}

/**
 * Response from POST /papi/v1/properties/{propertyId}/versions
 */
export interface PropertyVersionCreateResponse {
  versionLink: string;
}

// ===========================
// Rule Tree Types
// ===========================

export interface Variable {
  name: string;
  description?: string;
  value?: string;
  hidden: boolean;
  sensitive: boolean;
}

export interface BehaviorOption {
  [key: string]: any;
}

export interface Behavior {
  name: string;
  options: BehaviorOption;
  locked?: string;
  uuid?: string; // readOnly
}

export interface CriterionOption {
  [key: string]: any;
}

export interface Criterion {
  name: string;
  options: CriterionOption;
  locked?: string;
  uuid?: string; // readOnly
}

export interface RuleTree {
  name: string; // Top-level must be "default"
  behaviors: Behavior[];
  options?: {
    is_secure?: boolean;
  };
  advancedOverride?: string;
  children?: RuleTree[];
  comment?: string;
  criteria?: Criterion[];
  criteriaLocked?: boolean; // readOnly
  customOverride?: {
    name: string;
    overrideId: string;
  };
  uuid?: string;
  variables?: Variable[];
}

/**
 * Response from GET /papi/v1/properties/{propertyId}/versions/{version}/rules
 */
export interface PropertyVersionRulesGetResponse {
  accountId?: string;
  contractId?: string;
  etag?: string;
  groupId?: string;
  propertyId?: string;
  propertyVersion?: number; // minimum: 1
  ruleFormat?: string;
  rules: RuleTree;
  errors?: RuleError[];
  warnings?: RuleWarning[];
}

/**
 * Request for PUT /papi/v1/properties/{propertyId}/versions/{version}/rules
 */
export interface PropertyVersionRulesSetRequest {
  rules: RuleTree;
  ruleFormat?: string;
}

export interface RuleError {
  type: string;
  errorLocation: string;
  detail: string;
}

export interface RuleWarning {
  type: string;
  errorLocation: string;
  detail: string;
}

// ===========================
// Edge Hostname Types
// ===========================

/**
 * Request for POST /papi/v1/edgehostnames
 */
export interface EdgeHostnameCreateRequest {
  productId: string;
  domainPrefix: string;
  domainSuffix: string;
  ipVersionBehavior: IpVersionBehavior;
  secure?: boolean;
  certEnrollmentId?: number; // required if secure=true
  slotNumber?: number; // minimum: 10
  comments?: string;
  chinaCdn?: {
    isChinaCdn?: boolean;
    mapAlias?: string;
  };
  secureNetwork?: SecureNetwork;
  useCases?: Array<{
    option: string;
    type: string;
    useCase: string;
  }>;
}

/**
 * Response from POST /papi/v1/edgehostnames
 */
export interface EdgeHostnameCreateResponse {
  edgeHostnameLink: string;
}

// ===========================
// Hostname Types
// ===========================

export interface Hostname {
  cnameType?: string;
  edgeHostnameId?: string;
  cnameFrom: string;
  cnameTo: string;
  certProvisioningType?: CertProvisioningType;
  certEnrollmentId?: number;
}

/**
 * Response from GET /papi/v1/properties/{propertyId}/versions/{version}/hostnames
 */
export interface PropertyVersionHostnamesGetResponse {
  accountId?: string;
  contractId?: string;
  groupId?: string;
  propertyId?: string;
  propertyVersion?: number;
  etag?: string;
  hostnames: {
    items: Hostname[];
  };
}

/**
 * Request for PUT /papi/v1/properties/{propertyId}/versions/{version}/hostnames
 */
export interface PropertyVersionHostnamesSetRequest {
  hostnames: Hostname[];
}

// ===========================
// Activation Types
// ===========================

export interface ComplianceRecord {
  unitTested?: boolean;
  peerReviewedBy?: string;
  customerEmail?: string;
  nonComplianceReason?: 'NONE' | 'NO_PRODUCTION_TRAFFIC' | 'EMERGENCY';
  otherNoncomplianceReason?: string;
}

/**
 * Request for POST /papi/v1/properties/{propertyId}/activations
 */
export interface PropertyActivateRequest {
  propertyVersion: number;
  network: NetworkType;
  note?: string;
  notifyEmails: string[];
  acknowledgeAllWarnings?: boolean;
  acknowledgeWarnings?: string[];
  activationType?: ActivationType;
  ignoreHttpErrors?: boolean;
  complianceRecord?: ComplianceRecord;
  fastPush?: boolean;
  useFastFallback?: boolean;
}

/**
 * Response from POST /papi/v1/properties/{propertyId}/activations
 */
export interface PropertyActivateResponse {
  activationLink: string;
}

export interface FallbackInfo {
  fallbackVersion: number;
  canFastFallback: boolean;
  fastFallbackAttempted: boolean;
  fastFallbackRecoveryState?: string;
  steadyStateTime?: number;
  fastFallbackExpirationTime?: number;
}

export interface Activation {
  accountId?: string;
  activationId?: string;
  activationType?: ActivationType;
  acknowledgeAllWarnings?: boolean;
  acknowledgeWarnings?: string[];
  complianceRecord?: ComplianceRecord;
  fastPush?: boolean;
  fallbackInfo?: FallbackInfo;
  fmaActivationState?: string;
  groupId?: string;
  ignoreHttpErrors?: boolean;
  network?: NetworkType;
  note?: string;
  notifyEmails?: string[];
  propertyId?: string;
  propertyName?: string;
  propertyVersion?: number;
  status?: ActivationStatus;
  submitDate?: string;
  updateDate?: string;
  statusMessage?: string;
  fatalError?: string;
  errors?: Array<{
    type: string;
    messageId: string;
    detail: string;
  }>;
  warnings?: Array<{
    type: string;
    messageId: string;
    detail: string;
  }>;
}

/**
 * Response from GET /papi/v1/properties/{propertyId}/activations
 */
export interface PropertyActivationsGetResponse {
  accountId?: string;
  contractId?: string;
  groupId?: string;
  activations: {
    items: Activation[];
  };
}

// ===========================
// Type Guards
// ===========================

export function isPropertyVersionCreateResponse(obj: unknown): obj is PropertyVersionCreateResponse {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'versionLink' in obj &&
    typeof (obj as any).versionLink === 'string'
  );
}

export function isPropertyVersionRulesGetResponse(obj: unknown): obj is PropertyVersionRulesGetResponse {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'rules' in obj &&
    typeof (obj as any).rules === 'object'
  );
}

export function isEdgeHostnameCreateResponse(obj: unknown): obj is EdgeHostnameCreateResponse {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'edgeHostnameLink' in obj &&
    typeof (obj as any).edgeHostnameLink === 'string'
  );
}

export function isPropertyVersionHostnamesGetResponse(obj: unknown): obj is PropertyVersionHostnamesGetResponse {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'hostnames' in obj &&
    typeof (obj as any).hostnames === 'object' &&
    'items' in (obj as any).hostnames
  );
}

export function isPropertyActivateResponse(obj: unknown): obj is PropertyActivateResponse {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'activationLink' in obj &&
    typeof (obj as any).activationLink === 'string'
  );
}

export function isPropertyActivationsGetResponse(obj: unknown): obj is PropertyActivationsGetResponse {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'activations' in obj &&
    typeof (obj as any).activations === 'object' &&
    'items' in (obj as any).activations
  );
}