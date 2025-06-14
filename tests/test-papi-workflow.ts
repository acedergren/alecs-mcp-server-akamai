#!/usr/bin/env tsx

/**
 * Test script for PAPI (Property Manager) Workflow
 * This tests the complete property creation and configuration workflow
 * Usage: npx tsx tests/test-papi-workflow.ts
 */

import { AkamaiClient } from '../src/akamai-client.js';
import {
  listProperties,
  getProperty,
  createProperty,
  listGroups,
  listContracts
} from '../src/tools/property-tools.js';
import {
  createPropertyVersion,
  getPropertyRules,
  updatePropertyRules,
  createEdgeHostname,
  addPropertyHostname,
  removePropertyHostname,
  activateProperty,
  getActivationStatus,
  listPropertyActivations
} from '../src/tools/property-manager-tools.js';
import {
  listPropertyVersions,
  getPropertyVersion,
  getLatestPropertyVersion,
  searchProperties,
  listPropertyVersionHostnames
} from '../src/tools/property-manager-advanced-tools.js';
import { format, icons } from '../src/utils/progress.js';

// Test configuration
const TEST_PROPERTY_NAME = `test-papi-${Date.now()}`;
const TEST_HOSTNAME = `test-${Date.now()}.example.com`;
let TEST_CONTRACT_ID = ''; // Will be populated from account
let TEST_GROUP_ID = ''; // Will be populated from account
const TEST_PRODUCT_ID = 'prd_Site_Accel';

// Test tracking
interface TestStep {
  name: string;
  status: 'pending' | 'passed' | 'failed' | 'skipped';
  error?: string;
  result?: any;
}

const testSteps: TestStep[] = [];
let createdPropertyId: string | null = null;

async function runStep(
  stepName: string,
  stepFn: () => Promise<any>,
  skip: boolean = false
): Promise<void> {
  const step: TestStep = { name: stepName, status: 'pending' };
  testSteps.push(step);

  if (skip) {
    step.status = 'skipped';
    console.log(`${icons.warning} ${format.yellow('SKIPPED')}: ${stepName}`);
    return;
  }

  try {
    console.log(`${icons.time} Running: ${stepName}...`);
    const result = await stepFn();
    step.status = 'passed';
    step.result = result;
    console.log(`${icons.success} ${format.green('PASSED')}: ${stepName}`);
  } catch (error) {
    step.status = 'failed';
    step.error = error instanceof Error ? error.message : String(error);
    console.log(`${icons.error} ${format.red('FAILED')}: ${stepName}`);
    console.log(`  ${format.dim(step.error)}`);
    throw error; // Stop on first failure
  }
}

async function cleanup(client: AkamaiClient) {
  if (createdPropertyId) {
    console.log(`\n${icons.info} Cleaning up test property...`);
    try {
      // Note: Property deletion is not always available via API
      console.log(`  ${icons.warning} Manual cleanup may be required for property: ${createdPropertyId}`);
    } catch (error) {
      console.log(`  ${icons.error} Cleanup failed:`, error);
    }
  }
}

async function main() {
  console.log(`${icons.rocket} Testing PAPI Workflow\n`);
  console.log(`Product ID: ${format.cyan(TEST_PRODUCT_ID)}`);
  console.log(`Property Name: ${format.cyan(TEST_PROPERTY_NAME)}\n`);
  console.log(`${icons.info} Contract and Group IDs will be determined from your account\n`);
  
  const client = new AkamaiClient();

  try {
    // Step 1: List existing properties
    await runStep('List Properties', async () => {
      const result = await listProperties(client, {});
      if (!result.content || result.content.length === 0) {
        throw new Error('No content returned');
      }
      return result;
    });

    // Step 2: List groups and contracts
    await runStep('List Groups and Contracts', async () => {
      const groups = await listGroups(client, {});
      const contracts = await listContracts(client, {});
      
      if (!groups.content || !contracts.content) {
        throw new Error('Failed to list groups or contracts');
      }
      
      // Extract contract and group IDs from the response
      const groupsText = groups.content[0].text;
      const contractsText = contracts.content[0].text;
      
      // Look for first group ID in format: grp_XXXXXX
      const groupMatch = groupsText.match(/grp_\d+/);
      if (groupMatch) {
        TEST_GROUP_ID = groupMatch[0];
        console.log(`  Using group: ${format.cyan(TEST_GROUP_ID)}`);
      }
      
      // Look for first contract ID in format: ctr_XXXXXX
      const contractMatch = contractsText.match(/ctr_[A-Z0-9-]+/);
      if (contractMatch) {
        TEST_CONTRACT_ID = contractMatch[0];
        console.log(`  Using contract: ${format.cyan(TEST_CONTRACT_ID)}`);
      }
      
      if (!TEST_GROUP_ID || !TEST_CONTRACT_ID) {
        throw new Error('Could not find valid group or contract IDs');
      }
      
      return { groups, contracts };
    });

    // Step 3: Create a new property
    await runStep('Create Property', async () => {
      const result = await createProperty(client, {
        propertyName: TEST_PROPERTY_NAME,
        productId: TEST_PRODUCT_ID,
        contractId: TEST_CONTRACT_ID,
        groupId: TEST_GROUP_ID
      });
      
      if (!result.content || result.content.length === 0) {
        throw new Error('Property creation failed');
      }
      
      // Extract property ID from response
      const text = result.content[0].text;
      
      // Debug: Log the response to see the actual format
      console.log('\n  Debug - Response text:');
      console.log('  ' + text.split('\n').slice(0, 15).join('\n  '));
      
      // Look for the pattern: - **Property ID:** prp_XXXXX
      const propertyIdMatch = text.match(/\*\*Property ID:\*\* (prp_\d+)/);
      if (propertyIdMatch) {
        createdPropertyId = propertyIdMatch[1];
        console.log(`  Created property: ${format.yellow(createdPropertyId)}`);
      } else {
        // Try alternative pattern without asterisks
        const altMatch = text.match(/Property ID: (prp_\d+)/);
        if (altMatch) {
          createdPropertyId = altMatch[1];
          console.log(`  Created property: ${format.yellow(createdPropertyId)}`);
        } else {
          console.log(`  ${format.red('Warning')}: Could not extract property ID from response`);
        }
      }
      
      return result;
    });

    // Step 4: Get property details
    await runStep('Get Property Details', async () => {
      if (!createdPropertyId) throw new Error('No property ID available');
      
      const result = await getProperty(client, {
        propertyId: createdPropertyId
      });
      
      if (!result.content || result.content.length === 0) {
        throw new Error('Failed to get property details');
      }
      
      return result;
    });

    // Step 5: Create a new property version
    await runStep('Create Property Version', async () => {
      if (!createdPropertyId) throw new Error('No property ID available');
      
      const result = await createPropertyVersion(client, {
        propertyId: createdPropertyId,
        note: 'Test version created by PAPI workflow test'
      });
      
      return result;
    });

    // Step 6: Get property rules
    await runStep('Get Property Rules', async () => {
      if (!createdPropertyId) throw new Error('No property ID available');
      
      const result = await getPropertyRules(client, {
        propertyId: createdPropertyId,
        contractId: TEST_CONTRACT_ID,
        groupId: TEST_GROUP_ID
      });
      
      if (!result.content || result.content.length === 0) {
        throw new Error('Failed to get property rules');
      }
      
      // Parse the rules
      const rulesText = result.content[0].text;
      const rulesMatch = rulesText.match(/```json\n([\s\S]*?)\n```/);
      if (rulesMatch) {
        const rules = JSON.parse(rulesMatch[1]);
        console.log(`  Rule format: ${format.cyan(rules.ruleFormat)}`);
        console.log(`  Default rule: ${format.cyan(rules.rules?.name || 'default')}`);
      }
      
      return result;
    });

    // Step 7: Update property rules (add origin behavior)
    await runStep('Update Property Rules', async () => {
      if (!createdPropertyId) throw new Error('No property ID available');
      
      // Get current rules first
      const rulesResult = await getPropertyRules(client, {
        propertyId: createdPropertyId,
        contractId: TEST_CONTRACT_ID,
        groupId: TEST_GROUP_ID
      });
      
      const rulesText = rulesResult.content[0].text;
      const rulesMatch = rulesText.match(/```json\n([\s\S]*?)\n```/);
      if (!rulesMatch) throw new Error('Failed to parse rules');
      
      const rules = JSON.parse(rulesMatch[1]);
      
      // Find origin behavior
      const originBehavior = rules.rules?.behaviors?.find((b: any) => b.name === 'origin');
      if (originBehavior) {
        originBehavior.options.hostname = 'origin.example.com';
        originBehavior.options.forwardHostHeader = 'REQUEST_HOST_HEADER';
      }
      
      const updateResult = await updatePropertyRules(client, {
        propertyId: createdPropertyId,
        contractId: TEST_CONTRACT_ID,
        groupId: TEST_GROUP_ID,
        rules: rules.rules,
        note: 'Updated origin settings'
      });
      
      return updateResult;
    });

    // Step 8: Create edge hostname
    await runStep('Create Edge Hostname', async () => {
      if (!createdPropertyId) throw new Error('No property ID available');
      
      const result = await createEdgeHostname(client, {
        propertyId: createdPropertyId,
        domainPrefix: TEST_HOSTNAME.split('.')[0],
        domainSuffix: '.edgesuite.net',
        secure: false,
        ipVersion: 'IPV4'
      });
      
      return result;
    }, true); // Skip by default as it requires time to provision

    // Step 9: Add hostname to property
    await runStep('Add Hostname to Property', async () => {
      if (!createdPropertyId) throw new Error('No property ID available');
      
      const result = await addPropertyHostname(client, {
        propertyId: createdPropertyId,
        hostname: TEST_HOSTNAME,
        edgeHostname: `${TEST_HOSTNAME}.edgesuite.net`
      });
      
      return result;
    }, true); // Skip by default as it requires edge hostname

    // Step 10: List property versions
    await runStep('List Property Versions', async () => {
      if (!createdPropertyId) throw new Error('No property ID available');
      
      const result = await listPropertyVersions(client, {
        propertyId: createdPropertyId,
        contractId: TEST_CONTRACT_ID,
        groupId: TEST_GROUP_ID
      });
      
      return result;
    });

    // Step 11: Get latest property version
    await runStep('Get Latest Property Version', async () => {
      if (!createdPropertyId) throw new Error('No property ID available');
      
      const result = await getLatestPropertyVersion(client, {
        propertyId: createdPropertyId,
        contractId: TEST_CONTRACT_ID,
        groupId: TEST_GROUP_ID
      });
      
      return result;
    });

    // Step 12: Search for property
    await runStep('Search Properties', async () => {
      const result = await searchProperties(client, {
        propertyName: TEST_PROPERTY_NAME
      });
      
      return result;
    });

    // Step 13: Activate to staging (skip by default)
    await runStep('Activate Property to Staging', async () => {
      if (!createdPropertyId) throw new Error('No property ID available');
      
      const result = await activateProperty(client, {
        propertyId: createdPropertyId,
        network: 'STAGING',
        note: 'Test activation to staging',
        acknowledgeAllWarnings: true
      });
      
      return result;
    }, true); // Skip by default to avoid actual activation

    // Print summary
    console.log(`\n${icons.list} Workflow Test Summary\n`);
    
    const passed = testSteps.filter(s => s.status === 'passed').length;
    const failed = testSteps.filter(s => s.status === 'failed').length;
    const skipped = testSteps.filter(s => s.status === 'skipped').length;
    
    console.log(`  ${icons.success} Passed: ${format.green(passed.toString())}`);
    console.log(`  ${icons.error} Failed: ${format.red(failed.toString())}`);
    console.log(`  ${icons.warning} Skipped: ${format.yellow(skipped.toString())}`);
    
    if (createdPropertyId) {
      console.log(`\n${icons.info} Created Property: ${format.cyan(createdPropertyId)}`);
      console.log(`  Name: ${TEST_PROPERTY_NAME}`);
    }
    
    if (failed === 0) {
      console.log(`\n${icons.sparkle} PAPI workflow test completed successfully!`);
    }

  } catch (error) {
    console.error(`\n${icons.error} Workflow failed:`, error);
  } finally {
    await cleanup(client);
  }
}

// Run the workflow test
main().catch(error => {
  console.error(`${icons.error} Test execution failed:`, error);
  process.exit(1);
});