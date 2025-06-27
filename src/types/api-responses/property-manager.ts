/**
 * Property Manager API (PAPI) Response Types
 * @see https://techdocs.akamai.com/property-mgr/reference/api
 */

import { ActivationStatus, NetworkType, ActivationType, ListResponse, ResponseMetadata } from './common';

/**
 * Property object as returned by the API
 */
export interface Property {
  accountId: string;
  contractId: string;
  groupId: string;
  propertyId: string;
  propertyName: string;
  latestVersion: number;
  stagingVersion?: number | null;
  productionVersion?: number | null;
  assetId?: string;
  note?: string;
  productId?: string;
  ruleFormat?: string;
}

/**
 * Response from /papi/v1/properties
 */
export interface PropertyListResponse {
  properties: ListResponse<Property>;
}

/**
 * Response from /papi/v1/properties/{propertyId}
 */
export interface PropertyDetailResponse {
  properties: ListResponse<Property>;
}

/**
 * Contract object
 */
export interface Contract {
  accountId: string;
  contractId: string;
  contractTypeName: string;
}

/**
 * Response from /papi/v1/contracts
 */
export interface ContractListResponse {
  contracts: ListResponse<Contract>;
}

/**
 * Group object
 */
export interface Group {
  accountId: string;
  groupId: string;
  groupName: string;
  parentGroupId?: string | null;
  contractIds: string[];
}

/**
 * Response from /papi/v1/groups
 */
export interface GroupListResponse {
  groups: ListResponse<Group>;
}

/**
 * Property version
 */
export interface PropertyVersion {
  propertyVersion: number;
  updatedByUser: string;
  updatedDate: string;
  productionStatus: ActivationStatus;
  stagingStatus: ActivationStatus;
  etag?: string;
  productId?: string;
  ruleFormat?: string;
  note?: string;
}

/**
 * Response from /papi/v1/properties/{propertyId}/versions
 */
export interface PropertyVersionListResponse {
  propertyId: string;
  propertyName: string;
  accountId: string;
  contractId: string;
  groupId: string;
  assetId?: string;
  versions: ListResponse<PropertyVersion>;
}

/**
 * Hostname configuration
 */
export interface Hostname {
  cnameFrom: string;
  cnameTo: string;
  cnameType?: 'EDGE_HOSTNAME';
  certProvisioningType?: 'DEFAULT' | 'CPS_MANAGED';
  certEnrollmentId?: number;
}

/**
 * Response from /papi/v1/properties/{propertyId}/versions/{version}/hostnames
 */
export interface HostnameListResponse {
  accountId: string;
  contractId: string;
  groupId: string;
  propertyId: string;
  propertyVersion: number;
  etag?: string;
  hostnames: ListResponse<Hostname>;
}

/**
 * Edge hostname
 */
export interface EdgeHostname {
  accountId: string;
  contractId: string;
  groupId: string;
  edgeHostnameId: string;
  edgeHostnameDomain: string;
  productId: string;
  domainPrefix: string;
  domainSuffix: string;
  secure?: boolean;
  ipVersionBehavior: 'IPV4' | 'IPV6' | 'IPV6_COMPLIANCE';
  slotNumber?: number;
  ttl?: number;
  customTarget?: string;
  chinaCdn?: boolean;
  isActive?: boolean;
  useDefaultTtl?: boolean;
  useDefaultMap?: boolean;
}

/**
 * Response from /hapi/v1/edge-hostnames
 */
export interface EdgeHostnameListResponse {
  accountId: string;
  contractId: string;
  groupId: string;
  edgeHostnames: ListResponse<EdgeHostname>;
}

/**
 * Activation details
 */
export interface Activation {
  accountId: string;
  activationId: string;
  propertyId: string;
  propertyName: string;
  propertyVersion: number;
  network: NetworkType;
  activationType: ActivationType;
  status: ActivationStatus;
  submitDate: string;
  updateDate: string;
  note?: string;
  notifyEmails: string[];
  acknowledgeAllWarnings: boolean;
  acknowledgeWarnings?: string[];
  fastPush?: boolean;
  fmaActivationState?: string;
  fallbackInfo?: {
    fastFallbackAttempted: boolean;
    fallbackVersion: number;
    canFastFallback: boolean;
    steadyStateTime: number;
    fastFallbackExpirationTime: number;
    fastFallbackRecoveryState?: string;
  };
}

/**
 * Response from /papi/v1/properties/{propertyId}/activations
 */
export interface ActivationListResponse {
  accountId: string;
  contractId: string;
  groupId: string;
  activations: ListResponse<Activation>;
}

/**
 * Response from POST /papi/v1/properties/{propertyId}/activations
 */
export interface ActivationPostResponse {
  activationLink: string;
}

/**
 * Response from /papi/v1/properties/{propertyId}/versions/{version}/rules
 */
export interface RuleTreeResponse {
  accountId: string;
  contractId: string;
  groupId: string;
  propertyId: string;
  propertyVersion: number;
  etag: string;
  ruleFormat: string;
  rules: RuleTree;
  warnings?: ValidationWarning[];
  errors?: ValidationError[];
}

/**
 * Rule tree structure
 */
export interface RuleTree {
  name: string;
  children: Rule[];
  behaviors?: Behavior[];
  criteria?: Criterion[];
  criteriaMustSatisfy?: 'all' | 'any';
  comments?: string;
  uuid?: string;
  templateUuid?: string;
  templateLink?: string;
  variables?: Variable[];
  advancedOverride?: string;
}

/**
 * Individual rule
 */
export interface Rule {
  name: string;
  children?: Rule[];
  behaviors?: Behavior[];
  criteria?: Criterion[];
  criteriaMustSatisfy?: 'all' | 'any';
  comments?: string;
  uuid?: string;
  templateUuid?: string;
  templateLink?: string;
}

/**
 * Behavior configuration
 */
export interface Behavior {
  name: string;
  options: Record<string, any>;
  uuid?: string;
  templateUuid?: string;
  templateLink?: string;
}

/**
 * Criterion configuration
 */
export interface Criterion {
  name: string;
  options: Record<string, any>;
  uuid?: string;
  templateUuid?: string;
  templateLink?: string;
}

/**
 * Variable definition
 */
export interface Variable {
  name: string;
  value?: string;
  description?: string;
  hidden: boolean;
  sensitive: boolean;
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  type: string;
  errorLocation: string;
  detail: string;
}

/**
 * Validation error
 */
export interface ValidationError extends ValidationWarning {
  title: string;
  instance?: string;
  suggestedFix?: string;
}

/**
 * CP Code
 */
export interface CpCode {
  cpcodeId: string;
  cpcodeName: string;
  productIds: string[];
  createdDate: string;
  cpGroup?: {
    groupId: string;
    groupName: string;
  };
}

/**
 * Response from /papi/v1/cpcodes
 */
export interface CpCodeListResponse {
  accountId: string;
  contractId: string;
  groupId: string;
  cpcodes: ListResponse<CpCode>;
}

/**
 * Product
 */
export interface Product {
  productName: string;
  productId: string;
}

/**
 * Response from /papi/v1/products
 */
export interface ProductListResponse {
  accountId: string;
  contractId: string;
  products: ListResponse<Product>;
}

/**
 * Rule format
 */
export interface RuleFormat {
  deprecated: boolean;
  ruleFormat: string;
}

/**
 * Response from /papi/v1/rule-formats
 */
export interface RuleFormatListResponse {
  ruleFormats: ListResponse<RuleFormat>;
}

/**
 * Response from /papi/v1/search/find-by-value
 */
export interface SearchResponse {
  versions: ListResponse<{
    propertyId: string;
    propertyName: string;
    version: number;
    stagingStatus?: ActivationStatus;
    productionStatus?: ActivationStatus;
    updatedDate: string;
    matchLocations: string[];
  }>;
}