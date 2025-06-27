/**
 * Comprehensive Akamai API Type Definitions
 * Based on official Akamai OpenAPI specifications and documentation
 * 
 * References:
 * - Property Manager API (PAPI): https://developer.akamai.com/api/core_features/property_manager/v1.html
 * - Edge DNS API: https://developer.akamai.com/api/cloud_security/edge_dns/v2.html
 * - Certificate Provisioning System (CPS): https://developer.akamai.com/api/cloud_security/certificate_provisioning_system/v2.html
 * - Application Security: https://developer.akamai.com/api/cloud_security/application_security/v1.html
 */

// ============================================================================
// COMMON TYPES
// ============================================================================

export interface AkamaiError {
  type: string;
  title: string;
  detail?: string;
  status: number;
  instance?: string;
  requestId?: string;
  method?: string;
  serverIp?: string;
  clientIp?: string;
  requestTime?: string;
}

export interface AkamaiResponse<T> {
  data?: T;
  errors?: AkamaiError[];
  warnings?: AkamaiError[];
}

export interface AkamaiListResponse<T> extends AkamaiResponse<T> {
  totalCount?: number;
  pageSize?: number;
  pageNumber?: number;
}

export interface AkamaiLink {
  href: string;
  rel?: string;
  method?: string;
}

// ============================================================================
// PROPERTY MANAGER API (PAPI) TYPES
// ============================================================================

export interface PropertyManagerContract {
  contractId: string;
  contractTypeId: number;
  contractTypeName: string;
}

export interface PropertyManagerGroup {
  groupId: string;
  groupName: string;
  parentGroupId?: string;
  contractIds: string[];
}

export interface PropertyManagerProduct {
  productId: string;
  productName: string;
}

export interface PropertyManagerEdgeHostname {
  edgeHostnameId: string;
  domainPrefix: string;
  domainSuffix: string;
  secure: boolean;
  ipVersionBehavior: 'IPV4' | 'IPV6_PERFORMANCE' | 'IPV6_COMPLIANCE';
  productId?: string;
  ttl?: number;
  map?: string;
  slotNumber?: number;
  cnameTo?: string;
  cnameType?: 'EDGE_HOSTNAME' | 'ENHANCED_TLS';
  certProvisioningType?: 'DEFAULT' | 'CPS_MANAGED';
  certificateId?: number;
}

export interface PropertyManagerHostname {
  cnameFrom: string;
  cnameTo: string;
  cnameType: 'EDGE_HOSTNAME' | 'ENHANCED_TLS';
  edgeHostnameId?: string;
  certProvisioningType?: 'DEFAULT' | 'CPS_MANAGED';
  certificateId?: number;
}

export interface PropertyManagerRuleTreeRule {
  name: string;
  comments?: string;
  criteria: PropertyManagerRuleTreeCriterion[];
  behaviors: PropertyManagerRuleTreeBehavior[];
  children?: PropertyManagerRuleTreeRule[];
  criteriaMustSatisfy?: 'all' | 'any';
  uuid?: string;
  templateUuid?: string;
  templateLink?: string;
}

export interface PropertyManagerRuleTreeCriterion {
  name: string;
  options?: Record<string, unknown>;
  uuid?: string;
  templateUuid?: string;
  locked?: boolean;
}

export interface PropertyManagerRuleTreeBehavior {
  name: string;
  options?: Record<string, unknown>;
  uuid?: string;
  templateUuid?: string;
  locked?: boolean;
}

export interface PropertyManagerRuleTree {
  rules: PropertyManagerRuleTreeRule;
  ruleFormat: string;
  comments?: string;
  warnings?: PropertyManagerRuleTreeWarning[];
  errors?: PropertyManagerRuleTreeError[];
}

export interface PropertyManagerRuleTreeWarning {
  type: string;
  title: string;
  detail?: string;
  instance?: string;
  behaviorName?: string;
  errorLocation?: string;
}

export interface PropertyManagerRuleTreeError extends PropertyManagerRuleTreeWarning {
  validationLevel?: 'error' | 'warning';
}

export interface PropertyManagerProperty {
  propertyId: string;
  propertyName: string;
  accountId: string;
  contractId: string;
  groupId: string;
  assetId: string;
  note?: string;
  latestVersion: number;
  stagingVersion?: number;
  productionVersion?: number;
  productId?: string;
  ruleFormat?: string;
}

export interface PropertyManagerVersion {
  propertyVersion: number;
  updatedByUser: string;
  updatedDate: string;
  productionStatus: 'INACTIVE' | 'PENDING' | 'ACTIVE' | 'DEACTIVATED';
  stagingStatus: 'INACTIVE' | 'PENDING' | 'ACTIVE' | 'DEACTIVATED';
  etag: string;
  productId?: string;
  ruleFormat?: string;
  note?: string;
}

export interface PropertyManagerActivation {
  activationId: string;
  propertyName: string;
  propertyId: string;
  propertyVersion: number;
  network: 'STAGING' | 'PRODUCTION';
  activationType: 'ACTIVATE' | 'DEACTIVATE';
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'ZONE_1' | 'ZONE_2' | 'ZONE_3' | 'ABORTED' | 'FAILED' | 'DEACTIVATED' | 'PENDING_DEACTIVATION' | 'NEW';
  submitDate: string;
  updateDate: string;
  note?: string;
  notifyEmails: string[];
  fmaActivationState?: string;
  fallbackInfo?: PropertyManagerActivationFallback;
}

export interface PropertyManagerActivationFallback {
  fastFallback: boolean;
  fallbackVersion?: number;
  canFastFallback?: boolean;
}

// ============================================================================
// EDGE DNS API TYPES  
// ============================================================================

export interface EdgeDNSZone {
  zone: string;
  type: 'PRIMARY' | 'SECONDARY' | 'ALIAS';
  masters?: string[];
  comment?: string;
  signAndServe: boolean;
  signAndServeAlgorithm?: number;
  tsigKey?: EdgeDNSTsigKey;
  target?: string;
  endCustomerId?: string;
  contractId?: string;
  activationState: 'PENDING' | 'ACTIVE' | 'NEW';
  lastActivationDate?: string;
  versionId?: string;
}

export interface EdgeDNSTsigKey {
  name: string;
  algorithm: string;
  secret: string;
}

export interface EdgeDNSRecord {
  name: string;
  type: 'A' | 'AAAA' | 'AFSDB' | 'CNAME' | 'DNAME' | 'HINFO' | 'LOC' | 'MX' | 'NAPTR' | 'NS' | 'NSEC3' | 'NSEC3PARAM' | 'PTR' | 'RP' | 'SOA' | 'SPF' | 'SRV' | 'SSHFP' | 'TXT';
  ttl: number;
  rdata: string[];
}

export interface EdgeDNSSOARecord extends Omit<EdgeDNSRecord, 'type' | 'rdata'> {
  type: 'SOA';
  rdata: [string]; // SOA record has single rdata value
}

export interface EdgeDNSRecordSet {
  name: string;
  type: string;
  ttl: number;
  rdata: string[];
}

export interface EdgeDNSChangeList {
  zone: string;
  changeTag: string;
  changeListId?: string;
  status: 'PENDING' | 'ACTIVE';
  submitDate?: string;
  lastActivationDate?: string;
}

// ============================================================================
// CERTIFICATE PROVISIONING SYSTEM (CPS) TYPES
// ============================================================================

export interface CPSCertificate {
  certificateId: number;
  commonName: string;
  sans: string[];
  validationType: 'DV' | 'OV' | 'EV';
  certificateType: 'SAN' | 'SINGLE' | 'WILDCARD';
  signatureAlgorithm: 'SHA-1' | 'SHA-256';
  keyAlgorithm: 'RSA' | 'ECDSA';
  trustChain: 'DEFAULT' | 'SYMANTEC_BASIC' | 'SYMANTEC_COMPLETE';
  renewalMethod: 'AUTO' | 'MANUAL';
  autoRenewalStartTime?: number;
  ra: 'symantec' | 'lets-encrypt' | 'third-party';
  validationMethod?: 'HTTP' | 'DNS' | 'EMAIL';
  organization?: CPSOrganization;
  adminContact?: CPSContact;
  techContact?: CPSContact;
  changeManagement?: boolean;
  deploymentSchedule?: CPSDeploymentSchedule;
}

export interface CPSOrganization {
  name: string;
  phone: string;
  addressLineOne: string;
  addressLineTwo?: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
}

export interface CPSContact {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  addressLineOne: string;
  addressLineTwo?: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  organizationName: string;
  title: string;
}

export interface CPSDeploymentSchedule {
  timeZone: string;
  notifyEmails: string[];
  changeManagement: boolean;
}

export interface CPSDeployment {
  primaryCertificate: CPSCertificateDeployment;
  multiStackedCertificates?: CPSCertificateDeployment[];
  networkConfiguration: CPSNetworkConfiguration;
  firewallConfiguration?: CPSFirewallConfiguration;
}

export interface CPSCertificateDeployment {
  certificate: string;
  trustChain: string;
  ocspStapling: 'ENABLED' | 'DISABLED' | 'NOT_SET';
  preferredCiphers: 'CUSTOM' | 'DEFAULT' | 'PERFORMANCE' | 'COMPATIBILITY';
  mustHaveCiphers?: 'CUSTOM' | 'PERFORMANCE' | 'COMPATIBILITY';
  ciphers?: string;
}

export interface CPSNetworkConfiguration {
  geography: 'CORE' | 'CHINA' | 'GLOBAL';
  secureNetwork: 'ENHANCED_TLS' | 'STANDARD_TLS';
  sni: 'ENABLED' | 'DISABLED';
  quicEnabled: boolean;
  http2: 'ENABLED' | 'DISABLED';
  disallowedTlsVersions?: string[];
  clone?: boolean;
  preferredCiphers?: 'CUSTOM' | 'DEFAULT' | 'PERFORMANCE' | 'COMPATIBILITY';
  mustHaveCiphers?: 'CUSTOM' | 'PERFORMANCE' | 'COMPATIBILITY';
}

export interface CPSFirewallConfiguration {
  blockAllTrafficExceptAllowedIPs: boolean;
  allowedIPs?: string[];
}

export interface CPSEnrollment {
  location: string;
  enrollmentId: number;
  ra: string;
  validationType: 'DV' | 'OV' | 'EV';
  certificateType: 'SAN' | 'SINGLE' | 'WILDCARD';
  networkConfiguration: CPSNetworkConfiguration;
  signatureAlgorithm: 'SHA-1' | 'SHA-256';
  changeManagement: boolean;
  maxAllowedSanNames?: number;
  maxAllowedWildcardSanNames?: number;
  enableMultiStackedCertificates: boolean;
  certificateChainType: 'DEFAULT' | 'SYMANTEC_BASIC' | 'SYMANTEC_COMPLETE';
  pendingChanges?: boolean;
}

// ============================================================================
// APPLICATION SECURITY TYPES
// ============================================================================

export interface AppSecConfiguration {
  id: number;
  name: string;
  description?: string;
  contractId: string;
  groupId: number;
  createDate: string;
  createdBy: string;
  lastModified: string;
  lastModifiedBy: string;
  productionVersion?: number;
  stagingVersion?: number;
  latestVersion: number;
}

export interface AppSecPolicy {
  policyId: string;
  policyName: string;
  hasNetworkLists: boolean;
  createDate: string;
  createdBy: string;
  lastModified: string;
  lastModifiedBy: string;
}

export interface AppSecMatchTarget {
  configId: number;
  targetId: number;
  type: 'api' | 'website';
  hostnames: string[];
  filePaths?: string[];
  isNegativeFileMatch?: boolean;
  isNegativePathMatch?: boolean;
  securityPolicy?: AppSecMatchTargetSecurityPolicy;
  bypassNetworkLists?: number[];
}

export interface AppSecMatchTargetSecurityPolicy {
  policyId: string;
}

export interface AppSecRuleAction {
  action: 'alert' | 'deny' | 'none';
  id: number;
}

export interface AppSecCustomRule {
  id: number;
  name: string;
  description?: string;
  structured: boolean;
  ruleActivated: boolean;
  tag: string[];
  conditions: AppSecCustomRuleCondition[];
}

export interface AppSecCustomRuleCondition {
  type: 'pathMatch' | 'extensionMatch' | 'headerMatch' | 'cookieMatch' | 'parameterMatch' | 'methodMatch' | 'countryMatch' | 'asnMatch' | 'ipMatch' | 'requestBodyMatch';
  positiveMatch: boolean;
  value?: string[];
  valueWildcard?: boolean;
  valueCaseSensitive?: boolean;
  header?: string;
  name?: string;
  nameWildcard?: boolean;
  nameCaseSensitive?: boolean;
}

// ============================================================================
// NETWORK LISTS TYPES  
// ============================================================================

export interface NetworkList {
  networkListId: string;
  name: string;
  type: 'IP' | 'GEO';
  description?: string;
  list: string[];
  syncPoint?: number;
  shared: boolean;
  readOnly: boolean;
  productionActivationStatus?: 'ACTIVE' | 'INACTIVE' | 'PENDING_ACTIVATION' | 'PENDING_DEACTIVATION' | 'ACTIVATION_FAILED' | 'DEACTIVATION_FAILED';
  stagingActivationStatus?: 'ACTIVE' | 'INACTIVE' | 'PENDING_ACTIVATION' | 'PENDING_DEACTIVATION' | 'ACTIVATION_FAILED' | 'DEACTIVATION_FAILED';
  createDate?: string;
  createdBy?: string;
  lastModified?: string;
  lastModifiedBy?: string;
  numEntries?: number;
}

// ============================================================================
// FAST PURGE TYPES
// ============================================================================

export interface FastPurgeRequest {
  objects: string[];
  hostname?: string;
  action?: 'remove' | 'invalidate';
}

export interface FastPurgeResponse {
  httpStatus: number;
  detail: string;
  estimatedSeconds: number;
  purgeId: string;
  supportId: string;
}

export interface FastPurgeStatus {
  purgeId: string;
  submissionTime: string;
  purgeStatus: 'In-Progress' | 'Done' | 'Unknown';
  completionTime?: string;
}

// ============================================================================
// REPORTING API TYPES
// ============================================================================

export interface ReportingMetric {
  name: string;
  value: number;
  unit?: string;
  timestamp?: string;
}

export interface TrafficReport {
  reportType: 'traffic-by-time' | 'traffic-by-responsecode' | 'traffic-by-hostname';
  interval: 'HOUR' | 'DAY' | 'MONTH';
  startDate: string;
  endDate: string;
  metrics: ReportingMetric[];
  metadata?: Record<string, unknown>;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type AkamaiApiResponse<T> = Promise<AkamaiResponse<T>>;
export type AkamaiApiListResponse<T> = Promise<AkamaiListResponse<T>>;

export interface AkamaiApiRequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  queryParams?: Record<string, string | number | boolean>;
  body?: unknown;
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isAkamaiError(obj: unknown): obj is AkamaiError {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'type' in obj &&
    'title' in obj &&
    'status' in obj &&
    typeof (obj as AkamaiError).type === 'string' &&
    typeof (obj as AkamaiError).title === 'string' &&
    typeof (obj as AkamaiError).status === 'number'
  );
}

export function isPropertyManagerProperty(obj: unknown): obj is PropertyManagerProperty {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'propertyId' in obj &&
    'propertyName' in obj &&
    'contractId' in obj &&
    'groupId' in obj &&
    typeof (obj as PropertyManagerProperty).propertyId === 'string' &&
    typeof (obj as PropertyManagerProperty).propertyName === 'string'
  );
}

export function isEdgeDNSZone(obj: unknown): obj is EdgeDNSZone {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'zone' in obj &&
    'type' in obj &&
    'signAndServe' in obj &&
    typeof (obj as EdgeDNSZone).zone === 'string' &&
    ['PRIMARY', 'SECONDARY', 'ALIAS'].includes((obj as EdgeDNSZone).type)
  );
}

export function isCPSCertificate(obj: unknown): obj is CPSCertificate {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'certificateId' in obj &&
    'commonName' in obj &&
    'validationType' in obj &&
    typeof (obj as CPSCertificate).certificateId === 'number' &&
    typeof (obj as CPSCertificate).commonName === 'string'
  );
}