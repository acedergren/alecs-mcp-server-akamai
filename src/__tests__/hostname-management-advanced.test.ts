/**
 * Tests for Advanced Hostname Management Tools
 */

import { AkamaiClient } from '../akamai-client';
import {
  analyzeHostnameOwnership,
  generateEdgeHostnameRecommendations,
  validateHostnamesBulk,
  findOptimalPropertyAssignment,
  createHostnameProvisioningPlan
} from '../tools/hostname-management-advanced';

// Mock the AkamaiClient
jest.mock('../akamai-client');

describe('Advanced Hostname Management Tools', () => {
  let mockClient: jest.Mocked<AkamaiClient>;

  beforeEach(() => {
    mockClient = new AkamaiClient('test') as jest.Mocked<AkamaiClient>;
    mockClient.request = jest.fn();
  });

  describe('analyzeHostnameOwnership', () => {
    it('should analyze hostname ownership successfully', async () => {
      const mockResponse = {
        hostnames: {
          items: [
            {
              cnameFrom: 'www.example.com',
              cnameTo: 'www.example.com.edgekey.net',
              propertyId: 'prp_12345',
              propertyName: 'example-property',
              propertyVersion: 1,
              stagingStatus: 'ACTIVE',
              productionStatus: 'ACTIVE'
            }
          ]
        }
      };

      mockClient.request.mockResolvedValue(mockResponse);

      const result = await analyzeHostnameOwnership(mockClient, {
        hostnames: ['www.example.com', 'api.example.com'],
        includeWildcardAnalysis: true,
        includeRecommendations: true
      });

      expect(mockClient.request).toHaveBeenCalled();
      expect(result.content[0]?.text).toContain('Hostname Ownership Analysis');
      expect(result.content[0]?.text).toContain('www.example.com');
    });

    it('should detect wildcard conflicts', async () => {
      const mockResponse = {
        hostnames: {
          items: [
            {
              cnameFrom: '*.example.com',
              cnameTo: 'wildcard.example.com.edgekey.net',
              propertyId: 'prp_99999',
              propertyName: 'wildcard-property',
              propertyVersion: 1
            }
          ]
        }
      };

      mockClient.request.mockResolvedValue(mockResponse);

      const result = await analyzeHostnameOwnership(mockClient, {
        hostnames: ['subdomain.example.com'],
        includeWildcardAnalysis: true
      });

      expect(result.content[0]?.text).toContain('wildcard');
    });
  });

  describe('generateEdgeHostnameRecommendations', () => {
    it('should generate edge hostname recommendations', async () => {
      const result = await generateEdgeHostnameRecommendations(mockClient, {
        hostnames: ['www.example.com', 'api.example.com', 'static.example.com'],
        forceSecure: true
      });

      expect(result.content[0]?.text).toContain('Edge Hostname Recommendations');
      expect(result.content[0]?.text).toContain('.edgekey.net');
      expect(result.content[0]?.text).toContain('api.example.com');
    });

    it('should recommend different suffixes based on content type', async () => {
      const result = await generateEdgeHostnameRecommendations(mockClient, {
        hostnames: ['static.example.com', 'cdn.example.com'],
        forceSecure: false
      });

      expect(result.content[0]?.text).toContain('Edge Hostname Recommendations');
      // Static content might use edgesuite.net when not forced secure
      expect(result.content[0]?.text).toMatch(/\.(edgesuite|edgekey)\.net/);
    });
  });

  describe('validateHostnamesBulk', () => {
    it('should validate hostnames successfully', async () => {
      mockClient.request.mockResolvedValue({
        hostnames: { items: [] }
      });

      const result = await validateHostnamesBulk(mockClient, {
        hostnames: [
          'www.example.com',
          'api.example.com',
          'invalid_hostname',
          'hostname-with-very-long-label-that-exceeds-63-characters-limit-test.com'
        ]
      });

      expect(result.content[0]?.text).toContain('Bulk Hostname Validation Results');
      expect(result.content[0]?.text).toContain('Valid');
      expect(result.content[0]?.text).toContain('Invalid');
    });

    it('should detect hostname conflicts', async () => {
      mockClient.request.mockResolvedValue({
        hostnames: {
          items: [{
            cnameFrom: 'www.example.com',
            propertyId: 'prp_12345'
          }]
        }
      });

      const result = await validateHostnamesBulk(mockClient, {
        hostnames: ['www.example.com'],
        checkDNS: true
      });

      expect(result.content[0]?.text).toContain('Conflicts');
    });
  });

  describe('findOptimalPropertyAssignment', () => {
    it('should find optimal property assignments', async () => {
      mockClient.request.mockResolvedValue({
        properties: { items: [] }
      });

      const result = await findOptimalPropertyAssignment(mockClient, {
        hostnames: [
          'www.example.com',
          'api.example.com',
          'static.example.com',
          'www.another.com'
        ],
        groupingStrategy: 'by-domain'
      });

      expect(result.content[0]?.text).toContain('Optimal Property Assignment Analysis');
      expect(result.content[0]?.text).toContain('Property Group');
      expect(result.content[0]?.text).toContain('example.com');
    });

    it('should suggest wildcard certificates', async () => {
      mockClient.request.mockResolvedValue({
        properties: { items: [] }
      });

      const result = await findOptimalPropertyAssignment(mockClient, {
        hostnames: [
          'www.example.com',
          'api.example.com',
          'app.example.com',
          'static.example.com'
        ],
        groupingStrategy: 'auto'
      });

      expect(result.content[0]?.text).toContain('Certificate Optimization');
      expect(result.content[0]?.text).toContain('wildcard');
    });
  });

  describe('createHostnameProvisioningPlan', () => {
    it('should create comprehensive provisioning plan', async () => {
      // Mock validation response
      mockClient.request.mockResolvedValueOnce({
        hostnames: { items: [] }
      });

      // Mock the internal tool calls
      const validateHostnamesBulkSpy = jest.spyOn(
        require('../tools/hostname-management-advanced'),
        'validateHostnamesBulk'
      ).mockResolvedValue({
        content: [{
          type: 'text',
          text: '## ✅ Valid Hostnames (2)\n- www.example.com\n- api.example.com\n'
        }]
      });

      const analyzeOwnershipSpy = jest.spyOn(
        require('../tools/hostname-management-advanced'),
        'analyzeHostnameOwnership'
      ).mockResolvedValue({
        content: [{
          type: 'text',
          text: 'Ownership analysis results'
        }]
      });

      const result = await createHostnameProvisioningPlan(mockClient, {
        hostnames: ['www.example.com', 'api.example.com'],
        contractId: 'ctr_12345',
        groupId: 'grp_12345',
        securityLevel: 'enhanced'
      });

      expect(result.content[0]?.text).toContain('Comprehensive Hostname Provisioning Plan');
      expect(result.content[0]?.text).toContain('ctr_12345');
      expect(result.content[0]?.text).toContain('Execution Timeline');

      validateHostnamesBulkSpy.mockRestore();
      analyzeOwnershipSpy.mockRestore();
    });

    it('should handle invalid hostnames', async () => {
      const validateHostnamesBulkSpy = jest.spyOn(
        require('../tools/hostname-management-advanced'),
        'validateHostnamesBulk'
      ).mockResolvedValue({
        content: [{
          type: 'text',
          text: '## ✅ Valid Hostnames (0)\n'
        }]
      });

      const result = await createHostnameProvisioningPlan(mockClient, {
        hostnames: ['invalid_hostname'],
        contractId: 'ctr_12345',
        groupId: 'grp_12345'
      });

      expect(result.content[0]?.text).toContain('No valid hostnames found');

      validateHostnamesBulkSpy.mockRestore();
    });
  });
});