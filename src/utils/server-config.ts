/**
 * Server Configuration Settings
 * Controls feature toggles and server behavior
 */

export interface ServerFeatureFlags {
  /** 
   * Enable customer section override in tool parameters
   * When false, tools will only use the section selected at startup
   * When true, tools can accept a 'customer' parameter to override
   * Default: false
   */
  enableCustomerOverride: boolean;

  /**
   * Enable property cache preloading
   * Default: true when Valkey/Redis is available
   */
  enablePropertyCache: boolean;

  /**
   * Enable verbose logging
   * Default: false
   */
  enableVerboseLogging: boolean;
}

export class ServerConfiguration {
  private static instance: ServerConfiguration;
  private features: ServerFeatureFlags;

  private constructor() {
    this.features = {
      enableCustomerOverride: this.parseBoolean(
        process.env.ALECS_ENABLE_CUSTOMER_OVERRIDE,
        false
      ),
      enablePropertyCache: this.parseBoolean(
        process.env.ALECS_ENABLE_PROPERTY_CACHE,
        true
      ),
      enableVerboseLogging: this.parseBoolean(
        process.env.ALECS_VERBOSE,
        false
      ),
    };
  }

  static getInstance(): ServerConfiguration {
    if (!ServerConfiguration.instance) {
      ServerConfiguration.instance = new ServerConfiguration();
    }
    return ServerConfiguration.instance;
  }

  private parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
    if (value === undefined) return defaultValue;
    return value.toLowerCase() === 'true' || value === '1';
  }

  get enableCustomerOverride(): boolean {
    return this.features.enableCustomerOverride;
  }

  get enablePropertyCache(): boolean {
    return this.features.enablePropertyCache;
  }

  get enableVerboseLogging(): boolean {
    return this.features.enableVerboseLogging;
  }

  /**
   * Get selected customer section for the session
   * This is determined at startup and cannot be changed during runtime
   */
  getSessionCustomer(): string {
    return process.env.ALECS_CUSTOMER_SECTION || 'default';
  }

  /**
   * Log current configuration
   */
  logConfiguration(): void {
    console.log('Server Configuration:');
    console.log(`  - Customer Override: ${this.features.enableCustomerOverride ? 'Enabled' : 'Disabled'}`);
    console.log(`  - Property Cache: ${this.features.enablePropertyCache ? 'Enabled' : 'Disabled'}`);
    console.log(`  - Verbose Logging: ${this.features.enableVerboseLogging ? 'Enabled' : 'Disabled'}`);
    console.log(`  - Session Customer: ${this.getSessionCustomer()}`);
  }
}

export const serverConfig = ServerConfiguration.getInstance();