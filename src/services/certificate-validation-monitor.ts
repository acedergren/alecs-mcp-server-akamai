/**
 * Certificate Validation Monitor
 * Real-time monitoring and automation for certificate validation
 */

import { EventEmitter } from 'events';

import { type AkamaiClient } from '../akamai-client';

// Validation States
export enum ValidationStatus {
  PENDING = 'pending',
  DNS_RECORD_CREATED = 'dns_record_created',
  DNS_PROPAGATED = 'dns_propagated',
  VALIDATION_TRIGGERED = 'validation_triggered',
  VALIDATION_IN_PROGRESS = 'validation_in_progress',
  VALIDATED = 'validated',
  FAILED = 'failed',
  EXPIRED = 'expired',
}

// Monitor Configuration
export interface MonitorConfig {
  enrollmentId: number;
  checkInterval?: number; // seconds
  maxAttempts?: number;
  dnsPropagationTimeout?: number; // seconds
  autoRetry?: boolean;
  notificationWebhook?: string;
}

// Domain Validation Info
export interface DomainValidation {
  domain: string;
  status: ValidationStatus;
  method: 'dns-01' | 'http-01';
  challenge?: {
    token: string;
    recordName?: string;
    recordValue?: string;
    httpPath?: string;
    httpContent?: string;
  };
  attempts: number;
  lastAttempt?: Date;
  error?: string;
  validatedAt?: Date;
}

// Monitor Events
export interface MonitorEvents {
  'validation:started': (enrollmentId: number) => void;
  'validation:progress': (domain: string, status: ValidationStatus) => void;
  'validation:completed': (enrollmentId: number, domains: string[]) => void;
  'validation:failed': (enrollmentId: number, _error: string) => void;
  'dns:record_created': (domain: string, record: any) => void;
  'dns:propagation_complete': (domain: string) => void;
  'domain:validated': (domain: string) => void;
  'domain:failed': (domain: string, _error: string) => void;
}

export class CertificateValidationMonitor extends EventEmitter {
  private client: AkamaiClient;
  private monitors: Map<number, NodeJS.Timeout> = new Map();
  private validationStates: Map<number, Map<string, DomainValidation>> = new Map();

  constructor(client: AkamaiClient) {
    super();
    this.client = client;
  }

  /**
   * Start monitoring certificate validation
   */
  async startMonitoring(config: MonitorConfig): Promise<void> {
    const { enrollmentId, checkInterval = 30, maxAttempts = 60, autoRetry = true } = config;

    // Stop existing monitor if any
    this.stopMonitoring(enrollmentId);

    // Initialize validation states
    const domains = await this.fetchDomains(enrollmentId);
    const domainStates = new Map<string, DomainValidation>();

    domains.forEach((domain) => {
      domainStates.set(domain, {
        domain,
        status: ValidationStatus.PENDING,
        method: 'dns-01',
        attempts: 0,
      });
    });

    this.validationStates.set(enrollmentId, domainStates);
    this.emit('validation:started', enrollmentId);

    // Start monitoring loop
    let attempts = 0;
    const monitor = setInterval(async () => {
      try {
        attempts++;

        // Check if max attempts reached
        if (attempts > maxAttempts) {
          this.stopMonitoring(enrollmentId);
          this.emit('validation:failed', enrollmentId, 'Max attempts reached');
          return;
        }

        // Check validation status
        const allValidated = await this.checkValidationStatus(enrollmentId);

        if (allValidated) {
          this.stopMonitoring(enrollmentId);
          const validatedDomains = Array.from(domainStates.keys());
          this.emit('validation:completed', enrollmentId, validatedDomains);
        } else if (autoRetry) {
          // Retry failed validations
          await this.retryFailedValidations(enrollmentId);
        }
      } catch (_error) {
        console._error(`Monitor _error for enrollment ${enrollmentId}:`, _error);
        this.emit(
          'validation:failed',
          enrollmentId,
          _error instanceof Error ? _error.message : String(_error),
        );
      }
    }, checkInterval * 1000);

    this.monitors.set(enrollmentId, monitor);
  }

  /**
   * Stop monitoring certificate validation
   */
  stopMonitoring(enrollmentId: number): void {
    const monitor = this.monitors.get(enrollmentId);
    if (monitor) {
      clearInterval(monitor);
      this.monitors.delete(enrollmentId);
    }
  }

  /**
   * Get current validation status
   */
  getValidationStatus(enrollmentId: number): Map<string, DomainValidation> | undefined {
    return this.validationStates.get(enrollmentId);
  }

  /**
   * Check DNS propagation for a domain
   */
  async checkDNSPropagation(
    domain: string,
    recordName: string,
    expectedValue: string,
  ): Promise<boolean> {
    try {
      // Use Google's DNS resolver to check propagation
      const response = await fetch(`https://dns.google/resolve?name=${recordName}&type=TXT`);

      if (!response.ok) {
return false;
}

      const data: any = await response.json();
      const answers = data.Answer || [];

      return answers.some((answer: any) => answer.data?.includes(expectedValue));
    } catch (_error) {
      console._error(`DNS propagation check failed for ${domain}:`, _error);
      return false;
    }
  }

  /**
   * Trigger validation for a specific domain
   */
  async triggerDomainValidation(enrollmentId: number, domain: string): Promise<void> {
    try {
      await this.client.request({
        method: 'POST',
        path: `/cps/v2/enrollments/${enrollmentId}/dv-validation/${domain}`,
        headers: { 'Content-Type': 'application/json' },
        body: { acknowledgeWarnings: true },
      });

      const domainState = this.validationStates.get(enrollmentId)?.get(domain);
      if (domainState) {
        domainState.status = ValidationStatus.VALIDATION_TRIGGERED;
        domainState.lastAttempt = new Date();
        domainState.attempts++;
        this.emit('validation:progress', domain, ValidationStatus.VALIDATION_TRIGGERED);
      }
    } catch (_error) {
      const domainState = this.validationStates.get(enrollmentId)?.get(domain);
      if (domainState) {
        domainState.status = ValidationStatus.FAILED;
        domainState._error = _error instanceof Error ? _error.message : String(_error);
        this.emit('domain:failed', domain, domainState._error);
      }
      throw _error;
    }
  }

  // Private helper methods

  private async fetchDomains(enrollmentId: number): Promise<string[]> {
    const response = await this.client.request({
      path: `/cps/v2/enrollments/${enrollmentId}`,
      method: 'GET',
      headers: {
        Accept: 'application/vnd.akamai.cps.enrollment-status.v1+json',
      },
    });

    return response.allowedDomains?.map((d: any) => d.name) || [];
  }

  private async checkValidationStatus(enrollmentId: number): Promise<boolean> {
    const response = await this.client.request({
      path: `/cps/v2/enrollments/${enrollmentId}`,
      method: 'GET',
      headers: {
        Accept: 'application/vnd.akamai.cps.enrollment-status.v1+json',
      },
    });

    const domainStates = this.validationStates.get(enrollmentId);
    if (!domainStates) {
return false;
}

    let allValidated = true;

    for (const domain of response.allowedDomains || []) {
      const domainState = domainStates.get(domain.name);
      if (!domainState) {
continue;
}

      const previousStatus = domainState.status;

      // Update status based on API response
      switch (domain.validationStatus) {
        case 'VALIDATED':
          domainState.status = ValidationStatus.VALIDATED;
          domainState.validatedAt = new Date();
          if (previousStatus !== ValidationStatus.VALIDATED) {
            this.emit('domain:validated', domain.name);
          }
          break;

        case 'PENDING':
          if (domainState.status === ValidationStatus.PENDING) {
            // Check if DNS record exists
            if (domain.validationDetails?.challenges) {
              for (const challenge of domain.validationDetails.challenges) {
                if (challenge.type === 'dns-01' && challenge.responseBody) {
                  domainState.challenge = {
                    token: challenge.token,
                    recordName: `_acme-challenge.${domain.name}`,
                    recordValue: challenge.responseBody,
                  };
                }
              }
            }
          }
          allValidated = false;
          break;

        case 'IN_PROGRESS':
          domainState.status = ValidationStatus.VALIDATION_IN_PROGRESS;
          allValidated = false;
          break;

        case 'ERROR':
        case 'FAILED':
          domainState.status = ValidationStatus.FAILED;
          domainState.error = domain.validationDetails?.error || 'Validation failed';
          this.emit('domain:failed', domain.name, domainState.error);
          allValidated = false;
          break;

        case 'EXPIRED':
          domainState.status = ValidationStatus.EXPIRED;
          allValidated = false;
          break;

        default:
          allValidated = false;
      }

      // Emit progress if status changed
      if (previousStatus !== domainState.status) {
        this.emit('validation:progress', domain.name, domainState.status);
      }
    }

    return allValidated;
  }

  private async retryFailedValidations(enrollmentId: number): Promise<void> {
    const domainStates = this.validationStates.get(enrollmentId);
    if (!domainStates) {
return;
}

    for (const [domain, state] of domainStates) {
      if (state.status === ValidationStatus.FAILED || state.status === ValidationStatus.EXPIRED) {
        // Don't retry if max attempts reached
        if (state.attempts >= 3) {
continue;
}

        try {
          await this.triggerDomainValidation(enrollmentId, domain);
        } catch (_error) {
          console._error(`Failed to retry validation for ${domain}:`, _error);
        }
      }
    }
  }

  /**
   * Generate validation report
   */
  generateValidationReport(enrollmentId: number): string {
    const domainStates = this.validationStates.get(enrollmentId);
    if (!domainStates) {
      return 'No validation data available';
    }

    let report = `# Validation Report - Enrollment ${enrollmentId}\n\n`;
    report += `**Generated:** ${new Date().toISOString()}\n\n`;

    // Summary
    const statuses = Array.from(domainStates.values());
    const validated = statuses.filter((s) => s.status === ValidationStatus.VALIDATED).length;
    const failed = statuses.filter((s) => s.status === ValidationStatus.FAILED).length;
    const pending = statuses.filter(
      (s) => s.status !== ValidationStatus.VALIDATED && s.status !== ValidationStatus.FAILED,
    ).length;

    report += '## Summary\n\n';
    report += `- **Total Domains:** ${statuses.length}\n`;
    report += `- **Validated:** ${validated}\n`;
    report += `- **Failed:** ${failed}\n`;
    report += `- **In Progress:** ${pending}\n\n`;

    // Domain Details
    report += '## Domain Status\n\n';

    for (const [domain, state] of domainStates) {
      const statusEmoji =
        {
          [ValidationStatus.VALIDATED]: '✅',
          [ValidationStatus.FAILED]: '❌',
          [ValidationStatus.VALIDATION_IN_PROGRESS]: '🔄',
          [ValidationStatus.DNS_RECORD_CREATED]: '📝',
          [ValidationStatus.DNS_PROPAGATED]: '🌐',
          [ValidationStatus.VALIDATION_TRIGGERED]: '🔐',
          [ValidationStatus.PENDING]: '⏳',
          [ValidationStatus.EXPIRED]: '⚠️',
        }[state.status] || '❓';

      report += `### ${statusEmoji} ${domain}\n`;
      report += `- **Status:** ${state.status}\n`;
      report += `- **Method:** ${state.method}\n`;
      report += `- **Attempts:** ${state.attempts}\n`;

      if (state.lastAttempt) {
        report += `- **Last Attempt:** ${state.lastAttempt.toLocaleString()}\n`;
      }

      if (state.validatedAt) {
        report += `- **Validated At:** ${state.validatedAt.toLocaleString()}\n`;
      }

      if (state.error) {
        report += `- **Error:** ${state.error}\n`;
      }

      if (state.challenge?.recordName) {
        report += `- **DNS Record:** ${state.challenge.recordName}\n`;
      }

      report += '\n';
    }

    return report;
  }
}

// Factory function
export function createValidationMonitor(client: AkamaiClient): CertificateValidationMonitor {
  return new CertificateValidationMonitor(client);
}
