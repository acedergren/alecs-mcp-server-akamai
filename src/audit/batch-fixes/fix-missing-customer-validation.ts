/**
 * Fix Missing Customer Validation in All Tools
 * This addresses a critical security issue where tools don't validate customer parameter
 */

import * as fs from 'fs/promises';
import { globSync } from 'glob';

const CUSTOMER_VALIDATION_CODE = `
    // Validate customer parameter
    if (params.customer) {
      const configManager = CustomerConfigManager.getInstance();
      await configManager.validateCustomer(params.customer);
    }`;

export async function fixMissingCustomerValidation() {
  console.log('🔐 Fixing missing customer validation in all tools...\n');
  
  const toolFiles = globSync('src/tools/**/*-tools.ts', {
    ignore: ['**/*.test.ts', '**/*.spec.ts'],
  });
  
  let fixedCount = 0;
  let skippedCount = 0;
  
  for (const file of toolFiles) {
    try {
      const content = await fs.readFile(file, 'utf-8');
      let fixed = content;
      let modified = false;
      
      // Check if file has tools that use customer parameter
      if (content.includes('params.customer') || content.includes('customer:')) {
        // Add import if missing
        if (!content.includes('CustomerConfigManager')) {
          const importLine = `import { CustomerConfigManager } from '../utils/customer-config';\n`;
          
          // Find the right place to add import
          const lastImportMatch = content.match(/import[^;]+from[^;]+;(?=\n(?!import))/);
          if (lastImportMatch) {
            const insertIndex = lastImportMatch.index! + lastImportMatch[0].length;
            fixed = fixed.slice(0, insertIndex) + '\n' + importLine + fixed.slice(insertIndex);
            modified = true;
          }
        }
        
        // Add validation to each handler
        const handlerPattern = /handler:\s*async\s*\([^)]*\)\s*=>\s*{/g;
        let match;
        
        while ((match = handlerPattern.exec(content)) !== null) {
          const handlerStart = match.index! + match[0].length;
          const handlerEnd = findClosingBrace(content, handlerStart);
          const handlerBody = content.substring(handlerStart, handlerEnd);
          
          if (handlerBody.includes('params.customer') && !handlerBody.includes('validateCustomer')) {
            // Insert validation after opening brace
            const insertPos = match.index! + match[0].length;
            fixed = fixed.slice(0, insertPos) + CUSTOMER_VALIDATION_CODE + fixed.slice(insertPos);
            modified = true;
          }
        }
        
        if (modified) {
          await fs.writeFile(file, fixed);
          fixedCount++;
          console.log(`✅ Fixed: ${file}`);
        } else {
          skippedCount++;
        }
      } else {
        skippedCount++;
      }
    } catch (error) {
      console.error(`❌ Error fixing ${file}:`, error);
    }
  }
  
  console.log(`\n📊 Customer Validation Fix Results:`);
  console.log(`✅ Fixed: ${fixedCount} files`);
  console.log(`⏭️  Skipped: ${skippedCount} files`);
}

function findClosingBrace(content: string, startIndex: number): number {
  let braceCount = 1;
  let i = startIndex;
  
  while (i < content.length && braceCount > 0) {
    if (content[i] === '{') {braceCount++;}
    else if (content[i] === '}') {braceCount--;}
    i++;
  }
  
  return i - 1;
}