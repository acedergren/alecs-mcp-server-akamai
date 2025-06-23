/**
 * Consolidated Tools Registry - Maya's Vision
 * 
 * The new simplified tool architecture. From 180 scattered tools to a focused set
 * of powerful, business-oriented tools that just work.
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';

// Import consolidated tools
import { propertyTool, handlePropertyTool } from './property-tool';
import { dnsTool, handleDNSTool } from './dns-tool';
import { certificateTool, handleCertificateTool } from './certificate-tool';
import { searchTool, handleSearchTool } from './search-tool';
import { deployTool, handleDeployTool } from './deploy-tool-simple';

/**
 * Consolidated tool registry
 */
export const consolidatedTools: Tool[] = [
  propertyTool,
  dnsTool,
  certificateTool,
  searchTool,
  deployTool,
];

/**
 * Tool handlers map
 */
export const consolidatedHandlers = {
  'property': handlePropertyTool,
  'dns': handleDNSTool,
  'certificate': handleCertificateTool,
  'search': handleSearchTool,
  'deploy': handleDeployTool,
};

/**
 * Get consolidated tools
 */
export function getConsolidatedTools(): Tool[] {
  return consolidatedTools;
}

/**
 * Handle consolidated tool request
 */
export async function handleConsolidatedToolRequest(toolName: string, args: any): Promise<any> {
  const handler = (consolidatedHandlers as any)[toolName];
  
  if (!handler) {
    throw new Error(`Unknown consolidated tool: ${toolName}`);
  }
  
  return handler(args);
}

/**
 * Tool discovery helper
 */
export function discoverConsolidatedTools(): { name: string; description: string; category: string }[] {
  return [
    {
      name: 'property',
      description: 'Comprehensive property management - create, update, activate, and analyze',
      category: 'Core Resources',
    },
    {
      name: 'dns',
      description: 'Safe DNS management with business shortcuts and automatic validation',
      category: 'Core Resources',
    },
    {
      name: 'certificate',
      description: 'Automated SSL/TLS management with proactive monitoring',
      category: 'Security',
    },
    {
      name: 'search',
      description: 'Universal search across all resources with natural language',
      category: 'Discovery',
    },
    {
      name: 'deploy',
      description: 'Unified deployment for all resources with rollback protection',
      category: 'Operations',
    },
  ];
}

/**
 * Tool recommendation engine
 */
export function recommendTool(intent: string): { tool: string; confidence: number; reason: string }[] {
  const recommendations = [];
  const lowerIntent = intent.toLowerCase();
  
  // Property recommendations
  if (lowerIntent.includes('property') || lowerIntent.includes('config') || 
      lowerIntent.includes('rule') || lowerIntent.includes('activate')) {
    recommendations.push({
      tool: 'property',
      confidence: 0.9,
      reason: 'Property tool handles all configuration and activation needs',
    });
  }
  
  // DNS recommendations
  if (lowerIntent.includes('dns') || lowerIntent.includes('domain') || 
      lowerIntent.includes('zone') || lowerIntent.includes('record')) {
    recommendations.push({
      tool: 'dns',
      confidence: 0.95,
      reason: 'DNS tool manages all domain and record operations',
    });
  }
  
  // Certificate recommendations
  if (lowerIntent.includes('ssl') || lowerIntent.includes('tls') || 
      lowerIntent.includes('cert') || lowerIntent.includes('https')) {
    recommendations.push({
      tool: 'certificate',
      confidence: 0.95,
      reason: 'Certificate tool automates SSL/TLS management',
    });
  }
  
  // Search recommendations
  if (lowerIntent.includes('find') || lowerIntent.includes('search') || 
      lowerIntent.includes('locate') || lowerIntent.includes('where')) {
    recommendations.push({
      tool: 'search',
      confidence: 1.0,
      reason: 'Search tool finds anything across all resources',
    });
  }
  
  // Deploy recommendations
  if (lowerIntent.includes('deploy') || lowerIntent.includes('rollout') || 
      lowerIntent.includes('push') || lowerIntent.includes('live')) {
    recommendations.push({
      tool: 'deploy',
      confidence: 0.9,
      reason: 'Deploy tool handles all resource deployments',
    });
  }
  
  // Sort by confidence
  return recommendations.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Migration helper - maps old tool names to new consolidated tools
 */
export const toolMigrationMap: Record<string, { tool: string; action: string }> = {
  // Property tools
  'listProperties': { tool: 'property', action: 'list' },
  'getProperty': { tool: 'property', action: 'get' },
  'createProperty': { tool: 'property', action: 'create' },
  'updateProperty': { tool: 'property', action: 'update' },
  'activateProperty': { tool: 'property', action: 'activate' },
  'cloneProperty': { tool: 'property', action: 'clone' },
  
  // DNS tools
  'listZones': { tool: 'dns', action: 'list-zones' },
  'createZone': { tool: 'dns', action: 'manage-zone' },
  'listRecords': { tool: 'dns', action: 'manage-records' },
  'upsertRecord': { tool: 'dns', action: 'manage-records' },
  
  // Certificate tools
  'createDVEnrollment': { tool: 'certificate', action: 'secure' },
  'checkDVEnrollmentStatus': { tool: 'certificate', action: 'status' },
  'deployCertificateToNetwork': { tool: 'certificate', action: 'deploy' },
  
  // Search tools
  'searchAcrossResources': { tool: 'search', action: 'find' },
  'findResourceByIdentifier': { tool: 'search', action: 'locate' },
  
  // Deploy tools
  'activatePropertyVersion': { tool: 'deploy', action: 'deploy' },
  'activateZone': { tool: 'deploy', action: 'deploy' },
};

/**
 * Get migration suggestion for old tool
 */
export function getMigrationSuggestion(oldToolName: string): string | null {
  const migration = toolMigrationMap[oldToolName];
  
  if (!migration) {
    return null;
  }
  
  return `Use '${migration.tool}' tool with action '${migration.action}' instead of '${oldToolName}'`;
}

/**
 * Tool capability matrix
 */
export const toolCapabilities = {
  property: {
    operations: ['list', 'get', 'create', 'update', 'activate', 'clone', 'delete', 'search', 'analyze', 'optimize'],
    bulkSupport: true,
    automation: true,
    businessFriendly: true,
  },
  dns: {
    operations: ['list-zones', 'manage-zone', 'manage-records', 'import', 'activate', 'validate', 'troubleshoot', 'rollback'],
    bulkSupport: true,
    automation: true,
    safetyFirst: true,
  },
  certificate: {
    operations: ['list', 'secure', 'status', 'renew', 'automate', 'validate', 'deploy', 'monitor', 'troubleshoot'],
    bulkSupport: true,
    automation: true,
    proactiveMonitoring: true,
  },
  search: {
    operations: ['find', 'locate', 'discover', 'analyze', 'suggest'],
    naturalLanguage: true,
    crossResource: true,
    fuzzyMatching: true,
  },
  deploy: {
    operations: ['deploy', 'status', 'rollback', 'schedule', 'coordinate', 'validate', 'monitor', 'history'],
    bulkSupport: true,
    strategies: ['immediate', 'scheduled', 'canary', 'blue-green'],
    rollbackProtection: true,
  },
};

/**
 * Export all consolidated tool functionality
 */
export {
  // Individual tools
  propertyTool,
  dnsTool,
  certificateTool,
  searchTool,
  deployTool,
  
  // Handlers
  handlePropertyTool,
  handleDNSTool,
  handleCertificateTool,
  handleSearchTool,
  handleDeployTool,
};