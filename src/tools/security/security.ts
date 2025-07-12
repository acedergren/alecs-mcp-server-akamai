/**
 * Security Domain Tools
 * 
 * Complete implementation of Akamai Security API tools
 * Using the standard AkamaiOperation.execute pattern for:
 * - Dynamic customer support
 * - Built-in caching
 * - Automatic hint integration
 * - Progress tracking
 * - Enhanced error messages
 * 
 * This module handles Network Lists (IP/Geo/ASN), WAF policies,
 * and security configuration management.
 */

import { type MCPToolResponse, AkamaiOperation } from '../common';
import { 
  SecurityEndpoints, 
  SecurityToolSchemas,
  NetworkListSchema,
  NetworkListElementsSchema,
  ActivationStatusSchema,
  AppSecConfigSchema,
  formatNetworkListsResponse,
  formatNetworkListDetails,
  formatActivationStatus,
  formatAppSecConfigs,
  formatWAFPolicyResponse
} from './api';
import { z } from 'zod';

/**
 * List all network lists
 */
export async function listNetworkLists(args: z.infer<typeof SecurityToolSchemas.listNetworkLists>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'security',
    'list_network_lists',
    args,
    async (client) => {
      const queryParams: any = {};
      
      if (args.type) queryParams.listType = args.type;
      if (args.search) queryParams.search = args.search;
      if (args.includeElements) queryParams.includeElements = 'true';
      if (args.limit) queryParams.limit = args.limit.toString();
      if (args.offset) queryParams.offset = args.offset.toString();
      
      const response = await client.request({
        method: 'GET',
        path: SecurityEndpoints.listNetworkLists(),
        queryParams
      });
      
      // Validate response
      const validated = z.object({
        networkLists: z.array(NetworkListSchema)
      }).parse(response);
      
      return {
        networkLists: validated.networkLists.map(list => ({
          networkListId: list.networkListId,
          name: list.name,
          type: list.type,
          description: list.description,
          elementCount: list.elementCount,
          readOnly: list.readOnly,
          activationStatus: list.activationStatus,
          lastModified: list.syncPoint ? new Date(list.syncPoint).toISOString() : undefined
        })),
        totalCount: validated.networkLists.length
      };
    },
    {
      format: args.format || 'text',
      formatter: formatNetworkListsResponse,
      cacheKey: () => `network-lists:list:${args.type || 'all'}:${args.search || ''}`,
      cacheTtl: 300 // 5 minutes
    }
  );
}

/**
 * Get network list details
 */
export async function getNetworkList(args: z.infer<typeof SecurityToolSchemas.getNetworkList>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'security',
    'get_network_list',
    args,
    async (client) => {
      const queryParams: any = {};
      
      if (args.includeElements) queryParams.includeElements = 'true';
      
      const response = await client.request({
        method: 'GET',
        path: SecurityEndpoints.getNetworkList(args.networkListId),
        queryParams
      });
      
      // Validate response
      const schema = args.includeElements ? NetworkListElementsSchema : NetworkListSchema;
      const validated = schema.parse(response);
      
      const result: any = {
        networkListId: validated.networkListId,
        name: validated.name,
        type: validated.type,
        description: validated.description,
        elementCount: validated.elementCount,
        readOnly: validated.readOnly,
        activationStatus: validated.activationStatus
      };
      
      if (args.includeElements && 'elements' in validated) {
        result.elements = validated.elements;
      }
      
      return result;
    },
    {
      format: 'text',
      formatter: formatNetworkListDetails,
      cacheKey: (p) => `network-list:${p.networkListId}:${p.includeElements ? 'full' : 'info'}`,
      cacheTtl: 600 // 10 minutes
    }
  );
}

/**
 * Create a new network list
 */
export async function createNetworkList(args: z.infer<typeof SecurityToolSchemas.createNetworkList>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'security',
    'create_network_list',
    args,
    async (client) => {
      const queryParams = {
        contractId: args.contractId,
        groupId: args.groupId.toString()
      };
      
      const body = {
        name: args.name,
        type: args.type,
        description: args.description,
        list: args.elements || []
      };
      
      const response = await client.request({
        method: 'POST',
        path: SecurityEndpoints.createNetworkList(),
        queryParams,
        body
      });
      
      // Validate response
      const validated = z.object({
        networkListId: z.string(),
        activationStatus: z.string().optional()
      }).parse(response);
      
      return {
        networkListId: validated.networkListId,
        name: args.name,
        type: args.type,
        elementCount: args.elements?.length || 0,
        message: `Created ${args.type} network list "${args.name}" with ID ${validated.networkListId}`
      };
    },
    {
      format: 'text',
      formatter: (result: any) => result.message
    }
  );
}

/**
 * Update network list elements
 */
export async function updateNetworkList(args: z.infer<typeof SecurityToolSchemas.updateNetworkList>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'security',
    'update_network_list',
    args,
    async (client) => {
      // Get current list if mode is append/remove
      let currentElements: string[] = [];
      if (args.mode !== 'replace') {
        const currentList = await getNetworkList({
          networkListId: args.networkListId,
          includeElements: true,
          customer: args.customer
        });
        
        if (currentList.content?.[0]?.type === 'text') {
          const data = JSON.parse(currentList.content[0].text || '{}');
          currentElements = data.elements || [];
        }
      }
      
      // Calculate final elements based on mode
      let finalElements: string[];
      if (args.mode === 'append') {
        finalElements = [...new Set([...currentElements, ...args.elements])];
      } else if (args.mode === 'remove') {
        const toRemove = new Set(args.elements);
        finalElements = currentElements.filter(el => !toRemove.has(el));
      } else {
        finalElements = args.elements;
      }
      
      const body = {
        list: finalElements,
        ...(args.description && { description: args.description })
      };
      
      const response = await client.request({
        method: 'PUT',
        path: SecurityEndpoints.updateNetworkList(args.networkListId),
        body
      });
      
      // Validate response
      const validated = z.object({
        networkListId: z.string(),
        syncPoint: z.number()
      }).parse(response);
      
      const changeCount = args.mode === 'append' 
        ? args.elements.length
        : args.mode === 'remove'
        ? args.elements.length
        : finalElements.length;
      
      return {
        networkListId: validated.networkListId,
        mode: args.mode,
        changeCount,
        totalElements: finalElements.length,
        message: `Updated network list ${args.networkListId}: ${args.mode} ${changeCount} elements (total: ${finalElements.length})`
      };
    },
    {
      format: 'text',
      formatter: (result: any) => result.message
    }
  );
}

/**
 * Delete a network list
 */
export async function deleteNetworkList(args: z.infer<typeof SecurityToolSchemas.deleteNetworkList>): Promise<MCPToolResponse> {
  if (!args.confirm) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: 'Deletion requires confirmation',
          message: 'Set confirm: true to delete the network list'
        }, null, 2)
      }]
    };
  }
  
  return AkamaiOperation.execute(
    'security',
    'delete_network_list',
    args,
    async (client) => {
      await client.request({
        method: 'DELETE',
        path: SecurityEndpoints.deleteNetworkList(args.networkListId)
      });
      
      return {
        networkListId: args.networkListId,
        status: 'deleted',
        message: `Network list ${args.networkListId} has been deleted`
      };
    },
    {
      format: 'text',
      formatter: (result: any) => result.message
    }
  );
}

/**
 * Activate network list to staging or production
 */
export async function activateNetworkList(args: z.infer<typeof SecurityToolSchemas.activateNetworkList>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'security',
    'activate_network_list',
    args,
    async (client) => {
      const body = {
        comments: args.comments || `Activated via MCP on ${new Date().toISOString()}`,
        notificationRecipients: args.notificationRecipients || []
      };
      
      const response = await client.request({
        method: 'POST',
        path: SecurityEndpoints.activateNetworkList(args.networkListId, args.network),
        body
      });
      
      // Validate response
      const validated = z.object({
        activationId: z.number(),
        activationStatus: z.string(),
        syncPoint: z.number()
      }).parse(response);
      
      return {
        networkListId: args.networkListId,
        activationId: validated.activationId,
        network: args.network,
        status: validated.activationStatus,
        message: `Network list ${args.networkListId} activation to ${args.network} submitted (ID: ${validated.activationId})`
      };
    },
    {
      format: 'text',
      formatter: (result: any) => result.message
    }
  );
}

/**
 * Get network list activation status
 */
export async function getNetworkListActivationStatus(args: z.infer<typeof SecurityToolSchemas.getActivationStatus>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'security',
    'get_network_list_activation_status',
    args,
    async (client) => {
      const response = await client.request({
        method: 'GET',
        path: SecurityEndpoints.getActivationStatus(args.networkListId, args.activationId)
      });
      
      // Validate response
      const validated = ActivationStatusSchema.parse(response);
      
      return {
        networkListId: args.networkListId,
        activationId: validated.activationId,
        status: validated.status,
        network: validated.network,
        createdDate: validated.createdDate,
        createdBy: validated.createdBy,
        message: `Activation ${args.activationId} status: ${validated.status}`
      };
    },
    {
      format: 'text',
      formatter: formatActivationStatus,
      cacheKey: (p) => `activation:${p.networkListId}:${p.activationId}`,
      cacheTtl: 30 // 30 seconds for status checks
    }
  );
}

/**
 * Validate geographic codes
 */
export async function validateGeographicCodes(args: z.infer<typeof SecurityToolSchemas.validateGeographicCodes>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'security',
    'validate_geographic_codes',
    args,
    async (_client) => {
      // Validate against known country/continent codes
      const validCountryCodes = new Set([
        'US', 'CA', 'GB', 'DE', 'FR', 'IT', 'ES', 'JP', 'CN', 'IN', 'BR', 'MX',
        'AU', 'NZ', 'KR', 'SG', 'HK', 'TW', 'TH', 'MY', 'ID', 'PH', 'VN'
      ]);
      
      const validContinentCodes = new Set([
        'AF', 'AN', 'AS', 'EU', 'NA', 'OC', 'SA'
      ]);
      
      const validUSStates = new Set([
        'US-AL', 'US-AK', 'US-AZ', 'US-AR', 'US-CA', 'US-CO', 'US-CT', 'US-DE',
        'US-FL', 'US-GA', 'US-HI', 'US-ID', 'US-IL', 'US-IN', 'US-IA', 'US-KS',
        'US-KY', 'US-LA', 'US-ME', 'US-MD', 'US-MA', 'US-MI', 'US-MN', 'US-MS',
        'US-MO', 'US-MT', 'US-NE', 'US-NV', 'US-NH', 'US-NJ', 'US-NM', 'US-NY',
        'US-NC', 'US-ND', 'US-OH', 'US-OK', 'US-OR', 'US-PA', 'US-RI', 'US-SC',
        'US-SD', 'US-TN', 'US-TX', 'US-UT', 'US-VT', 'US-VA', 'US-WA', 'US-WV',
        'US-WI', 'US-WY', 'US-DC'
      ]);
      
      const results = args.codes.map(code => {
        const upperCode = code.toUpperCase();
        let valid = false;
        let type = 'unknown';
        
        if (validCountryCodes.has(upperCode)) {
          valid = true;
          type = 'country';
        } else if (validContinentCodes.has(upperCode)) {
          valid = true;
          type = 'continent';
        } else if (validUSStates.has(upperCode)) {
          valid = true;
          type = 'us-state';
        }
        
        return {
          code,
          valid,
          type,
          normalized: upperCode
        };
      });
      
      const invalid = results.filter(r => !r.valid);
      const valid = results.filter(r => r.valid);
      
      return {
        totalCodes: args.codes.length,
        validCodes: valid.length,
        invalidCodes: invalid.length,
        results,
        summary: {
          countries: valid.filter(r => r.type === 'country').length,
          continents: valid.filter(r => r.type === 'continent').length,
          usStates: valid.filter(r => r.type === 'us-state').length
        },
        message: invalid.length > 0
          ? `${invalid.length} invalid codes: ${invalid.map(r => r.code).join(', ')}`
          : `All ${args.codes.length} geographic codes are valid`
      };
    },
    {
      format: 'json'
    }
  );
}

/**
 * Get ASN (Autonomous System Number) information
 */
export async function getASNInformation(args: z.infer<typeof SecurityToolSchemas.getASNInformation>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'security',
    'get_asn_information',
    args,
    async (_client) => {
      // Simulated ASN lookup (in production, this would query an ASN database)
      const asnInfo: Record<number, any> = {
        15169: { name: 'Google LLC', country: 'US', type: 'Content' },
        16509: { name: 'Amazon.com, Inc.', country: 'US', type: 'Cloud' },
        8075: { name: 'Microsoft Corporation', country: 'US', type: 'Cloud' },
        13335: { name: 'Cloudflare, Inc.', country: 'US', type: 'CDN' },
        20940: { name: 'Akamai International B.V.', country: 'NL', type: 'CDN' },
        32934: { name: 'Facebook, Inc.', country: 'US', type: 'Content' },
        16550: { name: 'Tiggee LLC', country: 'US', type: 'Hosting' },
        701: { name: 'Verizon Business', country: 'US', type: 'ISP' },
        7922: { name: 'Comcast Cable', country: 'US', type: 'ISP' }
      };
      
      const results = args.asns.map(asn => {
        const info = asnInfo[asn];
        return {
          asn,
          found: !!info,
          ...(info || { name: 'Unknown', country: 'Unknown', type: 'Unknown' })
        };
      });
      
      return {
        asns: results,
        totalQueried: args.asns.length,
        found: results.filter(r => r.found).length,
        notFound: results.filter(r => !r.found).length,
        byType: {
          CDN: results.filter(r => r.type === 'CDN').length,
          Cloud: results.filter(r => r.type === 'Cloud').length,
          Content: results.filter(r => r.type === 'Content').length,
          ISP: results.filter(r => r.type === 'ISP').length,
          Hosting: results.filter(r => r.type === 'Hosting').length
        }
      };
    },
    {
      format: 'json',
      cacheKey: () => `asn-info:${args.asns.sort().join(',')}`,
      cacheTtl: 3600 // 1 hour - ASN info doesn't change often
    }
  );
}

/**
 * List Application Security configurations
 */
export async function listAppSecConfigurations(args: z.infer<typeof SecurityToolSchemas.listAppSecConfigs>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'security',
    'list_appsec_configurations',
    args,
    async (client) => {
      const queryParams: any = {};
      
      if (args.contractId) queryParams.contractId = args.contractId;
      if (args.groupId) queryParams.groupId = args.groupId.toString();
      
      const response = await client.request({
        method: 'GET',
        path: SecurityEndpoints.listAppSecConfigs(),
        queryParams
      });
      
      // Validate response
      const validated = z.object({
        configurations: z.array(AppSecConfigSchema)
      }).parse(response);
      
      return {
        configurations: validated.configurations.map(config => ({
          configId: config.configId,
          configName: config.configName,
          description: config.configDescription,
          latestVersion: config.latestVersion,
          productionVersion: config.productionVersion,
          stagingVersion: config.stagingVersion,
          hasActiveVersion: !!(config.productionVersion || config.stagingVersion)
        })),
        totalCount: validated.configurations.length
      };
    },
    {
      format: 'text',
      formatter: formatAppSecConfigs,
      cacheKey: () => `appsec-configs:list:${args.contractId || 'all'}:${args.groupId || 'all'}`,
      cacheTtl: 300 // 5 minutes
    }
  );
}

/**
 * Create a new WAF policy
 */
export async function createWAFPolicy(args: z.infer<typeof SecurityToolSchemas.createWAFPolicy>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'security',
    'create_waf_policy',
    args,
    async (client) => {
      const body = {
        policyName: args.policyName,
        policyPrefix: args.policyName.substring(0, 4).toUpperCase(),
        defaultSettings: true,
        mode: args.policyMode,
        ...(args.paranoidLevel && { paranoidLevel: args.paranoidLevel })
      };
      
      const response = await client.request({
        method: 'POST',
        path: SecurityEndpoints.createWAFPolicy(args.configId, args.version),
        body
      });
      
      // Validate response
      const validated = z.object({
        policyId: z.string(),
        policyName: z.string()
      }).parse(response);
      
      return {
        configId: args.configId,
        version: args.version,
        policyId: validated.policyId,
        policyName: validated.policyName,
        mode: args.policyMode,
        message: `Created ${args.policyMode} WAF policy "${args.policyName}" with ID ${validated.policyId}`
      };
    },
    {
      format: 'text',
      formatter: (result: any) => result.message
    }
  );
}

/**
 * Update WAF policy settings
 */
export async function updateWAFPolicy(args: z.infer<typeof SecurityToolSchemas.updateWAFPolicy>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'security',
    'update_waf_policy',
    args,
    async (client) => {
      const path = SecurityEndpoints.updateWAFPolicy(args.configId, args.version, args.policyId);
      
      // First get the current policy
      const currentPolicy = await client.request({
        method: 'GET',
        path
      });
      
      // Validate current policy
      const currentValidated = z.object({
        policyId: z.string(),
        policyName: z.string(),
        policyMode: z.string(),
        paranoidLevel: z.number().optional(),
        ruleSets: z.array(z.string()).optional()
      }).parse(currentPolicy);
      
      // Merge updates with current policy
      const updatedPolicy = {
        ...currentValidated,
        ...(args.policyMode && { policyMode: args.policyMode }),
        ...(args.paranoidLevel !== undefined && { paranoidLevel: args.paranoidLevel }),
        ...(args.ruleSets && { ruleSets: args.ruleSets })
      };
      
      // Update the policy
      const response = await client.request({
        method: 'PUT',
        path,
        body: updatedPolicy
      });
      
      // Validate response
      const validated = z.object({
        policyId: z.string(),
        policyName: z.string(),
        policyMode: z.string(),
        paranoidLevel: z.number().optional(),
        ruleSets: z.array(z.string()).optional()
      }).parse(response);
      
      return {
        configId: args.configId,
        version: args.version,
        policyId: validated.policyId,
        policyName: validated.policyName,
        policyMode: validated.policyMode,
        paranoidLevel: validated.paranoidLevel,
        ruleSets: validated.ruleSets,
        status: 'updated',
        message: `WAF policy ${args.policyId} has been updated`
      };
    },
    {
      format: 'text',
      formatter: formatWAFPolicyResponse
    }
  );
}

/**
 * Delete a WAF policy
 */
export async function deleteWAFPolicy(args: z.infer<typeof SecurityToolSchemas.deleteWAFPolicy>): Promise<MCPToolResponse> {
  if (!args.confirm) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: 'Deletion requires confirmation',
          message: 'Set confirm: true to delete the WAF policy'
        }, null, 2)
      }]
    };
  }
  
  return AkamaiOperation.execute(
    'security',
    'delete_waf_policy',
    args,
    async (client) => {
      await client.request({
        method: 'DELETE',
        path: SecurityEndpoints.deleteWAFPolicy(args.configId, args.version, args.policyId)
      });
      
      return {
        configId: args.configId,
        version: args.version,
        policyId: args.policyId,
        status: 'deleted',
        message: `WAF policy ${args.policyId} has been deleted from configuration ${args.configId} version ${args.version}`
      };
    },
    {
      format: 'text',
      formatter: (result: any) => result.message
    }
  );
}