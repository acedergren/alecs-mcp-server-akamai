import { TestSuiteResults, DetectedChanges, ComprehensiveReport } from '../types/TestTypes';
import { AlexPersonality } from '../utils/AlexPersonality';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * 📊 COMPREHENSIVE REPORTING ENGINE
 * Alex Rodriguez: "Reports should tell stories, not just numbers!"
 */
export class ReportingService {
  private reportsDir = path.join(process.cwd(), 'ci/reports');
  
  constructor() {
    this.ensureReportsDirectory();
  }
  
  private async ensureReportsDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.reportsDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create reports directory:', error);
    }
  }
  
  /**
   * Generate comprehensive test report with Alex's insights
   */
  async generateComprehensiveReport(
    results: TestSuiteResults,
    changes: DetectedChanges,
    executionTime: number
  ): Promise<ComprehensiveReport> {
    console.log('\n📊 [REPORTING] Generating comprehensive report...');
    
    const report: ComprehensiveReport = {
      summary: this.generateExecutiveSummary(results, changes),
      testResults: results,
      detectedChanges: changes,
      performance: {
        executionTime,
        testsPerSecond: results.totalTests / (executionTime / 1000),
        changeDetectionTime: changes.detectionTime
      },
      recommendations: this.generateRecommendations(results, changes),
      alexCommentary: this.generateAlexCommentary(results, changes),
      generatedAt: new Date().toISOString()
    };
    
    // Save detailed report
    await this.saveReportToFile(report);
    
    // Generate comprehensive Markdown report
    await this.generateMarkdownReport(report);
    
    // Generate PR summary if in CI
    if (process.env.CI) {
      await this.generatePRSummary(report);
    }
    
    console.log('📊 [REPORTING] Alex Rodriguez: Comprehensive report generated!');
    console.log(AlexPersonality.getCelebrationMessage('Report generation complete'));
    
    return report;
  }
  
  /**
   * Generate executive summary
   */
  private generateExecutiveSummary(results: TestSuiteResults, changes: DetectedChanges): string {
    const passEmoji = results.passRate >= 0.95 ? '🌟' : results.passRate >= 0.8 ? '✅' : '⚠️';
    
    let summary = `# Test Suite Results ${passEmoji}\n\n`;
    summary += `**Pass Rate:** ${(results.passRate * 100).toFixed(1)}% (${results.passedTests}/${results.totalTests})\n`;
    summary += `**Execution Time:** ${(results.duration / 1000).toFixed(1)}s\n`;
    summary += `**Tool Coverage:** ${results.coverage.coveragePercentage.toFixed(1)}%\n`;
    
    if (changes.hasChanges()) {
      summary += `\n## Changes Detected\n`;
      summary += `- New tools: ${changes.newTools.length}\n`;
      summary += `- Modified tools: ${changes.modifiedTools.length}\n`;
      summary += `- Removed tools: ${changes.removedTools.length}\n`;
    }
    
    if (results.criticalIssues.length > 0) {
      summary += `\n## ⚠️ Critical Issues (${results.criticalIssues.length})\n`;
      results.criticalIssues.forEach(issue => {
        summary += `- **${issue.toolName}**: ${issue.issue}\n`;
      });
    }
    
    return summary;
  }
  
  /**
   * Generate recommendations based on results
   */
  private generateRecommendations(results: TestSuiteResults, changes: DetectedChanges): string[] {
    const recommendations: string[] = [];
    
    // Coverage recommendations
    if (results.coverage.coveragePercentage < 80) {
      recommendations.push(
        `📈 Increase test coverage from ${results.coverage.coveragePercentage.toFixed(1)}% to at least 80%`
      );
    }
    
    // Performance recommendations
    if (results.duration > 300000) { // 5 minutes
      recommendations.push(
        `⚡ Optimize test execution time - currently ${(results.duration / 1000).toFixed(0)}s`
      );
    }
    
    // UX recommendations
    if (results.uxIssues.length > 0) {
      recommendations.push(
        `🎨 Address ${results.uxIssues.length} UX issues to improve user experience`
      );
    }
    
    // Tool-specific recommendations
    if (results.coverage.untestablTools.length > 0) {
      recommendations.push(
        `🔧 Create tests for ${results.coverage.untestablTools.length} untested tools`
      );
    }
    
    return recommendations;
  }
  
  /**
   * Alex's expert commentary on test results
   */
  private generateAlexCommentary(
    results: TestSuiteResults, 
    changes: DetectedChanges
  ): string {
    let commentary = `## 🎯 Alex Rodriguez's Expert Analysis\n\n`;
    
    // Overall assessment
    if (results.passRate >= 0.95) {
      commentary += `🌟 **OUTSTANDING!** ${(results.passRate * 100).toFixed(1)}% pass rate - this GenAI revolution is SOLID!\n\n`;
    } else if (results.passRate >= 0.90) {
      commentary += `✅ **EXCELLENT work!** ${(results.passRate * 100).toFixed(1)}% pass rate - just a few polish items to fix.\n\n`;
    } else if (results.passRate >= 0.80) {
      commentary += `💪 **Good progress!** ${(results.passRate * 100).toFixed(1)}% pass rate - we're getting there!\n\n`;
    } else {
      commentary += `⚠️ **We've got work to do!** ${(results.passRate * 100).toFixed(1)}% pass rate needs improvement.\n\n`;
    }
    
    // Change analysis
    if (changes.hasChanges()) {
      commentary += `### 🔄 Evolution Detected\n`;
      if (changes.newTools.length > 0) {
        commentary += `- **${changes.newTools.length} new tools** discovered and tests auto-generated! The future is self-updating! 🚀\n`;
      }
      if (changes.modifiedTools.length > 0) {
        commentary += `- **${changes.modifiedTools.length} tools modified** - tests automatically updated to match! 🔧\n`;
      }
      if (changes.removedTools.length > 0) {
        commentary += `- **${changes.removedTools.length} tools removed** - obsolete tests cleaned up! 🧹\n`;
      }
      commentary += `\n`;
    }
    
    // UX insights
    if (results.uxIssues.length > 0) {
      commentary += `### 🎨 UX Insights (Alex's Specialty!)\n`;
      const critical = results.uxIssues.filter(i => i.severity === 'critical').length;
      const major = results.uxIssues.filter(i => i.severity === 'major').length;
      const minor = results.uxIssues.filter(i => i.severity === 'minor').length;
      
      if (critical > 0) commentary += `- **${critical} critical** UX issues need immediate attention! 🚨\n`;
      if (major > 0) commentary += `- **${major} major** UX issues affecting user experience 📍\n`;
      if (minor > 0) commentary += `- **${minor} minor** UX polish opportunities 💅\n`;
      commentary += `\nRemember: Great UX makes technology invisible - users just experience MAGIC! ✨\n\n`;
    }
    
    // Performance insights
    commentary += `### ⚡ Performance Insights\n`;
    commentary += `- Tests executed at **${results.performance.testsPerSecond.toFixed(1)} tests/second**\n`;
    commentary += `- Change detection completed in **${changes.detectionTime}ms**\n`;
    
    if (results.performance.testsPerSecond < 1) {
      commentary += `- 🐌 Tests are running slowly - consider optimization\n`;
    } else if (results.performance.testsPerSecond > 5) {
      commentary += `- 🚀 Lightning-fast test execution - EXCELLENT!\n`;
    }
    
    // Motivational closing
    commentary += `\n### 💡 Bottom Line\n`;
    commentary += AlexPersonality.getRandomQuote();
    commentary += `\nEvery test makes our GenAI revolution stronger. Keep pushing forward! 🎯\n`;
    
    commentary += `\n${AlexPersonality.getSignature()}`;
    
    return commentary;
  }
  
  /**
   * Save report to file
   */
  private async saveReportToFile(report: ComprehensiveReport): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `test-report-${timestamp}.json`;
    const filePath = path.join(this.reportsDir, fileName);
    
    await fs.writeFile(filePath, JSON.stringify(report, null, 2), 'utf-8');
    
    // Also save latest report
    const latestPath = path.join(this.reportsDir, 'latest-report.json');
    await fs.writeFile(latestPath, JSON.stringify(report, null, 2), 'utf-8');
    
    console.log(`📄 [REPORTING] Report saved: ${fileName}`);
  }
  
  /**
   * Generate comprehensive Markdown report
   */
  private async generateMarkdownReport(report: ComprehensiveReport): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    let markdown = `# 🚀 ALECS Self-Updating CI Test Suite Report\n\n`;
    markdown += `**Generated:** ${new Date(report.generatedAt).toLocaleString()}\n`;
    markdown += `**Report ID:** ${timestamp}\n\n`;
    
    // Executive Summary
    markdown += `## 📊 Executive Summary\n\n`;
    markdown += report.summary;
    markdown += `\n\n`;
    
    // Detailed Results
    markdown += `## 🧪 Test Results Breakdown\n\n`;
    markdown += `| Metric | Value |\n`;
    markdown += `|--------|-------|\n`;
    markdown += `| Total Tests | ${report.testResults.totalTests} |\n`;
    markdown += `| Passed Tests | ${report.testResults.passedTests} ✅ |\n`;
    markdown += `| Failed Tests | ${report.testResults.failedTests} ❌ |\n`;
    markdown += `| Skipped Tests | ${report.testResults.skippedTests} ⏭️ |\n`;
    markdown += `| Pass Rate | ${(report.testResults.passRate * 100).toFixed(1)}% |\n`;
    markdown += `| Execution Time | ${(report.testResults.duration / 1000).toFixed(1)}s |\n`;
    markdown += `| Tests per Second | ${report.testResults.performance.testsPerSecond.toFixed(1)} |\n\n`;
    
    // Individual Test Results
    if (report.testResults.testResults.length > 0) {
      markdown += `### 🔍 Individual Test Results\n\n`;
      for (const test of report.testResults.testResults) {
        const status = test.status === 'passed' ? '✅' : test.status === 'failed' ? '❌' : '⏭️';
        markdown += `- ${status} **${test.testName}** (${test.duration}ms)\n`;
        if (test.error) {
          markdown += `  - Error: ${test.error}\n`;
        }
      }
      markdown += `\n`;
    }
    
    // Coverage Analysis
    markdown += `## 📈 Coverage Analysis\n\n`;
    markdown += `- **Tool Coverage:** ${report.testResults.coverage.coveragePercentage.toFixed(1)}%\n`;
    markdown += `- **Total Tools:** ${report.testResults.coverage.totalTools}\n`;
    markdown += `- **Tested Tools:** ${report.testResults.coverage.testedTools}\n`;
    
    if (report.testResults.coverage.untestablTools.length > 0) {
      markdown += `- **Untested Tools:** ${report.testResults.coverage.untestablTools.join(', ')}\n`;
    }
    markdown += `\n`;
    
    // Change Detection
    if (report.detectedChanges.newTools.length > 0 || 
        report.detectedChanges.modifiedTools.length > 0 || 
        report.detectedChanges.removedTools.length > 0) {
      markdown += `## 🔄 Change Detection Results\n\n`;
      
      if (report.detectedChanges.newTools.length > 0) {
        markdown += `### 🆕 New Tools (${report.detectedChanges.newTools.length})\n`;
        report.detectedChanges.newTools.forEach(tool => {
          markdown += `- **${tool.name}** - ${tool.description}\n`;
        });
        markdown += `\n`;
      }
      
      if (report.detectedChanges.modifiedTools.length > 0) {
        markdown += `### 🔧 Modified Tools (${report.detectedChanges.modifiedTools.length})\n`;
        report.detectedChanges.modifiedTools.forEach(tool => {
          markdown += `- **${tool.toolName}** - ${tool.changeDescription}\n`;
        });
        markdown += `\n`;
      }
      
      if (report.detectedChanges.removedTools.length > 0) {
        markdown += `### 🗑️ Removed Tools (${report.detectedChanges.removedTools.length})\n`;
        report.detectedChanges.removedTools.forEach(tool => {
          markdown += `- **${tool.name}** - ${tool.description}\n`;
        });
        markdown += `\n`;
      }
    } else {
      markdown += `## ✅ No Changes Detected\n\nAll tools remain stable since last test run.\n\n`;
    }
    
    // Performance Metrics
    markdown += `## ⚡ Performance Metrics\n\n`;
    markdown += `| Metric | Value |\n`;
    markdown += `|--------|-------|\n`;
    markdown += `| Total Execution Time | ${(report.performance.executionTime / 1000).toFixed(1)}s |\n`;
    markdown += `| Tests per Second | ${report.performance.testsPerSecond.toFixed(1)} |\n`;
    markdown += `| Change Detection Time | ${report.performance.changeDetectionTime}ms |\n`;
    markdown += `| Average Test Duration | ${report.testResults.performance.averageTestDuration.toFixed(0)}ms |\n\n`;
    
    // Alex's Commentary
    markdown += report.alexCommentary;
    markdown += `\n\n`;
    
    // Recommendations
    if (report.recommendations.length > 0) {
      markdown += `## 💡 Recommendations\n\n`;
      report.recommendations.forEach(rec => {
        markdown += `- ${rec}\n`;
      });
      markdown += `\n`;
    }
    
    // Footer
    markdown += `---\n\n`;
    markdown += `*Report generated by ALECS Self-Updating CI Test Suite*\n`;
    markdown += `*Powered by Alex Rodriguez's revolutionary testing framework*\n`;
    
    // Save markdown report
    const markdownPath = path.join(this.reportsDir, `test-report-${timestamp}.md`);
    await fs.writeFile(markdownPath, markdown, 'utf-8');
    
    // Also save as latest markdown report
    const latestMarkdownPath = path.join(this.reportsDir, 'latest-report.md');
    await fs.writeFile(latestMarkdownPath, markdown, 'utf-8');
    
    console.log(`📄 [REPORTING] Markdown report saved: test-report-${timestamp}.md`);
  }

  /**
   * Generate PR summary for GitHub
   */
  private async generatePRSummary(report: ComprehensiveReport): Promise<void> {
    let summary = `## 🤖 Automated Test Results\n\n`;
    summary += report.summary;
    summary += `\n${report.alexCommentary}`;
    
    const prSummaryPath = path.join(this.reportsDir, 'pr-summary.md');
    await fs.writeFile(prSummaryPath, summary, 'utf-8');
  }
  
  /**
   * Report test failure
   */
  async reportFailure(error: any): Promise<void> {
    const failureReport = {
      timestamp: new Date().toISOString(),
      error: error.message || 'Unknown error',
      stack: error.stack,
      alexMessage: AlexPersonality.getInvestigationMessage('test suite failure')
    };
    
    const failurePath = path.join(this.reportsDir, 'failure-report.json');
    await fs.writeFile(failurePath, JSON.stringify(failureReport, null, 2), 'utf-8');
    
    console.error('❌ [REPORTING] Failure report generated');
  }
}