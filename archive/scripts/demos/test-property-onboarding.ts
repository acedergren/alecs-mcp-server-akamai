#!/usr/bin/env node

/**
 * Test script for property onboarding workflow
 * Tests with coder.solutionsedge.io
 */

import { AkamaiClient } from './src/akamai-client';
import { onboardProperty } from './src/agents/property-onboarding.agent';

async function testOnboarding() {
  console.log('🚀 Starting property onboarding test...\n');
  
  const config = {
    hostname: 'example.yourdomain.com',
    originHostname: 'origin.yourdomain.com',
    contractId: 'ctr_YOUR-CONTRACT', // Replace with your contract ID
    groupId: 'grp_YOUR-GROUP', // Replace with your group ID
    dnsProvider: 'edge-dns', // Assuming domain is in Edge DNS
    notificationEmails: ['your-email@example.com'],
    useCase: 'web-app' as const
  };
  
  console.log('Configuration:');
  console.log(`- Hostname: ${config.hostname}`);
  console.log(`- Origin: ${config.originHostname}`);
  console.log(`- Group: ${config.groupId} (acedergr)`);
  console.log(`- DNS Provider: ${config.dnsProvider}`);
  console.log('\n');
  
  try {
    // Initialize Akamai client
    const client = new AkamaiClient();
    
    // Execute onboarding
    console.log('Executing onboarding workflow...\n');
    const result = await onboardProperty(client, config);
    
    // Display results
    console.log('📋 Onboarding Result:');
    console.log(result.content[0].text);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testOnboarding().catch(console.error);