/**
 * Response Handling Tests
 * Tests response parsing, error handling, and edge cases
 */

import { describe, it, expect } from '@jest/globals';
import { CACHE_TTL } from '../../constants/index';

import {
  EnhancedErrorHandler,
  handleAkamaiError,
  ErrorType,
} from '../../utils/enhanced-error-handling';
import { ResponseParser, parseAkamaiResponse } from '../../utils/response-parsing';

// Mock API responses for testing
const mockPropertyListResponse = {
  properties: {
    items: [
      {
        accountId: 'act_123',
        contractId: 'ctr_C-123',
        groupId: 'grp_456',
        propertyId: 'prp_123',
        propertyName: 'example.com',
        latestVersion: 3,
        stagingVersion: 2,
        productionVersion: 1,
        assetId: 'ast_789',
        productId: 'prd_fresca',
        ruleFormat: 'v2023-10-30',
      },
    ],
  },
};

const mockActivationResponse = {
  activations: {
    items: [
      {
        activationId: 'act_123',
        propertyName: 'example.com',
        propertyId: 'prp_123',
        propertyVersion: 2,
        network: 'STAGING',
        activationType: 'ACTIVATE',
        status: 'PENDING',
        submitDate: '2025-01-18T10:00:00Z',
        updateDate: '2025-01-18T10:01:00Z',
        note: 'Test activation',
        notifyEmails: ['test@example.com'],
        acknowledgeAllWarnings: true,
        useFastFallback: false,
        fastPush: true,
        warnings: [
          {
            type: 'BEHAVIOR_DEPRECATED',
            title: 'Deprecated behavior detected',
            detail: 'The behavior "oldCache" is deprecated',
          },
        ],
      },
    ],
  },
};

const mockDNSZoneResponse = {
  zones: [
    {
      zone: 'example.com',
      type: 'PRIMARY',
      comment: 'Production DNS zone',
      signAndServe: true,
      signAndServeAlgorithm: 'RSA-SHA256',
      contractId: 'ctr_C-123',
      activationState: 'ACTIVE',
      lastActivationDate: '2025-01-15T08:30:00Z',
      versionId: 'v456',
    },
  ],
};

const mockCertificateEnrollmentResponse = {
  enrollments: [
    {
      id: 12345,
      ra: 'lets-encrypt',
      validationType: 'dv',
      certificateType: 'san',
      networkConfiguration: {
        geography: 'core',
        secureNetwork: 'enhanced-tls',
        quicEnabled: true,
      },
      csr: {
        cn: 'www.example.com',
        sans: ['api.example.com', 'app.example.com'],
      },
      pendingChanges: ['renewal-in-progress'],
      maxAllowedSanNames: 100,
      autoRenewalStartTime: '2025-03-01T00:00:00Z',
    },
  ],
};

const mockFastPurgeResponse = {
  _httpStatus: 201,
  detail: 'Request accepted',
  estimatedSeconds: 5,
  purgeId: 'purge_123',
  supportId: 'support_456',
};

const mockNetworkListResponse = [
  {
    uniqueId: 'list_123',
    name: 'Blocked IPs',
    type: 'IP',
    description: 'List of blocked IP addresses',
    readOnly: false,
    shared: true,
    elementCount: 150,
    syncPoint: 3,
    links: {
      activateInProduction: '/network-lists/list_123/activate/production',
      activateInStaging: '/network-lists/list_123/activate/staging',
      retrieve: '/network-lists/list_123',
    },
  },
];

describe('Response Parser Tests', () => {
  describe('Property Manager Response Parsing', () => {
    it('should parse property list response correctly', () => {
      const parsed = ResponseParser.parsePropertyResponse(mockPropertyListResponse);
      expect(parsed.properties).toHaveLength(1);
      expect(parsed.properties[0]).toMatchObject({
        propertyId: 'prp_123',
        propertyName: 'example.com',
        contractId: 'ctr_C-123',
        groupId: 'grp_456',
        latestVersion: 3,
        stagingVersion: 2,
        productionVersion: 1,
      });
    });

    it('should extract pagination info when available', () => {
      const responseWithPagination = {
        ...mockPropertyListResponse,
        totalItems: 100,
        pageSize: 50,
        currentPage: 1,
        links: {
          _next: '/properties?page=2',
          self: '/properties?page=1',
        },
      };

      const parsed = ResponseParser.parsePropertyResponse(responseWithPagination);
      expect(parsed.pagination).toBeDefined();
      expect(parsed.pagination).toMatchObject({
        totalItems: 100,
        pageSize: 50,
        currentPage: 1,
        links: {
          _next: '/properties?page=2',
          self: '/properties?page=1',
        },
      });
    });

    it('should parse activation response with warnings', () => {
      const parsed = ResponseParser.parsePropertyResponse(mockActivationResponse);
      expect(parsed.activations).toHaveLength(1);
      expect(parsed.activations[0]).toMatchObject({
        activationId: 'act_123',
        status: 'PENDING',
        network: 'STAGING',
        propertyVersion: 2,
      });
      expect(parsed.activations[0].warnings).toHaveLength(1);
    });

    it('should handle empty response gracefully', () => {
      const emptyResponse = { properties: { items: [] } };
      const parsed = ResponseParser.parsePropertyResponse(emptyResponse);
      expect(parsed.properties).toHaveLength(0);
    });
  });

  describe('DNS Response Parsing', () => {
    it('should parse DNS zone list correctly', () => {
      const parsed = ResponseParser.parseDNSResponse(mockDNSZoneResponse);
      expect(parsed.zones).toHaveLength(1);
      expect(parsed.zones[0]).toMatchObject({
        zone: 'example.com',
        type: 'PRIMARY',
        signAndServe: true,
        contractId: 'ctr_C-123',
        activationState: 'ACTIVE',
      });
    });

    it('should parse DNS records response', () => {
      const recordsResponse = {
        recordsets: [
          {
            name: 'www',
            type: 'A',
            ttl: CACHE_TTL.DEFAULT,
            rdata: ['192.168.1.1', '192.168.1.2'],
          },
          {
            name: '@',
            type: 'MX',
            ttl: CACHE_TTL.DNS_CAA,
            rdata: ['10 mail.example.com'],
          },
        ],
      };

      const parsed = ResponseParser.parseDNSResponse(recordsResponse);
      expect(parsed.records).toHaveLength(2);
      expect(parsed.records[0]).toMatchObject({
        name: 'www',
        type: 'A',
        ttl: 300,
        rdata: ['192.168.1.1', '192.168.1.2'],
      });
    });
  });

  describe('Certificate Response Parsing', () => {
    it('should parse certificate enrollment list', () => {
      const parsed = ResponseParser.parseCertificateResponse(mockCertificateEnrollmentResponse);
      expect(parsed.enrollments).toHaveLength(1);
      expect(parsed.enrollments[0]).toMatchObject({
        id: 12345,
        ra: 'lets-encrypt',
        validationType: 'dv',
        certificateType: 'san',
      });
      expect(parsed.enrollments[0].networkConfiguration.quicEnabled).toBe(true);
    });

    it('should parse DV challenge response', () => {
      const challengeResponse = {
        domainHistory: [
          {
            domain: 'www.example.com',
            validationStatus: 'pending',
            challenges: [
              {
                type: 'dns-01',
                status: 'pending',
                token: 'abc123',
                keyAuthorization: 'xyz789',
              },
            ],
            expi_res: '2025-01-25T10:00:00Z',
          },
        ],
      };

      const parsed = ResponseParser.parseCertificateResponse(challengeResponse);
      expect(parsed.validationHistory).toHaveLength(1);
      expect(parsed.validationHistory[0]).toMatchObject({
        domain: 'www.example.com',
        validationStatus: 'pending',
      });
      expect(parsed.validationHistory[0].challenges).toHaveLength(1);
    });
  });

  describe('Fast Purge Response Parsing', () => {
    it('should parse purge initiation response', () => {
      const parsed = ResponseParser.parseFastPurgeResponse(mockFastPurgeResponse);
      expect(parsed).toMatchObject({
        _httpStatus: 201,
        detail: 'Request accepted',
        estimatedSeconds: 5,
        purgeId: 'purge_123',
        supportId: 'support_456',
      });
    });

    it('should parse purge status response', () => {
      const statusResponse = {
        _httpStatus: 200,
        detail: 'Purge completed',
        status: 'Done',
        submittedBy: 'user@example.com',
        submissionTime: '2025-01-18T10:00:00Z',
        completionTime: '2025-01-18T10:00:05Z',
      };

      const parsed = ResponseParser.parseFastPurgeResponse(statusResponse);
      expect(parsed).toMatchObject({
        _httpStatus: 200,
        status: 'Done',
        submittedBy: 'user@example.com',
      });
    });
  });

  describe('Network List Response Parsing', () => {
    it('should parse network list array response', () => {
      const parsed = ResponseParser.parseNetworkListResponse(mockNetworkListResponse);
      expect(parsed.networkLists).toHaveLength(1);
      expect(parsed.networkLists[0]).toMatchObject({
        uniqueId: 'list_123',
        name: 'Blocked IPs',
        type: 'IP',
        elementCount: 150,
      });
    });

    it('should parse single network list response', () => {
      const singleListResponse = {
        uniqueId: 'list_456',
        name: 'Allowed Countries',
        type: 'GEO',
        elementCount: 50,
        elements: ['US', 'CA', 'GB'],
      };

      const parsed = ResponseParser.parseNetworkListResponse(singleListResponse);
      expect(parsed).toMatchObject({
        uniqueId: 'list_456',
        name: 'Allowed Countries',
        type: 'GEO',
        elementCount: 50,
      });
    });
  });

  describe('Error Response Parsing', () => {
    it('should parse RFC 7807 error response', () => {
      const errorResponse = {
        type: '/papi/v1/errors/property-not-found',
        title: 'Property not found',
        status: 404,
        detail: 'The requested property prp_999 does not exist',
        instance: '/papi/v1/properties/prp_999',
        requestId: 'req_123',
      };

      const parsed = ResponseParser.parseErrorResponse({
        response: { data: errorResponse, status: 404 },
      });
      expect(parsed).toMatchObject({
        type: '/papi/v1/errors/property-not-found',
        title: 'Property not found',
        status: 404,
        detail: 'The requested property prp_999 does not exist',
        instance: '/papi/v1/properties/prp_999',
        requestId: 'req_123',
      });
    });

    it('should parse validation error with field details', () => {
      const validationError = {
        title: 'Validation failed',
        status: 400,
        errors: [
          {
            type: 'field-error',
            title: 'Invalid format',
            detail: 'Property name contains invalid characters',
            field: 'propertyName',
          },
          {
            type: 'field-error',
            title: 'Required field missing',
            detail: 'Contract ID is required',
            field: 'contractId',
          },
        ],
      };

      const parsed = ResponseParser.parseErrorResponse({
        response: { data: validationError, status: 400 },
      });
      expect(parsed.errors).toHaveLength(2);
      expect(parsed.errors?.[0]).toMatchObject({
        type: 'field-error',
        title: 'Invalid format',
        field: 'propertyName',
      });
    });

    it('should handle string error responses', () => {
      const stringError = 'Internal server error occurred';
      const parsed = ResponseParser.parseErrorResponse({
        response: { data: stringError, status: 500 },
      });
      expect(parsed).toMatchObject({
        title: 'API Error',
        detail: 'Internal server error occurred',
        status: 500,
      });
    });

    it('should handle JSON string error responses', () => {
      const jsonStringError = '{"error": "Rate limit exceeded", "retry_after": 60}';
      const parsed = ResponseParser.parseErrorResponse({
        response: { data: jsonStringError, status: 429 },
      });
      expect(parsed).toMatchObject({
        title: 'Rate limit exceeded',
        detail: 'Rate limit exceeded',
        status: 429,
      });
    });
  });

  describe('Response Metadata Extraction', () => {
    it('should extract rate limit information', () => {
      const response = {
        headers: {
          'x-ratelimit-limit': '100',
          'x-ratelimit-remaining': '75',
          'x-ratelimit-reset': '1705576800',
        },
      };

      const metadata = ResponseParser.extractResponseMetadata(response);
      expect(metadata.rateLimit).toMatchObject({
        limit: 100,
        remaining: 75,
        reset: 1705576800,
      });
    });

    it('should extract request tracking information', () => {
      const response = {
        headers: {
          'x-request-id': 'req_abc123',
          etag: 'W/"abc123"',
          'last-modified': 'Fri, 18 Jan 2025 10:00:00 GMT',
          'cache-control': 'max-age=300',
        },
      };

      const metadata = ResponseParser.extractResponseMetadata(response);
      expect(metadata).toMatchObject({
        requestId: 'req_abc123',
        etag: 'W/"abc123"',
        lastModified: 'Fri, 18 Jan 2025 10:00:00 GMT',
        cacheControl: 'max-age=300',
      });
    });
  });

  describe('Async Operation Response Handling', () => {
    it('should parse async operation response', () => {
      const asyncResponse = {
        activationId: 'act_789',
        status: 'ZONE_2',
        estimatedSeconds: 180,
        submitDate: '2025-01-18T10:00:00Z',
      };

      const parsed = ResponseParser.parseAsyncOperationResponse(asyncResponse);
      expect(parsed).toMatchObject({
        operationId: 'act_789',
        operationStatus: 'ZONE_2',
        isComplete: false,
        isFailed: false,
      });
      expect(new Date(parsed.estimatedCompletion)).toBeInstanceOf(Date);
    });

    it('should identify completed operations', () => {
      const completedOp = {
        activationId: 'act_999',
        status: 'ACTIVE',
      };

      const parsed = ResponseParser.parseAsyncOperationResponse(completedOp);
      expect(parsed.isComplete).toBe(true);
      expect(parsed.isFailed).toBe(false);
    });

    it('should identify failed operations', () => {
      const failedOp = {
        purgeId: 'purge_999',
        status: 'FAILED',
      };

      const parsed = ResponseParser.parseAsyncOperationResponse(failedOp);
      expect(parsed.isComplete).toBe(false);
      expect(parsed.isFailed).toBe(true);
    });
  });

  describe('Edge Cases and Malformed Responses', () => {
    it('should handle null response gracefully', () => {
      const parsed = ResponseParser.parsePropertyResponse(null);
      expect(parsed).toBeNull();
    });

    it('should handle undefined response gracefully', () => {
      const parsed = ResponseParser.parseDNSResponse(undefined);
      expect(parsed).toBeUndefined();
    });

    it('should handle missing expected fields', () => {
      const incompleteResponse = {
        properties: {
          items: [
            {
              propertyId: 'prp_123',
              // Missing most fields
            },
          ],
        },
      };

      const parsed = ResponseParser.parsePropertyResponse(incompleteResponse);
      expect(parsed.properties).toHaveLength(1);
      expect(parsed.properties[0].propertyId).toBe('prp_123');
    });

    it('should handle extra unexpected fields', () => {
      const responseWithExtra = {
        properties: {
          items: [
            {
              ...mockPropertyListResponse.properties.items[0],
              unexpectedField: 'should not break parsing',
              anotherExtra: 123,
            },
          ],
        },
      };

      const parsed = ResponseParser.parsePropertyResponse(responseWithExtra);
      expect(parsed.properties).toHaveLength(1);
      expect(parsed.properties[0].propertyId).toBe('prp_123');
    });

    it('should handle deeply nested null values', () => {
      const nestedNullResponse = {
        properties: {
          items: [
            {
              propertyId: 'prp_123',
              propertyName: 'test',
              hostnames: null,
              versions: {
                items: null,
              },
            },
          ],
        },
      };

      expect(() => ResponseParser.parsePropertyResponse(nestedNullResponse)).not.toThrow();
    });
  });
});

describe('Enhanced Error Handler Tests', () => {
  const errorHandler = new EnhancedErrorHandler();

  describe('Error Categorization', () => {
    it('should categorize authentication errors', () => {
      const authError = {
        response: {
          status: 401,
          data: {
            title: 'Authentication failed',
            detail: 'Invalid credentials',
          },
        },
      };

      const result = errorHandler.handle(authError);
      expect(result.errorType).toBe(ErrorType.AUTHENTICATION);
      expect(result.suggestions).toContain(
        'Verify your .edgerc credentials are correct and not expired',
      );
    });

    it('should categorize rate limit errors', () => {
      const rateLimitError = {
        response: {
          status: 429,
          headers: {
            'retry-after': '60',
          },
          data: {
            title: 'Rate limit exceeded',
            detail: 'Too many requests',
          },
        },
      };

      const result = errorHandler.handle(rateLimitError);
      expect(result.errorType).toBe(ErrorType.RATE_LIMIT);
      expect(result.shouldRetry).toBe(true);
      expect(result.retryAfter).toBe(60000);
    });

    it('should categorize validation errors with field details', () => {
      const validationError = {
        response: {
          status: 400,
          data: {
            title: 'Validation failed',
            errors: [
              {
                type: 'field-error',
                field: 'propertyName',
                title: 'Invalid format',
                detail: 'Contains invalid characters',
              },
            ],
          },
        },
      };

      const result = errorHandler.handle(validationError);
      expect(result.errorType).toBe(ErrorType.VALIDATION);
      expect(result.suggestions[0]).toContain("Fix the 'propertyName' field");
    });
  });

  describe('Retry Logic', () => {
    it('should retry transient errors', async () => {
      let attempts = 0;
      const operation = async () => {
        attempts++;
        if (attempts < 3) {
          throw { response: { status: 503 } };
        }
        return 'success';
      };

      const result = await errorHandler.withRetry(operation);
      expect(result).toBe('success');
      expect(attempts).toBe(3);
    });

    it('should not retry non-retryable errors', async () => {
      let attempts = 0;
      const operation = async () => {
        attempts++;
        throw { response: { status: 400 } };
      };

      await expect(errorHandler.withRetry(operation)).rejects.toMatchObject({
        response: { status: 400 },
      });
      expect(attempts).toBe(1);
    });

    it('should respect retry-after header', async () => {
      const startTime = Date.now();
      let attempts = 0;

      const operation = async () => {
        attempts++;
        if (attempts === 1) {
          throw {
            response: {
              status: 429,
              headers: { 'retry-after': '1' }, // 1 second
            },
          };
        }
        return 'success';
      };

      const result = await errorHandler.withRetry(operation);
      const duration = Date.now() - startTime;

      expect(result).toBe('success');
      expect(attempts).toBe(2);
      expect(duration).toBeGreaterThanOrEqual(900); // At least 900ms (allowing for some variance)
    });

    it('should apply exponential backoff', async () => {
      const delays: number[] = [];
      let lastAttemptTime = Date.now();
      let attemptCount = 0;

      const operation = async () => {
        attemptCount++;
        const now = Date.now();
        const delay = now - lastAttemptTime;

        // Only record delays between retries (not the initial attempt)
        if (attemptCount > 1) {
          delays.push(delay);
        }
        lastAttemptTime = now;

        // Fail first 2 attempts, succeed on third
        if (attemptCount < 3) {
          throw { response: { status: 503 } };
        }
        return 'success';
      };

      await errorHandler.withRetry(operation, {}, { baseDelay: 100, jitter: false });

      // Should have 2 delays recorded (between attempts 1->2 and 2->3)
      expect(delays.length).toBe(2);

      // Second delay should be longer than first due to exponential backoff
      expect(delays[1]).toBeGreaterThan(delays[0]);

      // First delay should be approximately 100ms (baseDelay)
      expect(delays[0]).toBeGreaterThanOrEqual(90);
      expect(delays[0]).toBeLessThanOrEqual(110);

      // Second delay should be approximately 200ms (baseDelay * multiplier)
      expect(delays[1]).toBeGreaterThanOrEqual(190);
      expect(delays[1]).toBeLessThanOrEqual(210);
    });
  });

  describe('Context-Aware Error Messages', () => {
    it('should provide API-specific suggestions', () => {
      const papiError = {
        response: {
          status: 403,
          data: {
            title: 'Forbidden',
            detail: 'Access denied to property',
          },
        },
      };

      const result = errorHandler.handle(papiError, {
        apiType: 'papi',
        operation: 'activate property',
      });

      expect(result.suggestions).toContain('Ensure you have Property Manager API access');
    });

    it('should provide operation-specific guidance', () => {
      const activationError = {
        response: {
          status: 409,
          data: {
            title: 'Conflict',
            detail: 'Another activation is in progress',
          },
        },
      };

      const result = errorHandler.handle(activationError, {
        apiType: 'papi',
        endpoint: '/papi/v1/properties/prp_123/activations',
      });

      expect(result.suggestions).toContain('Wait for the current activation to complete');
    });
  });

  describe('Error Recovery Scenarios', () => {
    it('should handle network errors', () => {
      const networkError = {
        code: 'ECONNREFUSED',
        message: 'Connection refused',
      };

      const result = errorHandler.handle(networkError);
      expect(result.errorType).toBe(ErrorType.SERVER_ERROR);
      expect(result.shouldRetry).toBe(true);
    });

    it('should handle timeout errors', () => {
      const timeoutError = {
        code: 'ETIMEDOUT',
        message: 'Request timeout',
      };

      const result = errorHandler.handle(timeoutError);
      expect(result.errorType).toBe(ErrorType.TIMEOUT);
      expect(result.shouldRetry).toBe(true);
    });

    it('should preserve request IDs for support', () => {
      const errorWithRequestId = {
        response: {
          status: 500,
          headers: {
            'x-request-id': 'req_abc123',
            'x-trace-id': 'trace_xyz789',
          },
          data: {
            title: 'Internal server error',
            requestId: 'req_abc123',
          },
        },
      };

      const result = errorHandler.handle(errorWithRequestId);
      expect(result.requestId).toBe('req_abc123');
      expect(result.suggestions).toContain('Contact Akamai support with request ID: req_abc123');
    });
  });
});

describe('Integration Response Handling', () => {
  it('should handle complete API response with metadata', () => {
    const fullResponse = {
      status: 200,
      headers: {
        'x-request-id': 'req_123',
        'x-ratelimit-remaining': '99',
        'x-ratelimit-limit': '100',
        'x-ratelimit-reset': '1705576800',
        etag: 'W/"abc"',
      },
      data: mockPropertyListResponse,
    };

    const parsed = parseAkamaiResponse(fullResponse, 'papi');
    expect(parsed.properties).toBeDefined();
    expect(parsed._metadata).toMatchObject({
      requestId: 'req_123',
      rateLimit: {
        limit: 100,
        remaining: 99,
        reset: 1705576800,
      },
      etag: 'W/"abc"',
    });
  });

  it('should handle error response with enhanced error handling', () => {
    const _error = {
      response: {
        status: 400,
        headers: {},
        data: {
          type: '/papi/v1/errors/validation',
          title: 'Validation failed',
          detail: 'Invalid property configuration',
          errors: [
            {
              type: 'field-error',
              field: 'rules.behaviors[0].options.ttl',
              title: 'Invalid TTL',
              detail: 'TTL must be between 30 and 86400',
            },
          ],
        },
      },
    };

    const result = handleAkamaiError(_error, {
      operation: 'update property rules',
      apiType: 'papi',
    });

    expect(result.errorType).toBe(ErrorType.VALIDATION);
    expect(result.suggestions.length).toBeGreaterThan(0);
    expect(result.userMessage).toContain('Please fix the following issues');
  });
});
