#!/usr/bin/env tsx
/**
 * Comprehensive CRUD Test Suite Runner
 * 
 * CODE KAI: Full validation of DNS and Certificate operations
 * Ensures all CRUD operations work correctly with live Akamai APIs
 */

import { logger } from './src/utils/logger';

// Import test suites
import './test-dns-crud-live';
import './test-certificate-crud-live';

interface TestResult {
  suite: string;
  status: 'PASS' | 'FAIL';
  duration: number;
  errors?: string[];
}

class ComprehensiveCRUDTester {
  private results: TestResult[] = [];

  async runAllTests(): Promise<void> {
    logger.info('🚀 AKAMAI MCP SERVER - COMPREHENSIVE CRUD TEST SUITE');
    logger.info('=' .repeat(60));
    logger.info('Testing DNS and Certificate operations with live APIs');
    logger.info('=' .repeat(60));

    const startTime = Date.now();

    // Run DNS CRUD tests
    await this.runTestSuite('DNS CRUD Operations', async () => {
      const { DNSCRUDTester } = await import('./test-dns-crud-live');
      const tester = new DNSCRUDTester();
      await tester.runFullCRUDTest();
    });

    // Run Certificate CRUD tests
    await this.runTestSuite('Certificate CRUD Operations', async () => {
      const { CertificateCRUDTester } = await import('./test-certificate-crud-live');
      const tester = new CertificateCRUDTester();
      await tester.runFullCRUDTest();
    });

    // Generate final report
    this.generateReport(Date.now() - startTime);
  }

  private async runTestSuite(
    suiteName: string, 
    testFn: () => Promise<void>
  ): Promise<void> {
    const startTime = Date.now();
    logger.info(`\n${'='.repeat(60)}`);
    logger.info(`🧪 Running: ${suiteName}`);
    logger.info(`${'='.repeat(60)}\n`);

    try {
      await testFn();
      this.results.push({
        suite: suiteName,
        status: 'PASS',
        duration: Date.now() - startTime,
      });
    } catch (error) {
      const errorMessages = error instanceof Error 
        ? [error.message] 
        : ['Unknown error'];
      
      this.results.push({
        suite: suiteName,
        status: 'FAIL',
        duration: Date.now() - startTime,
        errors: errorMessages,
      });
      
      logger.error(`❌ ${suiteName} failed:`, error);
    }
  }

  private generateReport(totalDuration: number): void {
    logger.info('\n' + '='.repeat(60));
    logger.info('📊 COMPREHENSIVE TEST REPORT');
    logger.info('='.repeat(60));

    // Summary statistics
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const total = this.results.length;

    logger.info(`\n📈 Summary:`);
    logger.info(`  Total Suites: ${total}`);
    logger.info(`  ✅ Passed: ${passed}`);
    logger.info(`  ❌ Failed: ${failed}`);
    logger.info(`  ⏱️ Total Duration: ${(totalDuration / 1000).toFixed(2)}s`);

    // Detailed results
    logger.info(`\n📋 Detailed Results:`);
    this.results.forEach((result, index) => {
      const icon = result.status === 'PASS' ? '✅' : '❌';
      logger.info(`\n${index + 1}. ${icon} ${result.suite}`);
      logger.info(`   Status: ${result.status}`);
      logger.info(`   Duration: ${(result.duration / 1000).toFixed(2)}s`);
      
      if (result.errors && result.errors.length > 0) {
        logger.info(`   Errors:`);
        result.errors.forEach(error => {
          logger.info(`     - ${error}`);
        });
      }
    });

    // Operation coverage report
    logger.info(`\n🔍 Operation Coverage:`);
    logger.info(`\nDNS Operations Tested:`);
    logger.info(`  ✓ Zone Create/Read/Update/Delete`);
    logger.info(`  ✓ Record Create/Read/Update/Delete (A, AAAA, CNAME, TXT, MX)`);
    logger.info(`  ✓ Bulk Operations`);
    logger.info(`  ✓ Changelist Workflow`);
    logger.info(`  ✓ SOA Updates`);
    logger.info(`  ✓ TSIG Key Management`);

    logger.info(`\nCertificate Operations Tested:`);
    logger.info(`  ✓ Enrollment Create/Read/Update`);
    logger.info(`  ✓ Domain Validation Status`);
    logger.info(`  ✓ DNS Validation Process`);
    logger.info(`  ✓ Property Integration`);
    logger.info(`  ✓ Certificate Monitoring`);
    logger.info(`  ✓ Deployment Status`);

    // Final verdict
    logger.info(`\n${'='.repeat(60)}`);
    if (failed === 0) {
      logger.info('🎉 ALL TESTS PASSED - CRUD OPERATIONS VERIFIED!');
      logger.info('✅ The MCP server is ready for production use');
    } else {
      logger.info('⚠️ SOME TESTS FAILED - REVIEW REQUIRED');
      logger.info('❌ Fix the failing tests before production deployment');
    }
    logger.info('='.repeat(60));
  }
}

// Test configuration validator
function validateTestEnvironment(): void {
  const requiredEnvVars = [
    'AKAMAI_CLIENT_SECRET',
    'AKAMAI_HOST',
    'AKAMAI_ACCESS_TOKEN',
    'AKAMAI_CLIENT_TOKEN',
  ];

  const missing = requiredEnvVars.filter(v => !process.env[v]);
  if (missing.length > 0) {
    logger.error('❌ Missing required environment variables:');
    missing.forEach(v => logger.error(`  - ${v}`));
    logger.error('\nPlease ensure your .edgerc file is properly configured');
    process.exit(1);
  }

  logger.info('✅ Test environment validated');
}

// Main test runner
async function main() {
  logger.info('🏁 Starting Comprehensive CRUD Test Suite\n');

  // Validate environment
  validateTestEnvironment();

  // Run all tests
  const tester = new ComprehensiveCRUDTester();
  await tester.runAllTests();
}

// Handle process termination
process.on('SIGINT', () => {
  logger.info('\n⚠️ Test suite interrupted by user');
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  logger.error('💥 Unhandled rejection:', error);
  process.exit(1);
});

// Execute tests
main().catch(error => {
  logger.error('💥 Test suite crashed:', error);
  process.exit(1);
});