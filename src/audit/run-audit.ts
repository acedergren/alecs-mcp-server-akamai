#!/usr/bin/env node

/**
 * ALECS MCP Server Audit CLI
 * Run comprehensive audit of the entire codebase
 */

import * as path from 'path';
import * as fs from 'fs/promises';
import { AuditFramework } from './audit-framework';
import { logger } from '../utils/logger';

async function main() {
  const projectRoot = path.resolve(__dirname, '../..');
  const auditDir = path.join(projectRoot, 'audit-reports');
  
  // Create audit reports directory
  await fs.mkdir(auditDir, { recursive: true });
  
  console.log('🔍 Starting ALECS MCP Server Comprehensive Audit...\n');
  
  const auditor = new AuditFramework(projectRoot);
  await auditor.initialize();
  
  // Run the audit
  const report = await auditor.runAudit([
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/__tests__/**',
  ]);
  
  // Generate reports
  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const jsonPath = path.join(auditDir, `audit-report-${timestamp}.json`);
  const mdPath = path.join(auditDir, `audit-report-${timestamp}.md`);
  
  await auditor.exportReport(report, jsonPath);
  await auditor.generateMarkdownReport(report, mdPath);
  
  // Print results
  console.log('\n📊 AUDIT RESULTS\n');
  console.log(`Total Issues: ${report.totalIssues}`);
  console.log(`Critical Issues: ${report.criticalIssues}`);
  console.log(`\nIssues by Severity:`);
  Object.entries(report.issuesBySeverity).forEach(([severity, count]) => {
    console.log(`  ${severity}: ${count}`);
  });
  console.log(`\nIssues by Category:`);
  Object.entries(report.issuesByCategory).forEach(([category, count]) => {
    console.log(`  ${category}: ${count}`);
  });
  
  console.log('\n📌 TOP RECOMMENDATIONS:');
  report.recommendations.slice(0, 5).forEach((rec, i) => {
    console.log(`${i + 1}. ${rec}`);
  });
  
  console.log(`\n📄 Full report: ${mdPath}`);
  console.log(`📊 JSON report: ${jsonPath}`);
  
  // Exit with error code if critical issues found
  if (report.criticalIssues > 0) {
    console.error(`\n❌ Audit failed with ${report.criticalIssues} critical issues!`);
    process.exit(1);
  }
}

main().catch(error => {
  logger.error('Audit failed:', error);
  process.exit(1);
});