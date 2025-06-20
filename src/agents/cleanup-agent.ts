#!/usr/bin/env tsx
/**
 * ALECS Cleanup Agent
 *
 * Analyzes and organizes project files by:
 * - Identifying deprecated/old files
 * - Moving old files to .old directory
 * - Removing temporary/build artifacts
 * - Creating cleanup reports
 */

import { existsSync } from 'fs';
import * as fs from 'fs/promises';
import * as path from 'path';
import { stdin as input, stdout as output } from 'process';
import * as readline from 'readline/promises';

import { ProgressBar, Spinner } from '@utils/progress';

interface FileInfo {
  path: string;
  size: number;
  modified: Date;
  category?: FileCategory;
  action?: FileAction;
  reason?: string;
}

enum FileCategory {
  ESSENTIAL = 'essential',
  ARCHIVE = 'archive',
  DELETE = 'delete',
  REVIEW = 'review',
}

enum FileAction {
  KEEP = 'keep',
  MOVE_TO_OLD = 'move_to_old',
  DELETE = 'delete',
  REVIEW = 'review',
}

interface CleanupPlan {
  essential: FileInfo[];
  archive: FileInfo[];
  delete: FileInfo[];
  review: FileInfo[];
  totalSize: number;
  cleanupSize: number;
}

interface CleanupResult {
  moved: string[];
  deleted: string[];
  errors: Array<{ file: string; error: string }>;
  savedSpace: number;
}

class CleanupAgent {
  private projectRoot: string;
  private oldDir: string;
  private dryRun: boolean;
  private interactive: boolean;
  private backupPath: string;
  private rl?: readline.Interface;
  private progressBar?: ProgressBar;
  private spinner?: Spinner;

  // Patterns for different file categories
  private readonly patterns = {
    // Files to always keep
    essential: [
      /^src\//,
      /^package\.json$/,
      /^package-lock\.json$/,
      /^tsconfig\.json$/,
      /^\.gitignore$/,
      /^\.env$/,
      /^\.edgerc$/,
      /^README\.md$/,
      /^CLAUDE\.md$/,
      /^\.mcp\.json$/,
    ],

    // Files to archive
    archive: [
      /^.*\.old$/,
      /^.*\.bak$/,
      /^.*\.backup$/,
      /^old-/,
      /^deprecated-/,
      /^test-.*\.md$/,
      /^TESTING.*\.md$/,
      /^example-.*\.md$/,
      /^.*-example\.md$/,
      /^infrastructure\.md$/,
      /^wishlist$/,
    ],

    // Files to delete
    delete: [
      /^coverage\//,
      /^\.nyc_output\//,
      /^.*\.log$/,
      /^.*\.tmp$/,
      /^.*\.temp$/,
      /^\.DS_Store$/,
      /^npm-debug\.log/,
      /^yarn-error\.log/,
      /^.*~$/,
      /^#.*#$/,
    ],

    // Files that need review
    review: [
      /^dist\//, // Build output - might be needed
      /^.*\.test\.ts\.snap$/, // Jest snapshots
      /^.*\.orig$/, // Git merge artifacts
    ],
  };

  constructor(
    options: {
      projectRoot?: string;
      dryRun?: boolean;
      interactive?: boolean;
    } = {},
  ) {
    this.projectRoot = options.projectRoot || process.cwd();
    this.oldDir = path.join(this.projectRoot, '.old');
    this.dryRun = options.dryRun ?? false;
    this.interactive = options.interactive ?? false;
    this.backupPath = path.join(this.projectRoot, `.cleanup-backup-${Date.now()}.json`);
    // Progress indicators will be created as needed
  }

  async run(): Promise<void> {
    console.log('🧹 ALECS Cleanup Agent');
    console.log('=====================');
    console.log(`Project Root: ${this.projectRoot}`);
    console.log(`Mode: ${this.dryRun ? 'DRY RUN' : 'LIVE'}`);
    console.log(`Interactive: ${this.interactive ? 'YES' : 'NO'}`);
    console.log('');

    try {
      // Step 1: Analyze files
      const plan = await this.analyzeFiles();

      // Step 2: Display cleanup plan
      this.displayPlan(plan);

      // Step 3: Get user confirmation
      if (!this.dryRun && this.interactive) {
        const proceed = await this.confirmPlan();
        if (!proceed) {
          console.log('❌ Cleanup cancelled by user');
          return;
        }
      }

      // Step 4: Execute cleanup
      if (!this.dryRun) {
        const result = await this.executeCleanup(plan);
        this.displayResult(result);

        // Save backup for undo capability
        await this.saveBackup(plan, result);
      }
    } catch (_error) {
      console.error('❌ Cleanup failed:', error);
      throw error;
    } finally {
      if (this.rl) {
        this.rl.close();
      }
    }
  }

  private async analyzeFiles(): Promise<CleanupPlan> {
    this.spinner = new Spinner();
    this.spinner.start('Analyzing files...');

    const files: FileInfo[] = [];
    const plan: CleanupPlan = {
      essential: [],
      archive: [],
      delete: [],
      review: [],
      totalSize: 0,
      cleanupSize: 0,
    };

    // Recursively scan directory
    await this.scanDirectory(this.projectRoot, files);

    // Categorize files
    this.spinner.update(`Categorizing ${files.length} files...`);

    this.progressBar = new ProgressBar({
      total: files.length,
      format: '[:bar] :percent :current/:total files',
    });

    for (const file of files) {
      this.progressBar.increment();

      const category = this.categorizeFile(file);
      file.category = category.category;
      file.action = category.action;
      file.reason = category.reason;

      plan.totalSize += file.size;

      switch (category.category) {
        case FileCategory.ESSENTIAL:
          plan.essential.push(file);
          break;
        case FileCategory.ARCHIVE:
          plan.archive.push(file);
          plan.cleanupSize += file.size;
          break;
        case FileCategory.DELETE:
          plan.delete.push(file);
          plan.cleanupSize += file.size;
          break;
        case FileCategory.REVIEW:
          plan.review.push(file);
          break;
      }
    }

    this.progressBar.finish();
    this.spinner.succeed('Analysis complete');

    return plan;
  }

  private async scanDirectory(dir: string, files: FileInfo[]): Promise<void> {
    // Skip certain directories
    const skipDirs = ['node_modules', '.git', 'dist'];
    const dirName = path.basename(dir);
    if (skipDirs.includes(dirName) && dir !== this.projectRoot) {
      return;
    }

    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(this.projectRoot, fullPath);

      if (entry.isDirectory()) {
        await this.scanDirectory(fullPath, files);
      } else if (entry.isFile()) {
        const stats = await fs.stat(fullPath);
        files.push({
          path: relativePath,
          size: stats.size,
          modified: stats.mtime,
        });
      }
    }
  }

  private categorizeFile(file: FileInfo): {
    category: FileCategory;
    action: FileAction;
    reason: string;
  } {
    const relativePath = file.path;

    // Check essential patterns first
    for (const pattern of this.patterns.essential) {
      if (pattern.test(relativePath)) {
        return {
          category: FileCategory.ESSENTIAL,
          action: FileAction.KEEP,
          reason: 'Essential project file',
        };
      }
    }

    // Check delete patterns
    for (const pattern of this.patterns.delete) {
      if (pattern.test(relativePath)) {
        return {
          category: FileCategory.DELETE,
          action: FileAction.DELETE,
          reason: 'Temporary/build artifact',
        };
      }
    }

    // Check archive patterns
    for (const pattern of this.patterns.archive) {
      if (pattern.test(relativePath)) {
        return {
          category: FileCategory.ARCHIVE,
          action: FileAction.MOVE_TO_OLD,
          reason: 'Old/deprecated file',
        };
      }
    }

    // Check review patterns
    for (const pattern of this.patterns.review) {
      if (pattern.test(relativePath)) {
        return {
          category: FileCategory.REVIEW,
          action: FileAction.REVIEW,
          reason: 'Needs manual review',
        };
      }
    }

    // Check if it's a documentation file that might be old
    if (relativePath.endsWith('.md') && !relativePath.startsWith('src/')) {
      const daysSinceModified = (Date.now() - file.modified.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceModified > 30) {
        return {
          category: FileCategory.REVIEW,
          action: FileAction.REVIEW,
          reason: `Old documentation (${Math.floor(daysSinceModified)} days)`,
        };
      }
    }

    // Default to essential for source files
    if (relativePath.startsWith('src/')) {
      return {
        category: FileCategory.ESSENTIAL,
        action: FileAction.KEEP,
        reason: 'Source code',
      };
    }

    // Everything else needs review
    return {
      category: FileCategory.REVIEW,
      action: FileAction.REVIEW,
      reason: 'Uncategorized file',
    };
  }

  private displayPlan(plan: CleanupPlan): void {
    console.log('\n📋 Cleanup Plan');
    console.log('==============\n');

    // Essential files (summary only)
    console.log(
      `✅ Essential Files: ${plan.essential.length} files (${this.formatSize(
        plan.essential.reduce((sum, f) => sum + f.size, 0),
      )})`,
    );

    // Files to archive
    if (plan.archive.length > 0) {
      console.log(`\n📦 Files to Archive (move to .old): ${plan.archive.length} files`);
      for (const file of plan.archive.slice(0, 10)) {
        console.log(`  - ${file.path} (${this.formatSize(file.size)}) - ${file.reason}`);
      }
      if (plan.archive.length > 10) {
        console.log(`  ... and ${plan.archive.length - 10} more`);
      }
    }

    // Files to delete
    if (plan.delete.length > 0) {
      console.log(`\n🗑️  Files to Delete: ${plan.delete.length} files`);
      for (const file of plan.delete.slice(0, 10)) {
        console.log(`  - ${file.path} (${this.formatSize(file.size)}) - ${file.reason}`);
      }
      if (plan.delete.length > 10) {
        console.log(`  ... and ${plan.delete.length - 10} more`);
      }
    }

    // Files needing review
    if (plan.review.length > 0) {
      console.log(`\n🔍 Files Needing Review: ${plan.review.length} files`);
      for (const file of plan.review.slice(0, 10)) {
        console.log(`  - ${file.path} (${this.formatSize(file.size)}) - ${file.reason}`);
      }
      if (plan.review.length > 10) {
        console.log(`  ... and ${plan.review.length - 10} more`);
      }
    }

    // Summary
    console.log('\n📊 Summary');
    console.log('----------');
    console.log(
      `Total files: ${plan.essential.length + plan.archive.length + plan.delete.length + plan.review.length}`,
    );
    console.log(`Total size: ${this.formatSize(plan.totalSize)}`);
    console.log(`Space to be freed: ${this.formatSize(plan.cleanupSize)}`);
  }

  private async confirmPlan(): Promise<boolean> {
    if (!this.rl) {
      this.rl = readline.createInterface({ input, output });
    }

    const answer = await this.rl.question('\nProceed with cleanup? (y/n): ');
    return answer.toLowerCase() === 'y';
  }

  private async executeCleanup(plan: CleanupPlan): Promise<CleanupResult> {
    const result: CleanupResult = {
      moved: [],
      deleted: [],
      errors: [],
      savedSpace: 0,
    };

    const totalOperations = plan.archive.length + plan.delete.length;
    let completed = 0;

    // Create .old directory if it doesn't exist and we have files to archive
    if (plan.archive.length > 0 && !existsSync(this.oldDir)) {
      await fs.mkdir(this.oldDir, { recursive: true });
    }

    this.progressBar = new ProgressBar({
      total: totalOperations,
      format: '[:bar] :percent :current/:total :message',
    });

    // Move files to .old
    for (const file of plan.archive) {
      try {
        const sourcePath = path.join(this.projectRoot, file.path);
        const destPath = path.join(this.oldDir, path.basename(file.path));

        // Check if file exists in destination
        let finalDestPath = destPath;
        let counter = 1;
        while (existsSync(finalDestPath)) {
          const ext = path.extname(destPath);
          const base = path.basename(destPath, ext);
          finalDestPath = path.join(this.oldDir, `${base}-${counter}${ext}`);
          counter++;
        }

        await fs.rename(sourcePath, finalDestPath);
        result.moved.push(file.path);
        result.savedSpace += file.size;

        completed++;
        this.progressBar.update({
          current: completed,
          message: `Moved ${path.basename(file.path)}`,
        });
      } catch (_error) {
        result.errors.push({
          file: file.path,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Delete files
    for (const file of plan.delete) {
      try {
        const filePath = path.join(this.projectRoot, file.path);
        await fs.unlink(filePath);
        result.deleted.push(file.path);
        result.savedSpace += file.size;

        completed++;
        this.progressBar.update({
          current: completed,
          message: `Deleted ${path.basename(file.path)}`,
        });
      } catch (_error) {
        result.errors.push({
          file: file.path,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    this.progressBar.finish('Cleanup complete');

    return result;
  }

  private displayResult(result: CleanupResult): void {
    console.log('\n✨ Cleanup Results');
    console.log('==================\n');

    if (result.moved.length > 0) {
      console.log(`📦 Moved to .old: ${result.moved.length} files`);
    }

    if (result.deleted.length > 0) {
      console.log(`🗑️  Deleted: ${result.deleted.length} files`);
    }

    if (result.errors.length > 0) {
      console.log(`\n❌ Errors: ${result.errors.length}`);
      for (const error of result.errors) {
        console.log(`  - ${error.file}: ${error.error}`);
      }
    }

    console.log(`\n💾 Space saved: ${this.formatSize(result.savedSpace)}`);
    console.log(`📝 Backup saved to: ${path.basename(this.backupPath)}`);
  }

  private async saveBackup(plan: CleanupPlan, result: CleanupResult): Promise<void> {
    const backup = {
      timestamp: new Date().toISOString(),
      plan,
      result,
      projectRoot: this.projectRoot,
    };

    await fs.writeFile(this.backupPath, JSON.stringify(backup, null, 2));
  }

  async undo(backupFile: string): Promise<void> {
    console.log('🔄 Undoing cleanup...\n');

    try {
      const backupData = await fs.readFile(backupFile, 'utf-8');
      const backup = JSON.parse(backupData);

      // Restore moved files
      for (const file of backup.result.moved) {
        const oldPath = path.join(this.oldDir, path.basename(file));
        const originalPath = path.join(this.projectRoot, file);

        if (existsSync(oldPath)) {
          await fs.rename(oldPath, originalPath);
          console.log(`✅ Restored: ${file}`);
        }
      }

      console.log('\n✅ Undo complete');
      console.log('Note: Deleted files cannot be restored');
    } catch (_error) {
      console.error('❌ Undo failed:', error);
      throw error;
    }
  }

  private formatSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const options = {
    dryRun: args.includes('--dry-run') || args.includes('-d'),
    interactive: args.includes('--interactive') || args.includes('-i'),
    undo: args.find((arg) => arg.startsWith('--undo='))?.split('=')[1],
  };

  const agent = new CleanupAgent({
    dryRun: options.dryRun,
    interactive: options.interactive,
  });

  try {
    if (options.undo) {
      await agent.undo(options.undo);
    } else {
      await agent.run();
    }
  } catch (_error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { CleanupAgent, CleanupPlan, CleanupResult };
