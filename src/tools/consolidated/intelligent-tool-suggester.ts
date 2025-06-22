/**
 * Intelligent Tool Suggester
 * Analyzes user intent and suggests the most appropriate tools
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { logger } from '../../utils/logger';
import { WorkflowContextManager } from './workflow-context-manager';

interface ToolSuggestion {
  tool: string;
  confidence: number;
  reason: string;
  parameters?: Record<string, any>;
  alternatives?: string[];
}

interface IntentAnalysis {
  primaryIntent: string;
  entities: {
    action?: string;
    resource?: string;
    target?: string;
    environment?: string;
    modifier?: string;
  };
  keywords: string[];
  confidence: number;
}

export class IntelligentToolSuggester {
  private static instance: IntelligentToolSuggester;
  private contextManager: WorkflowContextManager;
  
  // Intent patterns for different tool categories
  private readonly intentPatterns = {
    // Property operations
    property: {
      create: /\b(create|new|add|setup|initialize)\b.*\b(property|properties)\b/i,
      list: /\b(list|show|get|display|view)\b.*\b(properties|property list)\b/i,
      get: /\b(get|show|display|view|details)\b.*\b(property)\b.*\b(prp_|info|details)\b/i,
      activate: /\b(activate|deploy|push|promote)\b.*\b(property|changes?)\b/i,
      update: /\b(update|modify|change|edit)\b.*\b(property|rules?|behaviors?)\b/i,
      delete: /\b(delete|remove|destroy)\b.*\b(property)\b/i,
    },
    
    // DNS operations
    dns: {
      create: /\b(create|add|new)\b.*\b(dns|zone|record)\b/i,
      list: /\b(list|show|get)\b.*\b(dns|zones?|records?)\b/i,
      update: /\b(update|modify|change)\b.*\b(dns|record|zone)\b/i,
      delete: /\b(delete|remove)\b.*\b(dns|record|zone)\b/i,
    },
    
    // Certificate operations
    certificate: {
      create: /\b(create|add|enroll|request)\b.*\b(certificate|cert|ssl|tls)\b/i,
      list: /\b(list|show|get)\b.*\b(certificates?|certs?|ssl)\b/i,
      deploy: /\b(deploy|activate|enable)\b.*\b(certificate|cert|ssl|https)\b/i,
    },
    
    // Hostname operations
    hostname: {
      add: /\b(add|create|associate)\b.*\b(hostname|domain)\b/i,
      remove: /\b(remove|delete|disassociate)\b.*\b(hostname|domain)\b/i,
      list: /\b(list|show|get)\b.*\b(hostnames?|domains?)\b/i,
      validate: /\b(validate|check|verify)\b.*\b(hostname|domain)\b/i,
    },
    
    // Performance operations
    performance: {
      analyze: /\b(analyze|check|measure)\b.*\b(performance|speed|metrics)\b/i,
      optimize: /\b(optimize|improve|enhance)\b.*\b(performance|speed|cache)\b/i,
      report: /\b(report|summary|statistics)\b.*\b(performance|metrics|analytics)\b/i,
    },
    
    // Security operations
    security: {
      scan: /\b(scan|check|audit)\b.*\b(security|vulnerabilities?)\b/i,
      configure: /\b(configure|setup|enable)\b.*\b(security|waf|protection)\b/i,
      networkList: /\b(network list|ip list|blacklist|whitelist|allowlist|blocklist)\b/i,
    },
    
    // Purge operations
    purge: {
      url: /\b(purge|invalidate|clear)\b.*\b(url|urls|content)\b/i,
      cpcode: /\b(purge|invalidate|clear)\b.*\b(cpcode|cp code)\b/i,
      tag: /\b(purge|invalidate|clear)\b.*\b(tag|tags)\b/i,
    },
  };
  
  // Tool mapping with metadata
  private readonly toolMetadata = new Map<string, {
    category: string;
    description: string;
    requiredParams: string[];
    optionalParams: string[];
    aliases: string[];
  }>();
  
  private constructor() {
    this.contextManager = WorkflowContextManager.getInstance();
    this.initializeToolMetadata();
  }
  
  static getInstance(): IntelligentToolSuggester {
    if (!IntelligentToolSuggester.instance) {
      IntelligentToolSuggester.instance = new IntelligentToolSuggester();
    }
    return IntelligentToolSuggester.instance;
  }
  
  /**
   * Initialize tool metadata
   */
  private initializeToolMetadata(): void {
    // Property tools
    this.toolMetadata.set('list_properties', {
      category: 'property',
      description: 'List all properties for a customer',
      requiredParams: [],
      optionalParams: ['customer', 'contractId', 'groupId'],
      aliases: ['show_properties', 'get_properties'],
    });
    
    this.toolMetadata.set('create_property', {
      category: 'property',
      description: 'Create a new property',
      requiredParams: ['propertyName', 'contractId', 'groupId', 'productId'],
      optionalParams: ['customer', 'ruleFormat'],
      aliases: ['new_property', 'add_property'],
    });
    
    this.toolMetadata.set('activate_property', {
      category: 'property',
      description: 'Activate property to staging or production',
      requiredParams: ['propertyId', 'version', 'network'],
      optionalParams: ['customer', 'note', 'emails'],
      aliases: ['deploy_property', 'push_property'],
    });
    
    // DNS tools
    this.toolMetadata.set('create_zone', {
      category: 'dns',
      description: 'Create a new DNS zone',
      requiredParams: ['zone', 'type', 'contractId'],
      optionalParams: ['customer', 'comment'],
      aliases: ['new_zone', 'add_zone'],
    });
    
    this.toolMetadata.set('create_record', {
      category: 'dns',
      description: 'Create a DNS record',
      requiredParams: ['zone', 'name', 'type', 'ttl', 'rdata'],
      optionalParams: ['customer'],
      aliases: ['add_record', 'new_record'],
    });
    
    // Add more tool metadata as needed...
  }
  
  /**
   * Analyze user intent from natural language
   */
  analyzeIntent(input: string): IntentAnalysis {
    const normalized = input.toLowerCase().trim();
    const words = normalized.split(/\s+/);
    
    const analysis: IntentAnalysis = {
      primaryIntent: '',
      entities: {},
      keywords: [],
      confidence: 0,
    };
    
    // Extract action verbs
    const actionVerbs = ['create', 'list', 'get', 'update', 'delete', 'activate', 
                        'deploy', 'add', 'remove', 'show', 'view', 'analyze'];
    const foundAction = words.find(word => actionVerbs.includes(word));
    if (foundAction) {
      analysis.entities.action = foundAction;
    }
    
    // Extract resource types
    const resources = ['property', 'properties', 'dns', 'zone', 'record', 'certificate', 
                      'hostname', 'domain', 'rule', 'behavior', 'cpcode'];
    const foundResource = words.find(word => resources.includes(word));
    if (foundResource) {
      analysis.entities.resource = foundResource;
    }
    
    // Extract environment
    if (normalized.includes('production') || normalized.includes('prod')) {
      analysis.entities.environment = 'production';
    } else if (normalized.includes('staging') || normalized.includes('stage')) {
      analysis.entities.environment = 'staging';
    }
    
    // Extract IDs and names
    const propertyIdMatch = normalized.match(/prp_\d+/);
    if (propertyIdMatch) {
      analysis.entities.target = propertyIdMatch[0];
    }
    
    // Determine primary intent
    for (const [category, patterns] of Object.entries(this.intentPatterns)) {
      for (const [operation, pattern] of Object.entries(patterns)) {
        if (pattern.test(normalized)) {
          analysis.primaryIntent = `${category}.${operation}`;
          analysis.confidence = 0.8;
          break;
        }
      }
      if (analysis.primaryIntent) break;
    }
    
    // Fallback intent detection
    if (!analysis.primaryIntent && analysis.entities.action && analysis.entities.resource) {
      analysis.primaryIntent = `${analysis.entities.resource}.${analysis.entities.action}`;
      analysis.confidence = 0.6;
    }
    
    // Extract keywords for context
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for'];
    analysis.keywords = words.filter(word => 
      !stopWords.includes(word) && word.length > 2
    );
    
    return analysis;
  }
  
  /**
   * Suggest tools based on user input
   */
  async suggestTools(input: string): Promise<ToolSuggestion[]> {
    const intent = this.analyzeIntent(input);
    const context = this.contextManager.getContext();
    const suggestions: ToolSuggestion[] = [];
    
    // Primary suggestion based on intent
    if (intent.primaryIntent) {
      const primaryTool = this.mapIntentToTool(intent.primaryIntent);
      if (primaryTool) {
        const metadata = this.toolMetadata.get(primaryTool);
        suggestions.push({
          tool: primaryTool,
          confidence: intent.confidence,
          reason: `Based on your intent to ${intent.primaryIntent}`,
          parameters: this.inferParameters(primaryTool, intent, context),
          alternatives: metadata?.aliases,
        });
      }
    }
    
    // Context-based suggestions
    const contextSuggestions = this.getContextBasedSuggestions(context, intent);
    suggestions.push(...contextSuggestions);
    
    // Workflow continuation suggestions
    if (context.activeWorkflow) {
      const workflowSuggestions = this.getWorkflowSuggestions(context);
      suggestions.push(...workflowSuggestions);
    }
    
    // Sort by confidence
    suggestions.sort((a, b) => b.confidence - a.confidence);
    
    // Limit to top 5 suggestions
    return suggestions.slice(0, 5);
  }
  
  /**
   * Map intent to specific tool
   */
  private mapIntentToTool(intent: string): string | null {
    const intentMap: Record<string, string> = {
      'property.create': 'create_property',
      'property.list': 'list_properties',
      'property.get': 'get_property',
      'property.activate': 'activate_property',
      'property.update': 'update_property_rules',
      'property.delete': 'remove_property',
      
      'dns.create': 'create_zone',
      'dns.list': 'list_zones',
      'dns.update': 'update_record',
      'dns.delete': 'delete_record',
      
      'certificate.create': 'create_enrollment',
      'certificate.list': 'list_enrollments',
      'certificate.deploy': 'deploy_certificate',
      
      'hostname.add': 'add_property_hostname',
      'hostname.remove': 'remove_property_hostname',
      'hostname.list': 'list_property_hostnames',
      'hostname.validate': 'validate_hostnames_bulk',
      
      'performance.analyze': 'analyze_performance',
      'performance.optimize': 'optimize_cache',
      'performance.report': 'get_performance_report',
      
      'security.scan': 'scan_vulnerabilities',
      'security.configure': 'configure_security',
      'security.networkList': 'manage_network_lists',
      
      'purge.url': 'invalidate_by_url',
      'purge.cpcode': 'invalidate_by_cpcode',
      'purge.tag': 'invalidate_by_tag',
    };
    
    return intentMap[intent] || null;
  }
  
  /**
   * Get context-based suggestions
   */
  private getContextBasedSuggestions(
    context: any,
    intent: IntentAnalysis
  ): ToolSuggestion[] {
    const suggestions: ToolSuggestion[] = [];
    
    // If we have a property in context, suggest property-related tools
    if (context.propertyId && !intent.primaryIntent.includes('property')) {
      suggestions.push({
        tool: 'get_property_versions',
        confidence: 0.6,
        reason: `You have property ${context.propertyId} in context`,
        parameters: { propertyId: context.propertyId },
      });
      
      suggestions.push({
        tool: 'list_property_hostnames',
        confidence: 0.5,
        reason: `View hostnames for property ${context.propertyId}`,
        parameters: { propertyId: context.propertyId },
      });
    }
    
    // Suggest next logical steps based on recent operations
    const lastOp = context.recentOperations?.[0];
    if (lastOp) {
      const nextSteps = this.getLogicalNextSteps(lastOp.operation);
      nextSteps.forEach(step => {
        suggestions.push({
          tool: step.tool,
          confidence: step.confidence,
          reason: `Logical next step after ${lastOp.operation}`,
          parameters: this.contextManager.inferParameters(
            this.toolMetadata.get(step.tool)?.requiredParams || []
          ),
        });
      });
    }
    
    return suggestions;
  }
  
  /**
   * Get workflow-based suggestions
   */
  private getWorkflowSuggestions(context: any): ToolSuggestion[] {
    const suggestions: ToolSuggestion[] = [];
    
    if (context.activeWorkflow) {
      const currentStep = context.activeWorkflow.currentStep;
      const nextStepName = context.activeWorkflow.steps[currentStep];
      
      if (nextStepName) {
        // Map workflow step to tool
        const tool = this.mapWorkflowStepToTool(nextStepName);
        if (tool) {
          suggestions.push({
            tool,
            confidence: 0.9,
            reason: `Next step in ${context.activeWorkflow.name} workflow`,
            parameters: this.contextManager.inferParameters(
              this.toolMetadata.get(tool)?.requiredParams || []
            ),
          });
        }
      }
    }
    
    return suggestions;
  }
  
  /**
   * Get logical next steps for a given operation
   */
  private getLogicalNextSteps(operation: string): Array<{tool: string; confidence: number}> {
    const nextSteps: Record<string, Array<{tool: string; confidence: number}>> = {
      'create_property': [
        { tool: 'add_property_hostname', confidence: 0.8 },
        { tool: 'update_property_rules', confidence: 0.7 },
        { tool: 'create_property_version', confidence: 0.6 },
      ],
      'add_property_hostname': [
        { tool: 'create_edge_hostname', confidence: 0.8 },
        { tool: 'activate_property', confidence: 0.7 },
      ],
      'update_property_rules': [
        { tool: 'validate_rules', confidence: 0.8 },
        { tool: 'create_property_version', confidence: 0.7 },
        { tool: 'activate_property', confidence: 0.6 },
      ],
      'create_property_version': [
        { tool: 'activate_property', confidence: 0.9 },
        { tool: 'get_version_diff', confidence: 0.6 },
      ],
      'activate_property': [
        { tool: 'get_activation_status', confidence: 0.9 },
        { tool: 'list_property_activations', confidence: 0.6 },
      ],
    };
    
    return nextSteps[operation] || [];
  }
  
  /**
   * Map workflow step name to tool
   */
  private mapWorkflowStepToTool(stepName: string): string | null {
    // Simple mapping - could be enhanced
    const stepMap: Record<string, string> = {
      'Create Property': 'create_property',
      'Add Hostname': 'add_property_hostname',
      'Update Rules': 'update_property_rules',
      'Create Version': 'create_property_version',
      'Activate Property': 'activate_property',
      'Check Status': 'get_activation_status',
    };
    
    return stepMap[stepName] || null;
  }
  
  /**
   * Infer parameters for a tool based on intent and context
   */
  private inferParameters(
    tool: string,
    intent: IntentAnalysis,
    context: any
  ): Record<string, any> {
    const metadata = this.toolMetadata.get(tool);
    if (!metadata) return {};
    
    const params: Record<string, any> = {};
    
    // Get inferred params from context manager
    const contextParams = this.contextManager.inferParameters(metadata.requiredParams);
    Object.assign(params, contextParams);
    
    // Add intent-based parameters
    if (intent.entities.target) {
      if (intent.entities.target.startsWith('prp_')) {
        params.propertyId = intent.entities.target;
      }
    }
    
    if (intent.entities.environment) {
      params.network = intent.entities.environment;
    }
    
    // Tool-specific parameter inference
    switch (tool) {
      case 'activate_property':
        if (!params.network && context.environment) {
          params.network = context.environment;
        }
        params.note = params.note || 'Activation via intelligent tool suggester';
        break;
        
      case 'create_property':
        params.ruleFormat = params.ruleFormat || 'latest';
        break;
    }
    
    return params;
  }
  
  /**
   * Learn from user selections to improve suggestions
   */
  learnFromSelection(
    input: string,
    suggestedTool: string,
    selectedTool: string,
    wasSuccessful: boolean
  ): void {
    // This could be enhanced with ML/statistical learning
    logger.info('Learning from user selection', {
      input,
      suggested: suggestedTool,
      selected: selectedTool,
      successful: wasSuccessful,
    });
    
    // For now, just log for analysis
    // In production, this would update suggestion weights
  }
}