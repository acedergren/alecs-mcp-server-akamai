/**
 * Tests for Includes Management Tools
 */

import { AkamaiClient } from '../akamai-client';
import {
  listIncludes,
  getInclude,
  createInclude,
  updateInclude,
  createIncludeVersion,
  activateInclude,
  getIncludeActivationStatus,
  listIncludeActivations
} from '../tools/includes-tools';

// Mock the AkamaiClient
jest.mock('../akamai-client');

describe('Includes Management Tools', () => {
  let mockClient: jest.Mocked<AkamaiClient>;

  beforeEach(() => {
    mockClient = new AkamaiClient('test') as jest.Mocked<AkamaiClient>;
    mockClient.request = jest.fn();
  });

  describe('listIncludes', () => {
    it('should list includes successfully', async () => {
      const mockResponse = {
        includes: {
          items: [
            {
              includeId: 'inc_12345',
              includeName: 'test-include',
              includeType: 'MICROSERVICES',
              latestVersion: 1,
              createdDate: '2023-01-01T00:00:00Z',
              updatedDate: '2023-01-01T00:00:00Z'
            }
          ]
        }
      };

      mockClient.request.mockResolvedValue(mockResponse);

      const result = await listIncludes(mockClient, {
        contractId: 'ctr_12345',
        groupId: 'grp_12345'
      });

      expect(result.content[0]?.text).toContain('Includes List');
      expect(result.content[0]?.text).toContain('test-include');
      expect(result.content[0]?.text).toContain('MICROSERVICES');
      expect(mockClient.request).toHaveBeenCalledWith({
        path: '/papi/v1/includes?contractId=ctr_12345&groupId=grp_12345',
        method: 'GET',
        customer: undefined
      });
    });

    it('should handle empty includes list', async () => {
      const mockResponse = {
        includes: { items: [] }
      };

      mockClient.request.mockResolvedValue(mockResponse);

      const result = await listIncludes(mockClient, {
        contractId: 'ctr_12345',
        groupId: 'grp_12345'
      });

      expect(result.content[0]?.text).toContain('No includes found');
    });

    it('should filter by include type', async () => {
      const mockResponse = {
        includes: { items: [] }
      };

      mockClient.request.mockResolvedValue(mockResponse);

      await listIncludes(mockClient, {
        contractId: 'ctr_12345',
        groupId: 'grp_12345',
        includeType: 'MICROSERVICES'
      });

      expect(mockClient.request).toHaveBeenCalledWith({
        path: '/papi/v1/includes?contractId=ctr_12345&groupId=grp_12345&includeType=MICROSERVICES',
        method: 'GET',
        customer: undefined
      });
    });
  });

  describe('getInclude', () => {
    it('should get include details successfully', async () => {
      const mockResponse = {
        includes: {
          items: [{
            includeId: 'inc_12345',
            includeName: 'test-include',
            includeType: 'MICROSERVICES',
            latestVersion: 2,
            createdDate: '2023-01-01T00:00:00Z',
            updatedDate: '2023-01-02T00:00:00Z',
            ruleFormat: 'v2023-01-05'
          }]
        }
      };

      mockClient.request.mockResolvedValue(mockResponse);

      const result = await getInclude(mockClient, {
        includeId: 'inc_12345',
        contractId: 'ctr_12345',
        groupId: 'grp_12345'
      });

      expect(result.content[0]?.text).toContain('Include Details');
      expect(result.content[0]?.text).toContain('test-include');
      expect(result.content[0]?.text).toContain('inc_12345');
      expect(result.content[0]?.text).toContain('MICROSERVICES');
    });

    it('should handle include not found', async () => {
      const mockResponse = {
        includes: { items: [] }
      };

      mockClient.request.mockResolvedValue(mockResponse);

      const result = await getInclude(mockClient, {
        includeId: 'inc_nonexistent',
        contractId: 'ctr_12345',
        groupId: 'grp_12345'
      });

      expect(result.content[0]?.text).toContain('Include inc_nonexistent not found');
    });

    it('should request specific version when provided', async () => {
      const mockResponse = {
        include: {
          includeId: 'inc_12345',
          includeName: 'test-include'
        }
      };

      mockClient.request.mockResolvedValue(mockResponse);

      await getInclude(mockClient, {
        includeId: 'inc_12345',
        contractId: 'ctr_12345',
        groupId: 'grp_12345',
        version: 1
      });

      expect(mockClient.request).toHaveBeenCalledWith({
        path: '/papi/v1/includes/inc_12345/versions/1?contractId=ctr_12345&groupId=grp_12345',
        method: 'GET',
        customer: undefined
      });
    });
  });

  describe('createInclude', () => {
    it('should create include successfully', async () => {
      const mockResponse = {
        includeLink: '/papi/v1/includes/inc_12345?contractId=ctr_12345&groupId=grp_12345'
      };

      mockClient.request.mockResolvedValue(mockResponse);

      const result = await createInclude(mockClient, {
        includeName: 'new-include',
        includeType: 'MICROSERVICES',
        contractId: 'ctr_12345',
        groupId: 'grp_12345'
      });

      expect(result.content[0]?.text).toContain('Include Created Successfully');
      expect(result.content[0]?.text).toContain('new-include');
      expect(result.content[0]?.text).toContain('MICROSERVICES');
      expect(result.content[0]?.text).toContain('inc_12345');
    });

    it('should include clone from parameters when provided', async () => {
      const mockResponse = {
        includeLink: '/papi/v1/includes/inc_12345'
      };

      mockClient.request.mockResolvedValue(mockResponse);

      await createInclude(mockClient, {
        includeName: 'cloned-include',
        includeType: 'COMMON_SETTINGS',
        contractId: 'ctr_12345',
        groupId: 'grp_12345',
        cloneFrom: {
          includeId: 'inc_source',
          version: 1
        }
      });

      expect(mockClient.request).toHaveBeenCalledWith({
        path: '/papi/v1/includes',
        method: 'POST',
        body: {
          includeName: 'cloned-include',
          includeType: 'COMMON_SETTINGS',
          contractId: 'ctr_12345',
          groupId: 'grp_12345',
          cloneFrom: {
            includeId: 'inc_source',
            version: 1
          }
        },
        customer: undefined
      });
    });
  });

  describe('activateInclude', () => {
    it('should activate include successfully', async () => {
      const mockResponse = {
        activationLink: '/papi/v1/includes/inc_12345/activations/act_12345'
      };

      mockClient.request.mockResolvedValue(mockResponse);

      const result = await activateInclude(mockClient, {
        includeId: 'inc_12345',
        version: 1,
        network: 'STAGING',
        contractId: 'ctr_12345',
        groupId: 'grp_12345',
        note: 'Test activation'
      });

      expect(result.content[0]?.text).toContain('Include Activation Initiated');
      expect(result.content[0]?.text).toContain('inc_12345');
      expect(result.content[0]?.text).toContain('STAGING');
      expect(result.content[0]?.text).toContain('act_12345');
    });

    it('should include notification emails when provided', async () => {
      const mockResponse = {
        activationLink: '/papi/v1/includes/inc_12345/activations/act_12345'
      };

      mockClient.request.mockResolvedValue(mockResponse);

      await activateInclude(mockClient, {
        includeId: 'inc_12345',
        version: 1,
        network: 'PRODUCTION',
        contractId: 'ctr_12345',
        groupId: 'grp_12345',
        notifyEmails: ['test@example.com']
      });

      expect(mockClient.request).toHaveBeenCalledWith({
        path: '/papi/v1/includes/inc_12345/versions/1/activations?contractId=ctr_12345&groupId=grp_12345',
        method: 'POST',
        body: {
          network: 'PRODUCTION',
          note: 'Activating include inc_12345 v1 to PRODUCTION',
          acknowledgeAllWarnings: false,
          notifyEmails: ['test@example.com']
        },
        customer: undefined
      });
    });
  });

  describe('getIncludeActivationStatus', () => {
    it('should get activation status successfully', async () => {
      const mockResponse = {
        activations: {
          items: [{
            activationId: 'act_12345',
            includeVersion: 1,
            network: 'STAGING',
            status: 'ACTIVE',
            submitDate: '2023-01-01T00:00:00Z',
            updateDate: '2023-01-01T00:05:00Z'
          }]
        }
      };

      mockClient.request.mockResolvedValue(mockResponse);

      const result = await getIncludeActivationStatus(mockClient, {
        includeId: 'inc_12345',
        activationId: 'act_12345',
        contractId: 'ctr_12345',
        groupId: 'grp_12345'
      });

      expect(result.content[0]?.text).toContain('Include Activation Status');
      expect(result.content[0]?.text).toContain('act_12345');
      expect(result.content[0]?.text).toContain('ACTIVE');
      expect(result.content[0]?.text).toContain('STAGING');
    });

    it('should handle activation not found', async () => {
      const mockResponse = {
        activations: { items: [] }
      };

      mockClient.request.mockResolvedValue(mockResponse);

      const result = await getIncludeActivationStatus(mockClient, {
        includeId: 'inc_12345',
        activationId: 'act_nonexistent',
        contractId: 'ctr_12345',
        groupId: 'grp_12345'
      });

      expect(result.content[0]?.text).toContain('Activation act_nonexistent not found');
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      mockClient.request.mockRejectedValue(new Error('API Error'));

      const result = await listIncludes(mockClient, {
        contractId: 'ctr_12345',
        groupId: 'grp_12345'
      });

      expect(result.content[0]?.text).toContain('Error listing includes');
    });

    it('should handle network errors in include activation', async () => {
      mockClient.request.mockRejectedValue(new Error('Network timeout'));

      const result = await activateInclude(mockClient, {
        includeId: 'inc_12345',
        version: 1,
        network: 'STAGING',
        contractId: 'ctr_12345',
        groupId: 'grp_12345'
      });

      expect(result.content[0]?.text).toContain('Error activating include');
    });
  });

  describe('comprehensive workflow', () => {
    it('should support full include lifecycle', async () => {
      // Create include
      mockClient.request.mockResolvedValueOnce({
        includeLink: '/papi/v1/includes/inc_12345'
      });

      const createResult = await createInclude(mockClient, {
        includeName: 'test-workflow',
        includeType: 'MICROSERVICES',
        contractId: 'ctr_12345',
        groupId: 'grp_12345'
      });

      // Activate include
      mockClient.request.mockResolvedValueOnce({
        activationLink: '/papi/v1/includes/inc_12345/activations/act_12345'
      });

      const activateResult = await activateInclude(mockClient, {
        includeId: 'inc_12345',
        version: 1,
        network: 'STAGING',
        contractId: 'ctr_12345',
        groupId: 'grp_12345'
      });

      // Check activation status
      mockClient.request.mockResolvedValueOnce({
        activations: {
          items: [{
            activationId: 'act_12345',
            includeVersion: 1,
            network: 'STAGING',
            status: 'ACTIVE'
          }]
        }
      });

      const statusResult = await getIncludeActivationStatus(mockClient, {
        includeId: 'inc_12345',
        activationId: 'act_12345',
        contractId: 'ctr_12345',
        groupId: 'grp_12345'
      });

      expect(createResult.content[0]?.text).toContain('Include Created Successfully');
      expect(activateResult.content[0]?.text).toContain('Include Activation Initiated');
      expect(statusResult.content[0]?.text).toContain('ACTIVE');
    });
  });
});