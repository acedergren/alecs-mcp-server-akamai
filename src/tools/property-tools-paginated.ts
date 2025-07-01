/**
 * PAGINATED PROPERTY TOOLS
 * 
 * CODE KAI ARCHITECTURE:
 * This module provides paginated versions of property management tools
 * to handle large datasets that exceed MCP's 25,000 token limit.
 * 
 * PROBLEM ADDRESSED:
 * - list-groups exceeded token limits with large responses
 * - list-properties can also exceed limits with many properties
 * - list-property-versions generates massive responses
 * 
 * SOLUTION:
 * - Client-side pagination for PAPI (no native pagination)
 * - Automatic response truncation with metadata
 * - Clear pagination hints for users
 */

import { AkamaiClient } from '../akamai-client';
import { MCPToolResponse } from '../types';
import { createErrorHandler } from '../utils/error-handler';
import { createLogger } from '../utils/pino-logger';
import {
  paginateArray,
  truncateResponse,
  formatPaginationInfo,
  createPaginationSuggestions,
  wouldExceedTokenLimit,
  PaginationOptions,
} from '../utils/pagination-helper';
import { 
  PapiGroupsListResponse,
  PapiPropertiesListResponse,
  PapiPropertyVersionsResponse,
  isPapiGroupsResponse,
  isPapiPropertiesResponse,
  isPapiPropertyVersionsResponse,
  isPapiError,
} from '../types/api-responses/papi-properties';

const logger = createLogger('property-tools-paginated');
const errorHandler = createErrorHandler('property');

/**
 * List groups with pagination support
 */
export async function listGroupsPaginated(
  client: AkamaiClient,
  args: { 
    searchTerm?: string;
    page?: number;
    pageSize?: number;
    customer?: string;
  }
): Promise<MCPToolResponse> {
  try {
    // Fetch all groups (PAPI doesn't support native pagination)
    const rawResponse = await client.request({
      path: '/papi/v1/groups',
      method: 'GET',
    });

    if (isPapiError(rawResponse)) {
      throw new Error(`Failed to list groups: ${rawResponse.detail}`);
    }

    if (!isPapiGroupsResponse(rawResponse)) {
      throw new Error('Invalid groups response structure from PAPI API');
    }

    const response = rawResponse as PapiGroupsListResponse;

    if (!response.groups?.items || response.groups.items.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              groups: [],
              pagination: {
                page: 1,
                pageSize: 50,
                totalItems: 0,
                totalPages: 0,
                hasNext: false,
                hasPrevious: false,
              },
              metadata: {
                total: 0,
                filtered: 0,
                searchTerm: args.searchTerm || null,
              },
              error: {
                type: 'NO_GROUPS_FOUND',
                message: 'No groups found in your account',
                suggestion: 'This might indicate a permissions issue with your API credentials',
              },
            }, null, 2),
          },
        ],
      };
    }

    // Filter groups by search term if provided
    let groups = response.groups.items;
    const totalGroups = groups.length;

    if (args.searchTerm) {
      const searchLower = args.searchTerm.toLowerCase();
      groups = groups.filter(
        (g: any) =>
          g.groupName.toLowerCase().includes(searchLower) ||
          g.groupId.toLowerCase().includes(searchLower),
      );
    }

    // Apply pagination
    const paginationOptions: PaginationOptions = {
      page: args.page || 1,
      pageSize: args.pageSize || 50,
      estimatedItemSize: 500, // Estimated chars per group
    };

    const paginated = paginateArray(groups, paginationOptions);

    // Build hierarchy for paginated results
    const topLevelGroups = paginated.items.filter((g: any) => !g.parentGroupId);
    const groupsByParent = paginated.items.reduce(
      (acc: any, group: any) => {
        if (group.parentGroupId) {
          if (!acc[group.parentGroupId]) {
            acc[group.parentGroupId] = [];
          }
          acc[group.parentGroupId].push(group);
        }
        return acc;
      },
      {} as Record<string, typeof groups>,
    );

    // Function to build hierarchical structure
    const buildHierarchy = (group: any): any => {
      const children = groupsByParent[group.groupId] || [];
      return {
        groupId: group.groupId,
        groupName: group.groupName,
        contractIds: group.contractIds || [],
        parentGroupId: group.parentGroupId || null,
        children: children.map((child: any) => buildHierarchy(child)),
      };
    };

    // Build structured response
    const hierarchy = topLevelGroups.map((group: any) => buildHierarchy(group));

    // Extract all unique contracts from paginated results
    const allContracts = new Set<string>();
    paginated.items.forEach((g: any) => {
      if (g.contractIds) {
        g.contractIds.forEach((c: string) => allContracts.add(c));
      }
    });

    const structuredResponse = {
      groups: {
        hierarchy: hierarchy,
        flat: paginated.items.map((group: any) => ({
          groupId: group.groupId,
          groupName: group.groupName,
          contractIds: group.contractIds || [],
          parentGroupId: group.parentGroupId || null,
        })),
      },
      contracts: {
        unique: Array.from(allContracts).sort(),
        total: allContracts.size,
      },
      pagination: {
        ...paginated.pagination,
        info: formatPaginationInfo(paginated.pagination),
      },
      metadata: {
        total: totalGroups,
        filtered: groups.length,
        searchTerm: args.searchTerm || null,
        topLevelGroups: topLevelGroups.length,
        hasHierarchy: topLevelGroups.length < paginated.items.length,
        truncated: false,
        originalCount: 0,
        suggestions: [] as string[],
      },
    };

    // Check if response would exceed token limit
    if (wouldExceedTokenLimit(structuredResponse)) {
      logger.warn('Response would exceed token limit, applying additional truncation');
      
      // Truncate the hierarchy to fit
      const truncated = truncateResponse(structuredResponse.groups.flat, { includeMetadata: true });
      
      structuredResponse.groups.flat = truncated.items;
      structuredResponse.metadata.truncated = truncated.truncated;
      structuredResponse.metadata.originalCount = truncated.originalCount;
    }

    // Add pagination suggestions
    const suggestions = createPaginationSuggestions(paginated, 'list-groups');
    if (suggestions.length > 0) {
      structuredResponse.metadata.suggestions = suggestions;
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(structuredResponse, null, 2),
        },
      ],
    };
  } catch (_error) {
    return errorHandler.handle('listGroupsPaginated', _error, undefined, {
      searchTerm: args.searchTerm,
      page: args.page,
      pageSize: args.pageSize,
    });
  }
}

/**
 * List properties with pagination support
 */
export async function listPropertiesPaginated(
  client: AkamaiClient,
  args: {
    contractId?: string;
    groupId?: string;
    page?: number;
    pageSize?: number;
    customer?: string;
  }
): Promise<MCPToolResponse> {
  try {
    const queryParams: Record<string, string> = {};
    if (args.contractId) {queryParams['contractId'] = args.contractId;}
    if (args.groupId) {queryParams['groupId'] = args.groupId;}

    const rawResponse = await client.request({
      path: '/papi/v1/properties',
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'PAPI-Use-Prefixes': 'true',
      },
      queryParams,
    });

    if (isPapiError(rawResponse)) {
      throw new Error(`Failed to list properties: ${rawResponse.detail}`);
    }

    if (!isPapiPropertiesResponse(rawResponse)) {
      throw new Error('Invalid properties response structure from PAPI API');
    }

    const response = rawResponse as PapiPropertiesListResponse;

    if (!response.properties?.items || response.properties.items.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              properties: [],
              pagination: {
                page: 1,
                pageSize: 50,
                totalItems: 0,
                totalPages: 0,
                hasNext: false,
                hasPrevious: false,
              },
              metadata: {
                contractId: args.contractId,
                groupId: args.groupId,
              },
            }, null, 2),
          },
        ],
      };
    }

    // Apply pagination
    const paginationOptions: PaginationOptions = {
      page: args.page || 1,
      pageSize: args.pageSize || 25, // Smaller page size for properties
      estimatedItemSize: 800, // Properties have more data
    };

    const paginated = paginateArray(response.properties.items, paginationOptions);

    const structuredResponse = {
      properties: paginated.items.map((prop: any) => ({
        propertyId: prop.propertyId,
        propertyName: prop.propertyName,
        contractId: prop.contractId,
        groupId: prop.groupId,
        productId: prop.productId || null,
        assetId: prop.assetId || null,
        latestVersion: prop.latestVersion || null,
        productionVersion: prop.productionVersion || null,
        stagingVersion: prop.stagingVersion || null,
        updatedDate: prop.updatedDate || null,
      })),
      pagination: {
        ...paginated.pagination,
        info: formatPaginationInfo(paginated.pagination),
      },
      metadata: {
        contractId: args.contractId,
        groupId: args.groupId,
        totalProperties: response.properties.items.length,
        suggestions: [] as string[],
      },
    };

    // Add pagination suggestions
    const suggestions = createPaginationSuggestions(paginated, 'list-properties');
    if (suggestions.length > 0) {
      structuredResponse.metadata.suggestions = suggestions;
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(structuredResponse, null, 2),
        },
      ],
    };
  } catch (_error) {
    return errorHandler.handle('listPropertiesPaginated', _error, undefined, args);
  }
}

/**
 * List property versions with pagination
 */
export async function listPropertyVersionsPaginated(
  client: AkamaiClient,
  args: {
    propertyId: string;
    page?: number;
    pageSize?: number;
    customer?: string;
  }
): Promise<MCPToolResponse> {
  try {
    const queryParams = {
      contractId: '', // Will be determined from property
      groupId: '', // Will be determined from property
    };

    // First get property details to extract contract and group
    const propertyResponse = await client.request({
      path: `/papi/v1/properties/${args.propertyId}`,
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'PAPI-Use-Prefixes': 'true',
      },
    });

    if (isPapiError(propertyResponse)) {
      throw new Error(`Failed to get property details: ${propertyResponse.detail}`);
    }

    const property = (propertyResponse as any).properties?.items?.[0];
    if (property) {
      queryParams.contractId = property.contractId;
      queryParams.groupId = property.groupId;
    }

    // Now get versions
    const rawResponse = await client.request({
      path: `/papi/v1/properties/${args.propertyId}/versions`,
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'PAPI-Use-Prefixes': 'true',
      },
      queryParams,
    });

    if (isPapiError(rawResponse)) {
      throw new Error(`Failed to list property versions: ${rawResponse.detail}`);
    }

    if (!isPapiPropertyVersionsResponse(rawResponse)) {
      throw new Error('Invalid property versions response structure');
    }

    const response = rawResponse as PapiPropertyVersionsResponse;

    if (!response.versions?.items || response.versions.items.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              versions: [],
              pagination: {
                page: 1,
                pageSize: 20,
                totalItems: 0,
                totalPages: 0,
                hasNext: false,
                hasPrevious: false,
              },
              metadata: {
                propertyId: args.propertyId,
              },
            }, null, 2),
          },
        ],
      };
    }

    // Apply pagination
    const paginationOptions: PaginationOptions = {
      page: args.page || 1,
      pageSize: args.pageSize || 20, // Even smaller for versions
      estimatedItemSize: 1000, // Versions can have lots of metadata
    };

    const paginated = paginateArray(response.versions.items, paginationOptions);

    const structuredResponse = {
      propertyId: args.propertyId,
      propertyName: response.propertyName,
      versions: paginated.items.map((version: any) => ({
        propertyVersion: version.propertyVersion,
        updatedDate: version.updatedDate,
        updatedByUser: version.updatedByUser,
        productionStatus: version.productionStatus || 'INACTIVE',
        stagingStatus: version.stagingStatus || 'INACTIVE',
        note: version.note || null,
      })),
      pagination: {
        ...paginated.pagination,
        info: formatPaginationInfo(paginated.pagination),
      },
      metadata: {
        propertyId: args.propertyId,
        contractId: response.contractId,
        groupId: response.groupId,
        totalVersions: response.versions.items.length,
        suggestions: [] as string[],
      },
    };

    // Add pagination suggestions
    const suggestions = createPaginationSuggestions(paginated, 'list-property-versions');
    if (suggestions.length > 0) {
      structuredResponse.metadata.suggestions = suggestions;
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(structuredResponse, null, 2),
        },
      ],
    };
  } catch (_error) {
    return errorHandler.handle('listPropertyVersionsPaginated', _error, undefined, args);
  }
}