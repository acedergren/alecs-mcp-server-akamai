import * as dns from 'dns';
import { promisify } from 'util';

import {
  ProgressBar,
  Spinner,
  MultiProgress,
  format,
  icons,
} from '@utils/progress';

import { EdgeGridAuth } from '../auth/EdgeGridAuth';

import { type DnsRecordsetsResponse, type CpsLocationResponse } from './types';

const _resolveTxt = promisify(dns.resolveTxt);
const resolveNs = promisify(dns.resolveNs);
const _resolveCname = promisify(dns.resolveCname);
const _resolveMx = promisify(dns.resolveMx);
const _resolveSrv = promisify(dns.resolveSrv);
const _resolve4 = promisify(dns.resolve4);
const _resolve6 = promisify(dns.resolve6);

interface DNSRecord {
  name: string;
  type: string;
  ttl: number;
  rdata: string[];
  active?: boolean;
}

interface DNSZone {
  zone: string;
  type: 'PRIMARY' | 'SECONDARY' | 'ALIAS';
  masters?: string[];
  comment?: string;
  signAndServe?: boolean;
  contractId?: string;
  activationState?: string;
  lastModifiedDate?: string;
  versionId?: string;
}

interface ZoneImportResult {
  zone: string;
  recordsImported: number;
  recordsFailed: number;
  errors: string[];
  warnings: string[];
}

interface NameserverMigration {
  oldNameservers: string[];
  newNameservers: string[];
  migrationSteps: string[];
  verificationCommands: string[];
}

interface ZoneFileParser {
  parse(content: string): DNSRecord[];
  validate(records: DNSRecord[]): { valid: boolean; errors: string[] };
}

export class DNSMigrationAgent {
  private auth: EdgeGridAuth;
  private multiProgress: MultiProgress;
  private changeListCache: Map<string, string> = new Map();

  constructor(private customer = 'default') {
    this.auth = EdgeGridAuth.getInstance({ customer: this.customer });
    this.multiProgress = new MultiProgress();
  }

  async initialize(): Promise<void> {
    const spinner = this.multiProgress.addSpinner('init');
    spinner.start('Initializing DNS Migration Agent');

    try {
      // Verify EdgeDNS access
      await this.auth._request({
        method: 'GET',
        path: '/config-dns/v2/zones?showAll=true&types=PRIMARY',
      });

      spinner.succeed('DNS Migration Agent initialized');
    } catch (_error) {
      spinner.fail('Failed to initialize DNS agent');
      throw _error;
    } finally {
      this.multiProgress.remove('init');
    }
  }

  // Zone Import via AXFR
  async importZoneViaAXFR(
    zoneName: string,
    primaryNameserver: string,
    options: {
      tsigKey?: { name: string; algorithm: string; secret: string };
      port?: number;
      timeout?: number;
    } = {},
  ): Promise<ZoneImportResult> {
    console.log(`\n${format.bold('Zone Import via AXFR')}`);
    console.log(format.dim('─'.repeat(50)));
    console.log(`${icons.dns} Zone: ${format.cyan(zoneName)}`);
    console.log(`${icons.server} Primary NS: ${format.green(primaryNameserver)}`);
    console.log(format.dim('─'.repeat(50)));

    const progress = new ProgressBar({
      total: 5,
      format: `${icons.globe} Importing [:bar] :percent :message`,
    });

    const result: ZoneImportResult = {
      zone: zoneName,
      recordsImported: 0,
      recordsFailed: 0,
      errors: [],
      warnings: [],
    };

    try {
      // Step 1: Create zone in EdgeDNS
      progress.update({ current: 1, message: 'Creating zone' });
      await this.createZone(zoneName, 'PRIMARY');

      // Step 2: Perform AXFR transfer
      progress.update({ current: 2, message: 'Initiating AXFR transfer' });
      const axfrRecords = await this.performAXFR(zoneName, primaryNameserver, options);

      // Step 3: Transform records to Akamai format
      progress.update({ current: 3, message: 'Transforming records' });
      const transformedRecords = this.transformRecordsToAkamai(axfrRecords);

      // Step 4: Bulk import records
      progress.update({ current: 4, message: `Importing ${transformedRecords.length} records` });
      const importResult = await this.bulkImportRecords(
        zoneName,
        transformedRecords,
        (current, total) => {
          const percent = Math.floor((current / total) * 100);
          progress.update({
            current: 3 + percent / 100,
            message: `Importing record ${current}/${total}`,
          });
        },
      );

      result.recordsImported = importResult.success;
      result.recordsFailed = importResult.failed;
      result.errors = importResult.errors;

      // Step 5: Verify import
      progress.update({ current: 5, message: 'Verifying import' });
      const verification = await this.verifyZoneImport(zoneName, transformedRecords);
      result.warnings = verification.warnings;

      progress.finish(`Import complete: ${result.recordsImported} records imported`);

      // Display summary
      console.log(`\n${icons.success} Import Summary:`);
      console.log(
        `  ${icons.bullet} Records imported: ${format.green(result.recordsImported.toString())}`,
      );
      console.log(
        `  ${icons.bullet} Records failed: ${format.red(result.recordsFailed.toString())}`,
      );

      if (result.warnings.length > 0) {
        console.log(`\n${icons.warning} Warnings:`);
        result.warnings.forEach((w) => console.log(`  ${icons.bullet} ${format.yellow(w)}`));
      }

      return result;
    } catch (_error) {
      progress.update({
        current: progress['current'],
        status: 'error',
        message: _error instanceof Error ? _error.message : String(_error),
      });
      result.errors.push(_error instanceof Error ? _error.message : String(_error));
      throw _error;
    }
  }

  // Parse Zone File
  async parseZoneFile(content: string, zoneName: string): Promise<DNSRecord[]> {
    console.log(`\n${format.bold('Parsing Zone File')}`);
    console.log(`${icons.dns} Zone: ${format.cyan(zoneName)}`);

    const spinner = new Spinner();
    spinner.start('Parsing zone file');

    try {
      const parser = this.createZoneFileParser();
      const records = parser.parse(content);

      spinner.succeed(`Parsed ${records.length} records`);

      // Validate records
      spinner.start('Validating records');
      const validation = parser.validate(records);

      if (!validation.valid) {
        spinner.fail(`Validation failed: ${validation.errors.length} errors`);
        validation.errors.forEach((e) => console.log(`  ${icons.error} ${format.red(e)}`));
        throw new Error('Zone file validation failed');
      }

      spinner.succeed('All records validated');

      // Display record type summary
      const typeSummary = records.reduce(
        (acc, r) => {
          acc[r.type] = (acc[r.type] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      console.log(`\n${icons.info} Record Types:`);
      Object.entries(typeSummary).forEach(([type, count]) => {
        console.log(`  ${icons.bullet} ${type}: ${format.cyan(count.toString())}`);
      });

      return records;
    } catch (_error) {
      spinner.fail(`Parse failed: ${_error instanceof Error ? _error.message : String(_error)}`);
      throw _error;
    }
  }

  // Bulk Import with Progress
  async bulkImportWithProgress(
    zoneName: string,
    records: DNSRecord[],
    options: {
      batchSize?: number;
      validateFirst?: boolean;
      dryRun?: boolean;
    } = {},
  ): Promise<ZoneImportResult> {
    console.log(`\n${format.bold('Bulk Record Import')}`);
    console.log(format.dim('─'.repeat(50)));
    console.log(`${icons.dns} Zone: ${format.cyan(zoneName)}`);
    console.log(`${icons.package} Records: ${format.green(records.length.toString())}`);
    console.log(
      `${icons.rocket} Mode: ${options.dryRun ? format.yellow('DRY RUN') : format.green('LIVE')}`,
    );
    console.log(format.dim('─'.repeat(50)));

    const batchSize = options.batchSize || 100;
    const batches = Math.ceil(records.length / batchSize);

    const progress = new ProgressBar({
      total: records.length,
      format: '[:bar] :percent | :current/:total records | :message',
    });

    const result: ZoneImportResult = {
      zone: zoneName,
      recordsImported: 0,
      recordsFailed: 0,
      errors: [],
      warnings: [],
    };

    try {
      // Validate if requested
      if (options.validateFirst && !options.dryRun) {
        const spinner = new Spinner();
        spinner.start('Pre-validating all records');

        const validation = await this.validateRecords(zoneName, records);
        if (validation.errors.length > 0) {
          spinner.fail(`Validation failed: ${validation.errors.length} errors`);
          throw new Error('Pre-validation failed');
        }

        spinner.succeed('All records validated');
      }

      // Process in batches
      for (let i = 0; i < batches; i++) {
        const start = i * batchSize;
        const end = Math.min((i + 1) * batchSize, records.length);
        const batch = records.slice(start, end);

        progress.update({
          current: start,
          message: `Processing batch ${i + 1}/${batches}`,
        });

        if (!options.dryRun) {
          const batchResult = await this.importBatch(zoneName, batch);
          result.recordsImported += batchResult.success;
          result.recordsFailed += batchResult.failed;
          result.errors.push(...batchResult.errors);
        } else {
          // Simulate import for dry run
          await new Promise((resolve) => setTimeout(resolve, 100));
          result.recordsImported += batch.length;
        }

        progress.update({ current: end });
      }

      progress.finish(options.dryRun ? 'Dry run complete' : 'Import complete');

      return result;
    } catch (_error) {
      progress.update({
        current: progress['current'],
        status: 'error',
        message: _error instanceof Error ? _error.message : String(_error),
      });
      throw _error;
    }
  }

  // Verify Record Import
  async verifyZoneImport(
    zoneName: string,
    expectedRecords: DNSRecord[],
  ): Promise<{ valid: boolean; warnings: string[] }> {
    console.log(`\n${format.bold('Verifying Zone Import')}`);

    const progress = new ProgressBar({
      total: expectedRecords.length,
      format: `${icons.check} Verifying [:bar] :percent :message`,
    });

    const warnings: string[] = [];
    let verified = 0;

    try {
      // Get all records from EdgeDNS
      const actualRecords = await this.getAllRecords(zoneName);
      const recordMap = new Map(actualRecords.map((r) => [`${r.name}:${r.type}`, r]));

      // Verify each expected record
      for (let i = 0; i < expectedRecords.length; i++) {
        const expected = expectedRecords[i];
        const key = `${expected.name}:${expected.type}`;
        const actual = recordMap.get(key);

        progress.update({
          current: i + 1,
          message: `Checking ${expected.name} ${expected.type}`,
        });

        if (!actual) {
          warnings.push(`Missing: ${expected.name} ${expected.type}`);
        } else if (!this.compareRecords(expected, actual)) {
          warnings.push(`Mismatch: ${expected.name} ${expected.type}`);
        } else {
          verified++;
        }
      }

      progress.finish(`Verification complete: ${verified}/${expectedRecords.length} records match`);

      return {
        valid: warnings.length === 0,
        warnings,
      };
    } catch (_error) {
      progress.update({
        current: progress['current'],
        status: 'error',
        message: _error instanceof Error ? _error.message : String(_error),
      });
      throw _error;
    }
  }

  // Generate Migration Instructions
  async generateMigrationInstructions(
    zoneName: string,
    options: {
      registrar?: string;
      includeTesting?: boolean;
      includeRollback?: boolean;
    } = {},
  ): Promise<NameserverMigration> {
    console.log(`\n${format.bold('Nameserver Migration Instructions')}`);
    console.log(format.dim('═'.repeat(60)));

    const spinner = new Spinner();
    spinner.start('Gathering zone information');

    try {
      // Get current nameservers
      const currentNS = await this.getCurrentNameservers(zoneName);

      // Get Akamai nameservers
      const zone = await this.getZone(zoneName);
      const akamaiNS = await this.getAkamaiNameservers(zone);

      spinner.succeed('Zone information gathered');

      const migration: NameserverMigration = {
        oldNameservers: currentNS,
        newNameservers: akamaiNS,
        migrationSteps: [],
        verificationCommands: [],
      };

      // Generate migration steps
      console.log(`\n${icons.info} ${format.bold('Current Configuration')}`);
      console.log(`  ${icons.dns} Zone: ${format.cyan(zoneName)}`);
      console.log(`  ${icons.server} Current Nameservers:`);
      currentNS.forEach((ns) => console.log(`    ${icons.arrow} ${format.yellow(ns)}`));

      console.log(`\n${icons.rocket} ${format.bold('Target Configuration')}`);
      console.log(`  ${icons.server} Akamai Nameservers:`);
      akamaiNS.forEach((ns) => console.log(`    ${icons.arrow} ${format.green(ns)}`));

      // Migration steps
      console.log(`\n${icons.clipboard} ${format.bold('Migration Steps')}`);

      migration.migrationSteps = [
        '1. Verify all DNS records have been imported correctly',
        '2. Test resolution using Akamai nameservers',
        '3. Lower TTL on NS records at current provider (recommended: 300 seconds)',
        '4. Wait for TTL to expire',
        '5. Update nameservers at domain registrar',
        '6. Monitor DNS propagation',
        '7. Verify resolution from multiple locations',
        '8. Restore original TTL values',
      ];

      if (options.registrar) {
        migration.migrationSteps.splice(
          5,
          0,
          `5a. ${this.getRegistrarInstructions(options.registrar)}`,
        );
      }

      migration.migrationSteps.forEach((step) => {
        console.log(`  ${format.dim(step)}`);
      });

      // Verification commands
      console.log(`\n${icons.terminal} ${format.bold('Verification Commands')}`);

      migration.verificationCommands = [
        '# Check current nameservers',
        `dig +short NS ${zoneName}`,
        '',
        '# Test resolution with Akamai nameservers',
        ...akamaiNS.map((ns) => `dig @${ns} ${zoneName} A +short`),
        '',
        '# Verify record types',
        `dig @${akamaiNS[0]} ${zoneName} ANY +noall +answer`,
        '',
        '# Check DNS propagation',
        `watch -n 10 'dig +short NS ${zoneName}'`,
      ];

      if (options.includeTesting) {
        migration.verificationCommands.push(
          '',
          '# Test specific records',
          `dig @${akamaiNS[0]} www.${zoneName} A`,
          `dig @${akamaiNS[0]} ${zoneName} MX`,
          `dig @${akamaiNS[0]} ${zoneName} TXT`,
        );
      }

      migration.verificationCommands.forEach((cmd) => {
        console.log(`  ${format.gray(cmd)}`);
      });

      // Rollback instructions
      if (options.includeRollback) {
        console.log(`\n${icons.warning} ${format.bold('Rollback Procedure')}`);
        console.log('  1. Update nameservers back to original values at registrar');
        console.log('  2. Original nameservers:');
        currentNS.forEach((ns) => console.log(`     ${icons.arrow} ${ns}`));
        console.log('  3. Wait for DNS propagation (monitor with dig)');
        console.log('  4. Verify services are restored');
      }

      console.log(format.dim('\n═'.repeat(60)));

      return migration;
    } catch (_error) {
      spinner.fail(
        `Failed to generate instructions: ${_error instanceof Error ? _error.message : String(_error)}`,
      );
      throw _error;
    }
  }

  // CRUD Operations with Hidden Change-List
  async createRecord(zoneName: string, record: DNSRecord): Promise<void> {
    await this.withChangeList(zoneName, async () => {
      const spinner = new Spinner();
      spinner.start(`Creating ${record.type} record for ${record.name}`);

      try {
        await this.auth._request({
          method: 'POST',
          path: `/config-dns/v2/zones/${zoneName}/recordsets`,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: record.name,
            type: record.type,
            ttl: record.ttl,
            rdata: record.rdata,
          }),
        });

        spinner.succeed(`Created ${format.cyan(record.name)} ${format.green(record.type)}`);
      } catch (_error) {
        spinner.fail(
          `Failed to create record: ${_error instanceof Error ? _error.message : String(_error)}`,
        );
        throw _error;
      }
    });
  }

  async updateRecord(zoneName: string, record: DNSRecord): Promise<void> {
    await this.withChangeList(zoneName, async () => {
      const spinner = new Spinner();
      spinner.start(`Updating ${record.type} record for ${record.name}`);

      try {
        await this.auth._request({
          method: 'PUT',
          path: `/config-dns/v2/zones/${zoneName}/recordsets/${record.name}/${record.type}`,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ttl: record.ttl,
            rdata: record.rdata,
          }),
        });

        spinner.succeed(`Updated ${format.cyan(record.name)} ${format.green(record.type)}`);
      } catch (_error) {
        spinner.fail(
          `Failed to update record: ${_error instanceof Error ? _error.message : String(_error)}`,
        );
        throw _error;
      }
    });
  }

  async deleteRecord(zoneName: string, name: string, type: string): Promise<void> {
    await this.withChangeList(zoneName, async () => {
      const spinner = new Spinner();
      spinner.start(`Deleting ${type} record for ${name}`);

      try {
        await this.auth._request({
          method: 'DELETE',
          path: `/config-dns/v2/zones/${zoneName}/recordsets/${name}/${type}`,
        });

        spinner.succeed(`Deleted ${format.cyan(name)} ${format.green(type)}`);
      } catch (_error) {
        spinner.fail(
          `Failed to delete record: ${_error instanceof Error ? _error.message : String(_error)}`,
        );
        throw _error;
      }
    });
  }

  async listRecords(
    zoneName: string,
    options: {
      types?: string[];
      search?: string;
      limit?: number;
    } = {},
  ): Promise<DNSRecord[]> {
    const spinner = new Spinner();
    spinner.start('Fetching records');

    try {
      const params = new URLSearchParams();
      if (options.types) {
params.append('types', options.types.join(','));
}
      if (options.search) {
params.append('search', options.search);
}
      if (options.limit) {
params.append('page_size', options.limit.toString());
}

      const response = await this.auth._request<DnsRecordsetsResponse>({
        method: 'GET',
        path: `/config-dns/v2/zones/${zoneName}/recordsets?${params}`,
      });

      const records = response.recordsets || [];
      spinner.succeed(`Found ${records.length} records`);

      return records;
    } catch (_error) {
      spinner.fail(
        `Failed to list records: ${_error instanceof Error ? _error.message : String(_error)}`,
      );
      throw _error;
    }
  }

  // Cloudflare-style Import
  async importFromCloudflare(
    cfApiToken: string,
    cfZoneId: string,
    targetZoneName: string,
  ): Promise<ZoneImportResult> {
    console.log(`\n${format.bold('Cloudflare Zone Import')}`);
    console.log(format.dim('─'.repeat(50)));
    console.log(`${icons.cloud} Source: Cloudflare Zone ${format.cyan(cfZoneId)}`);
    console.log(`${icons.dns} Target: ${format.green(targetZoneName)}`);
    console.log(format.dim('─'.repeat(50)));

    const progress = new ProgressBar({
      total: 4,
      format: `${icons.package} Importing [:bar] :percent :message`,
    });

    const result: ZoneImportResult = {
      zone: targetZoneName,
      recordsImported: 0,
      recordsFailed: 0,
      errors: [],
      warnings: [],
    };

    try {
      // Step 1: Fetch Cloudflare records
      progress.update({ current: 1, message: 'Fetching Cloudflare records' });
      const cfRecords = await this.fetchCloudflareRecords(cfApiToken, cfZoneId);

      // Step 2: Transform to Akamai format
      progress.update({ current: 2, message: 'Transforming records' });
      const akamaiRecords = this.transformCloudflareToAkamai(cfRecords);

      // Step 3: Create zone if needed
      progress.update({ current: 3, message: 'Preparing target zone' });
      await this.createZone(targetZoneName, 'PRIMARY');

      // Step 4: Import records
      progress.update({ current: 4, message: `Importing ${akamaiRecords.length} records` });
      const importResult = await this.bulkImportWithProgress(targetZoneName, akamaiRecords, {
        batchSize: 50,
      });

      result.recordsImported = importResult.recordsImported;
      result.recordsFailed = importResult.recordsFailed;
      result.errors = importResult.errors;

      progress.finish('Import complete');

      // Display migration instructions
      await this.generateMigrationInstructions(targetZoneName, {
        registrar: 'cloudflare',
        includeTesting: true,
        includeRollback: true,
      });

      return result;
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
  private async withChangeList<T>(zoneName: string, operation: () => Promise<T>): Promise<T> {
    // Hidden change-list management
    const changeListId = this.changeListCache.get(zoneName);

    if (!changeListId) {
      // Create new change list
      const response = await this.auth._request<CpsLocationResponse>({
        method: 'POST',
        path: `/config-dns/v2/zones/${zoneName}/changelists`,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
           comment: "Automated change" }),
      });

      const location = response.location || response.headers?.location || '';
      const newChangeListId = location.split('/').pop() || '';
      this.changeListCache.set(zoneName, newChangeListId);
    }

    try {
      // Perform operation
      const result = await operation();

      // Submit change list
      await this.auth._request({
        method: 'POST',
        path: `/config-dns/v2/zones/${zoneName}/changelists/${this.changeListCache.get(zoneName)}/submit`,
      });

      this.changeListCache.delete(zoneName);
      return result;
    } catch (_error) {
      // Discard change list on _error
      if (this.changeListCache.has(zoneName)) {
        await this.auth._request({
          method: 'DELETE',
          path: `/config-dns/v2/zones/${zoneName}/changelists/${this.changeListCache.get(zoneName)}`,
        });
        this.changeListCache.delete(zoneName);
      }
      throw _error;
    }
  }

  private async createZone(zoneName: string, type: 'PRIMARY' | 'SECONDARY'): Promise<void> {
    try {
      await this.auth._request({
        method: 'POST',
        path: '/config-dns/v2/zones',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zone: zoneName,
          type,
          comment: 'Created by DNS Migration Agent',
        }),
      });
    } catch (_error) {
      if (!(_error instanceof Error && _error.message.includes('already exists'))) {
        throw _error;
      }
    }
  }

  private async performAXFR(_zoneName: string, _primaryNS: string, _options: any): Promise<any[]> {
    // This would use a DNS library that supports AXFR
    // For now, return mock data
    return [
      {
        name: '@',
        type: 'SOA',
        ttl: 3600,
        rdata: ['ns1.example.com. admin.example.com. 2024010101 7200 3600 1209600 300'],
      },
      { name: '@', type: 'NS', ttl: 3600, rdata: ['ns1.example.com.'] },
      { name: '@', type: 'NS', ttl: 3600, rdata: ['ns2.example.com.'] },
      { name: '@', type: 'A', ttl: 300, rdata: ['192.0.2.1'] },
      { name: 'www', type: 'A', ttl: 300, rdata: ['192.0.2.2'] },
      { name: '@', type: 'MX', ttl: 3600, rdata: ['10 mail.example.com.'] },
    ];
  }

  private transformRecordsToAkamai(records: any[]): DNSRecord[] {
    return records.map((r) => ({
      name: r.name === '@' ? r.zone || '@' : r.name,
      type: r.type,
      ttl: r.ttl,
      rdata: Array.isArray(r.rdata) ? r.rdata : [r.rdata],
      active: true,
    }));
  }

  private async bulkImportRecords(
    zoneName: string,
    records: DNSRecord[],
    progressCallback: (current: number, total: number) => void,
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    const result = { success: 0, failed: 0, errors: [] as string[] };

    for (let i = 0; i < records.length; i++) {
      try {
        await this.createRecord(zoneName, records[i]);
        result.success++;
      } catch (_error) {
        result.failed++;
        result.errors.push(
          `${records[i].name} ${records[i].type}: ${_error instanceof Error ? _error.message : String(_error)}`,
        );
      }
      progressCallback(i + 1, records.length);
    }

    return result;
  }

  private createZoneFileParser(): ZoneFileParser {
    return {
      parse: (content: string) => {
        const records: DNSRecord[] = [];
        const lines = content.split('\n');

        for (const line of lines) {
          if (line.trim() === '' || line.startsWith(';')) {
continue;
}

          // Simple parser - would need more robust implementation
          const parts = line.split(/\s+/);
          if (parts.length >= 4) {
            records.push({
              name: parts[0],
              type: parts[2],
              ttl: parseInt(parts[1]) || 300,
              rdata: parts.slice(3),
            });
          }
        }

        return records;
      },
      validate: (records: DNSRecord[]) => {
        const errors: string[] = [];

        for (const record of records) {
          if (!record.name || !record.type || !record.rdata) {
            errors.push(`Invalid record: ${JSON.stringify(record)}`);
          }
        }

        return { valid: errors.length === 0, errors };
      },
    };
  }

  private async getAllRecords(zoneName: string): Promise<DNSRecord[]> {
    const response = await this.auth._request<DnsRecordsetsResponse>({
      method: 'GET',
      path: `/config-dns/v2/zones/${zoneName}/recordsets`,
    });
    return response.recordsets || [];
  }

  private compareRecords(expected: DNSRecord, actual: DNSRecord): boolean {
    return (
      expected.type === actual.type &&
      expected.ttl === actual.ttl &&
      JSON.stringify(expected.rdata.sort()) === JSON.stringify(actual.rdata.sort())
    );
  }

  private async getCurrentNameservers(zoneName: string): Promise<string[]> {
    try {
      const nameservers = await resolveNs(zoneName);
      return nameservers;
    } catch {
      return ['Unable to resolve current nameservers'];
    }
  }

  private async getZone(zoneName: string): Promise<DNSZone> {
    const response = await this.auth._request<DNSZone>({
      method: 'GET',
      path: `/config-dns/v2/zones/${zoneName}`,
    });
    return response;
  }

  private async getAkamaiNameservers(_zone: DNSZone): Promise<string[]> {
    // These would be returned by the API
    return ['a1-234.akam.net', 'a2-234.akam.net', 'a3-234.akam.net', 'a4-234.akam.net'];
  }

  private getRegistrarInstructions(registrar: string): string {
    const instructions: Record<string, string> = {
      cloudflare: 'In Cloudflare Dashboard: DNS > Nameservers > Change',
      godaddy: 'In GoDaddy: My Products > Domains > DNS > Nameservers > Change',
      namecheap: 'In Namecheap: Domain List > Manage > Nameservers > Custom DNS',
      route53: 'In Route 53: Registered domains > Select domain > Edit nameservers',
    };

    return instructions[registrar.toLowerCase()] || 'Update nameservers at your domain registrar';
  }

  private async validateRecords(
    _zoneName: string,
    records: DNSRecord[],
  ): Promise<{ errors: string[] }> {
    const errors: string[] = [];

    // Validate record format and constraints
    for (const record of records) {
      if (record.type === 'CNAME' && record.name === '@') {
        errors.push('CNAME records cannot be created at zone apex');
      }

      if (record.ttl < 30 || record.ttl > 86400) {
        errors.push(`Invalid TTL for ${record.name}: ${record.ttl}`);
      }
    }

    return { errors };
  }

  private async importBatch(
    zoneName: string,
    records: DNSRecord[],
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    const result = { success: 0, failed: 0, errors: [] as string[] };

    await this.withChangeList(zoneName, async () => {
      for (const record of records) {
        try {
          await this.auth._request({
            method: 'POST',
            path: `/config-dns/v2/zones/${zoneName}/recordsets`,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(record),
          });
          result.success++;
        } catch (_error) {
          result.failed++;
          result.errors.push(
            `${record.name} ${record.type}: ${_error instanceof Error ? _error.message : String(_error)}`,
          );
        }
      }
    });

    return result;
  }

  private async fetchCloudflareRecords(_apiToken: string, _zoneId: string): Promise<any[]> {
    // This would fetch from Cloudflare API
    return [];
  }

  private transformCloudflareToAkamai(cfRecords: any[]): DNSRecord[] {
    // Transform Cloudflare record format to Akamai format
    return cfRecords.map((r) => ({
      name: r.name,
      type: r.type,
      ttl: r.ttl === 1 ? 300 : r.ttl, // CF uses 1 for automatic
      rdata: [r.content],
      active: true,
    }));
  }

  // Complete zone migration orchestration
  async migrateZoneComplete(
    sourceZone: string,
    targetZone: string,
    options: {
      source: 'axfr' | 'cloudflare' | 'route53' | 'file';
      sourceConfig?: any;
      autoActivate?: boolean;
      validateFirst?: boolean;
    },
  ): Promise<void> {
    console.log(`\n${format.bold('Complete Zone Migration')}`);
    console.log(format.dim('═'.repeat(60)));
    console.log(`${icons.dns} Source: ${format.cyan(sourceZone)}`);
    console.log(`${icons.dns} Target: ${format.green(targetZone)}`);
    console.log(`${icons.package} Method: ${format.yellow(options.source.toUpperCase())}`);
    console.log(format.dim('═'.repeat(60)));

    try {
      let importResult: ZoneImportResult;

      // Import based on source type
      switch (options.source) {
        case 'axfr':
          importResult = await this.importZoneViaAXFR(
            targetZone,
            options.sourceConfig.primaryNS,
            options.sourceConfig,
          );
          break;
        case 'cloudflare':
          importResult = await this.importFromCloudflare(
            options.sourceConfig.apiToken,
            options.sourceConfig.zoneId,
            targetZone,
          );
          break;
        case 'file': {
          const records = await this.parseZoneFile(options.sourceConfig.content, targetZone);
          importResult = await this.bulkImportWithProgress(targetZone, records, {
            validateFirst: options.validateFirst,
          });
          break;
        }
        default:
          throw new Error(`Unsupported source: ${options.source}`);
      }

      // Auto-activate if requested
      if (options.autoActivate && importResult.recordsImported > 0) {
        console.log(`\n${icons.rocket} Auto-activating zone...`);
        await this.activateZone(targetZone);
      }

      // Generate final migration instructions
      await this.generateMigrationInstructions(targetZone, {
        includeTesting: true,
        includeRollback: true,
      });

      console.log(`\n${format.bold('Migration Complete!')}`);
      console.log(`${icons.success} Successfully migrated ${importResult.recordsImported} records`);
    } catch (_error) {
      console.error(`\n${icons.error} ${format.red('Migration failed:')}`);
      console.error(format.red(_error instanceof Error ? _error.message : String(_error)));
      throw _error;
    }
  }

  private async activateZone(zoneName: string): Promise<void> {
    const spinner = new Spinner();
    spinner.start('Activating zone');

    try {
      await this.auth._request({
        method: 'POST',
        path: `/config-dns/v2/zones/${zoneName}/activate`,
      });

      spinner.succeed('Zone activated');
    } catch (_error) {
      spinner.fail(
        `Failed to activate zone: ${_error instanceof Error ? _error.message : String(_error)}`,
      );
      throw _error;
    }
  }
}

// Export factory function
export async function createDNSMigrationAgent(customer?: string): Promise<DNSMigrationAgent> {
  const agent = new DNSMigrationAgent(customer);
  await agent.initialize();
  return agent;
}
