/**
 * Add cache invalidation to mutation operations
 * This is a critical performance issue that can cause stale data
 */

import * as fs from 'fs/promises';
import { globSync } from 'glob';

const CACHE_INVALIDATION_CODE = `
    // Invalidate cache after mutation
    if (globalThis.cacheManager) {
      await globalThis.cacheManager.invalidatePattern(\`\${customer}:*\`);
    }`;

export async function fixMissingCacheInvalidation() {
  console.log('🗑️ Adding cache invalidation to mutations...\n');
  
  const toolFiles = globSync('src/tools/**/*.ts', {
    ignore: ['**/*.test.ts', '**/*.spec.ts'],
  });
  
  let totalFixed = 0;
  let filesModified = 0;
  
  for (const file of toolFiles) {
    try {
      const content = await fs.readFile(file, 'utf-8');
      let fixed = content;
      let fixCount = 0;
      
      // Find mutation operations
      const mutationPatterns = [
        /create[A-Z]\w+/,
        /update[A-Z]\w+/,
        /delete[A-Z]\w+/,
        /remove[A-Z]\w+/,
        /activate[A-Z]\w+/,
        /add[A-Z]\w+/,
        /set[A-Z]\w+/,
      ];
      
      for (const pattern of mutationPatterns) {
        const matches = Array.from(content.matchAll(new RegExp(`(${pattern.source}).*handler:`, 'g')));
        
        for (const match of matches) {
          const handlerMatch = content.slice(match.index!).match(/handler:\s*async[^{]*{([^}]+(?:{[^}]*}[^}]*)*)}/);
          
          if (handlerMatch && handlerMatch[1]) {
            const handlerBody = handlerMatch[1];
            
            // Check if it has a return statement and no cache invalidation
            if (handlerBody && handlerBody.includes('return') && 
                !handlerBody.includes('invalidate') && 
                !handlerBody.includes('clearCache')) {
              
              // Find the return statement
              const returnMatch = handlerBody.match(/return\s+[^;]+;/);
              if (returnMatch) {
                // Insert cache invalidation before return
                const insertPos = match.index! + handlerMatch.index! + handlerMatch[0].indexOf(returnMatch[0]);
                fixed = fixed.slice(0, insertPos) + CACHE_INVALIDATION_CODE + '\n\n    ' + fixed.slice(insertPos);
                fixCount++;
              }
            }
          }
        }
      }
      
      if (fixCount > 0) {
        await fs.writeFile(file, fixed);
        totalFixed += fixCount;
        filesModified++;
        console.log(`✅ Fixed ${fixCount} mutations in: ${file}`);
      }
    } catch (error) {
      console.error(`❌ Error fixing ${file}:`, error);
    }
  }
  
  console.log(`\n📊 Cache Invalidation Fix Results:`);
  console.log(`✅ Fixed: ${totalFixed} mutations`);
  console.log(`📁 Modified: ${filesModified} files`);
}