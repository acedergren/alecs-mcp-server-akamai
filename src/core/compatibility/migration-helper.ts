/**
 * Migration Helper - Automated code migration for consolidation
 * 
 * This module provides tools to automatically migrate code
 * from old scattered functions to the new consolidated API
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

/**
 * Migration rule definition
 */
interface MigrationRule {
  // What to search for
  search: string | RegExp;
  // What to replace with
  replace: string | ((match: string, ...args: any[]) => string);
  // Optional description
  description?: string;
  // File pattern to apply to
  filePattern?: string;
}

/**
 * Migration result for a file
 */
interface FileMigrationResult {
  filePath: string;
  modified: boolean;
  changes: Array<{
    line: number;
    before: string;
    after: string;
  }>;
  errors?: string[];
}

/**
 * Property consolidation migration rules
 */
export const propertyMigrationRules: MigrationRule[] = [
  // Import migrations
  {
    search: /import\s*{\s*listProperties\s*}\s*from\s*['"]\.\.\/tools\/property-tools['"]/g,
    replace: "import { property } from '../domains/property'",
    description: 'Migrate listProperties import',
  },
  {
    search: /import\s*{\s*getProperty\s*}\s*from\s*['"]\.\.\/tools\/property-tools['"]/g,
    replace: "import { property } from '../domains/property'",
    description: 'Migrate getProperty import',
  },
  {
    search: /import\s*{\s*createPropertyVersion\s*}\s*from\s*['"]\.\.\/tools\/property-manager-tools['"]/g,
    replace: "import { property } from '../domains/property'",
    description: 'Migrate createPropertyVersion import',
  },
  
  // Function call migrations
  {
    search: /\blistProperties\s*\(/g,
    replace: 'property.list(',
    description: 'Migrate listProperties calls',
  },
  {
    search: /\bgetProperty\s*\(/g,
    replace: 'property.get(',
    description: 'Migrate getProperty calls',
  },
  {
    search: /\bcreatePropertyVersion\s*\(/g,
    replace: 'property.version.create(',
    description: 'Migrate createPropertyVersion calls',
  },
];

/**
 * Migration analyzer - checks what would be changed without modifying
 */
export class MigrationAnalyzer {
  async analyzeFile(filePath: string, rules: MigrationRule[]): Promise<FileMigrationResult> {
    const content = await fs.promises.readFile(filePath, 'utf8');
    const lines = content.split('\n');
    const changes: FileMigrationResult['changes'] = [];
    
    for (const rule of rules) {
      if (rule.filePattern && !filePath.match(rule.filePattern)) {
        continue;
      }
      
      lines.forEach((line, index) => {
        if (typeof rule.search === 'string') {
          if (line.includes(rule.search)) {
            const after = line.replace(rule.search, rule.replace as string);
            changes.push({
              line: index + 1,
              before: line,
              after,
            });
          }
        } else {
          const matches = line.match(rule.search);
          if (matches) {
            const after = line.replace(rule.search, rule.replace as any);
            changes.push({
              line: index + 1,
              before: line,
              after,
            });
          }
        }
      });
    }
    
    return {
      filePath,
      modified: changes.length > 0,
      changes,
    };
  }
  
  async analyzeDirectory(dir: string, rules: MigrationRule[]): Promise<FileMigrationResult[]> {
    const files = await glob(`${dir}/**/*.ts`, { ignore: ['**/node_modules/**', '**/*.d.ts'] });
    const results: FileMigrationResult[] = [];
    
    for (const file of files) {
      const result = await this.analyzeFile(file, rules);
      if (result.modified) {
        results.push(result);
      }
    }
    
    return results;
  }
}

/**
 * Safe migration executor
 */
export class MigrationExecutor {
  private dryRun: boolean;
  private backupDir: string;
  
  constructor(options: { dryRun?: boolean; backupDir?: string } = {}) {
    this.dryRun = options.dryRun ?? true;
    this.backupDir = options.backupDir ?? '.migration-backup';
  }
  
  async migrateFile(filePath: string, rules: MigrationRule[]): Promise<FileMigrationResult> {
    const analyzer = new MigrationAnalyzer();
    const analysis = await analyzer.analyzeFile(filePath, rules);
    
    if (!analysis.modified || this.dryRun) {
      return analysis;
    }
    
    // Create backup
    await this.backupFile(filePath);
    
    // Apply changes
    let content = await fs.promises.readFile(filePath, 'utf8');
    
    for (const rule of rules) {
      if (rule.filePattern && !filePath.match(rule.filePattern)) {
        continue;
      }
      
      if (typeof rule.replace === 'function') {
        content = content.replace(rule.search, rule.replace);
      } else {
        content = content.replace(rule.search, rule.replace);
      }
    }
    
    await fs.promises.writeFile(filePath, content, 'utf8');
    
    return analysis;
  }
  
  private async backupFile(filePath: string): Promise<void> {
    const relativePath = path.relative(process.cwd(), filePath);
    const backupPath = path.join(this.backupDir, relativePath);
    
    await fs.promises.mkdir(path.dirname(backupPath), { recursive: true });
    await fs.promises.copyFile(filePath, backupPath);
  }
  
  async generateReport(results: FileMigrationResult[]): Promise<string> {
    const report: string[] = [
      '# Migration Report',
      `Generated: ${new Date().toISOString()}`,
      '',
      `Total files analyzed: ${results.length}`,
      `Files to be modified: ${results.filter(r => r.modified).length}`,
      '',
    ];
    
    for (const result of results) {
      if (result.modified) {
        report.push(`## ${result.filePath}`);
        report.push(`Changes: ${result.changes.length}`);
        report.push('');
        
        for (const change of result.changes) {
          report.push(`Line ${change.line}:`);
          report.push(`- Before: ${change.before.trim()}`);
          report.push(`+ After:  ${change.after.trim()}`);
          report.push('');
        }
      }
    }
    
    return report.join('\n');
  }
}