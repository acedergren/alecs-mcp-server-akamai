/**
 * Add try-catch to async functions without error handling
 * This prevents unhandled promise rejections
 */

import * as fs from 'fs/promises';
import { globSync } from 'glob';

export async function fixMissingTryCatch() {
  console.log('🛡️ Adding try-catch to async functions...\n');
  
  const sourceFiles = globSync('src/**/*.ts', {
    ignore: ['**/*.test.ts', '**/*.spec.ts', '**/node_modules/**', '**/dist/**', '**/types/**'],
  });
  
  let totalFixed = 0;
  let filesModified = 0;
  
  for (const file of sourceFiles) {
    try {
      const content = await fs.readFile(file, 'utf-8');
      let fixed = content;
      let fixCount = 0;
      
      // Find async functions without try-catch
      const asyncFuncPattern = /async\s+(\w+)\s*\([^)]*\)\s*(?::[^{]+)?\s*{([^}]+(?:{[^}]*}[^}]*)*)}/g;
      
      fixed = fixed.replace(asyncFuncPattern, (match, funcName, body) => {
        // Check if function has await and no try-catch
        if (body.includes('await') && !body.includes('try') && !body.includes('catch')) {
          fixCount++;
          
          // Wrap the body in try-catch
          const wrappedBody = `
  try {${body}
  } catch (error) {
    logger.error(\`Error in ${funcName}:\`, error);
    throw error;
  }`;
          
          return match.replace(body, wrappedBody);
        }
        return match;
      });
      
      // Also handle arrow functions
      const arrowAsyncPattern = /(\w+)\s*=\s*async\s*\([^)]*\)\s*(?::[^=]+)?\s*=>\s*{([^}]+(?:{[^}]*}[^}]*)*)}/g;
      
      fixed = fixed.replace(arrowAsyncPattern, (match, funcName, body) => {
        if (body.includes('await') && !body.includes('try') && !body.includes('catch')) {
          fixCount++;
          
          const wrappedBody = `
  try {${body}
  } catch (error) {
    logger.error(\`Error in ${funcName}:\`, error);
    throw error;
  }`;
          
          return match.replace(body, wrappedBody);
        }
        return match;
      });
      
      if (fixCount > 0) {
        // Ensure logger is imported
        if (!fixed.includes("import { logger }")) {
          const importLine = `import { logger } from '../utils/logger';\n`;
          const firstImport = fixed.match(/import\s+/);
          if (firstImport) {
            fixed = fixed.slice(0, firstImport.index) + importLine + fixed.slice(firstImport.index);
          }
        }
        
        await fs.writeFile(file, fixed);
        totalFixed += fixCount;
        filesModified++;
        console.log(`✅ Fixed ${fixCount} async functions in: ${file}`);
      }
    } catch (error) {
      console.error(`❌ Error fixing ${file}:`, error);
    }
  }
  
  console.log(`\n📊 Try-Catch Fix Results:`);
  console.log(`✅ Fixed: ${totalFixed} async functions`);
  console.log(`📁 Modified: ${filesModified} files`);
}