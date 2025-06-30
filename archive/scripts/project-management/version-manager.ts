#!/usr/bin/env tsx
/**
 * Version Manager for ALECS
 * 
 * Advanced version management including:
 * - Semantic versioning enforcement
 * - Breaking change detection
 * - Version compatibility matrix
 * - Migration guide generation
 * - Release candidate management
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

interface VersionInfo {
  current: string;
  next: {
    major: string;
    minor: string;
    patch: string;
  };
  history: Array<{
    version: string;
    date: string;
    breaking: boolean;
  }>;
}

interface BreakingChange {
  type: 'api' | 'config' | 'behavior' | 'dependency';
  description: string;
  migration: string;
  affectedFiles: string[];
}

interface CompatibilityMatrix {
  version: string;
  compatible: {
    node: string[];
    akamai: string[];
    dependencies: Record<string, string>;
  };
}

interface ReleaseCandidate {
  version: string;
  branch: string;
  createdAt: Date;
  testsPassed: boolean;
  feedbackReceived: number;
}

class VersionManager {
  private versionHistory: VersionInfo['history'];
  private breakingChanges: Map<string, BreakingChange[]>;

  constructor() {
    this.versionHistory = this.loadVersionHistory();
    this.breakingChanges = new Map();
  }

  private loadVersionHistory(): VersionInfo['history'] {
    const historyFile = '.version-history.json';
    if (existsSync(historyFile)) {
      return JSON.parse(readFileSync(historyFile, 'utf-8'));
    }
    return [];
  }

  private saveVersionHistory() {
    writeFileSync(
      '.version-history.json',
      JSON.stringify(this.versionHistory, null, 2)
    );
  }

  getCurrentVersion(): string {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'));
    return packageJson.version;
  }

  getNextVersions(): VersionInfo['next'] {
    const current = this.getCurrentVersion();
    const [major, minor, patch] = current.split('.').map(Number);

    return {
      major: `${major + 1}.0.0`,
      minor: `${major}.${minor + 1}.0`,
      patch: `${major}.${minor}.${patch + 1}`,
    };
  }

  detectBreakingChanges(fromVersion: string, toVersion: string): BreakingChange[] {
    const changes: BreakingChange[] = [];

    // Analyze git diff for breaking changes
    try {
      const diff = execSync(
        `git diff ${fromVersion}..${toVersion} --name-only`,
        { encoding: 'utf-8' }
      );
      
      const changedFiles = diff.split('\n').filter(Boolean);

      // Check for API changes
      const apiFiles = changedFiles.filter(f => 
        f.includes('src/tools/') || f.includes('src/index.ts')
      );
      
      if (apiFiles.length > 0) {
        // Analyze each API file for breaking changes
        for (const file of apiFiles) {
          const fileDiff = execSync(
            `git diff ${fromVersion}..${toVersion} -- ${file}`,
            { encoding: 'utf-8' }
          );

          // Look for removed functions or changed signatures
          if (fileDiff.includes('- export') || fileDiff.includes('- async')) {
            changes.push({
              type: 'api',
              description: `API changes in ${file}`,
              migration: 'Update function calls to match new signatures',
              affectedFiles: [file],
            });
          }
        }
      }

      // Check for config changes
      const configFiles = changedFiles.filter(f => 
        f.includes('config') || f.endsWith('.json')
      );
      
      if (configFiles.length > 0) {
        changes.push({
          type: 'config',
          description: 'Configuration structure changes',
          migration: 'Update configuration files to new format',
          affectedFiles: configFiles,
        });
      }

      // Check for dependency changes
      if (changedFiles.includes('package.json')) {
        const oldPkg = execSync(
          `git show ${fromVersion}:package.json`,
          { encoding: 'utf-8' }
        );
        const newPkg = readFileSync('package.json', 'utf-8');
        
        const oldDeps = JSON.parse(oldPkg).dependencies || {};
        const newDeps = JSON.parse(newPkg).dependencies || {};
        
        const removedDeps = Object.keys(oldDeps).filter(d => !newDeps[d]);
        const majorUpdates = Object.keys(oldDeps).filter(d => {
          if (!newDeps[d]) return false;
          const oldMajor = oldDeps[d].match(/\d+/)?.[0];
          const newMajor = newDeps[d].match(/\d+/)?.[0];
          return oldMajor !== newMajor;
        });

        if (removedDeps.length > 0 || majorUpdates.length > 0) {
          changes.push({
            type: 'dependency',
            description: `Dependencies changed: ${[...removedDeps, ...majorUpdates].join(', ')}`,
            migration: 'Update dependencies and test thoroughly',
            affectedFiles: ['package.json'],
          });
        }
      }
    } catch (error) {
      console.error('Error detecting breaking changes:', error);
    }

    this.breakingChanges.set(toVersion, changes);
    return changes;
  }

  generateMigrationGuide(fromVersion: string, toVersion: string): string {
    const changes = this.detectBreakingChanges(fromVersion, toVersion);
    
    if (changes.length === 0) {
      return `# Migration Guide: ${fromVersion} → ${toVersion}

No breaking changes detected. You can safely upgrade to ${toVersion}.

\`\`\`bash
npm update alecs-mcp-server
\`\`\``;
    }

    let guide = `# Migration Guide: ${fromVersion} → ${toVersion}

## Breaking Changes

This version includes breaking changes that require action.

`;

    // Group changes by type
    const grouped = changes.reduce((acc, change) => {
      if (!acc[change.type]) acc[change.type] = [];
      acc[change.type].push(change);
      return acc;
    }, {} as Record<string, BreakingChange[]>);

    for (const [type, typeChanges] of Object.entries(grouped)) {
      guide += `### ${type.charAt(0).toUpperCase() + type.slice(1)} Changes\n\n`;
      
      for (const change of typeChanges) {
        guide += `**${change.description}**\n`;
        guide += `- Migration: ${change.migration}\n`;
        guide += `- Affected files: ${change.affectedFiles.join(', ')}\n\n`;
      }
    }

    guide += `## Migration Steps

1. **Backup your configuration**
   \`\`\`bash
   cp .edgerc .edgerc.backup
   \`\`\`

2. **Update the package**
   \`\`\`bash
   npm update alecs-mcp-server@${toVersion}
   \`\`\`

3. **Run migration script** (if available)
   \`\`\`bash
   npx alecs-migrate ${fromVersion} ${toVersion}
   \`\`\`

4. **Test your integration**
   \`\`\`bash
   npm test
   \`\`\`

5. **Update your code**
   Follow the specific migration steps for each breaking change listed above.

## Need Help?

- Check the [CHANGELOG](./CHANGELOG.md) for detailed changes
- Open an issue if you encounter problems
- Join our community chat for migration support`;

    return guide;
  }

  generateCompatibilityMatrix(version: string): CompatibilityMatrix {
    // In real implementation, would analyze package.json and test results
    const matrix: CompatibilityMatrix = {
      version,
      compatible: {
        node: ['16.x', '18.x', '20.x'],
        akamai: ['PAPI v1', 'DNS v2', 'CPS v2'],
        dependencies: {
          '@modelcontextprotocol/sdk': '^0.5.0',
          'typescript': '^5.0.0',
          'axios': '^1.0.0',
        },
      },
    };

    return matrix;
  }

  async createReleaseCandidate(version: string): Promise<ReleaseCandidate> {
    console.log(`🚀 Creating release candidate ${version}`);

    const rcVersion = `${version}-rc.1`;
    const rcBranch = `release/${rcVersion}`;

    // Create RC branch
    execSync(`git checkout -b ${rcBranch}`);
    
    // Update version
    const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));
    pkg.version = rcVersion;
    writeFileSync('package.json', JSON.stringify(pkg, null, 2));
    
    // Commit
    execSync('git add package.json');
    execSync(`git commit -m "chore: Release candidate ${rcVersion}"`);

    const rc: ReleaseCandidate = {
      version: rcVersion,
      branch: rcBranch,
      createdAt: new Date(),
      testsPassed: false,
      feedbackReceived: 0,
    };

    console.log(`✅ Release candidate ${rcVersion} created`);
    console.log(`📋 Next steps:`);
    console.log(`1. Push branch: git push -u origin ${rcBranch}`);
    console.log(`2. Create PR for testing`);
    console.log(`3. Deploy to staging`);
    console.log(`4. Gather feedback`);

    return rc;
  }

  validateSemanticVersion(version: string): {
    valid: boolean;
    reason?: string;
  } {
    const semverRegex = /^\d+\.\d+\.\d+(-[\w.]+)?(\+[\w.]+)?$/;
    
    if (!semverRegex.test(version)) {
      return {
        valid: false,
        reason: 'Version must follow semantic versioning (X.Y.Z)',
      };
    }

    const current = this.getCurrentVersion();
    const [currMajor, currMinor, currPatch] = current.split('.').map(Number);
    const [newMajor, newMinor, newPatch] = version.split('.').map(Number);

    // Validate version increment
    if (newMajor < currMajor || 
        (newMajor === currMajor && newMinor < currMinor) ||
        (newMajor === currMajor && newMinor === currMinor && newPatch <= currPatch)) {
      return {
        valid: false,
        reason: 'Version must be higher than current version',
      };
    }

    // Check for proper increment
    if (newMajor > currMajor && (newMinor !== 0 || newPatch !== 0)) {
      return {
        valid: false,
        reason: 'Major version bumps should reset minor and patch to 0',
      };
    }

    if (newMajor === currMajor && newMinor > currMinor && newPatch !== 0) {
      return {
        valid: false,
        reason: 'Minor version bumps should reset patch to 0',
      };
    }

    return { valid: true };
  }

  generateReleaseNotes(version: string, changes: string[]): string {
    const date = new Date().toISOString().split('T')[0];
    const breakingChanges = this.breakingChanges.get(version) || [];
    
    let notes = `# Release Notes - v${version}

**Release Date**: ${date}

## Highlights

`;

    // Add change highlights
    const features = changes.filter(c => c.startsWith('feat:'));
    const fixes = changes.filter(c => c.startsWith('fix:'));
    const improvements = changes.filter(c => c.startsWith('perf:') || c.startsWith('refactor:'));

    if (features.length > 0) {
      notes += '### 🎉 New Features\n';
      features.forEach(f => notes += `- ${f.replace('feat:', '').trim()}\n`);
      notes += '\n';
    }

    if (fixes.length > 0) {
      notes += '### 🐛 Bug Fixes\n';
      fixes.forEach(f => notes += `- ${f.replace('fix:', '').trim()}\n`);
      notes += '\n';
    }

    if (improvements.length > 0) {
      notes += '### ⚡ Performance Improvements\n';
      improvements.forEach(i => notes += `- ${i.replace(/^(perf|refactor):/, '').trim()}\n`);
      notes += '\n';
    }

    if (breakingChanges.length > 0) {
      notes += `### ⚠️ Breaking Changes\n\n`;
      notes += `This release includes breaking changes. Please review the [Migration Guide](./docs/migration-${version}.md).\n\n`;
    }

    notes += `## Compatibility

- **Node.js**: 16.x, 18.x, 20.x
- **Akamai APIs**: PAPI v1, DNS v2, CPS v2
- **MCP SDK**: ^0.5.0

## Installation

\`\`\`bash
npm install alecs-mcp-server@${version}
\`\`\`

## Acknowledgments

Thanks to all contributors who made this release possible!

---

For the complete list of changes, see the [CHANGELOG](./CHANGELOG.md).`;

    return notes;
  }

  recordRelease(version: string, breaking: boolean = false) {
    this.versionHistory.push({
      version,
      date: new Date().toISOString(),
      breaking,
    });
    this.saveVersionHistory();
  }
}

// CLI Interface
async function main() {
  const command = process.argv[2];
  const manager = new VersionManager();

  switch (command) {
    case 'current':
      const current = manager.getCurrentVersion();
      console.log(`Current version: ${current}`);
      const next = manager.getNextVersions();
      console.log('\nPossible next versions:');
      console.log(`  Major: ${next.major} (breaking changes)`);
      console.log(`  Minor: ${next.minor} (new features)`);
      console.log(`  Patch: ${next.patch} (bug fixes)`);
      break;

    case 'validate':
      const version = process.argv[3];
      if (!version) {
        console.error('❌ Please provide a version to validate');
        process.exit(1);
      }
      
      const validation = manager.validateSemanticVersion(version);
      if (validation.valid) {
        console.log(`✅ Version ${version} is valid`);
      } else {
        console.log(`❌ Invalid version: ${validation.reason}`);
      }
      break;

    case 'breaking-changes':
      const from = process.argv[3] || 'HEAD~1';
      const to = process.argv[4] || 'HEAD';
      
      const changes = manager.detectBreakingChanges(from, to);
      if (changes.length === 0) {
        console.log('✅ No breaking changes detected');
      } else {
        console.log(`⚠️  Found ${changes.length} breaking changes:`);
        changes.forEach(c => {
          console.log(`\n${c.type.toUpperCase()}: ${c.description}`);
          console.log(`Migration: ${c.migration}`);
        });
      }
      break;

    case 'migration-guide':
      const fromVer = process.argv[3];
      const toVer = process.argv[4];
      
      if (!fromVer || !toVer) {
        console.error('❌ Usage: migration-guide <from-version> <to-version>');
        process.exit(1);
      }
      
      const guide = manager.generateMigrationGuide(fromVer, toVer);
      console.log(guide);
      break;

    case 'release-candidate':
      const rcVersion = process.argv[3];
      if (!rcVersion) {
        console.error('❌ Please provide a version for the RC');
        process.exit(1);
      }
      
      await manager.createReleaseCandidate(rcVersion);
      break;

    case 'compatibility':
      const compatVersion = process.argv[3] || manager.getCurrentVersion();
      const matrix = manager.generateCompatibilityMatrix(compatVersion);
      console.log(`\nCompatibility Matrix for v${compatVersion}:`);
      console.log(JSON.stringify(matrix, null, 2));
      break;

    case 'release-notes':
      const notesVersion = process.argv[3];
      if (!notesVersion) {
        console.error('❌ Please provide a version');
        process.exit(1);
      }
      
      // Mock changes for demo
      const mockChanges = [
        'feat: Add support for property cloning',
        'fix: Resolve DNS record validation issue',
        'perf: Optimize API response caching',
      ];
      
      const notes = manager.generateReleaseNotes(notesVersion, mockChanges);
      console.log(notes);
      break;

    default:
      console.log(`
ALECS Version Manager

Usage:
  tsx scripts/project-management/version-manager.ts current
  tsx scripts/project-management/version-manager.ts validate <version>
  tsx scripts/project-management/version-manager.ts breaking-changes [from] [to]
  tsx scripts/project-management/version-manager.ts migration-guide <from> <to>
  tsx scripts/project-management/version-manager.ts release-candidate <version>
  tsx scripts/project-management/version-manager.ts compatibility [version]
  tsx scripts/project-management/version-manager.ts release-notes <version>

Examples:
  tsx scripts/project-management/version-manager.ts current
  tsx scripts/project-management/version-manager.ts validate 2.0.0
  tsx scripts/project-management/version-manager.ts breaking-changes v1.0.0 v2.0.0
  tsx scripts/project-management/version-manager.ts migration-guide 1.0.0 2.0.0
      `);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { VersionManager, BreakingChange, CompatibilityMatrix };