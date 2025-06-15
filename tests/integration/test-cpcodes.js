#!/usr/bin/env node

/**
 * Test CP Code functionality
 */

const { AkamaiClient } = require('./dist/akamai-client.js');
const { listCPCodes, createCPCode, getCPCode } = require('./dist/tools/cpcode-tools.js');

async function testCPCodes() {
  console.log('🔍 Testing CP Code functionality...\n');
  
  try {
    const client = new AkamaiClient();
    
    // Test 1: List existing CP Codes
    console.log('Test 1: Listing existing CP Codes');
    console.log('==================================');
    const listResult = await listCPCodes(client, {
      contractId: 'ctr_1-5C13O2',
      groupId: 'grp_125952',
    });
    
    console.log('List CP Codes Result:');
    console.log(listResult.content[0].text);
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Test 2: Create a new CP Code
    console.log('Test 2: Creating a new CP Code');
    console.log('==============================');
    const createResult = await createCPCode(client, {
      cpcodeName: 'test-cpcode-' + Date.now(),
      contractId: 'ctr_1-5C13O2',
      groupId: 'grp_125952',
      productId: 'prd_Site_Accel',
      timeZone: 'GMT',
    });
    
    console.log('Create CP Code Result:');
    console.log(createResult.content[0].text);
    
    // Extract CP Code ID from the result
    const cpcodeMatch = createResult.content[0].text.match(/Numeric ID:\*\* (\d+)/);
    const createdCPCode = cpcodeMatch ? cpcodeMatch[1] : null;
    
    if (createdCPCode) {
      console.log('\n' + '='.repeat(50) + '\n');
      
      // Test 3: Get details of the created CP Code
      console.log('Test 3: Getting CP Code details');
      console.log('===============================');
      const getResult = await getCPCode(client, {
        cpcodeId: createdCPCode,
      });
      
      console.log('Get CP Code Result:');
      console.log(getResult.content[0].text);
    }
    
  } catch (error) {
    console.error('❌ CP Code test failed:', error.message);
    if (error.response?.data) {
      console.error('API Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testCPCodes();