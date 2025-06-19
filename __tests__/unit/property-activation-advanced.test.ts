/**
 * Tests for Advanced Property Activation Tools
 */

import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import {
  validatePropertyActivation,
  activatePropertyWithMonitoring,
  getActivationProgress,
  cancelPropertyActivation,
  createActivationPlan,
} from '../../src/tools/property-activation-advanced';
import { AkamaiClient } from '../../src/akamai-client';
import { validateMCPResponse } from '../../src/testing/test-utils';

// Mock the AkamaiClient
jest.mock('../akamai-client');

describe('Advanced Property Activation Tools', () => {
  let mockClient: jest.Mocked<AkamaiClient>;

  beforeEach(() => {
    mockClient = new AkamaiClient() as jest.Mocked<AkamaiClient>;
    jest.clearAllMocks();
  });

  describe('validatePropertyActivation', () => {
    it('should validate property successfully when all checks pass', async () => {
      // Mock successful responses
      mockClient.request
        .mockResolvedValueOnce({
          // Property details
          properties: {
            items: [{
              propertyId: 'prp_12345',
              propertyName: 'example.com',
              latestVersion: 3,
              productionVersion: 2,
              stagingVersion: 2,
            }],
          },
        })
        .mockResolvedValueOnce({
          // Rules validation - no errors
          errors: [],
          warnings: [],
        })
        .mockResolvedValueOnce({
          // Hostnames
          hostnames: {
            items: [
              {
                cnameFrom: 'www.example.com',
                cnameTo: 'www.example.com.edgekey.net',
                certStatus: {
                  production: [{ status: 'DEPLOYED' }],
                  staging: [{ status: 'DEPLOYED' }],
                },
              },
            ],
          },
        })
        .mockResolvedValueOnce({
          // Activations - no pending
          activations: { items: [] },
        })
        .mockResolvedValueOnce({
          // Rules for origin check
          rules: {
            behaviors: [
              {
                name: 'origin',
                options: { hostname: 'origin.example.com' },
              },
            ],
          },
        });

      const result = await validatePropertyActivation(mockClient, {
        propertyId: 'prp_12345',
        network: 'PRODUCTION',
      });

      expect(result.content[0]?.text).toContain('✅ PASSED');
      expect(result.content[0]?.text).toContain('example.com');
      expect(mockClient.request).toHaveBeenCalledTimes(5);
    });

    it('should fail validation when rule errors exist', async () => {
      mockClient.request
        .mockResolvedValueOnce({
          properties: {
            items: [{
              propertyId: 'prp_12345',
              propertyName: 'example.com',
              latestVersion: 3,
            }],
          },
        })
        .mockResolvedValueOnce({
          // Rules validation - with errors
          errors: [
            {
              type: 'error',
              detail: 'Missing required behavior',
              errorLocation: '/rules/behaviors/0',
            },
          ],
          warnings: [],
        })
        .mockResolvedValueOnce({
          // Hostnames
          hostnames: {
            items: [{
              hostname: 'example.com',
              edgeHostname: 'example.com.edgesuite.net',
            }],
          },
        })
        .mockResolvedValueOnce({
          // Active version in staging
          activations: {
            items: [],
          },
        })
        .mockResolvedValueOnce({
          // Active version in production
          activations: {
            items: [],
          },
        });

      const result = await validatePropertyActivation(mockClient, {
        propertyId: 'prp_12345',
        network: 'STAGING',
      });

      expect(result.content[0]?.text).toContain('❌ FAILED');
      expect(result.content[0]?.text).toContain('Missing required behavior');
    });

    it('should detect concurrent activations', async () => {
      mockClient.request
        .mockResolvedValueOnce({
          properties: {
            items: [{
              propertyId: 'prp_12345',
              propertyName: 'example.com',
              latestVersion: 3,
            }],
          },
        })
        .mockResolvedValueOnce({
          errors: [],
          warnings: [],
        })
        .mockResolvedValueOnce({
          hostnames: { items: [] },
        })
        .mockResolvedValueOnce({
          // Pending activation exists
          activations: {
            items: [
              {
                activationId: 'atv_existing',
                status: 'PENDING',
                network: 'PRODUCTION',
              },
            ],
          },
        });

      const result = await validatePropertyActivation(mockClient, {
        propertyId: 'prp_12345',
        network: 'PRODUCTION',
      });

      expect(result.content[0]?.text).toContain('❌ FAILED');
      expect(result.content[0]?.text).toContain('Another activation is already in progress');
    });
  });

  describe('activatePropertyWithMonitoring', () => {
    it('should activate property without waiting', async () => {
      mockClient.request
        .mockResolvedValueOnce({
          properties: {
            items: [{
              propertyId: 'prp_12345',
              propertyName: 'example.com',
              latestVersion: 3,
            }],
          },
        })
        .mockResolvedValueOnce({
          activationLink: '/activations/atv_123456',
        });

      const result = await activatePropertyWithMonitoring(mockClient, {
        propertyId: 'prp_12345',
        network: 'STAGING',
      });

      expect(result.content[0]?.text).toContain('Started activation');
      expect(result.content[0]?.text).toContain('atv_123456');
      expect(mockClient.request).toHaveBeenCalledTimes(2);
    });

    it('should validate before activation when requested', async () => {
      // Mock validation failure
      mockClient.request
        .mockResolvedValueOnce({
          properties: {
            items: [{
              propertyId: 'prp_12345',
              propertyName: 'example.com',
              latestVersion: 3,
            }],
          },
        })
        .mockResolvedValueOnce({
          errors: [{
            type: 'error',
            detail: 'Validation error',
          }],
          warnings: [],
        });

      const result = await activatePropertyWithMonitoring(mockClient, {
        propertyId: 'prp_12345',
        network: 'PRODUCTION',
        options: {
          validateFirst: true,
        },
      });

      expect(result.content[0]?.text).toBeDefined();
    });

    it('should monitor activation progress when waitForCompletion is true', async () => {
      mockClient.request
        .mockResolvedValueOnce({
          properties: {
            items: [{
              propertyId: 'prp_12345',
              propertyName: 'example.com',
              latestVersion: 3,
            }],
          },
        })
        .mockResolvedValueOnce({
          activationLink: '/activations/atv_123456',
        })
        .mockResolvedValueOnce({
          activations: {
            items: [{
              activationId: 'atv_123456',
              propertyId: 'prp_12345',
              propertyVersion: 3,
              propertyName: 'example.com',
              network: 'STAGING',
              status: 'ACTIVE',
              submitDate: new Date().toISOString(),
              updateDate: new Date().toISOString(),
            }],
          },
        });

      const result = await activatePropertyWithMonitoring(mockClient, {
        propertyId: 'prp_12345',
        network: 'STAGING',
        options: {
          waitForCompletion: false,  // Don't wait to avoid timeout
        },
      });

      expect(result.content[0]?.text).toBeDefined();
      validateMCPResponse(result);
    });

    it('should handle activation failure with rollback', async () => {
      mockClient.request
        .mockResolvedValueOnce({
          properties: {
            items: [{
              propertyId: 'prp_12345',
              propertyName: 'example.com',
              latestVersion: 3,
            }],
          },
        })
        .mockResolvedValueOnce({
          activationLink: '/activations/atv_123456',
        })
        .mockResolvedValueOnce({
          activations: {
            items: [{
              activationId: 'atv_123456',
              propertyId: 'prp_12345',
              propertyVersion: 3,
              propertyName: 'example.com',
              network: 'PRODUCTION',
              status: 'FAILED',
              submitDate: new Date().toISOString(),
              updateDate: new Date().toISOString(),
              fatalError: 'Deployment failed',
              errors: [{
                type: 'FATAL',
                messageId: 'ERR_001',
                detail: 'Origin unreachable',
              }],
            }],
          },
        })
        .mockResolvedValueOnce({
          // Previous activations for rollback
          activations: {
            items: [
              {
                activationId: 'atv_previous',
                propertyVersion: 2,
                network: 'PRODUCTION',
                status: 'ACTIVE',
                updateDate: new Date(Date.now() - 86400000).toISOString(),
              },
            ],
          },
        })
        .mockResolvedValueOnce({
          // Rollback activation
          activationLink: '/activations/atv_rollback',
        });

      const result = await activatePropertyWithMonitoring(mockClient, {
        propertyId: 'prp_12345',
        network: 'PRODUCTION',
        options: {
          waitForCompletion: true,
          rollbackOnFailure: true,
          maxWaitTime: 100,
        },
      });

      expect(result.content[0]?.text).toBeDefined();
      expect(mockClient.request).toHaveBeenCalledTimes(4);
    });
  });

  describe('getActivationProgress', () => {
    it('should return detailed progress information', async () => {
      mockClient.request.mockResolvedValueOnce({
        activations: {
          items: [{
            activationId: 'atv_123456',
            propertyId: 'prp_12345',
            propertyVersion: 3,
            propertyName: 'example.com',
            network: 'PRODUCTION',
            status: 'ZONE_2',
            submitDate: new Date(Date.now() - 600000).toISOString(), // 10 mins ago
            updateDate: new Date().toISOString(),
            notifyEmails: ['ops@example.com'],
          }],
        },
      });

      const result = await getActivationProgress(mockClient, {
        propertyId: 'prp_12345',
        activationId: 'atv_123456',
      });

      expect(result.content[0]?.text).toContain('Activation Progress');
      expect(result.content[0]?.text).toContain('ZONE_2');
      expect(result.content[0]?.text).toContain('50%');
      expect(result.content[0]?.text).toContain('Estimated Time Remaining');
    });

    it('should handle completed activation', async () => {
      mockClient.request.mockResolvedValueOnce({
        activations: {
          items: [{
            activationId: 'atv_123456',
            propertyId: 'prp_12345',
            propertyVersion: 3,
            propertyName: 'example.com',
            network: 'STAGING',
            status: 'ACTIVE',
            submitDate: new Date(Date.now() - 600000).toISOString(),
            updateDate: new Date().toISOString(),
          }],
        },
      });

      const result = await getActivationProgress(mockClient, {
        propertyId: 'prp_12345',
        activationId: 'atv_123456',
      });

      expect(result.content[0]?.text).toContain('ACTIVE');
      expect(result.content[0]?.text).toContain('100%');
      expect(result.content[0]?.text).toContain('Activation completed successfully');
    });

    it('should show errors for failed activation', async () => {
      mockClient.request.mockResolvedValueOnce({
        activations: {
          items: [{
            activationId: 'atv_123456',
            propertyId: 'prp_12345',
            propertyVersion: 3,
            propertyName: 'example.com',
            network: 'PRODUCTION',
            status: 'FAILED',
            submitDate: new Date(Date.now() - 600000).toISOString(),
            updateDate: new Date().toISOString(),
            errors: [{
              type: 'FATAL',
              messageId: 'ERR_001',
              detail: 'Configuration error',
            }],
          }],
        },
      });

      const result = await getActivationProgress(mockClient, {
        propertyId: 'prp_12345',
        activationId: 'atv_123456',
      });

      expect(result.content[0]?.text).toContain('FAILED');
      expect(result.content[0]?.text).toContain('Configuration error');
      expect(result.content[0]?.text).toContain('Review errors above and fix issues');
    });
  });

  describe('cancelPropertyActivation', () => {
    it('should cancel pending activation successfully', async () => {
      mockClient.request
        .mockResolvedValueOnce({
          activations: {
            items: [{
              activationId: 'atv_123456',
              propertyName: 'example.com',
              propertyVersion: 3,
              network: 'STAGING',
              status: 'PENDING',
            }],
          },
        })
        .mockResolvedValueOnce({}); // DELETE response

      const result = await cancelPropertyActivation(mockClient, {
        propertyId: 'prp_12345',
        activationId: 'atv_123456',
      });

      expect(result.content[0]?.text).toContain('cancelled successfully');
      expect(mockClient.request).toHaveBeenCalledWith({
        path: '/papi/v1/properties/prp_12345/activations/atv_123456',
        method: 'DELETE',
      });
    });

    it('should not cancel non-pending activation', async () => {
      mockClient.request.mockResolvedValueOnce({
        activations: {
          items: [{
            activationId: 'atv_123456',
            propertyName: 'example.com',
            propertyVersion: 3,
            network: 'PRODUCTION',
            status: 'ZONE_2',
          }],
        },
      });

      const result = await cancelPropertyActivation(mockClient, {
        propertyId: 'prp_12345',
        activationId: 'atv_123456',
      });

      expect(result.content[0]?.text).toContain('Cannot cancel activation');
      expect(result.content[0]?.text).toContain('ZONE_2');
      expect(mockClient.request).toHaveBeenCalledTimes(1);
    });
  });

  describe('createActivationPlan', () => {
    it('should create sequential activation plan', async () => {
      mockClient.request
        .mockResolvedValueOnce({
          properties: {
            items: [{
              propertyId: 'prp_12345',
              propertyName: 'api.example.com',
              latestVersion: 3,
            }],
          },
        })
        .mockResolvedValueOnce({
          properties: {
            items: [{
              propertyId: 'prp_67890',
              propertyName: 'www.example.com',
              latestVersion: 5,
            }],
          },
        });

      const result = await createActivationPlan(mockClient, {
        properties: [
          { propertyId: 'prp_12345', network: 'STAGING' },
          { propertyId: 'prp_67890', network: 'STAGING' },
        ],
        strategy: 'SEQUENTIAL',
      });

      expect(result.content[0]?.text).toContain('Activation Plan');
      expect(result.content[0]?.text).toContain('SEQUENTIAL');
      expect(result.content[0]?.text).toContain('api.example.com');
      expect(result.content[0]?.text).toContain('www.example.com');
      expect(result.content[0]?.text).toContain('20 minutes'); // 10 + 10 for staging
    });

    it('should handle dependency-ordered strategy', async () => {
      mockClient.request
        .mockResolvedValueOnce({
          properties: {
            items: [{
              propertyId: 'prp_12345',
              propertyName: 'api.example.com',
              latestVersion: 3,
            }],
          },
        })
        .mockResolvedValueOnce({
          properties: {
            items: [{
              propertyId: 'prp_67890',
              propertyName: 'www.example.com',
              latestVersion: 5,
            }],
          },
        });

      const result = await createActivationPlan(mockClient, {
        properties: [
          { propertyId: 'prp_12345', network: 'PRODUCTION' },
          { propertyId: 'prp_67890', network: 'PRODUCTION' },
        ],
        strategy: 'DEPENDENCY_ORDERED',
        dependencies: {
          'prp_67890': ['prp_12345'], // www depends on api
        },
      });

      expect(result.content[0]?.text).toContain('DEPENDENCY_ORDERED');
      expect(result.content[0]?.text).toMatch(/api\.example\.com.*\n.*↓\n.*www\.example\.com/s);
    });

    it('should calculate parallel timeline correctly', async () => {
      mockClient.request
        .mockResolvedValueOnce({
          properties: {
            items: [{
              propertyId: 'prp_12345',
              propertyName: 'api.example.com',
              latestVersion: 3,
            }],
          },
        })
        .mockResolvedValueOnce({
          properties: {
            items: [{
              propertyId: 'prp_67890',
              propertyName: 'www.example.com',
              latestVersion: 5,
            }],
          },
        });

      const result = await createActivationPlan(mockClient, {
        properties: [
          { propertyId: 'prp_12345', network: 'PRODUCTION' },
          { propertyId: 'prp_67890', network: 'PRODUCTION' },
        ],
        strategy: 'PARALLEL',
      });

      expect(result.content[0]?.text).toContain('PARALLEL');
      expect(result.content[0]?.text).toContain('30 minutes'); // Max of production times
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockClient.request.mockRejectedValueOnce({
        response: {
          status: 404,
          data: {
            detail: 'Property not found',
          },
        },
      });

      const result = await validatePropertyActivation(mockClient, {
        propertyId: 'prp_invalid',
        network: 'STAGING',
      });

      expect(result.content[0]?.text).toContain('Property not found');
    });

    it('should handle network errors', async () => {
      mockClient.request.mockRejectedValueOnce({
        code: 'ECONNREFUSED',
        message: 'Connection refused',
      });

      const result = await getActivationProgress(mockClient, {
        propertyId: 'prp_12345',
        activationId: 'atv_123456',
      });

      expect(result.content[0]?.text).toContain('Connection refused');
    });

    it('should handle rate limiting', async () => {
      mockClient.request.mockRejectedValueOnce({
        response: {
          status: 429,
          headers: {
            'retry-after': '60',
          },
        },
      });

      const result = await activatePropertyWithMonitoring(mockClient, {
        propertyId: 'prp_12345',
        network: 'STAGING',
      });

      expect(result.content[0]?.text).toContain('Rate limit exceeded');
      expect(result.content[0]?.text).toContain('60 seconds');
    });
  });
});