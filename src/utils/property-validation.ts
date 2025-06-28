/**
 * CODE KAI: Property Validation Utilities
 * Ensures properties exist and are accessible before operations
 * No shortcuts - comprehensive validation with helpful errors
 */

import { AkamaiClient } from '../akamai-client';
import { ToolError, BaseToolArgs } from '../types/tool-infrastructure';
import { validateApiResponse } from './api-response-validator';

/**
 * Property validation result with detailed information
 */
export interface PropertyValidationResult {
  exists: boolean;
  accessible: boolean;
  property?: {
    propertyId: string;
    propertyName: string;
    contractId: string;
    groupId: string;
    latestVersion: number;
    productionVersion?: number;
    stagingVersion?: number;
  };
  error?: {
    code: number;
    message: string;
    suggestion: string;
  };
}

/**
 * Validate property exists and user has access
 * CODE KAI: Comprehensive validation with clear error messages
 */
export async function validatePropertyAccess(
  client: AkamaiClient,
  propertyId: string,
  customer?: string
): Promise<PropertyValidationResult> {
  try {
    const response = await client.request({
      path: `/papi/v1/properties/${propertyId}`,
      method: 'GET',
      customer
    });

    const validated = validateApiResponse<{
      properties?: {
        items?: Array<{
          propertyId: string;
          propertyName: string;
          contractId: string;
          groupId: string;
          latestVersion: number;
          productionVersion?: number;
          stagingVersion?: number;
        }>;
      };
    }>(response);

    const property = validated.properties?.items?.[0];
    
    if (!property) {
      return {
        exists: false,
        accessible: false,
        error: {
          code: 404,
          message: `Property ${propertyId} not found in response`,
          suggestion: 'Verify the property ID is correct'
        }
      };
    }

    return {
      exists: true,
      accessible: true,
      property
    };
  } catch (error: any) {
    // Detailed error analysis for better user experience
    const statusCode = error.response?.status;
    
    if (statusCode === 404) {
      return {
        exists: false,
        accessible: false,
        error: {
          code: 404,
          message: `Property ${propertyId} not found`,
          suggestion: 'Check if the property ID is correct or if it has been deleted'
        }
      };
    }
    
    if (statusCode === 403) {
      return {
        exists: true, // Property likely exists but no access
        accessible: false,
        error: {
          code: 403,
          message: `Access denied to property ${propertyId}`,
          suggestion: customer 
            ? `Verify that customer '${customer}' has access to this property`
            : 'Try specifying a customer parameter or check your API credentials'
        }
      };
    }
    
    if (statusCode === 401) {
      return {
        exists: false,
        accessible: false,
        error: {
          code: 401,
          message: 'Authentication failed',
          suggestion: 'Check your API credentials in .edgerc file'
        }
      };
    }

    // Unknown error
    return {
      exists: false,
      accessible: false,
      error: {
        code: statusCode || 0,
        message: error.message || 'Unknown error occurred',
        suggestion: 'Check network connectivity and API status'
      }
    };
  }
}

/**
 * Wrapper for property operations with validation
 * CODE KAI: Ensures property exists before attempting operations
 */
export async function withPropertyValidation<T>(
  client: AkamaiClient,
  args: BaseToolArgs & { propertyId: string },
  toolName: string,
  operation: string,
  handler: () => Promise<T>
): Promise<T> {
  // First validate property access
  const validation = await validatePropertyAccess(
    client,
    args.propertyId,
    args.customer
  );

  if (!validation.exists) {
    throw new ToolError({
      operation,
      toolName,
      args,
      propertyId: args.propertyId,
      customer: args.customer,
      suggestion: validation.error?.suggestion || 'Property does not exist'
    });
  }

  if (!validation.accessible) {
    throw new ToolError({
      operation,
      toolName,
      args,
      propertyId: args.propertyId,
      customer: args.customer,
      suggestion: validation.error?.suggestion || 'No access to property'
    });
  }

  // Property is valid and accessible, proceed with operation
  try {
    return await handler();
  } catch (error: any) {
    // Wrap errors with context
    throw new ToolError({
      operation,
      toolName,
      args,
      propertyId: args.propertyId,
      customer: args.customer,
      originalError: error,
      suggestion: getOperationErrorSuggestion(operation, error)
    });
  }
}

/**
 * Get helpful suggestions based on operation and error
 */
function getOperationErrorSuggestion(operation: string, error: any): string {
  const statusCode = error.response?.status;
  
  if (statusCode === 400) {
    if (operation.includes('activate')) {
      return 'Check if the property version has validation errors before activation';
    }
    if (operation.includes('hostname')) {
      return 'Verify hostname format and edge hostname configuration';
    }
    return 'Check request parameters for correct format and values';
  }
  
  if (statusCode === 409) {
    if (operation.includes('activate')) {
      return 'Property may already have a pending activation';
    }
    if (operation.includes('create')) {
      return 'Resource may already exist with the same name';
    }
    return 'Operation conflicts with current resource state';
  }
  
  if (statusCode === 422) {
    return 'Property configuration may be invalid. Run validation first';
  }
  
  if (error.message?.includes('timeout')) {
    return 'Operation timed out. Try again or check API status';
  }
  
  return 'Check API documentation for this operation';
}

/**
 * Batch property validation for multiple properties
 * CODE KAI: Efficient validation with parallel requests
 */
export async function validateMultipleProperties(
  client: AkamaiClient,
  propertyIds: string[],
  customer?: string
): Promise<Map<string, PropertyValidationResult>> {
  const results = new Map<string, PropertyValidationResult>();
  
  // Validate in parallel for efficiency
  const validations = await Promise.all(
    propertyIds.map(async (propertyId) => ({
      propertyId,
      result: await validatePropertyAccess(client, propertyId, customer)
    }))
  );
  
  validations.forEach(({ propertyId, result }) => {
    results.set(propertyId, result);
  });
  
  return results;
}

/**
 * Get property context for error messages
 */
export function getPropertyContext(
  property: PropertyValidationResult['property']
): string {
  if (!property) return '';
  
  const parts = [
    `Property: ${property.propertyName} (${property.propertyId})`,
    `Contract: ${property.contractId}`,
    `Group: ${property.groupId}`,
    `Latest Version: ${property.latestVersion}`
  ];
  
  if (property.productionVersion) {
    parts.push(`Production: v${property.productionVersion}`);
  }
  
  if (property.stagingVersion) {
    parts.push(`Staging: v${property.stagingVersion}`);
  }
  
  return parts.join('\\n');
}