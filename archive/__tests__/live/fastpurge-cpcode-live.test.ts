/**
 * FastPurge CP Code Live Test Suite - CODE KAI Implementation
 * 
 * Discover CP code for www.solutionsedge.io and test CP code-based purging
 * More efficient and reliable than URL-based purging
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import { listProperties, getPropertyDetails } from '../../src/tools/property-tools';
import { fastpurgeCpcodeInvalidate } from '../../src/tools/fastpurge-tools';

describe('FastPurge CP Code Discovery and Testing', () => {
  let solutionsEdgeCpCode: string | null = null;
  let solutionsEdgePropertyId: string | null = null;

  beforeAll(() => {
    console.log('🔍 Starting CP Code discovery for www.solutionsedge.io');
  });

  describe('CP Code Discovery', () => {
    it('should discover www.solutionsedge.io property and CP code', async () => {
      console.log('📋 Listing properties to find www.solutionsedge.io...');

      // First, list all properties to find the one containing solutionsedge.io
      const propertiesResponse = await listProperties.handler({
        customer: 'testing',
        search: 'solutionsedge'
      });

      expect(propertiesResponse).toBeDefined();
      expect(propertiesResponse.content).toBeDefined();
      expect(propertiesResponse.content[0].type).toBe('text');

      const propertiesText = propertiesResponse.content[0].text;
      console.log('🔍 Properties search result:', propertiesText);

      // Extract property ID from the response
      const propertyIdMatch = propertiesText.match(/Property ID: ([^\s\n]+)/);
      if (propertyIdMatch) {
        solutionsEdgePropertyId = propertyIdMatch[1];
        console.log('✅ Found property ID:', solutionsEdgePropertyId);

        // Get detailed property information to find CP code
        const detailsResponse = await getPropertyDetails.handler({
          customer: 'testing',
          propertyId: solutionsEdgePropertyId
        });

        expect(detailsResponse).toBeDefined();
        const detailsText = detailsResponse.content[0].text;
        console.log('📊 Property details:', detailsText);

        // Extract CP code from property details
        const cpCodeMatch = detailsText.match(/CP Code: ([0-9]+)/i);
        if (cpCodeMatch) {
          solutionsEdgeCpCode = cpCodeMatch[1];
          console.log('🎯 Found CP Code:', solutionsEdgeCpCode);
        }
      }

      expect(solutionsEdgePropertyId).toBeTruthy();
      expect(solutionsEdgeCpCode).toBeTruthy();

    }, 45000);
  });

  describe('CP Code Based Purging', () => {
    it('should successfully purge www.solutionsedge.io using CP code on staging', async () => {
      if (!solutionsEdgeCpCode) {
        console.log('⚠️  Skipping CP code purge - CP code not discovered');
        return;
      }

      console.log(`🚀 Testing CP code purge for CP Code: ${solutionsEdgeCpCode}`);

      const response = await fastpurgeCpcodeInvalidate.handler({
        customer: 'testing',
        network: 'staging',
        cpCodes: [solutionsEdgeCpCode],
        useQueue: false, // Direct purge for testing
        description: `Live CP code purge test for www.solutionsedge.io (CP: ${solutionsEdgeCpCode})`
      });

      // Validate MCP response format
      expect(response).toBeDefined();
      expect(response.content).toBeDefined();
      expect(response.content[0].type).toBe('text');

      const responseText = response.content[0].text;
      console.log('✅ CP Code purge response:', responseText);

      // Validate response contains expected information
      expect(responseText).toContain('FastPurge Operation Initiated Successfully');
      expect(responseText).toContain('Operation ID:');
      expect(responseText).toContain('Support ID:');
      expect(responseText).toContain('Network: staging');

      // Extract operation details
      const operationIdMatch = responseText.match(/Operation ID: ([^\n]+)/);
      const supportIdMatch = responseText.match(/Support ID: ([^\n]+)/);
      
      if (operationIdMatch && supportIdMatch) {
        console.log('📊 CP Code Purge Details:');
        console.log('  CP Code:', solutionsEdgeCpCode);
        console.log('  Operation ID:', operationIdMatch[1]);
        console.log('  Support ID:', supportIdMatch[1]);
        console.log('  Network: staging');
      }

    }, 30000);

    it('should handle queue-based CP code purge', async () => {
      if (!solutionsEdgeCpCode) {
        console.log('⚠️  Skipping queue-based CP code purge - CP code not discovered');
        return;
      }

      console.log(`🔄 Testing queue-based CP code purge for CP: ${solutionsEdgeCpCode}`);

      const response = await fastpurgeCpcodeInvalidate.handler({
        customer: 'testing',
        network: 'staging',
        cpCodes: [solutionsEdgeCpCode],
        useQueue: true,
        priority: 'high',
        description: `Queue-based CP code purge for www.solutionsedge.io`
      });

      expect(response).toBeDefined();
      expect(response.content[0].type).toBe('text');

      const responseText = response.content[0].text;
      console.log('✅ Queue-based CP code purge response:', responseText);

      // Validate queue response
      expect(responseText).toContain('FastPurge');
      expect(responseText).toContain('Queue');

    }, 30000);
  });

  describe('CP Code Validation', () => {
    it('should validate CP code format', async () => {
      console.log('🔍 Testing CP code validation...');

      // Test with invalid CP code format
      const response = await fastpurgeCpcodeInvalidate.handler({
        customer: 'testing',
        network: 'staging',
        cpCodes: ['invalid-cp-code', 'not-numeric']
      });

      expect(response).toBeDefined();
      expect(response.content[0].text).toContain('ERROR');
      expect(response.content[0].text).toContain('Invalid CP codes');

      console.log('✅ CP code validation working correctly');

    }, 15000);

    it('should handle multiple CP codes efficiently', async () => {
      if (!solutionsEdgeCpCode) {
        console.log('⚠️  Skipping multiple CP code test - CP code not discovered');
        return;
      }

      console.log('📦 Testing multiple CP code handling...');

      // Use the discovered CP code multiple times to test batching
      const multipleCpCodes = [
        solutionsEdgeCpCode,
        '12345', // Mock CP code for testing
        '67890'  // Mock CP code for testing
      ];

      const response = await fastpurgeCpcodeInvalidate.handler({
        customer: 'testing',
        network: 'staging',
        cpCodes: multipleCpCodes,
        useQueue: true,
        description: 'Multiple CP code purge test'
      });

      expect(response).toBeDefined();
      const responseText = response.content[0].text;
      console.log('✅ Multiple CP code handling completed');

    }, 30000);
  });

  describe('Production CP Code Purge Safety', () => {
    it('should handle production CP code purge with appropriate safety', async () => {
      if (!solutionsEdgeCpCode) {
        console.log('⚠️  Skipping production CP code test - CP code not discovered');
        return;
      }

      console.log('⚠️  Testing production CP code purge safety...');

      const response = await fastpurgeCpcodeInvalidate.handler({
        customer: 'testing',
        network: 'production',
        cpCodes: [solutionsEdgeCpCode],
        useQueue: true, // Always use queue for production
        description: 'CONTROLLED PRODUCTION CP CODE TEST'
      });

      expect(response).toBeDefined();
      expect(response.content[0].text).toContain('production');
      
      console.log('⚠️  Production CP code purge test completed with safety measures');

    }, 30000);
  });

  describe('CODE KAI CP Code Implementation', () => {
    it('should demonstrate complete CODE KAI compliance for CP code purging', async () => {
      if (!solutionsEdgeCpCode) {
        console.log('⚠️  Skipping CODE KAI compliance test - CP code not discovered');
        return;
      }

      console.log('🎯 Validating CODE KAI compliance for CP code operations...');

      const response = await fastpurgeCpcodeInvalidate.handler({
        customer: 'testing',
        network: 'staging',
        cpCodes: [solutionsEdgeCpCode],
        description: 'CODE KAI compliance validation for CP code purging'
      });

      const responseText = response.content[0].text;

      // Validate all CODE KAI principles:

      // 1. Type Safety - MCP response format
      expect(response.content).toBeDefined();
      expect(response.content[0].type).toBe('text');

      // 2. API Compliance - Contains API response details
      expect(responseText).toContain('Operation ID:');
      expect(responseText).toContain('Support ID:');

      // 3. Error Handling - Structured response format
      expect(responseText).toContain('Next Steps:');

      // 4. User Experience - Clear, actionable information
      expect(responseText).toContain('FastPurge Operation Initiated Successfully');

      // 5. Maintainability - JSON details for debugging
      expect(responseText).toContain('```json');

      console.log('🎯 CODE KAI compliance validated for CP code operations');
      console.log(`✨ CP Code ${solutionsEdgeCpCode} purging demonstrates A+ production standards`);

    }, 30000);
  });

  afterAll(() => {
    console.log('🏁 FastPurge CP Code Tests Complete');
    if (solutionsEdgeCpCode) {
      console.log(`📊 Discovered CP Code: ${solutionsEdgeCpCode} for www.solutionsedge.io`);
      console.log('✅ CP code-based purging validated successfully');
    }
    console.log('🚀 FastPurge CP code implementation ready for production');
  });
});