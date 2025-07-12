/**
 * Backwards Compatibility Module - CODE KAI Implementation
 * 
 * KEY: Zero breaking changes during consolidation
 * APPROACH: Proxy pattern with deprecation warnings
 * IMPLEMENTATION: Transparent migration path
 * 
 * This module ensures all existing code continues to work
 * while guiding developers to the new consolidated APIs
 */

import { createLogger } from '../../utils/pino-logger';

const logger = createLogger('compatibility');

/**
 * Deprecation warning configuration
 */
export interface DeprecationConfig {
  silent?: boolean; // Suppress console warnings
  throwOnDeprecated?: boolean; // Throw error instead of warning
  logToFile?: string; // Log deprecations to file
  customLogger?: (message: string) => void; // Custom logging function
}

/**
 * Global deprecation settings
 */
let globalConfig: DeprecationConfig = {
  silent: process.env['SUPPRESS_DEPRECATION_WARNINGS'] === 'true',
  throwOnDeprecated: process.env['THROW_ON_DEPRECATED'] === 'true',
  logToFile: process.env['DEPRECATION_LOG_FILE'],
};

/**
 * Deprecation tracker for metrics
 */
class DeprecationTracker {
  private calls = new Map<string, {
    count: number;
    firstCalled: Date;
    lastCalled: Date;
    stackTraces: Set<string>;
  }>();
  
  track(oldName: string, newName: string, stackTrace?: string): void {
    const key = `${oldName} -> ${newName}`;
    
    if (!this.calls.has(key)) {
      this.calls.set(key, {
        count: 0,
        firstCalled: new Date(),
        lastCalled: new Date(),
        stackTraces: new Set(),
      });
    }
    
    const record = this.calls.get(key)!;
    record.count++;
    record.lastCalled = new Date();
    
    if (stackTrace) {
      record.stackTraces.add(stackTrace);
    }
  }
  
  getReport(): string {
    const lines: string[] = [
      '=== Deprecation Usage Report ===',
      `Generated: ${new Date().toISOString()}`,
      '',
    ];
    
    // Sort by usage count
    const sorted = Array.from(this.calls.entries())
      .sort(([, a], [, b]) => b.count - a.count);
    
    for (const [migration, data] of sorted) {
      lines.push(`${migration}:`);
      lines.push(`  Called ${data.count} times`);
      lines.push(`  First: ${data.firstCalled.toISOString()}`);
      lines.push(`  Last: ${data.lastCalled.toISOString()}`);
      
      if (data.stackTraces.size > 0) {
        lines.push(`  Unique call sites: ${data.stackTraces.size}`);
      }
      
      lines.push('');
    }
    
    return lines.join('\n');
  }
  
  reset(): void {
    this.calls.clear();
  }
}

const tracker = new DeprecationTracker();

/**
 * Create a deprecation warning
 */
function logDeprecation(
  oldName: string,
  newName: string,
  customMessage?: string
): void {
  const message = customMessage || 
    `DEPRECATION WARNING: ${oldName} is deprecated. Use ${newName} instead.`;
  
  // Get stack trace for tracking
  const stack = new Error().stack;
  const callerLine = stack?.split('\n')[3]; // Skip this function and deprecate()
  
  // Track the deprecation
  tracker.track(oldName, newName, callerLine);
  
  // Handle based on configuration
  if (globalConfig.throwOnDeprecated) {
    throw new Error(message);
  }
  
  if (!globalConfig.silent) {
    if (globalConfig.customLogger) {
      globalConfig.customLogger(message);
    } else {
      logger.warn(`⚠️  ${message}`);
      if (callerLine) {
        logger.warn(`    at ${callerLine.trim()}`);
      }
    }
  }
  
  // Log to file if configured
  if (globalConfig.logToFile) {
    const fs = require('fs');
    const logEntry = `${new Date().toISOString()} - ${message}\n`;
    fs.appendFileSync(globalConfig.logToFile, logEntry);
  }
}

/**
 * Deprecate a function with migration guidance
 */
export function deprecate<T extends (...args: any[]) => any>(
  fn: T,
  oldName: string,
  newName: string,
  customMessage?: string
): T {
  return ((...args: Parameters<T>) => {
    logDeprecation(oldName, newName, customMessage);
    return fn(...args);
  }) as T;
}

/**
 * Deprecate a class with migration guidance
 */
export function deprecateClass<T extends new (...args: any[]) => any>(
  ClassConstructor: T,
  oldName: string,
  newName: string
): T {
  return class extends ClassConstructor {
    constructor(...args: any[]) {
      logDeprecation(oldName, newName, 
        `Class ${oldName} is deprecated. Use ${newName} instead.`);
      super(...args);
    }
  } as T;
}

/**
 * Create a deprecated property accessor
 */
export function deprecateProperty<T>(
  target: T,
  propertyName: keyof T,
  newPath: string
): void {
  const originalValue = target[propertyName];
  
  Object.defineProperty(target, propertyName, {
    get() {
      logDeprecation(
        String(propertyName),
        newPath,
        `Property '${String(propertyName)}' is deprecated. Use '${newPath}' instead.`
      );
      return originalValue;
    },
    set(value) {
      logDeprecation(
        String(propertyName),
        newPath,
        `Property '${String(propertyName)}' is deprecated. Use '${newPath}' instead.`
      );
      (target as any)[propertyName] = value;
    },
  });
}

/**
 * Create a backwards-compatible module proxy
 */
export function createCompatibilityProxy<T extends Record<string, any>>(
  newModule: T,
  migrations: Record<string, string>
): T {
  return new Proxy(newModule, {
    get(target, prop: string) {
      // Check if this is a deprecated name
      if (migrations[prop]) {
        const newName = migrations[prop];
        logDeprecation(prop, newName);
        
        // Return the new implementation
        const parts = newName.split('.');
        let result: any = target;
        
        for (const part of parts) {
          result = result[part];
          if (!result) {
            throw new Error(`Migration target ${newName} not found`);
          }
        }
        
        return result;
      }
      
      // Return the original property
      return target[prop];
    },
  });
}

/**
 * Batch create deprecated aliases
 */
export function createDeprecatedAliases<T extends Record<string, any>>(
  newModule: T,
  aliases: Record<string, { old: string; new: string; message?: string }>
): Record<string, any> {
  const deprecatedModule: Record<string, any> = {};
  
  for (const [, config] of Object.entries(aliases)) {
    const parts = config.new.split('.');
    let target: any = newModule;
    
    // Navigate to the new function
    for (const part of parts) {
      target = target[part];
      if (!target) {
        logger.error(`Warning: Migration target ${config.new} not found`);
        continue;
      }
    }
    
    // Create deprecated wrapper
    if (typeof target === 'function') {
      deprecatedModule[config.old] = deprecate(
        target,
        config.old,
        config.new,
        config.message
      );
    } else {
      // For non-functions, create a getter
      Object.defineProperty(deprecatedModule, config.old, {
        get() {
          logDeprecation(config.old, config.new, config.message);
          return target;
        },
      });
    }
  }
  
  return deprecatedModule;
}

/**
 * Migration map generator for common patterns
 */
export class MigrationMap {
  private migrations: Array<{
    pattern: RegExp;
    replacement: string;
    message?: string;
  }> = [];
  
  /**
   * Add a simple rename migration
   */
  addRename(oldName: string, newName: string, message?: string): this {
    this.migrations.push({
      pattern: new RegExp(`\\b${oldName}\\b`, 'g'),
      replacement: newName,
      message,
    });
    return this;
  }
  
  /**
   * Add a module restructure migration
   */
  addModuleMove(
    oldModule: string,
    newModule: string,
    functionMappings?: Record<string, string>
  ): this {
    // Add import migration
    this.migrations.push({
      pattern: new RegExp(`from ['"]${oldModule}['"]`, 'g'),
      replacement: `from '${newModule}'`,
      message: `Module ${oldModule} moved to ${newModule}`,
    });
    
    // Add function mappings if provided
    if (functionMappings) {
      for (const [oldFunc, newFunc] of Object.entries(functionMappings)) {
        this.addRename(oldFunc, newFunc);
      }
    }
    
    return this;
  }
  
  /**
   * Generate migration script
   */
  generateScript(): string {
    const lines = [
      '#!/usr/bin/env node',
      '// Auto-generated migration script',
      '',
      'const fs = require("fs");',
      'const path = require("path");',
      'const glob = require("glob");',
      '',
      'const migrations = ' + JSON.stringify(this.migrations, null, 2) + ';',
      '',
      this.generateScriptBody(),
    ];
    
    return lines.join('\n');
  }
  
  private generateScriptBody(): string {
    return `
function migrateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  for (const migration of migrations) {
    const regex = new RegExp(migration.pattern, 'g');
    if (regex.test(content)) {
      content = content.replace(regex, migration.replacement);
      modified = true;
      logger.info(\`  Migrated: \${migration.pattern} -> \${migration.replacement}\`);
    }
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    return true;
  }
  
  return false;
}

// Find all TypeScript files
const files = glob.sync('src/**/*.ts', { ignore: ['**/node_modules/**'] });

logger.info(\`Found \${files.length} files to check...\`);

let migratedCount = 0;
for (const file of files) {
  logger.info(\`Checking \${file}...\`);
  if (migrateFile(file)) {
    migratedCount++;
  }
}

logger.info(\`\\nMigration complete! Modified \${migratedCount} files.\`);
`;
  }
}

/**
 * Deprecation utilities
 */
export const DeprecationUtils = {
  /**
   * Configure deprecation behavior
   */
  configure(config: DeprecationConfig): void {
    globalConfig = { ...globalConfig, ...config };
  },
  
  /**
   * Get deprecation report
   */
  getReport(): string {
    return tracker.getReport();
  },
  
  /**
   * Reset deprecation tracking
   */
  reset(): void {
    tracker.reset();
  },
  
  /**
   * Check if running in migration mode
   */
  isMigrationMode(): boolean {
    return process.env['MIGRATION_MODE'] === 'true';
  },
  
  /**
   * Temporarily suppress deprecation warnings
   */
  suppressWarnings<T>(fn: () => T): T {
    const originalSilent = globalConfig.silent;
    globalConfig.silent = true;
    
    try {
      return fn();
    } finally {
      globalConfig.silent = originalSilent;
    }
  },
};

/**
 * Simple deprecation warning for immediate use
 */
export function deprecationWarning(
  oldName: string,
  newName: string,
  migrationExample?: string
): void {
  logDeprecation(oldName, newName, migrationExample);
}

/**
 * Common migration patterns for the consolidation
 */
export const CommonMigrations = {
  // Property tool migrations
  propertyTools: {
    'listProperties': 'property.list',
    'getProperty': 'property.get',
    'createProperty': 'property.create',
    'updateProperty': 'property.update',
    'deleteProperty': 'property.delete',
    'createPropertyVersion': 'property.version.create',
    'listPropertyVersions': 'property.version.list',
    'getPropertyVersion': 'property.version.get',
    'activateProperty': 'property.activation.create',
    'getActivationStatus': 'property.activation.status',
    'listPropertyActivations': 'property.activation.list',
  },
  
  // DNS tool migrations
  dnsTools: {
    'listZones': 'dns.zones.list',
    'getZone': 'dns.zones.get',
    'createZone': 'dns.zones.create',
    'deleteZone': 'dns.zones.delete',
    'listRecords': 'dns.records.list',
    'createRecord': 'dns.records.create',
    'updateRecord': 'dns.records.update',
    'deleteRecord': 'dns.records.delete',
    'activateZoneChanges': 'dns.changes.activate',
  },
  
  // Certificate tool migrations
  certificateTools: {
    'createDVEnrollment': 'certificates.enroll',
    'checkEnrollmentStatus': 'certificates.status',
    'getValidationChallenges': 'certificates.validation.get',
    'validateCertificate': 'certificates.validation.complete',
    'deployCertificate': 'certificates.deploy',
  },
  
  // Network list migrations
  networkListTools: {
    'listNetworkLists': 'security.lists.list',
    'getNetworkList': 'security.lists.get',
    'createNetworkList': 'security.lists.create',
    'updateNetworkList': 'security.lists.update',
    'deleteNetworkList': 'security.lists.delete',
    'activateNetworkList': 'security.lists.activate',
  },
};