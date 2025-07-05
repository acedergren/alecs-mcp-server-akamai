#!/usr/bin/env node

/**
 * ALECS MCP Server Auto-Fix Script
 * Automatically fixes common issues found by the audit
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { logger } from '../utils/logger';
import { AuditReport } from './audit-framework';

interface FixResult {
  file: string;
  issue: string;
  fixed: boolean;
  error?: string;
}

/**
 * Auto-fix command injection vulnerabilities
 */
async function fixCommandInjection(filePath: string): Promise<FixResult[]> {
  const results: FixResult[] = [];
  
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    let fixed = content;
    
    // Replace dangerous exec/spawn calls with safer alternatives
    fixed = fixed.replace(
      /exec\(([^)]+)\)/g,
      (match, args) => {
        if (args.includes('params.') || args.includes('args.')) {
          results.push({
            file: filePath,
            issue: 'Command injection vulnerability',
            fixed: true,
          });
          return `// SECURITY: Fixed command injection\n    // Original: ${match}\n    throw new Error('Command execution disabled for security - refactor needed')`;
        }
        return match;
      }
    );
    
    if (fixed !== content) {
      await fs.writeFile(filePath, fixed);
    }
  } catch (error) {
    results.push({
      file: filePath,
      issue: 'Command injection vulnerability',
      fixed: false,
      error: String(error),
    });
  }
  
  return results;
}

/**
 * Add customer validation to tools
 */
async function addCustomerValidation(filePath: string): Promise<FixResult[]> {
  const results: FixResult[] = [];
  
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    let fixed = content;
    
    // Add customer validation import if missing
    if (!fixed.includes('CustomerConfigManager') && fixed.includes('customer')) {
      const importLine = "import { CustomerConfigManager } from '../utils/customer-config';\n";
      
      // Find the last import line
      const lastImportMatch = fixed.match(/import[^;]+;(?=\n(?!import))/);
      if (lastImportMatch) {
        const insertIndex = lastImportMatch.index! + lastImportMatch[0].length;
        fixed = fixed.slice(0, insertIndex) + '\n' + importLine + fixed.slice(insertIndex);
        
        results.push({
          file: filePath,
          issue: 'Missing CustomerConfigManager import',
          fixed: true,
        });
      }
    }
    
    // Add validation to handlers
    const handlerPattern = /handler:\s*async[^{]*{([^}]+)}/g;
    fixed = fixed.replace(handlerPattern, (match, body) => {
      if (body.includes('params.customer') && !body.includes('validateCustomer')) {
        const validation = '\n    // Validate customer\n    if (params.customer) {\n      await CustomerConfigManager.getInstance().validateCustomer(params.customer);\n    }\n';
        return match.replace('{', '{' + validation);
      }
      return match;
    });
    
    if (fixed !== content) {
      await fs.writeFile(filePath, fixed);
    }
  } catch (error) {
    results.push({
      file: filePath,
      issue: 'Missing customer validation',
      fixed: false,
      error: String(error),
    });
  }
  
  return results;
}

/**
 * Fix cache key customer isolation
 */
async function fixCacheKeyIsolation(filePath: string): Promise<FixResult[]> {
  const results: FixResult[] = [];
  
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    let fixed = content;
    
    // Fix cache keys to include customer
    const cacheKeyPatterns = [
      /cache\.(get|set|has)\(['"`]([^'"]+)['"`]/g,
      /cacheKey\s*=\s*['"`]([^'"]+)['"`]/g,
    ];
    
    for (const pattern of cacheKeyPatterns) {
      fixed = fixed.replace(pattern, (match, method, key) => {
        if (key && !key.includes('${customer}')) {
          results.push({
            file: filePath,
            issue: 'Cache key missing customer isolation',
            fixed: true,
          });
          
          // Try to find customer variable in scope
          return match.replace(key || method, `\${customer}:${key || method}`);
        }
        return match;
      });
    }
    
    if (fixed !== content) {
      await fs.writeFile(filePath, fixed);
    }
  } catch (error) {
    results.push({
      file: filePath,
      issue: 'Cache key isolation',
      fixed: false,
      error: String(error),
    });
  }
  
  return results;
}

/**
 * Fix missing error handling
 */
async function fixMissingErrorHandling(filePath: string): Promise<FixResult[]> {
  const results: FixResult[] = [];
  
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    let fixed = content;
    
    // Wrap async functions without try-catch
    const asyncPattern = /async\s+(\w+)\s*\([^)]*\)\s*{([^}]+)}/g;
    fixed = fixed.replace(asyncPattern, (match, name, body) => {
      if (body.includes('await') && !body.includes('try')) {
        results.push({
          file: filePath,
          issue: `Missing error handling in ${name}`,
          fixed: true,
        });
        
        return match.replace('{', '{\n  try {')
          .replace('}', '  } catch (error) {\n    logger.error(`Error in ' + name + ':`, error);\n    throw error;\n  }\n}');
      }
      return match;
    });
    
    if (fixed !== content) {
      await fs.writeFile(filePath, fixed);
    }
  } catch (error) {
    results.push({
      file: filePath,
      issue: 'Missing error handling',
      fixed: false,
      error: String(error),
    });
  }
  
  return results;
}

/**
 * Replace generic Error with McpError
 */
async function fixGenericErrors(filePath: string): Promise<FixResult[]> {
  const results: FixResult[] = [];
  
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    let fixed = content;
    
    // Add MCP imports if needed
    if (fixed.includes('throw new Error') && !fixed.includes('McpError')) {
      const importLine = "import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';\n";
      const lastImportMatch = fixed.match(/import[^;]+;(?=\n(?!import))/);
      if (lastImportMatch) {
        const insertIndex = lastImportMatch.index! + lastImportMatch[0].length;
        fixed = fixed.slice(0, insertIndex) + '\n' + importLine + fixed.slice(insertIndex);
      }
    }
    
    // Replace generic errors
    fixed = fixed.replace(/throw new Error\((['"`])(.*?)\1\)/g, (_match, quote, message) => {
      results.push({
        file: filePath,
        issue: 'Generic Error instead of McpError',
        fixed: true,
      });
      
      // Determine appropriate error code
      let errorCode = 'InternalError';
      if (message.toLowerCase().includes('not found')) {errorCode = 'MethodNotFound';}
      else if (message.toLowerCase().includes('invalid')) {errorCode = 'InvalidParams';}
      else if (message.toLowerCase().includes('permission')) {errorCode = 'InvalidRequest';}
      
      return `throw new McpError(ErrorCode.${errorCode}, ${quote}${message}${quote})`;
    });
    
    if (fixed !== content) {
      await fs.writeFile(filePath, fixed);
    }
  } catch (error) {
    results.push({
      file: filePath,
      issue: 'Generic errors',
      fixed: false,
      error: String(error),
    });
  }
  
  return results;
}

/**
 * Add missing tool schemas
 */
async function addMissingSchemas(filePath: string): Promise<FixResult[]> {
  const results: FixResult[] = [];
  
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    let fixed = content;
    
    // Find tools without schemas
    const toolPattern = /export const (\w+) = {([^}]+)}/g;
    const matches = Array.from(content.matchAll(toolPattern));
    
    for (const match of matches) {
      const [fullMatch, toolName, toolBody] = match;
      
      if (toolBody && !toolBody.includes('schema:') && !toolBody.includes('inputSchema:')) {
        results.push({
          file: filePath,
          issue: `Tool ${toolName} missing schema`,
          fixed: true,
        });
        
        // Add basic schema
        const schemaToAdd = `\n  schema: z.object({\n    customer: z.string().optional(),\n  }),`;
        fixed = fixed.replace(fullMatch, fullMatch.replace('{', '{' + schemaToAdd));
      }
    }
    
    // Add zod import if needed
    if (fixed !== content && !fixed.includes("import { z }")) {
      const importLine = "import { z } from 'zod';\n";
      fixed = importLine + fixed;
    }
    
    if (fixed !== content) {
      await fs.writeFile(filePath, fixed);
    }
  } catch (error) {
    results.push({
      file: filePath,
      issue: 'Missing tool schemas',
      fixed: false,
      error: String(error),
    });
  }
  
  return results;
}

/**
 * Main auto-fix function
 */
async function autoFix(reportPath: string): Promise<void> {
  console.log('🔧 Starting auto-fix process...\n');
  
  // Load audit report
  const reportContent = await fs.readFile(reportPath, 'utf-8');
  const report: AuditReport = JSON.parse(reportContent);
  
  console.log(`Found ${report.totalIssues} issues to analyze...`);
  console.log(`Critical issues: ${report.criticalIssues}\n`);
  
  const allResults: FixResult[] = [];
  const fixedFiles = new Set<string>();
  
  // Group issues by file
  const issuesByFile = new Map<string, typeof report.issues>();
  for (const issue of report.issues) {
    if (!issuesByFile.has(issue.file)) {
      issuesByFile.set(issue.file, []);
    }
    issuesByFile.get(issue.file)!.push(issue);
  }
  
  // Apply fixes based on issue type
  for (const [file, issues] of issuesByFile) {
    const fullPath = path.join(process.cwd(), file);
    
    for (const issue of issues) {
      if (issue.severity !== 'critical' && issue.severity !== 'high') {continue;}
      
      let results: FixResult[] = [];
      
      switch (true) {
        case issue.message.includes('command injection'):
          results = await fixCommandInjection(fullPath);
          break;
          
        case issue.message.includes('customer validation'):
        case issue.message.includes('customer parameter without validation'):
          results = await addCustomerValidation(fullPath);
          break;
          
        case issue.message.includes('Cache key missing customer'):
          results = await fixCacheKeyIsolation(fullPath);
          break;
          
        case issue.message.includes('without error handling'):
          results = await fixMissingErrorHandling(fullPath);
          break;
          
        case issue.message.includes('generic Error instead of McpError'):
          results = await fixGenericErrors(fullPath);
          break;
          
        case issue.message.includes('missing schema'):
          results = await addMissingSchemas(fullPath);
          break;
      }
      
      allResults.push(...results);
      if (results.some(r => r.fixed)) {
        fixedFiles.add(file);
      }
    }
  }
  
  // Print results
  console.log('\n📊 AUTO-FIX RESULTS\n');
  
  const fixed = allResults.filter(r => r.fixed).length;
  const failed = allResults.filter(r => !r.fixed).length;
  
  console.log(`✅ Fixed: ${fixed} issues`);
  console.log(`❌ Failed: ${failed} issues`);
  console.log(`📁 Modified files: ${fixedFiles.size}\n`);
  
  if (failed > 0) {
    console.log('Failed fixes:');
    allResults
      .filter(r => !r.fixed)
      .forEach(r => {
        console.log(`- ${r.file}: ${r.issue}`);
        if (r.error) {console.log(`  Error: ${r.error}`);}
      });
  }
  
  // Save fix report
  const fixReportPath = reportPath.replace('.json', '-fixes.json');
  await fs.writeFile(fixReportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    results: allResults,
    summary: {
      fixed,
      failed,
      modifiedFiles: Array.from(fixedFiles),
    }
  }, null, 2));
  
  console.log(`\n📄 Fix report saved to: ${fixReportPath}`);
}

// CLI entry point
if (require.main === module) {
  const reportPath = process.argv[2];
  
  if (!reportPath) {
    console.error('Usage: node auto-fix.js <audit-report.json>');
    process.exit(1);
  }
  
  autoFix(reportPath).catch(error => {
    logger.error('Auto-fix failed:', error);
    process.exit(1);
  });
}

export { autoFix };