#!/usr/bin/env tsx

/**
 * Final push to eliminate remaining 'any' type violations
 * Target: 157 violations across 65 files
 * Focus: High-violation files and common patterns
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

// Type definitions to add to files
const TYPE_DEFINITIONS = {
  LOGGER: `
// Logger type definitions
type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
type LoggerOptions = { level?: LogLevel; name?: string; enabled?: boolean };
type LogContext = Record<string, unknown>;
type LogMethod = (message: string, context?: LogContext) => void;
`,
  REQUEST: `
// Request type definitions  
type RequestConfig = { path: string; method: string; body?: unknown; headers?: Record<string, string> };
type RequestResponse<T = unknown> = { data: T; status: number; headers: Record<string, string> };
type CoalescedRequest = { id: string; promise: Promise<unknown>; resolve: (value: unknown) => void; reject: (error: unknown) => void };
`,
  VALIDATION: `
// Validation type definitions
type ValidatorFunction = (data: unknown) => boolean;
type ValidationError = { path: string; message: string; code?: string };
type SchemaValidator = { validate: ValidatorFunction; errors?: ValidationError[] };
`,
  CACHE: `
// Cache type definitions
type CacheKey = string;
type CacheValue = unknown;
type CacheOptions = { ttl?: number; customer?: string; tags?: string[] };
type CacheEntry = { value: CacheValue; expires: number; tags?: string[] };
`
};

interface FixPattern {
  name: string;
  detect: RegExp | string;
  fix: (match: string, ...args: string[]) => string;
  description: string;
}

const FIX_PATTERNS: FixPattern[] = [
  // Pino logger specific patterns
  {
    name: 'pino-logger-options',
    detect: /options\s*:\s*any/g,
    fix: (match) => match.replace(': any', ': LoggerOptions'),
    description: 'Replace logger options: any'
  },
  {
    name: 'pino-logger-context', 
    detect: /context\s*:\s*any/g,
    fix: (match) => match.replace(': any', ': LogContext'),
    description: 'Replace logger context: any'
  },
  {
    name: 'pino-log-methods',
    detect: /(trace|debug|info|warn|error|fatal)\s*:\s*any/g,
    fix: (match) => match.replace(': any', ': LogMethod'),
    description: 'Replace log method types'
  },
  
  // Request coalescer patterns
  {
    name: 'coalesced-requests',
    detect: /requests\s*:\s*Map<[^,]+,\s*any>/g,
    fix: (match) => match.replace('any>', 'CoalescedRequest>'),
    description: 'Replace Map<string, any> with typed requests'
  },
  {
    name: 'request-promise',
    detect: /Promise<any>/g,
    fix: (match) => 'Promise<unknown>',
    description: 'Replace Promise<any> with Promise<unknown>'
  },
  
  // AJV validator patterns
  {
    name: 'ajv-validator',
    detect: /validator\s*:\s*any/g,
    fix: (match) => match.replace(': any', ': SchemaValidator'),
    description: 'Replace validator: any'
  },
  {
    name: 'ajv-compile',
    detect: /compile\([^)]*\)\s*:\s*any/g,
    fix: (match) => match.replace(': any', ': ValidatorFunction'),
    description: 'Replace compile return type'
  },
  
  // Cache patterns
  {
    name: 'cache-map',
    detect: /cache\s*:\s*Map<[^,]+,\s*any>/g,
    fix: (match) => match.replace('any>', 'CacheEntry>'),
    description: 'Replace cache Map types'
  },
  {
    name: 'cache-get-set',
    detect: /(get|set)\([^)]*\)\s*:\s*any/g,
    fix: (match) => match.replace(': any', ': unknown'),
    description: 'Replace cache method return types'
  },
  
  // Generic patterns
  {
    name: 'catch-error',
    detect: /catch\s*\(\s*(\w+)\s*:\s*any\s*\)/g,
    fix: (match, errorName) => `catch (${errorName}: unknown)`,
    description: 'Replace catch(error: any)'
  },
  {
    name: 'array-methods',
    detect: /\.(map|filter|reduce|forEach|find|some|every)\s*\(\s*\(([^:)]+)\s*:\s*any/g,
    fix: (match, method, param) => match.replace(': any', ': unknown'),
    description: 'Replace array method callbacks'
  },
  {
    name: 'function-params',
    detect: /function\s+\w+\s*\([^)]*(\w+)\s*:\s*any/g,
    fix: (match) => match.replace(': any', ': unknown'),
    description: 'Replace function parameters'
  },
  {
    name: 'arrow-params',
    detect: /\(([^:)]+)\s*:\s*any\s*\)\s*=>/g,
    fix: (match, param) => `(${param}: unknown) =>`,
    description: 'Replace arrow function parameters'
  },
  {
    name: 'zod-any',
    detect: /z\.any\(\)/g,
    fix: () => 'z.unknown()',
    description: 'Replace z.any() with z.unknown()'
  },
  {
    name: 'record-any',
    detect: /Record<string,\s*any>/g,
    fix: () => 'Record<string, unknown>',
    description: 'Replace Record<string, any>'
  },
  {
    name: 'axios-response',
    detect: /AxiosResponse<any>/g,
    fix: () => 'AxiosResponse<unknown>',
    description: 'Replace AxiosResponse<any>'
  }
];

interface FileSpecificFix {
  file: string;
  typeDefinitions?: string;
  patterns?: FixPattern[];
}

const FILE_SPECIFIC_FIXES: FileSpecificFix[] = [
  {
    file: 'src/utils/pino-logger.ts',
    typeDefinitions: TYPE_DEFINITIONS.LOGGER,
    patterns: []
  },
  {
    file: 'src/utils/request-coalescer.ts',
    typeDefinitions: TYPE_DEFINITIONS.REQUEST,
    patterns: []
  },
  {
    file: 'src/utils/ajv-validator.ts',
    typeDefinitions: TYPE_DEFINITIONS.VALIDATION,
    patterns: []
  },
  {
    file: 'src/utils/smart-cache.ts',
    typeDefinitions: TYPE_DEFINITIONS.CACHE,
    patterns: []
  },
  {
    file: 'src/utils/customer-aware-cache.ts',
    typeDefinitions: TYPE_DEFINITIONS.CACHE,
    patterns: []
  }
];

function countAnyInFile(content: string): number {
  // Remove comments and string literals
  const cleanContent = content
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/'[^']*'/g, '""')
    .replace(/"[^"]*"/g, '""')
    .replace(/`[^`]*`/g, '""');
  
  const anyMatches = cleanContent.match(/\bany\b/g) || [];
  return anyMatches.length;
}

function applyPatterns(content: string, patterns: FixPattern[]): { content: string; fixes: number } {
  let modifiedContent = content;
  let totalFixes = 0;
  
  for (const pattern of patterns) {
    const regex = typeof pattern.detect === 'string' 
      ? new RegExp(pattern.detect, 'g')
      : pattern.detect;
    
    const matches = [...modifiedContent.matchAll(regex)];
    
    for (const match of matches) {
      const original = match[0];
      const fixed = pattern.fix(original, ...match.slice(1));
      
      if (original !== fixed) {
        modifiedContent = modifiedContent.replace(original, fixed);
        totalFixes++;
      }
    }
  }
  
  return { content: modifiedContent, fixes: totalFixes };
}

function addTypeDefinitions(content: string, definitions: string): string {
  // Check if type definitions already exist
  if (content.includes(definitions.trim().split('\n')[1])) {
    return content;
  }
  
  // Add after imports but before first export/class/function
  const lines = content.split('\n');
  let insertIndex = 0;
  let foundImports = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('import ')) {
      foundImports = true;
    } else if (foundImports && !line.startsWith('import ') && line.trim() !== '') {
      insertIndex = i;
      break;
    }
  }
  
  if (insertIndex === 0) {
    // No imports found, add at the beginning
    return definitions + '\n' + content;
  }
  
  lines.splice(insertIndex, 0, definitions);
  return lines.join('\n');
}

function processFile(filePath: string): { fixes: number; error?: string } {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const initialCount = countAnyInFile(content);
    
    if (initialCount === 0) {
      return { fixes: 0 };
    }
    
    let modifiedContent = content;
    let totalFixes = 0;
    
    // Check for file-specific fixes
    const fileSpecific = FILE_SPECIFIC_FIXES.find(f => filePath.endsWith(f.file));
    
    // Add type definitions if specified
    if (fileSpecific?.typeDefinitions) {
      modifiedContent = addTypeDefinitions(modifiedContent, fileSpecific.typeDefinitions);
    }
    
    // Apply file-specific patterns first
    if (fileSpecific?.patterns && fileSpecific.patterns.length > 0) {
      const result = applyPatterns(modifiedContent, fileSpecific.patterns);
      modifiedContent = result.content;
      totalFixes += result.fixes;
    }
    
    // Apply general patterns
    const result = applyPatterns(modifiedContent, FIX_PATTERNS);
    modifiedContent = result.content;
    totalFixes += result.fixes;
    
    // Write back if changes were made
    if (modifiedContent !== content) {
      writeFileSync(filePath, modifiedContent);
      const finalCount = countAnyInFile(modifiedContent);
      const actualFixes = initialCount - finalCount;
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
console.log('🚀 Final Push: Fixing Remaining TypeScript "any" Violations');
console.log('='.repeat(60));

const srcPath = join(process.cwd(), 'src');
const files = getAllTypeScriptFiles(srcPath);

let totalFixes = 0;
let filesFixed = 0;
const errors: string[] = [];

// Priority files (with most violations)
const priorityFiles = [
  'src/utils/pino-logger.ts',
  'src/utils/request-coalescer.ts',
  'src/agents/cdn-provisioning.agent.ts',
  'src/types/api-responses.ts',
  'src/utils/ajv-validator.ts',
  'src/utils/api-response-validator.ts',
  'src/utils/edgegrid-client.ts'
];

// Process priority files first
console.log('\n📌 Processing priority files...');
for (const file of priorityFiles) {
  const fullPath = join(process.cwd(), file);
  if (files.includes(fullPath)) {
    const result = processFile(fullPath);
    if (result.fixes > 0) {
      console.log(`  ✅ ${file}: Fixed ${result.fixes} violations`);
      totalFixes += result.fixes;
      filesFixed++;
    } else if (result.error) {
      console.log(`  ❌ ${file}: ${result.error}`);
      errors.push(`${file}: ${result.error}`);
    }
  }
}

// Process remaining files
console.log('\n📂 Processing remaining files...');
let processedCount = 0;
for (const file of files) {
  if (!priorityFiles.some(pf => file.endsWith(pf))) {
    const result = processFile(file);
    if (result.fixes > 0) {
      const relativePath = file.replace(process.cwd() + '/', '');
      console.log(`  ✅ ${relativePath}: Fixed ${result.fixes} violations`);
      totalFixes += result.fixes;
      filesFixed++;
    } else if (result.error) {
      errors.push(`${file}: ${result.error}`);
    }
    
    processedCount++;
    if (processedCount % 50 === 0) {
      console.log(`  ... processed ${processedCount} files`);
    }
  }
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 Final Push Summary:');
console.log(`  Total files processed: ${files.length}`);
console.log(`  Files fixed: ${filesFixed}`);
console.log(`  Total violations fixed: ${totalFixes}`);

if (errors.length > 0) {
  console.log(`\n⚠️  Errors encountered in ${errors.length} files`);
}

console.log('\n✨ Final push complete!');
console.log('Run count-any-types.ts to see remaining violations.');