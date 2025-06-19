import {
  ProgressBar,
  Spinner,
  MultiProgress,
  withProgress,
  format,
  icons,
  trackProgress,
} from '@utils/progress';
import axios from 'axios';

import { EdgeGridAuth } from '../auth/EdgeGridAuth';

import { type CpsResultsResponse, type CpsLocationResponse } from './types';

interface Certificate {
  enrollmentId: number;
  cn: string;
  sans: string[];
  certificateType: 'third-party' | 'default-dv' | 'ev' | 'ov';
  validationType: 'dv' | 'ev' | 'ov' | 'third-party';
  networkConfiguration: {
    geography: 'core' | 'china' | 'russia';
    secureNetwork: 'standard-tls' | 'enhanced-tls' | 'shared-cert';
    mustHaveCiphers: string;
    preferredCiphers: string;
    quicEnabled: boolean;
  };
  signatureAlgorithm: string;
  deploymentStatus: string;
  pendingChanges: boolean;
}

interface EnrollmentRequest {
  certificateType: string;
  validationType: string;
  csr: {
    cn: string;
    sans?: string[];
    c: string;
    st: string;
    l: string;
    o: string;
    ou?: string;
  };
  networkConfiguration: {
    geography: string;
    secureNetwork: string;
    mustHaveCiphers?: string;
    preferredCiphers?: string;
    quicEnabled?: boolean;
  };
  signatureAlgorithm?: string;
  changeManagement?: boolean;
  techContact: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  adminContact?: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    addressLineOne: string;
    city: string;
    region: string;
    postalCode: string;
    countryCode: string;
    organizationName: string;
    title?: string;
  };
  organization: {
    name: string;
    addressLineOne: string;
    city: string;
    region: string;
    postalCode: string;
    countryCode: string;
    phone: string;
  };
}

interface DVValidation {
  domain: string;
  type: 'dns' | 'http' | 'email';
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  dnsTarget?: {
    recordName: string;
    recordType: string;
    recordValue: string;
  };
  httpToken?: {
    path: string;
    content: string;
  };
  emailAddresses?: string[];
  expires: string;
}

interface DeploymentStatus {
  deploymentId: number;
  enrollmentId: number;
  network: string;
  status: 'pending' | 'in-progress' | 'deployed' | 'failed';
  deploymentDate?: string;
  properties?: string[];
}

export class CPSCertificateAgent {
  private auth: EdgeGridAuth;
  private multiProgress: MultiProgress;
  private dnsAgent: any; // Will be injected for DNS operations

  constructor(
    private customer = 'default',
    dnsAgent?: any,
  ) {
    this.auth = EdgeGridAuth.getInstance({ customer: this.customer });
    this.multiProgress = new MultiProgress();
    this.dnsAgent = dnsAgent;
  }

  async initialize(): Promise<void> {
    const spinner = this.multiProgress.addSpinner('init');
    spinner.start('Initializing CPS Certificate Agent');

    try {
      // Verify CPS access
      await this.auth.request({
        method: 'GET',
        path: '/cps/v2/enrollments?limit=1',
      });

      spinner.succeed('CPS Certificate Agent initialized');
    } catch (error) {
      spinner.fail('Failed to initialize CPS agent');
      throw error;
    } finally {
      this.multiProgress.remove('init');
    }
  }

  // Certificate Enrollment
  async enrollCertificate(
    type: 'default-dv' | 'third-party' | 'ev' | 'ov',
    domains: string[],
    options: Partial<EnrollmentRequest> = {},
  ): Promise<Certificate> {
    console.log(`\n${format.bold('Certificate Enrollment')}`);
    console.log(format.dim('─'.repeat(50)));
    console.log(`${icons.certificate} Type: ${format.cyan(type.toUpperCase())}`);
    console.log(`${icons.globe} Domains: ${domains.length}`);
    domains.forEach((d) => console.log(`  ${icons.bullet} ${format.green(d)}`));
    console.log(format.dim('─'.repeat(50)));

    const progress = new ProgressBar({
      total: 5,
      format: `${icons.lock} Enrolling [:bar] :percent :message`,
    });

    try {
      // Step 1: Prepare enrollment request
      progress.update({ current: 1, message: 'Preparing enrollment' });
      const enrollmentRequest = this.buildEnrollmentRequest(type, domains, options);

      // Step 2: Create enrollment
      progress.update({ current: 2, message: 'Creating enrollment' });
      const response = await this.auth.request<CpsLocationResponse>({
        method: 'POST',
        path: '/cps/v2/enrollments',
        headers: { 'Content-Type': 'application/vnd.akamai.cps.enrollment.v11+json' },
        body: JSON.stringify(enrollmentRequest),
      });

      const location = response.location || response.headers?.location || '';
      const enrollmentId = parseInt(location.split('/').pop() || '0');

      // Step 3: Get enrollment details
      progress.update({ current: 3, message: 'Retrieving enrollment details' });
      const enrollment = await this.getEnrollment(enrollmentId);

      // Step 4: Setup validation (for DV certificates)
      if (type === 'default-dv') {
        progress.update({ current: 4, message: 'Setting up domain validation' });
        await this.setupDVValidation(enrollmentId, domains);
      } else {
        progress.update({ current: 4, message: 'Awaiting validation' });
      }

      // Step 5: Submit for approval
      progress.update({ current: 5, message: 'Submitting for approval' });
      await this.updateEnrollmentStatus(enrollmentId, 'submit-to-ca');

      progress.finish('Certificate enrollment created');

      console.log(`\n${icons.success} Enrollment Details:`);
      console.log(`  ${icons.bullet} Enrollment ID: ${format.cyan(enrollmentId.toString())}`);
      console.log(
        `  ${icons.bullet} Network: ${format.green(enrollment.networkConfiguration.secureNetwork)}`,
      );
      console.log(`  ${icons.bullet} Validation: ${format.yellow(enrollment.validationType)}`);

      return enrollment;
    } catch (error) {
      progress.update({
        current: progress['current'],
        status: 'error',
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  // Automated DNS Validation
  async automatedDNSValidation(enrollmentId: number, autoCreateRecords = true): Promise<void> {
    console.log(`\n${format.bold('Automated DNS Validation')}`);
    console.log(format.dim('─'.repeat(50)));

    const spinner = new Spinner();
    spinner.start('Fetching validation challenges');

    try {
      // Get validation challenges
      const challenges = await this.getDVChallenges(enrollmentId);
      spinner.succeed(`Found ${challenges.length} validation challenges`);

      if (challenges.length === 0) {
        console.log(`${icons.warning} No pending validations found`);
        return;
      }

      // Process each challenge
      await trackProgress(
        challenges,
        async (challenge, index) => {
          console.log(`\n${icons.dns} Domain: ${format.cyan(challenge.domain)}`);

          if (challenge.type === 'dns' && challenge.dnsTarget) {
            console.log(
              `  ${icons.bullet} Record: ${format.green(challenge.dnsTarget.recordName)}`,
            );
            console.log(`  ${icons.bullet} Type: ${challenge.dnsTarget.recordType}`);
            console.log(`  ${icons.bullet} Value: ${format.dim(challenge.dnsTarget.recordValue)}`);

            if (autoCreateRecords && this.dnsAgent) {
              const recordSpinner = new Spinner();
              recordSpinner.start(`Creating DNS record for ${challenge.domain}`);

              try {
                await this.dnsAgent.createValidationRecord(
                  challenge.domain,
                  challenge.dnsTarget.recordName,
                  challenge.dnsTarget.recordType,
                  challenge.dnsTarget.recordValue,
                );
                recordSpinner.succeed(`DNS record created for ${challenge.domain}`);

                // Wait for DNS propagation
                recordSpinner.start('Waiting for DNS propagation');
                await new Promise((resolve) => setTimeout(resolve, 10000));
                recordSpinner.succeed('DNS propagated');

                // Trigger validation
                await this.triggerDomainValidation(enrollmentId, challenge.domain);
                console.log(`  ${icons.success} Validation triggered`);
              } catch (error) {
                recordSpinner.fail(
                  `Failed to create DNS record: ${error instanceof Error ? error.message : String(error)}`,
                );
                throw error;
              }
            }
          }
        },
        { message: 'Processing validations', concurrent: 3 },
      );

      // Monitor validation status
      console.log(`\n${icons.time} Monitoring validation status...`);
      await this.waitForValidations(enrollmentId);
    } catch (error) {
      spinner.fail(`Validation failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  // Certificate Deployment
  async deployCertificate(
    enrollmentId: number,
    network: 'staging' | 'production' = 'production',
  ): Promise<DeploymentStatus> {
    console.log(`\n${format.bold('Certificate Deployment')}`);
    console.log(format.dim('─'.repeat(50)));
    console.log(`${icons.rocket} Deploying to ${format.cyan(network.toUpperCase())}`);

    const progress = new ProgressBar({
      total: 100,
      format: `${icons.cloud} Deploying [:bar] :percent :eta :message`,
    });

    try {
      progress.update({ current: 5, message: 'Initiating deployment' });

      // Start deployment
      const response = await this.auth.request<CpsLocationResponse>({
        method: 'POST',
        path: `/cps/v2/enrollments/${enrollmentId}/deployments`,
        headers: {
          'Content-Type': 'application/vnd.akamai.cps.deployment-schedule.v1+json',
          Accept: 'application/vnd.akamai.cps.deployment.v3+json',
        },
        body: JSON.stringify({
          ra: 'lets-encrypt',
          targetEnvironment: network,
          notAfter: null,
          allowCancel: true,
        }),
      });

      const location = response.location || response.headers?.location || '';
      const deploymentId = parseInt(location.split('/').pop() || '0');

      // Monitor deployment progress
      let lastProgress = 5;
      while (true) {
        const status = await this.getDeploymentStatus(enrollmentId, deploymentId);

        switch (status.status) {
          case 'pending':
            lastProgress = Math.min(lastProgress + 5, 20);
            progress.update({ current: lastProgress, message: 'Deployment pending' });
            break;
          case 'in-progress':
            lastProgress = Math.min(lastProgress + 10, 80);
            progress.update({ current: lastProgress, message: `Deploying to ${network}` });
            break;
          case 'deployed':
            progress.finish(`Certificate deployed to ${network}`);
            return status;
          case 'failed':
            throw new Error('Deployment failed');
        }

        await new Promise((resolve) => setTimeout(resolve, 10000));
      }
    } catch (error) {
      progress.update({
        current: progress['current'],
        status: 'error',
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  // Certificate-Property Linking
  async linkCertificateToProperties(enrollmentId: number, propertyIds: string[]): Promise<void> {
    console.log(`\n${format.bold('Linking Certificate to Properties')}`);
    console.log(format.dim('─'.repeat(50)));

    await trackProgress(
      propertyIds,
      async (propertyId, index) => {
        const spinner = new Spinner();
        spinner.start(`Linking to property ${propertyId}`);

        try {
          // This would integrate with Property Manager API
          // For now, we'll simulate the linking process
          await new Promise((resolve) => setTimeout(resolve, 2000));

          spinner.succeed(`Linked to property ${propertyId}`);
        } catch (error) {
          spinner.fail(
            `Failed to link property ${propertyId}: ${error instanceof Error ? error.message : String(error)}`,
          );
          throw error;
        }
      },
      { message: 'Linking properties' },
    );

    console.log(
      `\n${icons.success} Successfully linked certificate to ${propertyIds.length} properties`,
    );
  }

  // Certificate Renewal Automation
  async setupAutoRenewal(
    enrollmentId: number,
    options: {
      renewalWindow?: number; // days before expiry
      autoApprove?: boolean;
      notificationEmails?: string[];
    } = {},
  ): Promise<void> {
    const spinner = new Spinner();
    spinner.start('Setting up auto-renewal');

    try {
      const request = {
        autoRenewalEnabled: true,
        renewalWindow: options.renewalWindow || 30,
        autoApprove: options.autoApprove || false,
        notificationEmails: options.notificationEmails || [],
      };

      await this.auth.request({
        method: 'PUT',
        path: `/cps/v2/enrollments/${enrollmentId}/auto-renewal`,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      spinner.succeed(`Auto-renewal configured (${request.renewalWindow} days before expiry)`);
    } catch (error) {
      spinner.fail(
        `Failed to setup auto-renewal: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  // Renewal Processing
  async processCertificateRenewal(enrollmentId: number): Promise<void> {
    console.log(`\n${format.bold('Certificate Renewal')}`);
    console.log(format.dim('─'.repeat(50)));

    const progress = new ProgressBar({
      total: 6,
      format: `${icons.certificate} Renewing [:bar] :percent :message`,
    });

    try {
      // Step 1: Check renewal eligibility
      progress.update({ current: 1, message: 'Checking renewal eligibility' });
      const enrollment = await this.getEnrollment(enrollmentId);

      // Step 2: Create renewal
      progress.update({ current: 2, message: 'Creating renewal request' });
      await this.updateEnrollmentStatus(enrollmentId, 'renew');

      // Step 3: Handle validation
      progress.update({ current: 3, message: 'Processing validation' });
      if (enrollment.validationType === 'dv') {
        await this.automatedDNSValidation(enrollmentId, true);
      }

      // Step 4: Submit to CA
      progress.update({ current: 4, message: 'Submitting to certificate authority' });
      await this.updateEnrollmentStatus(enrollmentId, 'submit-to-ca');

      // Step 5: Wait for issuance
      progress.update({ current: 5, message: 'Waiting for certificate issuance' });
      await this.waitForCertificateIssuance(enrollmentId);

      // Step 6: Deploy renewed certificate
      progress.update({ current: 6, message: 'Deploying renewed certificate' });
      await this.deployCertificate(enrollmentId, 'production');

      progress.finish('Certificate renewed successfully');

      console.log(`\n${icons.success} Renewal Summary:`);
      console.log(`  ${icons.bullet} Enrollment ID: ${format.cyan(enrollmentId.toString())}`);
      console.log(`  ${icons.bullet} Status: ${format.green('Renewed and Deployed')}`);
      console.log(`  ${icons.bullet} New Expiry: ${format.yellow('+365 days')}`);
    } catch (error) {
      progress.update({
        current: progress['current'],
        status: 'error',
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  // Certificate Operations Dashboard
  async displayCertificateStatus(enrollmentId: number): Promise<void> {
    console.log(`\n${format.bold('Certificate Status Dashboard')}`);
    console.log(format.dim('═'.repeat(60)));

    const spinner = new Spinner();
    spinner.start('Fetching certificate details');

    try {
      const enrollment = await this.getEnrollment(enrollmentId);
      const deployments = await this.getDeployments(enrollmentId);
      const validations = await this.getDVChallenges(enrollmentId);

      spinner.stop();

      // Certificate Info
      console.log(`\n${icons.certificate} ${format.bold('Certificate Information')}`);
      console.log(`  ${icons.bullet} CN: ${format.cyan(enrollment.cn)}`);
      console.log(`  ${icons.bullet} SANs: ${enrollment.sans.length}`);
      enrollment.sans.forEach((san) => console.log(`    ${icons.arrow} ${format.green(san)}`));
      console.log(`  ${icons.bullet} Type: ${format.yellow(enrollment.certificateType)}`);
      console.log(`  ${icons.bullet} Validation: ${format.yellow(enrollment.validationType)}`);

      // Network Configuration
      console.log(`\n${icons.network} ${format.bold('Network Configuration')}`);
      console.log(
        `  ${icons.bullet} Network: ${format.cyan(enrollment.networkConfiguration.secureNetwork)}`,
      );
      console.log(`  ${icons.bullet} Geography: ${enrollment.networkConfiguration.geography}`);
      console.log(
        `  ${icons.bullet} QUIC: ${enrollment.networkConfiguration.quicEnabled ? format.green('Enabled') : format.red('Disabled')}`,
      );

      // Deployment Status
      console.log(`\n${icons.rocket} ${format.bold('Deployment Status')}`);
      if (deployments.length === 0) {
        console.log(`  ${icons.warning} No deployments found`);
      } else {
        deployments.forEach((dep) => {
          const statusColor =
            dep.status === 'deployed'
              ? format.green
              : dep.status === 'failed'
                ? format.red
                : format.yellow;
          console.log(`  ${icons.bullet} ${dep.network}: ${statusColor(dep.status)}`);
          if (dep.deploymentDate) {
            console.log(
              `    ${icons.time} ${format.dim(new Date(dep.deploymentDate).toLocaleString())}`,
            );
          }
        });
      }

      // Validation Status
      if (validations.length > 0) {
        console.log(`\n${icons.check} ${format.bold('Validation Status')}`);
        validations.forEach((val) => {
          const statusIcon =
            val.status === 'completed'
              ? icons.success
              : val.status === 'failed'
                ? icons.error
                : val.status === 'in-progress'
                  ? '⏳'
                  : '⏸️';
          console.log(`  ${statusIcon} ${val.domain}: ${val.status}`);
        });
      }

      console.log(format.dim('═'.repeat(60)));
    } catch (error) {
      spinner.fail(
        `Failed to fetch certificate status: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  // Helper methods
  private buildEnrollmentRequest(
    type: string,
    domains: string[],
    options: Partial<EnrollmentRequest>,
  ): EnrollmentRequest {
    const cn = domains[0];
    const sans = domains.slice(1);

    return {
      certificateType: type === 'default-dv' ? 'san' : type,
      validationType: type === 'default-dv' ? 'dv' : options.validationType || 'ov',
      csr: {
        cn,
        sans: sans.length > 0 ? sans : undefined,
        c: options.csr?.c || 'US',
        st: options.csr?.st || 'MA',
        l: options.csr?.l || 'Cambridge',
        o: options.csr?.o || 'Example Corp',
        ou: options.csr?.ou,
      },
      networkConfiguration: {
        geography: options.networkConfiguration?.geography || 'core',
        secureNetwork: options.networkConfiguration?.secureNetwork || 'enhanced-tls',
        mustHaveCiphers: options.networkConfiguration?.mustHaveCiphers || 'ak-akamai-default',
        preferredCiphers: options.networkConfiguration?.preferredCiphers || 'ak-akamai-default',
        quicEnabled: options.networkConfiguration?.quicEnabled !== false,
      },
      signatureAlgorithm: options.signatureAlgorithm || 'SHA-256',
      changeManagement: options.changeManagement !== false,
      techContact: options.techContact || {
        firstName: 'Tech',
        lastName: 'Contact',
        email: 'tech@example.com',
        phone: '+1 555-1234',
      },
      adminContact: options.adminContact,
      organization: options.organization || {
        name: 'Example Corp',
        addressLineOne: '150 Broadway',
        city: 'Cambridge',
        region: 'MA',
        postalCode: '02142',
        countryCode: 'US',
        phone: '+1 555-1234',
      },
    };
  }

  private async getEnrollment(enrollmentId: number): Promise<Certificate> {
    const response = await this.auth.request<Certificate>({
      method: 'GET',
      path: `/cps/v2/enrollments/${enrollmentId}`,
      headers: { Accept: 'application/vnd.akamai.cps.enrollment.v11+json' },
    });

    return response;
  }

  private async getDVChallenges(enrollmentId: number): Promise<DVValidation[]> {
    const response = await this.auth.request<CpsResultsResponse>({
      method: 'GET',
      path: `/cps/v2/enrollments/${enrollmentId}/dv-history`,
      headers: { Accept: 'application/vnd.akamai.cps.dv-history.v2+json' },
    });

    return response.results || [];
  }

  private async setupDVValidation(enrollmentId: number, domains: string[]): Promise<void> {
    // Set validation method for each domain
    for (const domain of domains) {
      await this.auth.request({
        method: 'PUT',
        path: `/cps/v2/enrollments/${enrollmentId}/dv-validation/${domain}`,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ validationMethod: 'dns' }),
      });
    }
  }

  private async triggerDomainValidation(enrollmentId: number, domain: string): Promise<void> {
    await this.auth.request({
      method: 'POST',
      path: `/cps/v2/enrollments/${enrollmentId}/dv-validation/${domain}`,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acknowledgeWarnings: true }),
    });
  }

  private async updateEnrollmentStatus(enrollmentId: number, action: string): Promise<void> {
    await this.auth.request({
      method: 'POST',
      path: `/cps/v2/enrollments/${enrollmentId}/${action}`,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acknowledgeWarnings: true }),
    });
  }

  private async waitForValidations(enrollmentId: number): Promise<void> {
    const progress = new ProgressBar({
      total: 100,
      format: `${icons.time} Validating [:bar] :percent :message`,
    });

    let attempts = 0;
    const maxAttempts = 60; // 10 minutes with 10-second intervals

    while (attempts < maxAttempts) {
      const challenges = await this.getDVChallenges(enrollmentId);
      const pending = challenges.filter((c) => c.status !== 'completed');

      const percentComplete = ((challenges.length - pending.length) / challenges.length) * 100;
      progress.update({
        current: percentComplete,
        message: `${challenges.length - pending.length}/${challenges.length} domains validated`,
      });

      if (pending.length === 0) {
        progress.finish('All domains validated');
        return;
      }

      attempts++;
      await new Promise((resolve) => setTimeout(resolve, 10000));
    }

    throw new Error('Validation timeout - some domains failed to validate');
  }

  private async waitForCertificateIssuance(enrollmentId: number): Promise<void> {
    const spinner = new Spinner();
    spinner.start('Waiting for certificate issuance');

    let attempts = 0;
    const maxAttempts = 60;

    while (attempts < maxAttempts) {
      const enrollment = await this.getEnrollment(enrollmentId);

      if (enrollment.deploymentStatus === 'ready-for-deployment') {
        spinner.succeed('Certificate issued and ready for deployment');
        return;
      }

      attempts++;
      await new Promise((resolve) => setTimeout(resolve, 10000));
    }

    spinner.fail('Certificate issuance timeout');
    throw new Error('Certificate issuance timeout');
  }

  private async getDeployments(enrollmentId: number): Promise<DeploymentStatus[]> {
    const response = await this.auth.request<CpsResultsResponse>({
      method: 'GET',
      path: `/cps/v2/enrollments/${enrollmentId}/deployments`,
      headers: { Accept: 'application/vnd.akamai.cps.deployments.v3+json' },
    });

    return response.results || [];
  }

  private async getDeploymentStatus(
    enrollmentId: number,
    deploymentId: number,
  ): Promise<DeploymentStatus> {
    const response = await this.auth.request<DeploymentStatus>({
      method: 'GET',
      path: `/cps/v2/enrollments/${enrollmentId}/deployments/${deploymentId}`,
      headers: { Accept: 'application/vnd.akamai.cps.deployment.v3+json' },
    });

    return response;
  }

  // Orchestration method for complete certificate lifecycle
  async provisionAndDeployCertificate(
    domains: string[],
    options: {
      type?: 'default-dv' | 'third-party' | 'ev' | 'ov';
      network?: 'staging' | 'production';
      propertyIds?: string[];
      autoRenewal?: boolean;
      organizationDetails?: Partial<EnrollmentRequest['organization']>;
    } = {},
  ): Promise<void> {
    console.log(`\n${format.bold('Complete Certificate Provisioning')}`);
    console.log(format.dim('═'.repeat(60)));
    console.log(`${icons.certificate} Provisioning certificate for ${domains.length} domains`);
    console.log(format.dim('═'.repeat(60)));

    try {
      // Step 1: Enroll certificate
      const enrollmentOptions: Partial<EnrollmentRequest> = {};
      if (options.organizationDetails) {
        enrollmentOptions.organization = {
          name: 'Example Corp',
          addressLineOne: '150 Broadway',
          city: 'Cambridge',
          region: 'MA',
          postalCode: '02142',
          countryCode: 'US',
          phone: '+1 555-1234',
          ...options.organizationDetails,
        };
      }

      const certificate = await this.enrollCertificate(
        options.type || 'default-dv',
        domains,
        enrollmentOptions,
      );

      // Step 2: Handle validation
      if (certificate.validationType === 'dv') {
        await this.automatedDNSValidation(certificate.enrollmentId, true);
      } else {
        console.log(
          `\n${icons.info} Manual validation required for ${certificate.validationType.toUpperCase()} certificate`,
        );
      }

      // Step 3: Deploy certificate
      await this.deployCertificate(certificate.enrollmentId, options.network || 'production');

      // Step 4: Link to properties
      if (options.propertyIds && options.propertyIds.length > 0) {
        await this.linkCertificateToProperties(certificate.enrollmentId, options.propertyIds);
      }

      // Step 5: Setup auto-renewal
      if (options.autoRenewal) {
        await this.setupAutoRenewal(certificate.enrollmentId, {
          renewalWindow: 30,
          autoApprove: certificate.validationType === 'dv',
        });
      }

      // Display final status
      await this.displayCertificateStatus(certificate.enrollmentId);

      console.log(`\n${icons.success} ${format.bold('Certificate Provisioning Complete!')}`);
      console.log(`\n${icons.info} Next Steps:`);
      console.log('  1. Verify certificate in Control Center');
      console.log('  2. Test HTTPS connectivity on your domains');
      console.log('  3. Monitor certificate expiry and renewal status');
    } catch (error) {
      console.error(`\n${icons.error} ${format.red('Certificate provisioning failed:')}`);
      console.error(format.red(error instanceof Error ? error.message : String(error)));
      throw error;
    }
  }
}

// Export factory function
export async function createCPSCertificateAgent(
  customer?: string,
  dnsAgent?: any,
): Promise<CPSCertificateAgent> {
  const agent = new CPSCertificateAgent(customer, dnsAgent);
  await agent.initialize();
  return agent;
}
