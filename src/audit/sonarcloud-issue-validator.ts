import { SonarCloudClient, SonarCloudIssue } from '../services/sonarcloud-client';
import { promises as fs } from 'fs';
import * as path from 'path';
import { z } from 'zod';

// Validation result schema
const _ValidationResultSchema = z.object({
  issue: z.object({
    key: z.string(),
    rule: z.string(),
    severity: z.string(),
    type: z.string(),
    message: z.string(),
    component: z.string(),
    line: z.number().optional(),
  }),
  status: z.enum(['STILL_EXISTS', 'FIXED', 'MODIFIED', 'FILE_NOT_FOUND']),
  details: z.object({
    currentContent: z.string().optional(),
    expectedPattern: z.string().optional(),
    suggestion: z.string().optional(),
  }).optional(),
});

export type ValidationResult = z.infer<typeof _ValidationResultSchema>;

export class SonarCloudIssueValidator {
  constructor(
    private client: SonarCloudClient,
    private projectRoot: string
  ) {}

  /**
   * Validate all open issues in a project
   */
  async validateProjectIssues(projectKey: string): Promise<{
    total: number;
    stillExists: number;
    fixed: number;
    modified: number;
    fileNotFound: number;
    results: ValidationResult[];
  }> {
    console.log(`🔍 Fetching issues for project: ${projectKey}`);
    
    // Get all open issues
    const issues = await this.client.getAllIssues(projectKey, {
      statuses: ['OPEN', 'CONFIRMED', 'REOPENED'],
    });

    console.log(`📊 Found ${issues.length} open issues`);

    const results: ValidationResult[] = [];
    const stats = {
      total: issues.length,
      stillExists: 0,
      fixed: 0,
      modified: 0,
      fileNotFound: 0,
    };

    // Validate each issue
    for (const issue of issues) {
      const result = await this.validateIssue(issue);
      results.push(result);

      // Update stats
      switch (result.status) {
        case 'STILL_EXISTS':
          stats.stillExists++;
          break;
        case 'FIXED':
          stats.fixed++;
          break;
        case 'MODIFIED':
          stats.modified++;
          break;
        case 'FILE_NOT_FOUND':
          stats.fileNotFound++;
          break;
      }

      // Log progress every 10 issues
      if (results.length % 10 === 0) {
        console.log(`✓ Validated ${results.length}/${issues.length} issues`);
      }
    }

    return { ...stats, results };
  }

  /**
   * Validate a single issue
   */
  async validateIssue(issue: SonarCloudIssue): Promise<ValidationResult> {
    // Extract file path from component key
    const filePath = this.extractFilePath(issue.component);
    const fullPath = path.join(this.projectRoot, filePath);

    try {
      // Check if file exists
      await fs.access(fullPath);
      
      // Read file content
      const content = await fs.readFile(fullPath, 'utf-8');
      const lines = content.split('\n');

      // Validate based on issue type and rule
      const validation = await this.validateIssueInContent(issue, lines);

      return {
        issue: {
          key: issue.key,
          rule: issue.rule,
          severity: issue.severity,
          type: issue.type,
          message: issue.message,
          component: issue.component,
          line: issue.line,
        },
        status: validation.exists ? 'STILL_EXISTS' : 'FIXED',
        details: validation.details,
      };
    } catch (_error) {
      // File not found
      return {
        issue: {
          key: issue.key,
          rule: issue.rule,
          severity: issue.severity,
          type: issue.type,
          message: issue.message,
          component: issue.component,
          line: issue.line,
        },
        status: 'FILE_NOT_FOUND',
        details: {
          suggestion: 'File has been deleted or moved',
        },
      };
    }
  }

  /**
   * Extract file path from SonarCloud component key
   */
  private extractFilePath(componentKey: string): string {
    // Component key format can be:
    // 1. "organization:project:path/to/file.ts" (old format)
    // 2. "path/to/file.ts" (new format)
    // 3. "organization_project:path/to/file.ts" (hybrid format)
    
    // If it contains a colon, try to extract the path after it
    if (componentKey.includes(':')) {
      const parts = componentKey.split(':');
      const path = parts[parts.length - 1] || componentKey;
      return path;
    }
    
    // Otherwise, assume it's already a path
    return componentKey;
  }

  /**
   * Validate if issue still exists in content
   */
  private async validateIssueInContent(
    issue: SonarCloudIssue,
    lines: string[]
  ): Promise<{ exists: boolean; details?: any }> {
    // Get the specific line if available
    const lineNumber = issue.line ? issue.line - 1 : -1;
    const lineContent = lineNumber >= 0 && lineNumber < lines.length 
      ? lines[lineNumber] 
      : '';

    // Rule-specific validation
    switch (issue.rule) {
      case 'typescript:S6749': // Prefer "const" assertions
        return this.validateConstAssertion(lineContent);
      
      case 'typescript:S1128': // Remove unused imports
        return this.validateUnusedImport(lines, issue.message);
      
      case 'typescript:S125': // Remove commented out code
        return this.validateCommentedCode(lineContent);
      
      case 'typescript:S1186': // Add body to empty function
        return this.validateEmptyFunction(lines, lineNumber);
      
      case 'typescript:S6486': // Replace any type
        return this.validateAnyType(lineContent);
      
      case 'typescript:S1854': // Remove dead code
        return this.validateDeadCode(lines, lineNumber);
      
      case 'typescript:S3358': // Extract nested ternary
        return this.validateNestedTernary(lineContent);
      
      case 'typescript:S2737': // Catch clause should do more
        return this.validateCatchClause(lines, lineNumber);
      
      default:
        // Generic validation - check if line still matches issue pattern
        return {
          exists: true,
          details: {
            currentContent: lineContent,
            suggestion: 'Manual review required for this issue type',
          },
        };
    }
  }

  private validateConstAssertion(line: string | undefined): { exists: boolean; details?: any } {
    if (!line) {return { exists: false };}
    
    const hasAsConst = line.includes('as const');
    const hasReadonlyArray = /\[\s*\]/.test(line) && !hasAsConst;
    
    return {
      exists: hasReadonlyArray,
      details: hasReadonlyArray ? {
        currentContent: line.trim(),
        expectedPattern: 'array literal with "as const"',
        suggestion: 'Add "as const" to the array literal',
      } : undefined,
    };
  }

  private validateUnusedImport(lines: string[], importName: string): { exists: boolean; details?: any } {
    // Extract the imported identifier from the message
    const match = importName.match(/Remove this unused import of ['"](.*?)['"]/);
    const identifier = match ? match[1] : importName;
    
    // Check if import still exists
    const importLine = lines.find(line => 
      line && line.includes(`import`) && line.includes(identifier || '')
    );
    
    if (!importLine) {
      return { exists: false };
    }
    
    // Check if identifier is used in the file
    const contentWithoutImport = lines.filter(line => !line.includes('import')).join('\n');
    const isUsed = new RegExp(`\\b${identifier}\\b`).test(contentWithoutImport);
    
    return {
      exists: !isUsed,
      details: !isUsed ? {
        currentContent: importLine.trim(),
        suggestion: `Remove unused import: ${identifier}`,
      } : undefined,
    };
  }

  private validateCommentedCode(line: string | undefined): { exists: boolean; details?: any } {
    if (!line) {return { exists: false };}
    
    const isCommentedCode = /^\s*\/\/.*[{};]|^\s*\/\*/.test(line);
    
    return {
      exists: isCommentedCode,
      details: isCommentedCode ? {
        currentContent: line.trim(),
        suggestion: 'Remove commented out code',
      } : undefined,
    };
  }

  private validateEmptyFunction(lines: string[], lineNumber: number): { exists: boolean; details?: any } {
    if (lineNumber < 0 || lineNumber >= lines.length) {return { exists: false };}
    
    const line = lines[lineNumber];
    const nextLine = lineNumber + 1 < lines.length ? lines[lineNumber + 1] : '';
    
    // Check for empty function body
    if (!line || typeof line !== 'string') {
      return { exists: false };
    }
    
    const hasEmptyBody = /{\s*}/.test(line) || 
      (line.includes('{') && !!nextLine && nextLine.trim() === '}');
    
    return {
      exists: hasEmptyBody,
      details: hasEmptyBody ? {
        currentContent: line.trim(),
        suggestion: 'Add implementation or comment explaining why empty',
      } : undefined,
    };
  }

  private validateAnyType(line: string | undefined): { exists: boolean; details?: any } {
    if (!line) {return { exists: false };}
    
    const hasAnyType = /:\s*any\b/.test(line);
    
    return {
      exists: hasAnyType,
      details: hasAnyType ? {
        currentContent: line.trim(),
        suggestion: 'Replace "any" with specific type',
      } : undefined,
    };
  }

  private validateDeadCode(lines: string[], lineNumber: number): { exists: boolean; details?: any } {
    if (lineNumber < 0 || lineNumber >= lines.length) {return { exists: false };}
    
    const line = lines[lineNumber];
    if (!line) {return { exists: false };}
    
    // Check for unreachable code patterns
    const prevLine = lineNumber > 0 ? lines[lineNumber - 1] : '';
    const hasReturn = /^\s*return\b/.test(prevLine || '');
    const hasThrow = /^\s*throw\b/.test(prevLine || '');
    const isUnreachable = (hasReturn || hasThrow) && line.trim() !== '';
    
    return {
      exists: isUnreachable,
      details: isUnreachable ? {
        currentContent: line.trim(),
        suggestion: 'Remove unreachable code',
      } : undefined,
    };
  }

  private validateNestedTernary(line: string | undefined): { exists: boolean; details?: any } {
    if (!line) {return { exists: false };}
    
    // Count number of ? in the line (rough check for nested ternary)
    const ternaryCount = (line.match(/\?/g) || []).length;
    const hasNestedTernary = ternaryCount > 1;
    
    return {
      exists: hasNestedTernary,
      details: hasNestedTernary ? {
        currentContent: line.trim(),
        suggestion: 'Extract nested ternary to if-else or separate variables',
      } : undefined,
    };
  }

  private validateCatchClause(lines: string[], lineNumber: number): { exists: boolean; details?: any } {
    if (lineNumber < 0 || lineNumber >= lines.length) {return { exists: false };}
    
    const line = lines[lineNumber];
    if (!line) {return { exists: false };}
    
    const nextLine = lineNumber + 1 < lines.length ? lines[lineNumber + 1] : '';
    
    // Check for empty catch block
    const hasCatch = /catch\s*\(/.test(line);
    const hasEmptyBlock = hasCatch && (
      /{\s*}/.test(line) || 
      (line.includes('{') && (nextLine?.trim() === '}' || false))
    );
    
    return {
      exists: hasEmptyBlock,
      details: hasEmptyBlock ? {
        currentContent: line.trim(),
        suggestion: 'Add error handling or logging in catch block',
      } : undefined,
    };
  }

  /**
   * Generate report from validation results
   */
  generateReport(results: {
    total: number;
    stillExists: number;
    fixed: number;
    modified: number;
    fileNotFound: number;
    results: ValidationResult[];
  }): string {
    const report = [
      '# SonarCloud Issue Validation Report',
      `Generated: ${new Date().toISOString()}`,
      '',
      '## Summary',
      `- Total Issues: ${results.total}`,
      `- Still Exists: ${results.stillExists} (${(results.stillExists / results.total * 100).toFixed(1)}%)`,
      `- Fixed: ${results.fixed} (${(results.fixed / results.total * 100).toFixed(1)}%)`,
      `- File Not Found: ${results.fileNotFound}`,
      '',
      '## Issues to Close',
      '',
    ];

    // List fixed issues
    const fixedIssues = results.results.filter(r => r.status === 'FIXED');
    if (fixedIssues.length > 0) {
      report.push('These issues have been fixed and can be closed:');
      report.push('');
      fixedIssues.forEach(result => {
        report.push(`- **${result.issue.key}** - ${result.issue.message}`);
        report.push(`  - Rule: ${result.issue.rule}`);
        report.push(`  - File: ${result.issue.component}`);
        report.push('');
      });
    }

    // List issues that still exist
    report.push('## Issues Still Present');
    report.push('');
    const existingIssues = results.results.filter(r => r.status === 'STILL_EXISTS');
    if (existingIssues.length > 0) {
      existingIssues.forEach(result => {
        report.push(`### ${result.issue.key}`);
        report.push(`- **Message**: ${result.issue.message}`);
        report.push(`- **Severity**: ${result.issue.severity}`);
        report.push(`- **File**: ${result.issue.component}${result.issue.line ? `:${result.issue.line}` : ''}`);
        if (result.details?.currentContent) {
          report.push(`- **Current Code**: \`${result.details.currentContent}\``);
        }
        if (result.details?.suggestion) {
          report.push(`- **Suggestion**: ${result.details.suggestion}`);
        }
        report.push('');
      });
    }

    return report.join('\n');
  }

  /**
   * Auto-close fixed issues
   */
  async closeFixedIssues(results: ValidationResult[]): Promise<{
    closed: number;
    failed: number;
    errors: Array<{ issueKey: string; error: string }>;
  }> {
    const fixedIssues = results.filter(r => r.status === 'FIXED');
    let closed = 0;
    let failed = 0;
    const errors: Array<{ issueKey: string; error: string }> = [];

    console.log(`🔧 Closing ${fixedIssues.length} fixed issues...`);

    // Close issues in batches
    const batchSize = 10;
    for (let i = 0; i < fixedIssues.length; i += batchSize) {
      const batch = fixedIssues.slice(i, i + batchSize);
      const issueKeys = batch.map(r => r.issue.key);

      try {
        await this.client.bulkUpdateIssueStatus(issueKeys, 'resolve');
        closed += issueKeys.length;
        console.log(`✓ Closed ${closed}/${fixedIssues.length} issues`);
      } catch (error) {
        failed += issueKeys.length;
        errors.push({
          issueKey: issueKeys.join(', '),
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return { closed, failed, errors };
  }
}