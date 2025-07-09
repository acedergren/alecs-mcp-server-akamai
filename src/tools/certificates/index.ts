/**
 * Certificate Domain Tools Export
 * 
 * This module exports all certificate-related tools for use with ALECSCore.
 * It consolidates DV certificate enrollment, validation, and deployment
 * functionality into a clean interface.
 */

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
    handler: async (args: any): Promise<MCPToolResponse> => 
      consolidatedCertificateTools.createDVEnrollment(args)
  },

  'certificate_status': {
    description: 'Check certificate enrollment status',
    inputSchema: z.object({
      enrollmentId: z.number(),
      customer: z.string().optional()
    }),
    handler: async (args: any): Promise<MCPToolResponse> => 
      consolidatedCertificateTools.checkDVEnrollmentStatus(args)
  },

  'certificate_list': {
    description: 'List all certificate enrollments',
    inputSchema: z.object({
      contractId: z.string().optional(),
      status: z.string().optional(),
      customer: z.string().optional()
    }),
    handler: async (args: any): Promise<MCPToolResponse> => 
      consolidatedCertificateTools.listCertificateEnrollments(args)
  },

  // Validation operations
  'certificate_validation_get': {
    description: 'Get domain validation challenges',
    inputSchema: z.object({
      enrollmentId: z.number(),
      customer: z.string().optional()
    }),
    handler: async (args: any): Promise<MCPToolResponse> => 
      consolidatedCertificateTools.getDVValidationChallenges(args)
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
    handler: async (args: any): Promise<MCPToolResponse> => 
      consolidatedCertificateTools.getCertificateDeploymentStatus(args)
  }
};

/**
 * Export individual tool handlers for backwards compatibility
 */
export const {
  createDVEnrollment,
  checkDVEnrollmentStatus,
  getDVValidationChallenges,
  linkCertificateToProperty,
  monitorCertificateDeployment,
  getCertificateDeploymentStatus,
  listCertificateEnrollments
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
  consolidationStats: {
    originalFiles: 2,
    consolidatedFiles: 2,
    errorReduction: 36,
    codeReduction: '40%'
  }
};