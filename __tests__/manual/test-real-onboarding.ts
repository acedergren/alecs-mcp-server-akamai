#!/usr/bin/env node

/**
 * Real API test for code.solutionsedge.io onboarding
 */

import { AkamaiClient } from './src/akamai-client';
import { PropertyOnboardingAgent } from './src/agents/property-onboarding.agent';
import { listGroups } from './src/tools/property-tools';

async function findGroupId(client: AkamaiClient, searchTerm: string): Promise<string | null> {
  console.log(`🔍 Searching for group containing "${searchTerm}"...`);
  
  const result = await listGroups(client, { searchTerm });
  const responseText = result.content[0].text;
  
  // Extract group ID from response
  const groupMatch = responseText.match(/Group ID: Group \d+ \(grp_(\d+)\)/);
  if (groupMatch) {
    const groupId = `grp_${groupMatch[1]}`;
    console.log(`✅ Found group: ${groupId}`);
    return groupId;
  }
  
  return null;
}

async function testRealOnboarding() {
  console.log('🚀 REAL Property Onboarding Test: code.solutionsedge.io\n');
  console.log('=' .repeat(60) + '\n');
  
  try {
    const client = new AkamaiClient();
    
    // First, let's find a suitable group
    let groupId = await findGroupId(client, 'acedergr');
    if (!groupId) {
      // Try another search
      groupId = await findGroupId(client, 'North presales');
      if (!groupId) {
        // Use the top-level group we saw
        groupId = 'grp_18543'; // TC East group
        console.log(`⚠️  Using default group: ${groupId}`);
      }
    }
    
    const config = {
      hostname: 'code.solutionsedge.io',
      originHostname: 'origin-code.solutionsedge.io',
      contractId: 'ctr_1-5C13O2', // From the groups listing
      groupId: groupId,
      useCase: 'web-app' as const,
      network: 'ENHANCED_TLS' as const,
      certificateType: 'DEFAULT' as const,
      notificationEmails: ['test@solutionsedge.io'],
      dnsProvider: 'edge-dns',
      skipDnsSetup: false
    };
    
    console.log('\n📋 Configuration:');
    console.log('─'.repeat(50));
    console.log(`Hostname:         ${config.hostname}`);
    console.log(`Origin:           ${config.originHostname}`);
    console.log(`Contract ID:      ${config.contractId}`);
    console.log(`Group ID:         ${config.groupId}`);
    console.log(`Use Case:         ${config.useCase}`);
    console.log('\n');
    
    console.log('⚠️  WARNING: This will create real resources in your Akamai account!');
    console.log('Press Ctrl+C within 5 seconds to cancel...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const agent = new PropertyOnboardingAgent(client);
    
    console.log('🔄 Starting REAL onboarding process...\n');
    const startTime = Date.now();
    
    const result = await agent.execute(config);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n✅ Onboarding completed in ${duration} seconds\n`);
    
    // Display results
    console.log('📊 RESULTS');
    console.log('═'.repeat(60));
    console.log(`Success:          ${result.success ? '✅ YES' : '❌ NO'}`);
    
    if (result.propertyId) {
      console.log(`\n🏠 Property Created:`);
      console.log(`Property ID:      ${result.propertyId}`);
      console.log(`Edge Hostname:    ${result.edgeHostname || 'N/A'}`);
    }
    
    if (result.activationId) {
      console.log(`\n🚀 Activation:`);
      console.log(`Activation ID:    ${result.activationId}`);
      console.log(`Network:          STAGING`);
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
      result.nextSteps.forEach(step => {
        if (step !== '') console.log(`• ${step}`);
      });
    }
    
    console.log('\n' + '═'.repeat(60));
    if (result.success) {
      console.log('🎉 REAL property created successfully!');
      console.log('\n⚠️  IMPORTANT: This is a REAL property in your account!');
      console.log('   You may want to delete it if this was just a test.');
    }
    
  } catch (error) {
    console.error('\n💥 Error:', error);
    if (error instanceof Error) {
      console.error('Details:', error.message);
      console.error('Stack:', error.stack);
    }
  }
}

// Run the test
testRealOnboarding().catch(console.error);