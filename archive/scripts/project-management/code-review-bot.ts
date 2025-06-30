#!/usr/bin/env tsx
/**
 * Code Review Bot for ALECS
 * 
 * Automated code review assistance including:
 * - Code quality checks
 * - Best practices enforcement
 * - Security scanning
 * - Performance analysis
 * - Review comment generation
 */

import { readFileSync } from 'fs';
import { execSync } from 'child_process';

interface CodeIssue {
  file: string;
  line: number;
  column?: number;
  severity: 'error' | 'warning' | 'info';
  message: string;
  rule?: string;
  suggestion?: string;
}

interface ReviewComment {
  path: string;
  line: number;
  body: string;
  side?: 'LEFT' | 'RIGHT';
}

interface CodeMetrics {
  complexity: number;
  maintainability: number;
  testCoverage: number;
  duplicateLines: number;
}

class CodeReviewBot {
  private commonIssues: Map<string, string>;
  private bestPractices: Map<string, string>;

  constructor() {
    this.commonIssues = this.loadCommonIssues();
    this.bestPractices = this.loadBestPractices();
  }

  private loadCommonIssues(): Map<string, string> {
    const issues = new Map<string, string>();
    
    issues.set('console.log', 'Remove console.log statements before committing');
    issues.set('any type', 'Avoid using "any" type. Use specific types instead');
    issues.set('no error handling', 'Add error handling for async operations');
    issues.set('magic numbers', 'Extract magic numbers to named constants');
    issues.set('long function', 'Consider breaking down functions longer than 50 lines');
    issues.set('no tests', 'Add unit tests for new functionality');
    issues.set('todo comment', 'Address TODO comments or create issues for them');
    issues.set('hardcoded values', 'Move hardcoded values to configuration');
    
    return issues;
  }

  private loadBestPractices(): Map<string, string> {
    const practices = new Map<string, string>();
    
    practices.set('naming', 'Use descriptive variable and function names');
    practices.set('single-responsibility', 'Each function should do one thing');
    practices.set('error-first', 'Handle errors before happy path');
    practices.set('immutability', 'Prefer const over let when possible');
    practices.set('async-await', 'Use async/await instead of callbacks');
    practices.set('type-safety', 'Leverage TypeScript types fully');
    
    return practices;
  }

  async analyzeCode(files: string[]): Promise<CodeIssue[]> {
    const issues: CodeIssue[] = [];

    for (const file of files) {
      console.log(`🔍 Analyzing ${file}...`);
      
      try {
        const content = readFileSync(file, 'utf-8');
        const lines = content.split('\n');
        
        // Check for common issues
        lines.forEach((line, index) => {
          // Console.log detection
          if (line.includes('console.log') && !file.includes('.test.')) {
            issues.push({
              file,
              line: index + 1,
              severity: 'warning',
              message: 'Remove console.log statement',
              rule: 'no-console',
              suggestion: 'Use proper logging library instead',
            });
          }

          // Any type detection
          if (line.includes(': any') || line.includes('<any>')) {
            issues.push({
              file,
              line: index + 1,
              severity: 'warning',
              message: 'Avoid using "any" type',
              rule: 'no-any',
              suggestion: 'Use specific types or unknown',
            });
          }

          // TODO comments
          if (line.includes('TODO:') || line.includes('FIXME:')) {
            issues.push({
              file,
              line: index + 1,
              severity: 'info',
              message: 'Unresolved TODO/FIXME comment',
              rule: 'no-todo',
              suggestion: 'Create an issue to track this',
            });
          }

          // Long lines
          if (line.length > 120) {
            issues.push({
              file,
              line: index + 1,
              severity: 'warning',
              message: `Line too long (${line.length} characters)`,
              rule: 'max-line-length',
              suggestion: 'Break into multiple lines',
            });
          }
        });

        // Function complexity check
        const functionMatches = content.matchAll(/function\s+(\w+)|(\w+)\s*=\s*(?:async\s*)?\(/g);
        for (const match of functionMatches) {
          const functionName = match[1] || match[2];
          // Simple heuristic: count lines between function start and end
          const functionStart = match.index!;
          const functionEnd = content.indexOf('\n}', functionStart);
          if (functionEnd > functionStart) {
            const functionLines = content.substring(functionStart, functionEnd).split('\n').length;
            if (functionLines > 50) {
              issues.push({
                file,
                line: content.substring(0, functionStart).split('\n').length,
                severity: 'warning',
                message: `Function "${functionName}" is too long (${functionLines} lines)`,
                rule: 'max-function-length',
                suggestion: 'Consider breaking into smaller functions',
              });
            }
          }
        }

        // Check for error handling in async functions
        if (content.includes('async ')) {
          const asyncFunctions = content.matchAll(/async\s+(?:function\s+)?(\w+)/g);
          for (const match of asyncFunctions) {
            const functionName = match[1];
            const functionStart = match.index!;
            const functionEnd = content.indexOf('\n}', functionStart);
            const functionBody = content.substring(functionStart, functionEnd);
            
            if (!functionBody.includes('try') && !functionBody.includes('catch')) {
              issues.push({
                file,
                line: content.substring(0, functionStart).split('\n').length,
                severity: 'warning',
                message: `Async function "${functionName}" lacks error handling`,
                rule: 'require-error-handling',
                suggestion: 'Add try-catch block or .catch() handler',
              });
            }
          }
        }
      } catch (error) {
        console.error(`Error analyzing ${file}:`, error);
      }
    }

    return issues;
  }

  generateReviewComments(issues: CodeIssue[]): ReviewComment[] {
    const comments: ReviewComment[] = [];
    
    // Group issues by file and line
    const groupedIssues = new Map<string, Map<number, CodeIssue[]>>();
    
    for (const issue of issues) {
      if (!groupedIssues.has(issue.file)) {
        groupedIssues.set(issue.file, new Map());
      }
      
      const fileIssues = groupedIssues.get(issue.file)!;
      if (!fileIssues.has(issue.line)) {
        fileIssues.set(issue.line, []);
      }
      
      fileIssues.get(issue.line)!.push(issue);
    }

    // Generate comments
    for (const [file, lineIssues] of groupedIssues) {
      for (const [line, issues] of lineIssues) {
        const severity = issues.some(i => i.severity === 'error') ? '🚨' :
                        issues.some(i => i.severity === 'warning') ? '⚠️' : 'ℹ️';
        
        let body = `${severity} **Code Review Finding**\n\n`;
        
        for (const issue of issues) {
          body += `- **${issue.message}**`;
          if (issue.rule) {
            body += ` \`[${issue.rule}]\``;
          }
          body += '\n';
          if (issue.suggestion) {
            body += `  💡 ${issue.suggestion}\n`;
          }
          body += '\n';
        }

        comments.push({
          path: file,
          line,
          body: body.trim(),
        });
      }
    }

    return comments;
  }

  async analyzeComplexity(file: string): Promise<CodeMetrics> {
    console.log(`📊 Analyzing complexity for ${file}...`);
    
    // Mock complexity analysis
    // In real implementation, would use tools like:
    // - ESLint complexity rule
    // - Plato for JavaScript complexity
    // - SonarQube metrics
    
    const metrics: CodeMetrics = {
      complexity: Math.floor(Math.random() * 20) + 1,
      maintainability: Math.floor(Math.random() * 30) + 70,
      testCoverage: Math.floor(Math.random() * 40) + 60,
      duplicateLines: Math.floor(Math.random() * 50),
    };

    return metrics;
  }

  async checkSecurity(files: string[]): Promise<CodeIssue[]> {
    const securityIssues: CodeIssue[] = [];

    for (const file of files) {
      try {
        const content = readFileSync(file, 'utf-8');
        
        // Check for common security issues
        const securityPatterns = [
          { pattern: /eval\s*\(/, message: 'Avoid using eval() - security risk' },
          { pattern: /innerHTML\s*=/, message: 'Use textContent instead of innerHTML to prevent XSS' },
          { pattern: /password.*=.*["'].*["']/, message: 'Do not hardcode passwords' },
          { pattern: /api[_-]?key.*=.*["'].*["']/, message: 'Do not hardcode API keys' },
          { pattern: /crypto\.createHash\(['"]md5['"]\)/, message: 'MD5 is insecure, use SHA-256 or better' },
          { pattern: /require\(['"]child_process['"]\)/, message: 'Be careful with child_process usage' },
        ];

        const lines = content.split('\n');
        lines.forEach((line, index) => {
          for (const { pattern, message } of securityPatterns) {
            if (pattern.test(line)) {
              securityIssues.push({
                file,
                line: index + 1,
                severity: 'error',
                message,
                rule: 'security',
              });
            }
          }
        });
      } catch (error) {
        console.error(`Error checking security for ${file}:`, error);
      }
    }

    return securityIssues;
  }

  generateReviewSummary(
    issues: CodeIssue[],
    metrics: Map<string, CodeMetrics>
  ): string {
    const errorCount = issues.filter(i => i.severity === 'error').length;
    const warningCount = issues.filter(i => i.severity === 'warning').length;
    const infoCount = issues.filter(i => i.severity === 'info').length;

    let summary = `## 🤖 Automated Code Review Summary

### Overview
- **Total Issues Found**: ${issues.length}
- **Errors**: ${errorCount} 🚨
- **Warnings**: ${warningCount} ⚠️
- **Info**: ${infoCount} ℹ️

### Code Quality Metrics
`;

    for (const [file, metric] of metrics) {
      summary += `
**${file}**
- Complexity: ${metric.complexity} ${metric.complexity > 10 ? '⚠️' : '✅'}
- Maintainability: ${metric.maintainability}% ${metric.maintainability < 80 ? '⚠️' : '✅'}
- Test Coverage: ${metric.testCoverage}% ${metric.testCoverage < 80 ? '⚠️' : '✅'}
- Duplicate Lines: ${metric.duplicateLines} ${metric.duplicateLines > 20 ? '⚠️' : '✅'}
`;
    }

    if (errorCount > 0) {
      summary += `
### 🚨 Critical Issues
Please address all error-level issues before merging:
`;
      issues.filter(i => i.severity === 'error').forEach(issue => {
        summary += `- ${issue.file}:${issue.line} - ${issue.message}\n`;
      });
    }

    summary += `
### Recommendations
1. ${errorCount > 0 ? 'Fix all critical issues' : 'No critical issues found ✅'}
2. ${warningCount > 5 ? 'Consider addressing warnings to improve code quality' : 'Warning count is acceptable'}
3. ${metrics.size > 0 && Array.from(metrics.values()).some(m => m.testCoverage < 80) ? 'Improve test coverage to meet 80% target' : 'Test coverage looks good'}

---
*This review was generated automatically by ALECS Code Review Bot*`;

    return summary;
  }

  printBestPractices() {
    console.log('\n📚 Code Review Best Practices\n');
    
    for (const [category, practice] of this.bestPractices) {
      console.log(`**${category}**: ${practice}`);
    }
    
    console.log('\n📋 Common Issues to Check\n');
    
    for (const [issue, description] of this.commonIssues) {
      console.log(`- ${issue}: ${description}`);
    }
  }
}

// CLI Interface
async function main() {
  const command = process.argv[2];
  const bot = new CodeReviewBot();

  switch (command) {
    case 'analyze':
      const files = process.argv.slice(3);
      if (files.length === 0) {
        console.error('❌ Please provide files to analyze');
        process.exit(1);
      }
      
      const issues = await bot.analyzeCode(files);
      const securityIssues = await bot.checkSecurity(files);
      const allIssues = [...issues, ...securityIssues];
      
      console.log(`\nFound ${allIssues.length} issues:`);
      allIssues.forEach(issue => {
        console.log(`${issue.severity.toUpperCase()}: ${issue.file}:${issue.line} - ${issue.message}`);
      });
      
      // Generate review comments
      const comments = bot.generateReviewComments(allIssues);
      console.log(`\nGenerated ${comments.length} review comments`);
      break;

    case 'complexity':
      const file = process.argv[3];
      if (!file) {
        console.error('❌ Please provide a file to analyze');
        process.exit(1);
      }
      
      const metrics = await bot.analyzeComplexity(file);
      console.log('Code Metrics:', metrics);
      break;

    case 'summary':
      // Mock data for demo
      const mockIssues: CodeIssue[] = [
        { file: 'src/api.ts', line: 42, severity: 'error', message: 'No error handling' },
        { file: 'src/api.ts', line: 55, severity: 'warning', message: 'Console.log found' },
        { file: 'src/utils.ts', line: 12, severity: 'info', message: 'TODO comment' },
      ];
      
      const mockMetrics = new Map<string, CodeMetrics>([
        ['src/api.ts', { complexity: 15, maintainability: 75, testCoverage: 65, duplicateLines: 25 }],
        ['src/utils.ts', { complexity: 8, maintainability: 85, testCoverage: 90, duplicateLines: 5 }],
      ]);
      
      const summary = bot.generateReviewSummary(mockIssues, mockMetrics);
      console.log(summary);
      break;

    case 'best-practices':
      bot.printBestPractices();
      break;

    default:
      console.log(`
ALECS Code Review Bot

Usage:
  tsx scripts/project-management/code-review-bot.ts analyze <files...>
  tsx scripts/project-management/code-review-bot.ts complexity <file>
  tsx scripts/project-management/code-review-bot.ts summary
  tsx scripts/project-management/code-review-bot.ts best-practices

Examples:
  tsx scripts/project-management/code-review-bot.ts analyze src/api.ts src/utils.ts
  tsx scripts/project-management/code-review-bot.ts complexity src/api.ts
  tsx scripts/project-management/code-review-bot.ts best-practices
      `);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { CodeReviewBot, CodeIssue, ReviewComment, CodeMetrics };