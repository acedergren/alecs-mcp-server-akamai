#!/usr/bin/env tsx
/**
 * Analyze TypeScript error risks across the codebase
 * Calculates risk scores based on error count and dependencies
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface FileRisk {
  file: string;
  errorCount: number;
  directDeps: number;
  transitiveDeps: number;
  riskScore: number;
}

// Get all TypeScript errors grouped by file
function getErrorsByFile(): Map<string, number> {
  const errors = new Map<string, number>();
  try {
    const output = execSync('npx tsc --noEmit 2>&1', { encoding: 'utf8' });
    const lines = output.split('\n');
    
    for (const line of lines) {
      const match = line.match(/^(src\/[^(]+)\(\d+,\d+\): error TS/);
      if (match) {
        const file = match[1];
        errors.set(file, (errors.get(file) || 0) + 1);
      }
    }
  } catch (e) {
    // TypeScript exits with non-zero when there are errors
    const output = (e as any).stdout || '';
    const lines = output.split('\n');
    
    for (const line of lines) {
      const match = line.match(/^(src\/[^(]+)\(\d+,\d+\): error TS/);
      if (match) {
        const file = match[1];
        errors.set(file, (errors.get(file) || 0) + 1);
      }
    }
  }
  return errors;
}

// Get dependency count for each file
function getDependencies(file: string): { direct: number; transitive: number } {
  try {
    // Use madge to get dependencies
    const output = execSync(`npx madge --json ${file} 2>/dev/null`, { encoding: 'utf8' });
    const deps = JSON.parse(output);
    
    let direct = 0;
    let transitive = 0;
    
    // Count files that import this file
    for (const [depFile, imports] of Object.entries(deps)) {
      if (Array.isArray(imports) && imports.includes(file)) {
        direct++;
      }
    }
    
    // Rough estimate of transitive deps
    transitive = direct * 2;
    
    return { direct, transitive };
  } catch {
    return { direct: 0, transitive: 0 };
  }
}

// Calculate risk score
function calculateRisk(errorCount: number, directDeps: number, transitiveDeps: number): number {
  // Risk = (Error Count × 2) + (Direct Deps × 5) + (Transitive Deps × 3)
  return (errorCount * 2) + (directDeps * 5) + (transitiveDeps * 3);
}

// Main analysis
function analyzeRisks() {
  console.log('🔍 Analyzing TypeScript error risks...\n');
  
  const errorsByFile = getErrorsByFile();
  const risks: FileRisk[] = [];
  
  for (const [file, errorCount] of errorsByFile) {
    const deps = getDependencies(file);
    const riskScore = calculateRisk(errorCount, deps.direct, deps.transitive);
    
    risks.push({
      file,
      errorCount,
      directDeps: deps.direct,
      transitiveDeps: deps.transitive,
      riskScore
    });
  }
  
  // Sort by risk score (lowest first - safest to fix)
  risks.sort((a, b) => a.riskScore - b.riskScore);
  
  // Output results
  console.log('Fix Order (Lowest Risk First):');
  console.log('═══════════════════════════════\n');
  
  risks.forEach((risk, index) => {
    console.log(`${index + 1}. ${risk.file}`);
    console.log(`   Errors: ${risk.errorCount} | Direct Deps: ${risk.directDeps} | Risk Score: ${risk.riskScore}`);
    console.log('');
  });
  
  // Save to file
  const fixOrder = risks.map((r, i) => 
    `${i + 1}. ${r.file} (Errors: ${r.errorCount}, Risk: ${r.riskScore})`
  ).join('\n');
  
  fs.writeFileSync('fix-order.md', `# TypeScript Fix Order\n\nGenerated: ${new Date().toISOString()}\n\n${fixOrder}`);
  
  console.log('\n✅ Fix order saved to fix-order.md');
  
  // Find leaf nodes (files with 0 dependencies)
  const leafNodes = risks.filter(r => r.directDeps === 0);
  console.log(`\n🍃 Found ${leafNodes.length} leaf nodes (safest to fix first):`);
  leafNodes.forEach(node => {
    console.log(`   - ${node.file} (${node.errorCount} errors)`);
  });
}

// Run analysis
analyzeRisks();