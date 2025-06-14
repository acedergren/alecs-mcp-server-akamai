#!/usr/bin/env tsx

/**
 * Run all MCP server tests
 * Usage: npx tsx tests/run-all-tests.ts
 */

import { spawn } from 'child_process';
import { format, icons } from '../src/utils/progress.js';

interface TestSuite {
  name: string;
  file: string;
  description: string;
}

const testSuites: TestSuite[] = [
  {
    name: 'DNS Functions',
    file: 'tests/test-dns-functions.ts',
    description: 'Tests for EdgeDNS advanced functions'
  },
  {
    name: 'PAPI Workflow',
    file: 'tests/test-papi-workflow.ts',
    description: 'Tests for Property Manager API workflow'
  }
];

async function runTest(suite: TestSuite): Promise<{ success: boolean; output: string }> {
  return new Promise((resolve) => {
    console.log(`\n${icons.rocket} Running ${format.cyan(suite.name)} tests...`);
    console.log(`  ${format.dim(suite.description)}`);
    console.log(format.dim('─'.repeat(60)));
    
    const child = spawn('npx', ['tsx', suite.file], {
      stdio: 'pipe',
      shell: true
    });
    
    let output = '';
    
    child.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      process.stdout.write(text);
    });
    
    child.stderr.on('data', (data) => {
      const text = data.toString();
      output += text;
      process.stderr.write(text);
    });
    
    child.on('close', (code) => {
      resolve({
        success: code === 0,
        output
      });
    });
  });
}

async function main() {
  console.log(`${icons.sparkle} Akamai MCP Server Test Runner`);
  console.log(`${icons.info} Running ${testSuites.length} test suites\n`);
  
  const results: Array<{ suite: TestSuite; success: boolean; output: string }> = [];
  
  for (const suite of testSuites) {
    const result = await runTest(suite);
    results.push({ suite, ...result });
  }
  
  // Print summary
  console.log(`\n${format.bold('═'.repeat(60))}`);
  console.log(`${icons.list} ${format.bold('Test Summary')}`);
  console.log(`${format.bold('═'.repeat(60))}\n`);
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  results.forEach(({ suite, success }) => {
    const status = success 
      ? `${icons.success} ${format.green('PASSED')}` 
      : `${icons.error} ${format.red('FAILED')}`;
    console.log(`${status} ${suite.name}`);
  });
  
  console.log(`\n${icons.info} Total: ${results.length} suites`);
  console.log(`${icons.success} Passed: ${format.green(passed.toString())}`);
  console.log(`${icons.error} Failed: ${format.red(failed.toString())}`);
  
  if (failed > 0) {
    console.log(`\n${icons.error} Some tests failed!`);
    process.exit(1);
  } else {
    console.log(`\n${icons.sparkle} All tests passed!`);
  }
}

main().catch(error => {
  console.error(`${icons.error} Test runner failed:`, error);
  process.exit(1);
});