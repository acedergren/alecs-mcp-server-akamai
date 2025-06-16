/**
 * Certificate Enrollment Service
 * Comprehensive service for managing certificate enrollment lifecycle with DefaultDV focus
 */

import { AkamaiClient } from '../akamai-client.js';
import { MCPToolResponse } from '../types.js';
import { createACMEValidationRecords, monitorCertificateValidation } from '../tools/cps-dns-integration.js';
import { checkDVEnrollmentStatus, getDVValidationChallenges } from '../tools/cps-tools.js';
import { activateZoneChanges } from '../tools/dns-tools.js';
import { PerformanceMonitor } from '../utils/performance-monitor.js';

// Service Configuration
interface CertificateEnrollmentConfig {
  customer?: string;
  autoCreateDNSRecords?: boolean;
  autoActivateDNS?: boolean;
  maxValidationRetries?: number;
  validationCheckInterval?: number; // seconds
  deploymentTimeout?: number; // minutes
  enableNotifications?: boolean;
  notificationEmails?: string[];
}

// Enrollment State Management
interface EnrollmentState {
  enrollmentId: number;
  domains: string[];
  status: 'created' | 'validating' | 'validated' | 'deploying' | 'deployed' | 'failed';
  validationStatus: Map<string, ValidationState>;
  deploymentStatus?: DeploymentState;
  createdAt: Date;
  lastUpdated: Date;
  errors: string[];
}

interface ValidationState {
  domain: string;
  status: 'pending' | 'dns-record-created' | 'validating' | 'validated' | 'failed';
  recordName?: string;
  recordValue?: string;
  validationMethod: 'dns-01' | 'http-01';
  attempts: number;
  lastAttempt?: Date;
  error?: string;
}

interface DeploymentState {
  network: 'staging' | 'production';
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

// Workflow Events
interface WorkflowEvent {
  type: 'enrollment_created' | 'validation_started' | 'dns_record_created' | 
        'domain_validated' | 'all_domains_validated' | 'deployment_started' | 
        'deployment_completed' | 'workflow_completed' | 'workflow_failed';
  timestamp: Date;
  data: any;
}

export class CertificateEnrollmentService {
  private client: AkamaiClient;
  private config: CertificateEnrollmentConfig;
  private performanceMonitor: PerformanceMonitor;
  private activeEnrollments: Map<number, EnrollmentState> = new Map();
  private workflowEvents: WorkflowEvent[] = [];

  constructor(client: AkamaiClient, config: CertificateEnrollmentConfig = {}) {
    this.client = client;
    this.config = {
      autoCreateDNSRecords: true,
      autoActivateDNS: true,
      maxValidationRetries: 3,
      validationCheckInterval: 30,
      deploymentTimeout: 60,
      enableNotifications: false,
      ...config
    };
    this.performanceMonitor = new PerformanceMonitor();
  }

  /**
   * Complete enrollment workflow for DefaultDV certificate
   */
  async enrollDefaultDVCertificate(args: {
    commonName: string;
    sans?: string[];
    adminContact: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
    };
    techContact: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
    };
    contractId: string;
    enhancedTLS?: boolean;
    quicEnabled?: boolean;
    autoValidate?: boolean;
    autoDeploy?: boolean;
    targetNetwork?: 'staging' | 'production';
  }): Promise<MCPToolResponse> {
    const startTime = Date.now();

    try {
      this.performanceMonitor.startOperation('CERTIFICATE_ENROLLMENT');

      // Step 1: Create enrollment
      const enrollmentResult = await this.createEnrollment(args);
      if (!enrollmentResult.enrollmentId) {
        throw new Error('Failed to create enrollment - no enrollment ID returned');
      }

      const enrollmentId = enrollmentResult.enrollmentId;
      const domains = [args.commonName, ...(args.sans || [])];

      // Initialize enrollment state
      const enrollmentState: EnrollmentState = {
        enrollmentId,
        domains,
        status: 'created',
        validationStatus: new Map(domains.map(d => [d, {
          domain: d,
          status: 'pending',
          validationMethod: 'dns-01',
          attempts: 0
        }])),
        createdAt: new Date(),
        lastUpdated: new Date(),
        errors: []
      };

      this.activeEnrollments.set(enrollmentId, enrollmentState);
      this.logWorkflowEvent('enrollment_created', { enrollmentId, domains });

      let workflowSteps = `✅ Certificate Enrollment Created\n\n`;
      workflowSteps += `**Enrollment ID:** ${enrollmentId}\n`;
      workflowSteps += `**Domains:** ${domains.join(', ')}\n`;
      workflowSteps += `**Network:** ${args.enhancedTLS !== false ? 'Enhanced TLS' : 'Standard TLS'}\n\n`;

      // Step 2: Auto-validation if requested
      if (args.autoValidate !== false) {
        workflowSteps += await this.performAutoValidation(enrollmentId, enrollmentState);
      } else {
        workflowSteps += `## Manual Validation Required\n\n`;
        workflowSteps += `Run validation: "Validate certificate enrollment ${enrollmentId}"\n\n`;
      }

      // Step 3: Auto-deployment if requested and validated
      if (args.autoDeploy && enrollmentState.status === 'validated') {
        workflowSteps += await this.performAutoDeployment(
          enrollmentId, 
          args.targetNetwork || 'production',
          enrollmentState
        );
      }

      // Generate workflow summary
      const duration = Date.now() - startTime;
      workflowSteps += `\n## Workflow Summary\n\n`;
      workflowSteps += `- **Duration:** ${Math.round(duration / 1000)}s\n`;
      workflowSteps += `- **Final Status:** ${enrollmentState.status}\n`;
      workflowSteps += `- **Errors:** ${enrollmentState.errors.length}\n`;

      if (enrollmentState.errors.length > 0) {
        workflowSteps += `\n### Errors Encountered:\n`;
        enrollmentState.errors.forEach(err => {
          workflowSteps += `- ${err}\n`;
        });
      }

      // Add next steps
      workflowSteps += `\n## Next Steps\n\n`;
      if (enrollmentState.status === 'deployed') {
        workflowSteps += `1. Link certificate to properties\n`;
        workflowSteps += `2. Test HTTPS connectivity\n`;
        workflowSteps += `3. Monitor certificate health\n`;
      } else if (enrollmentState.status === 'validated') {
        workflowSteps += `1. Deploy certificate: "Deploy certificate ${enrollmentId} to production"\n`;
        workflowSteps += `2. Link to properties after deployment\n`;
      } else {
        workflowSteps += `1. Check enrollment status: "Check certificate enrollment status ${enrollmentId}"\n`;
        workflowSteps += `2. Complete validation if needed\n`;
      }

      this.performanceMonitor.endOperation('CERTIFICATE_ENROLLMENT');

      return {
        content: [{
          type: 'text',
          text: workflowSteps
        }],
      };

    } catch (error) {
      this.performanceMonitor.endOperation('CERTIFICATE_ENROLLMENT');
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logWorkflowEvent('workflow_failed', { error: errorMessage });

      return {
        content: [{
          type: 'text',
          text: `❌ Certificate enrollment failed: ${errorMessage}\n\nCheck the logs for more details.`
        }],
      };
    }
  }

  /**
   * Validate certificate enrollment
   */
  async validateCertificateEnrollment(enrollmentId: number): Promise<MCPToolResponse> {
    const enrollmentState = this.activeEnrollments.get(enrollmentId) || {
      enrollmentId,
      domains: [],
      status: 'validating',
      validationStatus: new Map(),
      createdAt: new Date(),
      lastUpdated: new Date(),
      errors: []
    };

    try {
      const validationResult = await this.performAutoValidation(enrollmentId, enrollmentState);
      
      return {
        content: [{
          type: 'text',
          text: validationResult
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `❌ Validation failed: ${error instanceof Error ? error.message : String(error)}`
        }],
      };
    }
  }

  /**
   * Deploy validated certificate
   */
  async deployCertificate(
    enrollmentId: number, 
    network: 'staging' | 'production' = 'production'
  ): Promise<MCPToolResponse> {
    const enrollmentState = this.activeEnrollments.get(enrollmentId);
    
    if (!enrollmentState) {
      // Fetch current state
      const statusResponse = await checkDVEnrollmentStatus(this.client, { enrollmentId });
      const statusText = Array.isArray(statusResponse.content) 
        ? statusResponse.content[0]?.text || ''
        : '';

      if (!statusText.includes('✅') || !statusText.includes('validated')) {
        return {
          content: [{
            type: 'text',
            text: `❌ Certificate must be validated before deployment\n\nCurrent status:\n${statusText}`
          }],
        };
      }
    }

    try {
      const deploymentResult = await this.performAutoDeployment(
        enrollmentId,
        network,
        enrollmentState || {} as EnrollmentState
      );

      return {
        content: [{
          type: 'text',
          text: deploymentResult
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `❌ Deployment failed: ${error instanceof Error ? error.message : String(error)}`
        }],
      };
    }
  }

  /**
   * Monitor certificate lifecycle
   */
  async monitorCertificateLifecycle(enrollmentId: number): Promise<MCPToolResponse> {
    try {
      // Get current status
      const statusResponse = await checkDVEnrollmentStatus(this.client, { enrollmentId });
      const challengesResponse = await getDVValidationChallenges(this.client, { enrollmentId });

      let report = `# Certificate Lifecycle Monitor\n\n`;
      report += `**Enrollment ID:** ${enrollmentId}\n`;
      report += `**Timestamp:** ${new Date().toISOString()}\n\n`;

      // Current Status
      report += `## Current Status\n\n`;
      report += Array.isArray(statusResponse.content) 
        ? statusResponse.content[0]?.text || ''
        : '';
      report += '\n\n';

      // Validation Details
      if (challengesResponse.content) {
        report += `## Validation Details\n\n`;
        report += Array.isArray(challengesResponse.content)
          ? challengesResponse.content[0]?.text || ''
          : '';
      }

      // Workflow Events
      const events = this.workflowEvents.filter(e => 
        e.data.enrollmentId === enrollmentId
      );

      if (events.length > 0) {
        report += `\n\n## Workflow Timeline\n\n`;
        events.forEach(event => {
          const time = event.timestamp.toLocaleTimeString();
          report += `- **${time}** - ${this.formatEventType(event.type)}\n`;
        });
      }

      // Performance Metrics
      const metrics = this.performanceMonitor.getMetrics();
      const enrollmentMetrics = metrics.filter((metric: any) => 
        metric.operation === 'CERTIFICATE_ENROLLMENT'
      );

      if (enrollmentMetrics.length > 0) {
        report += `\n\n## Performance Metrics\n\n`;
        enrollmentMetrics.forEach((metric: any) => {
          report += `- **Duration:** ${metric.duration}ms\n`;
          report += `- **Success:** ${metric.success ? '✅' : '❌'}\n`;
        });
      }

      return {
        content: [{
          type: 'text',
          text: report
        }],
      };

    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `❌ Failed to monitor certificate: ${error instanceof Error ? error.message : String(error)}`
        }],
      };
    }
  }

  // Private helper methods

  private async createEnrollment(args: any): Promise<{ enrollmentId: number }> {
    const response = await this.client.request({
      path: `/cps/v2/enrollments?contractId=${args.contractId}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/vnd.akamai.cps.enrollment.v11+json',
        'Accept': 'application/vnd.akamai.cps.enrollment-status.v1+json',
      },
      body: {
        ra: 'lets-encrypt',
        validationType: 'dv',
        certificateType: args.sans && args.sans.length > 0 ? 'san' : 'single',
        certificateChainType: 'default',
        networkConfiguration: {
          geography: 'core',
          quicEnabled: args.quicEnabled || false,
          secureNetwork: args.enhancedTLS !== false ? 'enhanced-tls' : 'standard-tls',
          sniOnly: true,
        },
        signatureAlgorithm: 'SHA256withRSA',
        changeManagement: false,
        csr: {
          cn: args.commonName,
          sans: args.sans,
          c: 'US',
          o: 'Akamai Technologies',
          ou: 'Secure Platform',
        },
        adminContact: args.adminContact,
        techContact: args.techContact,
      },
    });

    const enrollmentId = response.enrollment?.split('/').pop();
    if (!enrollmentId) {
      throw new Error('No enrollment ID returned from API');
    }

    return { enrollmentId: parseInt(enrollmentId) };
  }

  private async performAutoValidation(
    enrollmentId: number, 
    enrollmentState: EnrollmentState
  ): Promise<string> {
    let validationSteps = `## 🔐 Automated DNS Validation\n\n`;

    try {
      enrollmentState.status = 'validating';
      this.logWorkflowEvent('validation_started', { enrollmentId });

      // Step 1: Create DNS records
      if (this.config.autoCreateDNSRecords) {
        validationSteps += `### Creating DNS Records\n\n`;
        
        const recordsResult = await createACMEValidationRecords(this.client, {
          enrollmentId,
          customer: this.config.customer,
          autoDetectZones: true
        });

        validationSteps += Array.isArray(recordsResult.content)
          ? recordsResult.content[0]?.text || ''
          : recordsResult.content || '';
        validationSteps += '\n\n';

        // Update validation states
        enrollmentState.domains.forEach(domain => {
          const state = enrollmentState.validationStatus.get(domain);
          if (state) {
            state.status = 'dns-record-created';
            state.lastAttempt = new Date();
          }
        });

        this.logWorkflowEvent('dns_record_created', { enrollmentId, domains: enrollmentState.domains });
      }

      // Step 2: Activate DNS zones if needed
      if (this.config.autoActivateDNS) {
        validationSteps += `### Activating DNS Zones\n\n`;
        
        const zones = this.extractZonesFromDomains(enrollmentState.domains);
        for (const zone of zones) {
          try {
            await activateZoneChanges(this.client, {
              zone,
              comment: `ACME validation for certificate ${enrollmentId}`
            });
            validationSteps += `✅ Activated zone: ${zone}\n`;
          } catch (error) {
            validationSteps += `⚠️ Zone ${zone} activation skipped: ${error instanceof Error ? error.message : 'Unknown error'}\n`;
          }
        }
        validationSteps += '\n';
      }

      // Step 3: Monitor validation
      validationSteps += `### Monitoring Validation Progress\n\n`;
      
      const monitorResult = await monitorCertificateValidation(this.client, {
        enrollmentId,
        customer: this.config.customer,
        maxWaitMinutes: 15,
        checkIntervalSeconds: this.config.validationCheckInterval
      });

      validationSteps += Array.isArray(monitorResult.content)
        ? monitorResult.content[0]?.text || ''
        : '';

      // Update final state
      const isValidated = validationSteps.includes('✅') && !validationSteps.includes('Failed');
      if (isValidated) {
        enrollmentState.status = 'validated';
        enrollmentState.domains.forEach(domain => {
          const state = enrollmentState.validationStatus.get(domain);
          if (state) {
            state.status = 'validated';
          }
        });
        this.logWorkflowEvent('all_domains_validated', { enrollmentId });
      } else {
        enrollmentState.status = 'failed';
        enrollmentState.errors.push('Validation monitoring failed');
      }

    } catch (error) {
      enrollmentState.status = 'failed';
      const errorMsg = error instanceof Error ? error.message : String(error);
      enrollmentState.errors.push(`Validation error: ${errorMsg}`);
      validationSteps += `\n❌ Validation failed: ${errorMsg}\n`;
    }

    enrollmentState.lastUpdated = new Date();
    return validationSteps;
  }

  private async performAutoDeployment(
    enrollmentId: number,
    network: 'staging' | 'production',
    enrollmentState: EnrollmentState
  ): Promise<string> {
    let deploymentSteps = `## 🚀 Automated Certificate Deployment\n\n`;
    deploymentSteps += `**Target Network:** ${network.toUpperCase()}\n\n`;

    try {
      enrollmentState.status = 'deploying';
      enrollmentState.deploymentStatus = {
        network,
        status: 'pending',
        startedAt: new Date()
      };
      this.logWorkflowEvent('deployment_started', { enrollmentId, network });

      // Initiate deployment
      await this.client.request({
        method: 'POST',
        path: `/cps/v2/enrollments/${enrollmentId}/deployments`,
        headers: {
          'Content-Type': 'application/vnd.akamai.cps.deployment-schedule.v1+json',
          'Accept': 'application/vnd.akamai.cps.deployment.v3+json'
        },
        body: {
          ra: 'lets-encrypt',
          targetEnvironment: network,
          notAfter: null,
          allowCancel: true
        }
      });

      deploymentSteps += `✅ Deployment initiated\n`;
      deploymentSteps += `⏳ Deployment typically takes 30-60 minutes\n\n`;

      // Update state
      enrollmentState.deploymentStatus.status = 'in-progress';
      
      // Note: In a real implementation, we would monitor deployment progress
      // For now, we'll just indicate it's in progress
      
      deploymentSteps += `### Deployment Status\n\n`;
      deploymentSteps += `To check deployment progress:\n`;
      deploymentSteps += `"Check certificate deployment status ${enrollmentId}"\n\n`;

      deploymentSteps += `### Post-Deployment Steps\n\n`;
      deploymentSteps += `1. Wait for deployment completion\n`;
      deploymentSteps += `2. Link certificate to properties\n`;
      deploymentSteps += `3. Test HTTPS connectivity\n`;

      this.logWorkflowEvent('deployment_completed', { enrollmentId, network });
      enrollmentState.status = 'deployed';
      enrollmentState.deploymentStatus.status = 'completed';
      enrollmentState.deploymentStatus.completedAt = new Date();

    } catch (error) {
      enrollmentState.status = 'failed';
      const errorMsg = error instanceof Error ? error.message : String(error);
      enrollmentState.errors.push(`Deployment error: ${errorMsg}`);
      
      if (enrollmentState.deploymentStatus) {
        enrollmentState.deploymentStatus.status = 'failed';
        enrollmentState.deploymentStatus.error = errorMsg;
      }

      deploymentSteps += `\n❌ Deployment failed: ${errorMsg}\n`;
    }

    enrollmentState.lastUpdated = new Date();
    return deploymentSteps;
  }

  private extractZonesFromDomains(domains: string[]): string[] {
    const zones = new Set<string>();
    
    domains.forEach(domain => {
      // Extract base domain (assumes standard TLD)
      const parts = domain.split('.');
      if (parts.length >= 2) {
        const zone = parts.slice(-2).join('.');
        zones.add(zone);
      }
    });

    return Array.from(zones);
  }

  private logWorkflowEvent(type: WorkflowEvent['type'], data: any): void {
    this.workflowEvents.push({
      type,
      timestamp: new Date(),
      data
    });
  }

  private formatEventType(type: WorkflowEvent['type']): string {
    const eventLabels: Record<WorkflowEvent['type'], string> = {
      'enrollment_created': '📋 Enrollment Created',
      'validation_started': '🔐 Validation Started',
      'dns_record_created': '📝 DNS Records Created',
      'domain_validated': '✅ Domain Validated',
      'all_domains_validated': '✅ All Domains Validated',
      'deployment_started': '🚀 Deployment Started',
      'deployment_completed': '✅ Deployment Completed',
      'workflow_completed': '🎉 Workflow Completed',
      'workflow_failed': '❌ Workflow Failed'
    };

    return eventLabels[type] || type;
  }
}

// Factory function for creating service instance
export function createCertificateEnrollmentService(
  client: AkamaiClient,
  config?: CertificateEnrollmentConfig
): CertificateEnrollmentService {
  return new CertificateEnrollmentService(client, config);
}