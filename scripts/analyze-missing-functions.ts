#!/usr/bin/env node

/**
 * Missing Functions Analysis
 * Scans OpenAPI specs and compares against current implementations
 */

import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';

console.log('🔍 Analyzing Missing Functions from OpenAPI Specifications\n');

// Get all OpenAPI spec files
const specsDir = 'openapi-specs';
const toolsDir = 'src/tools';

const specFiles = readdirSync(specsDir).filter(f => f.endsWith('.json'));
const toolFiles = readdirSync(toolsDir).filter(f => f.endsWith('.ts'));

console.log(`Found ${specFiles.length} OpenAPI specs and ${toolFiles.length} tool files\n`);

// Extract all current API calls from tools
const currentApiCalls = new Set<string>();
toolFiles.forEach(toolFile => {
  try {
    const content = readFileSync(join(toolsDir, toolFile), 'utf8');
    const pathMatches = content.match(/path:\s*[`'"]([^`'"]+)[`'"]/g);
    if (pathMatches) {
      pathMatches.forEach(match => {
        const path = match.replace(/path:\s*[`'"]/, '').replace(/[`'"].*/, '');
        currentApiCalls.add(path);
      });
    }
  } catch (e) {
    // Skip files that can't be read
  }
});

console.log(`Current implementations use ${currentApiCalls.size} unique API paths\n`);

// Analyze each OpenAPI spec
const missingFunctions: Record<string, Array<{
  method: string;
  path: string;
  operationId: string;
  summary: string;
  tags?: string[];
  importance: 'HIGH' | 'MEDIUM' | 'LOW';
}>> = {};

specFiles.forEach(specFile => {
  try {
    const spec = JSON.parse(readFileSync(join(specsDir, specFile), 'utf8'));
    const serviceName = specFile.replace('.json', '').replace('-', ' ').toUpperCase();
    
    const missing: Array<any> = [];
    
    if (spec.paths) {
      Object.entries(spec.paths).forEach(([path, methods]: [string, any]) => {
        Object.entries(methods).forEach(([method, operation]: [string, any]) => {
          if (method === 'parameters') return;
          
          // Check if we have this path implemented
          const pathPattern = path.replace(/\{[^}]+\}/g, ''); // Remove path parameters for matching
          const isImplemented = Array.from(currentApiCalls).some(call => 
            call.includes(pathPattern) || pathPattern.includes(call.split('?')[0])
          );
          
          if (!isImplemented && operation.operationId) {
            // Determine importance based on common patterns
            let importance: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
            
            const summary = operation.summary?.toLowerCase() || '';
            const operationId = operation.operationId?.toLowerCase() || '';
            
            // High importance indicators
            if (summary.includes('create') || summary.includes('update') || summary.includes('delete') ||
                summary.includes('activate') || summary.includes('deploy') ||
                operationId.includes('create') || operationId.includes('update') || operationId.includes('delete')) {
              importance = 'HIGH';
            }
            
            // Low importance indicators  
            if (summary.includes('history') || summary.includes('audit') || summary.includes('log') ||
                operationId.includes('history') || operationId.includes('audit')) {
              importance = 'LOW';
            }
            
            missing.push({
              method: method.toUpperCase(),
              path,
              operationId: operation.operationId,
              summary: operation.summary || 'No description',
              tags: operation.tags,
              importance
            });
          }
        });
      });
    }
    
    if (missing.length > 0) {
      missingFunctions[serviceName] = missing.sort((a, b) => {
        // Sort by importance then by path
        const importanceOrder = { 'HIGH': 0, 'MEDIUM': 1, 'LOW': 2 };
        const importanceDiff = importanceOrder[a.importance] - importanceOrder[b.importance];
        return importanceDiff !== 0 ? importanceDiff : a.path.localeCompare(b.path);
      });
    }
    
    console.log(`${serviceName}: ${missing.length} missing functions`);
  } catch (e) {
    console.log(`Error analyzing ${specFile}:`, e);
  }
});

// Generate detailed report
let report = `# Missing API Functions Analysis\n\n`;
report += `Generated: ${new Date().toISOString()}\n\n`;

report += `## Summary\n\n`;
const totalMissing = Object.values(missingFunctions).reduce((sum, funcs) => sum + funcs.length, 0);
report += `- **Total Missing Functions**: ${totalMissing}\n`;
report += `- **Current Implementations**: ${currentApiCalls.size} API paths\n`;
report += `- **Services Analyzed**: ${Object.keys(missingFunctions).length}\n\n`;

Object.entries(missingFunctions).forEach(([service, functions]) => {
  report += `## ${service} (${functions.length} missing functions)\n\n`;
  
  const byImportance = {
    HIGH: functions.filter(f => f.importance === 'HIGH'),
    MEDIUM: functions.filter(f => f.importance === 'MEDIUM'), 
    LOW: functions.filter(f => f.importance === 'LOW')
  };
  
  ['HIGH', 'MEDIUM', 'LOW'].forEach(importance => {
    const funcs = byImportance[importance as keyof typeof byImportance];
    if (funcs.length > 0) {
      report += `### ${importance} Priority (${funcs.length} functions)\n\n`;
      funcs.forEach(func => {
        report += `#### ${func.method} ${func.path}\n`;
        report += `- **Operation**: \`${func.operationId}\`\n`;
        report += `- **Description**: ${func.summary}\n`;
        if (func.tags?.length) {
          report += `- **Tags**: ${func.tags.join(', ')}\n`;
        }
        report += `- **Business Value**: Essential for complete ${service.toLowerCase()} lifecycle management\n\n`;
      });
    }
  });
  
  report += `---\n\n`;
});

// Implementation recommendations
report += `## Implementation Recommendations\n\n`;
report += `### Phase 1: High Priority (${Object.values(missingFunctions).reduce((sum, funcs) => sum + funcs.filter(f => f.importance === 'HIGH').length, 0)} functions)\n`;
report += `Focus on CRUD operations and lifecycle management:\n\n`;

Object.entries(missingFunctions).forEach(([service, functions]) => {
  const highPriority = functions.filter(f => f.importance === 'HIGH');
  if (highPriority.length > 0) {
    report += `**${service}**:\n`;
    highPriority.slice(0, 3).forEach(func => { // Top 3 per service
      report += `- ${func.method} ${func.path} - ${func.summary}\n`;
    });
    report += `\n`;
  }
});

report += `### CODE KAI Implementation Strategy\n\n`;
report += `Apply the systematic CODE KAI approach to each missing function:\n\n`;
report += `1. **STUDY**: Analyze OpenAPI specification for the endpoint\n`;
report += `2. **UNDERSTAND**: Map request/response types and parameters\n`;
report += `3. **CORRELATE**: Align with existing implementation patterns\n`;
report += `4. **FIX**: Generate type-safe implementation with validation\n`;
report += `5. **VERIFY**: Ensure 0 TypeScript errors\n`;
report += `6. **VALIDATE**: Test with real API data\n\n`;

report += `This systematic approach ensures:\n`;
report += `- 100% type safety with OpenAPI-generated types\n`;
report += `- Runtime validation with Zod schemas\n`;
report += `- Consistent error handling patterns\n`;
report += `- Production-ready implementations\n`;

// Write report
writeFileSync('docs/MISSING_FUNCTIONS_ANALYSIS.md', report);

console.log(`\n📋 Analysis complete!`);
console.log(`📄 Detailed report saved to: docs/MISSING_FUNCTIONS_ANALYSIS.md`);
console.log(`\n🎯 Key Findings:`);
console.log(`- ${totalMissing} missing functions identified`);
console.log(`- ${Object.values(missingFunctions).reduce((sum, funcs) => sum + funcs.filter(f => f.importance === 'HIGH').length, 0)} high-priority functions need immediate attention`);
console.log(`- Focus on CRUD operations and lifecycle management`);
console.log(`\n🚀 Ready for CODE KAI systematic implementation!`);