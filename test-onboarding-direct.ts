#!/usr/bin/env node

/**
 * Direct test for property onboarding workflow
 */

import { AkamaiClient } from './src/akamai-client';
import { PropertyOnboardingAgent } from './src/agents/property-onboarding.agent';

async function runTest() {
  console.log('🧪 Testing Property Onboarding Workflow\n');
  
  const config = {
    hostname: 'example.yourdomain.com',
    originHostname: 'origin.yourdomain.com',
    contractId: 'ctr_YOUR-CONTRACT', // Replace with your contract ID
    groupId: 'grp_YOUR-GROUP', // Replace with your group ID
    useCase: 'web-app' as const, // For Ion Standard product selection
    network: 'ENHANCED_TLS' as const,
    certificateType: 'DEFAULT' as const,
    notificationEmails: ['your-email@example.com'],
    dnsProvider: 'other' // Will trigger DNS guidance
  };
  
  console.log('📋 Configuration:');
  console.log(JSON.stringify(config, null, 2));
  console.log('\n');
  
  try {
    const client = new AkamaiClient();
    const agent = new PropertyOnboardingAgent(client);
    
    console.log('🚀 Starting onboarding process...\n');
    const result = await agent.execute(config);
    
    console.log('\n📊 Results:');
    console.log(`Success: ${result.success}`);
    
    if (result.propertyId) {
      console.log(`Property ID: ${result.propertyId}`);
    }
    
    if (result.edgeHostname) {
      console.log(`Edge Hostname: ${result.edgeHostname}`);
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
      result.nextSteps.forEach(step => console.log(`  - ${step}`));
    }
    
  } catch (error) {
    console.error('\n💥 Fatal Error:', error);
    if (error instanceof Error) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

// Run with error handling
runTest().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});