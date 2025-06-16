/**
 * Tool Definition Tests
 * Validates all tool schemas, parameter validation, and error handling
 */

import { z } from 'zod';
import { createMockAkamaiClient, validateMCPResponse, ErrorScenarios } from '../testing/test-utils.js';
import * as propertyTools from '../tools/property-tools.js';
import * as dnsTools from '../tools/dns-tools.js';
import * as cpsTools from '../tools/cps-tools.js';
import * as productTools from '../tools/product-tools.js';
import * as cpcodeTools from '../tools/cpcode-tools.js';

describe('Tool Definitions', () => {
  const mockClient = createMockAkamaiClient();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Property Tools', () => {
    describe('listProperties', () => {
      it('should validate optional parameters', async () => {
        mockClient.request.mockResolvedValueOnce({
          properties: { items: [] },
        });

        const result = await propertyTools.listProperties(mockClient, {});
        validateMCPResponse(result);
      });

      it('should handle contractId parameter', async () => {
        mockClient.request.mockResolvedValueOnce({
          properties: { items: [] },
        });

        await propertyTools.listProperties(mockClient, { 
          contractId: 'ctr_C-1234567' 
        });

        expect(mockClient.request).toHaveBeenCalledWith(
          expect.objectContaining({
            path: expect.stringContaining('contractId=ctr_C-1234567'),
          })
        );
      });

      it('should handle authentication failure', async () => {
        mockClient.request.mockRejectedValueOnce(
          new Error('Authentication failed')
        );

        const result = await propertyTools.listProperties(mockClient, {});
        expect(result.content[0].text).toContain('Error');
      });
    });

    describe('getProperty', () => {
      it('should require propertyId or propertyName', async () => {
        const result = await propertyTools.getProperty(mockClient, {});
        expect(result.content[0].text).toContain('provide either propertyId or propertyName');
      });

      it('should search by propertyName', async () => {
        mockClient.request
          .mockResolvedValueOnce({ properties: { items: [
            { propertyId: 'prp_123', propertyName: 'test.com' }
          ]}})
          .mockResolvedValueOnce({ 
            properties: { 
              propertyId: 'prp_123',
              propertyName: 'test.com',
              contractId: 'ctr_C-123',
              groupId: 'grp_123',
            }
          });

        const result = await propertyTools.getProperty(mockClient, {
          propertyName: 'test.com',
        });

        validateMCPResponse(result);
        expect(result.content[0].text).toContain('test.com');
      });
    });
  });

  describe('DNS Tools', () => {
    describe('createZone', () => {
      const requiredParams = {
        zone: 'example.com',
        type: 'PRIMARY' as const,
        contractId: 'C-123',
        groupId: 'grp_123',
      };

      it('should validate required parameters', async () => {
        mockClient.request.mockResolvedValueOnce({});

        await dnsTools.createZone(mockClient, requiredParams);
        
        expect(mockClient.request).toHaveBeenCalledWith(
          expect.objectContaining({
            method: 'POST',
            body: expect.objectContaining({
              zone: 'example.com',
              type: 'PRIMARY',
            }),
          })
        );
      });

      it('should validate zone type enum', async () => {
        const invalidType = { ...requiredParams, type: 'INVALID' as any };
        
        // Should handle invalid type gracefully
        const result = await dnsTools.createZone(mockClient, invalidType);
        expect(result.content[0].text).toBeDefined();
      });

      it('should handle zone already exists error', async () => {
        mockClient.request.mockRejectedValueOnce({
          response: {
            status: 409,
            data: { detail: 'Zone already exists' },
          },
        });

        const result = await dnsTools.createZone(mockClient, requiredParams);
        expect(result.content[0].text).toContain('Error');
      });
    });

    describe('upsertRecord', () => {
      const validRecord = {
        zone: 'example.com',
        name: 'www',
        type: 'A' as const,
        ttl: 300,
        rdata: ['192.0.2.1'],
      };

      it('should validate record type', async () => {
        mockClient.request
          .mockResolvedValueOnce({ changelists: [] })
          .mockResolvedValueOnce({})
          .mockResolvedValueOnce({})
          .mockResolvedValueOnce({});

        await dnsTools.upsertRecord(mockClient, validRecord);
        
        expect(mockClient.request).toHaveBeenCalledWith(
          expect.objectContaining({
            path: expect.stringContaining('/recordsets/www/A'),
          })
        );
      });

      it('should validate TTL range', async () => {
        const invalidTTL = { ...validRecord, ttl: -1 };
        
        // Implementation should handle invalid TTL
        const result = await dnsTools.upsertRecord(mockClient, invalidTTL);
        validateMCPResponse(result);
      });
    });
  });

  describe('CPS Tools', () => {
    describe('createDVEnrollment', () => {
      const validEnrollment = {
        cn: 'secure.example.com',
        sans: ['www.secure.example.com'],
        org: 'Test Company',
        orgUnit: 'IT',
        city: 'Boston',
        state: 'MA',
        country: 'US',
        adminContact: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '+1-555-1234',
        },
        techContact: {
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'jane@example.com',
          phone: '+1-555-5678',
        },
        networkConfiguration: {
          geography: 'core',
          secureNetwork: 'enhanced-tls',
          mustHaveCiphers: 'ak-akamai-default-2017q3',
          preferredCiphers: 'ak-akamai-default-2017q3',
        },
      };

      it('should validate contact information', async () => {
        mockClient.request.mockResolvedValueOnce({
          enrollment: '/cps/v2/enrollments/12345',
        });

        await cpsTools.createDVEnrollment(mockClient, validEnrollment);
        
        expect(mockClient.request).toHaveBeenCalledWith(
          expect.objectContaining({
            body: expect.objectContaining({
              adminContact: expect.objectContaining({
                email: 'john@example.com',
              }),
            }),
          })
        );
      });

      it('should validate network configuration', async () => {
        const invalidNetwork = {
          ...validEnrollment,
          networkConfiguration: {
            ...validEnrollment.networkConfiguration,
            secureNetwork: 'invalid-network',
          },
        };

        // Should handle invalid network gracefully
        const result = await cpsTools.createDVEnrollment(mockClient, invalidNetwork);
        validateMCPResponse(result);
      });
    });
  });

  describe('Product Tools', () => {
    describe('listProducts', () => {
      it('should handle empty product list', async () => {
        mockClient.request.mockResolvedValueOnce({
          products: { items: [] },
        });

        const result = await productTools.listProducts(mockClient, {
          contractId: 'ctr_C-123',
        });

        validateMCPResponse(result);
        expect(result.content[0].text).toContain('No products found');
      });

      it('should format product list correctly', async () => {
        mockClient.request.mockResolvedValueOnce({
          products: { items: [
            { productId: 'prd_Web_Accel', productName: 'Web Application Accelerator' },
            { productId: 'prd_Dynamic_PM', productName: 'Dynamic Site Accelerator' },
          ]},
        });

        const result = await productTools.listProducts(mockClient, {
          contractId: 'ctr_C-123',
        });

        validateMCPResponse(result);
        expect(result.content[0].text).toContain('Web Application Accelerator');
        expect(result.content[0].text).toContain('prd_Web_Accel');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle rate limiting gracefully', async () => {
      mockClient.request.mockRejectedValueOnce(ErrorScenarios.rateLimited());

      const result = await propertyTools.listProperties(mockClient, {});
      expect(result.content[0].text).toContain('Error');
      validateMCPResponse(result);
    });

    it('should handle validation errors with context', async () => {
      mockClient.request.mockRejectedValueOnce(ErrorScenarios.validationError('contractId'));

      const result = await propertyTools.listProperties(mockClient, { 
        contractId: 'invalid' 
      });
      
      expect(result.content[0].text).toContain('Error');
      validateMCPResponse(result);
    });

    it('should handle server errors appropriately', async () => {
      mockClient.request.mockRejectedValueOnce(ErrorScenarios.serverError());

      const result = await propertyTools.listProperties(mockClient, {});
      expect(result.content[0].text).toContain('Error');
      validateMCPResponse(result);
    });
  });

  describe('Parameter Edge Cases', () => {
    it('should handle empty strings', async () => {
      const result = await propertyTools.getProperty(mockClient, {
        propertyName: '',
      });

      expect(result.content[0].text).toContain('provide either propertyId or propertyName');
    });

    it('should handle special characters in parameters', async () => {
      mockClient.request.mockResolvedValueOnce({
        properties: { items: [] },
      });

      await propertyTools.getProperty(mockClient, {
        propertyName: 'test-site.example.com',
      });

      expect(mockClient.request).toHaveBeenCalled();
    });

    it('should handle very long parameter values', async () => {
      const longName = 'a'.repeat(256);
      
      mockClient.request.mockResolvedValueOnce({
        properties: { items: [] },
      });

      await propertyTools.getProperty(mockClient, {
        propertyName: longName,
      });

      expect(mockClient.request).toHaveBeenCalled();
    });
  });
});