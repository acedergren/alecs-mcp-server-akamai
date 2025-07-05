/**
 * DNSSEC Operations for Edge DNS
 * 
 * CODE KAI Transformation:
 * - Type Safety: All 'any' types replaced with strict interfaces
 * - API Compliance: Aligned with official Akamai Edge DNS API v2 specifications
 * - Error Handling: Categorized HTTP errors with actionable guidance
 * - User Experience: Clear error messages with resolution steps
 * - Maintainability: Runtime validation with Zod schemas
 * 
 * Implements DNSSEC management functionality:
 * - Enable/disable DNSSEC
 * - Get signing keys and DS records
 * - Key rotation management
 * - Validation status monitoring
 */

import { Spinner, format, icons } from '../utils/progress';
import { type AkamaiClient } from '../akamai-client';
import { type MCPToolResponse } from '../types';
import { z } from 'zod';

// CODE KAI: Type-safe DNSSEC configuration interfaces
// Key: Eliminate all 'any' types for API compliance
// Approach: Define comprehensive interfaces matching Akamai API specs
// Implementation: Zod schemas with corresponding TypeScript types

// DNSSEC algorithm types as per RFC standards and Akamai API
export type DNSSECAlgorithm = 
  | 'RSA_SHA1'
  | 'RSA_SHA256'
  | 'RSA_SHA512'
  | 'ECDSA_P256_SHA256'
  | 'ECDSA_P384_SHA384'
  | 'ED25519'
  | 'ED448';

// DNSSEC configuration interface matching Akamai API
export interface DNSSECConfig {
  signAndServe: boolean;
  signAndServeAlgorithm?: DNSSECAlgorithm;
  nsec3?: {
    enabled: boolean;
    salt?: string;
    iterations?: number;
  };
}

// DNSSEC-specific schemas with runtime validation
const DNSSECConfigSchema = z.object({
  signAndServe: z.boolean(),
  signAndServeAlgorithm: z.enum([
    'RSA_SHA1',
    'RSA_SHA256', 
    'RSA_SHA512',
    'ECDSA_P256_SHA256',
    'ECDSA_P384_SHA384',
    'ED25519',
    'ED448'
  ]).optional(),
  nsec3: z.object({
    enabled: z.boolean(),
    salt: z.string().optional(),
    iterations: z.number().optional(),
  }).optional(),
}) satisfies z.ZodType<DNSSECConfig>;

// CODE KAI: Type-safe DNSSEC key representation per API spec
export interface DNSSECKey {
  keyId: number;
  keyType: 'KSK' | 'ZSK';
  algorithm: string;
  keyTag: number;
  publicKey: string;
  createdDate: string;
  expiryDate?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING_ACTIVATION' | 'PENDING_DEACTIVATION';
}

const DNSSECKeySchema = z.object({
  keyId: z.number(),
  keyType: z.enum(['KSK', 'ZSK']),
  algorithm: z.string(),
  keyTag: z.number(),
  publicKey: z.string(),
  createdDate: z.string(),
  expiryDate: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'PENDING_ACTIVATION', 'PENDING_DEACTIVATION']),
}) satisfies z.ZodType<DNSSECKey>;

// CODE KAI: Type-safe DS record for parent zone delegation
export interface DSRecord {
  keyTag: number;
  algorithm: number;
  digestType: number;
  digest: string;
}

const DSRecordSchema = z.object({
  keyTag: z.number(),
  algorithm: z.number(),
  digestType: z.number(),
  digest: z.string(),
}) satisfies z.ZodType<DSRecord>;

// CODE KAI: Type-safe DNSSEC validation status
export interface ChainOfTrustLink {
  zone: string;
  status: string;
}

export interface DNSSECValidation {
  zone: string;
  validationStatus: 'SECURE' | 'INSECURE' | 'BOGUS' | 'INDETERMINATE';
  chainOfTrust: ChainOfTrustLink[];
  lastValidated: string;
}

// Unused schema - kept for reference
// const DNSSECValidationSchema = z.object({
//   zone: z.string(),
//   validationStatus: z.enum(['SECURE', 'INSECURE', 'BOGUS', 'INDETERMINATE']),
//   chainOfTrust: z.array(z.object({
//     zone: z.string(),
//     status: z.string(),
//   })),
//   lastValidated: z.string(),
// }) satisfies z.ZodType<DNSSECValidation>;

// CODE KAI: API response interfaces matching Akamai specs
export interface DNSSECKeysResponse {
  keys: DNSSECKey[];
}

export interface DNSSECDSRecordsResponse {
  dsRecords: DSRecord[];
}

export interface DNSSECValidationResponse extends DNSSECValidation {}

export interface KeyRotationResponse {
  rotationId?: string;
  status?: string;
  message?: string;
}

export interface KeyRotationRequest {
  keyType: 'KSK' | 'ZSK' | 'BOTH';
  algorithm?: string;
}

// CODE KAI: Type guard functions for runtime validation
export function isDNSSECKeysResponse(obj: unknown): obj is DNSSECKeysResponse {
  if (!obj || typeof obj !== 'object') {return false;}
  const response = obj as Record<string, unknown>;
  if (!Array.isArray(response['keys'])) {return false;}
  
  // Validate each key in the array
  const keys = response['keys'];
  for (const key of keys) {
    if (!DNSSECKeySchema.safeParse(key).success) {
      return false;
    }
  }
  return true;
}

export function isDNSSECDSRecordsResponse(obj: unknown): obj is DNSSECDSRecordsResponse {
  if (!obj || typeof obj !== 'object') {return false;}
  const response = obj as Record<string, unknown>;
  if (!Array.isArray(response['dsRecords'])) {return false;}
  
  // Validate each DS record in the array
  const dsRecords = response['dsRecords'];
  for (const ds of dsRecords) {
    if (!DSRecordSchema.safeParse(ds).success) {
      return false;
    }
  }
  return true;
}

/**
 * Enable or update DNSSEC for a zone
 */
export async function enableDNSSEC(
  client: AkamaiClient,
  args: {
    zone: string;
    algorithm?: string;
    nsec3?: boolean;
    salt?: string;
    iterations?: number;
  },
): Promise<MCPToolResponse> {
  const spinner = new Spinner();
  spinner.start(`Enabling DNSSEC for ${args.zone}...`);

  try {
    // CODE KAI: Type-safe DNSSEC configuration with validation
    const body: DNSSECConfig = {
      signAndServe: true,
      signAndServeAlgorithm: (args.algorithm as DNSSECAlgorithm) || 'RSA_SHA256',
    };

    if (args.nsec3) {
      body.nsec3 = {
        enabled: true,
        salt: args.salt,
        iterations: args.iterations || 10,
      };
    }

    // Validate configuration before sending
    const validationResult = DNSSECConfigSchema.safeParse(body);
    if (!validationResult.success) {
      throw new Error(`Invalid DNSSEC configuration: ${validationResult.error.message}`);
    }

    await client.request({
      path: `/config-dns/v2/zones/${args.zone}/dnssec`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body,
    });

    spinner.succeed(`DNSSEC enabled for ${args.zone}`);

    return {
      content: [{
        type: 'text',
        text: `${icons.success} DNSSEC enabled successfully for ${format.cyan(args.zone)}\n\nAlgorithm: ${format.green(args.algorithm || 'RSA_SHA256')}\nNSEC3: ${args.nsec3 ? format.green('Enabled') : format.dim('Disabled')}\n\n${icons.info} Next steps:\n1. Retrieve DS records using 'get-dnssec-ds-records'\n2. Add DS records to parent zone or registrar\n3. Monitor validation status`,
      }],
    };
  } catch (error) {
    spinner.fail('Failed to enable DNSSEC');
    // CODE KAI: Categorized error handling with actionable guidance
    if (error instanceof Error) {
      if (error.message.includes('403')) {
        throw new Error(`Permission denied: Your account lacks DNSSEC privileges for zone ${args.zone}. Contact your account administrator to enable DNSSEC permissions.`);
      } else if (error.message.includes('404')) {
        throw new Error(`Zone ${args.zone} not found. Verify the zone exists and you have access permissions.`);
      } else if (error.message.includes('400')) {
        throw new Error(`Invalid DNSSEC configuration. Algorithm '${args.algorithm}' may not be supported. Supported algorithms: RSA_SHA256, RSA_SHA512, ECDSA_P256_SHA256, ED25519.`);
      } else if (error.message.includes('409')) {
        throw new Error(`DNSSEC is already enabled for zone ${args.zone}. Use update operations to modify configuration.`);
      }
    }
    throw new Error(`Failed to enable DNSSEC: ${String(error)}`);
  }
}

/**
 * Disable DNSSEC for a zone
 */
export async function disableDNSSEC(
  client: AkamaiClient,
  args: {
    zone: string;
    force?: boolean;
  },
): Promise<MCPToolResponse> {
  const spinner = new Spinner();

  if (!args.force) {
    return {
      content: [{
        type: 'text',
        text: `${icons.warning} Disabling DNSSEC will make the zone unsigned. This should only be done after removing DS records from the parent zone.\n\nUse force=true to proceed.`,
      }],
    };
  }

  spinner.start(`Disabling DNSSEC for ${args.zone}...`);

  try {
    await client.request({
      path: `/config-dns/v2/zones/${args.zone}/dnssec`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: {
        signAndServe: false,
      },
    });

    spinner.succeed(`DNSSEC disabled for ${args.zone}`);

    return {
      content: [{
        type: 'text',
        text: `${icons.success} DNSSEC disabled successfully for ${format.cyan(args.zone)}\n\n${icons.warning} Important: Ensure DS records have been removed from the parent zone to avoid validation failures.`,
      }],
    };
  } catch (error) {
    spinner.fail('Failed to disable DNSSEC');
    // CODE KAI: Categorized error handling for disable operation
    if (error instanceof Error) {
      if (error.message.includes('403')) {
        throw new Error(`Permission denied: Cannot disable DNSSEC for zone ${args.zone}. Check account permissions.`);
      } else if (error.message.includes('409')) {
        throw new Error(`Cannot disable DNSSEC: Zone ${args.zone} has active DS records in parent zone. Remove DS records first to prevent validation failures.`);
      } else if (error.message.includes('404')) {
        throw new Error(`Zone ${args.zone} not found or DNSSEC not currently enabled.`);
      }
    }
    throw new Error(`Failed to disable DNSSEC: ${String(error)}`);
  }
}

/**
 * Get DNSSEC keys for a zone
 */
export async function getDNSSECKeys(
  client: AkamaiClient,
  args: {
    zone: string;
  },
): Promise<MCPToolResponse> {
  const spinner = new Spinner();
  spinner.start(`Fetching DNSSEC keys for ${args.zone}...`);

  try {
    const response = await client.request({
      path: `/config-dns/v2/zones/${args.zone}/dnssec/keys`,
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    spinner.succeed('DNSSEC keys retrieved');

    // CODE KAI: Runtime validation of API response
    if (!isDNSSECKeysResponse(response)) {
      throw new Error('Invalid DNSSEC keys response from API');
    }

    const keys = response.keys || [];
    let output = `${icons.dns} DNSSEC Keys for ${format.cyan(args.zone)}:\n\n`;

    if (keys.length === 0) {
      output += `${icons.info} No DNSSEC keys found. DNSSEC may not be enabled.`;
    } else {
      // CODE KAI: Type-safe key filtering with proper typing
      const ksks = keys.filter((k) => k.keyType === 'KSK');
      const zsks = keys.filter((k) => k.keyType === 'ZSK');

      if (ksks.length > 0) {
        output += `${format.green('Key Signing Keys (KSK)')}:\n`;
        ksks.forEach((key) => {
          output += `  Key Tag: ${format.cyan(String(key.keyTag))}\n`;
          output += `  Algorithm: ${format.dim(key.algorithm)}\n`;
          output += `  Status: ${key.status === 'ACTIVE' ? format.green(key.status) : format.yellow(key.status)}\n`;
          output += `  Created: ${format.dim(key.createdDate)}\n`;
          if (key.publicKey) {
            output += `  Public Key: ${format.dim(key.publicKey.substring(0, 50) + '...')}\n`;
          }
          output += '\n';
        });
      }

      if (zsks.length > 0) {
        output += `${format.green('Zone Signing Keys (ZSK)')}:\n`;
        zsks.forEach((key) => {
          output += `  Key Tag: ${format.cyan(String(key.keyTag))}\n`;
          output += `  Algorithm: ${format.dim(key.algorithm)}\n`;
          output += `  Status: ${key.status === 'ACTIVE' ? format.green(key.status) : format.yellow(key.status)}\n`;
          output += `  Created: ${format.dim(key.createdDate)}\n\n`;
        });
      }
    }

    return {
      content: [{
        type: 'text',
        text: output,
      }],
    };
  } catch (error) {
    spinner.fail('Failed to fetch DNSSEC keys');
    // CODE KAI: Improved error context for key retrieval
    if (error instanceof Error) {
      if (error.message.includes('404')) {
        throw new Error(`Zone ${args.zone} not found or DNSSEC not enabled. Enable DNSSEC first using 'enable-dnssec'.`);
      } else if (error.message.includes('403')) {
        throw new Error(`Access denied: You don't have permission to view DNSSEC keys for zone ${args.zone}.`);
      }
    }
    throw new Error(`Failed to fetch DNSSEC keys: ${String(error)}`);
  }
}

/**
 * Get DS records for parent zone delegation
 */
export async function getDNSSECDSRecords(
  client: AkamaiClient,
  args: {
    zone: string;
  },
): Promise<MCPToolResponse> {
  const spinner = new Spinner();
  spinner.start(`Fetching DS records for ${args.zone}...`);

  try {
    const response = await client.request({
      path: `/config-dns/v2/zones/${args.zone}/dnssec/ds-records`,
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    spinner.succeed('DS records retrieved');

    // CODE KAI: Runtime validation of DS records response
    if (!isDNSSECDSRecordsResponse(response)) {
      throw new Error('Invalid DS records response from API');
    }

    const dsRecords = response.dsRecords || [];
    let output = `${icons.dns} DS Records for ${format.cyan(args.zone)}:\n\n`;

    if (dsRecords.length === 0) {
      output += `${icons.info} No DS records found. DNSSEC may not be enabled.`;
    } else {
      output += `${icons.info} Add these DS records to your parent zone or domain registrar:\n\n`;
      
      // CODE KAI: Type-safe DS record iteration
      dsRecords.forEach((ds, index) => {
        output += `${format.green(`DS Record ${index + 1}`)}:\n`;
        output += `  Key Tag: ${format.cyan(String(ds.keyTag))}\n`;
        output += `  Algorithm: ${format.cyan(String(ds.algorithm))} (${getAlgorithmName(ds.algorithm)})\n`;
        output += `  Digest Type: ${format.cyan(String(ds.digestType))} (${getDigestTypeName(String(ds.digestType))})\n`;
        output += `  Digest: ${format.yellow(ds.digest)}\n\n`;
        
        // Provide copy-paste format
        output += `  ${format.dim('Copy-paste format')}:\n`;
        output += `  ${format.dim(`${args.zone}. IN DS ${ds.keyTag} ${ds.algorithm} ${ds.digestType} ${ds.digest}`)}\n\n`;
      });
    }

    return {
      content: [{
        type: 'text',
        text: output,
      }],
    };
  } catch (error) {
    spinner.fail('Failed to fetch DS records');
    // CODE KAI: Context-aware error messages for DS records
    if (error instanceof Error) {
      if (error.message.includes('404')) {
        throw new Error(`DNSSEC not enabled for zone ${args.zone}. Enable DNSSEC first using 'enable-dnssec'.`);
      } else if (error.message.includes('403')) {
        throw new Error(`Access denied: You don't have permission to view DS records for zone ${args.zone}.`);
      }
    }
    throw new Error(`Failed to fetch DS records: ${String(error)}`);
  }
}

/**
 * Check DNSSEC validation status
 */
export async function checkDNSSECValidation(
  client: AkamaiClient,
  args: {
    zone: string;
  },
): Promise<MCPToolResponse> {
  const spinner = new Spinner();
  spinner.start(`Checking DNSSEC validation for ${args.zone}...`);

  try {
    const response = await client.request({
      path: `/config-dns/v2/zones/${args.zone}/dnssec/validation`,
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    spinner.succeed('Validation status retrieved');

    // CODE KAI: Type-safe validation response handling
    const validation = response as DNSSECValidation;
    let output = `${icons.dns} DNSSEC Validation Status for ${format.cyan(args.zone)}:\n\n`;
    
    const status = validation.validationStatus || 'UNKNOWN';
    let statusColor = format.dim;
    let statusIcon = icons.info;
    
    switch (status) {
      case 'SECURE':
        statusColor = format.green;
        statusIcon = icons.success;
        break;
      case 'INSECURE':
        statusColor = format.yellow;
        statusIcon = icons.warning;
        break;
      case 'BOGUS':
        statusColor = format.red;
        statusIcon = icons.error;
        break;
    }
    
    output += `${statusIcon} Status: ${statusColor(status)}\n`;
    
    if (validation.lastValidated) {
      output += `Last Validated: ${format.dim(validation.lastValidated)}\n`;
    }
    
    if (validation.chainOfTrust && validation.chainOfTrust.length > 0) {
      output += `\n${format.cyan('Chain of Trust')}:\n`;
      validation.chainOfTrust.forEach((link) => {
        const linkStatus = link.status === 'SECURE' ? format.green('✓') : format.red('✗');
        output += `  ${linkStatus} ${link.zone}\n`;
      });
    }
    
    if (status === 'BOGUS') {
      output += `\n${icons.error} ${format.red('Action Required')}: DNSSEC validation is failing. Check:\n`;
      output += `  1. DS records in parent zone match current KSK\n`;
      output += `  2. Zone is properly signed\n`;
      output += `  3. No expired signatures\n`;
    } else if (status === 'INSECURE') {
      output += `\n${icons.warning} ${format.yellow('Note')}: Zone is not secured by DNSSEC. DS records may be missing from parent zone.\n`;
    }

    return {
      content: [{
        type: 'text',
        text: output,
      }],
    };
  } catch (error) {
    spinner.fail('Failed to check validation status');
    // CODE KAI: Validation-specific error handling
    if (error instanceof Error) {
      if (error.message.includes('503')) {
        throw new Error(`DNSSEC validation service temporarily unavailable. Try again in a few minutes.`);
      } else if (error.message.includes('404')) {
        throw new Error(`Zone ${args.zone} not found or DNSSEC not enabled.`);
      }
    }
    throw new Error(`Failed to check validation status: ${String(error)}`);
  }
}

/**
 * Initiate DNSSEC key rotation
 */
export async function rotateDNSSECKeys(
  client: AkamaiClient,
  args: {
    zone: string;
    keyType: 'KSK' | 'ZSK' | 'BOTH';
    algorithm?: string;
  },
): Promise<MCPToolResponse> {
  const spinner = new Spinner();
  spinner.start(`Initiating key rotation for ${args.zone}...`);

  try {
    // CODE KAI: Type-safe key rotation request
    const body: KeyRotationRequest = {
      keyType: args.keyType,
    };
    
    if (args.algorithm) {
      body.algorithm = args.algorithm;
    }

    const response = await client.request({
      path: `/config-dns/v2/zones/${args.zone}/dnssec/key-rotation`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body,
    });

    spinner.succeed('Key rotation initiated');

    const rotationResponse = response as KeyRotationResponse;
    let output = `${icons.success} DNSSEC key rotation initiated for ${format.cyan(args.zone)}\n\n`;
    output += `Key Type: ${format.green(args.keyType)}\n`;
    
    if (args.algorithm) {
      output += `New Algorithm: ${format.green(args.algorithm)}\n`;
    }
    
    if (rotationResponse.rotationId) {
      output += `Rotation ID: ${format.dim(rotationResponse.rotationId)}\n`;
    }
    
    output += `\n${icons.info} Next steps:\n`;
    
    if (args.keyType === 'KSK' || args.keyType === 'BOTH') {
      output += `1. Wait for new KSK to be active\n`;
      output += `2. Get new DS records using 'get-dnssec-ds-records'\n`;
      output += `3. Update DS records at parent zone/registrar\n`;
      output += `4. Complete rotation after DS records propagate\n`;
    } else {
      output += `1. ZSK rotation will complete automatically\n`;
      output += `2. No action required at parent zone\n`;
    }

    return {
      content: [{
        type: 'text',
        text: output,
      }],
    };
  } catch (error) {
    spinner.fail('Failed to initiate key rotation');
    // CODE KAI: Key rotation error guidance
    if (error instanceof Error) {
      if (error.message.includes('409')) {
        throw new Error(`Key rotation already in progress for zone ${args.zone}. Wait for current rotation to complete.`);
      } else if (error.message.includes('400')) {
        throw new Error(`Invalid key rotation parameters. Algorithm '${args.algorithm}' may not be supported for rotation.`);
      } else if (error.message.includes('403')) {
        throw new Error(`Permission denied: Cannot rotate keys for zone ${args.zone}. Check account permissions.`);
      }
    }
    throw new Error(`Failed to initiate key rotation: ${String(error)}`);
  }
}

// CODE KAI: Helper functions for human-readable output
function getAlgorithmName(algorithm: number): string {
  const algorithms: Record<number, string> = {
    7: 'RSASHA1-NSEC3-SHA1',
    8: 'RSASHA256',
    10: 'RSASHA512',
    13: 'ECDSAP256SHA256',
    14: 'ECDSAP384SHA384',
    15: 'ED25519',
    16: 'ED448',
  };
  return algorithms[algorithm] || 'Unknown';
}

function getDigestTypeName(digestType: string): string {
  const digestTypes: Record<string, string> = {
    '1': 'SHA-1',
    '2': 'SHA-256',
    '3': 'GOST R 34.11-94',
    '4': 'SHA-384',
  };
  return digestTypes[digestType] || 'Unknown';
}