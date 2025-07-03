/**
 * ALECS MCP Server Comprehensive Audit Framework
 * 
 * Purpose: Systematically analyze every component of the codebase to identify:
 * - Bugs and inconsistencies
 * - Performance bottlenecks
 * - Security vulnerabilities
 * - API compliance issues
 * - Code quality problems
 * - Architecture violations
 * 
 * This framework implements the "superthink" audit approach requested by the user
 */

// import { z } from 'zod'; // Unused in this file
import * as fs from 'fs/promises';
import * as path from 'path';
import { logger } from '../utils/logger';

// Audit result types
export interface AuditIssue {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: 'bug' | 'security' | 'performance' | 'consistency' | 'api-compliance' | 'code-quality' | 'architecture';
  file: string;
  line?: number;
  column?: number;
  message: string;
  suggestion?: string;
  codeSnippet?: string;
}

export interface AuditReport {
  timestamp: Date;
  totalIssues: number;
  criticalIssues: number;
  issuesByCategory: Record<string, number>;
  issuesBySeverity: Record<string, number>;
  issues: AuditIssue[];
  summary: string;
  recommendations: string[];
}

// Audit rules and patterns
export interface AuditRule {
  name: string;
  description: string;
  category: AuditIssue['category'];
  check: (context: AuditContext) => Promise<AuditIssue[]>;
}

export interface AuditContext {
  filePath: string;
  content: string;
  ast?: any; // TypeScript AST if needed
  projectRoot: string;
}

/**
 * Main Audit Framework Class
 */
export class AuditFramework {
  private rules: AuditRule[] = [];
  private issues: AuditIssue[] = [];
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  /**
   * Initialize the framework
   */
  async initialize(): Promise<void> {
    await this.registerSpecializedRules();
    this.registerBuiltInRules();
  }

  /**
   * Register built-in audit rules
   */
  private registerBuiltInRules(): void {
    // Security Rules
    this.addRule({
      name: 'no-hardcoded-secrets',
      description: 'Check for hardcoded secrets and API keys',
      category: 'security',
      check: async (context) => {
        const issues: AuditIssue[] = [];
        const secretPatterns = [
          /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/gi,
          /secret\s*[:=]\s*['"][^'"]+['"]/gi,
          /password\s*[:=]\s*['"][^'"]+['"]/gi,
          /token\s*[:=]\s*['"][^'"]+['"]/gi,
          /client[_-]?secret\s*[:=]\s*['"][^'"]+['"]/gi,
        ];

        for (const pattern of secretPatterns) {
          const matches = context.content.matchAll(pattern);
          for (const match of matches) {
            const lines = context.content.substring(0, match.index).split('\n');
            issues.push({
              severity: 'critical',
              category: 'security',
              file: context.filePath,
              line: lines.length,
              message: 'Potential hardcoded secret detected',
              suggestion: 'Use environment variables or secure configuration management',
              codeSnippet: match[0],
            });
          }
        }
        return issues;
      },
    });

    this.addRule({
      name: 'customer-isolation',
      description: 'Verify proper customer isolation in multi-tenant operations',
      category: 'security',
      check: async (context) => {
        const issues: AuditIssue[] = [];
        
        // Check for missing customer validation
        if (context.content.includes('customer:') && !context.content.includes('validateCustomer')) {
          const lines = context.content.split('\n');
          lines.forEach((line, index) => {
            if (line.includes('customer:') && !line.includes('optional()')) {
              issues.push({
                severity: 'high',
                category: 'security',
                file: context.filePath,
                line: index + 1,
                message: 'Customer parameter without validation',
                suggestion: 'Always validate customer parameter against .edgerc configuration',
              });
            }
          });
        }
        return issues;
      },
    });

    // Performance Rules
    this.addRule({
      name: 'inefficient-loops',
      description: 'Detect inefficient loop patterns',
      category: 'performance',
      check: async (context) => {
        const issues: AuditIssue[] = [];
        
        // Check for array operations inside loops
        const loopWithArrayOps = /for\s*\([^)]+\)\s*{[^}]*\.(push|unshift|splice)\([^}]*}/g;
        const matches = context.content.matchAll(loopWithArrayOps);
        
        for (const match of matches) {
          const lines = context.content.substring(0, match.index).split('\n');
          issues.push({
            severity: 'medium',
            category: 'performance',
            file: context.filePath,
            line: lines.length,
            message: 'Array mutation inside loop detected',
            suggestion: 'Consider using array methods like map(), filter(), or pre-allocating array size',
          });
        }
        return issues;
      },
    });

    this.addRule({
      name: 'missing-cache-invalidation',
      description: 'Check for missing cache invalidation on updates',
      category: 'performance',
      check: async (context) => {
        const issues: AuditIssue[] = [];
        
        // Look for update/create/delete operations without cache invalidation
        const mutationPatterns = [
          /create[A-Z]\w+|update[A-Z]\w+|delete[A-Z]\w+|remove[A-Z]\w+/g,
        ];
        
        for (const pattern of mutationPatterns) {
          const matches = context.content.matchAll(pattern);
          for (const match of matches) {
            const functionName = match[0];
            // Check if there's cache invalidation nearby
            const startIndex = Math.max(0, match.index! - 500);
            const endIndex = Math.min(context.content.length, match.index! + 500);
            const nearbyCode = context.content.substring(startIndex, endIndex);
            
            if (!nearbyCode.includes('invalidate') && !nearbyCode.includes('clearCache')) {
              const lines = context.content.substring(0, match.index).split('\n');
              issues.push({
                severity: 'medium',
                category: 'performance',
                file: context.filePath,
                line: lines.length,
                message: `Mutation operation '${functionName}' without cache invalidation`,
                suggestion: 'Add cache invalidation after state-changing operations',
              });
            }
          }
        }
        return issues;
      },
    });

    // API Compliance Rules
    this.addRule({
      name: 'akamai-api-response-format',
      description: 'Verify Akamai API response format compliance',
      category: 'api-compliance',
      check: async (context) => {
        const issues: AuditIssue[] = [];
        
        // Check for proper error response format
        if (context.content.includes('throw new Error')) {
          const errorThrows = context.content.matchAll(/throw new Error\(['"]([^'"]+)['"]\)/g);
          for (const match of errorThrows) {
            const lines = context.content.substring(0, match.index).split('\n');
            issues.push({
              severity: 'high',
              category: 'api-compliance',
              file: context.filePath,
              line: lines.length,
              message: 'Using generic Error instead of AkamaiError',
              suggestion: 'Use AkamaiError with proper error codes and details',
              codeSnippet: match[0],
            });
          }
        }
        return issues;
      },
    });

    // Code Quality Rules
    this.addRule({
      name: 'no-any-type',
      description: 'Detect usage of any type',
      category: 'code-quality',
      check: async (context) => {
        const issues: AuditIssue[] = [];
        
        const anyTypePattern = /:\s*any\b/g;
        const matches = context.content.matchAll(anyTypePattern);
        
        for (const match of matches) {
          const lines = context.content.substring(0, match.index).split('\n');
          issues.push({
            severity: 'medium',
            category: 'code-quality',
            file: context.filePath,
            line: lines.length,
            message: 'Usage of any type detected',
            suggestion: 'Use proper TypeScript types or unknown with type guards',
            codeSnippet: match[0],
          });
        }
        return issues;
      },
    });

    this.addRule({
      name: 'missing-error-handling',
      description: 'Detect missing error handling in async operations',
      category: 'bug',
      check: async (context) => {
        const issues: AuditIssue[] = [];
        
        // Look for async/await without try-catch
        const asyncWithoutTry = /async\s+[^{]+{[^}]*await[^}]*}/g;
        const matches = context.content.matchAll(asyncWithoutTry);
        
        for (const match of matches) {
          const functionBody = match[0];
          if (!functionBody.includes('try') && !functionBody.includes('catch')) {
            const lines = context.content.substring(0, match.index).split('\n');
            issues.push({
              severity: 'high',
              category: 'bug',
              file: context.filePath,
              line: lines.length,
              message: 'Async function without error handling',
              suggestion: 'Wrap await calls in try-catch blocks',
            });
          }
        }
        return issues;
      },
    });

    // Consistency Rules
    this.addRule({
      name: 'inconsistent-naming',
      description: 'Check for inconsistent naming patterns',
      category: 'consistency',
      check: async (context) => {
        const issues: AuditIssue[] = [];
        
        // Check for mixed naming conventions
        const camelCaseFunctions = context.content.match(/function\s+[a-z][a-zA-Z0-9]*/g) || [];
        const snakeCaseFunctions = context.content.match(/function\s+[a-z]+_[a-z_]+/g) || [];
        
        if (camelCaseFunctions.length > 0 && snakeCaseFunctions.length > 0) {
          issues.push({
            severity: 'low',
            category: 'consistency',
            file: context.filePath,
            message: 'Mixed naming conventions detected (camelCase and snake_case)',
            suggestion: 'Use consistent naming convention throughout the file',
          });
        }
        return issues;
      },
    });

    // Architecture Rules
    this.addRule({
      name: 'circular-dependencies',
      description: 'Detect potential circular dependencies',
      category: 'architecture',
      check: async (context) => {
        const issues: AuditIssue[] = [];
        
        // Simple check for imports that might create circles
        const imports = context.content.match(/import.*from\s+['"]([^'"]+)['"]/g) || [];
        const fileName = path.basename(context.filePath, '.ts');
        
        for (const imp of imports) {
          const importPath = imp.match(/from\s+['"]([^'"]+)['"]/)?.[1];
          if (importPath && importPath.includes(fileName)) {
            issues.push({
              severity: 'high',
              category: 'architecture',
              file: context.filePath,
              message: `Potential circular dependency detected: ${imp}`,
              suggestion: 'Refactor to eliminate circular dependencies',
            });
          }
        }
        return issues;
      },
    });
  }

  /**
   * Register specialized rule sets
   */
  private async registerSpecializedRules(): Promise<void> {
    try {
      // Dynamically import rule sets to avoid circular dependencies
      const { toolAuditRules } = await import('./rules/tool-audit-rules');
      const { serverAuditRules } = await import('./rules/server-audit-rules');
      const { securityAuditRules } = await import('./rules/security-audit-rules');
      const { performanceAuditRules } = await import('./rules/performance-audit-rules');
      const { apiComplianceRules } = await import('./rules/api-compliance-rules');
      
      // Register all rules
      toolAuditRules.forEach(rule => this.addRule(rule));
      serverAuditRules.forEach(rule => this.addRule(rule));
      securityAuditRules.forEach(rule => this.addRule(rule));
      performanceAuditRules.forEach(rule => this.addRule(rule));
      apiComplianceRules.forEach(rule => this.addRule(rule));
      
      logger.info(`Registered ${this.rules.length} audit rules`);
    } catch (error) {
      logger.error('Failed to load specialized audit rules:', error);
    }
  }

  /**
   * Add a custom audit rule
   */
  public addRule(rule: AuditRule): void {
    this.rules.push(rule);
  }

  /**
   * Run audit on a single file
   */
  private async auditFile(filePath: string): Promise<AuditIssue[]> {
    const content = await fs.readFile(filePath, 'utf-8');
    const context: AuditContext = {
      filePath: path.relative(this.projectRoot, filePath),
      content,
      projectRoot: this.projectRoot,
    };

    const fileIssues: AuditIssue[] = [];
    
    for (const rule of this.rules) {
      try {
        const issues = await rule.check(context);
        fileIssues.push(...issues);
      } catch (error) {
        logger.error(`Error running rule ${rule.name} on ${filePath}:`, error);
      }
    }

    return fileIssues;
  }

  /**
   * Run comprehensive audit on the entire project
   */
  public async runAudit(patterns: string[] = ['src/**/*.ts']): Promise<AuditReport> {
    this.issues = [];
    const startTime = Date.now();

    logger.info('Starting comprehensive audit...');

    // Find all files to audit
    const files: string[] = [];
    const { globSync } = await import('glob');
    
    for (const pattern of patterns) {
      const matchedFiles = globSync(pattern, {
        cwd: this.projectRoot,
        absolute: true,
        ignore: ['**/node_modules/**', '**/dist/**', '**/*.test.ts', '**/*.spec.ts'],
      });
      files.push(...matchedFiles);
    }

    logger.info(`Found ${files.length} files to audit`);

    // Audit each file
    for (const file of files) {
      const fileIssues = await this.auditFile(file);
      this.issues.push(...fileIssues);
    }

    // Generate report
    const report = this.generateReport();
    
    const duration = Date.now() - startTime;
    logger.info(`Audit completed in ${duration}ms. Found ${this.issues.length} issues.`);

    return report;
  }

  /**
   * Generate audit report
   */
  private generateReport(): AuditReport {
    const issuesByCategory: Record<string, number> = {};
    const issuesBySeverity: Record<string, number> = {};

    for (const issue of this.issues) {
      issuesByCategory[issue.category] = (issuesByCategory[issue.category] || 0) + 1;
      issuesBySeverity[issue.severity] = (issuesBySeverity[issue.severity] || 0) + 1;
    }

    const criticalIssues = this.issues.filter(i => i.severity === 'critical').length;

    const recommendations = this.generateRecommendations();

    return {
      timestamp: new Date(),
      totalIssues: this.issues.length,
      criticalIssues,
      issuesByCategory,
      issuesBySeverity,
      issues: this.issues,
      summary: this.generateSummary(),
      recommendations,
    };
  }

  /**
   * Generate summary of findings
   */
  private generateSummary(): string {
    const critical = this.issues.filter(i => i.severity === 'critical').length;
    const high = this.issues.filter(i => i.severity === 'high').length;
    const security = this.issues.filter(i => i.category === 'security').length;
    
    return `Audit found ${this.issues.length} total issues: ${critical} critical, ${high} high priority. ` +
           `${security} security issues require immediate attention. ` +
           `Most common categories: ${this.getTopCategories().join(', ')}.`;
  }

  /**
   * Get top issue categories
   */
  private getTopCategories(): string[] {
    const categoryCounts: Record<string, number> = {};
    for (const issue of this.issues) {
      categoryCounts[issue.category] = (categoryCounts[issue.category] || 0) + 1;
    }
    
    return Object.entries(categoryCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([cat]) => cat);
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    
    if (this.issues.some(i => i.category === 'security' && i.severity === 'critical')) {
      recommendations.push('URGENT: Address critical security issues immediately');
    }
    
    if (this.issues.filter(i => i.message.includes('customer')).length > 5) {
      recommendations.push('Implement centralized customer validation middleware');
    }
    
    if (this.issues.filter(i => i.category === 'performance').length > 10) {
      recommendations.push('Conduct performance profiling and implement caching strategy');
    }
    
    if (this.issues.filter(i => i.message.includes('any type')).length > 20) {
      recommendations.push('Organize a TypeScript type safety sprint');
    }
    
    if (this.issues.filter(i => i.category === 'api-compliance').length > 5) {
      recommendations.push('Review and update API error handling to match Akamai standards');
    }

    recommendations.push('Run this audit regularly (e.g., in CI/CD pipeline)');
    
    return recommendations;
  }

  /**
   * Export report to file
   */
  public async exportReport(report: AuditReport, outputPath: string): Promise<void> {
    await fs.writeFile(outputPath, JSON.stringify(report, null, 2));
    logger.info(`Audit report exported to ${outputPath}`);
  }

  /**
   * Generate human-readable report
   */
  public async generateMarkdownReport(report: AuditReport, outputPath: string): Promise<void> {
    let markdown = `# ALECS MCP Server Audit Report\n\n`;
    markdown += `Generated: ${report.timestamp.toISOString()}\n\n`;
    markdown += `## Summary\n\n${report.summary}\n\n`;
    
    markdown += `## Statistics\n\n`;
    markdown += `- Total Issues: ${report.totalIssues}\n`;
    markdown += `- Critical Issues: ${report.criticalIssues}\n\n`;
    
    markdown += `### Issues by Severity\n\n`;
    for (const [severity, count] of Object.entries(report.issuesBySeverity)) {
      markdown += `- ${severity}: ${count}\n`;
    }
    
    markdown += `\n### Issues by Category\n\n`;
    for (const [category, count] of Object.entries(report.issuesByCategory)) {
      markdown += `- ${category}: ${count}\n`;
    }
    
    markdown += `\n## Recommendations\n\n`;
    for (const rec of report.recommendations) {
      markdown += `- ${rec}\n`;
    }
    
    markdown += `\n## Critical Issues\n\n`;
    const criticalIssues = report.issues.filter(i => i.severity === 'critical');
    for (const issue of criticalIssues) {
      markdown += `### ${issue.file}:${issue.line || '?'}\n`;
      markdown += `- **${issue.message}**\n`;
      if (issue.suggestion) {
        markdown += `- Suggestion: ${issue.suggestion}\n`;
      }
      if (issue.codeSnippet) {
        markdown += `- Code: \`${issue.codeSnippet}\`\n`;
      }
      markdown += `\n`;
    }
    
    await fs.writeFile(outputPath, markdown);
    logger.info(`Markdown report generated at ${outputPath}`);
  }
}

// Export for CLI usage
export async function runAudit(projectRoot: string, outputDir: string): Promise<void> {
  const auditor = new AuditFramework(projectRoot);
  await auditor.initialize();
  const report = await auditor.runAudit();
  
  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const jsonPath = path.join(outputDir, `audit-report-${timestamp}.json`);
  const mdPath = path.join(outputDir, `audit-report-${timestamp}.md`);
  
  await auditor.exportReport(report, jsonPath);
  await auditor.generateMarkdownReport(report, mdPath);
  
  // Print summary to console
  console.log('\n=== AUDIT SUMMARY ===');
  console.log(report.summary);
  console.log('\nTop Recommendations:');
  report.recommendations.slice(0, 3).forEach(rec => {
    console.log(`- ${rec}`);
  });
  console.log(`\nFull report: ${mdPath}`);
}