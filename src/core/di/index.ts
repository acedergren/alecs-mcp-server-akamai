/**
 * Dependency Injection Module - CODE KAI Implementation
 * 
 * KEY: Clean, type-safe dependency injection for ALECS
 * APPROACH: Service locator with lazy initialization
 * IMPLEMENTATION: Minimal overhead, maximum flexibility
 * 
 * Usage:
 * ```typescript
 * import { container, SERVICES } from './core/di';
 * 
 * const cache = await container.resolve(SERVICES.Cache);
 * const client = await container.resolve(SERVICES.AkamaiClient);
 * ```
 */

export { DIContainer, container, createServiceIdentifier, Injectable, Inject } from './container';
export { SERVICES, SERVICE_TAGS } from './identifiers';
export { registerCoreServices, createCustomerScope, initializeServices, shutdownServices } from './registration';
export type { ServiceIdentifier, ServiceFactory, ServiceOptions } from './container';
export type { ServiceType } from './identifiers';