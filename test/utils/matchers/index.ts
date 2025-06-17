/**
 * Custom Jest matchers for Akamai MCP Server testing
 */

import { z } from 'zod';

/**
 * Check if response is a valid Akamai API response
 */
export function toBeValidAkamaiResponse(received: any) {
  const pass = 
    received !== null &&
    typeof received === 'object' &&
    !('error' in received && received.error);

  return {
    pass,
    message: () =>
      pass
        ? `expected ${JSON.stringify(received)} not to be a valid Akamai response`
        : `expected ${JSON.stringify(received)} to be a valid Akamai response`,
  };
}

/**
 * Check if response is a valid MCP response
 */
export function toBeValidMcpResponse(received: any) {
  const isValid = 
    received !== null &&
    typeof received === 'object' &&
    'success' in received &&
    typeof received.success === 'boolean';

  return {
    pass: isValid,
    message: () =>
      isValid
        ? `expected ${JSON.stringify(received)} not to be a valid MCP response`
        : `expected ${JSON.stringify(received)} to be a valid MCP response (must have 'success' boolean field)`,
  };
}

/**
 * Check if response matches an Akamai schema
 */
export function toMatchAkamaiSchema(received: any, schema: any) {
  let isValid = true;
  let errors: string[] = [];

  try {
    // If it's a Zod schema, use parse
    if (schema && typeof schema.parse === 'function') {
      schema.parse(received);
    } else {
      // Basic schema validation
      for (const [key, type] of Object.entries(schema)) {
        if (!(key in received)) {
          isValid = false;
          errors.push(`Missing required field: ${key}`);
        } else if (typeof received[key] !== type) {
          isValid = false;
          errors.push(`Field ${key} should be ${type}, got ${typeof received[key]}`);
        }
      }
    }
  } catch (error) {
    isValid = false;
    if (error instanceof z.ZodError) {
      errors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
    } else {
      errors = [error instanceof Error ? error.message : String(error)];
    }
  }

  return {
    pass: isValid,
    message: () =>
      isValid
        ? `expected response not to match schema`
        : `expected response to match schema. Errors: ${errors.join(', ')}`,
  };
}

/**
 * Check if request has valid EdgeGrid authentication
 */
export function toHaveValidEdgeGridAuth(received: any) {
  const hasAuth = 
    received?.headers?.Authorization &&
    received.headers.Authorization.startsWith('EG1-HMAC-SHA256') &&
    received.headers.Authorization.includes('client_token=') &&
    received.headers.Authorization.includes('access_token=') &&
    received.headers.Authorization.includes('signature=');

  return {
    pass: hasAuth,
    message: () =>
      hasAuth
        ? `expected request not to have valid EdgeGrid authentication`
        : `expected request to have valid EdgeGrid authentication headers`,
  };
}

/**
 * Check if response is a valid Property response
 */
export function toBeValidPropertyResponse(received: any) {
  const requiredFields = ['propertyId', 'propertyName', 'contractId', 'groupId'];
  const hasRequiredFields = requiredFields.every(field => field in received);
  
  const validPropertyId = 
    typeof received?.propertyId === 'string' && 
    received.propertyId.startsWith('prp_');

  return {
    pass: hasRequiredFields && validPropertyId,
    message: () =>
      hasRequiredFields && validPropertyId
        ? `expected response not to be a valid property response`
        : `expected response to be a valid property response with fields: ${requiredFields.join(', ')}`,
  };
}

/**
 * Check if response is a valid DNS response
 */
export function toBeValidDnsResponse(received: any) {
  const isZoneResponse = 'zone' in received && 'type' in received;
  const isRecordResponse = 'name' in received && 'type' in received && 'rdata' in received;
  
  const isValid = isZoneResponse || isRecordResponse;

  return {
    pass: isValid,
    message: () =>
      isValid
        ? `expected response not to be a valid DNS response`
        : `expected response to be a valid DNS zone or record response`,
  };
}

/**
 * Check if response is a valid activation response
 */
export function toBeValidActivationResponse(received: any) {
  const requiredFields = ['activationId', 'propertyId', 'version', 'network', 'status'];
  const hasRequiredFields = requiredFields.every(field => field in received);
  
  const validNetwork = ['STAGING', 'PRODUCTION'].includes(received?.network);
  const validStatus = [
    'ACTIVE', 'INACTIVE', 'PENDING', 'ZONE_1', 'ZONE_2', 'ZONE_3', 
    'ABORTED', 'FAILED', 'DEACTIVATED'
  ].includes(received?.status);

  return {
    pass: hasRequiredFields && validNetwork && validStatus,
    message: () =>
      hasRequiredFields && validNetwork && validStatus
        ? `expected response not to be a valid activation response`
        : `expected response to be a valid activation response with valid network and status`,
  };
}

/**
 * Check if object contains required fields
 */
export function toContainRequiredFields(received: any, fields: string[]) {
  const missingFields = fields.filter(field => !(field in received));
  const hasMissingFields = missingFields.length > 0;

  return {
    pass: !hasMissingFields,
    message: () =>
      !hasMissingFields
        ? `expected object not to contain all required fields`
        : `expected object to contain required fields. Missing: ${missingFields.join(', ')}`,
  };
}

/**
 * Check if response has specific status code
 */
export function toHaveStatusCode(received: any, expectedCode: number) {
  const actualCode = received?.status || received?.statusCode;
  const hasCorrectCode = actualCode === expectedCode;

  return {
    pass: hasCorrectCode,
    message: () =>
      hasCorrectCode
        ? `expected response not to have status code ${expectedCode}`
        : `expected response to have status code ${expectedCode}, but got ${actualCode}`,
  };
}

/**
 * Check if value matches Zod schema
 */
export function toBeValidZodSchema(received: any, schema: z.ZodSchema) {
  let isValid = true;
  let errors: string[] = [];

  try {
    schema.parse(received);
  } catch (error) {
    isValid = false;
    if (error instanceof z.ZodError) {
      errors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
    }
  }

  return {
    pass: isValid,
    message: () =>
      isValid
        ? `expected value not to match Zod schema`
        : `expected value to match Zod schema. Validation errors: ${errors.join(', ')}`,
  };
}