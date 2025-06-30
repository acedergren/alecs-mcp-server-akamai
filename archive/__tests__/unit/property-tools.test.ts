import { jest } from '@jest/globals';
import { listGroups } from '../../src/tools/property-tools';
import { AkamaiClient } from '../../src/akamai-client';

// Mock the AkamaiClient
jest.mock('../../src/akamai-client');

describe('Property Tools', () => {
  let mockClient: jest.Mocked<AkamaiClient>;

  beforeEach(() => {
    mockClient = {
      request: jest.fn(),
      getConfig: jest.fn(),
    } as any;
  });

  // Helper to get text content from result
  const getTextContent = (result: any): string => {
    const content = result.content[0];
    if (content && 'text' in content) {
      return content.text;
    }
    return '';
  };

  describe('listGroups', () => {
    const mockGroupsResponse = {
      groups: {
        items: [
          {
            groupId: 'grp_18385',
            groupName: 'Akamai Technologies - Assets',
            contractIds: ['ctr_1-3CV382'],
            parentGroupId: null
          },
          {
            groupId: 'grp_18432',
            groupName: 'Pablo and Naveen',
            contractIds: ['ctr_1-3CV382'],
            parentGroupId: 'grp_18385'
          },
          {
            groupId: 'grp_12345',
            groupName: 'acedergr-test-group',
            contractIds: ['ctr_1-3CV382'],
            parentGroupId: 'grp_18385'
          },
          {
            groupId: 'grp_67890',
            groupName: 'Another Group',
            contractIds: ['ctr_1-3CV382'],
            parentGroupId: 'grp_18385'
          }
        ]
      }
    };

    it('should list all groups when no search term provided', async () => {
      mockClient.request.mockResolvedValue(mockGroupsResponse);

      const result = await listGroups(mockClient, {});

      expect(mockClient.request).toHaveBeenCalledWith({
        path: '/papi/v1/groups',
        method: 'GET'
      });

      const text = getTextContent(result);
      expect(text).toContain('4 groups found');
      expect(text).toContain('Akamai Technologies - Assets');
      expect(text).toContain('Group Name to ID Lookup');
    });

    it('should filter groups by search term', async () => {
      mockClient.request.mockResolvedValue(mockGroupsResponse);

      const result = await listGroups(mockClient, { searchTerm: 'acedergr' });

      const text = getTextContent(result);
      expect(text).toContain('1 groups matching "acedergr"');
      expect(text).toContain('acedergr-test-group');
      expect(text).toContain('Group 12345');
      expect(text).not.toContain('Pablo and Naveen');
    });

    it('should search by group ID', async () => {
      mockClient.request.mockResolvedValue(mockGroupsResponse);

      const result = await listGroups(mockClient, { searchTerm: 'grp_67890' });

      const text = getTextContent(result);
      expect(text).toContain('1 groups matching "grp_67890"');
      expect(text).toContain('Another Group');
      expect(text).toContain('grp_67890');
    });

    it('should handle case-insensitive search', async () => {
      mockClient.request.mockResolvedValue(mockGroupsResponse);

      const result = await listGroups(mockClient, { searchTerm: 'ACEDERGR' });

      const text = getTextContent(result);
      expect(text).toContain('1 groups matching "ACEDERGR"');
      expect(text).toContain('acedergr-test-group');
    });

    it('should show no results message when search finds nothing', async () => {
      mockClient.request.mockResolvedValue(mockGroupsResponse);

      const result = await listGroups(mockClient, { searchTerm: 'nonexistent' });

      const text = getTextContent(result);
      expect(text).toContain('No groups found matching "nonexistent"');
      expect(text).toContain('Try a partial name or group ID');
    });

    it('should display hierarchical group structure', async () => {
      mockClient.request.mockResolvedValue(mockGroupsResponse);

      const result = await listGroups(mockClient, {});

      const text = getTextContent(result);
      // Parent group should appear first
      expect(text.indexOf('Akamai Technologies - Assets'))
        .toBeLessThan(text.indexOf('Pablo and Naveen'));
      // Check for child group indentation
      expect(text).toMatch(/Child Groups:/);
    });

    it('should include lookup table with all groups sorted alphabetically', async () => {
      mockClient.request.mockResolvedValue(mockGroupsResponse);

      const result = await listGroups(mockClient, {});

      const text = getTextContent(result);
      expect(text).toContain('| Group Name | Group ID | Contracts |');
      
      // Check alphabetical order in lookup table
      const aceIndex = text.lastIndexOf('acedergr-test-group');
      const anotherIndex = text.lastIndexOf('Another Group');
      expect(aceIndex).toBeLessThan(anotherIndex);
    });

    it('should handle empty groups response', async () => {
      mockClient.request.mockResolvedValue({ groups: { items: [] } });

      const result = await listGroups(mockClient, {});

      const text = getTextContent(result);
      expect(text).toContain('No groups found in your account');
      expect(text).toContain('permissions issue');
    });

    it('should handle API errors gracefully', async () => {
      mockClient.request.mockRejectedValue(new Error('API Error: Access denied'));

      const result = await listGroups(mockClient, {});

      const text = getTextContent(result);
      expect(text).toContain('Failed to list groups');
      expect(text).toContain('API Error: Access denied');
    });
  });
});