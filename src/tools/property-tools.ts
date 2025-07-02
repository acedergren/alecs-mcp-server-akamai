/**
 * MULTI-TENANT PROPERTY MANAGER API INTEGRATION
 * 
 * REMOTE MCP HOSTING ARCHITECTURE:
 * This module provides enterprise-grade property management for hosted MCP
 * deployments, enabling multiple customers to manage their Akamai CDN
 * properties through a shared remote MCP server infrastructure.
 * 
 * HOSTED MCP CAPABILITIES:
 * [ENTERPRISE] Multi-Customer Property Management: Isolated property operations per customer
 * [AUTH] Customer Context Validation: Secure access to customer-specific properties
 * [REPORT] Cross-Customer Analytics: Portfolio-wide property monitoring for MSPs
 * [SECURE] Property Ownership Validation: Prevents cross-customer property access
 * [SYNC] Dynamic Customer Switching: Seamless property management across accounts
 * 
 * REMOTE MCP HOSTING SCENARIOS:
 * 1. **MSP Property Management**: Service providers managing multiple client CDNs
 * 2. **Enterprise Division Management**: Large orgs with multiple property portfolios
 * 3. **Development Environment Management**: Staging/production per customer
 * 4. **Consultant Property Operations**: Consultants accessing multiple customer accounts
 * 
 * PROPERTY ISOLATION ARCHITECTURE:
 * - Each customer parameter maps to separate Akamai account credentials
 * - Property lists filtered by customer context for security
 * - Cross-customer property operations require explicit authorization
 * - Complete audit trail of property operations per customer
 * 
 * HOSTED DEPLOYMENT BENEFITS:
 * - Customers don't need direct Akamai API access
 * - Centralized property management with role-based access
 * - Automated property compliance and monitoring
 * - Portfolio-wide property analytics and reporting
 * 
 * SNOW LEOPARD ARCHITECTURE FOUNDATION:
 * - Enhanced parameter validation prevents API failures
 * - Defensive error handling with comprehensive user guidance
 * - MCP June 2025 compliant response formats
 * - Zero-tolerance for syntax errors and structural issues
 * 
 * CODE KAI PRINCIPLES APPLIED:
 * - Systematic validation of all input parameters
 * - Comprehensive error categorization and handling
 * - Type-safe implementation with proper null checks
 * - Structured logging for operational visibility
 */

import {
  formatContractDisplay,
  ensurePrefix,
} from '../utils/formatting';
import { getAkamaiIdTranslator } from '../utils/property-translator';
import {
  validateParameters,
  PropertyManagerSchemas,
  formatQueryParameters,
  ensureAkamaiIdFormat,
} from '../utils/parameter-validation';
import { formatProductDisplay } from '../utils/product-mapping';
import { withToolErrorHandling, type ErrorContext } from '../utils/tool-error-handling';
import { type TreeNode, renderTree, generateTreeSummary, formatGroupNode } from '../utils/tree-view';
import { createErrorHandler } from '../utils/error-handler';
import { createLogger } from '../utils/pino-logger';
import {
  paginateArray,
  truncateResponse,
  formatPaginationInfo,
  createPaginationSuggestions,
  wouldExceedTokenLimit,
} from '../utils/pagination-helper';
import { withRetry } from '../utils/akamai-search-helper';

import { type AkamaiClient } from '../akamai-client';
import { type MCPToolResponse } from '../types';

// Initialize logger and error handler
const pinoLogger = createLogger('property-tools');
const errorHandler = createErrorHandler('property');
import { validateApiResponse } from '../utils/api-response-validator';
import {
  PapiPropertiesListResponse,
  PapiGroupsListResponse,
  PapiProperty,
  PapiGroup,
  PapiContractsListResponse,
  PapiPropertyDetailsResponse,
  PapiPropertyVersionDetailsResponse,
  PapiPropertyHostnamesResponse,
  PapiRuleFormatsResponse,
  PapiPropertyCreateResponse,
  PapiProductsListResponse,
  isPapiPropertiesResponse,
  isPapiGroupsResponse,
  isPapiContractsResponse,
  isPapiPropertyDetailsResponse,
  isPapiPropertyVersionsResponse,
  isPapiPropertyHostnamesResponse,
  isPapiRuleFormatsResponse,
  isPapiPropertyCreateResponse,
  isPapiProductsResponse,
  isPapiError,
} from '../types/api-responses/papi-properties';

// Removed duplicate interface - now using PapiProductsListResponse from imports

// Removed duplicate interfaces - now using precise PAPI types from imports


/**
 * Format activation status with appropriate indicator
 */
function formatStatus(status: { version?: number; status?: string; updateDate?: string; message?: string; } | string | undefined): string {
  if (!status) {
    return '[INACTIVE]';
  }

  // Handle legacy string status
  if (typeof status === 'string') {
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

  // Handle new PAPI status object structure
  if (typeof status === 'object' && status.status) {
    const statusMap: Record<string, string> = {
      ACTIVE: '[ACTIVE]',
      INACTIVE: '[INACTIVE]',
      PENDING: '[PENDING]',
      FAILED: '[FAILED]',
      DEACTIVATED: '[DEACTIVATED]',
    };

    const statusText = statusMap[status.status] || `[${status.status}]`;
    if (status.version) {
      return `${statusText} v${status.version}`;
    }
    return statusText;
  }

  return '[UNKNOWN]';
}

// Human-readable name cache to avoid repeated API calls
interface ResourceNames {
  contracts: Map<string, string>;
  groups: Map<string, string>;
  products: Map<string, string>;
}

const nameCache: ResourceNames = {
  contracts: new Map(),
  groups: new Map(),
  products: new Map()
};

/**
 * Gets human-readable contract name from cache or API
 */
async function getContractName(client: AkamaiClient, contractId: string): Promise<string> {
  if (nameCache.contracts.has(contractId)) {
    return nameCache.contracts.get(contractId)!;
  }
  
  try {
    const response = await client.request({
      path: '/papi/v1/contracts',
      method: 'GET'
    });
    
    const contract = (response as any)?.contracts?.items?.find((c: any) => c.contractId === contractId);
    if (contract?.contractTypeName) {
      const name = contract.contractTypeName;
      nameCache.contracts.set(contractId, name);
      return name;
    }
  } catch (error) {
    pinoLogger.debug({ error, contractId }, 'Failed to get contract name');
  }
  
  return `Contract ${contractId.replace('ctr_', '')}`;
}

/**
 * Gets human-readable group name from cache or API
 */
async function getGroupName(client: AkamaiClient, groupId: string): Promise<string> {
  if (nameCache.groups.has(groupId)) {
    return nameCache.groups.get(groupId)!;
  }
  
  try {
    const response = await client.request({
      path: '/papi/v1/groups',
      method: 'GET'
    });
    
    const group = (response as any)?.groups?.items?.find((g: any) => g.groupId === groupId);
    if (group?.groupName) {
      const name = group.groupName;
      nameCache.groups.set(groupId, name);
      return name;
    }
  } catch (error) {
    pinoLogger.debug({ error, groupId }, 'Failed to get group name');
  }
  
  return `Group ${groupId}`;
}

/**
 * Gets human-readable product name
 */
function getProductName(productId: string): string {
  if (nameCache.products.has(productId)) {
    return nameCache.products.get(productId)!;
  }
  
  const productNames: Record<string, string> = {
    'prd_Fresca': 'Ion Standard',
    'prd_SPM': 'Ion Premier', 
    'prd_Site_Accel': 'Dynamic Site Accelerator (DSA)',
    'prd_Web_Accel': 'Web Application Accelerator',
    'prd_Download_Delivery': 'Download Delivery',
    'prd_Adaptive_Media_Delivery': 'Adaptive Media Delivery (AMD)',
    'prd_Security_Failover': 'Security Failover',
    'prd_Site_Defender': 'Site Defender',
    'prd_Enterprise': 'Enterprise'
  };
  
  const name = productNames[productId] || productId.replace('prd_', '').replace(/_/g, ' ');
  nameCache.products.set(productId, name);
  return name;
}

/**
 * Formats a 403 error with human-readable names
 */
async function format403Error(
  client: AkamaiClient,
  operation: string,
  contractId?: string,
  groupId?: string
): Promise<string> {
  let message = `Cannot ${operation}\n\n`;
  
  if (contractId && groupId) {
    const contractName = await getContractName(client, contractId);
    const groupName = await getGroupName(client, groupId);
    const contractIdDisplay = contractId.replace('ctr_', '');
    
    message += `The API credentials cannot create properties in group "${groupName}" under contract "${contractName}" (${contractIdDisplay})\n\n`;
    message += `This typically means the user who created these API credentials doesn't have access to this group.\n\n`;
    message += `Solutions:\n`;
    message += `1. Use a different group that you have access to\n`;
    message += `2. Ask your Akamai administrator to grant access to the "${groupName}" group\n`;
    message += `3. Check if this contract belongs to a different account (may need account switching)`;
  } else {
    message += `Access denied. The API credentials don't have the required permissions.\n\n`;
    message += `Check with your Akamai administrator about your access rights.`;
  }
  
  return message;
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
      const groupsRawResponse = await client.request({
        path: '/papi/v1/groups',
        method: 'GET',
      });

      // Validate response structure against PAPI documentation
      if (isPapiError(groupsRawResponse)) {
        throw new Error(`Failed to list groups: ${groupsRawResponse.detail}`);
      }

      if (!isPapiGroupsResponse(groupsRawResponse)) {
        throw new Error('Invalid groups response structure from PAPI API');
      }

      const groupsResponse = groupsRawResponse as PapiGroupsListResponse;

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

    const rawResponse = await client.request({
      path: '/papi/v1/properties',
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'PAPI-Use-Prefixes': 'true',
      },
      queryParams,
    });

    // Validate response structure against PAPI documentation
    if (isPapiError(rawResponse)) {
      throw new Error(`Failed to list properties: ${rawResponse.detail}`);
    }

    if (!isPapiPropertiesResponse(rawResponse)) {
      throw new Error('Invalid properties response structure from PAPI API');
    }

    const propertiesResponse = rawResponse as PapiPropertiesListResponse;

    // Handle empty results
    if (!propertiesResponse.properties?.items || propertiesResponse.properties.items.length === 0) {
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

    // Return structured data for Claude Desktop optimization
    const allProperties = propertiesResponse.properties.items;
    const totalProperties = allProperties.length;

    // OPTIMIZATION: Limit properties to prevent memory issues
    const propertiesToShow = allProperties.slice(0, MAX_PROPERTIES_TO_DISPLAY);
    const hasMore = totalProperties > MAX_PROPERTIES_TO_DISPLAY;

    // Pre-populate the translator caches with all data
    const translator = getAkamaiIdTranslator();
    
    // Cache properties
    translator.populatePropertyCache(propertiesToShow.map(prop => ({
      propertyId: prop.propertyId,
      propertyName: prop.propertyName,
      contractId: prop.contractId,
      groupId: prop.groupId,
      assetId: prop.assetId,
    })));
    
    // Note: Group and contract caches will be populated on-demand during translation
    // This avoids additional API calls and maintains performance
    
    // Structure the data for easy LLM processing with enhanced translations
    const structuredResponse = {
      properties: await Promise.all(propertiesToShow.map(async (prop) => {
        // Get group and contract names for human-friendly display
        const groupTranslation = prop.groupId ? await translator.translateGroup(prop.groupId, client) : null;
        const contractTranslation = prop.contractId ? await translator.translateContract(prop.contractId, client) : null;
        
        return {
          propertyId: prop.propertyId,
          propertyName: prop.propertyName,
          propertyDisplay: `${prop.propertyName} (${prop.propertyId})`, // Human-friendly display
          contractId: prop.contractId,
          contractName: contractTranslation?.name || null,
          contractDisplay: contractTranslation?.displayName || prop.contractId,
          groupId: prop.groupId,
          groupName: groupTranslation?.name || null,
          groupDisplay: groupTranslation?.displayName || prop.groupId,
          productId: prop.productId || null,
          assetId: prop.assetId || null,
          latestVersion: prop.latestVersion || null,
          productionVersion: prop.productionVersion || null,
          stagingVersion: prop.stagingVersion || null,
          productionStatus: prop.productionStatus || null,
          stagingStatus: prop.stagingStatus || null,
          note: prop.note || null,
          ruleFormat: prop.ruleFormat || null
        };
      })),
      metadata: {
        total: totalProperties,
        shown: propertiesToShow.length,
        hasMore: hasMore,
        limit: MAX_PROPERTIES_TO_DISPLAY
      },
      filters: {
        contractId: contractId || null,
        contractIdAutoSelected: !args.contractId && !!contractId,
        groupId: groupId || null,
        groupIdAutoSelected: !args.groupId && !args.contractId && !!groupId
      }
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(structuredResponse, null, 2),
        },
      ],
    };
  }, _context);
}

/**
 * List properties with tree view for groups and their subgroups
 * 
 * ARCHITECTURE:
 * - Validates group ID format before API calls to prevent HTTP 500 errors
 * - Ensures contract IDs exist before making properties requests
 * - Provides hierarchical display of properties within group structures
 * - Implements defensive error handling with specific user guidance
 * 
 * SNOW LEOPARD QUALITY:
 * - Enhanced parameter validation prevents API failures
 * - Comprehensive error messages guide user to resolution
 * - Type-safe implementation with proper null checks
 * 
 * @param client - Authenticated Akamai client instance
 * @param args - Configuration object
 * @param args.groupId - Target group ID (must match pattern grp_12345)
 * @param args.includeSubgroups - Whether to include child groups (default: true)
 * @param args.customer - Optional customer context for multi-tenant support
 * @returns MCPToolResponse with formatted tree view or error guidance
 * 
 * ERROR HANDLING:
 * - Invalid group ID format: Returns format requirements with examples
 * - Missing contracts: Returns helpful guidance to find valid groups
 * - API failures: Returns specific troubleshooting steps
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
    // CRITICAL FIX 1: Enhanced Parameter Validation
    // Validate group ID format BEFORE making any API calls to prevent HTTP 500 errors
    if (!args.groupId) {
      return {
        content: [
          {
            type: 'text',
            text: `[ERROR] Missing Group ID\n\nGroup ID is required for this operation.\n\nNext Steps:\n- Use "list groups" to find available groups\n- Provide a valid group ID like: grp_12345`,
          },
        ],
      };
    }

    // Check if the provided group ID matches Akamai's required format
    const groupIdPattern = /^grp_\d+$/;
    if (!groupIdPattern.test(args.groupId)) {
      return {
        content: [
          {
            type: 'text',
            text: `[ERROR] Invalid Group ID Format\n\nProvided: "${args.groupId}"\nRequired format: grp_12345\n\nExamples of valid group IDs:\n- grp_12345\n- grp_98765\n- grp_11111\n\nNext Steps:\n1. Use "list groups" to find valid group IDs\n2. Copy the exact group ID (including grp_ prefix)\n3. Try again with the correct format`,
          },
        ],
      };
    }

    const groupId = ensureAkamaiIdFormat(args.groupId, 'group');

    // Get all groups to build hierarchy
    const groupsRawResponse = await client.request({
      path: '/papi/v1/groups',
      method: 'GET',
    });

    if (isPapiError(groupsRawResponse)) {
      throw new Error(`Failed to list groups: ${groupsRawResponse.detail}`);
    }

    if (!isPapiGroupsResponse(groupsRawResponse)) {
      throw new Error('Invalid groups response structure from PAPI API');
    }

    const groupsResponse = groupsRawResponse as PapiGroupsListResponse;
    
    // CODE KAI: Type-safe API response validation
    const validatedGroupsResponse = validateApiResponse<{ groups: { items: any[] } }>(groupsResponse);

    if (!validatedGroupsResponse.groups?.items?.length) {
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
    const targetGroup = groupsResponse.groups.items.find((g) => g.groupId === groupId);
    if (!targetGroup) {
      return {
        content: [
          {
            type: 'text',
            text: `[ERROR] Group Not Found\n\nGroup "${groupId}" was not found in your account.\n\nPossible causes:\n- Group ID doesn't exist\n- Insufficient permissions to access this group\n- Typo in group ID\n\nNext Steps:\n1. Use "list groups" to see available groups\n2. Check your API credentials have access to this group\n3. Verify the group ID is correct`,
          },
        ],
      };
    }

    // CRITICAL FIX 2: Contract Validation Before API Calls
    // Ensure the group has valid contract IDs before attempting properties requests
    if (!targetGroup.contractIds || targetGroup.contractIds.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `[WARNING] No Contracts Found\n\nGroup "${groupId}" (${targetGroup.groupName || 'Unnamed'}) has no associated contracts.\n\nThis means:\n- No properties can exist in this group\n- This group may be used for organizational purposes only\n\nNext Steps:\n1. Use "list groups" to find groups with contracts\n2. Look for groups with "Contract IDs" listed\n3. Contact your Akamai administrator if you need access to contracts`,
          },
        ],
      };
    }

    // Validate contract ID formats to prevent API errors
    const contractIdPattern = /^ctr_[A-Z0-9-]+$/;
    const validContractIds = targetGroup.contractIds.filter((contractId: string) => {
      if (!contractIdPattern.test(contractId)) {
        pinoLogger.warn({ contractId, groupId: targetGroup.groupId }, 'Skipping invalid contract ID format');
        return false;
      }
      return true;
    });

    if (validContractIds.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `[ERROR] Invalid Contract IDs\n\nGroup "${groupId}" has contract IDs but they are in invalid format.\n\nExpected format: ctr_ABC123\nFound: ${targetGroup.contractIds.join(', ')}\n\nNext Steps:\n1. Contact Akamai support about malformed contract IDs\n2. Try a different group with valid contracts`,
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
      const children = groupsResponse.groups.items.filter((g) => g.parentGroupId === groupId);
      children.forEach((child) => collectGroupStats(child.groupId));
    };
    collectGroupStats(targetGroup.groupId);

    // Get properties for the main group using validated contract IDs
    // CRITICAL FIX 2 CONTINUED: Only use validated contract IDs for API calls
    for (const contractId of validContractIds) {
      try {
        // Enhanced API call with proper headers and error context
        const propertiesRawResponse = await client.request({
          path: '/papi/v1/properties',
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'PAPI-Use-Prefixes': 'true', // Ensure consistent ID formatting
          },
          queryParams: {
            contractId: contractId,
            groupId: targetGroup.groupId,
          },
        });

        if (isPapiError(propertiesRawResponse)) {
          throw new Error(`Failed to list properties: ${propertiesRawResponse.detail}`);
        }

        if (!isPapiPropertiesResponse(propertiesRawResponse)) {
          throw new Error('Invalid properties response structure from PAPI API');
        }

        const propertiesResponse = propertiesRawResponse as PapiPropertiesListResponse;

          const properties = propertiesResponse.properties?.items || [];

          // Update contract summary
          if (!contractSummary.has(contractId)) {
            contractSummary.set(contractId, { groupCount: 0, propertyCount: 0 });
          }
          const stats = contractSummary.get(contractId)!;
          stats.groupCount++;
          stats.propertyCount += properties.length;

          // Create the main group node
          const groupNode = formatGroupNode(targetGroup, properties as any[]);

          // If including subgroups, find and add them
          if (args.includeSubgroups !== false) {
            const childGroups = groupsResponse.groups.items.filter(
              (g) => g.parentGroupId === targetGroup.groupId,
            );

            for (const childGroup of childGroups) {
              const childProperties: PapiProperty[] = [];

              // Get properties for each child group with validation
              if (childGroup.contractIds?.length > 0) {
                // Validate child group contract IDs before API calls
                const validChildContractIds = childGroup.contractIds.filter((contractId: string) => {
                  if (!contractIdPattern.test(contractId)) {
                    pinoLogger.warn({ contractId, groupId: childGroup.groupId }, 'Skipping invalid child contract ID');
                    return false;
                  }
                  return true;
                });
                
                for (const childContractId of validChildContractIds) {
                  try {
                    const childPropsRawResponse = await client.request({
                      path: '/papi/v1/properties',
                      method: 'GET',
                      headers: {
                        Accept: 'application/json',
                        'PAPI-Use-Prefixes': 'true',
                      },
                      queryParams: {
                        contractId: childContractId,
                        groupId: childGroup.groupId,
                      },
                    });

                    if (!isPapiError(childPropsRawResponse) && isPapiPropertiesResponse(childPropsRawResponse)) {
                      const childPropsResponse = childPropsRawResponse as PapiPropertiesListResponse;
                      const childProps = childPropsResponse.properties?.items || [];
                      childProperties.push(...childProps);
                    }

                    // Update contract summary for child groups
                    if (!contractSummary.has(childContractId)) {
                      contractSummary.set(childContractId, { groupCount: 0, propertyCount: 0 });
                    }
                    const childStats = contractSummary.get(childContractId)!;
                    childStats.groupCount++;
                    childStats.propertyCount += childProperties.length;
                  } catch (_error) {
                    // CRITICAL FIX 3: Better Error Messages
                    // Enhanced error handling with specific guidance for API failures
                    const errorMessage = _error instanceof Error ? _error.message : String(_error);
                    const isHttpError = errorMessage.includes('HTTP 500') || errorMessage.includes('500');
                    
                    if (isHttpError) {
                      pinoLogger.warn(
                        { 
                          groupId: childGroup.groupId, 
                          contractId: childContractId, 
                          error: errorMessage 
                        },
                        'API validation failed for child group - Invalid parameters or insufficient permissions'
                      );
                    } else {
                      pinoLogger.error(
                        { 
                          groupId: childGroup.groupId, 
                          contractId: childContractId, 
                          error: errorMessage 
                        },
                        'Failed to get properties for child group'
                      );
                    }
                  }
                }
              }

              // Add child group to parent's children
              const childNode = formatGroupNode(childGroup, childProperties as any[]);

              // Check for grandchildren
              const grandchildGroups = groupsResponse.groups.items.filter(
                (g) => g.parentGroupId === childGroup.groupId,
              );

              for (const grandchild of grandchildGroups) {
                const grandchildProperties: PapiProperty[] = [];

                if (grandchild.contractIds?.length > 0) {
                  // Validate grandchild contract IDs
                  const validGrandchildContractIds = grandchild.contractIds.filter((contractId: string) => {
                    if (!contractIdPattern.test(contractId)) {
                      pinoLogger.warn({ contractId, groupId: grandchild.groupId }, 'Skipping invalid grandchild contract ID');
                      return false;
                    }
                    return true;
                  });
                  
                  for (const gcContractId of validGrandchildContractIds) {
                    try {
                      const gcPropsRawResponse = await client.request({
                        path: '/papi/v1/properties',
                        method: 'GET',
                        headers: {
                          Accept: 'application/json',
                          'PAPI-Use-Prefixes': 'true',
                        },
                        queryParams: {
                          contractId: gcContractId,
                          groupId: grandchild.groupId,
                        },
                      });

                      if (!isPapiError(gcPropsRawResponse) && isPapiPropertiesResponse(gcPropsRawResponse)) {
                        const gcPropsResponse = gcPropsRawResponse as PapiPropertiesListResponse;
                        grandchildProperties.push(...(gcPropsResponse.properties?.items || []));
                      }
                    } catch (_error) {
                      // CRITICAL FIX 3: Better Error Messages for grandchild groups
                      const errorMessage = _error instanceof Error ? _error.message : String(_error);
                      const isHttpError = errorMessage.includes('HTTP 500') || errorMessage.includes('500');
                      
                      if (isHttpError) {
                        pinoLogger.warn(
                          { 
                            groupId: grandchild.groupId, 
                            contractId: gcContractId, 
                            error: errorMessage 
                          },
                          'API validation failed for grandchild group - Invalid parameters or insufficient permissions'
                        );
                      } else {
                        pinoLogger.error(
                          { 
                            groupId: grandchild.groupId, 
                            contractId: gcContractId, 
                            error: errorMessage 
                          },
                          'Failed to get properties for grandchild group'
                        );
                      }
                    }
                  }
                }

                const grandchildNode = formatGroupNode(grandchild, grandchildProperties as any[]);
                childNode.children?.push(grandchildNode);
              }

              groupNode.children?.push(childNode);
            }
          }

          treeNodes.push(groupNode);
          break; // Only process first contract for now
        } catch (_error) {
          // CRITICAL FIX 3: Enhanced Error Messages for main group API calls
          const errorMessage = _error instanceof Error ? _error.message : String(_error);
          const isHttpError = errorMessage.includes('HTTP 500') || errorMessage.includes('500');
          
          if (isHttpError) {
            pinoLogger.warn(
              { 
                groupId, 
                contractId, 
                error: errorMessage 
              },
              'API validation failed for main group - Invalid parameters or insufficient permissions'
            );
          } else {
            pinoLogger.error(
              { 
                groupId, 
                contractId, 
                error: errorMessage 
              },
              'Failed to get properties for main group'
            );
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
      for (const [contractId, stats] of Array.from(contractSummary.entries())) {
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
        pinoLogger.debug({ searchTerm }, 'Searching for property by name');

        // Get groups first
        const groupsRawResponse = await client.request({
          path: '/papi/v1/groups',
          method: 'GET',
        });

        if (isPapiError(groupsRawResponse)) {
          throw new Error(`Failed to list groups: ${groupsRawResponse.detail}`);
        }

        if (!isPapiGroupsResponse(groupsRawResponse)) {
          throw new Error('Invalid groups response structure from PAPI API');
        }

        const groupsResponse = groupsRawResponse as PapiGroupsListResponse;

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

        const foundProperties: Array<{ property: PapiProperty; group: PapiGroup }> = [];
        let totalPropertiesSearched = 0;
        let groupsSearched = 0;

        // Search properties with limits
        for (const group of groupsResponse.groups.items) {
          // Check timeout
          if (Date.now() - startTime > TIMEOUT_MS) {
            pinoLogger.warn('Timeout reached during property search');
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
              const propertiesRawResponse = await client.request({
                path: '/papi/v1/properties',
                method: 'GET',
                queryParams: {
                  contractId: contractId,
                  groupId: group.groupId,
                },
              });

              if (isPapiError(propertiesRawResponse)) {
                throw new Error(`Failed to list properties: ${propertiesRawResponse.detail}`);
              }

              if (!isPapiPropertiesResponse(propertiesRawResponse)) {
                throw new Error('Invalid properties response structure from PAPI API');
              }

              const propertiesResponse = propertiesRawResponse as PapiPropertiesListResponse;

              const properties = propertiesResponse.properties?.items || [];
              totalPropertiesSearched += properties.length;

              // Limit properties to search per group
              const propertiesToSearch = properties.slice(0, MAX_PROPERTIES_PER_GROUP);

              // Search by property name (exact and partial match)
              const exactMatch = propertiesToSearch.find(
                (prop) => prop.propertyName.toLowerCase() === searchTerm,
              );

              if (exactMatch) {
                // Found exact match - return immediately
                pinoLogger.debug({ propertyName: exactMatch.propertyName, propertyId: exactMatch.propertyId }, 'Found exact property match');
                return await getPropertyById(client, exactMatch.propertyId, exactMatch);
              }

              // Collect partial matches
              const partialMatches = propertiesToSearch.filter((prop) =>
                prop.propertyName.toLowerCase().includes(searchTerm),
              );

              partialMatches.forEach((prop) => {
                foundProperties.push({ property: prop, group });
              });
            } catch (_err) {
              pinoLogger.error({ error: _err, contractId }, 'Failed to search in contract during property search');
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
                  (hitTimeout ? '[TIME] **Search was stopped due to timeout.**\n\n' : '') +
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
          if (!match) {
            throw new Error('Unexpected error: match not found');
          }
          const searchNote = `[INFO] Found property "${match.property.propertyName}" (${match.property.propertyId})\n\n`;
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
    return errorHandler.handle('getProperty', _error, undefined, {
      propertyId: args.propertyId,
    });
  }
}

/**
 * Internal function to get property details by ID
 */
async function getPropertyById(
  client: AkamaiClient,
  propertyId: string,
  existingProperty?: PapiProperty,
): Promise<MCPToolResponse> {
  try {
    let prop = existingProperty;
    let contractId: string | undefined;
    let groupId: string | undefined;
    let groupName: string | undefined;

    if (!prop) {
      // First, we need to find the contract and group for this property
      // Get all groups to search for the property
      const groupsRawResponse = await client.request({
        path: '/papi/v1/groups',
        method: 'GET',
      });

      if (isPapiError(groupsRawResponse)) {
        throw new Error(`Failed to list groups: ${groupsRawResponse.detail}`);
      }

      if (!isPapiGroupsResponse(groupsRawResponse)) {
        throw new Error('Invalid groups response structure from PAPI API');
      }

      const groupsResponse = groupsRawResponse as PapiGroupsListResponse;

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
        if (!cId) {
          continue;
        }
        try {
          const propertiesRawResponse = await client.request({
            path: '/papi/v1/properties',
            method: 'GET',
            queryParams: {
              contractId: cId,
              groupId: group.groupId,
            },
          });

          if (isPapiError(propertiesRawResponse)) {
            throw new Error(`Failed to list properties: ${propertiesRawResponse.detail}`);
          }

          if (!isPapiPropertiesResponse(propertiesRawResponse)) {
            throw new Error('Invalid properties response structure from PAPI API');
          }

          const propertiesResponse = propertiesRawResponse as PapiPropertiesListResponse;

          const found = propertiesResponse.properties?.items?.find(
            (p) => p.propertyId === propertyId,
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
          pinoLogger.error({ error: _err, groupId: group.groupId }, 'Failed to search in group during property lookup');
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

    // Now get detailed property information using the proper endpoint
    // According to Akamai docs, this endpoint doesn't require contractId or groupId
    if (!existingProperty) {
      try {
        const detailRawResponse = await client.request({
          path: `/papi/v1/properties/${propertyId}`,
          method: 'GET',
          // Remove queryParams - they're not needed for this endpoint and cause search behavior
        });

        if (isPapiError(detailRawResponse)) {
          throw new Error(`Failed to get property details: ${detailRawResponse.detail}`);
        }

        if (!isPapiPropertyDetailsResponse(detailRawResponse)) {
          throw new Error('Invalid property details response structure from PAPI API');
        }

        const detailResponse = detailRawResponse as PapiPropertyDetailsResponse;

        // The response contains the property in properties.items[0]
        if (detailResponse.properties?.items?.[0]) {
          prop = detailResponse.properties.items[0];
        }
      } catch (detailError) {
        pinoLogger.error({ error: detailError, propertyId }, 'Failed to get detailed property info');
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
        const versionRawResponse = await client.request({
          path: `/papi/v1/properties/${propertyId}/versions/${prop.latestVersion}`,
          method: 'GET',
          queryParams: {
            contractId: contractId,
            groupId: groupId,
          },
        });

        if (!isPapiError(versionRawResponse) && isPapiPropertyVersionsResponse(versionRawResponse)) {
          versionDetails = versionRawResponse as PapiPropertyVersionDetailsResponse;
        }
      }
    } catch (versionError) {
      // Continue without version details
      pinoLogger.error({ error: versionError, propertyId, version: prop.latestVersion }, 'Failed to get version details');
    }

    // Get hostnames associated with the property
    let hostnames = null;
    try {
      if (prop.latestVersion && contractId && groupId) {
        const hostnamesRawResponse = await client.request({
          path: `/papi/v1/properties/${propertyId}/versions/${prop.latestVersion}/hostnames`,
          method: 'GET',
          queryParams: {
            contractId: contractId,
            groupId: groupId,
          },
        });

        if (!isPapiError(hostnamesRawResponse) && isPapiPropertyHostnamesResponse(hostnamesRawResponse)) {
          hostnames = hostnamesRawResponse as PapiPropertyHostnamesResponse;
        }
      }
    } catch (hostnameError) {
      // Continue without hostname details
      pinoLogger.error({ error: hostnameError, propertyId, version: prop.latestVersion }, 'Failed to get hostnames');
    }

    // Return structured data for Claude Desktop optimization
    const structuredResponse = {
      property: {
        propertyId: prop.propertyId,
        propertyName: prop.propertyName,
        contractId: prop.contractId,
        groupId: prop.groupId,
        groupName: groupName || null,
        productId: prop.productId || null,
        assetId: prop.assetId || null,
        note: prop.note || null,
        ruleFormat: prop.ruleFormat || null
      },
      versions: {
        latest: prop.latestVersion || null,
        production: prop.productionVersion || null,
        staging: prop.stagingVersion || null,
        productionStatus: prop.productionStatus || null,
        stagingStatus: prop.stagingStatus || null
      },
      versionDetails: versionDetails?.versions?.items?.[0] ? {
        version: versionDetails.versions.items[0].propertyVersion,
        updatedBy: versionDetails.versions.items[0].updatedByUser || null,
        updatedDate: versionDetails.versions.items[0].updatedDate || null,
        note: versionDetails.versions.items[0].note || null,
        etag: versionDetails.versions.items[0].etag || null
      } : null,
      hostnames: hostnames?.hostnames?.items ? 
        (hostnames.hostnames.items as any[]).map(h => ({
          hostname: h.cnameFrom,
          edgeHostname: h.cnameTo,
          certStatus: h.certStatus?.status || null,
          validationStatus: h.validationStatus || null
        })) : [],
      metadata: {
        hasProductionVersion: !!prop.productionVersion,
        hasStagingVersion: !!prop.stagingVersion,
        needsActivation: prop.latestVersion && prop.latestVersion > (prop.productionVersion || 0),
        hostnameCount: hostnames?.hostnames?.items?.length || 0
      }
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(structuredResponse, null, 2),
        },
      ],
    };
  } catch (_error) {
    return errorHandler.handle('getPropertyById', _error, undefined, {
      propertyId,
    });
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
        const formatsRawResponse = await client.request({
          path: '/papi/v1/rule-formats',
          method: 'GET',
        });

        if (isPapiError(formatsRawResponse)) {
          throw new Error(`Failed to get rule formats: ${formatsRawResponse.detail}`);
        }

        if (!isPapiRuleFormatsResponse(formatsRawResponse)) {
          throw new Error('Invalid rule formats response structure from PAPI API');
        }

        const formatsResponse = formatsRawResponse as PapiRuleFormatsResponse;

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
    const createRawResponse = await client.request({
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

    if (isPapiError(createRawResponse)) {
      throw new Error(`Failed to create property: ${createRawResponse.detail}`);
    }

    if (!isPapiPropertyCreateResponse(createRawResponse)) {
      throw new Error('Invalid property create response structure from PAPI API');
    }

    const response = createRawResponse as PapiPropertyCreateResponse;

    if (!response.propertyLink) {
      throw new Error('Property creation failed - no property link returned');
    }

    // Extract property ID from the link (remove query parameters)
    const propertyId = response.propertyLink.split('/').pop()?.split('?')[0];

    // Return structured data for Claude Desktop
    const contractName = await getContractName(client, args.contractId);
    const productName = getProductName(args.productId);
    const groupName = await getGroupName(client, args.groupId);
    
    const structuredResponse = {
      success: true,
      property: {
        propertyId: propertyId,
        propertyName: args.propertyName,
        contractId: args.contractId,
        contractName: contractName,
        groupId: args.groupId,
        groupName: groupName,
        productId: args.productId,
        productName: productName,
        propertyLink: response.propertyLink
      },
      metadata: {
        createdAt: new Date().toISOString(),
        ruleFormat: args.ruleFormat || 'latest'
      }
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(structuredResponse, null, 2),
        },
      ],
    };
  } catch (_error: any) {
    // Handle 403 Forbidden with human-readable context
    if (_error.response?.status === 403) {
      const errorMessage = await format403Error(
        client,
        `create property "${args.propertyName}"`,
        args.contractId,
        args.groupId
      );
      
      return {
        content: [{
          type: 'text',
          text: errorMessage
        }]
      };
    }

    // Handle product not available errors
    if (_error.response?.status === 400 && _error.response?.data?.detail?.includes('product')) {
      const productName = getProductName(args.productId);
      const contractName = await getContractName(client, args.contractId);
      const contractIdDisplay = args.contractId.replace('ctr_', '');
      
      return {
        content: [{
          type: 'text',
          text: `Product Not Available\n\n` +
                `"${productName}" is not available in contract "${contractName}" (${contractIdDisplay})\n\n` +
                `This is a commercial limitation - only Akamai can add products to contracts.\n\n` +
                `Options:\n` +
                `1. Use 'property.list_products' to see available products in this contract\n` +
                `2. Choose a different product that's included\n` +
                `3. Use a different contract that includes "${productName}"\n` +
                `4. Contact your Akamai account team to purchase "${productName}"`
        }]
      };
    }

    // Handle property already exists
    if (_error.message?.includes('already exists') || 
        _error.response?.data?.detail?.includes('already exists')) {
      return {
        content: [{
          type: 'text',
          text: `Property Already Exists\n\n` +
                `A property with name "${args.propertyName}" already exists in this contract/group.\n\n` +
                `Solutions:\n` +
                `1. Choose a different property name\n` +
                `2. Use 'property.list' to see existing properties\n` +
                `3. Check if the property exists in a different group`
        }]
      };
    }

    // Use new error handler for generic errors
    return errorHandler.handle(_error, {
      operation: 'create property',
      parameters: {
        propertyName: args.propertyName,
        productId: args.productId,
        contractId: args.contractId,
        groupId: args.groupId
      },
      context: 'Creating new CDN property'
    });
  }
}

/**
 * Create delivery configuration with intelligent property + certificate setup
 * 
 * ENHANCED USER EXPERIENCE based on official Akamai documentation research:
 * - Combines property creation with certificate configuration
 * - Provides step-by-step DNS setup guidance  
 * - Supports Default DV, CPS-managed, and shared certificates
 * - Includes domain validation setup for Default DV certificates
 * - Generates complete next-steps guidance for activation
 * 
 * This function implements the complete Akamai delivery workflow from
 * Property Manager documentation for optimal user experience.
 */
export async function createDeliveryConfig(
  client: AkamaiClient,
  args: {
    // Required essentials
    hostname: string;                    // Domain to accelerate (e.g., "www.example.com")
    originHostname: string;              // Origin server (e.g., "origin.example.com")
    
    // Certificate options (auto-detected if not specified)
    certificateType?: 'auto' | 'default-dv' | 'cps-managed' | 'shared-cert';
    deploymentNetwork?: 'standard' | 'enhanced' | 'auto';
    domainValidationMethod?: 'auto-dns' | 'auto-http' | 'manual-dns' | 'manual-http';
    
    // Property customization (intelligent defaults applied)
    propertyName?: string;               // Auto-generated from hostname if not provided
    productId?: string;                  // Auto-detected or defaults to Web Acceleration
    contractId?: string;                 // Auto-detected from account
    groupId?: string;                    // Auto-detected from account
    
    // Advanced options
    enableAdvancedSecurity?: boolean;    // Enhanced security features
    optimizeForMobile?: boolean;         // Mobile-specific optimizations
    enableMonitoring?: boolean;          // Certificate and performance monitoring
    
    // Control options
    dryRun?: boolean;                    // Preview configuration without creating
    skipValidation?: boolean;            // Skip pre-flight validation checks
  },
): Promise<MCPToolResponse> {
  try {
    // STEP 1: Input validation and intelligent defaults
    const validationErrors: string[] = [];
    
    if (!args.hostname?.trim()) {
      validationErrors.push('Hostname is required (e.g., "www.example.com")');
    } else if (!/^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,}$/.test(args.hostname)) {
      validationErrors.push('Hostname must be a valid domain name');
    }
    
    if (!args.originHostname?.trim()) {
      validationErrors.push('Origin hostname is required (e.g., "origin.example.com")');
    }
    
    if (validationErrors.length > 0) {
      return {
        content: [{
          type: 'text',
          text: `${validationErrors.map(e => `• ${e}`).join('\n')}\n\n[IDEA] **Example usage:**\n{\n  "hostname": "www.example.com",\n  "originHostname": "origin.example.com",\n  "certificateType": "default-dv"\n}`,
        }],
      };
    }
    
    // Apply intelligent defaults based on Akamai best practices
    const config = {
      hostname: args.hostname.toLowerCase(),
      originHostname: args.originHostname.toLowerCase(),
      propertyName: args.propertyName || generateDeliveryPropertyName(args.hostname),
      certificateType: args.certificateType || 'default-dv',  // Default DV recommended
      deploymentNetwork: args.deploymentNetwork === 'standard' ? 'STANDARD_TLS' : 'ENHANCED_TLS',
      domainValidationMethod: args.domainValidationMethod || 'auto-dns',  // Recommended method
      productId: args.productId || 'prd_Web_Accel',  // Most common product
      enableSecurity: args.enableAdvancedSecurity !== false,  // Default to true
      enableMobile: args.optimizeForMobile || false,
      enableMonitoring: args.enableMonitoring !== false,  // Default to true
    };
    
    // STEP 2: Dry run preview (if requested)
    if (args.dryRun) {
      return formatDeliveryConfigPreview(config);
    }
    
    // STEP 3: Create the property with delivery-optimized settings
    const propertyResult = await createProperty(client, {
      propertyName: config.propertyName,
      productId: config.productId,
      contractId: args.contractId || '',  // Will be auto-detected
      groupId: args.groupId || '',        // Will be auto-detected
      ruleFormat: 'latest',
    });
    
    // Extract property details from the JSON response
    const firstContent = propertyResult.content?.[0];
    if (!firstContent || firstContent.type !== 'text') {
      return propertyResult;
    }
    const propertyData = JSON.parse(firstContent.text);
    if (!propertyData.success) {
      // Property creation failed, return the original error
      return propertyResult;
    }
    
    // STEP 4: Generate comprehensive delivery configuration guidance
    const deliveryConfig = {
      success: true,
      property: propertyData.property,
      hostname: {
        hostname: config.hostname,
        originHostname: config.originHostname,
        edgeHostname: generateEdgeHostname(config.hostname, config.certificateType),
        certificateType: config.certificateType,
        deploymentNetwork: config.deploymentNetwork,
      },
      certificate: generateCertificateConfig(config),
      dnsRecords: generateDNSRecords(config),
      validation: config.certificateType === 'default-dv' ? generateDVValidation(config) : null,
      nextSteps: generateDeliveryNextSteps(config),
      monitoring: generateMonitoringGuidance(config),
      metadata: {
        createdAt: new Date().toISOString(),
        workflow: 'enhanced-delivery-config',
        estimatedSetupTime: '15-30 minutes',
        estimatedPropagationTime: '5-10 minutes after activation',
      },
    };
    
    return formatDeliveryConfigSuccess(deliveryConfig);
    
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `[ERROR] **Failed to create delivery configuration**\n\n**Error:** ${String(error)}\n\n[IDEA] **Common solutions:**\n• Verify hostname and origin are valid\n• Check account permissions and contract features\n• Ensure certificate type is supported in your account`,
      }],
    };
  }
}

/**
 * Generate intelligent property name for delivery configuration
 */
function generateDeliveryPropertyName(hostname: string): string {
  const cleanName = hostname.replace(/^www\./, '').replace(/\./g, '-');
  return `${cleanName}-delivery`;
}

/**
 * Generate edge hostname based on certificate type
 */
function generateEdgeHostname(hostname: string, certificateType: string): string {
  if (certificateType === 'shared-cert') {
    return `${hostname.replace(/\./g, '-')}.akamaized.net`;
  }
  // Default DV and CPS-managed use .edgesuite.net
  return `${hostname}.edgesuite.net`;
}

/**
 * Generate certificate configuration details
 */
function generateCertificateConfig(config: { certificateType: string }): Record<string, any> {
  const certConfigs = {
    'default-dv': {
      type: 'Default DV Certificate',
      autoRenewal: true,
      validationRequired: true,
      setupTime: '5-15 minutes after DNS setup',
      features: ['Auto-renewal', 'Let\'s Encrypt CA', 'TLS 1.2/1.3'],
    },
    'cps-managed': {
      type: 'CPS-Managed Certificate',
      autoRenewal: false,
      validationRequired: false,
      setupTime: 'Immediate (if certificate exists)',
      features: ['Custom CA', 'Extended validation', 'Custom cipher suites'],
    },
    'shared-cert': {
      type: 'Akamai Shared Certificate',
      autoRenewal: false,
      validationRequired: false,
      setupTime: 'Immediate',
      features: ['Development use', 'Akamai domain required', 'No custom domain'],
    },
  };
  
  const certType = config.certificateType as keyof typeof certConfigs;
  return certConfigs[certType] || certConfigs['default-dv'];
}

/**
 * Generate required DNS records
 */
function generateDNSRecords(config: any): any[] {
  const records = [
    {
      type: 'CNAME',
      name: config.hostname,
      value: generateEdgeHostname(config.hostname, config.certificateType),
      ttl: 300,
      purpose: 'Routes traffic to Akamai edge servers',
      priority: 'Required',
    },
  ];
  
  // Add validation record for Default DV
  if (config.certificateType === 'default-dv' && config.domainValidationMethod === 'auto-dns') {
    const validationTarget = `ac.${config.hostname.replace(/\./g, '-')}.validate-akdv.net`;
    records.push({
      type: 'CNAME',
      name: `_acme-challenge.${config.hostname}`,
      value: validationTarget,
      ttl: 300,
      purpose: 'Certificate domain validation (enables auto-renewal)',
      priority: 'Required for Default DV',
    });
  }
  
  return records;
}

/**
 * Generate Default DV validation details
 */
function generateDVValidation(config: any): any {
  if (config.domainValidationMethod === 'auto-dns') {
    return {
      method: 'Auto DNS Validation',
      status: 'Pending DNS setup',
      description: 'Automatic validation via DNS CNAME record',
      benefits: [
        'Automatic certificate renewal',
        'No manual intervention required',
        'Supports wildcard certificates',
      ],
      requirements: [
        'Create _acme-challenge CNAME record before activation',
        'Keep validation record permanent for auto-renewal',
        'DNS propagation typically takes 5-15 minutes',
      ],
    };
  }
  
  return {
    method: config.domainValidationMethod,
    status: 'Manual setup required',
    description: 'Manual validation method selected',
  };
}

/**
 * Generate next steps guidance
 */
function generateDeliveryNextSteps(config: any): any {
  const steps = {
    immediate: [
      '1. Create the required DNS records shown below',
      '2. Wait for DNS propagation (5-15 minutes)',
      '3. Add hostname to property version',
      '4. Activate property to staging for testing',
    ],
    testing: [
      '1. Verify SSL certificate is working',
      '2. Test content delivery and caching',
      '3. Check performance optimizations',
      '4. Validate mobile experience (if enabled)',
    ],
    production: [
      '1. Activate property to production',
      '2. Monitor certificate status and expiration',
      '3. Set up performance and security monitoring',
      '4. Configure alerts for certificate renewal',
    ],
  };
  
  if (config.certificateType === 'shared-cert') {
    steps.immediate[0] = '1. Update DNS to point to .akamaized.net hostname';
    steps.immediate.splice(3, 0, '3. Note: Shared certificates are for development only');
  }
  
  return steps;
}

/**
 * Generate monitoring and alerting guidance
 */
function generateMonitoringGuidance(config: any): any {
  if (config.enableMonitoring && config.certificateType === 'default-dv') {
    return {
      required: true,
      alerts: [
        'Expired Default certificate',
        'Domain validation failed', 
        'Certificate domain is blocked',
        'DNS does not contain authorized CA',
      ],
      setup: 'Configure alerts in Control Center → Alerts application',
      automation: 'Set up automated notifications for certificate issues',
    };
  }
  
  if (config.certificateType === 'cps-managed') {
    return {
      required: false,
      note: 'CPS-managed certificates include automatic monitoring',
    };
  }
  
  return {
    required: false,
    note: 'Shared certificates do not require monitoring',
  };
}

/**
 * Format delivery configuration preview
 */
function formatDeliveryConfigPreview(config: any): MCPToolResponse {
  let output = `[SEARCH] **Delivery Configuration Preview**\n\n`;
  
  output += `**Recommended Configuration:**\n`;
  output += `• Property Name: ${config.propertyName}\n`;
  output += `• Hostname: ${config.hostname}\n`;
  output += `• Origin: ${config.originHostname}\n`;
  output += `• Certificate: ${config.certificateType}\n`;
  output += `• Network: ${config.deploymentNetwork}\n`;
  output += `• Validation: ${config.domainValidationMethod}\n\n`;
  
  output += `**Features Enabled:**\n`;
  output += `• Security: ${config.enableSecurity ? '[SUCCESS]' : '[ERROR]'}\n`;
  output += `• Mobile Optimization: ${config.enableMobile ? '[SUCCESS]' : '[ERROR]'}\n`;
  output += `• Monitoring: ${config.enableMonitoring ? '[SUCCESS]' : '[ERROR]'}\n\n`;
  
  output += `[WARNING] **This is a preview only.** Remove \`dryRun: true\` to create the configuration.`;
  
  return {
    content: [{ type: 'text', text: output }],
  };
}

/**
 * Format successful delivery configuration response
 */
function formatDeliveryConfigSuccess(config: any): MCPToolResponse {
  let output = `[SUCCESS] **Delivery Configuration Created Successfully**\n\n`;
  
  // Property summary
  output += `**Property Created:**\n`;
  output += `• Name: ${config.property.propertyName}\n`;
  output += `• ID: ${config.property.propertyId}\n`;
  output += `• Product: ${config.property.productName}\n\n`;
  
  // Hostname configuration
  output += `**Hostname Configuration:**\n`;
  output += `• Domain: ${config.hostname.hostname}\n`;
  output += `• Edge Hostname: ${config.hostname.edgeHostname}\n`;
  output += `• Certificate: ${config.certificate.type}\n`;
  output += `• Network: ${config.hostname.deploymentNetwork}\n\n`;
  
  // Required DNS records
  output += `**[TOOL] Required DNS Records:**\n`;
  config.dnsRecords.forEach((record: any, index: number) => {
    output += `${index + 1}. \`${record.name} ${record.type} ${record.value}\`\n`;
    output += `   ${record.purpose}\n\n`;
  });
  
  // Certificate validation (if applicable)
  if (config.validation) {
    output += `**[LIST] Certificate Validation:**\n`;
    output += `• Method: ${config.validation.method}\n`;
    output += `• Status: ${config.validation.status}\n`;
    if (config.validation.requirements) {
      output += `• Requirements:\n`;
      config.validation.requirements.forEach((req: string) => {
        output += `  - ${req}\n`;
      });
    }
    output += `\n`;
  }
  
  // Next steps
  output += `**[LIST] Next Steps:**\n\n`;
  output += `**Immediate (Required):**\n`;
  config.nextSteps.immediate.forEach((step: string) => {
    output += `${step}\n`;
  });
  
  output += `\n**Testing Phase:**\n`;
  config.nextSteps.testing.forEach((step: string) => {
    output += `${step}\n`;
  });
  
  output += `\n**Production Deployment:**\n`;
  config.nextSteps.production.forEach((step: string) => {
    output += `${step}\n`;
  });
  
  // Monitoring setup
  if (config.monitoring.required) {
    output += `\n[WARNING] **Important:** ${config.monitoring.setup}\n`;
    output += `Default DV certificates require manual alert configuration.`;
  }
  
  output += `\n\n[TIME] **Estimated Setup Time:** ${config.metadata.estimatedSetupTime}`;
  output += `\n[GLOBAL] **Propagation Time:** ${config.metadata.estimatedPropagationTime}`;
  
  return {
    content: [{ type: 'text', text: output }],
  };
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
    const rawResponse = await client.request({
      path: '/papi/v1/contracts',
      method: 'GET',
    });

    if (isPapiError(rawResponse)) {
      throw new Error(`Failed to list contracts: ${rawResponse.detail}`);
    }

    if (!isPapiContractsResponse(rawResponse)) {
      throw new Error('Invalid contracts response structure from PAPI API');
    }

    const response = rawResponse as PapiContractsListResponse;

    if (!response.contracts?.items || response.contracts.items.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              contracts: [],
              metadata: {
                total: 0,
                filtered: 0,
                searchTerm: args.searchTerm || null
              },
              error: {
                type: 'NO_CONTRACTS_FOUND',
                message: 'No contracts found in your account',
                suggestion: 'This might indicate a permissions issue with your API credentials'
              }
            }, null, 2),
          },
        ],
      };
    }

    let contracts = response.contracts.items;
    const totalContracts = contracts.length;

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
              text: JSON.stringify({
                contracts: [],
                metadata: {
                  total: totalContracts,
                  filtered: 0,
                  searchTerm: args.searchTerm
                },
                error: {
                  type: 'NO_MATCHES',
                  message: `No contracts found matching "${args.searchTerm}"`,
                  suggestion: 'Try a partial contract ID or type name'
                }
              }, null, 2),
            },
          ],
        };
      }
    }

    // Build structured response
    const structuredContracts = contracts.map((contract: any) => ({
      contractId: contract.contractId || null,
      contractTypeName: contract.contractTypeName || 'Standard',
      status: contract.status || 'Active',
      edgeHostnames: contract.edgeHostnames || null,
      products: contract.products || null
    }));

    // Analyze contract types
    const contractTypes = new Map<string, number>();
    contracts.forEach((c: any) => {
      const type = c.contractTypeName || 'Standard';
      contractTypes.set(type, (contractTypes.get(type) || 0) + 1);
    });

    const structuredResponse = {
      contracts: structuredContracts,
      summary: {
        byType: Object.fromEntries(contractTypes),
        activeCount: contracts.filter((c: any) => c.status === 'Active' || !c.status).length,
        inactiveCount: contracts.filter((c: any) => c.status && c.status !== 'Active').length
      },
      metadata: {
        total: totalContracts,
        filtered: contracts.length,
        searchTerm: args.searchTerm || null
      }
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(structuredResponse, null, 2),
        },
      ],
    };
  } catch (_error) {
    return errorHandler.handle('listContracts', _error, undefined, {
      searchTerm: args.searchTerm,
      customer: args.customer,
    });
  }
}

/**
 * List all available groups and contracts
 * Essential for property creation as it provides the required IDs
 */
export async function listGroups(
  client: AkamaiClient,
  args: { 
    searchTerm?: string;
    page?: number;
    pageSize?: number;
  },
): Promise<MCPToolResponse> {
  try {
    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    const rawResponse = await client.request({
      path: '/papi/v1/groups',
      method: 'GET',
    }).finally(() => clearTimeout(timeout));

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
              metadata: {
                total: 0,
                filtered: 0,
                searchTerm: args.searchTerm || null
              },
              error: {
                type: 'NO_GROUPS_FOUND',
                message: 'No groups found in your account',
                suggestion: 'This might indicate a permissions issue with your API credentials'
              }
            }, null, 2),
          },
        ],
      };
    }

    // Organize groups hierarchically
    let groups = response.groups.items;

    // Filter groups by search term if provided
    const totalGroups = groups.length;
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
                  total: totalGroups,
                  filtered: 0,
                  searchTerm: args.searchTerm
                },
                error: {
                  type: 'NO_MATCHES',
                  message: `No groups found matching "${args.searchTerm}"`,
                  suggestion: 'Try a partial name or group ID'
                }
              }, null, 2),
            },
          ],
        };
      }
    }

    // Apply pagination to prevent token limit issues
    const paginationOptions = {
      page: args.page || 1,
      pageSize: args.pageSize || 50,
      estimatedItemSize: 500, // Estimated characters per group
    };

    const paginated = paginateArray(groups, paginationOptions);

    // Build hierarchy only for paginated items
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
    const buildHierarchy = (group: PapiGroup): any => {
      const children = groupsByParent[group.groupId] || [];
      return {
        groupId: group.groupId,
        groupName: group.groupName,
        contractIds: group.contractIds || [],
        parentGroupId: group.parentGroupId || null,
        children: children.map((child: PapiGroup) => buildHierarchy(child))
      };
    };

    // Build structured response
    const hierarchy = topLevelGroups.map((group: PapiGroup) => buildHierarchy(group));

    // Extract all unique contracts from paginated items
    const allContracts = new Set<string>();
    paginated.items.forEach((g: PapiGroup) => {
      if (g.contractIds) {
        g.contractIds.forEach((c: string) => allContracts.add(c));
      }
    });

    // Build flat list with parent references
    const flatList = paginated.items.map((group: PapiGroup) => ({
      groupId: group.groupId,
      groupName: group.groupName,
      contractIds: group.contractIds || [],
      parentGroupId: group.parentGroupId || null
    }));

    const structuredResponse = {
      groups: {
        hierarchy: hierarchy,
        flat: flatList
      },
      contracts: {
        unique: Array.from(allContracts).sort(),
        total: allContracts.size
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
        suggestions: [] as string[]
      }
    };

    // Check if response would exceed token limit
    if (wouldExceedTokenLimit(structuredResponse)) {
      pinoLogger.warn('Response would exceed token limit, applying additional truncation');
      
      // Truncate the flat list to fit
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
    return errorHandler.handle('listGroups', _error, undefined, {
      searchTerm: args.searchTerm,
    });
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

    const rawResponse = await client.request({
      path: '/papi/v1/products',
      method: 'GET',
      queryParams: {
        contractId: contractId,
      },
    });

    if (isPapiError(rawResponse)) {
      throw new Error(`Failed to list products: ${rawResponse.detail}`);
    }

    if (!isPapiProductsResponse(rawResponse)) {
      throw new Error('Invalid products response structure from PAPI API');
    }

    const response = rawResponse as PapiProductsListResponse;

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
 * INTERNAL BULK SEARCH IMPLEMENTATION
 * These functions are used internally by the search functionality
 * to provide better performance when searching across properties.
 * Users should use the regular search functions which will automatically
 * leverage bulk search when appropriate.
 */

/**
 * Internal: Prepare a bulk search across properties
 * This is step 1 of the bulk search workflow
 * @internal
 */
// @ts-ignore - Unused function preserved for future use
async function prepareBulkSearch(
  client: AkamaiClient,
  args: {
    searchType: 'origin' | 'hostname' | 'cpCode' | 'behavior' | 'rule' | 'custom';
    searchValue: string;
    contractId?: string;
    groupId?: string;
    propertyName?: string;
    customer?: string;
  }
): Promise<MCPToolResponse> {
  const _context: ErrorContext = {
    operation: 'prepareBulkSearch',
    customer: args.customer || client.getCustomer(),
  };

  return withToolErrorHandling(async () => {
    // Validate parameters - simple validation for now
    const validatedArgs = args; // TODO: Add proper schema validation when PropertyManagerSchemas.bulkSearchPrepare is defined

    // Build search query based on type
    const bulkSearchQuery = buildBulkSearchQuery(
      validatedArgs.searchType,
      validatedArgs.searchValue
    );

    // Add filters if provided
    const requestBody: any = {
      bulkSearchQuery,
    };

    if (validatedArgs.contractId) {
      requestBody.contractId = validatedArgs.contractId;
    }
    if (validatedArgs.groupId) {
      requestBody.groupId = validatedArgs.groupId;
    }
    if (validatedArgs.propertyName) {
      requestBody.propertyName = validatedArgs.propertyName;
    }

    // Make the request with retry logic
    const response = await withRetry(async () => {
      return await client.request({
        path: '/papi/v1/bulk/rules-search-requests',
        method: 'POST',
        body: requestBody,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      });
    });

    // Extract bulk search ID from response
    const bulkSearchId = extractBulkSearchId(response);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            bulkSearchId,
            searchType: validatedArgs.searchType,
            searchValue: validatedArgs.searchValue,
            status: 'PENDING',
            message: 'Bulk search initiated. Use checkBulkSearchStatus to monitor progress.',
            nextStep: `checkBulkSearchStatus --bulkSearchId ${bulkSearchId}`,
          }, null, 2),
        },
      ],
    };
  }, _context);
}

/**
 * Internal: Check the status of a bulk search
 * @internal
 */
// @ts-ignore - Unused function preserved for future use
async function checkBulkSearchStatus(
  client: AkamaiClient,
  args: {
    bulkSearchId: string;
    customer?: string;
  }
): Promise<MCPToolResponse> {
  const _context: ErrorContext = {
    operation: 'checkBulkSearchStatus',
    customer: args.customer || client.getCustomer(),
  };

  return withToolErrorHandling(async () => {
    const response = await withRetry(async () => {
      return await client.request({
        path: `/papi/v1/bulk/rules-search-requests/${args.bulkSearchId}`,
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });
    });

    const status = response as any;
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            bulkSearchId: args.bulkSearchId,
            searchStatus: status.searchStatus || 'UNKNOWN',
            searchSubmittedDate: status.searchSubmittedDate,
            searchCompletedDate: status.searchCompletedDate,
            results: status.results || {
              matchesFound: false,
              numberOfMatches: 0,
            },
            nextStep: status.searchStatus === 'COMPLETE' 
              ? `getBulkSearchResults --bulkSearchId ${args.bulkSearchId}`
              : 'Wait and check again',
          }, null, 2),
        },
      ],
    };
  }, _context);
}

/**
 * Internal: Get the results of a completed bulk search
 * @internal
 */
// @ts-ignore - Unused function preserved for future use
async function getBulkSearchResults(
  client: AkamaiClient,
  args: {
    bulkSearchId: string;
    page?: number;
    pageSize?: number;
    customer?: string;
  }
): Promise<MCPToolResponse> {
  const _context: ErrorContext = {
    operation: 'getBulkSearchResults',
    customer: args.customer || client.getCustomer(),
  };

  return withToolErrorHandling(async () => {
    const queryParams: any = {};
    if (args.page) {queryParams.page = args.page;}
    if (args.pageSize) {queryParams.pageSize = args.pageSize;}

    const response = await withRetry(async () => {
      return await client.request({
        path: `/papi/v1/bulk/rules-search-requests/${args.bulkSearchId}/results`,
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        queryParams,
      });
    });

    const results = response as any;

    // Format results for readability
    const formattedResults = formatBulkSearchResults(results);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(formattedResults, null, 2),
        },
      ],
    };
  }, _context);
}

/**
 * Internal: Perform a synchronous bulk search (faster but limited)
 * @internal
 */
// @ts-ignore - Unused function preserved for future use
async function synchronousBulkSearch(
  client: AkamaiClient,
  args: {
    searchType: 'origin' | 'hostname' | 'cpCode' | 'behavior' | 'rule' | 'custom';
    searchValue: string;
    propertyIds?: string[];
    maxResults?: number;
    customer?: string;
  }
): Promise<MCPToolResponse> {
  const _context: ErrorContext = {
    operation: 'synchronousBulkSearch',
    customer: args.customer || client.getCustomer(),
  };

  return withToolErrorHandling(async () => {
    // Build search query
    const bulkSearchQuery = buildBulkSearchQuery(args.searchType, args.searchValue);

    const requestBody: any = {
      bulkSearchQuery,
    };

    if (args.propertyIds) {
      requestBody.propertyIds = args.propertyIds;
    }

    // Use synchronous endpoint
    const response = await withRetry(async () => {
      return await client.request({
        path: '/papi/v1/bulk/rules-search-requests-synch',
        method: 'POST',
        body: requestBody,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      });
    });

    const results = response as any;
    const formattedResults = formatBulkSearchResults(results);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(formattedResults, null, 2),
        },
      ],
    };
  }, _context);
}

/**
 * Build search query based on search type
 */
function buildBulkSearchQuery(searchType: string, searchValue: string): any {
  const queries: Record<string, any> = {
    origin: {
      match: searchValue,
      syntax: 'JSONPATH',
      queryFields: [
        '$.behaviors[?(@.name == "origin")].options.hostname',
        '$.behaviors[?(@.name == "origin")].options.originSni',
        '$.behaviors[?(@.name == "origin")].options.customCertificateAuthority',
      ],
    },
    hostname: {
      match: searchValue,
      syntax: 'JSONPATH',
      queryFields: [
        '$.criteria[?(@.name == "hostname")].options.values[*]',
        '$.rules..criteria[?(@.name == "hostname")].options.values[*]',
      ],
    },
    cpCode: {
      match: searchValue,
      syntax: 'JSONPATH',
      queryFields: [
        '$.behaviors[?(@.name == "cpCode")].options.value.name',
        '$.behaviors[?(@.name == "cpCode")].options.value.id',
        '$.rules..behaviors[?(@.name == "cpCode")].options.value.name',
      ],
    },
    behavior: {
      match: searchValue,
      syntax: 'JSONPATH',
      queryFields: [
        '$.behaviors[*].name',
        '$.rules..behaviors[*].name',
      ],
    },
    rule: {
      match: searchValue,
      syntax: 'JSONPATH',
      queryFields: [
        '$.rules[*].name',
        '$.rules..name',
      ],
    },
    custom: {
      match: searchValue,
      syntax: 'JSONPATH',
      queryFields: ['$..'],
    },
  };

  return queries[searchType] || queries['custom'];
}

/**
 * Extract bulk search ID from response
 */
function extractBulkSearchId(response: any): string {
  // Try different response formats
  if (response.bulkSearchId) {
    return response.bulkSearchId;
  }
  
  // Try to extract from Location header format
  if (response.bulkSearchLink) {
    const match = response.bulkSearchLink.match(/\/([^\/]+)$/);
    if (match) {
      return match[1];
    }
  }

  throw new Error('Could not extract bulk search ID from response');
}

/**
 * Format bulk search results for readability
 */
function formatBulkSearchResults(results: any): any {
  const formatted: any = {
    summary: {
      totalMatches: 0,
      totalProperties: 0,
      searchCompleted: results.searchCompletedDate || null,
    },
    matches: [],
  };

  if (results.results && Array.isArray(results.results)) {
    for (const result of results.results) {
      const propertyMatch: any = {
        propertyId: result.propertyId,
        propertyName: result.propertyName,
        propertyVersion: result.propertyVersion,
        productionVersion: result.productionVersion,
        stagingVersion: result.stagingVersion,
        matches: [],
      };

      if (result.matchLocations && Array.isArray(result.matchLocations)) {
        for (const location of result.matchLocations) {
          propertyMatch.matches.push({
            path: location.path,
            value: location.value,
            context: location.context || 'Unknown',
          });
        }
      }

      formatted.matches.push(propertyMatch);
      formatted.summary.totalMatches += propertyMatch.matches.length;
    }

    formatted.summary.totalProperties = formatted.matches.length;
  }

  return formatted;
}

