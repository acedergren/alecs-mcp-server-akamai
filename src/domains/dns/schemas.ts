/**
 * DNS Domain Schemas - Runtime Validation
 * 
 * CODE KAI: Zod schemas for parameter validation
 * Ensures type safety at runtime for all DNS operations
 */

import { z } from 'zod';
import { ZoneType, RecordType } from './types';

/**
 * Zone operation schemas
 */
export const ListZonesSchema = z.object({
  contractIds: z.array(z.string()).optional(),
  types: z.array(z.nativeEnum(ZoneType)).optional(),
  search: z.string().optional(),
  showAll: z.boolean().optional(),
  customer: z.string().optional(),
});

export const GetZoneSchema = z.object({
  zone: z.string().min(1, 'Zone name is required'),
  customer: z.string().optional(),
});

export const CreateZoneSchema = z.object({
  zone: z.string()
    .min(1, 'Zone name is required')
    .regex(/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/, 
      'Invalid zone name format'),
  type: z.nativeEnum(ZoneType),
  contractId: z.string().min(1, 'Contract ID is required'),
  groupId: z.number().optional(),
  comment: z.string().max(255).optional(),
  signAndServe: z.boolean().optional(),
  signAndServeAlgorithm: z.string().optional(),
  masters: z.array(z.string().ip()).optional(),
  tsigKey: z.object({
    name: z.string(),
    algorithm: z.string(),
    secret: z.string(),
  }).optional(),
  target: z.string().optional(),
  endCustomerId: z.string().optional(),
  customer: z.string().optional(),
}).refine(
  (data) => {
    // Validate type-specific requirements
    if (data.type === ZoneType.SECONDARY && (!data.masters || data.masters.length === 0)) {
      return false;
    }
    if (data.type === ZoneType.ALIAS && !data.target) {
      return false;
    }
    return true;
  },
  {
    message: 'Invalid zone configuration for the specified type',
  }
);

export const DeleteZoneSchema = z.object({
  zone: z.string().min(1),
  force: z.boolean().optional(),
  customer: z.string().optional(),
});

/**
 * Record operation schemas
 */
const RecordTypeEnum = z.enum([
  'A', 'AAAA', 'AFSDB', 'AKAMAICDN', 'AKAMAITLC', 'CAA',
  'CERT', 'CNAME', 'DNSKEY', 'DS', 'HINFO', 'LOC', 'MX',
  'NAPTR', 'NS', 'NSEC3', 'NSEC3PARAM', 'PTR', 'RP', 'RRSIG',
  'SOA', 'SPF', 'SRV', 'SSHFP', 'SVCB', 'TLSA', 'TXT'
]);

export const ListRecordsSchema = z.object({
  zone: z.string().min(1),
  type: RecordTypeEnum.optional(),
  name: z.string().optional(),
  page: z.number().min(1).optional(),
  pageSize: z.number().min(1).max(1000).optional(),
  search: z.string().optional(),
  showAll: z.boolean().optional(),
  customer: z.string().optional(),
});

export const CreateRecordSchema = z.object({
  zone: z.string().min(1),
  name: z.string(),
  type: RecordTypeEnum,
  ttl: z.number().min(0).max(2147483647),
  rdata: z.array(z.string()).min(1),
  comment: z.string().max(255).optional(),
  customer: z.string().optional(),
}).refine(
  (data) => {
    // Validate record type specific requirements
    switch (data.type) {
      case 'A':
        return data.rdata.every(ip => /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(ip));
      case 'AAAA':
        return data.rdata.every(ip => /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::|::1)$/.test(ip));
      case 'CNAME':
        return data.rdata.length === 1 && data.name !== '@';
      case 'MX':
        return data.rdata.every(mx => /^\d+\s+\S+$/.test(mx));
      case 'TXT':
        return data.rdata.every(txt => txt.length <= 255);
      default:
        return true;
    }
  },
  {
    message: 'Invalid record data for the specified type',
  }
);

export const UpdateRecordSchema = CreateRecordSchema;

export const DeleteRecordSchema = z.object({
  zone: z.string().min(1),
  name: z.string(),
  type: RecordTypeEnum,
  customer: z.string().optional(),
});

/**
 * Activation schemas
 */
export const ActivateZoneSchema = z.object({
  zone: z.string().min(1),
  comment: z.string().max(255).optional(),
  customer: z.string().optional(),
});

/**
 * DNSSEC operation schemas
 */
export const EnableDNSSECSchema = z.object({
  zone: z.string().min(1),
  algorithm: z.enum(['RSASHA1', 'RSASHA256', 'RSASHA512', 'ECDSAP256SHA256', 'ECDSAP384SHA384', 'ED25519', 'ED448'])
    .optional()
    .default('RSASHA256'),
  nsec3: z.boolean().optional().default(true),
  iterations: z.number().min(0).max(150).optional(),
  salt: z.string().regex(/^[0-9a-fA-F]*$/).optional(),
  customer: z.string().optional(),
});

export const DisableDNSSECSchema = z.object({
  zone: z.string().min(1),
  force: z.boolean().optional(),
  customer: z.string().optional(),
});

export const RotateDNSSECKeysSchema = z.object({
  zone: z.string().min(1),
  keyType: z.enum(['KSK', 'ZSK', 'BOTH']),
  algorithm: z.enum(['RSASHA1', 'RSASHA256', 'RSASHA512', 'ECDSAP256SHA256', 'ECDSAP384SHA384', 'ED25519', 'ED448'])
    .optional(),
  customer: z.string().optional(),
});

/**
 * Migration schemas
 */
export const ImportViaAXFRSchema = z.object({
  zone: z.string().min(1),
  masterServer: z.string().ip(),
  tsigKey: z.object({
    name: z.string(),
    algorithm: z.string(),
    secret: z.string(),
  }).optional(),
  contractId: z.string().optional(),
  customer: z.string().optional(),
});

export const ParseZoneFileSchema = z.object({
  zone: z.string().min(1),
  zoneFileContent: z.string().min(1),
  contractId: z.string().optional(),
  createZone: z.boolean().optional(),
  customer: z.string().optional(),
});

export const BulkImportRecordsSchema = z.object({
  zone: z.string().min(1),
  records: z.array(z.object({
    name: z.string(),
    type: RecordTypeEnum,
    ttl: z.number().min(0),
    value: z.string(),
    priority: z.number().optional(), // For MX records
  })).min(1).max(1000),
  replaceExisting: z.boolean().optional(),
  customer: z.string().optional(),
});

/**
 * Bulk operation schemas
 */
export const BulkCreateZonesSchema = z.object({
  zones: z.array(z.object({
    zone: z.string(),
    type: z.nativeEnum(ZoneType),
    contractId: z.string(),
    groupId: z.number().optional(),
    masters: z.array(z.string().ip()).optional(),
  })).min(1).max(100),
  customer: z.string().optional(),
});

export const UpdateTSIGKeySchema = z.object({
  zones: z.array(z.string()).min(1),
  tsigKey: z.object({
    name: z.string(),
    algorithm: z.string(),
    secret: z.string(),
  }),
  customer: z.string().optional(),
});

/**
 * Validation helpers
 */
export const validateZoneName = (zone: string): boolean => {
  return /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/.test(zone);
};

export const validateRecordName = (name: string, zone: string): boolean => {
  if (name === '@' || name === zone) return true;
  if (name.endsWith(`.${zone}`)) return true;
  if (!name.includes('.')) return true; // Relative name
  return false;
};

export const validateTTL = (ttl: number): boolean => {
  return ttl >= 0 && ttl <= 2147483647;
};

export const validateIPv4 = (ip: string): boolean => {
  return /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ip);
};

export const validateIPv6 = (ip: string): boolean => {
  return /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/.test(ip);
};