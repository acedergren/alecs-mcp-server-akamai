#!/usr/bin/env tsx
/**
 * Test Proper Changelist Workflow based on Akamai API Documentation
 * 
 * Workflow:
 * 1. Create a changelist explicitly using POST /changelists?zone={zone}
 * 2. Add record changes using POST /changelists/{zone}/recordsets/add-change
 * 3. Submit the changelist using POST /changelists/{zone}/submit
 */

import { AkamaiClient } from './src/akamai-client';

const TEST_CONFIG = {
  zone: 'solutionsedge.io',
  recordName: 'live-test',
  recordType: 'A',
  recordTTL: 300,
  recordIP: '172.234.120.21',
  get fullDomain() {
    return `${this.recordName}.${this.zone}`;
  }
};

async function testProperChangelistWorkflow() {
  console.log('🚀 Testing Proper Changelist Workflow');
  console.log('=====================================');
  console.log(`Zone: ${TEST_CONFIG.zone}`);
  console.log(`Test Record: ${TEST_CONFIG.fullDomain} → ${TEST_CONFIG.recordIP}`);
  console.log('');

  const client = new AkamaiClient();

  try {
    // Step 1: Create a new changelist
    console.log('📝 Step 1: Creating a new changelist...');
    
    const changelistResponse = await client.request({
      path: '/config-dns/v2/changelists',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      queryParams: {
        zone: TEST_CONFIG.zone
      }
    });
    
    console.log('✅ Changelist created:');
    console.log(`   Zone: ${changelistResponse.zone}`);
    console.log(`   Change Tag: ${changelistResponse.changeTag}`);
    console.log(`   Zone Version ID: ${changelistResponse.zoneVersionId}`);
    console.log(`   Stale: ${changelistResponse.stale}`);
    console.log('');

    // Step 2: Add record change to the changelist
    console.log('📝 Step 2: Adding record change to changelist...');
    console.log(`   Operation: ADD`);
    console.log(`   Record: ${TEST_CONFIG.fullDomain} ${TEST_CONFIG.recordType} ${TEST_CONFIG.recordIP}`);
    
    await client.request({
      path: `/config-dns/v2/changelists/${TEST_CONFIG.zone}/recordsets/add-change`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: {
        name: TEST_CONFIG.fullDomain,
        type: TEST_CONFIG.recordType,
        op: 'ADD',
        ttl: TEST_CONFIG.recordTTL,
        rdata: [TEST_CONFIG.recordIP]
      }
    });
    
    console.log('✅ Record change added to changelist');
    console.log('');

    // Step 3: Verify changelist contents
    console.log('📋 Step 3: Verifying changelist contents...');
    
    const changelistContents = await client.request({
      path: `/config-dns/v2/changelists/${TEST_CONFIG.zone}/recordsets`,
      method: 'GET',
      headers: { Accept: 'application/json' }
    });
    
    if (changelistContents && changelistContents.recordsets) {
      console.log(`   Total records in changelist: ${changelistContents.recordsets.length}`);
      
      const ourRecord = changelistContents.recordsets.find(
        (r: any) => r.name === TEST_CONFIG.fullDomain && r.type === TEST_CONFIG.recordType
      );
      
      if (ourRecord) {
        console.log('✅ Our record found in changelist:');
        console.log(`   ${ourRecord.name} ${ourRecord.ttl} ${ourRecord.type} ${ourRecord.rdata.join(' ')}`);
      }
    }
    console.log('');

    // Step 4: Submit the changelist
    console.log('📤 Step 4: Submitting changelist...');
    
    const submitResponse = await client.request({
      path: `/config-dns/v2/changelists/${TEST_CONFIG.zone}/submit`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: {
        comment: `Test: Adding ${TEST_CONFIG.fullDomain} record`,
        skipSignAndServeSafetyCheck: false,
        validateOnly: false
      }
    });
    
    console.log('✅ Changelist submitted successfully');
    if (submitResponse.requestId) {
      console.log(`   Request ID: ${submitResponse.requestId}`);
    }
    console.log('');

    // Step 5: Clean up - Delete the record
    console.log('🧹 Step 5: Cleaning up...');
    
    // Create new changelist for deletion
    await client.request({
      path: '/config-dns/v2/changelists',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      queryParams: {
        zone: TEST_CONFIG.zone
      }
    });
    
    // Add delete operation
    await client.request({
      path: `/config-dns/v2/changelists/${TEST_CONFIG.zone}/recordsets/add-change`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: {
        name: TEST_CONFIG.fullDomain,
        type: TEST_CONFIG.recordType,
        op: 'DELETE'
      }
    });
    
    // Submit deletion
    await client.request({
      path: `/config-dns/v2/changelists/${TEST_CONFIG.zone}/submit`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: {
        comment: `Test: Removing ${TEST_CONFIG.fullDomain} record`
      }
    });
    
    console.log('✅ Record deleted successfully');
    console.log('');

    // Summary
    console.log('📊 Proper Changelist Workflow Summary');
    console.log('=====================================');
    console.log('✅ Changelist Creation: Success (POST /changelists?zone={zone})');
    console.log('✅ Record Addition: Success (POST /changelists/{zone}/recordsets/add-change)');
    console.log('✅ Changelist Submission: Success (POST /changelists/{zone}/submit)');
    console.log('✅ Cleanup: Success');
    console.log('');
    console.log('🎯 Proper changelist workflow working correctly!');

  } catch (error) {
    console.error('');
    console.error('💥 Test failed:', error instanceof Error ? error.message : String(error));
    
    if (error instanceof Error && 'response' in error) {
      const axiosError = error as any;
      if (axiosError.response) {
        console.error('   Status:', axiosError.response.status);
        console.error('   API Error:', JSON.stringify(axiosError.response.data, null, 2));
      }
    }
    
    throw error;
  }
}

// Run the test
if (require.main === module) {
  console.log('');
  testProperChangelistWorkflow()
    .then(() => {
      console.log('');
      process.exit(0);
    })
    .catch((error) => {
      console.error('');
      console.error('Test failed:', error);
      process.exit(1);
    });
}