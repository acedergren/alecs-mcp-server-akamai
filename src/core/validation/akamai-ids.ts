/**
 * Akamai ID Validators and Normalizers
 * 
 * Consolidates ID validation logic from:
 * - utils/akamai-id-validator.ts
 * - Various tool files with inline ID validation
 * 
 * Ensures consistent ID handling across all domains
 */

/**
 * Akamai ID prefixes and their validation rules
 */
const ID_PATTERNS = {
  property: /^prp_\d+$/,
  contract: /^ctr_[A-Z0-9-]+$/i,
  group: /^grp_\d+$/,
  product: /^prd_[A-Z0-9_-]+$/i,
  cpCode: /^cpc_\d+$/,
  edgeHostname: /^ehn_\d+$/,
  enrollment: /^eroll_\d+$/,
  activation: /^atv_\d+$/,
  include: /^inc_\d+$/,
  ruleFormat: /^v\d{4}-\d{2}-\d{2}$/,
} as const;

/**
 * ID type detection
 */
export function detectIdType(id: string): keyof typeof ID_PATTERNS | null {
  for (const [type, pattern] of Object.entries(ID_PATTERNS)) {
    if (pattern.test(id)) {
      return type as keyof typeof ID_PATTERNS;
    }
  }
  return null;
}

/**
 * Generic ID validator
 */
export function isValidAkamaiId(id: string, type: keyof typeof ID_PATTERNS): boolean {
  return ID_PATTERNS[type].test(id);
}

/**
 * ID normalizers - add prefix if missing
 */
export const normalizeId = {
  property: (id: string | number): string => {
    const idStr = String(id);
    return idStr.startsWith('prp_') ? idStr : `prp_${idStr}`;
  },
  
  contract: (id: string): string => {
    return id.startsWith('ctr_') ? id : `ctr_${id}`;
  },
  
  group: (id: string | number): string => {
    const idStr = String(id);
    return idStr.startsWith('grp_') ? idStr : `grp_${idStr}`;
  },
  
  cpCode: (id: string | number): string => {
    const idStr = String(id);
    if (idStr.startsWith('cpc_')) return idStr;
    // Handle numeric CP codes (no prefix in API)
    return /^\d+$/.test(idStr) ? idStr : `cpc_${idStr}`;
  },
  
  product: (id: string): string => {
    return id.startsWith('prd_') ? id : `prd_${id}`;
  },
  
  edgeHostname: (id: string | number): string => {
    const idStr = String(id);
    return idStr.startsWith('ehn_') ? idStr : `ehn_${idStr}`;
  },
  
  enrollment: (id: string | number): string => {
    const idStr = String(id);
    return idStr.startsWith('eroll_') ? idStr : `eroll_${idStr}`;
  },
  
  activation: (id: string | number): string => {
    const idStr = String(id);
    return idStr.startsWith('atv_') ? idStr : `atv_${idStr}`;
  },
} as const;

/**
 * Extract numeric ID from prefixed string
 */
export function extractNumericId(id: string): number | null {
  const match = id.match(/_(\d+)$/);
  return match && match[1] ? parseInt(match[1], 10) : null;
}

/**
 * Validate and normalize ID with proper error messages
 */
export function validateAndNormalizeId(
  id: string | number | undefined,
  type: keyof typeof ID_PATTERNS
): { valid: boolean; normalized?: string; error?: string } {
  if (id === undefined || id === null || id === '') {
    return {
      valid: false,
      error: `${type} ID is required`,
    };
  }
  
  const idStr = String(id);
  
  // Try to normalize first
  const normalizer = normalizeId[type as keyof typeof normalizeId];
  const normalized = normalizer ? normalizer(idStr) : idStr;
  
  // Validate the normalized ID
  if (!isValidAkamaiId(normalized, type)) {
    return {
      valid: false,
      error: `Invalid ${type} ID format: "${idStr}". Expected format: ${ID_PATTERNS[type].source}`,
    };
  }
  
  return {
    valid: true,
    normalized,
  };
}

/**
 * Batch ID validation
 */
export function validateIdBatch(
  ids: (string | number)[],
  type: keyof typeof ID_PATTERNS
): {
  valid: string[];
  invalid: Array<{ id: string | number; error: string }>;
} {
  const valid: string[] = [];
  const invalid: Array<{ id: string | number; error: string }> = [];
  
  for (const id of ids) {
    const result = validateAndNormalizeId(id, type);
    if (result.valid && result.normalized) {
      valid.push(result.normalized);
    } else {
      invalid.push({
        id,
        error: result.error || 'Unknown validation error',
      });
    }
  }
  
  return { valid, invalid };
}

/**
 * Type guards for TypeScript
 */
export const isPropertyId = (id: unknown): id is string => 
  typeof id === 'string' && isValidAkamaiId(id, 'property');

export const isContractId = (id: unknown): id is string => 
  typeof id === 'string' && isValidAkamaiId(id, 'contract');

export const isGroupId = (id: unknown): id is string => 
  typeof id === 'string' && isValidAkamaiId(id, 'group');

export const isCPCode = (id: unknown): id is string => 
  typeof id === 'string' && (isValidAkamaiId(id, 'cpCode') || /^\d+$/.test(id));

/**
 * ID formatting for display
 */
export function formatIdForDisplay(id: string, type?: keyof typeof ID_PATTERNS): string {
  const detectedType = type || detectIdType(id);
  
  if (!detectedType) {
    return id;
  }
  
  const numericId = extractNumericId(id);
  
  switch (detectedType) {
    case 'property':
      return `Property ${numericId || id}`;
    case 'contract':
      return `Contract ${id}`;
    case 'group':
      return `Group ${numericId || id}`;
    case 'cpCode':
      return `CP Code ${numericId || id}`;
    case 'product':
      return `Product ${id}`;
    default:
      return id;
  }
}