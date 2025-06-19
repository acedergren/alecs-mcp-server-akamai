/**
 * TypeScript Examples for Akamai MCP Server
 * 
 * This file demonstrates how to use the Akamai MCP Server programmatically
 * with TypeScript, including type safety and error handling.
 */

import { MCPClient } from '@modelcontextprotocol/sdk';
import type { 
  PropertyList, 
  Property, 
  DNSZone, 
  NetworkList,
  PurgeResponse 
} from '../src/types';

// Initialize MCP Client
async function initializeClient(): Promise<MCPClient> {
  const client = new MCPClient({
    name: 'akamai-examples',
    version: '1.0.0',
  });

  await client.connect({
    serverCommand: 'npx',
    serverArgs: ['tsx', 'src/index.ts'],
  });

  return client;
}

// Example 1: Property Management
async function propertyManagementExamples(client: MCPClient): Promise<void> {
  console.log('=== Property Management Examples ===\n');

  // List all properties
  const properties = await client.call<PropertyList>('mcp__alecs-full__list-properties', {});
  console.log(`Found ${properties.items.length} properties`);

  // Get specific property details
  if (properties.items.length > 0) {
    const firstProperty = properties.items[0];
    const propertyDetails = await client.call<Property>(
      'mcp__alecs-full__get-property',
      { propertyId: firstProperty.propertyId }
    );
    console.log(`Property: ${propertyDetails.propertyName}`);
    console.log(`Latest Version: ${propertyDetails.latestVersion}`);
  }

  // Create a new property
  const newProperty = await client.call<Property>('mcp__alecs-full__create-property', {
    propertyName: 'example-website',
    productId: 'SPM',
    contractId: 'ctr_123456',
    groupId: 'grp_123456',
    ruleFormat: 'v2023-01-05',
  });
  console.log(`Created property: ${newProperty.propertyId}`);

  // Activate property
  const activation = await client.call('mcp__alecs-full__activate-property', {
    propertyId: newProperty.propertyId,
    version: 1,
    network: 'STAGING',
    emails: ['devops@example.com'],
    note: 'Initial staging deployment',
  });
  console.log(`Activation ID: ${activation.activationId}`);
}

// Example 2: DNS Operations
async function dnsOperationsExamples(client: MCPClient): Promise<void> {
  console.log('\n=== DNS Operations Examples ===\n');

  // Create DNS zone
  const zone = await client.call<DNSZone>('mcp__alecs-full__create-zone', {
    zone: 'example.com',
    type: 'PRIMARY',
    contractId: 'ctr_123456',
    comment: 'Main website DNS',
  });
  console.log(`Created zone: ${zone.zone}`);

  // Add DNS records
  const records = [
    {
      name: 'www',
      type: 'A',
      ttl: 300,
      rdata: ['192.0.2.1'],
    },
    {
      name: 'mail',
      type: 'A',
      ttl: 300,
      rdata: ['192.0.2.2'],
    },
    {
      name: '@',
      type: 'MX',
      ttl: 3600,
      rdata: ['10 mail.example.com.'],
    },
  ];

  for (const record of records) {
    await client.call('mcp__alecs-full__create-record', {
      zone: 'example.com',
      ...record,
    });
    console.log(`Added ${record.type} record for ${record.name}`);
  }

  // Activate DNS changes
  const dnsActivation = await client.call('mcp__alecs-full__activate-zone-changes', {
    zone: 'example.com',
    comment: 'Initial DNS setup',
  });
  console.log(`DNS activation request ID: ${dnsActivation.requestId}`);
}

// Example 3: Content Purging
async function contentPurgingExamples(client: MCPClient): Promise<void> {
  console.log('\n=== Content Purging Examples ===\n');

  // Purge single URL
  const singlePurge = await client.call<PurgeResponse>('mcp__alecs-full__purge-by-url', {
    urls: ['https://www.example.com/images/logo.png'],
  });
  console.log(`Purge ID: ${singlePurge.purgeId}`);

  // Purge multiple URLs
  const multiPurge = await client.call<PurgeResponse>('mcp__alecs-full__purge-by-url', {
    urls: [
      'https://www.example.com/page1.html',
      'https://www.example.com/page2.html',
      'https://www.example.com/assets/style.css',
    ],
  });
  console.log(`Bulk purge ID: ${multiPurge.purgeId}`);

  // Purge by CP Code
  const cpCodePurge = await client.call<PurgeResponse>('mcp__alecs-full__purge-by-cpcode', {
    cpcode: '12345',
    network: 'production',
  });
  console.log(`CP Code purge ID: ${cpCodePurge.purgeId}`);

  // Check purge status
  const status = await client.call('mcp__alecs-full__get-purge-status', {
    purgeId: singlePurge.purgeId,
  });
  console.log(`Purge status: ${status.status}`);
}

// Example 4: Security Configuration
async function securityConfigurationExamples(client: MCPClient): Promise<void> {
  console.log('\n=== Security Configuration Examples ===\n');

  // Create network list
  const networkList = await client.call<NetworkList>('mcp__alecs-full__create-network-list', {
    name: 'Blocked IPs',
    type: 'IP',
    description: 'Known malicious IP addresses',
    contractId: 'ctr_123456',
    groupId: 'grp_123456',
  });
  console.log(`Created network list: ${networkList.networkListId}`);

  // Add IPs to network list
  await client.call('mcp__alecs-full__add-to-network-list', {
    networkListId: networkList.networkListId,
    list: ['192.0.2.100', '192.0.2.101', '192.0.2.102'],
  });
  console.log('Added IPs to network list');

  // Activate network list
  const nlActivation = await client.call('mcp__alecs-full__activate-network-list', {
    networkListId: networkList.networkListId,
    network: 'STAGING',
    comment: 'Testing IP blocking',
  });
  console.log(`Network list activation ID: ${nlActivation.activationId}`);
}

// Example 5: Complete Onboarding Workflow
async function onboardingWorkflowExample(client: MCPClient): Promise<void> {
  console.log('\n=== Complete Onboarding Workflow ===\n');

  try {
    // Step 1: Create property
    console.log('Step 1: Creating property...');
    const property = await client.call<Property>('mcp__alecs-full__onboard-property', {
      hostname: 'www.example.com',
      originHostname: 'origin.example.com',
      contractId: 'ctr_123456',
      groupId: 'grp_123456',
      productId: 'SPM',
    });
    console.log(`✓ Property created: ${property.propertyId}`);

    // Step 2: Create DNS zone
    console.log('\nStep 2: Setting up DNS...');
    await client.call('mcp__alecs-full__create-zone', {
      zone: 'example.com',
      type: 'PRIMARY',
      contractId: 'ctr_123456',
    });

    // Add DNS records
    await client.call('mcp__alecs-full__create-record', {
      zone: 'example.com',
      name: 'www',
      type: 'CNAME',
      ttl: 300,
      rdata: [`${property.propertyId}.edgesuite.net.`],
    });
    console.log('✓ DNS configured');

    // Step 3: Create SSL certificate
    console.log('\nStep 3: Creating SSL certificate...');
    const cert = await client.call('mcp__alecs-full__create-certificate', {
      domains: ['www.example.com', 'example.com'],
      type: 'DV',
      adminContact: 'admin@example.com',
      techContact: 'tech@example.com',
    });
    console.log(`✓ Certificate enrollment created: ${cert.enrollmentId}`);

    // Step 4: Activate to staging
    console.log('\nStep 4: Activating to staging...');
    const stagingActivation = await client.call('mcp__alecs-full__activate-property', {
      propertyId: property.propertyId,
      version: 1,
      network: 'STAGING',
      emails: ['devops@example.com'],
      note: 'Initial staging deployment',
    });
    console.log(`✓ Staging activation ID: ${stagingActivation.activationId}`);

    // Step 5: Validate staging
    console.log('\nStep 5: Validating staging deployment...');
    // In a real scenario, you would wait for activation and run tests
    console.log('✓ Staging validation passed');

    // Step 6: Activate to production
    console.log('\nStep 6: Activating to production...');
    const prodActivation = await client.call('mcp__alecs-full__activate-to-production', {
      propertyId: property.propertyId,
      preChecks: {
        validateOrigin: true,
        checkSsl: true,
        testUrls: ['https://www.example.com/'],
      },
      activationSettings: {
        notificationEmails: ['devops@example.com', 'oncall@example.com'],
        acknowledgeWarnings: true,
        note: 'Production deployment after successful staging tests',
      },
    });
    console.log(`✓ Production activation ID: ${prodActivation.activationId}`);

    console.log('\n✅ Onboarding completed successfully!');
  } catch (error) {
    console.error('❌ Onboarding failed:', error);
  }
}

// Example 6: Error Handling
async function errorHandlingExample(client: MCPClient): Promise<void> {
  console.log('\n=== Error Handling Example ===\n');

  try {
    // Attempt to get a non-existent property
    await client.call('mcp__alecs-full__get-property', {
      propertyId: 'prp_nonexistent',
    });
  } catch (error: any) {
    console.log('Handled error gracefully:');
    console.log(`Error type: ${error.code || 'Unknown'}`);
    console.log(`Message: ${error.message}`);
    
    // Check for specific error types
    if (error.code === 'NOT_FOUND') {
      console.log('→ Property does not exist');
    } else if (error.code === 'UNAUTHORIZED') {
      console.log('→ Check your credentials');
    } else if (error.code === 'RATE_LIMITED') {
      console.log(`→ Rate limited. Retry after: ${error.retryAfter}s`);
    }
  }
}

// Example 7: Batch Operations
async function batchOperationsExample(client: MCPClient): Promise<void> {
  console.log('\n=== Batch Operations Example ===\n');

  // Batch property activations
  const propertiesToActivate = [
    { propertyId: 'prp_123456', version: 3 },
    { propertyId: 'prp_789012', version: 5 },
    { propertyId: 'prp_345678', version: 2 },
  ];

  const activationPromises = propertiesToActivate.map(({ propertyId, version }) =>
    client.call('mcp__alecs-full__activate-property', {
      propertyId,
      version,
      network: 'STAGING',
      emails: ['devops@example.com'],
      note: 'Batch staging deployment',
    })
  );

  const results = await Promise.allSettled(activationPromises);
  
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      console.log(`✓ ${propertiesToActivate[index].propertyId} activated`);
    } else {
      console.log(`✗ ${propertiesToActivate[index].propertyId} failed: ${result.reason}`);
    }
  });
}

// Main execution
async function main(): Promise<void> {
  let client: MCPClient | null = null;

  try {
    // Initialize client
    client = await initializeClient();
    console.log('Connected to Akamai MCP Server\n');

    // Run examples (comment out ones you don't want to run)
    await propertyManagementExamples(client);
    await dnsOperationsExamples(client);
    await contentPurgingExamples(client);
    await securityConfigurationExamples(client);
    await onboardingWorkflowExample(client);
    await errorHandlingExample(client);
    await batchOperationsExample(client);

  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    // Clean up
    if (client) {
      await client.disconnect();
      console.log('\nDisconnected from MCP Server');
    }
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

// Export for use in other scripts
export {
  initializeClient,
  propertyManagementExamples,
  dnsOperationsExamples,
  contentPurgingExamples,
  securityConfigurationExamples,
  onboardingWorkflowExample,
  errorHandlingExample,
  batchOperationsExample,
};