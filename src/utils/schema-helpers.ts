/**
 * Schema helper utilities for conditional parameter inclusion
 */

import { z, type ZodSchema, type ZodObject } from 'zod';
import { serverConfig } from './server-config';

/**
 * Wrap a schema to conditionally include the customer parameter
 * When customer override is disabled, the customer field is removed
 */
export function withOptionalCustomer<T extends ZodObject<any>>(
  baseSchema: T
): T {
  if (serverConfig.enableCustomerOverride) {
    // Customer override is enabled, return schema as-is
    return baseSchema;
  }

  // Customer override is disabled, remove the customer field
  const shape = baseSchema.shape;
  const { customer, ...restShape } = shape;
  
  // Create new schema without customer field
  return z.object(restShape) as T;
}

/**
 * Create a base parameters schema with optional customer
 */
export function createBaseParamsSchema() {
  const baseShape = {
    customer: z.string().optional().describe('Customer section name from .edgerc'),
  };

  if (!serverConfig.enableCustomerOverride) {
    // Remove customer field when override is disabled
    return z.object({});
  }

  return z.object(baseShape);
}

/**
 * Extend a schema with base parameters
 */
export function extendWithBaseParams<T extends Record<string, any>>(
  shape: T
): ZodObject<T & { customer?: any }> {
  const baseParams = createBaseParamsSchema();
  const baseShape = baseParams.shape;
  
  return z.object({
    ...baseShape,
    ...shape,
  }) as ZodObject<T & { customer?: any }>;
}