/**
 * Consolidated Tool Registry for ALECS MCP Server
 * 
 * Implements tool consolidation strategy:
 * - Reduces 180+ tools to ~25 focused, business-oriented tools
 * - Adds tool categories and metadata for better discovery
 * - Implements pagination support for MCP tool listing
 * - Maintains all functionality through comprehensive tool interfaces
 */

import { z, type ZodSchema } from 'zod';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

// Import Workflow Assistants (keep these - they're already well-designed)
import {
  getWorkflowAssistantTools,
  handleWorkflowAssistantRequest,
} from './workflows';

// Import existing consolidated tools
import {
  getConsolidatedTools,
  handleConsolidatedToolRequest,
} from './consolidated';

// Import elicitation tools (keep these - they're user-friendly)
import {
  dnsElicitationTool,
  handleDNSElicitationTool,
  secureHostnameOnboardingTool,
  handleSecureHostnameOnboardingTool,
} from './elicitation';

// Import consolidated property management
import { propertyDiscoveryTool, handlePropertyDiscovery } from './consolidated/property-discovery';
import { propertyCreationTool, handlePropertyCreation } from './consolidated/property-creation';
import { propertyConfigurationTool, handlePropertyConfiguration } from './consolidated/property-configuration';
import { propertyActivationTool, handlePropertyActivation } from './consolidated/property-activation';
import { propertyVersionsTool, handlePropertyVersions } from './consolidated/property-versions';

// Import consolidated certificate management
import { certificateEnrollmentTool, handleCertificateEnrollment } from './consolidated/certificate-enrollment';
import { certificateMonitoringTool, handleCertificateMonitoring } from './consolidated/certificate-monitoring';
import { certificateDeploymentTool, handleCertificateDeployment } from './consolidated/certificate-deployment';

// Import consolidated hostname management
import { hostnameAssignmentTool, handleHostnameAssignment } from './consolidated/hostname-assignment';
import { edgeHostnameManagementTool, handleEdgeHostnameManagement } from './consolidated/edge-hostname-management';
import { hostnameAnalysisTool, handleHostnameAnalysis } from './consolidated/hostname-analysis';

// Import consolidated network lists
import { networkListsCoreTool, handleNetworkListsCore } from './consolidated/network-lists-core';
import { networkListsActivationTool, handleNetworkListsActivation } from './consolidated/network-lists-activation';
import { networkListsBulkTool, handleNetworkListsBulk } from './consolidated/network-lists-bulk';

// Import consolidated analytics and performance
import { trafficAnalyticsTool, handleTrafficAnalytics } from './consolidated/traffic-analytics';
import { performanceAnalyticsTool, handlePerformanceAnalytics } from './consolidated/performance-analytics';
import { advancedAnalyticsTool, handleAdvancedAnalytics } from './consolidated/advanced-analytics';

// Import consolidated cost management
import { costAnalysisTool, handleCostAnalysis } from './consolidated/cost-analysis';
import { costOptimizationTool, handleCostOptimization } from './consolidated/cost-optimization';

// Import consolidated incident response
import { incidentResponseTool, handleIncidentResponse } from './consolidated/incident-response';
import { troubleshootingTool, handleTroubleshooting } from './consolidated/troubleshooting';

// Tool categories for better discovery
export enum ToolCategory {
  GETTING_STARTED = 'getting-started',
  PROPERTY_MANAGEMENT = 'property-management',
  DNS_MANAGEMENT = 'dns-management',
  CERTIFICATE_MANAGEMENT = 'certificate-management',
  SECURITY = 'security',
  PERFORMANCE = 'performance',
  COST_MANAGEMENT = 'cost-management',
  ANALYTICS = 'analytics',
  TROUBLESHOOTING = 'troubleshooting',
  ADVANCED = 'advanced',
}

// Complexity levels
export enum ToolComplexity {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert',
}

// Enhanced tool metadata with categories
export interface ConsolidatedToolMetadata {
  name: string;
  description: string;
  category: ToolCategory;
  complexity: ToolComplexity;
  estimatedTime: string;
  prerequisites: string[];
  businessFocus: string;
  commonTasks: string[];
  schema: ZodSchema;
  handler: (client: any, params: any) => Promise<any>;
}

// Registry of all consolidated tools
const consolidatedToolsRegistry: ConsolidatedToolMetadata[] = [
  // === GETTING STARTED ===
  {
    name: 'website-onboarding',
    description: 'Complete guided setup for new websites with security best practices',
    category: ToolCategory.GETTING_STARTED,
    complexity: ToolComplexity.BEGINNER,
    estimatedTime: '15-30 minutes',
    prerequisites: ['Domain ownership', 'Origin server'],
    businessFocus: 'Launch new website with optimal performance and security',
    commonTasks: ['New website setup', 'SSL configuration', 'DNS setup', 'Performance optimization'],
    schema: secureHostnameOnboardingTool.inputSchema as ZodSchema,
    handler: handleSecureHostnameOnboardingTool,
  },

  {
    name: 'dns-management',
    description: 'User-friendly DNS record management with guided workflows',
    category: ToolCategory.DNS_MANAGEMENT,
    complexity: ToolComplexity.BEGINNER,
    estimatedTime: '5-15 minutes',
    prerequisites: ['Zone access'],
    businessFocus: 'Manage DNS records safely and efficiently',
    commonTasks: ['Add DNS records', 'Update email settings', 'SSL validation', 'Domain migration'],
    schema: dnsElicitationTool.inputSchema as ZodSchema,
    handler: handleDNSElicitationTool,
  },

  // === PROPERTY MANAGEMENT ===
  {
    name: 'property-discovery',
    description: 'Find, search, and analyze Akamai properties across your account',
    category: ToolCategory.PROPERTY_MANAGEMENT,
    complexity: ToolComplexity.BEGINNER,
    estimatedTime: '2-5 minutes',
    prerequisites: [],
    businessFocus: 'Discover and understand your Akamai infrastructure',
    commonTasks: ['Find properties', 'Search by hostname', 'Analyze configurations', 'Get property details'],
    schema: propertyDiscoveryTool.inputSchema as ZodSchema,
    handler: handlePropertyDiscovery,
  },

  {
    name: 'property-creation',
    description: 'Create new properties with guided configuration and best practices',
    category: ToolCategory.PROPERTY_MANAGEMENT,
    complexity: ToolComplexity.INTERMEDIATE,
    estimatedTime: '10-20 minutes',
    prerequisites: ['Contract access', 'Group permissions'],
    businessFocus: 'Launch new properties with optimal configurations',
    commonTasks: ['Create new property', 'Clone existing property', 'Template-based setup'],
    schema: propertyCreationTool.inputSchema as ZodSchema,
    handler: handlePropertyCreation,
  },

  {
    name: 'property-configuration',
    description: 'Configure property settings, rules, and hostnames',
    category: ToolCategory.PROPERTY_MANAGEMENT,
    complexity: ToolComplexity.INTERMEDIATE,
    estimatedTime: '10-30 minutes',
    prerequisites: ['Property access'],
    businessFocus: 'Optimize property performance and behavior',
    commonTasks: ['Update rules', 'Add hostnames', 'Configure caching', 'Security settings'],
    schema: propertyConfigurationTool.inputSchema as ZodSchema,
    handler: handlePropertyConfiguration,
  },

  {
    name: 'property-activation',
    description: 'Activate properties to staging and production with safety checks',
    category: ToolCategory.PROPERTY_MANAGEMENT,
    complexity: ToolComplexity.INTERMEDIATE,
    estimatedTime: '5-15 minutes',
    prerequisites: ['Property configuration complete'],
    businessFocus: 'Deploy changes safely with validation and rollback',
    commonTasks: ['Activate to staging', 'Promote to production', 'Check status', 'Rollback'],
    schema: propertyActivationTool.inputSchema as ZodSchema,
    handler: handlePropertyActivation,
  },

  {
    name: 'property-versions',
    description: 'Manage property versions, compare changes, and track history',
    category: ToolCategory.PROPERTY_MANAGEMENT,
    complexity: ToolComplexity.ADVANCED,
    estimatedTime: '5-15 minutes',
    prerequisites: ['Property access'],
    businessFocus: 'Track changes and manage property evolution',
    commonTasks: ['Create versions', 'Compare changes', 'View history', 'Restore versions'],
    schema: propertyVersionsTool.inputSchema as ZodSchema,
    handler: handlePropertyVersions,
  },

  // === CERTIFICATE MANAGEMENT ===
  {
    name: 'certificate-enrollment',
    description: 'Enroll new SSL certificates with guided domain validation',
    category: ToolCategory.CERTIFICATE_MANAGEMENT,
    complexity: ToolComplexity.INTERMEDIATE,
    estimatedTime: '15-45 minutes',
    prerequisites: ['Domain ownership'],
    businessFocus: 'Secure websites with SSL certificates',
    commonTasks: ['DV certificate enrollment', 'Domain validation', 'SAN management'],
    schema: certificateEnrollmentTool.inputSchema as ZodSchema,
    handler: handleCertificateEnrollment,
  },

  {
    name: 'certificate-monitoring',
    description: 'Monitor certificate status, expiration, and validation',
    category: ToolCategory.CERTIFICATE_MANAGEMENT,
    complexity: ToolComplexity.BEGINNER,
    estimatedTime: '2-5 minutes',
    prerequisites: [],
    businessFocus: 'Prevent certificate-related outages',
    commonTasks: ['Check certificate status', 'Monitor expiration', 'Validate deployment'],
    schema: certificateMonitoringTool.inputSchema as ZodSchema,
    handler: handleCertificateMonitoring,
  },

  {
    name: 'certificate-deployment',
    description: 'Deploy certificates to properties and edge networks',
    category: ToolCategory.CERTIFICATE_MANAGEMENT,
    complexity: ToolComplexity.ADVANCED,
    estimatedTime: '10-20 minutes',
    prerequisites: ['Valid certificate'],
    businessFocus: 'Activate SSL protection across your infrastructure',
    commonTasks: ['Deploy to staging', 'Deploy to production', 'Link to properties'],
    schema: certificateDeploymentTool.inputSchema as ZodSchema,
    handler: handleCertificateDeployment,
  },

  // === HOSTNAME MANAGEMENT ===
  {
    name: 'hostname-assignment',
    description: 'Assign and manage hostnames across properties',
    category: ToolCategory.PROPERTY_MANAGEMENT,
    complexity: ToolComplexity.INTERMEDIATE,
    estimatedTime: '5-15 minutes',
    prerequisites: ['Property access'],
    businessFocus: 'Connect domains to Akamai infrastructure',
    commonTasks: ['Add hostnames', 'Remove hostnames', 'Bulk operations', 'Validate assignments'],
    schema: hostnameAssignmentTool.inputSchema as ZodSchema,
    handler: handleHostnameAssignment,
  },

  {
    name: 'edge-hostname-management',
    description: 'Create and manage edge hostnames with certificate integration',
    category: ToolCategory.PROPERTY_MANAGEMENT,
    complexity: ToolComplexity.ADVANCED,
    estimatedTime: '10-20 minutes',
    prerequisites: ['Property and certificate access'],
    businessFocus: 'Optimize edge delivery and SSL termination',
    commonTasks: ['Create edge hostnames', 'Certificate integration', 'Bulk operations'],
    schema: edgeHostnameManagementTool.inputSchema as ZodSchema,
    handler: handleEdgeHostnameManagement,
  },

  {
    name: 'hostname-analysis',
    description: 'Analyze hostname conflicts, coverage, and optimization opportunities',
    category: ToolCategory.ANALYTICS,
    complexity: ToolComplexity.ADVANCED,
    estimatedTime: '5-10 minutes',
    prerequisites: [],
    businessFocus: 'Optimize hostname architecture and prevent conflicts',
    commonTasks: ['Conflict detection', 'Wildcard analysis', 'Ownership patterns'],
    schema: hostnameAnalysisTool.inputSchema as ZodSchema,
    handler: handleHostnameAnalysis,
  },

  // === NETWORK LISTS ===
  {
    name: 'network-lists-core',
    description: 'Create, update, and manage network lists for security policies',
    category: ToolCategory.SECURITY,
    complexity: ToolComplexity.INTERMEDIATE,
    estimatedTime: '5-15 minutes',
    prerequisites: ['Security configuration access'],
    businessFocus: 'Manage IP-based security policies',
    commonTasks: ['Create lists', 'Update entries', 'Manage IP ranges', 'Geographic lists'],
    schema: networkListsCoreTool.inputSchema as ZodSchema,
    handler: handleNetworkListsCore,
  },

  {
    name: 'network-lists-activation',
    description: 'Activate and deploy network list changes across environments',
    category: ToolCategory.SECURITY,
    complexity: ToolComplexity.INTERMEDIATE,
    estimatedTime: '5-10 minutes',
    prerequisites: ['Network lists configured'],
    businessFocus: 'Deploy security changes safely',
    commonTasks: ['Activate lists', 'Check status', 'Rollback changes'],
    schema: networkListsActivationTool.inputSchema as ZodSchema,
    handler: handleNetworkListsActivation,
  },

  {
    name: 'network-lists-bulk',
    description: 'Bulk operations for network lists including import/export',
    category: ToolCategory.SECURITY,
    complexity: ToolComplexity.ADVANCED,
    estimatedTime: '10-30 minutes',
    prerequisites: ['Security configuration access'],
    businessFocus: 'Efficiently manage large-scale security policies',
    commonTasks: ['Bulk import', 'CSV operations', 'Mass updates', 'Migration'],
    schema: networkListsBulkTool.inputSchema as ZodSchema,
    handler: handleNetworkListsBulk,
  },

  // === ANALYTICS & PERFORMANCE ===
  {
    name: 'traffic-analytics',
    description: 'Analyze traffic patterns, trends, and performance metrics',
    category: ToolCategory.ANALYTICS,
    complexity: ToolComplexity.BEGINNER,
    estimatedTime: '5-10 minutes',
    prerequisites: [],
    businessFocus: 'Understand visitor behavior and traffic patterns',
    commonTasks: ['Traffic reports', 'Trend analysis', 'Geographic data', 'Time series'],
    schema: trafficAnalyticsTool.inputSchema as ZodSchema,
    handler: handleTrafficAnalytics,
  },

  {
    name: 'performance-analytics',
    description: 'Monitor and analyze website performance and optimization opportunities',
    category: ToolCategory.PERFORMANCE,
    complexity: ToolComplexity.INTERMEDIATE,
    estimatedTime: '5-15 minutes',
    prerequisites: [],
    businessFocus: 'Improve user experience through performance optimization',
    commonTasks: ['Performance benchmarks', 'Cache analysis', 'Optimization insights'],
    schema: performanceAnalyticsTool.inputSchema as ZodSchema,
    handler: handlePerformanceAnalytics,
  },

  {
    name: 'advanced-analytics',
    description: 'Deep dive analytics for bandwidth, errors, and geographic performance',
    category: ToolCategory.ANALYTICS,
    complexity: ToolComplexity.ADVANCED,
    estimatedTime: '10-20 minutes',
    prerequisites: [],
    businessFocus: 'Advanced insights for complex optimization scenarios',
    commonTasks: ['Bandwidth analysis', 'Error pattern detection', 'Regional performance'],
    schema: advancedAnalyticsTool.inputSchema as ZodSchema,
    handler: handleAdvancedAnalytics,
  },

  // === COST MANAGEMENT ===
  {
    name: 'cost-analysis',
    description: 'Analyze costs, usage patterns, and billing insights',
    category: ToolCategory.COST_MANAGEMENT,
    complexity: ToolComplexity.INTERMEDIATE,
    estimatedTime: '10-15 minutes',
    prerequisites: ['Billing access'],
    businessFocus: 'Understand and control infrastructure costs',
    commonTasks: ['Cost breakdowns', 'Usage analysis', 'Billing insights', 'Forecasting'],
    schema: costAnalysisTool.inputSchema as ZodSchema,
    handler: handleCostAnalysis,
  },

  {
    name: 'cost-optimization',
    description: 'Identify and implement cost optimization opportunities',
    category: ToolCategory.COST_MANAGEMENT,
    complexity: ToolComplexity.ADVANCED,
    estimatedTime: '15-30 minutes',
    prerequisites: ['Cost analysis complete'],
    businessFocus: 'Reduce costs while maintaining performance',
    commonTasks: ['Optimization recommendations', 'Configuration changes', 'Savings calculator'],
    schema: costOptimizationTool.inputSchema as ZodSchema,
    handler: handleCostOptimization,
  },

  // === TROUBLESHOOTING ===
  {
    name: 'incident-response',
    description: 'Guided incident response for outages and performance issues',
    category: ToolCategory.TROUBLESHOOTING,
    complexity: ToolComplexity.ADVANCED,
    estimatedTime: '10-60 minutes',
    prerequisites: [],
    businessFocus: 'Quickly resolve service incidents',
    commonTasks: ['Incident triage', 'Status checks', 'Emergency fixes', 'Rollback procedures'],
    schema: incidentResponseTool.inputSchema as ZodSchema,
    handler: handleIncidentResponse,
  },

  {
    name: 'troubleshooting',
    description: 'Diagnostic tools and guided troubleshooting for common issues',
    category: ToolCategory.TROUBLESHOOTING,
    complexity: ToolComplexity.INTERMEDIATE,
    estimatedTime: '5-20 minutes',
    prerequisites: [],
    businessFocus: 'Diagnose and resolve configuration issues',
    commonTasks: ['DNS troubleshooting', 'SSL issues', 'Performance problems', 'Configuration validation'],
    schema: troubleshootingTool.inputSchema as ZodSchema,
    handler: handleTroubleshooting,
  },
];

/**
 * Get consolidated tools by category
 */
export function getConsolidatedToolsByCategory(category?: ToolCategory): ConsolidatedToolMetadata[] {
  if (!category) {
    return consolidatedToolsRegistry;
  }
  return consolidatedToolsRegistry.filter(tool => tool.category === category);
}

/**
 * Get consolidated tools by complexity level
 */
export function getConsolidatedToolsByComplexity(complexity: ToolComplexity): ConsolidatedToolMetadata[] {
  return consolidatedToolsRegistry.filter(tool => tool.complexity === complexity);
}

/**
 * Get all tool definitions for registration
 */
export function getAllConsolidatedToolDefinitions(): Array<{
  name: string;
  description: string;
  category: string;
  complexity: string;
  estimatedTime: string;
  businessFocus: string;
  schema: ZodSchema;
  handler: (client: any, params: any) => Promise<any>;
}> {
  return consolidatedToolsRegistry.map(tool => ({
    name: tool.name,
    description: tool.description,
    category: tool.category,
    complexity: tool.complexity,
    estimatedTime: tool.estimatedTime,
    businessFocus: tool.businessFocus,
    schema: tool.schema,
    handler: tool.handler,
  }));
}

/**
 * Get tool discovery metadata for enhanced UX
 */
export function getToolDiscoveryData() {
  const categories = Object.values(ToolCategory);
  const toolsByCategory = categories.map(category => ({
    category,
    count: getConsolidatedToolsByCategory(category).length,
    tools: getConsolidatedToolsByCategory(category).map(tool => ({
      name: tool.name,
      description: tool.description,
      complexity: tool.complexity,
      estimatedTime: tool.estimatedTime,
      businessFocus: tool.businessFocus,
    })),
  }));

  return {
    totalTools: consolidatedToolsRegistry.length,
    categories: toolsByCategory,
    complexityDistribution: {
      beginner: getConsolidatedToolsByComplexity(ToolComplexity.BEGINNER).length,
      intermediate: getConsolidatedToolsByComplexity(ToolComplexity.INTERMEDIATE).length,
      advanced: getConsolidatedToolsByComplexity(ToolComplexity.ADVANCED).length,
      expert: getConsolidatedToolsByComplexity(ToolComplexity.EXPERT).length,
    },
  };
}

/**
 * Handle consolidated tool request with category-aware routing
 */
export async function handleConsolidatedToolRequest(
  toolName: string,
  args: any
): Promise<any> {
  const tool = consolidatedToolsRegistry.find(t => t.name === toolName);
  
  if (!tool) {
    throw new Error(`Unknown consolidated tool: ${toolName}`);
  }
  
  // Import AkamaiClient dynamically to avoid circular dependencies
  const { AkamaiClient } = await import('../akamai-client.js');
  const client = new AkamaiClient();
  
  return tool.handler(client, args);
}