#!/usr/bin/env tsx

import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

interface DomainAnalysis {
  domain: string;
  consolidatedFile: string;
  indexFile: string;
  consolidatedMethods: string[];
  exportedMethods: string[];
  missingMethods: string[];
}

// Function to extract async method names from a TypeScript file
function extractAsyncMethods(filePath: string): string[] {
  const content = fs.readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true
  );

  const methods: string[] = [];

  function visit(node: ts.Node) {
    // Look for async function declarations
    if (ts.isFunctionDeclaration(node) && node.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword)) {
      if (node.name) {
        methods.push(node.name.text);
      }
    }
    
    // Look for exported const async arrow functions
    if (ts.isVariableStatement(node)) {
      const declaration = node.declarationList.declarations[0];
      if (declaration && ts.isVariableDeclaration(declaration) && declaration.name && ts.isIdentifier(declaration.name)) {
        const init = declaration.initializer;
        if (init && ts.isArrowFunction(init) && init.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword)) {
          methods.push(declaration.name.text);
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return methods;
}

// Function to extract exported items from index.ts
function extractExports(filePath: string): string[] {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const exports: string[] = [];

  // Match export { ... } from patterns
  const exportMatches = content.matchAll(/export\s*\{([^}]+)\}\s*from/g);
  for (const match of exportMatches) {
    const exportList = match[1];
    const items = exportList.split(',').map(item => {
      // Handle renaming: item as alias
      const parts = item.trim().split(/\s+as\s+/);
      return parts[0].trim();
    });
    exports.push(...items);
  }

  // Match export * from patterns (these export everything)
  const exportAllMatches = content.matchAll(/export\s*\*\s*from\s*['"]([^'"]+)['"]/g);
  for (const match of exportAllMatches) {
    const importPath = match[1];
    if (importPath.includes('consolidated')) {
      // If exporting everything from consolidated file, return special marker
      exports.push('__ALL__');
    }
  }

  return exports;
}

// Main analysis function
function analyzeDomain(consolidatedFile: string): DomainAnalysis | null {
  const dir = path.dirname(consolidatedFile);
  const domain = path.basename(dir);
  const indexFile = path.join(dir, 'index.ts');

  if (!fs.existsSync(consolidatedFile)) {
    return null;
  }

  const consolidatedMethods = extractAsyncMethods(consolidatedFile);
  const exportedMethods = extractExports(indexFile);

  // If __ALL__ is in exports, all methods are exported
  const missingMethods = exportedMethods.includes('__ALL__') 
    ? [] 
    : consolidatedMethods.filter(method => !exportedMethods.includes(method));

  return {
    domain,
    consolidatedFile,
    indexFile,
    consolidatedMethods,
    exportedMethods: exportedMethods.includes('__ALL__') ? ['*ALL METHODS EXPORTED*'] : exportedMethods,
    missingMethods
  };
}

// Find all consolidated files
const toolsDir = path.join(process.cwd(), 'src', 'tools');
const consolidatedFiles: string[] = [];

function findConsolidatedFiles(dir: string) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findConsolidatedFiles(fullPath);
    } else if (entry.isFile() && entry.name.startsWith('consolidated-') && entry.name.endsWith('-tools.ts')) {
      consolidatedFiles.push(fullPath);
    }
  }
}

findConsolidatedFiles(toolsDir);

// Analyze each domain
console.log('# Domain Tool Export Analysis\n');

const totalStats = {
  totalDomains: 0,
  totalMethods: 0,
  totalMissing: 0
};

for (const consolidatedFile of consolidatedFiles.sort()) {
  const analysis = analyzeDomain(consolidatedFile);
  if (!analysis) continue;

  totalStats.totalDomains++;
  totalStats.totalMethods += analysis.consolidatedMethods.length;
  totalStats.totalMissing += analysis.missingMethods.length;

  console.log(`## ${analysis.domain.toUpperCase()}`);
  console.log(`- Consolidated methods: ${analysis.consolidatedMethods.length}`);
  console.log(`- Missing exports: ${analysis.missingMethods.length}`);
  
  if (analysis.missingMethods.length > 0) {
    console.log('\n### Missing Methods:');
    analysis.missingMethods.forEach(method => {
      console.log(`  - ${method}`);
    });
  } else {
    console.log('  ✓ All methods exported');
  }
  
  console.log('\n---\n');
}

console.log('## SUMMARY');
console.log(`- Total domains analyzed: ${totalStats.totalDomains}`);
console.log(`- Total methods found: ${totalStats.totalMethods}`);
console.log(`- Total missing exports: ${totalStats.totalMissing}`);
console.log(`- Export coverage: ${((totalStats.totalMethods - totalStats.totalMissing) / totalStats.totalMethods * 100).toFixed(1)}%`);