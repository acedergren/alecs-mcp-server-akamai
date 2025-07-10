/**
 * Generate From API Command
 * 
 * Generate domains and tools from OpenAPI specifications
 * 
 * CODE KAI PRINCIPLES APPLIED:
 * Key: CLI-driven OpenAPI code generation
 * Approach: Interactive commands for generating from API specs
 * Implementation: Complete workflow from spec to implementation
 */

import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { EnhancedDomainGenerator } from '../generators/enhanced-domain-generator';
import { ToolMethodGenerator } from '../generators/tool-method-generator';
import { ToolUpdateDetector } from '../utils/tool-update-detector';
import { CodeMigrator } from '../utils/code-migrator';
import { APIDefinitionDownloader } from '../utils/api-definition-downloader';
import { createLogger } from '../../utils/pino-logger';

const logger = createLogger('generate-from-api-command');

/**
 * Create generate from API command
 */
export function createGenerateFromAPICommand(): Command {
  const command = new Command('generate-from-api')
    .description('Generate domains and tools from OpenAPI specifications')
    .option('-d, --domain <name>', 'Domain name to generate')
    .option('-a, --api <name>', 'API name (e.g., property-manager, edgeworkers)')
    .option('-v, --version <version>', 'API version (default: v1)', 'v1')
    .option('--spec <path>', 'Path to OpenAPI specification file')
    .option('--download', 'Download API spec from GitHub if not found locally')
    .option('--include-tests', 'Generate test files')
    .option('--customer <id>', 'Default customer ID for tools')
    .option('--dry-run', 'Show what would be generated without creating files')
    .action(async (options) => {
      try {
        if (!options.domain) {
          // Interactive mode
          await interactiveGeneration(options);
        } else {
          // Direct generation
          await generateDomain(options);
        }
      } catch (error) {
        logger.error({ error }, 'Command failed');
        console.error(chalk.red('Error:'), error);
        process.exit(1);
      }
    });
  
  // Add subcommands
  command
    .command('update')
    .description('Update existing tools when API spec changes')
    .argument('<domain>', 'Domain to update')
    .option('--spec <path>', 'Path to new OpenAPI specification')
    .option('--download', 'Download latest spec from GitHub')
    .option('--dry-run', 'Show changes without applying them')
    .action(async (domain, options) => {
      await updateExistingTools(domain, options);
    });
  
  command
    .command('migrate')
    .description('Migrate hardcoded tools to OpenAPI-driven implementation')
    .argument('<domain>', 'Domain to migrate')
    .option('--spec <path>', 'Path to OpenAPI specification')
    .option('--backup', 'Create backup before migration')
    .option('--dry-run', 'Show migration plan without applying')
    .action(async (domain, options) => {
      await migrateHardcodedTools(domain, options);
    });
  
  command
    .command('add-method')
    .description('Add new methods to existing tool from API spec')
    .argument('<domain>', 'Domain name')
    .argument('<operation-id>', 'OpenAPI operation ID to add')
    .option('--spec <path>', 'Path to OpenAPI specification')
    .option('--update-schemas', 'Update schemas file with new types')
    .action(async (domain, operationId, options) => {
      await addMethodToTool(domain, operationId, options);
    });
  
  return command;
}

/**
 * Interactive generation flow
 */
async function interactiveGeneration(options: any): Promise<void> {
  console.log(chalk.cyan('\n🚀 OpenAPI-Driven Domain Generation\n'));
  
  // Get available APIs
  const downloader = new APIDefinitionDownloader();
  const spinner = ora('Fetching available APIs...').start();
  
  try {
    const apis = await downloader.listAvailableAPIs();
    spinner.succeed('Loaded available APIs');
    
    // Interactive prompts
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'domain',
        message: 'Domain name:',
        validate: (input: string) => /^[a-z-]+$/.test(input) || 'Use lowercase letters and hyphens only'
      },
      {
        type: 'list',
        name: 'api',
        message: 'Select API to use:',
        choices: [
          ...apis.map(api => ({
            name: `${api.name} (${api.version})`,
            value: api.name
          })),
          { name: 'Custom (provide spec file)', value: 'custom' }
        ]
      },
      {
        type: 'input',
        name: 'specPath',
        message: 'Path to OpenAPI spec file:',
        when: (answers: any) => answers.api === 'custom',
        validate: (input: string) => input.length > 0 || 'Please provide a spec file path'
      },
      {
        type: 'confirm',
        name: 'download',
        message: 'Download API spec from GitHub?',
        when: (answers: any) => answers.api !== 'custom',
        default: true
      },
      {
        type: 'confirm',
        name: 'includeTests',
        message: 'Generate test files?',
        default: true
      },
      {
        type: 'input',
        name: 'customer',
        message: 'Default customer ID:',
        default: 'default'
      }
    ]);
    
    // Generate domain
    await generateDomain({
      domain: answers.domain,
      api: answers.api === 'custom' ? undefined : answers.api,
      spec: answers.specPath,
      download: answers.download,
      includeTests: answers.includeTests,
      customer: answers.customer,
      ...options
    });
    
  } catch (error) {
    spinner.fail('Failed to load APIs');
    throw error;
  }
}

/**
 * Generate domain
 */
async function generateDomain(options: any): Promise<void> {
  const generator = new EnhancedDomainGenerator();
  const spinner = ora(`Generating domain '${options.domain}'...`).start();
  
  try {
    await generator.generateDomain(options.domain, {
      apiName: options.api,
      apiVersion: options.version,
      specPath: options.spec,
      downloadSpec: options.download,
      includeTests: options.includeTests,
      customerId: options.customer,
      dryRun: options.dryRun
    });
    
    spinner.succeed(`Domain '${options.domain}' generated successfully!`);
    
  } catch (error) {
    spinner.fail(`Failed to generate domain '${options.domain}'`);
    throw error;
  }
}

/**
 * Update existing tools
 */
async function updateExistingTools(domain: string, options: any): Promise<void> {
  const detector = new ToolUpdateDetector();
  const spinner = ora(`Checking for updates in '${domain}' domain...`).start();
  
  try {
    // Get spec path
    let specPath = options.spec;
    if (!specPath && options.download) {
      const downloader = new APIDefinitionDownloader();
      const spec = await downloader.getAPIDefinition(domain, 'v1');
      if (spec) {
        specPath = `docs/api/${domain}/openapi.json`;
      }
    }
    
    if (!specPath) {
      throw new Error('No API specification found. Use --spec or --download');
    }
    
    // Check for changes
    const toolPath = `src/tools/${domain}/${domain}-tools.ts`;
    const changes = await detector.detectChanges(specPath, toolPath);
    
    spinner.succeed('Analysis complete');
    
    // Display changes
    console.log(chalk.cyan(`\n📊 Changes detected for ${domain}:\n`));
    
    if (changes.changes.length === 0) {
      console.log(chalk.green('✅ No changes detected - tools are up to date!'));
      return;
    }
    
    // Group changes by type
    const grouped = changes.changes.reduce((acc, change) => {
      if (!acc[change.type]) acc[change.type] = [];
      acc[change.type]!.push(change);
      return acc;
    }, {} as Record<string, typeof changes.changes>);
    
    Object.entries(grouped).forEach(([type, items]) => {
      console.log(chalk.yellow(`\n${type.toUpperCase()} (${items.length}):`));
      items.forEach(item => {
        console.log(`  • ${item.category}: ${item.path}`);
        if (item.details && item.details['summary']) {
          console.log(`    ${chalk.gray(item.details['summary'] as string)}`);
        }
      });
    });
    
    // Show recommendations
    if (changes.recommendations.length > 0) {
      console.log(chalk.cyan('\n💡 Recommendations:\n'));
      changes.recommendations.forEach(rec => {
        const icon = rec.severity === 'high' ? '🚨' : 
                    rec.severity === 'medium' ? '⚠️' : 'ℹ️';
        console.log(`${icon}  ${rec.message}`);
        console.log(chalk.gray(`    → ${rec.action}`));
        if (rec.codeSnippet && !options.dryRun) {
          console.log(chalk.gray('\n    Code snippet:'));
          console.log(rec.codeSnippet);
        }
      });
    }
    
    if (changes.breakingChanges) {
      console.log(chalk.red('\n⚠️  Breaking changes detected!'));
    }
    
    if (!options.dryRun) {
      const { proceed } = await inquirer.prompt([{
        type: 'confirm',
        name: 'proceed',
        message: 'Apply recommended updates?',
        default: !changes.breakingChanges
      }]);
      
      if (proceed) {
        // TODO: Apply updates
        console.log(chalk.yellow('\nAutomatic updates coming soon! For now, apply changes manually.'));
      }
    }
    
  } catch (error) {
    spinner.fail('Update check failed');
    throw error;
  }
}

/**
 * Migrate hardcoded tools
 */
async function migrateHardcodedTools(domain: string, options: any): Promise<void> {
  const migrator = new CodeMigrator();
  const detector = new ToolUpdateDetector();
  const spinner = ora(`Analyzing '${domain}' for migration...`).start();
  
  try {
    const toolPath = `src/tools/${domain}/${domain}-tools.ts`;
    
    // Get spec path
    let specPath = options.spec;
    if (!specPath) {
      specPath = `docs/api/${domain}/openapi.json`;
    }
    
    // Check if hardcoded
    const isHardcoded = await detector.isHardcodedTool(toolPath);
    
    if (!isHardcoded) {
      spinner.succeed('Tool already uses modern patterns!');
      return;
    }
    
    spinner.text = 'Generating migration plan...';
    
    // Generate migration plan
    const plan = await detector.generateMigrationPlan(toolPath, specPath);
    
    spinner.succeed('Migration plan ready');
    
    // Display plan
    console.log(chalk.cyan(`\n📋 Migration Plan for ${domain}:\n`));
    console.log(`Estimated effort: ${chalk.yellow(plan.estimatedEffort.toUpperCase())}`);
    
    console.log('\nSteps:');
    plan.steps.forEach((step: any) => {
      const icon = step.automated ? '🤖' : '👤';
      console.log(`\n${icon} ${step.order}. ${step.description}`);
      if (step.command) {
        console.log(chalk.gray(`   Command: ${step.command}`));
      }
      if (step.guidance) {
        console.log(chalk.gray(`   Guide: ${step.guidance}`));
      }
    });
    
    if (options.dryRun) {
      console.log(chalk.yellow('\n--dry-run specified, no changes made'));
      return;
    }
    
    // Confirm migration
    const { proceed } = await inquirer.prompt([{
      type: 'confirm',
      name: 'proceed',
      message: 'Proceed with migration?',
      default: true
    }]);
    
    if (!proceed) {
      console.log(chalk.gray('Migration cancelled'));
      return;
    }
    
    // Run migration
    const migrationSpinner = ora('Running migration...').start();
    
    const result = await migrator.migrateToolToOpenAPI(toolPath, specPath, {
      backup: options.backup,
      dryRun: false
    });
    
    if (result.success) {
      migrationSpinner.succeed('Migration completed successfully!');
      
      console.log(chalk.green('\n✅ Migration complete!'));
      console.log('\nFiles modified:');
      result.filesModified.forEach(file => {
        console.log(`  • ${file}`);
      });
      
      if (result.backupPaths) {
        console.log('\nBackups created:');
        result.backupPaths.forEach(backup => {
          console.log(`  • ${backup}`);
        });
      }
      
      // Validate migration
      const isValid = await migrator.validateMigration(toolPath);
      if (isValid) {
        console.log(chalk.green('\n✅ Migration validation passed!'));
      } else {
        console.log(chalk.yellow('\n⚠️  Some manual fixes may still be needed'));
      }
      
    } else {
      migrationSpinner.fail('Migration failed');
      if (result.errors.length > 0) {
        console.log(chalk.red('\nErrors:'));
        result.errors.forEach(err => console.log(`  • ${err}`));
      }
    }
    
  } catch (error) {
    spinner.fail('Migration failed');
    throw error;
  }
}

/**
 * Add method to existing tool
 */
async function addMethodToTool(domain: string, operationId: string, options: any): Promise<void> {
  const generator = new ToolMethodGenerator();
  const spinner = ora(`Adding method '${operationId}' to ${domain}...`).start();
  
  try {
    const toolPath = `src/tools/${domain}/${domain}-tools.ts`;
    let specPath = options.spec || `docs/api/${domain}/openapi.json`;
    
    const result = await generator.generateMethod({
      toolPath,
      apiSpecPath: specPath,
      operationId,
      updateSchemas: options.updateSchemas,
      insertPosition: 'before-last-method'
    });
    
    spinner.succeed(`Method '${operationId}' added successfully!`);
    
    console.log(chalk.green('\n✅ Method generated!'));
    
    if (result.imports.length > 0) {
      console.log('\n📦 Required imports:');
      result.imports.forEach(imp => console.log(`  ${imp}`));
    }
    
    console.log('\n🔧 MCP Definition to add:');
    console.log(result.mcpDefinition);
    
    console.log(chalk.cyan('\n💡 Next steps:'));
    console.log('  1. Review the generated method');
    console.log('  2. Add the MCP definition to your tool exports');
    console.log('  3. Update tests for the new method');
    console.log('  4. Run: npm test && npm run build');
    
  } catch (error) {
    spinner.fail(`Failed to add method '${operationId}'`);
    throw error;
  }
}