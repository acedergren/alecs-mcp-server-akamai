#!/usr/bin/env node

/**
 * Test Readiness Check
 * Verifies prerequisites for running genuine MCP tests
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { spawn } from 'child_process';

async function checkPrerequisites() {
  console.log('🔍 Checking test prerequisites...\n');
  
  const checks = {
    projectBuilt: false,
    edgercExists: false,
    testingSection: false,
    mcpSdkInstalled: false,
    testFilesExist: false
  };
  
  // Check if project is built
  try {
    await fs.access(path.join(process.cwd(), 'dist', 'index.js'));
    checks.projectBuilt = true;
    console.log('✅ Project is built (dist/index.js exists)');
  } catch {
    console.log('❌ Project not built - run: npm run build');
  }
  
  // Check .edgerc file
  try {
    const edgercPath = path.join(process.env.HOME || '', '.edgerc');
    const content = await fs.readFile(edgercPath, 'utf-8');
    checks.edgercExists = true;
    console.log('✅ .edgerc file exists');
    
    if (content.includes('[testing]')) {
      checks.testingSection = true;
      console.log('✅ .edgerc has [testing] section');
    } else {
      console.log('❌ .edgerc missing [testing] section');
    }
  } catch {
    console.log('❌ .edgerc file not found');
  }
  
  // Check MCP SDK installation
  try {
    await fs.access(path.join(process.cwd(), 'node_modules', '@modelcontextprotocol', 'sdk'));
    checks.mcpSdkInstalled = true;
    console.log('✅ MCP SDK is installed');
  } catch {
    console.log('❌ MCP SDK not installed - run: npm install');
  }
  
  // Check test files exist
  const testFiles = [
    'direct-mcp-test.ts',
    'integration-test-harness.ts',
    'multi-client-concurrent-test.ts',
    'run-all-genuine-tests.ts'
  ];
  
  let allTestFilesExist = true;
  for (const file of testFiles) {
    try {
      await fs.access(path.join(__dirname, file));
    } catch {
      allTestFilesExist = false;
      console.log(`❌ Missing test file: ${file}`);
    }
  }
  
  if (allTestFilesExist) {
    checks.testFilesExist = true;
    console.log('✅ All test files exist');
  }
  
  // Summary
  console.log('\n' + '='.repeat(40));
  const allChecks = Object.values(checks).every(v => v);
  
  if (allChecks) {
    console.log('✅ ALL PREREQUISITES MET - Ready to run tests!');
    console.log('\nRun individual tests:');
    console.log('  npx tsx src/__tests__/comprehensive/direct-mcp-test.ts');
    console.log('  npx tsx src/__tests__/comprehensive/integration-test-harness.ts');
    console.log('  npx tsx src/__tests__/comprehensive/multi-client-concurrent-test.ts');
    console.log('\nOr run all tests:');
    console.log('  npx tsx src/__tests__/comprehensive/run-all-genuine-tests.ts');
  } else {
    console.log('❌ PREREQUISITES NOT MET - Fix issues above');
    console.log('\nQuick fixes:');
    console.log('1. Build project: npm run build');
    console.log('2. Install dependencies: npm install');
    console.log('3. Configure .edgerc with [testing] section');
  }
  
  return allChecks;
}

// Check TypeScript compilation
async function checkTypeScript() {
  console.log('\n🔍 Checking TypeScript compilation...');
  
  return new Promise<boolean>((resolve) => {
    const tsc = spawn('npx', ['tsc', '--noEmit'], {
      cwd: process.cwd()
    });
    
    let stderr = '';
    tsc.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    tsc.on('close', (code) => {
      if (code === 0) {
        console.log('✅ TypeScript compilation successful');
        resolve(true);
      } else {
        console.log('❌ TypeScript compilation errors found');
        console.log('  Run: npx tsc --noEmit to see errors');
        resolve(false);
      }
    });
  });
}

// Main
async function main() {
  console.log('═'.repeat(50));
  console.log('ALECS MCP Server - Test Readiness Check');
  console.log('═'.repeat(50));
  
  const prereqsOk = await checkPrerequisites();
  const tsOk = await checkTypeScript();
  
  console.log('\n' + '═'.repeat(50));
  if (prereqsOk && tsOk) {
    console.log('✅ SYSTEM READY FOR TESTING');
  } else {
    console.log('⚠️  SYSTEM NOT READY - Fix issues above');
  }
  console.log('═'.repeat(50));
  
  process.exit(prereqsOk && tsOk ? 0 : 1);
}

if (require.main === module) {
  main().catch(console.error);
}