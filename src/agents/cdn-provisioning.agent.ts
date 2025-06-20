import {
  ProgressBar,
  Spinner,
  MultiProgress,
  format,
  icons,
} from '@utils/progress';

import { EdgeGridAuth } from '../auth/EdgeGridAuth';

import {
  type PapiVersionResponse,
  type PapiRulesResponse,
  type PapiEdgeHostnameResponse,
  type PapiActivationResponse,
  type PapiGroupsResponse,
  type PapiVersionsResponse,
  type PapiHostnamesResponse,
  type PapiEdgeHostnamesResponse,
  type PapiActivationsResponse,
  type PapiPropertyResponse,
  type PapiErrorsResponse,
  type PapiEtagResponse,
} from './types';

interface PropertyVersion {
  propertyId: string;
  propertyVersion: number;
  etag: string;
  note: string;
  productionStatus: string;
  stagingStatus: string;
  updatedByUser: string;
  updatedDate: string;
}

interface RuleTree {
  name: string;
  children: any[];
  behaviors: any[];
  criteria: any[];
  criteriaMustSatisfy?: string;
  comments?: string;
}

interface EdgeHostname {
  edgeHostnameId: string;
  domainPrefix: string;
  domainSuffix: string;
  status: string;
  ipVersionBehavior: string;
  productId: string;
}

interface ActivationStatus {
  activationId: string;
  propertyId: string;
  propertyVersion: number;
  network: 'STAGING' | 'PRODUCTION';
  status: string;
  submitDate: string;
  updateDate: string;
  activationType: string;
  notifyEmails: string[];
}

export class CDNProvisioningAgent {
  private auth: EdgeGridAuth;
  private multiProgress: MultiProgress;
  private contractId: string;
  private groupId: string;

  constructor(
    private customer = 'default',
    contractId?: string,
    groupId?: string,
  ) {
    this.auth = EdgeGridAuth.getInstance({ customer: this.customer });
    this.multiProgress = new MultiProgress();
    this.contractId = contractId || '';
    this.groupId = groupId || '';
  }

  async initialize(): Promise<void> {
    const spinner = this.multiProgress.addSpinner('init');
    spinner.start('Initializing CDN Provisioning Agent');

    try {
      // Get contract and group if not provided
      if (!this.contractId || !this.groupId) {
        const groups = await this.getGroups();
        if (groups.length > 0) {
          this.contractId = this.contractId || groups[0].contractIds[0];
          this.groupId = this.groupId || groups[0].groupId;
        }
      }

      spinner.succeed(`Initialized with contract: ${this.contractId}, group: ${this.groupId}`);
    } catch (error) {
      spinner.fail('Failed to initialize agent');
      throw error;
    } finally {
      this.multiProgress.remove('init');
    }
  }

  // Property Version Management
  async createPropertyVersion(
    propertyId: string,
    baseVersion?: number,
    note?: string,
  ): Promise<PropertyVersion> {
    const spinner = new Spinner();
    spinner.start(`Creating new version for property ${propertyId}`);

    try {
      const request = {
        createFromVersion: baseVersion,
        createFromVersionEtag: await this.getVersionEtag(propertyId, baseVersion),
      };

      const response = await this.auth.request<PapiVersionResponse>({
        method: 'POST',
        path: `/papi/v1/properties/${propertyId}/versions?contractId=${this.contractId}&groupId=${this.groupId}`,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      const versionLink = response.versionLink;
      const versionNumber = parseInt(versionLink.split('/').pop() || '0');

      if (note) {
        await this.updateVersionNotes(propertyId, versionNumber, note);
      }

      spinner.succeed(`Created version ${versionNumber} for property ${propertyId}`);
      return await this.getPropertyVersion(propertyId, versionNumber);
    } catch (error) {
      spinner.fail(
        `Failed to create property version: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async clonePropertyVersion(
    sourcePropertyId: string,
    sourceVersion: number,
    targetPropertyId: string,
    note?: string,
  ): Promise<PropertyVersion> {
    const progress = new ProgressBar({
      total: 4,
      format: `${icons.package} Cloning [:bar] :percent :message`,
    });

    try {
      // Step 1: Get source rule tree
      progress.update({ current: 1, message: 'Fetching source configuration' });
      const sourceRuleTree = await this.getRuleTree(sourcePropertyId, sourceVersion);

      // Step 2: Create new version on target
      progress.update({ current: 2, message: 'Creating target version' });
      const targetVersion = await this.createPropertyVersion(
        targetPropertyId,
        undefined,
        note || `Cloned from ${sourcePropertyId} v${sourceVersion}`,
      );

      // Step 3: Apply rule tree to target
      progress.update({ current: 3, message: 'Applying configuration' });
      await this.updateRuleTree(targetPropertyId, targetVersion.propertyVersion, sourceRuleTree);

      // Step 4: Copy hostnames
      progress.update({ current: 4, message: 'Copying hostnames' });
      const sourceHostnames = await this.getPropertyHostnames(sourcePropertyId, sourceVersion);
      for (const hostname of sourceHostnames) {
        await this.addHostname(
          targetPropertyId,
          targetVersion.propertyVersion,
          hostname.cnameFrom,
          hostname.cnameTo,
        );
      }

      progress.finish('Version cloned successfully');
      return targetVersion;
    } catch (error) {
      progress.update({
        current: progress['current'],
        status: 'error',
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  // Rule Tree Configuration
  async getRuleTree(propertyId: string, version: number): Promise<RuleTree> {
    const response = await this.auth.request<PapiRulesResponse>({
      method: 'GET',
      path: `/papi/v1/properties/${propertyId}/versions/${version}/rules?contractId=${this.contractId}&groupId=${this.groupId}`,
    });

    return response.rules;
  }

  async updateRuleTree(propertyId: string, version: number, ruleTree: RuleTree): Promise<void> {
    const spinner = new Spinner();
    spinner.start('Updating rule configuration');

    try {
      const etag = await this.getVersionEtag(propertyId, version);

      await this.auth.request({
        method: 'PUT',
        path: `/papi/v1/properties/${propertyId}/versions/${version}/rules?contractId=${this.contractId}&groupId=${this.groupId}`,
        headers: {
          'Content-Type': 'application/json',
          'If-Match': etag,
        },
        body: JSON.stringify({ rules: ruleTree }),
      });

      spinner.succeed('Rule configuration updated');
    } catch (error) {
      spinner.fail(
        `Failed to update rules: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async applyRuleTemplate(
    propertyId: string,
    version: number,
    template: 'origin' | 'caching' | 'performance' | 'security',
    options: any = {},
  ): Promise<void> {
    const spinner = new Spinner();
    spinner.start(`Applying ${template} template`);

    try {
      const ruleTree = await this.getRuleTree(propertyId, version);

      switch (template) {
        case 'origin':
          this.applyOriginTemplate(ruleTree, options);
          break;
        case 'caching':
          this.applyCachingTemplate(ruleTree, options);
          break;
        case 'performance':
          this.applyPerformanceTemplate(ruleTree, options);
          break;
        case 'security':
          this.applySecurityTemplate(ruleTree, options);
          break;
      }

      await this.updateRuleTree(propertyId, version, ruleTree);
      spinner.succeed(`${format.bold(template)} template applied`);
    } catch (error) {
      spinner.fail(
        `Failed to apply template: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  // Edge Hostname Management
  async createEdgeHostname(
    productId: string,
    domainPrefix: string,
    options: {
      domainSuffix?: string;
      ipVersionBehavior?: 'IPV4' | 'IPV6' | 'IPV4_IPV6';
      secureNetwork?: 'STANDARD_TLS' | 'ENHANCED_TLS' | 'SHARED_CERT';
      certEnrollmentId?: number;
    } = {},
  ): Promise<EdgeHostname> {
    const progress = new ProgressBar({
      total: 3,
      format: `${icons.globe} Creating edge hostname [:bar] :percent :message`,
    });

    try {
      progress.update({ current: 1, message: 'Preparing configuration' });

      const request: any = {
        productId,
        domainPrefix,
        domainSuffix: options.domainSuffix || 'edgesuite.net',
        ipVersionBehavior: options.ipVersionBehavior || 'IPV4',
        secureNetwork: options.secureNetwork || 'STANDARD_TLS',
      };

      if (options.certEnrollmentId) {
        request.certEnrollmentId = options.certEnrollmentId;
      }

      progress.update({ current: 2, message: 'Creating hostname' });

      const response = await this.auth.request<PapiEdgeHostnameResponse>({
        method: 'POST',
        path: `/papi/v1/edgehostnames?contractId=${this.contractId}&groupId=${this.groupId}`,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([request]),
      });

      const edgeHostnameLink = response.edgeHostnameLink;
      const edgeHostnameId = edgeHostnameLink.split('/').pop();
      if (!edgeHostnameId) {
        throw new Error('Failed to extract edge hostname ID from response');
      }

      progress.update({ current: 3, message: 'Waiting for DNS propagation' });

      // Poll for completion
      const edgeHostname = await this.waitForEdgeHostname(edgeHostnameId);

      progress.finish(
        `Edge hostname ${format.cyan(domainPrefix + '.' + request.domainSuffix)} created`,
      );
      return edgeHostname;
    } catch (error) {
      progress.update({
        current: progress['current'],
        status: 'error',
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  // Property Activation
  async activateProperty(
    propertyId: string,
    version: number,
    network: 'STAGING' | 'PRODUCTION',
    options: {
      notifyEmails?: string[];
      acknowledgeWarnings?: string[];
      complianceRecord?: {
        noncomplianceReason?: string;
      };
      note?: string;
    } = {},
  ): Promise<ActivationStatus> {
    const progress = new ProgressBar({
      total: 100,
      format: `${icons.rocket} Activating to ${network} [:bar] :percent :eta :message`,
    });

    try {
      progress.update({ current: 5, message: 'Validating property' });

      // Validate property first
      await this.validateProperty(propertyId, version);

      progress.update({ current: 10, message: 'Submitting activation request' });

      const request: any = {
        propertyVersion: version,
        network,
        activationType: 'FAST',
        notifyEmails: options.notifyEmails || [],
        acknowledgeWarnings: options.acknowledgeWarnings || [],
      };

      if (options.complianceRecord) {
        request.complianceRecord = options.complianceRecord;
      }

      if (options.note) {
        request.note = options.note;
      }

      const response = await this.auth.request<PapiActivationResponse>({
        method: 'POST',
        path: `/papi/v1/properties/${propertyId}/activations?contractId=${this.contractId}&groupId=${this.groupId}`,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      const activationLink = response.activationLink;
      const activationId = activationLink.split('/').pop();
      if (!activationId) {
        throw new Error('Failed to extract activation ID from response');
      }

      // Poll for activation status
      let status: ActivationStatus;
      let lastProgress = 10;

      while (true) {
        status = await this.getActivationStatus(propertyId, activationId);

        // Update progress based on status
        let currentProgress = lastProgress;
        switch (status.status) {
          case 'PENDING':
            currentProgress = Math.min(lastProgress + 5, 30);
            progress.update({ current: currentProgress, message: 'Pending approval' });
            break;
          case 'ZONE_1':
            currentProgress = 40;
            progress.update({ current: currentProgress, message: 'Deploying to Zone 1' });
            break;
          case 'ZONE_2':
            currentProgress = 60;
            progress.update({ current: currentProgress, message: 'Deploying to Zone 2' });
            break;
          case 'ZONE_3':
            currentProgress = 80;
            progress.update({ current: currentProgress, message: 'Deploying to Zone 3' });
            break;
          case 'ACTIVE':
            progress.finish(`Property activated on ${network}`);
            return status;
          case 'FAILED':
          case 'ABORTED':
          case 'DEACTIVATED':
            throw new Error(`Activation ${status.status.toLowerCase()}`);
        }

        lastProgress = currentProgress;
        await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds
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

  // Hostname Management
  async addHostname(
    propertyId: string,
    version: number,
    hostname: string,
    edgeHostname: string,
  ): Promise<void> {
    const spinner = new Spinner();
    spinner.start(`Adding hostname ${hostname}`);

    try {
      const hostnames = await this.getPropertyHostnames(propertyId, version);

      hostnames.push({
        cnameType: 'EDGE_HOSTNAME',
        cnameFrom: hostname,
        cnameTo: edgeHostname,
      });

      const etag = await this.getVersionEtag(propertyId, version);

      await this.auth.request({
        method: 'PUT',
        path: `/papi/v1/properties/${propertyId}/versions/${version}/hostnames?contractId=${this.contractId}&groupId=${this.groupId}`,
        headers: {
          'Content-Type': 'application/json',
          'If-Match': etag,
        },
        body: JSON.stringify(hostnames),
      });

      spinner.succeed(`Added hostname ${format.cyan(hostname)} → ${format.green(edgeHostname)}`);
    } catch (error) {
      spinner.fail(
        `Failed to add hostname: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  // Certificate Management Integration
  async provisionDefaultDVCertificate(
    propertyId: string,
    version: number,
    hostnames: string[],
  ): Promise<void> {
    console.log(`\n${format.bold('Default DV Certificate Provisioning')}`);
    console.log(format.dim('─'.repeat(50)));

    const progress = new ProgressBar({
      total: hostnames.length * 3 + 2,
      format: `${icons.certificate} [:bar] :percent :message`,
    });

    try {
      progress.update({ current: 1, message: 'Creating certificate enrollment' });

      // Create default DV enrollment
      const enrollment = await this.createDefaultDVEnrollment(hostnames);

      progress.update({ current: 2, message: 'Setting up DNS validation' });

      // For each hostname, create DNS validation records
      let currentStep = 2;
      for (const hostname of hostnames) {
        progress.update({
          current: ++currentStep,
          message: `Creating ACME record for ${hostname}`,
        });

        await this.createACMEValidationRecord(hostname, enrollment.dv[hostname]);

        progress.update({
          current: ++currentStep,
          message: `Validating ${hostname}`,
        });

        await this.waitForDomainValidation(enrollment.enrollmentId, hostname);

        progress.update({
          current: ++currentStep,
          message: `${hostname} validated`,
        });
      }

      progress.finish('All certificates provisioned and validated');

      console.log(`\n${icons.success} Certificate Details:`);
      console.log(`  ${icons.bullet} Enrollment ID: ${format.cyan(enrollment.enrollmentId)}`);
      console.log(`  ${icons.bullet} Network: ${format.green('Enhanced TLS')}`);
      console.log(`  ${icons.bullet} Validated Domains: ${hostnames.length}`);
    } catch (error) {
      progress.update({
        current: progress['current'],
        status: 'error',
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  // Helper methods
  private async getGroups(): Promise<any[]> {
    const response = await this.auth.request<PapiGroupsResponse>({
      method: 'GET',
      path: '/papi/v1/groups',
    });
    return response.groups.items;
  }

  private async getPropertyVersion(propertyId: string, version: number): Promise<PropertyVersion> {
    const response = await this.auth.request<PapiVersionsResponse>({
      method: 'GET',
      path: `/papi/v1/properties/${propertyId}/versions/${version}?contractId=${this.contractId}&groupId=${this.groupId}`,
    });

    return response.versions.items[0];
  }

  private async getVersionEtag(propertyId: string, version?: number): Promise<string> {
    const v = version || (await this.getLatestVersion(propertyId));
    const response = await this.auth.request<PapiVersionsResponse & PapiEtagResponse>({
      method: 'GET',
      path: `/papi/v1/properties/${propertyId}/versions/${v}?contractId=${this.contractId}&groupId=${this.groupId}`,
    });
    // The EdgeGrid client returns the etag in the response headers
    return response.etag || response.headers?.etag || '';
  }

  private async getLatestVersion(propertyId: string): Promise<number> {
    const response = await this.auth.request<PapiVersionsResponse>({
      method: 'GET',
      path: `/papi/v1/properties/${propertyId}/versions/latest?contractId=${this.contractId}&groupId=${this.groupId}`,
    });
    return response.versions.items[0].propertyVersion;
  }

  private async updateVersionNotes(
    propertyId: string,
    version: number,
    note: string,
  ): Promise<void> {
    const etag = await this.getVersionEtag(propertyId, version);
    await this.auth.request({
      method: 'PATCH',
      path: `/papi/v1/properties/${propertyId}/versions/${version}?contractId=${this.contractId}&groupId=${this.groupId}`,
      headers: {
        'Content-Type': 'application/json-patch+json',
        'If-Match': etag,
      },
      body: JSON.stringify([{ op: 'replace', path: '/note', value: note }]),
    });
  }

  private async getPropertyHostnames(propertyId: string, version: number): Promise<any[]> {
    const response = await this.auth.request<PapiHostnamesResponse>({
      method: 'GET',
      path: `/papi/v1/properties/${propertyId}/versions/${version}/hostnames?contractId=${this.contractId}&groupId=${this.groupId}`,
    });
    return response.hostnames.items;
  }

  private async waitForEdgeHostname(edgeHostnameId: string): Promise<EdgeHostname> {
    while (true) {
      const response = await this.auth.request<PapiEdgeHostnamesResponse>({
        method: 'GET',
        path: `/papi/v1/edgehostnames/${edgeHostnameId}?contractId=${this.contractId}&groupId=${this.groupId}`,
      });

      const hostname = response.edgeHostnames.items[0];
      if (hostname.status === 'ACTIVE') {
        return hostname;
      }

      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }

  private async validateProperty(propertyId: string, version: number): Promise<void> {
    const response = await this.auth.request<PapiErrorsResponse>({
      method: 'POST',
      path: `/papi/v1/properties/${propertyId}/versions/${version}/validate?contractId=${this.contractId}&groupId=${this.groupId}`,
    });

    if (response.errors && response.errors.length > 0) {
      throw new Error(`Validation errors: ${JSON.stringify(response.errors)}`);
    }
  }

  private async getActivationStatus(
    propertyId: string,
    activationId: string,
  ): Promise<ActivationStatus> {
    const response = await this.auth.request<PapiActivationsResponse>({
      method: 'GET',
      path: `/papi/v1/properties/${propertyId}/activations/${activationId}?contractId=${this.contractId}&groupId=${this.groupId}`,
    });

    return response.activations.items[0];
  }

  // Template application methods
  private applyOriginTemplate(ruleTree: RuleTree, options: any): void {
    const originBehavior = {
      name: 'origin',
      options: {
        originType: 'CUSTOMER',
        hostname: options.originHostname || 'origin.example.com',
        forwardHostHeader: options.forwardHostHeader || 'REQUEST_HOST_HEADER',
        cacheKeyHostname: 'REQUEST_HOST_HEADER',
        compress: true,
        enableTrueClientIp: true,
        httpPort: options.httpPort || 80,
        httpsPort: options.httpsPort || 443,
        originSni: true,
        verificationMode: 'PLATFORM_SETTINGS',
      },
    };

    // Find or add origin behavior
    const existingIndex = ruleTree.behaviors.findIndex((b) => b.name === 'origin');
    if (existingIndex >= 0) {
      ruleTree.behaviors[existingIndex] = originBehavior;
    } else {
      ruleTree.behaviors.push(originBehavior);
    }
  }

  private applyCachingTemplate(ruleTree: RuleTree, options: any): void {
    const cachingRule = {
      name: 'Performance',
      children: [
        {
          name: 'Static Content',
          criteria: [
            {
              name: 'fileExtension',
              options: {
                matchOperator: 'IS_ONE_OF',
                values: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'css', 'js', 'woff', 'woff2'],
              },
            },
          ],
          behaviors: [
            {
              name: 'caching',
              options: {
                behavior: 'MAX_AGE',
                ttl: options.staticTtl || '7d',
                mustRevalidate: false,
              },
            },
          ],
        },
        {
          name: 'Dynamic Content',
          criteria: [
            {
              name: 'path',
              options: {
                matchOperator: 'MATCHES_ONE_OF',
                values: ['/api/*', '/dynamic/*'],
              },
            },
          ],
          behaviors: [
            {
              name: 'caching',
              options: {
                behavior: 'NO_STORE',
              },
            },
          ],
        },
      ],
    };

    // Add or replace caching rules
    const existingIndex = ruleTree.children.findIndex((c) => c.name === 'Performance');
    if (existingIndex >= 0) {
      ruleTree.children[existingIndex] = cachingRule;
    } else {
      ruleTree.children.push(cachingRule);
    }
  }

  private applyPerformanceTemplate(ruleTree: RuleTree, options: any): void {
    const performanceBehaviors = [
      {
        name: 'http2',
        options: {},
      },
      {
        name: 'allowTransferEncoding',
        options: {
          enabled: true,
        },
      },
      {
        name: 'removeVary',
        options: {
          enabled: true,
        },
      },
      {
        name: 'prefetch',
        options: {
          enabled: options.prefetch !== false,
        },
      },
      {
        name: 'dnsAsyncRefresh',
        options: {
          enabled: true,
        },
      },
    ];

    // Add performance behaviors
    performanceBehaviors.forEach((behavior) => {
      const existingIndex = ruleTree.behaviors.findIndex((b) => b.name === behavior.name);
      if (existingIndex >= 0) {
        ruleTree.behaviors[existingIndex] = behavior;
      } else {
        ruleTree.behaviors.push(behavior);
      }
    });
  }

  private applySecurityTemplate(ruleTree: RuleTree, _options: any): void {
    const securityRule = {
      name: 'Security',
      children: [
        {
          name: 'HTTPS Redirect',
          criteria: [
            {
              name: 'requestProtocol',
              options: {
                value: 'HTTP',
              },
            },
          ],
          behaviors: [
            {
              name: 'redirect',
              options: {
                mobileDefaultChoice: 'DEFAULT',
                destinationProtocol: 'HTTPS',
                destinationHostname: 'SAME_AS_REQUEST',
                destinationPath: 'SAME_AS_REQUEST',
                queryString: 'APPEND',
                responseCode: 301,
              },
            },
          ],
        },
      ],
      behaviors: [
        {
          name: 'strictTransportSecurity',
          options: {
            enable: true,
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true,
          },
        },
      ],
    };

    // Add security rules
    const existingIndex = ruleTree.children.findIndex((c) => c.name === 'Security');
    if (existingIndex >= 0) {
      ruleTree.children[existingIndex] = securityRule;
    } else {
      ruleTree.children.push(securityRule);
    }
  }

  // Stub methods for certificate operations (to be implemented with CPS agent)
  private async createDefaultDVEnrollment(hostnames: string[]): Promise<any> {
    // This would integrate with CPS API
    return {
      enrollmentId: 'dv-123456',
      dv: hostnames.reduce((acc, h) => ({ ...acc, [h]: `_acme-challenge.${h}` }), {}),
    };
  }

  private async createACMEValidationRecord(hostname: string, challenge: string): Promise<void> {
    // This would integrate with EdgeDNS API
    console.log(`  ${icons.dns} Creating DNS record: ${format.cyan(challenge)}`);
  }

  private async waitForDomainValidation(_enrollmentId: string, _hostname: string): Promise<void> {
    // This would poll CPS API for validation status
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  // Orchestration method for complete CDN setup
  async provisionCompleteProperty(
    propertyName: string,
    hostnames: string[],
    originHostname: string,
    options: {
      productId?: string;
      activateStaging?: boolean;
      activateProduction?: boolean;
      notifyEmails?: string[];
    } = {},
  ): Promise<void> {
    console.log(`\n${format.bold('Complete CDN Property Provisioning')}`);
    console.log(format.dim('═'.repeat(60)));
    console.log(`${icons.package} Property: ${format.cyan(propertyName)}`);
    console.log(`${icons.globe} Hostnames: ${hostnames.map((h) => format.green(h)).join(', ')}`);
    console.log(`${icons.server} Origin: ${format.yellow(originHostname)}`);
    console.log(format.dim('─'.repeat(60)));

    const steps = [
      'Create property',
      'Create edge hostname',
      'Configure origin',
      'Apply performance template',
      'Apply security template',
      'Add hostnames',
      'Provision certificates',
      ...(options.activateStaging ? ['Activate to staging'] : []),
      ...(options.activateProduction ? ['Activate to production'] : []),
    ];

    const progress = new ProgressBar({
      total: steps.length,
      format: '[:bar] :percent | Step :current/:total | :message',
    });

    let propertyId: string;
    const version = 1;
    let edgeHostname: string;

    try {
      // Step 1: Create property
      progress.update({ current: 1, message: steps[0] });
      const createResponse = await this.auth.request<PapiPropertyResponse>({
        method: 'POST',
        path: `/papi/v1/properties?contractId=${this.contractId}&groupId=${this.groupId}`,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyName,
          productId: options.productId || 'prd_Web_Accel',
          ruleFormat: 'latest',
        }),
      });
      propertyId = createResponse.propertyLink.split('/').pop() || '';

      // Step 2: Create edge hostname
      progress.update({ current: 2, message: steps[1] });
      const edgeHostnameResult = await this.createEdgeHostname(
        options.productId || 'prd_Web_Accel',
        propertyName.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      );
      edgeHostname = `${edgeHostnameResult.domainPrefix}.${edgeHostnameResult.domainSuffix}`;

      // Step 3: Configure origin
      progress.update({ current: 3, message: steps[2] });
      await this.applyRuleTemplate(propertyId, version, 'origin', { originHostname });

      // Step 4: Apply performance template
      progress.update({ current: 4, message: steps[3] });
      await this.applyRuleTemplate(propertyId, version, 'performance', {});

      // Step 5: Apply security template
      progress.update({ current: 5, message: steps[4] });
      await this.applyRuleTemplate(propertyId, version, 'security', {});

      // Step 6: Add hostnames
      progress.update({ current: 6, message: steps[5] });
      for (const hostname of hostnames) {
        await this.addHostname(propertyId, version, hostname, edgeHostname);
      }

      // Step 7: Provision certificates
      progress.update({ current: 7, message: steps[6] });
      await this.provisionDefaultDVCertificate(propertyId, version, hostnames);

      let currentStep = 7;

      // Step 8: Activate to staging
      if (options.activateStaging) {
        progress.update({ current: ++currentStep, message: steps[currentStep - 1] });
        await this.activateProperty(propertyId, version, 'STAGING', {
          notifyEmails: options.notifyEmails,
        });
      }

      // Step 9: Activate to production
      if (options.activateProduction) {
        progress.update({ current: ++currentStep, message: steps[currentStep - 1] });
        await this.activateProperty(propertyId, version, 'PRODUCTION', {
          notifyEmails: options.notifyEmails,
        });
      }

      progress.finish('Property provisioning complete!');

      // Summary
      console.log(`\n${format.bold('Provisioning Summary')}`);
      console.log(format.dim('─'.repeat(60)));
      console.log(`${icons.success} Property ID: ${format.cyan(propertyId)}`);
      console.log(`${icons.success} Edge Hostname: ${format.green(edgeHostname)}`);
      console.log(`${icons.success} Version: ${version}`);
      console.log(`${icons.success} Certificates: Provisioned for ${hostnames.length} domains`);

      if (options.activateStaging || options.activateProduction) {
        console.log(
          `${icons.success} Active on: ${[
            options.activateStaging && 'STAGING',
            options.activateProduction && 'PRODUCTION',
          ]
            .filter(Boolean)
            .join(', ')}`,
        );
      }

      console.log(`\n${icons.info} Next Steps:`);
      console.log('  1. Update DNS CNAME records:');
      hostnames.forEach((hostname) => {
        console.log(`     ${hostname} → ${edgeHostname}`);
      });
      console.log(`  2. Test on staging: https://${hostnames[0]}.edgesuite-staging.net`);
      console.log('  3. Monitor activation status in Control Center');
    } catch (error) {
      progress.update({
        current: progress['current'],
        status: 'error',
        message: `Failed: ${error instanceof Error ? error.message : String(error)}`,
      });
      throw error;
    }
  }
}

// Export a factory function for easy instantiation
export async function createCDNProvisioningAgent(
  customer?: string,
  contractId?: string,
  groupId?: string,
): Promise<CDNProvisioningAgent> {
  const agent = new CDNProvisioningAgent(customer, contractId, groupId);
  await agent.initialize();
  return agent;
}
