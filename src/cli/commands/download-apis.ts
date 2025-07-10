/**
 * Download APIs Command
 * 
 * Downloads Akamai API OpenAPI specifications from GitHub
 * 
 * CODE KAI PRINCIPLES APPLIED:
 * Key: Easy API spec management
 * Approach: Interactive CLI for downloading API definitions
 * Implementation: Download single or all API specs with progress tracking
 */

import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import { APIDefinitionDownloader } from '../utils/api-definition-downloader';
import { createLogger } from '../../utils/pino-logger';

const logger = createLogger('download-apis-command');

/**
 * Create download APIs command
 */
export function createDownloadAPIsCommand(): Command {
  const command = new Command('download-apis')
    .description('Download Akamai API definitions from GitHub')
    .option('-a, --api <name>', 'Download specific API (e.g., edgeworkers, cloudlets)')
    .option('-v, --version <version>', 'API version (default: v1)', 'v1')
    .option('--all', 'Download all available API definitions')
    .option('--list', 'List available APIs')
    .option('--cached', 'List cached API definitions')
    .action(async (options) => {
      const downloader = new APIDefinitionDownloader();
      
      try {
        // List available APIs
        if (options.list) {
          await listAvailableAPIs(downloader);
          return;
        }
        
        // List cached APIs
        if (options.cached) {
          await listCachedAPIs(downloader);
          return;
        }
        
        // Download all APIs
        if (options.all) {
          await downloadAllAPIs(downloader);
          return;
        }
        
        // Download specific API
        if (options.api) {
          await downloadSpecificAPI(downloader, options.api, options.version);
          return;
        }
        
        // Show help if no option specified
        console.log(chalk.yellow('Please specify an option:'));
        console.log('  --api <name>  Download specific API');
        console.log('  --all         Download all APIs');
        console.log('  --list        List available APIs');
        console.log('  --cached      List cached APIs');
        console.log('\nExample: alecs download-apis --api edgeworkers');
        
      } catch (error) {
        logger.error({ error }, 'Command failed');
        console.error(chalk.red('Error:'), error);
        process.exit(1);
      }
    });
  
  return command;
}

/**
 * List available APIs from GitHub
 */
async function listAvailableAPIs(downloader: APIDefinitionDownloader): Promise<void> {
  const spinner = ora('Fetching available APIs from GitHub...').start();
  
  try {
    const apis = await downloader.listAvailableAPIs();
    spinner.succeed(`Found ${apis.length} available APIs`);
    
    console.log('\n📚 Available Akamai APIs:\n');
    
    // Group by category
    const categories: Record<string, typeof apis> = {
      'Core CDN': [],
      'Security': [],
      'Edge Compute': [],
      'DNS & Traffic': [],
      'Monitoring': [],
      'Other': []
    };
    
    apis.forEach(api => {
      const coreCdn = categories['Core CDN'] || [];
      const security = categories['Security'] || [];
      const edgeCompute = categories['Edge Compute'] || [];
      const dnsTraffic = categories['DNS & Traffic'] || [];
      const monitoring = categories['Monitoring'] || [];
      const other = categories['Other'] || [];
      
      if (['papi', 'property-manager'].includes(api.name)) {
        coreCdn.push(api);
      } else if (['appsec', 'network-lists', 'bot-manager'].includes(api.name)) {
        security.push(api);
      } else if (['edgeworkers', 'cloudlets'].includes(api.name)) {
        edgeCompute.push(api);
      } else if (['config-dns', 'config-gtm'].includes(api.name)) {
        dnsTraffic.push(api);
      } else if (['diagnostic-tools', 'reporting'].includes(api.name)) {
        monitoring.push(api);
      } else {
        other.push(api);
      }
    });
    
    Object.entries(categories).forEach(([category, categoryApis]) => {
      if (categoryApis.length > 0) {
        console.log(chalk.cyan(`${category}:`));
        categoryApis.forEach(api => {
          console.log(`  • ${chalk.green(api.name)}`);
        });
        console.log();
      }
    });
    
    console.log(chalk.gray(`\nUse ${chalk.white('alecs download-apis --api <name>')} to download a specific API`));
    
  } catch (error) {
    spinner.fail('Failed to fetch available APIs');
    throw error;
  }
}

/**
 * List cached API definitions
 */
async function listCachedAPIs(downloader: APIDefinitionDownloader): Promise<void> {
  const spinner = ora('Reading cached API definitions...').start();
  
  try {
    const cached = await downloader.getCachedDefinitions();
    spinner.succeed(`Found ${cached.length} cached API definitions`);
    
    if (cached.length === 0) {
      console.log(chalk.yellow('\nNo cached API definitions found.'));
      console.log(chalk.gray(`Use ${chalk.white('alecs download-apis --all')} to download all APIs`));
      return;
    }
    
    console.log('\n💾 Cached API Definitions:\n');
    
    cached.forEach(api => {
      console.log(`• ${chalk.green(api.name)} ${chalk.gray(api.version)}`);
      console.log(`  ${chalk.gray(api.path)}`);
    });
    
  } catch (error) {
    spinner.fail('Failed to read cached APIs');
    throw error;
  }
}

/**
 * Download all available APIs
 */
async function downloadAllAPIs(downloader: APIDefinitionDownloader): Promise<void> {
  const spinner = ora('Preparing to download all API definitions...').start();
  
  try {
    spinner.text = 'Downloading API definitions from GitHub...';
    await downloader.downloadAllDefinitions();
    spinner.succeed('Successfully downloaded all API definitions');
    
    console.log(chalk.green('\n✅ All API definitions downloaded successfully!'));
    console.log(chalk.gray(`\nAPI definitions saved to: ${chalk.white('docs/api/')}`));
    
  } catch (error) {
    spinner.fail('Failed to download all APIs');
    throw error;
  }
}

/**
 * Download specific API definition
 */
async function downloadSpecificAPI(
  downloader: APIDefinitionDownloader, 
  apiName: string, 
  version: string
): Promise<void> {
  const spinner = ora(`Downloading ${apiName} ${version} API definition...`).start();
  
  try {
    const definition = await downloader.getAPIDefinition(apiName, version);
    
    if (definition) {
      spinner.succeed(`Successfully downloaded ${apiName} ${version} API definition`);
      console.log(chalk.green(`\n✅ API definition saved to: docs/api/${apiName}/`));
    } else {
      spinner.fail(`Failed to download ${apiName} ${version} API definition`);
      console.log(chalk.yellow('\nAPI not found. Try listing available APIs:'));
      console.log(chalk.gray(`  ${chalk.white('alecs download-apis --list')}`));
    }
    
  } catch (error) {
    spinner.fail(`Failed to download ${apiName} API`);
    throw error;
  }
}