/**
 * User Journey Test: Property Onboarding
 * 
 * This test simulates a complete user journey for onboarding a new property
 * to Akamai CDN, including:
 * 1. Creating a property
 * 2. Configuring edge hostnames
 * 3. Setting up certificates
 * 4. Configuring rules
 * 5. Activating to staging and production
 */

import { describe, it, expect, jest, beforeAll, afterAll } from '@jest/globals';
import { AkamaiClient } from '../../../src/akamai-client';
import { SmartCache } from '../../../src/utils/smart-cache';
import { AkamaiCacheService } from '../../../src/services/akamai-cache-service';

// Mock tools
import * as propertyTools from '../../../src/tools/property-tools-cached';
import * as propertyManagerTools from '../../../src/tools/property-manager-tools';
import * as onboardingTools from '../../../src/tools/property-onboarding-tools';

describe('User Journey: Property Onboarding', () => {
  let client: AkamaiClient;
  let cache: SmartCache;
  let cacheService: AkamaiCacheService;
  
  // Test data
  const testHostname = 'test.example.com';
  const testOrigin = 'origin.example.com';
  const testPropertyId = 'prp_12345';
  const testContractId = 'ctr_1-ABC123';
  const testGroupId = 'grp_12345';
  const testProductId = 'prd_Fresca';
  
  beforeAll(() => {
    // Initialize test dependencies
    client = new AkamaiClient('testing');
    cache = new SmartCache({ maxSize: 1000 });
    cacheService = new AkamaiCacheService(cache);
    
    // Mock the client request method
    jest.spyOn(client, 'request').mockImplementation(async (options) => {
      // Return appropriate mocked responses based on the path
      const path = options.path;
      
      // Groups endpoint
      if (path.includes('/papi/v1/groups')) {
        return {
          groups: {
            items: [{
              groupId: testGroupId,
              groupName: 'Test Group',
              contractIds: [testContractId]
            }]
          }
        };
      }
      
      // Contracts endpoint
      if (path.includes('/papi/v1/contracts')) {
        return {
          contracts: {
            items: [{
              contractId: testContractId,
              contractTypeName: 'Test Contract'
            }]
          }
        };
      }
      
      // Products endpoint
      if (path.includes('/papi/v1/products')) {
        return {
          products: {
            items: [{
              productId: testProductId,
              productName: 'Ion Standard'
            }]
          }
        };
      }
      
      // Property creation
      if (path.includes('/papi/v1/properties') && options.method === 'POST') {
        return {
          propertyLink: `/papi/v1/properties/${testPropertyId}`
        };
      }
      
      // Property details
      if (path.includes(`/papi/v1/properties/${testPropertyId}`)) {
        return {
          properties: {
            items: [{
              propertyId: testPropertyId,
              propertyName: 'test.example.com',
              latestVersion: 1,
              productionVersion: null,
              stagingVersion: null
            }]
          }
        };
      }
      
      // Property rules
      if (path.includes('/papi/v1/properties/') && path.includes('/rules')) {
        return {
          rules: {
            name: 'default',
            children: [],
            behaviors: [{
              name: 'origin',
              options: {
                hostname: testOrigin,
                forwardHostHeader: 'REQUEST_HOST_HEADER'
              }
            }]
          }
        };
      }
      
      // Edge hostname creation
      if (path.includes('/hapi/v1/edge-hostnames') && options.method === 'POST') {
        return {
          edgeHostnameLink: '/hapi/v1/edge-hostnames/ehn_12345'
        };
      }
      
      // Property activation
      if (path.includes('/papi/v1/properties/') && path.includes('/activations')) {
        return {
          activationLink: '/papi/v1/properties/prp_12345/activations/atv_12345'
        };
      }
      
      // Activation status
      if (path.includes('/activations/atv_')) {
        return {
          activations: {
            items: [{
              activationId: 'atv_12345',
              status: 'ACTIVE',
              network: options.path.includes('STAGING') ? 'STAGING' : 'PRODUCTION'
            }]
          }
        };
      }
      
      return {};
    });
  });
  
  afterAll(async () => {
    await cache.close();
    jest.restoreAllMocks();
  });
  
  describe('Complete Property Onboarding Flow', () => {
    it('should successfully onboard a new property from start to finish', async () => {
      // Step 1: Get available groups and contracts
      console.log('Step 1: Fetching groups and contracts...');
      const groups = await propertyTools.listGroups(client, {});
      expect(groups.groups.items).toHaveLength(1);
      expect(groups.groups.items[0].groupId).toBe(testGroupId);
      
      const contracts = await propertyTools.listContracts(client, {});
      expect(contracts.contracts.items).toHaveLength(1);
      expect(contracts.contracts.items[0].contractId).toBe(testContractId);
      
      // Step 2: Create new property
      console.log('Step 2: Creating new property...');
      const createResult = await propertyTools.createProperty(client, {
        propertyName: testHostname,
        productId: testProductId,
        contractId: testContractId,
        groupId: testGroupId
      });
      expect(createResult.propertyLink).toContain(testPropertyId);
      
      // Step 3: Get property details
      console.log('Step 3: Fetching property details...');
      const propertyDetails = await propertyTools.getProperty(client, {
        propertyId: testPropertyId
      });
      expect(propertyDetails.properties.items[0].propertyId).toBe(testPropertyId);
      
      // Step 4: Create edge hostname
      console.log('Step 4: Creating edge hostname...');
      const edgeHostname = await propertyManagerTools.createEdgeHostname(client, {
        domainPrefix: testHostname.split('.')[0],
        domainSuffix: 'edgesuite.net',
        productId: testProductId,
        secure: true
      });
      expect(edgeHostname.edgeHostnameLink).toBeDefined();
      
      // Step 5: Update property with hostnames
      console.log('Step 5: Adding hostnames to property...');
      const hostnameResult = await propertyManagerTools.addPropertyHostname(client, {
        propertyId: testPropertyId,
        version: 1,
        hostnames: [{
          cnameType: 'EDGE_HOSTNAME',
          cnameFrom: testHostname,
          cnameTo: `${testHostname.split('.')[0]}.edgesuite.net`
        }]
      });
      expect(hostnameResult.status).toBe('success');
      
      // Step 6: Configure property rules (origin server)
      console.log('Step 6: Configuring property rules...');
      const rules = await propertyManagerTools.getPropertyRules(client, {
        propertyId: testPropertyId,
        version: 1
      });
      expect(rules.rules).toBeDefined();
      expect(rules.rules.behaviors).toContainEqual(
        expect.objectContaining({
          name: 'origin',
          options: expect.objectContaining({
            hostname: testOrigin
          })
        })
      );
      
      // Step 7: Activate to staging
      console.log('Step 7: Activating to staging...');
      const stagingActivation = await propertyManagerTools.activateProperty(client, {
        propertyId: testPropertyId,
        version: 1,
        network: 'STAGING',
        note: 'Initial staging activation'
      });
      expect(stagingActivation.activationLink).toBeDefined();
      
      // Step 8: Check staging activation status
      console.log('Step 8: Checking staging activation...');
      const stagingStatus = await propertyManagerTools.getActivationStatus(client, {
        propertyId: testPropertyId,
        activationId: 'atv_12345'
      });
      expect(stagingStatus.activations.items[0].status).toBe('ACTIVE');
      
      // Step 9: Activate to production
      console.log('Step 9: Activating to production...');
      const productionActivation = await propertyManagerTools.activateProperty(client, {
        propertyId: testPropertyId,
        version: 1,
        network: 'PRODUCTION',
        note: 'Initial production activation'
      });
      expect(productionActivation.activationLink).toBeDefined();
      
      // Step 10: Verify complete onboarding
      console.log('Step 10: Verifying onboarding completion...');
      const finalStatus = await onboardingTools.checkOnboardingStatus(client, {
        hostname: testHostname,
        propertyId: testPropertyId
      });
      
      expect(finalStatus.status).toBe('completed');
      expect(finalStatus.steps).toEqual(expect.objectContaining({
        propertyCreated: true,
        edgeHostnameCreated: true,
        certificateProvisioned: true,
        originConfigured: true,
        stagingActivated: true,
        productionActivated: true
      }));
    });
    
    it('should handle onboarding with the wizard tool', async () => {
      // Test the simplified wizard approach
      const wizardResult = await onboardingTools.onboardPropertyWizard(client, {
        hostname: testHostname
      });
      
      expect(wizardResult.status).toBe('in_progress');
      expect(wizardResult.currentStep).toBe('property_creation');
      expect(wizardResult.instructions).toContain('property');
    });
  });
  
  describe('Error Handling', () => {
    it('should handle missing contracts gracefully', async () => {
      jest.spyOn(client, 'request').mockResolvedValueOnce({
        contracts: { items: [] }
      });
      
      const contracts = await propertyTools.listContracts(client, {});
      expect(contracts.contracts.items).toHaveLength(0);
    });
    
    it('should handle property creation failures', async () => {
      jest.spyOn(client, 'request').mockRejectedValueOnce(
        new Error('Insufficient permissions')
      );
      
      await expect(
        propertyTools.createProperty(client, {
          propertyName: 'fail.example.com',
          productId: testProductId,
          contractId: testContractId,
          groupId: testGroupId
        })
      ).rejects.toThrow('Insufficient permissions');
    });
  });
  
  describe('Performance', () => {
    it('should cache repeated requests', async () => {
      const spy = jest.spyOn(client, 'request');
      
      // First call - should hit API
      await propertyTools.listGroups(client, { useCache: true });
      expect(spy).toHaveBeenCalledTimes(1);
      
      // Second call - should hit cache
      await propertyTools.listGroups(client, { useCache: true });
      expect(spy).toHaveBeenCalledTimes(1); // Still 1, not 2
      
      // Third call with cache bypass
      await propertyTools.listGroups(client, { useCache: false });
      expect(spy).toHaveBeenCalledTimes(2);
    });
  });
});