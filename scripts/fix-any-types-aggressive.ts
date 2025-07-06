#!/usr/bin/env tsx

/**
 * Aggressive fix for remaining 'any' type violations
 * Target: 146 violations
 * Strategy: More targeted replacements for specific patterns
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

interface FileSpecificFix {
  file: string;
  fixes: Array<{
    search: string | RegExp;
    replace: string;
  }>;
}

const FILE_SPECIFIC_FIXES: FileSpecificFix[] = [
  {
    file: 'src/utils/pino-logger.ts',
    fixes: [
      { search: /data\?\s*:\s*any/g, replace: 'data?: LogContext' },
      { search: /\(message:\s*string,\s*data\?\s*:\s*any\)/g, replace: '(message: string, data?: LogContext)' }
    ]
  },
  {
    file: 'src/utils/request-coalescer.ts',
    fixes: [
      { search: /\(value:\s*any\)/g, replace: '(value: unknown)' },
      { search: /\(reason:\s*any\)/g, replace: '(reason: unknown)' },
      { search: /resolve:\s*\(value:\s*any\)/g, replace: 'resolve: (value: unknown)' },
      { search: /reject:\s*\(reason:\s*any\)/g, replace: 'reject: (reason: unknown)' }
    ]
  },
  {
    file: 'src/types/api-responses.ts',
    fixes: [
      { search: /:\s*any;/g, replace: ': unknown;' },
      { search: /:\s*any\[\]/g, replace: ': unknown[]' },
      { search: /:\s*any\s*\}/g, replace: ': unknown }' }
    ]
  },
  {
    file: 'src/utils/ajv-validator.ts',
    fixes: [
      { search: /\(schema:\s*any\)/g, replace: '(schema: unknown)' },
      { search: /\(data:\s*any\)/g, replace: '(data: unknown)' },
      { search: /Record<string,\s*any>/g, replace: 'Record<string, unknown>' }
    ]
  },
  {
    file: 'src/utils/api-response-validator.ts',
    fixes: [
      { search: /\(response:\s*any\)/g, replace: '(response: unknown)' },
      { search: /validateApiResponse<any>/g, replace: 'validateApiResponse<unknown>' },
      { search: /as\s+any/g, replace: 'as unknown' }
    ]
  },
  {
    file: 'src/utils/edgegrid-client.ts',
    fixes: [
      { search: /Promise<any>/g, replace: 'Promise<unknown>' },
      { search: /\(error:\s*any\)/g, replace: '(error: unknown)' },
      { search: /catch\s*\(\s*(\w+):\s*any\s*\)/g, replace: 'catch ($1: unknown)' }
    ]
  },
  {
    file: 'src/utils/customer-aware-cache.ts',
    fixes: [
      { search: /CustomerAwareCache<T\s*=\s*any>/g, replace: 'CustomerAwareCache<T = unknown>' },
      { search: /SmartCache<any>/g, replace: 'SmartCache<unknown>' }
    ]
  },
  {
    file: 'src/utils/smart-cache.ts',
    fixes: [
      { search: /SmartCache<T\s*=\s*any>/g, replace: 'SmartCache<T = unknown>' },
      { search: /CacheEntry<any>/g, replace: 'CacheEntry<unknown>' },
      { search: /Map<string,\s*any>/g, replace: 'Map<string, CacheEntry>' }
    ]
  },
  {
    file: 'src/utils/performance-monitor.ts',
    fixes: [
      { search: /metrics:\s*any/g, replace: 'metrics: Record<string, unknown>' },
      { search: /\(metric:\s*any\)/g, replace: '(metric: unknown)' }
    ]
  },
  {
    file: 'src/testing/simple-mcp-test.ts',
    fixes: [
      { search: /\(error:\s*any\)/g, replace: '(error: unknown)' },
      { search: /result:\s*any/g, replace: 'result: unknown' },
      { search: /args:\s*any/g, replace: 'args: unknown' }
    ]
  },
  {
    file: 'src/tools/bulk-operations-manager.ts',
    fixes: [
      { search: /operations:\s*any\[\]/g, replace: 'operations: unknown[]' },
      { search: /\(operation:\s*any\)/g, replace: '(operation: unknown)' }
    ]
  },
  {
    file: 'src/tools/property-activation-advanced.ts',
    fixes: [
      { search: /activations:\s*any\[\]/g, replace: 'activations: unknown[]' },
      { search: /\(activation:\s*any\)/g, replace: '(activation: unknown)' }
    ]
  },
  {
    file: 'src/tools/property-onboarding-tools.ts',
    fixes: [
      { search: /config:\s*any/g, replace: 'config: unknown' },
      { search: /\(options:\s*any\)/g, replace: '(options: unknown)' }
    ]
  },
  {
    file: 'src/tools/property-operations-advanced.ts',
    fixes: [
      { search: /operations:\s*any\[\]/g, replace: 'operations: unknown[]' },
      { search: /\(op:\s*any\)/g, replace: '(op: unknown)' }
    ]
  },
  {
    file: 'src/tools/universal-search-with-cache.ts',
    fixes: [
      { search: /results:\s*any\[\]/g, replace: 'results: unknown[]' },
      { search: /\(result:\s*any\)/g, replace: '(result: unknown)' }
    ]
  }
];

// Generic patterns that apply to all files
const GENERIC_PATTERNS = [
  { search: /\bcatch\s*\(\s*(\w+):\s*any\s*\)/g, replace: 'catch ($1: unknown)' },
  { search: /\bPromise<any>/g, replace: 'Promise<unknown>' },
  { search: /\bArray<any>/g, replace: 'Array<unknown>' },
  { search: /\bRecord<string,\s*any>/g, replace: 'Record<string, unknown>' },
  { search: /\bas\s+any\b/g, replace: 'as unknown' },
  { search: /\bz\.any\(\)/g, replace: 'z.unknown()' },
  { search: /\b:\s*any\[\]/g, replace: ': unknown[]' },
  { search: /\b:\s*any;/g, replace: ': unknown;' },
  { search: /\b:\s*any\s*\)/g, replace: ': unknown)' },
  { search: /\b:\s*any\s*\}/g, replace: ': unknown }' },
  { search: /\b:\s*any,/g, replace: ': unknown,' },
  { search: /\bany\s*\|\s*undefined/g, replace: 'unknown | undefined' },
  { search: /\bundefined\s*\|\s*any/g, replace: 'undefined | unknown' }
];

function processFile(filePath: string): { fixes: number; error?: string } {
  try {
    const content = readFileSync(filePath, 'utf-8');
    let modifiedContent = content;
    let changesMade = false;
    
    // Apply file-specific fixes first
    const fileSpecific = FILE_SPECIFIC_FIXES.find(f => filePath.endsWith(f.file));
    if (fileSpecific) {
      for (const fix of fileSpecific.fixes) {
        const regex = typeof fix.search === 'string' 
          ? new RegExp(fix.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
          : fix.search;
        
        const before = modifiedContent;
        modifiedContent = modifiedContent.replace(regex, fix.replace);
        if (before !== modifiedContent) {
          changesMade = true;
        }
      }
    }
    
    // Apply generic patterns
    for (const pattern of GENERIC_PATTERNS) {
      const before = modifiedContent;
      modifiedContent = modifiedContent.replace(pattern.search, pattern.replace);
      if (before !== modifiedContent) {
        changesMade = true;
      }
    }
    
    // Count actual changes
    const originalAnyCount = (content.match(/\bany\b/g) || []).length;
    const newAnyCount = (modifiedContent.match(/\bany\b/g) || []).length;
    const actualFixes = originalAnyCount - newAnyCount;
    
    // Write back if changes were made
    if (changesMade && actualFixes > 0) {
      writeFileSync(filePath, modifiedContent);
      return { fixes: actualFixes };
    }
    
    return { fixes: 0 };
  } catch (error) {
    return { fixes: 0, error: error.message };
  }
}

function getAllTypeScriptFiles(dir: string): string[] {
  const files: string[] = [];
  
  function traverse(currentDir: string) {
    const entries = readdirSync(currentDir);
    
    for (const entry of entries) {
      const fullPath = join(currentDir, entry);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        if (!entry.startsWith('.') && entry !== 'node_modules' && entry !== 'dist') {
          traverse(fullPath);
        }
      } else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
        files.push(fullPath);
      }
    }
  }
  
  traverse(dir);
  return files;
}

// Main execution
console.log('💪 Aggressive Fix: Eliminating Remaining "any" Types');
console.log('='.repeat(60));

const srcPath = join(process.cwd(), 'src');
const files = getAllTypeScriptFiles(srcPath);

let totalFixes = 0;
let filesFixed = 0;
const errors: string[] = [];

// Process all files
for (const file of files) {
  const result = processFile(file);
  if (result.fixes > 0) {
    const relativePath = file.replace(process.cwd() + '/', '');
    console.log(`  ✅ ${relativePath}: Fixed ${result.fixes} violations`);
    totalFixes += result.fixes;
    filesFixed++;
  } else if (result.error) {
    errors.push(`${file}: ${result.error}`);
  }
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 Aggressive Fix Summary:');
console.log(`  Total files processed: ${files.length}`);
console.log(`  Files fixed: ${filesFixed}`);
console.log(`  Total violations fixed: ${totalFixes}`);

if (errors.length > 0) {
  console.log(`\n⚠️  Errors encountered in ${errors.length} files`);
}

console.log('\n🎯 Aggressive fix complete!');
console.log('Run count-any-types.ts to verify remaining violations.');