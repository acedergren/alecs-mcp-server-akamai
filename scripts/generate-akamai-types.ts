#!/usr/bin/env node

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

interface APIConfig {
  name: string;
  url: string;
  outputFile: string;
}

const AKAMAI_APIS: APIConfig[] = [
  {
    name: 'Property Manager (PAPI)',
    url: 'https://raw.githubusercontent.com/akamai/akamai-apis/main/apis/papi/v1/openapi.json',
    outputFile: 'property-manager.ts'
  },
  {
    name: 'Edge DNS',
    url: 'https://raw.githubusercontent.com/akamai/akamai-apis/main/apis/config-dns/v2/openapi.json',
    outputFile: 'edge-dns.ts'
  },
  {
    name: 'Certificate Provisioning System (CPS)',
    url: 'https://raw.githubusercontent.com/akamai/akamai-apis/main/apis/cps/v2/openapi.json',
    outputFile: 'cps.ts'
  },
  {
    name: 'Network Lists',
    url: 'https://raw.githubusercontent.com/akamai/akamai-apis/main/apis/network-lists/v2/openapi.json',
    outputFile: 'network-lists.ts'
  },
  {
    name: 'Application Security',
    url: 'https://raw.githubusercontent.com/akamai/akamai-apis/main/apis/appsec/v1/openapi.json',
    outputFile: 'appsec.ts'
  },
  {
    name: 'Reporting',
    url: 'https://raw.githubusercontent.com/akamai/akamai-apis/main/apis/reporting/v1/openapi.json',
    outputFile: 'reporting.ts'
  },
  {
    name: 'Fast Purge',
    url: 'https://raw.githubusercontent.com/akamai/akamai-apis/main/apis/ccu/v3/openapi.json',
    outputFile: 'fast-purge.ts'
  },
  {
    name: 'Edge Hostnames',
    url: 'https://raw.githubusercontent.com/akamai/akamai-apis/main/apis/hapi/v1/openapi.json',
    outputFile: 'edge-hostnames.ts'
  }
];

async function downloadSpec(url: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(outputPath);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', reject);
  });
}

async function generateTypes(): Promise<void> {
  const specsDir = path.join(process.cwd(), 'openapi-specs');
  const typesDir = path.join(process.cwd(), 'src/types/generated');
  
  // Create directories
  if (!fs.existsSync(specsDir)) {
    fs.mkdirSync(specsDir, { recursive: true });
  }
  if (!fs.existsSync(typesDir)) {
    fs.mkdirSync(typesDir, { recursive: true });
  }
  
  console.log('🔄 Generating Akamai API Types...\n');
  
  for (const api of AKAMAI_APIS) {
    console.log(`📦 Processing ${api.name}...`);
    
    try {
      const specPath = path.join(specsDir, `${api.outputFile.replace('.ts', '.json')}`);
      const outputPath = path.join(typesDir, api.outputFile);
      
      // Download spec if it doesn't exist
      if (!fs.existsSync(specPath)) {
        console.log(`   ⬇️  Downloading OpenAPI spec...`);
        await downloadSpec(api.url, specPath);
      }
      
      // Generate TypeScript types
      console.log(`   🔨 Generating TypeScript types...`);
      execSync(
        `npx openapi-typescript ${specPath} -o ${outputPath} --export-type --alphabetize`,
        { stdio: 'pipe' }
      );
      
      // Add header to generated file
      const content = fs.readFileSync(outputPath, 'utf8');
      const header = `/**
 * Generated from Akamai ${api.name} OpenAPI Specification
 * DO NOT EDIT MANUALLY
 * 
 * Generated on: ${new Date().toISOString()}
 * Source: ${api.url}
 */

`;
      fs.writeFileSync(outputPath, header + content);
      
      console.log(`   ✅ Generated: ${path.relative(process.cwd(), outputPath)}\n`);
    } catch (error) {
      console.error(`   ❌ Error processing ${api.name}:`, error.message);
      console.log();
    }
  }
  
  // Generate index file
  const indexPath = path.join(typesDir, 'index.ts');
  const indexContent = `/**
 * Akamai API Types Index
 * Auto-generated from OpenAPI specifications
 */

${AKAMAI_APIS.map(api => {
  const moduleName = api.outputFile.replace('.ts', '');
  const exportName = moduleName.replace(/-/g, '_').toUpperCase();
  return `export * as ${exportName}_TYPES from './${moduleName}';`;
}).join('\n')}

// Re-export commonly used types for convenience
export type { paths as PropertyManagerPaths } from './property-manager';
export type { paths as EdgeDNSPaths } from './edge-dns';
export type { paths as CPSPaths } from './cps';
export type { paths as NetworkListsPaths } from './network-lists';
export type { paths as AppSecPaths } from './appsec';
export type { paths as ReportingPaths } from './reporting';
export type { paths as FastPurgePaths } from './fast-purge';
export type { paths as EdgeHostnamesPaths } from './edge-hostnames';
`;
  
  fs.writeFileSync(indexPath, indexContent);
  console.log(`📝 Generated index file: ${path.relative(process.cwd(), indexPath)}`);
  
  // Generate validation utilities
  const validationPath = path.join(typesDir, 'validation.ts');
  const validationContent = `/**
 * Type validation utilities for Akamai API responses
 */

import type { paths as PropertyManagerPaths } from './property-manager';
import type { paths as EdgeDNSPaths } from './edge-dns';

// Type guard generators
export function createTypeGuard<T>(validator: (value: unknown) => value is T) {
  return validator;
}

// Response type extractors
export type ExtractResponse<
  TPath extends keyof PropertyManagerPaths,
  TMethod extends keyof PropertyManagerPaths[TPath],
  TStatus extends keyof PropertyManagerPaths[TPath][TMethod]['responses'] = 200
> = PropertyManagerPaths[TPath][TMethod]['responses'][TStatus] extends { content: { 'application/json': infer R } }
  ? R
  : never;

export type ExtractDNSResponse<
  TPath extends keyof EdgeDNSPaths,
  TMethod extends keyof EdgeDNSPaths[TPath],
  TStatus extends keyof EdgeDNSPaths[TPath][TMethod]['responses'] = 200
> = EdgeDNSPaths[TPath][TMethod]['responses'][TStatus] extends { content: { 'application/json': infer R } }
  ? R
  : never;

// Runtime validation helpers
export function isApiResponse<T>(
  value: unknown,
  validator: (v: unknown) => v is T
): value is T {
  return validator(value);
}
`;
  
  fs.writeFileSync(validationPath, validationContent);
  console.log(`📝 Generated validation utilities: ${path.relative(process.cwd(), validationPath)}`);
  
  console.log('\n✅ Type generation complete!');
  
  // Run type check to see current status
  console.log('\n🔍 Running type check...');
  try {
    execSync('npm run type:errors', { stdio: 'inherit' });
  } catch {
    // Ignore errors
  }
}

// Run the generator
generateTypes().catch(console.error);