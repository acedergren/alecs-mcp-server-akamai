/**
 * FastPurge CODE KAI Validation Test Suite
 * 
 * Tests only the CODE KAI principles - no complex service mocking
 * Focuses on type safety, validation, error handling, and user experience
 */

import { describe, it, expect } from '@jest/globals';
import { 
  isPurgeResponse,
  isPurgeStatusResponse,
  FastPurgeValidationError,
  PurgeResponseSchema,
  PurgeStatusResponseSchema,
  type PurgeResponse,
  type PurgeStatusResponse
} from '../../src/types/api-responses/fast-purge';

describe('FastPurge CODE KAI Validation Tests', () => {
  
  describe('1. Type Safety - Runtime Validation', () => {
    it('should validate valid PurgeResponse correctly', () => {
      const validResponse: PurgeResponse = {
        httpStatus: 201,
        detail: 'Request accepted',
        estimatedSeconds: 5,
        purgeId: 'abc123',
        supportId: 'xyz789',
        title: 'Purge request'
      };

      expect(isPurgeResponse(validResponse)).toBe(true);
      
      // Zod schema validation
      const result = PurgeResponseSchema.safeParse(validResponse);
      expect(result.success).toBe(true);
    });

    it('should reject invalid PurgeResponse structure', () => {
      const invalidResponse = {
        httpStatus: 201,
        // Missing required fields: detail, estimatedSeconds, purgeId, supportId
      };

      expect(isPurgeResponse(invalidResponse)).toBe(false);
      
      // Zod schema validation
      const result = PurgeResponseSchema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });

    it('should validate PurgeStatusResponse correctly', () => {
      const validStatus: PurgeStatusResponse = {
        httpStatus: 200,
        submissionTime: '2024-01-15T10:00:00Z',
        originalEstimatedSeconds: 5,
        progressUri: '/ccu/v3/purges/abc123',
        purgeId: 'abc123',
        supportId: 'xyz789',
        status: 'Done',
        submittedBy: 'test@example.com',
        originalQueueLength: 1
      };

      expect(isPurgeStatusResponse(validStatus)).toBe(true);
      
      // Zod schema validation
      const result = PurgeStatusResponseSchema.safeParse(validStatus);
      expect(result.success).toBe(true);
    });

    it('should reject invalid status values', () => {
      const invalidStatus = {
        httpStatus: 200,
        submissionTime: '2024-01-15T10:00:00Z',
        originalEstimatedSeconds: 5,
        progressUri: '/ccu/v3/purges/abc123',
        purgeId: 'abc123',
        supportId: 'xyz789',
        status: 'InvalidStatus', // Should be 'Done' | 'In-Progress' | 'Unknown'
        submittedBy: 'test@example.com',
        originalQueueLength: 1
      };

      expect(isPurgeStatusResponse(invalidStatus)).toBe(false);
      
      // Zod schema validation
      const result = PurgeStatusResponseSchema.safeParse(invalidStatus);
      expect(result.success).toBe(false);
    });
  });

  describe('2. Error Handling - Custom Error Classes', () => {
    it('should create FastPurgeValidationError with proper context', () => {
      const received = { invalid: 'data', missing: 'fields' };
      const error = new FastPurgeValidationError(
        'Test validation failed',
        received,
        'PurgeResponse'
      );

      expect(error.name).toBe('FastPurgeValidationError');
      expect(error.message).toBe('Test validation failed');
      expect(error.received).toEqual(received);
      expect(error.expected).toBe('PurgeResponse');
      expect(error instanceof Error).toBe(true);
    });

    it('should provide detailed validation context in errors', () => {
      const invalidData = {
        httpStatus: 'invalid', // Should be number
        purgeId: 123, // Should be string
        // Missing required fields
      };

      const error = new FastPurgeValidationError(
        'Multiple validation failures detected',
        invalidData,
        'PurgeResponse with valid httpStatus (number) and purgeId (string)'
      );

      expect(error.received).toEqual(invalidData);
      expect(error.expected).toContain('httpStatus (number)');
      expect(error.expected).toContain('purgeId (string)');
    });
  });

  describe('3. API Compliance - Schema Validation', () => {
    it('should enforce required fields in PurgeResponse', () => {
      const partialResponse = {
        httpStatus: 201,
        detail: 'Request accepted',
        // Missing: estimatedSeconds, purgeId, supportId
      };

      const result = PurgeResponseSchema.safeParse(partialResponse);
      expect(result.success).toBe(false);
      
      if (!result.success) {
        const missingFields = result.error.issues.map(issue => issue.path[0]);
        expect(missingFields).toContain('estimatedSeconds');
        expect(missingFields).toContain('purgeId');
        expect(missingFields).toContain('supportId');
      }
    });

    it('should validate HTTP status code ranges', () => {
      const invalidStatusResponse = {
        httpStatus: 999, // Invalid HTTP status
        detail: 'Request accepted',
        estimatedSeconds: 5,
        purgeId: 'abc123',
        supportId: 'xyz789'
      };

      const result = PurgeResponseSchema.safeParse(invalidStatusResponse);
      expect(result.success).toBe(false);
      
      if (!result.success) {
        const statusError = result.error.issues.find(issue => 
          issue.path[0] === 'httpStatus'
        );
        expect(statusError).toBeDefined();
      }
    });

    it('should validate string field requirements', () => {
      const emptyStringResponse = {
        httpStatus: 201,
        detail: '', // Empty string should fail min(1)
        estimatedSeconds: 5,
        purgeId: 'abc123',
        supportId: 'xyz789'
      };

      const result = PurgeResponseSchema.safeParse(emptyStringResponse);
      expect(result.success).toBe(false);
      
      if (!result.success) {
        const detailError = result.error.issues.find(issue => 
          issue.path[0] === 'detail'
        );
        expect(detailError).toBeDefined();
        expect(detailError?.code).toBe('too_small');
      }
    });
  });

  describe('4. User Experience - Clear Error Messages', () => {
    it('should provide human-readable validation errors', () => {
      const invalidData = {
        httpStatus: 'not-a-number',
        detail: '',
        estimatedSeconds: -1,
        purgeId: '',
        supportId: ''
      };

      const result = PurgeResponseSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      
      if (!result.success) {
        const errorMessages = result.error.issues.map(issue => issue.message);
        
        // Should have clear, actionable error messages
        expect(errorMessages.some(msg => 
          msg.includes('Expected number') || msg.includes('number')
        )).toBe(true);
        
        expect(errorMessages.some(msg => 
          msg.includes('too_small') || msg.includes('String must contain')
        )).toBe(true);
      }
    });

    it('should validate enum values with clear messages', () => {
      const invalidStatusData = {
        httpStatus: 200,
        submissionTime: '2024-01-15T10:00:00Z',
        originalEstimatedSeconds: 5,
        progressUri: '/ccu/v3/purges/abc123',
        purgeId: 'abc123',
        supportId: 'xyz789',
        status: 'INVALID_STATUS',
        submittedBy: 'test@example.com',
        originalQueueLength: 1
      };

      const result = PurgeStatusResponseSchema.safeParse(invalidStatusData);
      expect(result.success).toBe(false);
      
      if (!result.success) {
        const enumError = result.error.issues.find(issue => 
          issue.path[0] === 'status'
        );
        expect(enumError).toBeDefined();
        expect(enumError?.code).toBe('invalid_enum_value');
      }
    });
  });

  describe('5. Maintainability - Schema Composition', () => {
    it('should handle optional fields correctly', () => {
      const minimalValidResponse = {
        httpStatus: 201,
        detail: 'Request accepted',
        estimatedSeconds: 5,
        purgeId: 'abc123',
        supportId: 'xyz789'
        // title and describedBy are optional
      };

      const result = PurgeResponseSchema.safeParse(minimalValidResponse);
      expect(result.success).toBe(true);
    });

    it('should accept optional fields when provided', () => {
      const fullResponse = {
        httpStatus: 201,
        detail: 'Request accepted',
        estimatedSeconds: 5,
        purgeId: 'abc123',
        supportId: 'xyz789',
        title: 'Purge Operation',
        describedBy: 'https://docs.akamai.com/purge'
      };

      const result = PurgeResponseSchema.safeParse(fullResponse);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.title).toBe('Purge Operation');
        expect(result.data.describedBy).toBe('https://docs.akamai.com/purge');
      }
    });

    it('should validate numeric constraints properly', () => {
      const purgeResponseTests = [
        { estimatedSeconds: 0, shouldPass: true },
        { estimatedSeconds: 300, shouldPass: true },
        { estimatedSeconds: -1, shouldPass: false },
      ];

      purgeResponseTests.forEach(test => {
        const response = {
          httpStatus: 201,
          detail: 'Request accepted',
          estimatedSeconds: test.estimatedSeconds,
          purgeId: 'abc123',
          supportId: 'xyz789'
        };

        const result = PurgeResponseSchema.safeParse(response);
        expect(result.success).toBe(test.shouldPass);
      });

      // Test PurgeStatusResponse constraints separately
      const statusResponseTests = [
        { originalQueueLength: 0, shouldPass: true },
        { originalQueueLength: 1000, shouldPass: true },
        { originalQueueLength: -5, shouldPass: false },
      ];

      statusResponseTests.forEach(test => {
        const statusResponse = {
          httpStatus: 200,
          submissionTime: '2024-01-15T10:00:00Z',
          originalEstimatedSeconds: 5,
          progressUri: '/ccu/v3/purges/abc123',
          purgeId: 'abc123',
          supportId: 'xyz789',
          status: 'Done' as const,
          submittedBy: 'test@example.com',
          originalQueueLength: test.originalQueueLength
        };

        const result = PurgeStatusResponseSchema.safeParse(statusResponse);
        expect(result.success).toBe(test.shouldPass);
      });
    });
  });

  describe('6. Production Grade Validation', () => {
    it('should handle edge cases gracefully', () => {
      const edgeCases = [
        null,
        undefined,
        {},
        [],
        '',
        0,
        false,
        'string-instead-of-object'
      ];

      edgeCases.forEach(edgeCase => {
        expect(isPurgeResponse(edgeCase)).toBe(false);
        expect(isPurgeStatusResponse(edgeCase)).toBe(false);
        
        const purgeResult = PurgeResponseSchema.safeParse(edgeCase);
        const statusResult = PurgeStatusResponseSchema.safeParse(edgeCase);
        
        expect(purgeResult.success).toBe(false);
        expect(statusResult.success).toBe(false);
      });
    });

    it('should be consistent between type guards and schemas', () => {
      const testCases = [
        {
          httpStatus: 201,
          detail: 'Request accepted',
          estimatedSeconds: 5,
          purgeId: 'abc123',
          supportId: 'xyz789'
        },
        {
          httpStatus: 'invalid',
          detail: 'Request accepted',
          estimatedSeconds: 5,
          purgeId: 'abc123',
          supportId: 'xyz789'
        },
        {
          httpStatus: 201,
          // Missing required fields
        }
      ];

      testCases.forEach(testCase => {
        const typeGuardResult = isPurgeResponse(testCase);
        const schemaResult = PurgeResponseSchema.safeParse(testCase);
        
        // Type guard and schema should agree
        expect(typeGuardResult).toBe(schemaResult.success);
      });
    });
  });
});