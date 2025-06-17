/**
 * Property Manager Enhanced Error Handling Tools
 * Critical for production deployments and preventing activation failures
 */

import { AkamaiClient } from '../akamai-client';
import { MCPToolResponse } from '../types';
import { handleApiError } from '../utils/error-handling';

export interface PropertyWarning {
  type: string;
  messageId: string;
  title: string;
  detail: string;
  errorLocation?: string;
  behaviorName?: string;
  instanceName?: string;
}

export interface PropertyError {
  type: string;
  messageId: string;
  title: string;
  detail: string;
  errorLocation?: string;
  behaviorName?: string;
  instanceName?: string;
}

export interface ValidationResult {
  errors: PropertyError[];
  warnings: PropertyWarning[];
  canActivate: boolean;
  ruleFormat: string;
  validationDate: string;
}

/**
 * Get detailed validation errors and warnings for a property version
 */
export async function getValidationErrors(
  client: AkamaiClient,
  args: {
    propertyId: string;
    version: number;
    contractId: string;
    groupId: string;
    validateRules?: boolean;
    validateHostnames?: boolean;
    customer?: string;
  }
): Promise<MCPToolResponse> {
  try {
    const params = new URLSearchParams({
      contractId: args.contractId,
      groupId: args.groupId
    });

    // Add validation options
    if (args.validateRules !== false) {
      params.append('validateRules', 'true');
    }
    if (args.validateHostnames) {
      params.append('validateHostnames', 'true');
    }

    const response = await client.request({
      path: `/papi/v1/properties/${args.propertyId}/versions/${args.version}?${params.toString()}`,
      method: 'GET'
    });

    const version = response.versions?.items?.[0];
    
    if (!version) {
      return {
        content: [{
          type: 'text',
          text: `Property version ${args.version} not found.`
        }]
      };
    }

    let responseText = `# Property Validation Report\n\n`;
    responseText += `**Property ID:** ${args.propertyId}\n`;
    responseText += `**Version:** ${args.version}\n`;
    responseText += `**Contract:** ${args.contractId}\n`;
    responseText += `**Group:** ${args.groupId}\n`;
    responseText += `**Rule Format:** ${version.ruleFormat}\n`;
    responseText += `**Validated:** ${new Date().toISOString()}\n\n`;

    const errors = version.errors || [];
    const warnings = version.warnings || [];
    const canActivate = errors.length === 0;

    responseText += `## Validation Summary\n\n`;
    responseText += `- **Errors:** ${errors.length} ${errors.length === 0 ? '✅' : '❌'}\n`;
    responseText += `- **Warnings:** ${warnings.length} ${warnings.length === 0 ? '✅' : '⚠️'}\n`;
    responseText += `- **Can Activate:** ${canActivate ? 'Yes ✅' : 'No ❌'}\n\n`;

    // Critical errors that prevent activation
    if (errors.length > 0) {
      responseText += `## ❌ Critical Errors (Must Fix Before Activation)\n\n`;
      errors.forEach((error: PropertyError, index: number) => {
        responseText += `### Error ${index + 1}: ${error.title}\n`;
        responseText += `- **Type:** ${error.type}\n`;
        responseText += `- **Message ID:** ${error.messageId}\n`;
        responseText += `- **Detail:** ${error.detail}\n`;
        if (error.errorLocation) {
          responseText += `- **Location:** ${error.errorLocation}\n`;
        }
        if (error.behaviorName) {
          responseText += `- **Behavior:** ${error.behaviorName}\n`;
        }
        if (error.instanceName) {
          responseText += `- **Instance:** ${error.instanceName}\n`;
        }
        responseText += `\n`;
      });
    }

    // Warnings that should be acknowledged
    if (warnings.length > 0) {
      responseText += `## ⚠️ Warnings (Recommend Review Before Activation)\n\n`;
      warnings.forEach((warning: PropertyWarning, index: number) => {
        responseText += `### Warning ${index + 1}: ${warning.title}\n`;
        responseText += `- **Type:** ${warning.type}\n`;
        responseText += `- **Message ID:** ${warning.messageId}\n`;
        responseText += `- **Detail:** ${warning.detail}\n`;
        if (warning.errorLocation) {
          responseText += `- **Location:** ${warning.errorLocation}\n`;
        }
        if (warning.behaviorName) {
          responseText += `- **Behavior:** ${warning.behaviorName}\n`;
        }
        if (warning.instanceName) {
          responseText += `- **Instance:** ${warning.instanceName}\n`;
        }
        responseText += `\n`;
      });
    }

    // Resolution guidance
    responseText += `## Resolution Guidance\n\n`;
    
    if (errors.length > 0) {
      responseText += `### Critical Actions Required\n\n`;
      responseText += `1. **Fix all errors** listed above before attempting activation\n`;
      responseText += `2. **Update property rules** to resolve configuration issues\n`;
      responseText += `3. **Re-validate** the property version after making changes\n`;
      responseText += `4. **Test in staging** before production deployment\n\n`;
    }

    if (warnings.length > 0) {
      responseText += `### Warning Management\n\n`;
      responseText += `1. **Review each warning** to understand impact\n`;
      responseText += `2. **Acknowledge warnings** if acceptable for deployment\n`;
      responseText += `3. **Document decisions** in activation notes\n`;
      responseText += `4. **Monitor performance** after activation\n\n`;
      
      responseText += `To acknowledge warnings during activation:\n`;
      responseText += `\`\`\`\n`;
      responseText += `activateProperty --propertyId ${args.propertyId} --version ${args.version} --acknowledgeAllWarnings true\n`;
      responseText += `\`\`\`\n\n`;
    }

    if (canActivate && warnings.length === 0) {
      responseText += `### ✅ Ready for Activation\n\n`;
      responseText += `Property version passes all validation checks and is ready for deployment.\n\n`;
      responseText += `Recommended activation command:\n`;
      responseText += `\`\`\`\n`;
      responseText += `activateProperty --propertyId ${args.propertyId} --version ${args.version} --network STAGING\n`;
      responseText += `\`\`\`\n`;
    }

    return {
      content: [{ type: 'text', text: responseText }]
    };
  } catch (error) {
    return handleApiError(error, 'getting validation errors');
  }
}

/**
 * Acknowledge warnings for a property version
 */
export async function acknowledgeWarnings(
  client: AkamaiClient,
  args: {
    propertyId: string;
    version: number;
    warnings: string[];
    justification?: string;
    contractId: string;
    groupId: string;
    customer?: string;
  }
): Promise<MCPToolResponse> {
  try {
    const params = new URLSearchParams({
      contractId: args.contractId,
      groupId: args.groupId
    });

    const requestBody = {
      acknowledgedWarnings: args.warnings.map(messageId => ({
        messageId,
        justification: args.justification || 'Warning acknowledged by user'
      }))
    };

    await client.request({
      path: `/papi/v1/properties/${args.propertyId}/versions/${args.version}/acknowledge-warnings?${params.toString()}`,
      method: 'POST',
      body: requestBody
    });

    let responseText = `# Warnings Acknowledged\n\n`;
    responseText += `**Property ID:** ${args.propertyId}\n`;
    responseText += `**Version:** ${args.version}\n`;
    responseText += `**Warnings Acknowledged:** ${args.warnings.length}\n`;
    responseText += `**Acknowledged:** ${new Date().toISOString()}\n`;
    
    if (args.justification) {
      responseText += `**Justification:** ${args.justification}\n`;
    }
    
    responseText += `\n`;

    responseText += `## Acknowledged Warnings\n\n`;
    args.warnings.forEach((messageId, index) => {
      responseText += `${index + 1}. **${messageId}**\n`;
    });
    responseText += `\n`;

    responseText += `## Next Steps\n\n`;
    responseText += `1. **Proceed with activation** - Warnings have been acknowledged\n`;
    responseText += `2. **Monitor deployment** - Watch for any issues after activation\n`;
    responseText += `3. **Document impact** - Note any performance changes\n\n`;

    responseText += `Property is now ready for activation with acknowledged warnings.\n`;

    return {
      content: [{ type: 'text', text: responseText }]
    };
  } catch (error) {
    return handleApiError(error, 'acknowledging warnings');
  }
}

/**
 * Override activation errors (requires special permissions)
 */
export async function overrideErrors(
  client: AkamaiClient,
  args: {
    propertyId: string;
    version: number;
    errors: string[];
    justification: string;
    contractId: string;
    groupId: string;
    approvedBy?: string;
    customer?: string;
  }
): Promise<MCPToolResponse> {
  try {
    const params = new URLSearchParams({
      contractId: args.contractId,
      groupId: args.groupId
    });

    const requestBody = {
      overriddenErrors: args.errors.map(messageId => ({
        messageId,
        justification: args.justification,
        approvedBy: args.approvedBy
      }))
    };

    await client.request({
      path: `/papi/v1/properties/${args.propertyId}/versions/${args.version}/override-errors?${params.toString()}`,
      method: 'POST',
      body: requestBody
    });

    let responseText = `# Errors Overridden\n\n`;
    responseText += `**Property ID:** ${args.propertyId}\n`;
    responseText += `**Version:** ${args.version}\n`;
    responseText += `**Errors Overridden:** ${args.errors.length}\n`;
    responseText += `**Justification:** ${args.justification}\n`;
    
    if (args.approvedBy) {
      responseText += `**Approved By:** ${args.approvedBy}\n`;
    }
    
    responseText += `**Override Date:** ${new Date().toISOString()}\n\n`;

    responseText += `## ⚠️ WARNING: ERRORS HAVE BEEN OVERRIDDEN\n\n`;
    responseText += `The following critical errors have been forcibly overridden:\n\n`;
    
    args.errors.forEach((messageId, index) => {
      responseText += `${index + 1}. **${messageId}**\n`;
    });
    responseText += `\n`;

    responseText += `## ⚠️ IMPORTANT CONSIDERATIONS\n\n`;
    responseText += `- **High Risk Deployment** - Overriding errors bypasses safety checks\n`;
    responseText += `- **Monitor Closely** - Watch for service disruptions after activation\n`;
    responseText += `- **Have Rollback Plan** - Be prepared to quickly revert if issues occur\n`;
    responseText += `- **Document Thoroughly** - Record all decisions and outcomes\n\n`;

    responseText += `## Next Steps\n\n`;
    responseText += `1. **Final Review** - Ensure justification is documented\n`;
    responseText += `2. **Staging Test** - Deploy to staging first if possible\n`;
    responseText += `3. **Production Deployment** - Proceed with extreme caution\n`;
    responseText += `4. **Continuous Monitoring** - Watch all metrics closely\n\n`;

    responseText += `Property can now be activated despite validation errors.\n`;

    return {
      content: [{ type: 'text', text: responseText }]
    };
  } catch (error) {
    return handleApiError(error, 'overriding errors');
  }
}

/**
 * Get comprehensive error context and resolution suggestions
 */
export async function getErrorRecoveryHelp(
  client: AkamaiClient,
  args: {
    propertyId: string;
    version: number;
    errorType?: string;
    contractId: string;
    groupId: string;
    customer?: string;
  }
): Promise<MCPToolResponse> {
  try {
    // First get the validation errors
    await getValidationErrors(client, {
      propertyId: args.propertyId,
      version: args.version,
      contractId: args.contractId,
      groupId: args.groupId,
      validateRules: true,
      validateHostnames: true,
      customer: args.customer
    });

    let responseText = `# Error Recovery Assistant\n\n`;
    responseText += `**Property ID:** ${args.propertyId}\n`;
    responseText += `**Version:** ${args.version}\n`;
    responseText += `**Analysis Date:** ${new Date().toISOString()}\n\n`;

    // Common error patterns and solutions
    const errorSolutions = {
      'HOSTNAME_ERROR': {
        title: 'Hostname Configuration Issues',
        solutions: [
          'Verify hostname DNS configuration',
          'Check edge hostname mapping',
          'Ensure certificate coverage for HTTPS hostnames',
          'Validate hostname ownership'
        ]
      },
      'RULE_ERROR': {
        title: 'Rule Tree Configuration Issues', 
        solutions: [
          'Check behavior parameter values',
          'Verify criteria logic and conditions',
          'Ensure required behaviors are present',
          'Validate rule format compatibility'
        ]
      },
      'BEHAVIOR_ERROR': {
        title: 'Behavior Configuration Issues',
        solutions: [
          'Review behavior parameter requirements',
          'Check for conflicting behaviors',
          'Verify behavior compatibility with rule format',
          'Ensure all required fields are populated'
        ]
      },
      'CERTIFICATE_ERROR': {
        title: 'Certificate Configuration Issues',
        solutions: [
          'Verify certificate enrollment status',
          'Check domain validation completion',
          'Ensure certificate covers all hostnames',
          'Validate certificate deployment status'
        ]
      }
    };

    responseText += `## Common Error Resolution Patterns\n\n`;
    
    for (const [, solution] of Object.entries(errorSolutions)) {
      responseText += `### ${solution.title}\n\n`;
      solution.solutions.forEach((step, index) => {
        responseText += `${index + 1}. ${step}\n`;
      });
      responseText += `\n`;
    }

    responseText += `## Diagnostic Steps\n\n`;
    responseText += `### 1. Rule Tree Analysis\n`;
    responseText += `\`\`\`\n`;
    responseText += `getPropertyRules --propertyId ${args.propertyId} --version ${args.version}\n`;
    responseText += `\`\`\`\n\n`;

    responseText += `### 2. Hostname Validation\n`;
    responseText += `\`\`\`\n`;
    responseText += `listPropertyVersionHostnames --propertyId ${args.propertyId} --version ${args.version} --validateHostnames true\n`;
    responseText += `\`\`\`\n\n`;

    responseText += `### 3. Certificate Status Check\n`;
    responseText += `\`\`\`\n`;
    responseText += `listPropertyVersionHostnames --propertyId ${args.propertyId} --version ${args.version} --includeCertStatus true\n`;
    responseText += `\`\`\`\n\n`;

    responseText += `## Recovery Workflow\n\n`;
    responseText += `1. **Identify Root Cause** - Use validation report to pinpoint issues\n`;
    responseText += `2. **Apply Fixes** - Update configuration based on error type\n`;
    responseText += `3. **Re-validate** - Check validation status after changes\n`;
    responseText += `4. **Test in Staging** - Deploy to staging environment first\n`;
    responseText += `5. **Monitor and Verify** - Ensure all issues are resolved\n\n`;

    responseText += `## Emergency Procedures\n\n`;
    responseText += `### Immediate Rollback\n`;
    responseText += `If issues occur after activation:\n`;
    responseText += `1. Activate previous working version immediately\n`;
    responseText += `2. Document the incident and impact\n`;
    responseText += `3. Investigate root cause in non-production environment\n\n`;

    responseText += `### Escalation Path\n`;
    responseText += `For complex issues requiring support:\n`;
    responseText += `1. Gather all error details and configuration\n`;
    responseText += `2. Document troubleshooting steps attempted\n`;
    responseText += `3. Contact Akamai support with complete context\n`;

    return {
      content: [{ type: 'text', text: responseText }]
    };
  } catch (error) {
    return handleApiError(error, 'getting error recovery help');
  }
}

/**
 * Validate property configuration with comprehensive checks
 */
export async function validatePropertyConfiguration(
  client: AkamaiClient,
  args: {
    propertyId: string;
    version: number;
    contractId: string;
    groupId: string;
    includeHostnameValidation?: boolean;
    includeRuleValidation?: boolean;
    includeCertificateValidation?: boolean;
    customer?: string;
  }
): Promise<MCPToolResponse> {
  try {
    let responseText = `# Comprehensive Property Validation\n\n`;
    responseText += `**Property ID:** ${args.propertyId}\n`;
    responseText += `**Version:** ${args.version}\n`;
    responseText += `**Validation Started:** ${new Date().toISOString()}\n\n`;

    let totalErrors = 0;
    let totalWarnings = 0;
    const validationResults: string[] = [];

    // 1. Basic property validation
    responseText += `## 1. Basic Property Validation\n\n`;
    try {
      await getValidationErrors(client, {
        propertyId: args.propertyId,
        version: args.version,
        contractId: args.contractId,
        groupId: args.groupId,
        validateRules: args.includeRuleValidation !== false,
        validateHostnames: args.includeHostnameValidation !== false,
        customer: args.customer
      });
      
      validationResults.push('✅ Basic validation completed');
      responseText += `✅ Basic property validation completed\n\n`;
    } catch (error) {
      totalErrors++;
      validationResults.push('❌ Basic validation failed');
      responseText += `❌ Basic property validation failed: ${(error as Error).message}\n\n`;
    }

    // 2. Rule tree validation
    if (args.includeRuleValidation !== false) {
      responseText += `## 2. Rule Tree Validation\n\n`;
      try {
        await client.request({
          path: `/papi/v1/properties/${args.propertyId}/versions/${args.version}/rules?contractId=${args.contractId}&groupId=${args.groupId}&validateRules=true`,
          method: 'GET'
        });
        
        validationResults.push('✅ Rule tree validation passed');
        responseText += `✅ Rule tree structure and logic validated\n\n`;
      } catch (error) {
        totalErrors++;
        validationResults.push('❌ Rule tree validation failed');
        responseText += `❌ Rule tree validation failed: ${(error as Error).message}\n\n`;
      }
    }

    // 3. Hostname validation
    if (args.includeHostnameValidation !== false) {
      responseText += `## 3. Hostname Validation\n\n`;
      try {
        await client.request({
          path: `/papi/v1/properties/${args.propertyId}/versions/${args.version}/hostnames?contractId=${args.contractId}&groupId=${args.groupId}&validateHostnames=true`,
          method: 'GET'
        });
        
        validationResults.push('✅ Hostname validation passed');
        responseText += `✅ All hostnames properly configured and validated\n\n`;
      } catch (error) {
        totalErrors++;
        validationResults.push('❌ Hostname validation failed');
        responseText += `❌ Hostname validation failed: ${(error as Error).message}\n\n`;
      }
    }

    // 4. Certificate validation (if requested)
    if (args.includeCertificateValidation) {
      responseText += `## 4. Certificate Validation\n\n`;
      try {
        const hostnameResponse = await client.request({
          path: `/papi/v1/properties/${args.propertyId}/versions/${args.version}/hostnames?contractId=${args.contractId}&groupId=${args.groupId}&includeCertStatus=true`,
          method: 'GET'
        });
        
        const hostnames = hostnameResponse.hostnames?.items || [];
        let certIssues = 0;
        
        hostnames.forEach((hostname: any) => {
          if (hostname.certStatus) {
            const prodStatus = hostname.certStatus.production?.[0]?.status;
            const stagingStatus = hostname.certStatus.staging?.[0]?.status;
            
            if (prodStatus !== 'ACTIVE' || stagingStatus !== 'ACTIVE') {
              certIssues++;
            }
          }
        });
        
        if (certIssues === 0) {
          validationResults.push('✅ Certificate validation passed');
          responseText += `✅ All certificates active and properly deployed\n\n`;
        } else {
          totalWarnings++;
          validationResults.push('⚠️ Certificate issues detected');
          responseText += `⚠️ ${certIssues} certificate issues detected\n\n`;
        }
      } catch (error) {
        totalWarnings++;
        validationResults.push('⚠️ Certificate validation incomplete');
        responseText += `⚠️ Certificate validation incomplete: ${(error as Error).message}\n\n`;
      }
    }

    // Validation summary
    responseText += `## Validation Summary\n\n`;
    responseText += `- **Total Errors:** ${totalErrors}\n`;
    responseText += `- **Total Warnings:** ${totalWarnings}\n`;
    responseText += `- **Overall Status:** ${totalErrors === 0 ? 'PASS ✅' : 'FAIL ❌'}\n\n`;

    responseText += `### Validation Results\n\n`;
    validationResults.forEach(result => {
      responseText += `- ${result}\n`;
    });
    responseText += `\n`;

    // Recommendations
    responseText += `## Recommendations\n\n`;
    if (totalErrors === 0 && totalWarnings === 0) {
      responseText += `✅ **Ready for Activation** - All validation checks passed\n\n`;
      responseText += `Proceed with activation:\n`;
      responseText += `\`\`\`\n`;
      responseText += `activateProperty --propertyId ${args.propertyId} --version ${args.version} --network STAGING\n`;
      responseText += `\`\`\`\n`;
    } else if (totalErrors === 0) {
      responseText += `⚠️ **Review Warnings** - Address warnings before production deployment\n\n`;
      responseText += `Consider staging deployment first:\n`;
      responseText += `\`\`\`\n`;
      responseText += `activateProperty --propertyId ${args.propertyId} --version ${args.version} --network STAGING\n`;
      responseText += `\`\`\`\n`;
    } else {
      responseText += `❌ **Fix Errors First** - Cannot activate with validation errors\n\n`;
      responseText += `1. Review detailed error information\n`;
      responseText += `2. Update property configuration\n`;
      responseText += `3. Re-run comprehensive validation\n`;
      responseText += `4. Deploy to staging for testing\n`;
    }

    return {
      content: [{ type: 'text', text: responseText }]
    };
  } catch (error) {
    return handleApiError(error, 'validating property configuration');
  }
}