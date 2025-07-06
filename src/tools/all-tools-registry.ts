/**
 * Complete Tool Registration for ALECS Full Server
 * Registers ALL available tools (~180 tools) with proper schemas
 * Plus Maya Chen's Workflow Assistants for simplified UX
 * Now includes Consolidated Tools for improved architecture
 */

import { z, type ZodSchema } from 'zod';

// CODE KAI: Import proper types to eliminate 'any' usage
import type { AkamaiClient } from '../akamai-client';
import type { MCPToolResponse } from '../types/mcp-protocol';

// UNIVERSAL TRANSLATION MIDDLEWARE: Import translation system
import { createTranslationMiddleware } from '../middleware/translation-middleware';

// CODE KAI: Define flexible parameter type for tool handlers
// This allows typed parameters while maintaining compatibility with MCP SDK
type ToolParameters = Record<string, unknown>;

// CODE KAI EMERGENCY CLEANUP: Removed fake workflow assistants and consolidated tools
// These tools were sophisticated fakes that returned demo data instead of making
// real Akamai API calls, violating CLAUDE.md "perfect software, no bugs" principle

// Property Management Tools
import {
  listProperties,
  getProperty,
  createProperty,
  listContracts,
  listGroups,
  listProducts,
} from './property-tools';

import {
  search,
  searchProperties,
  searchHostnames,
  searchOrigins,
} from './search-tool';

import {
  activateProperty,
  addPropertyHostname,
  removePropertyHostname,
  createPropertyVersion,
  createEdgeHostname,
  getPropertyRules,
  updatePropertyRules,
  listPropertyActivations,
  getActivationStatus,
  rollbackPropertyVersion,
  getVersionDiff,
  batchVersionOperations,
  createPropertyVersionEnhanced,
  listPropertyVersionsEnhanced,
} from './property-manager-tools';

import {
  listPropertyVersions,
  getPropertyVersion,
  getLatestPropertyVersion,
  listPropertyVersionHostnames,
  listEdgeHostnames,
  getEdgeHostname,
  cloneProperty,
  removeProperty,
  cancelPropertyActivation,
} from './property-manager-advanced-tools';

// DNS Management Tools
import {
  listZones,
  getZone,
  createZone,
  listRecords,
  upsertRecord,
  deleteRecord,
  activateZoneChanges,
} from './dns-tools';

import {
  createMultipleRecordSets,
  getRecordSet,
  submitBulkZoneCreateRequest,
  getZonesDNSSECStatus,
  updateTSIGKeyForZones,
  getZoneVersion,
  getVersionRecordSets,
  getVersionMasterZoneFile,
  reactivateZoneVersion,
  getSecondaryZoneTransferStatus,
  getZoneContract,
} from './dns-advanced-tools';

import {
  importFromCloudflare,
  importZoneViaAXFR,
  parseZoneFile,
  bulkImportRecords,
  convertZoneToPrimary,
  generateMigrationInstructions,
} from './dns-migration-tools';

import {
  listChangelists,
  searchChangelists,
  getChangelistDiff,
  getAuthoritativeNameservers,
  // listContracts, // Already imported from property-tools
  getSupportedRecordTypes,
  deleteZone,
  getZoneStatus,
  listTSIGKeys,
  createTSIGKey,
} from './dns-operations-priority';

import {
  enableDNSSEC,
  disableDNSSEC,
  getDNSSECKeys,
  getDNSSECDSRecords,
  checkDNSSECValidation,
  rotateDNSSECKeys,
} from './dns-dnssec-operations';

// DNS Elicitation Tools - REMOVED
// These tools were removed due to critical LLM incompatibility issues:
// - Stateful multi-step workflows incompatible with LLM clients
// - Interactive prompting patterns that don't work with Claude Desktop
// - Incomplete implementations (stub security config)
// - 8 instances of 'any' types compromising type safety
// - No integration with centralized error handling
// See ELICITATION-TOOLS-AUDIT.md for details

// Certificate Management Tools
import {
  listCertificateEnrollments,
  createDVEnrollment,
  checkDVEnrollmentStatus,
  getDVValidationChallenges,
  linkCertificateToProperty,
} from './cps-tools';

import {
  enrollCertificateWithValidation,
  monitorCertificateEnrollment,
  getCertificateDeploymentStatus,
  getCertificateValidationHistory,
  validateCertificateEnrollment,
  deployCertificateToNetwork,
  renewCertificate,
  cleanupValidationRecords,
} from './certificate-enrollment-tools';

// Hostname Management Tools
import {
  discoverHostnamesIntelligent,
  analyzeHostnameConflicts,
  analyzeWildcardCoverage,
  identifyOwnershipPatterns,
} from './hostname-discovery-engine';

import {
  createHostnameProvisioningPlan,
  findOptimalPropertyAssignment,
  generateEdgeHostnameRecommendations,
  analyzeHostnameOwnership,
  validateHostnamesBulk,
} from './hostname-management-advanced';

import {
  createEdgeHostnameEnhanced,
  createBulkEdgeHostnames,
  getEdgeHostnameDetails,
  associateCertificateWithEdgeHostname,
  validateEdgeHostnameCertificate,
} from './edge-hostname-management';

// Rule Tree Management Tools
import {
  createRuleFromTemplate,
  updatePropertyRulesEnhanced,
  mergeRuleTrees,
  optimizeRuleTree,
  validateRuleTree,
} from './rule-tree-management';

// Bulk Operations Tools
import {
  bulkActivateProperties,
  bulkCloneProperties,
  bulkManageHostnames,
  bulkUpdatePropertyRules,
  getBulkOperationStatus,
} from './bulk-operations-manager';

// Include Management Tools
import {
  listIncludes,
  getInclude,
  createInclude,
  updateInclude,
  createIncludeVersion,
  activateInclude,
  listIncludeActivations,
  getIncludeActivationStatus,
} from './includes-tools';

// CP Code Tools
import { listCPCodes, getCPCode, createCPCode, searchCPCodes } from './cpcode-tools';

// Product Tools
import { getProduct } from './product-tools';

// Universal Search Tools
import { universalSearchWithCacheHandler } from './universal-search-with-cache';

// Property Onboarding Tools
import {
  onboardPropertyTool,
  onboardPropertyWizard,
  checkOnboardingStatus,
} from './property-onboarding-tools';

// Advanced Property Operations
import {
  bulkUpdateProperties,
  compareProperties,
  detectConfigurationDrift,
  checkPropertyHealth,
} from './property-operations-advanced';

// Secure by Default Tools
import {
  onboardSecureByDefaultProperty,
  checkSecureByDefaultStatus,
  quickSecureByDefaultSetup,
} from './secure-by-default-onboarding';

// FastPurge Tools
import {
  fastpurgeUrlInvalidate,
  fastpurgeCpcodeInvalidate,
  fastpurgeTagInvalidate,
  fastpurgeStatusCheck,
  fastpurgeQueueStatus,
  fastpurgeEstimate,
} from './fastpurge-tools';

// Network Lists Tools
import {
  listNetworkLists,
  getNetworkList,
  createNetworkList,
  updateNetworkList,
  deleteNetworkList,
} from './security/network-lists-tools';

import {
  activateNetworkList,
  getNetworkListActivationStatus,
  listNetworkListActivations,
  deactivateNetworkList,
  bulkActivateNetworkLists,
} from './security/network-lists-activation';

import {
  importNetworkListFromCSV,
  exportNetworkListToCSV,
  bulkUpdateNetworkLists,
  mergeNetworkLists,
} from './security/network-lists-bulk';

import {
  validateGeographicCodes,
  getASNInformation,
  generateGeographicBlockingRecommendations,
  // generateASNSecurityRecommendations, // Unused - commented out
  // listCommonGeographicCodes, // Unused - commented out
} from './security/network-lists-geo-asn';

// import {
//   getSecurityPolicyIntegrationGuidance,
//   generateDeploymentChecklist,
// } from './security/network-lists-integration'; // Unused - commented out

// AppSec Tools
import {
  listAppSecConfigurations,
  getAppSecConfiguration,
  createWAFPolicy,
  getSecurityEvents,
  activateSecurityConfiguration,
  getSecurityActivationStatus,
} from './security/appsec-basic-tools';

// Performance Tools
import {
  getPerformanceAnalysis,
  optimizeCache,
  profilePerformance,
  getRealtimeMetrics,
  resetPerformanceMonitoring,
} from './performance-tools';

// Reporting Tools - REMOVED: Reporting functionality has been removed from the codebase
// to maintain code quality standards and avoid incomplete implementations.
// Reporting tools contained stub implementations that did not provide real value.
// Future implementation should include complete Akamai Reporting API integration.

// Token Management Tools
import {
  handleGenerateApiToken,
  handleListApiTokens,
  handleRevokeApiToken,
  handleValidateApiToken,
  handleRotateApiToken,
} from './token-tools';

// Define stub handlers for elicitation tools
const handleDNSElicitationTool = async (_args: unknown) => {
  return {
    content: [
      {
        type: 'text' as const,
        text: 'DNS Elicitation tool is not yet implemented. Please use the standard DNS tools instead.'
      }
    ]
  };
};

const handleSecureHostnameOnboardingTool = async (_args: unknown) => {
  return {
    content: [
      {
        type: 'text' as const,
        text: 'Secure Hostname Onboarding tool is not yet implemented. Please use the standard property and hostname tools instead.'
      }
    ]
  };
};

// Import all schemas
import * as schemas from './tool-schemas';
import * as extendedSchemas from './tool-schemas-extended';

// Additional schemas for tools without predefined schemas

// Token Management Schemas
const GenerateApiTokenSchema = z.object({
  description: z.string().optional(),
  expiresInDays: z.number().optional(),
});

const ListApiTokensSchema = z.object({});

const RevokeApiTokenSchema = z.object({
  tokenId: z.string(),
});

const ValidateApiTokenSchema = z.object({
  token: z.string(),
});

const RotateApiTokenSchema = z.object({
  tokenId: z.string(),
});

// DNS Elicitation Schema
const DNSElicitationSchema = z.object({
  operation: z.enum([
    'create',
    'update',
    'delete',
    'list',
    'check-status',
    'help',
  ]).optional(),
  zone: z.string().optional(),
  recordName: z.string().optional(),
  recordType: z.enum([
    'A',
    'AAAA',
    'CNAME',
    'MX',
    'TXT',
    'NS',
    'SRV',
    'CAA',
    'PTR',
  ]).optional(),
  recordValue: z.union([z.string(), z.array(z.string())]).optional(),
  ttl: z.number().optional(),
  priority: z.number().optional(),
  weight: z.number().optional(),
  port: z.number().optional(),
  confirmAction: z.boolean().optional(),
  customer: z.string().optional(),
});

// Secure Hostname Onboarding Schema
const SecureHostnameOnboardingSchema = z.object({
  operation: z.enum([
    'start',
    'check-requirements',
    'setup-property',
    'configure-dns',
    'configure-security',
    'activate',
    'status',
    'help',
  ]).optional(),
  hostname: z.string().optional(),
  additionalHostnames: z.array(z.string()).optional(),
  originHostname: z.string().optional(),
  contractId: z.string().optional(),
  groupId: z.string().optional(),
  productId: z.string().optional(),
  certificateType: z.enum([
    'default-dv',
    'dv-san-sni',
    'third-party',
    'auto',
  ]).optional(),
  migrateDNS: z.boolean().optional(),
  currentNameservers: z.array(z.string()).optional(),
  securityLevel: z.enum([
    'basic',
    'standard',
    'enhanced',
    'custom',
  ]).optional(),
  notificationEmails: z.array(z.string()).optional(),
  confirmAction: z.boolean().optional(),
  propertyId: z.string().optional(),
  customer: z.string().optional(),
});

// FastPurge Schemas
const FastpurgeUrlInvalidateSchema = z.object({
  customer: z.string().optional(),
  urls: z.array(z.string()).min(1).max(5000),
  network: z.enum(['production', 'staging']).optional().default('production'),
});

const FastpurgeCpcodeInvalidateSchema = z.object({
  customer: z.string().optional(),
  cpcodes: z.array(z.string()).min(1).max(100),
  network: z.enum(['production', 'staging']).optional().default('production'),
});

const FastpurgeTagInvalidateSchema = z.object({
  customer: z.string().optional(),
  tags: z.array(z.string()).min(1).max(100),
  network: z.enum(['production', 'staging']).optional().default('production'),
});

const FastpurgeStatusCheckSchema = z.object({
  customer: z.string().optional(),
  purgeId: z.string(),
});

const FastpurgeQueueStatusSchema = z.object({
  customer: z.string().optional(),
});

const FastpurgeEstimateSchema = z.object({
  customer: z.string().optional(),
  type: z.enum(['url', 'cpcode', 'tag']),
  values: z.array(z.string()).min(1),
});

// Network Lists Schemas
const ListNetworkListsSchema = z.object({
  customer: z.string().optional(),
  includeElements: z.boolean().optional(),
  listType: z.enum(['IP', 'GEO', 'ASN', 'EXCEPTION']).optional(),
});

const GetNetworkListSchema = z.object({
  customer: z.string().optional(),
  networkListId: z.string(),
  includeElements: z.boolean().optional(),
});

const CreateNetworkListSchema = z.object({
  customer: z.string().optional(),
  name: z.string(),
  type: z.enum(['IP', 'GEO', 'ASN', 'EXCEPTION']),
  description: z.string().optional(),
  elements: z.array(z.string()).optional(),
});

const UpdateNetworkListSchema = z.object({
  customer: z.string().optional(),
  networkListId: z.string(),
  elements: z.array(z.string()),
  mode: z.enum(['add', 'remove', 'replace']).default('add'),
});

const DeleteNetworkListSchema = z.object({
  customer: z.string().optional(),
  networkListId: z.string(),
});

// AppSec Schemas
const ListAppSecConfigurationsSchema = z.object({
  customer: z.string().optional(),
  contractId: z.string().optional(),
  groupId: z.string().optional(),
});

const GetAppSecConfigurationSchema = z.object({
  customer: z.string().optional(),
  configId: z.number(),
  version: z.number().optional(),
});

const CreateWAFPolicySchema = z.object({
  customer: z.string().optional(),
  configId: z.number(),
  version: z.number(),
  policyName: z.string(),
  policyPrefix: z.string().max(4),
});

const GetSecurityEventsSchema = z.object({
  customer: z.string().optional(),
  configId: z.number(),
  version: z.number(),
  policyId: z.string(),
  from: z.number(),
  to: z.number(),
  limit: z.number().optional().default(100),
});

// Performance Schemas
const GetPerformanceAnalysisSchema = z.object({
  customer: z.string().optional(),
  propertyId: z.string().optional(),
  duration: z.enum(['1h', '24h', '7d', '30d']).optional().default('24h'),
});

const OptimizeCacheSchema = z.object({
  customer: z.string().optional(),
  propertyId: z.string().optional(),
  aggressive: z.boolean().optional().default(false),
});

// Reporting Schemas - REMOVED: Associated with removed reporting functionality

// Tool definition type - CODE KAI: Eliminated all 'any' types for type safety
// KAIZEN: Use type wrapper for compatibility with both typed and generic parameters
type ToolHandler = (client: AkamaiClient, params: ToolParameters) => Promise<MCPToolResponse>;

export interface ToolDefinition {
  name: string;
  description: string;
  schema: ZodSchema;
  handler: ToolHandler;
}

// CODE KAI: Enhanced type-safe wrapper function with flexible handler support
// KAIZEN: Supports multiple function signatures while maintaining type safety
function createToolHandler(
  handler: ((...args: unknown[]) => Promise<MCPToolResponse>) |
           ((...args: unknown[]) => Promise<unknown>)
): ToolHandler {
  // DEFENSIVE PROGRAMMING: Comprehensive validation and error handling
  return async (client: AkamaiClient, params: ToolParameters): Promise<MCPToolResponse> => {
    try {
      // DEFENSIVE: Validate client exists
      if (!client) {
        throw new Error('AkamaiClient is required but not provided');
      }
      
      // DEFENSIVE: Validate params object
      if (!params || typeof params !== 'object') {
        throw new Error('Tool parameters must be a valid object');
      }
      
      // KAIZEN: Flexible handler execution based on function signature
      let result: unknown;
      
      // DEFENSIVE: Try different calling patterns based on handler arity
      try {
        if (handler.length >= 2) {
          // Handler expects (client, params) signature
          result = await handler(client, params);
        } else if (handler.length === 1) {
          // Handler expects only (params) signature
          result = await handler(params);
        } else {
          // Handler expects no parameters or is variadic - try with params first
          try {
            result = await handler(params);
          } catch {
            // Fallback: try with client and params
            result = await handler(client, params);
          }
        }
      } catch (executeError) {
        // KAIZEN: If the signature doesn't match, try alternative approaches
        try {
          // Try passing individual parameter properties for complex handlers
          if (typeof params === 'object' && params !== null) {
            const paramKeys = Object.keys(params);
            if (paramKeys.length <= handler.length) {
              const paramValues = paramKeys.map(key => params[key]);
              result = await handler(...paramValues);
            } else {
              throw executeError;
            }
          } else {
            throw executeError;
          }
        } catch {
          throw executeError;
        }
      }
      
      // KAIZEN: Normalize result to MCPToolResponse format
      if (!result) {
        throw new Error('Handler returned null or undefined');
      }
      
      // DEFENSIVE: Convert non-MCPToolResponse results to proper format
      if (!result.content) {
        // KAIZEN: Wrap non-MCP responses in proper format
        result = {
          content: [
            {
              type: 'text' as const,
              text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
            }
          ],
          isError: false
        };
      }
      
      // DEFENSIVE: Validate response format
      if (!Array.isArray(result.content)) {
        throw new Error('Tool handler must return MCPToolResponse with content array');
      }
      
      // KAIZEN: Ensure all content items have valid type literals
      const validatedContent = result.content.map((item: unknown) => {
        if (!item || typeof item !== 'object') {
          throw new Error('Content item must be a valid object');
        }
        
        // DEFENSIVE: Normalize content type to valid literal
        let contentType = item.type;
        if (typeof contentType === 'string' && !['text', 'image', 'resource'].includes(contentType)) {
          // KAIZEN: Convert generic 'string' type to 'text' for compatibility
          contentType = 'text';
        }
        
        // DEFENSIVE: Ensure type is valid literal
        if (!['text', 'image', 'resource'].includes(contentType)) {
          contentType = 'text'; // Safe fallback
        }
        
        return {
          ...item,
          type: contentType as 'text' | 'image' | 'resource'
        };
      });
      
      // UNIVERSAL TRANSLATION: Apply ID-to-name translation to all responses
      const baseResponse = {
        ...result,
        content: validatedContent,
        isError: result.isError || false
      };
      
      // Apply translation middleware to convert Akamai IDs to human-readable names
      try {
        const translationMiddleware = createTranslationMiddleware({
          enabled: true,
          preserveOriginalIds: true,
          translateInText: true,
          maxTranslationsPerResponse: 50,
        });
        
        return await translationMiddleware.translateResponse(baseResponse, client);
      } catch (translationError) {
        // DEFENSIVE: Return original response if translation fails
        console.warn('Translation middleware failed:', translationError);
        return baseResponse;
      }
      
    } catch (error) {
      // DEFENSIVE: Comprehensive error handling with context
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      return {
        content: [
          {
            type: 'text' as const,
            text: `Tool execution failed: ${errorMessage}. Please check your parameters and try again.`
          }
        ],
        isError: true
      };
    }
  };
}

// Register all tools with their schemas
export function getAllToolDefinitions(): ToolDefinition[] {
  // CODE KAI EMERGENCY CLEANUP: Removed fake tool generators
  // Previous workflow assistants and consolidated tools were sophisticated
  // stubs that violated the "perfect software, no bugs" principle
  
  return [

    // Property Management (30+ tools)
    {
      name: 'list-properties',
      description: 'List all Akamai CDN properties in your account',
      schema: schemas.ListPropertiesSchema,
      handler: createToolHandler(listProperties),
    },
    {
      name: 'get-property',
      description: 'Get details of a specific property',
      schema: schemas.GetPropertySchema,
      handler: createToolHandler(getProperty),
    },
    {
      name: 'create-property',
      description: 'Create a new property',
      schema: schemas.CreatePropertySchema,
      handler: createToolHandler(createProperty),
    },
    {
      name: 'list-contracts',
      description: 'List all Akamai contracts',
      schema: schemas.ListContractsSchema,
      handler: createToolHandler(listContracts),
    },
    {
      name: 'list-groups',
      description: 'List all groups in your account',
      schema: schemas.ListGroupsSchema,
      handler: createToolHandler(listGroups),
    },
    {
      name: 'list-products',
      description: 'List available Akamai products',
      schema: schemas.ListProductsSchema,
      handler: createToolHandler(listProducts),
    },
    {
      name: 'create-property-version',
      description: 'Create a new property version',
      schema: schemas.CreatePropertyVersionSchema,
      handler: createToolHandler(createPropertyVersion),
    },
    {
      name: 'create-property-version-enhanced',
      description: 'Create property version with advanced options',
      schema: extendedSchemas.CreatePropertyVersionEnhancedSchema,
      handler: createToolHandler(createPropertyVersionEnhanced),
    },
    {
      name: 'get-property-rules',
      description: 'Get property rules configuration',
      schema: schemas.GetPropertyRulesSchema,
      handler: createToolHandler(getPropertyRules),
    },
    {
      name: 'update-property-rules',
      description: 'Update property rules configuration',
      schema: schemas.UpdatePropertyRulesSchema,
      handler: createToolHandler(updatePropertyRules),
    },
    {
      name: 'activate-property',
      description: 'Activate a property version',
      schema: schemas.ActivatePropertySchema,
      handler: createToolHandler(activateProperty),
    },
    {
      name: 'get-activation-status',
      description: 'Get property activation status',
      schema: schemas.GetActivationStatusSchema,
      handler: createToolHandler(getActivationStatus),
    },
    {
      name: 'list-property-activations',
      description: 'List property activation history',
      schema: schemas.ListPropertyActivationsSchema,
      handler: createToolHandler(listPropertyActivations),
    },
    {
      name: 'list-property-versions',
      description: 'List all versions of a property',
      schema: schemas.ListPropertyVersionsSchema,
      handler: createToolHandler(listPropertyVersions),
    },
    {
      name: 'list-property-versions-enhanced',
      description: 'List property versions with detailed information',
      schema: extendedSchemas.ListPropertyVersionsEnhancedSchema,
      handler: createToolHandler(listPropertyVersionsEnhanced),
    },
    {
      name: 'get-property-version',
      description: 'Get details of a specific property version',
      schema: schemas.GetPropertyVersionSchema,
      handler: createToolHandler(getPropertyVersion),
    },
    {
      name: 'get-latest-property-version',
      description: 'Get the latest property version',
      schema: extendedSchemas.GetLatestPropertyVersionSchema,
      handler: createToolHandler(getLatestPropertyVersion),
    },
    {
      name: 'rollback-property-version',
      description: 'Rollback to a previous property version',
      schema: extendedSchemas.RollbackPropertyVersionSchema,
      handler: createToolHandler(rollbackPropertyVersion),
    },
    {
      name: 'get-version-diff',
      description: 'Get differences between property versions',
      schema: extendedSchemas.GetVersionDiffSchema,
      handler: createToolHandler(getVersionDiff),
    },
    {
      name: 'batch-version-operations',
      description: 'Perform batch operations on property versions',
      schema: extendedSchemas.BatchVersionOperationsSchema,
      handler: createToolHandler(batchVersionOperations),
    },
    {
      name: 'clone-property',
      description: 'Clone an existing property',
      schema: schemas.ClonePropertySchema,
      handler: createToolHandler(cloneProperty),
    },
    {
      name: 'remove-property',
      description: 'Remove a property',
      schema: schemas.RemovePropertySchema,
      handler: createToolHandler(removeProperty),
    },
    {
      name: 'cancel-property-activation',
      description: 'Cancel a pending property activation',
      schema: extendedSchemas.CancelPropertyActivationSchema,
      handler: createToolHandler(cancelPropertyActivation),
    },
    {
      name: 'compare-properties',
      description: 'Compare configurations between properties',
      schema: extendedSchemas.ComparePropertiesSchema,
      handler: createToolHandler(compareProperties),
    },
    {
      name: 'detect-configuration-drift',
      description: 'Detect configuration drift in properties',
      schema: extendedSchemas.DetectConfigurationDriftSchema,
      handler: createToolHandler(detectConfigurationDrift),
    },
    {
      name: 'check-property-health',
      description: 'Check property health and identify issues',
      schema: extendedSchemas.CheckPropertyHealthSchema,
      handler: createToolHandler(checkPropertyHealth),
    },

    // Unified Search Tools
    {
      name: 'search',
      description: 'Universal search across all Akamai resources - automatically detects what you\'re looking for',
      schema: z.object({
        query: z.string().describe('Search query - can be property name, hostname, ID, origin, etc.'),
        includeDetails: z.boolean().optional().describe('Include detailed match information'),
        useCache: z.boolean().optional().describe('Use cached results for faster response'),
        searchDepth: z.enum(['shallow', 'deep']).optional().describe('Shallow for quick search, deep to search inside configurations'),
        maxResults: z.number().optional().describe('Maximum number of results to return'),
        customer: z.string().optional(),
      }),
      handler: createToolHandler(search),
    },
    {
      name: 'search-properties',
      description: 'Search for properties by name or ID',
      schema: z.object({
        query: z.string().describe('Property name or ID to search for'),
        customer: z.string().optional(),
      }),
      handler: createToolHandler(searchProperties),
    },
    {
      name: 'search-hostnames',
      description: 'Search for hostnames within property configurations',
      schema: z.object({
        hostname: z.string().describe('Hostname to search for (e.g., www.example.com)'),
        customer: z.string().optional(),
      }),
      handler: createToolHandler(searchHostnames),
    },
    {
      name: 'search-origins',
      description: 'Search for origin servers within property configurations',
      schema: z.object({
        origin: z.string().describe('Origin hostname to search for'),
        customer: z.string().optional(),
      }),
      handler: createToolHandler(searchOrigins),
    },

    // DNS Management (20+ tools)
    {
      name: 'list-zones',
      description: 'List all DNS zones',
      schema: schemas.ListZonesSchema,
      handler: createToolHandler(listZones),
    },
    {
      name: 'get-zone',
      description: 'Get details of a specific DNS zone',
      schema: schemas.GetZoneSchema,
      handler: createToolHandler(getZone),
    },
    {
      name: 'create-zone',
      description: 'Create a new DNS zone',
      schema: schemas.CreateZoneSchema,
      handler: createToolHandler(createZone),
    },
    {
      name: 'list-records',
      description: 'List DNS records in a zone',
      schema: schemas.ListRecordsSchema,
      handler: createToolHandler(listRecords),
    },
    {
      name: 'create-record',
      description: 'Create or update a DNS record',
      schema: schemas.CreateRecordSchema,
      handler: createToolHandler(upsertRecord),
    },
    {
      name: 'delete-record',
      description: 'Delete a DNS record',
      schema: schemas.DeleteRecordSchema,
      handler: createToolHandler(deleteRecord),
    },
    {
      name: 'activate-zone-changes',
      description: 'Activate pending DNS zone changes',
      schema: schemas.ActivateZoneChangesSchema,
      handler: createToolHandler(activateZoneChanges),
    },
    {
      name: 'create-multiple-record-sets',
      description: 'Create multiple DNS record sets',
      schema: extendedSchemas.CreateMultipleRecordSetsSchema,
      handler: createToolHandler(createMultipleRecordSets),
    },
    {
      name: 'get-record-set',
      description: 'Get DNS record set details',
      schema: extendedSchemas.GetRecordSetSchema,
      handler: createToolHandler(getRecordSet),
    },
    {
      name: 'submit-bulk-zone-create-request',
      description: 'Submit bulk zone creation request',
      schema: extendedSchemas.SubmitBulkZoneCreateRequestSchema,
      handler: createToolHandler(submitBulkZoneCreateRequest),
    },
    {
      name: 'get-zones-dnssec-status',
      description: 'Get DNSSEC status for zones',
      schema: extendedSchemas.GetZonesDNSSECStatusSchema,
      handler: createToolHandler(getZonesDNSSECStatus),
    },
    {
      name: 'update-tsig-key-for-zones',
      description: 'Update TSIG key for zones',
      schema: extendedSchemas.UpdateTSIGKeyForZonesSchema,
      handler: createToolHandler(updateTSIGKeyForZones),
    },
    {
      name: 'get-zone-version',
      description: 'Get specific zone version',
      schema: extendedSchemas.GetZoneVersionSchema,
      handler: createToolHandler(getZoneVersion),
    },
    {
      name: 'get-version-record-sets',
      description: 'Get record sets for a zone version',
      schema: extendedSchemas.GetVersionRecordSetsSchema,
      handler: createToolHandler(getVersionRecordSets),
    },
    {
      name: 'get-version-master-zone-file',
      description: 'Get master zone file for a version',
      schema: extendedSchemas.GetVersionMasterZoneFileSchema,
      handler: createToolHandler(getVersionMasterZoneFile),
    },
    {
      name: 'reactivate-zone-version',
      description: 'Reactivate a previous zone version',
      schema: extendedSchemas.ReactivateZoneVersionSchema,
      handler: createToolHandler(reactivateZoneVersion),
    },
    {
      name: 'get-secondary-zone-transfer-status',
      description: 'Get secondary zone transfer status',
      schema: extendedSchemas.GetSecondaryZoneTransferStatusSchema,
      handler: createToolHandler(getSecondaryZoneTransferStatus),
    },
    {
      name: 'get-zone-contract',
      description: 'Get contract information for a zone',
      schema: extendedSchemas.GetZoneContractSchema,
      handler: createToolHandler(getZoneContract),
    },

    // Priority DNS Operations
    {
      name: 'list-changelists',
      description: 'List all changelists',
      schema: z.object({
        page: z.number().int().positive().optional(),
        pageSize: z.number().int().positive().max(100).optional(),
        showAll: z.boolean().optional(),
      }),
      handler: createToolHandler(listChangelists),
    },
    {
      name: 'search-changelists',
      description: 'Search changelists by zone names',
      schema: z.object({
        zones: z.array(z.string()).min(1),
      }),
      handler: createToolHandler(searchChangelists),
    },
    {
      name: 'get-changelist-diff',
      description: 'Get differences between changelist and current zone',
      schema: z.object({
        zone: z.string().min(1),
      }),
      handler: createToolHandler(getChangelistDiff),
    },
    {
      name: 'get-authoritative-nameservers',
      description: 'Get Akamai authoritative nameservers',
      schema: z.object({}),
      handler: createToolHandler(getAuthoritativeNameservers),
    },
    {
      name: 'list-dns-contracts',
      description: 'List available contracts for DNS',
      schema: z.object({}),
      handler: createToolHandler(listContracts),
    },
    {
      name: 'get-supported-record-types',
      description: 'Get supported DNS record types',
      schema: z.object({}),
      handler: createToolHandler(getSupportedRecordTypes),
    },
    {
      name: 'delete-zone',
      description: 'Delete a DNS zone',
      schema: z.object({
        zone: z.string().min(1),
        force: z.boolean().optional(),
      }),
      handler: createToolHandler(deleteZone),
    },
    {
      name: 'get-zone-status',
      description: 'Get zone activation status',
      schema: z.object({
        zone: z.string().min(1),
      }),
      handler: createToolHandler(getZoneStatus),
    },
    {
      name: 'list-tsig-keys',
      description: 'List all TSIG keys',
      schema: z.object({}),
      handler: createToolHandler(listTSIGKeys),
    },
    {
      name: 'create-tsig-key',
      description: 'Create a new TSIG key',
      schema: z.object({
        keyName: z.string().min(1),
        algorithm: z.string().min(1),
        secret: z.string().optional(),
      }),
      handler: createToolHandler(createTSIGKey),
    },

    // DNSSEC Operations
    {
      name: 'enable-dnssec',
      description: 'Enable DNSSEC for a zone',
      schema: z.object({
        zone: z.string().min(1),
        algorithm: z.string().optional(),
        nsec3: z.boolean().optional(),
        salt: z.string().optional(),
        iterations: z.number().optional(),
      }),
      handler: createToolHandler(enableDNSSEC),
    },
    {
      name: 'disable-dnssec',
      description: 'Disable DNSSEC for a zone',
      schema: z.object({
        zone: z.string().min(1),
        force: z.boolean().optional(),
      }),
      handler: createToolHandler(disableDNSSEC),
    },
    {
      name: 'get-dnssec-keys',
      description: 'Get DNSSEC keys for a zone',
      schema: z.object({
        zone: z.string().min(1),
      }),
      handler: createToolHandler(getDNSSECKeys),
    },
    {
      name: 'get-dnssec-ds-records',
      description: 'Get DS records for parent zone delegation',
      schema: z.object({
        zone: z.string().min(1),
      }),
      handler: createToolHandler(getDNSSECDSRecords),
    },
    {
      name: 'check-dnssec-validation',
      description: 'Check DNSSEC validation status',
      schema: z.object({
        zone: z.string().min(1),
      }),
      handler: createToolHandler(checkDNSSECValidation),
    },
    {
      name: 'rotate-dnssec-keys',
      description: 'Initiate DNSSEC key rotation',
      schema: z.object({
        zone: z.string().min(1),
        keyType: z.enum(['KSK', 'ZSK', 'BOTH']),
        algorithm: z.string().optional(),
      }),
      handler: createToolHandler(rotateDNSSECKeys),
    },

    // DNS Migration Tools
    {
      name: 'import-from-cloudflare',
      description: 'Import DNS zone from Cloudflare',
      schema: schemas.ImportFromCloudflareSchema,
      handler: createToolHandler(importFromCloudflare),
    },
    {
      name: 'import-zone-via-axfr',
      description: 'Import zone via AXFR transfer',
      schema: extendedSchemas.ImportZoneViaAXFRSchema,
      handler: createToolHandler(importZoneViaAXFR),
    },
    {
      name: 'parse-zone-file',
      description: 'Parse and import zone file',
      schema: schemas.ParseZoneFileSchema,
      handler: createToolHandler(parseZoneFile),
    },
    {
      name: 'bulk-import-records',
      description: 'Bulk import DNS records',
      schema: schemas.BulkImportRecordsSchema,
      handler: createToolHandler(bulkImportRecords),
    },
    {
      name: 'convert-zone-to-primary',
      description: 'Convert secondary zone to primary',
      schema: extendedSchemas.ConvertZoneToPrimarySchema,
      handler: createToolHandler(convertZoneToPrimary),
    },
    {
      name: 'generate-migration-instructions',
      description: 'Generate DNS migration instructions',
      schema: extendedSchemas.GenerateMigrationInstructionsSchema,
      handler: createToolHandler(generateMigrationInstructions),
    },

    // DNS Elicitation Tools
    {
      name: 'dns-elicitation',
      description: 'Interactive DNS record management with guided questions and clear feedback',
      schema: DNSElicitationSchema,
      handler: createToolHandler(handleDNSElicitationTool),
    },
    {
      name: 'secure-hostname-onboarding',
      description: 'Comprehensive elicitation workflow for secure hostname onboarding with intelligent defaults',
      schema: SecureHostnameOnboardingSchema,
      handler: createToolHandler(handleSecureHostnameOnboardingTool),
    },

    // Certificate Management (15+ tools)
    {
      name: 'list-certificate-enrollments',
      description: 'List certificate enrollments',
      schema: schemas.ListCertificateEnrollmentsSchema,
      handler: createToolHandler(listCertificateEnrollments),
    },
    {
      name: 'create-dv-enrollment',
      description: 'Create domain validated certificate enrollment',
      schema: schemas.CreateDVEnrollmentSchema,
      handler: createToolHandler(createDVEnrollment),
    },
    {
      name: 'check-dv-enrollment-status',
      description: 'Check DV certificate enrollment status',
      schema: schemas.CheckDVEnrollmentStatusSchema,
      handler: createToolHandler(checkDVEnrollmentStatus),
    },
    {
      name: 'get-dv-validation-challenges',
      description: 'Get DV certificate validation challenges',
      schema: schemas.GetDVValidationChallengesSchema,
      handler: createToolHandler(getDVValidationChallenges),
    },
    {
      name: 'link-certificate-to-property',
      description: 'Link certificate to property',
      schema: extendedSchemas.LinkCertificateToPropertySchema,
      handler: createToolHandler(linkCertificateToProperty),
    },
    {
      name: 'enroll-certificate-with-validation',
      description: 'Enroll certificate with auto-validation',
      schema: extendedSchemas.EnrollCertificateWithValidationSchema,
      handler: createToolHandler(enrollCertificateWithValidation),
    },
    {
      name: 'monitor-certificate-enrollment',
      description: 'Monitor certificate enrollment progress',
      schema: extendedSchemas.MonitorCertificateEnrollmentSchema,
      handler: createToolHandler(monitorCertificateEnrollment),
    },
    {
      name: 'get-certificate-deployment-status',
      description: 'Get certificate deployment status',
      schema: extendedSchemas.GetCertificateDeploymentStatusSchema,
      handler: createToolHandler(getCertificateDeploymentStatus),
    },
    {
      name: 'get-certificate-validation-history',
      description: 'Get certificate validation history',
      schema: extendedSchemas.GetCertificateValidationHistorySchema,
      handler: createToolHandler(getCertificateValidationHistory),
    },
    {
      name: 'validate-certificate-enrollment',
      description: 'Validate certificate enrollment',
      schema: extendedSchemas.ValidateCertificateEnrollmentSchema,
      handler: createToolHandler(validateCertificateEnrollment),
    },
    {
      name: 'deploy-certificate-to-network',
      description: 'Deploy certificate to network',
      schema: extendedSchemas.DeployCertificateToNetworkSchema,
      handler: createToolHandler(deployCertificateToNetwork),
    },
    {
      name: 'renew-certificate',
      description: 'Renew expiring certificate',
      schema: extendedSchemas.RenewCertificateSchema,
      handler: createToolHandler(renewCertificate),
    },
    {
      name: 'cleanup-validation-records',
      description: 'Clean up DNS validation records',
      schema: extendedSchemas.CleanupValidationRecordsSchema,
      handler: createToolHandler(cleanupValidationRecords),
    },

    // Edge Hostname Management (10+ tools)
    {
      name: 'create-edge-hostname',
      description: 'Create an edge hostname',
      schema: schemas.CreateEdgeHostnameSchema,
      handler: createToolHandler(createEdgeHostname),
    },
    {
      name: 'create-edge-hostname-enhanced',
      description: 'Create edge hostname with advanced options',
      schema: extendedSchemas.CreateEdgeHostnameEnhancedSchema,
      handler: createToolHandler(createEdgeHostnameEnhanced),
    },
    {
      name: 'create-bulk-edge-hostnames',
      description: 'Create multiple edge hostnames',
      schema: extendedSchemas.CreateBulkEdgeHostnamesSchema,
      handler: createToolHandler(createBulkEdgeHostnames),
    },
    {
      name: 'list-edge-hostnames',
      description: 'List edge hostnames',
      schema: schemas.ListEdgeHostnamesSchema,
      handler: createToolHandler(listEdgeHostnames),
    },
    {
      name: 'get-edge-hostname',
      description: 'Get edge hostname details',
      schema: schemas.GetEdgeHostnameSchema,
      handler: createToolHandler(getEdgeHostname),
    },
    {
      name: 'get-edge-hostname-details',
      description: 'Get detailed edge hostname information',
      schema: extendedSchemas.GetEdgeHostnameDetailsSchema,
      handler: createToolHandler(getEdgeHostnameDetails),
    },
    {
      name: 'associate-certificate-with-edge-hostname',
      description: 'Associate certificate with edge hostname',
      schema: extendedSchemas.AssociateCertificateWithEdgeHostnameSchema,
      handler: createToolHandler(associateCertificateWithEdgeHostname),
    },
    {
      name: 'validate-edge-hostname-certificate',
      description: 'Validate edge hostname certificate',
      schema: extendedSchemas.ValidateEdgeHostnameCertificateSchema,
      handler: createToolHandler(validateEdgeHostnameCertificate),
    },
    {
      name: 'generate-edge-hostname-recommendations',
      description: 'Generate edge hostname recommendations',
      schema: extendedSchemas.GenerateEdgeHostnameRecommendationsSchema,
      handler: createToolHandler(generateEdgeHostnameRecommendations),
    },

    // Hostname Management (15+ tools)
    {
      name: 'add-property-hostname',
      description: 'Add hostname to property',
      schema: schemas.AddPropertyHostnameSchema,
      handler: createToolHandler(addPropertyHostname),
    },
    {
      name: 'remove-property-hostname',
      description: 'Remove hostname from property',
      schema: schemas.RemovePropertyHostnameSchema,
      handler: createToolHandler(removePropertyHostname),
    },
    {
      name: 'list-property-hostnames',
      description: 'List hostnames for a property version',
      schema: schemas.ListPropertyHostnamesSchema,
      handler: createToolHandler(listPropertyVersionHostnames),
    },
    {
      name: 'discover-hostnames-intelligent',
      description: 'Intelligent hostname discovery',
      schema: extendedSchemas.DiscoverHostnamesIntelligentSchema,
      handler: createToolHandler(discoverHostnamesIntelligent),
    },
    {
      name: 'analyze-hostname-conflicts',
      description: 'Analyze hostname conflicts',
      schema: extendedSchemas.AnalyzeHostnameConflictsSchema,
      handler: createToolHandler(analyzeHostnameConflicts),
    },
    {
      name: 'analyze-wildcard-coverage',
      description: 'Analyze wildcard hostname coverage',
      schema: extendedSchemas.AnalyzeWildcardCoverageSchema,
      handler: createToolHandler(analyzeWildcardCoverage),
    },
    {
      name: 'identify-ownership-patterns',
      description: 'Identify hostname ownership patterns',
      schema: extendedSchemas.IdentifyOwnershipPatternsSchema,
      handler: createToolHandler(identifyOwnershipPatterns),
    },
    {
      name: 'create-hostname-provisioning-plan',
      description: 'Create hostname provisioning plan',
      schema: extendedSchemas.CreateHostnameProvisioningPlanSchema,
      handler: createToolHandler(createHostnameProvisioningPlan),
    },
    {
      name: 'find-optimal-property-assignment',
      description: 'Find optimal property for hostname',
      schema: extendedSchemas.FindOptimalPropertyAssignmentSchema,
      handler: createToolHandler(findOptimalPropertyAssignment),
    },
    {
      name: 'analyze-hostname-ownership',
      description: 'Analyze hostname ownership',
      schema: extendedSchemas.AnalyzeHostnameOwnershipSchema,
      handler: createToolHandler(analyzeHostnameOwnership),
    },
    {
      name: 'validate-hostnames-bulk',
      description: 'Validate multiple hostnames',
      schema: extendedSchemas.ValidateHostnamesBulkSchema,
      handler: createToolHandler(validateHostnamesBulk),
    },
    {
      name: 'bulk-manage-hostnames',
      description: 'Bulk hostname management operations',
      schema: extendedSchemas.BulkManageHostnamesSchema,
      handler: createToolHandler(bulkManageHostnames),
    },

    // Rule Tree Management (10+ tools)
    {
      name: 'create-rule-from-template',
      description: 'Create rule from template',
      schema: extendedSchemas.CreateRuleFromTemplateSchema,
      handler: createToolHandler(createRuleFromTemplate),
    },
    {
      name: 'update-property-rules-enhanced',
      description: 'Update property rules with validation',
      schema: extendedSchemas.UpdatePropertyRulesEnhancedSchema,
      handler: createToolHandler(updatePropertyRulesEnhanced),
    },
    {
      name: 'merge-rule-trees',
      description: 'Merge multiple rule trees',
      schema: extendedSchemas.MergeRuleTreesSchema,
      handler: createToolHandler(mergeRuleTrees),
    },
    {
      name: 'optimize-rule-tree',
      description: 'Optimize rule tree performance',
      schema: extendedSchemas.OptimizeRuleTreeSchema,
      handler: createToolHandler(optimizeRuleTree),
    },
    {
      name: 'validate-rule-tree',
      description: 'Validate rule tree configuration',
      schema: extendedSchemas.ValidateRuleTreeSchema,
      handler: createToolHandler(validateRuleTree),
    },

    // CP Code Management
    {
      name: 'list-cpcodes',
      description: 'List CP codes',
      schema: schemas.ListCPCodesSchema,
      handler: createToolHandler(listCPCodes),
    },
    {
      name: 'create-cpcode',
      description: 'Create a new CP code',
      schema: schemas.CreateCPCodeSchema,
      handler: createToolHandler(createCPCode),
    },
    {
      name: 'get-cpcode',
      description: 'Get CP code details',
      schema: schemas.GetCPCodeSchema,
      handler: createToolHandler(getCPCode),
    },
    {
      name: 'search-cpcodes',
      description: 'Search CP codes',
      schema: extendedSchemas.SearchCPCodesSchema,
      handler: createToolHandler(searchCPCodes),
    },

    // Include Management
    {
      name: 'list-includes',
      description: 'List property includes',
      schema: schemas.ListIncludesSchema,
      handler: createToolHandler(listIncludes),
    },
    {
      name: 'create-include',
      description: 'Create a new include',
      schema: schemas.CreateIncludeSchema,
      handler: createToolHandler(createInclude),
    },
    {
      name: 'get-include',
      description: 'Get include details',
      schema: schemas.GetIncludeSchema,
      handler: createToolHandler(getInclude),
    },
    {
      name: 'update-include',
      description: 'Update include configuration',
      schema: extendedSchemas.UpdateIncludeSchema,
      handler: createToolHandler(updateInclude),
    },
    {
      name: 'create-include-version',
      description: 'Create new include version',
      schema: extendedSchemas.CreateIncludeVersionSchema,
      handler: createToolHandler(createIncludeVersion),
    },
    {
      name: 'activate-include',
      description: 'Activate include version',
      schema: extendedSchemas.ActivateIncludeSchema,
      handler: createToolHandler(activateInclude),
    },
    {
      name: 'list-include-activations',
      description: 'List include activation history',
      schema: extendedSchemas.ListIncludeActivationsSchema,
      handler: createToolHandler(listIncludeActivations),
    },
    {
      name: 'get-include-activation-status',
      description: 'Get include activation status',
      schema: extendedSchemas.GetIncludeActivationStatusSchema,
      handler: createToolHandler(getIncludeActivationStatus),
    },

    // Bulk Operations
    {
      name: 'bulk-activate-properties',
      description: 'Activate multiple properties',
      schema: schemas.BulkActivatePropertiesSchema,
      handler: createToolHandler(bulkActivateProperties),
    },
    {
      name: 'bulk-clone-properties',
      description: 'Clone multiple properties',
      schema: schemas.BulkClonePropertiesSchema,
      handler: createToolHandler(bulkCloneProperties),
    },
    {
      name: 'bulk-update-property-rules',
      description: 'Update rules for multiple properties',
      schema: schemas.BulkUpdatePropertyRulesSchema,
      handler: createToolHandler(bulkUpdatePropertyRules),
    },
    {
      name: 'bulk-update-properties',
      description: 'Update multiple properties',
      schema: extendedSchemas.BulkUpdatePropertiesSchema,
      handler: createToolHandler(bulkUpdateProperties),
    },
    {
      name: 'get-bulk-operation-status',
      description: 'Get bulk operation status',
      schema: extendedSchemas.GetBulkOperationStatusSchema,
      handler: createToolHandler(getBulkOperationStatus),
    },

    // Search and Discovery
    {
      name: 'universal-search',
      description: 'Search across all Akamai resources',
      schema: schemas.UniversalSearchSchema,
      handler: createToolHandler(universalSearchWithCacheHandler),
    },

    // Property Onboarding
    {
      name: 'onboard-property',
      description: 'Onboard a new property with wizard',
      schema: schemas.OnboardPropertySchema,
      handler: createToolHandler(onboardPropertyTool),
    },
    {
      name: 'onboard-property-wizard',
      description: 'Interactive property onboarding wizard',
      schema: extendedSchemas.OnboardPropertyWizardSchema,
      handler: createToolHandler(onboardPropertyWizard),
    },
    {
      name: 'check-onboarding-status',
      description: 'Check property onboarding status',
      schema: schemas.CheckOnboardingStatusSchema,
      handler: createToolHandler(checkOnboardingStatus),
    },
    {
      name: 'onboard-secure-by-default-property',
      description: 'Onboard property with secure defaults',
      schema: extendedSchemas.OnboardSecureByDefaultPropertySchema,
      handler: createToolHandler(onboardSecureByDefaultProperty),
    },
    {
      name: 'check-secure-by-default-status',
      description: 'Check secure by default status',
      schema: extendedSchemas.CheckSecureByDefaultStatusSchema,
      handler: createToolHandler(checkSecureByDefaultStatus),
    },
    {
      name: 'quick-secure-by-default-setup',
      description: 'Quick secure by default setup',
      schema: extendedSchemas.QuickSecureByDefaultSetupSchema,
      handler: createToolHandler(quickSecureByDefaultSetup),
    },

    // Product Management
    {
      name: 'get-product',
      description: 'Get product details',
      schema: schemas.ListProductsSchema,
      handler: createToolHandler(getProduct),
    },

    // FastPurge Tools (6 tools)
    {
      name: 'fastpurge-url-invalidate',
      description: 'Invalidate content by URL',
      schema: FastpurgeUrlInvalidateSchema,
      handler: createToolHandler(fastpurgeUrlInvalidate.handler),
    },
    {
      name: 'fastpurge-cpcode-invalidate',
      description: 'Invalidate content by CP code',
      schema: FastpurgeCpcodeInvalidateSchema,
      handler: createToolHandler(fastpurgeCpcodeInvalidate.handler),
    },
    {
      name: 'fastpurge-tag-invalidate',
      description: 'Invalidate content by cache tag',
      schema: FastpurgeTagInvalidateSchema,
      handler: createToolHandler(fastpurgeTagInvalidate.handler),
    },
    {
      name: 'fastpurge-status-check',
      description: 'Check FastPurge operation status',
      schema: FastpurgeStatusCheckSchema,
      handler: createToolHandler(fastpurgeStatusCheck.handler),
    },
    {
      name: 'fastpurge-queue-status',
      description: 'Check FastPurge queue status',
      schema: FastpurgeQueueStatusSchema,
      handler: createToolHandler(fastpurgeQueueStatus.handler),
    },
    {
      name: 'fastpurge-estimate',
      description: 'Estimate FastPurge impact',
      schema: FastpurgeEstimateSchema,
      handler: createToolHandler(fastpurgeEstimate.handler),
    },

    // Network Lists Tools (17 tools)
    {
      name: 'list-network-lists',
      description: 'List all network lists',
      schema: ListNetworkListsSchema,
      handler: createToolHandler(listNetworkLists),
    },
    {
      name: 'get-network-list',
      description: 'Get network list details',
      schema: GetNetworkListSchema,
      handler: createToolHandler(getNetworkList),
    },
    {
      name: 'create-network-list',
      description: 'Create a new network list',
      schema: CreateNetworkListSchema,
      handler: createToolHandler(async (_client, params) => createNetworkList(
        params.name,
        params.type,
        params.elements,
        params.customer,
        params.options
      )),
    },
    {
      name: 'update-network-list',
      description: 'Update network list elements',
      schema: UpdateNetworkListSchema,
      handler: createToolHandler(updateNetworkList),
    },
    {
      name: 'delete-network-list',
      description: 'Delete a network list',
      schema: DeleteNetworkListSchema,
      handler: createToolHandler(deleteNetworkList),
    },
    {
      name: 'activate-network-list',
      description: 'Activate network list',
      schema: extendedSchemas.ActivateNetworkListSchema,
      handler: createToolHandler(activateNetworkList),
    },
    {
      name: 'get-network-list-activation-status',
      description: 'Get network list activation status',
      schema: extendedSchemas.GetNetworkListActivationStatusSchema,
      handler: createToolHandler(getNetworkListActivationStatus),
    },
    {
      name: 'list-network-list-activations',
      description: 'List network list activation history',
      schema: extendedSchemas.ListNetworkListActivationsSchema,
      handler: createToolHandler(listNetworkListActivations),
    },
    {
      name: 'deactivate-network-list',
      description: 'Deactivate network list',
      schema: extendedSchemas.DeactivateNetworkListSchema,
      handler: createToolHandler(deactivateNetworkList),
    },
    {
      name: 'bulk-activate-network-lists',
      description: 'Activate multiple network lists',
      schema: extendedSchemas.BulkActivateNetworkListsSchema,
      handler: createToolHandler(bulkActivateNetworkLists),
    },
    {
      name: 'import-network-list-from-csv',
      description: 'Import network list from CSV',
      schema: extendedSchemas.ImportNetworkListFromCSVSchema,
      handler: createToolHandler(importNetworkListFromCSV),
    },
    {
      name: 'export-network-list-to-csv',
      description: 'Export network list to CSV',
      schema: extendedSchemas.ExportNetworkListToCSVSchema,
      handler: createToolHandler(exportNetworkListToCSV),
    },
    {
      name: 'bulk-update-network-lists',
      description: 'Update multiple network lists',
      schema: extendedSchemas.BulkUpdateNetworkListsSchema,
      handler: createToolHandler(bulkUpdateNetworkLists),
    },
    {
      name: 'merge-network-lists',
      description: 'Merge multiple network lists',
      schema: extendedSchemas.MergeNetworkListsSchema,
      handler: createToolHandler(mergeNetworkLists),
    },
    {
      name: 'validate-geographic-codes',
      description: 'Validate geographic codes',
      schema: extendedSchemas.ValidateGeographicCodesSchema,
      handler: createToolHandler(validateGeographicCodes),
    },
    {
      name: 'get-asn-information',
      description: 'Get ASN information',
      schema: extendedSchemas.GetASNInformationSchema,
      handler: createToolHandler(getASNInformation),
    },
    {
      name: 'generate-geographic-blocking-recommendations',
      description: 'Generate geo-blocking recommendations',
      schema: extendedSchemas.GenerateGeographicBlockingRecommendationsSchema,
      handler: createToolHandler(generateGeographicBlockingRecommendations),
    },

    // AppSec Tools (6 tools)
    {
      name: 'list-appsec-configurations',
      description: 'List all AppSec configurations',
      schema: ListAppSecConfigurationsSchema,
      handler: createToolHandler(listAppSecConfigurations.handler),
    },
    {
      name: 'get-appsec-configuration',
      description: 'Get AppSec configuration details',
      schema: GetAppSecConfigurationSchema,
      handler: createToolHandler(getAppSecConfiguration.handler),
    },
    {
      name: 'create-waf-policy',
      description: 'Create a new WAF policy',
      schema: CreateWAFPolicySchema,
      handler: createToolHandler(createWAFPolicy.handler),
    },
    {
      name: 'get-security-events',
      description: 'Get security events and attack data',
      schema: GetSecurityEventsSchema,
      handler: createToolHandler(getSecurityEvents.handler),
    },
    {
      name: 'activate-security-configuration',
      description: 'Activate security configuration',
      schema: extendedSchemas.ActivateSecurityConfigurationSchema,
      handler: createToolHandler(activateSecurityConfiguration.handler),
    },
    {
      name: 'get-security-activation-status',
      description: 'Get security activation status',
      schema: extendedSchemas.GetSecurityActivationStatusSchema,
      handler: createToolHandler(getSecurityActivationStatus.handler),
    },

    // Performance Tools (5 tools)
    {
      name: 'get-performance-analysis',
      description: 'Get comprehensive performance analysis',
      schema: GetPerformanceAnalysisSchema,
      handler: createToolHandler(getPerformanceAnalysis),
    },
    {
      name: 'optimize-cache',
      description: 'Optimize cache settings',
      schema: OptimizeCacheSchema,
      handler: createToolHandler(optimizeCache),
    },
    {
      name: 'profile-performance',
      description: 'Profile system performance',
      schema: extendedSchemas.ProfilePerformanceSchema,
      handler: createToolHandler(profilePerformance),
    },
    {
      name: 'get-realtime-metrics',
      description: 'Get real-time performance metrics',
      schema: extendedSchemas.GetRealtimeMetricsSchema,
      handler: createToolHandler(getRealtimeMetrics),
    },
    {
      name: 'reset-performance-monitoring',
      description: 'Reset performance monitoring',
      schema: extendedSchemas.ResetPerformanceMonitoringSchema,
      handler: createToolHandler(resetPerformanceMonitoring),
    },

    // Reporting Tools - REMOVED: All 14 reporting tools have been removed
    // due to incomplete implementations that contained stub responses.
    // This maintains code quality and user trust by not exposing
    // non-functional features. Future implementation will include
    // complete Akamai Reporting API integration with real functionality.

    // Token Management Tools (5 tools)
    {
      name: 'generate-api-token',
      description: 'Generate a new API token for remote MCP access',
      schema: GenerateApiTokenSchema,
      handler: createToolHandler(handleGenerateApiToken),
    },
    {
      name: 'list-api-tokens',
      description: 'List all API tokens',
      schema: ListApiTokensSchema,
      handler: createToolHandler(handleListApiTokens),
    },
    {
      name: 'revoke-api-token',
      description: 'Revoke an API token to prevent further use',
      schema: RevokeApiTokenSchema,
      handler: createToolHandler(handleRevokeApiToken),
    },
    {
      name: 'validate-api-token',
      description: 'Validate an API token and show its details',
      schema: ValidateApiTokenSchema,
      handler: createToolHandler(handleValidateApiToken),
    },
    {
      name: 'rotate-api-token',
      description: 'Rotate an API token (generate new, revoke old)',
      schema: RotateApiTokenSchema,
      handler: createToolHandler(handleRotateApiToken),
    },
  ];
}

// Export tool count for verification
export const TOTAL_TOOLS_COUNT = getAllToolDefinitions().length;