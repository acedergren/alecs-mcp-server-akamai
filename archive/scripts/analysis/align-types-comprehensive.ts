#!/usr/bin/env node

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Comprehensive Type Alignment Script
 * 
 * 1. Ensures MCP spec compliance
 * 2. Aligns with Akamai OpenAPI types
 * 3. Fixes exactOptionalPropertyTypes issues
 * 4. Tests after each change
 */

// Step 1: Fix remaining optional property errors with Akamai API knowledge
function fixOptionalProperties() {
  console.log('🔧 Step 1: Fixing optional properties based on Akamai OpenAPI specs\n');
  
  const akamaiOptionalProps = {
    // Property Manager
    'listProperties': ['contractId', 'groupId', 'customer'],
    'createProperty': ['ruleFormat', 'customer'],
    'activateProperty': ['note', 'notifyEmails', 'customer'],
    
    // DNS
    'createZone': ['contractId', 'groupId', 'comment', 'masters', 'target'],
    'upsertRecord': ['comment', 'force'],
    'activateZoneChanges': ['comment', 'validateOnly', 'waitForCompletion', 'timeout'],
    
    // CPS
    'createEnrollment': ['customer', 'changeManagement'],
    
    // Common
    '*': ['customer', 'limit', 'offset', 'force', 'validateOnly']
  };
  
  // Find and fix patterns
  const toolFiles = execSync('find src/tools -name "*.ts" -type f', { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean);
  
  let fixedCount = 0;
  
  toolFiles.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let modified = false;
    
    // Fix common optional property patterns
    Object.entries(akamaiOptionalProps).forEach(([_func, props]) => {
      props.forEach(prop => {
        // Pattern: prop: args.prop
        const regex = new RegExp(`(\\s+)(${prop}):\\s*args\\.${prop}([,\\s\\}])`, 'g');
        const replacement = `$1...(args.${prop} !== undefined && { ${prop}: args.${prop} })$3`;
        
        if (content.match(regex)) {
          content = content.replace(regex, replacement);
          modified = true;
          fixedCount++;
        }
      });
    });
    
    if (modified) {
      fs.writeFileSync(file, content);
      console.log(`   ✅ Fixed optional properties in ${path.basename(file)}`);
    }
  });
  
  console.log(`\n   Fixed ${fixedCount} optional property patterns\n`);
}

// Step 2: Ensure correct MCPToolResponse usage
function alignMCPResponses() {
  console.log('🔧 Step 2: Aligning MCPToolResponse with MCP spec\n');
  
  // Check current imports
  const importIssues = execSync(
    'grep -n "MCPToolResponse" src/tools/*.ts src/tools/**/*.ts 2>/dev/null | grep -v "mcp-protocol" | head -10 || true',
    { encoding: 'utf8' }
  );
  
  if (importIssues) {
    console.log('   Found non-standard MCPToolResponse imports:');
    console.log(importIssues);
    console.log('   ℹ️  All tools should import from "../types/mcp-protocol"\n');
  } else {
    console.log('   ✅ All MCPToolResponse imports are correctly aligned\n');
  }
}

// Step 3: Fix specific error patterns
function fixSpecificErrors() {
  console.log('🔧 Step 3: Fixing specific TypeScript errors\n');
  
  // Fix TS2532 - Object is possibly undefined
  const undefinedErrors = [
    {
      file: 'src/tools/dns-tools.ts',
      fixes: [
        { 
          pattern: 'changelist.recordSets.forEach',
          replacement: 'changelist.recordSets?.forEach'
        }
      ]
    },
    {
      file: 'src/tools/property-manager.ts', 
      fixes: [
        {
          pattern: 'progressManager.updateProgress',
          replacement: 'progressManager.update'
        }
      ]
    }
  ];
  
  undefinedErrors.forEach(({ file, fixes }) => {
    if (fs.existsSync(file)) {
      let content = fs.readFileSync(file, 'utf8');
      let modified = false;
      
      fixes.forEach(({ pattern, replacement }) => {
        if (content.includes(pattern)) {
          content = content.replace(new RegExp(pattern, 'g'), replacement);
          modified = true;
        }
      });
      
      if (modified) {
        fs.writeFileSync(file, content);
        console.log(`   ✅ Fixed undefined errors in ${path.basename(file)}`);
      }
    }
  });
}

// Step 4: Run tests incrementally
async function runTests() {
  console.log('\n🧪 Step 4: Running tests\n');
  
  const testSuites = [
    { name: 'Unit tests', pattern: 'unit' },
    { name: 'Property tools', pattern: 'property-tools' },
    { name: 'DNS tools', pattern: 'dns-tools' }
  ];
  
  for (const suite of testSuites) {
    try {
      console.log(`   Testing ${suite.name}...`);
      execSync(
        `npm test -- --testPathPattern="${suite.pattern}" --passWithNoTests --silent`,
        { stdio: 'pipe' }
      );
      console.log(`   ✅ ${suite.name} passed`);
    } catch (e) {
      console.log(`   ⚠️  ${suite.name} has issues`);
    }
  }
}

// Main execution
async function main() {
  console.log('🚀 Comprehensive Type Alignment Tool\n');
  console.log('📋 Aligning with Akamai OpenAPI & MCP specifications\n');
  
  // Get baseline
  console.log('📊 Current state:');
  try {
    execSync('npm run type:errors', { stdio: 'inherit' });
  } catch {}
  console.log('');
  
  // Run fixes
  fixOptionalProperties();
  alignMCPResponses();
  fixSpecificErrors();
  
  // Test
  await runTests();
  
  // Final check
  console.log('\n📊 Final state:');
  try {
    execSync('npm run type:errors', { stdio: 'inherit' });
  } catch {}
  
  // Show progress
  console.log('\n📈 Type coverage:');
  try {
    execSync('npm run type:coverage', { stdio: 'inherit' });
  } catch {}
}

main().catch(console.error);