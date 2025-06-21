/**
 * Basic integration test for authentication and contracts API
 * KISS principle - simple verification that core functionality works
 */

import { AkamaiClient } from '../../src/akamai-client';
import { listProperties } from '../../src/tools/property-tools';
import { CustomerConfigManager } from '../../src/utils/customer-config';

describe('Basic Authentication and Contracts API', () => {
  let client: AkamaiClient;

  beforeAll(() => {
    // Initialize the client
    client = new AkamaiClient();
  });

  test('should authenticate and get contracts', async () => {
    // Skip authentication test if no .edgerc file is available
    const fs = require('fs');
    const path = require('path');
    const edgercPath = path.join(process.env.HOME || '', '.edgerc');

    if (!fs.existsSync(edgercPath)) {
      console.log('⚠️  No .edgerc file found - skipping authentication test (expected in CI)');
      return;
    }

    try {
      // Test basic authentication by listing properties
      // This will fail if auth is not working
      const result = await listProperties(client, { customer: 'default' });

      // Should get a response (even if empty)
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');

      // If we get here, authentication is working
      console.log('✅ Authentication successful');
    } catch (error) {
      // Check if it's an auth error vs network error
      if (error instanceof Error) {
        if (error.message.includes('401') || error.message.includes('authentication')) {
          throw new Error('❌ Authentication failed - check .edgerc configuration');
        }
        if (error.message.includes('network') || error.message.includes('ENOTFOUND')) {
          console.log('⚠️  Network error - this is expected in CI without Akamai access');
          return; // Skip test in CI
        }
      }
      throw error;
    }
  }, 30000);

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
