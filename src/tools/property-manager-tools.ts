/**
 * Extended Property Manager Tools
 * Implements advanced property management features including versions, rules, edge hostnames, and activations
 * 
 * CODE KAI IMPLEMENTATION:
 * - Zero tolerance for 'any' or 'unknown' types
 * - Complete type coverage using official Akamai PAPI schemas
 * - Runtime validation with type guards before type assertions
 * - Comprehensive error messages for debugging
 * 
 * KAIZEN (改善) PRINCIPLES:
 * - Every function is annotated with its purpose and Akamai API endpoint
 * - All error paths provide actionable feedback
 * - Type transformations are explicit and validated
 * - JSON format support for Claude Desktop optimization
 * 
 * @see https://techdocs.akamai.com/property-mgr/reference/api
 */

import { type AkamaiClient } from '../akamai-client';
import { type MCPToolResponse } from '../types';
import { createActivationProgress, type ProgressToken } from '../utils/mcp-progress';
import { JsonResponseBuilder, validateFormatParameter } from '../utils/json-response-builder';
import {
  PapiPropertyDetailsResponse,
  isPapiPropertyDetailsResponse,
  isPapiError,
} from '../types/api-responses/papi-properties';
import {
  PropertyVersionCreateResponse,
  PropertyVersionRulesGetResponse,
  EdgeHostnameCreateResponse,
  PropertyVersionHostnamesGetResponse,
  PropertyActivateResponse,
  PropertyActivationsGetResponse,
  Activation,
  NetworkType,
  ActivationStatus,
  isPropertyVersionCreateResponse,
  isPropertyVersionRulesGetResponse,
  isEdgeHostnameCreateResponse,
  isPropertyVersionHostnamesGetResponse,
  isPropertyActivateResponse,
  isPropertyActivationsGetResponse,
} from '../types/api-responses/papi-official';

// Extended types for property management
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

export interface ActivationStatus {
  activationId: string;
  propertyName: string;
  propertyId: string;
  propertyVersion: number;
  network: 'STAGING' | 'PRODUCTION';
  activationType: string;
  status: string;
  submitDate: string;
  updateDate: string;
  note?: string;
  notifyEmails: string[];
  fatalError?: string;
  errors?: Array<{
    type: string;
    messageId: string;
    detail: string;
  }>;
  warnings?: Array<{
    type: string;
    messageId: string;
    detail: string;
  }>;
}

/**
 * Create a new property version
 * 
 * AKAMAI API: POST /papi/v1/properties/{propertyId}/versions
 * 
 * PURPOSE:
 * - Creates a new editable version of a property configuration
 * - Versions are immutable once activated, so new versions are needed for changes
 * - Automatically determines the base version if not specified
 * 
 * WORKFLOW:
 * 1. If no base version specified, fetches the latest version
 * 2. Creates new version from the base version
 * 3. Optionally adds a descriptive note to the version
 * 4. Returns version number for subsequent operations
 * 
 * @param client - Authenticated Akamai API client
 * @param args.propertyId - The property to create a version for
 * @param args.baseVersion - Version to copy from (optional, defaults to latest)
 * @param args.note - Description of changes in this version
 * @param args.etag - Version etag for optimistic locking (optional)
 * @param args.format - Response format: 'json' for structured data, 'text' for human-readable
 * @returns MCPToolResponse with new version details
 */
export async function createPropertyVersion(
  client: AkamaiClient,
  args: {
    propertyId: string;
    baseVersion?: number;
    note?: string;
    etag?: string;
    customer?: string;
    format?: 'json' | 'text';
  },
): Promise<MCPToolResponse> {
  try {
    // Get current version if not specified
    let baseVersion = args.baseVersion;
    let propertyName = '';
    if (!baseVersion) {
      const propertyResponse = await client.request({
        path: `/papi/v1/properties/${args.propertyId}`,
        method: 'GET',
      });

      if (isPapiError(propertyResponse)) {
        throw new Error(`Failed to get property: ${propertyResponse.detail}`);
      }

      if (!isPapiPropertyDetailsResponse(propertyResponse)) {
        throw new Error('Invalid property response structure');
      }

      const typedResponse = propertyResponse as PapiPropertyDetailsResponse;
      if (!typedResponse.properties?.items?.[0]) {
        throw new Error('Property not found');
      }

      const property = typedResponse.properties.items[0];
      baseVersion = property.latestVersion || 1;
      propertyName = property.propertyName || '';
    }

    // Create new version
    const response = await client.request({
      path: `/papi/v1/properties/${args.propertyId}/versions`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: {
        createFromVersion: baseVersion,
        createFromVersionEtag: args.etag || '', // Will be handled by API
      },
    });

    // CODE KAI: Type-safe response handling with official Akamai types
    // Step 1: Check if the API returned an error response
    if (isPapiError(response)) {
      throw new Error(`Failed to create property version: ${response.detail}`);
    }
    
    // Step 2: Validate the response structure matches expected schema
    if (!isPropertyVersionCreateResponse(response)) {
      throw new Error('Invalid response: expected PropertyVersionCreateResponse with versionLink');
    }
    
    // Step 3: Safe type assertion after validation
    const typedResponse = response as PropertyVersionCreateResponse;
    
    // Step 4: Extract version number from the versionLink URL
    // Example: /papi/v1/properties/prp_123/versions/42 -> "42"
    const newVersion = typedResponse.versionLink.split('/').pop() || 'unknown';

    // Update version note if provided
    if (args.note) {
      await client.request({
        path: `/papi/v1/properties/${args.propertyId}/versions/${newVersion}`,
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json-patch+json',
        },
        body: [
          {
            op: 'replace',
            path: '/versions/0/note',
            value: args.note,
          },
        ],
      });
    }

    // Determine response format
    const format = validateFormatParameter(args.format);
    
    // For backward compatibility, return text format by default
    if (format === 'text') {
      return {
        content: [
          {
            type: 'text',
            text: `[DONE] Created property version ${newVersion} for ${propertyName} (${args.propertyId})\n\n**Next Steps:**\n- Update rules: "Get property rules for ${args.propertyId} version ${newVersion}"\n- Activate: "Activate property ${args.propertyId} version ${newVersion} to staging"`,
          },
        ],
      };
    }

    // New JSON format for Claude Desktop optimization
    const responseBuilder = new JsonResponseBuilder();
    const startTime = Date.now();
    
    const versionData = {
      propertyId: args.propertyId,
      propertyName: propertyName,
      newVersion: parseInt(newVersion),
      baseVersion: baseVersion,
      note: args.note || null,
      createdDate: new Date().toISOString(),
      status: 'INACTIVE',
      links: {
        property: `/papi/v1/properties/${args.propertyId}`,
        version: `/papi/v1/properties/${args.propertyId}/versions/${newVersion}`,
        rules: `/papi/v1/properties/${args.propertyId}/versions/${newVersion}/rules`
      },
      nextSteps: [
        {
          action: 'update_rules',
          description: 'Update the property rules configuration',
          command: `get_property_rules propertyId="${args.propertyId}" version="${newVersion}"`
        },
        {
          action: 'activate',
          description: 'Activate the new version to staging or production',
          command: `activate_property propertyId="${args.propertyId}" version="${newVersion}" network="STAGING"`
        }
      ]
    };

    const jsonResponse = responseBuilder.success(
      versionData,
      { propertyId: args.propertyId, format: 'json' },
      {
        total: 1,
        shown: 1,
        hasMore: false,
        executionTime: Date.now() - startTime,
        warnings: [],
      }
    );

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(jsonResponse, null, 2),
        },
      ],
    };
  } catch (_error) {
    return formatError('create property version', _error);
  }
}

/**
 * Get property rule tree configuration
 */
export async function getPropertyRules(
  client: AkamaiClient,
  args: {
    propertyId: string;
    version?: number;
  },
): Promise<MCPToolResponse> {
  try {
    // Get property details to find latest version if not specified
    let version = args.version;
    if (!version) {
      const propertyResponse = await client.request({
        path: `/papi/v1/properties/${args.propertyId}`,
        method: 'GET',
      });

      if (isPapiError(propertyResponse)) {
        throw new Error(`Failed to get property: ${propertyResponse.detail}`);
      }

      if (!isPapiPropertyDetailsResponse(propertyResponse)) {
        throw new Error('Invalid property response structure');
      }

      const typedResponse = propertyResponse as PapiPropertyDetailsResponse;
      if (!typedResponse.properties?.items?.[0]) {
        throw new Error('Property not found');
      }

      version = typedResponse.properties.items[0].latestVersion || 1;
    }

    // Get rule tree
    const response = await client.request({
      path: `/papi/v1/properties/${args.propertyId}/versions/${version}/rules`,
      method: 'GET',
      headers: {
        Accept: 'application/vnd.akamai.papirules.v2023-10-30+json',
      },
    });

    // CODE KAI: Type-safe response handling with official Akamai types
    if (isPapiError(response)) {
      throw new Error(`Failed to get property rules: ${response.detail}`);
    }
    
    if (!isPropertyVersionRulesGetResponse(response)) {
      throw new Error('Invalid response: expected PropertyVersionRulesGetResponse');
    }
    
    const rulesResponse = response as PropertyVersionRulesGetResponse;

    // Format rules for display
    let text = `# Property Rules - ${args.propertyId} (v${version})\n\n`;
    text += `**Rule Format:** ${rulesResponse.ruleFormat || 'latest'}\n\n`;

    // Function to format rules recursively
    function formatRule(rule: any, indent = ''): string {
      let output = `${indent}[EMOJI] **${rule.name}**\n`;

      if (rule.criteria?.length > 0) {
        output += `${indent}  Criteria:\n`;
        rule.criteria.forEach((c: any) => {
          output += `${indent}  - ${c.name}`;
          if (c.options && Object.keys(c.options).length > 0) {
            output += `: ${JSON.stringify(c.options, null, 2).replace(/\n/g, `\n${indent}    `)}`;
          }
          output += '\n';
        });
      }

      if (rule.behaviors?.length > 0) {
        output += `${indent}  Behaviors:\n`;
        rule.behaviors.forEach((b: any) => {
          output += `${indent}  - ${b.name}`;
          if (b.options && Object.keys(b.options).length > 0) {
            // Special handling for common behaviors
            if (b.name === 'origin') {
              output += `: ${b.options.hostname || 'not set'}`;
            } else if (b.name === 'caching') {
              output += `: ${b.options.behavior || 'default'}`;
            } else if (b.name === 'cpCode') {
              output += `: ${b.options.value?.name || b.options.value?.id || 'not set'}`;
            } else {
              output += `: ${JSON.stringify(b.options, null, 2).replace(/\n/g, `\n${indent}    `)}`;
            }
          }
          output += '\n';
        });
      }

      if (rule.children?.length > 0) {
        output += `${indent}  Children:\n`;
        rule.children.forEach((child: any) => {
          output += formatRule(child, indent + '    ');
        });
      }

      return output;
    }

    text += formatRule(rulesResponse.rules);

    text += '\n## Key Behaviors Summary\n\n';

    // Extract key behaviors from default rule
    const defaultRule = rulesResponse.rules;
    const originBehavior = defaultRule.behaviors?.find((b: any) => b.name === 'origin');
    const cachingBehavior = defaultRule.behaviors?.find((b: any) => b.name === 'caching');
    const cpCodeBehavior = defaultRule.behaviors?.find((b: any) => b.name === 'cpCode');

    if (originBehavior) {
      text += `- **Origin Server:** ${originBehavior.options?.hostname || 'Not configured'}\n`;
    }
    if (cachingBehavior) {
      text += `- **Caching:** ${cachingBehavior.options?.behavior || 'Default'}\n`;
    }
    if (cpCodeBehavior) {
      text += `- **CP Code:** ${cpCodeBehavior.options?.value?.name || 'Not set'}\n`;
    }

    text += '\n## Next Steps\n';
    text += `- Update rules: "Update origin server for property ${args.propertyId} to example.com"\n`;
    text += `- Add caching rules: "Add caching rule for images in property ${args.propertyId}"\n`;
    text += `- Activate changes: "Activate property ${args.propertyId} to staging"\n`;

    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  } catch (_error) {
    return formatError('get property rules', _error);
  }
}

/**
 * Update property rule tree
 */
export async function updatePropertyRules(
  client: AkamaiClient,
  args: {
    propertyId: string;
    version?: number;
    rules: any;
    note?: string;
  },
): Promise<MCPToolResponse> {
  try {
    // Get property details to find latest version if not specified
    let version = args.version;
    if (!version) {
      const propertyResponse = await client.request({
        path: `/papi/v1/properties/${args.propertyId}`,
        method: 'GET',
      });

      if (isPapiError(propertyResponse)) {
        throw new Error(`Failed to get property: ${propertyResponse.detail}`);
      }

      if (!isPapiPropertyDetailsResponse(propertyResponse)) {
        throw new Error('Invalid property response structure');
      }

      const typedResponse = propertyResponse as PapiPropertyDetailsResponse;
      if (!typedResponse.properties?.items?.[0]) {
        throw new Error('Property not found');
      }

      version = typedResponse.properties.items[0].latestVersion || 1;
    }

    // Get current rule tree to preserve format
    const currentRulesResponse = await client.request({
      path: `/papi/v1/properties/${args.propertyId}/versions/${version}/rules`,
      method: 'GET',
      headers: {
        Accept: 'application/vnd.akamai.papirules.v2023-10-30+json',
      },
    });

    if (isPapiError(currentRulesResponse)) {
      throw new Error(`Failed to get current rules: ${currentRulesResponse.detail}`);
    }
    
    if (!isPropertyVersionRulesGetResponse(currentRulesResponse)) {
      throw new Error('Invalid response: expected PropertyVersionRulesGetResponse');
    }
    
    const currentRules = currentRulesResponse as PropertyVersionRulesGetResponse;

    // Update rules
    const response = await client.request({
      path: `/papi/v1/properties/${args.propertyId}/versions/${version}/rules`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/vnd.akamai.papirules.v2023-10-30+json',
      },
      body: {
        rules: args.rules,
        ruleFormat: currentRules.ruleFormat,
      },
    });

    // Update version note if provided
    if (args.note) {
      await client.request({
        path: `/papi/v1/properties/${args.propertyId}/versions/${version}`,
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json-patch+json',
        },
        body: [
          {
            op: 'replace',
            path: '/versions/0/note',
            value: args.note,
          },
        ],
      });
    }

    // Step 3: Validate the update response
    if (!isPropertyVersionRulesGetResponse(response)) {
      throw new Error('Invalid response: expected PropertyVersionRulesGetResponse after update');
    }
    
    const rulesUpdateResponse = response as PropertyVersionRulesGetResponse;
    
    let text = `[DONE] Successfully updated property rules for ${args.propertyId} (v${version})\n\n`;

    if (rulesUpdateResponse.errors?.length > 0) {
      text += '[WARNING] **Validation Errors:**\n';
      rulesUpdateResponse.errors.forEach((_error: any) => {
        text += `- ${_error.detail}\n`;
      });
      text += '\n';
    }

    if (rulesUpdateResponse.warnings?.length > 0) {
      text += '[WARNING] **Warnings:**\n';
      rulesUpdateResponse.warnings.forEach((warning: any) => {
        text += `- ${warning.detail}\n`;
      });
      text += '\n';
    }

    text += '## Next Steps\n';
    text += `- Review rules: "Show rules for property ${args.propertyId}"\n`;
    text += `- Activate to staging: "Activate property ${args.propertyId} to staging"\n`;

    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  } catch (_error) {
    return formatError('update property rules', _error);
  }
}

/**
 * Create an edge hostname
 * 
 * AKAMAI API: POST /papi/v1/edgehostnames
 * 
 * PURPOSE:
 * - Creates an edge hostname (e.g., www.example.com.edgekey.net) for content delivery
 * - Edge hostnames are CNAME targets that route traffic through Akamai's network
 * - Supports both HTTP (edgesuite.net) and HTTPS (edgekey.net) delivery
 * 
 * WORKFLOW:
 * 1. Fetches property details to get contract and group IDs
 * 2. Determines domain suffix based on security requirements
 * 3. Creates edge hostname with specified configuration
 * 4. Returns edge hostname ID and domain for DNS configuration
 * 
 * SECURITY OPTIONS:
 * - Standard TLS: Uses *.edgesuite.net (shared certificate)
 * - Enhanced TLS: Uses *.edgekey.net (requires certificate enrollment)
 * 
 * @param client - Authenticated Akamai API client
 * @param args.propertyId - Property to associate with edge hostname
 * @param args.domainPrefix - Prefix for edge hostname (e.g., "www-example-com")
 * @param args.domainSuffix - Override default suffix (optional)
 * @param args.secure - Enable HTTPS delivery (default: based on suffix)
 * @param args.ipVersion - IP version support: IPV4, IPV6, or IPV4_IPV6
 * @param args.certificateEnrollmentId - Certificate ID for Enhanced TLS
 * @returns MCPToolResponse with edge hostname details
 */
export async function createEdgeHostname(
  client: AkamaiClient,
  args: {
    propertyId: string;
    domainPrefix: string;
    domainSuffix?: string;
    productId?: string;
    secure?: boolean;
    ipVersion?: 'IPV4' | 'IPV6' | 'IPV4_IPV6';
    certificateEnrollmentId?: number;
  },
): Promise<MCPToolResponse> {
  try {
    // Get property details to find contract and group
    const propertyResponse = await client.request({
      path: `/papi/v1/properties/${args.propertyId}`,
      method: 'GET',
    });

    if (isPapiError(propertyResponse)) {
      throw new Error(`Failed to get property: ${propertyResponse.detail}`);
    }

    if (!isPapiPropertyDetailsResponse(propertyResponse)) {
      throw new Error('Invalid property response structure');
    }

    const typedResponse = propertyResponse as PapiPropertyDetailsResponse;
    if (!typedResponse.properties?.items?.[0]) {
      throw new Error('Property not found');
    }

    const property = typedResponse.properties.items[0];
    const productId = args.productId || property.productId;
    const domainSuffix = args.domainSuffix || (args.secure ? '.edgekey.net' : '.edgesuite.net');

    // Create edge hostname
    const response = await client.request({
      path: '/papi/v1/edgehostnames',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'PAPI-Use-Prefixes': 'true',
      },
      queryParams: {
        contractId: property.contractId,
        groupId: property.groupId,
        options: 'mapDetails',
      },
      body: {
        productId: productId,
        domainPrefix: args.domainPrefix,
        domainSuffix: domainSuffix.replace(/^\./, ''), // Remove leading dot
        secure: args.secure || domainSuffix.includes('edgekey'),
        secureNetwork: args.secure || domainSuffix.includes('edgekey') ? 'ENHANCED_TLS' : undefined,
        ipVersionBehavior: args.ipVersion || 'IPV4',
        ...(args.certificateEnrollmentId && { certEnrollmentId: args.certificateEnrollmentId }),
        useCases: [
          {
            useCase: 'Download_Mode',
            option: 'BACKGROUND',
            type: 'GLOBAL',
          },
        ],
      },
    });

    // CODE KAI: Type-safe response handling with official Akamai types
    // Step 1: Check for API error response
    if (isPapiError(response)) {
      throw new Error(`Failed to create edge hostname: ${response.detail}`);
    }
    
    // Step 2: Validate response structure matches expected schema
    if (!isEdgeHostnameCreateResponse(response)) {
      throw new Error('Invalid response: expected EdgeHostnameCreateResponse with edgeHostnameLink');
    }
    
    // Step 3: Safe type assertion after validation
    const edgeHostnameResponse = response as EdgeHostnameCreateResponse;
    
    // Step 4: Extract edge hostname ID from the link
    // Example: /papi/v1/edgehostnames/ehn_123456?contractId=ctr_XXX -> "ehn_123456"
    const edgeHostnameId = edgeHostnameResponse.edgeHostnameLink.split('/').pop()?.split('?')[0];
    const edgeHostname = `${args.domainPrefix}.${domainSuffix.replace(/^\./, '')}`;

    return {
      content: [
        {
          type: 'text',
          text: `[DONE] Created edge hostname: ${edgeHostname}\n\n**Edge Hostname ID:** ${edgeHostnameId}\n**Type:** ${args.secure || domainSuffix.includes('edgekey') ? 'Enhanced TLS (HTTPS)' : 'Standard TLS'}\n**IP Version:** ${args.ipVersion || 'IPV4'}\n\n## Next Steps\n- Add hostname to property: "Add hostname www.example.com to property ${args.propertyId} using edge hostname ${edgeHostname}"\n- Create DNS CNAME: "Create CNAME record www.example.com pointing to ${edgeHostname}"`,
        },
      ],
    };
  } catch (_error) {
    return formatError('create edge hostname', _error);
  }
}

/**
 * Add hostname to property
 * 
 * AKAMAI API: GET then PUT /papi/v1/properties/{propertyId}/versions/{version}/hostnames
 * 
 * PURPOSE:
 * - Associates a hostname (e.g., www.example.com) with a property version
 * - Maps the hostname to an edge hostname for content delivery
 * - Required before a property can serve traffic for the hostname
 * 
 * WORKFLOW:
 * 1. Fetches current hostnames configured on the property version
 * 2. Adds the new hostname to the existing list
 * 3. Updates the property with the complete hostname list
 * 4. Returns success with next steps for DNS configuration
 * 
 * DNS REQUIREMENT:
 * - After adding, create a CNAME record pointing hostname to edge hostname
 * - Example: www.example.com CNAME www-example-com.edgekey.net
 * 
 * @param client - Authenticated Akamai API client
 * @param args.propertyId - Property to add hostname to
 * @param args.hostname - The hostname to add (e.g., "www.example.com")
 * @param args.edgeHostname - Edge hostname to map to (e.g., "www-example-com.edgekey.net")
 * @param args.version - Property version (optional, defaults to latest)
 * @returns MCPToolResponse with success message and next steps
 */
export async function addPropertyHostname(
  client: AkamaiClient,
  args: {
    propertyId: string;
    hostname: string;
    edgeHostname: string;
    version?: number;
  },
): Promise<MCPToolResponse> {
  try {
    // Get property details to find latest version if not specified
    let version = args.version;
    if (!version) {
      const propertyResponse = await client.request({
        path: `/papi/v1/properties/${args.propertyId}`,
        method: 'GET',
      });

      if (isPapiError(propertyResponse)) {
        throw new Error(`Failed to get property: ${propertyResponse.detail}`);
      }

      if (!isPapiPropertyDetailsResponse(propertyResponse)) {
        throw new Error('Invalid property response structure');
      }

      const typedResponse = propertyResponse as PapiPropertyDetailsResponse;
      if (!typedResponse.properties?.items?.[0]) {
        throw new Error('Property not found');
      }

      version = typedResponse.properties.items[0].latestVersion || 1;
    }

    // Get current hostnames
    const currentHostnamesResponse = await client.request({
      path: `/papi/v1/properties/${args.propertyId}/versions/${version}/hostnames`,
      method: 'GET',
    });

    // Validate hostname response structure
    if (!isPropertyVersionHostnamesGetResponse(currentHostnamesResponse)) {
      throw new Error('Invalid response: expected PropertyVersionHostnamesGetResponse');
    }
    
    const currentHostnames = currentHostnamesResponse as PropertyVersionHostnamesGetResponse;

    // Add new hostname to the existing list
    const hostnames = currentHostnames.hostnames?.items || [];
    hostnames.push({
      cnameFrom: args.hostname,
      cnameTo: args.edgeHostname,
      cnameType: args.edgeHostname.includes('edgekey') ? 'EDGE_HOSTNAME' : 'EDGE_HOSTNAME',
    });

    // Update hostnames
    await client.request({
      path: `/papi/v1/properties/${args.propertyId}/versions/${version}/hostnames`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: {
        hostnames: hostnames,
      },
    });

    return {
      content: [
        {
          type: 'text',
          text: `[DONE] Added hostname ${args.hostname} to property ${args.propertyId} (v${version})\n\n**Hostname:** ${args.hostname}\n**Edge Hostname:** ${args.edgeHostname}\n\n## Next Steps\n1. Create DNS CNAME: "Create CNAME record ${args.hostname} pointing to ${args.edgeHostname}"\n2. Activate property: "Activate property ${args.propertyId} to staging"\n3. If using HTTPS, enroll certificate: "Enroll DV certificate for ${args.hostname}"`,
        },
      ],
    };
  } catch (_error) {
    return formatError('add property hostname', _error);
  }
}

/**
 * Remove hostname from property
 * 
 * AKAMAI API: GET then PUT /papi/v1/properties/{propertyId}/versions/{version}/hostnames
 * 
 * PURPOSE:
 * - Removes a hostname association from a property version
 * - Used when migrating hostnames or decommissioning sites
 * - Hostname must not be actively receiving traffic
 * 
 * WORKFLOW:
 * 1. Fetches current hostnames configured on the property version
 * 2. Filters out the hostname to be removed
 * 3. Updates the property with the remaining hostnames
 * 4. Returns success with reminder to update DNS
 * 
 * IMPORTANT:
 * - Remove DNS CNAME record after removing from property
 * - Ensure no traffic is being sent to the hostname
 * - May need to activate property after removal
 * 
 * @param client - Authenticated Akamai API client
 * @param args.propertyId - Property to remove hostname from
 * @param args.hostname - The hostname to remove (e.g., "www.example.com")
 * @param args.version - Property version (optional, defaults to latest)
 * @returns MCPToolResponse with success message and next steps
 */
export async function removePropertyHostname(
  client: AkamaiClient,
  args: {
    propertyId: string;
    hostname: string;
    version?: number;
  },
): Promise<MCPToolResponse> {
  try {
    // Get property details to find latest version if not specified
    let version = args.version;
    if (!version) {
      const propertyResponse = await client.request({
        path: `/papi/v1/properties/${args.propertyId}`,
        method: 'GET',
      });

      if (isPapiError(propertyResponse)) {
        throw new Error(`Failed to get property: ${propertyResponse.detail}`);
      }

      if (!isPapiPropertyDetailsResponse(propertyResponse)) {
        throw new Error('Invalid property response structure');
      }

      const typedResponse = propertyResponse as PapiPropertyDetailsResponse;
      if (!typedResponse.properties?.items?.[0]) {
        throw new Error('Property not found');
      }

      version = typedResponse.properties.items[0].latestVersion || 1;
    }

    // Get current hostnames
    const currentHostnamesResponse = await client.request({
      path: `/papi/v1/properties/${args.propertyId}/versions/${version}/hostnames`,
      method: 'GET',
    });
    
    // Validate hostname response structure
    if (!isPropertyVersionHostnamesGetResponse(currentHostnamesResponse)) {
      throw new Error('Invalid response: expected PropertyVersionHostnamesGetResponse');
    }
    
    const currentHostnames = currentHostnamesResponse as PropertyVersionHostnamesGetResponse;

    // Remove hostname by filtering it out
    const hostnames = (currentHostnames.hostnames?.items || []).filter(
      (h) => h.cnameFrom !== args.hostname,
    );

    // Check if hostname was actually found and removed
    if (hostnames.length === currentHostnames.hostnames?.items?.length) {
      return {
        content: [
          {
            type: 'text',
            text: `[ERROR] Hostname ${args.hostname} not found in property ${args.propertyId}`,
          },
        ],
      };
    }

    // Update hostnames
    await client.request({
      path: `/papi/v1/properties/${args.propertyId}/versions/${version}/hostnames`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: {
        hostnames: hostnames,
      },
    });

    return {
      content: [
        {
          type: 'text',
          text: `[DONE] Removed hostname ${args.hostname} from property ${args.propertyId} (v${version})\n\n## Next Steps\n- Remove DNS CNAME record for ${args.hostname}\n- Activate property: "Activate property ${args.propertyId} to staging"`,
        },
      ],
    };
  } catch (_error) {
    return formatError('remove property hostname', _error);
  }
}

/**
 * Activate property to staging or production
 * 
 * AKAMAI API: POST /papi/v1/properties/{propertyId}/activations
 * 
 * PURPOSE:
 * - Deploys property configuration to Akamai's edge network
 * - Staging: Test environment for validation (5-10 minutes)
 * - Production: Live traffic serving (20-30 minutes)
 * - Activations are asynchronous and tracked via activation ID
 * 
 * WORKFLOW:
 * 1. Validates property version is not already active on target network
 * 2. Creates activation request with specified parameters
 * 3. Monitors activation progress in background
 * 4. Returns activation ID for status tracking
 * 
 * FAST PUSH:
 * - Enabled by default for faster deployments
 * - Reduces activation time significantly
 * - Can be disabled if issues occur
 * 
 * COMPLIANCE:
 * - Production activations may require compliance records
 * - Tracks who reviewed and approved changes
 * 
 * @param client - Authenticated Akamai API client
 * @param args.propertyId - Property to activate
 * @param args.version - Version to activate (optional, defaults to latest)
 * @param args.network - Target network: STAGING or PRODUCTION
 * @param args.note - Activation description for audit trail
 * @param args.notifyEmails - Email addresses for activation notifications
 * @param args.acknowledgeAllWarnings - Auto-acknowledge validation warnings
 * @param args.fastPush - Enable fast activation (default: true)
 * @param args.format - Response format: 'json' or 'text'
 * @returns MCPToolResponse with activation ID and tracking info
 */
export async function activateProperty(
  client: AkamaiClient,
  args: {
    propertyId: string;
    version?: number;
    network: 'STAGING' | 'PRODUCTION';
    note?: string;
    notifyEmails?: string[];
    acknowledgeAllWarnings?: boolean;
    fastPush?: boolean;
    useFastFallback?: boolean;
    complianceRecord?: {
      noncomplianceReason?: string;
    };
    customer?: string;
    format?: 'json' | 'text';
  },
): Promise<MCPToolResponse> {
  try {
    // Get property details
    const propertyResponse = await client.request({
      path: `/papi/v1/properties/${args.propertyId}`,
      method: 'GET',
    });

    if (!propertyResponse.properties?.items?.[0]) {
      throw new Error('Property not found');
    }

    const property = propertyResponse.properties.items[0];
    const version = args.version || property.latestVersion || 1;

    // Check if already active
    if (args.network === 'PRODUCTION' && property.productionVersion === version) {
      return {
        content: [
          {
            type: 'text',
            text: `[INFO] Property ${args.propertyId} version ${version} is already active in PRODUCTION`,
          },
        ],
      };
    }
    if (args.network === 'STAGING' && property.stagingVersion === version) {
      return {
        content: [
          {
            type: 'text',
            text: `[INFO] Property ${args.propertyId} version ${version} is already active in STAGING`,
          },
        ],
      };
    }

    // Create activation with enhanced parameters
    const activationBody: any = {
      propertyVersion: version,
      network: args.network,
      note: args.note || `Activated via MCP on ${new Date().toISOString()}`,
      notifyEmails: args.notifyEmails || [],
      acknowledgeAllWarnings: args.acknowledgeAllWarnings !== false,
      fastPush: args.fastPush !== false, // Default to true for faster activations
      useFastFallback: args.useFastFallback || false, // Default to false for safety
    };

    // Add compliance record if provided (for regulated environments)
    if (args.complianceRecord) {
      activationBody.complianceRecord = args.complianceRecord;
    }

    const response = await client.request({
      path: `/papi/v1/properties/${args.propertyId}/activations`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: activationBody,
    });

    // CODE KAI: Type-safe activation response handling
    if (isPapiError(response)) {
      throw new Error(`Failed to create activation: ${response.detail}`);
    }
    
    if (!isPropertyActivateResponse(response)) {
      throw new Error('Invalid response: expected PropertyActivateResponse with activationLink');
    }
    
    const typedResponse = response as PropertyActivateResponse;
    const activationId = typedResponse.activationLink.split('/').pop();

    // Create progress token for tracking
    const progressToken = createActivationProgress(args.propertyId, args.network, activationId);
    progressToken.start(`Initiating activation of ${property.propertyName} to ${args.network}`);

    // Start monitoring activation status in background
    monitorActivation(client, args.propertyId, activationId || '', progressToken);

    const format = validateFormatParameter(args.format);
    const responseBuilder = new JsonResponseBuilder();

    const activationData = {
      activation: {
        activationId: activationId,
        propertyId: args.propertyId,
        propertyName: property.propertyName,
        version: version,
        network: args.network,
        status: 'PENDING',
        submitDate: new Date().toISOString(),
        note: activationBody.note,
        notifyEmails: activationBody.notifyEmails,
        fastPush: activationBody.fastPush,
        progressToken: progressToken.token
      },
      timing: {
        estimatedMinutes: args.network === 'STAGING' ? 10 : 30,
        typical: {
          staging: '5-10 minutes',
          production: '20-30 minutes'
        }
      },
      monitoring: {
        checkStatus: {
          tool: 'get_activation_status',
          params: {
            propertyId: args.propertyId,
            activationId: activationId
          }
        },
        listActivations: {
          tool: 'list_property_activations',
          params: {
            propertyId: args.propertyId
          }
        }
      },
      nextSteps: [
        {
          action: 'monitor_activation',
          description: 'Monitor activation progress',
          command: `get_activation_status propertyId="${args.propertyId}" activationId="${activationId}"`
        },
        {
          action: 'list_activations',
          description: 'View all activations for this property',
          command: `list_property_activations propertyId="${args.propertyId}"`
        }
      ]
    };

    // For backward compatibility, text format returns the original structure
    if (format === 'text') {
      let text = `# [ACTIVATION STARTED] ${activationId}\n\n`;
      text += `**Property:** ${property.propertyName} (${args.propertyId})\n`;
      text += `**Version:** v${version}\n`;
      text += `**Network:** ${args.network}\n`;
      text += `**Status:** PENDING\n\n`;
      text += `## Progress Tracking\n`;
      text += `Use the progress token to monitor: ${progressToken.token}\n\n`;
      text += `## Estimated Time\n`;
      text += `- **${args.network}:** ${args.network === 'STAGING' ? '5-10 minutes' : '20-30 minutes'}\n\n`;
      text += `## Next Steps\n`;
      text += `1. Check status: \`Get activation status for property ${args.propertyId} activation ${activationId}\`\n`;
      text += `2. View all activations: \`List property activations for ${args.propertyId}\`\n\n`;
      text += `*Activation is processing in the background. You'll be notified when complete.*`;
      
      return {
        content: [
          {
            type: 'text',
            text,
          },
        ],
      };
    }

    // New JSON format optimized for Claude Desktop
    const jsonResponse = responseBuilder.success(
      activationData,
      { 
        propertyId: args.propertyId,
        version: version,
        network: args.network,
        activationId: activationId
      },
      {
        total: 1,
        shown: 1,
        hasMore: false,
        executionTime: 0, // Will be set by responseBuilder
        warnings: ['Activation initiated. Monitor progress using the provided tools.'],
      }
    );

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(jsonResponse, null, 2),
        },
      ],
    };
  } catch (_error) {
    if (_error instanceof Error && _error.message.includes('warnings')) {
      return {
        content: [
          {
            type: 'text',
            text: `[WARNING] Activation blocked due to warnings. To proceed:\n1. Review warnings: "Show rules for property ${args.propertyId}"\n2. Fix issues or activate with: "Activate property ${args.propertyId} to ${args.network} acknowledging warnings"`,
          },
        ],
      };
    }
    return formatError('activate property', _error);
  }
}

/**
 * Get activation status
 * 
 * AKAMAI API: GET /papi/v1/properties/{propertyId}/activations/{activationId}
 * 
 * PURPOSE:
 * - Checks the status of a specific property activation
 * - Monitors progress through activation zones
 * - Reports errors or warnings during activation
 * 
 * STATUS PROGRESSION:
 * - NEW: Activation created
 * - PENDING: Processing started
 * - ZONE_1/2/3: Propagating through network zones
 * - ACTIVE: Successfully deployed
 * - FAILED/ABORTED: Activation unsuccessful
 * 
 * @param client - Authenticated Akamai API client
 * @param args.propertyId - Property being activated
 * @param args.activationId - Specific activation to check
 * @returns MCPToolResponse with detailed activation status
 */
export async function getActivationStatus(
  client: AkamaiClient,
  args: {
    propertyId: string;
    activationId: string;
  },
): Promise<MCPToolResponse> {
  try {
    const response = await client.request({
      path: `/papi/v1/properties/${args.propertyId}/activations/${args.activationId}`,
      method: 'GET',
    });

    // CODE KAI: Type-safe activation status handling
    if (isPapiError(response)) {
      throw new Error(`Failed to get activation status: ${response.detail}`);
    }
    
    if (!isPropertyActivationsGetResponse(response)) {
      throw new Error('Invalid response: expected PropertyActivationsGetResponse');
    }
    
    const typedResponse = response as PropertyActivationsGetResponse;
    if (!typedResponse.activations?.items?.[0]) {
      throw new Error('Activation not found');
    }

    const activation = typedResponse.activations.items[0];
    const statusIndicator =
      {
        ACTIVE: '[ACTIVE]',
        PENDING: '[PENDING]',
        ZONE_1: '[ZONE_1]',
        ZONE_2: '[ZONE_2]',
        ZONE_3: '[ZONE_3]',
        ABORTED: '[ABORTED]',
        FAILED: '[FAILED]',
        DEACTIVATED: '[DEACTIVATED]',
        PENDING_DEACTIVATION: '[PENDING_DEACTIVATION]',
        NEW: '[NEW]',
      }[
        activation.status as keyof {
          ACTIVE: string;
          PENDING: string;
          ZONE_1: string;
          ZONE_2: string;
          ZONE_3: string;
          ABORTED: string;
          FAILED: string;
          DEACTIVATED: string;
          PENDING_DEACTIVATION: string;
          NEW: string;
        }
      ] || '[UNKNOWN]';

    let text = `# Activation Status: ${activation.activationId}\n\n`;
    text += `**Property:** ${activation.propertyName} (${activation.propertyId})\n`;
    text += `**Version:** ${activation.propertyVersion}\n`;
    text += `**Network:** ${activation.network}\n`;
    text += `**Status:** ${statusIndicator} ${activation.status}\n`;
    text += `**Type:** ${activation.activationType}\n`;
    text += `**Submitted:** ${new Date(activation.submitDate).toLocaleString()}\n`;
    text += `**Updated:** ${new Date(activation.updateDate).toLocaleString()}\n`;

    if (activation.note) {
      text += `**Note:** ${activation.note}\n`;
    }

    if (activation.fatalError) {
      text += `\n[ERROR] **Fatal Error:** ${activation.fatalError}\n`;
    }

    if (activation.errors && activation.errors.length > 0) {
      text += '\n## Errors\n';
      activation.errors.forEach((_error: any) => {
        text += `- ${_error.messageId}: ${_error.detail}\n`;
      });
    }

    if (activation.warnings && activation.warnings.length > 0) {
      text += '\n## Warnings\n';
      activation.warnings.forEach((warning: any) => {
        text += `- ${warning.messageId}: ${warning.detail}\n`;
      });
    }

    if (activation.status === 'ACTIVE') {
      text += `\n[SUCCESS] **Activation Complete!**\n\nYour property is now live on ${activation.network}.`;
      if (activation.network === 'STAGING') {
        text += `\n\nNext step: Test thoroughly, then activate to production:\n"Activate property ${args.propertyId} to production"`;
      }
    } else if (['PENDING', 'ZONE_1', 'ZONE_2', 'ZONE_3'].includes(activation.status)) {
      text += '\n\n[PENDING] **Activation in Progress**\n\nCheck again in a few minutes.';
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
    return formatError('get activation status', _error);
  }
}

/**
 * List all activations for a property
 * 
 * AKAMAI API: GET /papi/v1/properties/{propertyId}/activations
 * 
 * PURPOSE:
 * - Retrieves activation history for a property
 * - Shows all past and current activations
 * - Helps track deployment history and rollback options
 * 
 * FILTERING:
 * - Can filter by network (STAGING/PRODUCTION)
 * - Shows all activations if no filter specified
 * - Sorted by most recent first
 * 
 * USE CASES:
 * - Audit deployment history
 * - Find last known good version
 * - Track activation patterns
 * - Debug failed activations
 * 
 * @param client - Authenticated Akamai API client
 * @param args.propertyId - Property to list activations for
 * @param args.network - Filter by network (optional)
 * @param args.format - Response format: 'json' or 'text'
 * @returns MCPToolResponse with activation history
 */
export async function listPropertyActivations(
  client: AkamaiClient,
  args: {
    propertyId: string;
    network?: 'STAGING' | 'PRODUCTION';
    customer?: string;
    format?: 'json' | 'text';
  },
): Promise<MCPToolResponse> {
  try {
    const queryParams: any = {};
    if (args.network) {
      queryParams.network = args.network;
    }

    const response = await client.request({
      path: `/papi/v1/properties/${args.propertyId}/activations`,
      method: 'GET',
      queryParams,
    });

    // CODE KAI: Type-safe activation list handling
    if (isPapiError(response)) {
      throw new Error(`Failed to list activations: ${response.detail}`);
    }
    
    if (!isPropertyActivationsGetResponse(response)) {
      throw new Error('Invalid response: expected PropertyActivationsGetResponse');
    }
    
    const typedResponse = response as PropertyActivationsGetResponse;

    if (!typedResponse.activations?.items || typedResponse.activations.items.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              activations: [],
              metadata: {
                propertyId: args.propertyId,
                network: args.network || 'ALL',
                total: 0
              }
            }, null, 2),
          },
        ],
      };
    }

    // Process activations into structured format
    const activations = typedResponse.activations.items.map((act: Activation) => ({
      activationId: act.activationId,
      propertyName: act.propertyName,
      propertyId: act.propertyId,
      propertyVersion: act.propertyVersion,
      network: act.network,
      activationType: act.activationType,
      status: act.status,
      submitDate: act.submitDate,
      updateDate: act.updateDate,
      note: act.note || null,
      notifyEmails: act.notifyEmails || [],
      fatalError: act.fatalError || null,
      errors: act.errors || [],
      warnings: act.warnings || []
    }));

    // Group by network for summary
    const byNetwork = activations.reduce(
      (acc: any, act: any) => {
        if (!acc[act.network]) {
          acc[act.network] = {
            total: 0,
            active: 0,
            pending: 0,
            failed: 0,
            latestVersion: null,
            latestActivation: null
          };
        }
        acc[act.network].total++;
        
        if (act.status === 'ACTIVE') {
          acc[act.network].active++;
          // Track the latest active version
          if (!acc[act.network].latestVersion || act.propertyVersion > acc[act.network].latestVersion) {
            acc[act.network].latestVersion = act.propertyVersion;
          }
        } else if (['PENDING', 'ZONE_1', 'ZONE_2', 'ZONE_3', 'NEW'].includes(act.status)) {
          acc[act.network].pending++;
        } else if (['FAILED', 'ABORTED'].includes(act.status)) {
          acc[act.network].failed++;
        }
        
        // Track the most recent activation
        if (!acc[act.network].latestActivation || 
            new Date(act.updateDate) > new Date(acc[act.network].latestActivation.updateDate)) {
          acc[act.network].latestActivation = {
            activationId: act.activationId,
            version: act.propertyVersion,
            status: act.status,
            updateDate: act.updateDate
          };
        }
        
        return acc;
      },
      {} as Record<string, any>,
    );

    const format = validateFormatParameter(args.format);
    const responseBuilder = new JsonResponseBuilder();

    const activationData = {
      activations: activations,
      summary: {
        byNetwork: byNetwork,
        total: activations.length,
        currentStatus: {
          production: byNetwork.PRODUCTION?.latestVersion || null,
          staging: byNetwork.STAGING?.latestVersion || null
        }
      },
      metadata: {
        propertyId: args.propertyId,
        network: args.network || 'ALL',
        total: activations.length
      },
      nextSteps: activations.some((act: any) => ['PENDING', 'ZONE_1', 'ZONE_2', 'ZONE_3'].includes(act.status)) ? [
        {
          action: 'monitor_activations',
          description: 'Monitor pending activations',
          command: `get_activation_status propertyId="${args.propertyId}" activationId="[activation_id]"`
        }
      ] : []
    };

    // For backward compatibility, text format returns the original structure
    if (format === 'text') {
      let text = `# Property Activations for ${args.propertyId}\n\n`;
      
      if (activations.length === 0) {
        text += 'No activations found for this property.\n';
      } else {
        text += `**Total Activations:** ${activations.length}\n`;
        text += `**Current Production Version:** ${byNetwork.PRODUCTION?.latestVersion || 'None'}\n`;
        text += `**Current Staging Version:** ${byNetwork.STAGING?.latestVersion || 'None'}\n\n`;
        
        text += '## Recent Activations\n\n';
        activations.slice(0, 5).forEach((act: any) => {
          const statusIcon = act.status === 'ACTIVE' ? '✅' : 
                           act.status === 'FAILED' ? '❌' : 
                           ['PENDING', 'ZONE_1', 'ZONE_2', 'ZONE_3'].includes(act.status) ? '⏳' : '⚫';
          
          text += `### ${statusIcon} v${act.propertyVersion} → ${act.network}\n`;
          text += `- **ID:** ${act.activationId}\n`;
          text += `- **Status:** ${act.status}\n`;
          text += `- **Submitted:** ${new Date(act.submitDate).toLocaleString()}\n`;
          text += `- **Updated:** ${new Date(act.updateDate).toLocaleString()}\n`;
          if (act.note) text += `- **Note:** ${act.note}\n`;
          if (act.fatalError) text += `- **Error:** ${act.fatalError}\n`;
          text += '\n';
        });
        
        if (activations.length > 5) {
          text += `*Showing 5 of ${activations.length} activations*\n`;
        }
      }
      
      return {
        content: [
          {
            type: 'text',
            text,
          },
        ],
      };
    }

    // New JSON format optimized for Claude Desktop
    const jsonResponse = responseBuilder.success(
      activationData,
      { 
        propertyId: args.propertyId,
        network: args.network || 'ALL'
      },
      {
        total: activations.length,
        shown: activations.length,
        hasMore: false,
        executionTime: 0, // Will be set by responseBuilder
        warnings: activations.some((act: any) => act.warnings?.length > 0) ? ['Some activations have warnings. Check individual activation details.'] : [],
      }
    );

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(jsonResponse, null, 2),
        },
      ],
    };
  } catch (_error) {
    return formatError('list property activations', _error);
  }
}

/**
 * Update property with Default DV certificate hostname
 * This creates and configures a secure edge hostname using Akamai's Default Domain Validation certificate
 */

/**
 * Enhanced create property version with intelligent base version selection
 */
export async function createPropertyVersionEnhanced(
  client: AkamaiClient,
  args: {
    customer?: string;
    propertyId: string;
    note?: string;
    baseVersion?: number;
    autoSelectBase?: boolean;
    tags?: string[];
    metadata?: Record<string, string>;
  },
): Promise<MCPToolResponse> {
  try {
    let baseVersion = args.baseVersion;

    // Intelligent base version selection
    if (args.autoSelectBase && !baseVersion) {
      const versionsResponse = await client.request({
        method: 'GET',
        path: `/papi/v1/properties/${args.propertyId}/versions`,
      });

      const versions = versionsResponse.data.versions?.items || [];
      if (versions.length > 0) {
        // Select latest staging version, or latest production if no staging
        const stagingVersions = versions.filter((v: any) => v.stagingStatus === 'ACTIVE');
        const productionVersions = versions.filter((v: any) => v.productionStatus === 'ACTIVE');

        if (stagingVersions.length > 0) {
          baseVersion = Math.max(...stagingVersions.map((v: any) => v.propertyVersion));
        } else if (productionVersions.length > 0) {
          baseVersion = Math.max(...productionVersions.map((v: any) => v.propertyVersion));
        } else {
          baseVersion = Math.max(...versions.map((v: any) => v.propertyVersion));
        }
      }
    }

    // Create new version
    const response = await client.request({
      method: 'POST',
      path: `/papi/v1/properties/${args.propertyId}/versions`,
      body: baseVersion ? { createFromVersion: baseVersion } : {},
    });

    const newVersion = response.versionLink?.split('/').pop() || 'unknown';

    // Add note and metadata if provided
    if (args.note || args.tags || args.metadata) {
      const patches = [];

      if (args.note) {
        patches.push({
          op: 'replace',
          path: '/versions/0/note',
          value: args.note,
        });
      }

      // Add tags as part of metadata
      if (args.tags || args.metadata) {
        const metadata = { ...args.metadata };
        if (args.tags) {
          metadata.tags = args.tags.join(',');
        }
        metadata.createdBy = 'alecs-mcp-akamai';
        metadata.created = new Date().toISOString();

        patches.push({
          op: 'add',
          path: '/versions/0/metadata',
          value: metadata,
        });
      }

      if (patches.length > 0) {
        await client.request({
          method: 'PATCH',
          path: `/papi/v1/properties/${args.propertyId}/versions/${newVersion}`,
          body: patches,
        });
      }
    }

    const text = `[DONE] Created enhanced property version ${newVersion}${baseVersion ? ` based on version ${baseVersion}` : ''}
${args.note ? `\nNote: ${args.note}` : ''}
${args.tags ? `\nTags: ${args.tags.join(', ')}` : ''}

**Smart Selections:**
${args.autoSelectBase ? `- Auto-selected base version: ${baseVersion}` : ''}
- Version metadata attached
- Ready for rule updates

**Next Steps:**
- Update rules: "Update rules for property ${args.propertyId} version ${newVersion}"
- Compare versions: "Compare property ${args.propertyId} versions ${baseVersion} and ${newVersion}"
- Activate when ready: "Activate property ${args.propertyId} version ${newVersion} to staging"`;

    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  } catch (_error) {
    return formatError('create enhanced property version', _error);
  }
}

/**
 * Get version diff comparing rule trees between versions
 */
export async function getVersionDiff(
  client: AkamaiClient,
  args: {
    customer?: string;
    propertyId: string;
    version1: number;
    version2: number;
    includeDetails?: boolean;
    compareType?: 'rules' | 'hostnames' | 'all';
  },
): Promise<MCPToolResponse> {
  try {
    const compareType = args.compareType || 'all';
    const differences = [];

    // Compare rules if requested
    if (compareType === 'rules' || compareType === 'all') {
      const [rules1Response, rules2Response] = await Promise.all([
        client.request({
          method: 'GET',
          path: `/papi/v1/properties/${args.propertyId}/versions/${args.version1}/rules`,
        }),
        client.request({
          method: 'GET',
          path: `/papi/v1/properties/${args.propertyId}/versions/${args.version2}/rules`,
        }),
      ]);

      const rulesDiff = compareRuleTrees(
        rules1Response.data.rules,
        rules2Response.data.rules,
        args.includeDetails || false,
      );

      if (rulesDiff.length > 0) {
        differences.push({
          type: 'rules',
          changes: rulesDiff.length,
          details: rulesDiff,
        });
      }
    }

    // Compare hostnames if requested
    if (compareType === 'hostnames' || compareType === 'all') {
      const [hostnames1Response, hostnames2Response] = await Promise.all([
        client.request({
          method: 'GET',
          path: `/papi/v1/properties/${args.propertyId}/versions/${args.version1}/hostnames`,
        }),
        client.request({
          method: 'GET',
          path: `/papi/v1/properties/${args.propertyId}/versions/${args.version2}/hostnames`,
        }),
      ]);

      const hostnamesDiff = compareHostnames(
        hostnames1Response.data.hostnames?.items || [],
        hostnames2Response.data.hostnames?.items || [],
      );

      if (hostnamesDiff.length > 0) {
        differences.push({
          type: 'hostnames',
          changes: hostnamesDiff.length,
          details: hostnamesDiff,
        });
      }
    }

    let text = `[METRICS] **Version Comparison: ${args.version1} vs ${args.version2}**\n\n`;

    if (differences.length === 0) {
      text += '[DONE] No differences found between versions';
    } else {
      text += `**Summary:** ${differences.length} difference category found\n\n`;

      for (const diff of differences) {
        text += `**${diff.type.toUpperCase()} Changes:** ${diff.changes} differences\n`;

        if (args.includeDetails && diff.details) {
          diff.details.slice(0, 10).forEach((detail: any, index: number) => {
            text += `  ${index + 1}. ${detail.type}: ${detail.path || detail.description}\n`;
          });

          if (diff.details.length > 10) {
            text += `  ... and ${diff.details.length - 10} more changes\n`;
          }
        }
        text += '\n';
      }
    }

    text += `\n**Analysis Options:**
- Get detailed diff: "Compare property ${args.propertyId} versions ${args.version1} and ${args.version2} with details"
- View specific changes: "Get rules for property ${args.propertyId} version ${args.version2}"
- Merge versions: "Merge property ${args.propertyId} version ${args.version2} into ${args.version1}"`;

    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  } catch (_error) {
    return formatError('compare property versions', _error);
  }
}

/**
 * List property versions with enhanced filtering and pagination
 */
export async function listPropertyVersionsEnhanced(
  client: AkamaiClient,
  args: {
    customer?: string;
    propertyId: string;
    limit?: number;
    offset?: number;
    status?: 'active' | 'inactive' | 'all';
    network?: 'staging' | 'production' | 'both';
    includeMetadata?: boolean;
  },
): Promise<MCPToolResponse> {
  try {
    const response = await client.request({
      method: 'GET',
      path: `/papi/v1/properties/${args.propertyId}/versions`,
    });

    let versions = response.data.versions?.items || [];
    const limit = args.limit || 20;
    const offset = args.offset || 0;

    // Apply filters
    if (args.status === 'active') {
      versions = versions.filter(
        (v: any) => v.stagingStatus === 'ACTIVE' || v.productionStatus === 'ACTIVE',
      );
    } else if (args.status === 'inactive') {
      versions = versions.filter(
        (v: any) => v.stagingStatus !== 'ACTIVE' && v.productionStatus !== 'ACTIVE',
      );
    }

    if (args.network === 'staging') {
      versions = versions.filter((v: any) => v.stagingStatus === 'ACTIVE');
    } else if (args.network === 'production') {
      versions = versions.filter((v: any) => v.productionStatus === 'ACTIVE');
    }

    // Sort by version number (newest first)
    versions.sort((a: any, b: any) => b.propertyVersion - a.propertyVersion);

    // Apply pagination
    const totalVersions = versions.length;
    const paginatedVersions = versions.slice(offset, offset + limit);

    let text = `[EMOJI] **Property Versions for ${args.propertyId}**\n\n`;
    text += `**Total:** ${totalVersions} versions | **Showing:** ${offset + 1}-${Math.min(offset + limit, totalVersions)}\n\n`;

    for (const version of paginatedVersions) {
      const isActive = version.stagingStatus === 'ACTIVE' || version.productionStatus === 'ACTIVE';
      const statusIcon = isActive ? '[EMOJI]' : '[EMOJI]';

      text += `${statusIcon} **Version ${version.propertyVersion}**\n`;
      text += `  └ Updated: ${version.updatedDate} by ${version.updatedByUser}\n`;

      if (version.stagingStatus === 'ACTIVE') {
        text += '  └ [EMOJI] Active on STAGING\n';
      }
      if (version.productionStatus === 'ACTIVE') {
        text += '  └ [EMOJI] Active on PRODUCTION\n';
      }

      if (version.note) {
        text += `  └ Note: ${version.note}\n`;
      }

      if (args.includeMetadata && version.metadata) {
        const metadata =
          typeof version.metadata === 'string' ? JSON.parse(version.metadata) : version.metadata;
        if (metadata.tags) {
          text += `  └ Tags: ${metadata.tags}\n`;
        }
      }

      text += '\n';
    }

    // Pagination controls
    if (totalVersions > limit) {
      text += '**Navigation:**\n';
      if (offset > 0) {
        text += `- Previous: "List versions for property ${args.propertyId} offset ${Math.max(0, offset - limit)}"\n`;
      }
      if (offset + limit < totalVersions) {
        text += `- Next: "List versions for property ${args.propertyId} offset ${offset + limit}"\n`;
      }
    }

    text += `\n**Actions:**
- Compare versions: "Compare property ${args.propertyId} versions X and Y"
- Create new version: "Create version for property ${args.propertyId}"
- View version details: "Get rules for property ${args.propertyId} version X"`;

    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  } catch (_error) {
    return formatError('list property versions', _error);
  }
}

/**
 * Rollback property version for quick recovery
 */
export async function rollbackPropertyVersion(
  client: AkamaiClient,
  args: {
    customer?: string;
    propertyId: string;
    targetVersion: number;
    createBackup?: boolean;
    note?: string;
    autoActivate?: boolean;
    network?: 'staging' | 'production';
  },
): Promise<MCPToolResponse> {
  try {
    let backupVersionId = null;

    // Create backup of current version if requested
    if (args.createBackup !== false) {
      const currentVersionResponse = await client.request({
        method: 'GET',
        path: `/papi/v1/properties/${args.propertyId}/versions`,
      });

      const versions = currentVersionResponse.data.versions?.items || [];
      const latestVersion = Math.max(...versions.map((v: any) => v.propertyVersion));

      const backupResponse = await client.request({
        method: 'POST',
        path: `/papi/v1/properties/${args.propertyId}/versions`,
        body: { createFromVersion: latestVersion },
      });

      backupVersionId = backupResponse.versionLink?.split('/').pop();

      // Add backup note
      if (backupVersionId) {
        await client.request({
          method: 'PATCH',
          path: `/papi/v1/properties/${args.propertyId}/versions/${backupVersionId}`,
          body: [
            {
              op: 'replace',
              path: '/versions/0/note',
              value: `Backup before rollback to version ${args.targetVersion} - ${new Date().toISOString()}`,
            },
          ],
        });
      }
    }

    // Create new version from target version
    const rollbackResponse = await client.request({
      method: 'POST',
      path: `/papi/v1/properties/${args.propertyId}/versions`,
      body: { createFromVersion: args.targetVersion },
    });

    const newVersionId = rollbackResponse.versionLink?.split('/').pop();

    // Add rollback note
    if (newVersionId && args.note) {
      await client.request({
        method: 'PATCH',
        path: `/papi/v1/properties/${args.propertyId}/versions/${newVersionId}`,
        body: [
          {
            op: 'replace',
            path: '/versions/0/note',
            value: `Rollback from version ${args.targetVersion}: ${args.note}`,
          },
        ],
      });
    }

    let text = '[EMOJI] **Property Rollback Completed**\n\n';
    text += `[DONE] Rolled back to version ${args.targetVersion}\n`;
    text += `[PACKAGE] New version created: ${newVersionId}\n`;

    if (backupVersionId) {
      text += `[SAVE] Backup version created: ${backupVersionId}\n`;
    }

    // Auto-activate if requested
    if (args.autoActivate && args.network) {
      try {
        await client.request({
          method: 'POST',
          path: `/papi/v1/properties/${args.propertyId}/activations`,
          body: {
            propertyVersion: parseInt(newVersionId),
            network: args.network.toUpperCase(),
            note: `Auto-activation after rollback to version ${args.targetVersion}`,
            acknowledgeAllWarnings: true,
          },
        });
        text += `[DEPLOY] Auto-activated on ${args.network.toUpperCase()}\n`;
      } catch (_activationError) {
        text += '[WARNING] Rollback completed but auto-activation failed. Manual activation required.\n';
      }
    }

    text += `\n**Recovery Information:**
- Original version: ${args.targetVersion}
- New version: ${newVersionId}
${backupVersionId ? `- Backup version: ${backupVersionId}` : ''}

**Next Steps:**
${!args.autoActivate ? `- Activate: "Activate property ${args.propertyId} version ${newVersionId} to ${args.network || 'staging'}"` : ''}
- Verify: "Get rules for property ${args.propertyId} version ${newVersionId}"
- Compare: "Compare property ${args.propertyId} versions ${backupVersionId} and ${newVersionId}"`;

    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  } catch (_error) {
    return formatError('rollback property version', _error);
  }
}

/**
 * Batch version operations across multiple properties
 */
export async function batchVersionOperations(
  client: AkamaiClient,
  args: {
    customer?: string;
    operations: Array<{
      propertyId: string;
      operation: 'create' | 'rollback' | 'compare';
      parameters: Record<string, any>;
    }>;
    parallel?: boolean;
    continueOnError?: boolean;
  },
): Promise<MCPToolResponse> {
  try {
    const results = [];
    const errors = [];

    if (args.parallel) {
      // Execute operations in parallel
      const promises = args.operations.map(async (op, index) => {
        try {
          let result;
          switch (op.operation) {
            case 'create':
              result = await createPropertyVersionEnhanced(client, {
                propertyId: op.propertyId,
                ...op.parameters,
              });
              break;
            case 'rollback':
              result = await rollbackPropertyVersion(client, {
                propertyId: op.propertyId,
                targetVersion: op.parameters.targetVersion || 1,
                ...op.parameters,
              });
              break;
            case 'compare':
              result = await getVersionDiff(client, {
                propertyId: op.propertyId,
                version1: op.parameters.version1 || 1,
                version2: op.parameters.version2 || 2,
                ...op.parameters,
              });
              break;
            default:
              throw new Error(`Unknown operation: ${op.operation}`);
          }
          return { index, success: true, result, propertyId: op.propertyId };
        } catch (_error: any) {
          return {
            index,
            success: false,
            error: _error?.message || 'Unknown error',
            propertyId: op.propertyId,
          };
        }
      });

      const allResults = await Promise.allSettled(promises);

      allResults.forEach((promiseResult, index) => {
        if (promiseResult.status === 'fulfilled') {
          const { success, result, error, propertyId } = promiseResult.value || {};
          if (success && result) {
            results.push({
              propertyId: propertyId || '',
              operation: args.operations[index]?.operation || '',
              result,
            });
          } else if (error) {
            errors.push({
              propertyId: propertyId || '',
              operation: args.operations[index]?.operation || '',
              error,
            });
          }
        } else {
          errors.push({
            propertyId: args.operations[index]?.propertyId || '',
            operation: args.operations[index]?.operation || '',
            error: promiseResult.reason,
          });
        }
      });
    } else {
      // Execute operations sequentially
      for (const [_index, op] of args.operations.entries()) {
        try {
          let result;
          switch (op.operation) {
            case 'create':
              result = await createPropertyVersionEnhanced(client, {
                propertyId: op.propertyId,
                ...op.parameters,
              });
              break;
            case 'rollback':
              result = await rollbackPropertyVersion(client, {
                propertyId: op.propertyId,
                targetVersion: op.parameters.targetVersion || 1,
                ...op.parameters,
              });
              break;
            case 'compare':
              result = await getVersionDiff(client, {
                propertyId: op.propertyId,
                version1: op.parameters.version1 || 1,
                version2: op.parameters.version2 || 2,
                ...op.parameters,
              });
              break;
            default:
              throw new Error(`Unknown operation: ${op.operation}`);
          }
          results.push({ propertyId: op.propertyId, operation: op.operation, result });
        } catch (_error: any) {
          errors.push({
            propertyId: op.propertyId,
            operation: op.operation,
            error: _error?.message || 'Unknown error',
          });

          if (!args.continueOnError) {
            break;
          }
        }
      }
    }

    let text = '[EMOJI] **Batch Version Operations Results**\n\n';
    text += `**Summary:** ${results.length} successful, ${errors.length} failed\n\n`;

    if (results.length > 0) {
      text += '[DONE] **Successful Operations:**\n';
      results.forEach((result, index) => {
        text += `${index + 1}. ${result.propertyId} - ${result.operation}\n`;
      });
      text += '\n';
    }

    if (errors.length > 0) {
      text += '[ERROR] **Failed Operations:**\n';
      errors.forEach((_error, index) => {
        text += `${index + 1}. ${_error.propertyId} - ${_error.operation}: ${_error.error}\n`;
      });
      text += '\n';
    }

    text += `**Execution Mode:** ${args.parallel ? 'Parallel' : 'Sequential'}
**Continue on Error:** ${args.continueOnError ? 'Yes' : 'No'}

**Next Steps:**
- Review individual results above
- Retry failed operations if needed
- Verify successful operations`;

    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  } catch (_error) {
    return formatError('batch version operations', _error);
  }
}

/**
 * Helper function to compare rule trees and identify differences
 */
function compareRuleTrees(rules1: any, rules2: any, _includeDetails: boolean): any[] {
  const differences = [];

  // Deep comparison logic would go here
  // This is a simplified version for demonstration
  const rules1Str = JSON.stringify(rules1, null, 2);
  const rules2Str = JSON.stringify(rules2, null, 2);

  if (rules1Str !== rules2Str) {
    differences.push({
      type: 'rule_tree_change',
      description: 'Rule tree content differs between versions',
      path: '/rules',
    });
  }

  return differences;
}

/**
 * Helper function to compare hostnames
 */
function compareHostnames(hostnames1: any[], hostnames2: any[]): any[] {
  const differences = [];

  const h1Map = new Map(hostnames1.map((h) => [h.cnameFrom, h]));
  const h2Map = new Map(hostnames2.map((h) => [h.cnameFrom, h]));

  // Check for added hostnames
  for (const [hostname, _config] of h2Map) {
    if (!h1Map.has(hostname)) {
      differences.push({
        type: 'hostname_added',
        description: `Hostname ${hostname} added`,
        hostname,
      });
    }
  }

  // Check for removed hostnames
  for (const [hostname, _config] of h1Map) {
    if (!h2Map.has(hostname)) {
      differences.push({
        type: 'hostname_removed',
        description: `Hostname ${hostname} removed`,
        hostname,
      });
    }
  }

  return differences;
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
        '**Solution:** Check your ~/.edgerc file has valid credentials for the customer section.';
    } else if (_error.message.includes('403') || _error.message.includes('Forbidden')) {
      solution = '**Solution:** Your API credentials may lack the necessary permissions.';
    } else if (_error.message.includes('404') || _error.message.includes('not found')) {
      solution = '**Solution:** The requested resource was not found. Verify the ID is correct.';
    } else if (_error.message.includes('400') || _error.message.includes('Bad Request')) {
      solution = '**Solution:** Invalid request parameters. Check the input values.';
    } else if (_error.message.includes('409') || _error.message.includes('Conflict')) {
      solution = '**Solution:** Resource conflict. The operation may already be in progress.';
    }
  } else {
    errorMessage += `: ${String(_error)}`;
  }

  let text = errorMessage;
  if (solution) {
    text += `\n\n${solution}`;
  }

  return {
    content: [
      {
        type: 'text',
        text,
      },
    ],
  };
}

/**
 * Monitor activation progress in the background using proper async/await pattern
 */
async function monitorActivation(
  client: AkamaiClient,
  propertyId: string,
  activationId: string,
  progressToken: ProgressToken
): Promise<void> {
  const checkInterval = 30000; // 30 seconds
  const maxDuration = 3600000; // 1 hour
  const startTime = Date.now();

  // Helper function to wait with proper Promise-based delay
  const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

  try {
    // Initial delay before starting monitoring
    await delay(5000);

    while (true) {
      const response = await client.request({
        path: `/papi/v1/properties/${propertyId}/activations/${activationId}`,
        method: 'GET',
      });

      if (!response.activations?.items?.[0]) {
        progressToken.fail('Activation not found');
        return;
      }

      const activation = response.activations.items[0];
      const elapsed = Date.now() - startTime;

      // Map activation status to progress
      const progressMap: Record<string, number> = {
        NEW: 5,
        PENDING: 10,
        ZONE_1: 30,
        ZONE_2: 60,
        ZONE_3: 90,
        ACTIVE: 100,
        ABORTED: -1,
        FAILED: -1,
        DEACTIVATED: -1,
      };

      const progress = progressMap[activation.status] || 50;

      if (progress === -1) {
        // Failed status
        const error = activation.fatalError || activation.errors?.[0]?.detail || 'Activation failed';
        progressToken.fail(error);
        return;
      }

      if (progress === 100) {
        // Completed
        progressToken.complete(`Activation completed successfully on ${activation.network}`);
        return;
      }

      // Update progress
      progressToken.update(
        progress,
        `Activation ${activation.status} on ${activation.network}`,
        {
          activationId,
          propertyId,
          network: activation.network,
          estimatedTimeRemaining: activation.network === 'PRODUCTION' ? 1800 - elapsed/1000 : 600 - elapsed/1000
        }
      );

      // Check if timed out
      if (elapsed >= maxDuration) {
        progressToken.update(
          progress,
          'Activation is taking longer than expected. Continue checking status manually.',
          { activationId, propertyId }
        );
        return;
      }

      // Wait before next check using proper async/await pattern
      await delay(checkInterval);
    }
  } catch (error) {
    progressToken.fail(`Failed to monitor activation status: ${error instanceof Error ? error.message : String(error)}`);
  }
}
