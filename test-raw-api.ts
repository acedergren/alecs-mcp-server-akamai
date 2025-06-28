#!/usr/bin/env tsx
/**
 * Test raw API responses to understand their structure
 */

import { AkamaiClient } from './src/akamai-client';

async function testRawAPI() {
  const client = new AkamaiClient();
  
  console.log('Testing raw API responses...\n');
  
  // Test authorities endpoint
  try {
    console.log('1. GET /data/authorities');
    const authResponse = await client.request({
      path: '/config-dns/v2/data/authorities',
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    console.log('Response:', JSON.stringify(authResponse, null, 2));
  } catch (error: any) {
    console.error('Error:', error.response?.data || error.message);
  }
  
  console.log('\n---\n');
  
  // Test contracts endpoint
  try {
    console.log('2. GET /data/contracts');
    const contractsResponse = await client.request({
      path: '/config-dns/v2/data/contracts',
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    console.log('Response:', JSON.stringify(contractsResponse, null, 2));
  } catch (error: any) {
    console.error('Error:', error.response?.data || error.message);
  }
  
  console.log('\n---\n');
  
  // Test record types endpoint
  try {
    console.log('3. GET /data/recordsets/types');
    const typesResponse = await client.request({
      path: '/config-dns/v2/data/recordsets/types',
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    console.log('Response:', JSON.stringify(typesResponse, null, 2));
  } catch (error: any) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testRawAPI();