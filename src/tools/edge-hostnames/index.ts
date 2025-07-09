/**
 * Edge Hostname Domain Tools Export
 * 
 * This module exports all edge hostname-related tools for use with ALECSCore.
 * It provides comprehensive edge hostname management functionality.
 */

import { consolidatedEdgeHostnameTools } from './consolidated-edge-hostname-tools';
import { z } from 'zod';
import { type MCPToolResponse } from '../../types';

/**
 * Edge hostname tool definitions for ALECSCore registration
 */
export const edgeHostnameTools = {
  // Core operations
  'edge_hostname_create': {
    description: 'Create a new edge hostname',
    inputSchema: z.object({
      domainPrefix: z.string(),
      domainSuffix: z.string().optional(),
      secureNetwork: z.enum(['ENHANCED_TLS', 'STANDARD_TLS', 'SHARED_CERT']).optional(),
      ipVersionBehavior: z.enum(['IPV4', 'IPV6_PERFORMANCE', 'IPV6_COMPLIANCE']).optional(),
      certificateEnrollmentId: z.number().optional(),
      slotNumber: z.number().optional(),
      comments: z.string().optional(),
      customer: z.string().optional()
    }),
    handler: async (args: any): Promise<MCPToolResponse> => 
      consolidatedEdgeHostnameTools.createEdgeHostname(args)
  },

  'edge_hostname_list': {
    description: 'List edge hostnames',
    inputSchema: z.object({
      contractId: z.string().optional(),
      groupId: z.string().optional(),
      options: z.array(z.string()).optional(),
      customer: z.string().optional()
    }),
    handler: async (args: any): Promise<MCPToolResponse> => 
      consolidatedEdgeHostnameTools.listEdgeHostnames(args)
  },

  'edge_hostname_get': {
    description: 'Get edge hostname details',
    inputSchema: z.object({
      edgeHostnameId: z.number(),
      options: z.array(z.string()).optional(),
      customer: z.string().optional()
    }),
    handler: async (args: any): Promise<MCPToolResponse> => 
      consolidatedEdgeHostnameTools.getEdgeHostname(args)
  },

  // Bulk operations
  'edge_hostname_bulk_create': {
    description: 'Create multiple edge hostnames in bulk',
    inputSchema: z.object({
      hostnames: z.array(z.object({
        domainPrefix: z.string(),
        domainSuffix: z.string().optional(),
        secureNetwork: z.enum(['ENHANCED_TLS', 'STANDARD_TLS', 'SHARED_CERT']).optional(),
        certificateEnrollmentId: z.number().optional()
      })),
      customer: z.string().optional()
    }),
    handler: async (args: any): Promise<MCPToolResponse> => 
      consolidatedEdgeHostnameTools.createBulkEdgeHostnames(args)
  },

  // Certificate operations
  'edge_hostname_certificate_associate': {
    description: 'Associate certificate with edge hostname',
    inputSchema: z.object({
      edgeHostnameId: z.number(),
      certificateEnrollmentId: z.number(),
      customer: z.string().optional()
    }),
    handler: async (args: any): Promise<MCPToolResponse> => 
      consolidatedEdgeHostnameTools.associateCertificateWithEdgeHostname(args)
  },

  'edge_hostname_certificate_validate': {
    description: 'Validate edge hostname certificate',
    inputSchema: z.object({
      edgeHostnameId: z.number(),
      customer: z.string().optional()
    }),
    handler: async (args: any): Promise<MCPToolResponse> => 
      consolidatedEdgeHostnameTools.validateEdgeHostnameCertificate(args)
  },

  // Recommendations
  'edge_hostname_recommendations': {
    description: 'Generate edge hostname recommendations',
    inputSchema: z.object({
      propertyId: z.string().optional(),
      hostnames: z.array(z.string()),
      customer: z.string().optional()
    }),
    handler: async (args: any): Promise<MCPToolResponse> => 
      consolidatedEdgeHostnameTools.generateEdgeHostnameRecommendations(args)
  }
};

/**
 * Export individual tool handlers for backwards compatibility
 */
export const {
  createEdgeHostname,
  listEdgeHostnames,
  getEdgeHostname,
  createBulkEdgeHostnames,
  associateCertificateWithEdgeHostname,
  validateEdgeHostnameCertificate,
  generateEdgeHostnameRecommendations
} = consolidatedEdgeHostnameTools;

/**
 * Export the consolidated tools instance
 */
export { consolidatedEdgeHostnameTools };

/**
 * Edge hostname domain metadata
 */
export const edgeHostnameDomainMetadata = {
  name: 'edge-hostname',
  description: 'Akamai Edge Hostname Management - DNS and certificate integration',
  toolCount: Object.keys(edgeHostnameTools).length,
  features: [
    'Edge hostname creation and management',
    'Bulk operations for scale',
    'Certificate association and validation',
    'Intelligent recommendations',
    'DNS integration support'
  ]
};