/**
 * Certificate Deployment Coordinator
 * Manages certificate deployment to Akamai edge networks and property linking
 */

import { EventEmitter } from 'events';

import { type AkamaiClient } from '../akamai-client';

// Deployment Configuration
export interface DeploymentConfig {
  enrollmentId: number;
  network: 'staging' | 'production';
  propertyIds?: string[];
  autoLinkProperties?: boolean;
  parallelDeployment?: boolean;
  rollbackOnFailure?: boolean;
  notificationEmails?: string[];
}

// Deployment State
export interface DeploymentState {
  deploymentId?: number;
  network: string;
  status: 'pending' | 'initiated' | 'in_progress' | 'deployed' | 'failed' | 'rolled_back';
  startTime: Date;
  endTime?: Date;
  progress: number; // 0-100
  propertyLinking?: {
    total: number;
    completed: number;
    failed: number;
  };
  error?: string;
}

// Property Linking State
export interface PropertyLinkState {
  propertyId: string;
  propertyName?: string;
  status: 'pending' | 'linking' | 'linked' | 'failed';
  error?: string;
  version?: number;
}

// Deployment Events
export interface DeploymentEvents {
  'deployment:started': (enrollmentId: number, network: string) => void;
  'deployment:progress': (enrollmentId: number, progress: number) => void;
  'deployment:completed': (enrollmentId: number, deploymentId: number) => void;
  'deployment:failed': (enrollmentId: number, error: string) => void;
  'property:linking': (propertyId: string) => void;
  'property:linked': (propertyId: string, version: number) => void;
  'property:link_failed': (propertyId: string, error: string) => void;
  'rollback:started': (enrollmentId: number) => void;
  'rollback:completed': (enrollmentId: number) => void;
}

export class CertificateDeploymentCoordinator extends EventEmitter {
  private client: AkamaiClient;
  private activeDeployments: Map<number, DeploymentState> = new Map();
  private propertyStates: Map<string, PropertyLinkState> = new Map();
  private deploymentMonitors: Map<number, NodeJS.Timeout> = new Map();

  constructor(client: AkamaiClient) {
    super();
    this.client = client;
  }

  /**
   * Deploy certificate to network
   */
  async deployCertificate(config: DeploymentConfig): Promise<DeploymentState> {
    const { enrollmentId, network } = config;

    // Check if already deploying
    if (this.activeDeployments.has(enrollmentId)) {
      throw new Error(`Deployment already in progress for enrollment ${enrollmentId}`);
    }

    // Initialize deployment state
    const deploymentState: DeploymentState = {
      network,
      status: 'pending',
      startTime: new Date(),
      progress: 0,
    };

    this.activeDeployments.set(enrollmentId, deploymentState);
    this.emit('deployment:started', enrollmentId, network);

    try {
      // Verify certificate is ready for deployment
      await this.verifyCertificateReadiness(enrollmentId);

      // Initiate deployment
      deploymentState.status = 'initiated';
      deploymentState.progress = 10;
      this.emit('deployment:progress', enrollmentId, 10);

      const deploymentId = await this.initiateDeployment(enrollmentId, network);
      deploymentState.deploymentId = deploymentId;

      // Monitor deployment progress
      await this.monitorDeployment(enrollmentId, deploymentId, deploymentState);

      // Link to properties if requested
      if (config.autoLinkProperties && config.propertyIds) {
        await this.linkCertificateToProperties(
          enrollmentId,
          config.propertyIds,
          config.parallelDeployment,
        );
      }

      // Mark as completed
      deploymentState.status = 'deployed';
      deploymentState.endTime = new Date();
      deploymentState.progress = 100;
      this.emit('deployment:completed', enrollmentId, deploymentId);

      return deploymentState;
    } catch (_error) {
      deploymentState.status = 'failed';
      deploymentState.error = _error instanceof Error ? _error.message : String(_error);
      deploymentState.endTime = new Date();
      this.emit('deployment:failed', enrollmentId, deploymentState.error);

      // Rollback if configured
      if (config.rollbackOnFailure) {
        await this.rollbackDeployment(enrollmentId);
      }

      throw _error;
    } finally {
      // Cleanup monitors
      this.stopMonitoring(enrollmentId);
    }
  }

  /**
   * Link certificate to properties
   */
  async linkCertificateToProperties(
    enrollmentId: number,
    propertyIds: string[],
    parallel = false,
  ): Promise<Map<string, PropertyLinkState>> {
    const linkingState = {
      total: propertyIds.length,
      completed: 0,
      failed: 0,
    };

    // Initialize property states
    propertyIds.forEach((propertyId) => {
      this.propertyStates.set(propertyId, {
        propertyId,
        status: 'pending',
      });
    });

    if (parallel) {
      // Link properties in parallel
      const linkPromises = propertyIds.map((propertyId) =>
        this.linkToProperty(enrollmentId, propertyId)
          .then(() => {
            linkingState.completed++;
            this.updateDeploymentProgress(enrollmentId, linkingState);
          })
          .catch(() => {
            linkingState.failed++;
            this.updateDeploymentProgress(enrollmentId, linkingState);
          }),
      );

      await Promise.allSettled(linkPromises);
    } else {
      // Link properties sequentially
      for (const propertyId of propertyIds) {
        try {
          await this.linkToProperty(enrollmentId, propertyId);
          linkingState.completed++;
        } catch (_error) {
          linkingState.failed++;
        }
        this.updateDeploymentProgress(enrollmentId, linkingState);
      }
    }

    return this.propertyStates;
  }

  /**
   * Get deployment status
   */
  async getDeploymentStatus(enrollmentId: number): Promise<DeploymentState | null> {
    const cachedState = this.activeDeployments.get(enrollmentId);
    if (cachedState) {
      return cachedState;
    }

    // Fetch from API
    try {
      const response = await this.client.request({
        path: `/cps/v2/enrollments/${enrollmentId}/deployments`,
        method: 'GET',
        headers: {
          Accept: 'application/vnd.akamai.cps.deployments.v3+json',
        },
      });

      const deployments = response.results || [];
      if (deployments.length === 0) {
        return null;
      }

      // Get latest deployment
      const latest = deployments[0];

      return {
        deploymentId: latest.deploymentId,
        network: latest.targetEnvironment || latest.primaryCertificate?.network || 'unknown',
        status: this.mapDeploymentStatus(latest.deploymentStatus),
        startTime: new Date(latest.deploymentDate || Date.now()),
        progress: latest.deploymentStatus === 'active' ? 100 : 50,
      };
    } catch (_error) {
      return null;
    }
  }

  /**
   * Cancel ongoing deployment
   */
  async cancelDeployment(enrollmentId: number): Promise<void> {
    const deploymentState = this.activeDeployments.get(enrollmentId);
    if (!deploymentState?.deploymentId) {
      throw new Error(`No active deployment found for enrollment ${enrollmentId}`);
    }

    try {
      await this.client.request({
        method: 'DELETE',
        path: `/cps/v2/enrollments/${enrollmentId}/deployments/${deploymentState.deploymentId}`,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      deploymentState.status = 'rolled_back';
      this.emit('rollback:completed', enrollmentId);
    } catch (_error) {
      throw new Error(
        `Failed to cancel deployment: ${_error instanceof Error ? _error.message : String(_error)}`,
      );
    }
  }

  // Private helper methods

  private async verifyCertificateReadiness(enrollmentId: number): Promise<void> {
    const response = await this.client.request({
      path: `/cps/v2/enrollments/${enrollmentId}`,
      method: 'GET',
      headers: {
        Accept: 'application/vnd.akamai.cps.enrollment-status.v1+json',
      },
    });

    // Check if all domains are validated
    const allValidated = response.allowedDomains?.every(
      (domain: any) => domain.validationStatus === 'VALIDATED',
    );

    if (!allValidated) {
      throw new Error('Certificate validation is not complete for all domains');
    }

    // Check certificate status
    if (!['active', 'modified'].includes(response.status?.toLowerCase())) {
      throw new Error(
        `Certificate is not ready for deployment. Current status: ${response.status}`,
      );
    }
  }

  private async initiateDeployment(enrollmentId: number, network: string): Promise<number> {
    const response = await this.client.request({
      method: 'POST',
      path: `/cps/v2/enrollments/${enrollmentId}/deployments`,
      headers: {
        'Content-Type': 'application/vnd.akamai.cps.deployment-schedule.v1+json',
        Accept: 'application/vnd.akamai.cps.deployment.v3+json',
      },
      body: {
        ra: 'lets-encrypt',
        targetEnvironment: network,
        notAfter: null,
        allowCancel: true,
      },
    });

    const deploymentId = parseInt(response.headers?.location?.split('/').pop() || '0');
    if (!deploymentId) {
      throw new Error('Failed to get deployment ID from response');
    }

    return deploymentId;
  }

  private async monitorDeployment(
    enrollmentId: number,
    deploymentId: number,
    deploymentState: DeploymentState,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      let checkCount = 0;
      const maxChecks = 180; // 30 minutes with 10-second intervals

      const monitor = setInterval(async () => {
        try {
          checkCount++;

          const status = await this.checkDeploymentProgress(enrollmentId, deploymentId);

          // Update state
          deploymentState.status = status.status;
          deploymentState.progress = status.progress;
          this.emit('deployment:progress', enrollmentId, status.progress);

          // Check completion
          if (status.status === 'deployed') {
            clearInterval(monitor);
            resolve();
          } else if (status.status === 'failed') {
            clearInterval(monitor);
            reject(new Error('Deployment failed'));
          } else if (checkCount >= maxChecks) {
            clearInterval(monitor);
            reject(new Error('Deployment timeout'));
          }
        } catch (_error) {
          clearInterval(monitor);
          reject(_error);
        }
      }, 10000); // Check every 10 seconds

      this.deploymentMonitors.set(enrollmentId, monitor);
    });
  }

  private async checkDeploymentProgress(
    enrollmentId: number,
    deploymentId: number,
  ): Promise<{ status: DeploymentState['status']; progress: number }> {
    try {
      const response = await this.client.request({
        method: 'GET',
        path: `/cps/v2/enrollments/${enrollmentId}/deployments/${deploymentId}`,
        headers: {
          Accept: 'application/vnd.akamai.cps.deployment.v3+json',
        },
      });

      const apiStatus = response.deploymentStatus || response.status;
      const status = this.mapDeploymentStatus(apiStatus);

      // Estimate progress based on status
      let progress = 50;
      if (status === 'deployed') {
progress = 100;
} else if (status === 'in_progress') {
progress = 75;
} else if (status === 'initiated') {
progress = 25;
}

      return { status, progress };
    } catch (_error) {
      // If we can't get status, assume it's still in progress
      return { status: 'in_progress', progress: 50 };
    }
  }

  private async linkToProperty(enrollmentId: number, propertyId: string): Promise<void> {
    const propertyState = this.propertyStates.get(propertyId)!;
    propertyState.status = 'linking';
    this.emit('property:linking', propertyId);

    try {
      // Get property details
      const propertyResponse = await this.client.request({
        path: `/papi/v1/properties/${propertyId}`,
        method: 'GET',
      });

      const property = propertyResponse.properties?.items?.[0];
      if (!property) {
        throw new Error('Property not found');
      }

      propertyState.propertyName = property.propertyName;
      const version = property.latestVersion || 1;

      // Get current hostnames
      const hostnamesResponse = await this.client.request({
        path: `/papi/v1/properties/${propertyId}/versions/${version}/hostnames`,
        method: 'GET',
      });

      // Update hostnames with certificate enrollment ID
      const hostnames = hostnamesResponse.hostnames?.items || [];
      const updatedHostnames = hostnames.map((h: any) => ({
        ...h,
        certEnrollmentId: enrollmentId,
      }));

      // Update property
      await this.client.request({
        path: `/papi/v1/properties/${propertyId}/versions/${version}/hostnames`,
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: {
          hostnames: updatedHostnames,
        },
      });

      propertyState.status = 'linked';
      propertyState.version = version;
      this.emit('property:linked', propertyId, version);
    } catch (_error) {
      propertyState.status = 'failed';
      propertyState.error = _error instanceof Error ? _error.message : String(_error);
      this.emit('property:link_failed', propertyId, propertyState.error);
      throw _error;
    }
  }

  private async rollbackDeployment(enrollmentId: number): Promise<void> {
    this.emit('rollback:started', enrollmentId);

    try {
      // Cancel deployment if possible
      await this.cancelDeployment(enrollmentId);
    } catch (_error) {
      console.error('Rollback failed:', _error);
    }
  }

  private stopMonitoring(enrollmentId: number): void {
    const monitor = this.deploymentMonitors.get(enrollmentId);
    if (monitor) {
      clearInterval(monitor);
      this.deploymentMonitors.delete(enrollmentId);
    }
  }

  private updateDeploymentProgress(enrollmentId: number, linkingState: any): void {
    const deploymentState = this.activeDeployments.get(enrollmentId);
    if (deploymentState) {
      deploymentState.propertyLinking = linkingState;
      const linkProgress = (linkingState.completed / linkingState.total) * 100;
      const overallProgress = Math.min(90 + linkProgress * 0.1, 99);
      this.emit('deployment:progress', enrollmentId, overallProgress);
    }
  }

  private mapDeploymentStatus(apiStatus: string): DeploymentState['status'] {
    const statusMap: Record<string, DeploymentState['status']> = {
      active: 'deployed',
      pending: 'pending',
      'in-progress': 'in_progress',
      failed: 'failed',
      cancelled: 'rolled_back',
    };

    return statusMap[apiStatus?.toLowerCase()] || 'in_progress';
  }

  /**
   * Generate deployment report
   */
  generateDeploymentReport(enrollmentId: number): string {
    const deploymentState = this.activeDeployments.get(enrollmentId);

    let report = '# Certificate Deployment Report\n\n';
    report += `**Enrollment ID:** ${enrollmentId}\n`;
    report += `**Generated:** ${new Date().toISOString()}\n\n`;

    if (!deploymentState) {
      report += 'No deployment information available\n';
      return report;
    }

    // Deployment Summary
    report += '## Deployment Summary\n\n';
    report += `- **Network:** ${deploymentState.network.toUpperCase()}\n`;
    report += `- **Status:** ${deploymentState.status}\n`;
    report += `- **Progress:** ${deploymentState.progress}%\n`;
    report += `- **Started:** ${deploymentState.startTime.toLocaleString()}\n`;

    if (deploymentState.endTime) {
      report += `- **Completed:** ${deploymentState.endTime.toLocaleString()}\n`;
      const duration = deploymentState.endTime.getTime() - deploymentState.startTime.getTime();
      report += `- **Duration:** ${Math.round(duration / 60000)} minutes\n`;
    }

    if (deploymentState.error) {
      report += `- **Error:** ${deploymentState.error}\n`;
    }

    // Property Linking Status
    if (deploymentState.propertyLinking) {
      report += '\n## Property Linking\n\n';
      report += `- **Total Properties:** ${deploymentState.propertyLinking.total}\n`;
      report += `- **Linked:** ${deploymentState.propertyLinking.completed}\n`;
      report += `- **Failed:** ${deploymentState.propertyLinking.failed}\n\n`;

      if (this.propertyStates.size > 0) {
        report += '### Property Details\n\n';

        for (const [propertyId, state] of this.propertyStates) {
          const statusEmoji =
            {
              linked: '✅',
              failed: '❌',
              linking: '🔄',
              pending: '⏳',
            }[state.status] || '❓';

          report += `- ${statusEmoji} **${state.propertyName || propertyId}**\n`;
          report += `  - Status: ${state.status}\n`;

          if (state.version) {
            report += `  - Version: ${state.version}\n`;
          }

          if (state.error) {
            report += `  - Error: ${state.error}\n`;
          }

          report += '\n';
        }
      }
    }

    return report;
  }
}

// Factory function
export function createDeploymentCoordinator(
  client: AkamaiClient,
): CertificateDeploymentCoordinator {
  return new CertificateDeploymentCoordinator(client);
}
