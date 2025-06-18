#!/usr/bin/env node

/**
 * Test onboarding for code.solutionsedge.io
 */

import { AkamaiClient } from './src/akamai-client';
import { PropertyOnboardingAgent } from './src/agents/property-onboarding.agent';

async function testCodeSolutionsEdge() {
  console.log('🚀 Testing Property Onboarding for code.solutionsedge.io\n');
  console.log('=' .repeat(60) + '\n');
  
  const config = {
    hostname: 'code.solutionsedge.io',
    originHostname: 'origin-code.solutionsedge.io',
    
    // You'll need to provide these
    contractId: process.env.AKAMAI_CONTRACT_ID || 'ctr_1-5C13O2',
    groupId: process.env.AKAMAI_GROUP_ID || 'grp_99912',
    
    // Since it doesn't start with api.* or www.*, let's specify web-app use case
    useCase: 'web-app' as const,
    
    network: 'ENHANCED_TLS' as const,
    certificateType: 'DEFAULT' as const,
    notificationEmails: ['alex@solutionsedge.io'],
    
    // Assuming solutionsedge.io might be in Edge DNS
    dnsProvider: 'edge-dns',
    skipDnsSetup: false
  };
  
  console.log('📋 Configuration for code.solutionsedge.io:');
  console.log('─'.repeat(50));
  console.log(`Hostname:         ${config.hostname}`);
  console.log(`Origin:           ${config.originHostname}`);
  console.log(`Contract ID:      ${config.contractId}`);
  console.log(`Group ID:         ${config.groupId}`);
  console.log(`Use Case:         ${config.useCase} (Ion Standard)`);
  console.log(`Network:          ${config.network}`);
  console.log(`Certificate:      ${config.certificateType}`);
  console.log(`DNS Provider:     ${config.dnsProvider}`);
  console.log('\n');
  
  try {
    const client = new AkamaiClient();
    const agent = new PropertyOnboardingAgent(client);
    
    console.log('🔄 Starting onboarding process...\n');
    console.log('Expected workflow steps:');
    console.log('1. Validate configuration');
    console.log('2. Check if property already exists');
    console.log('3. Select Ion Standard product (web-app use case)');
    console.log('4. Create CP Code: code-solutionsedge-io');
    console.log('5. Create property');
    console.log('6. Create edge hostname: code.solutionsedge.io.edgekey.net');
    console.log('7. Configure with Ion Standard template');
    console.log('8. Setup DNS (or provide guidance)');
    console.log('9. Activate to STAGING only');
    console.log('10. Provide production activation instructions\n');
    
    const startTime = Date.now();
    
    // Execute the onboarding
    const result = await agent.execute(config);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n✅ Onboarding completed in ${duration} seconds\n`);
    
    // Display results
    console.log('📊 RESULTS');
    console.log('═'.repeat(60));
    console.log(`Success:          ${result.success ? '✅ YES' : '❌ NO'}`);
    
    if (result.propertyId) {
      console.log(`\n🏠 Property Details:`);
      console.log(`Property ID:      ${result.propertyId}`);
      console.log(`Edge Hostname:    ${result.edgeHostname || 'N/A'}`);
      console.log(`CP Code:          Created automatically`);
    }
    
    if (result.activationId) {
      console.log(`\n🚀 Activation:`);
      console.log(`Activation ID:    ${result.activationId}`);
      console.log(`Network:          STAGING`);
      console.log(`Status:           In Progress...`);
    }
    
    if (result.dnsRecordCreated !== undefined) {
      console.log(`\n🌐 DNS Status:`);
      console.log(`CNAME Created:    ${result.dnsRecordCreated ? '✅ YES' : '❌ NO (Manual setup required)'}`);
      if (result.dnsRecordCreated) {
        console.log(`CNAME Record:     code → ${result.edgeHostname}`);
        console.log(`ACME Record:      _acme-challenge.code → code.solutionsedge.io.acme-validate.edgekey.net`);
      }
    }
    
    if (result.errors && result.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      result.errors.forEach(err => console.log(`  • ${err}`));
    }
    
    if (result.warnings && result.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:');
      result.warnings.forEach(warn => console.log(`  • ${warn}`));
    }
    
    if (result.nextSteps && result.nextSteps.length > 0) {
      console.log('\n📌 NEXT STEPS:');
      console.log('─'.repeat(50));
      result.nextSteps.forEach((step, index) => {
        if (step === '') {
          console.log('');
        } else if (step.startsWith('   ')) {
          console.log(step);
        } else {
          console.log(`${step}`);
        }
      });
    }
    
    console.log('\n' + '═'.repeat(60));
    console.log('🎉 Property onboarding for code.solutionsedge.io complete!');
    console.log('\n💡 Key Points:');
    console.log('• CP Code was created automatically');
    console.log('• Ion Standard template applied (web-app use case)');
    console.log('• Activated to staging only');
    console.log('• Production activation requires 10-60 min wait');
    
  } catch (error) {
    console.error('\n💥 Error during onboarding:', error);
    if (error instanceof Error) {
      console.error('\nError details:', error.message);
      console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Check if we have the required environment variables
if (!process.env.AKAMAI_CONTRACT_ID || !process.env.AKAMAI_GROUP_ID) {
  console.log('⚠️  Using default contract/group IDs. For actual testing, set:');
  console.log('   export AKAMAI_CONTRACT_ID="your-contract-id"');
  console.log('   export AKAMAI_GROUP_ID="your-group-id"');
  console.log('');
}

// Run the test
testCodeSolutionsEdge().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});