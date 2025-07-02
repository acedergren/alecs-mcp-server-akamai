/**
 * Zod Validation Schemas for Property Manager Advanced Tools
 * Generated from Akamai PAPI v1 OpenAPI Specification
 */

import { z } from 'zod';

// ============================================================================
// EDGE HOSTNAME SCHEMAS
// ============================================================================

export const EdgeHostnameListResponseSchema = z.object({
  accountId: z.string().optional(),
  contractId: z.string().optional(),
  groupId: z.string().optional(),
  edgeHostnames: z.object({
    items: z.array(z.object({
      edgeHostnameId: z.string(),
      edgeHostnameDomain: z.string(),
      productId: z.string(),
      domainPrefix: z.string(),
      domainSuffix: z.string(),
      secure: z.boolean(),
      ipVersionBehavior: z.string(),
      createdDate: z.string().optional(),
      createdBy: z.string().optional(),
      mapDetails: z.object({
        serialNumber: z.number().optional(),
        slotNumber: z.number().optional()
      }).optional()
    }).passthrough())
  })
});

export type EdgeHostnameListResponse = z.infer<typeof EdgeHostnameListResponseSchema>;

export const PropertyVersionDetailResponseSchema = z.object({
  propertyId: z.string(),
  propertyName: z.string(),
  accountId: z.string(),
  contractId: z.string(),
  groupId: z.string(),
  assetId: z.string().optional(),
  versions: z.object({
    items: z.array(z.object({
      propertyVersion: z.number(),
      updatedByUser: z.string(),
      updatedDate: z.string(),
      productionStatus: z.enum(['ACTIVE', 'INACTIVE', 'PENDING', 'DEACTIVATED']).optional(),
      stagingStatus: z.enum(['ACTIVE', 'INACTIVE', 'PENDING', 'DEACTIVATED']).optional(),
      etag: z.string().optional(),
      productId: z.string().optional(),
      ruleFormat: z.string().optional(),
      note: z.string().optional()
    }).passthrough())
  })
});

export type PropertyVersionDetailResponse = z.infer<typeof PropertyVersionDetailResponseSchema>;

export const PropertyHostnameListResponseSchema = z.object({
  accountId: z.string().optional(),
  contractId: z.string().optional(),
  groupId: z.string().optional(),
  propertyId: z.string(),
  propertyVersion: z.number(),
  etag: z.string().optional(),
  hostnames: z.object({
    items: z.array(z.object({
      cnameFrom: z.string(),
      cnameTo: z.string().optional(),
      cnameType: z.enum(['EDGE_HOSTNAME']).optional(),
      edgeHostnameId: z.string().optional(),
      certProvisioningType: z.enum(['DEFAULT', 'CPS_MANAGED']).optional(),
      certStatus: z.object({
        production: z.array(z.object({
          status: z.string()
        })).optional(),
        staging: z.array(z.object({
          status: z.string()
        })).optional()
      }).optional()
    }).passthrough())
  })
});

export type PropertyHostnameListResponse = z.infer<typeof PropertyHostnameListResponseSchema>;

export const ActivationCancelResponseSchema = z.object({
  activationLink: z.string()
});

export type ActivationCancelResponse = z.infer<typeof ActivationCancelResponseSchema>;

export const EdgeHostnameDetailResponseSchema = z.object({
  accountId: z.string().optional(),
  contractId: z.string().optional(),
  groupId: z.string().optional(),
  edgeHostnames: z.object({
    items: z.array(z.object({
      edgeHostnameId: z.string(),
      edgeHostnameDomain: z.string(),
      productId: z.string(),
      domainPrefix: z.string(),
      domainSuffix: z.string(),
      secure: z.boolean(),
      ipVersionBehavior: z.string(),
      createdDate: z.string().optional(),
      createdBy: z.string().optional(),
      recordName: z.string().optional(),
      dnsZone: z.string().optional(),
      securityType: z.string().optional()
    }).passthrough())
  })
});

export type EdgeHostnameDetailResponse = z.infer<typeof EdgeHostnameDetailResponseSchema>;