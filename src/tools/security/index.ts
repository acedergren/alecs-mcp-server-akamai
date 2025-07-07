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
  'security.network-lists.list': {
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

  'security.network-list.get': {
    description: 'Get network list details',
    inputSchema: z.object({
      networkListId: z.string(),
      includeElements: z.boolean().optional(),
      customer: z.string().optional()
    }),
    handler: async (args: any): Promise<MCPToolResponse> => 
      consolidatedSecurityTools.getNetworkList(args)
  },

  'security.network-list.create': {
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

  'security.network-list.update': {
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

  'security.network-list.activate': {
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

  'security.network-list.activation-status': {
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
  'security.geo.validate': {
    description: 'Validate geographic codes',
    inputSchema: z.object({
      codes: z.array(z.string()),
      customer: z.string().optional()
    }),
    handler: async (args: any): Promise<MCPToolResponse> => 
      consolidatedSecurityTools.validateGeographicCodes(args)
  },

  'security.asn.info': {
    description: 'Get ASN information',
    inputSchema: z.object({
      asns: z.array(z.number()),
      customer: z.string().optional()
    }),
    handler: async (args: any): Promise<MCPToolResponse> => 
      consolidatedSecurityTools.getASNInformation(args)
  },

  // AppSec operations
  'security.appsec.list': {
    description: 'List Application Security configurations',
    inputSchema: z.object({
      contractId: z.string().optional(),
      groupId: z.number().optional(),
      customer: z.string().optional()
    }),
    handler: async (args: any): Promise<MCPToolResponse> => 
      consolidatedSecurityTools.listAppSecConfigurations(args)
  },

  'security.waf.create': {
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
  activateNetworkList,
  getNetworkListActivationStatus,
  validateGeographicCodes,
  getASNInformation,
  listAppSecConfigurations,
  createWAFPolicy
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