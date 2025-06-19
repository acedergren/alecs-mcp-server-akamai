#!/usr/bin/env node

/**
 * Complete Property Onboarding Test
 * Tests the full workflow including CP Code creation and staging activation
 */

import { AkamaiClient } from './src/akamai-client';
import { PropertyOnboardingAgent } from './src/agents/property-onboarding.agent';

async function testCompleteOnboarding() {
  console.log('🚀 Complete Property Onboarding Test\n');
  console.log('This test demonstrates the full onboarding workflow with:');
  console.log('- CP Code creation');
  console.log('- Ion Standard template (if available)');
  console.log('- Staging-only activation');
  console.log('- Production activation guidance\n');
  
  const testConfig = {
    // Test with an API hostname to trigger Ion Standard selection
    hostname: 'api.test-example.com',
    originHostname: 'origin-api.test-example.com',
    
    // Replace these with your actual IDs
    contractId: process.env.AKAMAI_CONTRACT_ID || 'ctr_YOUR-CONTRACT',
    groupId: process.env.AKAMAI_GROUP_ID || 'grp_YOUR-GROUP',
    
    // Will auto-select Ion Standard for api.* prefix
    // useCase: 'web-app', // Not needed due to auto-detection
    
    network: 'ENHANCED_TLS' as const,
    certificateType: 'DEFAULT' as const,
    notificationEmails: ['test@example.com'],
    
    // Enable DNS guidance
    dnsProvider: 'cloudflare',
    skipDnsSetup: false
  };
  
  console.log('📋 Test Configuration:');
  console.log(JSON.stringify(testConfig, null, 2));
  console.log('\n');
  
  if (testConfig.contractId.includes('YOUR-CONTRACT')) {
    console.error('❌ Please set AKAMAI_CONTRACT_ID environment variable');
    console.error('   Example: export AKAMAI_CONTRACT_ID="ctr_1-ABC123"');
    console.error('\n   Or update the test file with your actual contract ID');
    process.exit(1);
  }
  
  if (testConfig.groupId.includes('YOUR-GROUP')) {
    console.error('❌ Please set AKAMAI_GROUP_ID environment variable');
    console.error('   Example: export AKAMAI_GROUP_ID="grp_12345"');
    console.error('\n   Or update the test file with your actual group ID');
    process.exit(1);
  }
  
  try {
    const client = new AkamaiClient();
    const agent = new PropertyOnboardingAgent(client);
    
    console.log('🔄 Starting onboarding process...\n');
    const startTime = Date.now();
    
    const result = await agent.execute(testConfig);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n⏱️  Completed in ${duration} seconds\n`);
    
    console.log('📊 Onboarding Results:');
    console.log('='.repeat(50));
    console.log(`Success: ${result.success ? '✅' : '❌'}`);
    
    if (result.propertyId) {
      console.log(`\n🏠 Property Details:`);
      console.log(`  Property ID: ${result.propertyId}`);
      console.log(`  Hostname: ${testConfig.hostname}`);
      console.log(`  Edge Hostname: ${result.edgeHostname}`);
    }
    
    if (result.activationId) {
      console.log(`\n🚀 Activation:`);
      console.log(`  Activation ID: ${result.activationId}`);
      console.log(`  Network: STAGING`);
      console.log(`  Status: Activation in progress...`);
    }
    
    if (result.dnsRecordCreated) {
      console.log(`\n🌐 DNS:`);
      console.log(`  CNAME Record: ${result.dnsRecordCreated ? 'Created ✅' : 'Manual setup required ⚠️'}`);
    }
    
    if (result.errors && result.errors.length > 0) {
      console.log('\n❌ Errors:');
      result.errors.forEach(err => console.log(`  - ${err}`));
    }
    
    if (result.warnings && result.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      result.warnings.forEach(warn => console.log(`  - ${warn}`));
    }
    
    if (result.nextSteps && result.nextSteps.length > 0) {
      console.log('\n📌 Next Steps:');
      result.nextSteps.forEach((step, index) => {
        if (step === '') {
          console.log('');
        } else {
          console.log(`  ${index + 1}. ${step}`);
        }
      });
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('✨ Property Onboarding Complete!');
    
  } catch (error) {
    console.error('\n💥 Fatal Error:', error);
    if (error instanceof Error) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

// Run the test
testCompleteOnboarding().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});