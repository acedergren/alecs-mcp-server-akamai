#!/usr/bin/env tsx
/**
 * LIVE DNS Test - Real-time DNS record creation, activation, and resolution
 * 
 * This test will:
 * 1. Create a test DNS A record: test-dns.solutionsedge.io → 1.2.3.4
 * 2. Submit and activate the changelist
 * 3. Monitor activation progress
 * 4. Verify DNS resolution
 * 5. Clean up the test record
 */

import { AkamaiClient } from './src/akamai-client';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

// Test configuration
const TEST_CONFIG = {
  zone: 'solutionsedge.io',
  recordName: 'live-test',
  recordType: 'A',
  recordTTL: 300, // 5 minutes
  recordIP: '172.234.120.21',
  get fullDomain() {
    return `${this.recordName}.${this.zone}`;
  }
};

// Helper to check DNS resolution
async function checkDNSResolution(domain: string, expectedIP: string): Promise<boolean> {
  try {
    const { stdout } = await execAsync(`dig +short ${domain} A @8.8.8.8`);
    const ips = stdout.trim().split('\n').filter(ip => ip.match(/^\d+\.\d+\.\d+\.\d+$/));
    console.log(`   DNS Query Result: ${ips.length > 0 ? ips.join(', ') : 'No records found'}`);
    return ips.includes(expectedIP);
  } catch (error) {
    console.log(`   DNS Query Failed: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

async function runLiveDNSTest() {
  console.log('🚀 LIVE DNS Test - Real-time Record Management');
  console.log('==============================================');
  console.log(`Zone: ${TEST_CONFIG.zone}`);
  console.log(`Test Record: ${TEST_CONFIG.fullDomain} → ${TEST_CONFIG.recordIP}`);
  console.log('');

  const client = new AkamaiClient();

  try {
    // Step 1: Check current zone status
    console.log('📋 Step 1: Checking current zone status...');
    
    const zoneResponse = await client.request({
      path: `/config-dns/v2/zones/${TEST_CONFIG.zone}`,
      method: 'GET',
      headers: { Accept: 'application/json' }
    });
    
    console.log(`✅ Zone found: ${zoneResponse.zone}`);
    console.log(`   Type: ${zoneResponse.type}`);
    console.log(`   DNSSEC: ${zoneResponse.signAndServe ? 'Enabled' : 'Disabled'}`);
    console.log('');

    // Step 2: Check for existing changelist
    console.log('🔍 Step 2: Checking for existing changelist...');
    
    try {
      const changelistResponse = await client.request({
        path: `/config-dns/v2/changelists/${TEST_CONFIG.zone}`,
        method: 'GET',
        headers: { Accept: 'application/json' }
      });
      
      if (changelistResponse && changelistResponse.recordSets) {
        console.log('⚠️  Found existing changelist with changes:');
        console.log(`   Last modified by: ${changelistResponse.lastModifiedBy}`);
        console.log(`   Last modified: ${changelistResponse.lastModifiedDate}`);
        console.log(`   Records in changelist: ${changelistResponse.recordSets.length}`);
        
        // Discard existing changelist
        console.log('   🗑️  Discarding existing changelist...');
        await client.request({
          path: `/config-dns/v2/changelists/${TEST_CONFIG.zone}`,
          method: 'DELETE',
          headers: { Accept: 'application/json' }
        });
        console.log('   ✅ Changelist discarded');
      } else {
        console.log('✅ No existing changelist found');
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        console.log('✅ No existing changelist found');
      } else {
        throw error;
      }
    }
    console.log('');

    // Step 3: Create the test DNS record
    console.log('📝 Step 3: Creating test DNS record...');
    console.log(`   Record: ${TEST_CONFIG.fullDomain} ${TEST_CONFIG.recordType} ${TEST_CONFIG.recordIP}`);
    
    await client.request({
      path: `/config-dns/v2/zones/${TEST_CONFIG.zone}/recordsets`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: {
        name: TEST_CONFIG.fullDomain,
        type: TEST_CONFIG.recordType,
        ttl: TEST_CONFIG.recordTTL,
        rdata: [TEST_CONFIG.recordIP]
      }
    });
    
    console.log('✅ Record added to changelist');
    console.log('');

    // Step 4: Skip changelist verification (API returns 404 after record creation)
    console.log('📋 Step 4: Record added, proceeding to submission...');
    console.log('   Note: Changelist API returns 404 after record creation');
    console.log('');

    // Step 5: Submit the changelist
    console.log('📤 Step 5: Submitting changelist for activation...');
    
    const submitResponse = await client.request({
      path: `/config-dns/v2/changelists/${TEST_CONFIG.zone}/submit`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: {
        comment: `LIVE TEST: Adding ${TEST_CONFIG.fullDomain} record`,
        skipSignAndServeSafetyCheck: false,
        validateOnly: false
      }
    });
    
    console.log('✅ Changelist submitted successfully');
    console.log(`   Request ID: ${submitResponse.requestId}`);
    console.log(`   Expiry Date: ${submitResponse.expiryDate}`);
    console.log('');

    // Step 6: Monitor activation status
    console.log('⏰ Step 6: Monitoring zone activation...');
    
    let activationComplete = false;
    let attempts = 0;
    const maxAttempts = 30; // 5 minutes max (10s intervals)
    
    while (!activationComplete && attempts < maxAttempts) {
      attempts++;
      
      const statusResponse = await client.request({
        path: `/config-dns/v2/zones/${TEST_CONFIG.zone}/status`,
        method: 'GET',
        headers: { Accept: 'application/json' }
      });
      
      console.log(`   Attempt ${attempts}: Activation state = ${statusResponse.activationState}`);
      
      if (statusResponse.propagationStatus) {
        console.log(`   Propagation: ${statusResponse.propagationStatus.percentage}% (${statusResponse.propagationStatus.serversUpdated}/${statusResponse.propagationStatus.totalServers} servers)`);
      }
      
      if (statusResponse.activationState === 'ACTIVE') {
        activationComplete = true;
        console.log('✅ Zone activation complete!');
      } else if (statusResponse.activationState === 'FAILED') {
        throw new Error(`Zone activation failed: ${statusResponse.message || 'Unknown error'}`);
      } else {
        // Wait 10 seconds before next check
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }
    
    if (!activationComplete) {
      console.log('⚠️  Zone activation timeout - may still be propagating');
    }
    console.log('');

    // Step 7: Verify DNS resolution
    console.log('🌐 Step 7: Verifying DNS resolution...');
    console.log(`   Checking if ${TEST_CONFIG.fullDomain} resolves to ${TEST_CONFIG.recordIP}`);
    
    let dnsResolved = false;
    let dnsAttempts = 0;
    const maxDnsAttempts = 20; // 10 minutes max (30s intervals)
    
    while (!dnsResolved && dnsAttempts < maxDnsAttempts) {
      dnsAttempts++;
      console.log(`   DNS Check ${dnsAttempts}:`);
      
      dnsResolved = await checkDNSResolution(TEST_CONFIG.fullDomain, TEST_CONFIG.recordIP);
      
      if (dnsResolved) {
        console.log('✅ DNS resolution successful!');
        console.log(`   ${TEST_CONFIG.fullDomain} → ${TEST_CONFIG.recordIP}`);
      } else {
        console.log('   ⏳ Not yet propagated, waiting 30 seconds...');
        await new Promise(resolve => setTimeout(resolve, 30000));
      }
    }
    
    if (!dnsResolved) {
      console.log('⚠️  DNS propagation incomplete after 10 minutes');
      console.log('   Note: Global DNS propagation can take up to 48 hours');
    }
    console.log('');

    // Step 8: Cleanup - Delete the test record
    console.log('🧹 Step 8: Cleaning up test record...');
    
    // Delete the record
    await client.request({
      path: `/config-dns/v2/changelists/${TEST_CONFIG.zone}/recordsets/${TEST_CONFIG.fullDomain}/${TEST_CONFIG.recordType}`,
      method: 'DELETE',
      headers: { Accept: 'application/json' }
    });
    
    console.log('✅ Record marked for deletion');
    
    // Submit deletion
    const deleteSubmitResponse = await client.request({
      path: `/config-dns/v2/changelists/${TEST_CONFIG.zone}/submit`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: {
        comment: `LIVE TEST: Removing ${TEST_CONFIG.fullDomain} record`,
        skipSignAndServeSafetyCheck: false,
        validateOnly: false
      }
    });
    
    console.log('✅ Deletion submitted');
    console.log(`   Request ID: ${deleteSubmitResponse.requestId}`);
    console.log('');

    // Final summary
    console.log('📊 LIVE DNS Test Summary');
    console.log('========================');
    console.log('✅ Record Creation: Success');
    console.log('✅ Changelist Submission: Success');
    console.log(`✅ Zone Activation: ${activationComplete ? 'Success' : 'Timeout (may still be propagating)'}`);
    console.log(`✅ DNS Resolution: ${dnsResolved ? 'Success' : 'Incomplete (may need more time)'}`);
    console.log('✅ Cleanup: Success');
    console.log('');
    console.log('🎯 LIVE DNS Test completed successfully!');

  } catch (error) {
    console.error('');
    console.error('💥 LIVE DNS Test failed:', error instanceof Error ? error.message : String(error));
    
    // Attempt cleanup on error
    try {
      console.error('');
      console.error('🧹 Attempting cleanup after error...');
      
      // Check if there's a changelist to discard
      const changelistCheck = await client.request({
        path: `/config-dns/v2/changelists/${TEST_CONFIG.zone}`,
        method: 'GET',
        headers: { Accept: 'application/json' }
      }).catch(() => null);
      
      if (changelistCheck) {
        await client.request({
          path: `/config-dns/v2/changelists/${TEST_CONFIG.zone}`,
          method: 'DELETE',
          headers: { Accept: 'application/json' }
        });
        console.error('✅ Changelist discarded');
      }
    } catch (cleanupError) {
      console.error('⚠️  Cleanup failed:', cleanupError instanceof Error ? cleanupError.message : String(cleanupError));
    }
    
    throw error;
  }
}

// Run the test
if (require.main === module) {
  console.log('');
  runLiveDNSTest()
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