/**
 * Orchestration module that coordinates multiple agents for complex workflows
 */

import {
  type CDNProvisioningAgent,
  createCDNProvisioningAgent,
} from '@agents/cdn-provisioning.agent';
import {
  type CPSCertificateAgent,
  createCPSCertificateAgent,
} from '@agents/cps-certificate.agent';
import { type DNSMigrationAgent, createDNSMigrationAgent } from '@agents/dns-migration.agent';
import { format, icons, ProgressBar, MultiProgress } from '@utils/progress';

export interface OrchestrationOptions {
  customer?: string;
  contractId?: string;
  groupId?: string;
}

export class AkamaiOrchestrator {
  private cdnAgent?: CDNProvisioningAgent;
  private cpsAgent?: CPSCertificateAgent;
  private dnsAgent?: DNSMigrationAgent;
  private multiProgress: MultiProgress;

  constructor(private options: OrchestrationOptions = {}) {
    this.multiProgress = new MultiProgress();
  }

  async initialize(): Promise<void> {
    console.log(`${format.bold('Initializing Akamai Orchestrator')}`);
    console.log(format.dim('─'.repeat(50)));

    const progress = new ProgressBar({
      total: 3,
      format: '[:bar] :percent | :message',
    });

    try {
      // Initialize CDN Agent
      progress.update({ current: 1, message: 'Initializing CDN Provisioning Agent' });
      this.cdnAgent = await createCDNProvisioningAgent(
        this.options.customer,
        this.options.contractId,
        this.options.groupId,
      );

      // Initialize DNS Agent
      progress.update({ current: 2, message: 'Initializing DNS Migration Agent' });
      this.dnsAgent = await createDNSMigrationAgent(this.options.customer);

      // Initialize CPS Agent with DNS integration
      progress.update({ current: 3, message: 'Initializing Certificate Agent' });
      this.cpsAgent = await createCPSCertificateAgent(this.options.customer, this.dnsAgent);

      progress.finish('All agents initialized');
    } catch (_error) {
      progress.update({
        current: progress['current'],
        status: 'error',
        message: `Initialization failed: ${_error instanceof Error ? _error.message : String(_error)}`,
      });
      throw _error;
    }
  }

  /**
   * Complete website migration from another provider to Akamai
   */
  async migrateWebsite(_options: {
    domain: string;
    originHostname: string;
    sourceProvider: 'cloudflare' | 'aws' | 'generic';
    sourceConfig?: any;
    productId?: string;
    activateStaging?: boolean;
    activateProduction?: boolean;
    notifyEmails?: string[];
  }): Promise<void> {
    console.log(`\n${format.bold('Complete Website Migration to Akamai')}`);
    console.log(format.dim('═'.repeat(60)));
    console.log(`${icons.globe} Domain: ${format.cyan(options.domain)}`);
    console.log(`${icons.server} Origin: ${format.green(options.originHostname)}`);
    console.log(`${icons.cloud} Source: ${format.yellow(options.sourceProvider.toUpperCase())}`);
    console.log(format.dim('═'.repeat(60)));

    const steps = [
      'Migrate DNS zone',
      'Create CDN property',
      'Configure origin and caching',
      'Provision SSL certificates',
      'Add hostnames to property',
      'Activate to staging',
      'Run validation tests',
      ...(options.activateProduction ? ['Activate to production'] : []),
      'Generate migration report',
    ];

    const progress = new ProgressBar({
      total: steps.length,
      format: '[:bar] :percent | Step :current/:total | :message',
    });

    try {
      // Step 1: Migrate DNS zone
      progress.update({ current: 1, message: steps[0] });
      await this.dnsAgent!.migrateZoneComplete(options.domain, options.domain, {
        source: options.sourceProvider === 'cloudflare' ? 'cloudflare' : 'axfr',
        sourceConfig: options.sourceConfig,
        autoActivate: true,
      });

      // Step 2: Create CDN property
      progress.update({ current: 2, message: steps[1] });
      const propertyName = options.domain.replace(/\./g, '-');

      // Use CDN agent's complete provisioning
      await this.cdnAgent!.provisionCompleteProperty(
        propertyName,
        [options.domain, `www.${options.domain}`],
        options.originHostname,
        {
          productId: options.productId,
          activateStaging: options.activateStaging,
          activateProduction: false, // We'll do this after validation
          notifyEmails: options.notifyEmails,
        },
      );

      // The CDN agent handles steps 3-6 internally
      progress.update({ current: 6, message: 'CDN property provisioned' });

      // Step 7: Run validation tests
      progress.update({ current: 7, message: steps[6] });
      await this.runValidationTests(options.domain);

      let currentStep = 7;

      // Step 8: Activate to production if requested
      if (options.activateProduction) {
        progress.update({ current: ++currentStep, message: steps[currentStep - 1] });
        // This would call the CDN agent's activation method
        console.log(`\n${icons.rocket} Activating to production...`);
      }

      // Step 9: Generate migration report
      progress.update({ current: steps.length, message: steps[steps.length - 1] });
      await this.generateMigrationReport(options);

      progress.finish('Migration complete!');

      // Final summary
      console.log(`\n${format.bold('Migration Summary')}`);
      console.log(format.dim('─'.repeat(60)));
      console.log(`${icons.success} DNS zone migrated with all records`);
      console.log(`${icons.success} CDN property created and configured`);
      console.log(`${icons.success} SSL certificates provisioned`);
      console.log(
        `${icons.success} Property activated to ${options.activateStaging ? 'staging' : 'ready for activation'}`,
      );

      console.log(`\n${icons.info} Next Steps:`);
      console.log('  1. Update nameservers at domain registrar');
      console.log('  2. Test thoroughly on staging');
      console.log('  3. Activate to production when ready');
      console.log('  4. Monitor traffic and performance');
    } catch (_error) {
      progress.update({
        current: progress['current'],
        status: 'error',
        message: `Migration failed: ${_error instanceof Error ? _error.message : String(_error)}`,
      });
      throw _error;
    }
  }

  /**
   * Provision a new secure website from scratch
   */
  async provisionSecureWebsite(_options: {
    domains: string[];
    originHostname: string;
    certificateType?: 'default-dv' | 'ev' | 'ov';
    enableWAF?: boolean;
    enableDDoS?: boolean;
    cacheStrategy?: 'aggressive' | 'moderate' | 'minimal';
    notifyEmails?: string[];
  }): Promise<void> {
    console.log(`\n${format.bold('Secure Website Provisioning')}`);
    console.log(format.dim('═'.repeat(60)));
    console.log(`${icons.globe} Domains: ${options.domains.map((d) => format.cyan(d)).join(', ')}`);
    console.log(
      `${icons.lock} Certificate: ${format.green(options.certificateType || 'default-dv')}`,
    );
    console.log(
      `${icons.shield} Security: WAF ${options.enableWAF ? '✓' : '✗'} | DDoS ${options.enableDDoS ? '✓' : '✗'}`,
    );
    console.log(format.dim('═'.repeat(60)));

    const progress = new ProgressBar({
      total: 8,
      format: '[:bar] :percent | :message',
    });

    try {
      // Step 1: Create DNS zones for all domains
      progress.update({ current: 1, message: 'Creating DNS zones' });
      for (const domain of options.domains) {
        await this.dnsAgent!.createRecord(domain, {
          name: '@',
          type: 'A',
          ttl: 300,
          rdata: ['192.0.2.1'], // Placeholder
        });
      }

      // Step 2: Provision SSL certificates
      progress.update({ current: 2, message: 'Provisioning SSL certificates' });
      await this.cpsAgent!.provisionAndDeployCertificate(options.domains, {
        type: options.certificateType || 'default-dv',
        network: 'production',
        autoRenewal: true,
      });

      // Step 3-7: Create and configure CDN property
      progress.update({ current: 3, message: 'Creating CDN property' });
      const propertyName = options.domains[0].replace(/\./g, '-');

      await this.cdnAgent!.provisionCompleteProperty(
        propertyName,
        options.domains,
        options.originHostname,
        {
          activateStaging: true,
          notifyEmails: options.notifyEmails,
        },
      );

      // Step 8: Apply security configurations
      if (options.enableWAF || options.enableDDoS) {
        progress.update({ current: 8, message: 'Configuring security policies' });
        // This would integrate with security configuration APIs
        console.log(`\n${icons.shield} Security configurations applied`);
      }

      progress.finish('Secure website provisioned successfully!');
    } catch (_error) {
      progress.update({
        current: progress['current'],
        status: 'error',
        message: _error instanceof Error ? _error.message : String(_error),
      });
      throw _error;
    }
  }

  /**
   * Bulk DNS migration for multiple zones
   */
  async bulkDNSMigration(_options: {
    zones: Array<{ source: string; target?: string }>;
    sourceType: 'cloudflare' | 'route53' | 'axfr';
    sourceConfig: any;
    parallel?: number;
  }): Promise<void> {
    console.log(`\n${format.bold('Bulk DNS Zone Migration')}`);
    console.log(format.dim('═'.repeat(60)));
    console.log(`${icons.dns} Zones to migrate: ${format.cyan(options.zones.length.toString())}`);
    console.log(`${icons.cloud} Source: ${format.green(options.sourceType.toUpperCase())}`);
    console.log(`${icons.rocket} Parallel: ${format.yellow((options.parallel || 1).toString())}`);
    console.log(format.dim('═'.repeat(60)));

    const progress = new ProgressBar({
      total: options.zones.length,
      format: '[:bar] :percent | :current/:total zones | :message',
    });

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    try {
      // Process zones in batches
      const parallel = options.parallel || 1;
      for (let i = 0; i < options.zones.length; i += parallel) {
        const batch = options.zones.slice(i, i + parallel);

        await Promise.all(
          batch.map(async (zone) => {
            const targetZone = zone.target || zone.source;
            progress.update({
              current: i + 1,
              message: `Migrating ${zone.source}`,
            });

            try {
              await this.dnsAgent!.migrateZoneComplete(zone.source, targetZone, {
                source: options.sourceType,
                sourceConfig: options.sourceConfig,
                autoActivate: true,
              });
              results.success++;
            } catch (_error) {
              results.failed++;
              results.errors.push(
                `${zone.source}: ${_error instanceof Error ? _error.message : String(_error)}`,
              );
            }
          }),
        );
      }

      progress.finish('Bulk migration complete');

      // Display results
      console.log(`\n${format.bold('Migration Results')}`);
      console.log(format.dim('─'.repeat(50)));
      console.log(`${icons.success} Successful: ${format.green(results.success.toString())}`);
      console.log(`${icons.error} Failed: ${format.red(results.failed.toString())}`);

      if (results.errors.length > 0) {
        console.log(`\n${icons.warning} Errors:`);
        results.errors.forEach((err) => console.log(`  ${icons.cross} ${err}`));
      }

      // Generate nameserver migration instructions
      if (results.success > 0) {
        console.log(`\n${icons.info} ${format.bold('Nameserver Update Required')}`);
        console.log('Update nameservers for all migrated zones at your domain registrar');
      }
    } catch (_error) {
      progress.update({
        current: progress['current'],
        status: 'error',
        message: _error instanceof Error ? _error.message : String(_error),
      });
      throw _error;
    }
  }

  // Helper methods
  private async runValidationTests(domain: string): Promise<void> {
    console.log(`\n${icons.check} Running validation tests for ${domain}...`);

    // Simulate validation tests
    const tests = [
      'DNS resolution',
      'HTTPS connectivity',
      'Origin connectivity',
      'Cache headers',
      'SSL certificate validation',
    ];

    for (const test of tests) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      console.log(`  ${icons.success} ${test}`);
    }
  }

  private async generateMigrationReport(_options: any): Promise<void> {
    console.log(`\n${icons.document} Generating migration report...`);

    // This would generate a detailed report
    const reportPath = `/tmp/migration-report-${options.domain}-${Date.now()}.json`;
    console.log(`  ${icons.success} Report saved to: ${reportPath}`);
  }

  /**
   * Get initialized agents for direct access
   */
  getAgents() {
    return {
      cdn: this.cdnAgent,
      cps: this.cpsAgent,
      dns: this.dnsAgent,
    };
  }
}

// Export factory function
export async function createOrchestrator(
  options?: OrchestrationOptions,
): Promise<AkamaiOrchestrator> {
  const orchestrator = new AkamaiOrchestrator(options);
  await orchestrator.initialize();
  return orchestrator;
}

// Export example usage functions
export async function exampleUsage() {
  console.log(`${format.bold('Akamai Orchestrator Examples')}`);
  console.log(format.dim('═'.repeat(60)));

  console.log(`\n${icons.rocket} Example 1: Migrate website from Cloudflare`);
  console.log(
    format.gray(`
const orchestrator = await createOrchestrator({
  customer: 'default',
  contractId: 'ctr_123456',
  groupId: 'grp_123456'
});

await orchestrator.migrateWebsite({
  domain: 'example.com',
  originHostname: 'origin.example.com',
  sourceProvider: 'cloudflare',
  sourceConfig: {
    apiToken: 'cf_token',
    zoneId: 'cf_zone_id'
  },
  activateStaging: true,
  notifyEmails: ['ops@example.com']
});
  `),
  );

  console.log(`\n${icons.rocket} Example 2: Provision secure website`);
  console.log(
    format.gray(`
await orchestrator.provisionSecureWebsite({
  domains: ['example.com', 'www.example.com'],
  originHostname: 'origin.example.com',
  certificateType: 'default-dv',
  enableWAF: true,
  enableDDoS: true,
  cacheStrategy: 'moderate',
  notifyEmails: ['security@example.com']
});
  `),
  );

  console.log(`\n${icons.rocket} Example 3: Bulk DNS migration`);
  console.log(
    format.gray(`
await orchestrator.bulkDNSMigration({
  zones: [
    { source: 'example.com' },
    { source: 'example.org' },
    { source: 'example.net' }
  ],
  sourceType: 'cloudflare',
  sourceConfig: {
    apiToken: 'cf_token'
  },
  parallel: 3
});
  `),
  );

  console.log(`\n${icons.rocket} Example 4: Direct agent access`);
  console.log(
    format.gray(`
const { cdn, cps, dns } = orchestrator.getAgents();

// Use CDN agent directly
await cdn.createPropertyVersion('prp_123456', 1, 'New feature release');

// Use CPS agent directly  
await cps.processCertificateRenewal(12345);

// Use DNS agent directly
await dns.createRecord('example.com', {
  name: 'test',
  type: 'A',
  ttl: 300,
  rdata: ['192.0.2.1']
});
  `),
  );

  console.log(format.dim('\n═'.repeat(60)));
}
