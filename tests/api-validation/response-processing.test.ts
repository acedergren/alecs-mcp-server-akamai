import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { z } from 'zod';

// Mock response data for testing
const mockResponses = {
  // Successful responses
  success: {
    propertyList: {
      status: 200,
      headers: { 'content-type': 'application/json' },
      data: {
        properties: {
          items: [
            {
              propertyId: 'prp_123456',
              propertyName: 'example.com',
              contractId: 'ctr_1-2ABC3D',
              groupId: 'grp_12345',
              latestVersion: 5,
              stagingVersion: 4,
              productionVersion: 3,
            },
          ],
        },
      },
    },
    dnsZone: {
      status: 200,
      headers: { 'content-type': 'application/json' },
      data: {
        zone: 'example.com',
        type: 'PRIMARY',
        comment: 'Main domain',
        signAndServe: false,
        activationState: 'ACTIVE',
        lastActivationDate: '2024-01-15T10:00:00Z',
      },
    },
    activationStatus: {
      status: 200,
      headers: { 'content-type': 'application/json' },
      data: {
        activationId: 'atv_123456',
        propertyId: 'prp_123456',
        propertyVersion: 5,
        network: 'STAGING',
        status: 'ACTIVE',
        submitDate: '2024-01-15T10:00:00Z',
        updateDate: '2024-01-15T10:05:00Z',
      },
    },
  },
  // Error responses
  errors: {
    unauthorized: {
      status: 401,
      headers: { 'content-type': 'application/problem+json' },
      data: {
        type: '/problem-types/unauthorized',
        title: 'Unauthorized',
        status: 401,
        detail: 'Invalid authentication credentials',
        instance: '/papi/v1/properties',
      },
    },
    notFound: {
      status: 404,
      headers: { 'content-type': 'application/problem+json' },
      data: {
        type: '/problem-types/not-found',
        title: 'Not Found',
        status: 404,
        detail: 'The requested property prp_999999 was not found',
        instance: '/papi/v1/properties/prp_999999',
      },
    },
    validationError: {
      status: 400,
      headers: { 'content-type': 'application/problem+json' },
      data: {
        type: '/problem-types/validation-error',
        title: 'Validation Error',
        status: 400,
        detail: 'The request contains invalid parameters',
        instance: '/papi/v1/properties',
        errors: [
          {
            type: '/problem-types/invalid-format',
            title: 'Invalid Format',
            detail: 'propertyId must start with "prp_"',
            field: 'propertyId',
          },
        ],
      },
    },
    rateLimitExceeded: {
      status: 429,
      headers: {
        'content-type': 'application/problem+json',
        'x-ratelimit-limit': '300',
        'x-ratelimit-remaining': '0',
        'x-ratelimit-reset': '1705320000',
      },
      data: {
        type: '/problem-types/rate-limit-exceeded',
        title: 'Rate Limit Exceeded',
        status: 429,
        detail: 'You have exceeded the rate limit for this endpoint',
        instance: '/papi/v1/properties',
      },
    },
  },
  // Edge cases
  edgeCases: {
    emptyList: {
      status: 200,
      headers: { 'content-type': 'application/json' },
      data: {
        properties: {
          items: [],
        },
      },
    },
    partialResponse: {
      status: 206,
      headers: {
        'content-type': 'application/json',
        'content-range': 'items 0-99/500',
      },
      data: {
        properties: {
          items: new Array(100).fill({
            propertyId: 'prp_123456',
            propertyName: 'example.com',
          }),
        },
        nextLink: '/papi/v1/properties?offset=100',
      },
    },
    malformedJson: {
      status: 200,
      headers: { 'content-type': 'application/json' },
      data: '{"properties": {"items": [{"propertyId": "prp_123456"',
    },
    timeout: {
      error: new Error('ETIMEDOUT: Connection timed out'),
    },
    networkError: {
      error: new Error('ENOTFOUND: DNS lookup failed'),
    },
  },
};

describe('API Response Processing', () => {
  describe('Successful Response Parsing', () => {
    it('should correctly parse property list response', () => {
      const response = mockResponses.success.propertyList;
      const parsed = parsePropertyListResponse(response);

      expect(parsed).toHaveProperty('properties');
      expect(parsed.properties).toBeInstanceOf(Array);
      expect(parsed.properties[0]).toMatchObject({
        propertyId: expect.stringMatching(/^prp_\d+$/),
        propertyName: expect.any(String),
        contractId: expect.stringMatching(/^ctr_/),
        groupId: expect.stringMatching(/^grp_/),
      });
    });

    it('should extract all relevant data from DNS zone response', () => {
      const response = mockResponses.success.dnsZone;
      const parsed = parseDNSZoneResponse(response);

      expect(parsed).toMatchObject({
        zone: 'example.com',
        type: 'PRIMARY',
        isActive: true,
        lastModified: expect.any(Date),
      });
    });

    it('should handle activation status with proper state mapping', () => {
      const response = mockResponses.success.activationStatus;
      const parsed = parseActivationResponse(response);

      expect(parsed).toMatchObject({
        id: 'atv_123456',
        status: 'ACTIVE',
        network: 'STAGING',
        submittedAt: expect.any(Date),
        completedAt: expect.any(Date),
      });
    });
  });

  describe('Error Response Handling', () => {
    it('should parse and preserve authentication errors', () => {
      const response = mockResponses.errors.unauthorized;
      const error = parseErrorResponse(response);

      expect(error).toMatchObject({
        code: 'UNAUTHORIZED',
        message: 'Invalid authentication credentials',
        status: 401,
        details: expect.objectContaining({
          type: '/problem-types/unauthorized',
        }),
      });
    });

    it('should extract validation error details', () => {
      const response = mockResponses.errors.validationError;
      const error = parseErrorResponse(response);

      expect(error).toMatchObject({
        code: 'VALIDATION_ERROR',
        message: 'The request contains invalid parameters',
        status: 400,
        validationErrors: expect.arrayContaining([
          expect.objectContaining({
            field: 'propertyId',
            message: 'propertyId must start with "prp_"',
          }),
        ]),
      });
    });

    it('should handle rate limit errors with retry information', () => {
      const response = mockResponses.errors.rateLimitExceeded;
      const error = parseErrorResponse(response);

      expect(error).toMatchObject({
        code: 'RATE_LIMIT_EXCEEDED',
        message: expect.stringContaining('rate limit'),
        status: 429,
        retryAfter: expect.any(Number),
        rateLimitInfo: {
          limit: 300,
          remaining: 0,
          resetTime: expect.any(Date),
        },
      });
    });

    it('should not mask important API error details', () => {
      const response = mockResponses.errors.notFound;
      const error = parseErrorResponse(response);

      // Should preserve original error details
      expect(error.details).toBeDefined();
      expect(error.details.instance).toBe('/papi/v1/properties/prp_999999');
      expect(error.message).toContain('prp_999999');
    });
  });

  describe('Edge Case Handling', () => {
    it('should handle empty result sets gracefully', () => {
      const response = mockResponses.edgeCases.emptyList;
      const parsed = parsePropertyListResponse(response);

      expect(parsed).toMatchObject({
        properties: [],
        totalCount: 0,
      });
    });

    it('should detect and handle partial responses', () => {
      const response = mockResponses.edgeCases.partialResponse;
      const parsed = parseListResponse(response);

      expect(parsed).toMatchObject({
        items: expect.arrayContaining([expect.any(Object)]),
        hasMore: true,
        nextOffset: 100,
        totalCount: 500,
      });
    });

    it('should handle malformed JSON responses', () => {
      const response = mockResponses.edgeCases.malformedJson;
      
      expect(() => {
        parseJSONResponse(response);
      }).toThrow('Failed to parse JSON response');
    });

    it('should handle network timeouts appropriately', () => {
      const error = mockResponses.edgeCases.timeout.error;
      const parsed = parseNetworkError(error);

      expect(parsed).toMatchObject({
        code: 'TIMEOUT',
        message: expect.stringContaining('timed out'),
        retryable: true,
      });
    });

    it('should handle DNS resolution failures', () => {
      const error = mockResponses.edgeCases.networkError.error;
      const parsed = parseNetworkError(error);

      expect(parsed).toMatchObject({
        code: 'NETWORK_ERROR',
        message: expect.stringContaining('DNS'),
        retryable: false,
      });
    });
  });

  describe('Data Extraction Completeness', () => {
    it('should not lose nested data in complex responses', () => {
      const complexResponse = {
        status: 200,
        data: {
          property: {
            propertyId: 'prp_123',
            versions: {
              items: [
                {
                  version: 1,
                  rules: {
                    name: 'default',
                    children: [
                      { name: 'Caching', behaviors: [] },
                      { name: 'Performance', behaviors: [] },
                    ],
                  },
                },
              ],
            },
            hostnames: ['example.com', 'www.example.com'],
          },
        },
      };

      const parsed = parseComplexPropertyResponse(complexResponse);
      
      expect(parsed.versions).toBeDefined();
      expect(parsed.versions[0].rules.children).toHaveLength(2);
      expect(parsed.hostnames).toHaveLength(2);
    });

    it('should preserve all metadata from responses', () => {
      const responseWithMetadata = {
        status: 200,
        headers: {
          'x-akamai-request-id': 'req_123456',
          'x-ratelimit-remaining': '299',
        },
        data: {
          result: 'success',
        },
      };

      const parsed = parseResponseWithMetadata(responseWithMetadata);
      
      expect(parsed.metadata).toMatchObject({
        requestId: 'req_123456',
        rateLimitRemaining: 299,
      });
    });
  });

  describe('Error Message Passthrough', () => {
    it('should pass through detailed API error messages to MCP clients', () => {
      const apiError = {
        status: 400,
        data: {
          type: '/problem-types/invalid-rule',
          title: 'Invalid Rule Configuration',
          detail: 'The behavior "caching" requires the "ttl" option to be set',
          errors: [
            {
              type: '/problem-types/missing-required-field',
              detail: 'Required field "ttl" is missing in behavior "caching"',
              path: '/rules/children/0/behaviors/0',
            },
          ],
        },
      };

      const mcpError = convertToMCPError(apiError);
      
      expect(mcpError.message).toContain('ttl');
      expect(mcpError.message).toContain('caching');
      expect(mcpError.details).toContain('path');
    });

    it('should include actionable information in error messages', () => {
      const apiError = {
        status: 422,
        data: {
          title: 'Activation Failed',
          detail: 'Cannot activate version 5 because it contains errors',
          errors: [
            {
              detail: 'Origin hostname "origin.example.com" is not reachable',
              suggestion: 'Verify that the origin hostname is correct and accessible',
            },
          ],
        },
      };

      const mcpError = convertToMCPError(apiError);
      
      expect(mcpError.message).toContain('origin.example.com');
      expect(mcpError.suggestion).toContain('Verify');
    });
  });
});

// Response parsing functions
function parsePropertyListResponse(response: any) {
  if (!response.data?.properties?.items) {
    return { properties: [], totalCount: 0 };
  }

  return {
    properties: response.data.properties.items,
    totalCount: response.data.properties.items.length,
  };
}

function parseDNSZoneResponse(response: any) {
  const zone = response.data;
  return {
    zone: zone.zone,
    type: zone.type,
    isActive: zone.activationState === 'ACTIVE',
    lastModified: zone.lastActivationDate ? new Date(zone.lastActivationDate) : null,
  };
}

function parseActivationResponse(response: any) {
  const activation = response.data;
  return {
    id: activation.activationId,
    status: activation.status,
    network: activation.network,
    submittedAt: new Date(activation.submitDate),
    completedAt: activation.updateDate ? new Date(activation.updateDate) : null,
  };
}

function parseErrorResponse(response: any) {
  const error = response.data;
  const baseError = {
    code: error.type?.split('/').pop()?.toUpperCase() || 'UNKNOWN_ERROR',
    message: error.detail || error.title || 'An error occurred',
    status: response.status,
    details: error,
  };

  // Add validation errors if present
  if (error.errors) {
    baseError['validationErrors'] = error.errors.map((e: any) => ({
      field: e.field,
      message: e.detail,
    }));
  }

  // Add rate limit info if present
  if (response.status === 429) {
    const resetTime = response.headers['x-ratelimit-reset'];
    baseError['retryAfter'] = resetTime ? parseInt(resetTime) - Date.now() / 1000 : 60;
    baseError['rateLimitInfo'] = {
      limit: parseInt(response.headers['x-ratelimit-limit'] || '0'),
      remaining: parseInt(response.headers['x-ratelimit-remaining'] || '0'),
      resetTime: resetTime ? new Date(parseInt(resetTime) * 1000) : null,
    };
  }

  return baseError;
}

function parseListResponse(response: any) {
  const contentRange = response.headers['content-range'];
  let totalCount = 0;
  let hasMore = false;
  let nextOffset = 0;

  if (contentRange) {
    const match = contentRange.match(/items (\d+)-(\d+)\/(\d+)/);
    if (match) {
      const [, start, end, total] = match;
      totalCount = parseInt(total);
      hasMore = parseInt(end) < totalCount - 1;
      nextOffset = parseInt(end) + 1;
    }
  }

  return {
    items: response.data.properties?.items || [],
    hasMore,
    nextOffset,
    totalCount,
  };
}

function parseJSONResponse(response: any) {
  if (typeof response.data === 'string') {
    try {
      return JSON.parse(response.data);
    } catch (e) {
      throw new Error('Failed to parse JSON response');
    }
  }
  return response.data;
}

function parseNetworkError(error: Error) {
  if (error.message.includes('ETIMEDOUT')) {
    return {
      code: 'TIMEOUT',
      message: 'Request timed out',
      retryable: true,
    };
  }

  if (error.message.includes('ENOTFOUND')) {
    return {
      code: 'NETWORK_ERROR',
      message: 'DNS lookup failed',
      retryable: false,
    };
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: error.message,
    retryable: false,
  };
}

function parseComplexPropertyResponse(response: any) {
  const property = response.data.property;
  return {
    propertyId: property.propertyId,
    versions: property.versions.items,
    hostnames: property.hostnames,
  };
}

function parseResponseWithMetadata(response: any) {
  return {
    data: response.data,
    metadata: {
      requestId: response.headers['x-akamai-request-id'],
      rateLimitRemaining: parseInt(response.headers['x-ratelimit-remaining'] || '0'),
    },
  };
}

function convertToMCPError(apiError: any) {
  const error = apiError.data;
  const mcpError: any = {
    message: error.detail || error.title,
    code: error.type?.split('/').pop() || 'API_ERROR',
    status: apiError.status,
  };

  if (error.errors && error.errors.length > 0) {
    mcpError.details = error.errors.map((e: any) => e.path || e.detail).join(', ');
    
    const suggestion = error.errors.find((e: any) => e.suggestion)?.suggestion;
    if (suggestion) {
      mcpError.suggestion = suggestion;
    }
  }

  return mcpError;
}