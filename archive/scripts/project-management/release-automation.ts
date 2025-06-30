#!/usr/bin/env tsx
/**
 * ALECS Release Automation
 * 
 * Automates the release process including:
 * - Version bumping
 * - Changelog generation
 * - PR creation
 * - Release notes
 */

import { AlecsProjectManager } from './alecs-project-manager.js';
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface ChangelogEntry {
  type: 'feat' | 'fix' | 'docs' | 'style' | 'refactor' | 'perf' | 'test' | 'chore';
  scope?: string;
  subject: string;
  breaking?: boolean;
  commit: string;
}

class ReleaseAutomation {
  private manager: AlecsProjectManager;

  constructor() {
    this.manager = new AlecsProjectManager();
  }

  private parseCommits(fromTag?: string): ChangelogEntry[] {
    const range = fromTag ? `${fromTag}..HEAD` : 'HEAD';
    const log = execSync(
      `git log ${range} --pretty=format:"%H|%s|%b" --no-merges`,
      { encoding: 'utf-8' }
    );

    const entries: ChangelogEntry[] = [];
    const commits = log.split('\n').filter(Boolean);

    for (const commit of commits) {
      const [hash, subject, body] = commit.split('|');
      
      // Parse conventional commit format
      const match = subject.match(/^(\w+)(?:\(([^)]+)\))?: (.+)/);
      if (match) {
        const [, type, scope, description] = match;
        entries.push({
          type: type as any,
          scope,
          subject: description,
          breaking: body?.includes('BREAKING CHANGE'),
          commit: hash.substring(0, 7),
        });
      }
    }

    return entries;
  }

  private groupChanges(entries: ChangelogEntry[]) {
    const groups: Record<string, ChangelogEntry[]> = {
      'Breaking Changes': [],
      'Features': [],
      'Bug Fixes': [],
      'Performance': [],
      'Documentation': [],
      'Other': [],
    };

    for (const entry of entries) {
      if (entry.breaking) {
        groups['Breaking Changes'].push(entry);
      } else {
        switch (entry.type) {
          case 'feat':
            groups['Features'].push(entry);
            break;
          case 'fix':
            groups['Bug Fixes'].push(entry);
            break;
          case 'perf':
            groups['Performance'].push(entry);
            break;
          case 'docs':
            groups['Documentation'].push(entry);
            break;
          default:
            groups['Other'].push(entry);
        }
      }
    }

    return groups;
  }

  generateChangelog(version: string, fromTag?: string): string {
    const entries = this.parseCommits(fromTag);
    const groups = this.groupChanges(entries);
    const date = new Date().toISOString().split('T')[0];

    let changelog = `## [${version}] - ${date}\n\n`;

    for (const [group, changes] of Object.entries(groups)) {
      if (changes.length > 0) {
        changelog += `### ${group}\n\n`;
        for (const change of changes) {
          const scope = change.scope ? `**${change.scope}:** ` : '';
          changelog += `- ${scope}${change.subject} ([${change.commit}])\n`;
        }
        changelog += '\n';
      }
    }

    return changelog;
  }

  updatePackageVersion(version: string) {
    const packagePath = join(process.cwd(), 'package.json');
    const pkg = JSON.parse(readFileSync(packagePath, 'utf-8'));
    pkg.version = version;
    writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n');
    console.log(`✅ Updated package.json version to ${version}`);
  }

  updateChangelogFile(version: string, content: string) {
    const changelogPath = join(process.cwd(), 'CHANGELOG.md');
    let existingChangelog = '';
    
    try {
      existingChangelog = readFileSync(changelogPath, 'utf-8');
    } catch {
      existingChangelog = '# Changelog\n\nAll notable changes to this project will be documented in this file.\n\n';
    }

    // Insert new version after the header
    const lines = existingChangelog.split('\n');
    let insertIndex = lines.findIndex(line => line.startsWith('## ['));
    if (insertIndex === -1) {
      insertIndex = lines.length;
    }

    lines.splice(insertIndex, 0, content);
    writeFileSync(changelogPath, lines.join('\n'));
    console.log('✅ Updated CHANGELOG.md');
  }

  async createReleasePR(version: string, changelog: string) {
    await this.manager.connectToGitHub();

    const branchName = `release-v${version}`;
    
    // Create release branch
    execSync(`git checkout -b ${branchName}`);
    execSync('git add package.json CHANGELOG.md');
    execSync(`git commit -m "chore: Release v${version}"`);
    execSync(`git push -u origin ${branchName}`);

    // Create PR
    const prBody = `## Release v${version}

This PR prepares the release of ALECS MCP Server v${version}.

### Changes in this release:

${changelog}

### Release Checklist:
- [ ] All tests pass
- [ ] Documentation is up to date
- [ ] Version bumped in package.json
- [ ] CHANGELOG.md updated
- [ ] No security vulnerabilities

### Post-merge steps:
1. Create and push tag: \`git tag v${version} && git push origin v${version}\`
2. Publish to NPM: \`npm publish\`
3. Create GitHub release with the changelog
4. Announce release in relevant channels

---
*This PR was automatically created by the release automation script*`;

    await this.manager.createPullRequestForRelease(version);
    await this.manager.close();
    
    console.log(`✅ Created release PR for v${version}`);
  }

  async performRelease(version: string, fromTag?: string) {
    console.log(`🚀 Starting release process for v${version}`);

    // Generate changelog
    const changelog = this.generateChangelog(version, fromTag);
    console.log('📝 Generated changelog');

    // Update files
    this.updatePackageVersion(version);
    this.updateChangelogFile(version, changelog);

    // Create PR
    await this.createReleasePR(version, changelog);

    console.log(`
✅ Release preparation complete!

Next steps:
1. Review and merge the PR
2. After merge, create and push tag: git tag v${version} && git push origin v${version}
3. Publish to NPM: npm publish
4. Create GitHub release
    `);
  }

  validateVersion(version: string): boolean {
    return /^\d+\.\d+\.\d+(-\w+(\.\d+)?)?$/.test(version);
  }

  getLatestTag(): string | undefined {
    try {
      return execSync('git describe --tags --abbrev=0', { encoding: 'utf-8' }).trim();
    } catch {
      return undefined;
    }
  }
}

// CLI Interface
async function main() {
  const command = process.argv[2];
  const automation = new ReleaseAutomation();

  switch (command) {
    case 'release':
      const version = process.argv[3];
      if (!version) {
        console.error('❌ Please provide a version number');
        process.exit(1);
      }
      
      if (!automation.validateVersion(version)) {
        console.error('❌ Invalid version format. Use semver: X.Y.Z[-tag]');
        process.exit(1);
      }

      const fromTag = process.argv[4] || automation.getLatestTag();
      await automation.performRelease(version, fromTag);
      break;

    case 'changelog':
      const changelogVersion = process.argv[3] || 'Unreleased';
      const changelogFrom = process.argv[4] || automation.getLatestTag();
      const changelog = automation.generateChangelog(changelogVersion, changelogFrom);
      console.log(changelog);
      break;

    default:
      console.log(`
ALECS Release Automation

Usage:
  tsx scripts/project-management/release-automation.ts release <version> [from-tag]
  tsx scripts/project-management/release-automation.ts changelog [version] [from-tag]

Examples:
  tsx scripts/project-management/release-automation.ts release 1.2.0
  tsx scripts/project-management/release-automation.ts release 1.2.0 v1.1.0
  tsx scripts/project-management/release-automation.ts changelog
      `);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { ReleaseAutomation };