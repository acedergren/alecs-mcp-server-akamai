#!/usr/bin/env node

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface DashboardData {
  timestamp: string;
  totalErrors: number;
  errorsByFile: Array<{ file: string; count: number }>;
  typeCoverage: number;
  baselineErrors: number;
  errorReduction: number;
  riskScore: number;
}

function getTypeScriptErrors(): { total: number; byFile: Array<{ file: string; count: number }> } {
  try {
    const errors = execSync('npx tsc --noEmit --pretty false 2>&1 | grep -E "error TS[0-9]+:"', { encoding: 'utf8' });
    const lines = errors.trim().split('\n').filter(line => line.length > 0);
    
    const errorsByFile = new Map<string, number>();
    lines.forEach(line => {
      const match = line.match(/^(.+\.ts)\(\d+,\d+\): error TS\d+:/);
      if (match) {
        const file = match[1];
        errorsByFile.set(file, (errorsByFile.get(file) || 0) + 1);
      }
    });
    
    const sortedErrors = Array.from(errorsByFile.entries())
      .map(([file, count]) => ({ file, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    return { total: lines.length, byFile: sortedErrors };
  } catch {
    return { total: 0, byFile: [] };
  }
}

function getTypeCoverage(): number {
  try {
    const output = execSync('npx type-coverage --at-least=0', { encoding: 'utf8' });
    const match = output.match(/\([\d.]+ \/ [\d.]+\) ([\d.]+)%/);
    return match ? parseFloat(match[1]) : 0;
  } catch {
    return 0;
  }
}

function getBaselineErrors(): number {
  const baselinePath = path.join(process.cwd(), 'typescript-errors-baseline.txt');
  if (fs.existsSync(baselinePath)) {
    const content = fs.readFileSync(baselinePath, 'utf8');
    return content.trim().split('\n').filter(line => line.length > 0).length;
  }
  return 0;
}

function calculateRiskScore(totalErrors: number, typeCoverage: number): number {
  // Risk = (errors * 2) + ((100 - coverage) * 3)
  const errorRisk = totalErrors * 2;
  const coverageRisk = (100 - typeCoverage) * 3;
  return Math.round(errorRisk + coverageRisk);
}

function generateDashboard(): void {
  const errors = getTypeScriptErrors();
  const typeCoverage = getTypeCoverage();
  const baselineErrors = getBaselineErrors();
  const errorReduction = baselineErrors > 0 ? ((baselineErrors - errors.total) / baselineErrors * 100) : 0;
  const riskScore = calculateRiskScore(errors.total, typeCoverage);
  
  const dashboard: DashboardData = {
    timestamp: new Date().toISOString(),
    totalErrors: errors.total,
    errorsByFile: errors.byFile,
    typeCoverage,
    baselineErrors,
    errorReduction,
    riskScore
  };
  
  // Display dashboard
  console.log('\n🎯 TypeScript Type Safety Dashboard');
  console.log('=' .repeat(50));
  console.log(`📅 Timestamp: ${dashboard.timestamp}`);
  console.log(`❌ Total Errors: ${dashboard.totalErrors} (Baseline: ${dashboard.baselineErrors})`);
  console.log(`📈 Error Reduction: ${dashboard.errorReduction.toFixed(2)}%`);
  console.log(`✅ Type Coverage: ${dashboard.typeCoverage.toFixed(2)}%`);
  console.log(`⚠️  Risk Score: ${dashboard.riskScore}`);
  
  if (errors.byFile.length > 0) {
    console.log('\n📁 Top Error Files:');
    errors.byFile.forEach(({ file, count }) => {
      const relPath = file.replace(process.cwd() + '/', '');
      console.log(`   ${count.toString().padStart(3)} errors: ${relPath}`);
    });
  }
  
  // Progress indicators
  console.log('\n📊 Progress Indicators:');
  const errorBar = generateProgressBar(100 - (errors.total / baselineErrors * 100), 30);
  const coverageBar = generateProgressBar(typeCoverage, 30);
  console.log(`   Error Fix Progress: ${errorBar} ${(100 - (errors.total / baselineErrors * 100)).toFixed(1)}%`);
  console.log(`   Type Coverage:      ${coverageBar} ${typeCoverage.toFixed(1)}%`);
  
  // Save to JSON for tracking
  const historyPath = path.join(process.cwd(), 'type-safety-history.json');
  let history: DashboardData[] = [];
  if (fs.existsSync(historyPath)) {
    history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
  }
  history.push(dashboard);
  // Keep last 100 entries
  if (history.length > 100) {
    history = history.slice(-100);
  }
  fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
  
  // Recommendations
  console.log('\n💡 Recommendations:');
  if (errors.total > 300) {
    console.log('   • Focus on files with highest error counts');
    console.log('   • Use automated type generation for API responses');
  } else if (errors.total > 100) {
    console.log('   • Continue systematic error reduction');
    console.log('   • Consider enabling stricter TypeScript options');
  } else if (errors.total > 0) {
    console.log('   • Final push to zero errors!');
    console.log('   • Review remaining errors for patterns');
  } else {
    console.log('   • 🎉 Zero errors achieved!');
    console.log('   • Focus on maintaining type coverage above 98%');
  }
  
  console.log('\n' + '=' .repeat(50) + '\n');
}

function generateProgressBar(percentage: number, width: number): string {
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

// Run dashboard
generateDashboard();