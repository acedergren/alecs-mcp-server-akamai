#!/usr/bin/env tsx
/**
 * Targeted fix for remaining any type violations
 * Focuses on the most common patterns found in high-violation files
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

// Define proper types for common patterns
const PERIOD_TYPE = `{ start: string; end: string; granularity?: string }`;
const FILTER_TYPE = `{ hostname?: string; cpCode?: string; region?: string; contentType?: string }`;
const TIME_SERIES_TYPE = `Array<{ timestamp: string; value: number }>`;

interface FixPattern {
  name: string;
  detect: RegExp;
  fix: (match: string, ...args: string[]) => string;
  description: string;
}

const FIX_PATTERNS: FixPattern[] = [
  // Period parameter pattern
  {
    name: 'period-parameter',
    detect: /(\w+)\s*:\s*any(\s*[,)].*?period)/g,
    fix: (match, paramName) => {
      if (paramName === 'period') {
        return match.replace(': any', `: ${PERIOD_TYPE}`);
      }
      return match;
    },
    description: 'Replace period: any with proper type'
  },
  
  // Filter parameter pattern
  {
    name: 'filter-parameter',
    detect: /filter\?\s*:\s*any/g,
    fix: () => `filter?: ${FILTER_TYPE}`,
    description: 'Replace filter?: any with proper type'
  },
  
  // Method return type Promise<any[]>
  {
    name: 'promise-any-array',
    detect: /:\s*Promise<any\[\]>/g,
    fix: () => `: Promise<${TIME_SERIES_TYPE}>`,
    description: 'Replace Promise<any[]> with typed array'
  },
  
  // Simple any array parameter
  {
    name: 'any-array-parameter',
    detect: /(\w+)\s*:\s*any\[\]/g,
    fix: (match, paramName) => {
      if (paramName.includes('data') || paramName.includes('Data')) {
        return match.replace(': any[]', ': unknown[]');
      }
      return match.replace(': any[]', ': Array<unknown>');
    },
    description: 'Replace any[] with unknown[]'
  },
  
  // Reduce callback with any
  {
    name: 'reduce-callback-any',
    detect: /\.reduce\(\((\w+):\s*(\w+),\s*(\w+):\s*any\)/g,
    fix: (match, acc, accType, item) => {
      return match.replace(`: any`, ': unknown');
    },
    description: 'Replace any in reduce callbacks'
  },
  
  // Map/filter/forEach with any
  {
    name: 'array-method-any',
    detect: /\.(map|filter|forEach)\(\((\w+):\s*any/g,
    fix: (match, method, param) => {
      return match.replace(': any', ': unknown');
    },
    description: 'Replace any in array method callbacks'
  },
  
  // Error catch with any
  {
    name: 'catch-error-any',
    detect: /catch\s*\((\w+):\s*any\)/g,
    fix: (match, errorVar) => {
      return match.replace(': any', ': unknown');
    },
    description: 'Replace any in catch blocks'
  },
  
  // Function parameters with any
  {
    name: 'function-param-any',
    detect: /function\s+\w+\([^)]*(\w+)\s*:\s*any/g,
    fix: (match) => {
      return match.replace(/:\s*any/g, ': unknown');
    },
    description: 'Replace any in function parameters'
  },
  
  // Arrow function parameters with any
  {
    name: 'arrow-param-any',
    detect: /\(([^)]*:\s*any[^)]*)\)\s*=>/g,
    fix: (match, params) => {
      const fixedParams = params.replace(/:\s*any/g, ': unknown');
      return `(${fixedParams}) =>`;
    },
    description: 'Replace any in arrow function parameters'
  },
  
  // Variable declarations with any
  {
    name: 'variable-declaration-any',
    detect: /(let|const|var)\s+(\w+)\s*:\s*any\s*=/g,
    fix: (match, keyword, varName) => {
      return match.replace(': any', ': unknown');
    },
    description: 'Replace any in variable declarations'
  },
  
  // Type assertions with any
  {
    name: 'type-assertion-any',
    detect: /as\s+any/g,
    fix: () => 'as unknown',
    description: 'Replace as any with as unknown'
  },
  
  // Generic type with any
  {
    name: 'generic-any',
    detect: /<any>/g,
    fix: () => '<unknown>',
    description: 'Replace <any> with <unknown>'
  },
  
  // Object property with any type
  {
    name: 'object-property-any',
    detect: /(\w+)\s*:\s*any\s*;/g,
    fix: (match, propName) => {
      return match.replace(': any', ': unknown');
    },
    description: 'Replace any in object properties'
  },
  
  // Return type any
  {
    name: 'return-type-any',
    detect: /\)\s*:\s*any\s*{/g,
    fix: (match) => {
      return match.replace(': any', ': unknown');
    },
    description: 'Replace any in return types'
  },
  
  // Array access with any
  {
    name: 'array-access-any',
    detect: /\[(\w+)\s*:\s*any\]/g,
    fix: (match, indexVar) => {
      return match.replace(': any', ': number');
    },
    description: 'Replace any in array access'
  }
];

function applyFixes(content: string, filePath: string): { content: string; fixCount: number } {
  let fixedContent = content;
  let totalFixes = 0;
  
  // Track fixes to avoid double-fixing
  const appliedFixes: string[] = [];
  
  for (const pattern of FIX_PATTERNS) {
    const matches = [...fixedContent.matchAll(pattern.detect)];
    
    if (matches.length > 0) {
      console.log(`  Applying ${pattern.name}: ${matches.length} matches`);
      
      for (const match of matches) {
        const original = match[0];
        const fixed = pattern.fix(original, ...match.slice(1));
        
        if (original !== fixed && !appliedFixes.includes(original)) {
          fixedContent = fixedContent.replace(original, fixed);
          appliedFixes.push(original);
          totalFixes++;
        }
      }
    }
  }
  
  return { content: fixedContent, fixCount: totalFixes };
}

function findTypeScriptFiles(dir: string, files: string[] = []): string[] {
  const entries = readdirSync(dir);
  
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    
    if (stat.isDirectory()) {
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

// High priority files to fix first
const HIGH_PRIORITY_FILES = [
  'src/services/TrafficAnalyticsService.ts',
  'src/tools/rule-tree-management.ts',
  'src/tools/bulk-operations-manager.ts',
  'src/tools/property-operations-advanced.ts',
  'src/tools/tool-schemas-extended.ts',
  'src/tools/universal-search-with-cache.ts',
  'src/utils/edgegrid-client.ts',
  'src/utils/mcp-compatibility-wrapper.ts',
  'src/utils/request-coalescer.ts',
  'src/utils/error-handler.ts',
  'src/utils/pino-logger.ts'
];

async function main() {
  console.log('🎯 Targeted TypeScript "any" Type Fix Script');
  console.log('==========================================\n');
  
  const srcPath = join(process.cwd(), 'src');
  let allFiles = findTypeScriptFiles(srcPath);
  
  // Sort files by priority
  const priorityFiles = HIGH_PRIORITY_FILES.map(f => join(process.cwd(), f));
  const otherFiles = allFiles.filter(f => !priorityFiles.includes(f));
  allFiles = [...priorityFiles.filter(f => allFiles.includes(f)), ...otherFiles];
  
  let totalFilesProcessed = 0;
  let totalFilesFixed = 0;
  let totalFixesApplied = 0;
  
  console.log(`Found ${allFiles.length} TypeScript files to process`);
  console.log(`Processing ${priorityFiles.length} high-priority files first...\n`);
  
  for (const file of allFiles) {
    try {
      const content = readFileSync(file, 'utf8');
      
      // Skip files without any 'any' types
      if (!content.includes('any')) {
        continue;
      }
      
      totalFilesProcessed++;
      
      const { content: fixedContent, fixCount } = applyFixes(content, file);
      
      if (fixCount > 0) {
        writeFileSync(file, fixedContent);
        totalFilesFixed++;
        totalFixesApplied += fixCount;
        
        const relativePath = file.replace(process.cwd() + '/', '');
        console.log(`✅ Fixed ${fixCount} violations in ${relativePath}`);
      }
      
    } catch (error) {
      console.error(`Error processing ${file}:`, error);
    }
  }
  
  console.log('\n📊 Summary:');
  console.log(`   Files processed: ${totalFilesProcessed}`);
  console.log(`   Files fixed: ${totalFilesFixed}`);
  console.log(`   Total fixes applied: ${totalFixesApplied}`);
  console.log('\n✨ Targeted fix complete!');
}

main().catch(console.error);