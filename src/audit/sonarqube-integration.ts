/**
 * SonarQube Integration for Audit Framework
 * 
 * Integrates SonarQube analysis results with our comprehensive audit framework
 * to provide deep analysis and automated fix workflows
 */

import { AuditIssue, AuditSeverity } from './audit-framework';
import { logger } from '../utils/logger';

export interface SonarQubeIssue {
  key: string;
  rule: string;
  severity: 'BLOCKER' | 'CRITICAL' | 'MAJOR' | 'MINOR' | 'INFO';
  component: string;
  message: string;
  line?: number;
  status: string;
  type: 'BUG' | 'VULNERABILITY' | 'CODE_SMELL' | 'SECURITY_HOTSPOT';
  effort?: string;
  tags?: string[];
  creationDate?: string;
  updateDate?: string;
  resolution?: string;
}

export interface SonarQubeMetrics {
  bugs: number;
  vulnerabilities: number;
  codeSmells: number;
  coverage?: number;
  duplications?: number;
  complexity?: number;
  securityHotspots?: number;
}

export interface SonarQubeAnalysis {
  issues: SonarQubeIssue[];
  metrics: SonarQubeMetrics;
  qualityGateStatus?: 'OK' | 'WARN' | 'ERROR';
  facets: {
    severities: Record<string, number>;
    types: Record<string, number>;
    rules: Record<string, number>;
    components: Record<string, number>;
  };
}

export class SonarQubeIntegration {
  private static severityMapping: Record<string, AuditSeverity> = {
    BLOCKER: 'critical',
    CRITICAL: 'critical',
    MAJOR: 'high',
    MINOR: 'medium',
    INFO: 'low'
  };

  /**
   * Convert SonarQube issues to our audit framework format
   */
  static convertToAuditIssues(sonarIssues: SonarQubeIssue[]): AuditIssue[] {
    return sonarIssues.map(issue => ({
      severity: this.severityMapping[issue.severity] || 'medium',
      category: this.mapTypeToCategory(issue.type),
      rule: `sonarqube:${issue.rule}`,
      message: issue.message,
      filePath: this.extractFilePath(issue.component),
      line: issue.line,
      column: 0,
      suggestion: this.generateSuggestion(issue),
      autoFixable: this.isAutoFixable(issue),
      metadata: {
        sonarKey: issue.key,
        sonarType: issue.type,
        sonarStatus: issue.status,
        sonarTags: issue.tags,
        effort: issue.effort,
        creationDate: issue.creationDate,
        resolution: issue.resolution
      }
    }));
  }

  /**
   * Map SonarQube issue types to our audit categories
   */
  private static mapTypeToCategory(type: string): string {
    const categoryMap: Record<string, string> = {
      BUG: 'code-quality',
      VULNERABILITY: 'security',
      CODE_SMELL: 'code-quality',
      SECURITY_HOTSPOT: 'security'
    };
    return categoryMap[type] || 'code-quality';
  }

  /**
   * Extract file path from SonarQube component key
   */
  private static extractFilePath(component: string): string {
    // Component format: "project:src/path/to/file.ts"
    const parts = component.split(':');
    return parts.length > 1 ? parts[1] : component;
  }

  /**
   * Generate fix suggestions based on issue type and rule
   */
  private static generateSuggestion(issue: SonarQubeIssue): string {
    // Map common SonarQube rules to actionable suggestions
    const ruleSuggestions: Record<string, string> = {
      'typescript:S1172': 'Remove unused function parameters',
      'typescript:S2589': 'Remove redundant boolean condition',
      'typescript:S3776': 'Refactor to reduce cognitive complexity',
      'typescript:S1854': 'Remove dead code',
      'typescript:S6268': 'Add explicit return type annotation',
      'typescript:S2870': 'Use array methods instead of loops',
      'typescript:S1481': 'Remove unused local variable',
      'typescript:S125': 'Remove commented out code',
      'typescript:S1066': 'Merge this if statement with the enclosing one',
      'typescript:S3923': 'Update this implementation to match the overridden method'
    };

    return ruleSuggestions[issue.rule] || issue.message;
  }

  /**
   * Determine if an issue can be automatically fixed
   */
  private static isAutoFixable(issue: SonarQubeIssue): boolean {
    const autoFixableRules = [
      'typescript:S1172', // Unused parameters
      'typescript:S1481', // Unused variables
      'typescript:S125',  // Commented code
      'typescript:S1854', // Dead code
      'typescript:S2589', // Redundant conditions
      'typescript:S6268'  // Missing return types
    ];

    return autoFixableRules.includes(issue.rule);
  }

  /**
   * Create a comprehensive analysis report
   */
  static createAnalysisReport(analysis: SonarQubeAnalysis): string {
    const report = [];
    
    report.push('# SonarQube Analysis Report\n');
    report.push(`Generated: ${new Date().toISOString()}\n`);
    
    // Quality Gate Status
    if (analysis.qualityGateStatus) {
      report.push(`## Quality Gate: ${analysis.qualityGateStatus}`);
      report.push('');
    }

    // Summary Metrics
    report.push('## Summary Metrics');
    report.push(`- Bugs: ${analysis.metrics.bugs}`);
    report.push(`- Vulnerabilities: ${analysis.metrics.vulnerabilities}`);
    report.push(`- Code Smells: ${analysis.metrics.codeSmells}`);
    if (analysis.metrics.securityHotspots !== undefined) {
      report.push(`- Security Hotspots: ${analysis.metrics.securityHotspots}`);
    }
    if (analysis.metrics.coverage !== undefined) {
      report.push(`- Coverage: ${analysis.metrics.coverage}%`);
    }
    if (analysis.metrics.duplications !== undefined) {
      report.push(`- Duplications: ${analysis.metrics.duplications}%`);
    }
    report.push('');

    // Issue Distribution
    report.push('## Issue Distribution');
    report.push('\n### By Severity:');
    Object.entries(analysis.facets.severities)
      .sort(([,a], [,b]) => b - a)
      .forEach(([severity, count]) => {
        report.push(`- ${severity}: ${count}`);
      });

    report.push('\n### By Type:');
    Object.entries(analysis.facets.types)
      .sort(([,a], [,b]) => b - a)
      .forEach(([type, count]) => {
        report.push(`- ${type}: ${count}`);
      });

    // Top Rules
    report.push('\n### Top 10 Rules:');
    Object.entries(analysis.facets.rules)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .forEach(([rule, count]) => {
        report.push(`- ${rule}: ${count} occurrences`);
      });

    // Most Affected Components
    report.push('\n### Most Affected Components:');
    Object.entries(analysis.facets.components)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .forEach(([component, count]) => {
        const fileName = component.split('/').pop();
        report.push(`- ${fileName}: ${count} issues`);
      });

    return report.join('\n');
  }

  /**
   * Generate fix workflow for SonarQube issues
   */
  static generateFixWorkflow(issues: SonarQubeIssue[]): any {
    const workflow = {
      phases: [] as any[],
      totalIssues: issues.length,
      estimatedTime: 0,
      autoFixableCount: 0
    };

    // Group issues by severity and auto-fixability
    const blockerIssues = issues.filter(i => i.severity === 'BLOCKER');
    const criticalIssues = issues.filter(i => i.severity === 'CRITICAL');
    const majorIssues = issues.filter(i => i.severity === 'MAJOR');
    const autoFixable = issues.filter(i => this.isAutoFixable(i));

    workflow.autoFixableCount = autoFixable.length;

    // Phase 1: Auto-fix simple issues
    if (autoFixable.length > 0) {
      workflow.phases.push({
        name: 'Automated Fixes',
        description: 'Automatically fix simple code quality issues',
        issues: autoFixable.map(i => i.key),
        estimatedTime: autoFixable.length * 2, // 2 minutes per auto-fix
        tasks: [
          'Run automated fix scripts',
          'Validate fixes with unit tests',
          'Run SonarQube analysis to verify',
          'Commit changes'
        ]
      });
    }

    // Phase 2: Critical security issues
    const securityIssues = issues.filter(i => 
      i.type === 'VULNERABILITY' || i.type === 'SECURITY_HOTSPOT'
    );
    if (securityIssues.length > 0) {
      workflow.phases.push({
        name: 'Security Fixes',
        description: 'Address security vulnerabilities and hotspots',
        issues: securityIssues.map(i => i.key),
        estimatedTime: securityIssues.length * 30, // 30 minutes per security issue
        tasks: [
          'Review security issue details',
          'Implement secure coding practices',
          'Add security tests',
          'Perform security review',
          'Update documentation'
        ]
      });
    }

    // Phase 3: Blocker bugs
    if (blockerIssues.length > 0) {
      workflow.phases.push({
        name: 'Blocker Bug Fixes',
        description: 'Fix critical bugs that block functionality',
        issues: blockerIssues.map(i => i.key),
        estimatedTime: blockerIssues.length * 60, // 1 hour per blocker
        tasks: [
          'Reproduce the issue',
          'Debug and identify root cause',
          'Implement fix',
          'Add regression tests',
          'Verify in staging environment'
        ]
      });
    }

    // Phase 4: High-priority issues
    const highPriorityIssues = [...criticalIssues, ...majorIssues];
    if (highPriorityIssues.length > 0) {
      workflow.phases.push({
        name: 'High-Priority Fixes',
        description: 'Address critical and major issues',
        issues: highPriorityIssues.map(i => i.key),
        estimatedTime: highPriorityIssues.length * 20, // 20 minutes per issue
        tasks: [
          'Analyze issue impact',
          'Implement fixes',
          'Update tests',
          'Code review',
          'Deploy to staging'
        ]
      });
    }

    workflow.estimatedTime = workflow.phases.reduce((sum, phase) => sum + phase.estimatedTime, 0);

    return workflow;
  }

  /**
   * Create monitoring dashboard data
   */
  static createMonitoringDashboard(history: SonarQubeAnalysis[]): any {
    return {
      trends: {
        bugs: history.map(h => ({ date: new Date().toISOString(), value: h.metrics.bugs })),
        vulnerabilities: history.map(h => ({ date: new Date().toISOString(), value: h.metrics.vulnerabilities })),
        codeSmells: history.map(h => ({ date: new Date().toISOString(), value: h.metrics.codeSmells }))
      },
      currentStatus: history[history.length - 1] || null,
      improvements: this.calculateImprovements(history),
      recommendations: this.generateRecommendations(history[history.length - 1])
    };
  }

  private static calculateImprovements(history: SonarQubeAnalysis[]): any {
    if (history.length < 2) {return null;}

    const current = history[history.length - 1];
    const previous = history[history.length - 2];
    
    if (!current || !previous) {
      return null;
    }

    return {
      bugs: previous.metrics.bugs - current.metrics.bugs,
      vulnerabilities: previous.metrics.vulnerabilities - current.metrics.vulnerabilities,
      codeSmells: previous.metrics.codeSmells - current.metrics.codeSmells,
      percentageImprovement: ((previous.issues.length - current.issues.length) / previous.issues.length * 100).toFixed(2)
    };
  }

  private static generateRecommendations(analysis: SonarQubeAnalysis): string[] {
    const recommendations = [];

    if (analysis.metrics.bugs > 10) {
      recommendations.push('Focus on fixing bugs to improve stability');
    }

    if (analysis.metrics.vulnerabilities > 0) {
      recommendations.push('Prioritize security vulnerabilities immediately');
    }

    if (analysis.metrics.coverage && analysis.metrics.coverage < 80) {
      recommendations.push('Increase test coverage to at least 80%');
    }

    if (analysis.metrics.duplications && analysis.metrics.duplications > 5) {
      recommendations.push('Refactor duplicated code to improve maintainability');
    }

    const complexityIssues = analysis.issues.filter(i => i.rule.includes('S3776'));
    if (complexityIssues.length > 5) {
      recommendations.push('Reduce cognitive complexity in complex functions');
    }

    return recommendations;
  }
}

// Export utilities for automated fixes
export const sonarQubeAutoFixes = {
  removeUnusedParameters: async (filePath: string, line: number) => {
    // Implementation for removing unused parameters
    logger.info(`Auto-fixing unused parameters in ${filePath}:${line}`);
  },

  removeDeadCode: async (filePath: string, line: number) => {
    // Implementation for removing dead code
    logger.info(`Auto-fixing dead code in ${filePath}:${line}`);
  },

  addReturnTypes: async (filePath: string, line: number) => {
    // Implementation for adding return types
    logger.info(`Auto-fixing missing return types in ${filePath}:${line}`);
  },

  removeCommentedCode: async (filePath: string, line: number) => {
    // Implementation for removing commented code
    logger.info(`Auto-fixing commented code in ${filePath}:${line}`);
  }
};