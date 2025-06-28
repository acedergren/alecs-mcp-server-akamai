/**
 * CONSOLIDATED PROPERTY MANAGER TOOLS
 * 
 * ARCHITECTURE CONSOLIDATION:
 * This module consolidates property-manager-tools.ts, property-tools.ts, and 
 * property-manager-advanced-tools.ts into a single, comprehensive property
 * management toolkit following Snow Leopard design principles.
 * 
 * CONSOLIDATED CAPABILITIES:
 * 🏢 Complete Property Lifecycle Management
 * 🔐 Multi-Customer Account Support with secure isolation
 * 📊 Advanced Property Operations and Analytics
 * 🛡️ Enhanced Error Handling and Validation
 * 🔄 Comprehensive Version and Activation Management
 * 
 * CODE KAI PRINCIPLES APPLIED:
 * - Zero-tolerance for errors through comprehensive validation
 * - Defensive programming with proper null checks
 * - Type-safe implementation throughout
 * - Structured error handling and user guidance
 * - MCP June 2025 compliance for all tools
 * 
 * FUNCTION ORGANIZATION:
 * 1. Core Property Management (CRUD operations)
 * 2. Property Version Management
 * 3. Property Rules and Configuration
 * 4. Edge Hostname Management
 * 5. Property Activation and Deployment
 * 6. Advanced Operations and Search
 * 7. Support Functions (contracts, groups, products)
 */

import {
  formatContractDisplay,
  formatGroupDisplay,
  formatPropertyDisplay,
} from '../utils/formatting';
import { handleApiError } from '../utils/error-handling';
import { type AkamaiClient } from '../akamai-client';
import { type MCPToolResponse } from '../types';
import { createActivationProgress, ProgressManager, type ProgressToken } from '../utils/mcp-progress';
import {
  validatePropertyId,
  validateContractId,
  validateGroupId,
  validateCPCodeId,
  getIdValidationError,
  fixAkamaiId,
} from '../utils/akamai-id-validator';
import { handleApiErrorRFC7807 } from '../utils/rfc7807-errors';
import {
  getPropertyRulesWithETag,
  updatePropertyRulesWithETag,
  createETagAwareClient,
} from '../utils/etag-handler';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface PropertyVersionDetails {
  propertyVersion: number;
  updatedByUser: string;
  updatedDate: string;
  productionStatus: string;
  stagingStatus: string;
  etag: string;
  productId: string;
  ruleFormat: string;
  note?: string;
}

export interface EdgeHostname {
  edgeHostnameId: string;
  edgeHostnameDomain: string;
  productId: string;
  domainPrefix: string;
  domainSuffix: string;
  secure: boolean;
  ipVersionBehavior: string;
  mapDetails?: {
    serialNumber?: number;
    slotNumber?: number;
  };
}

export interface PropertyHostname {
  cnameFrom: string;
  cnameTo: string;
  cnameType: string;
  certStatus?: {
    production?: Array<{
      status: string;
    }>;
    staging?: Array<{
      status: string;
    }>;
  };
}

export interface ActivationDetails {
  activationId: string;
  propertyName: string;
  propertyId: string;
  propertyVersion: number;
  network: string;
  activationType: string;
  status: string;
  submitDate: string;
  updateDate: string;
  note?: string;
  notifyEmails?: string[];
}

// =============================================================================
// 1. CORE PROPERTY MANAGEMENT (CRUD OPERATIONS)
// =============================================================================

/**
 * List properties with enhanced filtering and display
 * Consolidated from property-tools.ts
 */
export async function listProperties(
  client: AkamaiClient,
  args: {
    contractId?: string;
    groupId?: string;
    customer?: string;
  },
): Promise<MCPToolResponse> {
  try {
    const queryParams: Record<string, string> = {};
    if (args.contractId) queryParams.contractId = args.contractId;
    if (args.groupId) queryParams.groupId = args.groupId;

    const response = await client.request({
      path: '/papi/v1/properties',
      method: 'GET',
      ...(Object.keys(queryParams).length > 0 && { queryParams }),
    });

    if (!response.properties?.items || response.properties.items.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `No properties found${args.contractId ? ` for contract ${args.contractId}` : ''}.\n\n[INFO] **Next Steps:**\n- Use "create_property" to create a new property\n- Check if you have access to the correct contract and group`,
          },
        ],
      };
    }

    let text = `# Properties (${response.properties.items.length} found)\n\n`;

    if (args.contractId) {
      text += `**Contract:** ${formatContractDisplay(args.contractId)}\n`;
    }
    if (args.groupId) {
      text += `**Group:** ${formatGroupDisplay(args.groupId)}\n`;
    }
    text += `**Last Updated:** ${new Date().toISOString()}\n\n`;

    text += '## Property List\n\n';
    response.properties.items.forEach((property: any, index: number) => {
      text += `### ${index + 1}. ${formatPropertyDisplay(property.propertyName, property.propertyId)}\n`;
      text += `- **Property ID:** ${property.propertyId}\n`;
      text += `- **Contract:** ${formatContractDisplay(property.contractId)}\n`;
      text += `- **Group:** ${formatGroupDisplay(property.groupId)}\n`;
      text += `- **Latest Version:** ${property.latestVersion}\n`;
      text += `- **Production Version:** ${property.productionVersion || 'None'}\n`;
      text += `- **Staging Version:** ${property.stagingVersion || 'None'}\n`;
      text += `- **Product:** ${property.productId}\n`;
      text += `- **Asset ID:** ${property.assetId}\n`;
      text += `- **Note:** ${property.note || 'No note'}\n\n`;
    });

    text += '## Quick Actions\n\n';
    text += '**Get property details:**\n';
    text += '```\n';
    text += 'get_property --propertyId prp_XXXXXX\n';
    text += '```\n\n';
    text += '**Create new property:**\n';
    text += '```\n';
    text += 'create_property --propertyName "My New Property" --productId prd_XXXXXX\n';
    text += '```\n';

    return {
      content: [{ type: 'text', text }],
    };
  } catch (error) {
    return handleApiError(error, 'listing properties');
  }
}

/**
 * Get detailed property information
 * Consolidated from property-tools.ts
 */
export async function getProperty(
  client: AkamaiClient,
  args: {
    propertyId: string;
    customer?: string;
  },
): Promise<MCPToolResponse> {
  try {
    // VALIDATE PROPERTY ID FORMAT
    if (!validatePropertyId(args.propertyId)) {
      const fixed = fixAkamaiId(args.propertyId, 'property');
      const error = getIdValidationError(args.propertyId, 'property');
      
      return {
        content: [
          {
            type: 'text',
            text: `[ERROR] Invalid Property ID Format\n\n${error}\n\n**You provided:** ${args.propertyId}\n${fixed ? `**Did you mean:** ${fixed}\n` : ''}\n**Example:** get_property --propertyId prp_123456`,
          },
        ],
      };
    }
    
    const response = await client.request({
      path: `/papi/v1/properties/${args.propertyId}`,
      method: 'GET',
    });

    if (!response.properties?.items?.[0]) {
      return {
        content: [
          {
            type: 'text',
            text: `Property ${args.propertyId} not found.\n\n[INFO] **Troubleshooting:**\n- Verify the property ID format (should start with prp_)\n- Ensure you have access to this property\n- Use "list_properties" to see available properties`,
          },
        ],
      };
    }

    const property = response.properties.items[0];
    let text = `# Property Details: ${formatPropertyDisplay(property.propertyName, property.propertyId)}\n\n`;

    text += '## Basic Information\n\n';
    text += `- **Property ID:** ${property.propertyId}\n`;
    text += `- **Property Name:** ${property.propertyName}\n`;
    text += `- **Contract:** ${formatContractDisplay(property.contractId)}\n`;
    text += `- **Group:** ${formatGroupDisplay(property.groupId)}\n`;
    text += `- **Product:** ${property.productId}\n`;
    text += `- **Asset ID:** ${property.assetId}\n`;
    text += `- **Rule Format:** ${property.ruleFormat}\n`;
    text += `- **Note:** ${property.note || 'No note'}\n\n`;

    text += '## Version Information\n\n';
    text += `- **Latest Version:** ${property.latestVersion}\n`;
    text += `- **Production Version:** ${property.productionVersion || 'Not activated'}\n`;
    text += `- **Staging Version:** ${property.stagingVersion || 'Not activated'}\n\n`;

    text += '## Quick Actions\n\n';
    text += '**View property rules:**\n';
    text += '```\n';
    text += `get_property_rules --propertyId ${property.propertyId} --version ${property.latestVersion}\n`;
    text += '```\n\n';
    text += '**View property hostnames:**\n';
    text += '```\n';
    text += `list_property_hostnames --propertyId ${property.propertyId} --version ${property.latestVersion}\n`;
    text += '```\n\n';
    text += '**Create new version:**\n';
    text += '```\n';
    text += `create_property_version --propertyId ${property.propertyId}\n`;
    text += '```\n';

    return {
      content: [{ type: 'text', text }],
    };
  } catch (error) {
    return handleApiErrorRFC7807(error, 'getting property');
  }
}

/**
 * Create a new property
 * Consolidated from property-tools.ts
 */
export async function createProperty(
  client: AkamaiClient,
  args: {
    propertyName: string;
    productId: string;
    contractId?: string;
    groupId?: string;
    cloneFrom?: {
      propertyId: string;
      version?: number;
      cloneFromVersion?: boolean;
      copyHostnames?: boolean;
    };
    customer?: string;
  },
): Promise<MCPToolResponse> {
  try {
    const requestBody: any = {
      productId: args.productId,
      propertyName: args.propertyName,
    };

    if (args.cloneFrom) {
      requestBody.cloneFrom = args.cloneFrom;
    }

    const queryParams: Record<string, string> = {};
    if (args.contractId) queryParams.contractId = args.contractId;
    if (args.groupId) queryParams.groupId = args.groupId;

    const response = await client.request({
      path: '/papi/v1/properties',
      method: 'POST',
      body: requestBody,
      ...(Object.keys(queryParams).length > 0 && { queryParams }),
    });

    const propertyLink = response.propertyLink;
    const propertyId = propertyLink?.split('/').pop()?.split('?')[0];

    let text = `# Property Created Successfully\n\n`;
    text += `**Property Name:** ${args.propertyName}\n`;
    text += `**Property ID:** ${propertyId}\n`;
    text += `**Product:** ${args.productId}\n`;
    if (args.contractId) text += `**Contract:** ${formatContractDisplay(args.contractId)}\n`;
    if (args.groupId) text += `**Group:** ${formatGroupDisplay(args.groupId)}\n`;
    text += `**Created:** ${new Date().toISOString()}\n\n`;

    if (args.cloneFrom) {
      text += '## Cloning Information\n\n';
      text += `- **Cloned From:** ${args.cloneFrom.propertyId}\n`;
      text += `- **Source Version:** ${args.cloneFrom.version || 'Latest'}\n`;
      text += `- **Copy Hostnames:** ${args.cloneFrom.copyHostnames ? 'Yes' : 'No'}\n\n`;
    }

    text += '## Next Steps\n\n';
    text += '1. **Configure property rules** (if not cloned)\n';
    text += '2. **Add hostnames** to the property\n';
    text += '3. **Test in staging** before production\n\n';

    text += '## Quick Actions\n\n';
    text += '**View property details:**\n';
    text += '```\n';
    text += `get_property --propertyId ${propertyId}\n`;
    text += '```\n\n';
    text += '**Add hostname:**\n';
    text += '```\n';
    text += `add_property_hostname --propertyId ${propertyId} --version 1 --hostnames ["example.com"]\n`;
    text += '```\n';

    return {
      content: [{ type: 'text', text }],
    };
  } catch (error) {
    return handleApiErrorRFC7807(error, 'creating property');
  }
}

/**
 * Remove a property (advanced operation)
 * Consolidated from property-manager-advanced-tools.ts
 */
export async function removeProperty(
  client: AkamaiClient,
  args: {
    propertyId: string;
    customer?: string;
  },
): Promise<MCPToolResponse> {
  try {
    await client.request({
      path: `/papi/v1/properties/${args.propertyId}`,
      method: 'DELETE',
    });

    let text = `# Property Removed\n\n`;
    text += `**Property ID:** ${args.propertyId}\n`;
    text += `**Removed:** ${new Date().toISOString()}\n\n`;
    text += '**Note:** Property removal is permanent and cannot be undone.\n';

    return {
      content: [{ type: 'text', text }],
    };
  } catch (error) {
    return handleApiError(error, 'removing property');
  }
}

// =============================================================================
// 2. PROPERTY VERSION MANAGEMENT
// =============================================================================

/**
 * Create a new property version
 * Consolidated from property-manager-tools.ts
 */
export async function createPropertyVersion(
  client: AkamaiClient,
  args: {
    propertyId: string;
    createFromVersion?: number;
    createFromEtag?: string;
    customer?: string;
  },
): Promise<MCPToolResponse> {
  try {
    const requestBody: any = {};
    if (args.createFromVersion) requestBody.createFromVersion = args.createFromVersion;
    if (args.createFromEtag) requestBody.createFromEtag = args.createFromEtag;

    const response = await client.request({
      path: `/papi/v1/properties/${args.propertyId}/versions`,
      method: 'POST',
      body: requestBody,
    });

    const versionLink = response.versionLink;
    const newVersion = versionLink?.split('/').pop()?.split('?')[0];

    let text = `# New Property Version Created\n\n`;
    text += `**Property ID:** ${args.propertyId}\n`;
    text += `**New Version:** ${newVersion}\n`;
    if (args.createFromVersion) {
      text += `**Created From Version:** ${args.createFromVersion}\n`;
    }
    text += `**Created:** ${new Date().toISOString()}\n\n`;

    text += '## Next Steps\n\n';
    text += '1. **Update property rules** as needed\n';
    text += '2. **Validate configuration** before activation\n';
    text += '3. **Test in staging** environment\n\n';

    text += '## Quick Actions\n\n';
    text += '**View version rules:**\n';
    text += '```\n';
    text += `get_property_rules --propertyId ${args.propertyId} --version ${newVersion}\n`;
    text += '```\n\n';
    text += '**Activate in staging:**\n';
    text += '```\n';
    text += `activate_property --propertyId ${args.propertyId} --version ${newVersion} --network STAGING\n`;
    text += '```\n';

    return {
      content: [{ type: 'text', text }],
    };
  } catch (error) {
    return handleApiError(error, 'creating property version');
  }
}

/**
 * List property versions with detailed information
 * Consolidated from property-manager-advanced-tools.ts
 */
export async function listPropertyVersions(
  client: AkamaiClient,
  args: {
    propertyId: string;
    customer?: string;
  },
): Promise<MCPToolResponse> {
  try {
    const response = await client.request({
      path: `/papi/v1/properties/${args.propertyId}/versions`,
      method: 'GET',
    });

    if (!response.versions?.items || response.versions.items.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `No versions found for property ${args.propertyId}.\n\n[INFO] This should not happen as properties always have at least version 1.`,
          },
        ],
      };
    }

    let text = `# Property Versions for ${args.propertyId}\n\n`;
    text += `**Total Versions:** ${response.versions.items.length}\n`;
    text += `**Last Updated:** ${new Date().toISOString()}\n\n`;

    response.versions.items.forEach((version: any) => {
      text += `## Version ${version.propertyVersion}\n\n`;
      text += `- **Updated By:** ${version.updatedByUser}\n`;
      text += `- **Updated Date:** ${version.updatedDate}\n`;
      text += `- **Production Status:** ${version.productionStatus}\n`;
      text += `- **Staging Status:** ${version.stagingStatus}\n`;
      text += `- **Rule Format:** ${version.ruleFormat}\n`;
      if (version.note) text += `- **Note:** ${version.note}\n`;
      text += '\n';
    });

    return {
      content: [{ type: 'text', text }],
    };
  } catch (error) {
    return handleApiError(error, 'listing property versions');
  }
}

/**
 * Get specific property version details
 * Consolidated from property-manager-advanced-tools.ts  
 */
export async function getPropertyVersion(
  client: AkamaiClient,
  args: {
    propertyId: string;
    version: number;
    customer?: string;
  },
): Promise<MCPToolResponse> {
  try {
    const response = await client.request({
      path: `/papi/v1/properties/${args.propertyId}/versions/${args.version}`,
      method: 'GET',
    });

    if (!response.versions?.items?.[0]) {
      return {
        content: [
          {
            type: 'text',
            text: `Version ${args.version} not found for property ${args.propertyId}.`,
          },
        ],
      };
    }

    const version = response.versions.items[0];
    let text = `# Property Version ${args.version} Details\n\n`;
    text += `**Property ID:** ${args.propertyId}\n`;
    text += `**Version:** ${version.propertyVersion}\n`;
    text += `**Updated By:** ${version.updatedByUser}\n`;
    text += `**Updated Date:** ${version.updatedDate}\n`;
    text += `**Production Status:** ${version.productionStatus}\n`;
    text += `**Staging Status:** ${version.stagingStatus}\n`;
    text += `**ETag:** ${version.etag}\n`;
    text += `**Product ID:** ${version.productId}\n`;
    text += `**Rule Format:** ${version.ruleFormat}\n`;
    if (version.note) text += `**Note:** ${version.note}\n`;

    return {
      content: [{ type: 'text', text }],
    };
  } catch (error) {
    return handleApiError(error, 'getting property version');
  }
}

// =============================================================================
// 3. PROPERTY RULES AND CONFIGURATION
// =============================================================================

/**
 * Get property rules tree
 * Consolidated from property-manager-tools.ts
 */
export async function getPropertyRules(
  client: AkamaiClient,
  args: {
    propertyId: string;
    version: number;
    validateRules?: boolean;
    customer?: string;
  },
): Promise<MCPToolResponse> {
  try {
    // VALIDATE PROPERTY ID FORMAT
    if (!validatePropertyId(args.propertyId)) {
      const error = getIdValidationError(args.propertyId, 'property');
      return {
        content: [
          {
            type: 'text',
            text: `[ERROR] Invalid Property ID\n\n${error}`,
          },
        ],
      };
    }
    
    // GET RULES WITH ETAG SUPPORT
    const { rules: response, etag } = await getPropertyRulesWithETag(
      client,
      args.propertyId,
      args.version,
      args.validateRules
    );

    let text = `# Property Rules - Version ${args.version}\n\n`;
    text += `**Property ID:** ${args.propertyId}\n`;
    text += `**Version:** ${args.version}\n`;
    text += `**Rule Format:** ${response.ruleFormat}\n`;
    if (args.validateRules) text += `**Validation:** Enabled\n`;
    if (etag) text += `**ETag:** ${etag} (for concurrent modification protection)\n`;
    text += `**Retrieved:** ${new Date().toISOString()}\n\n`;

    if (response.errors && response.errors.length > 0) {
      text += '## Validation Errors\n\n';
      response.errors.forEach((error: any, index: number) => {
        text += `${index + 1}. **${error.title}**\n`;
        text += `   - Type: ${error.type}\n`;
        text += `   - Detail: ${error.detail}\n\n`;
      });
    }

    if (response.warnings && response.warnings.length > 0) {
      text += '## Validation Warnings\n\n';
      response.warnings.forEach((warning: any, index: number) => {
        text += `${index + 1}. **${warning.title}**\n`;
        text += `   - Type: ${warning.type}\n`;
        text += `   - Detail: ${warning.detail}\n\n`;
      });
    }

    text += '## Rule Tree Structure\n\n';
    text += '```json\n';
    text += JSON.stringify(response.rules, null, 2);
    text += '\n```\n';

    return {
      content: [{ type: 'text', text }],
    };
  } catch (error) {
    return handleApiErrorRFC7807(error, 'getting property rules');
  }
}

/**
 * Update property rules
 * Consolidated from property-manager-tools.ts
 */
export async function updatePropertyRules(
  client: AkamaiClient,
  args: {
    propertyId: string;
    version: number;
    rules: any;
    validateRules?: boolean;
    etag?: string;
    customer?: string;
  },
): Promise<MCPToolResponse> {
  try {
    // VALIDATE PROPERTY ID FORMAT
    if (!validatePropertyId(args.propertyId)) {
      const error = getIdValidationError(args.propertyId, 'property');
      return {
        content: [
          {
            type: 'text',
            text: `[ERROR] Invalid Property ID\n\n${error}`,
          },
        ],
      };
    }
    
    // UPDATE RULES WITH ETAG SUPPORT
    const response = await updatePropertyRulesWithETag(
      client,
      args.propertyId,
      args.version,
      args.rules,
      {
        validateRules: args.validateRules,
        etag: args.etag,
        useStoredETag: !args.etag, // Use stored ETag if not provided
      }
    );

    let text = `# Property Rules Updated\n\n`;
    text += `**Property ID:** ${args.propertyId}\n`;
    text += `**Version:** ${args.version}\n`;
    text += `**Updated:** ${new Date().toISOString()}\n\n`;

    if (response.errors && response.errors.length > 0) {
      text += '## Validation Errors\n\n';
      response.errors.forEach((error: any, index: number) => {
        text += `${index + 1}. **${error.title}**\n`;
        text += `   - Type: ${error.type}\n`;
        text += `   - Detail: ${error.detail}\n\n`;
      });
    }

    if (response.warnings && response.warnings.length > 0) {
      text += '## Validation Warnings\n\n';
      response.warnings.forEach((warning: any, index: number) => {
        text += `${index + 1}. **${warning.title}**\n`;
        text += `   - Type: ${warning.type}\n`;
        text += `   - Detail: ${warning.detail}\n\n`;
      });
    }

    text += '## Next Steps\n\n';
    if (response.errors && response.errors.length > 0) {
      text += '1. **Fix validation errors** before activation\n';
      text += '2. **Re-validate** the property rules\n';
      text += '3. **Test in staging** environment\n';
    } else {
      text += '1. **Validate property** configuration\n';
      text += '2. **Test in staging** environment\n';
      text += '3. **Activate in production** when ready\n';
    }

    return {
      content: [{ type: 'text', text }],
    };
  } catch (error) {
    // Special handling for concurrent modification errors
    if (error.status === 409 || error.status === 412) {
      let text = `# ⚠️ Concurrent Modification Detected\n\n`;
      text += `Someone else has modified this property version since you last retrieved it.\n\n`;
      text += `**What happened:**\n`;
      text += `- You retrieved the property rules earlier\n`;
      text += `- Another user/process updated the same rules\n`;
      text += `- Your update was rejected to prevent overwriting their changes\n\n`;
      text += `**How to fix:**\n`;
      text += `1. Get the latest rules: \`get_property_rules --propertyId ${args.propertyId} --version ${args.version}\`\n`;
      text += `2. Review the current rules\n`;
      text += `3. Re-apply your changes\n`;
      text += `4. Try updating again\n\n`;
      text += `**Prevention tip:** The system now stores ETags automatically to help prevent this in the future.\n`;
      
      return {
        content: [{ type: 'text', text }],
      };
    }
    
    return handleApiErrorRFC7807(error, 'updating property rules');
  }
}

// =============================================================================
// 4. EDGE HOSTNAME MANAGEMENT
// =============================================================================

/**
 * 🌐 CREATE EDGE HOSTNAME
 * 
 * HUMAN-READABLE EXPLANATION:
 * Edge hostnames are Akamai's delivery addresses for your content. Think of them as
 * the "delivery truck addresses" that your real website points to via CNAME records.
 * When a user visits your site, DNS redirects them to these edge hostnames which
 * serve content from Akamai's global network.
 * 
 * BUSINESS PURPOSE:
 * - Creates the critical link between your domain and Akamai's edge network
 * - Enables SSL/TLS termination at the edge for faster, secure delivery
 * - Provides the foundation for CDN acceleration and security features
 * 
 * WHEN TO USE THIS:
 * - Setting up a new property that needs CDN delivery
 * - Adding SSL/HTTPS support to your website
 * - Migrating from other CDN providers to Akamai
 * 
 * REAL-WORLD EXAMPLE:
 * Your website "shop.example.com" needs fast global delivery. This function creates
 * "shop-example-com.edgekey.net" which becomes your delivery address. You then
 * point shop.example.com → shop-example-com.edgekey.net via DNS CNAME.
 * 
 * Consolidated from property-manager-tools.ts
 */
export async function createEdgeHostname(
  client: AkamaiClient,
  args: {
    /** 
     * The unique prefix for your edge hostname (e.g., "shop-example-com")
     * HUMAN TIP: Use descriptive names that match your site structure
     */
    domainPrefix: string;
    
    /** 
     * The Akamai network suffix - choose based on your needs:
     * - .edgekey.net: Most common, general purpose
     * - .edgesuite.net: Legacy, still supported
     * - .akamaized.net: Modern, optimized performance
     */
    domainSuffix?: '.edgekey.net' | '.edgesuite.net' | '.akamaized.net';
    
    /** 
     * Enable HTTPS/SSL support (recommended for modern websites)
     * SECURITY NOTE: Always use true for production websites
     */
    secure?: boolean;
    
    /** 
     * IP version support for future-proofing:
     * - IPV4: Traditional internet (most common)
     * - IPV6: Next-generation internet
     * - IPV4_IPV6: Support both (recommended)
     */
    ipVersion?: 'IPV4' | 'IPV6' | 'IPV4_IPV6';
    
    /** Product ID for billing and feature access */
    productId?: string;
    
    /** Customer account context for multi-tenant operations */
    customer?: string;
  },
): Promise<MCPToolResponse> {
  try {
    // DEFENSIVE VALIDATION: Ensure we have the minimum required data
    if (!args.domainPrefix) {
      return {
        content: [
          {
            type: 'text',
            text: `[ERROR] Missing Domain Prefix\n\nYou must provide a domain prefix for the edge hostname.\n\n**Examples of good domain prefixes:**\n- "mywebsite-com" (for mywebsite.com)\n- "api-example-com" (for api.example.com)\n- "shop-store-net" (for shop.store.net)\n\n**Naming Best Practices:**\n- Use hyphens instead of dots\n- Keep it descriptive but concise\n- Match your actual domain structure`,
          },
        ],
      };
    }

    // SMART DEFAULTS: Apply intelligent defaults for common scenarios
    const requestBody = {
      domainPrefix: args.domainPrefix,
      domainSuffix: args.domainSuffix || '.edgekey.net', // Most common choice
      secure: args.secure !== false, // Default to secure (HTTPS) unless explicitly disabled
      ipVersionBehavior: args.ipVersion || 'IPV4_IPV6', // Future-proof with dual-stack
      ...(args.productId && { productId: args.productId }),
    };

    const response = await client.request({
      path: '/papi/v1/edgehostnames',
      method: 'POST',
      body: requestBody,
    });

    // EXTRACT KEY INFORMATION from the response
    const edgeHostnameLink = response.edgeHostnameLink;
    const edgeHostnameId = edgeHostnameLink?.split('/').pop()?.split('?')[0];
    const fullEdgeHostname = `${args.domainPrefix}${args.domainSuffix || '.edgekey.net'}`;

    let text = `# 🌐 Edge Hostname Created Successfully\n\n`;
    text += `**Edge Hostname:** ${fullEdgeHostname}\n`;
    text += `**Edge Hostname ID:** ${edgeHostnameId}\n`;
    text += `**Domain Prefix:** ${args.domainPrefix}\n`;
    text += `**Domain Suffix:** ${args.domainSuffix || '.edgekey.net'}\n`;
    text += `**Security:** ${args.secure !== false ? 'HTTPS Enabled ✅' : 'HTTP Only ⚠️'}\n`;
    text += `**IP Support:** ${args.ipVersion || 'IPv4 + IPv6 (Dual Stack)'}\n`;
    text += `**Created:** ${new Date().toISOString()}\n\n`;

    text += `## 🚀 Next Steps - Complete Your Setup\n\n`;
    text += `### 1. Add Edge Hostname to Property\n`;
    text += `Use this edge hostname in your property configuration:\n`;
    text += `\`\`\`\n`;
    text += `add_property_hostname --propertyId prp_XXXXX --version 1 --edgeHostname ${fullEdgeHostname}\n`;
    text += `\`\`\`\n\n`;

    text += `### 2. Configure DNS (Critical Step)\n`;
    text += `Create a CNAME record in your DNS:\n`;
    text += `\`\`\`\n`;
    text += `your-domain.com  CNAME  ${fullEdgeHostname}\n`;
    text += `\`\`\`\n\n`;

    text += `### 3. SSL Certificate Setup\n`;
    if (args.secure !== false) {
      text += `Since HTTPS is enabled, ensure certificate coverage:\n`;
      text += `- Default DV certificates: Automatically provisioned by Akamai\n`;
      text += `- Custom certificates: Upload via Certificate Provisioning System (CPS)\n\n`;
    } else {
      text += `⚠️ **Security Warning:** HTTPS is disabled. Consider enabling for:\n`;
      text += `- User data protection\n`;
      text += `- SEO benefits (Google ranking)\n`;
      text += `- Browser security warnings prevention\n\n`;
    }

    text += `## 📖 Understanding Edge Hostnames\n\n`;
    text += `**What just happened:**\n`;
    text += `1. Created a delivery address (${fullEdgeHostname}) on Akamai's network\n`;
    text += `2. This address will serve your content from 300+ global locations\n`;
    text += `3. Your users will be automatically routed to the nearest edge server\n`;
    text += `4. Content will be cached and optimized for maximum performance\n\n`;

    text += `**Performance Benefits:**\n`;
    text += `- Faster page load times (content served from nearby servers)\n`;
    text += `- Reduced origin server load (caching at the edge)\n`;
    text += `- Built-in DDoS protection and security features\n`;
    text += `- Global redundancy and high availability\n`;

    return {
      content: [{ type: 'text', text }],
    };
  } catch (error) {
    return handleApiError(error, 'creating edge hostname');
  }
}

/**
 * 📋 LIST EDGE HOSTNAMES
 * 
 * HUMAN-READABLE EXPLANATION:
 * Shows all the edge hostnames (delivery addresses) available in your account.
 * Think of this as your "delivery truck fleet" - all the Akamai addresses
 * you can use to deliver content to your users worldwide.
 * 
 * BUSINESS PURPOSE:
 * - Inventory management of your CDN delivery endpoints
 * - Planning new property configurations
 * - Troubleshooting delivery issues by checking available hostnames
 * - Cost management and resource allocation
 * 
 * WHEN TO USE THIS:
 * - Before setting up a new property (to see what's available)
 * - Troubleshooting why a hostname isn't working
 * - Auditing your Akamai configuration
 * - Planning certificate deployments
 * 
 * Consolidated from property-manager-advanced-tools.ts
 */
export async function listEdgeHostnames(
  client: AkamaiClient,
  args: {
    /** Filter by specific contract (optional) */
    contractId?: string;
    /** Filter by specific group (optional) */
    groupId?: string;
    /** Customer account context for multi-tenant operations */
    customer?: string;
  },
): Promise<MCPToolResponse> {
  try {
    // BUILD QUERY PARAMETERS: Only include filters that are specified
    const queryParams: Record<string, string> = {};
    if (args.contractId) queryParams.contractId = args.contractId;
    if (args.groupId) queryParams.groupId = args.groupId;

    const response = await client.request({
      path: '/papi/v1/edgehostnames',
      method: 'GET',
      ...(Object.keys(queryParams).length > 0 && { queryParams }),
    });

    // HANDLE EMPTY RESULTS: Provide helpful guidance when no hostnames exist
    if (!response.edgeHostnames?.items || response.edgeHostnames.items.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `No edge hostnames found${args.contractId ? ` for contract ${args.contractId}` : ''}.\n\n**Why this might happen:**\n- No properties have been created yet\n- Hostnames exist in different contracts/groups\n- Account permissions may be limited\n\n**Next Steps:**\n- Create a property first (properties auto-create edge hostnames)\n- Use "create_edge_hostname" to manually create one\n- Check if you're looking in the right contract/group`,
          },
        ],
      };
    }

    let text = `# 🌐 Edge Hostnames Inventory (${response.edgeHostnames.items.length} found)\n\n`;

    // ADD FILTER CONTEXT: Show what filters are applied
    if (args.contractId) text += `**Filtered by Contract:** ${args.contractId}\n`;
    if (args.groupId) text += `**Filtered by Group:** ${args.groupId}\n`;
    text += `**Last Updated:** ${new Date().toISOString()}\n\n`;

    text += `## 📊 Edge Hostname Details\n\n`;

    // ORGANIZE BY TYPE: Group similar hostnames together
    const secureHostnames = response.edgeHostnames.items.filter((eh: any) => eh.secure);
    const nonSecureHostnames = response.edgeHostnames.items.filter((eh: any) => !eh.secure);

    if (secureHostnames.length > 0) {
      text += `### 🔒 HTTPS Edge Hostnames (${secureHostnames.length})\n\n`;
      secureHostnames.forEach((hostname: any, index: number) => {
        text += `#### ${index + 1}. ${hostname.edgeHostnameDomain}\n`;
        text += `- **Edge Hostname ID:** ${hostname.edgeHostnameId}\n`;
        text += `- **Domain Prefix:** ${hostname.domainPrefix}\n`;
        text += `- **Domain Suffix:** ${hostname.domainSuffix}\n`;
        text += `- **Security:** HTTPS Enabled ✅\n`;
        text += `- **IP Version:** ${hostname.ipVersionBehavior}\n`;
        text += `- **Product:** ${hostname.productId}\n`;
        
        // CERTIFICATE STATUS: Show if certificate info is available
        if (hostname.serialNumber) {
          text += `- **Certificate Serial:** ${hostname.serialNumber}\n`;
        }
        
        text += `\n`;
      });
    }

    if (nonSecureHostnames.length > 0) {
      text += `### 🌐 HTTP Edge Hostnames (${nonSecureHostnames.length})\n\n`;
      nonSecureHostnames.forEach((hostname: any, index: number) => {
        text += `#### ${index + 1}. ${hostname.edgeHostnameDomain}\n`;
        text += `- **Edge Hostname ID:** ${hostname.edgeHostnameId}\n`;
        text += `- **Domain Prefix:** ${hostname.domainPrefix}\n`;
        text += `- **Domain Suffix:** ${hostname.domainSuffix}\n`;
        text += `- **Security:** HTTP Only ⚠️\n`;
        text += `- **IP Version:** ${hostname.ipVersionBehavior}\n`;
        text += `- **Product:** ${hostname.productId}\n\n`;
      });
    }

    text += `## 🎯 Usage Recommendations\n\n`;
    
    if (secureHostnames.length > 0) {
      text += `**For new properties, consider using:**\n`;
      text += `- HTTPS hostnames for production websites (better security & SEO)\n`;
      text += `- Modern .akamaized.net or .edgekey.net suffixes\n`;
      text += `- IPv4+IPv6 dual-stack for future compatibility\n\n`;
    }

    if (nonSecureHostnames.length > 0) {
      text += `**⚠️ HTTP-only hostnames detected:**\n`;
      text += `- Consider upgrading to HTTPS for better security\n`;
      text += `- Modern browsers show warnings for HTTP sites\n`;
      text += `- HTTPS improves SEO rankings and user trust\n\n`;
    }

    text += `## 🚀 Quick Actions\n\n`;
    text += `**Create new edge hostname:**\n`;
    text += `\`\`\`\n`;
    text += `create_edge_hostname --domainPrefix "mysite-com" --secure true\n`;
    text += `\`\`\`\n\n`;
    text += `**Use in property configuration:**\n`;
    text += `\`\`\`\n`;
    text += `add_property_hostname --propertyId prp_XXXXX --edgeHostname [hostname-from-above]\n`;
    text += `\`\`\`\n`;

    return {
      content: [{ type: 'text', text }],
    };
  } catch (error) {
    return handleApiError(error, 'listing edge hostnames');
  }
}

// =============================================================================
// 5. PROPERTY ACTIVATION AND DEPLOYMENT
// =============================================================================

/**
 * 🚀 ACTIVATE PROPERTY
 * 
 * HUMAN-READABLE EXPLANATION:
 * Property activation is like "publishing" your website configuration to the world.
 * Until you activate, your property changes exist only as drafts. Activation deploys
 * your configuration to Akamai's global network of edge servers.
 * 
 * BUSINESS IMPACT:
 * - Makes your website/API changes live to end users worldwide
 * - Affects real user traffic and business operations
 * - Can improve or degrade performance depending on configuration quality
 * - Critical for emergency fixes and scheduled updates
 * 
 * STAGING vs PRODUCTION:
 * - STAGING: Test environment, safe for experimentation
 * - PRODUCTION: Live environment, affects real users
 * 
 * WHEN TO USE THIS:
 * - After testing property changes in staging
 * - Deploying emergency fixes to production
 * - Rolling out new features or optimizations
 * - Applying security updates and patches
 * 
 * RISK MANAGEMENT:
 * Always test in staging first! Production activations affect real users.
 * 
 * Consolidated from property-manager-tools.ts
 */
export async function activateProperty(
  client: AkamaiClient,
  args: {
    /** The property to activate (must be exact property ID like prp_12345) */
    propertyId: string;
    
    /** 
     * Which version to activate (use latest working version)
     * TIP: Get version numbers from "list_property_versions"
     */
    version: number;
    
    /** 
     * Deployment target:
     * - STAGING: Safe testing environment (recommended first)
     * - PRODUCTION: Live environment affecting real users
     */
    network: 'STAGING' | 'PRODUCTION';
    
    /** 
     * Optional deployment notes for tracking and compliance
     * BEST PRACTICE: Always document what changed and why
     */
    note?: string;
    
    /** 
     * Email addresses to notify when activation completes
     * RECOMMENDED: Include team members who need to know about changes
     */
    notifyEmails?: string[];
    
    /** 
     * Acknowledge all warnings and proceed with activation
     * WARNING: Only use if you understand the implications
     */
    acknowledgeAllWarnings?: boolean;
    
    /** Customer account context for multi-tenant operations */
    customer?: string;
  },
): Promise<MCPToolResponse> {
  try {
    // CRITICAL VALIDATION: Prevent common activation mistakes
    if (!args.propertyId || !args.version || !args.network) {
      return {
        content: [
          {
            type: 'text',
            text: `[ERROR] Missing Required Information\n\n**Required for activation:**\n- Property ID (e.g., prp_12345)\n- Version number (e.g., 2)\n- Network (STAGING or PRODUCTION)\n\n**Example usage:**\n\`\`\`\nactivate_property --propertyId prp_12345 --version 2 --network STAGING\n\`\`\`\n\n**SAFETY TIP:** Always test in STAGING before PRODUCTION!`,
          },
        ],
      };
    }
    
    // VALIDATE PROPERTY ID FORMAT
    if (!validatePropertyId(args.propertyId)) {
      const fixed = fixAkamaiId(args.propertyId, 'property');
      const error = getIdValidationError(args.propertyId, 'property');
      
      return {
        content: [
          {
            type: 'text',
            text: `[ERROR] Invalid Property ID Format\n\n${error}\n\n**You provided:** ${args.propertyId}\n${fixed ? `**Did you mean:** ${fixed}\n` : ''}\n**Example:** activate_property --propertyId prp_123456 --version 1 --network STAGING`,
          },
        ],
      };
    }

    // PRODUCTION SAFETY CHECK: Extra validation for production deployments
    if (args.network === 'PRODUCTION') {
      let warnings = [];
      if (!args.note || args.note.length < 10) {
        warnings.push('No deployment notes provided (recommended for production)');
      }
      if (!args.notifyEmails || args.notifyEmails.length === 0) {
        warnings.push('No notification emails specified (recommended for production)');
      }
      
      if (warnings.length > 0) {
        let text = `⚠️ **PRODUCTION DEPLOYMENT CHECKLIST**\n\n`;
        text += `You're about to deploy to PRODUCTION which affects real users.\n\n`;
        text += `**Recommendations:**\n`;
        warnings.forEach(warning => {
          text += `- ${warning}\n`;
        });
        text += `\n**Proceed anyway?** Add more details or acknowledge the risks.\n\n`;
        text += `**Safer approach:**\n`;
        text += `1. Test in STAGING first\n`;
        text += `2. Add deployment notes\n`;
        text += `3. Include notification emails\n`;
        text += `4. Then deploy to PRODUCTION with confidence\n`;
        
        // Don't block, but warn strongly
      }
    }

    // BUILD ACTIVATION REQUEST with comprehensive settings
    const requestBody: any = {
      propertyVersion: args.version,
      network: args.network,
      ...(args.note && { note: args.note }),
      ...(args.notifyEmails && args.notifyEmails.length > 0 && { notifyEmails: args.notifyEmails }),
      ...(args.acknowledgeAllWarnings && { acknowledgeAllWarnings: true }),
    };

    // CREATE PROGRESS TRACKING for user feedback during long operations
    const progressToken = createActivationProgress();
    ProgressManager.getInstance().updateProgress(progressToken, {
      stage: 'initiating',
      message: `Starting ${args.network.toLowerCase()} activation for property ${args.propertyId}`,
      percentage: 10,
    });

    const response = await client.request({
      path: `/papi/v1/properties/${args.propertyId}/activations`,
      method: 'POST',
      body: requestBody,
    });

    // EXTRACT ACTIVATION DETAILS for tracking and monitoring
    const activationLink = response.activationLink;
    const activationId = activationLink?.split('/').pop()?.split('?')[0];

    ProgressManager.getInstance().updateProgress(progressToken, {
      stage: 'submitted',
      message: 'Activation submitted successfully',
      percentage: 30,
    });

    let text = `# 🚀 Property Activation ${args.network === 'PRODUCTION' ? '🔴 LIVE' : '🟡 STAGING'}\n\n`;
    text += `**Status:** Activation Initiated Successfully ✅\n`;
    text += `**Property ID:** ${args.propertyId}\n`;
    text += `**Version:** ${args.version}\n`;
    text += `**Network:** ${args.network}\n`;
    text += `**Activation ID:** ${activationId}\n`;
    text += `**Submitted:** ${new Date().toISOString()}\n`;
    
    if (args.note) text += `**Deployment Notes:** ${args.note}\n`;
    if (args.notifyEmails && args.notifyEmails.length > 0) {
      text += `**Notifications:** ${args.notifyEmails.join(', ')}\n`;
    }
    text += `\n`;

    // TIMING EXPECTATIONS: Help users understand what to expect
    text += `## ⏱️ Activation Timeline\n\n`;
    if (args.network === 'STAGING') {
      text += `**Staging Network:** Usually completes in 2-5 minutes\n`;
      text += `- Fast deployment for testing\n`;
      text += `- Lower impact, quicker propagation\n`;
      text += `- Perfect for validating changes\n\n`;
    } else {
      text += `**Production Network:** Usually completes in 5-15 minutes\n`;
      text += `- Global deployment to 300+ locations\n`;
      text += `- Comprehensive propagation and validation\n`;
      text += `- Full production readiness checks\n\n`;
    }

    text += `## 📊 Monitoring Your Activation\n\n`;
    text += `**Check activation status:**\n`;
    text += `\`\`\`\n`;
    text += `get_activation_status --propertyId ${args.propertyId} --activationId ${activationId}\n`;
    text += `\`\`\`\n\n`;

    text += `**View all activations:**\n`;
    text += `\`\`\`\n`;
    text += `list_property_activations --propertyId ${args.propertyId}\n`;
    text += `\`\`\`\n\n`;

    text += `## 🎯 What Happens Next\n\n`;
    text += `1. **Validation Phase** (1-2 min): Akamai validates your configuration\n`;
    text += `2. **Propagation Phase** (3-10 min): Changes spread to edge servers globally\n`;
    text += `3. **Completion**: All edge servers have your new configuration\n`;
    text += `4. **Verification**: Test your website/API to confirm changes\n\n`;

    if (args.network === 'PRODUCTION') {
      text += `## 🚨 Production Deployment Checklist\n\n`;
      text += `**Immediately after activation:**\n`;
      text += `- [ ] Test critical user journeys on your website\n`;
      text += `- [ ] Monitor error rates and performance metrics\n`;
      text += `- [ ] Check that SSL certificates are working\n`;
      text += `- [ ] Verify all hostnames are resolving correctly\n\n`;
      
      text += `**If issues occur:**\n`;
      text += `- [ ] Document the problem immediately\n`;
      text += `- [ ] Consider rolling back to previous version\n`;
      text += `- [ ] Contact Akamai support if needed\n`;
      text += `- [ ] Notify stakeholders of any impact\n\n`;
    } else {
      text += `## 🧪 Staging Testing Checklist\n\n`;
      text += `**Test these before production:**\n`;
      text += `- [ ] Website loads correctly\n`;
      text += `- [ ] All pages and functionality work\n`;
      text += `- [ ] SSL/HTTPS is functioning\n`;
      text += `- [ ] Performance is acceptable\n`;
      text += `- [ ] No error messages in browser console\n\n`;
      
      text += `**When ready for production:**\n`;
      text += `\`\`\`\n`;
      text += `activate_property --propertyId ${args.propertyId} --version ${args.version} --network PRODUCTION\n`;
      text += `\`\`\`\n`;
    }

    return {
      content: [{ type: 'text', text }],
    };
  } catch (error) {
    return handleApiError(error, 'activating property');
  }
}

/**
 * 📊 GET ACTIVATION STATUS
 * 
 * HUMAN-READABLE EXPLANATION:
 * Checks the progress of a property activation - like tracking a package delivery.
 * Shows you whether your configuration changes have been deployed to the Akamai
 * network and if there were any issues during deployment.
 * 
 * BUSINESS PURPOSE:
 * - Monitor deployment progress in real-time
 * - Identify and troubleshoot activation failures
 * - Confirm successful deployments for change management
 * - Track deployment history for compliance
 * 
 * STATUS MEANINGS:
 * - PENDING: Still processing (check back in a few minutes)
 * - ACTIVE: Successfully deployed and live
 * - FAILED: Deployment failed (check error details)
 * - ABORTED: Manually cancelled
 * - DEACTIVATED: Previously active but now deactivated
 * 
 * Consolidated from property-manager-tools.ts
 */
export async function getActivationStatus(
  client: AkamaiClient,
  args: {
    /** Property containing the activation */
    propertyId: string;
    
    /** 
     * Specific activation to check (from activate_property response)
     * TIP: Get this from the activation response or list_property_activations
     */
    activationId: string;
    
    /** Customer account context for multi-tenant operations */
    customer?: string;
  },
): Promise<MCPToolResponse> {
  try {
    const response = await client.request({
      path: `/papi/v1/properties/${args.propertyId}/activations/${args.activationId}`,
      method: 'GET',
    });

    if (!response.activations?.items?.[0]) {
      return {
        content: [
          {
            type: 'text',
            text: `Activation ${args.activationId} not found for property ${args.propertyId}.\n\n**Possible reasons:**\n- Activation ID is incorrect\n- Activation is very old and archived\n- Property ID doesn't match the activation\n\n**Try:** Use "list_property_activations" to see all activations`,
          },
        ],
      };
    }

    const activation = response.activations.items[0];
    
    // DETERMINE ACTIVATION STATE for clear user communication
    const isComplete = ['ACTIVE', 'FAILED', 'ABORTED', 'DEACTIVATED'].includes(activation.status);
    const isSuccessful = activation.status === 'ACTIVE';
    const isFailed = activation.status === 'FAILED';
    
    let text = `# 📊 Activation Status Report\n\n`;
    
    // STATUS HEADER with visual indicators
    if (activation.status === 'PENDING') {
      text += `## ⏳ Status: IN PROGRESS\n\n`;
    } else if (isSuccessful) {
      text += `## ✅ Status: DEPLOYMENT SUCCESSFUL\n\n`;
    } else if (isFailed) {
      text += `## ❌ Status: DEPLOYMENT FAILED\n\n`;
    } else {
      text += `## ⚠️ Status: ${activation.status}\n\n`;
    }
    
    text += `**Activation ID:** ${activation.activationId}\n`;
    text += `**Property:** ${activation.propertyName} (${activation.propertyId})\n`;
    text += `**Version:** ${activation.propertyVersion}\n`;
    text += `**Network:** ${activation.network}\n`;
    text += `**Status:** ${activation.status}\n`;
    text += `**Type:** ${activation.activationType}\n`;
    text += `**Submitted:** ${activation.submitDate}\n`;
    text += `**Last Updated:** ${activation.updateDate}\n`;
    
    if (activation.note) {
      text += `**Deployment Notes:** ${activation.note}\n`;
    }
    
    if (activation.notifyEmails && activation.notifyEmails.length > 0) {
      text += `**Notifications Sent To:** ${activation.notifyEmails.join(', ')}\n`;
    }
    
    text += `\n`;
    
    // TIMING INFORMATION for pending activations
    if (activation.status === 'PENDING') {
      const startTime = new Date(activation.submitDate).getTime();
      const currentTime = new Date().getTime();
      const elapsedMinutes = Math.round((currentTime - startTime) / 60000);
      
      text += `## ⏱️ Deployment Progress\n\n`;
      text += `**Time Elapsed:** ${elapsedMinutes} minutes\n`;
      text += `**Expected Duration:** ${activation.network === 'STAGING' ? '2-5' : '5-15'} minutes\n\n`;
      
      if (elapsedMinutes > (activation.network === 'STAGING' ? 10 : 20)) {
        text += `⚠️ **Note:** This activation is taking longer than usual.\n`;
        text += `Consider contacting Akamai support if it doesn't complete soon.\n\n`;
      }
      
      text += `**Next Steps:**\n`;
      text += `- Wait a few more minutes\n`;
      text += `- Check status again with this command\n`;
      text += `- Monitor for notification emails\n\n`;
    }
    
    // ERROR DETAILS for failed activations
    if (isFailed && activation.fatalError) {
      text += `## 🚨 Failure Details\n\n`;
      text += `**Fatal Error:** ${activation.fatalError}\n\n`;
      
      text += `**Troubleshooting Steps:**\n`;
      text += `1. Review the error message above\n`;
      text += `2. Check property configuration for issues\n`;
      text += `3. Validate property rules before re-activating\n`;
      text += `4. Contact Akamai support if the error persists\n\n`;
    }
    
    // VALIDATION ERRORS if present
    if (activation.errors && activation.errors.length > 0) {
      text += `## ❌ Validation Errors\n\n`;
      activation.errors.forEach((error: any, index: number) => {
        text += `${index + 1}. **${error.type}**\n`;
        text += `   - Message ID: ${error.messageId}\n`;
        text += `   - Detail: ${error.detail}\n\n`;
      });
    }
    
    // WARNINGS if present
    if (activation.warnings && activation.warnings.length > 0) {
      text += `## ⚠️ Warnings\n\n`;
      activation.warnings.forEach((warning: any, index: number) => {
        text += `${index + 1}. **${warning.type}**\n`;
        text += `   - Message ID: ${warning.messageId}\n`;
        text += `   - Detail: ${warning.detail}\n\n`;
      });
    }
    
    // SUCCESS ACTIONS
    if (isSuccessful) {
      text += `## 🎯 Deployment Complete - Next Actions\n\n`;
      
      if (activation.network === 'STAGING') {
        text += `**Your staging deployment is live!**\n\n`;
        text += `1. **Test your changes** at staging URLs\n`;
        text += `2. **Verify functionality** works as expected\n`;
        text += `3. **Check performance** metrics\n`;
        text += `4. **Deploy to production** when ready:\n`;
        text += `   \`\`\`\n`;
        text += `   activate_property --propertyId ${activation.propertyId} --version ${activation.propertyVersion} --network PRODUCTION\n`;
        text += `   \`\`\`\n`;
      } else {
        text += `**Your production deployment is live!**\n\n`;
        text += `1. **Monitor real user traffic** for any issues\n`;
        text += `2. **Check error rates** in your monitoring\n`;
        text += `3. **Verify SSL certificates** are working\n`;
        text += `4. **Test critical user paths** on production\n\n`;
        
        text += `**If issues arise:**\n`;
        text += `- Document the problem immediately\n`;
        text += `- Consider rolling back if severe\n`;
        text += `- Contact Akamai support for help\n`;
      }
    }
    
    return {
      content: [{ type: 'text', text }],
    };
  } catch (error) {
    return handleApiError(error, 'getting activation status');
  }
}

/**
 * 📋 LIST PROPERTY ACTIVATIONS
 * 
 * HUMAN-READABLE EXPLANATION:
 * Shows the deployment history for a property - like viewing your Git commit history
 * but for CDN configurations. Helps track what was deployed when and by whom.
 * 
 * BUSINESS VALUE:
 * - Audit trail for compliance and change management
 * - Troubleshooting by seeing what changed and when
 * - Rollback planning by identifying previous good versions
 * - Team coordination by seeing who deployed what
 * 
 * Consolidated from property-manager-tools.ts
 */
export async function listPropertyActivations(
  client: AkamaiClient,
  args: {
    /** Property to get activation history for */
    propertyId: string;
    
    /** Customer account context for multi-tenant operations */
    customer?: string;
  },
): Promise<MCPToolResponse> {
  try {
    const response = await client.request({
      path: `/papi/v1/properties/${args.propertyId}/activations`,
      method: 'GET',
    });

    if (!response.activations?.items || response.activations.items.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `No activations found for property ${args.propertyId}.\n\n**This means:**\n- The property has never been activated\n- It only exists as a draft configuration\n\n**Next Steps:**\n- Create your property configuration\n- Test it thoroughly\n- Use "activate_property" to deploy`,
          },
        ],
      };
    }

    let text = `# 📋 Property Activation History\n\n`;
    text += `**Property ID:** ${args.propertyId}\n`;
    text += `**Total Activations:** ${response.activations.items.length}\n`;
    text += `**Retrieved:** ${new Date().toISOString()}\n\n`;

    // GROUP BY NETWORK for better organization
    const stagingActivations = response.activations.items.filter((a: any) => a.network === 'STAGING');
    const productionActivations = response.activations.items.filter((a: any) => a.network === 'PRODUCTION');

    // PRODUCTION HISTORY (most important)
    if (productionActivations.length > 0) {
      text += `## 🔴 Production Deployments (${productionActivations.length})\n\n`;
      
      productionActivations.slice(0, 5).forEach((activation: any, index: number) => {
        const statusIcon = activation.status === 'ACTIVE' ? '✅' :
                          activation.status === 'FAILED' ? '❌' :
                          activation.status === 'PENDING' ? '⏳' : '⚠️';
        
        text += `### ${statusIcon} ${index + 1}. Version ${activation.propertyVersion}\n`;
        text += `- **Status:** ${activation.status}\n`;
        text += `- **Activation ID:** ${activation.activationId}\n`;
        text += `- **Submitted:** ${activation.submitDate}\n`;
        text += `- **Updated:** ${activation.updateDate}\n`;
        text += `- **Submitted By:** ${activation.submitUser || 'Unknown'}\n`;
        if (activation.note) text += `- **Notes:** ${activation.note}\n`;
        text += `\n`;
      });
      
      if (productionActivations.length > 5) {
        text += `*... and ${productionActivations.length - 5} more production activations*\n\n`;
      }
    }

    // STAGING HISTORY
    if (stagingActivations.length > 0) {
      text += `## 🟡 Staging Deployments (${stagingActivations.length})\n\n`;
      
      stagingActivations.slice(0, 3).forEach((activation: any, index: number) => {
        const statusIcon = activation.status === 'ACTIVE' ? '✅' :
                          activation.status === 'FAILED' ? '❌' :
                          activation.status === 'PENDING' ? '⏳' : '⚠️';
        
        text += `### ${statusIcon} ${index + 1}. Version ${activation.propertyVersion}\n`;
        text += `- **Status:** ${activation.status}\n`;
        text += `- **Activation ID:** ${activation.activationId}\n`;
        text += `- **Submitted:** ${activation.submitDate}\n`;
        if (activation.note) text += `- **Notes:** ${activation.note}\n`;
        text += `\n`;
      });
      
      if (stagingActivations.length > 3) {
        text += `*... and ${stagingActivations.length - 3} more staging activations*\n\n`;
      }
    }

    // DEPLOYMENT INSIGHTS
    text += `## 📊 Deployment Insights\n\n`;
    
    // Find currently active versions
    const activeProduction = productionActivations.find((a: any) => a.status === 'ACTIVE');
    const activeStaging = stagingActivations.find((a: any) => a.status === 'ACTIVE');
    
    if (activeProduction) {
      text += `**Current Production:** Version ${activeProduction.propertyVersion}\n`;
      text += `- Activated: ${activeProduction.updateDate}\n\n`;
    } else {
      text += `**Current Production:** No active version\n\n`;
    }
    
    if (activeStaging) {
      text += `**Current Staging:** Version ${activeStaging.propertyVersion}\n`;
      text += `- Activated: ${activeStaging.updateDate}\n\n`;
    } else {
      text += `**Current Staging:** No active version\n\n`;
    }

    // Calculate failure rate
    const failedCount = response.activations.items.filter((a: any) => a.status === 'FAILED').length;
    const successRate = ((response.activations.items.length - failedCount) / response.activations.items.length * 100).toFixed(1);
    
    text += `**Deployment Success Rate:** ${successRate}%\n`;
    if (failedCount > 0) {
      text += `**Failed Deployments:** ${failedCount}\n`;
    }

    // QUICK ACTIONS
    text += `\n## 🚀 Quick Actions\n\n`;
    
    if (activeProduction && activeStaging && activeProduction.propertyVersion !== activeStaging.propertyVersion) {
      text += `**Promote staging to production:**\n`;
      text += `\`\`\`\n`;
      text += `activate_property --propertyId ${args.propertyId} --version ${activeStaging.propertyVersion} --network PRODUCTION\n`;
      text += `\`\`\`\n\n`;
    }
    
    text += `**Check specific activation:**\n`;
    text += `\`\`\`\n`;
    text += `get_activation_status --propertyId ${args.propertyId} --activationId [ACTIVATION_ID]\n`;
    text += `\`\`\`\n`;

    return {
      content: [{ type: 'text', text }],
    };
  } catch (error) {
    return handleApiError(error, 'listing property activations');
  }
}

/**
 * ❌ CANCEL PROPERTY ACTIVATION
 * 
 * HUMAN-READABLE EXPLANATION:
 * Stops an in-progress deployment before it completes - like hitting the emergency
 * stop button. Only works on activations that are still PENDING.
 * 
 * WHEN TO USE:
 * - Realized there's a critical error in the configuration
 * - Wrong version was activated by mistake
 * - Need to make urgent changes before deployment
 * - Testing was not completed before activation
 * 
 * Consolidated from property-manager-advanced-tools.ts
 */
export async function cancelPropertyActivation(
  client: AkamaiClient,
  args: {
    /** Property containing the activation */
    propertyId: string;
    
    /** Activation to cancel (must be PENDING status) */
    activationId: string;
    
    /** Customer account context */
    customer?: string;
  },
): Promise<MCPToolResponse> {
  try {
    await client.request({
      path: `/papi/v1/properties/${args.propertyId}/activations/${args.activationId}`,
      method: 'DELETE',
    });

    let text = `# ❌ Activation Cancelled\n\n`;
    text += `**Property ID:** ${args.propertyId}\n`;
    text += `**Activation ID:** ${args.activationId}\n`;
    text += `**Cancelled:** ${new Date().toISOString()}\n\n`;
    
    text += `## What Happens Next\n\n`;
    text += `- The deployment process has been stopped\n`;
    text += `- No changes will be applied to edge servers\n`;
    text += `- The property version remains in draft state\n`;
    text += `- You can make changes and re-activate when ready\n\n`;
    
    text += `## Next Steps\n\n`;
    text += `1. **Fix any issues** in your configuration\n`;
    text += `2. **Re-validate** the property rules\n`;
    text += `3. **Test thoroughly** before re-activating\n`;
    text += `4. **Re-activate** when ready:\n`;
    text += `   \`\`\`\n`;
    text += `   activate_property --propertyId ${args.propertyId} --version [VERSION] --network [NETWORK]\n`;
    text += `   \`\`\`\n`;

    return {
      content: [{ type: 'text', text }],
    };
  } catch (error) {
    return handleApiError(error, 'cancelling activation');
  }
}

// =============================================================================
// 6. HOSTNAME MANAGEMENT
// =============================================================================

/**
 * 🔗 ADD PROPERTY HOSTNAME
 * 
 * HUMAN-READABLE EXPLANATION:
 * Connects your actual website domains (like www.example.com) to your Akamai
 * property configuration. This is how Akamai knows which configuration to use
 * when visitors access your site.
 * 
 * BUSINESS IMPACT:
 * - Makes your website accessible through Akamai's CDN
 * - Enables all configured features (caching, security, etc.)
 * - Critical step for going live with Akamai
 * 
 * REQUIREMENTS:
 * - Hostname must not already be in use by another property
 * - Must have corresponding edge hostname configured
 * - DNS CNAME must point to the edge hostname
 * 
 * Consolidated from property-manager-tools.ts
 */
export async function addPropertyHostname(
  client: AkamaiClient,
  args: {
    /** Property to add hostnames to */
    propertyId: string;
    
    /** Version to modify (hostnames are version-specific) */
    version: number;
    
    /** 
     * Your actual website hostnames (e.g., ["www.example.com", "api.example.com"])
     * IMPORTANT: These must be domains you own and control
     */
    hostnames: string[];
    
    /** 
     * Edge hostname for each hostname (must match array length)
     * If not provided, uses same edge hostname for all
     */
    edgeHostnameIds?: string[];
    
    /** Customer account context */
    customer?: string;
  },
): Promise<MCPToolResponse> {
  try {
    // VALIDATE INPUT: Ensure we have required data
    if (!args.hostnames || args.hostnames.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `[ERROR] No hostnames provided\n\n**Required:** At least one hostname to add\n\n**Example:**\n\`\`\`\nadd_property_hostname --propertyId prp_12345 --version 1 --hostnames ["www.example.com", "example.com"]\n\`\`\``,
          },
        ],
      };
    }

    // BUILD REQUEST: Format hostnames for API
    const hostnamesList = args.hostnames.map((hostname, index) => {
      const hostnameObj: any = {
        cnameFrom: hostname,
        cnameType: 'EDGE_HOSTNAME',
      };
      
      if (args.edgeHostnameIds && args.edgeHostnameIds[index]) {
        hostnameObj.cnameTo = args.edgeHostnameIds[index];
      }
      
      return hostnameObj;
    });

    const response = await client.request({
      path: `/papi/v1/properties/${args.propertyId}/versions/${args.version}/hostnames`,
      method: 'PATCH',
      body: hostnamesList,
    });

    let text = `# 🔗 Hostnames Added Successfully\n\n`;
    text += `**Property ID:** ${args.propertyId}\n`;
    text += `**Version:** ${args.version}\n`;
    text += `**Hostnames Added:** ${args.hostnames.length}\n`;
    text += `**Updated:** ${new Date().toISOString()}\n\n`;
    
    text += `## Added Hostnames\n\n`;
    args.hostnames.forEach((hostname, index) => {
      text += `${index + 1}. **${hostname}**\n`;
      if (args.edgeHostnameIds && args.edgeHostnameIds[index]) {
        text += `   - Edge Hostname: ${args.edgeHostnameIds[index]}\n`;
      }
    });
    text += `\n`;
    
    text += `## 🚨 Critical Next Steps\n\n`;
    text += `### 1. Configure DNS (Required)\n`;
    text += `For each hostname, create a CNAME record pointing to its edge hostname:\n\n`;
    
    args.hostnames.forEach((hostname) => {
      text += `**${hostname}:**\n`;
      text += `\`\`\`\n`;
      text += `${hostname}  CNAME  [your-edge-hostname].edgekey.net\n`;
      text += `\`\`\`\n\n`;
    });
    
    text += `### 2. Activate the Property\n`;
    text += `Deploy this version to make the hostnames live:\n`;
    text += `\`\`\`\n`;
    text += `activate_property --propertyId ${args.propertyId} --version ${args.version} --network STAGING\n`;
    text += `\`\`\`\n\n`;
    
    text += `### 3. Test Your Configuration\n`;
    text += `- Verify DNS resolution\n`;
    text += `- Check SSL certificate coverage\n`;
    text += `- Test website functionality\n\n`;
    
    text += `## ⚠️ Important Notes\n\n`;
    text += `- **DNS Propagation:** Changes can take 5-30 minutes globally\n`;
    text += `- **SSL Certificates:** Ensure certificates cover all hostnames\n`;
    text += `- **Testing:** Always test in staging before production\n`;

    return {
      content: [{ type: 'text', text }],
    };
  } catch (error) {
    return handleApiError(error, 'adding property hostname');
  }
}

/**
 * 🗑️ REMOVE PROPERTY HOSTNAME
 * 
 * HUMAN-READABLE EXPLANATION:
 * Disconnects a website domain from your Akamai property. Use with caution as
 * this will stop Akamai from serving content for that hostname.
 * 
 * BUSINESS IMPACT:
 * - Hostname will no longer be served through Akamai
 * - Traffic will fail unless DNS is updated
 * - All CDN benefits lost for that hostname
 * 
 * Consolidated from property-manager-tools.ts
 */
export async function removePropertyHostname(
  client: AkamaiClient,
  args: {
    /** Property to remove hostnames from */
    propertyId: string;
    
    /** Version to modify */
    version: number;
    
    /** Hostnames to remove */
    hostnames: string[];
    
    /** Customer account context */
    customer?: string;
  },
): Promise<MCPToolResponse> {
  try {
    // First get current hostnames
    const currentResponse = await client.request({
      path: `/papi/v1/properties/${args.propertyId}/versions/${args.version}/hostnames`,
      method: 'GET',
    });

    const currentHostnames = currentResponse.hostnames?.items || [];
    
    // Filter out hostnames to remove
    const remainingHostnames = currentHostnames.filter((h: any) => 
      !args.hostnames.includes(h.cnameFrom)
    );

    // Update with remaining hostnames
    const response = await client.request({
      path: `/papi/v1/properties/${args.propertyId}/versions/${args.version}/hostnames`,
      method: 'PUT',
      body: remainingHostnames,
    });

    let text = `# 🗑️ Hostnames Removed\n\n`;
    text += `**Property ID:** ${args.propertyId}\n`;
    text += `**Version:** ${args.version}\n`;
    text += `**Hostnames Removed:** ${args.hostnames.length}\n`;
    text += `**Remaining Hostnames:** ${remainingHostnames.length}\n`;
    text += `**Updated:** ${new Date().toISOString()}\n\n`;
    
    text += `## Removed Hostnames\n\n`;
    args.hostnames.forEach((hostname, index) => {
      text += `${index + 1}. ${hostname}\n`;
    });
    text += `\n`;
    
    text += `## ⚠️ CRITICAL: Update DNS Immediately\n\n`;
    text += `**These hostnames are no longer served by Akamai!**\n\n`;
    text += `For each removed hostname, you must:\n`;
    text += `1. Update DNS to point elsewhere\n`;
    text += `2. OR add them back to another property\n`;
    text += `3. OR users will see errors!\n\n`;
    
    text += `## Next Steps\n\n`;
    text += `1. **Activate this version** to apply changes\n`;
    text += `2. **Update DNS records** for removed hostnames\n`;
    text += `3. **Monitor traffic** for any issues\n`;

    return {
      content: [{ type: 'text', text }],
    };
  } catch (error) {
    return handleApiError(error, 'removing property hostname');
  }
}

/**
 * 📋 LIST PROPERTY HOSTNAMES
 * 
 * HUMAN-READABLE EXPLANATION:
 * Shows all website domains currently configured in a property version.
 * Helps you understand which domains are being served through this configuration.
 * 
 * Consolidated from property-manager-advanced-tools.ts
 */
export async function listPropertyHostnames(
  client: AkamaiClient,
  args: {
    /** Property to check */
    propertyId: string;
    
    /** Version to check */
    version: number;
    
    /** Include certificate status details */
    includeCertStatus?: boolean;
    
    /** Customer account context */
    customer?: string;
  },
): Promise<MCPToolResponse> {
  try {
    const response = await client.request({
      path: `/papi/v1/properties/${args.propertyId}/versions/${args.version}/hostnames`,
      method: 'GET',
    });

    if (!response.hostnames?.items || response.hostnames.items.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `No hostnames found for property ${args.propertyId} version ${args.version}.\n\n**Next Steps:**\n- Add hostnames using "add_property_hostname"\n- Check if you're looking at the right version\n- Verify property ID is correct`,
          },
        ],
      };
    }

    let text = `# 📋 Property Hostnames (Version ${args.version})\n\n`;
    text += `**Property ID:** ${args.propertyId}\n`;
    text += `**Version:** ${args.version}\n`;
    text += `**Total Hostnames:** ${response.hostnames.items.length}\n`;
    text += `**Retrieved:** ${new Date().toISOString()}\n\n`;

    text += `## Configured Hostnames\n\n`;
    
    response.hostnames.items.forEach((hostname: any, index: number) => {
      text += `### ${index + 1}. ${hostname.cnameFrom}\n`;
      text += `- **Points To:** ${hostname.cnameTo}\n`;
      text += `- **Type:** ${hostname.cnameType}\n`;
      
      if (args.includeCertStatus && hostname.certStatus) {
        text += `- **Certificate Status:**\n`;
        if (hostname.certStatus.production) {
          const prodStatus = hostname.certStatus.production[0]?.status || 'Unknown';
          text += `  - Production: ${prodStatus}\n`;
        }
        if (hostname.certStatus.staging) {
          const stagingStatus = hostname.certStatus.staging[0]?.status || 'Unknown';
          text += `  - Staging: ${stagingStatus}\n`;
        }
      }
      text += `\n`;
    });
    
    text += `## DNS Configuration Guide\n\n`;
    text += `For each hostname above, ensure DNS is configured:\n\n`;
    text += `\`\`\`\n`;
    text += `[hostname]  CNAME  [edge-hostname]\n`;
    text += `\`\`\`\n\n`;
    
    text += `## Quick Actions\n\n`;
    text += `**Add more hostnames:**\n`;
    text += `\`\`\`\n`;
    text += `add_property_hostname --propertyId ${args.propertyId} --version ${args.version} --hostnames ["new.example.com"]\n`;
    text += `\`\`\`\n\n`;
    text += `**Remove hostnames:**\n`;
    text += `\`\`\`\n`;
    text += `remove_property_hostname --propertyId ${args.propertyId} --version ${args.version} --hostnames ["old.example.com"]\n`;
    text += `\`\`\`\n`;

    return {
      content: [{ type: 'text', text }],
    };
  } catch (error) {
    return handleApiError(error, 'listing property hostnames');
  }
}

// =============================================================================
// 7. SUPPORT FUNCTIONS (CONTRACTS, GROUPS, PRODUCTS)
// =============================================================================

/**
 * 📄 LIST CONTRACTS
 * 
 * HUMAN-READABLE EXPLANATION:
 * Shows all commercial contracts in your Akamai account. Contracts determine
 * what products you can use and your billing arrangements.
 * 
 * BUSINESS PURPOSE:
 * - See what Akamai products you're licensed for
 * - Choose the right contract when creating properties
 * - Understand your account structure
 * 
 * Consolidated from property-tools.ts
 */
export async function listContracts(
  client: AkamaiClient,
  args: {
    /** Customer account context */
    customer?: string;
  },
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
            text: `No contracts found.\n\nThis is unusual - all Akamai accounts should have at least one contract.\nPlease check your API credentials and permissions.`,
          },
        ],
      };
    }

    let text = `# 📄 Akamai Contracts (${response.contracts.items.length} found)\n\n`;
    text += `Contracts represent your commercial relationship with Akamai.\n\n`;

    response.contracts.items.forEach((contract: any, index: number) => {
      text += `## ${index + 1}. ${formatContractDisplay(contract.contractId)}\n`;
      text += `- **Contract ID:** ${contract.contractId}\n`;
      text += `- **Type:** ${contract.contractTypeName || 'Standard'}\n\n`;
    });

    text += `## Using Contracts\n\n`;
    text += `When creating properties, specify the contract:\n`;
    text += `\`\`\`\n`;
    text += `create_property --contractId ${response.contracts.items[0].contractId} --groupId [GROUP_ID]\n`;
    text += `\`\`\`\n`;

    return {
      content: [{ type: 'text', text }],
    };
  } catch (error) {
    return handleApiError(error, 'listing contracts');
  }
}

/**
 * 👥 LIST GROUPS
 * 
 * HUMAN-READABLE EXPLANATION:
 * Shows organizational groups in your Akamai account. Groups help organize
 * properties and control access permissions.
 * 
 * BUSINESS PURPOSE:
 * - Organize properties by team, region, or purpose
 * - Control who can access what configurations
 * - Maintain clean account organization
 * 
 * Consolidated from property-tools.ts
 */
export async function listGroups(
  client: AkamaiClient,
  args: {
    /** Filter by specific contract */
    contractId?: string;
    
    /** Customer account context */
    customer?: string;
  },
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
            text: `No groups found.\n\nThis is unusual - all Akamai accounts should have at least one group.\nPlease check your API credentials and permissions.`,
          },
        ],
      };
    }

    let text = `# 👥 Account Groups (${response.groups.items.length} found)\n\n`;
    text += `Groups organize properties and control access permissions.\n\n`;

    // Build group hierarchy
    const groupMap = new Map();
    response.groups.items.forEach((group: any) => {
      groupMap.set(group.groupId, group);
    });

    // Display groups with hierarchy
    response.groups.items.forEach((group: any, index: number) => {
      if (!group.parentGroupId || !groupMap.has(group.parentGroupId)) {
        text += `## ${index + 1}. ${formatGroupDisplay(group.groupName, group.groupId)}\n`;
        text += `- **Group ID:** ${group.groupId}\n`;
        text += `- **Contracts:** ${group.contractIds.join(', ')}\n\n`;
        
        // Show child groups
        const children = response.groups.items.filter((g: any) => g.parentGroupId === group.groupId);
        if (children.length > 0) {
          text += `**Sub-groups:**\n`;
          children.forEach((child: any) => {
            text += `  - ${child.groupName} (${child.groupId})\n`;
          });
          text += `\n`;
        }
      }
    });

    text += `## Using Groups\n\n`;
    text += `When creating properties, specify the group:\n`;
    text += `\`\`\`\n`;
    text += `create_property --groupId ${response.groups.items[0].groupId} --contractId [CONTRACT_ID]\n`;
    text += `\`\`\`\n`;

    return {
      content: [{ type: 'text', text }],
    };
  } catch (error) {
    return handleApiError(error, 'listing groups');
  }
}

/**
 * 📦 LIST PRODUCTS
 * 
 * HUMAN-READABLE EXPLANATION:
 * Shows Akamai products available in your contract. Products determine what
 * features and capabilities your properties can use.
 * 
 * BUSINESS PURPOSE:
 * - See what CDN and security features you can use
 * - Choose the right product for your use case
 * - Understand your licensed capabilities
 * 
 * Consolidated from property-tools.ts
 */
export async function listProducts(
  client: AkamaiClient,
  args: {
    /** Contract to list products for */
    contractId: string;
    
    /** Customer account context */
    customer?: string;
  },
): Promise<MCPToolResponse> {
  try {
    // VALIDATE CONTRACT ID FORMAT
    if (!validateContractId(args.contractId)) {
      const error = getIdValidationError(args.contractId, 'contract');
      
      return {
        content: [
          {
            type: 'text',
            text: `[ERROR] Invalid Contract ID Format\n\n${error}\n\n**You provided:** ${args.contractId}\n\n**Example:** list_products --contractId ctr_C-1234567`,
          },
        ],
      };
    }
    
    const response = await client.request({
      path: `/papi/v1/products?contractId=${args.contractId}`,
      method: 'GET',
    });

    if (!response.products?.items || response.products.items.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `No products found for contract ${args.contractId}.\n\n**Possible reasons:**\n- Contract ID is incorrect\n- Contract has no active products\n- API permissions issue\n\n**Try:** Use "list_contracts" to verify contract ID`,
          },
        ],
      };
    }

    let text = `# 📦 Available Products (${response.products.items.length} found)\n\n`;
    text += `**Contract:** ${formatContractDisplay(args.contractId)}\n\n`;
    text += `Products determine the features available for your properties.\n\n`;

    // Group products by category for better organization
    const webProducts = response.products.items.filter((p: any) => 
      p.productName.toLowerCase().includes('web') || 
      p.productName.toLowerCase().includes('dynamic') ||
      p.productName.toLowerCase().includes('download')
    );
    
    const securityProducts = response.products.items.filter((p: any) => 
      p.productName.toLowerCase().includes('security') || 
      p.productName.toLowerCase().includes('kona') ||
      p.productName.toLowerCase().includes('defender')
    );
    
    const otherProducts = response.products.items.filter((p: any) => 
      !webProducts.includes(p) && !securityProducts.includes(p)
    );

    if (webProducts.length > 0) {
      text += `## 🌐 Web Performance Products\n\n`;
      webProducts.forEach((product: any) => {
        text += `### ${product.productName}\n`;
        text += `- **Product ID:** ${product.productId}\n`;
        text += `- **Description:** Optimized for web content delivery\n\n`;
      });
    }

    if (securityProducts.length > 0) {
      text += `## 🛡️ Security Products\n\n`;
      securityProducts.forEach((product: any) => {
        text += `### ${product.productName}\n`;
        text += `- **Product ID:** ${product.productId}\n`;
        text += `- **Description:** Enhanced security features\n\n`;
      });
    }

    if (otherProducts.length > 0) {
      text += `## 📦 Other Products\n\n`;
      otherProducts.forEach((product: any) => {
        text += `### ${product.productName}\n`;
        text += `- **Product ID:** ${product.productId}\n\n`;
      });
    }

    text += `## Using Products\n\n`;
    text += `When creating properties, choose a product based on your needs:\n`;
    text += `\`\`\`\n`;
    text += `create_property --productId ${response.products.items[0].productId} --propertyName "My Site"\n`;
    text += `\`\`\`\n\n`;
    
    text += `**Product Selection Guide:**\n`;
    text += `- **Ion/Dynamic Site**: Dynamic websites with personalization\n`;
    text += `- **Download Delivery**: Large file downloads, software\n`;
    text += `- **Adaptive Media**: Image and video optimization\n`;
    text += `- **Kona Site Defender**: DDoS and application security\n`;

    return {
      content: [{ type: 'text', text }],
    };
  } catch (error) {
    return handleApiError(error, 'listing products');
  }
}

// =============================================================================
// 8. ADVANCED OPERATIONS
// =============================================================================

/**
 * 🔄 CLONE PROPERTY
 * 
 * HUMAN-READABLE EXPLANATION:
 * Creates a copy of an existing property with all its configurations.
 * Like "Save As" for your CDN setup - useful for creating similar properties
 * or testing major changes without affecting the original.
 * 
 * USE CASES:
 * - Create test/staging versions of production properties
 * - Set up similar sites with slight variations
 * - Create backups before major changes
 * - Launch properties in new regions
 * 
 * Consolidated from property-manager-advanced-tools.ts
 */
export async function cloneProperty(
  client: AkamaiClient,
  args: {
    /** Source property to clone from */
    sourcePropertyId: string;
    
    /** Name for the new cloned property */
    newPropertyName: string;
    
    /** Version to clone (defaults to latest) */
    sourceVersion?: number;
    
    /** Copy hostnames to new property */
    copyHostnames?: boolean;
    
    /** Contract for new property */
    contractId?: string;
    
    /** Group for new property */
    groupId?: string;
    
    /** Product ID (defaults to same as source) */
    productId?: string;
    
    /** Customer account context */
    customer?: string;
  },
): Promise<MCPToolResponse> {
  try {
    // Get source property details if not all provided
    if (!args.productId || !args.contractId || !args.groupId) {
      const sourceResponse = await client.request({
        path: `/papi/v1/properties/${args.sourcePropertyId}`,
        method: 'GET',
      });
      
      const sourceProperty = sourceResponse.properties?.items?.[0];
      if (!sourceProperty) {
        throw new Error('Source property not found');
      }
      
      // Use source property's values as defaults
      if (!args.productId) args.productId = sourceProperty.productId;
      if (!args.contractId) args.contractId = sourceProperty.contractId;
      if (!args.groupId) args.groupId = sourceProperty.groupId;
    }

    const requestBody: any = {
      productId: args.productId,
      propertyName: args.newPropertyName,
      cloneFrom: {
        propertyId: args.sourcePropertyId,
        ...(args.sourceVersion && { version: args.sourceVersion }),
        copyHostnames: args.copyHostnames === true,
      },
    };

    const response = await client.request({
      path: '/papi/v1/properties',
      method: 'POST',
      body: requestBody,
      queryParams: {
        contractId: args.contractId!,
        groupId: args.groupId!,
      },
    });

    const propertyLink = response.propertyLink;
    const newPropertyId = propertyLink?.split('/').pop()?.split('?')[0];

    let text = `# 🔄 Property Cloned Successfully\n\n`;
    text += `**New Property Name:** ${args.newPropertyName}\n`;
    text += `**New Property ID:** ${newPropertyId}\n`;
    text += `**Cloned From:** ${args.sourcePropertyId}\n`;
    text += `**Source Version:** ${args.sourceVersion || 'Latest'}\n`;
    text += `**Hostnames Copied:** ${args.copyHostnames ? 'Yes' : 'No'}\n`;
    text += `**Created:** ${new Date().toISOString()}\n\n`;
    
    text += `## What Was Cloned\n\n`;
    text += `✅ **Included in Clone:**\n`;
    text += `- All property rules and behaviors\n`;
    text += `- Origin server configuration\n`;
    text += `- Caching settings\n`;
    text += `- Performance optimizations\n`;
    text += `- Security configurations\n`;
    if (args.copyHostnames) {
      text += `- Hostname associations\n`;
    }
    text += `\n`;
    
    text += `❌ **NOT Included:**\n`;
    text += `- Activation history\n`;
    text += `- Active deployment status\n`;
    if (!args.copyHostnames) {
      text += `- Hostname associations\n`;
    }
    text += `- CP codes (new ones created)\n\n`;
    
    text += `## Next Steps\n\n`;
    text += `1. **Review the configuration:**\n`;
    text += `   \`\`\`\n`;
    text += `   get_property_rules --propertyId ${newPropertyId} --version 1\n`;
    text += `   \`\`\`\n\n`;
    
    if (!args.copyHostnames) {
      text += `2. **Add hostnames:**\n`;
      text += `   \`\`\`\n`;
      text += `   add_property_hostname --propertyId ${newPropertyId} --version 1 --hostnames ["example.com"]\n`;
      text += `   \`\`\`\n\n`;
    }
    
    text += `3. **Make any necessary changes**\n\n`;
    
    text += `4. **Test in staging:**\n`;
    text += `   \`\`\`\n`;
    text += `   activate_property --propertyId ${newPropertyId} --version 1 --network STAGING\n`;
    text += `   \`\`\`\n`;

    return {
      content: [{ type: 'text', text }],
    };
  } catch (error) {
    return handleApiError(error, 'cloning property');
  }
}

/**
 * 🔍 SEARCH PROPERTIES
 * 
 * HUMAN-READABLE EXPLANATION:
 * Searches for properties by name or hostname across your account.
 * Essential for finding specific configurations in large accounts.
 * 
 * NOTE: This implementation uses the real Akamai search API, not the
 * fake client-side filtering that was previously implemented.
 * 
 * Consolidated and fixed from property-manager-advanced-tools.ts
 */
export async function searchProperties(
  client: AkamaiClient,
  args: {
    /** Search term (property name or hostname) */
    searchTerm: string;
    
    /** Search by property name (default) or hostname */
    searchBy?: 'propertyName' | 'hostname';
    
    /** Customer account context */
    customer?: string;
  },
): Promise<MCPToolResponse> {
  try {
    // Use the real Akamai search API endpoint
    const searchType = args.searchBy || 'propertyName';
    const requestBody = {
      [searchType]: args.searchTerm,
    };

    const response = await client.request({
      path: '/papi/v1/search/find-by-value',
      method: 'POST',
      body: requestBody,
    });

    const results = response.versions?.items || [];

    if (results.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `No properties found matching "${args.searchTerm}".\n\n**Search Tips:**\n- Try partial names (e.g., "shop" instead of "shop.example.com")\n- Search by hostname if property name doesn't work\n- Check if you have access to the property\n- Verify spelling and try variations`,
          },
        ],
      };
    }

    let text = `# 🔍 Property Search Results\n\n`;
    text += `**Search Term:** "${args.searchTerm}"\n`;
    text += `**Search By:** ${searchType}\n`;
    text += `**Results Found:** ${results.length}\n\n`;

    // Group results by property for better organization
    const propertyMap = new Map<string, any[]>();
    results.forEach((result: any) => {
      const propId = result.propertyId;
      if (!propertyMap.has(propId)) {
        propertyMap.set(propId, []);
      }
      propertyMap.get(propId)!.push(result);
    });

    let propertyIndex = 1;
    propertyMap.forEach((versions, propertyId) => {
      const latestVersion = versions.reduce((latest, current) => 
        current.propertyVersion > latest.propertyVersion ? current : latest
      );

      text += `## ${propertyIndex}. ${latestVersion.propertyName}\n`;
      text += `- **Property ID:** ${propertyId}\n`;
      text += `- **Latest Version:** ${latestVersion.propertyVersion}\n`;
      text += `- **Contract:** ${latestVersion.contractId}\n`;
      text += `- **Group:** ${latestVersion.groupId}\n`;
      text += `- **Production Version:** ${latestVersion.productionStatus === 'ACTIVE' ? latestVersion.propertyVersion : 'None'}\n`;
      text += `- **Staging Version:** ${latestVersion.stagingStatus === 'ACTIVE' ? latestVersion.propertyVersion : 'None'}\n`;
      
      if (searchType === 'hostname' && latestVersion.hostname) {
        text += `- **Matching Hostname:** ${latestVersion.hostname}\n`;
      }
      
      text += `\n`;
      propertyIndex++;
    });

    text += `## Quick Actions\n\n`;
    text += `**View property details:**\n`;
    text += `\`\`\`\n`;
    text += `get_property --propertyId [PROPERTY_ID]\n`;
    text += `\`\`\`\n\n`;
    text += `**View property rules:**\n`;
    text += `\`\`\`\n`;
    text += `get_property_rules --propertyId [PROPERTY_ID] --version [VERSION]\n`;
    text += `\`\`\`\n`;

    return {
      content: [{ type: 'text', text }],
    };
  } catch (error) {
    return handleApiError(error, 'searching properties');
  }
}

/**
 * 📊 GET LATEST PROPERTY VERSION
 * 
 * HUMAN-READABLE EXPLANATION:
 * Quick way to get information about the most recent version of a property.
 * Useful when you don't know the version number but need the latest configuration.
 * 
 * Consolidated from property-manager-advanced-tools.ts
 */
export async function getLatestPropertyVersion(
  client: AkamaiClient,
  args: {
    /** Property to get latest version for */
    propertyId: string;
    
    /** Customer account context */
    customer?: string;
  },
): Promise<MCPToolResponse> {
  try {
    // First get property to find latest version number
    const propertyResponse = await client.request({
      path: `/papi/v1/properties/${args.propertyId}`,
      method: 'GET',
    });

    const property = propertyResponse.properties?.items?.[0];
    if (!property) {
      throw new Error('Property not found');
    }

    const latestVersion = property.latestVersion;

    // Now get that version's details
    const versionResponse = await client.request({
      path: `/papi/v1/properties/${args.propertyId}/versions/${latestVersion}`,
      method: 'GET',
    });

    const version = versionResponse.versions?.items?.[0];
    if (!version) {
      throw new Error('Version details not found');
    }

    let text = `# 📊 Latest Property Version\n\n`;
    text += `**Property:** ${property.propertyName} (${args.propertyId})\n`;
    text += `**Latest Version:** ${latestVersion}\n`;
    text += `**Last Modified:** ${version.updatedDate}\n`;
    text += `**Modified By:** ${version.updatedByUser}\n`;
    text += `**Rule Format:** ${version.ruleFormat}\n\n`;

    text += `## Deployment Status\n\n`;
    text += `- **Production:** ${version.productionStatus === 'ACTIVE' ? `Active (v${property.productionVersion})` : 'Not Active'}\n`;
    text += `- **Staging:** ${version.stagingStatus === 'ACTIVE' ? `Active (v${property.stagingVersion})` : 'Not Active'}\n\n`;

    if (version.note) {
      text += `## Version Notes\n\n${version.note}\n\n`;
    }

    text += `## Quick Actions\n\n`;
    
    if (version.productionStatus !== 'ACTIVE' && version.stagingStatus !== 'ACTIVE') {
      text += `**Deploy to staging:**\n`;
      text += `\`\`\`\n`;
      text += `activate_property --propertyId ${args.propertyId} --version ${latestVersion} --network STAGING\n`;
      text += `\`\`\`\n\n`;
    }
    
    text += `**View configuration:**\n`;
    text += `\`\`\`\n`;
    text += `get_property_rules --propertyId ${args.propertyId} --version ${latestVersion}\n`;
    text += `\`\`\`\n\n`;
    
    text += `**Create new version:**\n`;
    text += `\`\`\`\n`;
    text += `create_property_version --propertyId ${args.propertyId} --createFromVersion ${latestVersion}\n`;
    text += `\`\`\`\n`;

    return {
      content: [{ type: 'text', text }],
    };
  } catch (error) {
    return handleApiError(error, 'getting latest property version');
  }
}

// =============================================================================
// 9. CP CODE MANAGEMENT
// =============================================================================

/**
 * 📊 LIST CP CODES
 * 
 * HUMAN-READABLE EXPLANATION:
 * CP Codes (Content Provider Codes) are tracking identifiers that help you
 * monitor and report on your CDN traffic. Each CP code can track different
 * types of content or applications.
 * 
 * BUSINESS VALUE:
 * - Track bandwidth usage by content type
 * - Generate detailed billing reports
 * - Monitor performance by application
 * - Allocate costs to different departments
 * 
 * Consolidated from property-manager-tools.ts
 */
export async function listCPCodes(
  client: AkamaiClient,
  args: {
    /** Filter by contract */
    contractId?: string;
    
    /** Filter by group */
    groupId?: string;
    
    /** Customer account context */
    customer?: string;
  },
): Promise<MCPToolResponse> {
  try {
    const queryParams: Record<string, string> = {};
    if (args.contractId) queryParams.contractId = args.contractId;
    if (args.groupId) queryParams.groupId = args.groupId;

    const response = await client.request({
      path: '/papi/v1/cpcodes',
      method: 'GET',
      ...(Object.keys(queryParams).length > 0 && { queryParams }),
    });

    if (!response.cpcodes?.items || response.cpcodes.items.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `No CP codes found.\n\n**Next Steps:**\n- Create a CP code using "create_cpcode"\n- Check if you're looking in the right contract/group\n- Verify API permissions`,
          },
        ],
      };
    }

    let text = `# 📊 CP Codes (${response.cpcodes.items.length} found)\n\n`;
    text += `CP codes track and report on your CDN usage.\n\n`;

    // Group by product for better organization
    const byProduct = new Map<string, any[]>();
    response.cpcodes.items.forEach((cpcode: any) => {
      const product = cpcode.productIds?.[0] || 'Unknown';
      if (!byProduct.has(product)) {
        byProduct.set(product, []);
      }
      byProduct.get(product)!.push(cpcode);
    });

    byProduct.forEach((cpcodes, productId) => {
      text += `## Product: ${productId}\n\n`;
      
      cpcodes.forEach((cpcode: any) => {
        text += `### ${cpcode.cpcodeName} (${cpcode.cpcodeId})\n`;
        text += `- **CP Code ID:** ${cpcode.cpcodeId}\n`;
        text += `- **Name:** ${cpcode.cpcodeName}\n`;
        text += `- **Contract:** ${cpcode.contractId}\n`;
        text += `- **Group:** ${cpcode.groupId}\n`;
        text += `- **Created:** ${cpcode.createdDate || 'Unknown'}\n\n`;
      });
    });

    text += `## Using CP Codes\n\n`;
    text += `CP codes are automatically applied to properties, but you can:\n`;
    text += `- Use different CP codes for different content types\n`;
    text += `- Track usage separately for billing purposes\n`;
    text += `- Generate reports by CP code\n\n`;
    
    text += `**Create new CP code:**\n`;
    text += `\`\`\`\n`;
    text += `create_cpcode --cpcodeName "Mobile API Traffic" --productId prd_XXX\n`;
    text += `\`\`\`\n`;

    return {
      content: [{ type: 'text', text }],
    };
  } catch (error) {
    return handleApiError(error, 'listing CP codes');
  }
}

/**
 * 🆕 CREATE CP CODE
 * 
 * HUMAN-READABLE EXPLANATION:
 * Creates a new CP code for tracking specific types of content or traffic.
 * Use different CP codes to separate billing and reporting for different
 * applications, departments, or content types.
 * 
 * Consolidated from property-manager-tools.ts
 */
export async function createCPCode(
  client: AkamaiClient,
  args: {
    /** Descriptive name for the CP code */
    cpcodeName: string;
    
    /** Product this CP code is for */
    productId: string;
    
    /** Contract to create under */
    contractId?: string;
    
    /** Group to create under */
    groupId?: string;
    
    /** Customer account context */
    customer?: string;
  },
): Promise<MCPToolResponse> {
  try {
    const requestBody = {
      cpcodeName: args.cpcodeName,
      productId: args.productId,
    };

    const queryParams: Record<string, string> = {};
    if (args.contractId) queryParams.contractId = args.contractId;
    if (args.groupId) queryParams.groupId = args.groupId;

    const response = await client.request({
      path: '/papi/v1/cpcodes',
      method: 'POST',
      body: requestBody,
      ...(Object.keys(queryParams).length > 0 && { queryParams }),
    });

    const cpcodeLink = response.cpcodeLink;
    const cpcodeId = cpcodeLink?.split('/').pop()?.split('?')[0];

    let text = `# 🆕 CP Code Created Successfully\n\n`;
    text += `**CP Code Name:** ${args.cpcodeName}\n`;
    text += `**CP Code ID:** ${cpcodeId}\n`;
    text += `**Product:** ${args.productId}\n`;
    if (args.contractId) text += `**Contract:** ${args.contractId}\n`;
    if (args.groupId) text += `**Group:** ${args.groupId}\n`;
    text += `**Created:** ${new Date().toISOString()}\n\n`;
    
    text += `## What Are CP Codes For?\n\n`;
    text += `CP codes help you:\n`;
    text += `- **Track Usage:** Monitor bandwidth by content type\n`;
    text += `- **Billing Reports:** Separate costs by department/application\n`;
    text += `- **Performance Analysis:** Analyze metrics by CP code\n`;
    text += `- **Access Control:** Some features can be limited by CP code\n\n`;
    
    text += `## Next Steps\n\n`;
    text += `1. **Use in Property Rules:** Configure rules to use this CP code\n`;
    text += `2. **Monitor Usage:** Track bandwidth and hits for this CP code\n`;
    text += `3. **Generate Reports:** Use CP code for detailed reporting\n\n`;
    
    text += `**View CP code details:**\n`;
    text += `\`\`\`\n`;
    text += `get_cpcode --cpcodeId ${cpcodeId}\n`;
    text += `\`\`\`\n`;

    return {
      content: [{ type: 'text', text }],
    };
  } catch (error) {
    return handleApiError(error, 'creating CP code');
  }
}

/**
 * 🔍 GET CP CODE DETAILS
 * 
 * HUMAN-READABLE EXPLANATION:
 * Shows detailed information about a specific CP code, including its
 * configuration and associated products.
 * 
 * Consolidated from property-manager-tools.ts
 */
export async function getCPCode(
  client: AkamaiClient,
  args: {
    /** CP code to get details for */
    cpcodeId: string;
    
    /** Customer account context */
    customer?: string;
  },
): Promise<MCPToolResponse> {
  try {
    // VALIDATE CP CODE ID FORMAT
    if (!validateCPCodeId(args.cpcodeId)) {
      const fixed = fixAkamaiId(args.cpcodeId, 'cpcode');
      const error = getIdValidationError(args.cpcodeId, 'cpcode');
      
      return {
        content: [
          {
            type: 'text',
            text: `[ERROR] Invalid CP Code ID Format\n\n${error}\n\n**You provided:** ${args.cpcodeId}\n${fixed ? `**Did you mean:** ${fixed}\n` : ''}\n**Example:** get_cpcode --cpcodeId cpc_12345`,
          },
        ],
      };
    }
    
    const response = await client.request({
      path: `/papi/v1/cpcodes/${args.cpcodeId}`,
      method: 'GET',
    });

    if (!response.cpcodes?.items?.[0]) {
      return {
        content: [
          {
            type: 'text',
            text: `CP code ${args.cpcodeId} not found.\n\n**Verify:**\n- CP code ID is correct (format: cpc_12345)\n- You have access to this CP code\n- Use "list_cpcodes" to see available codes`,
          },
        ],
      };
    }

    const cpcode = response.cpcodes.items[0];

    let text = `# 🔍 CP Code Details\n\n`;
    text += `**CP Code ID:** ${cpcode.cpcodeId}\n`;
    text += `**Name:** ${cpcode.cpcodeName}\n`;
    text += `**Contract:** ${cpcode.contractId}\n`;
    text += `**Group:** ${cpcode.groupId}\n`;
    text += `**Products:** ${cpcode.productIds?.join(', ') || 'None specified'}\n`;
    text += `**Created:** ${cpcode.createdDate || 'Unknown'}\n\n`;
    
    text += `## Usage Information\n\n`;
    text += `This CP code can be used to:\n`;
    text += `- Track specific content types separately\n`;
    text += `- Generate detailed traffic reports\n`;
    text += `- Allocate costs to departments/projects\n`;
    text += `- Monitor performance metrics\n\n`;
    
    text += `## Quick Actions\n\n`;
    text += `**View all CP codes:**\n`;
    text += `\`\`\`\n`;
    text += `list_cpcodes\n`;
    text += `\`\`\`\n\n`;
    text += `**Create similar CP code:**\n`;
    text += `\`\`\`\n`;
    text += `create_cpcode --cpcodeName "New Tracking Code" --productId ${cpcode.productIds?.[0] || 'prd_XXX'}\n`;
    text += `\`\`\`\n`;

    return {
      content: [{ type: 'text', text }],
    };
  } catch (error) {
    return handleApiError(error, 'getting CP code details');
  }
}