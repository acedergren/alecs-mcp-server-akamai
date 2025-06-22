#!/usr/bin/env node

/**
 * ALEX'S SECURITY TEST RUNNER
 * Execute comprehensive security validation suite
 * 
 * Usage: npm run security:test
 *        npm run security:test -- --quick
 *        npm run security:test -- --focus=auth
 */

import { SecurityTestOrchestrator } from './SecurityTestOrchestrator';
import { SecurityReportingService } from './reporting/SecurityReportingService';
import * as fs from 'fs';
import * as path from 'path';

// ASCII Art Banner
const SECURITY_BANNER = `
┌─────────────────────────────────────────────────────────────────────────────┐
│ 🛡️ AKAMAI MCP SECURITY FORTRESS - ALEX'S SECURITY TESTING SUITE            │
│ Lead Security Engineer: Alex Rodriguez                                      │
│ Mission: BULLETPROOF security for the GenAI revolution!                    │
└─────────────────────────────────────────────────────────────────────────────┘
`;

interface SecurityTestOptions {
  quick?: boolean;
  focus?: string;
  skipReporting?: boolean;
  outputFormat?: 'json' | 'markdown' | 'html';
}

class SecurityTestRunner {
  private orchestrator: SecurityTestOrchestrator;
  private reporter: SecurityReportingService;
  private options: SecurityTestOptions;

  constructor(options: SecurityTestOptions = {}) {
    this.orchestrator = new SecurityTestOrchestrator();
    this.reporter = new SecurityReportingService();
    this.options = options;
  }

  async run(): Promise<void> {
    console.log(SECURITY_BANNER);
    console.log('🚀 Alex Rodriguez: Initializing SECURITY FORTRESS testing...\n');

    try {
      // Execute security tests
      const startTime = Date.now();
      const results = await this.orchestrator.executeSecurityTestSuite();
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      console.log(`\n⏱️  Total test duration: ${duration} seconds`);
      console.log(`📊 Overall Security Score: ${results.overallSecurityScore}/100`);

      // Generate report
      if (!this.options.skipReporting) {
        console.log('\n📄 Generating security report...');
        const report = await this.reporter.generateSecurityReport(results);
        
        // Save report in requested format
        await this.saveReport(report, results);
        
        // Display summary
        this.displaySummary(results);
      }

      // Exit with appropriate code
      if (results.overallSecurityScore < 70) {
        console.error('\n❌ SECURITY TEST FAILED: Score below acceptable threshold');
        process.exit(1);
      } else if (results.criticalVulnerabilities.length > 0) {
        console.error('\n❌ CRITICAL VULNERABILITIES DETECTED!');
        process.exit(1);
      } else {
        console.log('\n✅ Security tests passed!');
        process.exit(0);
      }

    } catch (error) {
      console.error('\n💥 CATASTROPHIC FAILURE in security testing:', error);
      process.exit(2);
    }
  }

  private async saveReport(report: any, results: any): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportsDir = path.join(process.cwd(), 'ci', 'security', 'reports');
    
    // Ensure reports directory exists
    await fs.promises.mkdir(reportsDir, { recursive: true });

    switch (this.options.outputFormat) {
      case 'markdown':
        const mdPath = path.join(reportsDir, `security-report-${timestamp}.md`);
        await fs.promises.writeFile(mdPath, this.generateMarkdownReport(report, results));
        console.log(`📝 Markdown report saved to: ${mdPath}`);
        break;

      case 'html':
        const htmlPath = path.join(reportsDir, `security-report-${timestamp}.html`);
        await fs.promises.writeFile(htmlPath, this.generateHTMLReport(report, results));
        console.log(`🌐 HTML report saved to: ${htmlPath}`);
        break;

      case 'json':
      default:
        const jsonPath = path.join(reportsDir, `security-report-${timestamp}.json`);
        await fs.promises.writeFile(jsonPath, JSON.stringify(report, null, 2));
        console.log(`📋 JSON report saved to: ${jsonPath}`);
        break;
    }
  }

  private generateMarkdownReport(report: any, results: any): string {
    let md = `# Security Test Report\n\n`;
    md += `**Generated:** ${new Date().toISOString()}\n\n`;
    
    md += `## Executive Summary\n\n`;
    md += report.executiveSummary + '\n\n';
    
    md += `## Alex's Security Verdict\n\n`;
    md += report.alexSecurityVerdict + '\n\n';
    
    if (report.criticalFindings.length > 0) {
      md += `## Critical Findings\n\n`;
      report.criticalFindings.forEach((finding: any) => {
        md += `### ${finding.title}\n`;
        md += `- **Description:** ${finding.description}\n`;
        md += `- **Impact:** ${finding.impact}\n`;
        md += `- **Recommendation:** ${finding.recommendation}\n\n`;
      });
    }
    
    md += `## Action Items\n\n`;
    report.actionItems.forEach((item: any) => {
      md += `- [ ] ${item.action} (${item.priority}) - Due: ${item.dueDate}\n`;
    });
    
    return md;
  }

  private generateHTMLReport(report: any, results: any): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Security Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { background: #1a1a1a; color: white; padding: 20px; border-radius: 8px; }
        .score { font-size: 48px; font-weight: bold; }
        .critical { color: #ff4444; }
        .warning { color: #ffaa00; }
        .success { color: #00aa00; }
        .section { margin: 20px 0; padding: 20px; background: #f5f5f5; border-radius: 8px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🛡️ Akamai MCP Security Test Report</h1>
        <div class="score">Score: ${results.overallSecurityScore}/100</div>
    </div>
    
    <div class="section">
        <h2>Executive Summary</h2>
        <pre>${report.executiveSummary}</pre>
    </div>
    
    <div class="section">
        <h2>Alex's Security Assessment</h2>
        <pre>${report.alexSecurityVerdict}</pre>
    </div>
</body>
</html>`;
  }

  private displaySummary(results: any): void {
    console.log('\n📊 SECURITY TEST SUMMARY');
    console.log('═══════════════════════════════════════════');
    
    console.log(`\n🎯 Overall Security Score: ${results.overallSecurityScore}/100`);
    
    if (results.overallSecurityScore >= 95) {
      console.log('   └─ 🌟 FORTRESS-LEVEL SECURITY!');
    } else if (results.overallSecurityScore >= 85) {
      console.log('   └─ ✅ Strong security posture');
    } else if (results.overallSecurityScore >= 70) {
      console.log('   └─ ⚠️  Good foundation, needs improvement');
    } else {
      console.log('   └─ 🚨 IMMEDIATE ACTION REQUIRED!');
    }
    
    console.log(`\n📈 Vulnerability Summary:`);
    console.log(`   • Critical: ${results.criticalVulnerabilities.length}`);
    console.log(`   • High: ${results.highRiskIssues.length}`);
    console.log(`   • Medium: ${results.mediumRiskIssues.length}`);
    
    if (results.penetrationTestResults) {
      console.log(`\n⚔️  Penetration Test Score: ${results.penetrationTestResults.overallScore}/100`);
    }
    
    console.log(`\n🔍 Threat Model Summary:`);
    console.log(`   • Critical Threats: ${results.threatModelValidation.riskMatrix.critical.length}`);
    console.log(`   • High Risk Threats: ${results.threatModelValidation.riskMatrix.high.length}`);
    
    console.log('\n═══════════════════════════════════════════');
  }
}

// Parse command line arguments
function parseArgs(): SecurityTestOptions {
  const args = process.argv.slice(2);
  const options: SecurityTestOptions = {};
  
  args.forEach(arg => {
    if (arg === '--quick') {
      options.quick = true;
    } else if (arg.startsWith('--focus=')) {
      options.focus = arg.split('=')[1];
    } else if (arg === '--skip-reporting') {
      options.skipReporting = true;
    } else if (arg.startsWith('--format=')) {
      options.outputFormat = arg.split('=')[1] as any;
    }
  });
  
  return options;
}

// Main execution
if (require.main === module) {
  const options = parseArgs();
  const runner = new SecurityTestRunner(options);
  
  runner.run().catch(error => {
    console.error('Fatal error:', error);
    process.exit(2);
  });
}

export { SecurityTestRunner };