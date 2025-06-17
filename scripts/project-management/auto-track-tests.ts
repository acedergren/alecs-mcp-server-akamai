#!/usr/bin/env tsx
/**
 * Automatic Test Failure Tracking
 * 
 * This script automatically creates GitHub issues for test failures.
 * It parses Jest output and creates detailed issue reports.
 */

import { AlecsProjectManager } from './alecs-project-manager.js';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface TestFailure {
  suite: string;
  test: string;
  error: string;
  file?: string;
  line?: number;
}

class TestFailureTracker {
  private manager: AlecsProjectManager;
  private processedFailures: Set<string>;

  constructor() {
    this.manager = new AlecsProjectManager();
    this.processedFailures = this.loadProcessedFailures();
  }

  private loadProcessedFailures(): Set<string> {
    try {
      const data = readFileSync('.test-failure-cache.json', 'utf-8');
      return new Set(JSON.parse(data));
    } catch {
      return new Set();
    }
  }

  private saveProcessedFailures() {
    writeFileSync(
      '.test-failure-cache.json',
      JSON.stringify(Array.from(this.processedFailures))
    );
  }

  private getFailureKey(failure: TestFailure): string {
    return `${failure.suite}::${failure.test}`;
  }

  parseJestOutput(output: string): TestFailure[] {
    const failures: TestFailure[] = [];
    const lines = output.split('\n');
    
    let currentSuite = '';
    let currentTest = '';
    let collectingError = false;
    let errorLines: string[] = [];

    for (const line of lines) {
      // Parse test suite
      if (line.includes('● ')) {
        if (collectingError && currentTest) {
          failures.push({
            suite: currentSuite,
            test: currentTest,
            error: errorLines.join('\n'),
          });
          errorLines = [];
        }
        
        const parts = line.split('›').map(p => p.trim());
        if (parts.length >= 2) {
          currentSuite = parts[0].replace('● ', '');
          currentTest = parts[parts.length - 1];
          collectingError = true;
        }
      } else if (collectingError && line.trim()) {
        errorLines.push(line);
      }
    }

    // Add last failure if any
    if (collectingError && currentTest && errorLines.length > 0) {
      failures.push({
        suite: currentSuite,
        test: currentTest,
        error: errorLines.join('\n'),
      });
    }

    return failures;
  }

  async trackNewFailures(failures: TestFailure[]) {
    await this.manager.connectToGitHub();

    for (const failure of failures) {
      const key = this.getFailureKey(failure);
      
      if (!this.processedFailures.has(key)) {
        console.log(`📝 Creating issue for: ${failure.suite} › ${failure.test}`);
        
        const title = `Test Failure: ${failure.suite} › ${failure.test}`;
        const body = `## Test Failure Report

**Suite:** ${failure.suite}
**Test:** ${failure.test}
**First Detected:** ${new Date().toISOString()}

### Error Details
\`\`\`
${failure.error}
\`\`\`

### Investigation Steps
1. Run the specific test:
   \`\`\`bash
   npm test -- --testNamePattern="${failure.test}"
   \`\`\`

2. Check recent changes that might have affected this test

3. Review the test implementation for potential issues

### Resolution
- [ ] Identify root cause
- [ ] Fix the issue
- [ ] Verify fix with full test suite
- [ ] Close this issue

---
*This issue was automatically created by the test failure tracker*`;

        try {
          await this.manager.createIssue(title, body, ['test-failure', 'automated', 'bug']);
          this.processedFailures.add(key);
          this.saveProcessedFailures();
        } catch (error) {
          console.error(`❌ Failed to create issue: ${error}`);
        }
      } else {
        console.log(`⏭️  Skipping already tracked: ${failure.suite} › ${failure.test}`);
      }
    }

    await this.manager.close();
  }

  async clearCache() {
    this.processedFailures.clear();
    this.saveProcessedFailures();
    console.log('✅ Cleared test failure cache');
  }
}

// CLI Interface
async function main() {
  const command = process.argv[2];
  const tracker = new TestFailureTracker();

  switch (command) {
    case 'track':
      // Read test output from stdin or file
      const testOutput = process.argv[3] 
        ? readFileSync(process.argv[3], 'utf-8')
        : readFileSync(0, 'utf-8'); // stdin
      
      const failures = tracker.parseJestOutput(testOutput);
      console.log(`Found ${failures.length} test failures`);
      
      if (failures.length > 0) {
        await tracker.trackNewFailures(failures);
      }
      break;

    case 'clear-cache':
      await tracker.clearCache();
      break;

    default:
      console.log(`
Test Failure Tracker

Usage: 
  npm test 2>&1 | tsx scripts/project-management/auto-track-tests.ts track
  tsx scripts/project-management/auto-track-tests.ts track <test-output-file>
  tsx scripts/project-management/auto-track-tests.ts clear-cache

This will automatically create GitHub issues for new test failures.
      `);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { TestFailureTracker };