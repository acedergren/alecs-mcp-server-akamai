/**
 * Complete Tool Registration for ALECS Full Server
 * Registers ALL available tools (~180 tools) with proper schemas
 * Plus Maya Chen's Workflow Assistants for simplified UX
 * Now includes Consolidated Tools for improved architecture
 */

import { z, type ZodSchema } from 'zod';

// Import Workflow Assistants (Maya Chen's UX Transformation)
import { getWorkflowAssistantTools, handleWorkflowAssistantRequest } from './workflows';

// Import Consolidated Tools (Maya's Tool Consolidation)
import { getConsolidatedTools, handleConsolidatedToolRequest } from './consolidated';

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
  updatePropertyWithDefaultDV,
  updatePropertyWithCPSCertificate,
  listPropertyVersionsEnhanced,
} from './property-manager-tools';

import {
  searchProperties,
  listPropertyVersions,
  getPropertyVersion,
  getLatestPropertyVersion,
  listPropertyVersionHostnames,
  listAllHostnames,
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
  searchPropertiesAdvanced,
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
  generateASNSecurityRecommendations,
  listCommonGeographicCodes,
} from './security/network-lists-geo-asn';

import {
  getSecurityPolicyIntegrationGuidance,
  generateDeploymentChecklist,
} from './security/network-lists-integration';

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

// Reporting Tools
import {
  getTrafficSummary,
  getTimeseriesData,
  getPerformanceBenchmarks,
  analyzeCachePerformance,
  getCostOptimizationInsights,
  analyzeBandwidthUsage,
  createReportingDashboard,
  exportReportData,
  configureMonitoringAlerts,
  getRealtimeMetrics as getReportingRealtimeMetrics,
  analyzeTrafficTrends,
  generatePerformanceReport,
  analyzeGeographicPerformance,
  analyzeErrorPatterns,
} from './reporting-tools';

// Token Management Tools
import {
  handleGenerateApiToken,
  handleListApiTokens,
  handleRevokeApiToken,
  handleValidateApiToken,
  handleRotateApiToken,
} from './token-tools';

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

// Reporting Schemas
const GetTrafficSummarySchema = z.object({
  customer: z.string().optional(),
  startDate: z.string(),
  endDate: z.string(),
  interval: z.enum(['5min', '1hour', '1day']).optional(),
});

const GetTimeseriesDataSchema = z.object({
  customer: z.string().optional(),
  metrics: z.array(z.string()),
  startDate: z.string(),
  endDate: z.string(),
  interval: z.enum(['5min', '1hour', '1day']).optional(),
});

// Tool definition type
export interface ToolDefinition {
  name: string;
  description: string;
  schema: ZodSchema;
  handler: (client: any, params: any) => Promise<any>;
}

// Register all tools with their schemas
export function getAllToolDefinitions(): ToolDefinition[] {
  // Get workflow assistant tools (Maya's UX transformation)
  const workflowAssistants = getWorkflowAssistantTools().map((tool) => ({
    name: tool.name,
    description: tool.description || 'Workflow assistant tool',
    schema: z.object({
      intent: z.string(),
      context: z.any().optional(),
      domain: z.string().optional(),
      urgency: z.string().optional(),
      timeframe: z.string().optional(),
      compare_to: z.string().optional(),
      safety_mode: z.boolean().optional(),
      auto_apply: z.boolean().optional(),
      auto_execute: z.boolean().optional(),
    }),
    handler: (client: any, params: any) => handleWorkflowAssistantRequest(tool.name, params),
  }));

  // Get consolidated tools (Maya's tool consolidation)
  const consolidatedTools = getConsolidatedTools().map((tool) => ({
    name: tool.name,
    description: tool.description || 'Consolidated tool',
    schema: z.any(), // Consolidated tools define their own schemas
    handler: (client: any, params: any) => handleConsolidatedToolRequest(tool.name, params),
  }));

  return [
    // Workflow Assistants (4 business-focused tools that replace 180+ technical tools)
    ...workflowAssistants,

    // Consolidated Tools (5 powerful tools that replace scattered functionality)
    ...consolidatedTools,

    // Property Management (30+ tools)
    {
      name: 'list-properties',
      description: 'List all Akamai CDN properties in your account',
      schema: schemas.ListPropertiesSchema,
      handler: listProperties,
    },
    {
      name: 'get-property',
      description: 'Get details of a specific property',
      schema: schemas.GetPropertySchema,
      handler: getProperty,
    },
    {
      name: 'create-property',
      description: 'Create a new property',
      schema: schemas.CreatePropertySchema,
      handler: createProperty,
    },
    {
      name: 'list-contracts',
      description: 'List all Akamai contracts',
      schema: schemas.ListContractsSchema,
      handler: listContracts,
    },
    {
      name: 'list-groups',
      description: 'List all groups in your account',
      schema: schemas.ListGroupsSchema,
      handler: listGroups,
    },
    {
      name: 'list-products',
      description: 'List available Akamai products',
      schema: schemas.ListProductsSchema,
      handler: listProducts,
    },
    {
      name: 'create-property-version',
      description: 'Create a new property version',
      schema: schemas.CreatePropertyVersionSchema,
      handler: createPropertyVersion,
    },
    {
      name: 'create-property-version-enhanced',
      description: 'Create property version with advanced options',
      schema: extendedSchemas.CreatePropertyVersionEnhancedSchema,
      handler: createPropertyVersionEnhanced,
    },
    {
      name: 'get-property-rules',
      description: 'Get property rules configuration',
      schema: schemas.GetPropertyRulesSchema,
      handler: getPropertyRules,
    },
    {
      name: 'update-property-rules',
      description: 'Update property rules configuration',
      schema: schemas.UpdatePropertyRulesSchema,
      handler: updatePropertyRules,
    },
    {
      name: 'activate-property',
      description: 'Activate a property version',
      schema: schemas.ActivatePropertySchema,
      handler: activateProperty,
    },
    {
      name: 'get-activation-status',
      description: 'Get property activation status',
      schema: schemas.GetActivationStatusSchema,
      handler: getActivationStatus,
    },
    {
      name: 'list-property-activations',
      description: 'List property activation history',
      schema: schemas.ListPropertyActivationsSchema,
      handler: listPropertyActivations,
    },
    {
      name: 'list-property-versions',
      description: 'List all versions of a property',
      schema: schemas.ListPropertyVersionsSchema,
      handler: listPropertyVersions,
    },
    {
      name: 'list-property-versions-enhanced',
      description: 'List property versions with detailed information',
      schema: extendedSchemas.ListPropertyVersionsEnhancedSchema,
      handler: listPropertyVersionsEnhanced,
    },
    {
      name: 'get-property-version',
      description: 'Get details of a specific property version',
      schema: schemas.GetPropertyVersionSchema,
      handler: getPropertyVersion,
    },
    {
      name: 'get-latest-property-version',
      description: 'Get the latest property version',
      schema: extendedSchemas.GetLatestPropertyVersionSchema,
      handler: getLatestPropertyVersion,
    },
    {
      name: 'rollback-property-version',
      description: 'Rollback to a previous property version',
      schema: extendedSchemas.RollbackPropertyVersionSchema,
      handler: rollbackPropertyVersion,
    },
    {
      name: 'get-version-diff',
      description: 'Get differences between property versions',
      schema: extendedSchemas.GetVersionDiffSchema,
      handler: getVersionDiff,
    },
    {
      name: 'batch-version-operations',
      description: 'Perform batch operations on property versions',
      schema: extendedSchemas.BatchVersionOperationsSchema,
      handler: batchVersionOperations,
    },
    {
      name: 'search-properties',
      description: 'Search properties by various criteria',
      schema: schemas.SearchPropertiesSchema,
      handler: searchProperties,
    },
    {
      name: 'search-properties-advanced',
      description: 'Advanced property search with filters',
      schema: extendedSchemas.SearchPropertiesAdvancedSchema,
      handler: searchPropertiesAdvanced,
    },
    {
      name: 'clone-property',
      description: 'Clone an existing property',
      schema: schemas.ClonePropertySchema,
      handler: cloneProperty,
    },
    {
      name: 'remove-property',
      description: 'Remove a property',
      schema: schemas.RemovePropertySchema,
      handler: removeProperty,
    },
    {
      name: 'cancel-property-activation',
      description: 'Cancel a pending property activation',
      schema: extendedSchemas.CancelPropertyActivationSchema,
      handler: cancelPropertyActivation,
    },
    {
      name: 'compare-properties',
      description: 'Compare configurations between properties',
      schema: extendedSchemas.ComparePropertiesSchema,
      handler: compareProperties,
    },
    {
      name: 'detect-configuration-drift',
      description: 'Detect configuration drift in properties',
      schema: extendedSchemas.DetectConfigurationDriftSchema,
      handler: detectConfigurationDrift,
    },
    {
      name: 'check-property-health',
      description: 'Check property health and identify issues',
      schema: extendedSchemas.CheckPropertyHealthSchema,
      handler: checkPropertyHealth,
    },

    // DNS Management (20+ tools)
    {
      name: 'list-zones',
      description: 'List all DNS zones',
      schema: schemas.ListZonesSchema,
      handler: listZones,
    },
    {
      name: 'get-zone',
      description: 'Get details of a specific DNS zone',
      schema: schemas.GetZoneSchema,
      handler: getZone,
    },
    {
      name: 'create-zone',
      description: 'Create a new DNS zone',
      schema: schemas.CreateZoneSchema,
      handler: createZone,
    },
    {
      name: 'list-records',
      description: 'List DNS records in a zone',
      schema: schemas.ListRecordsSchema,
      handler: listRecords,
    },
    {
      name: 'create-record',
      description: 'Create or update a DNS record',
      schema: schemas.CreateRecordSchema,
      handler: upsertRecord,
    },
    {
      name: 'delete-record',
      description: 'Delete a DNS record',
      schema: schemas.DeleteRecordSchema,
      handler: deleteRecord,
    },
    {
      name: 'activate-zone-changes',
      description: 'Activate pending DNS zone changes',
      schema: schemas.ActivateZoneChangesSchema,
      handler: activateZoneChanges,
    },
    {
      name: 'create-multiple-record-sets',
      description: 'Create multiple DNS record sets',
      schema: extendedSchemas.CreateMultipleRecordSetsSchema,
      handler: createMultipleRecordSets,
    },
    {
      name: 'get-record-set',
      description: 'Get DNS record set details',
      schema: extendedSchemas.GetRecordSetSchema,
      handler: getRecordSet,
    },
    {
      name: 'submit-bulk-zone-create-request',
      description: 'Submit bulk zone creation request',
      schema: extendedSchemas.SubmitBulkZoneCreateRequestSchema,
      handler: submitBulkZoneCreateRequest,
    },
    {
      name: 'get-zones-dnssec-status',
      description: 'Get DNSSEC status for zones',
      schema: extendedSchemas.GetZonesDNSSECStatusSchema,
      handler: getZonesDNSSECStatus,
    },
    {
      name: 'update-tsig-key-for-zones',
      description: 'Update TSIG key for zones',
      schema: extendedSchemas.UpdateTSIGKeyForZonesSchema,
      handler: updateTSIGKeyForZones,
    },
    {
      name: 'get-zone-version',
      description: 'Get specific zone version',
      schema: extendedSchemas.GetZoneVersionSchema,
      handler: getZoneVersion,
    },
    {
      name: 'get-version-record-sets',
      description: 'Get record sets for a zone version',
      schema: extendedSchemas.GetVersionRecordSetsSchema,
      handler: getVersionRecordSets,
    },
    {
      name: 'get-version-master-zone-file',
      description: 'Get master zone file for a version',
      schema: extendedSchemas.GetVersionMasterZoneFileSchema,
      handler: getVersionMasterZoneFile,
    },
    {
      name: 'reactivate-zone-version',
      description: 'Reactivate a previous zone version',
      schema: extendedSchemas.ReactivateZoneVersionSchema,
      handler: reactivateZoneVersion,
    },
    {
      name: 'get-secondary-zone-transfer-status',
      description: 'Get secondary zone transfer status',
      schema: extendedSchemas.GetSecondaryZoneTransferStatusSchema,
      handler: getSecondaryZoneTransferStatus,
    },
    {
      name: 'get-zone-contract',
      description: 'Get contract information for a zone',
      schema: extendedSchemas.GetZoneContractSchema,
      handler: getZoneContract,
    },

    // DNS Migration Tools
    {
      name: 'import-from-cloudflare',
      description: 'Import DNS zone from Cloudflare',
      schema: schemas.ImportFromCloudflareSchema,
      handler: importFromCloudflare,
    },
    {
      name: 'import-zone-via-axfr',
      description: 'Import zone via AXFR transfer',
      schema: extendedSchemas.ImportZoneViaAXFRSchema,
      handler: importZoneViaAXFR,
    },
    {
      name: 'parse-zone-file',
      description: 'Parse and import zone file',
      schema: schemas.ParseZoneFileSchema,
      handler: parseZoneFile,
    },
    {
      name: 'bulk-import-records',
      description: 'Bulk import DNS records',
      schema: schemas.BulkImportRecordsSchema,
      handler: bulkImportRecords,
    },
    {
      name: 'convert-zone-to-primary',
      description: 'Convert secondary zone to primary',
      schema: extendedSchemas.ConvertZoneToPrimarySchema,
      handler: convertZoneToPrimary,
    },
    {
      name: 'generate-migration-instructions',
      description: 'Generate DNS migration instructions',
      schema: extendedSchemas.GenerateMigrationInstructionsSchema,
      handler: generateMigrationInstructions,
    },

    // Certificate Management (15+ tools)
    {
      name: 'list-certificate-enrollments',
      description: 'List certificate enrollments',
      schema: schemas.ListCertificateEnrollmentsSchema,
      handler: listCertificateEnrollments,
    },
    {
      name: 'create-dv-enrollment',
      description: 'Create domain validated certificate enrollment',
      schema: schemas.CreateDVEnrollmentSchema,
      handler: createDVEnrollment,
    },
    {
      name: 'check-dv-enrollment-status',
      description: 'Check DV certificate enrollment status',
      schema: schemas.CheckDVEnrollmentStatusSchema,
      handler: checkDVEnrollmentStatus,
    },
    {
      name: 'get-dv-validation-challenges',
      description: 'Get DV certificate validation challenges',
      schema: schemas.GetDVValidationChallengesSchema,
      handler: getDVValidationChallenges,
    },
    {
      name: 'link-certificate-to-property',
      description: 'Link certificate to property',
      schema: extendedSchemas.LinkCertificateToPropertySchema,
      handler: linkCertificateToProperty,
    },
    {
      name: 'enroll-certificate-with-validation',
      description: 'Enroll certificate with auto-validation',
      schema: extendedSchemas.EnrollCertificateWithValidationSchema,
      handler: enrollCertificateWithValidation,
    },
    {
      name: 'monitor-certificate-enrollment',
      description: 'Monitor certificate enrollment progress',
      schema: extendedSchemas.MonitorCertificateEnrollmentSchema,
      handler: monitorCertificateEnrollment,
    },
    {
      name: 'get-certificate-deployment-status',
      description: 'Get certificate deployment status',
      schema: extendedSchemas.GetCertificateDeploymentStatusSchema,
      handler: getCertificateDeploymentStatus,
    },
    {
      name: 'get-certificate-validation-history',
      description: 'Get certificate validation history',
      schema: extendedSchemas.GetCertificateValidationHistorySchema,
      handler: getCertificateValidationHistory,
    },
    {
      name: 'validate-certificate-enrollment',
      description: 'Validate certificate enrollment',
      schema: extendedSchemas.ValidateCertificateEnrollmentSchema,
      handler: validateCertificateEnrollment,
    },
    {
      name: 'deploy-certificate-to-network',
      description: 'Deploy certificate to network',
      schema: extendedSchemas.DeployCertificateToNetworkSchema,
      handler: deployCertificateToNetwork,
    },
    {
      name: 'renew-certificate',
      description: 'Renew expiring certificate',
      schema: extendedSchemas.RenewCertificateSchema,
      handler: renewCertificate,
    },
    {
      name: 'cleanup-validation-records',
      description: 'Clean up DNS validation records',
      schema: extendedSchemas.CleanupValidationRecordsSchema,
      handler: cleanupValidationRecords,
    },
    {
      name: 'update-property-with-default-dv',
      description: 'Update property with default DV certificate',
      schema: extendedSchemas.UpdatePropertyWithDefaultDVSchema,
      handler: updatePropertyWithDefaultDV,
    },
    {
      name: 'update-property-with-cps-certificate',
      description: 'Update property with CPS certificate',
      schema: extendedSchemas.UpdatePropertyWithCPSCertificateSchema,
      handler: updatePropertyWithCPSCertificate,
    },

    // Edge Hostname Management (10+ tools)
    {
      name: 'create-edge-hostname',
      description: 'Create an edge hostname',
      schema: schemas.CreateEdgeHostnameSchema,
      handler: createEdgeHostname,
    },
    {
      name: 'create-edge-hostname-enhanced',
      description: 'Create edge hostname with advanced options',
      schema: extendedSchemas.CreateEdgeHostnameEnhancedSchema,
      handler: createEdgeHostnameEnhanced,
    },
    {
      name: 'create-bulk-edge-hostnames',
      description: 'Create multiple edge hostnames',
      schema: extendedSchemas.CreateBulkEdgeHostnamesSchema,
      handler: createBulkEdgeHostnames,
    },
    {
      name: 'list-edge-hostnames',
      description: 'List edge hostnames',
      schema: schemas.ListEdgeHostnamesSchema,
      handler: listEdgeHostnames,
    },
    {
      name: 'get-edge-hostname',
      description: 'Get edge hostname details',
      schema: schemas.GetEdgeHostnameSchema,
      handler: getEdgeHostname,
    },
    {
      name: 'get-edge-hostname-details',
      description: 'Get detailed edge hostname information',
      schema: extendedSchemas.GetEdgeHostnameDetailsSchema,
      handler: getEdgeHostnameDetails,
    },
    {
      name: 'associate-certificate-with-edge-hostname',
      description: 'Associate certificate with edge hostname',
      schema: extendedSchemas.AssociateCertificateWithEdgeHostnameSchema,
      handler: associateCertificateWithEdgeHostname,
    },
    {
      name: 'validate-edge-hostname-certificate',
      description: 'Validate edge hostname certificate',
      schema: extendedSchemas.ValidateEdgeHostnameCertificateSchema,
      handler: validateEdgeHostnameCertificate,
    },
    {
      name: 'generate-edge-hostname-recommendations',
      description: 'Generate edge hostname recommendations',
      schema: extendedSchemas.GenerateEdgeHostnameRecommendationsSchema,
      handler: generateEdgeHostnameRecommendations,
    },

    // Hostname Management (15+ tools)
    {
      name: 'add-property-hostname',
      description: 'Add hostname to property',
      schema: schemas.AddPropertyHostnameSchema,
      handler: addPropertyHostname,
    },
    {
      name: 'remove-property-hostname',
      description: 'Remove hostname from property',
      schema: schemas.RemovePropertyHostnameSchema,
      handler: removePropertyHostname,
    },
    {
      name: 'list-property-hostnames',
      description: 'List hostnames for a property version',
      schema: schemas.ListPropertyHostnamesSchema,
      handler: listPropertyVersionHostnames,
    },
    {
      name: 'list-all-hostnames',
      description: 'List all hostnames across properties',
      schema: extendedSchemas.ListAllHostnamesSchema,
      handler: listAllHostnames,
    },
    {
      name: 'discover-hostnames-intelligent',
      description: 'Intelligent hostname discovery',
      schema: extendedSchemas.DiscoverHostnamesIntelligentSchema,
      handler: discoverHostnamesIntelligent,
    },
    {
      name: 'analyze-hostname-conflicts',
      description: 'Analyze hostname conflicts',
      schema: extendedSchemas.AnalyzeHostnameConflictsSchema,
      handler: analyzeHostnameConflicts,
    },
    {
      name: 'analyze-wildcard-coverage',
      description: 'Analyze wildcard hostname coverage',
      schema: extendedSchemas.AnalyzeWildcardCoverageSchema,
      handler: analyzeWildcardCoverage,
    },
    {
      name: 'identify-ownership-patterns',
      description: 'Identify hostname ownership patterns',
      schema: extendedSchemas.IdentifyOwnershipPatternsSchema,
      handler: identifyOwnershipPatterns,
    },
    {
      name: 'create-hostname-provisioning-plan',
      description: 'Create hostname provisioning plan',
      schema: extendedSchemas.CreateHostnameProvisioningPlanSchema,
      handler: createHostnameProvisioningPlan,
    },
    {
      name: 'find-optimal-property-assignment',
      description: 'Find optimal property for hostname',
      schema: extendedSchemas.FindOptimalPropertyAssignmentSchema,
      handler: findOptimalPropertyAssignment,
    },
    {
      name: 'analyze-hostname-ownership',
      description: 'Analyze hostname ownership',
      schema: extendedSchemas.AnalyzeHostnameOwnershipSchema,
      handler: analyzeHostnameOwnership,
    },
    {
      name: 'validate-hostnames-bulk',
      description: 'Validate multiple hostnames',
      schema: extendedSchemas.ValidateHostnamesBulkSchema,
      handler: validateHostnamesBulk,
    },
    {
      name: 'bulk-manage-hostnames',
      description: 'Bulk hostname management operations',
      schema: extendedSchemas.BulkManageHostnamesSchema,
      handler: bulkManageHostnames,
    },

    // Rule Tree Management (10+ tools)
    {
      name: 'create-rule-from-template',
      description: 'Create rule from template',
      schema: extendedSchemas.CreateRuleFromTemplateSchema,
      handler: createRuleFromTemplate,
    },
    {
      name: 'update-property-rules-enhanced',
      description: 'Update property rules with validation',
      schema: extendedSchemas.UpdatePropertyRulesEnhancedSchema,
      handler: updatePropertyRulesEnhanced,
    },
    {
      name: 'merge-rule-trees',
      description: 'Merge multiple rule trees',
      schema: extendedSchemas.MergeRuleTreesSchema,
      handler: mergeRuleTrees,
    },
    {
      name: 'optimize-rule-tree',
      description: 'Optimize rule tree performance',
      schema: extendedSchemas.OptimizeRuleTreeSchema,
      handler: optimizeRuleTree,
    },
    {
      name: 'validate-rule-tree',
      description: 'Validate rule tree configuration',
      schema: extendedSchemas.ValidateRuleTreeSchema,
      handler: validateRuleTree,
    },

    // CP Code Management
    {
      name: 'list-cpcodes',
      description: 'List CP codes',
      schema: schemas.ListCPCodesSchema,
      handler: listCPCodes,
    },
    {
      name: 'create-cpcode',
      description: 'Create a new CP code',
      schema: schemas.CreateCPCodeSchema,
      handler: createCPCode,
    },
    {
      name: 'get-cpcode',
      description: 'Get CP code details',
      schema: schemas.GetCPCodeSchema,
      handler: getCPCode,
    },
    {
      name: 'search-cpcodes',
      description: 'Search CP codes',
      schema: extendedSchemas.SearchCPCodesSchema,
      handler: searchCPCodes,
    },

    // Include Management
    {
      name: 'list-includes',
      description: 'List property includes',
      schema: schemas.ListIncludesSchema,
      handler: listIncludes,
    },
    {
      name: 'create-include',
      description: 'Create a new include',
      schema: schemas.CreateIncludeSchema,
      handler: createInclude,
    },
    {
      name: 'get-include',
      description: 'Get include details',
      schema: schemas.GetIncludeSchema,
      handler: getInclude,
    },
    {
      name: 'update-include',
      description: 'Update include configuration',
      schema: extendedSchemas.UpdateIncludeSchema,
      handler: updateInclude,
    },
    {
      name: 'create-include-version',
      description: 'Create new include version',
      schema: extendedSchemas.CreateIncludeVersionSchema,
      handler: createIncludeVersion,
    },
    {
      name: 'activate-include',
      description: 'Activate include version',
      schema: extendedSchemas.ActivateIncludeSchema,
      handler: activateInclude,
    },
    {
      name: 'list-include-activations',
      description: 'List include activation history',
      schema: extendedSchemas.ListIncludeActivationsSchema,
      handler: listIncludeActivations,
    },
    {
      name: 'get-include-activation-status',
      description: 'Get include activation status',
      schema: extendedSchemas.GetIncludeActivationStatusSchema,
      handler: getIncludeActivationStatus,
    },

    // Bulk Operations
    {
      name: 'bulk-activate-properties',
      description: 'Activate multiple properties',
      schema: schemas.BulkActivatePropertiesSchema,
      handler: bulkActivateProperties,
    },
    {
      name: 'bulk-clone-properties',
      description: 'Clone multiple properties',
      schema: schemas.BulkClonePropertiesSchema,
      handler: bulkCloneProperties,
    },
    {
      name: 'bulk-update-property-rules',
      description: 'Update rules for multiple properties',
      schema: schemas.BulkUpdatePropertyRulesSchema,
      handler: bulkUpdatePropertyRules,
    },
    {
      name: 'bulk-update-properties',
      description: 'Update multiple properties',
      schema: extendedSchemas.BulkUpdatePropertiesSchema,
      handler: bulkUpdateProperties,
    },
    {
      name: 'get-bulk-operation-status',
      description: 'Get bulk operation status',
      schema: extendedSchemas.GetBulkOperationStatusSchema,
      handler: getBulkOperationStatus,
    },

    // Search and Discovery
    {
      name: 'universal-search',
      description: 'Search across all Akamai resources',
      schema: schemas.UniversalSearchSchema,
      handler: universalSearchWithCacheHandler,
    },

    // Property Onboarding
    {
      name: 'onboard-property',
      description: 'Onboard a new property with wizard',
      schema: schemas.OnboardPropertySchema,
      handler: onboardPropertyTool,
    },
    {
      name: 'onboard-property-wizard',
      description: 'Interactive property onboarding wizard',
      schema: extendedSchemas.OnboardPropertyWizardSchema,
      handler: onboardPropertyWizard,
    },
    {
      name: 'check-onboarding-status',
      description: 'Check property onboarding status',
      schema: schemas.CheckOnboardingStatusSchema,
      handler: checkOnboardingStatus,
    },
    {
      name: 'onboard-secure-by-default-property',
      description: 'Onboard property with secure defaults',
      schema: extendedSchemas.OnboardSecureByDefaultPropertySchema,
      handler: onboardSecureByDefaultProperty,
    },
    {
      name: 'check-secure-by-default-status',
      description: 'Check secure by default status',
      schema: extendedSchemas.CheckSecureByDefaultStatusSchema,
      handler: checkSecureByDefaultStatus,
    },
    {
      name: 'quick-secure-by-default-setup',
      description: 'Quick secure by default setup',
      schema: extendedSchemas.QuickSecureByDefaultSetupSchema,
      handler: quickSecureByDefaultSetup,
    },

    // Product Management
    {
      name: 'get-product',
      description: 'Get product details',
      schema: schemas.ListProductsSchema,
      handler: getProduct,
    },

    // FastPurge Tools (6 tools)
    {
      name: 'fastpurge-url-invalidate',
      description: 'Invalidate content by URL',
      schema: FastpurgeUrlInvalidateSchema,
      handler: (client, params) => fastpurgeUrlInvalidate.handler(params),
    },
    {
      name: 'fastpurge-cpcode-invalidate',
      description: 'Invalidate content by CP code',
      schema: FastpurgeCpcodeInvalidateSchema,
      handler: (client, params) => fastpurgeCpcodeInvalidate.handler(params),
    },
    {
      name: 'fastpurge-tag-invalidate',
      description: 'Invalidate content by cache tag',
      schema: FastpurgeTagInvalidateSchema,
      handler: (client, params) => fastpurgeTagInvalidate.handler(params),
    },
    {
      name: 'fastpurge-status-check',
      description: 'Check FastPurge operation status',
      schema: FastpurgeStatusCheckSchema,
      handler: (client, params) => fastpurgeStatusCheck.handler(params),
    },
    {
      name: 'fastpurge-queue-status',
      description: 'Check FastPurge queue status',
      schema: FastpurgeQueueStatusSchema,
      handler: (client, params) => fastpurgeQueueStatus.handler(params),
    },
    {
      name: 'fastpurge-estimate',
      description: 'Estimate FastPurge impact',
      schema: FastpurgeEstimateSchema,
      handler: (client, params) => fastpurgeEstimate.handler(params),
    },

    // Network Lists Tools (17 tools)
    {
      name: 'list-network-lists',
      description: 'List all network lists',
      schema: ListNetworkListsSchema,
      handler: listNetworkLists,
    },
    {
      name: 'get-network-list',
      description: 'Get network list details',
      schema: GetNetworkListSchema,
      handler: getNetworkList,
    },
    {
      name: 'create-network-list',
      description: 'Create a new network list',
      schema: CreateNetworkListSchema,
      handler: (client, params) =>
        createNetworkList(
          params.name,
          params.type,
          params.elements,
          params.customer,
          params.options,
        ),
    },
    {
      name: 'update-network-list',
      description: 'Update network list elements',
      schema: UpdateNetworkListSchema,
      handler: updateNetworkList,
    },
    {
      name: 'delete-network-list',
      description: 'Delete a network list',
      schema: DeleteNetworkListSchema,
      handler: deleteNetworkList,
    },
    {
      name: 'activate-network-list',
      description: 'Activate network list',
      schema: extendedSchemas.ActivateNetworkListSchema,
      handler: activateNetworkList,
    },
    {
      name: 'get-network-list-activation-status',
      description: 'Get network list activation status',
      schema: extendedSchemas.GetNetworkListActivationStatusSchema,
      handler: getNetworkListActivationStatus,
    },
    {
      name: 'list-network-list-activations',
      description: 'List network list activation history',
      schema: extendedSchemas.ListNetworkListActivationsSchema,
      handler: listNetworkListActivations,
    },
    {
      name: 'deactivate-network-list',
      description: 'Deactivate network list',
      schema: extendedSchemas.DeactivateNetworkListSchema,
      handler: deactivateNetworkList,
    },
    {
      name: 'bulk-activate-network-lists',
      description: 'Activate multiple network lists',
      schema: extendedSchemas.BulkActivateNetworkListsSchema,
      handler: bulkActivateNetworkLists,
    },
    {
      name: 'import-network-list-from-csv',
      description: 'Import network list from CSV',
      schema: extendedSchemas.ImportNetworkListFromCSVSchema,
      handler: importNetworkListFromCSV,
    },
    {
      name: 'export-network-list-to-csv',
      description: 'Export network list to CSV',
      schema: extendedSchemas.ExportNetworkListToCSVSchema,
      handler: exportNetworkListToCSV,
    },
    {
      name: 'bulk-update-network-lists',
      description: 'Update multiple network lists',
      schema: extendedSchemas.BulkUpdateNetworkListsSchema,
      handler: bulkUpdateNetworkLists,
    },
    {
      name: 'merge-network-lists',
      description: 'Merge multiple network lists',
      schema: extendedSchemas.MergeNetworkListsSchema,
      handler: mergeNetworkLists,
    },
    {
      name: 'validate-geographic-codes',
      description: 'Validate geographic codes',
      schema: extendedSchemas.ValidateGeographicCodesSchema,
      handler: validateGeographicCodes,
    },
    {
      name: 'get-asn-information',
      description: 'Get ASN information',
      schema: extendedSchemas.GetASNInformationSchema,
      handler: getASNInformation,
    },
    {
      name: 'generate-geographic-blocking-recommendations',
      description: 'Generate geo-blocking recommendations',
      schema: extendedSchemas.GenerateGeographicBlockingRecommendationsSchema,
      handler: generateGeographicBlockingRecommendations,
    },

    // AppSec Tools (6 tools)
    {
      name: 'list-appsec-configurations',
      description: 'List all AppSec configurations',
      schema: ListAppSecConfigurationsSchema,
      handler: (client, params) => listAppSecConfigurations.handler(params),
    },
    {
      name: 'get-appsec-configuration',
      description: 'Get AppSec configuration details',
      schema: GetAppSecConfigurationSchema,
      handler: (client, params) => getAppSecConfiguration.handler(params),
    },
    {
      name: 'create-waf-policy',
      description: 'Create a new WAF policy',
      schema: CreateWAFPolicySchema,
      handler: (client, params) => createWAFPolicy.handler(params),
    },
    {
      name: 'get-security-events',
      description: 'Get security events and attack data',
      schema: GetSecurityEventsSchema,
      handler: (client, params) => getSecurityEvents.handler(params),
    },
    {
      name: 'activate-security-configuration',
      description: 'Activate security configuration',
      schema: extendedSchemas.ActivateSecurityConfigurationSchema,
      handler: (client, params) => activateSecurityConfiguration.handler(params),
    },
    {
      name: 'get-security-activation-status',
      description: 'Get security activation status',
      schema: extendedSchemas.GetSecurityActivationStatusSchema,
      handler: (client, params) => getSecurityActivationStatus.handler(params),
    },

    // Performance Tools (5 tools)
    {
      name: 'get-performance-analysis',
      description: 'Get comprehensive performance analysis',
      schema: GetPerformanceAnalysisSchema,
      handler: getPerformanceAnalysis,
    },
    {
      name: 'optimize-cache',
      description: 'Optimize cache settings',
      schema: OptimizeCacheSchema,
      handler: optimizeCache,
    },
    {
      name: 'profile-performance',
      description: 'Profile system performance',
      schema: extendedSchemas.ProfilePerformanceSchema,
      handler: profilePerformance,
    },
    {
      name: 'get-realtime-metrics',
      description: 'Get real-time performance metrics',
      schema: extendedSchemas.GetRealtimeMetricsSchema,
      handler: getRealtimeMetrics,
    },
    {
      name: 'reset-performance-monitoring',
      description: 'Reset performance monitoring',
      schema: extendedSchemas.ResetPerformanceMonitoringSchema,
      handler: resetPerformanceMonitoring,
    },

    // Reporting Tools (14 tools)
    {
      name: 'get-traffic-summary',
      description: 'Get traffic summary report',
      schema: GetTrafficSummarySchema,
      handler: getTrafficSummary,
    },
    {
      name: 'get-timeseries-data',
      description: 'Get time-series data for metrics',
      schema: GetTimeseriesDataSchema,
      handler: getTimeseriesData,
    },
    {
      name: 'get-performance-benchmarks',
      description: 'Get performance benchmarks',
      schema: extendedSchemas.GetPerformanceBenchmarksSchema,
      handler: getPerformanceBenchmarks,
    },
    {
      name: 'analyze-cache-performance',
      description: 'Analyze cache performance',
      schema: extendedSchemas.AnalyzeCachePerformanceSchema,
      handler: analyzeCachePerformance,
    },
    {
      name: 'get-cost-optimization-insights',
      description: 'Get cost optimization insights',
      schema: extendedSchemas.GetCostOptimizationInsightsSchema,
      handler: getCostOptimizationInsights,
    },
    {
      name: 'analyze-bandwidth-usage',
      description: 'Analyze bandwidth usage patterns',
      schema: extendedSchemas.AnalyzeBandwidthUsageSchema,
      handler: analyzeBandwidthUsage,
    },
    {
      name: 'create-reporting-dashboard',
      description: 'Create custom reporting dashboard',
      schema: extendedSchemas.CreateReportingDashboardSchema,
      handler: createReportingDashboard,
    },
    {
      name: 'export-report-data',
      description: 'Export report data',
      schema: extendedSchemas.ExportReportDataSchema,
      handler: exportReportData,
    },
    {
      name: 'configure-monitoring-alerts',
      description: 'Configure monitoring alerts',
      schema: extendedSchemas.ConfigureMonitoringAlertsSchema,
      handler: configureMonitoringAlerts,
    },
    {
      name: 'get-reporting-realtime-metrics',
      description: 'Get real-time metrics for reporting',
      schema: extendedSchemas.GetReportingRealtimeMetricsSchema,
      handler: getReportingRealtimeMetrics,
    },
    {
      name: 'analyze-traffic-trends',
      description: 'Analyze traffic trends',
      schema: extendedSchemas.AnalyzeTrafficTrendsSchema,
      handler: analyzeTrafficTrends,
    },
    {
      name: 'generate-performance-report',
      description: 'Generate performance report',
      schema: extendedSchemas.GeneratePerformanceReportSchema,
      handler: generatePerformanceReport,
    },
    {
      name: 'analyze-geographic-performance',
      description: 'Analyze performance by geography',
      schema: extendedSchemas.AnalyzeGeographicPerformanceSchema,
      handler: analyzeGeographicPerformance,
    },
    {
      name: 'analyze-error-patterns',
      description: 'Analyze error patterns',
      schema: extendedSchemas.AnalyzeErrorPatternsSchema,
      handler: analyzeErrorPatterns,
    },

    // Token Management Tools (5 tools)
    {
      name: 'generate-api-token',
      description: 'Generate a new API token for remote MCP access',
      schema: GenerateApiTokenSchema,
      handler: handleGenerateApiToken,
    },
    {
      name: 'list-api-tokens',
      description: 'List all API tokens',
      schema: ListApiTokensSchema,
      handler: handleListApiTokens,
    },
    {
      name: 'revoke-api-token',
      description: 'Revoke an API token to prevent further use',
      schema: RevokeApiTokenSchema,
      handler: handleRevokeApiToken,
    },
    {
      name: 'validate-api-token',
      description: 'Validate an API token and show its details',
      schema: ValidateApiTokenSchema,
      handler: handleValidateApiToken,
    },
    {
      name: 'rotate-api-token',
      description: 'Rotate an API token (generate new, revoke old)',
      schema: RotateApiTokenSchema,
      handler: handleRotateApiToken,
    },
  ];
}

// Export tool count for verification
export const TOTAL_TOOLS_COUNT = getAllToolDefinitions().length;
