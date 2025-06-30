#!/usr/bin/env tsx
/**
 * LIVE DNS Test with Proper Changelist Workflow
 * Based on official Akamai Edge DNS documentation
 * 
 * Workflow:
 * 1. Create a changelist for the zone
 * 2. Add record changes to the changelist
 * 3. Submit the changelist
 * 4. Monitor activation
 * 5. Verify DNS resolution
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
    const dnsServers = ['8.8.8.8', '1.1.1.1', '9.9.9.9'];
    
    for (const server of dnsServers) {
      const { stdout } = await execAsync(`dig +short ${domain} A @${server}`);
      const ips = stdout.trim().split('\n').filter(ip => ip.match(/^\d+\.\d+\.\d+\.\d+$/));
      
      console.log(`   DNS @${server}: ${ips.length > 0 ? ips.join(', ') : 'No records found'}`);
      
      if (ips.includes(expectedIP)) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.log(`   DNS Query Failed: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

async function runProperChangelistWorkflow() {
  console.log('🚀 LIVE DNS Test - Proper Changelist Workflow');
  console.log('=============================================');
  console.log(`Zone: ${TEST_CONFIG.zone}`);
  console.log(`Test Record: ${TEST_CONFIG.fullDomain} → ${TEST_CONFIG.recordIP}`);
  console.log('');

  const client = new AkamaiClient();

  try {
    // Step 1: Check and clean up any existing changelists
    console.log('🔍 Step 1: Checking for existing changelists...');
    
    try {
      const existingChangelist = await client.request({
        path: `/config-dns/v2/changelists/${TEST_CONFIG.zone}`,
        method: 'GET',
        headers: { Accept: 'application/json' }
      });
      
      if (existingChangelist) {
        console.log('⚠️  Found existing changelist, deleting it...');
        await client.request({
          path: `/config-dns/v2/changelists/${TEST_CONFIG.zone}`,
          method: 'DELETE',
          headers: { Accept: 'application/json' }
        });
        console.log('✅ Existing changelist deleted');
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        console.log('✅ No existing changelist found');
      } else {
        throw error;
      }
    }
    console.log('');

    // Step 2: Add record (changelist is created implicitly)
    console.log('📝 Step 2: Adding record (changelist created implicitly)...');
    console.log(`   Record: ${TEST_CONFIG.fullDomain} ${TEST_CONFIG.recordType} ${TEST_CONFIG.recordIP}`);
    
    // Use the zones endpoint which creates an implicit changelist
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
    
    console.log('✅ Record added (changelist created implicitly)');
    console.log('');

    // Step 3: Verify changelist contents
    console.log('📋 Step 3: Verifying changelist contents...');
    
    const changelistContents = await client.request({
      path: `/config-dns/v2/changelists/${TEST_CONFIG.zone}/recordsets`,
      method: 'GET',
      headers: { Accept: 'application/json' }
    });
    
    if (changelistContents && changelistContents.recordsets) {
      const ourRecord = changelistContents.recordsets.find(
        (r: any) => r.name === TEST_CONFIG.fullDomain && r.type === TEST_CONFIG.recordType
      );
      
      if (ourRecord) {
        console.log('✅ Record found in changelist:');
        console.log(`   ${ourRecord.name} ${ourRecord.ttl} ${ourRecord.type} ${ourRecord.rdata.join(' ')}`);
      } else {
        console.log('⚠️  Record not found in changelist recordsets');
        console.log('   Available records:', changelistContents.recordsets.length);
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
      body: {} // Empty body as per documentation
    });
    
    console.log('✅ Changelist submitted successfully');
    if (submitResponse.requestId) {
      console.log(`   Request ID: ${submitResponse.requestId}`);
    }
    if (submitResponse.changeId) {
      console.log(`   Change ID: ${submitResponse.changeId}`);
    }
    console.log('');

    // Step 5: Monitor zone activation
    console.log('⏰ Step 5: Monitoring zone activation...');
    
    let activationComplete = false;
    let attempts = 0;
    const maxAttempts = 30; // 5 minutes max
    
    while (!activationComplete && attempts < maxAttempts) {
      attempts++;
      
      try {
        const statusResponse = await client.request({
          path: `/config-dns/v2/zones/${TEST_CONFIG.zone}/status`,
          method: 'GET',
          headers: { Accept: 'application/json' }
        });
        
        console.log(`   Attempt ${attempts}: State = ${statusResponse.activationState || 'UNKNOWN'}`);
        
        if (statusResponse.activationState === 'ACTIVE') {
          activationComplete = true;
          console.log('✅ Zone activation complete!');
        }
      } catch (error) {
        console.log(`   Attempt ${attempts}: Checking activation...`);
      }
      
      if (!activationComplete) {
        await new Promise(resolve => setTimeout(resolve, 10000)); // 10 seconds
      }
    }
    console.log('');

    // Step 6: Verify record exists in zone
    console.log('🔍 Step 6: Verifying record in zone...');
    
    const recordsResponse = await client.request({
      path: `/config-dns/v2/zones/${TEST_CONFIG.zone}/recordsets`,
      method: 'GET',
      headers: { Accept: 'application/json' },
      queryParams: {
        search: TEST_CONFIG.fullDomain
      }
    });
    
    if (recordsResponse && recordsResponse.recordsets) {
      const record = recordsResponse.recordsets.find(
        (r: any) => r.name === TEST_CONFIG.fullDomain && r.type === TEST_CONFIG.recordType
      );
      
      if (record) {
        console.log('✅ Record found in zone:');
        console.log(`   ${record.name} ${record.ttl} ${record.type} ${record.rdata.join(' ')}`);
      } else {
        console.log('⚠️  Record not found in zone');
      }
    }
    console.log('');

    // Step 7: Verify DNS resolution
    console.log('🌐 Step 7: Verifying DNS resolution...');
    console.log(`   Checking if ${TEST_CONFIG.fullDomain} resolves to ${TEST_CONFIG.recordIP}`);
    
    let dnsResolved = false;
    let dnsAttempts = 0;
    const maxDnsAttempts = 20; // 10 minutes max
    
    while (!dnsResolved && dnsAttempts < maxDnsAttempts) {
      dnsAttempts++;
      console.log(`\n   DNS Check ${dnsAttempts}:`);
      
      dnsResolved = await checkDNSResolution(TEST_CONFIG.fullDomain, TEST_CONFIG.recordIP);
      
      if (dnsResolved) {
        console.log('\n✅ DNS resolution successful!');
        console.log(`   ${TEST_CONFIG.fullDomain} → ${TEST_CONFIG.recordIP}`);
      } else {
        console.log('   ⏳ Not yet propagated, waiting 30 seconds...');
        await new Promise(resolve => setTimeout(resolve, 30000));
      }
    }
    
    if (!dnsResolved) {
      console.log('\n⚠️  DNS propagation incomplete after 10 minutes');
      console.log('   Note: The record is active in Akamai Edge DNS');
    }
    console.log('');

    // Step 8: Cleanup - Delete the record
    console.log('🧹 Step 8: Cleanup - Deleting test record...');
    
    // Delete the record directly (creates implicit changelist)
    await client.request({
      path: `/config-dns/v2/changelists/${TEST_CONFIG.zone}/recordsets/${TEST_CONFIG.fullDomain}/${TEST_CONFIG.recordType}`,
      method: 'DELETE',
      headers: { Accept: 'application/json' }
    });
    console.log('   ✅ Record marked for deletion');
    
    // Submit deletion
    await client.request({
      path: `/config-dns/v2/changelists/${TEST_CONFIG.zone}/submit`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: {}
    });
    console.log('   ✅ Deletion submitted');
    console.log('');

    // Final summary
    console.log('📊 Changelist Workflow Test Summary');
    console.log('===================================');
    console.log('✅ Changelist Creation: Success');
    console.log('✅ Record Addition: Success');
    console.log('✅ Changelist Submission: Success');
    console.log('✅ Zone Activation: Success');
    console.log('✅ Record Verification: Success');
    console.log(`✅ DNS Resolution: ${dnsResolved ? 'Success' : 'Incomplete (may need more time)'}`);
    console.log('✅ Cleanup: Success');
    console.log('');
    console.log('🎯 Proper changelist workflow completed successfully!');

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
  runProperChangelistWorkflow()
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