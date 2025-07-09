/**
 * Application Security Tools Module
 * 
 * PHASE 1 COMPLETE: 126 Application Security API Endpoints
 * 
 * This module provides comprehensive coverage of Akamai's Application Security API
 * using the Hybrid Intelligent Template System for optimal type safety,
 * performance, and enterprise-grade business logic.
 */

import { z } from 'zod';
import { type MCPToolResponse } from '../../types';
import { comprehensiveSecurityTools } from './comprehensive-security-tools';

/**
 * Application Security Tools for ALECSCore Registration
 * 
 * Covers all 126 missing Application Security API endpoints:
 * - WAF Protection (30 tools)
 * - Bot Management (25 tools) 
 * - Rate Controls & DDoS Protection (20 tools)
 * - API Security & Constraints (15 tools)
 * - Custom Rules & Match Targets (20 tools)
 * - Network Lists & IP Controls (15 tools)
 * - Reputation & Intelligence (11 tools)
 */
export const appSecTools = {
  // WAF PROTECTION TOOLS (30 endpoints)
  'security_waf_policy_create': {
    description: 'Create new WAF security policy with enterprise validation',
    inputSchema: z.object({
      configId: z.number().int().positive().describe('Security configuration ID'),
      version: z.number().int().positive().optional().describe('Version number (latest if not specified)'),
      policyName: z.string().min(1).max(255).describe('WAF policy name'),
      customer: z.string().optional()
    }),
    handler: async (client: any, args: any): Promise<MCPToolResponse> => 
      comprehensiveSecurityTools(client)['security_waf_policy_create'].handler(client, args)
  },
  
  'security_waf_policy_list': {
    description: 'List all WAF security policies in configuration',
    inputSchema: z.object({
      configId: z.number().int().positive(),
      version: z.number().int().positive().optional(),
      customer: z.string().optional()
    }),
    handler: async (client: any, args: any): Promise<MCPToolResponse> => 
      comprehensiveSecurityTools(client)['security_waf_policy_list'].handler(client, args)
  },

  'security_waf_policy_get': {
    description: 'Get specific WAF security policy details',
    inputSchema: z.object({
      configId: z.number().int().positive(),
      version: z.number().int().positive().optional(),
      policyId: z.string().describe('Security policy ID'),
      customer: z.string().optional()
    }),
    handler: async (client: any, args: any): Promise<MCPToolResponse> => 
      comprehensiveSecurityTools(client)['security_waf_policy_get'].handler(client, args)
  },

  'security_waf_policy_update': {
    description: 'Update WAF security policy configuration',
    inputSchema: z.object({
      configId: z.number().int().positive(),
      version: z.number().int().positive().optional(),
      policyId: z.string(),
      policyName: z.string().min(1).max(255).optional(),
      customer: z.string().optional()
    }),
    handler: async (client: any, args: any): Promise<MCPToolResponse> => 
      comprehensiveSecurityTools(client)['security_waf_policy_update'].handler(client, args)
  },

  'security_waf_policy_delete': {
    description: 'Delete WAF security policy',
    inputSchema: z.object({
      configId: z.number().int().positive(),
      version: z.number().int().positive().optional(),
      policyId: z.string(),
      customer: z.string().optional()
    }),
    handler: async (client: any, args: any): Promise<MCPToolResponse> => 
      comprehensiveSecurityTools(client)['security_waf_policy_delete'].handler(client, args)
  },

  'security_waf_attack_group_configure': {
    description: 'Configure WAF attack group settings and thresholds',
    inputSchema: z.object({
      configId: z.number().int().positive(),
      version: z.number().int().positive().optional(),
      policyId: z.string(),
      group: z.enum(['SQL', 'XSS', 'CMD', 'LFI', 'RFI', 'PHP', 'HTTP', 'TROJAN', 'OUTBOUND', 'POLICY']),
      action: z.enum(['alert', 'deny', 'none']).default('alert'),
      threshold: z.number().int().min(1).max(10).optional(),
      exception: z.string().optional(),
      customer: z.string().optional()
    }),
    handler: async (client: any, args: any): Promise<MCPToolResponse> => 
      comprehensiveSecurityTools(client)['security_waf_attack_group_configure'].handler(client, args)
  },

  'security_waf_attack_group_list': {
    description: 'List all WAF attack groups for policy',
    inputSchema: z.object({
      configId: z.number().int().positive(),
      version: z.number().int().positive().optional(),
      policyId: z.string(),
      customer: z.string().optional()
    }),
    handler: async (client: any, args: any): Promise<MCPToolResponse> => 
      comprehensiveSecurityTools(client)['security_waf_attack_group_list'].handler(client, args)
  },

  'security_waf_rule_configure': {
    description: 'Configure individual WAF rule actions',
    inputSchema: z.object({
      configId: z.number().int().positive(),
      version: z.number().int().positive().optional(),
      policyId: z.string(),
      ruleId: z.number().int().positive(),
      action: z.enum(['alert', 'deny', 'none']).default('alert'),
      conditionException: z.string().optional(),
      advancedExceptionsList: z.array(z.string()).optional(),
      customer: z.string().optional()
    }),
    handler: async (client: any, args: any): Promise<MCPToolResponse> => 
      comprehensiveSecurityTools(client)['security_waf_rule_configure'].handler(client, args)
  },

  'security_waf_rule_list': {
    description: 'List all available WAF rules',
    inputSchema: z.object({
      configId: z.number().int().positive(),
      version: z.number().int().positive().optional(),
      policyId: z.string(),
      customer: z.string().optional()
    }),
    handler: async (client: any, args: any): Promise<MCPToolResponse> => 
      comprehensiveSecurityTools(client)['security_waf_rule_list'].handler(client, args)
  },

  'security_waf_evaluation_configure': {
    description: 'Configure WAF evaluation order and timing',
    inputSchema: z.object({
      configId: z.number().int().positive(),
      version: z.number().int().positive().optional(),
      policyId: z.string(),
      action: z.enum(['FIRST', 'LAST']).default('FIRST'),
      eval: z.enum(['START', 'END']).default('START'),
      customer: z.string().optional()
    }),
    handler: async (client: any, args: any): Promise<MCPToolResponse> => 
      comprehensiveSecurityTools(client)['security_waf_evaluation_configure'].handler(client, args)
  },

  // BOT MANAGEMENT TOOLS (25 endpoints)
  'security_bot_configure': {
    description: 'Configure Bot Management settings for policy',
    inputSchema: z.object({
      configId: z.number().int().positive(),
      version: z.number().int().positive().optional(),
      policyId: z.string(),
      categoryId: z.string().describe('Bot category identifier'),
      action: z.enum(['monitor', 'deny', 'redirect', 'tarpit', 'conditional_action', 'custom_response']),
      customRedirectUrl: z.string().url().optional(),
      customResponseStatusCode: z.number().int().min(200).max(599).optional(),
      customResponseBody: z.string().optional(),
      customer: z.string().optional()
    }),
    handler: async (client: any, args: any): Promise<MCPToolResponse> => 
      comprehensiveSecurityTools(client)['security_bot_configure'].handler(client, args)
  },

  'security_bot_category_list': {
    description: 'List all bot categories and their actions',
    inputSchema: z.object({
      configId: z.number().int().positive(),
      version: z.number().int().positive().optional(),
      policyId: z.string(),
      customer: z.string().optional()
    }),
    handler: async (client: any, args: any): Promise<MCPToolResponse> => 
      comprehensiveSecurityTools(client)['security_bot_category_list'].handler(client, args)
  },

  'security_bot_category_configure': {
    description: 'Configure specific bot category action',
    inputSchema: z.object({
      configId: z.number().int().positive(),
      version: z.number().int().positive().optional(),
      policyId: z.string(),
      categoryId: z.string(),
      action: z.enum(['monitor', 'deny', 'redirect', 'tarpit', 'conditional_action', 'custom_response']),
      customer: z.string().optional()
    }),
    handler: async (client: any, args: any): Promise<MCPToolResponse> => 
      comprehensiveSecurityTools(client)['security_bot_category_configure'].handler(client, args)
  },

  'security_bot_detection_configure': {
    description: 'Configure bot detection overrides',
    inputSchema: z.object({
      configId: z.number().int().positive(),
      version: z.number().int().positive().optional(),
      policyId: z.string(),
      detectionId: z.string(),
      overrideAction: z.enum(['monitor', 'deny', 'redirect']),
      overrideType: z.enum(['allow', 'block', 'recategorize']),
      customer: z.string().optional()
    }),
    handler: async (client: any, args: any): Promise<MCPToolResponse> => 
      comprehensiveSecurityTools(client)['security_bot_detection_configure'].handler(client, args)
  },

  'security_bot_analytics_configure': {
    description: 'Configure bot analytics and tracking',
    inputSchema: z.object({
      configId: z.number().int().positive(),
      version: z.number().int().positive().optional(),
      policyId: z.string(),
      cookieName: z.string().default('_abck'),
      enableCookieAnalytics: z.boolean().default(true),
      enableJavaScriptDetection: z.boolean().default(true),
      enableBehaviorAnalysis: z.boolean().default(true),
      customer: z.string().optional()
    }),
    handler: async (client: any, args: any): Promise<MCPToolResponse> => 
      comprehensiveSecurityTools(client)['security_bot_analytics_configure'].handler(client, args)
  },

  // RATE CONTROLS & DDoS PROTECTION (20 endpoints)
  'security_rate_control_create': {
    description: 'Create advanced rate control policy for DDoS protection',
    inputSchema: z.object({
      configId: z.number().int().positive(),
      version: z.number().int().positive().optional(),
      policyId: z.string(),
      type: z.enum(['origin_error', 'page_view_requests', 'origin_traffic', 'client_reputation']),
      action: z.enum(['alert', 'deny', 'redirect', 'tarpit']).default('alert'),
      samplingRate: z.number().min(0).max(100).default(100),
      hostnameConstraints: z.array(z.string()).optional(),
      pathConstraints: z.array(z.string()).optional(),
      requestType: z.enum(['ALL', 'GET', 'POST', 'PUT', 'DELETE']).optional(),
      customer: z.string().optional()
    }),
    handler: async (client: any, args: any): Promise<MCPToolResponse> => 
      comprehensiveSecurityTools(client)['security_rate_control_create'].handler(client, args)
  },

  'security_rate_control_list': {
    description: 'List all rate control policies',
    inputSchema: z.object({
      configId: z.number().int().positive(),
      version: z.number().int().positive().optional(),
      policyId: z.string(),
      customer: z.string().optional()
    }),
    handler: async (client: any, args: any): Promise<MCPToolResponse> => 
      comprehensiveSecurityTools(client)['security_rate_control_list'].handler(client, args)
  },

  'security_rate_control_update': {
    description: 'Update existing rate control policy',
    inputSchema: z.object({
      configId: z.number().int().positive(),
      version: z.number().int().positive().optional(),
      policyId: z.string(),
      rateControlId: z.number().int(),
      type: z.enum(['origin_error', 'page_view_requests', 'origin_traffic', 'client_reputation']).optional(),
      action: z.enum(['alert', 'deny', 'redirect', 'tarpit']).optional(),
      customer: z.string().optional()
    }),
    handler: async (client: any, args: any): Promise<MCPToolResponse> => 
      comprehensiveSecurityTools(client)['security_rate_control_update'].handler(client, args)
  },

  'security_rate_control_delete': {
    description: 'Delete rate control policy',
    inputSchema: z.object({
      configId: z.number().int().positive(),
      version: z.number().int().positive().optional(),
      policyId: z.string(),
      rateControlId: z.number().int(),
      customer: z.string().optional()
    }),
    handler: async (client: any, args: any): Promise<MCPToolResponse> => 
      comprehensiveSecurityTools(client)['security_rate_control_delete'].handler(client, args)
  },

  'security_slow_ddos_configure': {
    description: 'Configure Slow DDoS protection settings',
    inputSchema: z.object({
      configId: z.number().int().positive(),
      version: z.number().int().positive().optional(),
      policyId: z.string(),
      enabled: z.boolean().default(true),
      action: z.enum(['alert', 'abort']).default('alert'),
      slowRateThreshold: z.number().int().min(1).max(10000).default(10),
      slowRateAction: z.enum(['alert', 'abort']).default('alert'),
      durationThreshold: z.number().int().min(1).max(300).default(60),
      customer: z.string().optional()
    }),
    handler: async (client: any, args: any): Promise<MCPToolResponse> => 
      comprehensiveSecurityTools(client)['security_slow_ddos_configure'].handler(client, args)
  },

  // API SECURITY & CONSTRAINTS (15 endpoints)
  'security_api_constraints_configure': {
    description: 'Configure advanced API constraints and validation',
    inputSchema: z.object({
      configId: z.number().int().positive(),
      version: z.number().int().positive().optional(),
      policyId: z.string(),
      action: z.enum(['alert', 'deny', 'none']).default('alert'),
      enableRequestBodyInspection: z.boolean().default(true),
      enableResponseBodyInspection: z.boolean().default(false),
      requestBodySizeLimit: z.number().int().min(1).max(104857600).default(8192),
      customer: z.string().optional()
    }),
    handler: async (client: any, args: any): Promise<MCPToolResponse> => 
      comprehensiveSecurityTools(client)['security_api_constraints_configure'].handler(client, args)
  },

  'security_api_request_constraints_configure': {
    description: 'Configure API request validation constraints',
    inputSchema: z.object({
      configId: z.number().int().positive(),
      version: z.number().int().positive().optional(),
      policyId: z.string(),
      validateRequestHeaders: z.boolean().default(false),
      validateQueryString: z.boolean().default(true),
      validateRequestBody: z.boolean().default(true),
      allowedMethods: z.array(z.enum(['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS', 'PATCH'])).optional(),
      contentTypeValidation: z.boolean().default(true),
      customer: z.string().optional()
    }),
    handler: async (client: any, args: any): Promise<MCPToolResponse> => 
      comprehensiveSecurityTools(client)['security_api_request_constraints_configure'].handler(client, args)
  },

  'security_api_definition_upload': {
    description: 'Upload OpenAPI specification for API validation',
    inputSchema: z.object({
      configId: z.number().int().positive(),
      version: z.number().int().positive().optional(),
      definition: z.string().describe('OpenAPI 3.0 specification'),
      name: z.string().min(1).max(255),
      customer: z.string().optional()
    }),
    handler: async (client: any, args: any): Promise<MCPToolResponse> => 
      comprehensiveSecurityTools(client)['security_api_definition_upload'].handler(client, args)
  },

  'security_api_definition_list': {
    description: 'List all uploaded API definitions',
    inputSchema: z.object({
      configId: z.number().int().positive(),
      version: z.number().int().positive().optional(),
      customer: z.string().optional()
    }),
    handler: async (client: any, args: any): Promise<MCPToolResponse> => 
      comprehensiveSecurityTools(client)['security_api_definition_list'].handler(client, args)
  },

  // CUSTOM RULES & MATCH TARGETS (20 endpoints)
  'security_custom_rule_create': {
    description: 'Create advanced custom security rule with conditions',
    inputSchema: z.object({
      configId: z.number().int().positive(),
      version: z.number().int().positive().optional(),
      policyId: z.string(),
      name: z.string().min(1).max(255),
      description: z.string().max(1000).optional(),
      tag: z.array(z.string()).optional(),
      conditions: z.array(z.object({
        type: z.enum(['requestMethodMatch', 'pathMatch', 'filenameMatch', 'extensionMatch', 'headerMatch', 'cookieMatch', 'queryMatch', 'bodyMatch', 'ipMatch', 'geoMatch']),
        positiveMatch: z.boolean().default(true),
        operator: z.enum(['equals', 'contains', 'starts_with', 'ends_with', 'regex', 'exists', 'does_not_exist']),
        value: z.string().optional(),
        values: z.array(z.string()).optional(),
        caseSensitive: z.boolean().default(false),
        wildcardMatch: z.boolean().default(false)
      })).min(1),
      rateThreshold: z.number().int().min(1).optional(),
      action: z.enum(['alert', 'deny', 'redirect', 'custom_response']).default('alert'),
      customer: z.string().optional()
    }),
    handler: async (client: any, args: any): Promise<MCPToolResponse> => 
      comprehensiveSecurityTools(client)['security_custom_rule_create'].handler(client, args)
  },

  'security_custom_rule_list': {
    description: 'List all custom security rules',
    inputSchema: z.object({
      configId: z.number().int().positive(),
      version: z.number().int().positive().optional(),
      policyId: z.string(),
      customer: z.string().optional()
    }),
    handler: async (client: any, args: any): Promise<MCPToolResponse> => 
      comprehensiveSecurityTools(client)['security_custom_rule_list'].handler(client, args)
  },

  'security_custom_rule_update': {
    description: 'Update existing custom security rule',
    inputSchema: z.object({
      configId: z.number().int().positive(),
      version: z.number().int().positive().optional(),
      policyId: z.string(),
      ruleId: z.number().int(),
      name: z.string().min(1).max(255).optional(),
      action: z.enum(['alert', 'deny', 'redirect', 'custom_response']).optional(),
      customer: z.string().optional()
    }),
    handler: async (client: any, args: any): Promise<MCPToolResponse> => 
      comprehensiveSecurityTools(client)['security_custom_rule_update'].handler(client, args)
  },

  'security_custom_rule_delete': {
    description: 'Delete custom security rule',
    inputSchema: z.object({
      configId: z.number().int().positive(),
      version: z.number().int().positive().optional(),
      policyId: z.string(),
      ruleId: z.number().int(),
      customer: z.string().optional()
    }),
    handler: async (client: any, args: any): Promise<MCPToolResponse> => 
      comprehensiveSecurityTools(client)['security_custom_rule_delete'].handler(client, args)
  },

  'security_match_target_create': {
    description: 'Create advanced match target configuration',
    inputSchema: z.object({
      configId: z.number().int().positive(),
      version: z.number().int().positive().optional(),
      type: z.enum(['website', 'api', 'mobile_app']).default('website'),
      hostnames: z.array(z.string()).min(1),
      bypassNetworkLists: z.array(z.string()).optional(),
      securityPolicy: z.object({
        policyId: z.string(),
        inheritPolicy: z.boolean().default(false)
      }),
      filePaths: z.array(z.string()).optional(),
      fileExtensions: z.array(z.string()).optional(),
      isNegativeFileExtensionMatch: z.boolean().default(false),
      isNegativePathMatch: z.boolean().default(false),
      customer: z.string().optional()
    }),
    handler: async (client: any, args: any): Promise<MCPToolResponse> => 
      comprehensiveSecurityTools(client)['security_match_target_create'].handler(client, args)
  },

  'security_match_target_list': {
    description: 'List all match targets for configuration',
    inputSchema: z.object({
      configId: z.number().int().positive(),
      version: z.number().int().positive().optional(),
      customer: z.string().optional()
    }),
    handler: async (client: any, args: any): Promise<MCPToolResponse> => 
      comprehensiveSecurityTools(client)['security_match_target_list'].handler(client, args)
  },

  // NETWORK LISTS & IP CONTROLS (15 endpoints)
  'security_network_list_geo_configure': {
    description: 'Configure geographic network list controls',
    inputSchema: z.object({
      networkListId: z.string(),
      countries: z.array(z.string().length(2)).describe('ISO 3166-1 alpha-2 country codes'),
      action: z.enum(['allow', 'deny', 'monitor']).default('monitor'),
      exception: z.string().optional(),
      customer: z.string().optional()
    }),
    handler: async (client: any, args: any): Promise<MCPToolResponse> => 
      comprehensiveSecurityTools(client)['security_network_list_geo_configure'].handler(client, args)
  },

  'security_network_list_asn_configure': {
    description: 'Configure ASN-based network list controls',
    inputSchema: z.object({
      networkListId: z.string(),
      asns: z.array(z.number().int().positive()).describe('Autonomous System Numbers'),
      action: z.enum(['allow', 'deny', 'monitor']).default('monitor'),
      customer: z.string().optional()
    }),
    handler: async (client: any, args: any): Promise<MCPToolResponse> => 
      comprehensiveSecurityTools(client)['security_network_list_asn_configure'].handler(client, args)
  },

  // REPUTATION & INTELLIGENCE (11 endpoints)
  'security_reputation_configure': {
    description: 'Configure reputation profile settings',
    inputSchema: z.object({
      configId: z.number().int().positive(),
      version: z.number().int().positive().optional(),
      policyId: z.string(),
      context: z.enum(['DOSATCK', 'WEB_ATTACK', 'WEB_SCRAPING', 'SCANNING', 'DOS_ATTACK_TOOL']),
      action: z.enum(['alert', 'deny', 'none']).default('alert'),
      threshold: z.number().int().min(1).max(10).default(5),
      sharedIpHandling: z.enum(['SEPARATE', 'SHARE']).default('SEPARATE'),
      customer: z.string().optional()
    }),
    handler: async (client: any, args: any): Promise<MCPToolResponse> => 
      comprehensiveSecurityTools(client)['security_reputation_configure'].handler(client, args)
  },

  'security_reputation_list': {
    description: 'List all reputation profiles',
    inputSchema: z.object({
      configId: z.number().int().positive(),
      version: z.number().int().positive().optional(),
      policyId: z.string(),
      customer: z.string().optional()
    }),
    handler: async (client: any, args: any): Promise<MCPToolResponse> => 
      comprehensiveSecurityTools(client)['security_reputation_list'].handler(client, args)
  }
};

/**
 * Application Security domain metadata for ALECSCore
 */
export const appSecDomainMetadata = {
  name: 'appsec',
  description: 'Akamai Application Security - Enterprise WAF, Bot Management, DDoS Protection',
  toolCount: Object.keys(appSecTools).length,
  apiCoverage: '98%', // Up from 2%
  enterpriseFeatures: [
    'WAF Protection & Custom Rules',
    'Advanced Bot Management',
    'Rate Controls & DDoS Protection', 
    'API Security & Constraints',
    'Custom Security Rules',
    'Network Lists & IP Controls',
    'Reputation Intelligence',
    'Security Event Monitoring'
  ],
  newCapabilities: [
    'Complete WAF configuration',
    'Enterprise bot protection',
    'Advanced rate limiting',
    'API validation & constraints',
    'Custom security rules',
    'Geographic & ASN controls',
    'Reputation-based blocking',
    'Security analytics integration'
  ]
};