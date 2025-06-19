/**
 * MCP tool wrappers for specialized agents
 * Provides MCP-compatible interfaces to agent functionality
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

import { type AkamaiClient } from '../akamai-client';
import { type AkamaiOrchestrator, createOrchestrator } from '../orchestration/index';
import { type MCPToolResponse } from '../types';

// Agent cache
const agentCache = new Map<string, any>();

/**
 * Get or create CDN Provisioning Agent
 */
async function getCDNAgent(customer: string): Promise<CDNProvisioningAgent> {
  const key = `cdn-${customer}`;
  if (!agentCache.has(key)) {
    const agent = await createCDNProvisioningAgent(customer);
    agentCache.set(key, agent);
  }
  return agentCache.get(key);
}

/**
 * Get or create CPS Certificate Agent
 */
async function getCPSAgent(customer: string): Promise<CPSCertificateAgent> {
  const key = `cps-${customer}`;
  if (!agentCache.has(key)) {
    const dnsAgent = await getDNSAgent(customer);
    const agent = await createCPSCertificateAgent(customer, dnsAgent);
    agentCache.set(key, agent);
  }
  return agentCache.get(key);
}

/**
 * Get or create DNS Migration Agent
 */
async function getDNSAgent(customer: string): Promise<DNSMigrationAgent> {
  const key = `dns-${customer}`;
  if (!agentCache.has(key)) {
    const agent = await createDNSMigrationAgent(customer);
    agentCache.set(key, agent);
  }
  return agentCache.get(key);
}

/**
 * Get or create Orchestrator
 */
async function getOrchestrator(customer: string): Promise<AkamaiOrchestrator> {
  const key = `orchestrator-${customer}`;
  if (!agentCache.has(key)) {
    const orchestrator = await createOrchestrator({ customer });
    agentCache.set(key, orchestrator);
  }
  return agentCache.get(key);
}

// CDN Provisioning Tools

export async function provisionCompleteProperty(
  client: AkamaiClient,
  args: {
    propertyName: string;
    hostnames: string[];
    originHostname: string;
    productId?: string;
    activateStaging?: boolean;
    activateProduction?: boolean;
    notifyEmails?: string[];
  },
): Promise<MCPToolResponse> {
  try {
    const agent = await getCDNAgent(client.getCustomer());

    await agent.provisionCompleteProperty(args.propertyName, args.hostnames, args.originHostname, {
      productId: args.productId,
      activateStaging: args.activateStaging,
      activateProduction: args.activateProduction,
      notifyEmails: args.notifyEmails,
    });

    return {
      content: [
        {
          type: 'text',
          text: `Successfully provisioned property ${args.propertyName} with ${args.hostnames.length} hostnames`,
        },
      ],
    };
  } catch (error) {
    console.error('Error provisioning property:', error);
    throw error;
  }
}

export async function clonePropertyVersion(
  client: AkamaiClient,
  args: {
    sourcePropertyId: string;
    sourceVersion: number;
    targetPropertyId: string;
    note?: string;
  },
): Promise<MCPToolResponse> {
  try {
    const agent = await getCDNAgent(client.getCustomer());

    const result = await agent.clonePropertyVersion(
      args.sourcePropertyId,
      args.sourceVersion,
      args.targetPropertyId,
      args.note,
    );

    return {
      content: [
        {
          type: 'text',
          text: `Successfully cloned version ${args.sourceVersion} from ${args.sourcePropertyId} to ${args.targetPropertyId} (new version: ${result.propertyVersion})`,
        },
      ],
    };
  } catch (error) {
    console.error('Error cloning property version:', error);
    throw error;
  }
}

export async function applyPropertyTemplate(
  client: AkamaiClient,
  args: {
    propertyId: string;
    version: number;
    template: 'origin' | 'caching' | 'performance' | 'security';
    templateOptions?: any;
  },
): Promise<MCPToolResponse> {
  try {
    const agent = await getCDNAgent(client.getCustomer());

    await agent.applyRuleTemplate(
      args.propertyId,
      args.version,
      args.template,
      args.templateOptions,
    );

    return {
      content: [
        {
          type: 'text',
          text: `Successfully applied ${args.template} template to property ${args.propertyId} version ${args.version}`,
        },
      ],
    };
  } catch (error) {
    console.error('Error applying template:', error);
    throw error;
  }
}

// Certificate Management Tools

export async function provisionAndDeployCertificate(
  client: AkamaiClient,
  args: {
    domains: string[];
    type?: 'default-dv' | 'third-party' | 'ev' | 'ov';
    network?: 'staging' | 'production';
    propertyIds?: string[];
    autoRenewal?: boolean;
  },
): Promise<MCPToolResponse> {
  try {
    const agent = await getCPSAgent(client.getCustomer());

    await agent.provisionAndDeployCertificate(args.domains, {
      type: args.type,
      network: args.network,
      propertyIds: args.propertyIds,
      autoRenewal: args.autoRenewal,
    });

    return {
      content: [
        {
          type: 'text',
          text: `Successfully provisioned and deployed certificate for ${args.domains.length} domains`,
        },
      ],
    };
  } catch (error) {
    console.error('Error provisioning certificate:', error);
    throw error;
  }
}

export async function automatedDNSValidation(
  client: AkamaiClient,
  args: {
    enrollmentId: number;
    autoCreateRecords?: boolean;
  },
): Promise<MCPToolResponse> {
  try {
    const agent = await getCPSAgent(client.getCustomer());

    await agent.automatedDNSValidation(args.enrollmentId, args.autoCreateRecords);

    return {
      content: [
        {
          type: 'text',
          text: `DNS validation completed for enrollment ${args.enrollmentId}`,
        },
      ],
    };
  } catch (error) {
    console.error('Error with DNS validation:', error);
    throw error;
  }
}

export async function processCertificateRenewal(
  client: AkamaiClient,
  args: {
    enrollmentId: number;
  },
): Promise<MCPToolResponse> {
  try {
    const agent = await getCPSAgent(client.getCustomer());

    await agent.processCertificateRenewal(args.enrollmentId);

    return {
      content: [
        {
          type: 'text',
          text: `Successfully renewed certificate ${args.enrollmentId}`,
        },
      ],
    };
  } catch (error) {
    console.error('Error renewing certificate:', error);
    throw error;
  }
}

// DNS Migration Tools

export async function importZoneFromCloudflare(
  client: AkamaiClient,
  args: {
    cfApiToken: string;
    cfZoneId: string;
    targetZoneName: string;
  },
): Promise<MCPToolResponse> {
  try {
    const agent = await getDNSAgent(client.getCustomer());

    const result = await agent.importFromCloudflare(
      args.cfApiToken,
      args.cfZoneId,
      args.targetZoneName,
    );

    return {
      content: [
        {
          type: 'text',
          text: `Successfully imported ${result.recordsImported} records from Cloudflare zone to ${args.targetZoneName}`,
        },
      ],
    };
  } catch (error) {
    console.error('Error importing from Cloudflare:', error);
    throw error;
  }
}

export async function bulkDNSMigration(
  client: AkamaiClient,
  args: {
    zones: Array<{ source: string; target?: string }>;
    sourceType: 'cloudflare' | 'route53' | 'axfr';
    sourceConfig: any;
    parallel?: number;
  },
): Promise<MCPToolResponse> {
  try {
    const orchestrator = await getOrchestrator(client.getCustomer());

    await orchestrator.bulkDNSMigration({
      zones: args.zones,
      sourceType: args.sourceType,
      sourceConfig: args.sourceConfig,
      parallel: args.parallel,
    });

    return {
      content: [
        {
          type: 'text',
          text: `Bulk DNS migration completed for ${args.zones.length} zones`,
        },
      ],
    };
  } catch (error) {
    console.error('Error with bulk DNS migration:', error);
    throw error;
  }
}

// Orchestration Tools

export async function migrateWebsite(
  client: AkamaiClient,
  args: {
    domain: string;
    originHostname: string;
    sourceProvider: 'cloudflare' | 'aws' | 'generic';
    sourceConfig?: any;
    productId?: string;
    activateStaging?: boolean;
    activateProduction?: boolean;
    notifyEmails?: string[];
  },
): Promise<MCPToolResponse> {
  try {
    const orchestrator = await getOrchestrator(client.getCustomer());

    await orchestrator.migrateWebsite(args);

    return {
      content: [
        {
          type: 'text',
          text: `Successfully migrated ${args.domain} from ${args.sourceProvider} to Akamai`,
        },
      ],
    };
  } catch (error) {
    console.error('Error migrating website:', error);
    throw error;
  }
}

export async function provisionSecureWebsite(
  client: AkamaiClient,
  args: {
    domains: string[];
    originHostname: string;
    certificateType?: 'default-dv' | 'ev' | 'ov';
    enableWAF?: boolean;
    enableDDoS?: boolean;
    cacheStrategy?: 'aggressive' | 'moderate' | 'minimal';
    notifyEmails?: string[];
  },
): Promise<MCPToolResponse> {
  try {
    const orchestrator = await getOrchestrator(client.getCustomer());

    await orchestrator.provisionSecureWebsite(args);

    return {
      content: [
        {
          type: 'text',
          text: `Successfully provisioned secure website for ${args.domains.join(', ')}`,
        },
      ],
    };
  } catch (error) {
    console.error('Error provisioning secure website:', error);
    throw error;
  }
}
