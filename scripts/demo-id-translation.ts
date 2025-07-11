#!/usr/bin/env tsx

/**
 * Demonstration of ID Translation Integration
 * 
 * This script shows how the ID translation service is integrated into BaseTool
 * and automatically translates Akamai IDs to human-readable names
 */

import { BaseTool } from '../src/tools/common/base-tool';
import { idTranslationService } from '../src/services/id-translation-service';

async function demonstrateIdTranslation() {
  console.log('ID Translation Integration Demo\n');
  console.log('==============================\n');

  // Mock response that would typically come from Akamai API
  const mockApiResponse = {
    properties: {
      items: [
        {
          propertyId: 'prp_123456',
          propertyName: 'www.example.com',
          contractId: 'ctr_C-1234567',
          groupId: 'grp_98765',
          productId: 'prd_Web_Accel',
          latestVersion: 5,
          productionVersion: 4,
          stagingVersion: 5
        },
        {
          propertyId: 'prp_789012',
          propertyName: 'api.example.com',
          contractId: 'ctr_C-1234567',
          groupId: 'grp_98765',
          productId: 'prd_API_Accel',
          latestVersion: 12,
          productionVersion: 11,
          stagingVersion: 12
        }
      ]
    },
    totalItems: 2
  };

  console.log('1. Original API Response (with cryptic IDs):');
  console.log('-------------------------------------------');
  console.log(JSON.stringify(mockApiResponse, null, 2));
  console.log('\n');

  // Create a mock client that simulates translation lookups
  const mockClient = {
    request: async (options: any) => {
      // Simulate API calls for translations
      if (options.path === '/papi/v1/contracts') {
        return {
          contracts: {
            items: [
              { contractId: 'ctr_C-1234567', contractTypeName: 'Web Performance' }
            ]
          }
        };
      }
      if (options.path === '/papi/v1/groups') {
        return {
          groups: {
            items: [
              { groupId: 'grp_98765', groupName: 'Production Properties' }
            ]
          }
        };
      }
      if (options.path === '/papi/v1/products') {
        return {
          products: {
            items: [
              { productId: 'prd_Web_Accel', productName: 'Ion Standard' },
              { productId: 'prd_API_Accel', productName: 'API Acceleration' }
            ]
          }
        };
      }
      return {};
    }
  };

  // Set the mock client for translation service
  idTranslationService.setClient(mockClient);

  console.log('2. Executing with ID Translation Enabled:');
  console.log('----------------------------------------');
  
  try {
    // Execute with translation using BaseTool
    const result = await BaseTool.execute(
      'property',
      'property_list',
      { customer: 'demo' },
      async () => mockApiResponse,
      {
        format: 'json',
        translation: {
          enabled: true,
          mappings: BaseTool.COMMON_TRANSLATIONS['property'] || []
        }
      }
    );

    console.log('Translated Response:');
    const translatedContent = JSON.parse(result.content[0]?.text || '{}');
    console.log(JSON.stringify(translatedContent, null, 2));
    console.log('\n');

    // Show what was added by translation
    console.log('3. Translation Enhancements:');
    console.log('---------------------------');
    const firstProperty = translatedContent.properties?.items?.[0];
    if (firstProperty) {
      console.log('Original fields:');
      console.log(`  - contractId: ${firstProperty.contractId}`);
      console.log(`  - groupId: ${firstProperty.groupId}`);
      console.log(`  - productId: ${firstProperty.productId}`);
      console.log('\nAdded by translation:');
      console.log(`  - contractName: ${firstProperty.contractName || 'Not translated'}`);
      console.log(`  - groupName: ${firstProperty.groupName || 'Not translated'}`);
      console.log(`  - productName: ${firstProperty.productName || 'Not translated'}`);
    }
    console.log('\n');

    // Show cache statistics
    console.log('4. Translation Cache Statistics:');
    console.log('-------------------------------');
    const cacheStats = idTranslationService.getCacheStats();
    console.log(`  - Cache size: ${cacheStats.size} entries`);
    console.log(`  - Max cache size: ${cacheStats.maxSize} entries`);
    console.log(`  - Cache efficiency: ${((cacheStats.size / 6) * 100).toFixed(0)}% hit rate on second call`);
    console.log('\n');

    // Show available translation mappings
    console.log('5. Available Translation Mappings:');
    console.log('---------------------------------');
    console.log('Domain-specific mappings:');
    for (const [domain, mappings] of Object.entries(BaseTool.COMMON_TRANSLATIONS)) {
      console.log(`  - ${domain}: ${mappings.length} mappings`);
    }
    console.log('\n');

    console.log('Property domain mappings include:');
    const propertyMappings = BaseTool.COMMON_TRANSLATIONS['property'] || [];
    propertyMappings.slice(0, 5).forEach(mapping => {
      console.log(`  - ${mapping.path} → ${mapping.type}`);
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the demonstration
demonstrateIdTranslation().catch(console.error);