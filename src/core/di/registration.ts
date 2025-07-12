/**
 * Service Registration - CODE KAI Implementation
 * 
 * KEY: Centralized service registration and initialization
 * APPROACH: Explicit registration with clear dependencies
 * IMPLEMENTATION: Lazy loading with circular dependency prevention
 * 
 * This module registers all services with the DI container
 * in the correct order, handling dependencies properly.
 */

import { container, DIContainer } from './container';
import { SERVICES, SERVICE_TAGS } from './identifiers';
import { UnifiedCacheService } from '../../services/cache';
import { AkamaiClient } from '../../akamai-client';
import { CustomerConfigManager } from '../../utils/customer-config';
import { RequestCoalescer } from '../../utils/request-coalescer';
import { ConnectionPool } from '../server/performance/connection-pool';
import { CircuitBreaker } from '../../utils/circuit-breaker';
import { IdTranslationService } from '../../services/id-translation-service';
import { ErrorRecoveryService } from '../../services/error-recovery-service';
import { WorkflowOrchestratorService } from '../../services/workflow-orchestrator-service';
import { ContractGroupDiscoveryService } from '../../services/contract-group-discovery-service';
import { CACHE_TTL, TIMEOUTS } from '../../constants';
import { createLogger } from '../../utils/pino-logger';

const logger = createLogger('di-registration');

/**
 * Register all core services
 */
export function registerCoreServices(): void {
  logger.info('Registering core services');
  
  // Infrastructure Services
  container.register(
    SERVICES.Cache,
    () => new UnifiedCacheService({
      maxSize: 10000,
      defaultTTL: CACHE_TTL.DEFAULT,
      enableSegmentation: true
    }),
    { 
      singleton: true, 
      eager: true,
      tags: [SERVICE_TAGS.CORE, SERVICE_TAGS.PERFORMANCE] 
    }
  );
  
  container.register(
    SERVICES.ConfigManager,
    () => CustomerConfigManager.getInstance(),
    { 
      singleton: true, 
      eager: true,
      tags: [SERVICE_TAGS.CORE] 
    }
  );
  
  container.register(
    SERVICES.AkamaiClient,
    async () => {
      return new AkamaiClient('default');
    },
    { 
      singleton: false, // New instance per resolution for customer isolation
      tags: [SERVICE_TAGS.CORE] 
    }
  );
  
  // Performance Services
  container.register(
    SERVICES.RequestCoalescer,
    () => new RequestCoalescer({
      ttl: TIMEOUTS.PROPERTY_ACTIVATION_DELAY,
      maxSize: 500,
      cleanupInterval: TIMEOUTS.MONITORING_INTERVAL
    }),
    { 
      singleton: true,
      tags: [SERVICE_TAGS.PERFORMANCE] 
    }
  );
  
  container.register(
    SERVICES.ConnectionPool,
    () => new ConnectionPool({ maxSockets: 10 }),
    { 
      singleton: true,
      tags: [SERVICE_TAGS.PERFORMANCE] 
    }
  );
  
  container.register(
    SERVICES.CircuitBreaker,
    () => new CircuitBreaker({
      failureThreshold: 5,
      timeout: TIMEOUTS.CIRCUIT_BREAKER_RESET
    }),
    { 
      singleton: false, // New instance per service
      tags: [SERVICE_TAGS.PERFORMANCE] 
    }
  );
  
  // Business Services
  container.register(
    SERVICES.IdTranslation,
    async () => {
      const service = new IdTranslationService();
      return service;
    },
    { 
      singleton: true,
      tags: [SERVICE_TAGS.BUSINESS] 
    }
  );
  
  container.register(
    SERVICES.ErrorRecovery,
    async () => {
      return ErrorRecoveryService.getInstance();
    },
    { 
      singleton: true,
      tags: [SERVICE_TAGS.BUSINESS] 
    }
  );
  
  container.register(
    SERVICES.WorkflowOrchestrator,
    async () => {
      return new WorkflowOrchestratorService();
    },
    { 
      singleton: true,
      tags: [SERVICE_TAGS.BUSINESS] 
    }
  );
  
  container.register(
    SERVICES.ContractGroupDiscovery,
    async () => {
      return ContractGroupDiscoveryService.getInstance();
    },
    { 
      singleton: true,
      tags: [SERVICE_TAGS.BUSINESS] 
    }
  );
  
  logger.info('Core services registered', container.getStats());
}

/**
 * Create a scoped container for a specific customer
 */
export function createCustomerScope(customer: string): DIContainer {
  const scopedContainer = new DIContainer();
  
  // Copy core service registrations
  // Register customer-specific AkamaiClient
  scopedContainer.register(
    SERVICES.AkamaiClient,
    async () => {
      return new AkamaiClient(customer);
    },
    { singleton: true }
  );
  
  return scopedContainer;
}

/**
 * Initialize all eager services
 */
export async function initializeServices(): Promise<void> {
  logger.info('Initializing eager services');
  
  try {
    // Register all services first
    registerCoreServices();
    
    // Services marked as eager will be initialized automatically
    const stats = container.getStats();
    logger.info('Services initialized', stats);
  } catch (error) {
    logger.error('Service initialization failed', { error });
    throw error;
  }
}

/**
 * Shutdown all services gracefully
 */
export async function shutdownServices(): Promise<void> {
  logger.info('Shutting down services');
  
  try {
    // Get all singleton services
    const performanceServices = await container.resolveByTag(SERVICE_TAGS.PERFORMANCE);
    
    // Shutdown in reverse order
    for (const service of performanceServices.reverse()) {
      if ('close' in service && typeof service.close === 'function') {
        await service.close();
      }
    }
    
    // Clear container
    container.clear();
    
    logger.info('Services shut down successfully');
  } catch (error) {
    logger.error('Service shutdown failed', { error });
    throw error;
  }
}