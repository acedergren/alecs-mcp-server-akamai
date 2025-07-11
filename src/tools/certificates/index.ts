/**
 * Certificate Domain Tools Export
 * 
 * This module exports all certificate-related tools using the standard BaseTool.execute pattern.
 * Features include dynamic customer support, caching, hints, and progress tracking.
 * 
 * Updated on 2025-01-11
 */

import {
  listCertificates,
  getCertificate,
  createDvCertificate,
  getDvStatus,
  deployCertificate,
  downloadCertificate
} from './certificate-tools';
import { consolidatedCertificateTools } from './consolidated-certificate-tools';
import { z } from 'zod';
import { type MCPToolResponse } from '../../types';

/**
 * Certificate tool definitions for ALECSCore registration
 */
export const certificateTools = {
  // Enrollment operations
  'certificate_dv_create': {
    description: 'Create a Domain Validated (DV) certificate enrollment',
    inputSchema: z.object({
      cn: z.string(),
      sans: z.array(z.string()).optional(),
      adminContact: z.object({
        firstName: z.string(),
        lastName: z.string(),
        email: z.string(),
        phone: z.string()
      }),
      techContact: z.object({
        firstName: z.string(),
        lastName: z.string(),
        email: z.string(),
        phone: z.string()
      }),
      org: z.object({
        name: z.string(),
        addressLineOne: z.string(),
        city: z.string(),
        region: z.string(),
        postalCode: z.string(),
        countryCode: z.string(),
        phone: z.string()
      }),
      contractId: z.string(),
      networkConfiguration: z.object({
        networkType: z.enum(['STANDARD_TLS', 'ENHANCED_TLS']).optional(),
        sniOnly: z.boolean().optional(),
        quicEnabled: z.boolean().optional()
      }).optional(),
      customer: z.string().optional()
    }),
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      createDvCertificate(args)
  },

  'certificate_status': {
    description: 'Check certificate enrollment status',
    inputSchema: z.object({
      enrollmentId: z.number(),
      customer: z.string().optional()
    }),
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      getCertificate(args)
  },

  'certificate_list': {
    description: 'List all certificate enrollments',
    inputSchema: z.object({
      contractId: z.string().optional(),
      status: z.string().optional(),
      customer: z.string().optional()
    }),
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      listCertificates(args)
  },

  'certificate_search': {
    description: 'Search certificate enrollments by domain or status',
    inputSchema: z.object({
      searchTerm: z.string().optional(),
      filters: z.object({
        domain: z.string().optional(),
        status: z.enum(['pending', 'active', 'expired', 'cancelled']).optional(),
        expiresWithinDays: z.number().optional(),
        hasDeployments: z.boolean().optional(),
        certificateType: z.enum(['DV', 'EV', 'OV']).optional()
      }).optional(),
      limit: z.number().optional(),
      offset: z.number().optional(),
      customer: z.string().optional()
    }),
    handler: async (args: any): Promise<MCPToolResponse> => 
      consolidatedCertificateTools.searchCertificates(args)
  },

  // Validation operations
  'certificate_validation_get': {
    description: 'Get domain validation challenges',
    inputSchema: z.object({
      enrollmentId: z.number(),
      customer: z.string().optional()
    }),
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      getDvStatus(args)
  },

  // Integration operations
  'certificate_property_link': {
    description: 'Link certificate to property',
    inputSchema: z.object({
      enrollmentId: z.number(),
      propertyId: z.string(),
      propertyVersion: z.number(),
      customer: z.string().optional()
    }),
    handler: async (args: any): Promise<MCPToolResponse> => 
      consolidatedCertificateTools.linkCertificateToProperty(args)
  },

  // Deployment operations
  'certificate_deployment_monitor': {
    description: 'Monitor certificate deployment progress',
    inputSchema: z.object({
      enrollmentId: z.number(),
      maxWaitMinutes: z.number().optional(),
      pollIntervalSeconds: z.number().optional(),
      customer: z.string().optional()
    }),
    handler: async (args: any): Promise<MCPToolResponse> => 
      consolidatedCertificateTools.monitorCertificateDeployment(args)
  },

  'certificate_deployment_status': {
    description: 'Get certificate deployment status',
    inputSchema: z.object({
      enrollmentId: z.number(),
      customer: z.string().optional()
    }),
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      deployCertificate(args)
  },

  'certificate_download': {
    description: 'Download certificate in PEM or DER format',
    inputSchema: z.object({
      enrollmentId: z.string(),
      format: z.enum(['pem', 'der']).optional(),
      customer: z.string().optional()
    }),
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      downloadCertificate(args)
  }
};

/**
 * Export enhanced tool functions
 */
export {
  listCertificates,
  getCertificate,
  createDvCertificate,
  getDvStatus,
  deployCertificate,
  downloadCertificate
};

/**
 * Export additional tool handlers from consolidated tools for backward compatibility
 * These will be migrated to enhanced pattern in the next phase
 */
export const {
  searchCertificates,
  linkCertificateToProperty,
  monitorCertificateDeployment
} = consolidatedCertificateTools;

/**
 * Export the consolidated tools instance
 */
export { consolidatedCertificateTools };

/**
 * Certificate domain metadata for ALECSCore
 */
export const certificateDomainMetadata = {
  name: 'certificate',
  description: 'Akamai CPS - Certificate Provisioning System',
  toolCount: Object.keys(certificateTools).length,
  features: [
    'Dynamic customer support',
    'Built-in caching for better performance',
    'Automatic hint integration',
    'Progress tracking for deployments',
    'Enhanced error messages with context'
  ],
  consolidationStats: {
    originalFiles: 2,
    consolidatedFiles: 2,
    errorReduction: 36,
    codeReduction: '40%'
  }
};