/**
 * AKAMAI ID VALIDATOR
 * 
 * ARCHITECTURAL PURPOSE:
 * Ensures all Akamai resource IDs follow the correct format patterns before
 * making API calls. This prevents invalid API requests and provides better
 * error messages to users.
 * 
 * ID FORMAT PATTERNS:
 * - Properties:        prp_XXXXXX      (e.g., prp_173136)
 * - Contracts:         ctr_X-XXXXXXX   (e.g., ctr_C-0N7RAC7)
 * - Groups:            grp_XXXXX       (e.g., grp_15225)
 * - Edge Hostnames:    ehn_XXXXXX      (e.g., ehn_895822)
 * - Activations:       atv_XXXXXXX     (e.g., atv_1696985)
 * - CP Codes:          cpc_XXXXX       (e.g., cpc_33190)
 * - Accounts:          act_X-XXXXXXX   (e.g., act_A-CCT5678)
 * - Products:          prd_XXXXXXX     (e.g., prd_Web_Accel)
 * 
 * VALIDATION BENEFITS:
 * - Catch errors early before API calls
 * - Provide clear error messages to users
 * - Prevent confusion between ID types
 * - Ensure consistent ID handling
 */

/**
 * Validates an Akamai property ID
 * @param id - The ID to validate
 * @returns true if valid, false otherwise
 * @example validatePropertyId("prp_123456") // true
 * @example validatePropertyId("123456") // false
 */
export function validatePropertyId(id: string): boolean {
  return /^prp_\d+$/.test(id);
}

/**
 * Validates an Akamai contract ID
 * @param id - The ID to validate
 * @returns true if valid, false otherwise
 * @example validateContractId("ctr_C-1234567") // true
 * @example validateContractId("C-1234567") // false
 */
export function validateContractId(id: string): boolean {
  return /^ctr_[A-Z0-9]-[A-Z0-9]+$/.test(id);
}

/**
 * Validates an Akamai group ID
 * @param id - The ID to validate
 * @returns true if valid, false otherwise
 * @example validateGroupId("grp_12345") // true
 * @example validateGroupId("12345") // false
 */
export function validateGroupId(id: string): boolean {
  return /^grp_\d+$/.test(id);
}

/**
 * Validates an Akamai edge hostname ID
 * @param id - The ID to validate
 * @returns true if valid, false otherwise
 * @example validateEdgeHostnameId("ehn_123456") // true
 * @example validateEdgeHostnameId("123456") // false
 */
export function validateEdgeHostnameId(id: string): boolean {
  return /^ehn_\d+$/.test(id);
}

/**
 * Validates an Akamai activation ID
 * @param id - The ID to validate
 * @returns true if valid, false otherwise
 * @example validateActivationId("atv_1234567") // true
 * @example validateActivationId("1234567") // false
 */
export function validateActivationId(id: string): boolean {
  return /^atv_\d+$/.test(id);
}

/**
 * Validates an Akamai CP code ID
 * @param id - The ID to validate
 * @returns true if valid, false otherwise
 * @example validateCPCodeId("cpc_12345") // true
 * @example validateCPCodeId("12345") // false
 */
export function validateCPCodeId(id: string): boolean {
  return /^cpc_\d+$/.test(id);
}

/**
 * Validates an Akamai account ID
 * @param id - The ID to validate
 * @returns true if valid, false otherwise
 * @example validateAccountId("act_A-CCT5678") // true
 * @example validateAccountId("A-CCT5678") // false
 */
export function validateAccountId(id: string): boolean {
  return /^act_[A-Z0-9]-[A-Z0-9]+$/.test(id);
}

/**
 * Validates an Akamai product ID
 * @param id - The ID to validate
 * @returns true if valid, false otherwise
 * @example validateProductId("prd_Web_Accel") // true
 * @example validateProductId("Web_Accel") // false
 */
export function validateProductId(id: string): boolean {
  return /^prd_[A-Za-z0-9_]+$/.test(id);
}

/**
 * Generic validator that detects the ID type and validates accordingly
 * @param id - The ID to validate
 * @returns Object with validation result and detected type
 * @example validateAkamaiId("prp_123456") // { valid: true, type: "property", formattedId: "prp_123456" }
 */
export function validateAkamaiId(id: string): {
  valid: boolean;
  type?: string;
  formattedId?: string;
  error?: string;
} {
  if (!id || typeof id !== 'string') {
    return {
      valid: false,
      error: 'ID must be a non-empty string',
    };
  }

  // Detect type based on prefix
  const prefix = id.split('_')[0];
  
  switch (prefix) {
    case 'prp':
      return {
        valid: validatePropertyId(id),
        type: 'property',
        formattedId: id,
        ...(validatePropertyId(id) ? {} : { error: 'Invalid property ID format. Expected: prp_XXXXXX' }),
      };
    
    case 'ctr':
      return {
        valid: validateContractId(id),
        type: 'contract',
        formattedId: id,
        ...(validateContractId(id) ? {} : { error: 'Invalid contract ID format. Expected: ctr_X-XXXXXXX' }),
      };
    
    case 'grp':
      return {
        valid: validateGroupId(id),
        type: 'group',
        formattedId: id,
        ...(validateGroupId(id) ? {} : { error: 'Invalid group ID format. Expected: grp_XXXXX' }),
      };
    
    case 'ehn':
      return {
        valid: validateEdgeHostnameId(id),
        type: 'edgeHostname',
        formattedId: id,
        ...(validateEdgeHostnameId(id) ? {} : { error: 'Invalid edge hostname ID format. Expected: ehn_XXXXXX' }),
      };
    
    case 'atv':
      return {
        valid: validateActivationId(id),
        type: 'activation',
        formattedId: id,
        ...(validateActivationId(id) ? {} : { error: 'Invalid activation ID format. Expected: atv_XXXXXXX' }),
      };
    
    case 'cpc':
      return {
        valid: validateCPCodeId(id),
        type: 'cpcode',
        formattedId: id,
        ...(validateCPCodeId(id) ? {} : { error: 'Invalid CP code ID format. Expected: cpc_XXXXX' }),
      };
    
    case 'act':
      return {
        valid: validateAccountId(id),
        type: 'account',
        formattedId: id,
        ...(validateAccountId(id) ? {} : { error: 'Invalid account ID format. Expected: act_X-XXXXXXX' }),
      };
    
    case 'prd':
      return {
        valid: validateProductId(id),
        type: 'product',
        formattedId: id,
        ...(validateProductId(id) ? {} : { error: 'Invalid product ID format. Expected: prd_XXXXXXX' }),
      };
    
    default:
      // Try to detect if it's a raw number that should have a prefix
      if (/^\d+$/.test(id)) {
        return {
          valid: false,
          error: `Missing ID prefix. Akamai IDs must include their type prefix (e.g., prp_${id} for properties)`,
        };
      }
      
      return {
        valid: false,
        error: `Unknown ID format. Valid prefixes: prp_, ctr_, grp_, ehn_, atv_, cpc_, act_, prd_`,
      };
  }
}

/**
 * Attempts to fix common ID format issues
 * @param id - The potentially malformed ID
 * @param expectedType - The expected resource type
 * @returns The corrected ID or null if unfixable
 * @example fixAkamaiId("123456", "property") // "prp_123456"
 * @example fixAkamaiId("Property 123456", "property") // "prp_123456"
 */
export function fixAkamaiId(id: string, expectedType: string): string | null {
  if (!id || !expectedType) return null;
  
  // If already valid, return as-is
  const validation = validateAkamaiId(id);
  if (validation.valid && validation.type === expectedType) {
    return id;
  }
  
  // Extract numbers from common misformats
  let numericPart: string | null = null;
  
  // Handle "Property 123456" format
  const propertyMatch = id.match(/property\s+(\d+)/i);
  if (propertyMatch) {
    numericPart = propertyMatch[1];
  }
  
  // Handle raw numbers
  if (/^\d+$/.test(id)) {
    numericPart = id;
  }
  
  // Handle IDs with wrong prefix
  const wrongPrefixMatch = id.match(/^[a-z]+_(\d+)$/);
  if (wrongPrefixMatch) {
    numericPart = wrongPrefixMatch[1];
  }
  
  // Apply correct prefix based on type
  if (numericPart) {
    switch (expectedType) {
      case 'property':
        return `prp_${numericPart}`;
      case 'group':
        return `grp_${numericPart}`;
      case 'edgeHostname':
        return `ehn_${numericPart}`;
      case 'activation':
        return `atv_${numericPart}`;
      case 'cpcode':
        return `cpc_${numericPart}`;
      default:
        return null;
    }
  }
  
  return null;
}

/**
 * Provides user-friendly error messages for invalid IDs
 * @param id - The invalid ID
 * @param expectedType - What type was expected
 * @returns A helpful error message
 */
export function getIdValidationError(id: string, expectedType: string): string {
  const validation = validateAkamaiId(id);
  
  if (validation.error) {
    return validation.error;
  }
  
  if (validation.type && validation.type !== expectedType) {
    return `Expected ${expectedType} ID but received ${validation.type} ID (${id})`;
  }
  
  // Try to fix and suggest
  const fixed = fixAkamaiId(id, expectedType);
  if (fixed) {
    return `Invalid ID format. Did you mean: ${fixed}?`;
  }
  
  // Generic helpful message
  const prefixMap: Record<string, string> = {
    property: 'prp_',
    contract: 'ctr_',
    group: 'grp_',
    edgeHostname: 'ehn_',
    activation: 'atv_',
    cpcode: 'cpc_',
    account: 'act_',
    product: 'prd_',
  };
  
  const prefix = prefixMap[expectedType] || '';
  return `Invalid ${expectedType} ID format. Expected format: ${prefix}XXXXXX (e.g., ${prefix}123456)`;
}