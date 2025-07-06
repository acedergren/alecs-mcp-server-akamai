#!/usr/bin/env tsx

/**
 * Systematic fix for all 'any' type violations
 * Enforces SonarCloud quality gate compliance
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';

interface AnyTypeLocation {
  file: string;
  line: number;
  column: number;
  context: string;
  pattern: string;
}

interface FixPattern {
  pattern: RegExp;
  replacement: string;
  description: string;
}

// Common fix patterns based on our codebase analysis
const FIX_PATTERNS: FixPattern[] = [
  // Error handling patterns
  {
    pattern: /catch\s*\(\s*(\w+)\s*:\s*any\s*\)/g,
    replacement: 'catch ($1: unknown)',
    description: 'Replace catch(error: any) with catch(error: unknown)'
  },
  {
    pattern: /catch\s*\(\s*(_\w+)\s*:\s*any\s*\)/g,
    replacement: 'catch ($1: unknown)',
    description: 'Replace catch(_error: any) with catch(_error: unknown)'
  },
  
  // Function parameter patterns
  {
    pattern: /\((\w+)\s*:\s*any\)/g,
    replacement: '($1: unknown)',
    description: 'Replace function parameter any with unknown'
  },
  {
    pattern: /\((\w+)\s*:\s*any\[\]\)/g,
    replacement: '($1: unknown[])',
    description: 'Replace any[] with unknown[]'
  },
  
  // Record patterns
  {
    pattern: /Record<string,\s*any>/g,
    replacement: 'Record<string, unknown>',
    description: 'Replace Record<string, any> with Record<string, unknown>'
  },
  
  // Response patterns
  {
    pattern: /response\s*:\s*any/g,
    replacement: 'response: unknown',
    description: 'Replace response: any with response: unknown'
  },
  
  // Data patterns
  {
    pattern: /data\s*:\s*any/g,
    replacement: 'data: unknown',
    description: 'Replace data: any with data: unknown'
  },
  
  // Arrow function patterns
  {
    pattern: /\((\w+):\s*any\)\s*=>/g,
    replacement: '($1: unknown) =>',
    description: 'Replace arrow function any parameters'
  },
  
  // Type assertion patterns
  {
    pattern: /as\s+any\b/g,
    replacement: 'as unknown',
    description: 'Replace type assertion "as any" with "as unknown"'
  },
  
  // Generic any in arrays/maps
  {
    pattern: /\.map\(\s*\((\w+):\s*any\)/g,
    replacement: '.map(($1: unknown)',
    description: 'Replace map callback any parameters'
  },
  {
    pattern: /\.forEach\(\s*\((\w+):\s*any\)/g,
    replacement: '.forEach(($1: unknown)',
    description: 'Replace forEach callback any parameters'
  },
  {
    pattern: /\.filter\(\s*\((\w+):\s*any\)/g,
    replacement: '.filter(($1: unknown)',
    description: 'Replace filter callback any parameters'
  },
  
  // Variable declarations
  {
    pattern: /let\s+(\w+)\s*:\s*any\s*=/g,
    replacement: 'let $1: unknown =',
    description: 'Replace let variable any declarations'
  },
  {
    pattern: /const\s+(\w+)\s*:\s*any\s*=/g,
    replacement: 'const $1: unknown =',
    description: 'Replace const variable any declarations'
  }
];

// Files to skip (generated files, third-party, etc.)
const SKIP_PATTERNS = [
  '**/node_modules/**',
  '**/dist/**',
  '**/*.d.ts',
  '**/generated/**/*.ts',
  '**/*.test.ts',
  '**/*.spec.ts'
];

async function findAnyTypes(): Promise<AnyTypeLocation[]> {
  const locations: AnyTypeLocation[] = [];
  const files = await glob('src/**/*.ts', { ignore: SKIP_PATTERNS });
  
  for (const file of files) {
    const content = await fs.readFile(file, 'utf-8');
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      const matches = line.matchAll(/:\s*any\b/g);
      for (const match of matches) {
        if (match.index !== undefined) {
          locations.push({
            file,
            line: index + 1,
            column: match.index + 1,
            context: line.trim(),
            pattern: match[0]
          });
        }
      }
    });
  }
  
  return locations;
}

async function fixFile(filePath: string): Promise<number> {
  let content = await fs.readFile(filePath, 'utf-8');
  let fixCount = 0;
  
  // Skip if file has @ts-nocheck
  if (content.includes('@ts-nocheck')) {
    content = content.replace(/\/\/\s*@ts-nocheck\n?/g, '');
    fixCount++;
  }
  
  // Apply fix patterns
  for (const pattern of FIX_PATTERNS) {
    const matches = content.match(pattern.pattern);
    if (matches) {
      content = content.replace(pattern.pattern, pattern.replacement);
      fixCount += matches.length;
    }
  }
  
  // Write back if changes were made
  if (fixCount > 0) {
    await fs.writeFile(filePath, content);
  }
  
  return fixCount;
}

async function main() {
  console.log('🔍 Finding all any type violations...');
  const violations = await findAnyTypes();
  
  console.log(`\n📊 Found ${violations.length} any type violations\n`);
  
  // Group by file
  const fileGroups = violations.reduce((acc, loc) => {
    if (!acc[loc.file]) acc[loc.file] = [];
    acc[loc.file].push(loc);
    return acc;
  }, {} as Record<string, AnyTypeLocation[]>);
  
  // Show top offenders
  const sortedFiles = Object.entries(fileGroups)
    .sort(([, a], [, b]) => b.length - a.length)
    .slice(0, 10);
  
  console.log('Top 10 files with most violations:');
  sortedFiles.forEach(([file, locs]) => {
    console.log(`  ${path.relative(process.cwd(), file)}: ${locs.length} violations`);
  });
  
  console.log('\n🔧 Applying automatic fixes...\n');
  
  let totalFixes = 0;
  for (const file of Object.keys(fileGroups)) {
    const fixes = await fixFile(file);
    if (fixes > 0) {
      console.log(`  ✅ Fixed ${fixes} violations in ${path.relative(process.cwd(), file)}`);
      totalFixes += fixes;
    }
  }
  
  console.log(`\n✨ Total fixes applied: ${totalFixes}`);
  
  // Re-scan to see remaining issues
  const remaining = await findAnyTypes();
  console.log(`\n📊 Remaining violations: ${remaining.length}`);
  
  if (remaining.length > 0) {
    console.log('\n⚠️  Some violations require manual fixes:');
    const complexPatterns = new Set<string>();
    remaining.forEach(loc => {
      if (!complexPatterns.has(loc.context)) {
        complexPatterns.add(loc.context);
        if (complexPatterns.size <= 10) {
          console.log(`  - ${loc.context}`);
        }
      }
    });
    
    if (complexPatterns.size > 10) {
      console.log(`  ... and ${complexPatterns.size - 10} more unique patterns`);
    }
  }
}

// Run the script
main().catch(console.error);