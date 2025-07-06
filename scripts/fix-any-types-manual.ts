#!/usr/bin/env tsx
/**
 * Manual fixes for the most stubborn any type violations
 * These require context-aware replacements
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface FileSpecificFix {
  file: string;
  fixes: Array<{
    search: string;
    replace: string;
  }>;
}

const MANUAL_FIXES: FileSpecificFix[] = [
  {
    file: 'src/tools/tool-schemas-extended.ts',
    fixes: [
      {
        search: 'z.any()',
        replace: 'z.unknown()'
      },
      {
        search: 'ZodType<any>',
        replace: 'ZodType<unknown>'
      }
    ]
  },
  {
    file: 'src/utils/edgegrid-client.ts',
    fixes: [
      {
        search: 'body?: any',
        replace: 'body?: unknown'
      },
      {
        search: 'queryParams?: any',
        replace: 'queryParams?: Record<string, string | number | boolean>'
      },
      {
        search: 'response: any',
        replace: 'response: unknown'
      }
    ]
  },
  {
    file: 'src/utils/pino-logger.ts',
    fixes: [
      {
        search: '...args: any[]',
        replace: '...args: unknown[]'
      },
      {
        search: 'meta?: any',
        replace: 'meta?: Record<string, unknown>'
      }
    ]
  },
  {
    file: 'src/utils/request-coalescer.ts',
    fixes: [
      {
        search: 'data: any',
        replace: 'data: unknown'
      },
      {
        search: 'Promise<any>',
        replace: 'Promise<unknown>'
      },
      {
        search: 'Map<string, any>',
        replace: 'Map<string, unknown>'
      }
    ]
  },
  {
    file: 'src/agents/cdn-provisioning.agent.ts',
    fixes: [
      {
        search: 'options?: any',
        replace: 'options?: Record<string, unknown>'
      },
      {
        search: 'result: any',
        replace: 'result: unknown'
      }
    ]
  },
  {
    file: 'src/types/api-responses.ts',
    fixes: [
      {
        search: '[key: string]: any',
        replace: '[key: string]: unknown'
      },
      {
        search: 'data?: any',
        replace: 'data?: unknown'
      }
    ]
  },
  {
    file: 'src/utils/ajv-validator.ts',
    fixes: [
      {
        search: 'data: any',
        replace: 'data: unknown'
      },
      {
        search: 'schema: any',
        replace: 'schema: Record<string, unknown>'
      }
    ]
  },
  {
    file: 'src/utils/api-response-validator.ts',
    fixes: [
      {
        search: 'response: any',
        replace: 'response: unknown'
      },
      {
        search: 'T = any',
        replace: 'T = unknown'
      }
    ]
  },
  {
    file: 'src/testing/simple-mcp-test.ts',
    fixes: [
      {
        search: 'params?: any',
        replace: 'params?: Record<string, unknown>'
      },
      {
        search: 'result: any',
        replace: 'result: unknown'
      }
    ]
  },
  {
    file: 'src/tools/bulk-operations-manager.ts',
    fixes: [
      {
        search: 'operations: any[]',
        replace: 'operations: unknown[]'
      },
      {
        search: 'config?: any',
        replace: 'config?: Record<string, unknown>'
      }
    ]
  },
  {
    file: 'src/tools/property-activation-advanced.ts',
    fixes: [
      {
        search: 'metadata?: any',
        replace: 'metadata?: Record<string, unknown>'
      },
      {
        search: 'validation: any',
        replace: 'validation: unknown'
      }
    ]
  },
  {
    file: 'src/tools/property-onboarding-tools.ts',
    fixes: [
      {
        search: 'settings?: any',
        replace: 'settings?: Record<string, unknown>'
      },
      {
        search: 'rules?: any',
        replace: 'rules?: unknown'
      }
    ]
  },
  {
    file: 'src/tools/property-operations-advanced.ts',
    fixes: [
      {
        search: 'properties?: any[]',
        replace: 'properties?: unknown[]'
      },
      {
        search: 'changes: any',
        replace: 'changes: unknown'
      }
    ]
  },
  {
    file: 'src/tools/universal-search-with-cache.ts',
    fixes: [
      {
        search: 'searchResults: any[]',
        replace: 'searchResults: unknown[]'
      },
      {
        search: 'filters?: any',
        replace: 'filters?: Record<string, unknown>'
      }
    ]
  },
  {
    file: 'src/types/mcp-protocol.ts',
    fixes: [
      {
        search: 'params?: any',
        replace: 'params?: unknown'
      },
      {
        search: 'result?: any',
        replace: 'result?: unknown'
      },
      {
        search: 'error?: any',
        replace: 'error?: unknown'
      }
    ]
  },
  {
    file: 'src/utils/customer-aware-cache.ts',
    fixes: [
      {
        search: 'value: any',
        replace: 'value: unknown'
      },
      {
        search: 'get<T = any>',
        replace: 'get<T = unknown>'
      }
    ]
  },
  {
    file: 'src/utils/performance-monitor.ts',
    fixes: [
      {
        search: 'metrics: any',
        replace: 'metrics: Record<string, unknown>'
      },
      {
        search: 'data?: any',
        replace: 'data?: unknown'
      }
    ]
  },
  {
    file: 'src/utils/smart-cache.ts',
    fixes: [
      {
        search: 'Map<string, any>',
        replace: 'Map<string, unknown>'
      },
      {
        search: 'value: any',
        replace: 'value: unknown'
      }
    ]
  }
];

async function main() {
  console.log('🔧 Manual TypeScript "any" Type Fix Script');
  console.log('=========================================\n');
  
  let totalFilesFixed = 0;
  let totalFixesApplied = 0;
  
  for (const fileFix of MANUAL_FIXES) {
    const filePath = join(process.cwd(), fileFix.file);
    
    try {
      let content = readFileSync(filePath, 'utf8');
      let fixCount = 0;
      
      for (const fix of fileFix.fixes) {
        const occurrences = (content.match(new RegExp(fix.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
        
        if (occurrences > 0) {
          content = content.split(fix.search).join(fix.replace);
          fixCount += occurrences;
          console.log(`  Fixed "${fix.search}" → "${fix.replace}" (${occurrences} occurrences)`);
        }
      }
      
      if (fixCount > 0) {
        writeFileSync(filePath, content);
        totalFilesFixed++;
        totalFixesApplied += fixCount;
        console.log(`✅ Fixed ${fixCount} violations in ${fileFix.file}\n`);
      }
      
    } catch (error) {
      console.error(`Error processing ${fileFix.file}:`, error);
    }
  }
  
  console.log('\n📊 Summary:');
  console.log(`   Files fixed: ${totalFilesFixed}`);
  console.log(`   Total fixes applied: ${totalFixesApplied}`);
  console.log('\n✨ Manual fixes complete!');
  
  // Additional generic pattern fix for remaining files
  console.log('\n🎯 Running generic pattern fixes...\n');
  
  const genericPatterns = [
    { pattern: /\bany\[\]/g, replacement: 'unknown[]' },
    { pattern: /:\s*any\s*;/g, replacement: ': unknown;' },
    { pattern: /:\s*any\s*\)/g, replacement: ': unknown)' },
    { pattern: /:\s*any\s*,/g, replacement: ': unknown,' },
    { pattern: /<any>/g, replacement: '<unknown>' },
    { pattern: /\bas\s+any\b/g, replacement: 'as unknown' }
  ];
  
  const remainingFiles = [
    'src/services/sonarcloud-client.ts',
    'src/testing/base/reliable-test-base.ts',
    'src/testing/mcp-test-client.ts',
    'src/tools/property-search-optimized.ts',
    'src/tools/property-tools-paginated.ts',
    'src/tools/property-tools.ts',
    'src/tools/validation/customer-validation-wrapper.ts',
    'src/utils/enhanced-error-handling.ts',
    'src/utils/error-diagnostics.ts',
    'src/utils/etag-handler.ts',
    'src/utils/mcp-compatibility-wrapper.ts'
  ];
  
  let genericFixCount = 0;
  
  for (const file of remainingFiles) {
    const filePath = join(process.cwd(), file);
    
    try {
      let content = readFileSync(filePath, 'utf8');
      let fileFixCount = 0;
      
      for (const { pattern, replacement } of genericPatterns) {
        const matches = content.match(pattern);
        if (matches) {
          content = content.replace(pattern, replacement);
          fileFixCount += matches.length;
        }
      }
      
      if (fileFixCount > 0) {
        writeFileSync(filePath, content);
        genericFixCount += fileFixCount;
        console.log(`✅ Fixed ${fileFixCount} violations in ${file}`);
      }
      
    } catch (error) {
      console.error(`Error processing ${file}:`, error);
    }
  }
  
  console.log(`\n📊 Generic fixes applied: ${genericFixCount}`);
  console.log('\n🎉 All fixes complete! Run count script to verify final results.');
}

main().catch(console.error);