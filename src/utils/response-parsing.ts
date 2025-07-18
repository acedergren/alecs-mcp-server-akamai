/**
 * Response Parsing Utilities
 *
 * Comprehensive response parsing and validation for all Akamai API responses
 * based on documented response schemas.
 */

import { z } from 'zod';

// Base response interfaces matching documented schemas
export interface AkamaiBaseResponse {
  links?: {
    self?: string;
    [key: string]: string | undefined;
  };
}

export interface AkamaiListResponse<T> extends AkamaiBaseResponse {
  items: T[];
  totalItems?: number;
  pageSize?: number;
  currentPage?: number;
}

export interface AkamaiErrorResponse {
  type?: string;
  title: string;
  detail?: string;
  status?: number;
  instance?: string;
  requestId?: string;
  errors?: Array<{
    type?: string;
    title: string;
    detail?: string;
    field?: string;
  }>;
}

// Property Manager response schemas
export const PropertyResponseSchemas = {
  property: z.object({
    accountId: z.string().optional(),
    contractId: z.string().optional(),
    groupId: z.string().optional(),
    propertyId: z.string(),
    propertyName: z.string().optional(),
    latestVersion: z.number().optional(),
    stagingVersion: z.number().nullable().optional(),
    productionVersion: z.number().nullable().optional(),
    assetId: z.string().optional(),
    note: z.string().optional(),
    productId: z.string().optional(),
    ruleFormat: z.string().optional(),
    hostnames: z.array(z.string()).optional(),
  }),
  propertyVersion: z.object({
    propertyVersion: z.number(),
    updatedByUser: z.string().optional(),
    updatedDate: z.string().optional(),
    productionStatus: z.enum(['ACTIVE', 'INACTIVE', 'PENDING', 'ABORTED']).optional(),
    stagingStatus: z.enum(['ACTIVE', 'INACTIVE', 'PENDING', 'ABORTED']).optional(),
    etag: z.string().optional(),
    note: z.string().optional(),
  }),
  activation: z.object({
    activationId: z.string(),
    propertyName: z.string(),
    propertyId: z.string(),
    propertyVersion: z.number(),
    network: z.enum(['STAGING', 'PRODUCTION']),
    activationType: z.enum(['ACTIVATE', 'DEACTIVATE']),
    status: z.enum(['PENDING', 'ACTIVE', 'FAILED', 'DEACTIVATED', 'ABORTED']),
    submittedBy: z.string().optional(),
    submittedDate: z.string().optional(),
    activationDate: z.string().optional(),
    updateDate: z.string().optional(),
    note: z.string().optional(),
    notifyEmails: z.array(z.string()).optional(),
    acknowledgeAllWarnings: z.boolean().optional(),
    useFastFallback: z.boolean().optional(),
    fastPush: z.boolean().optional(),
    warnings: z
      .array(
        z.object({
          type: z.string(),
          title: z.string(),
          detail: z.string().optional(),
        }),
      )
      .optional(),
  }),

  hostname: z.object({
    cnameFrom: z.string(),
    cnameTo: z.string(),
    cnameType: z.enum(['EDGE_HOSTNAME']).optional(),
    edgeHostnameId: z.string().optional(),
    certProvisioningType: z.enum(['DEFAULT', 'CPS_MANAGED']).optional(),
    certStatus: z
      .object({
        validationCname: z
          .object({
            hostname: z.string(),
            target: z.string(),
          })
          .optional(),
        staging: z
          .array(
            z.object({
              status: z.string(),
            }),
          )
          .optional(),
        production: z
          .array(
            z.object({
              status: z.string(),
            }),
          )
          .optional(),
      })
      .optional(),
  }),
};

// DNS response schemas
export const DNSResponseSchemas = {
  zone: z.object({
    zone: z.string(),
    type: z.enum(['PRIMARY', 'SECONDARY', 'ALIAS']),
    masters: z.array(z.string()).optional(),
    comment: z.string().optional(),
    signAndServe: z.boolean().optional(),
    signAndServeAlgorithm: z.string().optional(),
    tsigKey: z
      .object({
        name: z.string(),
        algorithm: z.string(),
        secret: z.string(),
      })
      .optional(),
    target: z.string().optional(),
    endCustomerId: z.string().optional(),
    contractId: z.string(),
    activationState: z.enum(['ACTIVE', 'INACTIVE', 'PENDING']).optional(),
    lastActivationDate: z.string().optional(),
    versionId: z.string().optional(),
  }),

  record: z.object({
    name: z.string(),
    type: z.string(),
    ttl: z.number(),
    rdata: z.array(z.string()),
  }),
  changelist: z.object({
    zone: z.string(),
    changeId: z.string().optional(),
    status: z.enum(['PENDING', 'ACTIVE', 'FAILED']).optional(),
    submittedDate: z.string().optional(),
    submittedBy: z.string().optional(),
  }),
};

// Certificate response schemas
export const CertificateResponseSchemas = {
  enrollment: z.object({
    id: z.number(),
    productionSlots: z.array(z.string()).optional(),
    stagingSlots: z.array(z.string()).optional(),
    assignedSlots: z.array(z.string()).optional(),
    location: z.string().optional(),
    ra: z.string(),
    validationType: z.enum(['dv', 'ov', 'ev', 'third-party']),
    certificateType: z.enum(['san', 'single', 'wildcard']),
    networkConfiguration: z.object({
      geography: z.enum(['core', 'china', 'russia']),
      secureNetwork: z.enum(['standard-tls', 'enhanced-tls', 'shared-cert']),
      quicEnabled: z.boolean().optional(),
    }),
    csr: z.object({
      cn: z.string(),
      sans: z.array(z.string()).optional(),
      c: z.string().optional(),
      st: z.string().optional(),
      l: z.string().optional(),
      o: z.string().optional(),
      ou: z.string().optional(),
    }),
    adminContact: z
      .object({
        firstName: z.string(),
        lastName: z.string(),
        email: z.string(),
        phone: z.string(),
      })
      .optional(),
    techContact: z
      .object({
        firstName: z.string(),
        lastName: z.string(),
        email: z.string(),
        phone: z.string(),
      })
      .optional(),
    pendingChanges: z.array(z.string()).optional(),
    maxAllowedSanNames: z.number().optional(),
    maxAllowedWildcardSanNames: z.number().optional(),
    autoRenewalStartTime: z.string().optional(),
  }),

  dvChallenge: z.object({
    domain: z.string(),
    validationStatus: z.enum(['pending', 'processing', 'valid', 'invalid']),
    validationRecords: z
      .array(
        z.object({
          hostname: z.string(),
          recordType: z.enum(['CNAME', 'TXT']),
          target: z.string(),
        }),
      )
      .optional(),
    challenges: z
      .array(
        z.object({
          type: z.enum(['dns-01', 'http-01']),
          status: z.enum(['pending', 'processing', 'valid', 'invalid']),
          token: z.string().optional(),
          keyAuthorization: z.string().optional(),
        }),
      )
      .optional(),
    expires: z.string().optional(),
  }),
};

// Fast Purge response schemas
export const FastPurgeResponseSchemas = {
  purgeResponse: z.object({
    _httpStatus: z.number(),
    detail: z.string(),
    estimatedSeconds: z.number(),
    purgeId: z.string(),
    supportId: z.string().optional(),
  }),
  purgeStatus: z.object({
    _httpStatus: z.number(),
    detail: z.string(),
    status: z.enum(['In-Progress', 'Done', 'Error']),
    submittedBy: z.string().optional(),
    submissionTime: z.string().optional(),
    completionTime: z.string().optional(),
  }),
};

// Network Lists response schemas
export const NetworkListResponseSchemas = {
  networkList: z.object({
    uniqueId: z.string(),
    name: z.string(),
    type: z.enum(['IP', 'GEO', 'ASN']),
    description: z.string().optional(),
    readOnly: z.boolean().optional(),
    shared: z.boolean().optional(),
    syncPoint: z.number().optional(),
    elementCount: z.number(),
    elements: z.array(z.string()).optional(),
    links: z
      .object({
        activateInProduction: z.string().optional(),
        activateInStaging: z.string().optional(),
        appendItems: z.string().optional(),
        retrieve: z.string().optional(),
        statusInProduction: z.string().optional(),
        statusInStaging: z.string().optional(),
        update: z.string().optional(),
      })
      .optional(),
  }),
};

// Type definitions for responses
interface PropertyListResponse {
  properties?: {
    items: unknown[];
  };
}

interface VersionListResponse {
  versions?: {
    items: unknown[];
  };
}

interface ActivationListResponse {
  activations?: {
    items: unknown[];
  };
}

interface HostnameListResponse {
  hostnames?: {
    items: unknown[];
  };
}

interface ZoneListResponse {
  zones?: unknown[];
}

interface RecordsetListResponse {
  recordsets?: unknown[];
}

interface EnrollmentListResponse {
  enrollments?: unknown[];
}

interface DomainHistoryResponse {
  domainHistory?: unknown[];
}

interface NetworkListItem {
  uniqueId?: string;
  [key: string]: unknown;
}

interface PurgeResponse {
  httpStatus?: number;
  _httpStatus?: number;
  purgeId?: string;
  status?: string;
  [key: string]: unknown;
}

interface ResponseWithHeaders {
  headers?: Record<string, string>;
  data?: unknown;
  [key: string]: unknown;
}

interface ErrorResponseData {
  title?: string;
  detail?: string;
  message?: string;
  error?: string;
  status?: number;
  type?: string;
  instance?: string;
  requestId?: string;
  errors?: Array<{
    type?: string;
    title?: string;
    message?: string;
    detail?: string;
    description?: string;
    field?: string;
    path?: string;
  }>;
}

interface ErrorWithResponse {
  response?: {
    data?: unknown;
    status?: number;
    headers?: Record<string, string>;
  };
  data?: unknown;
  status?: number;
  [key: string]: unknown;
}

interface AsyncOperationResponse {
  activationId?: string;
  changeId?: string;
  purgeId?: string;
  estimatedSeconds?: number;
  status?: string;
  [key: string]: unknown;
}

/**
 * Enhanced response parser with validation and complete field extraction
 */
export class ResponseParser {
  /**
   * Parse Property Manager responses
   */
  static parsePropertyResponse(response: unknown): unknown {
    if (!response) {
      return response;
    }

    const typedResponse = response as PropertyListResponse;
    if (typedResponse.properties?.items) {
      return {
        properties: typedResponse.properties.items.map((item: unknown) => {
          try {
            return PropertyResponseSchemas.property.parse(item);
          } catch (_e) {
            // Return partial data if validation fails
            return item;
          }
        }),
        pagination: ResponseParser.extractPaginationInfo(response),
      };
    }

    const versionResponse = response as VersionListResponse;
    if (versionResponse.versions?.items) {
      return {
        versions: versionResponse.versions.items.map((item: unknown) =>
          PropertyResponseSchemas.propertyVersion.parse(item),
        ),
        pagination: ResponseParser.extractPaginationInfo(response),
      };
    }

    const activationResponse = response as ActivationListResponse;
    if (activationResponse.activations?.items) {
      return {
        activations: activationResponse.activations.items.map((item: unknown) =>
          PropertyResponseSchemas.activation.parse(item),
        ),
        pagination: ResponseParser.extractPaginationInfo(response),
      };
    }

    const hostnameResponse = response as HostnameListResponse;
    if (hostnameResponse.hostnames?.items) {
      return {
        hostnames: hostnameResponse.hostnames.items.map((item: unknown) =>
          PropertyResponseSchemas.hostname.parse(item),
        ),
      };
    }

    return response;
  }

  /**
   * Parse DNS responses
   */
  static parseDNSResponse(response: unknown): unknown {
    if (!response) {
      return response;
    }

    const zoneResponse = response as ZoneListResponse;
    if (zoneResponse.zones) {
      return {
        zones: zoneResponse.zones.map((item: unknown) => DNSResponseSchemas.zone.parse(item)),
        pagination: ResponseParser.extractPaginationInfo(response),
      };
    }

    const recordResponse = response as RecordsetListResponse;
    if (recordResponse.recordsets) {
      return {
        records: recordResponse.recordsets.map((item: unknown) => DNSResponseSchemas.record.parse(item)),
      };
    }

    return response;
  }

  /**
   * Parse Certificate responses
   */
  static parseCertificateResponse(response: unknown): unknown {
    const enrollmentResponse = response as EnrollmentListResponse;
    if (enrollmentResponse.enrollments) {
      return {
        enrollments: enrollmentResponse.enrollments.map((item: unknown) =>
          CertificateResponseSchemas.enrollment.parse(item),
        ),
      };
    }

    const historyResponse = response as DomainHistoryResponse;
    if (historyResponse.domainHistory) {
      return {
        validationHistory: historyResponse.domainHistory.map((item: unknown) =>
          CertificateResponseSchemas.dvChallenge.parse(item),
        ),
      };
    }

    return response;
  }

  /**
   * Parse Fast Purge responses
   */
  static parseFastPurgeResponse(response: unknown): unknown {
    const purgeResponse = response as PurgeResponse;
    if ((purgeResponse.httpStatus || purgeResponse._httpStatus) && purgeResponse.purgeId) {
      return FastPurgeResponseSchemas.purgeResponse.parse(response);
    }

    if (
      purgeResponse.status &&
      (purgeResponse.status === 'In-Progress' ||
        purgeResponse.status === 'Done' ||
        purgeResponse.status === 'Error')
    ) {
      return FastPurgeResponseSchemas.purgeStatus.parse(response);
    }

    return response;
  }

  /**
   * Parse Network Lists responses
   */
  static parseNetworkListResponse(response: unknown): unknown {
    if (Array.isArray(response)) {
      return {
        networkLists: response.map((item: unknown) =>
          NetworkListResponseSchemas.networkList.parse(item),
        ),
      };
    }

    const networkListItem = response as NetworkListItem;
    if (networkListItem.uniqueId) {
      return NetworkListResponseSchemas.networkList.parse(response);
    }

    return response;
  }

  /**
   * Extract pagination information from responses
   */
  static extractPaginationInfo(response: unknown): Record<string, unknown> | undefined {
    interface PaginationResponse {
      totalItems?: number;
      pageSize?: number;
      currentPage?: number;
      links?: unknown;
    }
    
    const typedResponse = response as PaginationResponse;
    const pagination: Record<string, unknown> = {};

    if (typedResponse.totalItems !== undefined) {
      pagination['totalItems'] = typedResponse.totalItems;
    }

    if (typedResponse.pageSize !== undefined) {
      pagination['pageSize'] = typedResponse.pageSize;
    }

    if (typedResponse.currentPage !== undefined) {
      pagination['currentPage'] = typedResponse.currentPage;
    }

    if (typedResponse.links) {
      pagination['links'] = typedResponse.links;
    }

    return Object.keys(pagination).length > 0 ? pagination : undefined;
  }

  /**
   * Parse _error responses with enhanced context
   */
  static parseErrorResponse(
    _error: unknown,
    _context?: { endpoint?: string; operation?: string },
  ): AkamaiErrorResponse {
    const errorWithResponse = _error as ErrorWithResponse;
    let errorData: unknown = errorWithResponse.response?.data || errorWithResponse.data || _error;

    // Handle string responses
    if (typeof errorData === 'string') {
      try {
        errorData = JSON.parse(errorData);
      } catch {
        return {
          title: 'API Error',
          detail: errorData as string,
          status: (_error as any).response?.status || (_error as any).status || 500,
        };
      }
    }

    // Extract _error information
    const typedErrorData = errorData as ErrorResponseData;
    const parsedError: AkamaiErrorResponse = {
      title: typedErrorData.title || typedErrorData.error || 'Unknown Error',
      detail: typedErrorData.detail || typedErrorData.message || typedErrorData.error,
      status: typedErrorData.status || errorWithResponse.response?.status || errorWithResponse.status,
      type: typedErrorData.type,
      instance: typedErrorData.instance,
      requestId: typedErrorData.requestId || errorWithResponse.response?.headers?.['x-request-id'],
    };

    // Extract detailed error information
    if (typedErrorData.errors && Array.isArray(typedErrorData.errors)) {
      parsedError.errors = typedErrorData.errors.map((_err: any) => ({
        type: _err.type,
        title: _err.title || _err.message || 'Error',
        detail: _err.detail || _err.description,
        field: _err.field || _err.path,
      }));
    }

    return parsedError;
  }

  /**
   * Validate response against expected schema
   */
  static validateResponse<T>(schema: z.ZodSchema<T>, response: unknown): T {
    try {
      return schema.parse(response);
    } catch (_error) {
      if (_error instanceof z.ZodError) {
        console.warn('Response validation failed:', {
          errors: _error.errors,
          response: JSON.stringify(response, null, 2),
        });
      }
      // Return original response if validation fails (for backward compatibility)
      return response as T;
    }
  }

  /**
   * Extract all metadata from response headers
   */
  static extractResponseMetadata(response: unknown): Record<string, unknown> {
    const metadata: Record<string, unknown> = {};
    const typedResponse = response as ResponseWithHeaders;
    
    if (typedResponse.headers) {
      // Rate limiting information
      if (typedResponse.headers['x-ratelimit-limit']) {
        metadata['rateLimit'] = {
          limit: parseInt(typedResponse.headers['x-ratelimit-limit']),
          remaining: parseInt(typedResponse.headers['x-ratelimit-remaining'] || '0'),
          reset: parseInt(typedResponse.headers['x-ratelimit-reset'] || '0'),
        };
      }

      // Request tracking
      if (typedResponse.headers['x-request-id']) {
        metadata['requestId'] = typedResponse.headers['x-request-id'];
      }

      // ETag for caching
      if (typedResponse.headers['etag']) {
        metadata['etag'] = typedResponse.headers['etag'];
      }

      // Last modified
      if (typedResponse.headers['last-modified']) {
        metadata['lastModified'] = typedResponse.headers['last-modified'];
      }

      // Cache control
      if (typedResponse.headers['cache-control']) {
        metadata['cacheControl'] = typedResponse.headers['cache-control'];
      }
    }

    return metadata;
  }

  /**
   * Handle async operation responses (activations, etc.)
   */
  static parseAsyncOperationResponse(response: unknown): Record<string, unknown> {
    const typedResponse = response as AsyncOperationResponse;
    const result: Record<string, unknown> = {
      ...typedResponse,
    };

    // Extract operation tracking information
    if (typedResponse.activationId || typedResponse.changeId || typedResponse.purgeId) {
      result['operationId'] = typedResponse.activationId || typedResponse.changeId || typedResponse.purgeId;
    }

    // Extract estimated completion time
    if (typedResponse.estimatedSeconds) {
      result['estimatedCompletion'] = new Date(
        Date.now() + typedResponse.estimatedSeconds * 1000,
      ).toISOString();
    }

    // Extract status information
    if (typedResponse.status) {
      result['operationStatus'] = typedResponse.status;
      result['isComplete'] = ['ACTIVE', 'Done', 'COMPLETED'].includes(typedResponse.status);
      result['isFailed'] = ['FAILED', 'Error', 'ABORTED'].includes(typedResponse.status);
    }

    return result;
  }
}

/**
 * Utility function to safely parse any Akamai API response
 */
export function parseAkamaiResponse(
  response: unknown,
  apiType?: 'papi' | 'dns' | 'cps' | 'purge' | 'network-lists',
): unknown {
  const typedResponse = response as ResponseWithHeaders;
  try {
    // Add response metadata
    const metadata = ResponseParser.extractResponseMetadata(response);

    let parsedData;

    switch (apiType) {
      case 'papi':
        parsedData = ResponseParser.parsePropertyResponse(typedResponse.data || response);
        break;
      case 'dns':
        parsedData = ResponseParser.parseDNSResponse(typedResponse.data || response);
        break;
      case 'cps':
        parsedData = ResponseParser.parseCertificateResponse(typedResponse.data || response);
        break;
      case 'purge':
        parsedData = ResponseParser.parseFastPurgeResponse(typedResponse.data || response);
        break;
      case 'network-lists':
        parsedData = ResponseParser.parseNetworkListResponse(typedResponse.data || response);
        break;
      default:
        parsedData = typedResponse.data || response;
    }

    if (Object.keys(metadata).length > 0) {
      (parsedData as Record<string, unknown>)['_metadata'] = metadata;
    }

    return parsedData;
  } catch (_error) {
    console.warn('Failed to parse response:', _error);
    return typedResponse.data || response;
  }
}
