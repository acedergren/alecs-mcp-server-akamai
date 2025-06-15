#!/usr/bin/env node

/**
 * Test different PAPI request formats
 */

const { AkamaiClient } = require('./dist/akamai-client.js');

async function testPAPIFormats() {
  console.log('🔍 Testing different PAPI request formats...\n');
  
  const client = new AkamaiClient();
  const contractId = 'ctr_C-1FRYVV3';
  const groupId = 'grp_125952';
  
  // Test 1: Standard format from documentation
  console.log('Test 1: Standard format (query params + body)');
  console.log('============================================');
  try {
    const response1 = await client.request({
      path: `/papi/v1/properties?contractId=${contractId}&groupId=${groupId}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: {
        productId: 'prd_Site_Accel',
        propertyName: 'test-format-1'
      },
    });
    console.log('✅ Test 1 succeeded');
    console.log('Property link:', response1.propertyLink);
  } catch (error) {
    console.log('❌ Test 1 failed:', error.message);
    if (error.response?.data) {
      console.log('API Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
  
  console.log('\n');
  
  // Test 2: Body only (no query params)
  console.log('Test 2: Body parameters only');
  console.log('============================');
  try {
    const response2 = await client.request({
      path: '/papi/v1/properties',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: {
        productId: 'prd_Site_Accel',
        propertyName: 'test-format-2',
        contractId: contractId,
        groupId: groupId
      },
    });
    console.log('✅ Test 2 succeeded');
    console.log('Property link:', response2.propertyLink);
  } catch (error) {
    console.log('❌ Test 2 failed:', error.message);
    if (error.response?.data) {
      console.log('API Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
  
  console.log('\n');
  
  // Test 3: Check if group exists and has correct contract
  console.log('Test 3: Verify group and contract relationship');
  console.log('==============================================');
  try {
    const groups = await client.request({
      path: '/papi/v1/groups',
      method: 'GET',
    });
    
    const targetGroup = groups.groups?.items?.find(g => g.groupId === groupId);
    if (targetGroup) {
      console.log(`✅ Group found: ${targetGroup.groupName}`);
      console.log(`Contracts in group: ${targetGroup.contractIds?.join(', ')}`);
      
      const hasContract = targetGroup.contractIds?.includes(contractId);
      console.log(`Contract ${contractId} in group: ${hasContract ? '✅ Yes' : '❌ No'}`);
      
      if (!hasContract) {
        console.log(`Available contracts in this group: ${targetGroup.contractIds?.join(', ')}`);
      }
    } else {
      console.log(`❌ Group ${groupId} not found`);
    }
  } catch (error) {
    console.log('❌ Test 3 failed:', error.message);
  }
}

testPAPIFormats();