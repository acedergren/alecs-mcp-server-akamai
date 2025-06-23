/**
 * Security & Compliance Domain Assistant
 * Maya Chen's UX Transformation: Making security approachable without compromising protection
 * 
 * "Security is often seen as a barrier to business. This assistant turns it into an enabler by
 * translating business needs into security policies automatically."
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { logger } from '../../utils/logger';
import { WorkflowOrchestrator } from '../consolidated/workflow-orchestrator';

/**
 * Business Security Context
 * Maps business requirements to security needs
 */
export interface BusinessSecurityContext {
  business_type: 'financial' | 'healthcare' | 'retail' | 'media' | 'government' | 'general';
  data_sensitivity: 'public' | 'internal' | 'confidential' | 'restricted';
  compliance_requirements: ('pci' | 'hipaa' | 'gdpr' | 'sox' | 'iso27001' | 'none')[];
  threat_model: 'standard' | 'elevated' | 'high_risk';
  user_base: 'internal_only' | 'b2b' | 'b2c' | 'mixed';
}

/**
 * Security & Compliance Assistant
 * Translates business language to security configurations
 */
export const securityComplianceAssistant: Tool = {
  name: 'security',
  description: 'Maya\'s Security assistant for ALECS - I protect your business without getting in the way',
  inputSchema: {
    type: 'object',
    properties: {
      intent: {
        type: 'string',
        description: 'What security goal do you have? (e.g., "Protect customer payment data", "Block malicious bots", "Meet GDPR requirements")',
      },
      context: {
        type: 'object',
        description: 'Business context for security decisions',
        properties: {
          business_type: {
            type: 'string',
            enum: ['financial', 'healthcare', 'retail', 'media', 'government', 'general'],
          },
          current_issues: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['bot_attacks', 'data_breaches', 'slow_performance', 'compliance_gaps', 'fraud'],
            },
          },
          security_maturity: {
            type: 'string',
            enum: ['just_starting', 'basic_protection', 'advanced', 'expert'],
          },
        },
      },
      urgency: {
        type: 'string',
        description: 'How urgent is this security need?',
        enum: ['immediate_threat', 'compliance_deadline', 'proactive_improvement', 'exploration'],
      },
      auto_apply: {
        type: 'boolean',
        description: 'Automatically apply recommended security settings (with safety checks)',
        default: false,
      },
    },
    required: ['intent'],
  },
};

/**
 * Compliance Templates
 * Pre-built configurations for common compliance needs
 */
const COMPLIANCE_TEMPLATES = {
  pci: {
    name: 'PCI DSS Compliance',
    description: 'Payment Card Industry Data Security Standard',
    requirements: [
      'Encrypt all payment data in transit',
      'Implement strong access controls',
      'Maintain secure network architecture',
      'Regular security testing and monitoring',
      'Incident response procedures',
    ],
    akamaiFeatures: [
      'Web Application Firewall (WAF)',
      'Bot Manager for fraud prevention',
      'SSL/TLS encryption',
      'DDoS protection',
      'Security monitoring and alerts',
    ],
    implementationSteps: [
      'Enable Kona Site Defender WAF',
      'Configure Bot Manager with payment protection',
      'Set up compliance reporting',
      'Enable security event logging',
      'Configure alert thresholds',
    ],
  },
  gdpr: {
    name: 'GDPR Compliance',
    description: 'General Data Protection Regulation',
    requirements: [
      'Data privacy by design',
      'User consent management',
      'Right to erasure',
      'Data portability',
      'Breach notification',
    ],
    akamaiFeatures: [
      'Geographic access controls',
      'Data residency enforcement',
      'Privacy-preserving analytics',
      'Consent management integration',
      'Audit logging',
    ],
  },
  hipaa: {
    name: 'HIPAA Compliance',
    description: 'Health Insurance Portability and Accountability Act',
    requirements: [
      'Protected Health Information (PHI) encryption',
      'Access controls and audit logs',
      'Data integrity controls',
      'Transmission security',
      'Business associate agreements',
    ],
    akamaiFeatures: [
      'End-to-end encryption',
      'Role-based access control',
      'Audit trail maintenance',
      'Secure API protection',
      'Compliant edge computing',
    ],
  },
};

/**
 * Threat Response Templates
 * Quick responses to active threats
 */
const THREAT_RESPONSES = {
  bot_attack: {
    name: 'Bot Attack Mitigation',
    severity: 'high',
    immediateActions: [
      'Enable Bot Manager Premier',
      'Activate known bot signatures',
      'Enable challenge-response for suspicious traffic',
      'Increase rate limiting thresholds',
    ],
    monitoringSetup: [
      'Bot score distribution dashboard',
      'Failed login attempt monitoring',
      'API abuse detection',
      'Real-time alert configuration',
    ],
  },
  ddos_attack: {
    name: 'DDoS Attack Response',
    severity: 'critical',
    immediateActions: [
      'Activate DDoS protection',
      'Enable edge rate controls',
      'Configure geographic filtering if needed',
      'Implement progressive challenges',
    ],
    monitoringSetup: [
      'Traffic volume monitoring',
      'Origin health checks',
      'Attack vector analysis',
      'Automatic escalation setup',
    ],
  },
  data_scraping: {
    name: 'Data Scraping Prevention',
    severity: 'medium',
    immediateActions: [
      'Enable bot detection for scrapers',
      'Implement device fingerprinting',
      'Add honeypot traps',
      'Obfuscate valuable data endpoints',
    ],
  },
};

/**
 * Security Analyzer
 * Interprets business intent and recommends security measures
 */
class SecurityAnalyzer {
  /**
   * Analyze security intent and map to technical requirements
   */
  analyzeIntent(intent: string, context?: any): {
    threatType: string;
    riskLevel: 'critical' | 'high' | 'medium' | 'low';
    complianceNeeds: string[];
    recommendedActions: string[];
    businessImpact: string;
  } {
    const lowerIntent = intent.toLowerCase();
    
    let threatType = 'general';
    let riskLevel: 'critical' | 'high' | 'medium' | 'low' = 'medium';
    const complianceNeeds: string[] = [];
    const recommendedActions: string[] = [];
    
    // Detect compliance needs
    if (lowerIntent.includes('payment') || lowerIntent.includes('credit card') || lowerIntent.includes('pci')) {
      threatType = 'payment_security';
      riskLevel = 'high';
      complianceNeeds.push('pci');
      recommendedActions.push('Enable payment data protection', 'Configure fraud detection');
    }
    
    if (lowerIntent.includes('gdpr') || lowerIntent.includes('privacy') || lowerIntent.includes('european')) {
      complianceNeeds.push('gdpr');
      recommendedActions.push('Configure data residency', 'Enable privacy controls');
    }
    
    if (lowerIntent.includes('health') || lowerIntent.includes('medical') || lowerIntent.includes('hipaa')) {
      threatType = 'healthcare_security';
      riskLevel = 'high';
      complianceNeeds.push('hipaa');
      recommendedActions.push('Enable PHI protection', 'Configure audit logging');
    }
    
    // Detect active threats
    if (lowerIntent.includes('attack') || lowerIntent.includes('bot') || lowerIntent.includes('ddos')) {
      threatType = 'active_attack';
      riskLevel = 'critical';
      recommendedActions.push('Immediate threat response', 'Enable protective measures');
    }
    
    if (lowerIntent.includes('fraud') || lowerIntent.includes('fake') || lowerIntent.includes('stolen')) {
      threatType = 'fraud_prevention';
      riskLevel = 'high';
      recommendedActions.push('Enable fraud detection', 'Configure behavior analysis');
    }
    
    // Detect security improvements
    if (lowerIntent.includes('improve') || lowerIntent.includes('enhance') || lowerIntent.includes('strengthen')) {
      threatType = 'security_improvement';
      riskLevel = 'low';
      recommendedActions.push('Security assessment', 'Best practice implementation');
    }
    
    // Business impact assessment
    const businessImpact = this.assessBusinessImpact(threatType, riskLevel, context);
    
    return {
      threatType,
      riskLevel,
      complianceNeeds,
      recommendedActions,
      businessImpact,
    };
  }
  
  /**
   * Generate security recommendations based on business context
   */
  generateRecommendations(
    analysis: any,
    context?: BusinessSecurityContext
  ): {
    immediate: SecurityRecommendation[];
    shortTerm: SecurityRecommendation[];
    longTerm: SecurityRecommendation[];
    costEstimate: string;
  } {
    const recommendations: {
      immediate: SecurityRecommendation[];
      shortTerm: SecurityRecommendation[];
      longTerm: SecurityRecommendation[];
    } = {
      immediate: [],
      shortTerm: [],
      longTerm: [],
    };
    
    // Immediate actions for critical threats
    if (analysis.riskLevel === 'critical') {
      recommendations.immediate.push({
        action: 'Enable Emergency Protection',
        description: 'Activate immediate threat mitigation',
        effort: 'low',
        impact: 'high',
        implementation: 'One-click activation available',
      });
    }
    
    // Compliance-based recommendations
    if (analysis.complianceNeeds.includes('pci')) {
      recommendations.immediate.push({
        action: 'Enable WAF for Payment Pages',
        description: 'Protect payment processing with Web Application Firewall',
        effort: 'low',
        impact: 'high',
        implementation: 'Pre-configured PCI template available',
      });
      
      recommendations.shortTerm.push({
        action: 'Configure Bot Manager',
        description: 'Prevent card testing and fraud attempts',
        effort: 'medium',
        impact: 'high',
        implementation: 'Requires behavior rule configuration',
      });
    }
    
    // Business type specific recommendations
    if (context?.business_type === 'financial') {
      recommendations.shortTerm.push({
        action: 'Implement Zero Trust Architecture',
        description: 'Enhanced authentication and authorization',
        effort: 'high',
        impact: 'high',
        implementation: 'Phased rollout recommended',
      });
    }
    
    if (context?.business_type === 'retail') {
      recommendations.immediate.push({
        action: 'Bot Protection for Inventory',
        description: 'Prevent automated purchases and price scraping',
        effort: 'medium',
        impact: 'medium',
        implementation: 'Bot Manager configuration',
      });
    }
    
    // Long-term security posture improvements
    recommendations.longTerm.push({
      action: 'Implement Security Operations Center (SOC)',
      description: '24/7 monitoring and incident response',
      effort: 'high',
      impact: 'high',
      implementation: 'Akamai managed security services',
    });
    
    // Cost estimation
    const costEstimate = this.estimateSecurityCosts(recommendations, context);
    
    return {
      ...recommendations,
      costEstimate,
    };
  }
  
  /**
   * Create implementation plan with business-friendly steps
   */
  createImplementationPlan(
    recommendations: any,
    urgency: string
  ): ImplementationPlan {
    const plan: ImplementationPlan = {
      phases: [],
      timeline: '',
      requiredResources: [],
      successCriteria: [],
    };
    
    // Phase 1: Immediate protection
    if (urgency === 'immediate_threat') {
      plan.phases.push({
        name: 'Emergency Response',
        duration: '1-2 hours',
        steps: [
          'Activate threat protection',
          'Enable monitoring alerts',
          'Review security events',
          'Document incident',
        ],
        requiredApprovals: ['Security team lead'],
      });
    }
    
    // Phase 2: Core security
    plan.phases.push({
      name: 'Core Security Setup',
      duration: '1-2 weeks',
      steps: [
        'Configure WAF rules',
        'Set up bot detection',
        'Enable SSL/TLS',
        'Configure logging',
      ],
      requiredApprovals: ['IT Manager', 'Security Officer'],
    });
    
    // Phase 3: Compliance alignment
    if (recommendations.immediate.some((r: any) => r.action.includes('PCI') || r.action.includes('GDPR'))) {
      plan.phases.push({
        name: 'Compliance Configuration',
        duration: '2-4 weeks',
        steps: [
          'Map compliance requirements',
          'Configure required controls',
          'Set up audit logging',
          'Generate compliance reports',
        ],
        requiredApprovals: ['Compliance Officer', 'Legal'],
      });
    }
    
    // Timeline based on urgency
    if (urgency === 'immediate_threat') {
      plan.timeline = 'Start immediately, core protection within 24 hours';
    } else if (urgency === 'compliance_deadline') {
      plan.timeline = 'Complete within compliance deadline timeframe';
    } else {
      plan.timeline = 'Phased approach over 4-6 weeks';
    }
    
    // Resources needed
    plan.requiredResources = [
      'Security administrator (10-20 hours)',
      'Application owner (5-10 hours)',
      'Compliance team (if applicable)',
    ];
    
    // Success criteria
    plan.successCriteria = [
      'All critical vulnerabilities addressed',
      'Compliance requirements met',
      'Security monitoring active',
      'Incident response plan tested',
    ];
    
    return plan;
  }
  
  private assessBusinessImpact(threatType: string, riskLevel: string, context?: any): string {
    const impacts: Record<string, string> = {
      'payment_security:high': 'Risk of payment fraud and PCI non-compliance fines',
      'active_attack:critical': 'Immediate risk to business operations and reputation',
      'healthcare_security:high': 'PHI exposure risk and HIPAA violation penalties',
      'fraud_prevention:high': 'Financial losses and customer trust impact',
      'security_improvement:low': 'Opportunity to strengthen security posture proactively',
    };
    
    return impacts[`${threatType}:${riskLevel}`] || 'Security enhancement opportunity';
  }
  
  private estimateSecurityCosts(recommendations: any, context?: any): string {
    const baseCost = 0;
    const additionalCosts: string[] = [];
    
    // Count high-effort items
    const highEffortCount = [
      ...recommendations.immediate,
      ...recommendations.shortTerm,
      ...recommendations.longTerm,
    ].filter((r: any) => r.effort === 'high').length;
    
    if (highEffortCount > 3) {
      return 'Enterprise security package recommended - Contact sales for pricing';
    } else if (highEffortCount > 1) {
      return 'Professional security services - Estimated $5,000-15,000/month';
    } else {
      return 'Standard security features - Included in most Akamai packages';
    }
  }
}

/**
 * Security Implementation Types
 */
interface SecurityRecommendation {
  action: string;
  description: string;
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  implementation: string;
}

interface ImplementationPlan {
  phases: ImplementationPhase[];
  timeline: string;
  requiredResources: string[];
  successCriteria: string[];
}

interface ImplementationPhase {
  name: string;
  duration: string;
  steps: string[];
  requiredApprovals: string[];
}

/**
 * Security Validator
 * Ensures security changes are safe and effective
 */
class SecurityValidator {
  /**
   * Validate security configuration before applying
   */
  async validateConfiguration(
    config: any,
    context: BusinessSecurityContext
  ): Promise<{
    valid: boolean;
    warnings: string[];
    blockers: string[];
    suggestions: string[];
  }> {
    const warnings: string[] = [];
    const blockers: string[] = [];
    const suggestions: string[] = [];
    
    // Check for conflicting rules
    if (config.waf && config.rateLimit) {
      if (config.rateLimit.threshold < 10 && context.user_base === 'b2c') {
        warnings.push('Very low rate limit may impact legitimate users');
        suggestions.push('Consider behavior-based rate limiting instead');
      }
    }
    
    // Validate compliance requirements
    if (context.compliance_requirements.includes('pci') && !config.waf) {
      blockers.push('PCI compliance requires WAF protection');
    }
    
    if (context.compliance_requirements.includes('gdpr') && !config.geoControls) {
      warnings.push('GDPR may require geographic access controls');
      suggestions.push('Enable EU data residency controls');
    }
    
    // Check security maturity alignment
    if (context.business_type === 'financial' && !config.botManager) {
      warnings.push('Financial services should enable bot protection');
      suggestions.push('Bot Manager prevents automated attacks');
    }
    
    return {
      valid: blockers.length === 0,
      warnings,
      blockers,
      suggestions,
    };
  }
  
  /**
   * Generate security testing plan
   */
  generateTestingPlan(config: any): {
    preDeployment: string[];
    postDeployment: string[];
    ongoing: string[];
  } {
    return {
      preDeployment: [
        'Test security rules in staging',
        'Verify legitimate traffic not blocked',
        'Confirm logging and alerts working',
        'Review false positive rates',
      ],
      postDeployment: [
        'Monitor security events for 24 hours',
        'Review blocked vs allowed traffic',
        'Validate compliance controls',
        'Test incident response procedures',
      ],
      ongoing: [
        'Weekly security report review',
        'Monthly rule optimization',
        'Quarterly security assessment',
        'Annual compliance audit',
      ],
    };
  }
}

/**
 * Main handler for Security & Compliance Assistant
 */
export async function handleSecurityComplianceAssistant(args: any) {
  const analyzer = new SecurityAnalyzer();
  const validator = new SecurityValidator();
  
  try {
    // Analyze security intent
    const analysis = analyzer.analyzeIntent(args.intent, args.context);
    
    // Build response
    let response = `# Security & Compliance Assistant\n\n`;
    response += `I'll help you **${args.intent}**.\n\n`;
    
    // Risk assessment
    const riskEmoji = {
      critical: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🟢',
    }[analysis.riskLevel];
    
    response += `**Risk Level:** ${riskEmoji} ${analysis.riskLevel.toUpperCase()}\n`;
    response += `**Business Impact:** ${analysis.businessImpact}\n\n`;
    
    // Compliance needs
    if (analysis.complianceNeeds.length > 0) {
      response += `## Compliance Requirements\n\n`;
      analysis.complianceNeeds.forEach(compliance => {
        if (COMPLIANCE_TEMPLATES[compliance as keyof typeof COMPLIANCE_TEMPLATES]) {
          const template = COMPLIANCE_TEMPLATES[compliance as keyof typeof COMPLIANCE_TEMPLATES];
          response += `### ${template.name}\n`;
          response += `${template.description}\n\n`;
          response += `**What I'll Configure:**\n`;
          template.akamaiFeatures.forEach(feature => {
            response += `- ${feature}\n`;
          });
          response += '\n';
        }
      });
    }
    
    // Generate recommendations
    const recommendations = analyzer.generateRecommendations(analysis, args.context);
    
    if (recommendations.immediate.length > 0) {
      response += `## Immediate Actions Required\n\n`;
      recommendations.immediate.forEach((rec, index) => {
        response += `**${index + 1}. ${rec.action}**\n`;
        response += `${rec.description}\n`;
        response += `- Effort: ${rec.effort} | Impact: ${rec.impact}\n`;
        response += `- How: ${rec.implementation}\n\n`;
      });
    }
    
    if (recommendations.shortTerm.length > 0) {
      response += `## Short-term Improvements (1-4 weeks)\n\n`;
      recommendations.shortTerm.forEach((rec, index) => {
        response += `**${index + 1}. ${rec.action}**\n`;
        response += `${rec.description}\n`;
        response += `- Effort: ${rec.effort} | Impact: ${rec.impact}\n\n`;
      });
    }
    
    if (recommendations.longTerm.length > 0) {
      response += `## Long-term Security Strategy\n\n`;
      recommendations.longTerm.forEach((rec, index) => {
        response += `**${index + 1}. ${rec.action}**\n`;
        response += `${rec.description}\n\n`;
      });
    }
    
    // Cost estimate
    response += `## Investment Estimate\n\n`;
    response += `${recommendations.costEstimate}\n\n`;
    
    // Implementation plan
    if (args.urgency) {
      const plan = analyzer.createImplementationPlan(recommendations, args.urgency);
      response += `## Implementation Plan\n\n`;
      response += `**Timeline:** ${plan.timeline}\n\n`;
      
      plan.phases.forEach((phase, index) => {
        response += `### Phase ${index + 1}: ${phase.name}\n`;
        response += `Duration: ${phase.duration}\n\n`;
        response += `Steps:\n`;
        phase.steps.forEach((step, stepIndex) => {
          response += `${stepIndex + 1}. ${step}\n`;
        });
        response += '\n';
      });
    }
    
    // Active threat response
    if (analysis.riskLevel === 'critical' && analysis.threatType === 'active_attack') {
      response += `## ⚠️ IMMEDIATE THREAT RESPONSE\n\n`;
      response += `I've detected an active threat situation. Here's what to do RIGHT NOW:\n\n`;
      
      const threatType = args.intent.includes('bot') ? 'bot_attack' : 
                        args.intent.includes('ddos') ? 'ddos_attack' : 'bot_attack';
      
      if (THREAT_RESPONSES[threatType as keyof typeof THREAT_RESPONSES]) {
        const threatResponse = THREAT_RESPONSES[threatType as keyof typeof THREAT_RESPONSES];
        response += `### ${threatResponse.name}\n\n`;
        response += `**Immediate Actions:**\n`;
        threatResponse.immediateActions.forEach((action, index) => {
          response += `${index + 1}. ${action}\n`;
        });
        if ('monitoringSetup' in threatResponse && threatResponse.monitoringSetup) {
          response += `\n**Monitoring Setup:**\n`;
          threatResponse.monitoringSetup.forEach((monitor: string, index: number) => {
            response += `${index + 1}. ${monitor}\n`;
          });
        }
      }
      
      if (args.auto_apply) {
        response += `\n### 🚀 Auto-Protection Status\n\n`;
        response += `Ready to apply emergency protection measures.\n`;
        response += `This will:\n`;
        response += `- Enable immediate threat blocking\n`;
        response += `- Configure real-time monitoring\n`;
        response += `- Set up alert notifications\n\n`;
        response += `**Confirm to proceed with automatic protection.**\n`;
      }
    }
    
    // Next steps
    response += `\n## Next Steps\n\n`;
    
    if (!args.context) {
      response += `To provide more specific recommendations, please tell me:\n\n`;
      response += `1. **What type of business are you protecting?**\n`;
      response += `   - Financial services\n`;
      response += `   - Healthcare\n`;
      response += `   - Retail/E-commerce\n`;
      response += `   - Media/Entertainment\n`;
      response += `   - Government\n`;
      response += `   - Other\n\n`;
      
      response += `2. **What's your current security situation?**\n`;
      response += `   - Just starting with security\n`;
      response += `   - Basic protection in place\n`;
      response += `   - Advanced security user\n\n`;
      
      response += `3. **Any specific compliance requirements?**\n`;
      response += `   - PCI DSS (payment cards)\n`;
      response += `   - HIPAA (healthcare)\n`;
      response += `   - GDPR (EU privacy)\n`;
      response += `   - SOX (financial reporting)\n`;
      response += `   - Other regulations\n`;
    } else {
      response += `1. **Review the recommended security measures**\n`;
      response += `2. **Get stakeholder approval for implementation**\n`;
      response += `3. **Start with immediate actions if facing active threats**\n`;
      response += `4. **Schedule implementation based on the plan**\n`;
      response += `5. **Set up monitoring and alerting**\n`;
    }
    
    response += `\nI'm here to make security simple and effective. Let me know how you'd like to proceed!\n`;
    
    return {
      content: [{
        type: 'text',
        text: response,
      }],
    };
    
  } catch (error) {
    logger.error('Security Assistant Error:', error);
    
    return {
      content: [{
        type: 'text',
        text: `I want to help secure your business, but I need more information.\n\n` +
              `Please tell me:\n` +
              `1. What security concern do you have?\n` +
              `2. What type of business are you protecting?\n` +
              `3. Are you facing an immediate threat?\n\n` +
              `Examples of what I can help with:\n` +
              `- "Protect our e-commerce site from bots"\n` +
              `- "Meet PCI compliance for payment processing"\n` +
              `- "Stop a DDoS attack happening now"\n` +
              `- "Improve our overall security posture"\n\n` +
              `Security doesn't have to be complicated. Let's protect your business together!`,
      }],
    };
  }
}

/**
 * Security Dashboard Generator
 * Creates visual security status for business users
 */
export class SecurityDashboard {
  /**
   * Generate security posture summary
   */
  generatePostureSummary(data: any): string {
    let summary = `## Security Posture Overview\n\n`;
    
    // Overall score with visual indicator
    const score = data.overallScore || 75;
    const scoreEmoji = score >= 90 ? '🟢' : score >= 70 ? '🟡' : score >= 50 ? '🟠' : '🔴';
    
    summary += `### Overall Security Score: ${scoreEmoji} ${score}/100\n\n`;
    
    // Key metrics
    summary += `**Protected Assets**\n`;
    summary += `- Web Applications: ${data.protectedApps || 0}\n`;
    summary += `- APIs: ${data.protectedAPIs || 0}\n`;
    summary += `- Domains: ${data.protectedDomains || 0}\n\n`;
    
    summary += `**Threat Prevention (Last 30 Days)**\n`;
    summary += `- Attacks Blocked: ${data.attacksBlocked || '0'}\n`;
    summary += `- Malicious Bots Stopped: ${data.botsBlocked || '0'}\n`;
    summary += `- DDoS Attempts Mitigated: ${data.ddosMitigated || '0'}\n\n`;
    
    summary += `**Compliance Status**\n`;
    if (data.compliance) {
      Object.entries(data.compliance).forEach(([standard, status]) => {
        const statusEmoji = status === 'compliant' ? '✅' : status === 'partial' ? '⚠️' : '❌';
        summary += `- ${standard.toUpperCase()}: ${statusEmoji} ${status}\n`;
      });
    } else {
      summary += `- No compliance requirements configured\n`;
    }
    
    return summary;
  }
}