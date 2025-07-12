#!/usr/bin/env tsx

/**
 * Domain Architecture Validation Script
 * 
 * Validates that all domains follow the Snow Leopard Architecture standards
 * and can be properly discovered by the unified registry.
 * 
 * Used in CI/CD pipeline to ensure code quality and architectural compliance.
 */

import { existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { initializeRegistry, getAllToolDefinitions, getAllDomains, validateAllTools } from '../src/tools/registry';

interface ValidationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    totalDomains: number;
    totalTools: number;
    autoDiscoveredDomains: number;
    validDomains: number;
  };
}

/**
 * Validate domain architecture standards
 */
function validateDomainStructure(domainsPath: string): ValidationResult {
  const result: ValidationResult = {
    success: true,
    errors: [],
    warnings: [],
    stats: {
      totalDomains: 0,
      totalTools: 0,
      autoDiscoveredDomains: 0,
      validDomains: 0
    }
  };

  try {
    const entries = readdirSync(domainsPath, { withFileTypes: true });
    const domainDirs = entries.filter(entry => 
      entry.isDirectory() && 
      !entry.name.startsWith('__') && 
      !entry.name.startsWith('.') &&
      entry.name !== 'common'
    );

    result.stats.totalDomains = domainDirs.length;

    for (const domainDir of domainDirs) {
      const domainPath = join(domainsPath, domainDir.name);
      const indexPath = join(domainPath, 'index.ts');
      const apiPath = join(domainPath, 'api.ts');

      // Check required files
      if (!existsSync(indexPath)) {
        result.errors.push(`Domain '${domainDir.name}' missing required index.ts file`);
        continue;
      }

      if (!existsSync(apiPath)) {
        result.warnings.push(`Domain '${domainDir.name}' missing api.ts file (recommended)`);
      }

      // Check for main implementation file
      const domainFiles = readdirSync(domainPath).filter(f => f.endsWith('.ts') && f !== 'index.ts' && f !== 'api.ts');
      const hasImplementationFile = domainFiles.some(f => f === `${domainDir.name}.ts` || f.includes(domainDir.name));
      
      if (!hasImplementationFile) {
        result.warnings.push(`Domain '${domainDir.name}' should have a main implementation file (${domainDir.name}.ts)`);
      }

      // Check index.ts follows standard pattern
      try {
        const indexContent = require('fs').readFileSync(indexPath, 'utf-8');
        
        // Should export operations registry
        if (!indexContent.includes('Operations') && !indexContent.includes('operations')) {
          result.warnings.push(`Domain '${domainDir.name}' index.ts should export operations registry`);
        }

        // Should follow standard pattern
        if (indexContent.includes('import') && indexContent.includes('export') && 
            !indexContent.includes('circular') && indexContent.length < 500) {
          result.stats.validDomains++;
        } else if (indexContent.length > 500) {
          result.warnings.push(`Domain '${domainDir.name}' index.ts is too complex (${indexContent.length} chars). Consider simplifying.`);
        }

      } catch (error) {
        result.errors.push(`Error reading ${domainDir.name}/index.ts: ${error}`);
      }
    }

  } catch (error) {
    result.errors.push(`Error scanning domains directory: ${error}`);
  }

  result.success = result.errors.length === 0;
  return result;
}

/**
 * Validate registry functionality
 */
async function validateRegistry(): Promise<ValidationResult> {
  const result: ValidationResult = {
    success: true,
    errors: [],
    warnings: [],
    stats: {
      totalDomains: 0,
      totalTools: 0,
      autoDiscoveredDomains: 0,
      validDomains: 0
    }
  };

  try {
    console.log('Initializing registry...');
    await initializeRegistry();

    const domains = getAllDomains();
    const tools = getAllToolDefinitions();
    const validation = validateAllTools();

    result.stats.totalDomains = domains.length;
    result.stats.totalTools = tools.length;
    result.stats.autoDiscoveredDomains = domains.filter(d => d.autoDiscovered).length;

    // Check registry validation
    if (!validation.valid) {
      result.errors.push(...validation.errors);
    }

    // Validate each domain has tools
    for (const domain of domains) {
      const domainTools = tools.filter(t => t.metadata?.domain === domain.name);
      if (domainTools.length === 0) {
        result.warnings.push(`Domain '${domain.name}' has no registered tools`);
      } else {
        result.stats.validDomains++;
      }
    }

    // Check for critical domains
    const criticalDomains = ['certificates', 'dns', 'property', 'fastpurge'];
    for (const criticalDomain of criticalDomains) {
      const domain = domains.find(d => d.name === criticalDomain);
      if (!domain) {
        result.errors.push(`Critical domain '${criticalDomain}' not found in registry`);
      } else if (!domain.autoDiscovered) {
        result.warnings.push(`Critical domain '${criticalDomain}' is not auto-discovered`);
      }
    }

    // Validate tool naming conventions
    for (const tool of tools) {
      if (!tool.name.match(/^[a-z0-9_]+$/)) {
        result.errors.push(`Tool '${tool.name}' has invalid name format (should be lowercase_with_underscores)`);
      }

      if (!tool.metadata?.domain) {
        result.errors.push(`Tool '${tool.name}' missing domain metadata`);
      }

      if (!tool.handler || typeof tool.handler !== 'function') {
        result.errors.push(`Tool '${tool.name}' missing or invalid handler`);
      }
    }

  } catch (error) {
    result.errors.push(`Registry validation failed: ${error}`);
  }

  result.success = result.errors.length === 0;
  return result;
}

/**
 * Main validation function
 */
async function main() {
  console.log('🔍 Validating Domain Architecture...\n');

  const domainsPath = join(__dirname, '../src/tools');
  
  // 1. Validate domain file structure
  console.log('📁 Checking domain structure...');
  const structureResult = validateDomainStructure(domainsPath);
  
  // 2. Validate registry functionality
  console.log('⚙️ Validating registry...');
  const registryResult = await validateRegistry();

  // 3. Combine results
  const allErrors = [...structureResult.errors, ...registryResult.errors];
  const allWarnings = [...structureResult.warnings, ...registryResult.warnings];

  // 4. Display results
  console.log('\n📊 Validation Results:');
  console.log(`   Domains Found: ${structureResult.stats.totalDomains}`);
  console.log(`   Auto-Discovered: ${registryResult.stats.autoDiscoveredDomains}`);
  console.log(`   Valid Domains: ${Math.max(structureResult.stats.validDomains, registryResult.stats.validDomains)}`);
  console.log(`   Total Tools: ${registryResult.stats.totalTools}`);

  if (allWarnings.length > 0) {
    console.log('\n⚠️ Warnings:');
    allWarnings.forEach(warning => console.log(`   • ${warning}`));
  }

  if (allErrors.length > 0) {
    console.log('\n❌ Errors:');
    allErrors.forEach(error => console.log(`   • ${error}`));
    console.log('\n💥 Domain validation failed!');
    process.exit(1);
  }

  console.log('\n✅ Domain architecture validation passed!');
  
  // Additional insights
  const coverage = (registryResult.stats.validDomains / registryResult.stats.totalDomains) * 100;
  console.log(`📈 Architecture Compliance: ${coverage.toFixed(1)}%`);
  
  if (coverage < 80) {
    console.log('⚠️ Architecture compliance below 80%. Consider improving domain structure.');
    process.exit(1);
  }

  console.log('🎉 All validations passed! Architecture is compliant.');
}

// Run validation
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Validation script failed:', error);
    process.exit(1);
  });
}