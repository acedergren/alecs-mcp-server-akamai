/**
 * Edge DNS API Response Types
 * @see https://techdocs.akamai.com/edge-dns/reference/edge-dns-api
 */

// import { ListResponse } from './common'; // Currently unused

/**
 * DNS Zone types
 */
export enum ZoneType {
  PRIMARY = 'PRIMARY',
  SECONDARY = 'SECONDARY',
  ALIAS = 'ALIAS',
}

/**
 * DNS Zone object
 */
export interface Zone {
  zone: string;
  type: ZoneType;
  comment?: string;
  signAndServe?: boolean;
  signAndServeAlgorithm?: string;
  tsigKey?: {
    name: string;
    algorithm: string;
    secret: string;
  };
  masters?: string[];
  activationState?: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'ERROR';
  lastActivationDate?: string;
  lastModifiedDate?: string;
  lastModifiedBy?: string;
  versionId?: string;
  contractId?: string;
}

/**
 * Response from /config-dns/v2/zones
 */
export interface ZoneListResponse {
  zones: Zone[];
  metadata?: {
    totalCount: number;
    page?: number;
    pageSize?: number;
    showAll?: boolean;
  };
}

/**
 * Response from GET /config-dns/v2/zones/{zone}
 */
export interface ZoneResponse {
  zone: Zone;
}

/**
 * DNS Record types
 */
export type RecordType = 
  | 'A' | 'AAAA' | 'AFSDB' | 'AKAMAICDN' | 'AKAMAITLC' | 'CAA' | 'CERT' 
  | 'CNAME' | 'DNSKEY' | 'DS' | 'HINFO' | 'HTTPS' | 'LOC' | 'MX' 
  | 'NAPTR' | 'NS' | 'NSEC3' | 'NSEC3PARAM' | 'PTR' | 'RP' | 'RRSIG' 
  | 'SOA' | 'SPF' | 'SRV' | 'SSHFP' | 'SVCB' | 'TLSA' | 'TXT';

/**
 * DNS Record object
 */
export interface RecordSet {
  name: string;
  type: RecordType;
  ttl: number;
  rdata: string[];
  active?: boolean;
}

/**
 * Response from /config-dns/v2/zones/{zone}/recordsets
 */
export interface RecordSetsResponse {
  recordsets: RecordSet[];
  metadata?: {
    totalCount: number;
    lastPage?: number;
    page?: number;
    pageSize?: number;
    showAll?: boolean;
  };
}

/**
 * Response from GET /config-dns/v2/zones/{zone}/recordsets/{name}/{type}
 */
export interface RecordSetResponse {
  name: string;
  type: RecordType;
  ttl: number;
  rdata: string[];
}

/**
 * Zone version info
 */
export interface ZoneVersion {
  zone: string;
  versionId: string;
  lastModifiedDate: string;
  lastModifiedBy: string;
  lastAction: string;
  activationState?: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'ERROR';
  comment?: string;
}

/**
 * Response from /config-dns/v2/zones/{zone}/versions
 */
export interface ZoneVersionListResponse {
  versions: ZoneVersion[];
  metadata?: {
    page?: number;
    pageSize?: number;
    totalElements?: number;
  };
}

/**
 * Changelist for bulk operations
 */
export interface ChangeList {
  zone: string;
  changeTag?: string;
  lastModifiedDate?: string;
  stale?: boolean;
}

/**
 * Response from /config-dns/v2/changelists
 */
export interface ChangeListResponse {
  changeLists: ChangeList[];
}

/**
 * Submit changelist request body
 */
export interface SubmitChangeListRequest {
  description?: string;
  validators?: string[];
  bypassSafetyChecks?: boolean;
}

/**
 * Response from POST /config-dns/v2/changelists/{zone}/submit
 */
export interface SubmitChangeListResponse {
  requestId: string;
  changeTag: string;
  zone: string;
  statusUrl: string;
}

/**
 * Response from GET /config-dns/v2/changelists/{zone}/submit/{requestId}
 */
export interface SubmitStatusResponse {
  requestId: string;
  changeTag: string;
  zone: string;
  status: 'PENDING' | 'COMPLETE' | 'FAILED';
  submittedDate: string;
  completedDate?: string;
  message?: string;
  passingValidations?: string[];
  failingValidations?: string[];
}

/**
 * SOA record specific type
 */
export interface SOARecord {
  name: string;
  type: 'SOA';
  ttl: number;
  originDomain: string;
  contact: string;
  serial: number;
  refresh: number;
  retry: number;
  expire: number;
  minimum: number;
}

/**
 * MX record specific type
 */
export interface MXRecord {
  priority: number;
  host: string;
}

/**
 * SRV record specific type  
 */
export interface SRVRecord {
  priority: number;
  weight: number;
  port: number;
  target: string;
}

/**
 * CAA record specific type
 */
export interface CAARecord {
  flags: number;
  tag: string;
  value: string;
}

/**
 * TXT record validation
 */
export interface TXTRecordValidation {
  description: string;
  pattern?: string;
  maxLength?: number;
}

/**
 * Zone file export/import
 */
export interface ZoneFileResponse {
  zone: string;
  fileFormat: 'bind' | 'json';
  content: string;
}

/**
 * Bulk zone operations
 */
export interface BulkZoneOperation {
  requestId: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETE' | 'FAILED';
  zones: Array<{
    zone: string;
    status: string;
    message?: string;
  }>;
  submittedDate: string;
  completedDate?: string;
}