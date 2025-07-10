/**
 * Enhanced Domain Generator
 * 
 * Generates complete domain with OpenAPI-driven implementation
 * 
 * CODE KAI PRINCIPLES APPLIED:
 * Key: Automated domain generation from API specifications
 * Approach: Combine template generation with OpenAPI parsing
 * Implementation: Full domain scaffolding with automatic API integration
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { createLogger } from '../../utils/pino-logger';
import { validateDomainName, toPascalCase, toSnakeCase } from '../utils/naming';
import { APIDefinitionDownloader } from '../utils/api-definition-downloader';
import { APIImplementationGenerator } from './api-implementation-generator';
import { getDomainTemplate } from '../templates/domain-template';
import { getIndexTemplate } from '../templates/index-template';

const logger = createLogger('enhanced-domain-generator');

/**
 * Enhanced domain generation options
 */
export interface EnhancedDomainGeneratorOptions {
  description?: string;
  apiName?: string;
  apiVersion?: string;
  downloadSpec?: boolean;
  specPath?: string;
  includeTests?: boolean;
  customerId?: string;
  dryRun?: boolean;
}

/**
 * Enhanced Domain Generator
 */
export class EnhancedDomainGenerator {
  private downloader = new APIDefinitionDownloader();
  private apiGenerator = new APIImplementationGenerator();
  
  /**
   * Generate domain with OpenAPI support
   */
  async generateDomain(name: string, options: EnhancedDomainGeneratorOptions = {}): Promise<void> {
    // Validate domain name
    validateDomainName(name);
    
    const domainName = name.toLowerCase();
    const domainPath = join(process.cwd(), 'src', 'tools', domainName);
    
    logger.info({ domainName, domainPath }, 'Generating enhanced domain');
    
    // Check if domain already exists
    try {
      await fs.access(domainPath);
      if (!options.dryRun) {
        throw new Error(`Domain '${domainName}' already exists at ${domainPath}`);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
    
    // Get API specification
    const apiSpecPath = await this.getAPISpecification(domainName, options);
    
    if (apiSpecPath) {
      // Generate using OpenAPI
      await this.generateFromOpenAPI(domainName, apiSpecPath, options);
    } else {
      // Fallback to template generation
      await this.generateFromTemplate(domainName, options);
    }
    
    // Update tools registry
    if (!options.dryRun) {
      await this.updateToolsRegistry(domainName);
    }
    
    // Show completion message
    this.showCompletionMessage(domainName, apiSpecPath !== null, options);
  }
  
  /**
   * Get API specification path
   */
  private async getAPISpecification(
    domainName: string,
    options: EnhancedDomainGeneratorOptions
  ): Promise<string | null> {
    // If spec path provided, use it
    if (options.specPath) {
      try {
        await fs.access(options.specPath);
        return options.specPath;
      } catch {
        logger.warn({ specPath: options.specPath }, 'Provided spec path not found');
      }
    }
    
    // Check if local spec exists
    const localSpecPath = join(process.cwd(), 'docs', 'api', options.apiName || domainName, 'openapi.json');
    try {
      await fs.access(localSpecPath);
      logger.info({ localSpecPath }, 'Using local API specification');
      return localSpecPath;
    } catch {
      // Not found locally
    }
    
    // Download spec if requested
    if (options.downloadSpec) {
      const apiName = options.apiName || domainName;
      const version = options.apiVersion || 'v1';
      
      logger.info({ apiName, version }, 'Downloading API specification');
      const spec = await this.downloader.getAPIDefinition(apiName, version);
      
      if (spec) {
        return join(process.cwd(), 'docs', 'api', apiName, 'openapi.json');
      }
    }
    
    return null;
  }
  
  /**
   * Generate domain from OpenAPI specification
   */
  private async generateFromOpenAPI(
    domainName: string,
    apiSpecPath: string,
    options: EnhancedDomainGeneratorOptions
  ): Promise<void> {
    const domainPath = join(process.cwd(), 'src', 'tools', domainName);
    
    logger.info({ domainName, apiSpecPath }, 'Generating domain from OpenAPI');
    
    if (options.dryRun) {
      console.log('\n=== DRY RUN - OpenAPI Generation ===');
      console.log(`Domain: ${domainName}`);
      console.log(`API Spec: ${apiSpecPath}`);
      console.log(`Output: ${domainPath}`);
      console.log('\nWould generate:');
      console.log('- Complete tool implementation from API endpoints');
      console.log('- Zod schemas for all API models');
      console.log('- Type-safe interfaces');
      console.log('- MCP tool definitions');
      console.log('- Comprehensive test suite');
      return;
    }
    
    // Generate implementation
    const generatedFiles = await this.apiGenerator.generateImplementation({
      domainName,
      apiSpecPath,
      outputDir: domainPath,
      includeTests: options.includeTests,
      customerId: options.customerId
    });
    
    logger.info({ generatedFiles }, 'Generated domain from OpenAPI');
  }
  
  /**
   * Generate domain from template (fallback)
   */
  private async generateFromTemplate(
    domainName: string,
    options: EnhancedDomainGeneratorOptions
  ): Promise<void> {
    const domainPath = join(process.cwd(), 'src', 'tools', domainName);
    
    logger.info({ domainName }, 'Generating domain from template');
    
    // Prepare template variables
    const templateVars = {
      domainName,
      domainNamePascal: toPascalCase(domainName),
      domainNameSnake: toSnakeCase(domainName),
      description: options.description || `${toPascalCase(domainName)} domain tools`,
      apiName: options.apiName || domainName.toUpperCase(),
      timestamp: new Date().toISOString(),
    };
    
    // Import existing templates
    const { getConsolidatedToolTemplate } = await import('../templates/consolidated-tool-template');
    
    // Generate file contents
    const files = [
      {
        path: join(domainPath, 'index.ts'),
        content: getIndexTemplate(templateVars),
      },
      {
        path: join(domainPath, `${domainName}-tools.ts`),
        content: getConsolidatedToolTemplate(templateVars),
      },
      {
        path: join(domainPath, 'README.md'),
        content: getDomainTemplate(templateVars),
      },
    ];
    
    if (options.dryRun) {
      console.log('\n=== DRY RUN - Template Generation ===');
      files.forEach(file => {
        console.log(`\n📄 ${file.path}`);
        console.log('─'.repeat(50));
        console.log(file.content.substring(0, 200) + '...');
      });
      return;
    }
    
    // Create domain directory
    await fs.mkdir(domainPath, { recursive: true });
    
    // Write files
    for (const file of files) {
      await fs.writeFile(file.path, file.content, 'utf8');
      logger.info({ path: file.path }, 'Created file');
    }
  }
  
  /**
   * Update tools registry
   */
  private async updateToolsRegistry(domainName: string): Promise<void> {
    const registryPath = join(process.cwd(), 'src', 'tools', 'all-tools-registry.ts');
    
    try {
      const registryContent = await fs.readFile(registryPath, 'utf8');
      
      // Check if already imported
      const importStatement = `import { ${domainName}ToolDefinitions } from './${domainName}';`;
      if (registryContent.includes(importStatement)) {
        logger.info('Domain already in registry');
        return;
      }
      
      // Add import statement
      const importRegex = /^(import.*from.*';)$/gm;
      const imports = registryContent.match(importRegex) || [];
      
      const lastImport = imports[imports.length - 1];
      if (!lastImport) {
        logger.warn('No imports found in registry file');
        return;
      }
      
      let updatedContent = registryContent.replace(
        lastImport,
        `${lastImport}\n${importStatement}`
      );
      
      // Add to tool loading section
      const toolLoadingRegex = /(\s+\/\/ TODO: Add new domains here)/;
      const toolLoadingReplacement = `  // ${toPascalCase(domainName)} Tools\n  Object.entries(${domainName}ToolDefinitions).forEach(([name, definition]) => {\n    allTools.push({\n      name,\n      ...definition\n    });\n  });\n\n$1`;
      
      updatedContent = updatedContent.replace(toolLoadingRegex, toolLoadingReplacement);
      
      await fs.writeFile(registryPath, updatedContent, 'utf8');
      logger.info('Updated all-tools-registry.ts');
      
    } catch (error) {
      logger.warn({ error }, 'Failed to update tools registry - manual update required');
    }
  }
  
  /**
   * Show completion message
   */
  private showCompletionMessage(
    domainName: string,
    fromOpenAPI: boolean,
    options: EnhancedDomainGeneratorOptions
  ): void {
    if (options.dryRun) {
      console.log('\n✅ Dry run completed successfully!');
      return;
    }
    
    console.log(`\n✅ Domain '${domainName}' generated successfully!`);
    
    if (fromOpenAPI) {
      console.log('\n🎉 Generated from OpenAPI specification:');
      console.log('   - Type-safe tool implementations');
      console.log('   - Zod schemas for runtime validation');
      console.log('   - MCP tool definitions');
      if (options.includeTests) {
        console.log('   - Comprehensive test suite');
      }
    } else {
      console.log('\n📝 Generated from template - manual implementation required');
    }
    
    console.log(`\n📂 Domain location: src/tools/${domainName}/`);
    console.log(`\n🚀 Next steps:`);
    
    if (fromOpenAPI) {
      console.log(`   1. Review generated implementations`);
      console.log(`   2. Run tests: npm test -- ${domainName}`);
      console.log(`   3. Build server: npm run build`);
      console.log(`   4. Test with Claude Desktop`);
    } else {
      console.log(`   1. Implement API client methods in ${domainName}-tools.ts`);
      console.log(`   2. Add Zod schemas for validation`);
      console.log(`   3. Write tests for your implementations`);
      console.log(`   4. Run: npm test && npm run build`);
    }
  }
}