/**
 * 🚀 SIMPLE END-TO-END TEST
 * A focused e2e test that validates core functionality
 */

import { AkamaiClient } from '../../src/akamai-client';
import { listProperties, getProperty, createProperty, listContracts } from '../../src/tools/property-tools';
import { listZones, createZone } from '../../src/tools/dns-tools';

describe('Simple E2E Test Suite', () => {
  let client: AkamaiClient;

  beforeAll(async () => {
    // Initialize Akamai client
    client = new AkamaiClient();
  });

  describe('Property Management', () => {
    test('should list properties successfully', async () => {
      const result = await listProperties(client, { customer: 'default' });
      
      expect(result).toBeDefined();
      expect(result.content).toBeInstanceOf(Array);
      expect(result.content[0]).toHaveProperty('type', 'text');
      
      const text = result.content[0].text;
      expect(text).toContain('Properties');
    });

    test('should handle missing propertyId gracefully', async () => {
      const result = await getProperty(client, {} as any); // Missing required propertyId
      
      expect(result).toBeDefined();
      expect(result.content).toBeInstanceOf(Array);
      expect(result.content[0].text).toContain('Failed to get property');
    });
  });

  describe('Contract Management', () => {
    test('should list contracts successfully', async () => {
      const result = await listContracts(client, {});
      
      expect(result).toBeDefined();
      expect(result.content).toBeInstanceOf(Array);
      expect(result.content[0]).toHaveProperty('type', 'text');
      
      const text = result.content[0].text;
      expect(text).toContain('Contracts');
    });
  });

  describe('DNS Management', () => {
    test('should list zones successfully', async () => {
      const result = await listZones(client, {});
      
      expect(result).toBeDefined();
      expect(result.content).toBeInstanceOf(Array);
      expect(result.content[0]).toHaveProperty('type', 'text');
      
      const text = result.content[0].text;
      expect(text).toContain('Found');
    });
  });
});