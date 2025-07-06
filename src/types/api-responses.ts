/**
 * Akamai API Response Types
 * 
 * This file contains all the response types needed for the Akamai MCP server,
 * organized by API endpoint. These types are derived from analyzing the actual
 * response properties accessed throughout the codebase.
 */

// ===========================
// Property Manager API (PAPI)
// ===========================

export interface GroupsResponse {
  groups: {
    items: Array<{
      groupId: string;
      groupName: string;
      parentGroupId?: string;
      contractIds: string[];
    }>;
  };
}

export interface PropertiesResponse {
  properties: {
    items: Array<{
      propertyId: string;
      propertyName: string;
      contractId: string;
      groupId: string;
      assetId?: string;
      productId?: string;
      latestVersion?: number;
      productionVersion?: number;
      stagingVersion?: number;
      productionStatus?: string;
      stagingStatus?: string;
      note?: string;
    }>;
  };
}

export interface PropertyDetailResponse {
  properties: {
    items: Array<{
      propertyId: string;
      propertyName: string;
      contractId: string;
      groupId: string;
      assetId?: string;
      productId?: string;
      latestVersion?: number;
      productionVersion?: number;
      stagingVersion?: number;
      productionStatus?: string;
      stagingStatus?: string;
      note?: string;
    }>;
  };
}

export interface PropertyVersionResponse {
  versions: {
    items: Array<{
      propertyVersion: number;
      updatedByUser?: string;
      updatedDate?: string;
      note?: string;
    }>;
  };
}

export interface PropertyHostnamesResponse {
  hostnames: {
    items: Array<{
      cnameFrom: string;
      cnameTo: string;
      certStatus?: {
        status?: string;
      };
    }>;
  };
}

export interface PropertyCreateResponse {
  propertyLink: string;
}

export interface ContractsResponse {
  contracts: {
    items: Array<{
      contractId: string;
      contractTypeName?: string;
      status?: string;
    }>;
  };
}

export interface ProductsResponse {
  products: {
    items: Array<{
      productId: string;
      productName: string;
    }>;
  };
}

export interface RuleFormatsResponse {
  ruleFormats: {
    items: string[];
  };
}

export interface PropertyActivationResponse {
  activationLink: string;
  activationId: string;
  status: string;
  network: string;
  propertyName: string;
  propertyId: string;
  propertyVersion: number;
  note?: string;
  notifyEmails: string[];
  submitter: string;
  submitterDate: string;
  updateDate?: string;
}

export interface ActivationStatusResponse {
  activations: {
    items: Array<{
      activationId: string;
      status: string;
      network: string;
      propertyName: string;
      propertyId: string;
      propertyVersion: number;
      updateDate?: string;
      note?: string;
    }>;
  };
}

export interface RuleTreeResponse {
  rules: {
    name: string;
    children: Array<unknown>;
    behaviors: Array<unknown>;
    criteria: Array<unknown>;
    variables?: Array<unknown>;
  };
  ruleFormat: string;
  comments?: string;
}

export interface EdgeHostnamesResponse {
  edgeHostnames: {
    items: Array<{
      edgeHostnameId: string;
      edgeHostnameDomain: string;
      productId: string;
      domainPrefix: string;
      domainSuffix: string;
      secure: boolean;
      ipVersionBehavior: string;
    }>;
  };
}

export interface EdgeHostnameCreateResponse {
  edgeHostnameLink: string;
}

// ================
// Edge DNS API (v2)
// ================

export interface DNSZonesResponse {
  zones: Array<{
    zone: string;
    type: 'PRIMARY' | 'SECONDARY' | 'ALIAS';
    comment?: string;
    signAndServe?: boolean;
    masters?: string[];
  }>;
}

export interface DNSZoneDetailResponse {
  zone: string;
  type: 'PRIMARY' | 'SECONDARY' | 'ALIAS';
  comment?: string;
  signAndServe?: boolean;
  signAndServeAlgorithm?: string;
  masters?: string[];
}

export interface DNSRecordsResponse {
  recordsets: Array<{
    name: string;
    type: string;
    ttl: number;
    rdata: string[];
  }>;
}

export interface DNSChangeListResponse {
  zone: string;
  lastModifiedDate: string;
  lastModifiedBy: string;
  recordSets: Array<{
    name: string;
    type: string;
    ttl: number;
    rdata: string[];
  }>;
}

export interface DNSSubmitResponse {
  requestId: string;
  expiryDate: string;
  validationResult?: {
    errors: Array<{
      field: string;
      message: string;
    }>;
    warnings: Array<{
      field: string;
      message: string;
    }>;
  };
}

export interface DNSZoneStatusResponse {
  zone: string;
  activationState: 'PENDING' | 'ACTIVE' | 'FAILED';
  lastActivationTime?: string;
  propagationStatus?: {
    percentage: number;
    serversUpdated: number;
    totalServers: number;
  };
  requestId?: string;
}

// =============================
// Certificate Provisioning (CPS)
// =============================

export interface CPSEnrollmentCreateResponse {
  enrollment: string; // Contains enrollment ID in path
}

export interface CPSEnrollmentStatusResponse {
  enrollmentId: number;
  enrollment: string;
  pendingChanges: string[];
  status: string;
  autoRenewalStartTime?: string;
  certificateType: string;
  validationType: string;
  ra: string;
  allowedDomains: Array<{
    name: string;
    status?: string;
    validationStatus?: string;
    validationDetails?: {
      challenges?: Array<{
        type: string;
        status: string;
        error?: string;
        token?: string;
        responseBody?: string;
        fullPath?: string;
        redirectFullPath?: string;
      }>;
      error?: string;
    };
  }>;
}

export interface CPSEnrollmentsListResponse {
  enrollments: Array<{
    location: string;
    ra: string;
    validationType: string;
    certificateType: string;
    certificateChainType: string;
    networkConfiguration: {
      geography: string;
      secureNetwork: string;
      mustHaveCiphers: string;
      preferredCiphers: string;
      sniOnly: boolean;
      quicEnabled: boolean;
    };
    signatureAlgorithm: string;
    changeManagement: boolean;
    csr: {
      cn: string;
      sans?: string[];
    };
    pendingChanges: string[];
  }>;
}

export interface CPSDeploymentStatusResponse {
  production: {
    primaryCertificate: {
      certificate: string;
      trustChain: string;
      expiry: string;
    };
    multiStackedCertificates: Array<unknown>;
  };
  staging: {
    primaryCertificate: {
      certificate: string;
      trustChain: string;
      expiry: string;
    };
    multiStackedCertificates: Array<unknown>;
  };
}

// Additional CPS types for deployment coordinator
export interface DeploymentListResponse {
  deployments: Array<{
    deploymentId: string;
    enrollmentId: number;
    network: string;
    status: string;
    createdDate: string;
    modifiedDate: string;
    targetEnvironment?: string;
    primaryCertificate?: {
      network?: string;
    };
    deploymentStatus?: string;
    deploymentDate?: string;
  }>;
}

export interface DeploymentDetailResponse {
  deployment: {
    deploymentId: string;
    enrollmentId: number;
    network: string;
    status: string;
    createdDate: string;
    modifiedDate: string;
    propertyIds?: string[];
  };
}

export interface Deployment {
  deploymentId: string;
  enrollmentId: number;
  network: string;
  status: string;
  createdDate: string;
  modifiedDate: string;
  targetEnvironment?: string;
  primaryCertificate?: {
    network?: string;
  };
  deploymentStatus?: string;
  deploymentDate?: string;
}

export interface DeploymentStatus {
  status: string;
  message?: string;
}

export interface EnrollmentDetailResponse {
  enrollment: {
    id: number;
    cn: string;
    sans?: string[];
    status: string;
    certificateType: string;
    validationType: string;
    productId?: string;
  };
}

// DV Validation types
export interface DVValidationResponse {
  validations: DomainValidation[];
}

export interface DomainValidation {
  domain: string;
  status: string;
  challenges: Array<{
    type: string;
    token: string;
    responseBody: string;
    url?: string;
    dnsRecord?: {
      name: string;
      type: string;
      value: string;
    };
  }>;
  error?: string;
}

// ==================
// Network Lists (v2)
// ==================

export interface NetworkListsResponse {
  networkLists: Array<{
    uniqueId: string;
    name: string;
    type: 'IP' | 'GEO' | 'ASN';
    elementCount: number;
    description?: string;
    createDate: string;
    createdBy: string;
    updateDate: string;
    updatedBy: string;
    productionStatus?: string;
    stagingStatus?: string;
    shared: boolean;
    syncPoint?: number;
    contractId?: string;
    groupId?: string;
    list?: string[];
  }>;
}

export interface NetworkListDetailResponse {
  uniqueId: string;
  name: string;
  type: 'IP' | 'GEO' | 'ASN';
  elementCount: number;
  description?: string;
  createDate: string;
  createdBy: string;
  updateDate: string;
  updatedBy: string;
  productionStatus?: string;
  stagingStatus?: string;
  shared: boolean;
  syncPoint?: number;
  contractId?: string;
  groupId?: string;
  list: string[];
}

export interface NetworkListActivationResponse {
  activationId: string;
  status: string;
  network: string;
  uniqueId: string;
  syncPoint: number;
}

// ==================
// Fast Purge (CCU v3)
// ==================

export interface FastPurgeResponse {
  purgeId: string;
  supportId: string;
  detail: string;
  estimatedSeconds: number;
  httpStatus: number;
  title?: string;
  pingAfterSeconds?: number;
}

export interface FastPurgeStatusResponse {
  purgeId: string;
  status: 'In-Progress' | 'Done' | 'Failed';
  submittedBy: string;
  submittedTime: string;
  completionTime?: string;
  estimatedSeconds: number;
  purgedCount: number;
  supportId: string;
}

// ==============================
// Application Security (AppSec)
// ==============================

export interface AppSecConfigurationsResponse {
  configurations: Array<{
    id: number;
    name: string;
    description?: string;
    latestVersion: number;
    productionVersion?: number;
    stagingVersion?: number;
  }>;
}

export interface AppSecConfigDetailResponse {
  id: number;
  name: string;
  description?: string;
  version: number;
  productionVersion?: number;
  stagingVersion?: number;
  selectable: boolean;
  configurationVersionNotes?: string;
  createDate: string;
  createdBy: string;
}

export interface AppSecPolicyCreateResponse {
  policyId: string;
  policyName: string;
  policyMode: string;
  paranoidLevel?: number;
}

export interface AppSecSecurityEventsResponse {
  totalEvents: number;
  securityEvents: Array<{
    timestamp?: string;
    httpMessage?: {
      start?: string;
      host?: string;
      requestUri?: string;
    };
    clientIP: string;
    ruleId: string;
    attackGroup: string;
    action: string;
  }>;
}

export interface AppSecActivationResponse {
  activationId: number;
  status: string;
  network: string;
  configId: number;
  version: number;
}

// ===========================
// Reporting API (Time Series)
// ===========================

export interface ReportingMetricResponse {
  data: Array<{
    timestamp: string;
    value: number;
    unit?: string;
    dimensions?: Record<string, string>;
  }>;
  metadata: {
    name: string;
    description: string;
    unit: string;
    aggregationType: string;
  };
}

export interface ReportingSummaryResponse {
  summary: {
    startTime: string;
    endTime: string;
    metrics: Record<string, {
      value: number;
      unit: string;
    }>;
  };
}

// =====================
// CP Code Management
// =====================

export interface CPCodesResponse {
  cpcodes: {
    items: Array<{
      cpcodeId: string;
      cpcodeName: string;
      productIds: string[];
      createdDate: string;
    }>;
  };
}

export interface CPCodeCreateResponse {
  cpcodeLink: string;
  cpcodeId: string;
  cpcodeName: string;
}

// ===============
// Common Types
// ===============

export interface AkamaiErrorResponse {
  type?: string;
  title?: string;
  detail?: string;
  instance?: string;
  status?: number;
  errors?: Array<{
    type?: string;
    title?: string;
    detail?: string;
  }>;
  warnings?: Array<{
    type?: string;
    title?: string;
    detail?: string;
  }>;
}

// Generic response wrapper used by some APIs
export interface GenericResponse<T> {
  data: T;
  headers?: Record<string, string>;
  status?: number;
}