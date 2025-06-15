#!/usr/bin/env tsx

import { AkamaiClient } from './src/akamai-client';
import { getProperty } from './src/tools/property-tools';

async function testGetProperty() {
  console.log('Testing get_property function...\n');
  
  try {
    // Initialize client
    const client = new AkamaiClient('default');
    
    // Test 1: Try with a property ID
    console.log('Test 1: Get property by ID (prp_12345)');
    const result1 = await getProperty(client, { propertyId: 'prp_12345' });
    console.log('Result:', JSON.stringify(result1, null, 2));
    
    // Test 2: Try with a hostname
    console.log('\n\nTest 2: Get property by hostname (example.com)');
    const result2 = await getProperty(client, { propertyId: 'example.com' });
    console.log('Result:', JSON.stringify(result2, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the test
testGetProperty();