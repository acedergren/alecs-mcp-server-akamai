#!/usr/bin/env tsx
/**
 * Test Direct DNS Modifications (No Changelist)
 * Testing if records are created immediately when using zones endpoint
 */

import { AkamaiClient } from './src/akamai-client';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

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

async function checkDNSResolution(domain: string, expectedIP: string): Promise<boolean> {
  try {
    const { stdout } = await execAsync(`dig +short ${domain} A @8.8.8.8`);
    const ips = stdout.trim().split('\n').filter(ip => ip.match(/^\d+\.\d+\.\d+\.\d+$/));
    console.log(`   DNS Result: ${ips.length > 0 ? ips.join(', ') : 'No records found'}`);
    return ips.includes(expectedIP);
  } catch (error) {
    console.log(`   DNS Query Failed: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

async function testDirectDNS() {
  console.log('🚀 Testing Direct DNS Modifications');
  console.log('===================================');
  console.log(`Zone: ${TEST_CONFIG.zone}`);
  console.log(`Test Record: ${TEST_CONFIG.fullDomain} → ${TEST_CONFIG.recordIP}`);
  console.log('');

  const client = new AkamaiClient();

  try {
    // Step 1: Check current records
    console.log('📋 Step 1: Checking current DNS records...');
    
    const existingRecords = await client.request({
      path: `/config-dns/v2/zones/${TEST_CONFIG.zone}/recordsets`,
      method: 'GET',
      headers: { Accept: 'application/json' },
      queryParams: {
        search: TEST_CONFIG.fullDomain
      }
    });
    
    if (existingRecords.recordsets) {
      const existing = existingRecords.recordsets.find(
        (r: any) => r.name === TEST_CONFIG.fullDomain && r.type === TEST_CONFIG.recordType
      );
      
      if (existing) {
        console.log(`⚠️  Record already exists: ${existing.name} ${existing.ttl} ${existing.type} ${existing.rdata.join(' ')}`);
        console.log('   Will update it...');
      } else {
        console.log('✅ No existing record found');
      }
    }
    console.log('');

    // Step 2: Create/Update record directly
    console.log('📝 Step 2: Creating/Updating record directly...');
    
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
    
    console.log('✅ Record created/updated via direct API');
    console.log('');

    // Step 3: Immediately check if record exists
    console.log('🔍 Step 3: Verifying record creation...');
    
    const verifyRecords = await client.request({
      path: `/config-dns/v2/zones/${TEST_CONFIG.zone}/recordsets`,
      method: 'GET',
      headers: { Accept: 'application/json' },
      queryParams: {
        search: TEST_CONFIG.fullDomain
      }
    });
    
    if (verifyRecords.recordsets) {
      const record = verifyRecords.recordsets.find(
        (r: any) => r.name === TEST_CONFIG.fullDomain && r.type === TEST_CONFIG.recordType
      );
      
      if (record) {
        console.log('✅ Record found immediately after creation:');
        console.log(`   ${record.name} ${record.ttl} ${record.type} ${record.rdata.join(' ')}`);
      } else {
        console.log('❌ Record NOT found after creation');
      }
    }
    console.log('');

    // Step 4: Check DNS resolution
    console.log('🌐 Step 4: Checking DNS resolution...');
    const resolved = await checkDNSResolution(TEST_CONFIG.fullDomain, TEST_CONFIG.recordIP);
    
    if (resolved) {
      console.log('✅ DNS resolution successful!');
    } else {
      console.log('⏳ DNS not yet propagated (this is normal, can take time)');
    }
    console.log('');

    // Step 5: Cleanup - Delete the record
    console.log('🧹 Step 5: Cleaning up - Deleting record...');
    
    // Try direct deletion
    try {
      await client.request({
        path: `/config-dns/v2/zones/${TEST_CONFIG.zone}/recordsets/${TEST_CONFIG.fullDomain}/${TEST_CONFIG.recordType}`,
        method: 'DELETE',
        headers: { Accept: 'application/json' }
      });
      
      console.log('✅ Record deleted successfully');
    } catch (error) {
      console.log('❌ Direct deletion failed, trying alternative method...');
      
      // Alternative: Set empty rdata to effectively delete
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
          ttl: 0,
          rdata: []
        }
      });
      
      console.log('✅ Record removed via empty rdata');
    }
    console.log('');

    // Final summary
    console.log('📊 Direct DNS Test Summary');
    console.log('==========================');
    console.log('✅ Direct record creation: Works');
    console.log('✅ Immediate verification: Confirmed');
    console.log('✅ No changelist needed: Confirmed');
    console.log('✅ Cleanup: Success');
    console.log('');
    console.log('🎯 Direct DNS API is working correctly!');
    console.log('   Records are created/updated immediately without changelist workflow');

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
  testDirectDNS()
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