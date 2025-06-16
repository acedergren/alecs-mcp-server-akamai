/**
 * Edge Hostname Management Tests
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { 
  createEdgeHostnameEnhanced,
  createBulkEdgeHostnames,
  getEdgeHostnameDetails,
  generateEdgeHostnameRecommendations,
  validateEdgeHostnameCertificate,
  associateCertificateWithEdgeHostname
} from '../tools/edge-hostname-management.js';
import { AkamaiClient } from '../akamai-client.js';

// Mock the AkamaiClient
jest.mock('../akamai-client.js');

describe('Edge Hostname Management', () => {
  let mockClient: jest.Mocked<AkamaiClient>;

  beforeEach(() => {
    mockClient = {
      request: jest.fn(),
    } as any;
    jest.clearAllMocks();
  });

  describe('createEdgeHostnameEnhanced', () => {
    it('should create edge hostname with intelligent defaults', async () => {
      const mockResponse = {
        edgeHostnameLink: '/papi/v1/edgehostnames/ehn_12345?contractId=ctr_1&groupId=grp_1',
        mapDetails: {
          serialNumber: '12345',
          slotNumber: 1
        }
      };

      mockClient.request.mockResolvedValueOnce(mockResponse);

      const result = await createEdgeHostnameEnhanced(mockClient, {
        domainPrefix: 'www.example.com',
        contractId: 'ctr_1',
        groupId: 'grp_1',
      });

      expect(mockClient.request).toHaveBeenCalledWith({
        path: '/papi/v1/edgehostnames',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'PAPI-Use-Prefixes': 'true',
        },
        queryParams: {
          contractId: 'ctr_1',
          groupId: 'grp_1',
          options: 'mapDetails',
        },
        body: expect.objectContaining({
          domainPrefix: 'www.example.com',
          domainSuffix: 'edgekey.net', // Default for secure
          secure: true,
          secureNetwork: 'ENHANCED_TLS',
          ipVersionBehavior: 'IPV4_IPV6',
          productId: 'prd_Ion',
        }),
      });

      expect(result.content[0].text).toContain('Edge Hostname Created Successfully');
      expect(result.content[0].text).toContain('www.example.com.edgekey.net');
    });

    it('should use property details when propertyId is provided', async () => {
      const mockPropertyResponse = {
        properties: {
          items: [{
            propertyId: 'prp_12345',
            contractId: 'ctr_1',
            groupId: 'grp_1',
            productId: 'prd_Ion'
          }]
        }
      };

      const mockEdgeHostnameResponse = {
        edgeHostnameLink: '/papi/v1/edgehostnames/ehn_12345',
      };

      mockClient.request
        .mockResolvedValueOnce(mockPropertyResponse)
        .mockResolvedValueOnce(mockEdgeHostnameResponse);

      await createEdgeHostnameEnhanced(mockClient, {
        domainPrefix: 'api.example.com',
        propertyId: 'prp_12345',
      });

      expect(mockClient.request).toHaveBeenCalledWith({
        path: '/papi/v1/properties/prp_12345',
        method: 'GET',
      });
    });
  });

  describe('createBulkEdgeHostnames', () => {
    it('should create multiple edge hostnames', async () => {
      const mockResponse = {
        edgeHostnameLink: '/papi/v1/edgehostnames/ehn_12345',
      };

      mockClient.request.mockResolvedValue(mockResponse);

      const result = await createBulkEdgeHostnames(mockClient, {
        hostnames: ['www.example.com', 'api.example.com'],
        contractId: 'ctr_1',
        groupId: 'grp_1',
        secure: true,
        domainSuffix: '.edgekey.net',
      });

      expect(mockClient.request).toHaveBeenCalledTimes(2);
      expect(result.content[0].text).toContain('Bulk Edge Hostname Creation Results');
    });

    it('should handle failures gracefully', async () => {
      mockClient.request
        .mockResolvedValueOnce({ edgeHostnameLink: '/papi/v1/edgehostnames/ehn_12345' })
        .mockRejectedValueOnce(new Error('API Error'));

      const result = await createBulkEdgeHostnames(mockClient, {
        hostnames: ['www.example.com', 'api.example.com'],
        contractId: 'ctr_1',
        groupId: 'grp_1',
        secure: true,
        domainSuffix: '.edgekey.net',
      });

      expect(result.content[0].text).toContain('Successful: 1');
      expect(result.content[0].text).toContain('Failed: 1');
    });
  });

  describe('getEdgeHostnameDetails', () => {
    it('should get edge hostname details by ID', async () => {
      const mockResponse = {
        edgeHostnames: {
          items: [{
            edgeHostnameId: 'ehn_12345',
            edgeHostnameDomain: 'www.example.com.edgekey.net',
            productId: 'prd_Ion',
            secure: true,
            ipVersionBehavior: 'IPV4_IPV6',
            status: 'ACTIVE',
            mapDetails: {
              serialNumber: '12345',
              slotNumber: 1
            }
          }]
        }
      };

      mockClient.request.mockResolvedValue(mockResponse);

      const result = await getEdgeHostnameDetails(mockClient, {
        edgeHostnameId: 'ehn_12345',
      });

      expect(mockClient.request).toHaveBeenCalledWith({
        path: '/papi/v1/edgehostnames/ehn_12345',
        method: 'GET',
        queryParams: {
          options: 'mapDetails,useCases',
        },
      });

      expect(result.content[0].text).toContain('www.example.com.edgekey.net');
      expect(result.content[0].text).toContain('Edge Hostname Details');
    });

    it('should find edge hostname by domain', async () => {
      const mockListResponse = {
        edgeHostnames: {
          items: [{
            edgeHostnameId: 'ehn_12345',
            edgeHostnameDomain: 'www.example.com.edgekey.net',
          }]
        }
      };

      const mockDetailsResponse = {
        edgeHostnames: {
          items: [{
            edgeHostnameId: 'ehn_12345',
            edgeHostnameDomain: 'www.example.com.edgekey.net',
            productId: 'prd_Ion',
          }]
        }
      };

      mockClient.request
        .mockResolvedValueOnce(mockListResponse)
        .mockResolvedValueOnce(mockDetailsResponse)
        .mockResolvedValue({ properties: { items: [] } });

      await getEdgeHostnameDetails(mockClient, {
        edgeHostnameDomain: 'www.example.com.edgekey.net',
      });

      expect(mockClient.request).toHaveBeenCalledWith({
        path: '/papi/v1/edgehostnames',
        method: 'GET',
        queryParams: {},
      });
    });
  });

  describe('generateEdgeHostnameRecommendations', () => {
    it('should generate recommendations for API endpoints', async () => {
      const result = await generateEdgeHostnameRecommendations(mockClient, {
        hostnames: ['api.example.com', 'api-v2.example.com'],
        purpose: 'api',
        securityRequirement: 'enhanced',
      });

      expect(result.content[0].text).toContain('Edge Hostname Recommendations');
      expect(result.content[0].text).toContain('.edgekey.net');
      expect(result.content[0].text).toContain('api.example.com');
    });

    it('should recommend non-secure for static content when appropriate', async () => {
      const result = await generateEdgeHostnameRecommendations(mockClient, {
        hostnames: ['static.example.com', 'cdn.example.com'],
        purpose: 'media',
        securityRequirement: 'standard',
      });

      expect(result.content[0].text).toContain('Edge Hostname Recommendations');
      // Should include recommendations for both secure and non-secure options
    });
  });

  describe('validateEdgeHostnameCertificate', () => {
    it('should validate certificate association', async () => {
      const mockResponse = {
        edgeHostnames: {
          items: [{
            edgeHostnameId: 'ehn_12345',
            edgeHostnameDomain: 'www.example.com.edgekey.net',
            secure: true,
            certEnrollmentId: 12345,
            certStatus: 'DEPLOYED',
          }]
        }
      };

      mockClient.request.mockResolvedValue(mockResponse);

      const result = await validateEdgeHostnameCertificate(mockClient, {
        edgeHostnameId: 'ehn_12345',
      });

      expect(result.content[0].text).toContain('Certificate Associated');
      expect(result.content[0].text).toContain('Enrollment ID: 12345');
    });

    it('should detect missing certificate', async () => {
      const mockResponse = {
        edgeHostnames: {
          items: [{
            edgeHostnameId: 'ehn_12345',
            edgeHostnameDomain: 'www.example.com.edgekey.net',
            secure: true,
            // No certEnrollmentId
          }]
        }
      };

      mockClient.request.mockResolvedValue(mockResponse);

      const result = await validateEdgeHostnameCertificate(mockClient, {
        edgeHostnameId: 'ehn_12345',
      });

      expect(result.content[0].text).toContain('No Certificate Associated');
      expect(result.content[0].text).toContain('Required Actions');
    });
  });

  describe('associateCertificateWithEdgeHostname', () => {
    it('should associate certificate with edge hostname', async () => {
      mockClient.request
        .mockResolvedValueOnce({}) // PUT response
        .mockResolvedValueOnce({ // GET response
          edgeHostnames: {
            items: [{
              edgeHostnameDomain: 'www.example.com.edgekey.net',
            }]
          }
        });

      const result = await associateCertificateWithEdgeHostname(mockClient, {
        edgeHostnameId: 'ehn_12345',
        certificateEnrollmentId: 12345,
      });

      expect(mockClient.request).toHaveBeenCalledWith({
        path: '/papi/v1/edgehostnames/ehn_12345',
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: {
          certEnrollmentId: 12345,
        },
      });

      expect(result.content[0].text).toContain('Certificate Associated Successfully');
    });
  });
});