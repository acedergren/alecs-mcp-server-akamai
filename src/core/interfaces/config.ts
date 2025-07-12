/**
 * Configuration Provider Interface - CODE KAI Implementation
 * 
 * KEY: Type-safe configuration management for multi-customer environments
 * APPROACH: Pluggable configuration sources with validation
 * IMPLEMENTATION: Customer-scoped, cacheable, extensible
 * 
 * This interface abstracts configuration management, allowing
 * different backends (file, database, API) and customer isolation.
 */

import { EdgeGridConfig } from '../../types/edgegrid';

/**
 * Customer configuration with EdgeGrid credentials
 */
export interface CustomerConfig extends EdgeGridConfig {
  /** Customer identifier */
  customer: string;
  
  /** Display name for customer */
  displayName?: string;
  
  /** Customer tier (for feature gating) */
  tier?: 'free' | 'pro' | 'enterprise';
  
  /** Whether this customer has account switching enabled */
  hasAccountSwitching?: boolean;
  
  /** Additional metadata */
  metadata?: Record<string, any>;
  
  /** Configuration timestamp */
  updatedAt?: Date;
}

/**
 * Configuration validation result
 */
export interface ConfigValidationResult {
  /** Whether configuration is valid */
  valid: boolean;
  
  /** Validation errors */
  errors: string[];
  
  /** Validation warnings */
  warnings: string[];
  
  /** Missing required fields */
  missing: string[];
}

/**
 * Core configuration provider interface
 */
export interface IConfigProvider {
  /**
   * Get configuration for a specific customer
   */
  getCustomerConfig(customer: string): Promise<CustomerConfig | null>;
  
  /**
   * Get all available customers
   */
  getCustomers(): Promise<string[]>;
  
  /**
   * Check if customer exists
   */
  hasCustomer(customer: string): Promise<boolean>;
  
  /**
   * Validate customer configuration
   */
  validateCustomer(customer: string): Promise<ConfigValidationResult>;
  
  /**
   * Reload configuration from source
   */
  reload(): Promise<void>;
}

/**
 * Extended configuration provider with write capabilities
 */
export interface IWritableConfigProvider extends IConfigProvider {
  /**
   * Set configuration for a customer
   */
  setCustomerConfig(customer: string, config: CustomerConfig): Promise<void>;
  
  /**
   * Update specific configuration fields
   */
  updateCustomerConfig(
    customer: string, 
    updates: Partial<CustomerConfig>
  ): Promise<void>;
  
  /**
   * Delete customer configuration
   */
  deleteCustomer(customer: string): Promise<void>;
  
  /**
   * Save configuration to persistent storage
   */
  save(): Promise<void>;
}

/**
 * Configuration source interface for different backends
 */
export interface IConfigSource {
  /**
   * Load configuration from source
   */
  load(): Promise<Record<string, CustomerConfig>>;
  
  /**
   * Save configuration to source
   */
  save(config: Record<string, CustomerConfig>): Promise<void>;
  
  /**
   * Watch for configuration changes
   */
  watch(callback: (customer: string, config: CustomerConfig) => void): void;
  
  /**
   * Stop watching for changes
   */
  unwatch(): void;
}

/**
 * File-based configuration source
 */
export interface IFileConfigSource extends IConfigSource {
  /** Path to configuration file */
  readonly filePath: string;
  
  /** File format (json, yaml, ini) */
  readonly format: 'json' | 'yaml' | 'ini';
  
  /** Whether to watch file for changes */
  readonly watchFile: boolean;
}

/**
 * Environment-based configuration source
 */
export interface IEnvConfigSource extends IConfigSource {
  /** Environment variable prefix */
  readonly prefix: string;
  
  /** Mapping of env vars to config fields */
  readonly mapping: Record<string, string>;
}

/**
 * Database-based configuration source
 */
export interface IDbConfigSource extends IConfigSource {
  /** Database connection string */
  readonly connectionString: string;
  
  /** Table/collection name */
  readonly tableName: string;
  
  /** Schema version */
  readonly schemaVersion: number;
}

/**
 * Configuration manager interface
 */
export interface IConfigManager {
  /**
   * Get current configuration provider
   */
  getProvider(): IConfigProvider;
  
  /**
   * Set configuration provider
   */
  setProvider(provider: IConfigProvider): void;
  
  /**
   * Add configuration source
   */
  addSource(source: IConfigSource, priority?: number): void;
  
  /**
   * Remove configuration source
   */
  removeSource(source: IConfigSource): void;
  
  /**
   * Get merged configuration from all sources
   */
  getMergedConfig(): Promise<Record<string, CustomerConfig>>;
  
  /**
   * Validate all configurations
   */
  validateAll(): Promise<Record<string, ConfigValidationResult>>;
  
  /**
   * Enable/disable configuration caching
   */
  setCaching(enabled: boolean, ttl?: number): void;
  
  /**
   * Clear configuration cache
   */
  clearCache(): void;
}

/**
 * Configuration events
 */
export interface IConfigEvents {
  /**
   * Configuration loaded
   */
  onConfigLoaded(callback: (customer: string, config: CustomerConfig) => void): void;
  
  /**
   * Configuration updated
   */
  onConfigUpdated(callback: (customer: string, config: CustomerConfig) => void): void;
  
  /**
   * Configuration deleted
   */
  onConfigDeleted(callback: (customer: string) => void): void;
  
  /**
   * Configuration error
   */
  onConfigError(callback: (customer: string, error: Error) => void): void;
}