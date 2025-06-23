/**
 * Workflow Assistants Integration
 * Maya Chen's UX Transformation: Unified entry point for all workflow assistants
 * 
 * This module exports all workflow assistants and provides a unified interface
 * for the MCP server to register and handle workflow-specific tools.
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';

// Import all workflow assistants
import { 
  propertyInfrastructureAssistant,
  handlePropertyInfrastructureAssistant 
} from './property-infrastructure-assistant';

import { 
  dnsDomainAssistant,
  handleDNSDomainAssistant 
} from './dns-workflow-assistant';

import { 
  securityComplianceAssistant,
  handleSecurityComplianceAssistant 
} from './security-compliance-assistant';

import { 
  performanceAnalyticsAssistant,
  handlePerformanceAnalyticsAssistant 
} from './performance-analytics-assistant';

/**
 * All workflow assistants
 * These replace the 180+ individual tools with 4 business-focused assistants
 */
export const workflowAssistants: Tool[] = [
  propertyInfrastructureAssistant,
  dnsDomainAssistant,
  securityComplianceAssistant,
  performanceAnalyticsAssistant,
];

/**
 * Workflow assistant handlers
 * Maps tool names to their handler functions
 */
export const workflowAssistantHandlers: Record<string, (args: any) => Promise<any>> = {
  'infrastructure': handlePropertyInfrastructureAssistant,
  'dns': handleDNSDomainAssistant,
  'security': handleSecurityComplianceAssistant,
  'performance': handlePerformanceAnalyticsAssistant,
};

/**
 * Get all workflow assistant tools
 * Used by the MCP server to register tools
 */
export function getWorkflowAssistantTools(): Tool[] {
  return workflowAssistants;
}

/**
 * Handle workflow assistant request
 * Routes requests to the appropriate workflow assistant
 */
export async function handleWorkflowAssistantRequest(
  toolName: string,
  args: any
): Promise<any> {
  const handler = workflowAssistantHandlers[toolName];
  
  if (!handler) {
    throw new Error(`Unknown workflow assistant: ${toolName}`);
  }
  
  return handler(args);
}

/**
 * Workflow Assistant Metadata
 * Provides information about each assistant for discovery
 */
export const workflowAssistantMetadata = {
  property: {
    name: 'Property & Infrastructure Assistant',
    description: 'Manages web properties, CDN configuration, and infrastructure',
    businessFocus: 'Making infrastructure decisions based on business needs',
    commonTasks: [
      'Launch new website or application',
      'Improve site performance',
      'Scale for traffic growth',
      'Configure CDN settings',
    ],
  },
  dns: {
    name: 'DNS & Domain Management Assistant',
    description: 'Handles DNS configuration, domain migrations, and zone management',
    businessFocus: 'Making DNS changes safe and simple',
    commonTasks: [
      'Migrate domain from another provider',
      'Set up email records',
      'Configure SSL certificates',
      'Troubleshoot DNS issues',
    ],
  },
  security: {
    name: 'Security & Compliance Assistant',
    description: 'Protects applications and ensures compliance',
    businessFocus: 'Security that enables business, not blocks it',
    commonTasks: [
      'Protect against attacks',
      'Meet compliance requirements',
      'Prevent fraud and abuse',
      'Respond to security incidents',
    ],
  },
  performance: {
    name: 'Performance & Analytics Assistant',
    description: 'Optimizes performance and provides business insights',
    businessFocus: 'Turning metrics into business outcomes',
    commonTasks: [
      'Speed up website/app',
      'Reduce infrastructure costs',
      'Improve mobile experience',
      'Analyze performance trends',
    ],
  },
};

/**
 * Assistant Discovery Helper
 * Helps users find the right assistant for their needs
 */
export function discoverAssistant(userIntent: string): {
  recommended: string;
  confidence: number;
  alternates: string[];
} {
  const intent = userIntent.toLowerCase();
  const scores: Record<string, number> = {
    property: 0,
    dns: 0,
    security: 0,
    performance: 0,
  };
  
  // Property/Infrastructure keywords
  if (intent.match(/property|website|app|application|cdn|edge|host|launch|deploy|scale/)) {
    scores.property += 3;
  }
  
  // DNS keywords
  if (intent.match(/dns|domain|nameserver|mx|record|zone|email setup|migrate domain/)) {
    scores.dns += 3;
  }
  
  // Security keywords
  if (intent.match(/security|attack|bot|ddos|compliance|pci|gdpr|hipaa|fraud|protect/)) {
    scores.security += 3;
  }
  
  // Performance keywords
  if (intent.match(/performance|speed|fast|slow|optimize|cost|reduce|mobile|analytics/)) {
    scores.performance += 3;
  }
  
  // Secondary scoring
  if (intent.includes('new') || intent.includes('create')) {scores.property += 1;}
  if (intent.includes('email')) {scores.dns += 1;}
  if (intent.includes('hack') || intent.includes('threat')) {scores.security += 1;}
  if (intent.includes('metric') || intent.includes('report')) {scores.performance += 1;}
  
  // Find best match
  const sortedScores = Object.entries(scores)
    .sort(([, a], [, b]) => b - a);
  
  const recommended = sortedScores[0][0];
  const confidence = sortedScores[0][1] / 3 * 100; // Convert to percentage
  
  const alternates = sortedScores
    .slice(1)
    .filter(([, score]) => score > 0)
    .map(([assistant]) => assistant);
  
  return {
    recommended,
    confidence: Math.min(100, confidence),
    alternates,
  };
}

/**
 * Cross-Workflow Orchestration
 * Handles requests that span multiple workflows
 */
export async function handleCrossWorkflowRequest(
  intent: string,
  context: any
): Promise<any> {
  // Example: "Launch a new e-commerce site with security and performance optimization"
  // This would engage multiple assistants in sequence
  
  const discovery = discoverAssistant(intent);
  
  if (discovery.confidence < 50 && discovery.alternates.length > 0) {
    // Multiple workflows detected, provide guidance
    return {
      content: [{
        type: 'text',
        text: `I see you need help with multiple areas. Let me connect you with the right assistants:\n\n` +
              `**Primary:** ${workflowAssistantMetadata[discovery.recommended as keyof typeof workflowAssistantMetadata].name}\n` +
              `**Also relevant:** ${discovery.alternates.map(a => 
                workflowAssistantMetadata[a as keyof typeof workflowAssistantMetadata].name
              ).join(', ')}\n\n` +
              `Would you like to start with ${discovery.recommended}, or shall I help you break down your request?`,
      }],
    };
  }
  
  // Route to primary assistant
  return handleWorkflowAssistantRequest(discovery.recommended, { intent, context });
}

/**
 * Export individual components for direct use
 */
export {
  propertyInfrastructureAssistant,
  dnsDomainAssistant,
  securityComplianceAssistant,
  performanceAnalyticsAssistant,
  handlePropertyInfrastructureAssistant,
  handleDNSDomainAssistant,
  handleSecurityComplianceAssistant,
  handlePerformanceAnalyticsAssistant,
};