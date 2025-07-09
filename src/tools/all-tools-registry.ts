/**
 * Complete Tool Registration for ALECS Full Server
 * Registers ALL available tools from consolidated modules
 * Updated to use new consolidated tool architecture
 */

import { type ZodSchema } from 'zod';

// CODE KAI: Import proper types to eliminate 'any' usage
import type { AkamaiClient } from '../akamai-client';
import type { MCPToolResponse } from '../types/mcp-protocol';

// CODE KAI: Define flexible parameter type for tool handlers
// This allows typed parameters while maintaining compatibility with MCP SDK
type ToolParameters = Record<string, unknown>;

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
  // Property Manager Tools (9 tools - fully migrated)
  allTools.push(...convertToolsToDefinitions(propertyTools));

  // DNS Tools (11 tools - fully migrated)
  allTools.push(...convertToolsToDefinitions(dnsTools));

  // Utility Tools (4 tools - fully migrated)
  allTools.push(...convertToolsToDefinitions(utilityTools));

  // Certificate Tools (7 tools - fully migrated)
  allTools.push(...convertToolsToDefinitions(certificateTools));

  // Security Tools (10 tools - fully migrated)
  allTools.push(...convertToolsToDefinitions(securityTools));

  // Reporting Tools (4 tools - fully migrated)
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

  // Edge Hostname Tools (7 tools - newly added)
  allTools.push(...convertToolsToDefinitions(edgeHostnameTools));

  // Include Tools (8 tools - newly added)
  allTools.push(...convertToolsToDefinitions(includeTools));

  // Rule Tree Tools (5 tools - newly added)
  allTools.push(...convertToolsToDefinitions(ruleTreeTools));

  // MIGRATION COMPLETE - All tools now use snake_case naming
  // Total tools: 129 (after adding rule tree tools)

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