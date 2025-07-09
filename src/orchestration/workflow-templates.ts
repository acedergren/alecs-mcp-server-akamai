/**
 * ALECS Workflow Templates - Pre-built workflows for common operations
 * 
 * CODE KAI IMPLEMENTATION:
 * - Site migration workflows (from Cloudflare, AWS, etc.)
 * - Zero-downtime deployment patterns
 * - Multi-property activation workflows
 * - SSL provisioning with validation
 * 
 * These templates demonstrate best practices for complex
 * multi-service operations on the Akamai platform.
 */

import { WorkflowDefinition } from './workflow-engine';
import { v4 as uuidv4 } from 'uuid';

/**
 * Complete site migration workflow
 * Migrates a site from another CDN to Akamai with zero downtime
 */
export const SITE_MIGRATION_WORKFLOW: WorkflowDefinition = {
  id: 'site-migration-v1',
  name: 'Complete Site Migration',
  description: 'Migrate a complete site to Akamai with DNS, CDN, and SSL',
  version: '1.0.0',
  rollbackStrategy: 'all',
  maxDuration: 3600000, // 1 hour
  steps: [
    // Step 1: Analyze current setup
    {
      id: 'analyze-dns',
      name: 'Analyze DNS Configuration',
      description: 'Fetch and analyze current DNS records',
      tool: 'dns.zone.export',
      args: {
        zone: '${domain}',
        format: 'json'
      }
    },
    
    // Step 2: Create DNS zone in Akamai
    {
      id: 'create-dns-zone',
      name: 'Create DNS Zone',
      description: 'Create new DNS zone in Akamai Edge DNS',
      tool: 'dns.zone.create',
      args: {
        zone: '${domain}',
        type: 'PRIMARY',
        comment: 'Migrated from ${source_provider}'
      },
      rollback: {
        tool: 'dns.zone.delete',
        args: {
          zone: '${domain}'
        }
      }
    },
    
    // Step 3: Import DNS records
    {
      id: 'import-dns-records',
      name: 'Import DNS Records',
      description: 'Import all DNS records to Akamai',
      tool: 'dns.zone.import',
      args: {
        zone: '${domain}',
        records: '${analyze-dns_result.records}',
        skipValidation: false
      },
      dependencies: ['create-dns-zone', 'analyze-dns'],
      retryPolicy: {
        maxAttempts: 3,
        backoffMs: 5000
      }
    },
    
    // Step 4: Create property configuration
    {
      id: 'create-property',
      name: 'Create CDN Property',
      description: 'Create Akamai property for the site',
      tool: 'property.create',
      args: {
        propertyName: '${domain}',
        productId: 'prd_Fresca',
        contractId: '${contractId}',
        groupId: '${groupId}'
      },
      rollback: {
        tool: 'property.delete',
        args: {
          propertyId: '${create-property_result.propertyId}'
        }
      }
    },
    
    // Step 5: Configure property rules
    {
      id: 'configure-rules',
      name: 'Configure CDN Rules',
      description: 'Apply optimized rule configuration',
      tool: 'property.rules.update',
      args: {
        propertyId: '${create-property_result.propertyId}',
        propertyVersion: 1,
        rules: {
          name: 'default',
          children: [
            {
              name: 'Performance',
              children: [],
              behaviors: [
                {
                  name: 'caching',
                  options: {
                    behavior: 'MAX_AGE',
                    mustRevalidate: false,
                    ttl: '7d'
                  }
                },
                {
                  name: 'prefetch',
                  options: {
                    enabled: true
                  }
                }
              ]
            },
            {
              name: 'Security',
              children: [],
              behaviors: [
                {
                  name: 'allHttpInCacheHierarchy',
                  options: {
                    enabled: true
                  }
                }
              ]
            }
          ],
          behaviors: [
            {
              name: 'origin',
              options: {
                originType: 'CUSTOMER',
                hostname: '${origin_hostname}',
                forwardHostHeader: 'REQUEST_HOST_HEADER',
                httpPort: 80,
                httpsPort: 443
              }
            }
          ]
        }
      },
      dependencies: ['create-property']
    },
    
    // Step 6: Add hostnames
    {
      id: 'add-hostnames',
      name: 'Add Hostnames',
      description: 'Add site hostnames to property',
      tool: 'property.hostnames.add',
      args: {
        propertyId: '${create-property_result.propertyId}',
        propertyVersion: 1,
        hostnames: ['${domain}', 'www.${domain}']
      },
      dependencies: ['configure-rules']
    },
    
    // Step 7: Create SSL certificate
    {
      id: 'create-certificate',
      name: 'Create SSL Certificate',
      description: 'Provision DV SSL certificate',
      tool: 'certificate.create.dv',
      args: {
        cn: '${domain}',
        sans: ['www.${domain}'],
        networkConfiguration: {
          geography: 'CORE',
          secureNetwork: 'ENHANCED_TLS',
          mustHaveCiphers: 'ak-akamai-default-2024q1'
        }
      },
      rollback: {
        tool: 'certificate.cancel',
        args: {
          enrollmentId: '${create-certificate_result.enrollmentId}'
        }
      },
      timeout: 600000 // 10 minutes
    },
    
    // Step 8: Validate certificate
    {
      id: 'validate-certificate',
      name: 'Validate Certificate',
      description: 'Complete DV validation',
      tool: 'certificate.validate.check',
      args: {
        enrollmentId: '${create-certificate_result.enrollmentId}'
      },
      dependencies: ['create-certificate'],
      retryPolicy: {
        maxAttempts: 20,
        backoffMs: 30000 // Check every 30 seconds
      }
    },
    
    // Step 9: Deploy certificate
    {
      id: 'deploy-certificate',
      name: 'Deploy Certificate',
      description: 'Deploy certificate to network',
      tool: 'certificate.deploy',
      args: {
        enrollmentId: '${create-certificate_result.enrollmentId}'
      },
      dependencies: ['validate-certificate']
    },
    
    // Step 10: Activate to staging
    {
      id: 'activate-staging',
      name: 'Activate to Staging',
      description: 'Deploy configuration to staging network',
      tool: 'property.activate',
      args: {
        propertyId: '${create-property_result.propertyId}',
        propertyVersion: 1,
        network: 'STAGING',
        notes: 'Initial staging deployment for migration',
        notifyEmails: ['${notification_email}']
      },
      dependencies: ['add-hostnames', 'deploy-certificate']
    },
    
    // Step 11: Test staging
    {
      id: 'test-staging',
      name: 'Test Staging',
      description: 'Validate staging configuration',
      tool: 'property.test',
      args: {
        propertyId: '${create-property_result.propertyId}',
        hostname: '${domain}',
        network: 'STAGING',
        tests: ['connectivity', 'caching', 'compression', 'ssl']
      },
      dependencies: ['activate-staging'],
      continueOnError: false
    },
    
    // Step 12: Create monitoring
    {
      id: 'setup-monitoring',
      name: 'Setup Monitoring',
      description: 'Configure real-time monitoring',
      tool: 'monitoring.create',
      args: {
        propertyId: '${create-property_result.propertyId}',
        metrics: ['availability', 'performance', 'errors'],
        alertThresholds: {
          availability: 99.9,
          responseTime: 1000,
          errorRate: 1
        }
      },
      dependencies: ['test-staging']
    },
    
    // Step 13: DNS preparation
    {
      id: 'prepare-dns-switch',
      name: 'Prepare DNS Switch',
      description: 'Create temporary CNAME for testing',
      tool: 'dns.record.create',
      args: {
        zone: '${domain}',
        name: 'akamai-test',
        type: 'CNAME',
        target: '${create-property_result.edgeHostname}',
        ttl: 300
      },
      dependencies: ['import-dns-records'],
      rollback: {
        tool: 'dns.record.delete',
        args: {
          zone: '${domain}',
          name: 'akamai-test',
          type: 'CNAME'
        }
      },
      continueOnError: false
    },
    
    // Step 14: Activate to production
    {
      id: 'activate-production',
      name: 'Activate to Production',
      description: 'Deploy configuration to production network',
      tool: 'property.activate',
      args: {
        propertyId: '${create-property_result.propertyId}',
        propertyVersion: 1,
        network: 'PRODUCTION',
        notes: 'Production deployment for migration',
        notifyEmails: ['${notification_email}'],
        acknowledgeWarnings: true
      },
      dependencies: ['test-staging', 'setup-monitoring']
    },
    
    // Step 15: Update DNS records
    {
      id: 'update-dns-final',
      name: 'Update DNS Records',
      description: 'Point domain to Akamai edge hostname',
      tool: 'dns.record.update',
      args: {
        zone: '${domain}',
        updates: [
          {
            name: '@',
            type: 'CNAME',
            target: '${create-property_result.edgeHostname}',
            ttl: 300
          },
          {
            name: 'www',
            type: 'CNAME',
            target: '${create-property_result.edgeHostname}',
            ttl: 300
          }
        ]
      },
      dependencies: ['activate-production'],
      rollback: {
        tool: 'dns.record.update',
        args: {
          zone: '${domain}',
          updates: '${analyze-dns_result.original_records}'
        }
      }
    }
  ]
};

/**
 * Zero-downtime deployment workflow
 * Deploy changes with automatic rollback on errors
 */
export const ZERO_DOWNTIME_DEPLOYMENT: WorkflowDefinition = {
  id: 'zero-downtime-deployment-v1',
  name: 'Zero Downtime Deployment',
  description: 'Deploy property changes with health checks and automatic rollback',
  version: '1.0.0',
  rollbackStrategy: 'all',
  maxDuration: 1800000, // 30 minutes
  steps: [
    // Step 1: Create new version
    {
      id: 'create-version',
      name: 'Create Property Version',
      description: 'Create new property version for changes',
      tool: 'property.version.create',
      args: {
        propertyId: '${propertyId}',
        baseVersion: '${baseVersion}'
      }
    },
    
    // Step 2: Apply changes
    {
      id: 'apply-changes',
      name: 'Apply Configuration Changes',
      description: 'Update property rules with new configuration',
      tool: 'property.rules.update',
      args: {
        propertyId: '${propertyId}',
        propertyVersion: '${create-version_result.propertyVersion}',
        rules: '${new_rules}'
      },
      dependencies: ['create-version']
    },
    
    // Step 3: Validate rules
    {
      id: 'validate-rules',
      name: 'Validate Configuration',
      description: 'Ensure rules are valid and compatible',
      tool: 'property.rules.validate',
      args: {
        propertyId: '${propertyId}',
        propertyVersion: '${create-version_result.propertyVersion}'
      },
      dependencies: ['apply-changes']
    },
    
    // Step 4: Activate to staging
    {
      id: 'staging-activation',
      name: 'Staging Activation',
      description: 'Deploy to staging for testing',
      tool: 'property.activate',
      args: {
        propertyId: '${propertyId}',
        propertyVersion: '${create-version_result.propertyVersion}',
        network: 'STAGING',
        notes: 'Zero-downtime deployment to staging',
        notifyEmails: ['${notification_email}']
      },
      dependencies: ['validate-rules']
    },
    
    // Step 5: Run staging tests
    {
      id: 'staging-tests',
      name: 'Staging Tests',
      description: 'Run comprehensive staging tests',
      tool: 'property.test',
      args: {
        propertyId: '${propertyId}',
        hostname: '${test_hostname}',
        network: 'STAGING',
        tests: ['connectivity', 'caching', 'compression', 'security', 'performance']
      },
      dependencies: ['staging-activation'],
      retryPolicy: {
        maxAttempts: 3,
        backoffMs: 10000
      },
      continueOnError: false
    },
    
    // Step 6: Capture baseline metrics
    {
      id: 'baseline-metrics',
      name: 'Capture Baseline Metrics',
      description: 'Record current production metrics',
      tool: 'monitoring.metrics.capture',
      args: {
        propertyId: '${propertyId}',
        metrics: ['availability', 'latency', 'error_rate', 'cache_hit_ratio'],
        duration: 300000 // 5 minutes
      },
      dependencies: ['staging-tests']
    },
    
    // Step 7: Production activation
    {
      id: 'production-activation',
      name: 'Production Activation',
      description: 'Deploy to production network',
      tool: 'property.activate',
      args: {
        propertyId: '${propertyId}',
        propertyVersion: '${create-version_result.propertyVersion}',
        network: 'PRODUCTION',
        notes: 'Zero-downtime deployment to production',
        notifyEmails: ['${notification_email}'],
        acknowledgeWarnings: true
      },
      dependencies: ['baseline-metrics']
    },
    
    // Step 8: Monitor deployment
    {
      id: 'deployment-monitoring',
      name: 'Monitor Deployment',
      description: 'Monitor for issues during rollout',
      tool: 'monitoring.deployment.watch',
      args: {
        propertyId: '${propertyId}',
        duration: 600000, // 10 minutes
        thresholds: {
          errorRateIncrease: 5, // 5% increase
          latencyIncrease: 20, // 20% increase
          availabilityDrop: 0.1 // 0.1% drop
        },
        baseline: '${baseline-metrics_result}'
      },
      dependencies: ['production-activation'],
      continueOnError: false
    },
    
    // Step 9: Purge cache if needed
    {
      id: 'cache-purge',
      name: 'Purge Cache',
      description: 'Clear cache for updated content',
      tool: 'fastpurge.cpcode',
      args: {
        cpcodes: '${cpcodes}',
        network: 'production',
        action: 'invalidate'
      },
      dependencies: ['deployment-monitoring'],
      continueOnError: true
    }
  ]
};

/**
 * Multi-property activation workflow
 * Coordinate activation across multiple properties
 */
export const MULTI_PROPERTY_ACTIVATION: WorkflowDefinition = {
  id: 'multi-property-activation-v1',
  name: 'Multi-Property Activation',
  description: 'Activate multiple properties in coordination',
  version: '1.0.0',
  rollbackStrategy: 'failed',
  maxDuration: 7200000, // 2 hours
  steps: [] // Dynamically generated based on properties
};

/**
 * SSL certificate provisioning workflow
 */
export const SSL_PROVISIONING_WORKFLOW: WorkflowDefinition = {
  id: 'ssl-provisioning-v1',
  name: 'SSL Certificate Provisioning',
  description: 'Provision and deploy SSL certificate with validation',
  version: '1.0.0',
  rollbackStrategy: 'all',
  maxDuration: 3600000, // 1 hour
  steps: [
    {
      id: 'create-enrollment',
      name: 'Create Certificate Enrollment',
      description: 'Start DV certificate enrollment',
      tool: 'certificate.create.dv',
      args: {
        cn: '${common_name}',
        sans: '${sans}',
        networkConfiguration: {
          geography: 'CORE',
          secureNetwork: 'ENHANCED_TLS',
          mustHaveCiphers: 'ak-akamai-default-2024q1'
        },
        signatureAlgorithm: 'SHA-256'
      },
      rollback: {
        tool: 'certificate.cancel',
        args: {
          enrollmentId: '${create-enrollment_result.enrollmentId}'
        }
      }
    },
    
    {
      id: 'get-validation',
      name: 'Get Validation Requirements',
      description: 'Retrieve DV validation challenges',
      tool: 'certificate.validation.get',
      args: {
        enrollmentId: '${create-enrollment_result.enrollmentId}'
      },
      dependencies: ['create-enrollment']
    },
    
    {
      id: 'create-validation-records',
      name: 'Create Validation Records',
      description: 'Add DNS validation records',
      tool: 'dns.record.create.batch',
      args: {
        records: '${get-validation_result.validation_records}'
      },
      dependencies: ['get-validation'],
      rollback: {
        tool: 'dns.record.delete.batch',
        args: {
          records: '${get-validation_result.validation_records}'
        }
      }
    },
    
    {
      id: 'validate-certificate',
      name: 'Validate Certificate',
      description: 'Check validation status',
      tool: 'certificate.validate.check',
      args: {
        enrollmentId: '${create-enrollment_result.enrollmentId}'
      },
      dependencies: ['create-validation-records'],
      retryPolicy: {
        maxAttempts: 30,
        backoffMs: 60000 // Check every minute
      }
    },
    
    {
      id: 'deploy-certificate',
      name: 'Deploy Certificate',
      description: 'Deploy to production network',
      tool: 'certificate.deploy',
      args: {
        enrollmentId: '${create-enrollment_result.enrollmentId}',
        network: 'production'
      },
      dependencies: ['validate-certificate']
    },
    
    {
      id: 'link-to-property',
      name: 'Link to Property',
      description: 'Associate certificate with property',
      tool: 'property.certificate.link',
      args: {
        propertyId: '${propertyId}',
        enrollmentId: '${create-enrollment_result.enrollmentId}'
      },
      dependencies: ['deploy-certificate']
    }
  ]
};

/**
 * Generate multi-property activation workflow
 */
export function generateMultiPropertyActivation(
  properties: Array<{
    propertyId: string;
    propertyVersion: number;
    propertyName: string;
  }>,
  options: {
    network: 'STAGING' | 'PRODUCTION';
    parallel?: boolean;
    notificationEmail: string;
  }
): WorkflowDefinition {
  const workflow: WorkflowDefinition = {
    ...MULTI_PROPERTY_ACTIVATION,
    id: `multi-property-activation-${uuidv4()}`,
    steps: []
  };

  // Add validation step
  workflow.steps.push({
    id: 'validate-all',
    name: 'Validate All Properties',
    description: 'Ensure all properties are ready for activation',
    tool: 'property.batch.validate',
    args: {
      properties: properties.map(p => ({
        propertyId: p.propertyId,
        propertyVersion: p.propertyVersion
      }))
    }
  });

  // Add activation steps
  properties.forEach((property, index) => {
    const stepId = `activate-${property.propertyId}`;
    const dependencies = options.parallel ? ['validate-all'] : 
      index > 0 ? [`activate-${properties[index - 1]?.propertyId}`] : ['validate-all'];

    workflow.steps.push({
      id: stepId,
      name: `Activate ${property.propertyName}`,
      description: `Deploy ${property.propertyName} to ${options.network}`,
      tool: 'property.activate',
      args: {
        propertyId: property.propertyId,
        propertyVersion: property.propertyVersion,
        network: options.network,
        notes: `Multi-property activation: ${property.propertyName}`,
        notifyEmails: [options.notificationEmail]
      },
      dependencies,
      retryPolicy: {
        maxAttempts: 3,
        backoffMs: 30000
      }
    });
  });

  // Add monitoring step
  workflow.steps.push({
    id: 'monitor-all',
    name: 'Monitor All Activations',
    description: 'Monitor activation progress across all properties',
    tool: 'property.batch.monitor',
    args: {
      propertyIds: properties.map(p => p.propertyId),
      duration: 1800000 // 30 minutes
    },
    dependencies: properties.map(p => `activate-${p.propertyId}`)
  });

  return workflow;
}

/**
 * Workflow template registry
 */
export const WORKFLOW_TEMPLATES = {
  SITE_MIGRATION: SITE_MIGRATION_WORKFLOW,
  ZERO_DOWNTIME_DEPLOYMENT,
  SSL_PROVISIONING: SSL_PROVISIONING_WORKFLOW,
  MULTI_PROPERTY_ACTIVATION
};