#!/usr/bin/env tsx
/**
 * Final fix for remaining any type violations
 * Creates specific type definitions and applies them
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

// Common type definitions that we'll add to files
const TYPE_DEFINITIONS = `
// Common type definitions for Akamai API responses
type PeriodType = { start: string; end: string; granularity?: string };
type FilterType = { hostname?: string; cpCode?: string; region?: string; contentType?: string };
type TimeSeriesData = Array<{ timestamp: string; value: number }>;
type MetricData = { [key: string]: number | string };
type AkamaiResponse<T = unknown> = { data?: T; error?: string; status?: number };
`;

// Type definitions for specific services
const TRAFFIC_ANALYTICS_TYPES = `
// Traffic Analytics specific types
interface BandwidthData {
  timestamp: string;
  value: number;
  hostname?: string;
  region?: string;
  contentType?: string;
}

interface GrowthData {
  current: { bandwidth: TimeSeriesData; requests: TimeSeriesData; errors: TimeSeriesData };
  previous: { bandwidth: TimeSeriesData; requests: TimeSeriesData; errors: TimeSeriesData };
}
`;

interface FixPattern {
  name: string;
  detect: RegExp;
  fix: (match: string, ...args: string[]) => string;
  description: string;
}

const FINAL_FIX_PATTERNS: FixPattern[] = [
  // Replace remaining any in method signatures
  {
    name: 'method-any-period',
    detect: /period:\s*any/g,
    fix: () => 'period: PeriodType',
    description: 'Replace period: any with PeriodType'
  },
  
  // Replace any in filter parameters
  {
    name: 'method-any-filter',
    detect: /filter\?\s*:\s*any/g,
    fix: () => 'filter?: FilterType',
    description: 'Replace filter?: any with FilterType'
  },
  
  // Replace Promise<any>
  {
    name: 'promise-any',
    detect: /:\s*Promise<any>/g,
    fix: () => ': Promise<unknown>',
    description: 'Replace Promise<any> with Promise<unknown>'
  },
  
  // Replace Promise<any[]> with specific types
  {
    name: 'promise-any-array-specific',
    detect: /:\s*Promise<any\[\]>/g,
    fix: () => ': Promise<TimeSeriesData>',
    description: 'Replace Promise<any[]> with Promise<TimeSeriesData>'
  },
  
  // Replace : any in object properties
  {
    name: 'object-property-any-colon',
    detect: /(\w+)\s*:\s*any(?=\s*[,;}])/g,
    fix: (match, propName) => {
      // Specific replacements based on property name
      if (propName.toLowerCase().includes('data')) {
        return `${propName}: unknown`;
      } else if (propName.toLowerCase().includes('response')) {
        return `${propName}: AkamaiResponse`;
      } else if (propName.toLowerCase().includes('options')) {
        return `${propName}: Record<string, unknown>`;
      }
      return `${propName}: unknown`;
    },
    description: 'Replace object property any types'
  },
  
  // Replace data: any patterns
  {
    name: 'data-any-pattern',
    detect: /data:\s*any/g,
    fix: () => 'data: unknown',
    description: 'Replace data: any with data: unknown'
  },
  
  // Replace Record<string, any>
  {
    name: 'record-string-any',
    detect: /Record<string,\s*any>/g,
    fix: () => 'Record<string, unknown>',
    description: 'Replace Record<string, any> with Record<string, unknown>'
  },
  
  // Replace validateApiResponse<{ rules?: any }>
  {
    name: 'validate-api-response-any',
    detect: /validateApiResponse<\{([^}]*?):\s*any([^}]*?)\}>/g,
    fix: (match, before, after) => {
      return `validateApiResponse<{${before}: unknown${after}}>`;
    },
    description: 'Replace any in validateApiResponse generic'
  },
  
  // Replace .reduce callback any parameters
  {
    name: 'reduce-callback-specific',
    detect: /\.reduce\(\((\w+):\s*(\w+),\s*(\w+):\s*any\)\s*=>/g,
    fix: (match, acc, accType, item) => {
      return match.replace(`${item}: any`, `${item}: unknown`);
    },
    description: 'Replace any in reduce callbacks'
  },
  
  // Replace result[key] = value patterns where result is any
  {
    name: 'result-key-assignment',
    detect: /const\s+result:\s*any\s*=/g,
    fix: () => 'const result: Record<string, unknown> =',
    description: 'Replace const result: any with typed Record'
  },
  
  // Replace catch (error: any)
  {
    name: 'catch-error-specific',
    detect: /catch\s*\((\w+):\s*any\)/g,
    fix: (match, errorVar) => `catch (${errorVar}: unknown)`,
    description: 'Replace catch error: any'
  },
  
  // Replace function return : any
  {
    name: 'function-return-any',
    detect: /\)\s*:\s*any\s*{/g,
    fix: () => '): unknown {',
    description: 'Replace function return type any'
  },
  
  // Replace _error: any patterns
  {
    name: 'underscore-error-any',
    detect: /_error:\s*any/g,
    fix: () => '_error: unknown',
    description: 'Replace _error: any with unknown'
  },
  
  // Replace node: any patterns
  {
    name: 'node-any',
    detect: /node:\s*any/g,
    fix: () => 'node: unknown',
    description: 'Replace node: any with unknown'
  },
  
  // Replace source/target: any patterns
  {
    name: 'source-target-any',
    detect: /(source|target):\s*any/g,
    fix: (match, name) => `${name}: unknown`,
    description: 'Replace source/target: any with unknown'
  }
];

function shouldAddTypeDefinitions(filePath: string): boolean {
  // Add type definitions to files that need them
  const needsTypes = [
    'TrafficAnalyticsService.ts',
    'rule-tree-management.ts',
    'bulk-operations-manager.ts',
    'property-operations-advanced.ts'
  ];
  
  return needsTypes.some(file => filePath.includes(file));
}

function getTypeDefinitionsForFile(filePath: string): string {
  if (filePath.includes('TrafficAnalyticsService.ts')) {
    return TYPE_DEFINITIONS + '\n' + TRAFFIC_ANALYTICS_TYPES;
  }
  return TYPE_DEFINITIONS;
}

function applyFixes(content: string, filePath: string): { content: string; fixCount: number } {
  let fixedContent = content;
  let totalFixes = 0;
  
  // Add type definitions if needed and not already present
  if (shouldAddTypeDefinitions(filePath) && !fixedContent.includes('type PeriodType =')) {
    const typeDefinitions = getTypeDefinitionsForFile(filePath);
    
    // Insert after imports
    const importRegex = /^(import[\s\S]*?from\s+['"].*?['"];?\s*\n)+/m;
    const importMatch = fixedContent.match(importRegex);
    
    if (importMatch) {
      const insertPosition = importMatch.index! + importMatch[0].length;
      fixedContent = 
        fixedContent.slice(0, insertPosition) + 
        '\n' + typeDefinitions + '\n' +
        fixedContent.slice(insertPosition);
      console.log(`  Added type definitions to ${filePath}`);
    }
  }
  
  // Apply all fix patterns
  for (const pattern of FINAL_FIX_PATTERNS) {
    let matches = [...fixedContent.matchAll(pattern.detect)];
    
    if (matches.length > 0) {
      console.log(`  Applying ${pattern.name}: ${matches.length} matches`);
      
      // Apply fixes in reverse order to preserve indices
      for (let i = matches.length - 1; i >= 0; i--) {
        const match = matches[i];
        const original = match[0];
        const fixed = pattern.fix(original, ...match.slice(1));
        
        if (original !== fixed) {
          const startIndex = match.index!;
          fixedContent = 
            fixedContent.slice(0, startIndex) + 
            fixed + 
            fixedContent.slice(startIndex + original.length);
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

async function main() {
  console.log('🚀 Final TypeScript "any" Type Fix Script');
  console.log('========================================\n');
  
  const srcPath = join(process.cwd(), 'src');
  const allFiles = findTypeScriptFiles(srcPath);
  
  let totalFilesProcessed = 0;
  let totalFilesFixed = 0;
  let totalFixesApplied = 0;
  
  console.log(`Found ${allFiles.length} TypeScript files to process\n`);
  
  // Process files with most violations first
  const priorityFiles = [
    'src/services/TrafficAnalyticsService.ts',
    'src/tools/rule-tree-management.ts',
    'src/tools/tool-schemas-extended.ts',
    'src/utils/edgegrid-client.ts',
    'src/tools/bulk-operations-manager.ts',
    'src/utils/pino-logger.ts',
    'src/tools/universal-search-with-cache.ts',
    'src/agents/cdn-provisioning.agent.ts',
    'src/utils/request-coalescer.ts'
  ];
  
  // Sort files by priority
  const sortedFiles = [
    ...priorityFiles.map(f => join(process.cwd(), f)).filter(f => allFiles.includes(f)),
    ...allFiles.filter(f => !priorityFiles.some(p => f.includes(p)))
  ];
  
  for (const file of sortedFiles) {
    try {
      const content = readFileSync(file, 'utf8');
      
      // Skip files without any 'any' types
      if (!content.includes('any')) {
        continue;
      }
      
      totalFilesProcessed++;
      
      const { content: fixedContent, fixCount } = applyFixes(content, file);
      
      if (fixCount > 0 || fixedContent !== content) {
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
  console.log('\n✨ Final fix complete! Run count script to verify remaining violations.');
}

main().catch(console.error);