#!/usr/bin/env node

/**
 * Example usage of the ALECS MCP Audit Framework
 * 
 * This demonstrates how to integrate the audit framework into your own MCP server project
 */

import { AuditFramework } from './audit-framework';
import { SonarQubeIntegration } from './sonarqube-integration';
import { SonarQubeFixOrchestrator } from './sonarqube-fix-orchestrator';

async function runBasicAudit() {
  console.log('🔍 Running basic code audit...\n');
  
  // Initialize the audit framework
  const audit = new AuditFramework();
  
  // Run the audit
  const report = await audit.runAudit();
  
  // Display summary
  console.log(`Total issues found: ${report.summary.total}`);
  console.log(`- Critical: ${report.summary.critical}`);
  console.log(`- High: ${report.summary.high}`);
  console.log(`- Medium: ${report.summary.medium}`);
  console.log(`- Low: ${report.summary.low}`);
  
  // Save report
  await audit.saveReport(report);
  console.log('\n✅ Audit report saved to audit-reports/');
}

async function runSonarQubeIntegration() {
  console.log('📊 Running SonarQube integration...\n');
  
  // Mock SonarQube data (replace with actual API call)
  const sonarIssues = [
    {
      key: 'ISSUE-001',
      rule: 'typescript:S1172',
      severity: 'MAJOR',
      component: 'project:src/example.ts',
      message: 'Remove unused parameter "context"',
      line: 42,
      status: 'OPEN',
      type: 'CODE_SMELL'
    }
  ];
  
  // Convert to audit format
  const auditIssues = SonarQubeIntegration.convertToAuditIssues(sonarIssues);
  console.log(`Converted ${auditIssues.length} SonarQube issues to audit format`);
  
  // Generate fix workflow
  const workflow = SonarQubeIntegration.generateFixWorkflow(sonarIssues);
  console.log(`Generated fix workflow with ${workflow.phases.length} phases`);
  console.log(`Auto-fixable issues: ${workflow.autoFixableCount}`);
}

async function runAutomatedFixes() {
  console.log('🔧 Running automated fixes...\n');
  
  const orchestrator = new SonarQubeFixOrchestrator();
  
  // Run in dry-run mode first
  console.log('Performing dry run...');
  await orchestrator.orchestrateFixes({
    dryRun: true,
    maxIssues: 10
  });
  
  console.log('\nCheck audit-results/sonarqube-dryrun-report.md for details');
  console.log('Run without --dry-run to apply fixes');
}

async function customAuditRule() {
  console.log('🎯 Example of custom audit rule...\n');
  
  const audit = new AuditFramework();
  
  // Add a custom rule
  audit.addRule({
    id: 'custom-mcp-001',
    name: 'MCP Tool Name Validation',
    category: 'mcp-compliance',
    severity: 'high',
    description: 'Ensure MCP tool names follow the pattern',
    check: async (framework) => {
      const issues = [];
      const files = await framework.glob('**/tools/*.ts');
      
      for (const file of files) {
        const content = await framework.readFile(file);
        const toolNameRegex = /name:\s*['"]([^'"]+)['"]/g;
        let match;
        
        while ((match = toolNameRegex.exec(content)) !== null) {
          const toolName = match[1];
          if (!/^[a-zA-Z0-9_-]{1,64}$/.test(toolName)) {
            issues.push({
              rule: 'custom-mcp-001',
              severity: 'high',
              category: 'mcp-compliance',
              message: `Invalid MCP tool name: ${toolName}`,
              file,
              line: content.substring(0, match.index).split('\n').length,
              column: 0,
              suggestion: 'Use only letters, numbers, hyphens, and underscores'
            });
          }
        }
      }
      
      return issues;
    }
  });
  
  // Run just this rule
  const issues = await audit.runRule('custom-mcp-001');
  console.log(`Found ${issues.length} custom rule violations`);
}

// Main execution
async function main() {
  const command = process.argv[2];
  
  switch (command) {
    case 'audit':
      await runBasicAudit();
      break;
    
    case 'sonarqube':
      await runSonarQubeIntegration();
      break;
    
    case 'fix':
      await runAutomatedFixes();
      break;
    
    case 'custom':
      await customAuditRule();
      break;
    
    default:
      console.log('ALECS MCP Audit Framework - Example Usage');
      console.log('=========================================\n');
      console.log('Commands:');
      console.log('  audit      - Run basic code audit');
      console.log('  sonarqube  - Demo SonarQube integration');
      console.log('  fix        - Run automated fixes (dry-run)');
      console.log('  custom     - Example custom audit rule');
      console.log('\nUsage: npx tsx example-usage.ts <command>');
  }
}

main().catch(console.error);