/**
 * Dependency Injection Container - CODE KAI Implementation
 * 
 * KEY: Lightweight, type-safe dependency injection for ALECS
 * APPROACH: Service locator pattern with lazy initialization
 * IMPLEMENTATION: Zero runtime overhead, full TypeScript support
 * 
 * This container provides:
 * - Singleton service management
 * - Lazy initialization
 * - Circular dependency detection
 * - Type-safe service resolution
 * - Minimal memory footprint
 */

import { createLogger } from '../../utils/pino-logger';

const logger = createLogger('di-container');

/**
 * Service identifier type
 */
export type ServiceIdentifier<T> = symbol & { __type?: T };

/**
 * Service factory function
 */
export type ServiceFactory<T> = (container: DIContainer) => T | Promise<T>;

/**
 * Service registration options
 */
export interface ServiceOptions {
  singleton?: boolean;
  eager?: boolean;
  tags?: string[];
}

/**
 * Service descriptor
 */
interface ServiceDescriptor<T = any> {
  identifier: ServiceIdentifier<T>;
  factory: ServiceFactory<T>;
  options: ServiceOptions;
  instance?: T;
  resolving?: boolean;
}

/**
 * Dependency Injection Container
 */
export class DIContainer {
  private services = new Map<symbol, ServiceDescriptor>();
  private tags = new Map<string, Set<symbol>>();
  
  /**
   * Register a service
   */
  register<T>(
    identifier: ServiceIdentifier<T>,
    factory: ServiceFactory<T>,
    options: ServiceOptions = {}
  ): this {
    const descriptor: ServiceDescriptor<T> = {
      identifier,
      factory,
      options: { singleton: true, ...options }
    };
    
    this.services.set(identifier, descriptor);
    
    // Register tags
    if (options.tags) {
      for (const tag of options.tags) {
        if (!this.tags.has(tag)) {
          this.tags.set(tag, new Set());
        }
        this.tags.get(tag)!.add(identifier);
      }
    }
    
    // Eager initialization
    if (options.eager) {
      this.resolve(identifier);
    }
    
    logger.debug('Service registered', { 
      identifier: identifier.toString(),
      singleton: descriptor.options.singleton,
      tags: options.tags 
    });
    
    return this;
  }
  
  /**
   * Resolve a service
   */
  async resolve<T>(identifier: ServiceIdentifier<T>): Promise<T> {
    const descriptor = this.services.get(identifier);
    
    if (!descriptor) {
      throw new Error(`Service not found: ${identifier.toString()}`);
    }
    
    // Check for circular dependencies
    if (descriptor.resolving) {
      throw new Error(`Circular dependency detected: ${identifier.toString()}`);
    }
    
    // Return existing instance for singletons
    if (descriptor.options.singleton && descriptor.instance) {
      return descriptor.instance as T;
    }
    
    try {
      descriptor.resolving = true;
      
      // Create instance
      const instance = await descriptor.factory(this);
      
      // Store singleton instance
      if (descriptor.options.singleton) {
        descriptor.instance = instance;
      }
      
      descriptor.resolving = false;
      
      logger.debug('Service resolved', { 
        identifier: identifier.toString(),
        cached: !!descriptor.instance 
      });
      
      return instance as T;
    } catch (error) {
      descriptor.resolving = false;
      logger.error('Service resolution failed', { 
        identifier: identifier.toString(),
        error 
      });
      throw error;
    }
  }
  
  /**
   * Resolve all services with a specific tag
   */
  async resolveByTag<T = any>(tag: string): Promise<T[]> {
    const identifiers = this.tags.get(tag);
    
    if (!identifiers) {
      return [];
    }
    
    const services: T[] = [];
    
    for (const identifier of identifiers) {
      const service = await this.resolve(identifier as ServiceIdentifier<T>);
      services.push(service);
    }
    
    return services;
  }
  
  /**
   * Check if a service is registered
   */
  has(identifier: ServiceIdentifier<any>): boolean {
    return this.services.has(identifier);
  }
  
  /**
   * Clear all services
   */
  clear(): void {
    this.services.clear();
    this.tags.clear();
  }
  
  /**
   * Get container statistics
   */
  getStats(): { services: number; singletons: number; tags: number } {
    let singletons = 0;
    
    for (const descriptor of this.services.values()) {
      if (descriptor.instance) {
        singletons++;
      }
    }
    
    return {
      services: this.services.size,
      singletons,
      tags: this.tags.size
    };
  }
}

/**
 * Global container instance
 */
export const container = new DIContainer();

/**
 * Service identifier factory
 */
export function createServiceIdentifier<T>(name: string): ServiceIdentifier<T> {
  return Symbol.for(name) as ServiceIdentifier<T>;
}

/**
 * Decorator for injectable classes
 */
export function Injectable(options: ServiceOptions = {}) {
  return function <T extends { new(...args: any[]): {} }>(constructor: T) {
    const identifier = createServiceIdentifier(constructor.name);
    
    container.register(identifier, () => new constructor(), options);
    
    return constructor;
  };
}

/**
 * Decorator for injecting dependencies
 */
export function Inject<T>(identifier: ServiceIdentifier<T>) {
  return function (target: any, propertyKey: string | symbol, parameterIndex?: number) {
    // Property injection
    if (parameterIndex === undefined) {
      Object.defineProperty(target, propertyKey, {
        get() {
          return container.resolve(identifier);
        },
        enumerable: true,
        configurable: true
      });
    }
    // Constructor injection - would need additional metadata handling
  };
}