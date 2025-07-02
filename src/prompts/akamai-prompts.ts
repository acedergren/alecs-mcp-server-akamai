/**
 * MCP Prompts for ALECS - Guided Workflows for Better UX
 * 
 * These prompts provide conversation templates that guide users
 * through common Akamai operations with best practices
 */

import { z } from 'zod';
import { completable } from '@modelcontextprotocol/sdk/server/completable.js';

export const akamaiPrompts = {
  /**
   * Property Creation Wizard
   */
  'create-property-wizard': {
    title: 'Create CDN Property',
    description: 'Step-by-step guide to create a new Akamai property with best practices',
    argsSchema: z.object({
      propertyName: z.string().describe('Name for your property'),
      hostname: z.string().describe('Primary hostname (e.g., www.example.com)'),
      originHostname: z.string().describe('Origin server hostname'),
      useCase: completable(z.enum(['web-app', 'api', 'download', 'streaming', 'ecommerce']), (value) => {
        return ['web-app', 'api', 'download', 'streaming', 'ecommerce']
          .filter(uc => uc.startsWith(value));
      }).describe('Primary use case'),
      environment: z.enum(['development', 'staging', 'production']).default('development')
    }),
    handler: ({ propertyName, hostname, originHostname, useCase, environment }) => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `I need to create a new Akamai property with these details:
- Property Name: ${propertyName}
- Hostname: ${hostname}
- Origin: ${originHostname}
- Use Case: ${useCase}
- Environment: ${environment}

Please guide me through:
1. Creating the property with optimal settings for ${useCase}
2. Setting up the edge hostname with Enhanced TLS
3. Configuring caching rules appropriate for ${useCase}
4. Adding security headers
5. Setting up origin connection settings
6. Activating to ${environment === 'production' ? 'staging first, then production' : 'staging'}`
        }
      }]
    })
  },

  /**
   * Security Configuration Assistant
   */
  'security-setup': {
    title: 'Security Configuration',
    description: 'Configure WAF, DDoS protection, and network lists',
    argsSchema: z.object({
      propertyId: z.string().describe('Property ID to secure'),
      securityLevel: completable(z.enum(['basic', 'standard', 'enhanced', 'maximum']), (value) => {
        return ['basic', 'standard', 'enhanced', 'maximum']
          .filter(level => level.startsWith(value));
      }),
      threats: z.array(z.enum(['sql-injection', 'xss', 'ddos', 'bots', 'api-abuse']))
        .describe('Specific threats to protect against')
    }),
    handler: ({ propertyId, securityLevel, threats }) => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `Help me secure property ${propertyId} with ${securityLevel} security level.

I need protection against: ${threats.join(', ')}

Please:
1. Create appropriate network lists for geo-blocking if needed
2. Configure WAF rules for the selected threats
3. Set up rate limiting for API abuse prevention
4. Enable DDoS protection settings
5. Add security headers (CSP, HSTS, etc.)
6. Review and activate the security configuration`
        }
      }]
    })
  },

  /**
   * Performance Optimization Guide
   */
  'optimize-performance': {
    title: 'Performance Optimization',
    description: 'Analyze and optimize CDN performance',
    argsSchema: z.object({
      propertyId: z.string(),
      currentIssues: z.array(z.enum(['slow-ttfb', 'high-origin-load', 'poor-cache-ratio', 'large-files']))
        .describe('Current performance issues'),
      targetMetric: z.enum(['page-load-time', 'cache-hit-ratio', 'origin-offload', 'bandwidth-reduction'])
    }),
    handler: ({ propertyId, currentIssues, targetMetric }) => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `Analyze and optimize performance for property ${propertyId}.

Current issues: ${currentIssues.join(', ')}
Target to improve: ${targetMetric}

Please:
1. Get current performance metrics
2. Analyze cache hit ratios and TTL settings
3. Review and optimize caching rules
4. Configure prefetching if beneficial
5. Set up Image & Video Manager if applicable
6. Implement SureRoute for dynamic content
7. Show before/after performance comparison`
        }
      }]
    })
  },

  /**
   * Migration Assistant
   */
  'migrate-to-akamai': {
    title: 'Migration to Akamai',
    description: 'Guide for migrating from another CDN provider',
    argsSchema: z.object({
      currentProvider: completable(z.enum(['cloudflare', 'fastly', 'cloudfront', 'azure-cdn', 'other']), 
        (value) => ['cloudflare', 'fastly', 'cloudfront', 'azure-cdn', 'other']
          .filter(p => p.startsWith(value))
      ),
      domains: z.array(z.string()).describe('Domains to migrate'),
      hasWAF: z.boolean().describe('Currently using WAF?'),
      timeline: z.enum(['immediate', '1-week', '1-month', 'phased'])
    }),
    handler: ({ currentProvider, domains, hasWAF, timeline }) => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `I need to migrate from ${currentProvider} to Akamai.

Domains to migrate: ${domains.join(', ')}
Has WAF: ${hasWAF ? 'Yes' : 'No'}
Timeline: ${timeline}

Please create a migration plan that includes:
1. Mapping ${currentProvider} features to Akamai equivalents
2. Creating properties for each domain
3. Replicating current caching rules
4. Setting up SSL certificates
5. ${hasWAF ? 'Migrating WAF rules and security policies' : 'Basic security setup'}
6. Testing strategy with minimal downtime
7. DNS cutover plan for ${timeline} timeline
8. Rollback procedures`
        }
      }]
    })
  },

  /**
   * Troubleshooting Guide
   */
  'troubleshoot-issue': {
    title: 'Troubleshooting Assistant',
    description: 'Interactive debugging for common Akamai issues',
    argsSchema: z.object({
      issueType: completable(z.enum(['404-errors', '503-errors', 'cache-misses', 'ssl-errors', 'slow-performance', 'purge-not-working']),
        (value) => ['404-errors', '503-errors', 'cache-misses', 'ssl-errors', 'slow-performance', 'purge-not-working']
          .filter(t => t.includes(value))
      ),
      propertyId: z.string().optional(),
      hostname: z.string().describe('Affected hostname'),
      frequency: z.enum(['constant', 'intermittent', 'specific-time', 'after-change'])
    }),
    handler: ({ issueType, propertyId, hostname, frequency }) => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `I'm experiencing ${issueType} on ${hostname} (${frequency}).
${propertyId ? `Property ID: ${propertyId}` : ''}

Please help me:
1. Diagnose the root cause
2. Check relevant Akamai configurations
3. Review recent changes if applicable
4. Test with Akamai debug headers
5. Provide specific fixes
6. Prevent this issue in the future`
        }
      }]
    })
  },

  /**
   * Quick Secure-by-Default Setup
   */
  'quick-secure-setup': {
    title: 'Quick Secure Setup',
    description: 'Rapidly set up a secure property with defaults',
    argsSchema: z.object({
      hostname: z.string(),
      certificateType: z.enum(['default-dv', 'lets-encrypt', 'bring-your-own']).default('default-dv')
    }),
    handler: ({ hostname, certificateType }) => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `Set up a secure property for ${hostname} using ${certificateType} certificate.

Use Akamai's secure-by-default settings including:
- Enhanced TLS edge hostname
- Default DV certificate
- Security headers (HSTS, CSP, etc.)
- Basic WAF protection
- DDoS protection
- Fast activation to staging`
        }
      }]
    })
  }
};