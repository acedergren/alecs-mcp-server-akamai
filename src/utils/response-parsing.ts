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
    expi_res: z.string().optional(),
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

/**
 * Enhanced response parser with validation and complete field extraction
 */
export class ResponseParser {
  /**
   * Parse Property Manager responses
   */
  static parsePropertyResponse(response: any): any {
    if (!response) {
return response;
}

    if (response.properties?.items) {
      return {
        properties: response.properties.items.map((item: any) => {
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

    if (response.versions?.items) {
      return {
        versions: response.versions.items.map((item: any) =>
          PropertyResponseSchemas.propertyVersion.parse(item),
        ),
        pagination: ResponseParser.extractPaginationInfo(response),
      };
    }

    if (response.activations?.items) {
      return {
        activations: response.activations.items.map((item: any) =>
          PropertyResponseSchemas.activation.parse(item),
        ),
        pagination: ResponseParser.extractPaginationInfo(response),
      };
    }

    if (response.hostnames?.items) {
      return {
        hostnames: response.hostnames.items.map((item: any) =>
          PropertyResponseSchemas.hostname.parse(item),
        ),
      };
    }

    return response;
  }

  /**
   * Parse DNS responses
   */
  static parseDNSResponse(response: any): any {
    if (!response) {
return response;
}

    if (response.zones) {
      return {
        zones: response.zones.map((item: any) => DNSResponseSchemas.zone.parse(item)),
        pagination: ResponseParser.extractPaginationInfo(response),
      };
    }

    if (response.recordsets) {
      return {
        records: response.recordsets.map((item: any) => DNSResponseSchemas.record.parse(item)),
      };
    }

    return response;
  }

  /**
   * Parse Certificate responses
   */
  static parseCertificateResponse(response: any): any {
    if (response.enrollments) {
      return {
        enrollments: response.enrollments.map((item: any) =>
          CertificateResponseSchemas.enrollment.parse(item),
        ),
      };
    }

    if (response.domainHistory) {
      return {
        validationHistory: response.domainHistory.map((item: any) =>
          CertificateResponseSchemas.dvChallenge.parse(item),
        ),
      };
    }

    return response;
  }

  /**
   * Parse Fast Purge responses
   */
  static parseFastPurgeResponse(response: any): any {
    if (response.httpStatus && response.purgeId) {
      return FastPurgeResponseSchemas.purgeResponse.parse(response);
    }

    if (
      response.status &&
      (response.status === 'In-Progress' ||
        response.status === 'Done' ||
        response.status === 'Error')
    ) {
      return FastPurgeResponseSchemas.purgeStatus.parse(response);
    }

    return response;
  }

  /**
   * Parse Network Lists responses
   */
  static parseNetworkListResponse(response: any): any {
    if (Array.isArray(response)) {
      return {
        networkLists: response.map((item: any) =>
          NetworkListResponseSchemas.networkList.parse(item),
        ),
      };
    }

    if (response.uniqueId) {
      return NetworkListResponseSchemas.networkList.parse(response);
    }

    return response;
  }

  /**
   * Extract pagination information from responses
   */
  static extractPaginationInfo(response: any): any {
    const pagination: any = {};

    if (response.totalItems !== undefined) {
      pagination.totalItems = response.totalItems;
    }

    if (response.pageSize !== undefined) {
      pagination.pageSize = response.pageSize;
    }

    if (response.currentPage !== undefined) {
      pagination.currentPage = response.currentPage;
    }

    if (response.links) {
      pagination.links = response.links;
    }

    return Object.keys(pagination).length > 0 ? pagination : undefined;
  }

  /**
   * Parse _error responses with enhanced context
   */
  static parseErrorResponse(
    error: any,
    _context?: { endpoint?: string; operation?: string },
  ): AkamaiErrorResponse {
    let errorData: any = _error.response?.data || _error.data || _error;

    // Handle string responses
    if (typeof errorData === 'string') {
      try {
        errorData = JSON.parse(errorData);
      } catch {
        return {
          title: 'API Error',
          detail: errorData,
          status: _error.response?.status || _error.status || 500,
        };
      }
    }

    // Extract _error information
    const parsedError: AkamaiErrorResponse = {
      title: errorData.title || errorData._error || 'Unknown Error',
      detail: errorData.detail || errorData.message || errorData._error,
      status: errorData.status || _error.response?.status || _error.status,
      type: errorData.type,
      instance: errorData.instance,
      requestId: errorData.requestId || _error.response?.headers?.['x-request-id'],
    };

    // Extract detailed _error information
    if (errorData.errors && Array.isArray(errorData.errors)) {
      parsedError.errors = errorData.errors.map((err: any) => ({
        type: err.type,
        title: err.title || err.message,
        detail: err.detail || err.description,
        field: err.field || err.path,
      }));
    }

    return parsedError;
  }

  /**
   * Validate response against expected schema
   */
  static validateResponse<T>(schema: z.ZodSchema<T>, response: any): T {
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
      return response;
    }
  }

  /**
   * Extract all metadata from response headers
   */
  static extractResponseMetadata(response: any): any {
    const metadata: any = {};

    if (response.headers) {
      // Rate limiting information
      if (response.headers['x-ratelimit-limit']) {
        metadata.rateLimit = {
          limit: parseInt(response.headers['x-ratelimit-limit']),
          remaining: parseInt(response.headers['x-ratelimit-remaining']),
          reset: parseInt(response.headers['x-ratelimit-reset']),
        };
      }

      // Request tracking
      if (response.headers['x-request-id']) {
        metadata.requestId = response.headers['x-request-id'];
      }

      // ETag for caching
      if (response.headers['etag']) {
        metadata.etag = response.headers['etag'];
      }

      // Last modified
      if (response.headers['last-modified']) {
        metadata.lastModified = response.headers['last-modified'];
      }

      // Cache control
      if (response.headers['cache-control']) {
        metadata.cacheControl = response.headers['cache-control'];
      }
    }

    return metadata;
  }

  /**
   * Handle async operation responses (activations, etc.)
   */
  static parseAsyncOperationResponse(response: any): any {
    const result: any = {
      ...response,
    };

    // Extract operation tracking information
    if (response.activationId || response.changeId || response.purgeId) {
      result.operationId = response.activationId || response.changeId || response.purgeId;
    }

    // Extract estimated completion time
    if (response.estimatedSeconds) {
      result.estimatedCompletion = new Date(
        Date.now() + response.estimatedSeconds * 1000,
      ).toISOString();
    }

    // Extract status information
    if (response.status) {
      result.operationStatus = response.status;
      result.isComplete = ['ACTIVE', 'Done', 'COMPLETED'].includes(response.status);
      result.isFailed = ['FAILED', 'Error', 'ABORTED'].includes(response.status);
    }

    return result;
  }
}

/**
 * Utility function to safely parse any Akamai API response
 */
export function parseAkamaiResponse(
  response: any,
  apiType?: 'papi' | 'dns' | 'cps' | 'purge' | 'network-lists',
): any {
  try {
    // Add response metadata
    const metadata = ResponseParser.extractResponseMetadata(response);

    let parsedData;

    switch (apiType) {
      case 'papi':
        parsedData = ResponseParser.parsePropertyResponse(response.data || response);
        break;
      case 'dns':
        parsedData = ResponseParser.parseDNSResponse(response.data || response);
        break;
      case 'cps':
        parsedData = ResponseParser.parseCertificateResponse(response.data || response);
        break;
      case 'purge':
        parsedData = ResponseParser.parseFastPurgeResponse(response.data || response);
        break;
      case 'network-lists':
        parsedData = ResponseParser.parseNetworkListResponse(response.data || response);
        break;
      default:
        parsedData = response.data || response;
    }

    if (Object.keys(metadata).length > 0) {
      parsedData._metadata = metadata;
    }

    return parsedData;
  } catch (_error) {
    console.warn('Failed to parse response:', _error);
    return response.data || response;
  }
}
