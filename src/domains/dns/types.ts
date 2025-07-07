/**
 * DNS Domain Types - Consolidated Type Definitions
 * 
 * CODE KAI: Single source of truth for all DNS-related types
 * Eliminates duplication and provides type safety across the domain
 */

import { z } from 'zod';

// Re-export validated types from edge-dns-zones
export {
  EdgeDNSZone,
  EdgeDNSZonesResponse,
  EdgeDNSZoneResponse,
  EdgeDNSRecordSet,
  EdgeDNSRecordSetsResponse,
  EdgeDNSChangeListResponse,
  EdgeDNSZoneSubmitResponse,
  EdgeDNSZoneActivationStatusResponse,
  EdgeDNSBulkZoneCreateResponse,
  EdgeDNSDnssecStatusResponse,
  EdgeDNSValidationError,
  TSIGKey,
  SOARecord,
  ZoneListMetadata,
  ValidationError as EdgeDNSValidationErrorType,
  PropagationStatus,
  DNSSECZoneStatus,
} from '../../types/api-responses/edge-dns-zones';

/**
 * Zone Types
 */
export enum ZoneType {
  PRIMARY = 'PRIMARY',
  SECONDARY = 'SECONDARY',
  ALIAS = 'ALIAS',
}

export interface Zone {
  zone: string;
  type: ZoneType;
  activationState?: string;
  lastActivationTime?: string;
  masters?: string[];
  target?: string;
  comment?: string;
  signAndServe?: boolean;
  tsigKey?: {
    name: string;
    algorithm: string;
    secret?: string;
  };
  contractId?: string;
  groupId?: string;
  // Additional fields for backwards compatibility
  zoneType?: ZoneType;
}

export interface ZoneVersion {
  versionId: string;
  zone: string;
  serial: number;
  serialNumber: number;
  lastModifiedDate: string;
  lastModifiedBy: string;
  lastActivatedDate?: string;
  comment?: string;
}

export interface ZoneContract {
  contractId: string;
  features: string[];
  permissions: string[];
}

export interface ZoneTransferStatus {
  zone: string;
  type: 'SECONDARY';
  lastTransferTime?: string;
  lastTransferStatus?: 'SUCCESS' | 'FAILURE';
  nextTransferTime?: string;
  masters: string[];
}

/**
 * Record Types
 */
export type RecordType = 
  | 'A' | 'AAAA' | 'AFSDB' | 'AKAMAICDN' | 'AKAMAITLC' | 'CAA' 
  | 'CERT' | 'CNAME' | 'DNSKEY' | 'DS' | 'HINFO' | 'LOC' | 'MX' 
  | 'NAPTR' | 'NS' | 'NSEC3' | 'NSEC3PARAM' | 'PTR' | 'RP' | 'RRSIG' 
  | 'SOA' | 'SPF' | 'SRV' | 'SSHFP' | 'SVCB' | 'TLSA' | 'TXT';

export interface RecordSet {
  name: string;
  type: RecordType;
  ttl: number;
  rdata: string[];
  // Ensure backwards compatibility
}

export interface MXRecord {
  priority: number;
  target: string;
}

export interface SRVRecord {
  priority: number;
  weight: number;
  port: number;
  target: string;
}

export interface CAARecord {
  flags: number;
  tag: string;
  value: string;
}

/**
 * DNSSEC Types
 */
export type DNSSECAlgorithm = 
  | 'RSASHA1' | 'RSASHA256' | 'RSASHA512' 
  | 'ECDSAP256SHA256' | 'ECDSAP384SHA384' 
  | 'ED25519' | 'ED448';

export interface DNSSECConfig {
  enabled: boolean;
  algorithm: DNSSECAlgorithm;
  nsec3?: boolean;
  nsec3Iterations?: number;
  nsec3Salt?: string;
  nsec3SaltLength?: number;
  signatureValidity?: number;
  zoneSigningOptions?: string[];
}

export interface DNSSECKey {
  keyTag: number;
  algorithm: number;
  algorithmName: DNSSECAlgorithm;
  flags: number;
  protocol: number;
  publicKey: string;
  keyType: 'KSK' | 'ZSK';
  status: 'ACTIVE' | 'INACTIVE' | 'PUBLISHED';
  createdOn: string;
  modifiedOn?: string;
}

export interface DSRecord {
  keyTag: number;
  algorithm: number;
  digestType: number;
  digest: string;
  ttl?: number;
}

export interface DNSSECStatus {
  zone: string;
  enabled: boolean;
  signed: boolean;
  lastSignedDate?: string;
  nextSigningDate?: string;
  dsRecordsAtParent?: boolean;
  validationErrors?: string[];
  chainOfTrust?: {
    complete: boolean;
    links: Array<{
      from: string;
      to: string;
      status: 'SECURE' | 'INSECURE' | 'UNKNOWN';
    }>;
  };
}

/**
 * Change Management Types
 */
export interface EdgeDNSChangeListMetadata {
  zone: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'MULTIPLE';
  summary?: string;
  recordsAdded?: number;
  recordsModified?: number;
  recordsDeleted?: number;
  lastModifiedDate?: string;
  lastModifiedBy?: string;
}

export interface ChangeListDiff {
  zone: string;
  currentVersion: string;
  changeListVersion: string;
  additions: DiffRecord[];
  modifications: DiffModification[];
  deletions: DiffRecord[];
}

export interface DiffRecord {
  name: string;
  type: RecordType;
  ttl: number;
  rdata: string[];
}

export interface DiffModification {
  name: string;
  type: RecordType;
  field: 'ttl' | 'rdata';
  oldValue: {
    ttl?: number;
    rdata?: string[];
  };
  newValue: {
    ttl?: number;
    rdata?: string[];
  };
}

/**
 * Migration Types
 */
export interface ZoneFileRecord {
  name: string;
  type: RecordType;
  ttl: number;
  class?: string;
  data: string;
  comment?: string;
}

export interface MigrationPlan {
  sourceProvider?: string;
  targetZone?: string;
  recordsToMigrate?: number;
  estimatedTime: string;
  sourceRecords: ZoneFileRecord[];
  akamaiRecords: RecordSet[];
  conflicts: Array<{
    record: string;
    issue: string;
    resolution: string;
  }>;
  steps?: Array<{
    order: number;
    description: string;
    automated: boolean;
  }>;
  validation?: {
    preChecks: string[];
    postChecks: string[];
  };
}

export interface MigrationResult {
  success: boolean;
  zone: string;
  recordsMigrated: number;
  recordsFailed: number;
  duration: number;
  errors: Array<{
    record: string;
    error: string;
  }>;
  rollbackAvailable: boolean;
}

/**
 * API Operation Parameters
 */
export interface ListZonesParams {
  contractIds?: string[];
  types?: ZoneType[];
  search?: string;
  showAll?: boolean;
  customer?: string;
}

export interface GetZoneParams {
  zone: string;
  customer?: string;
}

export interface CreateZoneParams {
  zone: string;
  type: ZoneType;
  contractId: string;
  groupId?: number;
  comment?: string;
  signAndServe?: boolean;
  signAndServeAlgorithm?: string;
  masters?: string[];
  tsigKey?: TSIGKey;
  target?: string;
  endCustomerId?: string;
  customer?: string;
}

export interface ListRecordsParams {
  zone: string;
  type?: RecordType;
  name?: string;
  page?: number;
  pageSize?: number;
  search?: string;
  showAll?: boolean;
  customer?: string;
}

export interface CreateRecordParams {
  zone: string;
  name: string;
  type: RecordType;
  ttl: number;
  rdata: string[];
  comment?: string;
  customer?: string;
}

export interface UpdateRecordParams extends CreateRecordParams {
  // Same as create but for update operations
}

export interface DeleteRecordParams {
  zone: string;
  name: string;
  type: RecordType;
  customer?: string;
}

export interface ActivateZoneParams {
  zone: string;
  comment?: string;
  customer?: string;
}

/**
 * Utility Types
 */
export interface AuthorityContract {
  contractId: string;
  authorities: string[];
}

export interface Contract {
  contractId: string;
  contractName?: string;
  contractTypeName?: string;
  edgeDNSType?: string;
  features?: string[];
  permissions?: string[];
}

export interface RecordTypeInfo {
  recordType: RecordType;
  fieldSets: string[];
  flags?: string[];
}

export interface ZoneStatus {
  zone: string;
  type: ZoneType;
  activationState: 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'ERROR';
  lastActivationDate?: string;
  pendingActivation?: {
    activationId: string;
    submittedDate: string;
    submittedBy: string;
    comment?: string;
  };
}

/**
 * Response Types
 */
export interface AuthoritiesResponse {
  contracts: AuthorityContract[];
}

export interface ContractsResponse {
  contracts: Contract[];
}

export interface RecordTypesResponse {
  types: RecordTypeInfo[];
}

export interface ZoneSubmitResult {
  successful: string[];
  failed: Array<{
    zone: string;
    failureReason: string;
  }>;
}

export interface TSIGKey {
  keyId?: string;
  keyName: string;
  name: string;
  algorithm: string;
  secret?: string;
  zones?: string[];
}

export interface TSIGKeyRequest {
  name: string;
  algorithm: string;
  secret: string;
}

/**
 * Error Types
 */
export class DNSError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'DNSError';
  }

  static zoneNotFound(zone: string): DNSError {
    return new DNSError(
      `Zone ${zone} not found`,
      'ZONE_NOT_FOUND'
    );
  }

  static recordNotFound(zone: string, name: string, type: string): DNSError {
    return new DNSError(
      `Record ${name} (${type}) not found in zone ${zone}`,
      'RECORD_NOT_FOUND'
    );
  }

  static validationFailed(details: unknown): DNSError {
    return new DNSError(
      'DNS validation failed',
      'VALIDATION_FAILED',
      details
    );
  }

  static activationFailed(zone: string, reason: string): DNSError {
    return new DNSError(
      `Failed to activate zone ${zone}: ${reason}`,
      'ACTIVATION_FAILED'
    );
  }
}