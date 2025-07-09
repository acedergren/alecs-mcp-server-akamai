/**
 * Security Domain Tools Export
 * 
 * This module exports all security-related tools for use with ALECSCore.
 * It consolidates Network Lists, AppSec, and WAF functionality
 * into a clean interface with multi-tenant support.
 */

import { consolidatedSecurityTools } from './consolidated-security-tools';
import { z } from 'zod';
import { type MCPToolResponse } from '../../types';

/**
 * Security tool definitions for ALECSCore registration
 */
export const securityTools = {
  // Network List operations
  'security_network_lists_list': {
    description: 'List all network lists',
    inputSchema: z.object({
      type: z.string().optional(),
      search: z.string().optional(),
      includeElements: z.boolean().optional(),
      limit: z.number().optional(),
      offset: z.number().optional(),
      customer: z.string().optional(),
      format: z.enum(['json', 'text']).optional()
    }),
    handler: async (args: any): Promise<MCPToolResponse> => 
      consolidatedSecurityTools.listNetworkLists(args)
  },

  'security_network_list_get': {
    description: 'Get network list details',
    inputSchema: z.object({
      networkListId: z.string(),
      includeElements: z.boolean().optional(),
      customer: z.string().optional()
    }),
    handler: async (args: any): Promise<MCPToolResponse> => 
      consolidatedSecurityTools.getNetworkList(args)
  },

  'security_network_list_create': {
    description: 'Create a new network list',
    inputSchema: z.object({
      name: z.string(),
      type: z.enum(['IP', 'GEO', 'ASN', 'EXCEPTION']),
      description: z.string().optional(),
      elements: z.array(z.string()).optional(),
      contractId: z.string(),
      groupId: z.number(),
      customer: z.string().optional()
    }),
    handler: async (args: any): Promise<MCPToolResponse> => 
      consolidatedSecurityTools.createNetworkList(args)
  },

  'security_network_list_update': {
    description: 'Update network list elements',
    inputSchema: z.object({
      networkListId: z.string(),
      elements: z.array(z.string()),
      mode: z.enum(['append', 'replace', 'remove']).optional(),
      description: z.string().optional(),
      customer: z.string().optional()
    }),
    handler: async (args: any): Promise<MCPToolResponse> => 
      consolidatedSecurityTools.updateNetworkList(args)
  },

  'security_network_list_activate': {
    description: 'Activate network list to staging or production',
    inputSchema: z.object({
      networkListId: z.string(),
      network: z.enum(['STAGING', 'PRODUCTION']),
      comments: z.string().optional(),
      notificationRecipients: z.array(z.string()).optional(),
      customer: z.string().optional()
    }),
    handler: async (args: any): Promise<MCPToolResponse> => 
      consolidatedSecurityTools.activateNetworkList(args)
  },

  'security_network_list_activation_status': {
    description: 'Get network list activation status',
    inputSchema: z.object({
      networkListId: z.string(),
      activationId: z.number(),
      customer: z.string().optional()
    }),
    handler: async (args: any): Promise<MCPToolResponse> => 
      consolidatedSecurityTools.getNetworkListActivationStatus(args)
  },

  // Geographic and ASN operations
  'security_geo_validate': {
    description: 'Validate geographic codes',
    inputSchema: z.object({
      codes: z.array(z.string()),
      customer: z.string().optional()
    }),
    handler: async (args: any): Promise<MCPToolResponse> => 
      consolidatedSecurityTools.validateGeographicCodes(args)
  },

  'security_asn_info': {
    description: 'Get ASN information',
    inputSchema: z.object({
      asns: z.array(z.number()),
      customer: z.string().optional()
    }),
    handler: async (args: any): Promise<MCPToolResponse> => 
      consolidatedSecurityTools.getASNInformation(args)
  },

  // AppSec operations
  'security_appsec_list': {
    description: 'List Application Security configurations',
    inputSchema: z.object({
      contractId: z.string().optional(),
      groupId: z.number().optional(),
      customer: z.string().optional()
    }),
    handler: async (args: any): Promise<MCPToolResponse> => 
      consolidatedSecurityTools.listAppSecConfigurations(args)
  },

  'security_waf_create': {
    description: 'Create a new WAF policy',
    inputSchema: z.object({
      configId: z.number(),
      version: z.number(),
      policyName: z.string(),
      policyMode: z.enum(['ASE_AUTO', 'ASE_MANUAL', 'KRS']),
      paranoidLevel: z.number().optional(),
      customer: z.string().optional()
    }),
    handler: async (args: any): Promise<MCPToolResponse> => 
      consolidatedSecurityTools.createWAFPolicy(args)
  },

  'security_waf_update': {
    description: 'Update WAF policy settings',
    inputSchema: z.object({
      configId: z.number(),
      version: z.number(),
      policyId: z.string(),
      policyMode: z.enum(['ASE_AUTO', 'ASE_MANUAL', 'KRS']).optional(),
      paranoidLevel: z.number().optional(),
      ruleSets: z.array(z.string()).optional(),
      customer: z.string().optional()
    }),
    handler: async (args: any): Promise<MCPToolResponse> => 
      consolidatedSecurityTools.updateWAFPolicy(args)
  },

  'security_network_list_delete': {
    description: 'Delete a network list',
    inputSchema: z.object({
      networkListId: z.string(),
      confirm: z.boolean().describe('Confirm deletion'),
      customer: z.string().optional()
    }),
    handler: async (args: any): Promise<MCPToolResponse> => 
      consolidatedSecurityTools.deleteNetworkList(args)
  },

  'security_waf_delete': {
    description: 'Delete a WAF policy',
    inputSchema: z.object({
      configId: z.number(),
      version: z.number(),
      policyId: z.string(),
      confirm: z.boolean().describe('Confirm deletion'),
      customer: z.string().optional()
    }),
    handler: async (args: any): Promise<MCPToolResponse> => 
      consolidatedSecurityTools.deleteWAFPolicy(args)
  }
};

/**
 * Export individual tool handlers for backwards compatibility
 */
export const {
  listNetworkLists,
  getNetworkList,
  createNetworkList,
  updateNetworkList,
  deleteNetworkList,
  activateNetworkList,
  getNetworkListActivationStatus,
  validateGeographicCodes,
  getASNInformation,
  listAppSecConfigurations,
  createWAFPolicy,
  updateWAFPolicy,
  deleteWAFPolicy
} = consolidatedSecurityTools;

/**
 * Export the consolidated tools instance
 */
export { consolidatedSecurityTools };

/**
 * Security domain metadata for ALECSCore
 */
export const securityDomainMetadata = {
  name: 'security',
  description: 'Akamai Security - Network Lists, WAF, and AppSec',
  toolCount: Object.keys(securityTools).length,
  consolidationStats: {
    originalFiles: 6,
    consolidatedFiles: 2,
    errorReduction: 52,
    codeReduction: '55%'
  }
};