/**
 * Property Manager - Create Property Request Template
 * 
 * This template provides a type-safe way to build property creation requests
 * with validation and error handling.
 */

import { z } from 'zod';

// Validation schema for property creation
export const CreatePropertySchema = z.object({
  customer: z.string().optional(),
  contractId: z.string().regex(/^ctr_[A-Z0-9-]+$/, 'Contract ID must match pattern ctr_*'),
  groupId: z.string().regex(/^grp_[0-9]+$/, 'Group ID must match pattern grp_*'),
  propertyName: z.string()
    .min(1, 'Property name is required')
    .max(85, 'Property name must be 85 characters or less')
    .regex(/^[a-zA-Z0-9\-_.]+$/, 'Property name contains invalid characters'),
  productId: z.string().regex(/^prd_[A-Z0-9_]+$/, 'Product ID must match pattern prd_*'),
  ruleFormat: z.string()
    .regex(/^v\d{4}-\d{2}-\d{2}$/, 'Rule format must be in format vYYYY-MM-DD')
    .optional()
    .default('v2023-10-30')
});

export type CreatePropertyParams = z.infer<typeof CreatePropertySchema>;

export interface CreatePropertyResponse {
  propertyLink: string;
}

/**
 * Template class for creating properties
 */
export class PropertyCreateTemplate {
  private params: CreatePropertyParams;

  constructor(params: CreatePropertyParams) {
    // Validate parameters
    this.params = CreatePropertySchema.parse(params);
  }

  /**
   * Build the complete request configuration
   */
  buildRequest(): {
    url: string;
    method: string;
    headers: Record<string, string>;
    queryParams: Record<string, string>;
    body: Record<string, any>;
  } {
    return {
      url: '/papi/v1/properties',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'PAPI-Use-Prefixes': 'true'
      },
      queryParams: {
        contractId: this.params.contractId,
        groupId: this.params.groupId
      },
      body: {
        productId: this.params.productId,
        propertyName: this.params.propertyName,
        ruleFormat: this.params.ruleFormat
      }
    };
  }

  /**
   * Extract property ID from response
   */
  parseResponse(response: CreatePropertyResponse): string {
    const linkParts = response.propertyLink.split('/');
    const propertyPart = linkParts.find(part => part.startsWith('prp_'));
    
    if (!propertyPart) {
      throw new Error('Could not extract property ID from response');
    }

    // Remove query parameters if present
    return propertyPart.split('?')[0];
  }

  /**
   * Generate curl command for testing
   */
  toCurl(baseUrl: string): string {
    const request = this.buildRequest();
    const url = new URL(request.url, baseUrl);
    
    Object.entries(request.queryParams).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    const headers = Object.entries(request.headers)
      .map(([key, value]) => `-H "${key}: ${value}"`)
      .join(' ');

    return `curl -X ${request.method} "${url.toString()}" ${headers} -d '${JSON.stringify(request.body, null, 2)}'`;
  }

  /**
   * Validate that required resources exist
   */
  async validatePrerequisites(client: any): Promise<{valid: boolean; errors: string[]}> {
    const errors: string[] = [];

    try {
      // Check if contract exists and user has access
      const contracts = await client.listContracts(this.params.customer);
      const contractExists = contracts.some((c: any) => c.contractId === this.params.contractId);
      
      if (!contractExists) {
        errors.push(`Contract ${this.params.contractId} not found or not accessible`);
      }

      // Check if group exists in the contract
      const groups = await client.listGroups({
        customer: this.params.customer,
        contractId: this.params.contractId
      });
      const groupExists = groups.some((g: any) => g.groupId === this.params.groupId);
      
      if (!groupExists) {
        errors.push(`Group ${this.params.groupId} not found in contract ${this.params.contractId}`);
      }

      // Check if product is available
      const products = await client.listProducts({
        customer: this.params.customer,
        contractId: this.params.contractId
      });
      const productExists = products.some((p: any) => p.productId === this.params.productId);
      
      if (!productExists) {
        errors.push(`Product ${this.params.productId} not available in contract ${this.params.contractId}`);
      }

      // Check if property name is unique (optional check)
      try {
        const existingProperties = await client.listProperties({
          customer: this.params.customer,
          contractId: this.params.contractId,
          groupId: this.params.groupId
        });
        
        const nameExists = existingProperties.some(
          (p: any) => p.propertyName.toLowerCase() === this.params.propertyName.toLowerCase()
        );
        
        if (nameExists) {
          errors.push(`Property name '${this.params.propertyName}' already exists in this group`);
        }
      } catch (error) {
        // Property name check is optional - don't fail if we can't check
        console.warn('Could not verify property name uniqueness:', error);
      }

    } catch (error) {
      errors.push(`Validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

/**
 * Convenience function for simple property creation
 */
export function createPropertyRequest(params: CreatePropertyParams) {
  return new PropertyCreateTemplate(params);
}

/**
 * Example usage:
 * 
 * ```typescript
 * const propertyTemplate = new PropertyCreateTemplate({
 *   customer: 'customer1',
 *   contractId: 'ctr_C-1FRYVMN',
 *   groupId: 'grp_68817',
 *   propertyName: 'new-example.com',
 *   productId: 'prd_SPM'
 * });
 * 
 * // Validate prerequisites
 * const validation = await propertyTemplate.validatePrerequisites(client);
 * if (!validation.valid) {
 *   throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
 * }
 * 
 * // Execute request
 * const request = propertyTemplate.buildRequest();
 * const response = await client.request(request);
 * const propertyId = propertyTemplate.parseResponse(response);
 * ```
 */