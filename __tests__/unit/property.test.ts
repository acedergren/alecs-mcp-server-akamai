import { propertyOperations } from '@/tools/property';
import { testTool } from '@/testing/unified-test-base';
import { MCPToolResponse } from '@/types';

describe('Property Domain Tools', () => {

  describe('listProperties', () => {
    it('should correctly list properties and format them as text', async () => {
      const mockApiResponse = {
        properties: {
          items: [
            { propertyId: 'prp_1', propertyName: 'test.com', latestVersion: 1, productionVersion: 1 },
            { propertyId: 'prp_2', propertyName: 'example.org', latestVersion: 2, stagingVersion: 2 },
          ],
        },
      };

      const result = await testTool(propertyOperations.property_list.handler)
        .withMockResponse('GET', '/papi/v1/properties', mockApiResponse)
        .run();

      const content = result.content[0].text;
      expect(content).toContain('Found **2** properties:');
      expect(content).toContain('test.com');
      expect(content).toContain('example.org');
    });

    it('should return a message when no properties are found', async () => {
      const result = await testTool(propertyOperations.property_list.handler)
        .withMockResponse('GET', '/papi/v1/properties', { properties: { items: [] } })
        .run();
      
      const content = result.content[0].text;
      expect(content).toContain('No properties found.');
    });
  });

  describe('getProperty', () => {
    it('should retrieve details for a specific property', async () => {
      const mockApiResponse = {
        properties: {
          items: [
            { propertyId: 'prp_123', propertyName: 'details.com', latestVersion: 1, productionVersion: 1 },
          ],
        },
      };

      const result = await testTool(propertyOperations.property_get.handler)
        .withArgs({ propertyId: 'prp_123' })
        .withMockResponse('GET', '/papi/v1/properties/prp_123', mockApiResponse)
        .run();

      const content = result.content[0].text;
      expect(content).toContain('Property Details');
      expect(content).toContain('details.com');
      expect(content).toContain('prp_123');
    });
  });

});
