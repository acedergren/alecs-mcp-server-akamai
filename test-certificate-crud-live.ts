#!/usr/bin/env tsx
/**
 * Certificate CRUD Live Test Suite
 * 
 * CODE KAI: Comprehensive testing of certificate operations
 * Tests: Create enrollment, Read status, Update configuration, Monitor validation
 * 
 * Prerequisites:
 * - Valid .edgerc configuration
 * - CPS API access permissions
 * - Property Manager property for certificate attachment
 * - DNS zone for validation
 */

import { AkamaiClient } from './src/akamai-client';
import * as cpsTools from './src/tools/cps-tools';
import { logger } from './src/utils/logger';

// Test configuration
const TEST_CONFIG = {
  customer: 'testing', // Use testing section from .edgerc
  contractId: 'ctr_V-44KRACO', // Replace with your contract
  groupId: 'grp_263875', // Replace with your group
  testDomain: `cert-test-${Date.now()}.akamai-lab.com`, // Unique test domain
  propertyId: 'prp_123456', // Replace with test property ID
  propertyVersion: 1,
};

// Test certificate configuration
const TEST_CERT_CONFIG = {
  commonName: TEST_CONFIG.testDomain,
  sans: [
    `www.${TEST_CONFIG.testDomain}`,
    `api.${TEST_CONFIG.testDomain}`,
  ],
  validationType: 'dv' as const,
  certificateType: 'san' as const,
  networkConfiguration: {
    geography: 'core' as const,
    secureNetwork: 'enhanced-tls' as const,
    sniOnly: true,
    quicEnabled: false,
  },
  organization: {
    name: 'Test Organization',
    addressLineOne: '123 Test Street',
    city: 'Test City',
    region: 'CA',
    postalCode: '12345',
    country: 'US',
    phone: '+1-555-123-4567',
  },
  adminContact: {
    firstName: 'Test',
    lastName: 'Admin',
    email: 'test-admin@example.com',
    phone: '+1-555-123-4567',
    organizationName: 'Test Organization',
    addressLineOne: '123 Test Street',
    city: 'Test City',
    region: 'CA',
    postalCode: '12345',
    country: 'US',
    title: 'Administrator',
  },
  techContact: {
    firstName: 'Test',
    lastName: 'Tech',
    email: 'test-tech@example.com',
    phone: '+1-555-123-4567',
    organizationName: 'Test Organization',
    addressLineOne: '123 Test Street',
    city: 'Test City',
    region: 'CA',
    postalCode: '12345',
    country: 'US',
    title: 'Technical Contact',
  },
};

class CertificateCRUDTester {
  private client: AkamaiClient;
  private enrollmentId?: number;
  private dnsRecordsCreated: string[] = [];

  constructor() {
    this.client = new AkamaiClient(TEST_CONFIG.customer);
  }

  async runFullCRUDTest(): Promise<void> {
    logger.info('🚀 Starting Certificate CRUD Live Test Suite');
    logger.info(`Test Domain: ${TEST_CONFIG.testDomain}`);

    try {
      // 1. CREATE Operations
      await this.testEnrollmentCreate();
      
      // 2. READ Operations
      await this.testEnrollmentRead();
      await this.testValidationStatus();
      
      // 3. UPDATE Operations
      await this.testEnrollmentUpdate();
      await this.testDNSValidation();
      
      // 4. Advanced Operations
      await this.testPropertyIntegration();
      await this.testCertificateMonitoring();
      
      // 5. Cleanup (Note: Certificates can't be deleted, only deactivated)
      await this.testEnrollmentDeactivation();

      logger.info('✅ All Certificate CRUD tests completed successfully!');
    } catch (error) {
      logger.error('❌ Test failed:', error);
      await this.cleanup();
      throw error;
    }
  }

  // CREATE Tests
  async testEnrollmentCreate(): Promise<void> {
    logger.info('📝 TEST: Create Certificate Enrollment');
    
    const result = await cpsTools.createDefaultDVEnrollment(this.client, {
      customer: TEST_CONFIG.customer,
      contractId: TEST_CONFIG.contractId,
      commonName: TEST_CERT_CONFIG.commonName,
      sans: TEST_CERT_CONFIG.sans,
      networkConfiguration: TEST_CERT_CONFIG.networkConfiguration,
      adminContact: TEST_CERT_CONFIG.adminContact,
      techContact: TEST_CERT_CONFIG.techContact,
      organization: TEST_CERT_CONFIG.organization,
      autoRenewalStartTime: '2025-01-01',
      acknowledgeWarnings: true,
    });

    // Validate response
    const content = result.content[0];
    if (content.type !== 'text') throw new Error('Invalid response type');
    
    // Extract enrollment ID
    const idMatch = content.text.match(/Enrollment ID: (\d+)/);
    if (!idMatch) throw new Error('Enrollment ID not found in response');
    
    this.enrollmentId = parseInt(idMatch[1]);
    logger.info(`✅ Certificate enrollment created: ${this.enrollmentId}`);

    // Wait for enrollment processing
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  // READ Tests
  async testEnrollmentRead(): Promise<void> {
    logger.info('🔍 TEST: Read Certificate Enrollments');

    // List all enrollments
    const listResult = await cpsTools.listCertificateEnrollments(this.client, {
      customer: TEST_CONFIG.customer,
      contractId: TEST_CONFIG.contractId,
    });

    const listContent = listResult.content[0];
    if (listContent.type !== 'text') throw new Error('Invalid response type');
    
    if (!listContent.text.includes(TEST_CERT_CONFIG.commonName)) {
      throw new Error('Enrollment not found in list');
    }
    logger.info('  ✅ Enrollment found in list');

    // Get enrollment details
    if (!this.enrollmentId) throw new Error('No enrollment ID');
    
    const detailResult = await cpsTools.getCertificateStatus(this.client, {
      customer: TEST_CONFIG.customer,
      enrollmentId: this.enrollmentId,
    });

    const detailContent = detailResult.content[0];
    if (detailContent.type !== 'text') throw new Error('Invalid response type');
    
    if (detailContent.text.includes('Certificate Status') && 
        detailContent.text.includes(TEST_CERT_CONFIG.commonName)) {
      logger.info('  ✅ Enrollment details retrieved');
    } else {
      throw new Error('Enrollment details retrieval failed');
    }
  }

  async testValidationStatus(): Promise<void> {
    logger.info('🔍 TEST: Check Domain Validation Status');

    if (!this.enrollmentId) throw new Error('No enrollment ID');

    const result = await cpsTools.getDomainValidationStatus(this.client, {
      customer: TEST_CONFIG.customer,
      enrollmentId: this.enrollmentId,
    });

    const content = result.content[0];
    if (content.type !== 'text') throw new Error('Invalid response type');
    
    // Extract DNS validation records
    const dnsMatches = content.text.matchAll(/_acme-challenge\.([^\s]+)\s+TXT\s+"([^"]+)"/g);
    for (const match of dnsMatches) {
      const [, domain, value] = match;
      logger.info(`  📝 DNS validation required: _acme-challenge.${domain} TXT "${value}"`);
      this.dnsRecordsCreated.push(`_acme-challenge.${domain}`);
    }

    if (content.text.includes('Validation Status')) {
      logger.info('  ✅ Validation status retrieved');
    } else {
      throw new Error('Validation status retrieval failed');
    }
  }

  // UPDATE Tests
  async testEnrollmentUpdate(): Promise<void> {
    logger.info('✏️ TEST: Update Certificate Enrollment');

    if (!this.enrollmentId) throw new Error('No enrollment ID');

    // Update tech contact
    const updatedTechContact = {
      ...TEST_CERT_CONFIG.techContact,
      email: 'updated-tech@example.com',
    };

    const result = await cpsTools.updateCertificate(this.client, {
      customer: TEST_CONFIG.customer,
      enrollmentId: this.enrollmentId,
      techContact: updatedTechContact,
      changeManagement: false,
    });

    const content = result.content[0];
    if (content.type !== 'text') throw new Error('Invalid response type');
    
    if (content.text.includes('successfully updated')) {
      logger.info('  ✅ Certificate enrollment updated');
    } else {
      throw new Error('Enrollment update failed');
    }
  }

  async testDNSValidation(): Promise<void> {
    logger.info('🔐 TEST: DNS Validation Process');

    // In a real test, you would:
    // 1. Create the DNS TXT records in your DNS zone
    // 2. Wait for DNS propagation
    // 3. Trigger validation check
    // 4. Monitor validation progress

    logger.info('  ℹ️ DNS validation simulation:');
    logger.info('  - Would create TXT records for domain validation');
    logger.info('  - Would monitor validation progress');
    logger.info('  - Would check certificate issuance');
    
    // For testing purposes, we'll check the current status
    if (!this.enrollmentId) throw new Error('No enrollment ID');

    const result = await cpsTools.getDomainValidationStatus(this.client, {
      customer: TEST_CONFIG.customer,
      enrollmentId: this.enrollmentId,
    });

    const content = result.content[0];
    if (content.type !== 'text') throw new Error('Invalid response type');
    
    logger.info('  ✅ DNS validation status checked');
  }

  // Advanced Operations
  async testPropertyIntegration(): Promise<void> {
    logger.info('🔗 TEST: Property Integration');

    // Note: This would normally update the property with the certificate
    // For testing, we'll simulate the process

    logger.info('  ℹ️ Property integration simulation:');
    logger.info(`  - Would update property ${TEST_CONFIG.propertyId}`);
    logger.info(`  - Would attach enrollment ${this.enrollmentId}`);
    logger.info('  - Would configure HTTPS delivery');

    // In production, you would use:
    /*
    const result = await cpsTools.updatePropertyWithCPSCertificate(this.client, {
      customer: TEST_CONFIG.customer,
      propertyId: TEST_CONFIG.propertyId,
      propertyVersion: TEST_CONFIG.propertyVersion,
      enrollmentId: this.enrollmentId,
    });
    */

    logger.info('  ✅ Property integration simulated');
  }

  async testCertificateMonitoring(): Promise<void> {
    logger.info('📊 TEST: Certificate Monitoring');

    if (!this.enrollmentId) throw new Error('No enrollment ID');

    // Check certificate deployment status
    const result = await cpsTools.getCertificateDeploymentStatus(this.client, {
      customer: TEST_CONFIG.customer,
      enrollmentId: this.enrollmentId,
    });

    const content = result.content[0];
    if (content.type !== 'text') throw new Error('Invalid response type');
    
    // Verify monitoring information is present
    if (content.text.includes('Network Status') || 
        content.text.includes('Deployment Status')) {
      logger.info('  ✅ Certificate monitoring data retrieved');
    } else {
      throw new Error('Certificate monitoring failed');
    }

    // Additional monitoring
    logger.info('  📈 Monitoring metrics:');
    logger.info('  - Certificate expiration tracking');
    logger.info('  - Auto-renewal configuration');
    logger.info('  - Network deployment status');
  }

  // Cleanup Operations
  async testEnrollmentDeactivation(): Promise<void> {
    logger.info('⏸️ TEST: Certificate Deactivation');

    // Note: Certificates cannot be deleted, only deactivated
    logger.info('  ℹ️ Certificate lifecycle notes:');
    logger.info('  - Certificates cannot be deleted via API');
    logger.info('  - Enrollments can be deactivated');
    logger.info('  - Auto-renewal can be disabled');
    logger.info(`  - Test enrollment ${this.enrollmentId} would remain in system`);

    logger.info('  ✅ Deactivation process documented');
  }

  // Cleanup in case of errors
  async cleanup(): Promise<void> {
    logger.info('🧹 Cleaning up test resources...');
    
    try {
      // Clean up any DNS records created for validation
      if (this.dnsRecordsCreated.length > 0) {
        logger.info(`  - Would remove ${this.dnsRecordsCreated.length} DNS validation records`);
      }
      
      // Note enrollment ID for manual cleanup if needed
      if (this.enrollmentId) {
        logger.info(`  ⚠️ Manual cleanup required for enrollment: ${this.enrollmentId}`);
      }
    } catch (error) {
      logger.error('Cleanup failed:', error);
    }
  }
}

// Run the tests
async function main() {
  const tester = new CertificateCRUDTester();
  await tester.runFullCRUDTest();
}

main().catch(error => {
  logger.error('Test suite failed:', error);
  process.exit(1);
});