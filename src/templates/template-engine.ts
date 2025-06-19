/**
 * Template Engine for Akamai Property Provisioning
 *
 * This engine processes property templates with contextual inputs
 * to generate complete PAPI rule trees and configurations.
 */

import { z } from 'zod';

import {
  type PropertyTemplate,
  getTemplateById,
  validateTemplateInputs,
  applyTemplateInputs,
  propertyTemplates,
} from './property-templates';

export interface TemplateContext {
  template: PropertyTemplate;
  inputs: Record<string, any>;
  customer?: string;
  contractId: string;
  groupId: string;
  productId?: string;
  cpCode?: string;
}

export interface ProvisioningPlan {
  propertyName: string;
  propertyConfig: {
    contractId: string;
    groupId: string;
    productId: string;
    ruleFormat?: string;
  };
  hostnames: string[];
  edgeHostname: {
    hostname: string;
    domainPrefix: string;
    domainSuffix: string;
    ipVersionBehavior: string;
    certificateType: string;
  };
  ruleTree: any;
  certificateEnrollment?: {
    commonName: string;
    sans: string[];
    validationType: 'DV' | 'OV' | 'EV';
    networkConfiguration: {
      geography: 'CORE' | 'CHINA' | 'RUSSIA';
      secureNetwork: 'ENHANCED_TLS' | 'STANDARD_TLS';
      sniOnly: boolean;
      quicEnabled?: boolean;
    };
  };
  dnsRecords: Array<{
    type: string;
    name: string;
    value: string;
    ttl: number;
  }>;
  activationSteps: Array<{
    network: 'STAGING' | 'PRODUCTION';
    notifyEmails: string[];
    note: string;
  }>;
}

/**
 * Interactive template selection with user prompts
 */
export async function selectTemplate(): Promise<PropertyTemplate> {
  console.log('\nAvailable Property Templates:');
  console.log('=============================\n');

  propertyTemplates.forEach((template, index) => {
    console.log(`${index + 1}. ${template.name}`);
    console.log(`   ${template.description}`);
    console.log(`   Category: ${template.category}\n`);
  });

  // In a real implementation, this would prompt the user
  // For now, we'll return a function that can be called with the selection
  const selectedIndex = 0; // This would come from user input
  if (!propertyTemplates[selectedIndex]) {
    throw new Error('No property templates available');
  }
  return propertyTemplates[selectedIndex];
}

/**
 * Collect inputs for a template with validation
 */
export async function collectTemplateInputs(
  template: PropertyTemplate,
  providedInputs?: Record<string, any>,
): Promise<Record<string, any>> {
  const inputs: Record<string, any> = { ...providedInputs };

  // Process required inputs
  for (const input of template.requiredInputs) {
    if (!inputs[input.key]) {
      // In a real implementation, this would prompt the user
      console.log(`\n${input.label} (${input.description})`);
      if (input.placeholder) {
        console.log(`Example: ${input.placeholder}`);
      }

      // For now, we'll use a placeholder
      inputs[input.key] = input.placeholder || `example-${input.key}`;
    }
  }

  // Process optional inputs with defaults
  for (const input of template.optionalInputs) {
    if (!inputs[input.key] && input.defaultValue !== undefined) {
      inputs[input.key] = input.defaultValue;
    }
  }

  // Validate all inputs
  const validation = validateTemplateInputs(template, inputs);
  if (!validation.valid) {
    throw new Error(`Invalid inputs:\n${validation.errors.join('\n')}`);
  }

  return inputs;
}

/**
 * Generate a complete provisioning plan from template and inputs
 */
export function generateProvisioningPlan(context: TemplateContext): ProvisioningPlan {
  const { template, inputs, contractId, groupId, productId, cpCode } = context;

  // Generate property name
  const propertyName = inputs.hostname.replace(/\./g, '-');

  // Generate edge hostname
  const edgeHostnamePrefix = inputs.hostname.split('.')[0];
  const edgeHostname = {
    hostname: `${edgeHostnamePrefix}${template.edgeHostnameConfig.domainPrefix || ''}${template.edgeHostnameConfig.domainSuffix}`,
    domainPrefix: edgeHostnamePrefix,
    domainSuffix: template.edgeHostnameConfig.domainSuffix,
    ipVersionBehavior: template.edgeHostnameConfig.ipVersionBehavior,
    certificateType: template.edgeHostnameConfig.certificateType,
  };

  // Collect all hostnames
  const hostnames = [inputs.hostname];
  if (inputs.additionalHostnames) {
    hostnames.push(...inputs.additionalHostnames);
  }

  // Apply inputs to rule tree
  const ruleTreeWithInputs = applyTemplateInputs(template, {
    ...inputs,
    cpCode: cpCode || 'GENERATED_CP_CODE',
    edgeHostname: edgeHostname.hostname,
  });

  // Generate DNS records
  const dnsRecords =
    template.recommendedDNSRecords?.map((record) => ({
      type: record.type,
      name: record.name.replace('{{hostname}}', inputs.hostname),
      value: record.value.replace('{{edgeHostname}}', edgeHostname.hostname),
      ttl: record.ttl,
    })) || [];

  // Prepare certificate enrollment if HTTPS is required
  let certificateEnrollment;
  if (template.certificateRequirements) {
    certificateEnrollment = {
      commonName: inputs.hostname,
      sans: hostnames.filter((h) => h !== inputs.hostname),
      validationType: template.certificateRequirements.type as 'DV' | 'OV' | 'EV',
      networkConfiguration: {
        geography: 'CORE' as const,
        secureNetwork: template.certificateRequirements.networkDeployment,
        sniOnly: template.certificateRequirements.sniOnly,
        quicEnabled: template.certificateRequirements.quicEnabled,
      },
    };
  }

  // Define activation steps
  const activationSteps = [
    {
      network: 'STAGING' as const,
      notifyEmails: [inputs.notificationEmail || 'devops@example.com'],
      note: `Initial deployment of ${propertyName} to staging`,
    },
    {
      network: 'PRODUCTION' as const,
      notifyEmails: [inputs.notificationEmail || 'devops@example.com'],
      note: `Production deployment of ${propertyName} after staging validation`,
    },
  ];

  return {
    propertyName,
    propertyConfig: {
      contractId,
      groupId,
      productId: productId || 'prd_Web_Accel',
      ruleFormat: 'v2023-01-05',
    },
    hostnames,
    edgeHostname,
    ruleTree: ruleTreeWithInputs,
    certificateEnrollment,
    dnsRecords,
    activationSteps,
  };
}

/**
 * Validate a provisioning plan before execution
 */
export function validateProvisioningPlan(plan: ProvisioningPlan): {
  valid: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];

  // Check for common issues
  if (plan.hostnames.length > 100) {
    warnings.push('Large number of hostnames may increase activation time');
  }

  if (plan.certificateEnrollment && plan.certificateEnrollment.sans.length > 100) {
    warnings.push('Large number of SANs may require special approval');
  }

  if (plan.ruleTree.behaviors && !plan.ruleTree.behaviors.find((b: any) => b.name === 'cpCode')) {
    warnings.push('No CP Code specified - one will be generated');
  }

  // Check for production deployment without staging
  if (
    plan.activationSteps.length === 1 &&
    plan.activationSteps[0] &&
    plan.activationSteps[0].network === 'PRODUCTION'
  ) {
    warnings.push('Deploying directly to production without staging test');
  }

  return {
    valid: true,
    warnings,
  };
}

/**
 * Generate a human-readable summary of the provisioning plan
 */
export function generatePlanSummary(plan: ProvisioningPlan): string {
  const summary = [
    `
# Akamai CDN Provisioning Plan
================================

## Property Configuration
- **Name**: ${plan.propertyName}
- **Contract**: ${plan.propertyConfig.contractId}
- **Group**: ${plan.propertyConfig.groupId}
- **Product**: ${plan.propertyConfig.productId}

## Hostnames
- **Primary**: ${plan.hostnames[0]}
${plan.hostnames
  .slice(1)
  .map((h) => `- ${h}`)
  .join('\n')}

## Edge Hostname
- **Hostname**: ${plan.edgeHostname.hostname}
- **IP Version**: ${plan.edgeHostname.ipVersionBehavior}
- **Certificate Type**: ${plan.edgeHostname.certificateType}
`,
  ];

  if (plan.certificateEnrollment) {
    summary.push(`
## SSL Certificate
- **Common Name**: ${plan.certificateEnrollment.commonName}
- **Type**: ${plan.certificateEnrollment.validationType}
- **Network**: ${plan.certificateEnrollment.networkConfiguration.secureNetwork}
- **SNI Only**: ${plan.certificateEnrollment.networkConfiguration.sniOnly ? 'Yes' : 'No'}
${plan.certificateEnrollment.sans.length > 0 ? `- **SANs**: ${plan.certificateEnrollment.sans.join(', ')}` : ''}
`);
  }

  if (plan.dnsRecords.length > 0) {
    summary.push(`
## Required DNS Records
${plan.dnsRecords.map((r) => `- **${r.type}** ${r.name} → ${r.value} (TTL: ${r.ttl}s)`).join('\n')}
`);
  }

  summary.push(`
## Activation Plan
${plan.activationSteps.map((step, i) => `${i + 1}. Deploy to **${step.network}**\n   - Notify: ${step.notifyEmails.join(', ')}\n   - Note: ${step.note}`).join('\n')}
`);

  return summary.join('\n');
}

/**
 * Example usage function showing the complete flow
 */
export async function provisionPropertyFromTemplate(
  templateId: string,
  inputs: Record<string, any>,
  context: Partial<TemplateContext>,
): Promise<ProvisioningPlan> {
  // Get template
  const template = getTemplateById(templateId);
  if (!template) {
    throw new Error(`Template '${templateId}' not found`);
  }

  // Collect and validate inputs
  const validatedInputs = await collectTemplateInputs(template, inputs);

  // Generate provisioning plan
  const fullContext: TemplateContext = {
    template,
    inputs: validatedInputs,
    customer: context.customer || 'default',
    contractId: context.contractId || 'ctr_C-1234567',
    groupId: context.groupId || 'grp_12345',
    productId: context.productId,
    cpCode: context.cpCode,
  };

  const plan = generateProvisioningPlan(fullContext);

  // Validate plan
  const validation = validateProvisioningPlan(plan);
  if (validation.warnings.length > 0) {
    console.log('\nWarnings:');
    validation.warnings.forEach((w) => console.log(`- ${w}`));
  }

  return plan;
}

/**
 * Schema for template input validation
 */
export const TemplateInputSchema = z.object({
  templateId: z.string(),
  inputs: z.record(z.any()),
  customer: z.string().optional(),
  contractId: z.string(),
  groupId: z.string(),
  productId: z.string().optional(),
  cpCode: z.string().optional(),
});

/**
 * Export template metadata for UI/CLI
 */
export function getTemplateMetadata() {
  return propertyTemplates.map((template) => ({
    id: template.id,
    name: template.name,
    description: template.description,
    category: template.category,
    requiredInputs: template.requiredInputs.map((input) => ({
      key: input.key,
      label: input.label,
      type: input.type,
      required: true,
    })),
    optionalInputs: template.optionalInputs.map((input) => ({
      key: input.key,
      label: input.label,
      type: input.type,
      required: false,
      defaultValue: input.defaultValue,
    })),
  }));
}
