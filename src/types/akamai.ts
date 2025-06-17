/**
 * Akamai API response type definitions
 */

/**
 * Common fields across Akamai API responses
 */
export interface AkamaiBaseResponse {
  /** Resource links */
  links?: {
    /** Link to self */
    self?: string;
    /** Other relevant links */
    [key: string]: string | undefined;
  };
}

/**
 * EdgeGrid authentication response
 */
export interface EdgeGridAuthResponse extends AkamaiBaseResponse {
  /** Authentication token */
  token: string;
  /** Token expiration time */
  expiresAt: string;
  /** Granted scopes */
  scopes: string[];
}

/**
 * Property Manager API responses
 */
export interface Property extends AkamaiBaseResponse {
  /** Property ID */
  propertyId: string;
  /** Property name */
  propertyName: string;
  /** Contract ID */
  contractId: string;
  /** Group ID */
  groupId: string;
  /** Product ID */
  productId: string;
  /** Latest version */
  latestVersion: number;
  /** Production version */
  productionVersion?: number;
  /** Staging version */
  stagingVersion?: number;
  /** Property hostnames */
  hostnames?: string[];
  /** Creation timestamp */
  createdDate?: string;
  /** Last modified timestamp */
  modifiedDate?: string;
}

export interface PropertyVersion extends AkamaiBaseResponse {
  /** Property ID */
  propertyId: string;
  /** Version number */
  version: number;
  /** Version notes */
  note?: string;
  /** Product ID */
  productId: string;
  /** Production status */
  productionStatus: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  /** Staging status */
  stagingStatus: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  /** Rule format */
  ruleFormat: string;
  /** Created by user */
  createdByUser: string;
  /** Creation timestamp */
  createdDate: string;
}

export interface PropertyRules {
  /** Rule format version */
  ruleFormat: string;
  /** Root rule tree */
  rules: RuleTree;
}

export interface RuleTree {
  /** Rule name */
  name: string;
  /** Child rules */
  children: RuleTree[];
  /** Rule behaviors */
  behaviors?: Behavior[];
  /** Rule criteria */
  criteria?: Criterion[];
  /** Rule comments */
  comments?: string;
  /** Custom override ID */
  customOverride?: {
    overrideId: string;
    name: string;
  };
}

export interface Behavior {
  /** Behavior name */
  name: string;
  /** Behavior options */
  options: Record<string, unknown>;
}

export interface Criterion {
  /** Criterion name */
  name: string;
  /** Criterion options */
  options: Record<string, unknown>;
}

export interface PropertyActivation extends AkamaiBaseResponse {
  /** Activation ID */
  activationId: string;
  /** Property ID */
  propertyId: string;
  /** Property version */
  version: number;
  /** Network */
  network: 'PRODUCTION' | 'STAGING';
  /** Activation status */
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'ZONE_1' | 'ZONE_2' | 'ZONE_3' | 'ABORTED' | 'FAILED' | 'DEACTIVATED';
  /** Submission date */
  submitDate: string;
  /** Update date */
  updateDate: string;
  /** Activation notes */
  note?: string;
  /** Notification emails */
  notifyEmails: string[];
}

/**
 * DNS API responses
 */
export interface DnsZone extends AkamaiBaseResponse {
  /** Zone name */
  zone: string;
  /** Zone type */
  type: 'PRIMARY' | 'SECONDARY' | 'ALIAS';
  /** Contract ID */
  contractId: string;
  /** Comment */
  comment?: string;
  /** Sign and serve */
  signAndServe: boolean;
  /** Sign and serve algorithm */
  signAndServeAlgorithm?: string;
  /** Activation state */
  activationState: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  /** Last activation date */
  lastActivationDate?: string;
  /** Last modified date */
  lastModifiedDate?: string;
  /** Version ID */
  versionId?: string;
}

export interface DnsRecord {
  /** Record name */
  name: string;
  /** Record type */
  type: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'NS' | 'SOA' | 'PTR' | 'SRV' | 'CAA' | 'AFSDB';
  /** TTL in seconds */
  ttl: number;
  /** Record data */
  rdata: string[];
  /** Is active */
  active?: boolean;
}

export interface DnsRecordSet extends AkamaiBaseResponse {
  /** Zone name */
  zone: string;
  /** Record sets */
  recordsets: DnsRecord[];
}

/**
 * Certificate provisioning responses
 */
export interface Certificate extends AkamaiBaseResponse {
  /** Enrollment ID */
  enrollmentId: number;
  /** Common name */
  cn: string;
  /** Subject alternative names */
  sans?: string[];
  /** Certificate type */
  certificateType: 'DV' | 'OV' | 'EV' | 'THIRD_PARTY';
  /** Validation type */
  validationType: 'DV' | 'OV' | 'EV';
  /** Certificate status */
  status: 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'REVOKED';
  /** Network deployment */
  networkConfiguration: {
    geography: 'CORE' | 'CHINA' | 'RUSSIA' | 'STANDARD';
    secureNetwork: 'STANDARD_TLS' | 'ENHANCED_TLS' | 'SHARED_CERT';
    mustHaveCiphers: string[];
    preferredCiphers: string[];
  };
}

/**
 * Error response structures
 */
export interface AkamaiError {
  /** Error type */
  type: string;
  /** Error title */
  title: string;
  /** Error details */
  detail?: string;
  /** Instance ID */
  instance?: string;
  /** HTTP status */
  status?: number;
  /** Additional errors */
  errors?: Array<{
    type: string;
    title: string;
    detail?: string;
  }>;
}

/**
 * List response wrapper
 */
export interface ListResponse<T> extends AkamaiBaseResponse {
  /** Items in the list */
  items: T[];
  /** Total count */
  totalItems?: number;
  /** Page size */
  pageSize?: number;
  /** Current page */
  currentPage?: number;
}

/**
 * Contract and group responses
 */
export interface Contract extends AkamaiBaseResponse {
  /** Contract ID */
  contractId: string;
  /** Contract type name */
  contractTypeName: string;
}

export interface Group extends AkamaiBaseResponse {
  /** Group ID */
  groupId: string;
  /** Group name */
  groupName: string;
  /** Parent group ID */
  parentGroupId?: string;
  /** Contract IDs */
  contractIds: string[];
}

export interface Product extends AkamaiBaseResponse {
  /** Product ID */
  productId: string;
  /** Product name */
  productName: string;
}

/**
 * Edge hostname responses
 */
export interface EdgeHostname extends AkamaiBaseResponse {
  /** Edge hostname ID */
  edgeHostnameId: string;
  /** Domain prefix */
  domainPrefix: string;
  /** Domain suffix */
  domainSuffix: string;
  /** Product ID */
  productId: string;
  /** IP version behavior */
  ipVersionBehavior: 'IPV4' | 'IPV6' | 'IPV4_IPV6';
  /** Is secure */
  secure: boolean;
  /** Edge hostname link */
  edgeHostnameLink?: string;
}

/**
 * CP Code responses
 */
export interface CpCode extends AkamaiBaseResponse {
  /** CP code ID */
  cpcodeId: string;
  /** CP code name */
  cpcodeName: string;
  /** Product IDs */
  productIds: string[];
  /** Creation date */
  createdDate: string;
}

/**
 * Network list responses
 */
export interface NetworkList extends AkamaiBaseResponse {
  /** List ID */
  listId: string;
  /** List name */
  name: string;
  /** List type */
  type: 'IP' | 'GEO';
  /** Element count */
  elementCount: number;
  /** List items */
  list: string[];
  /** Sync point */
  syncPoint: number;
  /** Access control group */
  accessControlGroup?: string;
  /** Description */
  description?: string;
}

/**
 * Purge responses
 */
export interface PurgeResponse extends AkamaiBaseResponse {
  /** Purge ID */
  purgeId: string;
  /** Estimated seconds to completion */
  estimatedSeconds: number;
  /** HTTP status */
  httpStatus: number;
  /** Detail message */
  detail: string;
  /** Support ID */
  supportId: string;
}

/**
 * Reporting responses
 */
export interface ReportData extends AkamaiBaseResponse {
  /** Report ID */
  reportId: string;
  /** Report type */
  reportType: string;
  /** Start date */
  startDate: string;
  /** End date */
  endDate: string;
  /** Report data */
  data: {
    columns: Array<{
      name: string;
      type: string;
    }>;
    rows: Array<Record<string, unknown>>;
  };
}

/**
 * Security configuration responses
 */
export interface SecurityConfig extends AkamaiBaseResponse {
  /** Configuration ID */
  configId: number;
  /** Configuration name */
  name: string;
  /** Version */
  version: number;
  /** Production version */
  productionVersion?: number;
  /** Staging version */
  stagingVersion?: number;
  /** Last modified date */
  lastModifiedDate: string;
  /** Creation date */
  createDate: string;
}

export interface WafRule {
  /** Rule ID */
  ruleId: string;
  /** Rule action */
  action: 'ALERT' | 'DENY' | 'BLOCK';
  /** Rule condition */
  condition: {
    type: string;
    positionalParams: string[];
  };
}

/**
 * Include responses
 */
export interface Include extends AkamaiBaseResponse {
  /** Include ID */
  includeId: string;
  /** Include name */
  includeName: string;
  /** Include type */
  includeType: 'MICROSERVICES' | 'COMMON_SETTINGS';
  /** Contract ID */
  contractId: string;
  /** Group ID */
  groupId: string;
}