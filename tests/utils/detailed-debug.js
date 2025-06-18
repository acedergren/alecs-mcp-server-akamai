#!/usr/bin/env node

/**
 * Detailed debug script to capture exact API errors
 */

const { AkamaiClient } = require('./dist/akamai-client.js');

async function detailedDebug() {
  console.log('🔍 Running detailed API debug...\n');
  
  try {
    const client = new AkamaiClient();
    
    // Test 1: Check basic connectivity
    console.log('Test 1: Basic API connectivity');
    console.log('================================');
    try {
      const groups = await client.request({
        path: '/papi/v1/groups',
        method: 'GET',
      });
      console.log(`✅ Groups API works (found ${groups.groups?.items?.length || 0} groups)`);
    } catch (error) {
      console.log(`❌ Groups API failed: ${error.message}`);
      return;
    }
    
    // Test 2: Check rule formats
    console.log('\nTest 2: Rule formats API');
    console.log('========================');
    try {
      const formats = await client.request({
        path: '/papi/v1/rule-formats',
        method: 'GET',
      });
      const latestFormat = formats.ruleFormats?.items?.[0] || 'latest';
      console.log(`✅ Rule formats API works (latest: ${latestFormat})`);
    } catch (error) {
      console.log(`❌ Rule formats API failed: ${error.message}`);
    }
    
    // Test 3: Attempt property creation with detailed error capture
    console.log('\nTest 3: Property creation attempt');
    console.log('==================================');
    
    const contractId = 'ctr_C-1FRYVV3';
    const groupId = 'grp_125952';
    
    const propertyData = {
      propertyName: 'debug-test-property',
      productId: 'prd_Site_Accel',
      contractId: contractId,
      groupId: groupId,
      ruleFormat: 'latest',
    };
    
    console.log(`Contract ID: ${contractId}`);
    console.log(`Group ID: ${groupId}`);
    console.log(`Property data:`, JSON.stringify(propertyData, null, 2));
    
    try {
      const response = await client.request({
        path: `/papi/v1/properties?contractId=${contractId}&groupId=${groupId}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: propertyData,
      });
      
      console.log('✅ Property creation succeeded!');
      console.log('Property link:', response.propertyLink);
      
    } catch (error) {
      console.log('❌ Property creation failed');
      console.log('Error message:', error.message);
      
      // Try to get more details from the error response
      if (error.response && error.response.data) {
        console.log('API Error Response:', JSON.stringify(error.response.data, null, 2));
      }
      
      if (error.config) {
        console.log('Request URL:', error.config.url);
        console.log('Request method:', error.config.method);
        console.log('Request headers:', JSON.stringify(error.config.headers, null, 2));
        console.log('Request body:', JSON.stringify(error.config.data, null, 2));
      }
    }
    
  } catch (error) {
    console.error('❌ Script failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

detailedDebug();