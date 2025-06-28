#!/usr/bin/env tsx
/**
 * DNS CRUD Live Test Suite
 * 
 * CODE KAI: Comprehensive testing of all DNS operations
 * Tests: Create, Read, Update, Delete for zones and records
 * 
 * Prerequisites:
 * - Valid .edgerc configuration
 * - DNS API access permissions
 * - Test domain not in production use
 */

import { AkamaiClient } from './src/akamai-client';
import * as dnsTools from './src/tools/dns-tools';
import * as dnsPriorityOps from './src/tools/dns-operations-priority';
import { logger } from './src/utils/logger';

// Test configuration
const TEST_CONFIG = {
  customer: 'testing', // Use testing section from .edgerc
  testZone: `test-${Date.now()}.akamai-lab.com`, // Unique test zone
  contractId: 'ctr_V-44KRACO', // Replace with your contract
  groupId: 'grp_263875', // Replace with your group
};

// Test data for various record types
const TEST_RECORDS = {
  A: {
    name: 'www',
    type: 'A',
    ttl: 300,
    rdata: ['192.0.2.1', '192.0.2.2'], // TEST-NET-1 (RFC 5737)
  },
  AAAA: {
    name: 'www',
    type: 'AAAA', 
    ttl: 300,
    rdata: ['2001:db8::1', '2001:db8::2'], // IPv6 documentation prefix
  },
  CNAME: {
    name: 'blog',
    type: 'CNAME',
    ttl: 600,
    rdata: ['www.example.com'],
  },
  TXT: {
    name: '_verification',
    type: 'TXT',
    ttl: 300,
    rdata: ['v=test1', 'akamai-dns-test=true'],
  },
  MX: {
    name: '@',
    type: 'MX',
    ttl: 3600,
    rdata: ['10 mail1.example.com', '20 mail2.example.com'],
  },
};

class DNSCRUDTester {
  private client: AkamaiClient;
  private zoneCreated = false;
  private recordsCreated: string[] = [];
  private changelistId?: string;

  constructor() {
    this.client = new AkamaiClient(TEST_CONFIG.customer);
  }

  async runFullCRUDTest(): Promise<void> {
    logger.info('🚀 Starting DNS CRUD Live Test Suite');
    logger.info(`Test Zone: ${TEST_CONFIG.testZone}`);

    try {
      // 1. CREATE Operations
      await this.testZoneCreate();
      await this.testRecordCreate();

      // 2. READ Operations
      await this.testZoneRead();
      await this.testRecordRead();

      // 3. UPDATE Operations
      await this.testZoneUpdate();
      await this.testRecordUpdate();

      // 4. Advanced Operations
      await this.testBulkOperations();
      await this.testChangelistWorkflow();

      // 5. DELETE Operations (cleanup)
      await this.testRecordDelete();
      await this.testZoneDelete();

      logger.info('✅ All DNS CRUD tests completed successfully!');
    } catch (error) {
      logger.error('❌ Test failed:', error);
      await this.cleanup();
      throw error;
    }
  }

  // CREATE Tests
  async testZoneCreate(): Promise<void> {
    logger.info('📝 TEST: Create DNS Zone');
    
    const result = await dnsTools.createDNSZone(this.client, {
      customer: TEST_CONFIG.customer,
      zone: TEST_CONFIG.testZone,
      type: 'PRIMARY',
      contractId: TEST_CONFIG.contractId,
      groupId: TEST_CONFIG.groupId,
      comment: 'CODE KAI Live Test Zone',
      signAndServe: false, // No DNSSEC for test
      endCustomerId: 'test-customer',
      target: TEST_CONFIG.testZone,
      tsigKey: {
        name: `${TEST_CONFIG.testZone}.tsig`,
        algorithm: 'hmac-sha256',
        secret: Buffer.from('test-secret-key').toString('base64'),
      },
    });

    // Validate response
    const content = result.content[0];
    if (content.type !== 'text') throw new Error('Invalid response type');
    
    if (content.text.includes('successfully created')) {
      logger.info('✅ Zone created successfully');
      this.zoneCreated = true;
    } else {
      throw new Error('Zone creation failed');
    }

    // Wait for zone propagation
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  async testRecordCreate(): Promise<void> {
    logger.info('📝 TEST: Create DNS Records');

    for (const [recordType, recordData] of Object.entries(TEST_RECORDS)) {
      logger.info(`  Creating ${recordType} record...`);
      
      const result = await dnsTools.createDNSRecord(this.client, {
        customer: TEST_CONFIG.customer,
        zone: TEST_CONFIG.testZone,
        name: recordData.name,
        type: recordData.type as any,
        ttl: recordData.ttl,
        rdata: recordData.rdata,
      });

      const content = result.content[0];
      if (content.type !== 'text') throw new Error('Invalid response type');
      
      if (content.text.includes('successfully created')) {
        logger.info(`  ✅ ${recordType} record created`);
        this.recordsCreated.push(`${recordData.name}.${TEST_CONFIG.testZone}`);
      } else {
        throw new Error(`${recordType} record creation failed`);
      }
    }
  }

  // READ Tests
  async testZoneRead(): Promise<void> {
    logger.info('🔍 TEST: Read DNS Zone');

    // List all zones
    const listResult = await dnsTools.listDNSZones(this.client, {
      customer: TEST_CONFIG.customer,
      contractIds: TEST_CONFIG.contractId,
      search: TEST_CONFIG.testZone,
      showAll: true,
    });

    const listContent = listResult.content[0];
    if (listContent.type !== 'text') throw new Error('Invalid response type');
    
    if (!listContent.text.includes(TEST_CONFIG.testZone)) {
      throw new Error('Zone not found in list');
    }
    logger.info('  ✅ Zone found in list');

    // Get zone details
    const detailResult = await dnsTools.getDNSZone(this.client, {
      customer: TEST_CONFIG.customer,
      zone: TEST_CONFIG.testZone,
    });

    const detailContent = detailResult.content[0];
    if (detailContent.type !== 'text') throw new Error('Invalid response type');
    
    if (detailContent.text.includes('Zone Details') && 
        detailContent.text.includes(TEST_CONFIG.testZone)) {
      logger.info('  ✅ Zone details retrieved');
    } else {
      throw new Error('Zone details retrieval failed');
    }
  }

  async testRecordRead(): Promise<void> {
    logger.info('🔍 TEST: Read DNS Records');

    const result = await dnsTools.listDNSRecords(this.client, {
      customer: TEST_CONFIG.customer,
      zone: TEST_CONFIG.testZone,
      showAll: true,
    });

    const content = result.content[0];
    if (content.type !== 'text') throw new Error('Invalid response type');

    // Verify all created records are present
    for (const recordType of Object.keys(TEST_RECORDS)) {
      if (content.text.includes(`Type: ${recordType}`)) {
        logger.info(`  ✅ ${recordType} record found`);
      } else {
        throw new Error(`${recordType} record not found`);
      }
    }
  }

  // UPDATE Tests
  async testZoneUpdate(): Promise<void> {
    logger.info('✏️ TEST: Update DNS Zone (SOA)');

    const result = await dnsTools.updateDNSZone(this.client, {
      customer: TEST_CONFIG.customer,
      zone: TEST_CONFIG.testZone,
      comment: 'Updated by CODE KAI test',
      soaEmail: 'test-updated@example.com',
      soaTTL: 900,
      soaRefresh: 3600,
      soaRetry: 600,
      soaExpire: 604800,
      soaMinimum: 300,
    });

    const content = result.content[0];
    if (content.type !== 'text') throw new Error('Invalid response type');
    
    if (content.text.includes('successfully updated')) {
      logger.info('  ✅ Zone SOA updated');
    } else {
      throw new Error('Zone update failed');
    }
  }

  async testRecordUpdate(): Promise<void> {
    logger.info('✏️ TEST: Update DNS Records');

    // Update A record
    const result = await dnsTools.updateDNSRecord(this.client, {
      customer: TEST_CONFIG.customer,
      zone: TEST_CONFIG.testZone,
      name: 'www',
      type: 'A',
      ttl: 600, // Changed from 300
      rdata: ['192.0.2.10', '192.0.2.20'], // New IPs
    });

    const content = result.content[0];
    if (content.type !== 'text') throw new Error('Invalid response type');
    
    if (content.text.includes('successfully updated')) {
      logger.info('  ✅ A record updated');
    } else {
      throw new Error('Record update failed');
    }
  }

  // Advanced Operations
  async testBulkOperations(): Promise<void> {
    logger.info('🔄 TEST: Bulk DNS Operations');

    const bulkRecords = [
      { name: 'test1', type: 'A', ttl: 300, rdata: ['192.0.2.100'] },
      { name: 'test2', type: 'A', ttl: 300, rdata: ['192.0.2.101'] },
      { name: 'test3', type: 'A', ttl: 300, rdata: ['192.0.2.102'] },
    ];

    const result = await dnsTools.bulkCreateDNSRecords(this.client, {
      customer: TEST_CONFIG.customer,
      zone: TEST_CONFIG.testZone,
      records: bulkRecords as any,
    });

    const content = result.content[0];
    if (content.type !== 'text') throw new Error('Invalid response type');
    
    if (content.text.includes('records created successfully')) {
      logger.info('  ✅ Bulk records created');
      bulkRecords.forEach(r => this.recordsCreated.push(`${r.name}.${TEST_CONFIG.testZone}`));
    } else {
      throw new Error('Bulk operation failed');
    }
  }

  async testChangelistWorkflow(): Promise<void> {
    logger.info('📋 TEST: Changelist Workflow');

    // Create changelist
    const createResult = await dnsPriorityOps.createDNSChangelist(this.client, {
      customer: TEST_CONFIG.customer,
      zones: [TEST_CONFIG.testZone],
    });

    const createContent = createResult.content[0];
    if (createContent.type !== 'text') throw new Error('Invalid response type');
    
    // Extract changelist ID from response
    const idMatch = createContent.text.match(/Changelist ID: (\d+)/);
    if (!idMatch) throw new Error('Changelist ID not found');
    
    this.changelistId = idMatch[1];
    logger.info(`  ✅ Changelist created: ${this.changelistId}`);

    // Add changes
    await dnsTools.createDNSRecord(this.client, {
      customer: TEST_CONFIG.customer,
      zone: TEST_CONFIG.testZone,
      name: 'changelist-test',
      type: 'A',
      ttl: 300,
      rdata: ['192.0.2.200'],
    });

    // Submit changelist
    const submitResult = await dnsPriorityOps.submitDNSChangelist(this.client, {
      customer: TEST_CONFIG.customer,
      changelistId: this.changelistId,
    });

    const submitContent = submitResult.content[0];
    if (submitContent.type !== 'text') throw new Error('Invalid response type');
    
    if (submitContent.text.includes('submitted successfully')) {
      logger.info('  ✅ Changelist submitted');
    } else {
      throw new Error('Changelist submission failed');
    }
  }

  // DELETE Tests
  async testRecordDelete(): Promise<void> {
    logger.info('🗑️ TEST: Delete DNS Records');

    // Delete A record
    const result = await dnsTools.deleteDNSRecord(this.client, {
      customer: TEST_CONFIG.customer,
      zone: TEST_CONFIG.testZone,
      name: 'www',
      type: 'A',
    });

    const content = result.content[0];
    if (content.type !== 'text') throw new Error('Invalid response type');
    
    if (content.text.includes('successfully deleted')) {
      logger.info('  ✅ A record deleted');
    } else {
      throw new Error('Record deletion failed');
    }
  }

  async testZoneDelete(): Promise<void> {
    logger.info('🗑️ TEST: Delete DNS Zone');

    if (!this.zoneCreated) {
      logger.info('  ⏭️ Skipping - zone was not created');
      return;
    }

    const result = await dnsTools.deleteDNSZone(this.client, {
      customer: TEST_CONFIG.customer,
      zone: TEST_CONFIG.testZone,
      force: true,
    });

    const content = result.content[0];
    if (content.type !== 'text') throw new Error('Invalid response type');
    
    if (content.text.includes('successfully deleted') || 
        content.text.includes('scheduled for deletion')) {
      logger.info('  ✅ Zone deleted');
      this.zoneCreated = false;
    } else {
      throw new Error('Zone deletion failed');
    }
  }

  // Cleanup in case of errors
  async cleanup(): Promise<void> {
    logger.info('🧹 Cleaning up test resources...');
    
    try {
      if (this.zoneCreated) {
        await this.testZoneDelete();
      }
    } catch (error) {
      logger.error('Cleanup failed:', error);
    }
  }
}

// Run the tests
async function main() {
  const tester = new DNSCRUDTester();
  await tester.runFullCRUDTest();
}

main().catch(error => {
  logger.error('Test suite failed:', error);
  process.exit(1);
});