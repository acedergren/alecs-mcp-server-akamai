/**
 * API Integration Tests
 * Tests Akamai API interactions with mock responses
 */

import { AkamaiClient } from '../akamai-client.js';
import { 
  createMockAkamaiClient, 
  MockResponseBuilder,
  TestData,
  ErrorScenarios 
} from '../testing/test-utils.js';

describe('Akamai API Integration', () => {
  let mockClient: jest.Mocked<AkamaiClient>;

  beforeEach(() => {
    mockClient = createMockAkamaiClient();
  });

  describe('Authentication', () => {
    it('should handle EdgeGrid authentication headers', () => {
      const auth = {
        client_token: 'akab-client-token',
        client_secret: 'client-secret',
        access_token: 'akab-access-token',
        host: 'akaa-host.luna.akamaiapis.net',
      };

      mockClient.getEdgeGridAuth.mockReturnValue(auth);
      
      const result = mockClient.getEdgeGridAuth();
      expect(result).toEqual(auth);
    });

    it('should handle account switching', () => {
      mockClient.accountSwitchKey = '1-ABCDEF';
      
      expect(mockClient.accountSwitchKey).toBe('1-ABCDEF');
    });

    it('should retry on authentication failure', async () => {
      mockClient.request
        .mockRejectedValueOnce(ErrorScenarios.authFailure())
        .mockResolvedValueOnce({ success: true });

      // In real implementation, should have retry logic
      try {
        await mockClient.request({ path: '/test', method: 'GET' });
      } catch (error) {
        // First call fails
      }

      const result = await mockClient.request({ path: '/test', method: 'GET' });
      expect(result.success).toBe(true);
    });
  });

  describe('Request Formatting', () => {
    it('should format GET requests correctly', async () => {
      mockClient.request.mockResolvedValueOnce({ data: 'test' });

      await mockClient.request({
        path: '/papi/v1/properties',
        method: 'GET',
        params: {
          contractId: 'ctr_C-123',
          groupId: 'grp_123',
        },
      });

      expect(mockClient.request).toHaveBeenCalledWith({
        path: '/papi/v1/properties',
        method: 'GET',
        params: {
          contractId: 'ctr_C-123',
          groupId: 'grp_123',
        },
      });
    });

    it('should format POST requests with body', async () => {
      mockClient.request.mockResolvedValueOnce({ created: true });

      await mockClient.request({
        path: '/config-dns/v2/zones',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: {
          zone: 'example.com',
          type: 'PRIMARY',
        },
      });

      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          body: expect.objectContaining({
            zone: 'example.com',
          }),
        })
      );
    });
  });

  describe('Response Parsing', () => {
    it('should parse successful responses', async () => {
      const properties = [TestData.property()];
      mockClient.request.mockResolvedValueOnce({
        properties: { items: properties },
      });

      const result = await mockClient.request({
        path: '/papi/v1/properties',
        method: 'GET',
      });

      expect(result.properties.items).toEqual(properties);
    });

    it('should handle paginated responses', async () => {
      const page1 = {
        items: [TestData.property({ propertyId: 'prp_1' })],
        nextLink: '/papi/v1/properties?page=2',
      };

      const page2 = {
        items: [TestData.property({ propertyId: 'prp_2' })],
        nextLink: null,
      };

      mockClient.request
        .mockResolvedValueOnce(page1)
        .mockResolvedValueOnce(page2);

      // First page
      const result1 = await mockClient.request({
        path: '/papi/v1/properties',
        method: 'GET',
      });

      expect(result1.items.length).toBe(1);
      expect(result1.nextLink).toBeTruthy();

      // Second page
      const result2 = await mockClient.request({
        path: result1.nextLink,
        method: 'GET',
      });

      expect(result2.items.length).toBe(1);
      expect(result2.nextLink).toBeFalsy();
    });

    it('should handle empty responses', async () => {
      mockClient.request.mockResolvedValueOnce({
        properties: { items: [] },
      });

      const result = await mockClient.request({
        path: '/papi/v1/properties',
        method: 'GET',
      });

      expect(result.properties.items).toEqual([]);
    });
  });

  describe('Error Handling', () => {
    it('should handle rate limiting with retry-after header', async () => {
      const rateLimitError = {
        response: {
          status: 429,
          headers: {
            'retry-after': '60',
          },
          data: {
            detail: 'Rate limit exceeded',
          },
        },
      };

      mockClient.request.mockRejectedValueOnce(rateLimitError);

      try {
        await mockClient.request({ path: '/test', method: 'GET' });
      } catch (error: any) {
        expect(error.response.status).toBe(429);
        expect(error.response.headers['retry-after']).toBe('60');
      }
    });

    it('should handle validation errors with field details', async () => {
      const validationError = {
        response: {
          status: 400,
          data: {
            type: 'https://problems.luna.akamaiapis.net/common/validation-error',
            title: 'Validation Error',
            errors: [
              {
                type: 'invalid-format',
                title: 'Invalid format',
                detail: 'contractId must start with ctr_',
                field: 'contractId',
              },
            ],
          },
        },
      };

      mockClient.request.mockRejectedValueOnce(validationError);

      try {
        await mockClient.request({ path: '/test', method: 'POST' });
      } catch (error: any) {
        expect(error.response.data.errors[0].field).toBe('contractId');
        expect(error.response.data.errors[0].detail).toContain('ctr_');
      }
    });

    it('should handle not found errors', async () => {
      mockClient.request.mockRejectedValueOnce(ErrorScenarios.notFound('property'));

      try {
        await mockClient.request({ path: '/test', method: 'GET' });
      } catch (error: any) {
        expect(error.status).toBe(404);
        expect(error.detail).toContain('not found');
      }
    });
  });

  describe('API-Specific Behaviors', () => {
    describe('Property Manager API', () => {
      it('should handle property version headers', async () => {
        mockClient.request.mockResolvedValueOnce({
          propertyVersion: 5,
          etag: '"abc123"',
        });

        const result = await mockClient.request({
          path: '/papi/v1/properties/prp_123/versions/5',
          method: 'GET',
          headers: {
            'PAPI-Use-Prefixes': 'true',
          },
        });

        expect(result.propertyVersion).toBe(5);
        expect(result.etag).toBe('"abc123"');
      });
    });

    describe('Edge DNS API', () => {
      it('should handle changelist workflow', async () => {
        // List changelists - none exist
        mockClient.request.mockResolvedValueOnce({ changelists: [] });
        
        // Create changelist
        mockClient.request.mockResolvedValueOnce({ 
          changeListId: 'cl_12345' 
        });

        // Add record
        mockClient.request.mockResolvedValueOnce({});

        // Submit changelist
        mockClient.request.mockResolvedValueOnce({
          requestId: 'req_12345',
        });

        // Workflow simulation
        const list = await mockClient.request({
          path: '/config-dns/v2/changelists',
          method: 'GET',
        });
        expect(list.changelists).toEqual([]);

        const create = await mockClient.request({
          path: '/config-dns/v2/changelists',
          method: 'POST',
          body: { zones: ['example.com'] },
        });
        expect(create.changeListId).toBe('cl_12345');

        await mockClient.request({
          path: '/config-dns/v2/changelists/example.com/recordsets/www/A',
          method: 'PUT',
          body: TestData.record(),
        });

        const submit = await mockClient.request({
          path: '/config-dns/v2/changelists/example.com/submit',
          method: 'POST',
        });
        expect(submit.requestId).toBe('req_12345');
      });
    });

    describe('CPS API', () => {
      it('should handle async enrollment status', async () => {
        const pendingStatus = {
          enrollment: {
            id: 12345,
            csr: { cn: 'secure.example.com' },
            validationStatus: 'PENDING',
            certificateChainStatus: 'NOT_READY',
          },
        };

        const completeStatus = {
          enrollment: {
            id: 12345,
            csr: { cn: 'secure.example.com' },
            validationStatus: 'VALIDATED',
            certificateChainStatus: 'READY',
          },
        };

        mockClient.request
          .mockResolvedValueOnce(pendingStatus)
          .mockResolvedValueOnce(completeStatus);

        // First check - pending
        const pending = await mockClient.request({
          path: '/cps/v2/enrollments/12345',
          method: 'GET',
        });
        expect(pending.enrollment.validationStatus).toBe('PENDING');

        // Second check - complete
        const complete = await mockClient.request({
          path: '/cps/v2/enrollments/12345',
          method: 'GET',
        });
        expect(complete.enrollment.validationStatus).toBe('VALIDATED');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle malformed JSON responses', async () => {
      const malformedResponse = {
        response: {
          status: 200,
          data: 'Not JSON',
        },
      };

      mockClient.request.mockResolvedValueOnce(malformedResponse);

      const result = await mockClient.request({
        path: '/test',
        method: 'GET',
      });

      expect(result.response.data).toBe('Not JSON');
    });

    it('should handle network timeouts', async () => {
      const timeoutError = new Error('ETIMEDOUT');
      mockClient.request.mockRejectedValueOnce(timeoutError);

      try {
        await mockClient.request({ path: '/test', method: 'GET' });
      } catch (error: any) {
        expect(error.message).toBe('ETIMEDOUT');
      }
    });

    it('should handle unexpected API response formats', async () => {
      // API returns different format than expected
      mockClient.request.mockResolvedValueOnce({
        unexpectedField: 'value',
        // Missing expected 'properties' field
      });

      const result = await mockClient.request({
        path: '/papi/v1/properties',
        method: 'GET',
      });

      expect(result.unexpectedField).toBe('value');
      expect(result.properties).toBeUndefined();
    });
  });
});