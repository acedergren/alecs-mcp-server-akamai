/**
 * Property Manager API Integration
 * Implements core CRUD operations for Akamai CDN properties
 */

import {
  formatContractDisplay,
  formatGroupDisplay,
  formatPropertyDisplay,
  ensurePrefix,
} from '../utils/formatting';
import {
  validateParameters,
  PropertyManagerSchemas,
  formatQueryParameters,
  ensureAkamaiIdFormat,
} from '../utils/parameter-validation';
import { formatProductDisplay } from '../utils/product-mapping';
import { parseAkamaiResponse } from '../utils/response-parsing';
import { withToolErrorHandling, type ErrorContext } from '../utils/tool-error-handling';
import { type TreeNode, renderTree, generateTreeSummary, formatGroupNode } from '../utils/tree-view';

import { type AkamaiClient } from '../akamai-client';
import { type MCPToolResponse, type Property } from '../types';

/**
 * Format a date string to a more readable format
 */
function formatDate(dateString: string | undefined): string {
  if (!dateString) {
    return 'N/A';
  }
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

/**
 * Format activation status with appropriate indicator
 */
function formatStatus(status: string | undefined): string {
  if (!status) {
    return '[INACTIVE]';
  }

  const statusMap: Record<string, string> = {
    ACTIVE: '[ACTIVE]',
    INACTIVE: '[INACTIVE]',
    PENDING: '[PENDING]',
    FAILED: '[FAILED]',
    DEACTIVATED: '[DEACTIVATED]',
    NEW: '[NEW]',
  };

  return statusMap[status] || `[${status}]`;
}

/**
 * List all properties in the account
 * Displays comprehensive information about each property including versions and activation status
 */
export async function listProperties(
  client: AkamaiClient,
  args: {
    contractId?: string;
    groupId?: string;
    limit?: number;
    customer?: string;
    includeSubgroups?: boolean;
  },
): Promise<MCPToolResponse> {
  const _context: ErrorContext = {
    operation: 'list properties',
    endpoint: '/papi/v1/properties',
    apiType: 'papi',
    customer: args.customer,
  };

  // If a specific groupId is provided, use tree view
  if (args.groupId && args.includeSubgroups !== false) {
    return listPropertiesTreeView(client, {
      groupId: args.groupId,
      includeSubgroups: true,
      customer: args.customer,
    });
  }

  return withToolErrorHandling(async () => {
    // Validate parameters
    const validatedArgs = validateParameters(PropertyManagerSchemas.listProperties, args);

    // OPTIMIZATION: Add limit to prevent memory issues with large accounts
    const MAX_PROPERTIES_TO_DISPLAY = validatedArgs.limit || 50;

    // If no contract ID provided, get the first available contract
    let contractId = validatedArgs.contractId
      ? ensureAkamaiIdFormat(validatedArgs.contractId, 'contract')
      : undefined;
    let groupId = validatedArgs.groupId
      ? ensureAkamaiIdFormat(validatedArgs.groupId, 'group')
      : undefined;

    if (!contractId) {
      // Get groups to find the first contract
      const groupsResponse = await client.request({
        path: '/papi/v1/groups',
        method: 'GET',
      });

      if (groupsResponse.groups?.items?.length > 0) {
        // Find first contract from any group
        for (const group of groupsResponse.groups.items) {
          if (group.contractIds?.length > 0) {
            contractId = group.contractIds[0];
            if (!groupId) {
              groupId = group.groupId;
            }
            break;
          }
        }
      }

      if (!contractId) {
        return {
          content: [
            {
              type: 'text',
              text: 'No contracts found in your account. Please check your API credentials and permissions.',
            },
          ],
        };
      }
    }

    // Build query parameters with proper formatting
    const queryParams = formatQueryParameters({
      contractId,
      groupId,
      limit: MAX_PROPERTIES_TO_DISPLAY,
    });

    const response = await client.request({
      path: '/papi/v1/properties',
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'PAPI-Use-Prefixes': 'true',
      },
      queryParams,
    });

    // Parse response with enhanced validation
    const parsedResponse = parseAkamaiResponse(response, 'papi');

    // Handle empty results
    if (!parsedResponse.properties || parsedResponse.properties.length === 0) {
      let message = 'No properties found';
      if (args.contractId) {
        message += ` for contract ${args.contractId}`;
      }
      if (args.groupId) {
        message += ` in group ${args.groupId}`;
      }
      message += '.';

      if (!args.contractId && !args.groupId) {
        message +=
          '\n\n[TIP] Use the list_groups tool to find available contracts and groups.';
      }

      return {
        content: [
          {
            type: 'text',
            text: message,
          },
        ],
      };
    }

    // Format properties list with comprehensive details
    const allProperties = parsedResponse.properties;
    const totalProperties = allProperties.length;

    // OPTIMIZATION: Limit displayed properties to prevent output overload
    const propertiesToShow = allProperties.slice(0, MAX_PROPERTIES_TO_DISPLAY);
    const hasMore = totalProperties > MAX_PROPERTIES_TO_DISPLAY;

    let text = `# Akamai Properties (${hasMore ? `showing ${propertiesToShow.length} of ${totalProperties}` : `${totalProperties} found`})\n\n`;

    // Add filter information
    text += '**Filters Applied:**\n';
    if (contractId) {
      text += `- Contract: ${formatContractDisplay(contractId)}${!args.contractId ? ' (auto-selected)' : ''}\n`;
    }
    if (groupId) {
      text += `- Group: ${formatGroupDisplay(groupId)}${!args.groupId && !args.contractId ? ' (auto-selected)' : ''}\n`;
    }
    if (hasMore) {
      text += `- **Limit:** Showing first ${MAX_PROPERTIES_TO_DISPLAY} properties\n`;
    }
    text += '\n';

    // Group properties by contract for better organization
    const propertiesByContract = propertiesToShow.reduce(
      (acc: Record<string, Property[]>, prop: Property) => {
        const contract = prop.contractId;
        if (!acc[contract]) {
          acc[contract] = [];
        }
        acc[contract].push(prop);
        return acc;
      },
      {} as Record<string, Property[]>,
    );

    // Display properties organized by contract
    for (const [contractId, contractProps] of Object.entries(propertiesByContract)) {
      text += `## ${formatContractDisplay(contractId)}\n\n`;

      for (const prop of contractProps as Property[]) {
        text += `### [PROPERTY] ${prop.propertyName}\n`;
        text += `- **Property ID:** ${formatPropertyDisplay(prop.propertyId)}\n`;
        text += `- **Current Version:** ${prop.latestVersion || 'N/A'}\n`;
        text += `- **Production:** ${formatStatus(prop.productionStatus)}\n`;
        text += `- **Staging:** ${formatStatus(prop.stagingStatus)}\n`;
        text += `- **Group:** ${formatGroupDisplay(prop.groupId)}\n`;

        if (prop.note) {
          text += `- **Notes:** ${prop.note}\n`;
        }

        text += '\n';
      }
    }

    if (hasMore) {
      text += `\n[WARNING] **Note:** Only showing first ${MAX_PROPERTIES_TO_DISPLAY} properties out of ${totalProperties} total.\n`;
      text += 'To see more properties:\n';
      text += '- Filter by specific group: `"list properties in group grp_XXXXX"`\n';
      text += '- Search for specific property: `"get property [name or ID]"`\n';
      text += '- Increase limit: `"list properties with limit 100"`\n';
    }

    // Add helpful next steps
    text += '## Next Steps\n\n';
    text += '- To view detailed configuration: `"Show me details for property [propertyId]"`\n';
    text += '- To view property rules: `"Show me the rules for property [propertyId]"`\n';
    text += '- To activate a property: `"Activate property [propertyId] to staging"`\n';
    text += '- To create a new property: `"Create a new property called [name]"`\n';

    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  }, _context);
}

/**
 * List properties with tree view for groups and their subgroups
 * Provides hierarchical display of properties within group structures
 */
export async function listPropertiesTreeView(
  client: AkamaiClient,
  args: { groupId: string; includeSubgroups?: boolean; customer?: string },
): Promise<MCPToolResponse> {
  const _context: ErrorContext = {
    operation: 'list properties tree view',
    endpoint: '/papi/v1/properties',
    apiType: 'papi',
    customer: args.customer,
  };

  return withToolErrorHandling(async () => {
    const groupId = ensureAkamaiIdFormat(args.groupId, 'group');

    // Get all groups to build hierarchy
    const groupsResponse = await client.request({
      path: '/papi/v1/groups',
      method: 'GET',
    });

    if (!groupsResponse.groups?.items?.length) {
      return {
        content: [
          {
            type: 'text',
            text: 'No groups found. Please check your API credentials.',
          },
        ],
      };
    }

    // Find the target group and its hierarchy
    const targetGroup = groupsResponse.groups.items.find((g: any) => g.groupId === groupId);
    if (!targetGroup) {
      return {
        content: [
          {
            type: 'text',
            text: `Group ${groupId} not found.`,
          },
        ],
      };
    }

    // Build tree structure
    const treeNodes: TreeNode[] = [];
    const contractSummary: Map<string, { groupCount: number; propertyCount: number }> = new Map();

    // First pass: collect statistics
    const allGroupsInHierarchy = new Set<string>();
    const collectGroupStats = (groupId: string) => {
      allGroupsInHierarchy.add(groupId);
      const children = groupsResponse.groups.items.filter((g: any) => g.parentGroupId === groupId);
      children.forEach((child: any) => collectGroupStats(child.groupId));
    };
    collectGroupStats(targetGroup.groupId);

    // Get properties for the main group
    if (targetGroup.contractIds?.length > 0) {
      for (const contractId of targetGroup.contractIds) {
        try {
          const propertiesResponse = await client.request({
            path: '/papi/v1/properties',
            method: 'GET',
            queryParams: {
              contractId: contractId,
              groupId: targetGroup.groupId,
            },
          });

          const properties = propertiesResponse.properties?.items || [];

          // Update contract summary
          if (!contractSummary.has(contractId)) {
            contractSummary.set(contractId, { groupCount: 0, propertyCount: 0 });
          }
          const stats = contractSummary.get(contractId)!;
          stats.groupCount++;
          stats.propertyCount += properties.length;

          // Create the main group node
          const groupNode = formatGroupNode(targetGroup, properties);

          // If including subgroups, find and add them
          if (args.includeSubgroups !== false) {
            const childGroups = groupsResponse.groups.items.filter(
              (g: any) => g.parentGroupId === targetGroup.groupId,
            );

            for (const childGroup of childGroups) {
              const childProperties: Property[] = [];

              // Get properties for each child group
              if (childGroup.contractIds?.length > 0) {
                for (const childContractId of childGroup.contractIds) {
                  try {
                    const childPropsResponse = await client.request({
                      path: '/papi/v1/properties',
                      method: 'GET',
                      queryParams: {
                        contractId: childContractId,
                        groupId: childGroup.groupId,
                      },
                    });

                    const childProps = childPropsResponse.properties?.items || [];
                    childProperties.push(...childProps);

                    // Update contract summary for child groups
                    if (!contractSummary.has(childContractId)) {
                      contractSummary.set(childContractId, { groupCount: 0, propertyCount: 0 });
                    }
                    const childStats = contractSummary.get(childContractId)!;
                    childStats.groupCount++;
                    childStats.propertyCount += childProps.length;
                  } catch (_error) {
                    console.error(
                      `Failed to get properties for child group ${childGroup.groupId}:`,
                      _error,
                    );
                  }
                }
              }

              // Add child group to parent's children
              const childNode = formatGroupNode(childGroup, childProperties);

              // Check for grandchildren
              const grandchildGroups = groupsResponse.groups.items.filter(
                (g: any) => g.parentGroupId === childGroup.groupId,
              );

              for (const grandchild of grandchildGroups) {
                const grandchildProperties: Property[] = [];

                if (grandchild.contractIds?.length > 0) {
                  for (const gcContractId of grandchild.contractIds) {
                    try {
                      const gcPropsResponse = await client.request({
                        path: '/papi/v1/properties',
                        method: 'GET',
                        queryParams: {
                          contractId: gcContractId,
                          groupId: grandchild.groupId,
                        },
                      });

                      grandchildProperties.push(...(gcPropsResponse.properties?.items || []));
                    } catch (_error) {
                      console.error(
                        `Failed to get properties for grandchild group ${grandchild.groupId}:`,
                        _error,
                      );
                    }
                  }
                }

                const grandchildNode = formatGroupNode(grandchild, grandchildProperties);
                childNode.children?.push(grandchildNode);
              }

              groupNode.children?.push(childNode);
            }
          }

          treeNodes.push(groupNode);
          break; // Only process first contract for now
        } catch (_error) {
          console.error('[Error]:', _error);
        }
      }
    }

    // Calculate summary statistics
    let totalProperties = 0;
    const totalGroups = allGroupsInHierarchy.size;
    const groupsWithProperties: string[] = [];

    // Count properties across all nodes
    const countProperties = (nodes: TreeNode[]): number => {
      let count = 0;
      for (const node of nodes) {
        if (node.metadata?.propertyCount) {
          count += node.metadata.propertyCount;
          if (node.metadata.propertyCount > 0) {
            groupsWithProperties.push(node.name);
          }
        }
        if (node.children) {
          count += countProperties(node.children);
        }
      }
      return count;
    };

    totalProperties = countProperties(treeNodes);

    // Build enhanced output with summary first
    let output = `# Properties in ${targetGroup.groupName} Group\n\n`;

    // Add contract summary section
    output += '## Summary\n\n';
    output += `- **Total Groups**: ${totalGroups}\n`;
    output += `- **Groups with Properties**: ${groupsWithProperties.length}\n`;
    output += `- **Total Properties**: ${totalProperties}\n`;

    if (contractSummary.size > 0) {
      output += '\n### Contract Breakdown:\n';
      for (const [contractId, stats] of contractSummary) {
        output += `- **${contractId}**: ${stats.propertyCount} properties across ${stats.groupCount} groups\n`;
      }
    }

    if (totalProperties > 100) {
      output += `\n[WARNING] **Note**: This group hierarchy contains ${totalProperties} properties across ${totalGroups} groups.\n`;
    }

    output += '\n## Property Tree\n\n';

    // Render the tree
    const treeOutput = renderTree(treeNodes);
    const summary = generateTreeSummary(treeNodes);

    output += '```\n';
    output += treeOutput;
    output += '```\n';
    output += summary;

    return {
      content: [
        {
          type: 'text',
          text: output,
        },
      ],
    };
  }, _context);
}

/**
 * Get detailed information about a specific property
 * Includes version history, activation details, and associated hostnames
 */
export async function getProperty(
  client: AkamaiClient,
  args: { propertyId: string },
): Promise<MCPToolResponse> {
  const startTime = Date.now();
  const TIMEOUT_MS = 20000; // 20 second timeout to leave buffer for MCP

  try {
    const propertyId = args.propertyId;

    // If not a property ID format, use optimized search
    if (!propertyId.startsWith('prp_')) {
      try {
        // OPTIMIZATION: Limited search to prevent timeouts and memory issues
        const searchTerm = propertyId.toLowerCase();
        console.error(`[getProperty] Searching for property: ${searchTerm}`);

        // Get groups first
        const groupsResponse = await client.request({
          path: '/papi/v1/groups',
          method: 'GET',
        });

        if (!groupsResponse.groups?.items?.length) {
          return {
            content: [
              {
                type: 'text',
                text: 'No groups found. Please check your API credentials.',
              },
            ],
          };
        }

        // OPTIMIZATION: Limit search to prevent timeouts
        // Reduced to 2 groups and 50 properties per group for faster response
        const MAX_GROUPS_TO_SEARCH = 2;
        const MAX_PROPERTIES_PER_GROUP = 50;
        const MAX_TOTAL_PROPERTIES = 100;

        const foundProperties: Array<{ property: Property; group: any }> = [];
        let totalPropertiesSearched = 0;
        let groupsSearched = 0;

        // Search properties with limits
        for (const group of groupsResponse.groups.items) {
          // Check timeout
          if (Date.now() - startTime > TIMEOUT_MS) {
            console.error('[getProperty] Timeout reached during search');
            break;
          }

          if (groupsSearched >= MAX_GROUPS_TO_SEARCH) {
            break;
          }
          if (totalPropertiesSearched >= MAX_TOTAL_PROPERTIES) {
            break;
          }
          if (!group.contractIds?.length) {
            continue;
          }

          groupsSearched++;

          for (const contractId of group.contractIds) {
            try {
              const propertiesResponse = await client.request({
                path: '/papi/v1/properties',
                method: 'GET',
                queryParams: {
                  contractId: contractId,
                  groupId: group.groupId,
                },
              });

              const properties = propertiesResponse.properties?.items || [];
              totalPropertiesSearched += properties.length;

              // Limit properties to search per group
              const propertiesToSearch = properties.slice(0, MAX_PROPERTIES_PER_GROUP);

              // Search by property name (exact and partial match)
              const exactMatch = propertiesToSearch.find(
                (prop: any) => prop.propertyName.toLowerCase() === searchTerm,
              );

              if (exactMatch) {
                // Found exact match - return immediately
                console.error(`[getProperty] Found exact match: ${exactMatch.propertyName}`);
                return await getPropertyById(client, exactMatch.propertyId, exactMatch);
              }

              // Collect partial matches
              const partialMatches = propertiesToSearch.filter((prop: any) =>
                prop.propertyName.toLowerCase().includes(searchTerm),
              );

              partialMatches.forEach((prop: any) => {
                foundProperties.push({ property: prop, group });
              });
            } catch (_err) {
              console.error(`Failed to search in contract ${contractId}:`, _err);
            }
          }
        }

        // Handle search results
        if (foundProperties.length === 0) {
          // Check if we hit timeout
          const hitTimeout = Date.now() - startTime > TIMEOUT_MS;

          // No matches found in limited search
          return {
            content: [
              {
                type: 'text',
                text:
                  `[ERROR] No properties found matching "${propertyId}" in the first ${groupsSearched} groups (searched ${totalPropertiesSearched} properties).\n\n` +
                  (hitTimeout ? '[EMOJI]️ **Search was stopped due to timeout.**\n\n' : '') +
                  '**Suggestions:**\n' +
                  '1. Use the exact property ID (e.g., prp_12345)\n' +
                  '2. Use "list properties" to browse available properties\n' +
                  '3. Try a more specific search term\n\n' +
                  '**Note:** To prevent timeouts, the search was limited to:\n' +
                  `- First ${MAX_GROUPS_TO_SEARCH} groups\n` +
                  `- Maximum ${MAX_PROPERTIES_PER_GROUP} properties per group\n` +
                  `- Total of ${MAX_TOTAL_PROPERTIES} properties\n\n` +
                  "If your property wasn't found, please use its exact property ID.",
              },
            ],
          };
        }

        if (foundProperties.length === 1) {
          // Single match found
          const match = foundProperties[0];
          const searchNote = `ℹ️ Found property "${match.property.propertyName}" (${match.property.propertyId})\n\n`;
          const result = await getPropertyById(client, match.property.propertyId, match.property);
          if (result.content[0] && 'text' in result.content[0]) {
            result.content[0].text = searchNote + result.content[0].text;
          }
          return result;
        }

        // Multiple matches found - show list
        let text = `[SEARCH] Found ${foundProperties.length} properties matching "${propertyId}":\n\n`;

        // Show up to 10 matches
        const matchesToShow = foundProperties.slice(0, 10);
        matchesToShow.forEach((match, index) => {
          text += `${index + 1}. **${match.property.propertyName}**\n`;
          text += `   - Property ID: \`${match.property.propertyId}\`\n`;
          text += `   - Group: ${match.group.groupName}\n`;
          text += `   - Production: ${formatStatus(match.property.productionStatus)}\n`;
          text += `   - Staging: ${formatStatus(match.property.stagingStatus)}\n\n`;
        });

        if (foundProperties.length > 10) {
          text += `... and ${foundProperties.length - 10} more matches\n\n`;
        }

        text += '**To get details for a specific property, use its ID:**\n';
        text += `Example: "get property ${matchesToShow[0]?.property.propertyId}"\n\n`;
        text +=
          '[INFO] **Tip:** Using the exact property ID (prp_XXXXX) is always faster and more reliable.';

        return {
          content: [
            {
              type: 'text',
              text,
            },
          ],
        };
      } catch (searchError: any) {
        // If search fails, provide helpful error message
        if (searchError.message?.includes('404')) {
          return {
            content: [
              {
                type: 'text',
                text: `[ERROR] No property found matching "${propertyId}".\n\n[INFO] **Tips:**\n- For property names: Use the exact name (case-insensitive)\n- For hostnames: Use the full domain (e.g., www.example.com)\n- For property IDs: Use the format prp_12345\n- Use list_properties to see all available properties`,
              },
            ],
          };
        }
        // For other errors, fall through to general error handling
        throw searchError;
      }
    }

    // Get property by ID
    return await getPropertyById(client, propertyId);
  } catch (_error) {
    return formatError('get property', _error);
  }
}

/**
 * Internal function to get property details by ID
 */
async function getPropertyById(
  client: AkamaiClient,
  propertyId: string,
  existingProperty?: Property,
): Promise<MCPToolResponse> {
  try {
    let prop = existingProperty;
    let contractId: string | undefined;
    let groupId: string | undefined;
    let groupName: string | undefined;

    if (!prop) {
      // First, we need to find the contract and group for this property
      // Get all groups to search for the property
      const groupsResponse = await client.request({
        path: '/papi/v1/groups',
        method: 'GET',
      });

      if (!groupsResponse.groups?.items?.length) {
        throw new Error('No groups found. Check API credentials.');
      }

      // Optimize search: prioritize likely groups and limit total search
      const MAX_GROUPS_TO_SEARCH = 10;

      // Prioritize groups that might contain the property
      const priorityGroupNames = ['acedergr', 'default', 'production', 'main'];
      const sortedGroups = [...groupsResponse.groups.items].sort((a, b) => {
        const aPriority = priorityGroupNames.includes(a.groupName.toLowerCase()) ? -1 : 0;
        const bPriority = priorityGroupNames.includes(b.groupName.toLowerCase()) ? -1 : 0;
        return aPriority - bPriority;
      });

      const groupsToSearch = sortedGroups
        .filter((g) => g.contractIds && g.contractIds.length > 0)
        .slice(0, MAX_GROUPS_TO_SEARCH);

      // Search for the property in limited groups
      for (const group of groupsToSearch) {
        if (!group.contractIds?.length) {
          continue;
        }

        // Only check first contract per group for speed
        const cId = group.contractIds[0];
        try {
          const propertiesResponse = await client.request({
            path: '/papi/v1/properties',
            method: 'GET',
            queryParams: {
              contractId: cId,
              groupId: group.groupId,
            },
          });

          const found = propertiesResponse.properties?.items?.find(
            (p: any) => p.propertyId === propertyId,
          );

          if (found) {
            prop = found;
            contractId = cId;
            groupId = group.groupId;
            groupName = group.groupName;
            break;
          }
        } catch (_err) {
          // Continue searching
          console.error(`Failed to search in group ${group.groupId}:`, _err);
        }
      }

      if (!prop) {
        return {
          content: [
            {
              type: 'text',
              text: `Property ${propertyId} not found in first ${MAX_GROUPS_TO_SEARCH} groups searched.\n\n[INFO] **Tips:**\n- Verify the property ID is correct (format: prp_12345)\n- Use list_properties to browse all available properties\n- Try searching with a more specific group or contract filter\n- The property might exist in a group that wasn't searched`,
            },
          ],
        };
      }
    } else {
      // If we have existingProperty, extract contract and group from it
      contractId = prop.contractId;
      groupId = prop.groupId;
    }

    // Now get detailed property information using the proper endpoint if we have contract and group
    if (!existingProperty && contractId && groupId) {
      try {
        const detailResponse = await client.request({
          path: `/papi/v1/properties/${propertyId}`,
          method: 'GET',
          queryParams: {
            contractId: contractId,
            groupId: groupId,
          },
        });

        // The response contains the property in properties.items[0]
        if (detailResponse.properties?.items?.[0]) {
          prop = detailResponse.properties.items[0];
        }
      } catch (detailError) {
        console.error('Failed to get detailed property info:', detailError);
        // Continue with the basic property info we already have
      }
    }

    // Ensure prop is defined at this point
    if (!prop) {
      throw new Error('Unable to retrieve property details');
    }

    // Get latest version details
    let versionDetails = null;
    try {
      if (prop.latestVersion && contractId && groupId) {
        versionDetails = await client.request({
          path: `/papi/v1/properties/${propertyId}/versions/${prop.latestVersion}`,
          method: 'GET',
          queryParams: {
            contractId: contractId,
            groupId: groupId,
          },
        });
      }
    } catch (versionError) {
      // Continue without version details
      console.error('Failed to get version details:', versionError);
    }

    // Get hostnames associated with the property
    let hostnames = null;
    try {
      if (prop.latestVersion && contractId && groupId) {
        hostnames = await client.request({
          path: `/papi/v1/properties/${propertyId}/versions/${prop.latestVersion}/hostnames`,
          method: 'GET',
          queryParams: {
            contractId: contractId,
            groupId: groupId,
          },
        });
      }
    } catch (hostnameError) {
      // Continue without hostname details
      console.error('Failed to get hostnames:', hostnameError);
    }

    // Format comprehensive property details
    let text = `# Property Details: ${prop.propertyName}\n\n`;

    // Basic Information
    text += '## Basic Information\n';
    text += `- **Property ID:** ${formatPropertyDisplay(prop.propertyId, prop.propertyName)}\n`;
    text += `- **Asset ID:** ${prop.assetId || 'N/A'}\n`;
    text += `- **Contract:** ${formatContractDisplay(prop.contractId)}\n`;
    text += `- **Group:** ${formatGroupDisplay(prop.groupId, groupName)}\n`;
    text += `- **Product:** ${prop.productId ? formatProductDisplay(prop.productId) : 'N/A'}\n\n`;

    // Version Information
    text += '## Version Information\n';
    text += `- **Latest Version:** ${prop.latestVersion || 'N/A'}\n`;
    text += `- **Production Version:** ${prop.productionVersion || 'None'}\n`;
    text += `- **Staging Version:** ${prop.stagingVersion || 'None'}\n\n`;

    // Activation Status
    text += '## Activation Status\n';
    text += `- **Production:** ${formatStatus(prop.productionStatus)}\n`;
    text += `- **Staging:** ${formatStatus(prop.stagingStatus)}\n\n`;

    // Version Details if available
    if (versionDetails?.versions?.items?.[0]) {
      const version = versionDetails.versions.items[0];
      text += `## Latest Version Details (v${version.propertyVersion})\n`;
      text += `- **Updated By:** ${version.updatedByUser || 'Unknown'}\n`;
      text += `- **Updated Date:** ${formatDate(version.updatedDate)}\n`;
      if (version.note) {
        text += `- **Version Notes:** ${version.note}\n`;
      }
      text += '\n';
    }

    // Hostnames if available
    if (hostnames?.hostnames?.items && (hostnames.hostnames.items as any[]).length > 0) {
      text += '## Associated Hostnames\n';
      for (const hostname of hostnames.hostnames.items) {
        text += `- **${hostname.cnameFrom}** → ${hostname.cnameTo}`;
        if (hostname.certStatus) {
          text += ` (Cert: ${hostname.certStatus.status || 'Unknown'})`;
        }
        text += '\n';
      }
      text += '\n';
    }

    // Notes
    if (prop.note) {
      text += `## Property Notes\n${prop.note}\n\n`;
    }

    // Next Steps
    text += '## Available Actions\n';
    text += `- View rules: \`"Show me the rules for property ${propertyId}"\`\n`;
    text += `- Update rules: \`"Update property ${propertyId} to use origin server example.com"\`\n`;
    text += `- Activate: \`"Activate property ${propertyId} to staging"\`\n`;
    text += `- View activations: \`"Show activation history for property ${propertyId}"\`\n`;

    if (!prop.productionVersion) {
      text += '\n[WARNING] **Note:** This property has never been activated to production.';
    }

    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  } catch (_error) {
    return formatError('get property details', _error);
  }
}

/**
 * Create a new CDN property
 * Handles property creation with proper validation and helpful guidance
 */
export async function createProperty(
  client: AkamaiClient,
  args: {
    propertyName: string;
    productId: string;
    contractId: string;
    groupId: string;
    ruleFormat?: string;
  },
): Promise<MCPToolResponse> {
  try {
    // Ensure prefixes are added if missing
    if (args.contractId) {
      args.contractId = ensurePrefix(args.contractId, 'ctr_');
    }
    if (args.groupId) {
      args.groupId = ensurePrefix(args.groupId, 'grp_');
    }

    // Validate required parameters
    const validationErrors: string[] = [];

    if (!args.propertyName || args.propertyName.trim().length === 0) {
      validationErrors.push('Property name is required');
    } else if (!/^[a-zA-Z0-9-._]+$/.test(args.propertyName)) {
      validationErrors.push(
        'Property name can only contain letters, numbers, hyphens, dots, and underscores',
      );
    }

    if (!args.contractId) {
      validationErrors.push('Contract ID is required');
    }

    if (!args.groupId) {
      validationErrors.push('Group ID is required');
    }

    if (!args.productId) {
      validationErrors.push('Product ID is required (e.g., prd_Web_Accel, prd_Download_Delivery)');
    }

    if (validationErrors.length > 0) {
      return {
        content: [
          {
            type: 'text',
            text: `[ERROR] Cannot create property - validation errors:\n\n${validationErrors.map((e) => `- ${e}`).join('\n')}\n\n[INFO] **Tip:** Use the list_groups tool to find valid contract and group IDs.`,
          },
        ],
      };
    }

    // Get the latest rule format if not specified
    let ruleFormat = args.ruleFormat;
    if (!ruleFormat) {
      try {
        const formatsResponse = await client.request({
          path: '/papi/v1/rule-formats',
          method: 'GET',
        });

        if (formatsResponse.ruleFormats?.items?.[0]) {
          ruleFormat = formatsResponse.ruleFormats.items[0];
        } else {
          ruleFormat = 'latest'; // Fallback
        }
      } catch {
        ruleFormat = 'latest'; // Fallback if we can't get formats
      }
    }

    // Create the property
    const response = await client.request({
      path: '/papi/v1/properties',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      queryParams: {
        contractId: args.contractId,
        groupId: args.groupId,
      },
      body: {
        propertyName: args.propertyName,
        productId: args.productId,
        ruleFormat: ruleFormat,
      },
    });

    if (!response.propertyLink) {
      throw new Error('Property creation failed - no property link returned');
    }

    // Extract property ID from the link (remove query parameters)
    const propertyId = response.propertyLink.split('/').pop()?.split('?')[0];

    // Format success response with comprehensive next steps
    let text = '[DONE] **Property Created Successfully!**\n\n';

    text += '## Property Details\n';
    text += `- **Name:** ${args.propertyName}\n`;
    text += `- **Property ID:** ${formatPropertyDisplay(propertyId)}\n`;
    text += `- **Product:** ${formatProductDisplay(args.productId)}\n`;
    text += `- **Contract:** ${formatContractDisplay(args.contractId)}\n`;
    text += `- **Group:** ${formatGroupDisplay(args.groupId)}\n`;
    text += `- **Rule Format:** ${ruleFormat}\n`;
    text += '- **Status:** [EMOJI] NEW (Not yet activated)\n\n';

    text += '## Required Next Steps\n\n';
    text += '### 1. Create Edge Hostname\n';
    text += 'You need an edge hostname for content delivery:\n';
    text += `\`"Create edge hostname for property ${propertyId}"\`\n\n`;

    text += '### 2. Configure Property Rules\n';
    text += 'Set up origin server and caching behavior:\n';
    text += `\`"Update property ${propertyId} to use origin server [your-origin.com]"\`\n\n`;

    text += '### 3. Add Hostnames\n';
    text += 'Associate your domains with the property:\n';
    text += `\`"Add hostname www.example.com to property ${propertyId}"\`\n\n`;

    text += '### 4. Activate to Staging\n';
    text += 'Test your configuration in staging first:\n';
    text += `\`"Activate property ${propertyId} to staging"\`\n\n`;

    text += '### 5. SSL Certificate\n';
    text += 'If using HTTPS, enroll a certificate:\n';
    text += '`"Enroll DV certificate for www.example.com"`\n\n';

    text += '## Common Product IDs Reference\n';
    text += '- **prd_fresca** - Ion (Preferred for most use cases)\n';
    text += '- **prd_Site_Accel** - Dynamic Site Accelerator (DSA)\n';
    text += '- **prd_Web_Accel** - Web Application Accelerator\n';
    text += '- **prd_Download_Delivery** - Download Delivery\n';
    text += '- **prd_Adaptive_Media_Delivery** - Adaptive Media Delivery (AMD)\n';

    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  } catch (_error) {
    // Handle specific error cases
    if (_error instanceof Error) {
      if (_error.message.includes('already exists')) {
        return {
          content: [
            {
              type: 'text',
              text: `[ERROR] A property with name '${args.propertyName}' already exists in this contract/group.\n\n**Solutions:**\n- Choose a different property name\n- Use list_properties to see existing properties\n- Check if the property exists in a different group`,
            },
          ],
        };
      }

      if (_error.message.includes('Invalid product')) {
        return {
          content: [
            {
              type: 'text',
              text: `[ERROR] Invalid product ID: ${args.productId}\n\n**Common Product IDs:**\n- prd_fresca - Ion (Preferred)\n- prd_Site_Accel - DSA\n- prd_Web_Accel - WAA\n- prd_Download_Delivery - DD\n- prd_Adaptive_Media_Delivery - AMD\n\nUse list_products to see which products are available in your contract.`,
            },
          ],
        };
      }
    }

    return formatError('create property', _error);
  }
}

/**
 * List all available contracts
 * Provides read-only list of contract names and identifiers
 */
export async function listContracts(
  client: AkamaiClient,
  args: { searchTerm?: string; customer?: string },
): Promise<MCPToolResponse> {
  try {
    const response = await client.request({
      path: '/papi/v1/contracts',
      method: 'GET',
    });

    if (!response.contracts?.items || response.contracts.items.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: 'No contracts found in your account.\n\n[WARNING] This might indicate a permissions issue with your API credentials.',
          },
        ],
      };
    }

    let contracts = response.contracts.items;

    // Filter contracts by search term if provided
    if (args.searchTerm) {
      const searchLower = args.searchTerm.toLowerCase();
      contracts = contracts.filter(
        (c: any) =>
          c.contractId.toLowerCase().includes(searchLower) ||
          c.contractTypeName?.toLowerCase().includes(searchLower),
      );

      if (contracts.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `No contracts found matching "${args.searchTerm}".\n\n[INFO] **Tip:** Try a partial contract ID or type name.`,
            },
          ],
        };
      }
    }

    let text = `# Akamai Contracts ${args.searchTerm ? `(${contracts.length} matching "${args.searchTerm}")` : `(${contracts.length} found)`}\n\n`;

    text += '| Contract | Type | Status | Raw ID |\n';
    text += '|----------|------|--------|--------|\n';

    for (const contract of contracts) {
      const contractId = contract.contractId || 'Unknown';
      const contractType = contract.contractTypeName || 'Standard';
      const status = contract.status || 'Active';
      const displayName = formatContractDisplay(contractId, contractType);
      text += `| ${displayName} | ${contractType} | ${status} | ${contractId} |\n`;
    }

    text += '\n';
    text += '## How to Use Contracts\n\n';
    text += 'Contracts are required when:\n';
    text += '- Creating new properties\n';
    text += '- Creating CP codes\n';
    text += '- Enrolling certificates\n\n';
    text += 'Example usage:\n';
    text += '`"Create property in contract C-1234567"` (you can omit the ctr_ prefix)\n\n';
    text += '[INFO] **Tip:** Use `list_groups` to see which groups have access to each contract.';

    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  } catch (_error) {
    return formatError('list contracts', _error);
  }
}

/**
 * List all available groups and contracts
 * Essential for property creation as it provides the required IDs
 */
export async function listGroups(
  client: AkamaiClient,
  args: { searchTerm?: string },
): Promise<MCPToolResponse> {
  try {
    const response = await client.request({
      path: '/papi/v1/groups',
      method: 'GET',
    });

    if (!response.groups?.items || response.groups.items.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: 'No groups found in your account.\n\n[WARNING] This might indicate a permissions issue with your API credentials.',
          },
        ],
      };
    }

    // Organize groups hierarchically
    let groups = response.groups.items;

    // Filter groups by search term if provided
    if (args.searchTerm) {
      const searchLower = args.searchTerm.toLowerCase();
      groups = groups.filter(
        (g: any) =>
          g.groupName.toLowerCase().includes(searchLower) ||
          g.groupId.toLowerCase().includes(searchLower),
      );

      if (groups.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `No groups found matching "${args.searchTerm}".\n\n[INFO] **Tip:** Try a partial name or group ID.`,
            },
          ],
        };
      }
    }

    const topLevelGroups = groups.filter((g: any) => !g.parentGroupId);
    const groupsByParent = groups.reduce(
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

    let text = `# Akamai Groups & Contracts ${args.searchTerm ? `(${groups.length} groups matching "${args.searchTerm}")` : `(${groups.length} groups found)`}\n\n`;

    // Function to recursively display groups
    function displayGroup(group: (typeof groups)[0], indent = ''): string {
      let output = `${indent}[EMOJI] **${group.groupName}**\n`;
      output += `${indent}   Group ID: ${formatGroupDisplay(group.groupId, undefined, true)}\n`;

      if (group.contractIds && group.contractIds.length > 0) {
        const contractDisplays = group.contractIds.map((cid: any) => formatContractDisplay(cid));
        output += `${indent}   Contracts: ${contractDisplays.join(', ')}\n`;
      } else {
        output += `${indent}   Contracts: None\n`;
      }

      // Display child groups
      const children = groupsByParent[group.groupId] || [];
      if (children.length > 0) {
        output += `${indent}   Child Groups:\n`;
        for (const child of children) {
          output += displayGroup(child, indent + '      ');
        }
      }

      output += '\n';
      return output;
    }

    // Display top-level groups and their hierarchies
    text += '## Group Hierarchy\n\n';
    for (const group of topLevelGroups) {
      text += displayGroup(group);
    }

    // List all contracts for easy reference
    const allContracts = new Set<string>();
    groups.forEach((g: any) => {
      if (g.contractIds) {
        g.contractIds.forEach((c: any) => allContracts.add(c));
      }
    });

    if (allContracts.size > 0) {
      text += '## All Available Contracts\n\n';
      Array.from(allContracts)
        .sort()
        .forEach((contract) => {
          text += `- ${formatContractDisplay(contract)} (${contract})\n`;
        });
      text += '\n';
    }

    // Add group name to ID lookup table
    text += '## Group Name to ID Lookup\n\n';
    text += '| Group Name | Group ID | Contracts |\n';
    text += '|------------|----------|----------|\n';

    // Sort groups by name for easy lookup
    const sortedGroups = [...groups].sort((a, b) =>
      a.groupName.toLowerCase().localeCompare(b.groupName.toLowerCase()),
    );

    for (const group of sortedGroups) {
      const contracts = group.contractIds
        ? group.contractIds.map((cid: any) => formatContractDisplay(cid)).join(', ')
        : 'None';
      text += `| ${group.groupName} | ${formatGroupDisplay(group.groupId)} | ${contracts} |\n`;
    }
    text += '\n';

    // Add usage instructions
    text += '## How to Use This Information\n\n';
    text += "When creating a new property, you'll need:\n";
    text += '1. **Group ID** - Choose based on your organization structure\n';
    text += '2. **Contract ID** - Choose based on your billing arrangement\n\n';
    text += 'Example:\n';
    text += '`"Create a new property called my-site in group 12345 with contract C-1234567"`\n\n';
    text += '[INFO] **Tips:**\n';
    text += '- You can omit the prefixes (ctr_, grp_) when referencing IDs\n';
    text +=
      '- Properties inherit permissions from their group, so choose the appropriate group for access control';

    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  } catch (_error) {
    return formatError('list groups', _error);
  }
}

/**
 * List all products available for a contract
 * Useful for discovering contract-specific product mappings
 */
export async function listProducts(
  client: AkamaiClient,
  args: { contractId: string; customer?: string },
): Promise<MCPToolResponse> {
  const _context: ErrorContext = {
    operation: 'list products',
    endpoint: '/papi/v1/products',
    apiType: 'papi',
    customer: args.customer,
  };

  return withToolErrorHandling(async () => {
    // Ensure contract ID has proper prefix
    const contractId = ensurePrefix(args.contractId, 'ctr_');

    const response = await client.request({
      path: '/papi/v1/products',
      method: 'GET',
      queryParams: {
        contractId: contractId,
      },
    });

    if (!response.products?.items || response.products.items.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `No products found for contract ${contractId}.\n\n[WARNING] This might indicate:\n- Invalid contract ID\n- No products enabled on this contract\n- Permissions issue with your API credentials`,
          },
        ],
      };
    }

    const products = response.products.items;

    let text = `# Products Available on Contract ${formatContractDisplay(contractId)}\n\n`;
    text += `Found ${products.length} products available for use:\n\n`;

    // Group products by category
    const deliveryProducts: any[] = [];
    const securityProducts: any[] = [];
    const otherProducts: any[] = [];

    for (const product of products) {
      const productId = product.productId || '';
      const productName = product.productName || '';
      const friendlyName = formatProductDisplay(productId, productName);

      const productInfo = {
        id: productId,
        name: productName,
        friendly: friendlyName,
      };

      // Categorize products
      if (
        productId.includes('Ion') ||
        productId.includes('SPM') ||
        productId.includes('FRESCA') ||
        productId.includes('Site_Accel') ||
        productId.includes('Download') ||
        productId.includes('Adaptive_Media') ||
        productId.includes('Object_Delivery')
      ) {
        deliveryProducts.push(productInfo);
      } else if (
        productId.includes('Security') ||
        productId.includes('WAF') ||
        productId.includes('Bot')
      ) {
        securityProducts.push(productInfo);
      } else {
        otherProducts.push(productInfo);
      }
    }

    // Display by category
    if (deliveryProducts.length > 0) {
      text += '## [PACKAGE] Content Delivery Products\n\n';
      text += '| Product ID | Product Name | Friendly Name | Use Case |\n';
      text += '|------------|--------------|---------------|----------|\n';

      for (const prod of deliveryProducts) {
        let useCase = 'General delivery';
        if (prod.id.includes('Ion') || prod.id.includes('SPM') || prod.id.includes('FRESCA')) {
          useCase = 'Dynamic web apps, APIs';
        } else if (prod.id.includes('Download') || prod.id.includes('Object')) {
          useCase = 'Large file downloads';
        } else if (prod.id.includes('Adaptive_Media')) {
          useCase = 'Video streaming';
        } else if (prod.id.includes('Site_Accel')) {
          useCase = 'Dynamic content';
        }

        text += `| \`${prod.id}\` | ${prod.name} | ${prod.friendly} | ${useCase} |\n`;
      }
      text += '\n';
    }

    if (securityProducts.length > 0) {
      text += '## [SECURE] Security Products\n\n';
      text += '| Product ID | Product Name | Friendly Name |\n';
      text += '|------------|--------------|---------------|\n';

      for (const prod of securityProducts) {
        text += `| \`${prod.id}\` | ${prod.name} | ${prod.friendly} |\n`;
      }
      text += '\n';
    }

    if (otherProducts.length > 0) {
      text += '## [CONFIG] Other Products\n\n';
      text += '| Product ID | Product Name | Friendly Name |\n';
      text += '|------------|--------------|---------------|\n';

      for (const prod of otherProducts) {
        text += `| \`${prod.id}\` | ${prod.name} | ${prod.friendly} |\n`;
      }
      text += '\n';
    }

    // Add usage tips
    text += '## Usage Tips\n\n';
    text += '- **Ion Premier** (prd_SPM) - Best for dynamic web applications with global reach\n';
    text += '- **Ion Standard** (prd_FRESCA) - Great for standard web delivery\n';
    text += '- **DSA** - Optimized for dynamic content and personalization\n';
    text += '- **Download Delivery** - Ideal for software distribution and large files\n';
    text += '- **AMD** - Purpose-built for video streaming\n\n';

    text += 'To use a product when creating a property:\n';
    text += `\`"Create property my-site with product ${deliveryProducts[0]?.id || 'prd_SPM'} on contract ${contractId}"\``;

    // Update our product mappings if we found new ones
    const newMappings: string[] = [];
    for (const product of products) {
      if (product.productId && product.productName) {
        const currentMapping = formatProductDisplay(product.productId);
        if (currentMapping === product.productId) {
          // No mapping exists yet
          newMappings.push(`'${product.productId}': '${product.productName}'`);
        }
      }
    }

    if (newMappings.length > 0) {
      text += '\n\n## [DOCS] New Product Mappings Discovered\n\n';
      text += "The following products don't have friendly name mappings yet:\n\n";
      text += '```typescript\n';
      text += newMappings.join(',\n');
      text += '\n```\n';
      text += '\nConsider adding these to the product mapping configuration.';
    }

    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  }, _context);
}

/**
 * Format error responses with helpful guidance
 */
function formatError(operation: string, _error: any): MCPToolResponse {
  let errorMessage = `[ERROR] Failed to ${operation}`;
  let solution = '';

  if (_error instanceof Error) {
    errorMessage += `: ${_error.message}`;

    // Provide specific solutions based on error type
    if (_error.message.includes('401') || _error.message.includes('credentials')) {
      solution =
        '**Solution:** Check your ~/.edgerc file has valid credentials. You may need to generate new API credentials in Akamai Control Center.';
    } else if (_error.message.includes('403') || _error.message.includes('Forbidden')) {
      solution =
        '**Solution:** Your API credentials may lack the necessary permissions. Ensure your API client has read/write access to Property Manager.';
    } else if (_error.message.includes('404') || _error.message.includes('not found')) {
      solution =
        '**Solution:** The requested resource was not found. Verify the ID is correct using the list tools.';
    } else if (_error.message.includes('429') || _error.message.includes('rate limit')) {
      solution = '**Solution:** Rate limit exceeded. Please wait 60 seconds before retrying.';
    } else if (_error.message.includes('network') || _error.message.includes('ENOTFOUND')) {
      solution =
        '**Solution:** Network connectivity issue. Check your internet connection and verify the API host in ~/.edgerc is correct.';
    } else if (_error.message.includes('timeout')) {
      solution =
        '**Solution:** Request timed out. The Akamai API might be slow. Try again in a moment.';
    }
  } else {
    errorMessage += `: ${String(_error)}`;
  }

  let text = errorMessage;
  if (solution) {
    text += `\n\n${solution}`;
  }

  // Add general help
  text += '\n\n**Need Help?**\n';
  text += '- Verify your credentials: `cat ~/.edgerc`\n';
  text += '- List available resources: `"List all my properties"`\n';
  text += '- Check API docs: https://techdocs.akamai.com/property-mgr/reference/api';

  return {
    content: [
      {
        type: 'text',
        text,
      },
    ],
  };
}
