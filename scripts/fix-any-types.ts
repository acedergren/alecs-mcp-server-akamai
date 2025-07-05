#!/usr/bin/env tsx

/**
 * Script to identify and help fix 'as any' type casts
 * Part of the CODE KAI continuous improvement process
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { glob } from 'glob';

interface AnyTypeInstance {
  file: string;
  line: number;
  content: string;
  context: string;
}

async function findAnyTypes(): Promise<AnyTypeInstance[]> {
  const files = await glob('src/**/*.ts', { 
    ignore: ['**/node_modules/**', '**/*.test.ts', '**/*.spec.ts'] 
  });
  
  const instances: AnyTypeInstance[] = [];
  
  for (const file of files) {
    const content = await fs.readFile(file, 'utf-8');
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      if (line.includes('as any')) {
        // Get context (3 lines before and after)
        const contextStart = Math.max(0, index - 3);
        const contextEnd = Math.min(lines.length - 1, index + 3);
        const contextLines = lines.slice(contextStart, contextEnd + 1);
        
        instances.push({
          file,
          line: index + 1,
          content: line.trim(),
          context: contextLines.join('\n')
        });
      }
    });
  }
  
  return instances;
}

async function categorizeAnyTypes(instances: AnyTypeInstance[]) {
  const categories = {
    responseTyping: [] as AnyTypeInstance[],
    zodSchema: [] as AnyTypeInstance[],
    errorHandling: [] as AnyTypeInstance[],
    arrayAccess: [] as AnyTypeInstance[],
    other: [] as AnyTypeInstance[]
  };
  
  instances.forEach(instance => {
    if (instance.content.includes('response as any') || 
        instance.content.includes('Response as any')) {
      categories.responseTyping.push(instance);
    } else if (instance.content.includes('schema') || 
               instance.content.includes('Schema')) {
      categories.zodSchema.push(instance);
    } else if (instance.content.includes('error as any') || 
               instance.content.includes('err as any')) {
      categories.errorHandling.push(instance);
    } else if (instance.content.includes('] as any')) {
      categories.arrayAccess.push(instance);
    } else {
      categories.other.push(instance);
    }
  });
  
  return categories;
}

async function generateReport(instances: AnyTypeInstance[]) {
  const categories = await categorizeAnyTypes(instances);
  
  console.log('🔍 "as any" Type Cast Analysis Report\n');
  console.log(`Total instances: ${instances.length}\n`);
  
  console.log('📊 By Category:');
  console.log(`  Response Typing: ${categories.responseTyping.length}`);
  console.log(`  Zod Schema: ${categories.zodSchema.length}`);
  console.log(`  Error Handling: ${categories.errorHandling.length}`);
  console.log(`  Array Access: ${categories.arrayAccess.length}`);
  console.log(`  Other: ${categories.other.length}\n`);
  
  console.log('📁 By File (Top 10):');
  const fileCount = new Map<string, number>();
  instances.forEach(instance => {
    fileCount.set(instance.file, (fileCount.get(instance.file) || 0) + 1);
  });
  
  const sortedFiles = Array.from(fileCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  sortedFiles.forEach(([file, count]) => {
    console.log(`  ${file}: ${count} instances`);
  });
  
  // Generate fix suggestions
  console.log('\n🔧 Fix Suggestions:\n');
  
  if (categories.responseTyping.length > 0) {
    console.log('1. Response Typing Issues:');
    console.log('   - Import proper response types from types/api-responses/');
    console.log('   - Use type guards (isXxxResponse) for validation');
    console.log('   - Example: if (!isPapiPropertyDetailsResponse(response)) { throw ... }');
  }
  
  if (categories.zodSchema.length > 0) {
    console.log('\n2. Zod Schema Issues:');
    console.log('   - Use proper Zod methods instead of accessing internals');
    console.log('   - Consider using z.infer<typeof schema> for types');
  }
  
  if (categories.errorHandling.length > 0) {
    console.log('\n3. Error Handling Issues:');
    console.log('   - Create proper error types extending Error');
    console.log('   - Use instanceof checks for error types');
  }
  
  // Save detailed report
  const reportPath = 'any-types-report.json';
  await fs.writeFile(reportPath, JSON.stringify(categories, null, 2));
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);
}

async function main() {
  console.log('🚀 Starting "as any" type cast analysis...\n');
  
  const instances = await findAnyTypes();
  await generateReport(instances);
  
  console.log('\n✅ Analysis complete!');
}

main().catch(console.error);