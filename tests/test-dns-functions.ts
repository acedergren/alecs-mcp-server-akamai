#!/usr/bin/env tsx

/**
 * Test script for EdgeDNS Advanced Functions
 * Usage: npx tsx tests/test-dns-functions.ts
 */

import { AkamaiClient } from '../src/akamai-client.js';
import {
  getZonesDNSSECStatus,
  getSecondaryZoneTransferStatus,
  getZoneContract,
  getRecordSet,
  updateTSIGKeyForZones,
  submitBulkZoneCreateRequest,
  getZoneVersion,
  getVersionRecordSets,
  reactivateZoneVersion,
  getVersionMasterZoneFile,
  createMultipleRecordSets
} from '../src/tools/dns-advanced-tools.js';
import { format, icons } from '../src/utils/progress.js';

// Test configuration
const TEST_ZONE = 'cedergren.xyz';
const TEST_RECORD_NAME = 'www.cedergren.xyz';
const TEST_RECORD_TYPE = 'CNAME';

// Test results tracking
interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  error?: string;
  duration?: number;
}

const testResults: TestResult[] = [];

async function runTest(
  testName: string,
  testFn: () => Promise<void>,
  skip: boolean = false
): Promise<void> {
  if (skip) {
    testResults.push({ name: testName, status: 'skipped' });
    console.log(`${icons.warning} ${format.yellow('SKIPPED')}: ${testName}`);
    return;
  }

  const startTime = Date.now();
  try {
    await testFn();
    const duration = Date.now() - startTime;
    testResults.push({ name: testName, status: 'passed', duration });
    console.log(`${icons.success} ${format.green('PASSED')}: ${testName} (${duration}ms)`);
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    testResults.push({ name: testName, status: 'failed', error: errorMessage, duration });
    console.log(`${icons.error} ${format.red('FAILED')}: ${testName} (${duration}ms)`);
    console.log(`  ${format.dim(errorMessage)}`);
  }
}

async function main() {
  console.log(`${icons.dns} Testing EdgeDNS Advanced Functions\n`);
  
  const client = new AkamaiClient();

  // Test 1: Get DNSSEC Status
  await runTest('Get DNSSEC Status', async () => {
    const result = await getZonesDNSSECStatus(client, { zones: [TEST_ZONE] });
    if (!result.content || result.content.length === 0) {
      throw new Error('No content returned');
    }
    const text = result.content[0].text;
    if (!text.includes('DNSSEC Status Report')) {
      throw new Error('Invalid response format');
    }
  });

  // Test 2: Get Zone Contract
  await runTest('Get Zone Contract', async () => {
    const result = await getZoneContract(client, { zone: TEST_ZONE });
    if (!result.content || result.content.length === 0) {
      throw new Error('No content returned');
    }
    const text = result.content[0].text;
    if (!text.includes('Zone Contract Information')) {
      throw new Error('Invalid response format');
    }
  });

  // Test 3: Get Single Record Set
  await runTest('Get Single Record Set', async () => {
    const result = await getRecordSet(client, {
      zone: TEST_ZONE,
      name: TEST_RECORD_NAME,
      type: TEST_RECORD_TYPE
    });
    if (!result.content || result.content.length === 0) {
      throw new Error('No content returned');
    }
    const text = result.content[0].text;
    if (!text.includes('Record Set Details') && !text.includes('Record not found')) {
      throw new Error('Invalid response format');
    }
  });

  // Test 4: Get Secondary Zone Transfer Status (skipped if zone is not secondary)
  await runTest('Get Secondary Zone Transfer Status', async () => {
    const result = await getSecondaryZoneTransferStatus(client, { zones: [TEST_ZONE] });
    if (!result.content || result.content.length === 0) {
      throw new Error('No content returned');
    }
  }, true); // Skip by default as test zone might not be secondary

  // Test 5: Create Multiple Record Sets
  await runTest('Create Multiple Record Sets', async () => {
    const testRecords = [
      {
        name: `test1.${TEST_ZONE}`,
        type: 'A',
        ttl: 300,
        rdata: ['192.0.2.1']
      },
      {
        name: `test2.${TEST_ZONE}`,
        type: 'A',
        ttl: 300,
        rdata: ['192.0.2.2']
      }
    ];
    
    const result = await createMultipleRecordSets(client, {
      zone: TEST_ZONE,
      recordSets: testRecords,
      comment: 'Test bulk record creation'
    });
    
    if (!result.content || result.content.length === 0) {
      throw new Error('No content returned');
    }
    const text = result.content[0].text;
    if (!text.includes('Bulk Record Creation Complete')) {
      throw new Error('Invalid response format');
    }
  }, true); // Skip by default to avoid modifying zone

  // Test 6: Submit Bulk Zone Create Request
  await runTest('Submit Bulk Zone Create Request', async () => {
    const testZones = [
      {
        zone: 'test1.example.com',
        type: 'PRIMARY' as const,
        comment: 'Test zone 1'
      },
      {
        zone: 'test2.example.com',
        type: 'PRIMARY' as const,
        comment: 'Test zone 2'
      }
    ];
    
    const result = await submitBulkZoneCreateRequest(client, {
      zones: testZones,
      contractId: 'ctr_C-12VQGOZ',
      groupId: 'grp_210335'
    });
    
    if (!result.content || result.content.length === 0) {
      throw new Error('No content returned');
    }
  }, true); // Skip by default to avoid creating zones

  // Test 7: Update TSIG Key for Zones
  await runTest('Update TSIG Key for Zones', async () => {
    const result = await updateTSIGKeyForZones(client, {
      zones: [TEST_ZONE],
      tsigKey: {
        name: 'test-key',
        algorithm: 'hmac-sha256',
        secret: 'base64secret=='
      }
    });
    
    if (!result.content || result.content.length === 0) {
      throw new Error('No content returned');
    }
  }, true); // Skip by default to avoid modifying zone

  // Test 8: Zone Version Operations
  await runTest('Zone Version Operations', async () => {
    // These require version IDs which we don't have for testing
    console.log('  Skipping version operations - requires specific version IDs');
  }, true);

  // Print summary
  console.log(`\n${icons.list} Test Summary\n`);
  
  const passed = testResults.filter(r => r.status === 'passed').length;
  const failed = testResults.filter(r => r.status === 'failed').length;
  const skipped = testResults.filter(r => r.status === 'skipped').length;
  
  console.log(`  ${icons.success} Passed: ${format.green(passed.toString())}`);
  console.log(`  ${icons.error} Failed: ${format.red(failed.toString())}`);
  console.log(`  ${icons.warning} Skipped: ${format.yellow(skipped.toString())}`);
  
  if (failed > 0) {
    console.log(`\n${icons.error} Failed Tests:`);
    testResults
      .filter(r => r.status === 'failed')
      .forEach(r => {
        console.log(`  - ${r.name}`);
        if (r.error) {
          console.log(`    ${format.dim(r.error)}`);
        }
      });
    process.exit(1);
  }
  
  console.log(`\n${icons.sparkle} All tests completed successfully!`);
}

// Run tests
main().catch(error => {
  console.error(`${icons.error} Test execution failed:`, error);
  process.exit(1);
});