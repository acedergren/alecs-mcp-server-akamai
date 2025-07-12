/**
 * Service Identifiers - CODE KAI Implementation
 * 
 * KEY: Type-safe service identifiers for dependency injection
 * APPROACH: Centralized identifier management
 * IMPLEMENTATION: Symbol-based with TypeScript type hints
 * 
 * All service identifiers are defined here to:
 * - Prevent naming conflicts
 * - Enable type-safe resolution
 * - Document available services
 * - Support refactoring
 */

import { createServiceIdentifier } from './container';
import type { IPropertyCache, IAkamaiClient } from '../interfaces';
import type { CustomerConfigManager } from '../../utils/customer-config';
import type { RequestCoalescer } from '../../utils/request-coalescer';
import type { ConnectionPool } from '../server/performance/connection-pool';
import type { CircuitBreaker } from '../../utils/circuit-breaker';
import type { IdTranslationService } from '../../services/id-translation-service';
import type { ErrorRecoveryService } from '../../services/error-recovery-service';
import type { WorkflowOrchestratorService } from '../../services/workflow-orchestrator-service';
import type { ContractGroupDiscoveryService } from '../../services/contract-group-discovery-service';

/**
 * Core Services
 */
export const SERVICES = {
  // Infrastructure
  Cache: createServiceIdentifier<IPropertyCache>('Cache'),
  AkamaiClient: createServiceIdentifier<IAkamaiClient>('AkamaiClient'),
  ConfigManager: createServiceIdentifier<CustomerConfigManager>('ConfigManager'), // Keep concrete for now
  
  // Performance
  RequestCoalescer: createServiceIdentifier<RequestCoalescer>('RequestCoalescer'),
  ConnectionPool: createServiceIdentifier<ConnectionPool>('ConnectionPool'),
  CircuitBreaker: createServiceIdentifier<CircuitBreaker>('CircuitBreaker'),
  
  // Business Services
  IdTranslation: createServiceIdentifier<IdTranslationService>('IdTranslation'),
  ErrorRecovery: createServiceIdentifier<ErrorRecoveryService>('ErrorRecovery'),
  WorkflowOrchestrator: createServiceIdentifier<WorkflowOrchestratorService>('WorkflowOrchestrator'),
  ContractGroupDiscovery: createServiceIdentifier<ContractGroupDiscoveryService>('ContractGroupDiscovery'),
} as const;

/**
 * Service Tags for grouped resolution
 */
export const SERVICE_TAGS = {
  CORE: 'core',
  PERFORMANCE: 'performance',
  BUSINESS: 'business',
  TOOL: 'tool',
  MIDDLEWARE: 'middleware',
} as const;

/**
 * Type-safe service resolution helper
 */
export type ServiceType<K extends keyof typeof SERVICES> = 
  typeof SERVICES[K] extends { __type?: infer T } ? T : never;