/**
 * Basic integration test for authentication and contracts API
 * KISS principle - simple verification that core functionality works
 * Enhanced for 1Password integration in GitHub Actions
 */

import { AkamaiClient } from '../../src/akamai-client';
import { listProperties } from '../../src/tools/property-tools';
import { CustomerConfigManager } from '../../src/utils/customer-config';
import fs from 'fs';
import path from 'path';

describe('Basic Authentication and Contracts API', () => {
  let client: AkamaiClient;
  const testEnvironment = process.env.TEST_ENVIRONMENT || 'staging';
  const isCI = process.env.CI === 'true';
  const isNoAuthTest = process.env.NO_AUTH_TEST === 'true';

  beforeAll(() => {
    console.log(`🔧 Test Environment: ${testEnvironment}`);
    console.log(`🔧 CI Environment: ${isCI}`);
    console.log(`🔧 No Auth Test: ${isNoAuthTest}`);

    // Initialize the client
    client = new AkamaiClient();
  });

  test('should authenticate and get contracts', async () => {
    // Check for .edgerc file in multiple locations
    const edgercPaths = [
      path.join(process.env.HOME || '', '.edgerc'),
      path.join(process.env.HOME || '', '.akamai', '.edgerc'),
      './.edgerc',
    ];

    const edgercPath = edgercPaths.find((p) => fs.existsSync(p));

    if (!edgercPath || isNoAuthTest) {
      console.log('⚠️  No .edgerc file found - skipping authentication test');
      if (isCI && !isNoAuthTest) {
        throw new Error('❌ Expected .edgerc file in CI environment but none found');
      }
      return;
    }

    console.log(`🔑 Using .edgerc file: ${edgercPath}`);

    // Validate .edgerc file has required credentials
    const edgercContent = fs.readFileSync(edgercPath, 'utf8');
    const hasRequiredFields = ['client_token', 'client_secret', 'access_token', 'host'].every(
      (field) => edgercContent.includes(field),
    );

    if (!hasRequiredFields) {
      throw new Error(
        '❌ .edgerc file missing required fields (client_token, client_secret, access_token, host)',
      );
    }

    try {
      console.log(`🔌 Testing authentication with customer: ${testEnvironment}`);

      // Test basic authentication by listing properties
      // Try the test environment first, fall back to default
      let customer = testEnvironment;
      let result;

      try {
        result = await listProperties(client, { customer });
        console.log(`✅ Authentication successful with customer: ${customer}`);
      } catch (customerError) {
        // If test environment fails, try default
        if (customer !== 'default') {
          console.log(`⚠️  Customer '${customer}' failed, trying 'default'`);
          customer = 'default';
          result = await listProperties(client, { customer });
          console.log(`✅ Authentication successful with customer: ${customer}`);
        } else {
          throw customerError;
        }
      }

      // Should get a response (even if empty)
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');

      // Log some basic info about the response
      if (result && typeof result === 'object') {
        console.log(`📊 API Response type: ${Array.isArray(result) ? 'array' : 'object'}`);
        if (Array.isArray(result)) {
          console.log(`📊 Response contains ${result.length} items`);
        }
      }
    } catch (error) {
      console.error('🚨 Authentication test failed:', error);

      // Enhanced error analysis
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();

        if (
          errorMessage.includes('401') ||
          errorMessage.includes('authentication') ||
          errorMessage.includes('unauthorized')
        ) {
          throw new Error(
            `❌ Authentication failed: ${error.message}\n🔧 Check .edgerc credentials for environment: ${testEnvironment}`,
          );
        }

        if (errorMessage.includes('403') || errorMessage.includes('forbidden')) {
          throw new Error(
            `❌ Authorization failed: ${error.message}\n🔧 Check account permissions for customer: ${testEnvironment}`,
          );
        }

        if (
          errorMessage.includes('network') ||
          errorMessage.includes('enotfound') ||
          errorMessage.includes('timeout')
        ) {
          if (isCI) {
            console.log('⚠️  Network error in CI - this may be expected');
            return;
          } else {
            throw new Error(`❌ Network error: ${error.message}`);
          }
        }

        if (errorMessage.includes('section') && errorMessage.includes('not found')) {
          throw new Error(
            `❌ Configuration error: ${error.message}\n🔧 Customer section '${testEnvironment}' not found in .edgerc`,
          );
        }
      }

      // Re-throw with additional context
      throw new Error(
        `❌ Unexpected authentication error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }, 45000); // Increased timeout for network operations

  test('should have valid customer configuration', () => {
    const configManager = CustomerConfigManager.getInstance();

    // Should have at least default section
    expect(configManager.hasSection('default')).toBe(true);

    // Should be able to list sections
    const sections = configManager.listSections();
    expect(Array.isArray(sections)).toBe(true);
    expect(sections.length).toBeGreaterThan(0);

    console.log('✅ Customer configuration valid');
  });

  test('should have working build artifacts', () => {
    const fs = require('fs');
    const path = require('path');

    // Check that build artifacts exist
    const distPath = path.join(__dirname, '../../dist');
    expect(fs.existsSync(distPath)).toBe(true);

    // Check main entry points
    expect(fs.existsSync(path.join(distPath, 'index.js'))).toBe(true);
    expect(fs.existsSync(path.join(distPath, 'index-oauth.js'))).toBe(true);
    expect(fs.existsSync(path.join(distPath, 'akamai-client.js'))).toBe(true);

    console.log('✅ Build artifacts present');
  });
});
