#!/usr/bin/env tsx

/**
 * Test script for ID translation integration
 * 
 * This script demonstrates how ID translation works with BaseTool
 * by making a property list request and showing the translated IDs
 */

import { BaseTool } from '../src/tools/common/base-tool';
import { listProperties } from '../src/tools/property/property-tools';
import { idTranslationService } from '../src/services/id-translation-service';

async function testIdTranslation() {
  console.log('Testing ID Translation Integration\n');
  console.log('=================================\n');

  try {
    // Test 1: List properties with translation enabled
    console.log('1. Testing property list with ID translation:');
    console.log('---------------------------------------------');
    
    const result = await listProperties({
      customer: 'default',
      limit: '5'
    });

    // The translation happens automatically inside BaseTool.execute
    console.log('Response received (IDs should be translated):');
    console.log(result.content[0].text);
    console.log('\n');

    // Test 2: Show cache statistics
    console.log('2. Translation cache statistics:');
    console.log('--------------------------------');
    const cacheStats = idTranslationService.getCacheStats();
    console.log(`Cache size: ${cacheStats.size}`);
    console.log(`Max cache size: ${cacheStats.maxSize}`);
    console.log('Cached entries:');
    cacheStats.entries.slice(0, 5).forEach(entry => {
      console.log(`  - ${entry.key} (age: ${Math.round(entry.age / 1000)}s)`);
    });
    console.log('\n');

    // Test 3: Direct translation test
    console.log('3. Testing direct ID translation:');
    console.log('---------------------------------');
    
    // Create a mock response with IDs
    const mockResponse = {
      properties: {
        items: [
          {
            propertyId: 'prp_123456',
            propertyName: 'Test Property',
            contractId: 'ctr_C-1234567',
            groupId: 'grp_98765',
            productId: 'prd_Web_Accel'
          }
        ]
      }
    };

    console.log('Original response:');
    console.log(JSON.stringify(mockResponse, null, 2));
    console.log('\n');

    // Demonstrate how BaseTool would translate this
    const translatedResponse = await BaseTool.execute(
      'property',
      'test_translation',
      { customer: 'default' },
      async () => mockResponse,
      {
        format: 'json',
        translation: {
          enabled: true,
          mappings: BaseTool.COMMON_TRANSLATIONS.property
        }
      }
    );

    console.log('Translated response:');
    console.log(translatedResponse.content[0].text);
    console.log('\n');

    // Test 4: Show available translation mappings
    console.log('4. Available translation mappings:');
    console.log('----------------------------------');
    console.log('Property domain mappings:');
    BaseTool.COMMON_TRANSLATIONS.property.forEach(mapping => {
      console.log(`  - ${mapping.path} -> ${mapping.type}`);
    });
    console.log('\n');

    console.log('All domains with translations:');
    Object.keys(BaseTool.COMMON_TRANSLATIONS).forEach(domain => {
      console.log(`  - ${domain}: ${BaseTool.COMMON_TRANSLATIONS[domain].length} mappings`);
    });

  } catch (error) {
    console.error('Error during ID translation test:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
  }
}

// Run the test
testIdTranslation().catch(console.error);