#!/usr/bin/env tsx

/**
 * Manual specific fixes for stubborn 'any' type violations
 * Target: 120 remaining violations
 * Strategy: Very specific replacements for known patterns
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface ManualFix {
  file: string;
  replacements: Array<{
    from: string;
    to: string;
  }>;
}

const MANUAL_FIXES: ManualFix[] = [
  {
    file: 'src/utils/ajv-validator.ts',
    replacements: [
      { from: 'const ajvInstance: any = ajv', to: 'const ajvInstance = ajv as unknown' },
      { from: 'schema: any', to: 'schema: unknown' },
      { from: 'data: any', to: 'data: unknown' },
      { from: 'errors: any[]', to: 'errors: ValidationError[]' },
      { from: 'validator: any', to: 'validator: ValidatorFunction' }
    ]
  },
  {
    file: 'src/utils/api-response-validator.ts',
    replacements: [
      { from: 'validateApiResponse<any>', to: 'validateApiResponse<unknown>' },
      { from: 'response: any', to: 'response: unknown' },
      { from: 'schema: any', to: 'schema: unknown' },
      { from: 'as any', to: 'as unknown' },
      { from: 'data: any', to: 'data: unknown' }
    ]
  },
  {
    file: 'src/utils/edgegrid-client.ts',
    replacements: [
      { from: 'Promise<any>', to: 'Promise<unknown>' },
      { from: 'body: any', to: 'body: unknown' },
      { from: 'response: any', to: 'response: unknown' },
      { from: 'error: any', to: 'error: unknown' },
      { from: 'headers: any', to: 'headers: Record<string, string>' }
    ]
  },
  {
    file: 'src/utils/performance-monitor.ts',
    replacements: [
      { from: 'metrics: any', to: 'metrics: Record<string, number | string>' },
      { from: 'metric: any', to: 'metric: { name: string; value: number; timestamp: number }' },
      { from: 'data: any', to: 'data: unknown' },
      { from: 'Map<string, any>', to: 'Map<string, { count: number; totalTime: number; avgTime: number }>' }
    ]
  },
  {
    file: 'src/testing/simple-mcp-test.ts',
    replacements: [
      { from: 'args: any', to: 'args: Record<string, unknown>' },
      { from: 'result: any', to: 'result: unknown' },
      { from: 'error: any', to: 'error: unknown' },
      { from: 'response: any', to: 'response: { content: Array<{ type: string; text?: string }> }' }
    ]
  },
  {
    file: 'src/tools/bulk-operations-manager.ts',
    replacements: [
      { from: 'operations: any[]', to: 'operations: Array<{ propertyId: string; action: string; params?: unknown }>' },
      { from: 'operation: any', to: 'operation: { propertyId: string; action: string; params?: unknown }' },
      { from: 'result: any', to: 'result: { success: boolean; data?: unknown; error?: string }' },
      { from: 'params: any', to: 'params: unknown' }
    ]
  },
  {
    file: 'src/tools/property-activation-advanced.ts',
    replacements: [
      { from: 'activations: any[]', to: 'activations: Array<{ propertyId: string; version: number; network: string }>' },
      { from: 'activation: any', to: 'activation: { propertyId: string; version: number; network: string; status?: string }' },
      { from: 'status: any', to: 'status: { state: string; message?: string }' },
      { from: 'response: any', to: 'response: unknown' }
    ]
  },
  {
    file: 'src/tools/property-onboarding-tools.ts',
    replacements: [
      { from: 'config: any', to: 'config: { propertyName: string; hostnames: string[]; originHostname: string }' },
      { from: 'options: any', to: 'options: { contractId?: string; groupId?: string; productId?: string }' },
      { from: 'rules: any', to: 'rules: { behaviors: unknown[]; children: unknown[]; criteria: unknown[] }' },
      { from: 'behavior: any', to: 'behavior: { name: string; options: unknown }' }
    ]
  },
  {
    file: 'src/tools/property-operations-advanced.ts',
    replacements: [
      { from: 'operations: any[]', to: 'operations: Array<{ type: string; propertyId: string; params: unknown }>' },
      { from: 'op: any', to: 'op: { type: string; propertyId: string; params: unknown }' },
      { from: 'result: any', to: 'result: { success: boolean; data?: unknown; error?: string }' },
      { from: 'data: any', to: 'data: unknown' }
    ]
  },
  {
    file: 'src/tools/universal-search-with-cache.ts',
    replacements: [
      { from: 'results: any[]', to: 'results: Array<{ type: string; id: string; name: string; data?: unknown }>' },
      { from: 'result: any', to: 'result: { type: string; id: string; name: string; data?: unknown }' },
      { from: 'searchData: any', to: 'searchData: { query: string; filters?: Record<string, unknown> }' },
      { from: 'item: any', to: 'item: unknown' }
    ]
  },
  {
    file: 'src/types/mcp-protocol.ts',
    replacements: [
      { from: 'data?: any;', to: 'data?: unknown;' },
      { from: 'params?: any;', to: 'params?: Record<string, unknown>;' },
      { from: 'handler: (request: MCPRequest, extra?: any)', to: 'handler: (request: MCPRequest, extra?: unknown)' }
    ]
  },
  {
    file: 'src/types/cache-interface.ts',
    replacements: [
      { from: 'value: any', to: 'value: unknown' },
      { from: 'get(key: string): any', to: 'get(key: string): unknown' },
      { from: 'set(key: string, value: any', to: 'set(key: string, value: unknown' }
    ]
  },
  {
    file: 'src/utils/request-coalescer.ts',
    replacements: [
      { from: 'args: any', to: 'args: Record<string, unknown>' },
      { from: 'const { propertyId, version, customer, contractId, groupId } = args || {}', to: 'const { propertyId, version, customer, contractId, groupId } = (args as Record<string, unknown>) || {}' },
      { from: 'const { query, propertyName, hostname, contractId, groupId } = args || {}', to: 'const { query, propertyName, hostname, contractId, groupId } = (args as Record<string, unknown>) || {}' }
    ]
  }
];

function applyManualFixes(fix: ManualFix): { success: boolean; fixCount: number; error?: string } {
  const filePath = join(process.cwd(), fix.file);
  
  try {
    let content = readFileSync(filePath, 'utf-8');
    let fixCount = 0;
    
    for (const replacement of fix.replacements) {
      // Count occurrences before replacement
      const occurrences = (content.match(new RegExp(replacement.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
      
      if (occurrences > 0) {
        // Replace all occurrences
        content = content.replace(
          new RegExp(replacement.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
          replacement.to
        );
        fixCount += occurrences;
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
console.log('🔧 Manual Specific Fixes for Remaining "any" Types');
console.log('='.repeat(60));

let totalFixes = 0;
let filesFixed = 0;
const errors: string[] = [];

for (const fix of MANUAL_FIXES) {
  const result = applyManualFixes(fix);
  
  if (result.success && result.fixCount > 0) {
    console.log(`  ✅ ${fix.file}: Fixed ${result.fixCount} violations`);
    totalFixes += result.fixCount;
    filesFixed++;
  } else if (!result.success) {
    console.log(`  ❌ ${fix.file}: ${result.error}`);
    errors.push(`${fix.file}: ${result.error}`);
  }
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 Manual Fix Summary:');
console.log(`  Files targeted: ${MANUAL_FIXES.length}`);
console.log(`  Files fixed: ${filesFixed}`);
console.log(`  Total violations fixed: ${totalFixes}`);

if (errors.length > 0) {
  console.log(`\n⚠️  Errors encountered in ${errors.length} files`);
}

console.log('\n🎯 Manual fixes complete!');
console.log('Run count-any-types.ts to see final violation count.');