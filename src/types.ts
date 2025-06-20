/**
 * TypeScript interfaces for Akamai API responses and MCP server types
 */

// Note: EdgeGrid configuration is now handled by the akamai-edgegrid SDK
// which automatically parses .edgerc files

// Property Manager API Types
export interface Property {
  propertyId: string;
  propertyName: string;
  propertyVersion?: number;
  latestVersion?: number;
  productionVersion?: number;
  stagingVersion?: number;
  note?: string;
  productionStatus?: string;
  stagingStatus?: string;
  assetId?: string;
  groupId: string;
  contractId: string;
  productId?: string;
}

export interface PropertyList {
  properties: {
    items: Property[];
  };
}

export interface Group {
  groupId: string;
  groupName: string;
  parentGroupId?: string;
  contractIds: string[];
}

export interface GroupList {
  groups: {
    items: Group[];
  };
}

export interface PropertyVersion {
  propertyVersion: number;
  updatedByUser: string;
  updatedDate: string;
  productionStatus: string;
  stagingStatus: string;
  etag: string;
  productId: string;
  note: string;
}

export interface Contract {
  contractId: string;
  contractTypeName: string;
}

export interface Product {
  productId: string;
  productName: string;
}

// Rule Tree Types
export interface RuleTree {
  rules: Rule;
  ruleFormat: string;
  propertyVersion: number;
  etag: string;
}

export interface Rule {
  name: string;
  children: Rule[];
  behaviors: Behavior[];
  criteria: Criterion[];
  criteriaMustSatisfy?: string;
}

export interface Behavior {
  name: string;
  options: Record<string, any>;
}

export interface Criterion {
  name: string;
  options: Record<string, any>;
}

// Activation Types
export interface Activation {
  activationId: string;
  propertyName: string;
  propertyId: string;
  propertyVersion: number;
  network: 'STAGING' | 'PRODUCTION';
  activationType: string;
  status: string;
  submitDate: string;
  updateDate: string;
  note: string;
  notifyEmails: string[];
}

// Error Response Types
export interface AkamaiError {
  type: string;
  title: string;
  detail?: string;
  instance?: string;
  status: number;
  errors?: Array<{
    type: string;
    title: string;
    detail?: string;
  }>;
}

// MCP Tool Arguments
export interface ListPropertiesArgs {
  contractId?: string;
  groupId?: string;
}

export interface GetPropertyArgs {
  propertyId: string;
}

export interface CreatePropertyArgs {
  propertyName: string;
  productId: string;
  contractId: string;
  groupId: string;
  ruleFormat?: string;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ListGroupsArgs {
  // No specific args, returns all accessible groups
}

// MCP Response Format
export interface MCPToolResponse {
  content: Array<{
    type: 'text';
    text: string;
  }>;
}

// DNS Types (needed by dns-migration-tools)
export interface DNSRecordSet {
  name: string;
  type: string;
  ttl: number;
  rdata: string[];
}

// Network Lists Types
export interface NetworkList {
  uniqueId: string;
  name: string;
  type: 'IP' | 'GEO' | 'ASN';
  description?: string;
  list: string[];
  numEntries: number;
  elementCount: number;
  productionStatus?: string;
  stagingStatus?: string;
  productionActivationId?: string;
  stagingActivationId?: string;
  createDate: string;
  createdBy: string;
  updateDate: string;
  updatedBy: string;
  shared: boolean;
  syncPoint?: number;
  contractId?: string;
  groupId?: string;
}

export interface NetworkListResponse {
  networkLists: NetworkList[];
  links?: {
    create: {
      href: string;
    };
  };
}

export interface NetworkListItem {
  value: string;
  description?: string;
}

export interface NetworkListActivation {
  activationId: string;
  uniqueId: string;
  name: string;
  network: 'STAGING' | 'PRODUCTION';
  status: 'PENDING' | 'ACTIVE' | 'FAILED' | 'INACTIVE';
  dispatchCount: number;
  comments?: string;
  links?: {
    activationStatus: {
      href: string;
    };
  };
}

export interface NetworkListBulkUpdate {
  uniqueId: string;
  syncPoint: number;
  add?: string[];
  remove?: string[];
}

export interface GeographicLocation {
  countryCode: string;
  countryName: string;
  subdivisionCode?: string;
  subdivisionName?: string;
  cityName?: string;
}

export interface ASNInfo {
  asn: number;
  name: string;
  description?: string;
}
