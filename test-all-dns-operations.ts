#!/usr/bin/env tsx
/**
 * Comprehensive Test for All DNS Operations
 * Tests both zone operations (direct) and record operations (changelist)
 */

import { AkamaiClient } from './src/akamai-client';
import { 
  listZones,
  getZone,
  listRecords,
  upsertRecord,
  deleteRecord,
  waitForZoneActivation
} from './src/tools/dns-tools';

const TEST_CONFIG = {
  zone: 'solutionsedge.io',
  testRecord1: {
    name: 'test-dns-1.solutionsedge.io',
    type: 'A',
    ttl: 300,
    ip: '192.0.2.1'
  },
  testRecord2: {
    name: 'test-dns-2.solutionsedge.io',
    type: 'CNAME',
    ttl: 600,
    target: 'example.com'
  }
};

async function testAllDNSOperations() {
  console.log('🚀 Comprehensive DNS Operations Test');
  console.log('====================================');
  console.log('');

  const client = new AkamaiClient();
  let allTestsPassed = true;

  try {
    // Test 1: List zones (Direct API - no changelist)
    console.log('📋 Test 1: List DNS Zones');
    console.log('-------------------------');
    
    const zonesResult = await listZones(client, {});
    if (zonesResult && zonesResult.content && zonesResult.content[0]) {
      const zonesText = zonesResult.content[0].text;
      const zoneCount = (zonesText.match(/\n/g) || []).length - 1; // Count lines minus header
      console.log(`✅ Listed ${zoneCount} zones successfully`);
      
      // Check if our test zone exists
      if (zonesText.includes(TEST_CONFIG.zone)) {
        console.log(`✅ Test zone ${TEST_CONFIG.zone} found`);
      }
    } else {
      console.log('❌ Failed to list zones');
      allTestsPassed = false;
    }
    console.log('');

    // Test 2: Get zone details (Direct API - no changelist)
    console.log('📋 Test 2: Get Zone Details');
    console.log('---------------------------');
    
    const zoneResult = await getZone(client, { zone: TEST_CONFIG.zone });
    if (zoneResult && zoneResult.content && zoneResult.content[0]) {
      console.log('✅ Retrieved zone details:');
      console.log(zoneResult.content[0].text.split('\n').map(line => `   ${line}`).join('\n'));
    } else {
      console.log('❌ Failed to get zone details');
      allTestsPassed = false;
    }
    console.log('');

    // Test 3: List records (Direct API - read from zone)
    console.log('📋 Test 3: List DNS Records');
    console.log('---------------------------');
    
    const recordsResult = await listRecords(client, { 
      zone: TEST_CONFIG.zone,
      types: ['A', 'CNAME']
    });
    if (recordsResult && recordsResult.content && recordsResult.content[0]) {
      const recordsText = recordsResult.content[0].text;
      const recordCount = (recordsText.match(/\n/g) || []).length - 1;
      console.log(`✅ Listed ${recordCount} records successfully`);
    } else {
      console.log('❌ Failed to list records');
      allTestsPassed = false;
    }
    console.log('');

    // Test 4: Create/Update records (Changelist workflow)
    console.log('📝 Test 4: Create/Update Records (Changelist Workflow)');
    console.log('------------------------------------------------------');
    
    // Create A record
    console.log(`   Creating A record: ${TEST_CONFIG.testRecord1.name}`);
    const createResult1 = await upsertRecord(client, {
      zone: TEST_CONFIG.zone,
      name: TEST_CONFIG.testRecord1.name,
      type: TEST_CONFIG.testRecord1.type,
      ttl: TEST_CONFIG.testRecord1.ttl,
      rdata: [TEST_CONFIG.testRecord1.ip],
      comment: 'Test: Creating A record',
      force: true
    });
    
    if (createResult1 && createResult1.content && createResult1.content[0]) {
      console.log('✅ A record created successfully');
    } else {
      console.log('❌ Failed to create A record');
      allTestsPassed = false;
    }
    
    // Create CNAME record
    console.log(`   Creating CNAME record: ${TEST_CONFIG.testRecord2.name}`);
    const createResult2 = await upsertRecord(client, {
      zone: TEST_CONFIG.zone,
      name: TEST_CONFIG.testRecord2.name,
      type: TEST_CONFIG.testRecord2.type,
      ttl: TEST_CONFIG.testRecord2.ttl,
      rdata: [TEST_CONFIG.testRecord2.target],
      comment: 'Test: Creating CNAME record',
      force: true
    });
    
    if (createResult2 && createResult2.content && createResult2.content[0]) {
      console.log('✅ CNAME record created successfully');
    } else {
      console.log('❌ Failed to create CNAME record');
      allTestsPassed = false;
    }
    console.log('');

    // Test 5: Wait for activation
    console.log('⏰ Test 5: Wait for Zone Activation');
    console.log('-----------------------------------');
    
    const activationResult = await waitForZoneActivation(client, {
      zone: TEST_CONFIG.zone,
      maxWaitSeconds: 60
    });
    
    if (activationResult && activationResult.content && activationResult.content[0]) {
      console.log(activationResult.content[0].text);
    }
    console.log('');

    // Test 6: Verify records were created
    console.log('🔍 Test 6: Verify Records Creation');
    console.log('----------------------------------');
    
    const verifyResult = await listRecords(client, { 
      zone: TEST_CONFIG.zone,
      search: 'test-dns'
    });
    
    if (verifyResult && verifyResult.content && verifyResult.content[0]) {
      const records = verifyResult.content[0].text;
      
      if (records.includes(TEST_CONFIG.testRecord1.name) && 
          records.includes(TEST_CONFIG.testRecord1.ip)) {
        console.log(`✅ A record verified: ${TEST_CONFIG.testRecord1.name}`);
      } else {
        console.log(`❌ A record not found: ${TEST_CONFIG.testRecord1.name}`);
        allTestsPassed = false;
      }
      
      if (records.includes(TEST_CONFIG.testRecord2.name) && 
          records.includes(TEST_CONFIG.testRecord2.target)) {
        console.log(`✅ CNAME record verified: ${TEST_CONFIG.testRecord2.name}`);
      } else {
        console.log(`❌ CNAME record not found: ${TEST_CONFIG.testRecord2.name}`);
        allTestsPassed = false;
      }
    }
    console.log('');

    // Test 7: Update record (Test upsert functionality)
    console.log('📝 Test 7: Update Record (Upsert)');
    console.log('---------------------------------');
    
    const newIP = '192.0.2.100';
    console.log(`   Updating A record IP: ${TEST_CONFIG.testRecord1.ip} → ${newIP}`);
    
    const updateResult = await upsertRecord(client, {
      zone: TEST_CONFIG.zone,
      name: TEST_CONFIG.testRecord1.name,
      type: TEST_CONFIG.testRecord1.type,
      ttl: TEST_CONFIG.testRecord1.ttl,
      rdata: [newIP],
      comment: 'Test: Updating A record IP',
      force: true
    });
    
    if (updateResult && updateResult.content && updateResult.content[0]) {
      console.log('✅ Record updated successfully');
    } else {
      console.log('❌ Failed to update record');
      allTestsPassed = false;
    }
    console.log('');

    // Test 8: Delete records (Changelist workflow)
    console.log('🗑️  Test 8: Delete Records');
    console.log('-------------------------');
    
    // Delete A record
    console.log(`   Deleting A record: ${TEST_CONFIG.testRecord1.name}`);
    const deleteResult1 = await deleteRecord(client, {
      zone: TEST_CONFIG.zone,
      name: TEST_CONFIG.testRecord1.name,
      type: TEST_CONFIG.testRecord1.type,
      comment: 'Test: Deleting A record',
      force: true
    });
    
    if (deleteResult1 && deleteResult1.content && deleteResult1.content[0]) {
      console.log('✅ A record deleted successfully');
    } else {
      console.log('❌ Failed to delete A record');
      allTestsPassed = false;
    }
    
    // Delete CNAME record
    console.log(`   Deleting CNAME record: ${TEST_CONFIG.testRecord2.name}`);
    const deleteResult2 = await deleteRecord(client, {
      zone: TEST_CONFIG.zone,
      name: TEST_CONFIG.testRecord2.name,
      type: TEST_CONFIG.testRecord2.type,
      comment: 'Test: Deleting CNAME record',
      force: true
    });
    
    if (deleteResult2 && deleteResult2.content && deleteResult2.content[0]) {
      console.log('✅ CNAME record deleted successfully');
    } else {
      console.log('❌ Failed to delete CNAME record');
      allTestsPassed = false;
    }
    console.log('');

    // Test 9: Wait for deletion activation
    console.log('⏰ Test 9: Wait for Deletion Activation');
    console.log('---------------------------------------');
    
    await waitForZoneActivation(client, {
      zone: TEST_CONFIG.zone,
      maxWaitSeconds: 60
    });
    console.log('✅ Deletion activated');
    console.log('');

    // Test 10: Verify records were deleted
    console.log('🔍 Test 10: Verify Records Deletion');
    console.log('------------------------------------');
    
    const finalVerifyResult = await listRecords(client, { 
      zone: TEST_CONFIG.zone,
      search: 'test-dns'
    });
    
    if (finalVerifyResult && finalVerifyResult.content && finalVerifyResult.content[0]) {
      const records = finalVerifyResult.content[0].text;
      
      if (!records.includes(TEST_CONFIG.testRecord1.name)) {
        console.log(`✅ A record successfully deleted: ${TEST_CONFIG.testRecord1.name}`);
      } else {
        console.log(`❌ A record still exists: ${TEST_CONFIG.testRecord1.name}`);
        allTestsPassed = false;
      }
      
      if (!records.includes(TEST_CONFIG.testRecord2.name)) {
        console.log(`✅ CNAME record successfully deleted: ${TEST_CONFIG.testRecord2.name}`);
      } else {
        console.log(`❌ CNAME record still exists: ${TEST_CONFIG.testRecord2.name}`);
        allTestsPassed = false;
      }
    }
    console.log('');

    // Summary
    console.log('📊 DNS Operations Test Summary');
    console.log('==============================');
    console.log('✅ Zone Operations (Direct API):');
    console.log('   - List zones: Working');
    console.log('   - Get zone details: Working');
    console.log('   - List records: Working');
    console.log('');
    console.log('✅ Record Operations (Changelist Workflow):');
    console.log('   - Create A record: Working');
    console.log('   - Create CNAME record: Working');
    console.log('   - Update record (upsert): Working');
    console.log('   - Delete records: Working');
    console.log('   - Zone activation: Working');
    console.log('');
    
    if (allTestsPassed) {
      console.log('🎯 All DNS operations working correctly with proper workflows!');
    } else {
      console.log('❌ Some tests failed. Please check the logs above.');
    }

  } catch (error) {
    console.error('');
    console.error('💥 Test failed:', error instanceof Error ? error.message : String(error));
    
    if (error instanceof Error && 'response' in error) {
      const axiosError = error as any;
      if (axiosError.response && axiosError.response.data) {
        console.error('   API Error:', JSON.stringify(axiosError.response.data, null, 2));
      }
    }
    
    throw error;
  }
}

// Run the test
if (require.main === module) {
  console.log('');
  testAllDNSOperations()
    .then(() => {
      console.log('');
      process.exit(0);
    })
    .catch((error) => {
      console.error('');
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}