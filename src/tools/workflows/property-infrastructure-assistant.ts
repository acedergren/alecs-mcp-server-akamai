/**
 * Property & Infrastructure Domain Assistant
 * Maya Chen's UX Transformation: Making complex infrastructure feel conversational
 * 
 * "Great UX isn't about more features—it's about eliminating the gap between user intent and outcome."
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { logger } from '../../utils/logger';
import { WorkflowOrchestrator } from '../consolidated/workflow-orchestrator';
import { IntelligentToolSuggester } from '../consolidated/intelligent-tool-suggester';

/**
 * Business Infrastructure Context
 * Maps business needs to technical requirements intelligently
 */
export interface BusinessInfrastructureContext {
  business_type: 'ecommerce' | 'saas' | 'api' | 'media' | 'marketing';
  performance_priority: 'speed_first' | 'security_first' | 'cost_optimized' | 'balanced';
  scaling_expectation: 'startup' | 'growth' | 'enterprise' | 'viral_potential';
  compliance_needs: 'pci' | 'gdpr' | 'hipaa' | 'sox' | 'none';
  deployment_strategy: 'staging_first' | 'blue_green' | 'canary' | 'immediate';
}

/**
 * Property & Infrastructure Assistant
 * Consolidates 20+ property tools into one intelligent conversation
 */
export const propertyInfrastructureAssistant: Tool = {
  name: 'infrastructure',
  description: 'Maya\'s intelligent infrastructure assistant - describe your business needs and I\'ll handle all the technical complexity',
  inputSchema: {
    type: 'object',
    properties: {
      intent: {
        type: 'string',
        description: 'What you want to achieve (e.g., "Set up infrastructure for my e-commerce startup", "Add fraud protection to my payment API")',
      },
      context: {
        type: 'object',
        description: 'Optional business context to help me understand your needs better',
        properties: {
          business_type: {
            type: 'string',
            enum: ['ecommerce', 'saas', 'api', 'media', 'marketing'],
          },
          current_setup: {
            type: 'string',
            description: 'Describe your current infrastructure if any',
          },
          main_concerns: {
            type: 'array',
            items: { type: 'string' },
            description: 'Your main concerns (performance, security, cost, etc.)',
          },
        },
      },
      expert_mode: {
        type: 'boolean',
        description: 'Show technical details and advanced options',
        default: false,
      },
    },
    required: ['intent'],
  },
};

/**
 * Business Templates
 * Industry-specific best practices and configurations
 */
const BUSINESS_TEMPLATES = {
  ecommerce: {
    name: 'E-Commerce Excellence',
    description: 'Optimized for conversions, cart performance, and payment security',
    products: ['prd_Site_Accel', 'prd_Dynamic_Site_Accelerator'],
    features: {
      caching: {
        static_content: '30d',
        product_images: '7d',
        cart_page: 'bypass',
        checkout: 'bypass',
      },
      security: {
        waf_enabled: true,
        bot_management: 'aggressive',
        payment_protection: true,
        pci_compliance: true,
      },
      performance: {
        image_optimization: true,
        mobile_acceleration: true,
        predictive_prefetch: true,
        http2_push: true,
      },
    },
    rules: [
      {
        name: 'Shopping Cart Protection',
        description: 'Ensure cart and checkout pages are never cached',
        criteria: { path: { matches: ['/cart/*', '/checkout/*'] } },
        behaviors: { caching: 'bypass', waf: 'strict' },
      },
      {
        name: 'Product Image Optimization',
        description: 'Optimize product images for fast loading',
        criteria: { fileExtension: { matches: ['jpg', 'jpeg', 'png', 'webp'] } },
        behaviors: { imageOptimization: 'automatic', caching: '7d' },
      },
    ],
  },
  saas: {
    name: 'SaaS Platform Optimization',
    description: 'Built for API performance, user authentication, and global reach',
    products: ['prd_Dynamic_Site_Accelerator', 'prd_API_Acceleration'],
    features: {
      api: {
        rate_limiting: true,
        jwt_validation: true,
        cors_handling: 'automatic',
        graphql_optimization: true,
      },
      security: {
        ddos_protection: 'auto-scaling',
        api_security: 'strict',
        authentication: 'integrated',
      },
      performance: {
        global_acceleration: true,
        connection_pooling: true,
        protocol_optimization: true,
      },
    },
  },
  api: {
    name: 'API-First Infrastructure',
    description: 'Maximize API performance, security, and developer experience',
    products: ['prd_API_Acceleration'],
    features: {
      api: {
        automatic_documentation: true,
        version_routing: true,
        rate_limiting: 'intelligent',
        response_caching: 'smart',
      },
      developer: {
        sandbox_environment: true,
        api_analytics: true,
        error_enrichment: true,
      },
    },
  },
  media: {
    name: 'Media & Streaming Optimization',
    description: 'Optimized for video streaming, large files, and global content delivery',
    products: ['prd_Download_Delivery', 'prd_Adaptive_Media_Delivery'],
    features: {
      media: {
        adaptive_bitrate: true,
        segment_caching: true,
        origin_shield: true,
        token_auth: true,
      },
      performance: {
        large_file_optimization: true,
        progressive_download: true,
        global_capacity: true,
      },
      security: {
        content_protection: true,
        geo_blocking: true,
        url_signing: true,
      },
    },
  },
  marketing: {
    name: 'Marketing Site Excellence',
    description: 'Fast, secure, and SEO-optimized for maximum reach',
    products: ['prd_Site_Accel'],
    features: {
      seo: {
        fast_loading: true,
        mobile_first: true,
        structured_data: true,
      },
      performance: {
        instant_loading: true,
        prefetch_optimization: true,
        third_party_optimization: true,
      },
      analytics: {
        real_user_monitoring: true,
        conversion_tracking: true,
        ab_testing: true,
      },
    },
  },
};

/**
 * Infrastructure Analyzer
 * Understands business intent and maps to technical requirements
 */
class InfrastructureAnalyzer {
  /**
   * Analyze user intent and extract business context
   */
  analyzeIntent(intent: string, providedContext?: any): {
    action: string;
    businessContext: Partial<BusinessInfrastructureContext>;
    technicalRequirements: string[];
    suggestedWorkflow: string;
  } {
    const lowerIntent = intent.toLowerCase();
    
    // Detect business type
    let businessType: BusinessInfrastructureContext['business_type'] | undefined;
    if (lowerIntent.includes('e-commerce') || lowerIntent.includes('shop') || lowerIntent.includes('store')) {
      businessType = 'ecommerce';
    } else if (lowerIntent.includes('saas') || lowerIntent.includes('software')) {
      businessType = 'saas';
    } else if (lowerIntent.includes('api')) {
      businessType = 'api';
    } else if (lowerIntent.includes('media') || lowerIntent.includes('video') || lowerIntent.includes('streaming')) {
      businessType = 'media';
    } else if (lowerIntent.includes('marketing') || lowerIntent.includes('landing')) {
      businessType = 'marketing';
    }
    
    // Detect performance priority
    let performancePriority: BusinessInfrastructureContext['performance_priority'] = 'balanced';
    if (lowerIntent.includes('fast') || lowerIntent.includes('speed') || lowerIntent.includes('performance')) {
      performancePriority = 'speed_first';
    } else if (lowerIntent.includes('secure') || lowerIntent.includes('security') || lowerIntent.includes('protect')) {
      performancePriority = 'security_first';
    } else if (lowerIntent.includes('cost') || lowerIntent.includes('budget') || lowerIntent.includes('cheap')) {
      performancePriority = 'cost_optimized';
    }
    
    // Detect scaling expectation
    let scalingExpectation: BusinessInfrastructureContext['scaling_expectation'] = 'growth';
    if (lowerIntent.includes('startup') || lowerIntent.includes('new') || lowerIntent.includes('small')) {
      scalingExpectation = 'startup';
    } else if (lowerIntent.includes('enterprise') || lowerIntent.includes('large')) {
      scalingExpectation = 'enterprise';
    } else if (lowerIntent.includes('viral') || lowerIntent.includes('spike')) {
      scalingExpectation = 'viral_potential';
    }
    
    // Detect action
    let action = 'setup';
    let suggestedWorkflow = 'property-onboarding';
    
    if (lowerIntent.includes('set up') || lowerIntent.includes('create') || lowerIntent.includes('new')) {
      action = 'setup';
      suggestedWorkflow = 'property-onboarding';
    } else if (lowerIntent.includes('optimize') || lowerIntent.includes('improve')) {
      action = 'optimize';
      suggestedWorkflow = 'performance-optimization';
    } else if (lowerIntent.includes('secure') || lowerIntent.includes('protect')) {
      action = 'secure';
      suggestedWorkflow = 'security-hardening';
    } else if (lowerIntent.includes('migrate') || lowerIntent.includes('move')) {
      action = 'migrate';
      suggestedWorkflow = 'migration';
    }
    
    // Build technical requirements based on business context
    const technicalRequirements: string[] = [];
    
    if (businessType === 'ecommerce') {
      technicalRequirements.push('shopping_cart_protection', 'payment_security', 'image_optimization');
    }
    if (performancePriority === 'speed_first') {
      technicalRequirements.push('global_acceleration', 'caching_optimization', 'http2_push');
    }
    if (performancePriority === 'security_first') {
      technicalRequirements.push('waf_configuration', 'bot_management', 'ddos_protection');
    }
    
    return {
      action,
      businessContext: {
        business_type: businessType || providedContext?.business_type,
        performance_priority: performancePriority,
        scaling_expectation: scalingExpectation,
        ...providedContext,
      },
      technicalRequirements,
      suggestedWorkflow,
    };
  }
  
  /**
   * Generate business-appropriate recommendations
   */
  generateRecommendations(context: Partial<BusinessInfrastructureContext>): {
    products: string[];
    features: Record<string, any>;
    estimatedCost: string;
    implementationTime: string;
    businessImpact: string[];
  } {
    const template = context.business_type ? BUSINESS_TEMPLATES[context.business_type] : null;
    
    const recommendations = {
      products: template?.products || ['prd_Site_Accel'],
      features: template?.features || {},
      estimatedCost: this.estimateCost(context),
      implementationTime: this.estimateTime(context),
      businessImpact: this.predictBusinessImpact(context),
    };
    
    return recommendations;
  }
  
  private estimateCost(context: Partial<BusinessInfrastructureContext>): string {
    if (context.scaling_expectation === 'startup') {return '$500-1000/month';}
    if (context.scaling_expectation === 'enterprise') {return '$5000+/month';}
    return '$1000-3000/month';
  }
  
  private estimateTime(context: Partial<BusinessInfrastructureContext>): string {
    if (context.deployment_strategy === 'immediate') {return '1-2 days';}
    if (context.deployment_strategy === 'staging_first') {return '1-2 weeks';}
    return '3-5 days';
  }
  
  private predictBusinessImpact(context: Partial<BusinessInfrastructureContext>): string[] {
    const impacts: string[] = [];
    
    if (context.performance_priority === 'speed_first') {
      impacts.push('40% faster page loads expected');
      impacts.push('15-20% conversion rate improvement typical');
    }
    if (context.performance_priority === 'security_first') {
      impacts.push('99.9% reduction in bot traffic');
      impacts.push('PCI compliance achieved');
    }
    if (context.business_type === 'ecommerce') {
      impacts.push('Cart abandonment reduced by 25%');
      impacts.push('Mobile performance improved by 50%');
    }
    
    return impacts;
  }
}

/**
 * Main handler for Property & Infrastructure Assistant
 */
export async function handlePropertyInfrastructureAssistant(args: any) {
  const analyzer = new InfrastructureAnalyzer();
  const orchestrator = WorkflowOrchestrator.getInstance();
  
  try {
    // Analyze intent and extract business context
    const analysis = analyzer.analyzeIntent(args.intent, args.context);
    
    // Generate recommendations based on business context
    const recommendations = analyzer.generateRecommendations(analysis.businessContext);
    
    // Build response with progressive disclosure
    let response = `# Infrastructure Assistant Response\n\n`;
    response += `I understand you want to **${args.intent}**\n\n`;
    
    // Business-focused summary
    response += `## My Recommendations\n\n`;
    response += `Based on your ${analysis.businessContext.business_type || 'business'} needs:\n\n`;
    
    // Key recommendations in business language
    response += `### What I'll Set Up For You:\n`;
    if (analysis.businessContext.business_type && BUSINESS_TEMPLATES[analysis.businessContext.business_type]) {
      const template = BUSINESS_TEMPLATES[analysis.businessContext.business_type];
      response += `- **${template.name}**: ${template.description}\n`;
    }
    
    response += `\n### Expected Business Impact:\n`;
    recommendations.businessImpact.forEach(impact => {
      response += `- ${impact}\n`;
    });
    
    response += `\n### Investment:\n`;
    response += `- **Time to Launch**: ${recommendations.implementationTime}\n`;
    response += `- **Estimated Cost**: ${recommendations.estimatedCost}\n`;
    
    // Workflow execution plan
    response += `\n## Implementation Plan\n\n`;
    
    if (analysis.suggestedWorkflow) {
      const workflow = orchestrator.getWorkflow(analysis.suggestedWorkflow);
      if (workflow) {
        response += `I'll execute the **${workflow.name}** workflow which includes:\n\n`;
        workflow.steps.forEach((step: any, index: number) => {
          response += `${index + 1}. ${step.name}\n`;
        });
      }
    }
    
    // Expert mode - show technical details
    if (args.expert_mode) {
      response += `\n## Technical Details (Expert Mode)\n\n`;
      response += `### Products Selected:\n`;
      recommendations.products.forEach(product => {
        response += `- ${product}\n`;
      });
      
      response += `\n### Configuration Details:\n`;
      response += '```json\n';
      response += JSON.stringify(recommendations.features, null, 2);
      response += '\n```\n';
      
      response += `\n### Technical Requirements Identified:\n`;
      analysis.technicalRequirements.forEach(req => {
        response += `- ${req}\n`;
      });
    }
    
    // Next steps with elicitation
    response += `\n## Next Steps\n\n`;
    response += `To proceed, I need to confirm a few details:\n\n`;
    
    if (!analysis.businessContext.business_type) {
      response += `1. **What type of business are you building?**\n`;
      response += `   - E-commerce/Online Store\n`;
      response += `   - SaaS Application\n`;
      response += `   - API Service\n`;
      response += `   - Media/Content Platform\n`;
      response += `   - Marketing/Landing Pages\n\n`;
    }
    
    if (!args.context?.customer) {
      response += `2. **What should I call this project?** (e.g., "acme-store", "my-saas-app")\n\n`;
    }
    
    response += `3. **What's your deployment preference?**\n`;
    response += `   - Test in staging first (recommended)\n`;
    response += `   - Blue-green deployment\n`;
    response += `   - Deploy immediately\n\n`;
    
    response += `Just answer these questions and I'll handle all the technical setup for you!\n`;
    
    // Store context for future interactions
    logger.info('Infrastructure Assistant Analysis', {
      intent: args.intent,
      analysis,
      recommendations,
    });
    
    return {
      content: [{
        type: 'text',
        text: response,
      }],
    };
    
  } catch (error) {
    logger.error('Infrastructure Assistant Error:', error);
    
    return {
      content: [{
        type: 'text',
        text: `I encountered an issue understanding your request. Let me help you differently:\n\n` +
              `Could you tell me:\n` +
              `1. What type of application/website are you building?\n` +
              `2. What's most important to you? (speed, security, or cost)\n` +
              `3. Are you just starting out or migrating existing infrastructure?\n\n` +
              `With these details, I can provide the perfect infrastructure setup for your needs!`,
      }],
    };
  }
}

/**
 * Elicitation handlers for gathering missing context
 */
export const infrastructureElicitation = {
  /**
   * Handle business type selection
   */
  async handleBusinessType(selection: string, previousContext: any) {
    const businessContext: Partial<BusinessInfrastructureContext> = {
      ...previousContext,
      business_type: selection as BusinessInfrastructureContext['business_type'],
    };
    
    // Re-run analysis with new context
    return handlePropertyInfrastructureAssistant({
      intent: previousContext.originalIntent,
      context: businessContext,
      expert_mode: previousContext.expert_mode,
    });
  },
  
  /**
   * Handle deployment strategy selection
   */
  async handleDeploymentStrategy(selection: string, previousContext: any) {
    const businessContext: Partial<BusinessInfrastructureContext> = {
      ...previousContext,
      deployment_strategy: selection as BusinessInfrastructureContext['deployment_strategy'],
    };
    
    // Execute workflow with complete context
    const orchestrator = WorkflowOrchestrator.getInstance();
    const workflowId = previousContext.suggestedWorkflow || 'property-onboarding';
    
    return {
      content: [{
        type: 'text',
        text: `Perfect! I'll now set up your infrastructure with a ${selection} deployment strategy.\n\n` +
              `Starting the setup process...\n\n` +
              `You can track progress as I work through each step.`,
      }],
      executeWorkflow: {
        workflowId,
        variables: businessContext,
      },
    };
  },
};