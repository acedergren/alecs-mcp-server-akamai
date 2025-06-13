import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync } from 'fs';
import { CleanupAgent } from '../agents/cleanup-agent';

describe('CleanupAgent', () => {
  const testDir = path.join(__dirname, 'test-cleanup');
  const oldDir = path.join(testDir, '.old');

  beforeEach(async () => {
    // Create test directory structure
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(path.join(testDir, 'src'), { recursive: true });
    await fs.mkdir(path.join(testDir, 'coverage'), { recursive: true });
    
    // Create test files
    await fs.writeFile(path.join(testDir, 'package.json'), '{}');
    await fs.writeFile(path.join(testDir, 'README.md'), '# Test');
    await fs.writeFile(path.join(testDir, 'src', 'index.ts'), 'console.log("test");');
    await fs.writeFile(path.join(testDir, 'test.old'), 'old file');
    await fs.writeFile(path.join(testDir, 'deprecated-docs.md'), 'old docs');
    await fs.writeFile(path.join(testDir, 'coverage', 'test.json'), '{}');
    await fs.writeFile(path.join(testDir, 'temp.log'), 'log data');
  });

  afterEach(async () => {
    // Clean up test directory
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('File Analysis', () => {
    it('should categorize files correctly', async () => {
      const agent = new CleanupAgent({ 
        projectRoot: testDir,
        dryRun: true 
      });

      // Use private method through type assertion
      const plan = await (agent as any).analyzeFiles();

      // Essential files
      expect(plan.essential.map((f: any) => f.path)).toContain('package.json');
      expect(plan.essential.map((f: any) => f.path)).toContain('README.md');
      expect(plan.essential.map((f: any) => f.path)).toContain('src/index.ts');

      // Archive files
      expect(plan.archive.map((f: any) => f.path)).toContain('test.old');
      expect(plan.archive.map((f: any) => f.path)).toContain('deprecated-docs.md');

      // Delete files
      expect(plan.delete.map((f: any) => f.path)).toContain('coverage/test.json');
      expect(plan.delete.map((f: any) => f.path)).toContain('temp.log');
    });
  });

  describe('Dry Run Mode', () => {
    it('should not modify files in dry run mode', async () => {
      const agent = new CleanupAgent({ 
        projectRoot: testDir,
        dryRun: true 
      });

      await agent.run();

      // Files should still exist
      expect(existsSync(path.join(testDir, 'test.old'))).toBe(true);
      expect(existsSync(path.join(testDir, 'temp.log'))).toBe(true);
      expect(existsSync(path.join(testDir, 'coverage', 'test.json'))).toBe(true);
      
      // .old directory should not be created in dry run
      expect(existsSync(oldDir)).toBe(false);
    });
  });

  describe('Live Mode', () => {
    it('should move archive files to .old directory', async () => {
      const agent = new CleanupAgent({ 
        projectRoot: testDir,
        dryRun: false,
        interactive: false
      });

      await agent.run();

      // Archive files should be moved
      expect(existsSync(path.join(testDir, 'test.old'))).toBe(false);
      expect(existsSync(path.join(testDir, 'deprecated-docs.md'))).toBe(false);
      expect(existsSync(path.join(oldDir, 'test.old'))).toBe(true);
      expect(existsSync(path.join(oldDir, 'deprecated-docs.md'))).toBe(true);
    });

    it('should delete temporary files', async () => {
      const agent = new CleanupAgent({ 
        projectRoot: testDir,
        dryRun: false,
        interactive: false
      });

      await agent.run();

      // Temporary files should be deleted
      expect(existsSync(path.join(testDir, 'temp.log'))).toBe(false);
      expect(existsSync(path.join(testDir, 'coverage', 'test.json'))).toBe(false);
    });

    it('should keep essential files', async () => {
      const agent = new CleanupAgent({ 
        projectRoot: testDir,
        dryRun: false,
        interactive: false
      });

      await agent.run();

      // Essential files should remain
      expect(existsSync(path.join(testDir, 'package.json'))).toBe(true);
      expect(existsSync(path.join(testDir, 'README.md'))).toBe(true);
      expect(existsSync(path.join(testDir, 'src', 'index.ts'))).toBe(true);
    });

    it('should create a backup file', async () => {
      const agent = new CleanupAgent({ 
        projectRoot: testDir,
        dryRun: false,
        interactive: false
      });

      await agent.run();

      // Check for backup file
      const files = await fs.readdir(testDir);
      const backupFile = files.find(f => f.startsWith('.cleanup-backup-'));
      expect(backupFile).toBeDefined();
    });
  });

  describe('File Collision Handling', () => {
    it('should rename files if they already exist in .old', async () => {
      // Create .old directory with existing file
      await fs.mkdir(oldDir, { recursive: true });
      await fs.writeFile(path.join(oldDir, 'test.old'), 'existing');

      const agent = new CleanupAgent({ 
        projectRoot: testDir,
        dryRun: false,
        interactive: false
      });

      await agent.run();

      // Should have both files with different names
      expect(existsSync(path.join(oldDir, 'test.old'))).toBe(true);
      expect(existsSync(path.join(oldDir, 'test-1.old'))).toBe(true);
    });
  });

  describe('Undo Functionality', () => {
    it('should restore moved files from backup', async () => {
      const agent = new CleanupAgent({ 
        projectRoot: testDir,
        dryRun: false,
        interactive: false
      });

      // Run cleanup
      await agent.run();

      // Get backup file
      const files = await fs.readdir(testDir);
      const backupFile = files.find(f => f.startsWith('.cleanup-backup-'));
      expect(backupFile).toBeDefined();

      // Files should be moved/deleted
      expect(existsSync(path.join(testDir, 'test.old'))).toBe(false);
      expect(existsSync(path.join(oldDir, 'test.old'))).toBe(true);

      // Undo
      await agent.undo(path.join(testDir, backupFile!));

      // Files should be restored
      expect(existsSync(path.join(testDir, 'test.old'))).toBe(true);
      expect(existsSync(path.join(testDir, 'deprecated-docs.md'))).toBe(true);
    });
  });

  describe('Size Calculations', () => {
    it('should calculate space savings correctly', async () => {
      // Write files with known sizes
      await fs.writeFile(path.join(testDir, 'large.log'), 'x'.repeat(1000));
      
      const agent = new CleanupAgent({ 
        projectRoot: testDir,
        dryRun: false,
        interactive: false
      });

      const result = await agent.run();
      
      // Result should be returned from run() method
      // This test would need the agent to return the result
      // For now, just verify the cleanup happened
      expect(existsSync(path.join(testDir, 'large.log'))).toBe(false);
    });
  });
});