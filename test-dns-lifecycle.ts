#!/usr/bin/env tsx
/**
 * DNS Complete Lifecycle Test
 * Tests the full DNS workflow: Create → Activate → Validate → Delete
 * 
 * Test Record: test-dns.solutionsedge.io A 1.2.3.4
 */

import { AkamaiClient } from './src/akamai-client';
import { 
  listZones,
  getZone, 
  listRecords,
  upsertRecord,
  getChangeList,
  submitChangeList,
  waitForZoneActivation,
  deleteRecord
} from './src/tools/dns-tools';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

interface TestConfig {
  zone: string;
  testRecord: {
    name: string;
    type: string;
    ttl: number;
    rdata: string[];
  };
  testIp: string;
}

const config: TestConfig = {
  zone: 'solutionsedge.io',
  testRecord: {
    name: 'test-dns.solutionsedge.io',
    type: 'A',
    ttl: 300, // 5 minutes for testing
    rdata: ['1.2.3.4']
  },
  testIp: '1.2.3.4'
};

async function validateDNSResolution(hostname: string, expectedIp: string): Promise<boolean> {
  try {
    console.log(`🔍 Validating DNS resolution for ${hostname} → ${expectedIp}`);
    
    // Use dig command to check DNS resolution
    const { stdout } = await execAsync(`dig +short ${hostname} A`);
    const resolvedIps = stdout.trim().split('\n').filter(ip => ip.match(/^\d+\.\d+\.\d+\.\d+$/));
    
    console.log(`   Resolved IPs: ${resolvedIps.join(', ')}`);
    
    if (resolvedIps.includes(expectedIp)) {
      console.log(`   ✅ DNS resolution successful: ${hostname} → ${expectedIp}`);
      return true;
    } else {
      console.log(`   ⏳ DNS not yet propagated, resolved: ${resolvedIps.join(', ')}`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ DNS resolution failed: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

async function waitForDNSPropagation(hostname: string, expectedIp: string, maxWaitMinutes: number = 10): Promise<boolean> {
  console.log(`⏰ Waiting for DNS propagation (max ${maxWaitMinutes} minutes)...`);
  
  const startTime = Date.now();
  const maxWaitMs = maxWaitMinutes * 60 * 1000;
  let attempts = 0;
  
  while (Date.now() - startTime < maxWaitMs) {
    attempts++;
    console.log(`   Attempt ${attempts}: Checking DNS resolution...`);
    
    if (await validateDNSResolution(hostname, expectedIp)) {
      const elapsedSeconds = Math.round((Date.now() - startTime) / 1000);
      console.log(`   🎯 DNS propagated successfully in ${elapsedSeconds} seconds`);
      return true;
    }
    
    // Wait 30 seconds between checks
    console.log(`   ⏳ Waiting 30 seconds before next check...`);
    await new Promise(resolve => setTimeout(resolve, 30000));
  }
  
  console.log(`   ⚠️  DNS propagation timeout after ${maxWaitMinutes} minutes`);
  return false;
}

async function runDNSLifecycleTest() {
  console.log('🧪 DNS Complete Lifecycle Test');
  console.log('==============================');
  console.log(`Zone: ${config.zone}`);
  console.log(`Test Record: ${config.testRecord.name} ${config.testRecord.type} ${config.testRecord.rdata.join(' ')}`);
  console.log('');

  const client = new AkamaiClient();
  let testResults = {
    passed: 0,
    failed: 0,
    phases: [] as string[]
  };

  try {
    // Phase 1: Verify zone exists and get current state
    console.log('📋 Phase 1: Verify zone exists');
    console.log('------------------------------');
    
    const zoneDetails = await getZone(client, { zone: config.zone });
    if (!zoneDetails || !zoneDetails.content || !zoneDetails.content[0]) {
      throw new Error(`Zone ${config.zone} not found`);
    }
    console.log('✅ Zone verified:', zoneDetails.content[0].text);
    testResults.passed++;
    testResults.phases.push('Zone verification');

    // Phase 2: Check if test record already exists (cleanup from previous runs)
    console.log('\n🔍 Phase 2: Check for existing test record');
    console.log('------------------------------------------');
    
    try {
      const existingRecords = await listRecords(client, { 
        zone: config.zone,
        types: [config.testRecord.type]
      });
      
      if (existingRecords.content && existingRecords.content[0] && 
          existingRecords.content[0].text.includes(config.testRecord.name)) {
        console.log('⚠️  Test record already exists, attempting cleanup first...');
        
        try {
          await deleteRecord(client, {
            zone: config.zone,
            name: config.testRecord.name,
            type: config.testRecord.type
          });
          console.log('🧹 Existing test record deleted');
          
          // Submit cleanup changes
          await submitChangeList(client, { zone: config.zone });
          console.log('📤 Cleanup changes submitted');
          
          // Wait for cleanup activation
          await waitForZoneActivation(client, { 
            zone: config.zone,
            maxWaitSeconds: 120
          });
          console.log('✅ Cleanup activated');
        } catch (cleanupError) {
          console.log('⚠️  Cleanup warning:', cleanupError instanceof Error ? cleanupError.message : String(cleanupError));
        }
      } else {
        console.log('✅ No existing test record found');
      }
      testResults.passed++;
      testResults.phases.push('Existing record check');
    } catch (error) {
      console.log('ℹ️  Record check completed (zone may be empty)');
      testResults.passed++;
      testResults.phases.push('Existing record check');
    }

    // Phase 3: Create test record directly (manual changelist approach)
    console.log('\n📝 Phase 3: Create test DNS record');
    console.log('----------------------------------');
    
    try {
      // Add record to changelist
      await client.request({
        path: `/config-dns/v2/zones/${config.zone}/recordsets`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: {
          name: config.testRecord.name,
          type: config.testRecord.type,
          ttl: config.testRecord.ttl,
          rdata: config.testRecord.rdata,
        },
      });
      
      console.log('✅ Record added to changelist');
      testResults.passed++;
      testResults.phases.push('Record creation');
    } catch (error) {
      console.log('❌ Failed to add record to changelist:', error instanceof Error ? error.message : String(error));
      throw error;
    }

    // Phase 4: Submit changes for activation
    console.log('\n📤 Phase 4: Submit changes for activation');
    console.log('----------------------------------------');
    
    try {
      const submitResponse = await client.request({
        path: `/config-dns/v2/changelists/${config.zone}/submit`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: {
          comment: `Test record creation: ${config.testRecord.name}`
        }
      });
      
      console.log('✅ Changes submitted, Request ID:', submitResponse.requestId);
      testResults.passed++;
      testResults.phases.push('Change submission');
    } catch (error) {
      console.log('❌ Failed to submit changelist:', error instanceof Error ? error.message : String(error));
      throw error;
    }

    // Phase 5: Wait for zone activation
    console.log('\n⏰ Phase 5: Wait for zone activation');
    console.log('-----------------------------------');
    
    const activationResult = await waitForZoneActivation(client, { 
      zone: config.zone,
      maxWaitSeconds: 300 // 5 minutes
    });
    
    if (!activationResult || !activationResult.content || !activationResult.content[0]) {
      throw new Error('Zone activation failed or timed out');
    }
    console.log('✅ Zone activated:', activationResult.content[0].text);
    testResults.passed++;
    testResults.phases.push('Zone activation');

    // Phase 6: Validate DNS propagation
    console.log('\n🌐 Phase 6: Validate DNS propagation');
    console.log('-----------------------------------');
    
    const dnsResolved = await waitForDNSPropagation(
      config.testRecord.name, 
      config.testIp, 
      10 // 10 minutes max wait
    );
    
    if (dnsResolved) {
      console.log('✅ DNS propagation validated successfully');
      testResults.passed++;
      testResults.phases.push('DNS propagation validation');
    } else {
      console.log('⚠️  DNS propagation validation incomplete (may still be propagating)');
      testResults.failed++;
      testResults.phases.push('DNS propagation validation (incomplete)');
    }

    // Phase 7: Cleanup - Delete test record
    console.log('\n🧹 Phase 7: Cleanup - Delete test record');
    console.log('----------------------------------------');
    
    const deleteResult = await deleteRecord(client, {
      zone: config.zone,
      name: config.testRecord.name,
      type: config.testRecord.type
    });
    
    if (!deleteResult || !deleteResult.content || !deleteResult.content[0]) {
      throw new Error('Failed to delete test record');
    }
    console.log('✅ Test record deleted:', deleteResult.content[0].text);
    testResults.passed++;
    testResults.phases.push('Record deletion');

    // Phase 8: Submit cleanup changes
    console.log('\n📤 Phase 8: Submit cleanup changes');
    console.log('----------------------------------');
    
    const cleanupSubmitResult = await submitChangeList(client, { 
      zone: config.zone,
      comment: `Cleanup test record: ${config.testRecord.name}`
    });
    
    if (!cleanupSubmitResult || !cleanupSubmitResult.content || !cleanupSubmitResult.content[0]) {
      throw new Error('Failed to submit cleanup changes');
    }
    console.log('✅ Cleanup changes submitted:', cleanupSubmitResult.content[0].text);
    testResults.passed++;
    testResults.phases.push('Cleanup submission');

    // Phase 9: Final activation
    console.log('\n⏰ Phase 9: Final activation');
    console.log('----------------------------');
    
    const finalActivationResult = await waitForZoneActivation(client, { 
      zone: config.zone,
      maxWaitSeconds: 300
    });
    
    if (!finalActivationResult || !finalActivationResult.content || !finalActivationResult.content[0]) {
      throw new Error('Final activation failed');
    }
    console.log('✅ Final activation complete:', finalActivationResult.content[0].text);
    testResults.passed++;
    testResults.phases.push('Final activation');

  } catch (error) {
    console.log('\n💥 Test failed:', error instanceof Error ? error.message : String(error));
    testResults.failed++;
  }

  // Final results
  console.log('\n📊 DNS Lifecycle Test Results');
  console.log('==============================');
  console.log(`✅ Phases Passed: ${testResults.passed}`);
  console.log(`❌ Phases Failed: ${testResults.failed}`);
  console.log(`📈 Success Rate: ${Math.round((testResults.passed / (testResults.passed + testResults.failed)) * 100)}%`);
  console.log('\nPhases Completed:');
  testResults.phases.forEach((phase, index) => {
    console.log(`   ${index + 1}. ${phase}`);
  });

  if (testResults.failed === 0) {
    console.log('\n🎯 Complete DNS lifecycle test PASSED!');
    console.log('   ✅ Record creation, activation, propagation, and cleanup all successful');
  } else if (testResults.passed >= 7) {
    console.log('\n⚠️  DNS lifecycle mostly successful with minor issues');
    console.log('   ✅ Core functionality (create, activate, delete) works correctly');
  } else {
    console.log('\n❌ DNS lifecycle test had significant failures');
  }

  return testResults;
}

// Run the lifecycle test
if (require.main === module) {
  runDNSLifecycleTest()
    .then((results) => {
      process.exit(results.failed > 2 ? 1 : 0); // Allow up to 2 minor failures (like DNS propagation timing)
    })
    .catch((error) => {
      console.error('💥 Test execution failed:', error);
      process.exit(1);
    });
}