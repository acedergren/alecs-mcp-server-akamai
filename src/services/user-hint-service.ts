/**
 * USER HINT SERVICE
 * 
 * CODE KAI ARCHITECTURE:
 * Provides contextual hints, tips, warnings, and guidance across all Akamai domains.
 * Similar to the ID Translator, this service ensures users always know what to do next,
 * how to avoid errors, and how to use tools effectively.
 * 
 * KAIZEN PRINCIPLES:
 * - Every tool gets helpful context
 * - Prevent errors before they happen
 * - Guide users to success
 * - Learn from user patterns
 * - Progressive disclosure based on experience
 * 
 * USER EXPERIENCE:
 * - Always know what parameters are needed
 * - Understand what will happen before it happens
 * - Get clear next steps after every operation
 * - Avoid common mistakes with proactive warnings
 * - Discover related tools naturally
 */

import { createLogger } from '../utils/pino-logger';
import { AkamaiClient } from '../akamai-client';

const logger = createLogger('user-hint-service');

/**
 * Hint types for different contexts
 */
export enum HintType {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  TIP = 'tip',
  NEXT_STEP = 'next',
  EXAMPLE = 'example',
  VALIDATION = 'validation',
  PROGRESS = 'progress',
  AUTO = 'auto',
  SHORTCUT = 'shortcut',
  CHECKLIST = 'checklist'
}

/**
 * Individual hint structure
 */
export interface Hint {
  type: HintType;
  message: string;
  action?: string; // Related tool to run
  code?: string; // Example code
  link?: string; // Documentation link
}

/**
 * Complete hint set for a tool
 */
export interface UserHints {
  before: Hint[];        // What to know before running
  during: Hint[];        // What happens during execution
  after: Hint[];         // What to do next
  common_errors: Hint[]; // Common mistakes to avoid
  examples: Hint[];      // Usage examples
  related_tools: RelatedTool[]; // Other useful tools
  warnings: Hint[];      // Important warnings
  tips: Hint[];          // Pro tips
}

/**
 * Related tool information
 */
export interface RelatedTool {
  tool: string;
  description: string;
  when_to_use: string;
}

/**
 * Context for generating hints
 */
export interface HintContext {
  tool: string;
  args?: any;
  domain?: string;
  userId?: string;
  customer?: string;
  hasError?: boolean;
  error?: Error;
  response?: any;
  phase?: 'before' | 'during' | 'after' | 'error';
  workflow?: string;
  requiresContractId?: boolean;
  requiresGroupId?: boolean;
  hasMultipleCustomers?: boolean;
  hasComplexValidation?: boolean;
  isAsyncOperation?: boolean;
  estimatedDuration?: number;
  userExperienceLevel?: 'beginner' | 'intermediate' | 'expert';
  recentErrors?: string[];
  previousTools?: string[];
}

/**
 * Domain-specific hint provider interface
 */
export interface HintProvider {
  getDomainHints(context: HintContext): Promise<Partial<UserHints>>;
}

/**
 * User context tracking for personalization
 */
class UserContextTracker {
  private userHistory = new Map<string, UserHistory>();
  
  getExperienceLevel(userId: string): 'beginner' | 'intermediate' | 'expert' {
    const history = this.userHistory.get(userId);
    if (!history) return 'beginner';
    
    const toolCount = history.toolsUsed.size;
    const errorRate = history.errors.length / history.totalCalls;
    
    if (toolCount < 10 || errorRate > 0.3) return 'beginner';
    if (toolCount < 50 || errorRate > 0.1) return 'intermediate';
    return 'expert';
  }
  
  getRecentErrors(userId: string): string[] {
    const history = this.userHistory.get(userId);
    return history?.errors.slice(-5) || [];
  }
  
  trackToolUse(userId: string, tool: string, success: boolean, error?: string): void {
    const history = this.userHistory.get(userId) || {
      toolsUsed: new Set<string>(),
      errors: [],
      totalCalls: 0,
      lastSeen: new Date()
    };
    
    history.toolsUsed.add(tool);
    history.totalCalls++;
    history.lastSeen = new Date();
    
    if (!success && error) {
      history.errors.push(error);
    }
    
    this.userHistory.set(userId, history);
  }
}

interface UserHistory {
  toolsUsed: Set<string>;
  errors: string[];
  totalCalls: number;
  lastSeen: Date;
}

/**
 * Main User Hint Service
 */
export class UserHintService {
  private providers = new Map<string, HintProvider>();
  private userContext = new UserContextTracker();
  private toolDescriptions = new Map<string, string>();
  
  constructor() {
    this.registerProviders();
    this.loadToolDescriptions();
  }
  
  /**
   * Register all domain hint providers
   */
  private registerProviders(): void {
    // We'll implement these providers one by one
    this.providers.set('property', new PropertyHintProvider());
    this.providers.set('dns', new DnsHintProvider());
    this.providers.set('certificate', new CertificateHintProvider());
    this.providers.set('fast_purge', new FastPurgeHintProvider());
    this.providers.set('network_lists', new NetworkListsHintProvider());
    this.providers.set('reporting', new ReportingHintProvider());
    this.providers.set('billing', new BillingHintProvider());
    this.providers.set('gtm', new GTMHintProvider());
    this.providers.set('edge_workers', new EdgeWorkersHintProvider());
    this.providers.set('edge_kv', new EdgeKVHintProvider());
    this.providers.set('cloudlets', new CloudletsHintProvider());
    this.providers.set('security', new SecurityHintProvider());
    this.providers.set('diagnostics', new DiagnosticsHintProvider());
    this.providers.set('edge_hostnames', new EdgeHostnameHintProvider());
    this.providers.set('includes', new IncludesHintProvider());
    this.providers.set('bulk_operations', new BulkOperationsHintProvider());
    this.providers.set('siem', new SIEMHintProvider());
    this.providers.set('cloud_wrapper', new CloudWrapperHintProvider());
    this.providers.set('media', new MediaHintProvider());
    this.providers.set('contracts', new ContractsHintProvider());
    this.providers.set('workflow', new WorkflowHintProvider());
  }
  
  /**
   * Get hints for a specific context
   */
  async getHints(context: HintContext): Promise<UserHints> {
    const hints: UserHints = {
      before: [],
      during: [],
      after: [],
      common_errors: [],
      examples: [],
      related_tools: [],
      warnings: [],
      tips: []
    };
    
    try {
      // Extract domain from tool name
      const domain = this.extractDomain(context.tool);
      context.domain = domain;
      
      // Get domain-specific hints
      const provider = this.providers.get(domain);
      if (provider) {
        const domainHints = await provider.getDomainHints(context);
        this.mergeHints(hints, domainHints);
      }
      
      // Add universal hints
      this.addUniversalHints(hints, context);
      
      // Personalize based on user history
      if (context.userId) {
        this.personalizeHints(hints, context);
      }
      
      // Add workflow hints if in a workflow
      if (context.workflow) {
        this.addWorkflowHints(hints, context);
      }
      
      // Sort and deduplicate
      this.optimizeHints(hints);
      
    } catch (error) {
      logger.error({ error, context }, 'Failed to generate hints');
    }
    
    return hints;
  }
  
  /**
   * Track tool usage for personalization
   */
  trackUsage(userId: string, tool: string, success: boolean, error?: string): void {
    this.userContext.trackToolUse(userId, tool, success, error);
  }
  
  /**
   * Extract domain from tool name
   */
  private extractDomain(tool: string): string {
    // Tools are named like: property_list, dns_record_update, etc.
    const parts = tool.split('_');
    
    // Special cases for multi-word domains
    if (tool.startsWith('edge_hostname')) return 'edge_hostnames';
    if (tool.startsWith('edge_worker')) return 'edge_workers';
    if (tool.startsWith('edge_kv')) return 'edge_kv';
    if (tool.startsWith('fast_purge')) return 'fast_purge';
    if (tool.startsWith('network_list')) return 'network_lists';
    if (tool.startsWith('cloud_wrapper')) return 'cloud_wrapper';
    if (tool.startsWith('bulk_')) return 'bulk_operations';
    
    // Default: first part is domain
    return parts[0];
  }
  
  /**
   * Add universal hints that apply across domains
   */
  private addUniversalHints(hints: UserHints, context: HintContext): void {
    // Contract/Group discovery hints
    if (context.requiresContractId && !context.args?.contractId) {
      hints.before.push({
        type: HintType.INFO,
        message: "💡 Need a contract ID? Run 'contract_list' to see all available contracts",
        action: 'contract_list'
      });
      
      hints.tips.push({
        type: HintType.AUTO,
        message: "🔍 This tool will auto-discover contracts if not provided (may take longer)"
      });
    }
    
    if (context.requiresGroupId && !context.args?.groupId) {
      hints.before.push({
        type: HintType.INFO,
        message: "💡 Need a group ID? Run 'group_list' with your contract ID",
        action: 'group_list'
      });
    }
    
    // Multi-customer hints
    if (context.hasMultipleCustomers && !context.args?.customer) {
      hints.tips.push({
        type: HintType.TIP,
        message: "💼 Working with multiple accounts? Use 'customer' parameter to specify which account",
        example: 'customer: "production"'
      });
    }
    
    // Async operation hints
    if (context.isAsyncOperation) {
      hints.during.push({
        type: HintType.PROGRESS,
        message: `⏳ This operation typically takes ${this.formatDuration(context.estimatedDuration)}. You'll see progress updates...`
      });
    }
    
    // Validation hints
    if (context.hasComplexValidation) {
      hints.before.push({
        type: HintType.VALIDATION,
        message: "✅ Your inputs will be validated before making any changes"
      });
    }
    
    // Error recovery hints
    if (context.hasError && context.error) {
      this.addErrorHints(hints, context.error);
    }
  }
  
  /**
   * Personalize hints based on user experience
   */
  private personalizeHints(hints: UserHints, context: HintContext): void {
    const level = context.userExperienceLevel || 
                  this.userContext.getExperienceLevel(context.userId!);
    
    if (level === 'beginner') {
      // Add more detailed explanations
      const toolDesc = this.toolDescriptions.get(context.tool);
      if (toolDesc) {
        hints.before.unshift({
          type: HintType.INFO,
          message: `📖 ${toolDesc}`
        });
      }
      
      // Add common parameter explanations
      this.addParameterHints(hints, context);
      
    } else if (level === 'expert') {
      // Add shortcuts and advanced features
      const shortcuts = this.getExpertShortcuts(context.tool);
      shortcuts.forEach(shortcut => hints.tips.push(shortcut));
    }
    
    // Add hints based on recent errors
    const recentErrors = context.recentErrors || 
                        this.userContext.getRecentErrors(context.userId!);
    
    if (recentErrors.includes('CONTRACT_NOT_FOUND')) {
      hints.warnings.push({
        type: HintType.WARNING,
        message: "⚠️ You recently had contract issues. Double-check you're using the right customer account."
      });
    }
    
    if (recentErrors.includes('RATE_LIMITED')) {
      hints.tips.push({
        type: HintType.TIP,
        message: "💡 Consider using bulk operations to reduce API calls and avoid rate limits",
        action: 'bulk_operations_help'
      });
    }
  }
  
  /**
   * Add workflow-specific hints
   */
  private addWorkflowHints(hints: UserHints, context: HintContext): void {
    switch (context.workflow) {
      case 'new_site':
        hints.before.push({
          type: HintType.CHECKLIST,
          message: "📋 New Site Deployment Checklist:"
        });
        break;
        
      case 'certificate_renewal':
        hints.warnings.push({
          type: HintType.WARNING,
          message: "⚠️ Certificate renewal in progress. Do not delete the old certificate until the new one is active."
        });
        break;
    }
  }
  
  /**
   * Add error-specific hints
   */
  private addErrorHints(hints: UserHints, error: Error): void {
    const errorMessage = error.message.toLowerCase();
    
    if (errorMessage.includes('contract') || errorMessage.includes('group')) {
      hints.common_errors.push({
        type: HintType.ERROR,
        message: "Missing contract or group ID. Run 'contract_list' to find your contract ID.",
        action: 'contract_list'
      });
    }
    
    if (errorMessage.includes('not found')) {
      hints.common_errors.push({
        type: HintType.ERROR,
        message: "Resource not found. Check if you're using the correct customer account or if the resource was deleted."
      });
    }
    
    if (errorMessage.includes('permission') || errorMessage.includes('forbidden')) {
      hints.common_errors.push({
        type: HintType.ERROR,
        message: "Permission denied. Your API credentials may lack the required permissions for this operation."
      });
    }
  }
  
  /**
   * Helper methods
   */
  private formatDuration(ms?: number): string {
    if (!ms) return 'a few moments';
    if (ms < 60000) return `${Math.round(ms / 1000)} seconds`;
    if (ms < 3600000) return `${Math.round(ms / 60000)} minutes`;
    return `${Math.round(ms / 3600000)} hours`;
  }
  
  private mergeHints(target: UserHints, source: Partial<UserHints>): void {
    Object.keys(source).forEach(key => {
      const k = key as keyof UserHints;
      if (Array.isArray(source[k])) {
        (target[k] as any[]).push(...(source[k] as any[]));
      }
    });
  }
  
  private optimizeHints(hints: UserHints): void {
    // Remove duplicates
    Object.keys(hints).forEach(key => {
      const k = key as keyof UserHints;
      if (Array.isArray(hints[k])) {
        const seen = new Set<string>();
        hints[k] = (hints[k] as any[]).filter(hint => {
          const key = JSON.stringify(hint);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      }
    });
    
    // Sort by importance
    hints.before.sort((a, b) => this.getHintPriority(b) - this.getHintPriority(a));
    hints.warnings.sort((a, b) => this.getHintPriority(b) - this.getHintPriority(a));
  }
  
  private getHintPriority(hint: Hint): number {
    const priorities: Record<HintType, number> = {
      [HintType.ERROR]: 100,
      [HintType.WARNING]: 90,
      [HintType.VALIDATION]: 80,
      [HintType.CHECKLIST]: 70,
      [HintType.INFO]: 60,
      [HintType.AUTO]: 50,
      [HintType.PROGRESS]: 40,
      [HintType.TIP]: 30,
      [HintType.EXAMPLE]: 20,
      [HintType.NEXT_STEP]: 10,
      [HintType.SHORTCUT]: 5
    };
    return priorities[hint.type] || 0;
  }
  
  private loadToolDescriptions(): void {
    // Load descriptions for all tools
    // This would ideally come from a configuration file
    this.toolDescriptions.set('property_list', 'List all properties in your account or search for specific properties');
    this.toolDescriptions.set('property_create', 'Create a new CDN property configuration');
    this.toolDescriptions.set('property_activate', 'Deploy property changes to staging or production');
    this.toolDescriptions.set('dns_record_update', 'Update DNS records for a zone');
    this.toolDescriptions.set('certificate_create', 'Request a new SSL/TLS certificate');
    // ... add all tool descriptions
  }
  
  private addParameterHints(hints: UserHints, context: HintContext): void {
    // Add parameter-specific hints for beginners
    if (context.tool === 'property_create') {
      hints.tips.push({
        type: HintType.TIP,
        message: "💡 Parameters explained:\n- contractId: Your Akamai contract (billing account)\n- groupId: Folder for organizing properties\n- productId: The Akamai product to use (Ion, DSA, etc.)"
      });
    }
  }
  
  private getExpertShortcuts(tool: string): Hint[] {
    const shortcuts: Hint[] = [];
    
    if (tool === 'property_list') {
      shortcuts.push({
        type: HintType.SHORTCUT,
        message: "⚡ Use property_search for faster results when you know the property name"
      });
    }
    
    return shortcuts;
  }
}

/**
 * Property Domain Hint Provider
 */
class PropertyHintProvider implements HintProvider {
  async getDomainHints(context: HintContext): Promise<Partial<UserHints>> {
    const hints: Partial<UserHints> = {
      before: [],
      after: [],
      common_errors: [],
      warnings: [],
      tips: [],
      related_tools: []
    };
    
    switch (context.tool) {
      case 'property_create':
        hints.before = [
          {
            type: HintType.INFO,
            message: 'A CP Code will be created automatically for billing and reporting'
          },
          {
            type: HintType.TIP,
            message: 'Use a template to get started quickly',
            code: 'templateName: "Ion Standard"'
          }
        ];
        hints.after = [
          {
            type: HintType.NEXT_STEP,
            message: 'Add rules to configure your property behavior',
            action: 'property_rules_update'
          },
          {
            type: HintType.NEXT_STEP,
            message: 'Create an edge hostname for your domain',
            action: 'edge_hostname_create'
          },
          {
            type: HintType.NEXT_STEP,
            message: 'Test your configuration on staging',
            action: 'property_activate'
          }
        ];
        hints.common_errors = [
          {
            type: HintType.ERROR,
            message: 'Missing contractId? Run contract_list to find your contracts'
          },
          {
            type: HintType.ERROR,
            message: 'Invalid productId? Common values: Ion, DSA, Download_Delivery'
          }
        ];
        break;
        
      case 'property_list':
        if (!context.args?.contractId || !context.args?.groupId) {
          hints.before = [
            {
              type: HintType.AUTO,
              message: '🔍 Auto-discovering properties across all contracts and groups...'
            }
          ];
          hints.tips = [
            {
              type: HintType.TIP,
              message: 'This may take longer without specific contract/group IDs'
            }
          ];
        }
        hints.related_tools = [
          {
            tool: 'property_search',
            description: 'Search for properties by name or hostname',
            when_to_use: 'When you know what you\'re looking for'
          },
          {
            tool: 'property_versions_list',
            description: 'List all versions of a property',
            when_to_use: 'To see version history'
          }
        ];
        break;
        
      case 'property_activate':
        hints.warnings = [
          {
            type: HintType.WARNING,
            message: '⚠️ Always test on STAGING before activating to PRODUCTION'
          },
          {
            type: HintType.INFO,
            message: '⏱️ Activation times: Staging ~3 min, Production ~15 min, First-time ~60 min'
          }
        ];
        hints.before = [
          {
            type: HintType.CHECKLIST,
            message: '✓ Property configuration validated?'
          },
          {
            type: HintType.CHECKLIST,
            message: '✓ Edge hostname created and configured?'
          },
          {
            type: HintType.CHECKLIST,
            message: '✓ SSL certificate provisioned (if using HTTPS)?'
          },
          {
            type: HintType.CHECKLIST,
            message: '✓ DNS prepared for cutover?'
          }
        ];
        hints.after = [
          {
            type: HintType.NEXT_STEP,
            message: 'Monitor activation progress',
            action: 'property_activation_status'
          },
          {
            type: HintType.NEXT_STEP,
            message: 'Test your staging URL before production',
            action: 'diagnostic_url_health'
          }
        ];
        break;
        
      case 'property_rules_update':
        hints.tips = [
          {
            type: HintType.TIP,
            message: 'Use property_rules_template for common configurations'
          },
          {
            type: HintType.TIP,
            message: 'Validate rules before saving to catch errors early'
          }
        ];
        hints.warnings = [
          {
            type: HintType.WARNING,
            message: '⚠️ Changes require activation to take effect'
          }
        ];
        break;
    }
    
    return hints;
  }
}

/**
 * DNS Domain Hint Provider
 */
class DnsHintProvider implements HintProvider {
  async getDomainHints(context: HintContext): Promise<Partial<UserHints>> {
    const hints: Partial<UserHints> = {
      before: [],
      during: [],
      after: [],
      warnings: [],
      tips: []
    };
    
    switch (context.tool) {
      case 'dns_record_update':
        hints.before = [
          {
            type: HintType.INFO,
            message: '📝 DNS updates use a changelist workflow - changes are batched automatically'
          }
        ];
        hints.during = [
          {
            type: HintType.PROGRESS,
            message: 'Creating changelist → Adding records → Validating → Submitting → Activating'
          }
        ];
        hints.after = [
          {
            type: HintType.INFO,
            message: '🌍 DNS propagation: Akamai network immediate, Global DNS 5-10 minutes'
          },
          {
            type: HintType.NEXT_STEP,
            message: 'Verify DNS resolution',
            action: 'dns_record_check'
          }
        ];
        hints.tips = [
          {
            type: HintType.TIP,
            message: '💡 Making multiple changes? They\'ll be batched together for efficiency'
          }
        ];
        break;
        
      case 'dns_zone_create':
        hints.before = [
          {
            type: HintType.CHECKLIST,
            message: '✓ Have your nameserver records ready?'
          },
          {
            type: HintType.CHECKLIST,
            message: '✓ Know which zone type you need? (primary, secondary, or alias)'
          }
        ];
        hints.after = [
          {
            type: HintType.NEXT_STEP,
            message: 'Add DNS records to your zone',
            action: 'dns_record_create'
          },
          {
            type: HintType.NEXT_STEP,
            message: 'Update your domain registrar to point to Akamai nameservers'
          }
        ];
        break;
        
      case 'dns_bulk_update':
        hints.tips = [
          {
            type: HintType.TIP,
            message: '📦 All changes will be applied in a single changelist for atomic updates'
          }
        ];
        hints.warnings = [
          {
            type: HintType.WARNING,
            message: '⚠️ Large bulk updates may take longer to validate'
          }
        ];
        break;
    }
    
    return hints;
  }
}

/**
 * Certificate Domain Hint Provider
 */
class CertificateHintProvider implements HintProvider {
  async getDomainHints(context: HintContext): Promise<Partial<UserHints>> {
    const hints: Partial<UserHints> = {
      before: [],
      during: [],
      after: [],
      warnings: [],
      tips: []
    };
    
    switch (context.tool) {
      case 'certificate_create':
        hints.before = [
          {
            type: HintType.INFO,
            message: '🔐 Domain Validation (DV) certificates are automated and faster'
          },
          {
            type: HintType.CHECKLIST,
            message: '✓ Control DNS for validation? (required for wildcards)'
          }
        ];
        hints.during = [
          {
            type: HintType.PROGRESS,
            message: '11-step process: CSR → Validation → Issuance → Deployment'
          }
        ];
        hints.after = [
          {
            type: HintType.NEXT_STEP,
            message: 'Complete domain validation',
            action: 'certificate_validation_status'
          },
          {
            type: HintType.NEXT_STEP,
            message: 'Deploy certificate to network',
            action: 'certificate_deployment_create'
          }
        ];
        hints.tips = [
          {
            type: HintType.TIP,
            message: '💡 Use Enhanced TLS network for modern features (HTTP/2, better ciphers)'
          }
        ];
        hints.warnings = [
          {
            type: HintType.WARNING,
            message: '⚠️ DNS validation records must exist BEFORE running validation'
          }
        ];
        break;
        
      case 'certificate_deployment_create':
        hints.warnings = [
          {
            type: HintType.WARNING,
            message: '⚠️ Allow 6 hours for global deployment'
          }
        ];
        hints.tips = [
          {
            type: HintType.TIP,
            message: '💡 Deploy to staging network first for testing'
          }
        ];
        break;
    }
    
    return hints;
  }
}

// Placeholder implementations for other providers
// These would be fully implemented in the real system

class FastPurgeHintProvider implements HintProvider {
  async getDomainHints(context: HintContext): Promise<Partial<UserHints>> {
    const hints: Partial<UserHints> = {};
    
    if (context.tool === 'fast_purge_url') {
      hints.tips = [
        {
          type: HintType.TIP,
          message: '💡 URL encoding: Encode spaces (%20) but NOT the protocol (https://)'
        }
      ];
      hints.warnings = [
        {
          type: HintType.WARNING,
          message: '⚠️ Purging should not replace proper cache headers (TTL)'
        }
      ];
    }
    
    return hints;
  }
}

class NetworkListsHintProvider implements HintProvider {
  async getDomainHints(context: HintContext): Promise<Partial<UserHints>> {
    const hints: Partial<UserHints> = {};
    
    if (context.tool.includes('network_list')) {
      hints.tips = [
        {
          type: HintType.TIP,
          message: '⚡ Network list activation is fast (~5-10 minutes)'
        }
      ];
    }
    
    return hints;
  }
}

class ReportingHintProvider implements HintProvider {
  async getDomainHints(context: HintContext): Promise<Partial<UserHints>> {
    const hints: Partial<UserHints> = {};
    
    if (context.tool.includes('report')) {
      hints.tips = [
        {
          type: HintType.TIP,
          message: '📊 Data lag: Traffic 2hrs, Performance 4hrs, Security 30min'
        }
      ];
    }
    
    return hints;
  }
}

class BillingHintProvider implements HintProvider {
  async getDomainHints(context: HintContext): Promise<Partial<UserHints>> {
    const hints: Partial<UserHints> = {};
    
    if (context.tool === 'billing_usage_report') {
      hints.tips = [
        {
          type: HintType.TIP,
          message: '💰 Historical data available for 18 months'
        }
      ];
    }
    
    return hints;
  }
}

class GTMHintProvider implements HintProvider {
  async getDomainHints(context: HintContext): Promise<Partial<UserHints>> {
    const hints: Partial<UserHints> = {};
    
    if (context.tool.includes('gtm')) {
      hints.warnings = [
        {
          type: HintType.WARNING,
          message: '⚠️ GTM properties are NOT Property Manager properties!'
        }
      ];
    }
    
    return hints;
  }
}

class EdgeWorkersHintProvider implements HintProvider {
  async getDomainHints(context: HintContext): Promise<Partial<UserHints>> {
    const hints: Partial<UserHints> = {};
    
    if (context.tool === 'edge_worker_create') {
      hints.tips = [
        {
          type: HintType.TIP,
          message: '⚡ EdgeWorkers have <5ms cold start time'
        }
      ];
    }
    
    return hints;
  }
}

class EdgeKVHintProvider implements HintProvider {
  async getDomainHints(context: HintContext): Promise<Partial<UserHints>> {
    const hints: Partial<UserHints> = {};
    
    if (context.tool.includes('edge_kv')) {
      hints.tips = [
        {
          type: HintType.TIP,
          message: '💾 EdgeKV supports string and JSON storage with geo-replication'
        }
      ];
    }
    
    return hints;
  }
}

class CloudletsHintProvider implements HintProvider {
  async getDomainHints(context: HintContext): Promise<Partial<UserHints>> {
    const hints: Partial<UserHints> = {};
    
    if (context.tool.includes('cloudlet')) {
      hints.tips = [
        {
          type: HintType.TIP,
          message: '☁️ Cloudlets provide edge logic without code deployment'
        }
      ];
    }
    
    return hints;
  }
}

class SecurityHintProvider implements HintProvider {
  async getDomainHints(context: HintContext): Promise<Partial<UserHints>> {
    const hints: Partial<UserHints> = {};
    
    if (context.tool.includes('security_config')) {
      hints.tips = [
        {
          type: HintType.TIP,
          message: '🛡️ Modern WAF uses Adaptive Security Engine (ASE)'
        }
      ];
    }
    
    return hints;
  }
}

class DiagnosticsHintProvider implements HintProvider {
  async getDomainHints(context: HintContext): Promise<Partial<UserHints>> {
    const hints: Partial<UserHints> = {};
    
    if (context.tool === 'diagnostic_url_health') {
      hints.tips = [
        {
          type: HintType.TIP,
          message: '🔍 Tests from multiple global locations for comprehensive results'
        }
      ];
    }
    
    return hints;
  }
}

class EdgeHostnameHintProvider implements HintProvider {
  async getDomainHints(context: HintContext): Promise<Partial<UserHints>> {
    const hints: Partial<UserHints> = {};
    
    if (context.tool === 'edge_hostname_create') {
      hints.warnings = [
        {
          type: HintType.WARNING,
          message: '⚠️ Domain suffix is PERMANENT: edgekey.net (recommended), edgesuite.net (legacy)'
        }
      ];
    }
    
    return hints;
  }
}

class IncludesHintProvider implements HintProvider {
  async getDomainHints(context: HintContext): Promise<Partial<UserHints>> {
    const hints: Partial<UserHints> = {};
    
    if (context.tool.includes('include')) {
      hints.tips = [
        {
          type: HintType.TIP,
          message: '📦 Includes let you reuse rule configurations across properties'
        }
      ];
    }
    
    return hints;
  }
}

class BulkOperationsHintProvider implements HintProvider {
  async getDomainHints(context: HintContext): Promise<Partial<UserHints>> {
    const hints: Partial<UserHints> = {};
    
    if (context.tool.includes('bulk')) {
      hints.tips = [
        {
          type: HintType.TIP,
          message: '🚀 Bulk operations reduce API calls and complete faster'
        }
      ];
    }
    
    return hints;
  }
}

class SIEMHintProvider implements HintProvider {
  async getDomainHints(context: HintContext): Promise<Partial<UserHints>> {
    const hints: Partial<UserHints> = {};
    
    if (context.tool.includes('siem')) {
      hints.tips = [
        {
          type: HintType.TIP,
          message: '📊 SIEM integration provides real-time security event streaming'
        }
      ];
    }
    
    return hints;
  }
}

class CloudWrapperHintProvider implements HintProvider {
  async getDomainHints(context: HintContext): Promise<Partial<UserHints>> {
    const hints: Partial<UserHints> = {};
    
    if (context.tool.includes('cloud_wrapper')) {
      hints.tips = [
        {
          type: HintType.TIP,
          message: '☁️ Cloud Wrapper optimizes cloud egress costs'
        }
      ];
    }
    
    return hints;
  }
}

class MediaHintProvider implements HintProvider {
  async getDomainHints(context: HintContext): Promise<Partial<UserHints>> {
    const hints: Partial<UserHints> = {};
    
    if (context.tool.includes('media')) {
      hints.tips = [
        {
          type: HintType.TIP,
          message: '🎬 Media delivery includes adaptive bitrate and device detection'
        }
      ];
    }
    
    return hints;
  }
}

class ContractsHintProvider implements HintProvider {
  async getDomainHints(context: HintContext): Promise<Partial<UserHints>> {
    const hints: Partial<UserHints> = {};
    
    if (context.tool === 'contract_list') {
      hints.tips = [
        {
          type: HintType.TIP,
          message: '📋 Contracts are read-only - they represent your commercial agreements'
        }
      ];
    }
    
    return hints;
  }
}

class WorkflowHintProvider implements HintProvider {
  async getDomainHints(context: HintContext): Promise<Partial<UserHints>> {
    const hints: Partial<UserHints> = {};
    
    if (context.tool.includes('workflow')) {
      hints.tips = [
        {
          type: HintType.TIP,
          message: '🔄 Workflows orchestrate multiple operations with proper sequencing'
        }
      ];
    }
    
    return hints;
  }
}

// Create singleton instance
let hintServiceInstance: UserHintService | null = null;

export function getUserHintService(): UserHintService {
  if (!hintServiceInstance) {
    hintServiceInstance = new UserHintService();
  }
  return hintServiceInstance;
}

// Helper function to enhance tool responses with hints
export async function enhanceResponseWithHints(
  tool: string,
  args: any,
  response: any,
  options?: {
    userId?: string;
    customer?: string;
    error?: Error;
  }
): Promise<any> {
  const hintService = getUserHintService();
  
  const context: HintContext = {
    tool,
    args,
    userId: options?.userId,
    customer: options?.customer || args?.customer,
    hasError: !!options?.error,
    error: options?.error,
    response,
    phase: options?.error ? 'error' : 'after'
  };
  
  const hints = await hintService.getHints(context);
  
  // Track usage
  if (options?.userId) {
    hintService.trackUsage(
      options.userId,
      tool,
      !options.error,
      options.error?.message
    );
  }
  
  // Format hints for display
  let hintText = '';
  
  if (options?.error && hints.common_errors.length > 0) {
    hintText += '\n\n## 💡 Common Solutions\n';
    hints.common_errors.forEach(hint => {
      hintText += `- ${hint.message}`;
      if (hint.action) {
        hintText += ` (try: \`${hint.action}\`)`;
      }
      hintText += '\n';
    });
  }
  
  if (hints.after.length > 0 && !options?.error) {
    hintText += '\n\n## 🎯 Next Steps\n';
    hints.after.forEach((hint, index) => {
      hintText += `${index + 1}. ${hint.message}`;
      if (hint.action) {
        hintText += ` - Run: \`${hint.action}\``;
      }
      hintText += '\n';
    });
  }
  
  if (hints.tips.length > 0) {
    hintText += '\n\n## 💡 Pro Tips\n';
    hints.tips.forEach(hint => {
      hintText += `- ${hint.message}`;
      if (hint.code) {
        hintText += `\n  \`\`\`\n  ${hint.code}\n  \`\`\``;
      }
      hintText += '\n';
    });
  }
  
  if (hints.warnings.length > 0) {
    hintText += '\n\n## ⚠️ Important\n';
    hints.warnings.forEach(hint => {
      hintText += `- ${hint.message}\n`;
    });
  }
  
  if (hints.related_tools.length > 0) {
    hintText += '\n\n## 🔗 Related Tools\n';
    hints.related_tools.forEach(tool => {
      hintText += `- \`${tool.tool}\`: ${tool.description}`;
      if (tool.when_to_use) {
        hintText += ` (${tool.when_to_use})`;
      }
      hintText += '\n';
    });
  }
  
  // Add hints to response
  if (hintText && response?.content) {
    if (Array.isArray(response.content)) {
      response.content.push({
        type: 'text',
        text: hintText
      });
    } else if (typeof response.content === 'string') {
      response.content += hintText;
    }
  }
  
  return response;
}