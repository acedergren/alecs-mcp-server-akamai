/**
 * Property Domain Schemas - Zod validation schemas
 * 
 * Provides runtime validation for all property operations
 */

import { z } from 'zod';

/**
 * ID validation schemas
 */
export const PropertyIdSchema = z.string()
  .regex(/^prp_\d+$/)
  .or(z.string().regex(/^\d+$/))
  .transform(id => id.startsWith('prp_') ? id : `prp_${id}`);

export const ContractIdSchema = z.string()
  .regex(/^ctr_[A-Z0-9-]+$/i)
  .or(z.string())
  .transform(id => id.startsWith('ctr_') ? id : `ctr_${id}`);

export const GroupIdSchema = z.string()
  .regex(/^grp_\d+$/)
  .or(z.string().regex(/^\d+$/))
  .transform(id => id.startsWith('grp_') ? id : `grp_${id}`);

export const ProductIdSchema = z.string()
  .regex(/^prd_[A-Z0-9_-]+$/i)
  .or(z.string())
  .transform(id => id.startsWith('prd_') ? id : `prd_${id}`);

export const NetworkSchema = z.enum(['staging', 'production', 'STAGING', 'PRODUCTION'])
  .transform(n => n.toUpperCase() as 'STAGING' | 'PRODUCTION');

export const ActivationIdSchema = z.string()
  .regex(/^atv_\d+$/)
  .or(z.string().regex(/^\d+$/))
  .transform(id => id.startsWith('atv_') ? id : `atv_${id}`);

/**
 * Operation parameter schemas
 */
export const ListPropertiesSchema = z.object({
  contractId: ContractIdSchema.optional(),
  groupId: GroupIdSchema.optional(),
  customer: z.string().default('default'),
  limit: z.number().min(1).max(1000).optional(),
  offset: z.number().min(0).optional(),
});

export const GetPropertySchema = z.object({
  propertyId: PropertyIdSchema,
  customer: z.string().default('default'),
  contractId: ContractIdSchema.optional(),
  groupId: GroupIdSchema.optional(),
});

export const CreatePropertySchema = z.object({
  propertyName: z.string()
    .min(1, 'Property name is required')
    .max(85, 'Property name must be 85 characters or less'),
  productId: ProductIdSchema,
  contractId: ContractIdSchema,
  groupId: GroupIdSchema,
  customer: z.string().default('default'),
  ruleFormat: z.string().optional(),
  cpCodeId: z.string().optional(),
});

export const CreateVersionSchema = z.object({
  propertyId: PropertyIdSchema,
  createFromVersion: z.number().positive().optional(),
  createFromEtag: z.string().optional(),
  customer: z.string().default('default'),
});

export const GetVersionSchema = z.object({
  propertyId: PropertyIdSchema,
  version: z.number().positive(),
  customer: z.string().default('default'),
});

export const GetRulesSchema = z.object({
  propertyId: PropertyIdSchema,
  version: z.number().positive(),
  validateRules: z.boolean().default(false),
  customer: z.string().default('default'),
});

export const UpdateRulesSchema = z.object({
  propertyId: PropertyIdSchema,
  version: z.number().positive(),
  rules: z.object({
    rules: z.object({
      name: z.string(),
      children: z.array(z.any()).optional(),
      behaviors: z.array(z.any()).optional(),
      criteria: z.array(z.any()).optional(),
      criteriaMustSatisfy: z.enum(['all', 'any']).optional(),
    }),
    ruleFormat: z.string().optional(),
  }),
  validateRules: z.boolean().default(true),
  customer: z.string().default('default'),
});

export const ActivatePropertySchema = z.object({
  propertyId: PropertyIdSchema,
  version: z.number().positive(),
  network: NetworkSchema,
  note: z.string().optional(),
  emails: z.array(z.string().email()).optional(),
  acknowledgeWarnings: z.boolean().default(true),
  customer: z.string().default('default'),
});

export const GetActivationSchema = z.object({
  propertyId: PropertyIdSchema,
  activationId: ActivationIdSchema,
  customer: z.string().default('default'),
});

export const CancelActivationSchema = z.object({
  propertyId: PropertyIdSchema,
  activationId: ActivationIdSchema,
  customer: z.string().default('default'),
});

export const DeletePropertySchema = z.object({
  propertyId: PropertyIdSchema,
  customer: z.string().default('default'),
});

export const ListVersionsSchema = z.object({
  propertyId: PropertyIdSchema,
  customer: z.string().default('default'),
});

export const ListActivationsSchema = z.object({
  propertyId: PropertyIdSchema,
  customer: z.string().default('default'),
});

export const ListContractsSchema = z.object({
  customer: z.string().default('default'),
});

export const ListGroupsSchema = z.object({
  customer: z.string().default('default'),
});

export const ListProductsSchema = z.object({
  contractId: ContractIdSchema,
  customer: z.string().default('default'),
});

/**
 * Response validation schemas
 */
export const PropertySchema = z.object({
  propertyId: z.string(),
  propertyName: z.string(),
  accountId: z.string(),
  contractId: z.string(),
  groupId: z.string(),
  assetId: z.string().optional(),
  latestVersion: z.number(),
  stagingVersion: z.number().nullable().optional(),
  productionVersion: z.number().nullable().optional(),
  productId: z.string().optional(),
  ruleFormat: z.string().optional(),
  note: z.string().optional(),
});

export const PropertyVersionSchema = z.object({
  propertyId: z.string(),
  propertyVersion: z.number(),
  contractId: z.string(),
  groupId: z.string(),
  propertyName: z.string(),
  updatedByUser: z.string(),
  updatedDate: z.string(),
  productionStatus: z.enum(['ACTIVE', 'INACTIVE', 'PENDING', 'DEACTIVATED', 'FAILED', 'ABORTED']),
  stagingStatus: z.enum(['ACTIVE', 'INACTIVE', 'PENDING', 'DEACTIVATED', 'FAILED', 'ABORTED']),
  etag: z.string(),
  ruleFormat: z.string(),
  note: z.string().optional(),
});

export const PropertyActivationSchema = z.object({
  activationId: z.string(),
  propertyId: z.string(),
  propertyVersion: z.number(),
  network: z.enum(['STAGING', 'PRODUCTION']),
  activationType: z.enum(['ACTIVATE', 'DEACTIVATE']),
  status: z.enum(['ACTIVE', 'INACTIVE', 'PENDING', 'DEACTIVATED', 'FAILED', 'ABORTED']),
  submitDate: z.string(),
  updateDate: z.string(),
  note: z.string().optional(),
  notifyEmails: z.array(z.string()),
  fallbackInfo: z.object({
    fastFallbackAttempted: z.boolean(),
    fallbackVersion: z.number(),
    canFastFallback: z.boolean(),
    steadyStateTime: z.number(),
    fastFallbackExpirationTime: z.number(),
    fastFallbackRecoveryState: z.enum(['RECOVERY_PREPARE', 'RECOVERY_CONVERGE', 'RECOVERY_COMPLETE']).optional(),
  }).optional(),
});

/**
 * Validation helpers
 */
export function validatePropertyName(name: string): { valid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'Property name is required' };
  }
  
  if (name.length > 85) {
    return { valid: false, error: 'Property name must be 85 characters or less' };
  }
  
  // Check for invalid characters
  if (!/^[a-zA-Z0-9\s\-_.]+$/.test(name)) {
    return { valid: false, error: 'Property name contains invalid characters' };
  }
  
  return { valid: true };
}

export function validateEmails(emails: string[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  for (const email of emails) {
    if (!emailRegex.test(email)) {
      errors.push(`Invalid email: ${email}`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}