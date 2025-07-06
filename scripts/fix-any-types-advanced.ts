#!/usr/bin/env tsx
/**
 * Advanced script to fix remaining 'any' type violations
 * Targets complex patterns that require more sophisticated replacements
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

interface FileFixResult {
  path: string;
  originalCount: number;
  fixedCount: number;
  remainingCount: number;
  patterns: string[];
}

interface ComplexFixPattern {
  name: string;
  detect: RegExp;
  fix: (match: string, ...args: string[]) => string;
  description: string;
}

const COMPLEX_FIX_PATTERNS: ComplexFixPattern[] = [
  {
    name: 'lazy-zod-type',
    detect: /const\s+(\w+Schema):\s*z\.ZodType<any>/g,
    fix: (match, schemaName) => {
      // For recursive schemas, use z.ZodType with proper type parameter
      return match.replace('<any>', '<unknown>');
    },
    description: 'Replace z.ZodType<any> with z.ZodType<unknown>'
  },
  {
    name: 'array-any-in-generics',
    detect: /items\?\s*:\s*any\[\]/g,
    fix: () => 'items?: unknown[]',
    description: 'Replace items?: any[] with items?: unknown[]'
  },
  {
    name: 'response-any-type',
    detect: /response:\s*any/g,
    fix: () => 'response: unknown',
    description: 'Replace response: any with response: unknown'
  },
  {
    name: 'data-any-type',
    detect: /data:\s*any/g,
    fix: () => 'data: unknown',
    description: 'Replace data: any with data: unknown'
  },
  {
    name: 'result-any-type',
    detect: /result:\s*any/g,
    fix: () => 'result: unknown',
    description: 'Replace result: any with result: unknown'
  },
  {
    name: 'value-any-type',
    detect: /value:\s*any/g,
    fix: () => 'value: unknown',
    description: 'Replace value: any with value: unknown'
  },
  {
    name: 'obj-any-parameter',
    detect: /\(obj:\s*any\)/g,
    fix: () => '(obj: unknown)',
    description: 'Replace (obj: any) with (obj: unknown)'
  },
  {
    name: 'tool-any-foreach',
    detect: /\.forEach\(\((\w+):\s*any,?\s*(\w+)?:?\s*\w*\)\s*=>/g,
    fix: (match, param1, param2) => {
      if (param2) {
        return `.forEach((${param1}: unknown, ${param2}: number) =>`;
      }
      return `.forEach((${param1}: unknown) =>`;
    },
    description: 'Fix forEach with any type parameters'
  },
  {
    name: 'record-string-any',
    detect: /Record<string,\s*any>/g,
    fix: () => 'Record<string, unknown>',
    description: 'Replace Record<string, any> with Record<string, unknown>'
  },
  {
    name: 'type-assertion-any',
    detect: /as\s+any(?=[\s,;)\]}])/g,
    fix: () => 'as unknown',
    description: 'Replace type assertions "as any" with "as unknown"'
  },
  {
    name: 'function-return-any',
    detect: /\):\s*any\s*{/g,
    fix: () => '): unknown {',
    description: 'Replace function return type any with unknown'
  },
  {
    name: 'promise-any',
    detect: /Promise<any>/g,
    fix: () => 'Promise<unknown>',
    description: 'Replace Promise<any> with Promise<unknown>'
  },
  {
    name: 'array-any-standalone',
    detect: /:\s*any\[\]/g,
    fix: () => ': unknown[]',
    description: 'Replace : any[] with : unknown[]'
  },
  {
    name: 'template-placeholders',
    detect: /const\s+replacePlaceholders\s*=\s*\(obj:\s*unknown\):\s*any\s*=>/g,
    fix: () => 'const replacePlaceholders = (obj: unknown): unknown =>',
    description: 'Fix replacePlaceholders function signature'
  },
  {
    name: 'result-record-any',
    detect: /const\s+result:\s*Record<string,\s*any>\s*=/g,
    fix: () => 'const result: Record<string, unknown> =',
    description: 'Fix result variable with Record<string, any>'
  },
  {
    name: 'api-response-any',
    detect: /validateApiResponse<{\s*(\w+)\?\s*:\s*{\s*items\?\s*:\s*any\[\]\s*}\s*}>/g,
    fix: (match, prop) => `validateApiResponse<{ ${prop}?: { items?: unknown[] } }>`,
    description: 'Fix validateApiResponse generic with any[]'
  },
  {
    name: 'error-details-any',
    detect: /errorDetails\?\s*:\s*any/g,
    fix: () => 'errorDetails?: unknown',
    description: 'Replace errorDetails?: any with errorDetails?: unknown'
  },
  {
    name: 'custom-data-any',
    detect: /customData\?\s*:\s*Record<string,\s*any>/g,
    fix: () => 'customData?: Record<string, unknown>',
    description: 'Fix customData with Record<string, any>'
  },
  {
    name: 'zod-record-any',
    detect: /z\.record\(z\.any\(\)\)/g,
    fix: () => 'z.record(z.unknown())',
    description: 'Replace z.record(z.any()) with z.record(z.unknown())'
  },
  {
    name: 'options-record-any',
    detect: /options\?\s*:\s*Record<string,\s*any>/g,
    fix: () => 'options?: Record<string, unknown>',
    description: 'Fix options with Record<string, any>'
  }
];

function fixAnyTypesInFile(filePath: string): FileFixResult {
  const originalContent = readFileSync(filePath, 'utf8');
  let content = originalContent;
  
  const originalCount = (content.match(/\bany\b/g) || []).length;
  const appliedPatterns: string[] = [];
  
  // Apply complex patterns
  for (const pattern of COMPLEX_FIX_PATTERNS) {
    const matches = content.match(pattern.detect);
    if (matches && matches.length > 0) {
      content = content.replace(pattern.detect, pattern.fix);
      appliedPatterns.push(`${pattern.name} (${matches.length} fixes)`);
    }
  }
  
  // Additional specific fixes for common patterns in the codebase
  
  // Fix specific validateApiResponse patterns
  content = content.replace(
    /validateApiResponse<{\s*(\w+)\s*:\s*{\s*items\?\s*:\s*any\[\]\s*}\s*}>/g,
    'validateApiResponse<{ $1: { items?: unknown[] } }>'
  );
  
  // Fix nested object patterns
  content = content.replace(
    /\[\s*key:\s*string\s*\]:\s*any/g,
    '[key: string]: unknown'
  );
  
  // Fix function parameter destructuring with any
  content = content.replace(
    /\(\s*{\s*([^}]+)\s*}:\s*any\s*\)/g,
    (match, params) => {
      // For now, just replace with unknown - could be improved with proper typing
      return `({ ${params} }: unknown)`;
    }
  );
  
  // Fix inline type definitions
  content = content.replace(
    /:\s*{\s*\[key:\s*string\]:\s*any\s*}/g,
    ': { [key: string]: unknown }'
  );
  
  // Fix specific rule tree patterns
  if (filePath.includes('rule-tree') || filePath.includes('property-template')) {
    // Special handling for recursive types
    content = content.replace(
      /const\s+(\w+Schema):\s*z\.ZodType<any>\s*=\s*z\.lazy/g,
      'const $1Schema: z.ZodType<unknown> = z.lazy'
    );
    
    // Fix template variable patterns
    content = content.replace(
      /defaultValue\?\s*:\s*any/g,
      'defaultValue?: unknown'
    );
    
    // Fix validation function patterns
    content = content.replace(
      /customValidator\?\s*:\s*\(value:\s*any\)\s*=>\s*boolean\s*\|\s*string/g,
      'customValidator?: (value: unknown) => boolean | string'
    );
  }
  
  // Fix traffic analytics specific patterns
  if (filePath.includes('TrafficAnalyticsService')) {
    // Fix metric data patterns
    content = content.replace(
      /data:\s*any\[\]/g,
      'data: unknown[]'
    );
    
    // Fix response data patterns
    content = content.replace(
      /responseData:\s*any/g,
      'responseData: unknown'
    );
  }
  
  // Fix API discovery patterns
  if (filePath.includes('api-discovery')) {
    // Fix simulation patterns
    content = content.replace(
      /simulation:\s*\(\)\s*=>\s*Promise<any>/g,
      'simulation: () => Promise<unknown>'
    );
    
    // Fix response validation patterns
    content = content.replace(
      /\(response:\s*any\)/g,
      '(response: unknown)'
    );
  }
  
  const fixedCount = originalCount - (content.match(/\bany\b/g) || []).length;
  const remainingCount = (content.match(/\bany\b/g) || []).length;
  
  if (content !== originalContent) {
    writeFileSync(filePath, content);
  }
  
  return {
    path: filePath,
    originalCount,
    fixedCount,
    remainingCount,
    patterns: appliedPatterns
  };
}

function findTypeScriptFiles(dir: string, files: string[] = []): string[] {
  const entries = readdirSync(dir);
  
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    
    if (stat.isDirectory()) {
      // Skip directories
      if (entry === 'node_modules' || 
          entry === '.git' || 
          entry === 'dist' || 
          entry === 'build' ||
          entry === '.archive' ||
          entry === 'coverage') {
        continue;
      }
      findTypeScriptFiles(fullPath, files);
    } else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Priority files with most 'any' violations
const PRIORITY_FILES = [
  'src/tools/property-version-management.ts', // 32 violations
  'src/services/TrafficAnalyticsService.ts', // 26 violations
  'src/tools/rule-tree-management.ts', // 23 violations
  'src/tools/rule-tree-advanced.ts', // 22 violations
  'src/scripts/api-discovery-standalone.ts', // 21 violations
  'src/templates/property-templates.ts', // 18 violations
];

async function main() {
  console.log('🔧 Advanced TypeScript "any" Type Fixer');
  console.log('======================================\n');
  
  const srcPath = join(process.cwd(), 'src');
  const results: FileFixResult[] = [];
  
  // First, fix priority files
  console.log('📌 Fixing priority files with most violations...\n');
  
  for (const priorityFile of PRIORITY_FILES) {
    const fullPath = join(process.cwd(), priorityFile);
    try {
      const result = fixAnyTypesInFile(fullPath);
      if (result.fixedCount > 0) {
        results.push(result);
        console.log(`✅ ${priorityFile}`);
        console.log(`   Fixed: ${result.fixedCount}, Remaining: ${result.remainingCount}`);
        if (result.patterns.length > 0) {
          console.log(`   Patterns: ${result.patterns.join(', ')}`);
        }
      }
    } catch (error) {
      console.log(`❌ Error processing ${priorityFile}: ${error.message}`);
    }
  }
  
  // Then fix remaining files
  console.log('\n📂 Scanning remaining TypeScript files...\n');
  
  const allFiles = findTypeScriptFiles(srcPath);
  const remainingFiles = allFiles.filter(f => !PRIORITY_FILES.some(p => f.endsWith(p)));
  
  for (const file of remainingFiles) {
    try {
      const result = fixAnyTypesInFile(file);
      if (result.fixedCount > 0) {
        results.push(result);
        const relativePath = file.replace(process.cwd() + '/', '');
        console.log(`✅ ${relativePath}: Fixed ${result.fixedCount} violations`);
      }
    } catch (error) {
      console.error(`Error processing ${file}:`, error);
    }
  }
  
  // Summary
  const totalFixed = results.reduce((sum, r) => sum + r.fixedCount, 0);
  const totalRemaining = results.reduce((sum, r) => sum + r.remainingCount, 0);
  
  console.log('\n📊 Summary');
  console.log('==========');
  console.log(`Total files processed: ${results.length}`);
  console.log(`Total "any" violations fixed: ${totalFixed}`);
  console.log(`Total "any" violations remaining: ${totalRemaining}`);
  
  if (results.length > 0) {
    console.log('\n📋 Top files with remaining violations:');
    const topRemaining = results
      .filter(r => r.remainingCount > 0)
      .sort((a, b) => b.remainingCount - a.remainingCount)
      .slice(0, 10);
    
    topRemaining.forEach(r => {
      const relativePath = r.path.replace(process.cwd() + '/', '');
      console.log(`   ${relativePath}: ${r.remainingCount} remaining`);
    });
  }
  
  console.log('\n✨ Advanced fixing complete!');
  console.log('\nNext steps:');
  console.log('1. Run TypeScript compiler to check for any type errors');
  console.log('2. Manually review files with remaining violations');
  console.log('3. Consider creating proper type definitions for complex cases');
}

main().catch(console.error);