#!/usr/bin/env tsx

/**
 * Systematic TypeScript Error Fix Script
 * 
 * This script analyzes and categorizes TypeScript errors
 * to help fix them systematically.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface ErrorInfo {
  file: string;
  line: number;
  column: number;
  errorCode: string;
  message: string;
}

interface ErrorSummary {
  byCode: Map<string, ErrorInfo[]>;
  byFile: Map<string, ErrorInfo[]>;
  total: number;
}

// Parse TypeScript errors from build output
function parseTypeScriptErrors(): ErrorSummary {
  const output = execSync('npm run build:ts 2>&1', { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
  const lines = output.split('\n');
  const errors: ErrorInfo[] = [];
  
  const errorRegex = /^(.+?)\((\d+),(\d+)\): error (TS\d+): (.+)$/;
  
  for (const line of lines) {
    const match = line.match(errorRegex);
    if (match) {
      errors.push({
        file: match[1],
        line: parseInt(match[2]),
        column: parseInt(match[3]),
        errorCode: match[4],
        message: match[5]
      });
    }
  }
  
  // Categorize errors
  const byCode = new Map<string, ErrorInfo[]>();
  const byFile = new Map<string, ErrorInfo[]>();
  
  for (const error of errors) {
    // By error code
    if (!byCode.has(error.errorCode)) {
      byCode.set(error.errorCode, []);
    }
    byCode.get(error.errorCode)!.push(error);
    
    // By file
    if (!byFile.has(error.file)) {
      byFile.set(error.file, []);
    }
    byFile.get(error.file)!.push(error);
  }
  
  return {
    byCode,
    byFile,
    total: errors.length
  };
}

// Get error code descriptions
function getErrorDescription(code: string): string {
  const descriptions: Record<string, string> = {
    'TS18046': "'X' is of type 'unknown'",
    'TS2339': "Property 'X' does not exist on type 'Y'",
    'TS6133': "'X' is declared but its value is never read",
    'TS2322': "Type 'X' is not assignable to type 'Y'",
    'TS2345': "Argument of type 'X' is not assignable to parameter of type 'Y'",
    'TS4111': "Property 'X' comes from an index signature, so it must be accessed with ['X']",
    'TS7053': "Element implicitly has an 'any' type",
    'TS6196': "'X' is declared but never used",
    'TS2769': "No overload matches this call",
    'TS2698': "Spread types may only be created from object types",
    'TS2532': "Object is possibly 'undefined'",
    'TS2571': "Object is of type 'unknown'",
    'TS2741': "Property 'X' is missing in type 'Y' but required in type 'Z'",
    'TS2488': "Type 'X' must have a '[Symbol.iterator]()' method",
    'TS2305': "Module 'X' has no exported member 'Y'",
  };
  
  return descriptions[code] || 'Unknown error';
}

// Generate fix strategy
function generateFixStrategy(summary: ErrorSummary): void {
  console.log('TypeScript Error Analysis Report');
  console.log('================================\n');
  
  console.log(`Total Errors: ${summary.total}\n`);
  
  // Top error codes
  console.log('Top Error Codes:');
  const sortedCodes = Array.from(summary.byCode.entries())
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 10);
  
  for (const [code, errors] of sortedCodes) {
    console.log(`  ${code}: ${errors.length} errors - ${getErrorDescription(code)}`);
  }
  
  console.log('\nMost Affected Files:');
  const sortedFiles = Array.from(summary.byFile.entries())
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 10);
  
  for (const [file, errors] of sortedFiles) {
    const relativePath = path.relative(process.cwd(), file);
    console.log(`  ${relativePath}: ${errors.length} errors`);
  }
  
  // Priority fixes
  console.log('\nPriority Fix Order:');
  console.log('1. Fix TS18046 (unknown types) - 1833 errors');
  console.log('2. Fix TS2339 (missing properties) - 425 errors');
  console.log('3. Remove TS6133 (unused variables) - 109 errors');
  console.log('4. Fix TS2322 (type assignments) - 103 errors');
  console.log('5. Fix TS2345 (argument types) - 89 errors');
  
  // Generate fix files
  generateUnknownTypeFixes(summary.byCode.get('TS18046') || []);
  generateMissingPropertyFixes(summary.byCode.get('TS2339') || []);
}

// Generate fixes for unknown types
function generateUnknownTypeFixes(errors: ErrorInfo[]): void {
  const fixes = new Map<string, Set<string>>();
  
  for (const error of errors.slice(0, 50)) { // First 50 for now
    if (!fixes.has(error.file)) {
      fixes.set(error.file, new Set());
    }
    
    // Extract variable name from error message
    const match = error.message.match(/'(.+?)' is of type 'unknown'/);
    if (match) {
      fixes.get(error.file)!.add(match[1]);
    }
  }
  
  console.log('\nUnknown Type Fixes Needed:');
  for (const [file, variables] of fixes) {
    const relativePath = path.relative(process.cwd(), file);
    console.log(`\n${relativePath}:`);
    console.log(`  Variables needing types: ${Array.from(variables).join(', ')}`);
  }
}

// Generate fixes for missing properties
function generateMissingPropertyFixes(errors: ErrorInfo[]): void {
  const fixes = new Map<string, Map<string, Set<string>>>();
  
  for (const error of errors.slice(0, 50)) { // First 50 for now
    if (!fixes.has(error.file)) {
      fixes.set(error.file, new Map());
    }
    
    // Extract property and type from error message
    const match = error.message.match(/Property '(.+?)' does not exist on type '(.+?)'/);
    if (match) {
      const [, property, type] = match;
      if (!fixes.get(error.file)!.has(type)) {
        fixes.get(error.file)!.set(type, new Set());
      }
      fixes.get(error.file)!.get(type)!.add(property);
    }
  }
  
  console.log('\nMissing Property Fixes Needed:');
  for (const [file, types] of fixes) {
    const relativePath = path.relative(process.cwd(), file);
    console.log(`\n${relativePath}:`);
    for (const [type, properties] of types) {
      console.log(`  Type '${type}' needs properties: ${Array.from(properties).join(', ')}`);
    }
  }
}

// Main execution
function main(): void {
  try {
    console.log('Analyzing TypeScript errors...\n');
    const summary = parseTypeScriptErrors();
    generateFixStrategy(summary);
    
    // Save detailed report
    const report = {
      timestamp: new Date().toISOString(),
      total: summary.total,
      byCode: Object.fromEntries(
        Array.from(summary.byCode.entries()).map(([code, errors]) => [
          code,
          {
            count: errors.length,
            description: getErrorDescription(code),
            samples: errors.slice(0, 5).map(e => ({
              file: path.relative(process.cwd(), e.file),
              line: e.line,
              message: e.message
            }))
          }
        ])
      ),
      topFiles: Array.from(summary.byFile.entries())
        .sort((a, b) => b[1].length - a[1].length)
        .slice(0, 20)
        .map(([file, errors]) => ({
          file: path.relative(process.cwd(), file),
          errorCount: errors.length,
          errorTypes: [...new Set(errors.map(e => e.errorCode))]
        }))
    };
    
    fs.writeFileSync('typescript-error-report.json', JSON.stringify(report, null, 2));
    console.log('\nDetailed report saved to: typescript-error-report.json');
    
  } catch (error) {
    console.error('Error analyzing TypeScript errors:', error);
  }
}

if (require.main === module) {
  main();
}