/**
 * API Definition Downloader
 * 
 * Downloads Akamai API OpenAPI specifications from GitHub when not available locally
 * 
 * CODE KAI PRINCIPLES APPLIED:
 * Key: Automatic API spec synchronization
 * Approach: Cache-first with online fallback
 * Implementation: Download and cache OpenAPI specs from Akamai's GitHub repository
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import axios from 'axios';
import { createLogger } from '../../utils/pino-logger';

const logger = createLogger('api-definition-downloader');

interface APIDefinition {
  name: string;
  version: string;
  path: string;
  url: string;
}

/**
 * API Definition Downloader
 */
export class APIDefinitionDownloader {
  private readonly baseUrl = 'https://raw.githubusercontent.com/akamai/akamai-apis/main/apis';
  private readonly localPath: string;
  private readonly cacheDir: string;
  
  constructor(localPath: string = 'docs/api') {
    this.localPath = localPath;
    this.cacheDir = join(process.cwd(), this.localPath);
  }
  
  /**
   * Get API definition, downloading if necessary
   */
  async getAPIDefinition(apiName: string, version: string = 'v1'): Promise<string | null> {
    const localFile = join(this.cacheDir, apiName, `${apiName}-${version}.openapi.json`);
    
    // Check if file exists locally
    if (await this.fileExists(localFile)) {
      logger.info({ apiName, version, source: 'local' }, 'Using local API definition');
      return fs.readFile(localFile, 'utf-8');
    }
    
    // Download from GitHub
    logger.info({ apiName, version }, 'Downloading API definition from GitHub');
    try {
      const definition = await this.downloadDefinition(apiName, version);
      if (definition) {
        await this.saveDefinition(apiName, version, definition);
        return definition;
      }
    } catch (error) {
      logger.error({ error, apiName, version }, 'Failed to download API definition');
    }
    
    return null;
  }
  
  /**
   * Download API definition from GitHub
   */
  private async downloadDefinition(apiName: string, version: string): Promise<string | null> {
    // Common API name mappings
    const apiMappings: Record<string, string> = {
      'edgeworkers': 'edgeworkers',
      'edge-workers': 'edgeworkers',
      'cloudlets': 'cloudlets',
      'property-manager': 'papi',
      'properties': 'papi',
      'edge-dns': 'config-dns',
      'dns': 'config-dns',
      'certificates': 'cps',
      'network-lists': 'network-lists',
      'security': 'appsec',
      'fast-purge': 'ccu',
      'purge': 'ccu',
      'billing': 'billing',
      'reporting': 'reporting',
      'gtm': 'config-gtm',
      'diagnostics': 'diagnostic-tools',
      'image-manager': 'imaging',
      'contracts': 'contracts',
      'identity': 'identity-management'
    };
    
    const mappedName = apiMappings[apiName.toLowerCase()] || apiName;
    
    // Try different URL patterns
    const urlPatterns = [
      `${this.baseUrl}/${mappedName}/${version}/${mappedName}.openapi.json`,
      `${this.baseUrl}/${mappedName}/${mappedName}-${version}.openapi.json`,
      `${this.baseUrl}/${mappedName}/openapi.json`,
      `${this.baseUrl}/${mappedName}/${version}/openapi.json`
    ];
    
    for (const url of urlPatterns) {
      try {
        logger.debug({ url }, 'Trying URL');
        const response = await axios.get(url, {
          timeout: 10000,
          validateStatus: (status) => status === 200
        });
        
        if (response.data) {
          logger.info({ url, apiName, version }, 'Successfully downloaded API definition');
          return JSON.stringify(response.data, null, 2);
        }
      } catch (error) {
        // Continue to next URL pattern
        logger.debug({ url, error: (error as any).message }, 'URL failed, trying next');
      }
    }
    
    return null;
  }
  
  /**
   * Save API definition locally
   */
  private async saveDefinition(apiName: string, version: string, content: string): Promise<void> {
    const dir = join(this.cacheDir, apiName);
    const file = join(dir, `${apiName}-${version}.openapi.json`);
    
    try {
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(file, content, 'utf-8');
      logger.info({ file }, 'Saved API definition locally');
    } catch (error) {
      logger.error({ error, file }, 'Failed to save API definition');
    }
  }
  
  /**
   * List available APIs from GitHub
   */
  async listAvailableAPIs(): Promise<APIDefinition[]> {
    const indexUrl = 'https://api.github.com/repos/akamai/akamai-apis/contents/apis';
    
    try {
      const response = await axios.get(indexUrl, {
        headers: {
          'Accept': 'application/vnd.github.v3+json'
        },
        timeout: 10000
      });
      
      if (Array.isArray(response.data)) {
        const apis: APIDefinition[] = [];
        
        for (const item of response.data) {
          if (item.type === 'dir') {
            apis.push({
              name: item.name,
              version: 'v1', // Default version
              path: item.path,
              url: item.html_url
            });
          }
        }
        
        return apis;
      }
    } catch (error) {
      logger.error({ error }, 'Failed to list available APIs');
    }
    
    return [];
  }
  
  /**
   * Download all API definitions
   */
  async downloadAllDefinitions(): Promise<void> {
    const apis = await this.listAvailableAPIs();
    logger.info({ count: apis.length }, 'Found APIs to download');
    
    let downloaded = 0;
    let failed = 0;
    
    for (const api of apis) {
      const definition = await this.getAPIDefinition(api.name, api.version);
      if (definition) {
        downloaded++;
      } else {
        failed++;
      }
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    logger.info({ downloaded, failed, total: apis.length }, 'Download complete');
  }
  
  /**
   * Check if file exists
   */
  private async fileExists(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Get cached API definitions
   */
  async getCachedDefinitions(): Promise<APIDefinition[]> {
    const definitions: APIDefinition[] = [];
    
    try {
      const dirs = await fs.readdir(this.cacheDir, { withFileTypes: true });
      
      for (const dir of dirs) {
        if (dir.isDirectory()) {
          const apiDir = join(this.cacheDir, dir.name);
          const files = await fs.readdir(apiDir);
          
          for (const file of files) {
            if (file.endsWith('.openapi.json')) {
              const match = file.match(/^(.+)-v(\d+)\.openapi\.json$/);
              if (match && match[1] && match[2]) {
                definitions.push({
                  name: match[1],
                  version: `v${match[2]}`,
                  path: join(apiDir, file),
                  url: `file://${join(apiDir, file)}`
                });
              }
            }
          }
        }
      }
    } catch (error) {
      logger.error({ error }, 'Failed to get cached definitions');
    }
    
    return definitions;
  }
}