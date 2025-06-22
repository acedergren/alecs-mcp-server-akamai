/**
 * Extended Tool Schemas for ALECS Full Server
 * These schemas supplement the base tool-schemas.ts file
 */

import { z } from 'zod';

// Base schema that all tools extend
const BaseToolSchema = z.object({
  customer: z.string().optional().describe('Customer section name from .edgerc'),
});

// Enhanced Property Management Schemas
export const CreatePropertyVersionEnhancedSchema = BaseToolSchema.extend({
  propertyId: z.string().describe('Property ID'),
  createFromVersion: z.number().optional().describe('Base version to create from'),
  createFromEtag: z.string().optional().describe('Base version etag'),
  copyHostnames: z.boolean().optional().describe('Copy hostnames from base version'),
});

export const ListPropertyVersionsEnhancedSchema = BaseToolSchema.extend({
  propertyId: z.string().describe('Property ID'),
  contractId: z.string().optional().describe('Contract ID'),
  groupId: z.string().optional().describe('Group ID'),
  includeRules: z.boolean().optional().describe('Include rules in response'),
});

export const GetLatestPropertyVersionSchema = BaseToolSchema.extend({
  propertyId: z.string().describe('Property ID'),
  contractId: z.string().optional().describe('Contract ID'),
  groupId: z.string().optional().describe('Group ID'),
});

export const RollbackPropertyVersionSchema = BaseToolSchema.extend({
  propertyId: z.string().describe('Property ID'),
  targetVersion: z.number().describe('Version to rollback to'),
});

export const GetVersionDiffSchema = BaseToolSchema.extend({
  propertyId: z.string().describe('Property ID'),
  version1: z.number().describe('First version to compare'),
  version2: z.number().describe('Second version to compare'),
});

export const BatchVersionOperationsSchema = BaseToolSchema.extend({
  operations: z.array(z.object({
    propertyId: z.string(),
    action: z.enum(['create', 'activate', 'rollback']),
    params: z.any(),
  })),
});

export const SearchPropertiesAdvancedSchema = BaseToolSchema.extend({
  searchTerm: z.string().optional(),
  filters: z.object({
    contractId: z.string().optional(),
    groupId: z.string().optional(),
    productId: z.string().optional(),
    status: z.enum(['active', 'inactive', 'pending']).optional(),
  }).optional(),
});

export const CancelPropertyActivationSchema = BaseToolSchema.extend({
  propertyId: z.string().describe('Property ID'),
  activationId: z.string().describe('Activation ID to cancel'),
});

export const ComparePropertiesSchema = BaseToolSchema.extend({
  propertyId1: z.string().describe('First property ID'),
  propertyId2: z.string().describe('Second property ID'),
  compareRules: z.boolean().optional().default(true),
});

export const DetectConfigurationDriftSchema = BaseToolSchema.extend({
  propertyId: z.string().describe('Property ID'),
  baselineVersion: z.number().optional(),
});

export const CheckPropertyHealthSchema = BaseToolSchema.extend({
  propertyId: z.string().describe('Property ID'),
  checks: z.array(z.enum(['ssl', 'origins', 'cache', 'security'])).optional(),
});

// DNS Advanced Schemas
export const CreateMultipleRecordSetsSchema = BaseToolSchema.extend({
  zone: z.string(),
  recordSets: z.array(z.object({
    name: z.string(),
    type: z.string(),
    ttl: z.number(),
    rdata: z.array(z.string()),
  })),
});

export const GetRecordSetSchema = BaseToolSchema.extend({
  zone: z.string(),
  name: z.string(),
  type: z.string(),
});

export const SubmitBulkZoneCreateRequestSchema = BaseToolSchema.extend({
  zones: z.array(z.object({
    zone: z.string(),
    type: z.enum(['PRIMARY', 'SECONDARY']),
    masters: z.array(z.string()).optional(),
  })),
});

export const GetZonesDNSSECStatusSchema = BaseToolSchema.extend({
  zones: z.array(z.string()),
});

export const UpdateTSIGKeyForZonesSchema = BaseToolSchema.extend({
  zones: z.array(z.string()),
  tsigKey: z.object({
    name: z.string(),
    algorithm: z.string(),
    secret: z.string(),
  }),
});

export const GetZoneVersionSchema = BaseToolSchema.extend({
  zone: z.string(),
  version: z.string(),
});

export const GetVersionRecordSetsSchema = BaseToolSchema.extend({
  zone: z.string(),
  version: z.string(),
});

export const GetVersionMasterZoneFileSchema = BaseToolSchema.extend({
  zone: z.string(),
  version: z.string(),
});

export const ReactivateZoneVersionSchema = BaseToolSchema.extend({
  zone: z.string(),
  version: z.string(),
});

export const GetSecondaryZoneTransferStatusSchema = BaseToolSchema.extend({
  zone: z.string(),
});

export const GetZoneContractSchema = BaseToolSchema.extend({
  zone: z.string(),
});

// DNS Migration Schemas
export const ImportZoneViaAXFRSchema = BaseToolSchema.extend({
  zone: z.string(),
  masterServer: z.string(),
  tsigKey: z.object({
    name: z.string(),
    algorithm: z.string(),
    secret: z.string(),
  }).optional(),
});

export const ConvertZoneToPrimarySchema = BaseToolSchema.extend({
  zone: z.string(),
});

export const GenerateMigrationInstructionsSchema = BaseToolSchema.extend({
  sourceProvider: z.enum(['cloudflare', 'route53', 'godaddy', 'other']),
  zones: z.array(z.string()),
});

// Certificate Enrollment Schemas
export const EnrollCertificateWithValidationSchema = BaseToolSchema.extend({
  domains: z.array(z.string()),
  type: z.enum(['DV', 'EV', 'OV']).optional(),
  validationMethod: z.enum(['dns', 'http']).optional(),
});

export const MonitorCertificateEnrollmentSchema = BaseToolSchema.extend({
  enrollmentId: z.string(),
  waitForCompletion: z.boolean().optional(),
});

export const GetCertificateDeploymentStatusSchema = BaseToolSchema.extend({
  enrollmentId: z.string(),
});

export const GetCertificateValidationHistorySchema = BaseToolSchema.extend({
  enrollmentId: z.string(),
});

export const ValidateCertificateEnrollmentSchema = BaseToolSchema.extend({
  enrollmentId: z.string(),
});

export const DeployCertificateToNetworkSchema = BaseToolSchema.extend({
  enrollmentId: z.string(),
  network: z.enum(['staging', 'production']),
});

export const RenewCertificateSchema = BaseToolSchema.extend({
  enrollmentId: z.string(),
  autoRenew: z.boolean().optional(),
});

export const CleanupValidationRecordsSchema = BaseToolSchema.extend({
  enrollmentId: z.string(),
  zone: z.string().optional(),
});

export const UpdatePropertyWithDefaultDVSchema = BaseToolSchema.extend({
  propertyId: z.string(),
  hostname: z.string(),
});

export const UpdatePropertyWithCPSCertificateSchema = BaseToolSchema.extend({
  propertyId: z.string(),
  enrollmentId: z.string(),
});

export const LinkCertificateToPropertySchema = BaseToolSchema.extend({
  enrollmentId: z.string(),
  propertyId: z.string(),
});

// Edge Hostname Schemas
export const CreateEdgeHostnameEnhancedSchema = BaseToolSchema.extend({
  domainPrefix: z.string(),
  domainSuffix: z.string(),
  productId: z.string(),
  secureNetwork: z.enum(['STANDARD_TLS', 'ENHANCED_TLS', 'SHARED_CERT']).optional(),
  ipVersionBehavior: z.enum(['IPV4', 'IPV6', 'IPV4_IPV6']).optional(),
});

export const CreateBulkEdgeHostnamesSchema = BaseToolSchema.extend({
  edgeHostnames: z.array(z.object({
    domainPrefix: z.string(),
    domainSuffix: z.string(),
    productId: z.string(),
  })),
});

export const GetEdgeHostnameDetailsSchema = BaseToolSchema.extend({
  edgeHostnameId: z.string(),
});

export const AssociateCertificateWithEdgeHostnameSchema = BaseToolSchema.extend({
  edgeHostnameId: z.string(),
  certificateId: z.string(),
});

export const ValidateEdgeHostnameCertificateSchema = BaseToolSchema.extend({
  edgeHostnameId: z.string(),
});

export const GenerateEdgeHostnameRecommendationsSchema = BaseToolSchema.extend({
  propertyId: z.string(),
  hostnames: z.array(z.string()),
});

// Hostname Management Schemas
export const ListAllHostnamesSchema = BaseToolSchema.extend({
  contractId: z.string().optional(),
  groupId: z.string().optional(),
});

export const DiscoverHostnamesIntelligentSchema = BaseToolSchema.extend({
  domain: z.string(),
  depth: z.number().optional(),
});

export const AnalyzeHostnameConflictsSchema = BaseToolSchema.extend({
  hostnames: z.array(z.string()),
});

export const AnalyzeWildcardCoverageSchema = BaseToolSchema.extend({
  hostnames: z.array(z.string()),
});

export const IdentifyOwnershipPatternsSchema = BaseToolSchema.extend({
  contractId: z.string().optional(),
});

export const CreateHostnameProvisioningPlanSchema = BaseToolSchema.extend({
  hostnames: z.array(z.string()),
  propertyId: z.string().optional(),
});

export const FindOptimalPropertyAssignmentSchema = BaseToolSchema.extend({
  hostname: z.string(),
});

export const AnalyzeHostnameOwnershipSchema = BaseToolSchema.extend({
  hostname: z.string(),
});

export const ValidateHostnamesBulkSchema = BaseToolSchema.extend({
  hostnames: z.array(z.string()),
});

export const BulkManageHostnamesSchema = BaseToolSchema.extend({
  operations: z.array(z.object({
    hostname: z.string(),
    action: z.enum(['add', 'remove', 'move']),
    propertyId: z.string(),
  })),
});

// Rule Tree Management Schemas
export const CreateRuleFromTemplateSchema = BaseToolSchema.extend({
  templateName: z.string(),
  parameters: z.record(z.any()).optional(),
});

export const UpdatePropertyRulesEnhancedSchema = BaseToolSchema.extend({
  propertyId: z.string(),
  version: z.number(),
  rules: z.any(),
  validateRules: z.boolean().optional(),
});

export const MergeRuleTreesSchema = BaseToolSchema.extend({
  baseRules: z.any(),
  mergeRules: z.any(),
  strategy: z.enum(['override', 'append', 'prepend']).optional(),
});

export const OptimizeRuleTreeSchema = BaseToolSchema.extend({
  rules: z.any(),
  optimizations: z.array(z.enum(['dedupe', 'consolidate', 'reorder'])).optional(),
});

export const ValidateRuleTreeSchema = BaseToolSchema.extend({
  rules: z.any(),
  ruleFormat: z.string().optional(),
});

// CP Code Schemas
export const SearchCPCodesSchema = BaseToolSchema.extend({
  searchTerm: z.string(),
  contractId: z.string().optional(),
});

// Include Management Schemas
export const UpdateIncludeSchema = BaseToolSchema.extend({
  includeId: z.string(),
  version: z.number(),
  rules: z.any(),
});

export const CreateIncludeVersionSchema = BaseToolSchema.extend({
  includeId: z.string(),
  createFromVersion: z.number().optional(),
});

export const ActivateIncludeSchema = BaseToolSchema.extend({
  includeId: z.string(),
  version: z.number(),
  network: z.enum(['staging', 'production']),
});

export const ListIncludeActivationsSchema = BaseToolSchema.extend({
  includeId: z.string(),
});

export const GetIncludeActivationStatusSchema = BaseToolSchema.extend({
  includeId: z.string(),
  activationId: z.string(),
});

// Bulk Operations Schemas
export const BulkUpdatePropertiesSchema = BaseToolSchema.extend({
  propertyIds: z.array(z.string()),
  updates: z.object({
    rules: z.any().optional(),
    hostnames: z.array(z.string()).optional(),
  }),
});

export const GetBulkOperationStatusSchema = BaseToolSchema.extend({
  operationId: z.string(),
});

// Property Onboarding Schemas
export const OnboardPropertyWizardSchema = BaseToolSchema.extend({
  domain: z.string(),
  interactive: z.boolean().optional(),
});

export const OnboardSecureByDefaultPropertySchema = BaseToolSchema.extend({
  propertyName: z.string(),
  hostname: z.string(),
  contractId: z.string(),
  groupId: z.string(),
  productId: z.string().optional(),
});

export const CheckSecureByDefaultStatusSchema = BaseToolSchema.extend({
  propertyId: z.string(),
});

export const QuickSecureByDefaultSetupSchema = BaseToolSchema.extend({
  hostname: z.string(),
  propertyName: z.string().optional(),
});

// Network Lists Schemas
export const ActivateNetworkListSchema = BaseToolSchema.extend({
  networkListId: z.string(),
  network: z.enum(['staging', 'production']),
  comments: z.string().optional(),
  notificationEmails: z.array(z.string()).optional(),
});

export const GetNetworkListActivationStatusSchema = BaseToolSchema.extend({
  activationId: z.string(),
});

export const ListNetworkListActivationsSchema = BaseToolSchema.extend({
  networkListId: z.string(),
});

export const DeactivateNetworkListSchema = BaseToolSchema.extend({
  networkListId: z.string(),
  network: z.enum(['staging', 'production']),
});

export const BulkActivateNetworkListsSchema = BaseToolSchema.extend({
  networkListIds: z.array(z.string()),
  network: z.enum(['staging', 'production']),
  comments: z.string().optional(),
});

export const ImportNetworkListFromCSVSchema = BaseToolSchema.extend({
  csvContent: z.string(),
  networkListId: z.string().optional(),
  createNew: z.boolean().optional(),
});

export const ExportNetworkListToCSVSchema = BaseToolSchema.extend({
  networkListId: z.string(),
});

export const BulkUpdateNetworkListsSchema = BaseToolSchema.extend({
  updates: z.array(z.object({
    networkListId: z.string(),
    elements: z.array(z.string()),
    mode: z.enum(['add', 'remove', 'replace']),
  })),
});

export const MergeNetworkListsSchema = BaseToolSchema.extend({
  sourceNetworkListIds: z.array(z.string()),
  targetNetworkListId: z.string(),
  removeDuplicates: z.boolean().optional(),
});

export const ValidateGeographicCodesSchema = BaseToolSchema.extend({
  codes: z.array(z.string()),
});

export const GetASNInformationSchema = BaseToolSchema.extend({
  asns: z.array(z.number()),
});

export const GenerateGeographicBlockingRecommendationsSchema = BaseToolSchema.extend({
  analysisType: z.enum(['security', 'compliance', 'performance']),
  propertyIds: z.array(z.string()).optional(),
});

export const GenerateASNSecurityRecommendationsSchema = BaseToolSchema.extend({
  propertyIds: z.array(z.string()).optional(),
});

export const ListCommonGeographicCodesSchema = BaseToolSchema.extend({
  region: z.enum(['continents', 'countries', 'states']).optional(),
});

export const GetSecurityPolicyIntegrationGuidanceSchema = BaseToolSchema.extend({
  securityConfigId: z.number().optional(),
});

export const GenerateDeploymentChecklistSchema = BaseToolSchema.extend({
  networkListIds: z.array(z.string()),
  includeSecurityPolicies: z.boolean().optional(),
});

// AppSec Schemas
export const ActivateSecurityConfigurationSchema = BaseToolSchema.extend({
  configId: z.number(),
  version: z.number(),
  network: z.enum(['staging', 'production']),
  notificationEmails: z.array(z.string()).optional(),
  note: z.string().optional(),
});

export const GetSecurityActivationStatusSchema = BaseToolSchema.extend({
  activationId: z.number(),
});

// Performance Schemas
export const ProfilePerformanceSchema = BaseToolSchema.extend({
  propertyId: z.string().optional(),
  duration: z.number().optional().default(60),
  sampleRate: z.number().optional().default(1000),
});

export const GetRealtimeMetricsSchema = BaseToolSchema.extend({
  propertyId: z.string().optional(),
  metrics: z.array(z.enum([
    'bandwidth',
    'requests',
    'errors',
    'cache_hit_rate',
    'latency',
    'cpu_usage',
    'memory_usage'
  ])).optional(),
  interval: z.number().optional().default(5000),
});

export const ResetPerformanceMonitoringSchema = BaseToolSchema.extend({
  clearCache: z.boolean().optional().default(true),
  resetBaselines: z.boolean().optional().default(false),
});

// Reporting Schemas
export const GetPerformanceBenchmarksSchema = BaseToolSchema.extend({
  propertyId: z.string().optional(),
  compareWith: z.enum(['industry', 'historical', 'peers']).optional(),
  timeRange: z.enum(['7d', '30d', '90d']).optional(),
});

export const AnalyzeCachePerformanceSchema = BaseToolSchema.extend({
  propertyId: z.string().optional(),
  startDate: z.string(),
  endDate: z.string(),
  granularity: z.enum(['5min', '1hour', '1day']).optional(),
});

export const GetCostOptimizationInsightsSchema = BaseToolSchema.extend({
  propertyId: z.string().optional(),
  analysisDepth: z.enum(['basic', 'detailed', 'comprehensive']).optional(),
});

export const AnalyzeBandwidthUsageSchema = BaseToolSchema.extend({
  propertyId: z.string().optional(),
  startDate: z.string(),
  endDate: z.string(),
  groupBy: z.enum(['property', 'cpcode', 'geography']).optional(),
});

export const CreateReportingDashboardSchema = BaseToolSchema.extend({
  name: z.string(),
  widgets: z.array(z.object({
    type: z.string(),
    config: z.any(),
  })),
});

export const ExportReportDataSchema = BaseToolSchema.extend({
  reportType: z.string(),
  format: z.enum(['csv', 'json', 'pdf', 'excel']),
  startDate: z.string(),
  endDate: z.string(),
});

export const ConfigureMonitoringAlertsSchema = BaseToolSchema.extend({
  alerts: z.array(z.object({
    name: z.string(),
    metric: z.string(),
    threshold: z.number(),
    action: z.enum(['email', 'webhook', 'sms']),
  })),
});

export const GetReportingRealtimeMetricsSchema = BaseToolSchema.extend({
  metrics: z.array(z.string()),
  interval: z.number().optional(),
});

export const AnalyzeTrafficTrendsSchema = BaseToolSchema.extend({
  propertyId: z.string().optional(),
  startDate: z.string(),
  endDate: z.string(),
  trendType: z.enum(['growth', 'seasonal', 'anomaly']).optional(),
});

export const GeneratePerformanceReportSchema = BaseToolSchema.extend({
  propertyId: z.string().optional(),
  reportType: z.enum(['executive', 'technical', 'operational']),
  timeRange: z.enum(['24h', '7d', '30d', '90d']),
});

export const AnalyzeGeographicPerformanceSchema = BaseToolSchema.extend({
  propertyId: z.string().optional(),
  startDate: z.string(),
  endDate: z.string(),
  regions: z.array(z.string()).optional(),
  metrics: z.array(z.string()).optional(),
});

export const AnalyzeErrorPatternsSchema = BaseToolSchema.extend({
  propertyId: z.string().optional(),
  startDate: z.string(),
  endDate: z.string(),
  errorTypes: z.array(z.string()).optional(),
});