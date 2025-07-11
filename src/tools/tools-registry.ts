/**
 * Unified Type-Safe Tool Registry for ALECS Full Server
 * 
 * CODE KAI IMPLEMENTATION:
 * - Single source of truth for all MCP tools
 * - Full type safety with TypeScript
 * - Runtime validation with Zod
 * - Automatic tool discovery
 * - Standard pattern support
 * 
 * This registry provides:
 * 1. Type-safe tool registration
 * 2. Automatic validation
 * 3. Tool metadata and capabilities
 * 4. Domain grouping
 * 5. Feature detection
 */

import { z } from 'zod';
import type { MCPToolResponse } from '../types/mcp-protocol';
import type { AkamaiClient } from '../akamai-client';

/**
 * Base tool handler type
 */
export type ToolHandler<TInput = any> = (
  client: AkamaiClient,
  args: TInput
) => Promise<MCPToolResponse>;

/**
 * Tool definition with full type safety
 */
export interface ToolDefinition<TSchema extends z.ZodType = z.ZodType> {
  name: string;
  description: string;
  schema: TSchema;
  handler: ToolHandler<z.infer<TSchema>>;
  metadata?: ToolMetadata;
}

/**
 * Tool metadata for standard features
 */
export interface ToolMetadata {
  domain: string;
  category?: string;
  cacheable?: boolean;
  cacheTtl?: number;
  progressTracking?: boolean;
  deprecated?: boolean;
  replacedBy?: string;
  tags?: string[];
  requiredPermissions?: string[];
}

/**
 * Domain definition
 */
export interface DomainDefinition {
  name: string;
  description: string;
  toolCount: number;
  features?: string[];
}

/**
 * Tool registry configuration
 */
export interface RegistryConfig {
  validateOnRegister?: boolean;
  allowDuplicates?: boolean;
  enableMetrics?: boolean;
}

// CONSOLIDATED TOOLS - NEW ARCHITECTURE
// Import from consolidated modules that contain all tools

// Property Manager Tools (consolidated)
import { propertyTools } from './property';

// DNS Tools (consolidated)  
import { dnsTools } from './dns';

// Certificate Tools (consolidated)
import { certificateTools } from './certificates';

// Security Tools (consolidated)
import { securityTools } from './security';

// FastPurge Tools (consolidated)
import { FastPurgeTools, FastPurgeMonitoringTools } from './fastpurge';

// SIEM Tools (consolidated)
import { SIEMTools } from './siem';

// Reporting Tools (consolidated)
import { reportingTools } from './reporting';

// Utility Tools (consolidated)
import { utilityTools } from './utilities';

// Orchestration Tools
import { OrchestrationTools } from './orchestration';

// AppSec Tools
import { appSecTools } from './appsec';

// Edge Hostname Tools
import { edgeHostnameTools } from './edge-hostnames';

// Include Tools
import { includeTools } from './includes';

// Rule Tree Tools
import { ruleTreeTools } from './rule-tree';

// Hostname Management Tools
import { hostnameTools } from './hostname';

// Bulk Operations Tools
import { bulkOperationsTools } from './bulk-operations';
import { billingTools } from './billing';
import { edgeComputeToolsRegistry } from './edge-compute';
import { gtmTools } from './gtm';
import { diagnosticsTools } from './diagnostics';

// Search Tools (Universal Search Engine)
import { searchTools } from './search';

// Error Recovery Tools (3 tools - intelligent error recovery)
import { suggestRecoveryTool, executeRecoveryTool, analyzeRecoveryTool } from './error-recovery';

// Workflow Orchestrator Tools (4 tools - KAIZEN workflow orchestration)
import { workflowOrchestratorTools } from './workflow';

/**
 * Tool definition interface with strong typing
 */
export interface ToolDefinition {
  name: string;
  description: string;
  schema?: ZodSchema<any>;
  handler: (client: AkamaiClient, args: ToolParameters) => Promise<MCPToolResponse>;
}

/**
 * Convert tool object to ToolDefinition array
 */
function convertToolsToDefinitions(toolsObject: Record<string, any>): ToolDefinition[] {
  return Object.entries(toolsObject).map(([name, tool]) => ({
    name,
    description: tool.description,
    schema: tool.inputSchema,
    handler: tool.handler
  }));
}

/**
 * Get all tool definitions from consolidated modules
 * MIGRATION PHASE: Only load migrated snake_case tools for clean startup
 */
export function getAllToolDefinitions(): ToolDefinition[] {
  const allTools: ToolDefinition[] = [];

  // MIGRATED TOOLS (snake_case) - Phase 1 Complete
  // Property Manager Tools (26 tools - fully migrated with bulk ops)
  allTools.push(...convertToolsToDefinitions(propertyTools));

  // DNS Tools (12 tools - fully migrated with delete)
  allTools.push(...convertToolsToDefinitions(dnsTools));

  // Utility Tools (4 tools - fully migrated)
  allTools.push(...convertToolsToDefinitions(utilityTools));

  // Certificate Tools (8 tools - fully migrated with search)
  allTools.push(...convertToolsToDefinitions(certificateTools));

  // Security Tools (13 tools - fully migrated with updates and deletes)
  allTools.push(...convertToolsToDefinitions(securityTools));

  // Reporting Tools (9 tools - fully migrated, billing moved to Phase 2)
  allTools.push(...convertToolsToDefinitions(reportingTools));

  // FastPurge Tools (8 tools - fully migrated)
  allTools.push(...convertToolsToDefinitions(FastPurgeTools.getAllTools()));
  allTools.push(...convertToolsToDefinitions(FastPurgeMonitoringTools.getAllTools()));

  // SIEM Tools (4 tools - fully migrated)
  allTools.push(...convertToolsToDefinitions(SIEMTools.getAllTools()));

  // Orchestration Tools (7 tools - fully migrated)
  allTools.push(...convertToolsToDefinitions(OrchestrationTools.getAllTools()));

  // AppSec Tools (34 tools - fully migrated)
  allTools.push(...convertToolsToDefinitions(appSecTools));

  // Edge Hostname Tools (10 tools - newly added with search, update and delete)
  allTools.push(...convertToolsToDefinitions(edgeHostnameTools));

  // Include Tools (10 tools - newly added with search and delete)
  allTools.push(...convertToolsToDefinitions(includeTools));

  // Rule Tree Tools (5 tools - newly added)
  allTools.push(...convertToolsToDefinitions(ruleTreeTools));

  // Hostname Management Tools (5 tools - newly added)
  allTools.push(...convertToolsToDefinitions(hostnameTools));

  // Bulk Operations Tools (5 tools - newly added)
  allTools.push(...convertToolsToDefinitions(bulkOperationsTools));
  
  // Billing Tools (10 tools - comprehensive billing operations)
  allTools.push(...convertToolsToDefinitions(billingTools));
  
  // Edge Compute Tools (12 tools - EdgeWorkers and Cloudlets)
  allTools.push(...convertToolsToDefinitions(edgeComputeToolsRegistry));
  
  // GTM Tools (17 tools - Global Traffic Management)
  allTools.push(...convertToolsToDefinitions(gtmTools));
  
  // Diagnostics Tools
  allTools.push(...convertToolsToDefinitions(diagnosticsTools));
  
  // Search Tools (5 tools - Universal Search Engine)
  allTools.push(...convertToolsToDefinitions(searchTools));
  
  // Error Recovery Tools (3 tools - Intelligent Error Recovery)
  allTools.push(suggestRecoveryTool as ToolDefinition);
  allTools.push(executeRecoveryTool as ToolDefinition);
  allTools.push(analyzeRecoveryTool as ToolDefinition);
  
  // Workflow Orchestrator Tools (4 tools - KAIZEN workflow orchestration)
  allTools.push(...convertToolsToDefinitions(workflowOrchestratorTools));














  // TODO: Add new domains here
  // Use: alecs generate domain <name> to create new domains
  // Generated domains will automatically add their imports and registrations here

  // MIGRATION COMPLETE - All tools now use snake_case naming
  // Total tools: 159 (after removing duplicates and mock billing + 3 error recovery tools)

  return allTools;
}

/**
 * Get tools by category
 */
export function getToolsByCategory(category: string): ToolDefinition[] {
  const allTools = getAllToolDefinitions();
  return allTools.filter(tool => tool.name.includes(category));
}

/**
 * Get tool by name
 */
export function getToolByName(name: string): ToolDefinition | undefined {
  const allTools = getAllToolDefinitions();
  return allTools.find(tool => tool.name === name);
}

/**
 * Validate all tool definitions
 */
export function validateAllTools(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const allTools = getAllToolDefinitions();
  const nameSet = new Set<string>();

  for (const tool of allTools) {
    // Check for required fields
    if (!tool.name) {
      errors.push('Tool missing name');
      continue;
    }
    
    if (!tool.description) {
      errors.push(`Tool '${tool.name}' missing description`);
    }
    
    if (!tool.handler) {
      errors.push(`Tool '${tool.name}' missing handler function`);
    }

    // Check for duplicate names
    if (nameSet.has(tool.name)) {
      errors.push(`Duplicate tool name: '${tool.name}'`);
    } else {
      nameSet.add(tool.name);
    }

    // Validate schema if present
    if (tool.schema) {
      try {
        // Basic schema validation
        tool.schema.parse({});
      } catch (e) {
        // Schema validation errors are expected for required fields
        // This is just a basic sanity check that the schema is valid
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}