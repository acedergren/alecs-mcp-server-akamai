/**
 * Parameter Validation Utilities
 *
 * Comprehensive parameter validation for all Akamai API calls
 * based on documented API requirements and constraints.
 */

import { z } from 'zod';

// Base patterns for Akamai resource IDs
export const AKAMAI_ID_PATTERNS = {
  property: /^prp_\d+$/,
  contract: /^ctr_[A-Z0-9-]+$/,
  group: /^grp_\d+$/,
  product: /^prd_[a-zA-Z0-9_]+$/,
  activation: /^act_\d+$/,
  cpCode: /^cpc_\d+$/,
  edgeHostname: /^ehn_\d+$/,
  include: /^inc_\d+$/,
  enrollment: /^\d+$/,
  networkList: /^[A-Z0-9_]+$/,
  configId: /^\d+$/,
} as const;

// Common validation schemas
export const AkamaiIdSchemas = {
  propertyId: z.string().regex(AKAMAI_ID_PATTERNS.property, 'Property ID must match pattern prp_*'),
  contractId: z.string().regex(AKAMAI_ID_PATTERNS.contract, 'Contract ID must match pattern ctr_*'),
  groupId: z.string().regex(AKAMAI_ID_PATTERNS.group, 'Group ID must match pattern grp_*'),
  productId: z.string().regex(AKAMAI_ID_PATTERNS.product, 'Product ID must match pattern prd_*'),
  activationId: z
    .string()
    .regex(AKAMAI_ID_PATTERNS.activation, 'Activation ID must match pattern act_*'),
  cpCodeId: z.string().regex(AKAMAI_ID_PATTERNS.cpCode, 'CP Code ID must match pattern cpc_*'),
  edgeHostnameId: z
    .string()
    .regex(AKAMAI_ID_PATTERNS.edgeHostname, 'Edge Hostname ID must match pattern ehn_*'),
  includeId: z.string().regex(AKAMAI_ID_PATTERNS.include, 'Include ID must match pattern inc_*'),
  enrollmentId: z.string().regex(AKAMAI_ID_PATTERNS.enrollment, 'Enrollment ID must be numeric'),
  networkListId: z
    .string()
    .regex(AKAMAI_ID_PATTERNS.networkList, 'Network List ID must be alphanumeric with underscores'),
  configId: z.string().regex(AKAMAI_ID_PATTERNS.configId, 'Config ID must be numeric'),
};

// Network and hostname validation
export const NetworkSchemas = {
  hostname: z
    .string()
    .min(1)
    .max(255, 'Hostname must be 255 characters or less')
    .regex(
      /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?))*$/,
      'Invalid hostname format',
    ),

  ipv4: z
    .string()
    .regex(
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
      'Invalid IPv4 address',
    ),

  ipv6: z.string().regex(/^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::$/, 'Invalid IPv6 address'),

  cidr: z
    .string()
    .regex(
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/(?:[0-9]|[1-2][0-9]|3[0-2])$/,
      'Invalid CIDR notation',
    ),

  email: z.string().email('Invalid email address'),

  url: z.string().url('Invalid URL format'),
};

// Common enums
export const AkamaiEnums = {
  network: z.enum(['STAGING', 'PRODUCTION'], {
    errorMap: () => ({ message: 'Network must be STAGING or PRODUCTION' }),
  }),

  dnsRecordType: z.enum(['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SRV', 'CAA', 'PTR'], {
    errorMap: () => ({ message: 'Invalid DNS record type' }),
  }),

  zoneType: z.enum(['PRIMARY', 'SECONDARY', 'ALIAS'], {
    errorMap: () => ({ message: 'Zone type must be PRIMARY, SECONDARY, or ALIAS' }),
  }),

  certificateType: z.enum(['san', 'single', 'wildcard'], {
    errorMap: () => ({ message: 'Certificate type must be san, single, or wildcard' }),
  }),

  validationType: z.enum(['dv', 'ov', 'ev', 'third-party'], {
    errorMap: () => ({ message: 'Validation type must be dv, ov, ev, or third-party' }),
  }),

  networkListType: z.enum(['IP', 'GEO', 'ASN'], {
    errorMap: () => ({ message: 'Network list type must be IP, GEO, or ASN' }),
  }),
};

// Numeric constraints
export const NumericConstraints = {
  ttl: z
    .number()
    .int('TTL must be an integer')
    .min(30, 'TTL must be at least 30 seconds')
    .max(2147483647, 'TTL must be less than 2147483647'),

  port: z
    .number()
    .int('Port must be an integer')
    .min(1, 'Port must be at least 1')
    .max(65535, 'Port must be less than 65536'),

  propertyVersion: z
    .number()
    .int('Property version must be an integer')
    .min(1, 'Property version must be at least 1'),

  pageSize: z
    .number()
    .int('Page size must be an integer')
    .min(1, 'Page size must be at least 1')
    .max(1000, 'Page size must be 1000 or less'),

  riskScore: z
    .number()
    .int('Risk score must be an integer')
    .min(0, 'Risk score must be at least 0')
    .max(100, 'Risk score must be 100 or less'),
};

// Property Manager specific schemas
export const PropertyManagerSchemas = {
  listProperties: z.object({
    customer: z.string().optional(),
    contractId: AkamaiIdSchemas.contractId.optional(),
    groupId: AkamaiIdSchemas.groupId.optional(),
    limit: NumericConstraints.pageSize.optional(),
  }),

  getProperty: z.object({
    customer: z.string().optional(),
    propertyId: AkamaiIdSchemas.propertyId,
    contractId: AkamaiIdSchemas.contractId.optional(),
    groupId: AkamaiIdSchemas.groupId.optional(),
  }),

  createProperty: z.object({
    customer: z.string().optional(),
    contractId: AkamaiIdSchemas.contractId,
    groupId: AkamaiIdSchemas.groupId,
    propertyName: z
      .string()
      .min(1, 'Property name is required')
      .max(85, 'Property name must be 85 characters or less')
      .regex(/^[a-zA-Z0-9\-_.]+$/, 'Property name contains invalid characters'),
    productId: AkamaiIdSchemas.productId,
    ruleFormat: z
      .string()
      .regex(/^v\d{4}-\d{2}-\d{2}$/, 'Rule format must be in format vYYYY-MM-DD')
      .optional()
      .default('v2023-10-30'),
  }),

  activateProperty: z
    .object({
      customer: z.string().optional(),
      propertyId: AkamaiIdSchemas.propertyId,
      version: NumericConstraints.propertyVersion,
      network: AkamaiEnums.network,
      note: z.string().min(1, 'Activation note is required'),
      notifyEmails: z
        .array(NetworkSchemas.email)
        .min(1, 'At least one notification email is required for production activations')
        .optional(),
      acknowledgeAllWarnings: z.boolean().optional().default(true),
      useFastFallback: z.boolean().optional(),
      fastPush: z.boolean().optional(),
      complianceRecord: z
        .object({
          noncomplianceReason: z.string().optional(),
        })
        .optional(),
    })
    .refine(
      (data) =>
        data.network === 'STAGING' ||
        (data.network === 'PRODUCTION' && data.notifyEmails && data.notifyEmails.length > 0),
      {
        message: 'Production activations require notification emails',
        path: ['notifyEmails'],
      },
    ),
};

// DNS specific schemas
export const DNSSchemas = {
  listZones: z.object({
    customer: z.string().optional(),
    contractIds: z.array(AkamaiIdSchemas.contractId).optional(),
    includeAliases: z.boolean().optional(),
    search: z.string().optional(),
    sortBy: z.enum(['zone', 'type', 'lastActivationDate']).optional(),
    order: z.enum(['ASC', 'DESC']).optional(),
    limit: NumericConstraints.pageSize.optional(),
    offset: z.number().int().min(0).optional(),
  }),

  createZone: z
    .object({
      customer: z.string().optional(),
      zone: NetworkSchemas.hostname,
      type: AkamaiEnums.zoneType,
      contractId: AkamaiIdSchemas.contractId,
      groupId: AkamaiIdSchemas.groupId.optional(),
      comment: z.string().max(2048, 'Comment must be 2048 characters or less').optional(),
      masters: z.array(NetworkSchemas.ipv4).optional(),
      target: NetworkSchemas.hostname.optional(),
      signAndServe: z.boolean().optional(),
      tsigKey: z
        .object({
          name: z.string(),
          algorithm: z.string(),
          secret: z.string(),
        })
        .optional(),
    })
    .refine((data) => data.type !== 'SECONDARY' || (data.masters && data.masters.length > 0), {
      message: 'Secondary zones require master servers',
      path: ['masters'],
    })
    .refine((data) => data.type !== 'ALIAS' || data.target, {
      message: 'Alias zones require a target',
      path: ['target'],
    }),

  upsertRecord: z.object({
    customer: z.string().optional(),
    zone: NetworkSchemas.hostname,
    name: z.string().min(1, 'Record name is required'),
    type: AkamaiEnums.dnsRecordType,
    ttl: NumericConstraints.ttl,
    rdata: z
      .array(z.string().min(1, 'Record data cannot be empty'))
      .min(1, 'At least one record data value is required'),
  }),
};

// Certificate specific schemas
export const CertificateSchemas = {
  createDVEnrollment: z.object({
    customer: z.string().optional(),
    contractId: AkamaiIdSchemas.contractId,
    cn: NetworkSchemas.hostname,
    sans: z.array(NetworkSchemas.hostname).optional(),
    adminContact: z.object({
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      email: NetworkSchemas.email,
      phone: z.string().min(1),
      addressLineOne: z.string().min(1),
      city: z.string().min(1),
      region: z.string().min(1),
      postalCode: z.string().min(1),
      country: z.string().length(2, 'Country must be 2-letter code'),
      organizationName: z.string().min(1),
      title: z.string().optional(),
    }),
    techContact: z.object({
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      email: NetworkSchemas.email,
      phone: z.string().min(1),
      addressLineOne: z.string().min(1),
      city: z.string().min(1),
      region: z.string().min(1),
      postalCode: z.string().min(1),
      country: z.string().length(2, 'Country must be 2-letter code'),
      organizationName: z.string().min(1),
      title: z.string().optional(),
    }),
    org: z.object({
      name: z.string().min(1),
      addressLineOne: z.string().min(1),
      city: z.string().min(1),
      region: z.string().min(1),
      postalCode: z.string().min(1),
      country: z.string().length(2, 'Country must be 2-letter code'),
      phone: z.string().min(1),
    }),
    validationType: AkamaiEnums.validationType.optional().default('dv'),
    certificateType: AkamaiEnums.certificateType.optional().default('san'),
    networkConfiguration: z
      .object({
        geography: z.enum(['core', 'china', 'russia']).optional().default('core'),
        secureNetwork: z
          .enum(['standard-tls', 'enhanced-tls', 'shared-cert'])
          .optional()
          .default('enhanced-tls'),
        quicEnabled: z.boolean().optional().default(true),
      })
      .optional(),
  }),
};

// Fast Purge schemas
export const FastPurgeSchemas = {
  purgeByUrl: z.object({
    customer: z.string().optional(),
    urls: z
      .array(NetworkSchemas.url)
      .min(1, 'At least one URL is required')
      .max(3000, 'Maximum 3000 URLs per request'),
    network: z.enum(['staging', 'production']).optional().default('production'),
    priority: z.enum(['high', 'normal', 'low']).optional().default('normal'),
    description: z.string().max(255, 'Description must be 255 characters or less').optional(),
    notifyEmails: z.array(NetworkSchemas.email).optional(),
    waitForCompletion: z.boolean().optional().default(false),
    useQueue: z.boolean().optional().default(true),
  }),

  purgeByCpcode: z.object({
    customer: z.string().optional(),
    cpcodes: z
      .array(z.number().int().positive())
      .min(1, 'At least one CP code is required')
      .max(100, 'Maximum 100 CP codes per request'),
    network: z.enum(['staging', 'production']).optional().default('production'),
    priority: z.enum(['high', 'normal', 'low']).optional().default('normal'),
    description: z.string().max(255, 'Description must be 255 characters or less').optional(),
    notifyEmails: z.array(NetworkSchemas.email).optional(),
    waitForCompletion: z.boolean().optional().default(false),
    confirmed: z.boolean().optional().default(false),
  }),
};

// Network Lists schemas
export const NetworkListSchemas = {
  createNetworkList: z.object({
    customer: z.string().optional(),
    name: z.string().min(1, 'Network list name is required').max(255),
    type: AkamaiEnums.networkListType,
    description: z.string().max(2048).optional(),
    elements: z.array(z.string()).optional(),
  }),
};

/**
 * Utility function to validate parameters against a schema
 */
export function validateParameters<T>(schema: z.ZodSchema<T>, params: unknown): T {
  try {
    return schema.parse(params);
  } catch (_error) {
    if (_error instanceof z.ZodError) {
      const errorMessages = _error.errors
        .map((err: any) => `${err.path.join('.')}: ${err.message}`)
        .join(', ');
      throw new Error(`Parameter validation failed: ${errorMessages}`);
    }
    throw _error;
  }
}

/**
 * Utility to ensure proper ID format and prefixing
 */
export function ensureAkamaiIdFormat(id: string, type: keyof typeof AKAMAI_ID_PATTERNS): string {
  const pattern = AKAMAI_ID_PATTERNS[type];

  if (pattern.test(id)) {
    return id;
  }

  // Try to add prefix if missing
  const prefixes = {
    property: 'prp_',
    contract: 'ctr_',
    group: 'grp_',
    product: 'prd_',
    activation: 'act_',
    cpCode: 'cpc_',
    edgeHostname: 'ehn_',
    include: 'inc_',
  };

  const prefix = prefixes[type as keyof typeof prefixes];
  if (prefix && !id.startsWith(prefix)) {
    const prefixedId = prefix + id;
    if (pattern.test(prefixedId)) {
      return prefixedId;
    }
  }

  throw new Error(`Invalid ${type} ID format: ${id}`);
}

/**
 * Utility to validate and format query parameters for API calls
 */
export function formatQueryParameters(params: Record<string, any>): Record<string, any> {
  const formatted: Record<string, any> = {};

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        formatted[key] = value.join(',');
      } else {
        formatted[key] = value;
      }
    }
  }

  return formatted;
}

/**
 * Utility to validate required parameter combinations
 */
export function validateParameterDependencies(
  params: Record<string, any>,
  dependencies: Record<string, string[]>,
): void {
  for (const [param, requiredParams] of Object.entries(dependencies)) {
    if (params[param] !== undefined) {
      for (const required of requiredParams) {
        if (params[required] === undefined) {
          throw new Error(`Parameter '${param}' requires '${required}' to be provided`);
        }
      }
    }
  }
}
