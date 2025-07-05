/**
 * PAPI Properties API Response Types
 * Based on official Akamai Property Manager API documentation
 * 
 * SNOW LEOPARD ARCHITECTURE:
 * - Precise type definitions based on documented PAPI schemas
 * - Zero-tolerance for unknown types in API responses
 * - Comprehensive field mapping for all documented properties
 * - Type-safe validation with proper null/undefined handling
 * 
 * API Documentation Reference:
 * - GET /papi/v1/properties: List properties with contract/group filtering
 * - GET /papi/v1/groups: List groups with contract information
 * - GET /papi/v1/contracts: List available contracts
 */

/**
 * Property item from GET /papi/v1/properties
 * Comprehensive type definition based on PAPI documentation
 */
export interface PapiProperty {
  /** Unique property identifier (prp_XXXXX format) */
  propertyId: string;
  
  /** Human-readable property name */
  propertyName: string;
  
  /** Account identifier where property belongs */
  accountId: string;
  
  /** Contract identifier (ctr_XXXXX format) */
  contractId: string;
  
  /** Group identifier (grp_XXXXX format) */
  groupId: string;
  
  /** Latest version number of the property */
  latestVersion: number;
  
  /** Version currently active on staging (null if none) */
  stagingVersion: number | null;
  
  /** Version currently active on production (null if none) */
  productionVersion: number | null;
  
  /** Product identifier used for this property */
  productId?: string;
  
  /** Rule format version */
  ruleFormat?: string;
  
  /** Optional note describing the property */
  note?: string;
  
  /** When property was created */
  createdDate?: string;
  
  /** When property was last modified */
  updatedDate?: string;
  
  /** User who created the property */
  createdByUser?: string;
  
  /** User who last updated the property */
  updatedByUser?: string;
  
  /** Property asset ID for reporting */
  assetId?: string;
  
  /** Staging status information */
  stagingStatus?: {
    version?: number;
    status?: 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'DEACTIVATED';
    updateDate?: string;
    message?: string;
  };
  
  /** Production status information */
  productionStatus?: {
    version?: number;
    status?: 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'DEACTIVATED';
    updateDate?: string;
    message?: string;
  };
}

/**
 * Response from GET /papi/v1/properties
 * Official PAPI response structure
 */
export interface PapiPropertiesListResponse {
  /** Account identifier */
  accountId: string;
  
  /** Contract identifier used for filtering */
  contractId: string;
  
  /** Group identifier used for filtering */
  groupId: string;
  
  /** Properties container object */
  properties: {
    /** Array of property items */
    items: PapiProperty[];
  };
  
  /** Optional self-referencing links */
  links?: {
    self?: {
      href: string;
    };
  };
  
  /** ETag for response caching */
  etag?: string;
}

/**
 * Group item from GET /papi/v1/groups
 * Used for contract/group discovery
 */
export interface PapiGroup {
  /** Group identifier (grp_XXXXX format) */
  groupId: string;
  
  /** Human-readable group name */
  groupName: string;
  
  /** Parent group identifier (grp_XXXXX format, null for top-level) */
  parentGroupId: string | null;
  
  /** Array of contract identifiers this group has access to */
  contractIds: string[];
}

/**
 * Response from GET /papi/v1/groups
 * Official PAPI response structure
 */
export interface PapiGroupsListResponse {
  /** Account identifier */
  accountId: string;
  
  /** Account name */
  accountName: string;
  
  /** Groups container object */
  groups: {
    /** Array of group items */
    items: PapiGroup[];
  };
  
  /** Optional self-referencing links */
  links?: {
    self?: {
      href: string;
    };
  };
  
  /** ETag for response caching */
  etag?: string;
}

/**
 * Contract item from GET /papi/v1/contracts
 * Used for contract discovery and validation
 */
export interface PapiContract {
  /** Contract identifier (ctr_XXXXX format) */
  contractId: string;
  
  /** Contract type name */
  contractTypeName: string;
  
  /** Contract status */
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
}

/**
 * Response from GET /papi/v1/contracts
 * Official PAPI response structure
 */
export interface PapiContractsListResponse {
  /** Account identifier */
  accountId: string;
  
  /** Contracts container object */
  contracts: {
    /** Array of contract items */
    items: PapiContract[];
  };
  
  /** Optional self-referencing links */
  links?: {
    self?: {
      href: string;
    };
  };
  
  /** ETag for response caching */
  etag?: string;
}

/**
 * PAPI Error Response Structure
 * Standard error format for all PAPI endpoints
 */
export interface PapiErrorResponse {
  /** Error type URI */
  type: string;
  
  /** Human-readable error title */
  title: string;
  
  /** Detailed error description */
  detail: string;
  
  /** HTTP status code */
  status: number;
  
  /** Request instance identifier */
  instance?: string;
  
  /** Request tracking ID */
  requestId?: string;
  
  /** Detailed error information */
  errors?: Array<{
    type?: string;
    title: string;
    detail?: string;
    field?: string;
  }>;
}

/**
 * Type guard to check if response is a PAPI error
 */
export function isPapiError(response: unknown): response is PapiErrorResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'type' in response &&
    'title' in response &&
    'status' in response
  );
}

/**
 * Type guard to check if response is a valid properties list
 */
export function isPapiPropertiesResponse(response: unknown): response is PapiPropertiesListResponse {
  const typedResponse = response as Record<string, unknown>;
  return (
    typeof response === 'object' &&
    response !== null &&
    'properties' in response &&
    typeof typedResponse['properties'] === 'object' &&
    typedResponse['properties'] !== null &&
    'items' in (typedResponse['properties'] as Record<string, unknown>) &&
    Array.isArray((typedResponse['properties'] as Record<string, unknown>)['items'])
  );
}

/**
 * Type guard to check if response is a valid groups list
 */
export function isPapiGroupsResponse(response: unknown): response is PapiGroupsListResponse {
  const typedResponse = response as Record<string, unknown>;
  return (
    typeof response === 'object' &&
    response !== null &&
    'groups' in response &&
    typeof typedResponse['groups'] === 'object' &&
    typedResponse['groups'] !== null &&
    'items' in (typedResponse['groups'] as Record<string, unknown>) &&
    Array.isArray((typedResponse['groups'] as Record<string, unknown>)['items'])
  );
}

/**
 * Response from GET /papi/v1/properties/{propertyId}
 * Returns detailed information about a specific property
 */
export interface PapiPropertyDetailsResponse {
  /** Account identifier */
  accountId: string;
  
  /** Contract identifier */
  contractId: string;
  
  /** Group identifier */
  groupId: string;
  
  /** Properties container with single item */
  properties: {
    /** Array with single property item */
    items: [PapiProperty];
  };
  
  /** Optional self-referencing links */
  links?: {
    self?: {
      href: string;
    };
  };
  
  /** ETag for response caching */
  etag?: string;
}

/**
 * Version details from GET /papi/v1/properties/{propertyId}/versions/{versionId}
 */
export interface PapiPropertyVersion {
  /** Version number */
  propertyVersion: number;
  
  /** User who created/updated this version */
  updatedByUser: string;
  
  /** When version was created/updated */
  updatedDate: string;
  
  /** Rule format for this version */
  ruleFormat?: string;
  
  /** Optional version notes */
  note?: string;
  
  /** Version status on production */
  productionStatus?: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'DEACTIVATED';
  
  /** Version status on staging */
  stagingStatus?: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'DEACTIVATED';
  
  /** ETag for this version */
  etag?: string;
}

/**
 * Response from GET /papi/v1/properties/{propertyId}/versions
 * Lists all versions of a property
 */
export interface PapiPropertyVersionsResponse {
  /** Account identifier */
  accountId: string;
  
  /** Contract identifier */
  contractId: string;
  
  /** Group identifier */
  groupId: string;
  
  /** Property identifier */
  propertyId: string;
  
  /** Property name */
  propertyName: string;
  
  /** Versions container */
  versions: {
    /** Array of version items */
    items: PapiPropertyVersion[];
  };
  
  /** Optional self-referencing links */
  links?: {
    self?: {
      href: string;
    };
  };
}

/**
 * Response from GET /papi/v1/properties/{propertyId}/versions/{versionId}
 * Gets details of a specific version
 */
export interface PapiPropertyVersionDetailsResponse {
  /** Account identifier */
  accountId: string;
  
  /** Contract identifier */
  contractId: string;
  
  /** Group identifier */
  groupId: string;
  
  /** Property identifier */
  propertyId: string;
  
  /** Property name */
  propertyName: string;
  
  /** Versions container with single item */
  versions: {
    /** Array with single version item */
    items: [PapiPropertyVersion];
  };
  
  /** Optional self-referencing links */
  links?: {
    self?: {
      href: string;
    };
  };
}

/**
 * Hostname item from property hostnames endpoint
 */
export interface PapiHostname {
  /** Source hostname (customer domain) */
  cnameFrom: string;
  
  /** Target hostname (Akamai edge hostname) */
  cnameTo: string;
  
  /** Edge hostname type */
  cnameType?: 'EDGE_HOSTNAME' | 'CUSTOM';
  
  /** Certificate provisioning status */
  certStatus?: {
    /** Certificate status */
    status?: 'PENDING' | 'DEPLOYED' | 'FAILED' | 'READY';
    
    /** Validation status for DV certificates */
    validationStatus?: 'PENDING' | 'COMPLETED' | 'FAILED';
    
    /** Certificate type */
    type?: 'CPS_MANAGED' | 'DEFAULT' | 'CUSTOM';
  };
  
  /** Edge hostname ID */
  edgeHostnameId?: string;
}

/**
 * Response from GET /papi/v1/properties/{propertyId}/versions/{versionId}/hostnames
 * Lists hostnames associated with a property version
 */
export interface PapiPropertyHostnamesResponse {
  /** Account identifier */
  accountId: string;
  
  /** Contract identifier */
  contractId: string;
  
  /** Group identifier */
  groupId: string;
  
  /** Property identifier */
  propertyId: string;
  
  /** Property version */
  propertyVersion: number;
  
  /** Hostnames container */
  hostnames: {
    /** Array of hostname items */
    items: PapiHostname[];
  };
  
  /** Optional self-referencing links */
  links?: {
    self?: {
      href: string;
    };
  };
  
  /** ETag for response caching */
  etag?: string;
}

/**
 * Type guard to check if response is property details
 */
export function isPapiPropertyDetailsResponse(response: unknown): response is PapiPropertyDetailsResponse {
  const typedResponse = response as Record<string, unknown>;
  return (
    typeof response === 'object' &&
    response !== null &&
    'properties' in response &&
    typeof typedResponse['properties'] === 'object' &&
    typedResponse['properties'] !== null &&
    'items' in (typedResponse['properties'] as Record<string, unknown>) &&
    Array.isArray((typedResponse['properties'] as Record<string, unknown>)['items']) &&
    ((typedResponse['properties'] as Record<string, unknown>)['items'] as Array<unknown>).length === 1
  );
}

/**
 * Type guard to check if response is property versions
 */
export function isPapiPropertyVersionsResponse(response: unknown): response is PapiPropertyVersionsResponse {
  const typedResponse = response as Record<string, unknown>;
  return (
    typeof response === 'object' &&
    response !== null &&
    'versions' in response &&
    typeof typedResponse['versions'] === 'object' &&
    typedResponse['versions'] !== null &&
    'items' in (typedResponse['versions'] as Record<string, unknown>) &&
    Array.isArray((typedResponse['versions'] as Record<string, unknown>)['items'])
  );
}

/**
 * Type guard to check if response is property hostnames
 */
export function isPapiPropertyHostnamesResponse(response: unknown): response is PapiPropertyHostnamesResponse {
  const typedResponse = response as Record<string, unknown>;
  return (
    typeof response === 'object' &&
    response !== null &&
    'hostnames' in response &&
    typeof typedResponse['hostnames'] === 'object' &&
    typedResponse['hostnames'] !== null &&
    'items' in (typedResponse['hostnames'] as Record<string, unknown>) &&
    Array.isArray((typedResponse['hostnames'] as Record<string, unknown>)['items'])
  );
}

/**
 * Type guard to check if response is contracts list
 */
export function isPapiContractsResponse(response: unknown): response is PapiContractsListResponse {
  const typedResponse = response as Record<string, unknown>;
  return (
    typeof response === 'object' &&
    response !== null &&
    'contracts' in response &&
    typeof typedResponse['contracts'] === 'object' &&
    typedResponse['contracts'] !== null &&
    'items' in (typedResponse['contracts'] as Record<string, unknown>) &&
    Array.isArray((typedResponse['contracts'] as Record<string, unknown>)['items'])
  );
}

/**
 * Product item from GET /papi/v1/products
 * Used for property creation
 */
export interface PapiProduct {
  /** Product identifier (prd_XXXXX format) */
  productId: string;
  
  /** Human-readable product name */
  productName: string;
}

/**
 * Response from GET /papi/v1/products
 * Official PAPI response structure
 */
export interface PapiProductsListResponse {
  /** Account identifier */
  accountId: string;
  
  /** Contract identifier used for filtering */
  contractId: string;
  
  /** Products container object */
  products: {
    /** Array of product items */
    items: PapiProduct[];
  };
  
  /** Optional self-referencing links */
  links?: {
    self?: {
      href: string;
    };
  };
}

/**
 * Response from GET /papi/v1/rule-formats
 * Lists available rule format versions
 */
export interface PapiRuleFormatsResponse {
  /** Rule formats container */
  ruleFormats: {
    /** Array of rule format strings in descending order (newest first) */
    items: string[];
  };
}

/**
 * Request body for POST /papi/v1/properties
 * Creates a new property
 */
export interface PapiPropertyCreateRequest {
  /** Property name (must be unique within the group) */
  propertyName: string;
  
  /** Product identifier (prd_XXXXX format) */
  productId: string;
  
  /** Rule format version to use */
  ruleFormat: string;
  
  /** Optional clone from settings */
  cloneFrom?: {
    /** Property ID to clone from */
    propertyId: string;
    
    /** Version to clone from */
    version: number;
  };
}

/**
 * Response from POST /papi/v1/properties
 * Returns link to newly created property
 */
export interface PapiPropertyCreateResponse {
  /** Link to the newly created property resource */
  propertyLink: string;
}

/**
 * Type guard to check if response is products list
 */
export function isPapiProductsResponse(response: unknown): response is PapiProductsListResponse {
  const typedResponse = response as Record<string, unknown>;
  return (
    typeof response === 'object' &&
    response !== null &&
    'products' in response &&
    typeof typedResponse['products'] === 'object' &&
    typedResponse['products'] !== null &&
    'items' in (typedResponse['products'] as Record<string, unknown>) &&
    Array.isArray((typedResponse['products'] as Record<string, unknown>)['items'])
  );
}

/**
 * Type guard to check if response is rule formats
 */
export function isPapiRuleFormatsResponse(response: unknown): response is PapiRuleFormatsResponse {
  const typedResponse = response as Record<string, unknown>;
  return (
    typeof response === 'object' &&
    response !== null &&
    'ruleFormats' in response &&
    typeof typedResponse['ruleFormats'] === 'object' &&
    typedResponse['ruleFormats'] !== null &&
    'items' in (typedResponse['ruleFormats'] as Record<string, unknown>) &&
    Array.isArray((typedResponse['ruleFormats'] as Record<string, unknown>)['items'])
  );
}

/**
 * Type guard to check if response is property create response
 */
export function isPapiPropertyCreateResponse(response: unknown): response is PapiPropertyCreateResponse {
  const typedResponse = response as Record<string, unknown>;
  return (
    typeof response === 'object' &&
    response !== null &&
    'propertyLink' in response &&
    typeof typedResponse['propertyLink'] === 'string'
  );
}