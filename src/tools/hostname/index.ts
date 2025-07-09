/**
 * Hostname Domain Tools Export
 * 
 * This module exports all hostname management tools for use with ALECSCore.
 * Provides intelligent hostname discovery, conflict analysis, and provisioning.
 */

import { consolidatedHostnameTools } from './consolidated-hostname-tools';
import { z } from 'zod';
import { type MCPToolResponse } from '../../types';

/**
 * Hostname tool definitions for ALECSCore registration
 */
export const hostnameTools = {
  // Discovery and analysis
  'hostname_discover_intelligent': {
    description: 'Discover hostnames intelligently across properties',
    inputSchema: z.object({
      searchPattern: z.string().optional(),
      groupId: z.string().optional(),
      contractId: z.string().optional(),
      includeVersions: z.boolean().optional(),
      maxResults: z.number().optional(),
      customer: z.string().optional()
    }),
    handler: async (args: any): Promise<MCPToolResponse> => 
      consolidatedHostnameTools.discoverHostnamesIntelligent(args)
  },

  'hostname_analyze_conflicts': {
    description: 'Analyze hostname conflicts and overlaps',
    inputSchema: z.object({
      hostnames: z.array(z.string()).min(1),
      checkGlobal: z.boolean().optional(),
      includeRecommendations: z.boolean().optional(),
      customer: z.string().optional()
    }),
    handler: async (args: any): Promise<MCPToolResponse> => 
      consolidatedHostnameTools.analyzeHostnameConflicts(args)
  },

  'hostname_analyze_wildcard_coverage': {
    description: 'Analyze wildcard hostname coverage',
    inputSchema: z.object({
      baseHostname: z.string(),
      checkDepth: z.number().optional(),
      includeExisting: z.boolean().optional(),
      customer: z.string().optional()
    }),
    handler: async (args: any): Promise<MCPToolResponse> => 
      consolidatedHostnameTools.analyzeWildcardCoverage(args)
  },

  'hostname_identify_ownership_patterns': {
    description: 'Identify hostname ownership patterns',
    inputSchema: z.object({
      groupId: z.string().optional(),
      contractId: z.string().optional(),
      analysisType: z.enum(['by_property', 'by_domain', 'by_certificate']).optional(),
      customer: z.string().optional()
    }),
    handler: async (args: any): Promise<MCPToolResponse> => 
      consolidatedHostnameTools.identifyOwnershipPatterns(args)
  },


  'hostname_validate_bulk': {
    description: 'Validate hostnames in bulk',
    inputSchema: z.object({
      hostnames: z.array(z.string()).min(1).max(1000),
      validationChecks: z.array(z.enum(['dns', 'certificate', 'conflict', 'ownership'])).optional(),
      customer: z.string().optional()
    }),
    handler: async (args: any): Promise<MCPToolResponse> => 
      consolidatedHostnameTools.validateHostnamesBulk(args)
  }
};

/**
 * Export individual tool handlers for backwards compatibility
 */
export const {
  discoverHostnamesIntelligent,
  analyzeHostnameConflicts,
  analyzeWildcardCoverage,
  identifyOwnershipPatterns,
  validateHostnamesBulk
} = consolidatedHostnameTools;

/**
 * Export the consolidated tools instance
 */
export { consolidatedHostnameTools };

/**
 * Hostname domain metadata
 */
export const hostnameDomainMetadata = {
  name: 'hostname',
  description: 'Akamai Hostname Management - Discovery and analysis',
  toolCount: Object.keys(hostnameTools).length,
  features: [
    'Intelligent hostname discovery across properties',
    'Conflict detection and analysis',
    'Wildcard coverage analysis',
    'Ownership pattern identification',
    'Bulk hostname validation'
  ]
};