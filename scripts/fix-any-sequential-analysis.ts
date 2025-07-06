#!/usr/bin/env tsx

/**
 * Sequential fix based on deep analysis of remaining 118 'any' violations
 * Target: Fix the most common patterns identified
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface TargetedFix {
  file: string;
  description: string;
  fixes: Array<{
    search: string | RegExp;
    replace: string | ((match: string, ...args: string[]) => string);
  }>;
}

// Define proper types for the validators
const VALIDATOR_TYPES = `
// Type definitions for validators
interface PropertyListResponse {
  properties: {
    items: Array<{
      propertyId: string;
      propertyName: string;
      contractId: string;
      groupId: string;
      latestVersion: number;
      stagingVersion: number | null;
      productionVersion: number | null;
      assetId: string;
    }>;
  };
}

interface PropertyVersion {
  propertyId: string;
  propertyVersion: number;
  contractId: string;
  groupId: string;
  propertyName: string;
  updatedByUser: string;
  updatedDate: string;
  productionStatus: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'DEACTIVATED';
  stagingStatus: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'DEACTIVATED';
  etag: string;
  ruleFormat: string;
}

interface Activation {
  activationId: string;
  propertyId: string;
  propertyVersion: number;
  network: 'STAGING' | 'PRODUCTION';
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'ZONE_1' | 'ZONE_2' | 'ZONE_3' | 'ABORTED' | 'FAILED' | 'DEACTIVATED' | 'PENDING_DEACTIVATION' | 'NEW';
  submitDate: string;
  updateDate: string;
  note: string;
  notifyEmails: string[];
}

interface DNSZone {
  zone: string;
  type: 'PRIMARY' | 'SECONDARY' | 'ALIAS';
  comment: string;
  signAndServe: boolean;
  contractId: string;
  activationState: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'PENDING_DELETION';
  lastActivationDate: string;
  lastModifiedDate: string;
  versionId: string;
}

interface DNSRecordSet {
  name: string;
  type: string;
  ttl: number;
  rdata: string[];
}

interface Enrollment {
  enrollmentId: number;
  status: string;
  certificateType: string;
  validationType: string;
  certificateChainType: string;
  networkConfiguration: {
    geography: string;
    secureNetwork: string;
    sniOnly: boolean;
    quicEnabled: boolean;
  };
}
`;

const TARGETED_FIXES: TargetedFix[] = [
  {
    file: 'src/utils/ajv-validator.ts',
    description: 'Fix validator creation with proper types',
    fixes: [
      { 
        search: 'export const propertyListValidator = createValidator<unknown>(PropertyListSchema);',
        replace: 'export const propertyListValidator = createValidator<PropertyListResponse>(PropertyListSchema);'
      },
      { 
        search: 'export const propertyVersionValidator = createValidator<any>(PropertyVersionSchema);',
        replace: 'export const propertyVersionValidator = createValidator<PropertyVersion>(PropertyVersionSchema);'
      },
      { 
        search: 'export const activationValidator = createValidator<any>(ActivationSchema);',
        replace: 'export const activationValidator = createValidator<Activation>(ActivationSchema);'
      },
      { 
        search: 'export const dnsZoneValidator = createValidator<any>(DNSZoneSchema);',
        replace: 'export const dnsZoneValidator = createValidator<DNSZone>(DNSZoneSchema);'
      },
      { 
        search: 'export const dnsRecordSetValidator = createValidator<any>(DNSRecordSetSchema);',
        replace: 'export const dnsRecordSetValidator = createValidator<DNSRecordSet>(DNSRecordSetSchema);'
      },
      { 
        search: 'export const enrollmentValidator = createValidator<any>(EnrollmentSchema);',
        replace: 'export const enrollmentValidator = createValidator<Enrollment>(EnrollmentSchema);'
      }
    ]
  },
  {
    file: 'src/utils/api-response-validator.ts',
    description: 'Fix type guards to return proper types',
    fixes: [
      { 
        search: 'export function isPropertyResponse(response: unknown): response is any {',
        replace: 'export function isPropertyResponse(response: unknown): response is { properties: unknown } {'
      },
      { 
        search: 'export function isHostnamesResponse(response: unknown): response is any {',
        replace: 'export function isHostnamesResponse(response: unknown): response is { hostnames: unknown } {'
      },
      { 
        search: 'export function isActivationResponse(response: unknown): response is any {',
        replace: 'export function isActivationResponse(response: unknown): response is { activationId: unknown } {'
      },
      { 
        search: 'export function isZonesResponse(response: unknown): response is any {',
        replace: 'export function isZonesResponse(response: unknown): response is { zones: unknown } {'
      },
      { 
        search: 'export function isNetworkListResponse(response: unknown): response is any {',
        replace: 'export function isNetworkListResponse(response: unknown): response is { networkLists: unknown } {'
      }
    ]
  },
  {
    file: 'src/utils/edgegrid-client.ts',
    description: 'Fix generic type parameter defaults',
    fixes: [
      { 
        search: /async request<T = any>/g,
        replace: 'async request<T = unknown>'
      },
      { 
        search: /async get<T = any>/g,
        replace: 'async get<T = unknown>'
      },
      { 
        search: /async post<T = any>/g,
        replace: 'async post<T = unknown>'
      },
      { 
        search: /async put<T = any>/g,
        replace: 'async put<T = unknown>'
      },
      { 
        search: /async delete<T = any>/g,
        replace: 'async delete<T = unknown>'
      },
      { 
        search: /async patch<T = any>/g,
        replace: 'async patch<T = unknown>'
      }
    ]
  },
  {
    file: 'src/utils/performance-monitor.ts',
    description: 'Fix performance monitor types',
    fixes: [
      { 
        search: /metrics:\s*any/g,
        replace: 'metrics: Record<string, { count: number; totalTime: number; avgTime: number }>'
      },
      { 
        search: /metric:\s*any/g,
        replace: 'metric: { name: string; value: number; timestamp: number }'
      },
      { 
        search: /Map<string,\s*any>/g,
        replace: 'Map<string, { count: number; totalTime: number; avgTime: number }>'
      }
    ]
  },
  {
    file: 'src/testing/simple-mcp-test.ts',
    description: 'Fix test types',
    fixes: [
      { 
        search: /args:\s*any/g,
        replace: 'args: Record<string, unknown>'
      },
      { 
        search: /result:\s*any/g,
        replace: 'result: unknown'
      },
      { 
        search: /error:\s*any/g,
        replace: 'error: unknown'
      },
      { 
        search: /response:\s*any/g,
        replace: 'response: { content: Array<{ type: string; text?: string }> }'
      }
    ]
  },
  {
    file: 'src/tools/bulk-operations-manager.ts',
    description: 'Fix bulk operations types',
    fixes: [
      { 
        search: /operations:\s*any\[\]/g,
        replace: 'operations: Array<{ propertyId: string; action: string; params?: unknown }>'
      },
      { 
        search: /operation:\s*any/g,
        replace: 'operation: { propertyId: string; action: string; params?: unknown }'
      },
      { 
        search: /result:\s*any/g,
        replace: 'result: { success: boolean; data?: unknown; error?: string }'
      }
    ]
  },
  {
    file: 'src/types/mcp-protocol.ts',
    description: 'Fix MCP protocol types',
    fixes: [
      { 
        search: 'setRequestHandler<T = any>(',
        replace: 'setRequestHandler<T = unknown>('
      }
    ]
  },
  {
    file: 'src/types/cache-interface.ts',
    description: 'Fix cache interface types',
    fixes: [
      { 
        search: /value:\s*any/g,
        replace: 'value: unknown'
      },
      { 
        search: 'get(key: string): any',
        replace: 'get(key: string): unknown'
      },
      { 
        search: 'set(key: string, value: any',
        replace: 'set(key: string, value: unknown'
      }
    ]
  },
  {
    file: 'src/utils/customer-aware-cache.ts',
    description: 'Fix customer aware cache types',
    fixes: [
      { 
        search: /CustomerAwareCache<any>/g,
        replace: 'CustomerAwareCache<unknown>'
      },
      { 
        search: /getCustomerCache<T = any>/g,
        replace: 'getCustomerCache<T = unknown>'
      }
    ]
  }
];

function addTypeDefinitionsToFile(filePath: string, typeDefinitions: string): void {
  const content = readFileSync(filePath, 'utf-8');
  
  // Check if types already exist
  if (content.includes('interface PropertyListResponse') || 
      content.includes('interface PropertyVersion')) {
    return;
  }
  
  // Find the right place to insert (after imports)
  const lines = content.split('\n');
  let insertIndex = 0;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('import ') || lines[i].trim() === '') {
      continue;
    } else {
      insertIndex = i;
      break;
    }
  }
  
  lines.splice(insertIndex, 0, typeDefinitions);
  writeFileSync(filePath, lines.join('\n'));
}

function applyFixes(fix: TargetedFix): { success: boolean; fixCount: number; error?: string } {
  const filePath = join(process.cwd(), fix.file);
  
  try {
    let content = readFileSync(filePath, 'utf-8');
    let fixCount = 0;
    
    // Add type definitions if needed (only for ajv-validator.ts)
    if (fix.file === 'src/utils/ajv-validator.ts') {
      addTypeDefinitionsToFile(filePath, VALIDATOR_TYPES);
      content = readFileSync(filePath, 'utf-8'); // Re-read after adding types
    }
    
    // Apply fixes
    for (const replacement of fix.fixes) {
      const before = content;
      
      if (typeof replacement.search === 'string') {
        // String replacement
        content = content.replace(replacement.search, replacement.replace as string);
      } else {
        // RegExp replacement
        content = content.replace(replacement.search, replacement.replace as string);
      }
      
      if (before !== content) {
        fixCount++;
      }
    }
    
    if (fixCount > 0) {
      writeFileSync(filePath, content);
      return { success: true, fixCount };
    }
    
    return { success: true, fixCount: 0 };
  } catch (error) {
    return { success: false, fixCount: 0, error: error.message };
  }
}

// Main execution
console.log('🎯 Sequential Analysis Fix for Remaining "any" Types');
console.log('='.repeat(60));

let totalFixes = 0;
let filesFixed = 0;
const errors: string[] = [];

for (const fix of TARGETED_FIXES) {
  const result = applyFixes(fix);
  
  if (result.success && result.fixCount > 0) {
    console.log(`  ✅ ${fix.file}: ${fix.description} (${result.fixCount} fixes)`);
    totalFixes += result.fixCount;
    filesFixed++;
  } else if (!result.success) {
    console.log(`  ❌ ${fix.file}: ${result.error}`);
    errors.push(`${fix.file}: ${result.error}`);
  } else {
    console.log(`  ⏭️  ${fix.file}: No changes needed`);
  }
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 Sequential Fix Summary:');
console.log(`  Files targeted: ${TARGETED_FIXES.length}`);
console.log(`  Files fixed: ${filesFixed}`);
console.log(`  Total fixes applied: ${totalFixes}`);

if (errors.length > 0) {
  console.log(`\n⚠️  Errors encountered in ${errors.length} files`);
}

console.log('\n✨ Sequential analysis fix complete!');
console.log('Run count-any-types.ts to verify progress.');