#!/usr/bin/env node

/**
 * Test basic API connectivity
 */

import { AkamaiClient } from './src/akamai-client';
import { listGroups } from './src/tools/property-tools';

async function testConnection() {
  console.log('🔌 Testing Akamai API Connection...\n');
  
  try {
    const client = new AkamaiClient();
    console.log('✅ AkamaiClient initialized\n');
    
    console.log('📋 Attempting to list groups...');
    const result = await listGroups(client, {});
    
    console.log('✅ API call successful!\n');
    console.log('Response preview:');
    console.log(result.content[0].text.substring(0, 500) + '...\n');
    
    return true;
  } catch (error) {
    console.error('❌ API connection failed:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
    }
    return false;
  }
}

testConnection();