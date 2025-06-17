#!/usr/bin/env node

/**
 * Test edge hostname creation with the corrected format
 */

const { AkamaiClient } = require('./dist/akamai-client.js');

async function testEdgeHostname() {
  console.log('🔍 Testing edge hostname creation...\n');
  
  try {
    const client = new AkamaiClient();
    
    // First create a test property
    console.log('Step 1: Creating test property...');
    const propertyResponse = await client.request({
      path: '/papi/v1/properties',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      queryParams: {
        contractId: 'ctr_1-5C13O2',
        groupId: 'grp_125952',
      },
      body: {
        propertyName: 'test-edge-hostname',
        productId: 'prd_Site_Accel',
        ruleFormat: 'latest'
      },
    });
    
    const propertyId = propertyResponse.propertyLink?.split('/').pop()?.split('?')[0];
    console.log(`✅ Created property: ${propertyId}`);
    
    // Get property details for edge hostname creation
    console.log('\nStep 2: Getting property details...');
    const propertyDetailsResponse = await client.request({
      path: `/papi/v1/properties/${propertyId}`,
      method: 'GET',
    });
    
    const property = propertyDetailsResponse.properties.items[0];
    console.log(`✅ Property details retrieved: ${property.propertyName}`);
    
    // Create edge hostname using the corrected format
    console.log('\nStep 3: Creating edge hostname...');
    const edgeHostnameResponse = await client.request({
      path: '/papi/v1/edgehostnames',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'PAPI-Use-Prefixes': 'true',
      },
      queryParams: {
        contractId: property.contractId,
        groupId: property.groupId,
        options: 'mapDetails',
      },
      body: {
        productId: property.productId,
        domainPrefix: 'test-edge-hostname',
        domainSuffix: 'edgekey.net',
        secure: true,
        secureNetwork: 'ENHANCED_TLS',
        ipVersionBehavior: 'IPV4_IPV6',
        useCases: [
          {
            "useCase": "Download_Mode",
            "option": "BACKGROUND",
            "type": "GLOBAL"
          }
        ]
      },
    });
    
    console.log('✅ Edge hostname creation response:');
    console.log(JSON.stringify(edgeHostnameResponse, null, 2));
    
    const edgeHostnameId = edgeHostnameResponse.edgeHostnameLink?.split('/').pop()?.split('?')[0];
    const edgeHostnameDomain = 'test-edge-hostname.edgekey.net';
    
    console.log(`\n✅ Edge Hostname Created:`);
    console.log(`- ID: ${edgeHostnameId}`);
    console.log(`- Domain: ${edgeHostnameDomain}`);
    console.log(`- Type: Enhanced TLS (Secure by Default)`);
    
  } catch (error) {
    console.error('❌ Edge hostname test failed:', error.message);
    if (error.response?.data) {
      console.error('API Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testEdgeHostname();