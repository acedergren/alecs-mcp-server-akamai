#!/usr/bin/env node

/**
 * ALECS - MCP Server for Akamai
 * An MCP server that enables management of Akamai through AI
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { AkamaiClient } from './akamai-client.js';
// import { 
//   MCPToolResponse
// } from './types.js';
import {
  listProperties,
  getProperty,
  createProperty,
  listGroups,
  listContracts
} from './tools/property-tools.js';
import {
  listProducts,
  getProduct,
  listUseCases
} from './tools/product-tools.js';
import {
  listZones,
  getZone,
  createZone,
  listRecords,
  upsertRecord,
  deleteRecord,
  activateZoneChanges
} from './tools/dns-tools.js';
import {
  createPropertyVersion,
  getPropertyRules,
  updatePropertyRules,
  createEdgeHostname,
  addPropertyHostname,
  removePropertyHostname,
  activateProperty,
  getActivationStatus,
  listPropertyActivations,
  updatePropertyWithDefaultDV,
  updatePropertyWithCPSCertificate
} from './tools/property-manager-tools.js';
import {
  listEdgeHostnames,
  getEdgeHostname,
  cloneProperty,
  removeProperty,
  listPropertyVersions,
  getPropertyVersion,
  getLatestPropertyVersion,
  cancelPropertyActivation,
  searchProperties,
  listAllHostnames,
  listPropertyVersionHostnames
} from './tools/property-manager-advanced-tools.js';
import {
  listAvailableBehaviors,
  listAvailableCriteria,
  patchPropertyRules,
  bulkSearchProperties,
  getBulkSearchResults,
  generateDomainValidationChallenges,
  resumeDomainValidation,
  getPropertyAuditHistory
} from './tools/property-manager-rules-tools.js';
import {
  createDVEnrollment,
  getDVValidationChallenges,
  checkDVEnrollmentStatus,
  listCertificateEnrollments,
  linkCertificateToProperty
} from './tools/cps-tools.js';
import {
  importZoneViaAXFR,
  parseZoneFile,
  bulkImportRecords,
  convertZoneToPrimary,
  generateMigrationInstructions
} from './tools/dns-migration-tools.js';
import {
  onboardSecureByDefaultProperty,
  quickSecureByDefaultSetup,
  checkSecureByDefaultStatus
} from './tools/secure-by-default-onboarding.js';
import {
  debugSecurePropertyOnboarding,
  testBasicPropertyCreation
} from './tools/debug-secure-onboarding.js';
import {
  listCPCodes,
  getCPCode,
  createCPCode,
  searchCPCodes
} from './tools/cpcode-tools.js';
import {
  getZonesDNSSECStatus,
  getSecondaryZoneTransferStatus,
  getZoneContract,
  getRecordSet,
  updateTSIGKeyForZones,
  submitBulkZoneCreateRequest,
  getZoneVersion,
  getVersionRecordSets,
  reactivateZoneVersion,
  getVersionMasterZoneFile,
  createMultipleRecordSets
} from './tools/dns-advanced-tools.js';
import {
  generateDocumentationIndex,
  generateAPIReference,
  generateFeatureDocumentation,
  updateDocumentation,
  generateChangelog,
  createKnowledgeArticle
} from './tools/documentation-tools.js';
import {
  validatePropertyActivation,
  activatePropertyWithMonitoring,
  getActivationProgress,
  cancelPropertyActivation as cancelPropertyActivationAdvanced,
  createActivationPlan
} from './tools/property-activation-advanced.js';
import {
  comparePropertyVersions,
  batchCreateVersions,
  getVersionTimeline,
  rollbackPropertyVersion,
  updateVersionMetadata,
  mergePropertyVersions
} from './tools/property-version-management.js';
import {
  validateRuleTree,
  createRuleTreeFromTemplate,
  analyzeRuleTreePerformance,
  detectRuleConflicts,
  listRuleTemplates
} from './tools/rule-tree-advanced.js';
import {
  analyzeHostnameOwnership,
  generateEdgeHostnameRecommendations,
  validateHostnamesBulk,
  findOptimalPropertyAssignment,
  createHostnameProvisioningPlan
} from './tools/hostname-management-advanced.js';
import {
  searchPropertiesAdvanced,
  compareProperties,
  checkPropertyHealth,
  detectConfigurationDrift,
  bulkUpdateProperties
} from './tools/property-operations-advanced.js';
import {
  bulkCloneProperties,
  bulkActivateProperties,
  bulkUpdatePropertyRules,
  bulkManageHostnames,
  getBulkOperationStatus
} from './tools/bulk-operations-manager.js';
import {
  getSystemHealth,
  resetCircuitBreaker,
  getOperationMetrics,
  testOperationResilience,
  getErrorRecoverySuggestions
} from './tools/resilience-tools.js';
import {
  getPerformanceAnalysis,
  optimizeCache,
  profilePerformance,
  getRealtimeMetrics,
  resetPerformanceMonitoring
} from './tools/performance-tools.js';
import {
  runIntegrationTestSuite,
  checkAPIHealth,
  generateTestData,
  validateToolResponses,
  runLoadTest
} from './tools/integration-testing-tools.js';
import {
  listIncludes,
  getInclude,
  createInclude,
  updateInclude,
  createIncludeVersion,
  activateInclude,
  getIncludeActivationStatus,
  listIncludeActivations
} from './tools/includes-tools.js';
import {
  getValidationErrors,
  acknowledgeWarnings,
  overrideErrors,
  getErrorRecoveryHelp,
  validatePropertyConfiguration
} from './tools/property-error-handling-tools.js';
import {
  discoverHostnamesIntelligent,
  analyzeHostnameConflicts,
  analyzeWildcardCoverage,
  identifyOwnershipPatterns
} from './tools/hostname-discovery-engine.js';
import { fastPurgeTools } from './tools/fastpurge-tools.js';

// Tool schemas for validation
const ListPropertiesSchema = z.object({
  customer: z.string().optional(),
  contractId: z.string().optional(),
  groupId: z.string().optional(),
});

const GetPropertySchema = z.object({
  customer: z.string().optional(),
  propertyId: z.string(),
});

const CreatePropertySchema = z.object({
  customer: z.string().optional(),
  propertyName: z.string(),
  productId: z.string(),
  contractId: z.string(),
  groupId: z.string(),
  ruleFormat: z.string().optional(),
});

const ListGroupsSchema = z.object({
  customer: z.string().optional(),
  searchTerm: z.string().optional(),
});

// DNS Schemas
const ListZonesSchema = z.object({
  customer: z.string().optional(),
  contractIds: z.array(z.string()).optional(),
  includeAliases: z.boolean().optional(),
  search: z.string().optional(),
});

const GetZoneSchema = z.object({
  customer: z.string().optional(),
  zone: z.string(),
});

const CreateZoneSchema = z.object({
  customer: z.string().optional(),
  zone: z.string(),
  type: z.enum(['PRIMARY', 'SECONDARY', 'ALIAS']),
  comment: z.string().optional(),
  contractId: z.string().optional(),
  groupId: z.string().optional(),
  masters: z.array(z.string()).optional(),
  target: z.string().optional(),
});

const ListRecordsSchema = z.object({
  customer: z.string().optional(),
  zone: z.string(),
  search: z.string().optional(),
  types: z.array(z.string()).optional(),
});

const UpsertRecordSchema = z.object({
  customer: z.string().optional(),
  zone: z.string(),
  name: z.string(),
  type: z.string(),
  ttl: z.number(),
  rdata: z.array(z.string()),
  comment: z.string().optional(),
  force: z.boolean().optional(),
});

const DeleteRecordSchema = z.object({
  customer: z.string().optional(),
  zone: z.string(),
  name: z.string(),
  type: z.string(),
  comment: z.string().optional(),
  force: z.boolean().optional(),
});

// Property Manager Schemas
const CreatePropertyVersionSchema = z.object({
  customer: z.string().optional(),
  propertyId: z.string(),
  baseVersion: z.number().optional(),
  note: z.string().optional(),
});

const GetPropertyRulesSchema = z.object({
  customer: z.string().optional(),
  propertyId: z.string(),
  version: z.number().optional(),
  contractId: z.string().optional(),
  groupId: z.string().optional(),
});

const UpdatePropertyRulesSchema = z.object({
  customer: z.string().optional(),
  propertyId: z.string(),
  version: z.number().optional(),
  contractId: z.string(),
  groupId: z.string(),
  rules: z.any(),
  note: z.string().optional(),
});

const UpdateIncludeSchema = z.object({
  customer: z.string().optional(),
  includeId: z.string(),
  contractId: z.string(),
  groupId: z.string(),
  rules: z.any(),
  version: z.number().optional(),
  note: z.string().optional(),
});

const CreateIncludeVersionSchema = z.object({
  customer: z.string().optional(),
  includeId: z.string(),
  contractId: z.string(),
  groupId: z.string(),
  baseVersion: z.number().optional(),
  note: z.string().optional(),
});

const ListIncludeActivationsSchema = z.object({
  customer: z.string().optional(),
  includeId: z.string(),
  contractId: z.string(),
  groupId: z.string(),
});

const OverrideErrorsSchema = z.object({
  customer: z.string().optional(),
  propertyId: z.string(),
  version: z.number(),
  errors: z.array(z.string()),
  justification: z.string(),
  contractId: z.string(),
  groupId: z.string(),
  approvedBy: z.string().optional(),
});

const DiscoverHostnamesIntelligentSchema = z.object({
  customer: z.string().optional(),
  analysisScope: z.enum(['all', 'contract', 'group']).optional(),
  contractId: z.string().optional(),
  groupId: z.string().optional(),
  includeInactive: z.boolean().optional(),
  analyzeWildcards: z.boolean().optional(),
  detectConflicts: z.boolean().optional(),
  findOptimizations: z.boolean().optional(),
});

const AnalyzeHostnameConflictsSchema = z.object({
  customer: z.string().optional(),
  targetHostnames: z.array(z.string()),
  contractId: z.string().optional(),
  groupId: z.string().optional(),
  includeWildcardAnalysis: z.boolean().optional(),
  includeCertificateAnalysis: z.boolean().optional(),
});

const AnalyzeWildcardCoverageSchema = z.object({
  customer: z.string().optional(),
  contractId: z.string().optional(),
  groupId: z.string().optional(),
  includeOptimizationSuggestions: z.boolean().optional(),
});

const IdentifyOwnershipPatternsSchema = z.object({
  customer: z.string().optional(),
  contractId: z.string().optional(),
  groupId: z.string().optional(),
  minPropertiesForPattern: z.number().optional(),
  includeConsolidationPlan: z.boolean().optional(),
});

const CreateEdgeHostnameSchema = z.object({
  customer: z.string().optional(),
  propertyId: z.string(),
  domainPrefix: z.string(),
  domainSuffix: z.string().optional(),
  productId: z.string().optional(),
  secure: z.boolean().optional(),
  ipVersion: z.enum(['IPV4', 'IPV6', 'IPV4_IPV6']).optional(),
  certificateEnrollmentId: z.number().optional(),
});

const AddPropertyHostnameSchema = z.object({
  customer: z.string().optional(),
  propertyId: z.string(),
  hostname: z.string(),
  edgeHostname: z.string(),
  version: z.number().optional(),
});

const RemovePropertyHostnameSchema = z.object({
  customer: z.string().optional(),
  propertyId: z.string(),
  hostname: z.string(),
  version: z.number().optional(),
});

const ActivatePropertySchema = z.object({
  customer: z.string().optional(),
  propertyId: z.string(),
  version: z.number().optional(),
  network: z.enum(['STAGING', 'PRODUCTION']),
  note: z.string().optional(),
  notifyEmails: z.array(z.string()).optional(),
  acknowledgeAllWarnings: z.boolean().optional(),
});

const GetActivationStatusSchema = z.object({
  customer: z.string().optional(),
  propertyId: z.string(),
  activationId: z.string(),
});

const ListPropertyActivationsSchema = z.object({
  customer: z.string().optional(),
  propertyId: z.string(),
  network: z.enum(['STAGING', 'PRODUCTION']).optional(),
});

// Advanced Property Activation Schemas
const ValidatePropertyActivationSchema = z.object({
  customer: z.string().optional(),
  propertyId: z.string(),
  version: z.number().optional(),
  network: z.enum(['STAGING', 'PRODUCTION']),
});

const ActivatePropertyWithMonitoringSchema = z.object({
  customer: z.string().optional(),
  propertyId: z.string(),
  version: z.number().optional(),
  network: z.enum(['STAGING', 'PRODUCTION']),
  note: z.string().optional(),
  options: z.object({
    validateFirst: z.boolean().optional(),
    waitForCompletion: z.boolean().optional(),
    maxWaitTime: z.number().optional(),
    rollbackOnFailure: z.boolean().optional(),
    requireAllPreflightChecks: z.boolean().optional(),
    fastPush: z.boolean().optional(),
    notifyEmails: z.array(z.string()).optional(),
    acknowledgeWarnings: z.boolean().optional(),
  }).optional(),
});

const GetActivationProgressSchema = z.object({
  customer: z.string().optional(),
  propertyId: z.string(),
  activationId: z.string(),
});

const CancelPropertyActivationAdvancedSchema = z.object({
  customer: z.string().optional(),
  propertyId: z.string(),
  activationId: z.string(),
});

const CreateActivationPlanSchema = z.object({
  customer: z.string().optional(),
  properties: z.array(z.object({
    propertyId: z.string(),
    version: z.number().optional(),
    network: z.enum(['STAGING', 'PRODUCTION']),
  })),
  strategy: z.enum(['PARALLEL', 'SEQUENTIAL', 'DEPENDENCY_ORDERED']).optional(),
  dependencies: z.record(z.array(z.string())).optional(),
});

// CPS Schemas
const CreateDVEnrollmentSchema = z.object({
  customer: z.string().optional(),
  commonName: z.string(),
  sans: z.array(z.string()).optional(),
  adminContact: z.object({
    firstName: z.string(),
    lastName: z.string(),
    email: z.string(),
    phone: z.string(),
  }),
  techContact: z.object({
    firstName: z.string(),
    lastName: z.string(),
    email: z.string(),
    phone: z.string(),
  }),
  contractId: z.string(),
  enhancedTLS: z.boolean().optional(),
  quicEnabled: z.boolean().optional(),
});

const GetDVValidationChallengesSchema = z.object({
  customer: z.string().optional(),
  enrollmentId: z.number(),
});

const CheckDVEnrollmentStatusSchema = z.object({
  customer: z.string().optional(),
  enrollmentId: z.number(),
});

const ListCertificateEnrollmentsSchema = z.object({
  customer: z.string().optional(),
  contractId: z.string().optional(),
});

const LinkCertificateToPropertySchema = z.object({
  customer: z.string().optional(),
  enrollmentId: z.number(),
  propertyId: z.string(),
  propertyVersion: z.number().optional(),
});

// DNS Migration Schemas
const ImportZoneViaAXFRSchema = z.object({
  customer: z.string().optional(),
  zone: z.string(),
  masterServer: z.string(),
  tsigKey: z.object({
    name: z.string(),
    algorithm: z.string(),
    secret: z.string(),
  }).optional(),
  createZone: z.boolean().optional(),
  contractId: z.string().optional(),
  groupId: z.string().optional(),
});

const ParseZoneFileSchema = z.object({
  customer: z.string().optional(),
  zoneFileContent: z.string(),
  zone: z.string(),
});

const BulkImportRecordsSchema = z.object({
  customer: z.string().optional(),
  zone: z.string(),
  batchId: z.string(),
  clearCache: z.boolean().optional(),
});

const ConvertZoneToPrimarySchema = z.object({
  customer: z.string().optional(),
  zone: z.string(),
  comment: z.string().optional(),
});

const GenerateMigrationInstructionsSchema = z.object({
  customer: z.string().optional(),
  zone: z.string(),
  targetProvider: z.enum(['route53', 'cloudflare', 'godaddy', 'namecheap', 'generic']).optional(),
});

// Secure Property Onboarding Schemas
const OnboardSecurePropertySchema = z.object({
  customer: z.string().optional(),
  propertyName: z.string(),
  hostnames: z.array(z.string()),
  originHostname: z.string(),
  contractId: z.string(),
  groupId: z.string(),
  productId: z.string().optional(),
  cpCode: z.number().optional(),
  notificationEmails: z.array(z.string()).optional(),
});

const QuickSecurePropertySetupSchema = z.object({
  customer: z.string().optional(),
  domain: z.string(),
  originHostname: z.string(),
  contractId: z.string(),
  groupId: z.string(),
});

const CheckSecurePropertyStatusSchema = z.object({
  customer: z.string().optional(),
  propertyId: z.string(),
  enrollmentId: z.number().optional(),
});

// Contract Schema
const ListContractsSchema = z.object({
  customer: z.string().optional(),
  searchTerm: z.string().optional(),
});

// Product Schemas
const ListProductsSchema = z.object({
  customer: z.string().optional(),
  contractId: z.string(),
});

const GetProductSchema = z.object({
  customer: z.string().optional(),
  productId: z.string(),
  contractId: z.string(),
});

const ListUseCasesSchema = z.object({
  customer: z.string().optional(),
  productId: z.string(),
  contractId: z.string().optional(),
});

// CP Code Schemas
const ListCPCodesSchema = z.object({
  customer: z.string().optional(),
  contractId: z.string().optional(),
  groupId: z.string().optional(),
});

const GetCPCodeSchema = z.object({
  customer: z.string().optional(),
  cpcodeId: z.string(),
});

const CreateCPCodeSchema = z.object({
  customer: z.string().optional(),
  cpcodeName: z.string(),
  contractId: z.string(),
  groupId: z.string(),
  productId: z.string().optional(),
  timeZone: z.string().optional(),
});

const SearchCPCodesSchema = z.object({
  customer: z.string().optional(),
  searchTerm: z.string(),
  contractId: z.string().optional(),
  groupId: z.string().optional(),
});

// Advanced Property Manager Schemas
const ListEdgeHostnamesSchema = z.object({
  customer: z.string().optional(),
  contractId: z.string().optional(),
  groupId: z.string().optional(),
});

const GetEdgeHostnameSchema = z.object({
  customer: z.string().optional(),
  edgeHostnameId: z.string(),
});

const ClonePropertySchema = z.object({
  customer: z.string().optional(),
  sourcePropertyId: z.string(),
  propertyName: z.string(),
  contractId: z.string().optional(),
  groupId: z.string().optional(),
  cloneHostnames: z.boolean().optional(),
});

const RemovePropertySchema = z.object({
  customer: z.string().optional(),
  propertyId: z.string(),
});

const ListPropertyVersionsSchema = z.object({
  customer: z.string().optional(),
  propertyId: z.string(),
  limit: z.number().optional(),
});

const GetPropertyVersionSchema = z.object({
  customer: z.string().optional(),
  propertyId: z.string(),
  version: z.number(),
});

const GetLatestPropertyVersionSchema = z.object({
  customer: z.string().optional(),
  propertyId: z.string(),
  activatedOn: z.enum(['PRODUCTION', 'STAGING', 'LATEST']).optional(),
});

const CancelPropertyActivationSchema = z.object({
  customer: z.string().optional(),
  propertyId: z.string(),
  activationId: z.string(),
});

const SearchPropertiesSchema = z.object({
  customer: z.string().optional(),
  searchTerm: z.string(),
  searchBy: z.enum(['name', 'hostname', 'edgeHostname']).optional(),
});

const ListAllHostnamesSchema = z.object({
  customer: z.string().optional(),
  contractId: z.string().optional(),
  groupId: z.string().optional(),
  includeDetails: z.boolean().optional(),
});

const ListPropertyVersionHostnamesSchema = z.object({
  customer: z.string().optional(),
  propertyId: z.string(),
  version: z.number().optional(),
  validateCnames: z.boolean().optional(),
});

// Rules and Validation Schemas
const ListAvailableBehaviorsSchema = z.object({
  customer: z.string().optional(),
  propertyId: z.string(),
  version: z.number().optional(),
  productId: z.string().optional(),
  ruleFormat: z.string().optional(),
});

const ListAvailableCriteriaSchema = z.object({
  customer: z.string().optional(),
  propertyId: z.string(),
  version: z.number().optional(),
  productId: z.string().optional(),
  ruleFormat: z.string().optional(),
});

const PatchPropertyRulesSchema = z.object({
  customer: z.string().optional(),
  propertyId: z.string(),
  version: z.number().optional(),
  patches: z.array(z.object({
    op: z.enum(['add', 'remove', 'replace', 'move', 'copy', 'test']),
    path: z.string(),
    value: z.any().optional(),
    from: z.string().optional(),
  })),
  validateRules: z.boolean().optional(),
});

const BulkSearchPropertiesSchema = z.object({
  customer: z.string().optional(),
  jsonPath: z.string(),
  network: z.enum(['PRODUCTION', 'STAGING', 'LATEST']).optional(),
  contractIds: z.array(z.string()).optional(),
  groupIds: z.array(z.string()).optional(),
});

const GetBulkSearchResultsSchema = z.object({
  customer: z.string().optional(),
  bulkSearchId: z.string(),
});

const GenerateDomainValidationChallengesSchema = z.object({
  customer: z.string().optional(),
  domains: z.array(z.string()),
  validationMethod: z.enum(['HTTP', 'DNS']).optional(),
});

const ResumeDomainValidationSchema = z.object({
  customer: z.string().optional(),
  enrollmentId: z.number(),
  domains: z.array(z.string()).optional(),
});

const GetPropertyAuditHistorySchema = z.object({
  customer: z.string().optional(),
  propertyId: z.string(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.number().optional(),
});

// Certificate Hostname Schemas
const UpdatePropertyWithDefaultDVSchema = z.object({
  customer: z.string().optional(),
  propertyId: z.string(),
  hostname: z.string(),
  version: z.number().optional(),
  ipVersion: z.enum(['IPV4', 'IPV6', 'IPV4_IPV6']).optional(),
});

const UpdatePropertyWithCPSCertificateSchema = z.object({
  customer: z.string().optional(),
  propertyId: z.string(),
  hostname: z.string(),
  certificateEnrollmentId: z.number(),
  version: z.number().optional(),
  ipVersion: z.enum(['IPV4', 'IPV6', 'IPV4_IPV6']).optional(),
  tlsVersion: z.enum(['STANDARD_TLS', 'ENHANCED_TLS']).optional(),
});

// Property Version Management Schemas
const ComparePropertyVersionsSchema = z.object({
  customer: z.string().optional(),
  propertyId: z.string(),
  version1: z.number(),
  version2: z.number(),
  compareType: z.enum(['rules', 'hostnames', 'all']).optional(),
  includeDetails: z.boolean().optional(),
});

const BatchCreateVersionsSchema = z.object({
  customer: z.string().optional(),
  properties: z.array(z.object({
    propertyId: z.string(),
    baseVersion: z.number().optional(),
    note: z.string().optional(),
  })),
  defaultNote: z.string().optional(),
});

const GetVersionTimelineSchema = z.object({
  customer: z.string().optional(),
  propertyId: z.string(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  includeChanges: z.boolean().optional(),
  limit: z.number().optional(),
});

const RollbackPropertyVersionSchema = z.object({
  customer: z.string().optional(),
  propertyId: z.string(),
  targetVersion: z.number(),
  preserveHostnames: z.boolean().optional(),
  createBackup: z.boolean().optional(),
  note: z.string().optional(),
});

const UpdateVersionMetadataSchema = z.object({
  customer: z.string().optional(),
  propertyId: z.string(),
  version: z.number(),
  metadata: z.object({
    note: z.string().optional(),
    tags: z.array(z.string()).optional(),
    labels: z.record(z.string()).optional(),
  }),
});

const MergePropertyVersionsSchema = z.object({
  customer: z.string().optional(),
  propertyId: z.string(),
  sourceVersion: z.number(),
  targetVersion: z.number(),
  mergeStrategy: z.enum(['merge', 'cherry-pick']),
  includePaths: z.array(z.string()).optional(),
  excludePaths: z.array(z.string()).optional(),
  createNewVersion: z.boolean().optional(),
});

// Advanced DNS Schemas
const GetZonesDNSSECStatusSchema = z.object({
  customer: z.string().optional(),
  zones: z.array(z.string()),
});

const GetSecondaryZoneTransferStatusSchema = z.object({
  customer: z.string().optional(),
  zones: z.array(z.string()),
});

const GetZoneContractSchema = z.object({
  customer: z.string().optional(),
  zone: z.string(),
});

const GetRecordSetSchema = z.object({
  customer: z.string().optional(),
  zone: z.string(),
  name: z.string(),
  type: z.string(),
});

const UpdateTSIGKeyForZonesSchema = z.object({
  customer: z.string().optional(),
  zones: z.array(z.string()),
  tsigKey: z.object({
    name: z.string(),
    algorithm: z.string(),
    secret: z.string(),
  }),
});

const SubmitBulkZoneCreateRequestSchema = z.object({
  customer: z.string().optional(),
  zones: z.array(z.object({
    zone: z.string(),
    type: z.enum(['PRIMARY', 'SECONDARY', 'ALIAS']),
    comment: z.string().optional(),
    masters: z.array(z.string()).optional(),
    target: z.string().optional(),
  })),
  contractId: z.string(),
  groupId: z.string(),
});

const GetZoneVersionSchema = z.object({
  customer: z.string().optional(),
  zone: z.string(),
  versionId: z.string(),
});

const GetVersionRecordSetsSchema = z.object({
  customer: z.string().optional(),
  zone: z.string(),
  versionId: z.string(),
  offset: z.number().optional(),
  limit: z.number().optional(),
});

const ReactivateZoneVersionSchema = z.object({
  customer: z.string().optional(),
  zone: z.string(),
  versionId: z.string(),
  comment: z.string().optional(),
});

const GetVersionMasterZoneFileSchema = z.object({
  customer: z.string().optional(),
  zone: z.string(),
  versionId: z.string(),
});

const CreateMultipleRecordSetsSchema = z.object({
  customer: z.string().optional(),
  zone: z.string(),
  recordSets: z.array(z.object({
    name: z.string(),
    type: z.string(),
    ttl: z.number(),
    rdata: z.array(z.string()),
  })),
  comment: z.string().optional(),
});

// Resilience Tools Schemas
const GetSystemHealthSchema = z.object({
  customer: z.string().optional(),
  includeMetrics: z.boolean().optional(),
  operationType: z.enum(['PROPERTY_READ', 'PROPERTY_WRITE', 'ACTIVATION', 'DNS_READ', 'DNS_WRITE', 'CERTIFICATE', 'BULK_OPERATION']).optional()
});

const ResetCircuitBreakerSchema = z.object({
  customer: z.string().optional(),
  operationType: z.enum(['PROPERTY_READ', 'PROPERTY_WRITE', 'ACTIVATION', 'DNS_READ', 'DNS_WRITE', 'CERTIFICATE', 'BULK_OPERATION']),
  force: z.boolean().optional()
});

const GetOperationMetricsSchema = z.object({
  customer: z.string().optional(),
  operationType: z.enum(['PROPERTY_READ', 'PROPERTY_WRITE', 'ACTIVATION', 'DNS_READ', 'DNS_WRITE', 'CERTIFICATE', 'BULK_OPERATION']).optional(),
  includeTrends: z.boolean().optional()
});

const TestOperationResilienceSchema = z.object({
  customer: z.string().optional(),
  operationType: z.enum(['PROPERTY_READ', 'PROPERTY_WRITE', 'ACTIVATION', 'DNS_READ', 'DNS_WRITE', 'CERTIFICATE', 'BULK_OPERATION']),
  testType: z.enum(['basic', 'circuit_breaker', 'retry']),
  iterations: z.number().optional()
});

const GetErrorRecoverySuggestionsSchema = z.object({
  customer: z.string().optional(),
  errorType: z.string().optional(),
  operationType: z.enum(['PROPERTY_READ', 'PROPERTY_WRITE', 'ACTIVATION', 'DNS_READ', 'DNS_WRITE', 'CERTIFICATE', 'BULK_OPERATION']).optional(),
  includePreventiveMeasures: z.boolean().optional()
});

// Performance Tools Schemas
const GetPerformanceAnalysisSchema = z.object({
  customer: z.string().optional(),
  operationType: z.string().optional(),
  timeWindowMs: z.number().optional(),
  includeRecommendations: z.boolean().optional()
});

const OptimizeCacheSchema = z.object({
  customer: z.string().optional(),
  cleanupExpired: z.boolean().optional(),
  adjustTtl: z.boolean().optional(),
  targetHitRate: z.number().optional()
});

const ProfilePerformanceSchema = z.object({
  customer: z.string().optional(),
  testOperations: z.array(z.string()).optional(),
  iterations: z.number().optional(),
  includeMemoryProfile: z.boolean().optional()
});

const GetRealtimeMetricsSchema = z.object({
  customer: z.string().optional(),
  interval: z.number().optional(),
  duration: z.number().optional()
});

const ResetPerformanceMonitoringSchema = z.object({
  customer: z.string().optional(),
  clearMetrics: z.boolean().optional(),
  clearCache: z.boolean().optional(),
  resetCounters: z.boolean().optional()
});

// Integration Testing Schemas
const RunIntegrationTestSuiteSchema = z.object({
  customer: z.string().optional(),
  suiteName: z.string().optional(),
  category: z.enum(['property', 'dns', 'certificate', 'performance', 'resilience']).optional(),
  priority: z.enum(['high', 'medium', 'low']).optional(),
  includeSetup: z.boolean().optional(),
  generateReport: z.boolean().optional()
});

const CheckAPIHealthSchema = z.object({
  customer: z.string().optional(),
  endpoints: z.array(z.string()).optional(),
  includeLoadTest: z.boolean().optional()
});

const GenerateTestDataSchema = z.object({
  customer: z.string().optional(),
  dataType: z.enum(['property', 'zone', 'hostname', 'contact', 'all']),
  count: z.number().optional(),
  prefix: z.string().optional()
});

const ValidateToolResponsesSchema = z.object({
  customer: z.string().optional(),
  toolName: z.string().optional(),
  category: z.string().optional(),
  sampleSize: z.number().optional(),
  includePerformance: z.boolean().optional()
});

const RunLoadTestSchema = z.object({
  customer: z.string().optional(),
  endpoint: z.string().optional(),
  operation: z.string().optional(),
  concurrency: z.number().optional(),
  duration: z.number().optional(),
  rampUp: z.number().optional(),
  includeAnalysis: z.boolean().optional()
});

/**
 * Main server class for Akamai MCP
 */
class AkamaiMCPServer {
  private server: Server;
  private client: AkamaiClient;

  constructor() {
    this.server = new Server({
      name: 'alecs-mcp-server-akamai',
      version: '1.0.0',
    }, {
      capabilities: {
        tools: {},
      },
    });

    this.client = new AkamaiClient();
    this.setupHandlers();
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'list_properties',
          description: 'List all Akamai CDN properties in your account',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              contractId: {
                type: 'string',
                description: 'Optional: Filter by contract ID',
              },
              groupId: {
                type: 'string',
                description: 'Optional: Filter by group ID',
              },
            },
          },
        },
        {
          name: 'get_property',
          description: 'Get detailed information about a specific property',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              propertyId: {
                type: 'string',
                description: 'The property ID (e.g., prp_12345), property name, or hostname to search for',
              },
            },
            required: ['propertyId'],
          },
        },
        {
          name: 'create_property',
          description: 'Create a new CDN property',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              propertyName: {
                type: 'string',
                description: 'Name for the new property',
              },
              productId: {
                type: 'string',
                description: 'Product ID (e.g., prd_Web_Accel)',
              },
              contractId: {
                type: 'string',
                description: 'Contract ID for billing',
              },
              groupId: {
                type: 'string',
                description: 'Group ID for organization',
              },
              ruleFormat: {
                type: 'string',
                description: 'Optional: Rule format version (defaults to latest)',
              },
            },
            required: ['propertyName', 'productId', 'contractId', 'groupId'],
          },
        },
        {
          name: 'list_groups',
          description: 'List all available groups and contracts in your account',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              searchTerm: {
                type: 'string',
                description: 'Optional: Search for groups by name or ID',
              },
            },
          },
        },
        {
          name: 'list_contracts',
          description: 'List all available contracts in your account for billing and property creation',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              searchTerm: {
                type: 'string',
                description: 'Optional: Search for contracts by ID or type',
              },
            },
          },
        },
        // Product Tools
        {
          name: 'list_products',
          description: 'List all products available under a contract for property and CP code creation',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              contractId: {
                type: 'string',
                description: 'Contract ID to list products for',
              },
            },
            required: ['contractId'],
          },
        },
        {
          name: 'get_product',
          description: 'Get details about a specific product',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              productId: {
                type: 'string',
                description: 'Product ID (e.g., prd_fresca for Ion, prd_Site_Accel for DSA)',
              },
              contractId: {
                type: 'string',
                description: 'Contract ID containing the product',
              },
            },
            required: ['productId', 'contractId'],
          },
        },
        {
          name: 'list_use_cases',
          description: 'List Akamai-provided use case scenarios for optimal traffic mapping',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              productId: {
                type: 'string',
                description: 'Product ID to get use cases for',
              },
              contractId: {
                type: 'string',
                description: 'Optional: Contract ID',
              },
            },
            required: ['productId'],
          },
        },
        // DNS Tools
        {
          name: 'list_zones',
          description: 'List all DNS zones in your account',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              contractIds: {
                type: 'array',
                items: { type: 'string' },
                description: 'Optional: Filter by contract IDs',
              },
              includeAliases: {
                type: 'boolean',
                description: 'Optional: Include alias zones',
              },
              search: {
                type: 'string',
                description: 'Optional: Search for zones by name',
              },
            },
          },
        },
        {
          name: 'get_zone',
          description: 'Get details of a specific DNS zone',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              zone: {
                type: 'string',
                description: 'The zone name (e.g., example.com)',
              },
            },
            required: ['zone'],
          },
        },
        {
          name: 'create_zone',
          description: 'Create a new DNS zone',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              zone: {
                type: 'string',
                description: 'The zone name (e.g., example.com)',
              },
              type: {
                type: 'string',
                enum: ['PRIMARY', 'SECONDARY', 'ALIAS'],
                description: 'Zone type',
              },
              comment: {
                type: 'string',
                description: 'Optional: Zone comment',
              },
              contractId: {
                type: 'string',
                description: 'Optional: Contract ID',
              },
              groupId: {
                type: 'string',
                description: 'Optional: Group ID',
              },
              masters: {
                type: 'array',
                items: { type: 'string' },
                description: 'Master servers (required for SECONDARY zones)',
              },
              target: {
                type: 'string',
                description: 'Target zone (required for ALIAS zones)',
              },
            },
            required: ['zone', 'type'],
          },
        },
        {
          name: 'list_records',
          description: 'List DNS records in a zone',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              zone: {
                type: 'string',
                description: 'The zone name (e.g., example.com)',
              },
              search: {
                type: 'string',
                description: 'Optional: Search for records by name',
              },
              types: {
                type: 'array',
                items: { type: 'string' },
                description: 'Optional: Filter by record types (e.g., ["A", "CNAME"])',
              },
            },
            required: ['zone'],
          },
        },
        {
          name: 'upsert_record',
          description: 'Create or update a DNS record',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              zone: {
                type: 'string',
                description: 'The zone name (e.g., example.com)',
              },
              name: {
                type: 'string',
                description: 'Record name (e.g., www.example.com)',
              },
              type: {
                type: 'string',
                description: 'Record type (e.g., A, AAAA, CNAME, MX, TXT)',
              },
              ttl: {
                type: 'number',
                description: 'Time to live in seconds',
              },
              rdata: {
                type: 'array',
                items: { type: 'string' },
                description: 'Record data (e.g., ["192.0.2.1"] for A record)',
              },
              comment: {
                type: 'string',
                description: 'Optional: Change comment',
              },
              force: {
                type: 'boolean',
                description: 'Optional: Force discard of existing changelist without confirmation',
              },
            },
            required: ['zone', 'name', 'type', 'ttl', 'rdata'],
          },
        },
        {
          name: 'delete_record',
          description: 'Delete a DNS record',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              zone: {
                type: 'string',
                description: 'The zone name (e.g., example.com)',
              },
              name: {
                type: 'string',
                description: 'Record name (e.g., www.example.com)',
              },
              type: {
                type: 'string',
                description: 'Record type (e.g., A, AAAA, CNAME)',
              },
              comment: {
                type: 'string',
                description: 'Optional: Change comment',
              },
              force: {
                type: 'boolean',
                description: 'Optional: Force discard of existing changelist without confirmation',
              },
            },
            required: ['zone', 'name', 'type'],
          },
        },
        {
          name: 'activate_zone_changes',
          description: 'Activate pending DNS zone changes with optional validation and monitoring',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              zone: {
                type: 'string',
                description: 'The zone name (e.g., example.com)',
              },
              comment: {
                type: 'string',
                description: 'Optional: Comment for the activation',
              },
              validateOnly: {
                type: 'boolean',
                description: 'Optional: Only validate changes without activating (default: false)',
              },
              waitForCompletion: {
                type: 'boolean',
                description: 'Optional: Wait for activation to complete (default: false)',
              },
              timeout: {
                type: 'number',
                description: 'Optional: Timeout in milliseconds for waiting (default: 300000)',
              },
            },
            required: ['zone'],
          },
        },
        // Property Manager Tools
        {
          name: 'create_property_version',
          description: 'Create a new version of a property',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              propertyId: {
                type: 'string',
                description: 'The property ID (e.g., prp_12345)',
              },
              baseVersion: {
                type: 'number',
                description: 'Optional: Version to base the new version on (defaults to latest)',
              },
              note: {
                type: 'string',
                description: 'Optional: Version notes',
              },
            },
            required: ['propertyId'],
          },
        },
        {
          name: 'get_property_rules',
          description: 'Get the rule tree for a property version',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              propertyId: {
                type: 'string',
                description: 'The property ID (e.g., prp_12345)',
              },
              version: {
                type: 'number',
                description: 'Optional: Version number (defaults to latest)',
              },
              contractId: {
                type: 'string',
                description: 'Optional: Contract ID',
              },
              groupId: {
                type: 'string',
                description: 'Optional: Group ID',
              },
            },
            required: ['propertyId'],
          },
        },
        {
          name: 'update_property_rules',
          description: 'Update the rule tree for a property version',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              propertyId: {
                type: 'string',
                description: 'The property ID (e.g., prp_12345)',
              },
              version: {
                type: 'number',
                description: 'Optional: Version number (defaults to latest)',
              },
              contractId: {
                type: 'string',
                description: 'Contract ID',
              },
              groupId: {
                type: 'string',
                description: 'Group ID',
              },
              rules: {
                type: 'object',
                description: 'The complete rule tree',
              },
              note: {
                type: 'string',
                description: 'Optional: Update notes',
              },
            },
            required: ['propertyId', 'contractId', 'groupId', 'rules'],
          },
        },
        {
          name: 'create_edge_hostname',
          description: 'Create a new edge hostname',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              propertyId: {
                type: 'string',
                description: 'The property ID to associate with',
              },
              domainPrefix: {
                type: 'string',
                description: 'Domain prefix (e.g., "www" for www.example.com.edgesuite.net)',
              },
              domainSuffix: {
                type: 'string',
                description: 'Optional: Domain suffix (defaults to .edgesuite.net)',
              },
              productId: {
                type: 'string',
                description: 'Optional: Product ID',
              },
              secure: {
                type: 'boolean',
                description: 'Optional: Enable HTTPS (defaults to true)',
              },
              ipVersion: {
                type: 'string',
                enum: ['IPV4', 'IPV6', 'IPV4_IPV6'],
                description: 'Optional: IP version support (defaults to IPV4)',
              },
              certificateEnrollmentId: {
                type: 'number',
                description: 'Optional: Certificate enrollment ID for HTTPS',
              },
            },
            required: ['propertyId', 'domainPrefix'],
          },
        },
        {
          name: 'add_property_hostname',
          description: 'Add a hostname to a property',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              propertyId: {
                type: 'string',
                description: 'The property ID',
              },
              hostname: {
                type: 'string',
                description: 'The hostname to add (e.g., www.example.com)',
              },
              edgeHostname: {
                type: 'string',
                description: 'The edge hostname to map to',
              },
              version: {
                type: 'number',
                description: 'Optional: Version number (defaults to latest)',
              },
            },
            required: ['propertyId', 'hostname', 'edgeHostname'],
          },
        },
        {
          name: 'remove_property_hostname',
          description: 'Remove a hostname from a property',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              propertyId: {
                type: 'string',
                description: 'The property ID',
              },
              hostname: {
                type: 'string',
                description: 'The hostname to remove',
              },
              version: {
                type: 'number',
                description: 'Optional: Version number (defaults to latest)',
              },
            },
            required: ['propertyId', 'hostname'],
          },
        },
        {
          name: 'activate_property',
          description: 'Activate a property version to staging or production',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              propertyId: {
                type: 'string',
                description: 'The property ID',
              },
              version: {
                type: 'number',
                description: 'Optional: Version to activate (defaults to latest)',
              },
              network: {
                type: 'string',
                enum: ['STAGING', 'PRODUCTION'],
                description: 'Target network',
              },
              note: {
                type: 'string',
                description: 'Optional: Activation notes',
              },
              notifyEmails: {
                type: 'array',
                items: { type: 'string' },
                description: 'Optional: Email addresses to notify',
              },
              acknowledgeAllWarnings: {
                type: 'boolean',
                description: 'Optional: Acknowledge all warnings',
              },
            },
            required: ['propertyId', 'network'],
          },
        },
        {
          name: 'get_activation_status',
          description: 'Get the status of a property activation',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              propertyId: {
                type: 'string',
                description: 'The property ID',
              },
              activationId: {
                type: 'string',
                description: 'The activation ID',
              },
            },
            required: ['propertyId', 'activationId'],
          },
        },
        {
          name: 'list_property_activations',
          description: 'List activations for a property',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              propertyId: {
                type: 'string',
                description: 'The property ID',
              },
              network: {
                type: 'string',
                enum: ['STAGING', 'PRODUCTION'],
                description: 'Optional: Filter by network',
              },
            },
            required: ['propertyId'],
          },
        },
        // Advanced Property Activation Tools
        {
          name: 'validate_property_activation',
          description: 'Validate property before activation with comprehensive checks',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              propertyId: {
                type: 'string',
                description: 'The property ID',
              },
              version: {
                type: 'number',
                description: 'Optional: Version to validate (defaults to latest)',
              },
              network: {
                type: 'string',
                enum: ['STAGING', 'PRODUCTION'],
                description: 'Target network for activation',
              },
            },
            required: ['propertyId', 'network'],
          },
        },
        {
          name: 'activate_property_with_monitoring',
          description: 'Activate property with validation and progress monitoring',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              propertyId: {
                type: 'string',
                description: 'The property ID',
              },
              version: {
                type: 'number',
                description: 'Optional: Version to activate (defaults to latest)',
              },
              network: {
                type: 'string',
                enum: ['STAGING', 'PRODUCTION'],
                description: 'Target network',
              },
              note: {
                type: 'string',
                description: 'Optional: Activation notes',
              },
              options: {
                type: 'object',
                description: 'Optional: Activation options',
                properties: {
                  validateFirst: {
                    type: 'boolean',
                    description: 'Validate before activation (default: false)',
                  },
                  waitForCompletion: {
                    type: 'boolean',
                    description: 'Wait for activation to complete (default: false)',
                  },
                  maxWaitTime: {
                    type: 'number',
                    description: 'Maximum wait time in milliseconds (default: 1800000)',
                  },
                  rollbackOnFailure: {
                    type: 'boolean',
                    description: 'Rollback on failure (default: false)',
                  },
                  notifyEmails: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Email addresses to notify',
                  },
                },
              },
            },
            required: ['propertyId', 'network'],
          },
        },
        {
          name: 'get_activation_progress',
          description: 'Get detailed progress for an ongoing activation',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              propertyId: {
                type: 'string',
                description: 'The property ID',
              },
              activationId: {
                type: 'string',
                description: 'The activation ID',
              },
            },
            required: ['propertyId', 'activationId'],
          },
        },
        {
          name: 'cancel_property_activation',
          description: 'Cancel a pending property activation',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              propertyId: {
                type: 'string',
                description: 'The property ID',
              },
              activationId: {
                type: 'string',
                description: 'The activation ID to cancel',
              },
            },
            required: ['propertyId', 'activationId'],
          },
        },
        {
          name: 'create_activation_plan',
          description: 'Create an activation plan for multiple properties',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              properties: {
                type: 'array',
                description: 'Properties to activate',
                items: {
                  type: 'object',
                  properties: {
                    propertyId: {
                      type: 'string',
                      description: 'Property ID',
                    },
                    version: {
                      type: 'number',
                      description: 'Optional: Version to activate',
                    },
                    network: {
                      type: 'string',
                      enum: ['STAGING', 'PRODUCTION'],
                      description: 'Target network',
                    },
                  },
                  required: ['propertyId', 'network'],
                },
              },
              strategy: {
                type: 'string',
                enum: ['PARALLEL', 'SEQUENTIAL', 'DEPENDENCY_ORDERED'],
                description: 'Optional: Activation strategy (default: SEQUENTIAL)',
              },
              dependencies: {
                type: 'object',
                description: 'Optional: Property dependencies for DEPENDENCY_ORDERED strategy',
              },
            },
            required: ['properties'],
          },
        },
        // Property Version Management Tools
        {
          name: 'compare_property_versions',
          description: 'Compare two property versions to identify differences',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              propertyId: {
                type: 'string',
                description: 'The property ID',
              },
              version1: {
                type: 'number',
                description: 'First version to compare',
              },
              version2: {
                type: 'number',
                description: 'Second version to compare',
              },
              compareType: {
                type: 'string',
                enum: ['rules', 'hostnames', 'all'],
                description: 'Optional: What to compare (default: all)',
              },
              includeDetails: {
                type: 'boolean',
                description: 'Optional: Include detailed diff information (default: true)',
              },
            },
            required: ['propertyId', 'version1', 'version2'],
          },
        },
        {
          name: 'batch_create_versions',
          description: 'Create new versions across multiple properties',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              properties: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    propertyId: {
                      type: 'string',
                      description: 'Property ID',
                    },
                    baseVersion: {
                      type: 'number',
                      description: 'Optional: Base version to create from',
                    },
                    note: {
                      type: 'string',
                      description: 'Optional: Version note',
                    },
                  },
                  required: ['propertyId'],
                },
                description: 'Properties to create versions for',
              },
              defaultNote: {
                type: 'string',
                description: 'Optional: Default note for all versions',
              },
            },
            required: ['properties'],
          },
        },
        {
          name: 'get_version_timeline',
          description: 'Get comprehensive version timeline for a property',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              propertyId: {
                type: 'string',
                description: 'The property ID',
              },
              startDate: {
                type: 'string',
                description: 'Optional: Start date filter (ISO 8601)',
              },
              endDate: {
                type: 'string',
                description: 'Optional: End date filter (ISO 8601)',
              },
              includeChanges: {
                type: 'boolean',
                description: 'Optional: Include change details (default: true)',
              },
              limit: {
                type: 'number',
                description: 'Optional: Maximum events to return (default: 50)',
              },
            },
            required: ['propertyId'],
          },
        },
        {
          name: 'rollback_property_version',
          description: 'Rollback property to a previous version',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              propertyId: {
                type: 'string',
                description: 'The property ID',
              },
              targetVersion: {
                type: 'number',
                description: 'Version to rollback to',
              },
              preserveHostnames: {
                type: 'boolean',
                description: 'Optional: Keep current hostnames (default: true)',
              },
              createBackup: {
                type: 'boolean',
                description: 'Optional: Create backup of current version (default: true)',
              },
              note: {
                type: 'string',
                description: 'Optional: Rollback note',
              },
            },
            required: ['propertyId', 'targetVersion'],
          },
        },
        {
          name: 'update_version_metadata',
          description: 'Update version metadata including notes and tags',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              propertyId: {
                type: 'string',
                description: 'The property ID',
              },
              version: {
                type: 'number',
                description: 'Version to update',
              },
              metadata: {
                type: 'object',
                properties: {
                  note: {
                    type: 'string',
                    description: 'Optional: Version note',
                  },
                  tags: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Optional: Version tags',
                  },
                  labels: {
                    type: 'object',
                    description: 'Optional: Key-value labels',
                  },
                },
                description: 'Metadata to update',
              },
            },
            required: ['propertyId', 'version', 'metadata'],
          },
        },
        {
          name: 'merge_property_versions',
          description: 'Merge changes between property versions',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              propertyId: {
                type: 'string',
                description: 'The property ID',
              },
              sourceVersion: {
                type: 'number',
                description: 'Source version with changes',
              },
              targetVersion: {
                type: 'number',
                description: 'Target version to merge into',
              },
              mergeStrategy: {
                type: 'string',
                enum: ['merge', 'cherry-pick'],
                description: 'Merge strategy to use',
              },
              includePaths: {
                type: 'array',
                items: { type: 'string' },
                description: 'Optional: Specific paths to include (for cherry-pick)',
              },
              excludePaths: {
                type: 'array',
                items: { type: 'string' },
                description: 'Optional: Paths to exclude',
              },
              createNewVersion: {
                type: 'boolean',
                description: 'Optional: Create new version for merge (default: true)',
              },
            },
            required: ['propertyId', 'sourceVersion', 'targetVersion', 'mergeStrategy'],
          },
        },
        // Certificate Hostname Update Tools
        {
          name: 'update_property_with_default_dv',
          description: 'Update property with secure edge hostname using Default DV certificate',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              propertyId: {
                type: 'string',
                description: 'The property ID to update',
              },
              hostname: {
                type: 'string',
                description: 'The hostname to secure (e.g., www.example.com)',
              },
              version: {
                type: 'number',
                description: 'Optional: Property version (defaults to latest)',
              },
              ipVersion: {
                type: 'string',
                enum: ['IPV4', 'IPV6', 'IPV4_IPV6'],
                description: 'Optional: IP version support (defaults to IPV4_IPV6)',
              },
            },
            required: ['propertyId', 'hostname'],
          },
        },
        {
          name: 'update_property_with_cps_certificate',
          description: 'Update property with edge hostname secured by CPS-managed certificate',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              propertyId: {
                type: 'string',
                description: 'The property ID to update',
              },
              hostname: {
                type: 'string',
                description: 'The hostname to secure (e.g., www.example.com)',
              },
              certificateEnrollmentId: {
                type: 'number',
                description: 'CPS certificate enrollment ID',
              },
              version: {
                type: 'number',
                description: 'Optional: Property version (defaults to latest)',
              },
              ipVersion: {
                type: 'string',
                enum: ['IPV4', 'IPV6', 'IPV4_IPV6'],
                description: 'Optional: IP version support (defaults to IPV4_IPV6)',
              },
              tlsVersion: {
                type: 'string',
                enum: ['STANDARD_TLS', 'ENHANCED_TLS'],
                description: 'Optional: TLS version (defaults to ENHANCED_TLS)',
              },
            },
            required: ['propertyId', 'hostname', 'certificateEnrollmentId'],
          },
        },
        // CPS Tools
        {
          name: 'create_dv_enrollment',
          description: 'Create a new Default DV certificate enrollment',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              commonName: {
                type: 'string',
                description: 'Primary domain for the certificate',
              },
              sans: {
                type: 'array',
                items: { type: 'string' },
                description: 'Optional: Additional domains (Subject Alternative Names)',
              },
              adminContact: {
                type: 'object',
                properties: {
                  firstName: { type: 'string' },
                  lastName: { type: 'string' },
                  email: { type: 'string' },
                  phone: { type: 'string' },
                },
                required: ['firstName', 'lastName', 'email', 'phone'],
              },
              techContact: {
                type: 'object',
                properties: {
                  firstName: { type: 'string' },
                  lastName: { type: 'string' },
                  email: { type: 'string' },
                  phone: { type: 'string' },
                },
                required: ['firstName', 'lastName', 'email', 'phone'],
              },
              contractId: {
                type: 'string',
                description: 'Contract ID for billing',
              },
              enhancedTLS: {
                type: 'boolean',
                description: 'Optional: Deploy to Enhanced TLS network (default: true)',
              },
              quicEnabled: {
                type: 'boolean',
                description: 'Optional: Enable QUIC/HTTP3 support',
              },
            },
            required: ['commonName', 'adminContact', 'techContact', 'contractId'],
          },
        },
        {
          name: 'get_dv_validation_challenges',
          description: 'Get DV validation challenges for a certificate enrollment',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              enrollmentId: {
                type: 'number',
                description: 'Certificate enrollment ID',
              },
            },
            required: ['enrollmentId'],
          },
        },
        {
          name: 'check_dv_enrollment_status',
          description: 'Check the status of a DV certificate enrollment',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              enrollmentId: {
                type: 'number',
                description: 'Certificate enrollment ID',
              },
            },
            required: ['enrollmentId'],
          },
        },
        {
          name: 'list_certificate_enrollments',
          description: 'List all certificate enrollments',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              contractId: {
                type: 'string',
                description: 'Optional: Filter by contract ID',
              },
            },
          },
        },
        {
          name: 'link_certificate_to_property',
          description: 'Link a certificate to a property',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              enrollmentId: {
                type: 'number',
                description: 'Certificate enrollment ID',
              },
              propertyId: {
                type: 'string',
                description: 'Property ID to link to',
              },
              propertyVersion: {
                type: 'number',
                description: 'Optional: Property version (defaults to latest)',
              },
            },
            required: ['enrollmentId', 'propertyId'],
          },
        },
        // DNS Migration Tools
        {
          name: 'import_zone_via_axfr',
          description: 'Import a DNS zone via AXFR transfer',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              zone: {
                type: 'string',
                description: 'Zone to import',
              },
              masterServer: {
                type: 'string',
                description: 'Master DNS server to transfer from',
              },
              tsigKey: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  algorithm: { type: 'string' },
                  secret: { type: 'string' },
                },
                description: 'Optional: TSIG key for authentication',
              },
              createZone: {
                type: 'boolean',
                description: 'Optional: Create zone if it doesn\'t exist',
              },
              contractId: {
                type: 'string',
                description: 'Contract ID (required if createZone is true)',
              },
              groupId: {
                type: 'string',
                description: 'Group ID (required if createZone is true)',
              },
            },
            required: ['zone', 'masterServer'],
          },
        },
        {
          name: 'parse_zone_file',
          description: 'Parse a zone file and cache the records for import',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              zoneFileContent: {
                type: 'string',
                description: 'The zone file content to parse',
              },
              zone: {
                type: 'string',
                description: 'Zone name for the records',
              },
            },
            required: ['zoneFileContent', 'zone'],
          },
        },
        {
          name: 'bulk_import_records',
          description: 'Import cached records from a previous parse operation',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              zone: {
                type: 'string',
                description: 'Zone to import records into',
              },
              batchId: {
                type: 'string',
                description: 'Batch ID from parse operation',
              },
              clearCache: {
                type: 'boolean',
                description: 'Optional: Clear cache after import',
              },
            },
            required: ['zone', 'batchId'],
          },
        },
        {
          name: 'convert_zone_to_primary',
          description: 'Convert a secondary zone to primary',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              zone: {
                type: 'string',
                description: 'Zone to convert',
              },
              comment: {
                type: 'string',
                description: 'Optional: Conversion comment',
              },
            },
            required: ['zone'],
          },
        },
        {
          name: 'generate_migration_instructions',
          description: 'Generate DNS migration instructions for a zone',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              zone: {
                type: 'string',
                description: 'Zone name',
              },
              targetProvider: {
                type: 'string',
                enum: ['route53', 'cloudflare', 'godaddy', 'namecheap', 'generic'],
                description: 'Optional: Target DNS provider for specific instructions',
              },
            },
            required: ['zone'],
          },
        },
        // Secure Property Onboarding Tools
        {
          name: 'onboard_secure_property',
          description: 'Complete workflow for onboarding a Secure by Default property with automatic DefaultDV certificate',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              propertyName: {
                type: 'string',
                description: 'Name for the new property',
              },
              hostnames: {
                type: 'array',
                items: { type: 'string' },
                description: 'Hostnames to be served by this property',
              },
              originHostname: {
                type: 'string',
                description: 'Origin server hostname',
              },
              contractId: {
                type: 'string',
                description: 'Contract ID for billing',
              },
              groupId: {
                type: 'string',
                description: 'Group ID for organization',
              },
              productId: {
                type: 'string',
                description: 'Optional: Product ID (default: auto-selected, prefers Ion)',
              },
              cpCode: {
                type: 'number',
                description: 'Optional: CP Code for reporting',
              },
              notificationEmails: {
                type: 'array',
                items: { type: 'string' },
                description: 'Optional: Email addresses for notifications',
              },
              validatePrerequisites: {
                type: 'boolean',
                description: 'Optional: Validate prerequisites before starting (default: true)',
              },
            },
            required: ['propertyName', 'hostnames', 'originHostname', 'contractId', 'groupId'],
          },
        },
        {
          name: 'quick_secure_property_setup',
          description: 'Quick setup for secure property with minimal inputs and sensible defaults',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              domain: {
                type: 'string',
                description: 'Primary domain (e.g., example.com)',
              },
              originHostname: {
                type: 'string',
                description: 'Origin server hostname',
              },
              contractId: {
                type: 'string',
                description: 'Contract ID for billing',
              },
              groupId: {
                type: 'string',
                description: 'Group ID for organization',
              },
            },
            required: ['domain', 'originHostname', 'contractId', 'groupId'],
          },
        },
        {
          name: 'check_secure_property_status',
          description: 'Check the status of secure property onboarding including certificate validation',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              propertyId: {
                type: 'string',
                description: 'Property ID to check',
              },
              enrollmentId: {
                type: 'number',
                description: 'Optional: Certificate enrollment ID to check status',
              },
            },
            required: ['propertyId'],
          },
        },
        // Debug Tools
        {
          name: 'debug_secure_property_onboarding',
          description: 'Debug version of secure property onboarding with detailed error reporting',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              propertyName: {
                type: 'string',
                description: 'Name for the new property',
              },
              hostnames: {
                type: 'array',
                items: { type: 'string' },
                description: 'Hostnames to be served by this property',
              },
              originHostname: {
                type: 'string',
                description: 'Origin server hostname',
              },
              contractId: {
                type: 'string',
                description: 'Contract ID for billing',
              },
              groupId: {
                type: 'string',
                description: 'Group ID for organization',
              },
              productId: {
                type: 'string',
                description: 'Optional: Product ID (default: auto-selected, prefers Ion)',
              },
            },
            required: ['propertyName', 'hostnames', 'originHostname', 'contractId', 'groupId'],
          },
        },
        {
          name: 'test_basic_property_creation',
          description: 'Simple test for basic API connectivity and property creation',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              propertyName: {
                type: 'string',
                description: 'Name for the test property',
              },
              contractId: {
                type: 'string',
                description: 'Contract ID for billing',
              },
              groupId: {
                type: 'string',
                description: 'Group ID for organization',
              },
            },
            required: ['propertyName', 'contractId', 'groupId'],
          },
        },
        // CP Code Tools
        {
          name: 'list_cpcodes',
          description: 'List all CP Codes in your account for reporting and billing analysis',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              contractId: {
                type: 'string',
                description: 'Optional: Filter by contract ID',
              },
              groupId: {
                type: 'string',
                description: 'Optional: Filter by group ID',
              },
            },
          },
        },
        {
          name: 'get_cpcode',
          description: 'Get detailed information about a specific CP Code',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              cpcodeId: {
                type: 'string',
                description: 'CP Code ID (e.g., 12345 or cpc_12345)',
              },
            },
            required: ['cpcodeId'],
          },
        },
        {
          name: 'create_cpcode',
          description: 'Create a new CP Code for traffic reporting and billing analysis',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              cpcodeName: {
                type: 'string',
                description: 'Name for the new CP Code',
              },
              contractId: {
                type: 'string',
                description: 'Contract ID for billing',
              },
              groupId: {
                type: 'string',
                description: 'Group ID for organization',
              },
              productId: {
                type: 'string',
                description: 'Optional: Product ID (default: auto-selected, prefers Ion)',
              },
              timeZone: {
                type: 'string',
                description: 'Optional: Time zone for reporting (default: GMT)',
              },
            },
            required: ['cpcodeName', 'contractId', 'groupId'],
          },
        },
        {
          name: 'search_cpcodes',
          description: 'Search CP Codes by name or ID',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              searchTerm: {
                type: 'string',
                description: 'Search term (name or ID)',
              },
              contractId: {
                type: 'string',
                description: 'Optional: Filter by contract ID',
              },
              groupId: {
                type: 'string',
                description: 'Optional: Filter by group ID',
              },
            },
            required: ['searchTerm'],
          },
        },
        {
          name: 'list_edge_hostnames',
          description: 'List edge hostnames associated with a property',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              contractId: {
                type: 'string',
                description: 'Contract ID',
              },
              groupId: {
                type: 'string',
                description: 'Group ID',
              },
              options: {
                type: 'string',
                description: 'Optional: Comma-separated list of options (e.g., "mapDetails")',
              },
            },
            required: ['contractId', 'groupId'],
          },
        },
        {
          name: 'get_edge_hostname',
          description: 'Get details of a specific edge hostname',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              edgeHostnameId: {
                type: 'string',
                description: 'Edge hostname ID (e.g., ehn_12345)',
              },
              contractId: {
                type: 'string',
                description: 'Contract ID',
              },
              groupId: {
                type: 'string',
                description: 'Group ID',
              },
              options: {
                type: 'string',
                description: 'Optional: Comma-separated list of options',
              },
            },
            required: ['edgeHostnameId', 'contractId', 'groupId'],
          },
        },
        {
          name: 'clone_property',
          description: 'Clone an existing property',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              propertyId: {
                type: 'string',
                description: 'Source property ID to clone from',
              },
              propertyName: {
                type: 'string',
                description: 'Name for the new cloned property',
              },
              propertyVersion: {
                type: 'number',
                description: 'Optional: Specific version to clone (default: latest)',
              },
              contractId: {
                type: 'string',
                description: 'Contract ID for the new property',
              },
              groupId: {
                type: 'string',
                description: 'Group ID for the new property',
              },
              productId: {
                type: 'string',
                description: 'Optional: Product ID for the new property',
              },
              ruleFormat: {
                type: 'string',
                description: 'Optional: Rule format version',
              },
            },
            required: ['propertyId', 'propertyName', 'contractId', 'groupId'],
          },
        },
        {
          name: 'remove_property',
          description: 'Remove/delete a property',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              propertyId: {
                type: 'string',
                description: 'Property ID to remove',
              },
              contractId: {
                type: 'string',
                description: 'Contract ID',
              },
              groupId: {
                type: 'string',
                description: 'Group ID',
              },
            },
            required: ['propertyId', 'contractId', 'groupId'],
          },
        },
        {
          name: 'list_property_versions',
          description: 'List all versions of a property',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              propertyId: {
                type: 'string',
                description: 'Property ID',
              },
              contractId: {
                type: 'string',
                description: 'Contract ID',
              },
              groupId: {
                type: 'string',
                description: 'Group ID',
              },
              limit: {
                type: 'number',
                description: 'Optional: Maximum number of versions to return',
              },
              offset: {
                type: 'number',
                description: 'Optional: Offset for pagination',
              },
            },
            required: ['propertyId', 'contractId', 'groupId'],
          },
        },
        {
          name: 'get_property_version',
          description: 'Get details of a specific property version',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              propertyId: {
                type: 'string',
                description: 'Property ID',
              },
              propertyVersion: {
                type: 'number',
                description: 'Property version number',
              },
              contractId: {
                type: 'string',
                description: 'Contract ID',
              },
              groupId: {
                type: 'string',
                description: 'Group ID',
              },
            },
            required: ['propertyId', 'propertyVersion', 'contractId', 'groupId'],
          },
        },
        {
          name: 'get_latest_property_version',
          description: 'Get the latest version of a property',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              propertyId: {
                type: 'string',
                description: 'Property ID',
              },
              contractId: {
                type: 'string',
                description: 'Contract ID',
              },
              groupId: {
                type: 'string',
                description: 'Group ID',
              },
              activatedOn: {
                type: 'string',
                description: 'Optional: Network to get latest activated version from (STAGING or PRODUCTION)',
              },
            },
            required: ['propertyId', 'contractId', 'groupId'],
          },
        },
        {
          name: 'cancel_property_activation',
          description: 'Cancel a pending property activation',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              propertyId: {
                type: 'string',
                description: 'Property ID',
              },
              activationId: {
                type: 'string',
                description: 'Activation ID to cancel',
              },
              contractId: {
                type: 'string',
                description: 'Contract ID',
              },
              groupId: {
                type: 'string',
                description: 'Group ID',
              },
            },
            required: ['propertyId', 'activationId', 'contractId', 'groupId'],
          },
        },
        {
          name: 'search_properties',
          description: 'Search for properties by various criteria including name, hostname, edge hostname, contract, group, product, and activation status',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              // Legacy parameters for backward compatibility
              searchTerm: {
                type: 'string',
                description: 'Optional: Legacy search term (use specific criteria below for better results)',
              },
              searchBy: {
                type: 'string',
                enum: ['name', 'hostname', 'edgeHostname'],
                description: 'Optional: What to search by when using searchTerm (legacy)',
              },
              // Enhanced search criteria
              propertyName: {
                type: 'string',
                description: 'Optional: Property name to search for (partial match)',
              },
              hostname: {
                type: 'string',
                description: 'Optional: Hostname to search for (partial match)',
              },
              edgeHostname: {
                type: 'string',
                description: 'Optional: Edge hostname to search for (partial match)',
              },
              contractId: {
                type: 'string',
                description: 'Optional: Filter by contract ID (exact match)',
              },
              groupId: {
                type: 'string',
                description: 'Optional: Filter by group ID (exact match)',
              },
              productId: {
                type: 'string',
                description: 'Optional: Filter by product ID (exact match)',
              },
              activationStatus: {
                type: 'string',
                enum: ['production', 'staging', 'any', 'none'],
                description: 'Optional: Filter by activation status',
              },
            },
            required: [],
          },
        },
        {
          name: 'list_all_hostnames',
          description: 'List all hostnames across all properties',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              contractId: {
                type: 'string',
                description: 'Optional: Filter by contract ID',
              },
              groupId: {
                type: 'string',
                description: 'Optional: Filter by group ID',
              },
              options: {
                type: 'string',
                description: 'Optional: Comma-separated list of options',
              },
            },
            required: [],
          },
        },
        {
          name: 'list_property_version_hostnames',
          description: 'List hostnames for a specific property version',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              propertyId: {
                type: 'string',
                description: 'Property ID',
              },
              propertyVersion: {
                type: 'number',
                description: 'Property version number',
              },
              contractId: {
                type: 'string',
                description: 'Contract ID',
              },
              groupId: {
                type: 'string',
                description: 'Group ID',
              },
              validateHostnames: {
                type: 'boolean',
                description: 'Optional: Validate hostnames (default: false)',
              },
              includeCertStatus: {
                type: 'boolean',
                description: 'Optional: Include certificate status (default: false)',
              },
            },
            required: ['propertyId', 'propertyVersion', 'contractId', 'groupId'],
          },
        },
        {
          name: 'list_available_behaviors',
          description: 'List available behaviors for property rules',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              propertyId: {
                type: 'string',
                description: 'Optional: Property ID for context',
              },
              propertyVersion: {
                type: 'number',
                description: 'Optional: Property version for context',
              },
              contractId: {
                type: 'string',
                description: 'Contract ID',
              },
              groupId: {
                type: 'string',
                description: 'Group ID',
              },
              productId: {
                type: 'string',
                description: 'Optional: Product ID',
              },
              ruleFormat: {
                type: 'string',
                description: 'Optional: Rule format version',
              },
            },
            required: ['contractId', 'groupId'],
          },
        },
        {
          name: 'list_available_criteria',
          description: 'List available criteria for property rules',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              propertyId: {
                type: 'string',
                description: 'Optional: Property ID for context',
              },
              propertyVersion: {
                type: 'number',
                description: 'Optional: Property version for context',
              },
              contractId: {
                type: 'string',
                description: 'Contract ID',
              },
              groupId: {
                type: 'string',
                description: 'Group ID',
              },
              productId: {
                type: 'string',
                description: 'Optional: Product ID',
              },
              ruleFormat: {
                type: 'string',
                description: 'Optional: Rule format version',
              },
            },
            required: ['contractId', 'groupId'],
          },
        },
        {
          name: 'patch_property_rules',
          description: 'Apply JSON patch operations to property rules',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              propertyId: {
                type: 'string',
                description: 'Property ID',
              },
              propertyVersion: {
                type: 'number',
                description: 'Property version number',
              },
              contractId: {
                type: 'string',
                description: 'Contract ID',
              },
              groupId: {
                type: 'string',
                description: 'Group ID',
              },
              patches: {
                type: 'array',
                description: 'Array of JSON patch operations',
                items: {
                  type: 'object',
                  properties: {
                    op: {
                      type: 'string',
                      description: 'Operation type (add, remove, replace, move, copy, test)',
                    },
                    path: {
                      type: 'string',
                      description: 'JSON pointer path',
                    },
                    value: {
                      description: 'Value for the operation',
                    },
                    from: {
                      type: 'string',
                      description: 'Source path for move/copy operations',
                    },
                  },
                  required: ['op', 'path'],
                },
              },
              validateRules: {
                type: 'boolean',
                description: 'Optional: Validate rules after patching (default: true)',
              },
            },
            required: ['propertyId', 'propertyVersion', 'contractId', 'groupId', 'patches'],
          },
        },
        {
          name: 'bulk_search_properties',
          description: 'Initiate a bulk search for properties',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              contractId: {
                type: 'string',
                description: 'Contract ID',
              },
              groupId: {
                type: 'string',
                description: 'Group ID',
              },
            },
            required: ['contractId', 'groupId'],
          },
        },
        {
          name: 'get_bulk_search_results',
          description: 'Get results from a bulk property search',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              bulkSearchId: {
                type: 'string',
                description: 'Bulk search ID',
              },
              contractId: {
                type: 'string',
                description: 'Contract ID',
              },
              groupId: {
                type: 'string',
                description: 'Group ID',
              },
            },
            required: ['bulkSearchId', 'contractId', 'groupId'],
          },
        },
        {
          name: 'generate_domain_validation_challenges',
          description: 'Generate domain validation challenges for certificates',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              enrollmentId: {
                type: 'string',
                description: 'Certificate enrollment ID',
              },
              contractId: {
                type: 'string',
                description: 'Contract ID',
              },
            },
            required: ['enrollmentId', 'contractId'],
          },
        },
        {
          name: 'resume_domain_validation',
          description: 'Resume domain validation for certificates',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              enrollmentId: {
                type: 'string',
                description: 'Certificate enrollment ID',
              },
              contractId: {
                type: 'string',
                description: 'Contract ID',
              },
            },
            required: ['enrollmentId', 'contractId'],
          },
        },
        {
          name: 'get_property_audit_history',
          description: 'Get audit history for a property',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              propertyId: {
                type: 'string',
                description: 'Property ID',
              },
              contractId: {
                type: 'string',
                description: 'Contract ID',
              },
              groupId: {
                type: 'string',
                description: 'Group ID',
              },
              startDate: {
                type: 'string',
                description: 'Optional: Start date for audit history (ISO 8601)',
              },
              endDate: {
                type: 'string',
                description: 'Optional: End date for audit history (ISO 8601)',
              },
              limit: {
                type: 'number',
                description: 'Optional: Maximum number of entries to return',
              },
              offset: {
                type: 'number',
                description: 'Optional: Offset for pagination',
              },
            },
            required: ['propertyId', 'contractId', 'groupId'],
          },
        },
        // Advanced DNS Tools
        {
          name: 'get_zones_dnssec_status',
          description: 'Get DNSSEC status for one or more zones',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              zones: {
                type: 'array',
                items: { type: 'string' },
                description: 'Array of zone names to check',
              },
            },
            required: ['zones'],
          },
        },
        {
          name: 'get_secondary_zone_transfer_status',
          description: 'Get transfer status for secondary zones',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              zones: {
                type: 'array',
                items: { type: 'string' },
                description: 'Array of secondary zone names',
              },
            },
            required: ['zones'],
          },
        },
        {
          name: 'get_zone_contract',
          description: 'Get contract information for a zone',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              zone: {
                type: 'string',
                description: 'Zone name',
              },
            },
            required: ['zone'],
          },
        },
        {
          name: 'get_record_set',
          description: 'Get a single record set by name and type',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              zone: {
                type: 'string',
                description: 'Zone name',
              },
              name: {
                type: 'string',
                description: 'Record name',
              },
              type: {
                type: 'string',
                description: 'Record type (A, AAAA, CNAME, etc.)',
              },
            },
            required: ['zone', 'name', 'type'],
          },
        },
        {
          name: 'update_tsig_key_for_zones',
          description: 'Update TSIG key for multiple zones',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              zones: {
                type: 'array',
                items: { type: 'string' },
                description: 'Array of zone names to update',
              },
              tsigKey: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  algorithm: { type: 'string' },
                  secret: { type: 'string' },
                },
                required: ['name', 'algorithm', 'secret'],
                description: 'TSIG key configuration',
              },
            },
            required: ['zones', 'tsigKey'],
          },
        },
        {
          name: 'submit_bulk_zone_create_request',
          description: 'Submit a request to create multiple zones asynchronously',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              zones: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    zone: { type: 'string' },
                    type: { type: 'string', enum: ['PRIMARY', 'SECONDARY', 'ALIAS'] },
                    comment: { type: 'string' },
                    masters: { type: 'array', items: { type: 'string' } },
                    target: { type: 'string' },
                  },
                  required: ['zone', 'type'],
                },
                description: 'Array of zones to create',
              },
              contractId: {
                type: 'string',
                description: 'Contract ID',
              },
              groupId: {
                type: 'string',
                description: 'Group ID',
              },
            },
            required: ['zones', 'contractId', 'groupId'],
          },
        },
        {
          name: 'get_zone_version',
          description: 'Get details about a specific zone version',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              zone: {
                type: 'string',
                description: 'Zone name',
              },
              versionId: {
                type: 'string',
                description: 'Version ID',
              },
            },
            required: ['zone', 'versionId'],
          },
        },
        {
          name: 'get_version_record_sets',
          description: 'Get record sets for a specific zone version',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              zone: {
                type: 'string',
                description: 'Zone name',
              },
              versionId: {
                type: 'string',
                description: 'Version ID',
              },
              offset: {
                type: 'number',
                description: 'Optional: Offset for pagination',
              },
              limit: {
                type: 'number',
                description: 'Optional: Limit for pagination',
              },
            },
            required: ['zone', 'versionId'],
          },
        },
        {
          name: 'reactivate_zone_version',
          description: 'Reactivate a previous zone version',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              zone: {
                type: 'string',
                description: 'Zone name',
              },
              versionId: {
                type: 'string',
                description: 'Version ID to reactivate',
              },
              comment: {
                type: 'string',
                description: 'Optional: Comment for the reactivation',
              },
            },
            required: ['zone', 'versionId'],
          },
        },
        {
          name: 'get_version_master_zone_file',
          description: 'Download zone file for a specific version',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              zone: {
                type: 'string',
                description: 'Zone name',
              },
              versionId: {
                type: 'string',
                description: 'Version ID',
              },
            },
            required: ['zone', 'versionId'],
          },
        },
        {
          name: 'create_multiple_record_sets',
          description: 'Create multiple DNS records in a single operation',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              zone: {
                type: 'string',
                description: 'Zone name',
              },
              recordSets: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    type: { type: 'string' },
                    ttl: { type: 'number' },
                    rdata: { type: 'array', items: { type: 'string' } },
                  },
                  required: ['name', 'type', 'ttl', 'rdata'],
                },
                description: 'Array of record sets to create',
              },
              comment: {
                type: 'string',
                description: 'Optional: Change comment',
              },
            },
            required: ['zone', 'recordSets'],
          },
        },
        // Advanced Rule Tree Management Tools
        {
          name: 'validate_rule_tree',
          description: 'Validate rule tree with comprehensive analysis',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              propertyId: {
                type: 'string',
                description: 'Property ID',
              },
              version: {
                type: 'number',
                description: 'Optional: Version number (defaults to latest)',
              },
              rules: {
                type: 'object',
                description: 'Optional: Rule tree to validate (if not fetching from property)',
              },
              includeOptimizations: {
                type: 'boolean',
                description: 'Optional: Include optimization suggestions',
              },
              includeStatistics: {
                type: 'boolean',
                description: 'Optional: Include rule statistics',
              },
            },
            required: ['propertyId'],
          },
        },
        {
          name: 'create_rule_tree_from_template',
          description: 'Create rule tree from template',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              templateId: {
                type: 'string',
                description: 'Template ID to use',
              },
              variables: {
                type: 'object',
                description: 'Optional: Template variables',
              },
              propertyId: {
                type: 'string',
                description: 'Optional: Property ID to update',
              },
              version: {
                type: 'number',
                description: 'Optional: Version to update',
              },
              validate: {
                type: 'boolean',
                description: 'Optional: Validate generated rules',
              },
            },
            required: ['templateId'],
          },
        },
        {
          name: 'analyze_rule_tree_performance',
          description: 'Analyze rule tree for optimization opportunities',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              propertyId: {
                type: 'string',
                description: 'Property ID',
              },
              version: {
                type: 'number',
                description: 'Optional: Version number',
              },
              rules: {
                type: 'object',
                description: 'Optional: Rule tree to analyze',
              },
              includeRecommendations: {
                type: 'boolean',
                description: 'Optional: Include recommendations',
              },
            },
            required: ['propertyId'],
          },
        },
        {
          name: 'detect_rule_conflicts',
          description: 'Detect conflicts between rules',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              propertyId: {
                type: 'string',
                description: 'Property ID',
              },
              version: {
                type: 'number',
                description: 'Optional: Version number',
              },
              rules: {
                type: 'object',
                description: 'Optional: Rule tree to check',
              },
            },
            required: ['propertyId'],
          },
        },
        {
          name: 'list_rule_templates',
          description: 'List available rule templates',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              category: {
                type: 'string',
                description: 'Optional: Filter by category',
              },
              tags: {
                type: 'array',
                items: { type: 'string' },
                description: 'Optional: Filter by tags',
              },
            },
          },
        },
        // Documentation Automation Tools
        {
          name: 'generate_documentation_index',
          description: 'Generate an index of all documentation files with metadata and categories',
          inputSchema: {
            type: 'object',
            properties: {
              docsPath: {
                type: 'string',
                description: 'Optional: Path to documentation directory (default: "docs")',
              },
              outputPath: {
                type: 'string',
                description: 'Optional: Output path for the index file (default: "docs/index.json")',
              },
            },
          },
        },
        {
          name: 'generate_api_reference',
          description: 'Generate API reference documentation from tool definitions',
          inputSchema: {
            type: 'object',
            properties: {
              toolsPath: {
                type: 'string',
                description: 'Optional: Path to tools directory (default: "src/tools")',
              },
              outputPath: {
                type: 'string',
                description: 'Optional: Output path for the reference (default: "docs/api-reference.md")',
              },
              format: {
                type: 'string',
                enum: ['markdown', 'json'],
                description: 'Optional: Output format (default: "markdown")',
              },
            },
          },
        },
        {
          name: 'generate_feature_documentation',
          description: 'Generate comprehensive documentation for a specific feature',
          inputSchema: {
            type: 'object',
            properties: {
              feature: {
                type: 'string',
                description: 'The feature name to document',
              },
              analysisDepth: {
                type: 'string',
                enum: ['basic', 'detailed', 'comprehensive'],
                description: 'Optional: Depth of analysis (default: "detailed")',
              },
              includeExamples: {
                type: 'boolean',
                description: 'Optional: Include code examples (default: true)',
              },
              outputPath: {
                type: 'string',
                description: 'Optional: Output path for the documentation',
              },
            },
            required: ['feature'],
          },
        },
        {
          name: 'update_documentation',
          description: 'Update existing documentation with new content or sections',
          inputSchema: {
            type: 'object',
            properties: {
              document: {
                type: 'string',
                description: 'The document path to update',
              },
              updates: {
                type: 'object',
                properties: {
                  sections: {
                    type: 'object',
                    description: 'Optional: Sections to update (key: section name, value: new content)',
                  },
                  examples: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        title: { type: 'string' },
                        code: { type: 'string' },
                        description: { type: 'string' },
                      },
                      required: ['title', 'code'],
                    },
                    description: 'Optional: Examples to add',
                  },
                  metadata: {
                    type: 'object',
                    description: 'Optional: Metadata to update',
                  },
                },
                description: 'Updates to apply to the document',
              },
              createBackup: {
                type: 'boolean',
                description: 'Optional: Create backup before updating (default: true)',
              },
            },
            required: ['document', 'updates'],
          },
        },
        {
          name: 'generate_changelog',
          description: 'Generate changelog from git history and conventional commits',
          inputSchema: {
            type: 'object',
            properties: {
              fromVersion: {
                type: 'string',
                description: 'Optional: Starting version or commit',
              },
              toVersion: {
                type: 'string',
                description: 'Optional: Ending version or commit',
              },
              outputPath: {
                type: 'string',
                description: 'Optional: Output path for changelog (default: "CHANGELOG.md")',
              },
              includeBreakingChanges: {
                type: 'boolean',
                description: 'Optional: Include breaking changes section (default: true)',
              },
              groupByCategory: {
                type: 'boolean',
                description: 'Optional: Group changes by category (default: true)',
              },
            },
          },
        },
        {
          name: 'create_knowledge_article',
          description: 'Create a new knowledge base article with proper formatting and indexing',
          inputSchema: {
            type: 'object',
            properties: {
              title: {
                type: 'string',
                description: 'Article title',
              },
              category: {
                type: 'string',
                description: 'Article category',
              },
              content: {
                type: 'string',
                description: 'Article content in markdown',
              },
              tags: {
                type: 'array',
                items: { type: 'string' },
                description: 'Optional: Tags for the article',
              },
              relatedArticles: {
                type: 'array',
                items: { type: 'string' },
                description: 'Optional: Related article titles',
              },
              outputPath: {
                type: 'string',
                description: 'Optional: Custom output path',
              },
            },
            required: ['title', 'category', 'content'],
          },
        },
        // Advanced Hostname Management Tools
        {
          name: 'analyze_hostname_ownership',
          description: 'Analyze hostname ownership and conflicts',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              hostnames: {
                type: 'array',
                items: { type: 'string' },
                description: 'Array of hostnames to analyze',
              },
              includeWildcardAnalysis: {
                type: 'boolean',
                description: 'Optional: Include wildcard coverage analysis',
              },
              includeRecommendations: {
                type: 'boolean',
                description: 'Optional: Include provisioning recommendations',
              },
            },
            required: ['hostnames'],
          },
        },
        {
          name: 'generate_edge_hostname_recommendations',
          description: 'Generate intelligent edge hostname recommendations',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              hostnames: {
                type: 'array',
                items: { type: 'string' },
                description: 'Array of hostnames to generate recommendations for',
              },
              preferredSuffix: {
                type: 'string',
                enum: ['.edgekey.net', '.edgesuite.net', '.akamaized.net'],
                description: 'Optional: Preferred edge hostname suffix',
              },
              forceSecure: {
                type: 'boolean',
                description: 'Optional: Force secure edge hostnames',
              },
            },
            required: ['hostnames'],
          },
        },
        {
          name: 'validate_hostnames_bulk',
          description: 'Validate hostnames in bulk',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              hostnames: {
                type: 'array',
                items: { type: 'string' },
                description: 'Array of hostnames to validate',
              },
              checkDNS: {
                type: 'boolean',
                description: 'Optional: Check DNS configuration',
              },
              checkCertificates: {
                type: 'boolean',
                description: 'Optional: Check certificate status',
              },
            },
            required: ['hostnames'],
          },
        },
        {
          name: 'find_optimal_property_assignment',
          description: 'Find optimal property assignment for hostnames',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              hostnames: {
                type: 'array',
                items: { type: 'string' },
                description: 'Array of hostnames to assign',
              },
              groupingStrategy: {
                type: 'string',
                enum: ['by-domain', 'by-function', 'by-environment', 'auto'],
                description: 'Optional: Strategy for grouping hostnames',
              },
              maxHostnamesPerProperty: {
                type: 'number',
                description: 'Optional: Maximum hostnames per property',
              },
            },
            required: ['hostnames'],
          },
        },
        {
          name: 'create_hostname_provisioning_plan',
          description: 'Create comprehensive hostname provisioning plan',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              hostnames: {
                type: 'array',
                items: { type: 'string' },
                description: 'Array of hostnames to provision',
              },
              contractId: {
                type: 'string',
                description: 'Contract ID for billing',
              },
              groupId: {
                type: 'string',
                description: 'Group ID for organization',
              },
              productId: {
                type: 'string',
                description: 'Optional: Product ID (defaults to Ion)',
              },
              securityLevel: {
                type: 'string',
                enum: ['standard', 'enhanced', 'advanced'],
                description: 'Optional: Security level for provisioning',
              },
            },
            required: ['hostnames', 'contractId', 'groupId'],
          },
        },
        // Advanced Property Operations Tools
        {
          name: 'search_properties_advanced',
          description: 'Advanced property search with multiple criteria',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              criteria: {
                type: 'object',
                properties: {
                  name: {
                    type: 'string',
                    description: 'Optional: Property name contains',
                  },
                  hostname: {
                    type: 'string',
                    description: 'Optional: Hostname contains',
                  },
                  edgeHostname: {
                    type: 'string',
                    description: 'Optional: Edge hostname contains',
                  },
                  contractId: {
                    type: 'string',
                    description: 'Optional: Contract ID',
                  },
                  groupId: {
                    type: 'string',
                    description: 'Optional: Group ID',
                  },
                  productId: {
                    type: 'string',
                    description: 'Optional: Product ID',
                  },
                  activationStatus: {
                    type: 'string',
                    enum: ['production', 'staging', 'both', 'none'],
                    description: 'Optional: Activation status filter',
                  },
                  lastModifiedAfter: {
                    type: 'string',
                    format: 'date-time',
                    description: 'Optional: Modified after date',
                  },
                  lastModifiedBefore: {
                    type: 'string',
                    format: 'date-time',
                    description: 'Optional: Modified before date',
                  },
                  hasWarnings: {
                    type: 'boolean',
                    description: 'Optional: Has validation warnings',
                  },
                  hasErrors: {
                    type: 'boolean',
                    description: 'Optional: Has validation errors',
                  },
                  certificateStatus: {
                    type: 'string',
                    enum: ['valid', 'expiring', 'expired'],
                    description: 'Optional: Certificate status',
                  },
                  ruleFormat: {
                    type: 'string',
                    description: 'Optional: Rule format version',
                  },
                },
                description: 'Search criteria',
              },
              limit: {
                type: 'number',
                description: 'Optional: Maximum results to return',
              },
              sortBy: {
                type: 'string',
                enum: ['relevance', 'name', 'lastModified', 'size'],
                description: 'Optional: Sort order',
              },
              includeDetails: {
                type: 'boolean',
                description: 'Optional: Include detailed information',
              },
            },
            required: ['criteria'],
          },
        },
        {
          name: 'compare_properties',
          description: 'Compare two properties in detail',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              propertyIdA: {
                type: 'string',
                description: 'First property ID',
              },
              propertyIdB: {
                type: 'string',
                description: 'Second property ID',
              },
              versionA: {
                type: 'number',
                description: 'Optional: Version for first property',
              },
              versionB: {
                type: 'number',
                description: 'Optional: Version for second property',
              },
              compareRules: {
                type: 'boolean',
                description: 'Optional: Compare rule trees',
              },
              compareHostnames: {
                type: 'boolean',
                description: 'Optional: Compare hostnames',
              },
              compareBehaviors: {
                type: 'boolean',
                description: 'Optional: Compare behaviors',
              },
            },
            required: ['propertyIdA', 'propertyIdB'],
          },
        },
        {
          name: 'check_property_health',
          description: 'Perform health check on property',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              propertyId: {
                type: 'string',
                description: 'Property ID to check',
              },
              version: {
                type: 'number',
                description: 'Optional: Version to check',
              },
              includePerformance: {
                type: 'boolean',
                description: 'Optional: Include performance analysis',
              },
              includeSecurity: {
                type: 'boolean',
                description: 'Optional: Include security analysis',
              },
            },
            required: ['propertyId'],
          },
        },
        {
          name: 'detect_configuration_drift',
          description: 'Detect configuration drift from baseline',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              propertyId: {
                type: 'string',
                description: 'Property ID to analyze',
              },
              baselineVersion: {
                type: 'number',
                description: 'Baseline version number',
              },
              compareVersion: {
                type: 'number',
                description: 'Optional: Version to compare (defaults to latest)',
              },
              checkBehaviors: {
                type: 'boolean',
                description: 'Optional: Check behavior changes',
              },
              checkHostnames: {
                type: 'boolean',
                description: 'Optional: Check hostname changes',
              },
              checkSettings: {
                type: 'boolean',
                description: 'Optional: Check settings changes',
              },
            },
            required: ['propertyId', 'baselineVersion'],
          },
        },
        {
          name: 'bulk_update_properties',
          description: 'Update multiple properties with common changes',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              propertyIds: {
                type: 'array',
                items: { type: 'string' },
                description: 'Array of property IDs to update',
              },
              updates: {
                type: 'object',
                properties: {
                  addBehavior: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      options: { type: 'object' },
                      criteria: { type: 'array' },
                    },
                    description: 'Optional: Behavior to add',
                  },
                  updateBehavior: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      options: { type: 'object' },
                    },
                    description: 'Optional: Behavior to update',
                  },
                  addHostname: {
                    type: 'object',
                    properties: {
                      hostname: { type: 'string' },
                      edgeHostname: { type: 'string' },
                    },
                    description: 'Optional: Hostname to add',
                  },
                  removeHostname: {
                    type: 'string',
                    description: 'Optional: Hostname to remove',
                  },
                },
                description: 'Updates to apply',
              },
              createNewVersion: {
                type: 'boolean',
                description: 'Optional: Create new version for each property',
              },
              note: {
                type: 'string',
                description: 'Optional: Version note',
              },
            },
            required: ['propertyIds', 'updates'],
          },
        },
        // Bulk Operations Manager Tools
        {
          name: 'bulk_clone_properties',
          description: 'Clone a property to multiple new properties',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              sourcePropertyId: {
                type: 'string',
                description: 'Source property ID to clone from',
              },
              targetNames: {
                type: 'array',
                items: { type: 'string' },
                description: 'Names for the new cloned properties',
              },
              contractId: {
                type: 'string',
                description: 'Contract ID for the new properties',
              },
              groupId: {
                type: 'string',
                description: 'Group ID for the new properties',
              },
              productId: {
                type: 'string',
                description: 'Optional: Product ID (defaults to source property product)',
              },
              ruleFormat: {
                type: 'string',
                description: 'Optional: Rule format version',
              },
              cloneHostnames: {
                type: 'boolean',
                description: 'Optional: Clone hostnames from source',
              },
              activateImmediately: {
                type: 'boolean',
                description: 'Optional: Activate cloned properties immediately',
              },
              network: {
                type: 'string',
                enum: ['STAGING', 'PRODUCTION'],
                description: 'Optional: Network for immediate activation',
              },
            },
            required: ['sourcePropertyId', 'targetNames', 'contractId', 'groupId'],
          },
        },
        {
          name: 'bulk_activate_properties',
          description: 'Activate multiple properties on staging or production',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              propertyIds: {
                type: 'array',
                items: { type: 'string' },
                description: 'Property IDs to activate',
              },
              network: {
                type: 'string',
                enum: ['STAGING', 'PRODUCTION'],
                description: 'Target network',
              },
              note: {
                type: 'string',
                description: 'Optional: Activation note',
              },
              notifyEmails: {
                type: 'array',
                items: { type: 'string' },
                description: 'Optional: Email addresses to notify',
              },
              acknowledgeAllWarnings: {
                type: 'boolean',
                description: 'Optional: Acknowledge all warnings',
              },
              waitForCompletion: {
                type: 'boolean',
                description: 'Optional: Wait for activation to complete',
              },
              maxWaitTime: {
                type: 'number',
                description: 'Optional: Maximum wait time in milliseconds',
              },
            },
            required: ['propertyIds', 'network'],
          },
        },
        {
          name: 'bulk_update_property_rules',
          description: 'Update rules on multiple properties using JSON patches',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              propertyIds: {
                type: 'array',
                items: { type: 'string' },
                description: 'Property IDs to update',
              },
              rulePatches: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    op: {
                      type: 'string',
                      enum: ['add', 'remove', 'replace', 'copy', 'move'],
                      description: 'Patch operation',
                    },
                    path: {
                      type: 'string',
                      description: 'JSON path to target',
                    },
                    value: {
                      description: 'Value for the operation',
                    },
                    from: {
                      type: 'string',
                      description: 'Source path for copy/move operations',
                    },
                  },
                  required: ['op', 'path'],
                },
                description: 'JSON patch operations to apply',
              },
              createNewVersion: {
                type: 'boolean',
                description: 'Optional: Create new version for each property',
              },
              validateChanges: {
                type: 'boolean',
                description: 'Optional: Validate changes before applying',
              },
              note: {
                type: 'string',
                description: 'Optional: Version note',
              },
            },
            required: ['propertyIds', 'rulePatches'],
          },
        },
        {
          name: 'bulk_manage_hostnames',
          description: 'Add or remove hostnames across multiple properties',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              operations: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    propertyId: {
                      type: 'string',
                      description: 'Property ID',
                    },
                    action: {
                      type: 'string',
                      enum: ['add', 'remove'],
                      description: 'Action to perform',
                    },
                    hostnames: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          hostname: {
                            type: 'string',
                            description: 'Hostname',
                          },
                          edgeHostname: {
                            type: 'string',
                            description: 'Optional: Edge hostname for add operations',
                          },
                        },
                        required: ['hostname'],
                      },
                      description: 'Hostnames to add or remove',
                    },
                  },
                  required: ['propertyId', 'action', 'hostnames'],
                },
                description: 'Hostname operations to perform',
              },
              createNewVersion: {
                type: 'boolean',
                description: 'Optional: Create new version for each property',
              },
              validateDNS: {
                type: 'boolean',
                description: 'Optional: Validate DNS before adding',
              },
              note: {
                type: 'string',
                description: 'Optional: Version note',
              },
            },
            required: ['operations'],
          },
        },
        {
          name: 'get_bulk_operation_status',
          description: 'Get status of a bulk operation',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              operationId: {
                type: 'string',
                description: 'Bulk operation ID',
              },
              detailed: {
                type: 'boolean',
                description: 'Optional: Include detailed property status',
              },
            },
            required: ['operationId'],
          },
        },
        {
          name: 'get_system_health',
          description: 'Get system health status and circuit breaker states',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              includeMetrics: {
                type: 'boolean',
                description: 'Optional: Include detailed metrics in the response',
              },
              operationType: {
                type: 'string',
                description: 'Optional: Check specific operation type (PROPERTY_READ, DNS_read, etc.)',
              },
            },
          },
        },
        {
          name: 'reset_circuit_breaker',
          description: 'Reset circuit breaker for an operation type',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              operationType: {
                type: 'string',
                description: 'Operation type to reset (PROPERTY_READ, PROPERTY_WRITE, etc.)',
              },
              force: {
                type: 'boolean',
                description: 'Optional: Force reset even if already closed',
              },
            },
            required: ['operationType'],
          },
        },
        {
          name: 'get_operation_metrics',
          description: 'Get detailed operation metrics and performance data',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              operationType: {
                type: 'string',
                description: 'Optional: Specific operation type to get metrics for',
              },
              includeTrends: {
                type: 'boolean',
                description: 'Optional: Include performance trends and analysis',
              },
            },
          },
        },
        {
          name: 'test_operation_resilience',
          description: 'Test operation resilience with controlled failure scenarios',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              operationType: {
                type: 'string',
                description: 'Operation type to test (PROPERTY_READ, DNS_read, etc.)',
              },
              testType: {
                type: 'string',
                enum: ['basic', 'circuit_breaker', 'retry'],
                description: 'Type of resilience test to perform',
              },
              iterations: {
                type: 'number',
                description: 'Optional: Number of test iterations (default: 5)',
              },
            },
            required: ['operationType', 'testType'],
          },
        },
        {
          name: 'get_error_recovery_suggestions',
          description: 'Get error recovery suggestions and troubleshooting guidance',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              errorType: {
                type: 'string',
                description: 'Optional: Specific error type or code',
              },
              operationType: {
                type: 'string',
                description: 'Optional: Operation type context',
              },
              includePreventiveMeasures: {
                type: 'boolean',
                description: 'Optional: Include preventive measures and best practices',
              },
            },
          },
        },
        {
          name: 'get_performance_analysis',
          description: 'Get comprehensive performance analysis and metrics',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              operationType: {
                type: 'string',
                description: 'Optional: Filter analysis by specific operation type',
              },
              timeWindowMs: {
                type: 'number',
                description: 'Optional: Time window for analysis in milliseconds',
              },
              includeRecommendations: {
                type: 'boolean',
                description: 'Optional: Include performance recommendations (default: true)',
              },
            },
          },
        },
        {
          name: 'optimize_cache',
          description: 'Optimize cache settings and perform cleanup',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              cleanupExpired: {
                type: 'boolean',
                description: 'Optional: Clean up expired cache entries (default: true)',
              },
              adjustTtl: {
                type: 'boolean',
                description: 'Optional: Automatically adjust TTL based on usage patterns',
              },
              targetHitRate: {
                type: 'number',
                description: 'Optional: Target cache hit rate percentage',
              },
            },
          },
        },
        {
          name: 'profile_performance',
          description: 'Profile system performance and identify bottlenecks',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              testOperations: {
                type: 'array',
                items: {
                  type: 'string',
                },
                description: 'Optional: List of operations to test (default: common operations)',
              },
              iterations: {
                type: 'number',
                description: 'Optional: Number of test iterations per operation (default: 5)',
              },
              includeMemoryProfile: {
                type: 'boolean',
                description: 'Optional: Include memory usage profiling (default: true)',
              },
            },
          },
        },
        {
          name: 'get_realtime_metrics',
          description: 'Monitor real-time performance metrics',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              interval: {
                type: 'number',
                description: 'Optional: Sampling interval in milliseconds (default: 5000)',
              },
              duration: {
                type: 'number',
                description: 'Optional: Monitoring duration in milliseconds (default: 30000)',
              },
            },
          },
        },
        {
          name: 'reset_performance_monitoring',
          description: 'Clear performance data and reset monitoring',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              clearMetrics: {
                type: 'boolean',
                description: 'Optional: Clear performance metrics (default: true)',
              },
              clearCache: {
                type: 'boolean',
                description: 'Optional: Clear all caches (default: true)',
              },
              resetCounters: {
                type: 'boolean',
                description: 'Optional: Reset internal counters (default: true)',
              },
            },
          },
        },
        {
          name: 'run_integration_test_suite',
          description: 'Run comprehensive integration test suite for MCP operations',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              suiteName: {
                type: 'string',
                description: 'Optional: Specific test suite to run (property-manager, dns-management, certificate-management, performance, resilience)',
              },
              category: {
                type: 'string',
                enum: ['property', 'dns', 'certificate', 'performance', 'resilience'],
                description: 'Optional: Filter tests by category',
              },
              priority: {
                type: 'string',
                enum: ['high', 'medium', 'low'],
                description: 'Optional: Filter tests by priority level',
              },
              includeSetup: {
                type: 'boolean',
                description: 'Optional: Include test setup and teardown (default: true)',
              },
              generateReport: {
                type: 'boolean',
                description: 'Optional: Generate detailed test report (default: true)',
              },
            },
          },
        },
        {
          name: 'check_api_health',
          description: 'Check health and performance of Akamai API endpoints',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              endpoints: {
                type: 'array',
                items: { type: 'string' },
                description: 'Optional: Specific endpoints to test (defaults to core endpoints)',
              },
              includeLoadTest: {
                type: 'boolean',
                description: 'Optional: Include basic load testing (default: false)',
              },
            },
          },
        },
        {
          name: 'generate_test_data',
          description: 'Generate test data for integration testing and development',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              dataType: {
                type: 'string',
                enum: ['property', 'zone', 'hostname', 'contact', 'all'],
                description: 'Type of test data to generate',
              },
              count: {
                type: 'number',
                description: 'Optional: Number of items to generate (default: 5)',
              },
              prefix: {
                type: 'string',
                description: 'Optional: Prefix for generated names (default: "test")',
              },
            },
            required: ['dataType'],
          },
        },
        {
          name: 'validate_tool_responses',
          description: 'Validate MCP tool response formats and data structures',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              toolName: {
                type: 'string',
                description: 'Optional: Specific tool to validate',
              },
              category: {
                type: 'string',
                description: 'Optional: Tool category to validate',
              },
              sampleSize: {
                type: 'number',
                description: 'Optional: Number of samples to test (default: 3)',
              },
              includePerformance: {
                type: 'boolean',
                description: 'Optional: Include performance validation (default: false)',
              },
            },
          },
        },
        {
          name: 'run_load_test',
          description: 'Run load and stress testing on MCP operations',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              endpoint: {
                type: 'string',
                description: 'Optional: API endpoint to test (default: /papi/v1/properties)',
              },
              operation: {
                type: 'string',
                description: 'Optional: Specific operation type to test',
              },
              concurrency: {
                type: 'number',
                description: 'Optional: Number of concurrent workers (default: 10)',
              },
              duration: {
                type: 'number',
                description: 'Optional: Test duration in milliseconds (default: 30000)',
              },
              rampUp: {
                type: 'number',
                description: 'Optional: Ramp-up time in milliseconds (default: 5000)',
              },
              includeAnalysis: {
                type: 'boolean',
                description: 'Optional: Include detailed performance analysis (default: true)',
              },
            },
          },
        },
        // Includes Management Tools
        {
          name: 'list_includes',
          description: 'List available includes for modular property management',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              contractId: {
                type: 'string',
                description: 'Contract ID',
              },
              groupId: {
                type: 'string',
                description: 'Group ID',
              },
              includeType: {
                type: 'string',
                enum: ['MICROSERVICES', 'COMMON_SETTINGS', 'ALL'],
                description: 'Optional: Filter by include type',
              },
            },
            required: ['contractId', 'groupId'],
          },
        },
        {
          name: 'get_include',
          description: 'Get detailed information about a specific include',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              includeId: {
                type: 'string',
                description: 'Include ID',
              },
              contractId: {
                type: 'string',
                description: 'Contract ID',
              },
              groupId: {
                type: 'string',
                description: 'Group ID',
              },
              version: {
                type: 'number',
                description: 'Optional: Specific version to retrieve',
              },
            },
            required: ['includeId', 'contractId', 'groupId'],
          },
        },
        {
          name: 'create_include',
          description: 'Create a new include for modular property management',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              includeName: {
                type: 'string',
                description: 'Name for the new include',
              },
              includeType: {
                type: 'string',
                enum: ['MICROSERVICES', 'COMMON_SETTINGS'],
                description: 'Include type',
              },
              contractId: {
                type: 'string',
                description: 'Contract ID for billing',
              },
              groupId: {
                type: 'string',
                description: 'Group ID for organization',
              },
              ruleFormat: {
                type: 'string',
                description: 'Optional: Rule format version',
              },
              cloneFrom: {
                type: 'object',
                properties: {
                  includeId: {
                    type: 'string',
                    description: 'Include ID to clone from',
                  },
                  version: {
                    type: 'number',
                    description: 'Version to clone from',
                  },
                },
                description: 'Optional: Clone from existing include',
              },
            },
            required: ['includeName', 'includeType', 'contractId', 'groupId'],
          },
        },
        {
          name: 'activate_include',
          description: 'Activate an include version to staging or production',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              includeId: {
                type: 'string',
                description: 'Include ID',
              },
              version: {
                type: 'number',
                description: 'Version to activate',
              },
              network: {
                type: 'string',
                enum: ['STAGING', 'PRODUCTION'],
                description: 'Target network',
              },
              contractId: {
                type: 'string',
                description: 'Contract ID',
              },
              groupId: {
                type: 'string',
                description: 'Group ID',
              },
              note: {
                type: 'string',
                description: 'Optional: Activation notes',
              },
              notifyEmails: {
                type: 'array',
                items: { type: 'string' },
                description: 'Optional: Email addresses to notify',
              },
              acknowledgeAllWarnings: {
                type: 'boolean',
                description: 'Optional: Acknowledge all warnings',
              },
            },
            required: ['includeId', 'version', 'network', 'contractId', 'groupId'],
          },
        },
        {
          name: 'get_include_activation_status',
          description: 'Get the status of an include activation',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              includeId: {
                type: 'string',
                description: 'Include ID',
              },
              activationId: {
                type: 'string',
                description: 'Activation ID',
              },
              contractId: {
                type: 'string',
                description: 'Contract ID',
              },
              groupId: {
                type: 'string',
                description: 'Group ID',
              },
            },
            required: ['includeId', 'activationId', 'contractId', 'groupId'],
          },
        },
        // Enhanced Error Handling Tools
        {
          name: 'get_validation_errors',
          description: 'Get detailed validation errors and warnings for a property version',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              propertyId: {
                type: 'string',
                description: 'Property ID',
              },
              version: {
                type: 'number',
                description: 'Version number',
              },
              contractId: {
                type: 'string',
                description: 'Contract ID',
              },
              groupId: {
                type: 'string',
                description: 'Group ID',
              },
              validateRules: {
                type: 'boolean',
                description: 'Optional: Validate rule tree (default: true)',
              },
              validateHostnames: {
                type: 'boolean',
                description: 'Optional: Validate hostnames (default: false)',
              },
            },
            required: ['propertyId', 'version', 'contractId', 'groupId'],
          },
        },
        {
          name: 'acknowledge_warnings',
          description: 'Acknowledge warnings for a property version to allow activation',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              propertyId: {
                type: 'string',
                description: 'Property ID',
              },
              version: {
                type: 'number',
                description: 'Version number',
              },
              warnings: {
                type: 'array',
                items: { type: 'string' },
                description: 'Warning message IDs to acknowledge',
              },
              justification: {
                type: 'string',
                description: 'Optional: Justification for acknowledging warnings',
              },
              contractId: {
                type: 'string',
                description: 'Contract ID',
              },
              groupId: {
                type: 'string',
                description: 'Group ID',
              },
            },
            required: ['propertyId', 'version', 'warnings', 'contractId', 'groupId'],
          },
        },
        {
          name: 'validate_property_configuration',
          description: 'Run comprehensive validation checks on property configuration',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              propertyId: {
                type: 'string',
                description: 'Property ID',
              },
              version: {
                type: 'number',
                description: 'Version number',
              },
              contractId: {
                type: 'string',
                description: 'Contract ID',
              },
              groupId: {
                type: 'string',
                description: 'Group ID',
              },
              includeHostnameValidation: {
                type: 'boolean',
                description: 'Optional: Include hostname validation (default: true)',
              },
              includeRuleValidation: {
                type: 'boolean',
                description: 'Optional: Include rule validation (default: true)',
              },
              includeCertificateValidation: {
                type: 'boolean',
                description: 'Optional: Include certificate validation (default: false)',
              },
            },
            required: ['propertyId', 'version', 'contractId', 'groupId'],
          },
        },
        {
          name: 'get_error_recovery_help',
          description: 'Get context and resolution suggestions for property errors',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              propertyId: {
                type: 'string',
                description: 'Property ID',
              },
              version: {
                type: 'number',
                description: 'Version number',
              },
              errorType: {
                type: 'string',
                description: 'Optional: Specific error type for targeted help',
              },
              contractId: {
                type: 'string',
                description: 'Contract ID',
              },
              groupId: {
                type: 'string',
                description: 'Group ID',
              },
            },
            required: ['propertyId', 'version', 'contractId', 'groupId'],
          },
        },
        {
          name: 'discover_hostnames_intelligent',
          description: 'Perform comprehensive hostname discovery with conflict detection and optimization analysis',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              analysisScope: {
                type: 'string',
                enum: ['all', 'contract', 'group'],
                description: 'Optional: Scope of analysis (default: "all")',
              },
              contractId: {
                type: 'string',
                description: 'Optional: Contract ID for scoped analysis',
              },
              groupId: {
                type: 'string',
                description: 'Optional: Group ID for scoped analysis',
              },
              includeInactive: {
                type: 'boolean',
                description: 'Optional: Include inactive properties (default: false)',
              },
              analyzeWildcards: {
                type: 'boolean',
                description: 'Optional: Analyze wildcard hostname efficiency (default: true)',
              },
              detectConflicts: {
                type: 'boolean',
                description: 'Optional: Detect hostname conflicts (default: true)',
              },
              findOptimizations: {
                type: 'boolean',
                description: 'Optional: Find optimization opportunities (default: true)',
              },
            },
          },
        },
        {
          name: 'analyze_hostname_conflicts',
          description: 'Analyze specific hostnames for conflicts with existing properties',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              targetHostnames: {
                type: 'array',
                items: { type: 'string' },
                description: 'List of hostnames to analyze for conflicts',
              },
              contractId: {
                type: 'string',
                description: 'Optional: Contract ID for scoped analysis',
              },
              groupId: {
                type: 'string',
                description: 'Optional: Group ID for scoped analysis',
              },
              includeWildcardAnalysis: {
                type: 'boolean',
                description: 'Optional: Include wildcard overlap analysis (default: true)',
              },
              includeCertificateAnalysis: {
                type: 'boolean',
                description: 'Optional: Include certificate coverage analysis (default: true)',
              },
            },
            required: ['targetHostnames'],
          },
        },
        {
          name: 'analyze_wildcard_coverage',
          description: 'Analyze wildcard hostname efficiency and coverage across properties',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              contractId: {
                type: 'string',
                description: 'Optional: Contract ID for scoped analysis',
              },
              groupId: {
                type: 'string',
                description: 'Optional: Group ID for scoped analysis',
              },
              includeOptimizationSuggestions: {
                type: 'boolean',
                description: 'Optional: Include optimization suggestions (default: true)',
              },
            },
          },
        },
        {
          name: 'identify_ownership_patterns',
          description: 'Identify property ownership patterns for consolidation opportunities',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              contractId: {
                type: 'string',
                description: 'Optional: Contract ID for scoped analysis',
              },
              groupId: {
                type: 'string',
                description: 'Optional: Group ID for scoped analysis',
              },
              minPropertiesForPattern: {
                type: 'number',
                description: 'Optional: Minimum properties required to identify a pattern (default: 3)',
              },
              includeConsolidationPlan: {
                type: 'boolean',
                description: 'Optional: Include consolidation planning (default: true)',
              },
            },
          },
        },
        // FastPurge tools
        ...fastPurgeTools.map(tool => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema
        }))
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request): Promise<any> => {
      const { name, arguments: args } = request.params;
      
      const client = this.client;

      try {
        switch (name) {
          // Property tools
          case 'list_properties':
            const listPropsArgs = ListPropertiesSchema.parse(args);
            return await listProperties(client, listPropsArgs);

          case 'get_property':
            const getPropArgs = GetPropertySchema.parse(args);
            return await getProperty(client, getPropArgs);

          case 'create_property':
            const createPropArgs = CreatePropertySchema.parse(args);
            return await createProperty(client, createPropArgs);

          case 'list_groups':
            const listGroupsArgs = ListGroupsSchema.parse(args);
            return await listGroups(client, listGroupsArgs);

          case 'list_contracts':
            const listContractsArgs = ListContractsSchema.parse(args);
            return await listContracts(client, listContractsArgs);

          // Product tools
          case 'list_products':
            const listProductsArgs = ListProductsSchema.parse(args);
            return await listProducts(client, listProductsArgs);

          case 'get_product':
            const getProductArgs = GetProductSchema.parse(args);
            return await getProduct(client, getProductArgs);

          case 'list_use_cases':
            const listUseCasesArgs = ListUseCasesSchema.parse(args);
            return await listUseCases(client, listUseCasesArgs);

          // DNS tools
          case 'list_zones':
            const listZonesArgs = ListZonesSchema.parse(args);
            return await listZones(client, listZonesArgs);

          case 'get_zone':
            const getZoneArgs = GetZoneSchema.parse(args);
            return await getZone(client, getZoneArgs);

          case 'create_zone':
            const createZoneArgs = CreateZoneSchema.parse(args);
            return await createZone(client, createZoneArgs);

          case 'list_records':
            const listRecordsArgs = ListRecordsSchema.parse(args);
            return await listRecords(client, listRecordsArgs);

          case 'upsert_record':
            const upsertRecordArgs = UpsertRecordSchema.parse(args);
            return await upsertRecord(client, upsertRecordArgs);

          case 'delete_record':
            const deleteRecordArgs = DeleteRecordSchema.parse(args);
            return await deleteRecord(client, deleteRecordArgs);
            
          case 'activate_zone_changes':
            const activateZoneArgs = z.object({
              zone: z.string().describe('The zone name (e.g., example.com)'),
              comment: z.string().optional().describe('Optional: Comment for the activation'),
              validateOnly: z.boolean().optional().describe('Optional: Only validate changes without activating'),
              waitForCompletion: z.boolean().optional().describe('Optional: Wait for activation to complete'),
              timeout: z.number().optional().describe('Optional: Timeout in milliseconds (default: 300000)')
            }).parse(args);
            return await activateZoneChanges(client, activateZoneArgs);

          // Property Manager tools
          case 'create_property_version':
            const createVersionArgs = CreatePropertyVersionSchema.parse(args);
            return await createPropertyVersion(client, createVersionArgs);

          case 'get_property_rules':
            const getRulesArgs = GetPropertyRulesSchema.parse(args);
            return await getPropertyRules(client, getRulesArgs);

          case 'update_property_rules':
            const updateRulesArgs = UpdatePropertyRulesSchema.parse(args);
            return await updatePropertyRules(client, {
              propertyId: updateRulesArgs.propertyId,
              version: updateRulesArgs.version,
              rules: updateRulesArgs.rules,
              note: updateRulesArgs.note,
            });

          case 'create_edge_hostname':
            const createEdgeArgs = CreateEdgeHostnameSchema.parse(args);
            return await createEdgeHostname(client, createEdgeArgs);

          case 'add_property_hostname':
            const addHostnameArgs = AddPropertyHostnameSchema.parse(args);
            return await addPropertyHostname(client, addHostnameArgs);

          case 'remove_property_hostname':
            const removeHostnameArgs = RemovePropertyHostnameSchema.parse(args);
            return await removePropertyHostname(client, removeHostnameArgs);

          case 'activate_property':
            const activateArgs = ActivatePropertySchema.parse(args);
            return await activateProperty(client, activateArgs);

          case 'get_activation_status':
            const getActivationStatusArgs = GetActivationStatusSchema.parse(args);
            return await getActivationStatus(client, getActivationStatusArgs);

          case 'list_property_activations':
            const listActivationsArgs = ListPropertyActivationsSchema.parse(args);
            return await listPropertyActivations(client, listActivationsArgs);

          // Advanced Property Activation tools
          case 'validate_property_activation':
            const validateActivationArgs = ValidatePropertyActivationSchema.parse(args);
            return await validatePropertyActivation(client, validateActivationArgs);

          case 'activate_property_with_monitoring':
            const activateMonitoringArgs = ActivatePropertyWithMonitoringSchema.parse(args);
            return await activatePropertyWithMonitoring(client, activateMonitoringArgs);

          case 'get_activation_progress':
            const getProgressArgs = GetActivationProgressSchema.parse(args);
            return await getActivationProgress(client, getProgressArgs);

          case 'cancel_property_activation':
            const cancelActivationArgs = CancelPropertyActivationAdvancedSchema.parse(args);
            return await cancelPropertyActivationAdvanced(client, cancelActivationArgs);

          case 'create_activation_plan':
            const createPlanArgs = CreateActivationPlanSchema.parse(args);
            return await createActivationPlan(client, createPlanArgs);

          // Property Version Management tools
          case 'compare_property_versions':
            const compareVersionsArgs = ComparePropertyVersionsSchema.parse(args);
            return await comparePropertyVersions(client, compareVersionsArgs);

          case 'batch_create_versions':
            const batchCreateArgs = BatchCreateVersionsSchema.parse(args);
            return await batchCreateVersions(client, batchCreateArgs);

          case 'get_version_timeline':
            const timelineArgs = GetVersionTimelineSchema.parse(args);
            return await getVersionTimeline(client, timelineArgs);

          case 'rollback_property_version':
            const rollbackArgs = RollbackPropertyVersionSchema.parse(args);
            return await rollbackPropertyVersion(client, rollbackArgs);

          case 'update_version_metadata':
            const updateMetadataArgs = UpdateVersionMetadataSchema.parse(args);
            return await updateVersionMetadata(client, updateMetadataArgs);

          case 'merge_property_versions':
            const mergeVersionsArgs = MergePropertyVersionsSchema.parse(args);
            return await mergePropertyVersions(client, mergeVersionsArgs);

          // Certificate Hostname Update tools
          case 'update_property_with_default_dv':
            const updateDefaultDVArgs = UpdatePropertyWithDefaultDVSchema.parse(args);
            return await updatePropertyWithDefaultDV(client, updateDefaultDVArgs);

          case 'update_property_with_cps_certificate':
            const updateCPSCertArgs = UpdatePropertyWithCPSCertificateSchema.parse(args);
            return await updatePropertyWithCPSCertificate(client, updateCPSCertArgs);

          // CPS tools
          case 'create_dv_enrollment':
            const createDVArgs = CreateDVEnrollmentSchema.parse(args);
            return await createDVEnrollment(client, createDVArgs);

          case 'get_dv_validation_challenges':
            const getChallengesArgs = GetDVValidationChallengesSchema.parse(args);
            return await getDVValidationChallenges(client, getChallengesArgs);

          case 'check_dv_enrollment_status':
            const checkStatusArgs = CheckDVEnrollmentStatusSchema.parse(args);
            return await checkDVEnrollmentStatus(client, checkStatusArgs);

          case 'list_certificate_enrollments':
            const listCertsArgs = ListCertificateEnrollmentsSchema.parse(args);
            return await listCertificateEnrollments(client, listCertsArgs);

          case 'link_certificate_to_property':
            const linkCertArgs = LinkCertificateToPropertySchema.parse(args);
            return await linkCertificateToProperty(client, linkCertArgs);

          // DNS Migration tools
          case 'import_zone_via_axfr':
            const importAXFRArgs = ImportZoneViaAXFRSchema.parse(args);
            return await importZoneViaAXFR(client, importAXFRArgs);

          case 'parse_zone_file':
            const parseZoneArgs = ParseZoneFileSchema.parse(args);
            return await parseZoneFile(client, parseZoneArgs);

          case 'bulk_import_records':
            const bulkImportArgs = BulkImportRecordsSchema.parse(args);
            return await bulkImportRecords(client, bulkImportArgs);

          case 'convert_zone_to_primary':
            const convertZoneArgs = ConvertZoneToPrimarySchema.parse(args);
            return await convertZoneToPrimary(client, convertZoneArgs);

          case 'generate_migration_instructions':
            const genInstructionsArgs = GenerateMigrationInstructionsSchema.parse(args);
            return await generateMigrationInstructions(client, genInstructionsArgs);

          // Secure Property Onboarding tools
          case 'onboard_secure_property':
            const onboardArgs = OnboardSecurePropertySchema.parse(args);
            return await onboardSecureByDefaultProperty(client, onboardArgs);

          case 'quick_secure_property_setup':
            const quickSetupArgs = QuickSecurePropertySetupSchema.parse(args);
            return await quickSecureByDefaultSetup(client, quickSetupArgs);

          case 'check_secure_property_status':
            const checkStatusSecureArgs = CheckSecurePropertyStatusSchema.parse(args);
            return await checkSecureByDefaultStatus(client, checkStatusSecureArgs);

          // Debug tools
          case 'debug_secure_property_onboarding':
            const debugArgs = OnboardSecurePropertySchema.parse(args);
            return await debugSecurePropertyOnboarding(client, debugArgs);

          case 'test_basic_property_creation':
            const testArgs = z.object({
              customer: z.string().optional(),
              propertyName: z.string(),
              contractId: z.string(),
              groupId: z.string(),
            }).parse(args);
            return await testBasicPropertyCreation(client, testArgs);

          // CP Code tools
          case 'list_cpcodes':
            const listCPCodesArgs = ListCPCodesSchema.parse(args);
            return await listCPCodes(client, listCPCodesArgs);

          case 'get_cpcode':
            const getCPCodeArgs = GetCPCodeSchema.parse(args);
            return await getCPCode(client, getCPCodeArgs);

          case 'create_cpcode':
            const createCPCodeArgs = CreateCPCodeSchema.parse(args);
            return await createCPCode(client, createCPCodeArgs);

          case 'search_cpcodes':
            const searchCPCodesArgs = SearchCPCodesSchema.parse(args);
            return await searchCPCodes(client, searchCPCodesArgs);

          // Edge Hostname tools
          case 'list_edge_hostnames':
            const listEdgeHostnamesArgs = ListEdgeHostnamesSchema.parse(args);
            return await listEdgeHostnames(client, listEdgeHostnamesArgs);

          case 'get_edge_hostname':
            const getEdgeHostnameArgs = GetEdgeHostnameSchema.parse(args);
            return await getEdgeHostname(client, getEdgeHostnameArgs);

          // Property management tools
          case 'clone_property':
            const clonePropertyArgs = ClonePropertySchema.parse(args);
            return await cloneProperty(client, clonePropertyArgs);

          case 'remove_property':
            const removePropertyArgs = RemovePropertySchema.parse(args);
            return await removeProperty(client, removePropertyArgs);

          case 'list_property_versions':
            const listPropertyVersionsArgs = ListPropertyVersionsSchema.parse(args);
            return await listPropertyVersions(client, listPropertyVersionsArgs);

          case 'get_property_version':
            const getPropertyVersionArgs = GetPropertyVersionSchema.parse(args);
            return await getPropertyVersion(client, getPropertyVersionArgs);

          case 'get_latest_property_version':
            const getLatestPropertyVersionArgs = GetLatestPropertyVersionSchema.parse(args);
            return await getLatestPropertyVersion(client, getLatestPropertyVersionArgs);

          case 'cancel_property_activation':
            const cancelPropertyActivationArgs = CancelPropertyActivationSchema.parse(args);
            return await cancelPropertyActivation(client, cancelPropertyActivationArgs);

          case 'search_properties':
            const searchPropertiesArgs = SearchPropertiesSchema.parse(args);
            return await searchProperties(client, searchPropertiesArgs);

          // Hostname tools
          case 'list_all_hostnames':
            const listAllHostnamesArgs = ListAllHostnamesSchema.parse(args);
            return await listAllHostnames(client, listAllHostnamesArgs);

          case 'list_property_version_hostnames':
            const listPropertyVersionHostnamesArgs = ListPropertyVersionHostnamesSchema.parse(args);
            return await listPropertyVersionHostnames(client, listPropertyVersionHostnamesArgs);

          // Rule format tools
          case 'list_available_behaviors':
            const listAvailableBehaviorsArgs = ListAvailableBehaviorsSchema.parse(args);
            return await listAvailableBehaviors(client, listAvailableBehaviorsArgs);

          case 'list_available_criteria':
            const listAvailableCriteriaArgs = ListAvailableCriteriaSchema.parse(args);
            return await listAvailableCriteria(client, listAvailableCriteriaArgs);

          case 'patch_property_rules':
            const patchPropertyRulesArgs = PatchPropertyRulesSchema.parse(args);
            return await patchPropertyRules(client, patchPropertyRulesArgs);

          // Bulk search tools
          case 'bulk_search_properties':
            const bulkSearchPropertiesArgs = BulkSearchPropertiesSchema.parse(args);
            return await bulkSearchProperties(client, bulkSearchPropertiesArgs);

          case 'get_bulk_search_results':
            const getBulkSearchResultsArgs = GetBulkSearchResultsSchema.parse(args);
            return await getBulkSearchResults(client, getBulkSearchResultsArgs);

          // Certificate tools
          case 'generate_domain_validation_challenges':
            const generateDomainValidationChallengesArgs = GenerateDomainValidationChallengesSchema.parse(args);
            return await generateDomainValidationChallenges(client, generateDomainValidationChallengesArgs);

          case 'resume_domain_validation':
            const resumeDomainValidationArgs = ResumeDomainValidationSchema.parse(args);
            return await resumeDomainValidation(client, resumeDomainValidationArgs);

          // Audit tools
          case 'get_property_audit_history':
            const getPropertyAuditHistoryArgs = GetPropertyAuditHistorySchema.parse(args);
            return await getPropertyAuditHistory(client, getPropertyAuditHistoryArgs);

          // Advanced DNS tools
          case 'get_zones_dnssec_status':
            const getZonesDNSSECStatusArgs = GetZonesDNSSECStatusSchema.parse(args);
            return await getZonesDNSSECStatus(client, getZonesDNSSECStatusArgs);

          case 'get_secondary_zone_transfer_status':
            const getSecondaryZoneTransferStatusArgs = GetSecondaryZoneTransferStatusSchema.parse(args);
            return await getSecondaryZoneTransferStatus(client, getSecondaryZoneTransferStatusArgs);

          case 'get_zone_contract':
            const getZoneContractArgs = GetZoneContractSchema.parse(args);
            return await getZoneContract(client, getZoneContractArgs);

          case 'get_record_set':
            const getRecordSetArgs = GetRecordSetSchema.parse(args);
            return await getRecordSet(client, getRecordSetArgs);

          case 'update_tsig_key_for_zones':
            const updateTSIGKeyForZonesArgs = UpdateTSIGKeyForZonesSchema.parse(args);
            return await updateTSIGKeyForZones(client, updateTSIGKeyForZonesArgs);

          case 'submit_bulk_zone_create_request':
            const submitBulkZoneCreateRequestArgs = SubmitBulkZoneCreateRequestSchema.parse(args);
            return await submitBulkZoneCreateRequest(client, submitBulkZoneCreateRequestArgs);

          case 'get_zone_version':
            const getZoneVersionArgs = GetZoneVersionSchema.parse(args);
            return await getZoneVersion(client, getZoneVersionArgs);

          case 'get_version_record_sets':
            const getVersionRecordSetsArgs = GetVersionRecordSetsSchema.parse(args);
            return await getVersionRecordSets(client, getVersionRecordSetsArgs);

          case 'reactivate_zone_version':
            const reactivateZoneVersionArgs = ReactivateZoneVersionSchema.parse(args);
            return await reactivateZoneVersion(client, reactivateZoneVersionArgs);

          case 'get_version_master_zone_file':
            const getVersionMasterZoneFileArgs = GetVersionMasterZoneFileSchema.parse(args);
            return await getVersionMasterZoneFile(client, getVersionMasterZoneFileArgs);

          case 'create_multiple_record_sets':
            const createMultipleRecordSetsArgs = CreateMultipleRecordSetsSchema.parse(args);
            return await createMultipleRecordSets(client, createMultipleRecordSetsArgs);

          // Documentation tools
          case 'generate_documentation_index':
            const generateIndexArgs = z.object({
              docsPath: z.string().optional(),
              outputPath: z.string().optional()
            }).parse(args);
            return await generateDocumentationIndex(client, generateIndexArgs);

          case 'generate_api_reference':
            const generateAPIArgs = z.object({
              toolsPath: z.string().optional(),
              outputPath: z.string().optional(),
              format: z.enum(['markdown', 'json']).optional()
            }).parse(args);
            return await generateAPIReference(client, generateAPIArgs);

          case 'generate_feature_documentation':
            const generateFeatureArgs = z.object({
              feature: z.string(),
              analysisDepth: z.enum(['basic', 'detailed', 'comprehensive']).optional(),
              includeExamples: z.boolean().optional(),
              outputPath: z.string().optional()
            }).parse(args);
            return await generateFeatureDocumentation(client, generateFeatureArgs);

          case 'update_documentation':
            const updateDocArgs = z.object({
              document: z.string(),
              updates: z.object({
                sections: z.record(z.string()).optional(),
                examples: z.array(z.object({
                  title: z.string(),
                  code: z.string(),
                  description: z.string().optional()
                })).optional(),
                metadata: z.record(z.any()).optional()
              }),
              createBackup: z.boolean().optional()
            }).parse(args);
            return await updateDocumentation(client, updateDocArgs);

          case 'generate_changelog':
            const generateChangelogArgs = z.object({
              fromVersion: z.string().optional(),
              toVersion: z.string().optional(),
              outputPath: z.string().optional(),
              includeBreakingChanges: z.boolean().optional(),
              groupByCategory: z.boolean().optional()
            }).parse(args);
            return await generateChangelog(client, generateChangelogArgs);

          case 'create_knowledge_article':
            const createArticleArgs = z.object({
              title: z.string(),
              category: z.string(),
              content: z.string(),
              tags: z.array(z.string()).optional(),
              relatedArticles: z.array(z.string()).optional(),
              outputPath: z.string().optional()
            }).parse(args);
            return await createKnowledgeArticle(client, createArticleArgs);

          // Advanced Rule Tree Management
          case 'validate_rule_tree':
            const validateRuleTreeArgs = z.object({
              propertyId: z.string(),
              version: z.number().optional(),
              rules: z.any().optional(),
              includeOptimizations: z.boolean().optional(),
              includeStatistics: z.boolean().optional()
            }).parse(args);
            return await validateRuleTree(client, validateRuleTreeArgs);

          case 'create_rule_tree_from_template':
            const createRuleTreeArgs = z.object({
              templateId: z.string(),
              variables: z.record(z.any()).optional(),
              propertyId: z.string().optional(),
              version: z.number().optional(),
              validate: z.boolean().optional()
            }).parse(args);
            return await createRuleTreeFromTemplate(client, createRuleTreeArgs);

          case 'analyze_rule_tree_performance':
            const analyzeRuleTreeArgs = z.object({
              propertyId: z.string(),
              version: z.number().optional(),
              rules: z.any().optional(),
              includeRecommendations: z.boolean().optional()
            }).parse(args);
            return await analyzeRuleTreePerformance(client, analyzeRuleTreeArgs);

          case 'detect_rule_conflicts':
            const detectConflictsArgs = z.object({
              propertyId: z.string(),
              version: z.number().optional(),
              rules: z.any().optional()
            }).parse(args);
            return await detectRuleConflicts(client, detectConflictsArgs);

          case 'list_rule_templates':
            const listTemplatesArgs = z.object({
              category: z.string().optional(),
              tags: z.array(z.string()).optional()
            }).parse(args);
            return await listRuleTemplates(client, listTemplatesArgs);

          // Advanced Hostname Management
          case 'analyze_hostname_ownership':
            const analyzeHostnameArgs = z.object({
              hostnames: z.array(z.string()),
              includeWildcardAnalysis: z.boolean().optional(),
              includeRecommendations: z.boolean().optional()
            }).parse(args);
            return await analyzeHostnameOwnership(client, analyzeHostnameArgs);

          case 'generate_edge_hostname_recommendations':
            const generateEdgeHostnameArgs = z.object({
              hostnames: z.array(z.string()),
              preferredSuffix: z.enum(['.edgekey.net', '.edgesuite.net', '.akamaized.net']).optional(),
              forceSecure: z.boolean().optional()
            }).parse(args);
            return await generateEdgeHostnameRecommendations(client, generateEdgeHostnameArgs);

          case 'validate_hostnames_bulk':
            const validateHostnamesArgs = z.object({
              hostnames: z.array(z.string()),
              checkDNS: z.boolean().optional(),
              checkCertificates: z.boolean().optional()
            }).parse(args);
            return await validateHostnamesBulk(client, validateHostnamesArgs);

          case 'find_optimal_property_assignment':
            const findOptimalArgs = z.object({
              hostnames: z.array(z.string()),
              groupingStrategy: z.enum(['by-domain', 'by-function', 'by-environment', 'auto']).optional(),
              maxHostnamesPerProperty: z.number().optional()
            }).parse(args);
            return await findOptimalPropertyAssignment(client, findOptimalArgs);

          case 'create_hostname_provisioning_plan':
            const createProvisioningPlanArgs = z.object({
              hostnames: z.array(z.string()),
              contractId: z.string(),
              groupId: z.string(),
              productId: z.string().optional(),
              securityLevel: z.enum(['standard', 'enhanced', 'advanced']).optional()
            }).parse(args);
            return await createHostnameProvisioningPlan(client, createProvisioningPlanArgs);

          // Advanced Property Operations
          case 'search_properties_advanced':
            const searchPropertiesAdvancedArgs = z.object({
              criteria: z.object({
                name: z.string().optional(),
                hostname: z.string().optional(),
                edgeHostname: z.string().optional(),
                contractId: z.string().optional(),
                groupId: z.string().optional(),
                productId: z.string().optional(),
                activationStatus: z.enum(['production', 'staging', 'both', 'none']).optional(),
                lastModifiedAfter: z.date().optional(),
                lastModifiedBefore: z.date().optional(),
                hasWarnings: z.boolean().optional(),
                hasErrors: z.boolean().optional(),
                certificateStatus: z.enum(['valid', 'expiring', 'expired']).optional(),
                ruleFormat: z.string().optional()
              }),
              limit: z.number().optional(),
              sortBy: z.enum(['relevance', 'name', 'lastModified', 'size']).optional(),
              includeDetails: z.boolean().optional()
            }).parse(args);
            return await searchPropertiesAdvanced(client, searchPropertiesAdvancedArgs);

          case 'compare_properties':
            const comparePropertiesArgs = z.object({
              propertyIdA: z.string(),
              propertyIdB: z.string(),
              versionA: z.number().optional(),
              versionB: z.number().optional(),
              compareRules: z.boolean().optional(),
              compareHostnames: z.boolean().optional(),
              compareBehaviors: z.boolean().optional()
            }).parse(args);
            return await compareProperties(client, comparePropertiesArgs);

          case 'check_property_health':
            const checkHealthArgs = z.object({
              propertyId: z.string(),
              version: z.number().optional(),
              includePerformance: z.boolean().optional(),
              includeSecurity: z.boolean().optional()
            }).parse(args);
            return await checkPropertyHealth(client, checkHealthArgs);

          case 'detect_configuration_drift':
            const detectDriftArgs = z.object({
              propertyId: z.string(),
              baselineVersion: z.number(),
              compareVersion: z.number().optional(),
              checkBehaviors: z.boolean().optional(),
              checkHostnames: z.boolean().optional(),
              checkSettings: z.boolean().optional()
            }).parse(args);
            return await detectConfigurationDrift(client, detectDriftArgs);

          case 'bulk_update_properties':
            const bulkUpdateArgs = z.object({
              propertyIds: z.array(z.string()),
              updates: z.object({
                addBehavior: z.object({
                  name: z.string(),
                  options: z.any().optional(),
                  criteria: z.array(z.any()).optional()
                }).optional(),
                updateBehavior: z.object({
                  name: z.string(),
                  options: z.any().optional()
                }).optional(),
                addHostname: z.object({
                  hostname: z.string(),
                  edgeHostname: z.string()
                }).optional(),
                removeHostname: z.string().optional()
              }),
              createNewVersion: z.boolean().optional(),
              note: z.string().optional()
            }).parse(args);
            return await bulkUpdateProperties(client, bulkUpdateArgs);

          // Bulk Operations Manager
          case 'bulk_clone_properties':
            const bulkCloneArgs = z.object({
              sourcePropertyId: z.string(),
              targetNames: z.array(z.string()),
              contractId: z.string(),
              groupId: z.string(),
              productId: z.string().optional(),
              ruleFormat: z.string().optional(),
              cloneHostnames: z.boolean().optional(),
              activateImmediately: z.boolean().optional(),
              network: z.enum(['STAGING', 'PRODUCTION']).optional()
            }).parse(args);
            return await bulkCloneProperties(client, bulkCloneArgs);

          case 'bulk_activate_properties':
            const bulkActivateArgs = z.object({
              propertyIds: z.array(z.string()),
              network: z.enum(['STAGING', 'PRODUCTION']),
              note: z.string().optional(),
              notifyEmails: z.array(z.string()).optional(),
              acknowledgeAllWarnings: z.boolean().optional(),
              waitForCompletion: z.boolean().optional(),
              maxWaitTime: z.number().optional()
            }).parse(args);
            return await bulkActivateProperties(client, bulkActivateArgs);

          case 'bulk_update_property_rules':
            const bulkRulesArgs = z.object({
              propertyIds: z.array(z.string()),
              rulePatches: z.array(z.object({
                op: z.enum(['add', 'remove', 'replace', 'copy', 'move']),
                path: z.string(),
                value: z.any().optional(),
                from: z.string().optional()
              })),
              createNewVersion: z.boolean().optional(),
              validateChanges: z.boolean().optional(),
              note: z.string().optional()
            }).parse(args);
            return await bulkUpdatePropertyRules(client, bulkRulesArgs);

          case 'bulk_manage_hostnames':
            const bulkHostnamesArgs = z.object({
              operations: z.array(z.object({
                propertyId: z.string(),
                action: z.enum(['add', 'remove']),
                hostnames: z.array(z.object({
                  hostname: z.string(),
                  edgeHostname: z.string().optional()
                }))
              })),
              createNewVersion: z.boolean().optional(),
              validateDNS: z.boolean().optional(),
              note: z.string().optional()
            }).parse(args);
            return await bulkManageHostnames(client, bulkHostnamesArgs);

          case 'get_bulk_operation_status':
            const getBulkStatusArgs = z.object({
              operationId: z.string(),
              detailed: z.boolean().optional()
            }).parse(args);
            return await getBulkOperationStatus(client, getBulkStatusArgs);

          // Resilience tools
          case 'get_system_health':
            const systemHealthArgs = GetSystemHealthSchema.parse(args);
            return await getSystemHealth(client, {
              includeMetrics: systemHealthArgs.includeMetrics,
              operationType: systemHealthArgs.operationType as any
            });

          case 'reset_circuit_breaker':
            const resetCircuitArgs = ResetCircuitBreakerSchema.parse(args);
            return await resetCircuitBreaker(client, {
              operationType: resetCircuitArgs.operationType as any,
              force: resetCircuitArgs.force
            });

          case 'get_operation_metrics':
            const operationMetricsArgs = GetOperationMetricsSchema.parse(args);
            return await getOperationMetrics(client, {
              operationType: operationMetricsArgs.operationType as any,
              includeTrends: operationMetricsArgs.includeTrends
            });

          case 'test_operation_resilience':
            const resilienceTestArgs = TestOperationResilienceSchema.parse(args);
            return await testOperationResilience(client, {
              operationType: resilienceTestArgs.operationType as any,
              testType: resilienceTestArgs.testType,
              iterations: resilienceTestArgs.iterations
            });

          case 'get_error_recovery_suggestions':
            const errorRecoveryArgs = GetErrorRecoverySuggestionsSchema.parse(args);
            return await getErrorRecoverySuggestions(client, {
              errorType: errorRecoveryArgs.errorType,
              operationType: errorRecoveryArgs.operationType as any,
              includePreventiveMeasures: errorRecoveryArgs.includePreventiveMeasures
            });

          // Performance tools
          case 'get_performance_analysis':
            const performanceAnalysisArgs = GetPerformanceAnalysisSchema.parse(args);
            return await getPerformanceAnalysis(client, performanceAnalysisArgs);

          case 'optimize_cache':
            const optimizeCacheArgs = OptimizeCacheSchema.parse(args);
            return await optimizeCache(client, optimizeCacheArgs);

          case 'profile_performance':
            const profilePerformanceArgs = ProfilePerformanceSchema.parse(args);
            return await profilePerformance(client, profilePerformanceArgs);

          case 'get_realtime_metrics':
            const realtimeMetricsArgs = GetRealtimeMetricsSchema.parse(args);
            return await getRealtimeMetrics(client, realtimeMetricsArgs);

          case 'reset_performance_monitoring':
            const resetPerformanceArgs = ResetPerformanceMonitoringSchema.parse(args);
            return await resetPerformanceMonitoring(client, resetPerformanceArgs);

          // Integration Testing Tools
          case 'run_integration_test_suite':
            const runTestSuiteArgs = RunIntegrationTestSuiteSchema.parse(args);
            return await runIntegrationTestSuite(client, runTestSuiteArgs);

          case 'check_api_health':
            const checkAPIHealthArgs = CheckAPIHealthSchema.parse(args);
            return await checkAPIHealth(client, checkAPIHealthArgs);

          case 'generate_test_data':
            const generateDataArgs = GenerateTestDataSchema.parse(args);
            return await generateTestData(client, generateDataArgs);

          case 'validate_tool_responses':
            const validateResponsesArgs = ValidateToolResponsesSchema.parse(args);
            return await validateToolResponses(client, validateResponsesArgs);

          case 'run_load_test':
            const runLoadTestArgs = RunLoadTestSchema.parse(args);
            return await runLoadTest(client, runLoadTestArgs);

          // Includes Management Tools
          case 'list_includes':
            const listIncludesArgs = z.object({
              customer: z.string().optional(),
              contractId: z.string(),
              groupId: z.string(),
              includeType: z.enum(['MICROSERVICES', 'COMMON_SETTINGS', 'ALL']).optional()
            }).parse(args);
            return await listIncludes(client, listIncludesArgs);

          case 'get_include':
            const getIncludeArgs = z.object({
              customer: z.string().optional(),
              includeId: z.string(),
              contractId: z.string(),
              groupId: z.string(),
              version: z.number().optional()
            }).parse(args);
            return await getInclude(client, getIncludeArgs);

          case 'create_include':
            const createIncludeArgs = z.object({
              customer: z.string().optional(),
              includeName: z.string(),
              includeType: z.enum(['MICROSERVICES', 'COMMON_SETTINGS']),
              contractId: z.string(),
              groupId: z.string(),
              ruleFormat: z.string().optional(),
              cloneFrom: z.object({
                includeId: z.string(),
                version: z.number()
              }).optional()
            }).parse(args);
            return await createInclude(client, createIncludeArgs);

          case 'activate_include':
            const activateIncludeArgs = z.object({
              customer: z.string().optional(),
              includeId: z.string(),
              version: z.number(),
              network: z.enum(['STAGING', 'PRODUCTION']),
              contractId: z.string(),
              groupId: z.string(),
              note: z.string().optional(),
              notifyEmails: z.array(z.string()).optional(),
              acknowledgeAllWarnings: z.boolean().optional()
            }).parse(args);
            return await activateInclude(client, activateIncludeArgs);

          case 'get_include_activation_status':
            const getIncludeActivationArgs = z.object({
              customer: z.string().optional(),
              includeId: z.string(),
              activationId: z.string(),
              contractId: z.string(),
              groupId: z.string()
            }).parse(args);
            return await getIncludeActivationStatus(client, getIncludeActivationArgs);

          // Enhanced Error Handling Tools
          case 'get_validation_errors':
            const getValidationErrorsArgs = z.object({
              customer: z.string().optional(),
              propertyId: z.string(),
              version: z.number(),
              contractId: z.string(),
              groupId: z.string(),
              validateRules: z.boolean().optional(),
              validateHostnames: z.boolean().optional()
            }).parse(args);
            return await getValidationErrors(client, getValidationErrorsArgs);

          case 'acknowledge_warnings':
            const acknowledgeWarningsArgs = z.object({
              customer: z.string().optional(),
              propertyId: z.string(),
              version: z.number(),
              warnings: z.array(z.string()),
              justification: z.string().optional(),
              contractId: z.string(),
              groupId: z.string()
            }).parse(args);
            return await acknowledgeWarnings(client, acknowledgeWarningsArgs);

          case 'validate_property_configuration':
            const validateConfigArgs = z.object({
              customer: z.string().optional(),
              propertyId: z.string(),
              version: z.number(),
              contractId: z.string(),
              groupId: z.string(),
              includeHostnameValidation: z.boolean().optional(),
              includeRuleValidation: z.boolean().optional(),
              includeCertificateValidation: z.boolean().optional()
            }).parse(args);
            return await validatePropertyConfiguration(client, validateConfigArgs);

          case 'get_error_recovery_help':
            const getErrorHelpArgs = z.object({
              customer: z.string().optional(),
              propertyId: z.string(),
              version: z.number(),
              errorType: z.string().optional(),
              contractId: z.string(),
              groupId: z.string()
            }).parse(args);
            return await getErrorRecoveryHelp(client, getErrorHelpArgs);

          case 'update_include':
            const updateIncludeArgs = UpdateIncludeSchema.parse(args);
            return await updateInclude(client, updateIncludeArgs as {
              includeId: string;
              contractId: string;
              groupId: string;
              rules: any;
              version?: number;
              note?: string;
              customer?: string;
            });

          case 'create_include_version':
            const createIncludeVersionArgs = CreateIncludeVersionSchema.parse(args);
            return await createIncludeVersion(client, createIncludeVersionArgs);

          case 'list_include_activations':
            const listIncludeActivationsArgs = ListIncludeActivationsSchema.parse(args);
            return await listIncludeActivations(client, listIncludeActivationsArgs);

          case 'override_errors':
            const overrideErrorsArgs = OverrideErrorsSchema.parse(args);
            return await overrideErrors(client, overrideErrorsArgs);

          case 'discover_hostnames_intelligent':
            const discoverHostnamesArgs = DiscoverHostnamesIntelligentSchema.parse(args);
            return await discoverHostnamesIntelligent(client, discoverHostnamesArgs);

          case 'analyze_hostname_conflicts':
            const analyzeConflictsArgs = AnalyzeHostnameConflictsSchema.parse(args);
            return await analyzeHostnameConflicts(client, analyzeConflictsArgs);

          case 'analyze_wildcard_coverage':
            const analyzeWildcardsArgs = AnalyzeWildcardCoverageSchema.parse(args);
            return await analyzeWildcardCoverage(client, analyzeWildcardsArgs);

          case 'identify_ownership_patterns':
            const identifyPatternsArgs = IdentifyOwnershipPatternsSchema.parse(args);
            return await identifyOwnershipPatterns(client, identifyPatternsArgs);

          // FastPurge tools
          case 'fastpurge.url.invalidate':
          case 'fastpurge.cpcode.invalidate':
          case 'fastpurge.tag.invalidate':
          case 'fastpurge.status.check':
          case 'fastpurge.queue.status':
          case 'fastpurge.estimate':
            const tool = fastPurgeTools.find(t => t.name === name);
            if (tool) {
              return await tool.handler(args);
            }
            break;

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new McpError(
            ErrorCode.InvalidParams,
            `Invalid parameters: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`
          );
        }
        throw error;
      }
    });
  }

  async run() {
    console.error('🚀 ALECS - MCP Server for Akamai starting...');
    console.error('📍 Looking for credentials in ~/.edgerc');
    
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    console.error('✅ Server ready, waiting for connections...');
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.error('\n🛑 Shutting down...');
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      console.error('\n🛑 Shutting down...');
      process.exit(0);
    });
  }
}

// Start the server
const server = new AkamaiMCPServer();
server.run().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});