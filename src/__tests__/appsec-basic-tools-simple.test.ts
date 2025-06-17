/**
 * Simple test suite for Basic Akamai Application Security Tools
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { 
  listAppSecConfigurations,
  getAppSecConfiguration,
  createWAFPolicy
} from '../tools/security/appsec-basic-tools-v2';

// Import AkamaiClient for mocking
import { AkamaiClient } from '../akamai-client';

// Mock AkamaiClient
jest.mock('../akamai-client', () => ({
  AkamaiClient: jest.fn().mockImplementation(() => ({
    request: jest.fn()
  }))
}));

describe('Basic Application Security Tools', () => {
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockClient = {
      request: jest.fn()
    };

    (AkamaiClient as jest.MockedClass<typeof AkamaiClient>).mockImplementation(() => mockClient);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Configuration Management', () => {
    it('should list APPSEC configurations successfully', async () => {
      const mockConfigurations = {
        configurations: [
          {
            id: 12345,
            name: 'Test Security Config',
            description: 'Test configuration',
            latestVersion: 3,
            productionVersion: 2,
            stagingVersion: 3
          }
        ]
      };

      mockClient.request.mockResolvedValue(mockConfigurations);

      const result = await listAppSecConfigurations.handler({});

      expect(result.success).toBe(true);
      expect(result.data.configurations).toHaveLength(1);
      expect(result.data.configurations[0].id).toBe(12345);
      expect(mockClient.request).toHaveBeenCalledWith({
        path: '/appsec/v1/configs',
        method: 'GET'
      });
    });

    it('should get specific APPSEC configuration', async () => {
      const mockConfiguration = {
        id: 12345,
        name: 'Test Security Config',
        version: 3
      };

      mockClient.request.mockResolvedValue(mockConfiguration);

      const result = await getAppSecConfiguration.handler({
        configId: 12345,
        version: 3
      });

      expect(result.success).toBe(true);
      expect(result.data.configuration.id).toBe(12345);
      expect(mockClient.request).toHaveBeenCalledWith({
        path: '/appsec/v1/configs/12345?version=3',
        method: 'GET'
      });
    });

    it('should handle configuration errors gracefully', async () => {
      mockClient.request.mockRejectedValue(new Error('Configuration not found'));

      const result = await getAppSecConfiguration.handler({
        configId: 99999
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Configuration not found');
    });
  });

  describe('WAF Policy Management', () => {
    it('should create WAF policy successfully', async () => {
      const mockPolicy = {
        policyId: 'pol_12345',
        policyName: 'Test WAF Policy',
        policyMode: 'ASE_AUTO'
      };

      mockClient.request.mockResolvedValue(mockPolicy);

      const result = await createWAFPolicy.handler({
        configId: 12345,
        policyName: 'Test WAF Policy',
        policyMode: 'ASE_AUTO',
        paranoidLevel: 3
      });

      expect(result.success).toBe(true);
      expect(result.data.policyId).toBe('pol_12345');
      expect(result.data.message).toContain('Test WAF Policy');
      expect(mockClient.request).toHaveBeenCalledWith({
        path: '/appsec/v1/configs/12345/versions/1/security-policies',
        method: 'POST',
        body: {
          policyName: 'Test WAF Policy',
          policyMode: 'ASE_AUTO',
          paranoidLevel: 3
        }
      });
    });

    it('should handle WAF policy creation errors', async () => {
      mockClient.request.mockRejectedValue(new Error('Policy creation failed'));

      const result = await createWAFPolicy.handler({
        configId: 12345,
        policyName: 'Test Policy',
        policyMode: 'ASE_AUTO'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Policy creation failed');
    });
  });

  describe('Tool Structure Validation', () => {
    it('should have correct tool structure', () => {
      const tools = [
        listAppSecConfigurations,
        getAppSecConfiguration,
        createWAFPolicy
      ];

      tools.forEach(tool => {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('inputSchema');
        expect(tool).toHaveProperty('handler');
        expect(typeof tool.name).toBe('string');
        expect(typeof tool.description).toBe('string');
        expect(typeof tool.inputSchema).toBe('object');
        expect(typeof tool.handler).toBe('function');
      });
    });

    it('should have unique tool names', () => {
      const tools = [
        listAppSecConfigurations,
        getAppSecConfiguration,
        createWAFPolicy
      ];

      const names = tools.map(tool => tool.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockClient.request.mockRejectedValue(new Error('Network error'));

      const result = await listAppSecConfigurations.handler({});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });
  });
});