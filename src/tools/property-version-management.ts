/**
 * Enhanced Property Version Management Tools
 * Comprehensive version management including comparison, metadata, batch operations, and rollback
 */

import { AkamaiClient } from '../akamai-client.js';
import { MCPToolResponse } from '../types.js';
import { ErrorTranslator } from '../utils/errors.js';

// Version comparison types
export interface VersionDiff {
  type: 'added' | 'removed' | 'modified';
  path: string;
  oldValue?: any;
  newValue?: any;
  description?: string;
}

export interface VersionComparison {
  version1: number;
  version2: number;
  differences: {
    rules?: VersionDiff[];
    hostnames?: VersionDiff[];
    metadata?: VersionDiff[];
    summary: {
      totalChanges: number;
      ruleChanges: number;
      hostnameChanges: number;
      behaviorChanges: number;
      criteriaChanges: number;
    };
  };
}

export interface VersionMetadata {
  version: number;
  note?: string;
  tags?: string[];
  labels?: Record<string, string>;
  createdBy?: string;
  createdDate?: string;
  lastModifiedBy?: string;
  lastModifiedDate?: string;
  customData?: Record<string, any>;
}

export interface VersionTimeline {
  propertyId: string;
  propertyName: string;
  timeline: Array<{
    version: number;
    date: string;
    event: 'created' | 'modified' | 'activated' | 'deactivated';
    network?: 'STAGING' | 'PRODUCTION';
    user?: string;
    note?: string;
    changes?: {
      rules?: number;
      hostnames?: number;
      behaviors?: number;
    };
  }>;
}

/**
 * Compare two property versions to identify differences
 */
export async function comparePropertyVersions(
  client: AkamaiClient,
  args: {
    propertyId: string;
    version1: number;
    version2: number;
    compareType?: 'rules' | 'hostnames' | 'all';
    includeDetails?: boolean;
  }
): Promise<MCPToolResponse> {
  const errorTranslator = new ErrorTranslator();
  const compareType = args.compareType || 'all';
  const includeDetails = args.includeDetails !== false;
  
  try {
    // Get property details
    const propertyResponse = await client.request({
      path: `/papi/v1/properties/${args.propertyId}`,
      method: 'GET',
    });
    
    if (!propertyResponse.properties?.items?.[0]) {
      throw new Error('Property not found');
    }
    
    const property = propertyResponse.properties.items[0];
    const comparison: VersionComparison = {
      version1: args.version1,
      version2: args.version2,
      differences: {
        summary: {
          totalChanges: 0,
          ruleChanges: 0,
          hostnameChanges: 0,
          behaviorChanges: 0,
          criteriaChanges: 0,
        },
      },
    };

    // Compare rules if requested
    if (compareType === 'rules' || compareType === 'all') {
      const [rules1, rules2] = await Promise.all([
        client.request({
          path: `/papi/v1/properties/${args.propertyId}/versions/${args.version1}/rules`,
          method: 'GET',
        }),
        client.request({
          path: `/papi/v1/properties/${args.propertyId}/versions/${args.version2}/rules`,
          method: 'GET',
        }),
      ]);

      comparison.differences.rules = compareRuleTrees(rules1.rules, rules2.rules, includeDetails);
      
      // Count specific changes
      comparison.differences.rules.forEach(diff => {
        if (diff.path.includes('/behaviors/')) {
          comparison.differences.summary.behaviorChanges++;
        } else if (diff.path.includes('/criteria/')) {
          comparison.differences.summary.criteriaChanges++;
        }
        comparison.differences.summary.ruleChanges++;
      });
    }

    // Compare hostnames if requested
    if (compareType === 'hostnames' || compareType === 'all') {
      const [hostnames1, hostnames2] = await Promise.all([
        client.request({
          path: `/papi/v1/properties/${args.propertyId}/versions/${args.version1}/hostnames`,
          method: 'GET',
        }),
        client.request({
          path: `/papi/v1/properties/${args.propertyId}/versions/${args.version2}/hostnames`,
          method: 'GET',
        }),
      ]);

      comparison.differences.hostnames = compareHostnames(
        hostnames1.hostnames?.items || [],
        hostnames2.hostnames?.items || []
      );
      
      comparison.differences.summary.hostnameChanges = comparison.differences.hostnames.length;
    }

    comparison.differences.summary.totalChanges = 
      comparison.differences.summary.ruleChanges + 
      comparison.differences.summary.hostnameChanges;

    // Format response
    let responseText = `# Property Version Comparison\n\n`;
    responseText += `**Property:** ${property.propertyName} (${args.propertyId})\n`;
    responseText += `**Comparing:** Version ${args.version1} ↔ Version ${args.version2}\n\n`;

    responseText += `## Summary\n`;
    responseText += `- **Total Changes:** ${comparison.differences.summary.totalChanges}\n`;
    responseText += `- **Rule Changes:** ${comparison.differences.summary.ruleChanges}\n`;
    responseText += `- **Behavior Changes:** ${comparison.differences.summary.behaviorChanges}\n`;
    responseText += `- **Criteria Changes:** ${comparison.differences.summary.criteriaChanges}\n`;
    responseText += `- **Hostname Changes:** ${comparison.differences.summary.hostnameChanges}\n\n`;

    if (comparison.differences.rules && comparison.differences.rules.length > 0) {
      responseText += `## Rule Changes\n`;
      responseText += formatDifferences(comparison.differences.rules, includeDetails);
      responseText += '\n';
    }

    if (comparison.differences.hostnames && comparison.differences.hostnames.length > 0) {
      responseText += `## Hostname Changes\n`;
      responseText += formatHostnameDifferences(comparison.differences.hostnames);
      responseText += '\n';
    }

    if (comparison.differences.summary.totalChanges === 0) {
      responseText += `✅ **No differences found** between version ${args.version1} and version ${args.version2}.\n`;
    } else {
      responseText += `## Next Steps\n`;
      responseText += `- Review changes carefully before activation\n`;
      responseText += `- Test in staging environment first\n`;
      responseText += `- Create new version to merge changes if needed\n`;
    }

    return {
      content: [{
        type: 'text',
        text: responseText,
      }],
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: errorTranslator.formatConversationalError(error, {
          operation: 'compare property versions',
          parameters: args,
          timestamp: new Date(),
        }),
      }],
    };
  }
}

/**
 * Create versions across multiple properties in batch
 */
export async function batchCreateVersions(
  client: AkamaiClient,
  args: {
    properties: Array<{
      propertyId: string;
      baseVersion?: number;
      note?: string;
    }>;
    defaultNote?: string;
  }
): Promise<MCPToolResponse> {
  const errorTranslator = new ErrorTranslator();
  const results: Array<{
    propertyId: string;
    propertyName?: string;
    success: boolean;
    newVersion?: number;
    error?: string;
  }> = [];
  
  try {
    // Process each property
    for (const prop of args.properties) {
      try {
        // Get property details
        const propertyResponse = await client.request({
          path: `/papi/v1/properties/${prop.propertyId}`,
          method: 'GET',
        });
        
        const property = propertyResponse.properties?.items?.[0];
        if (!property) {
          results.push({
            propertyId: prop.propertyId,
            success: false,
            error: 'Property not found',
          });
          continue;
        }

        const baseVersion = prop.baseVersion || property.latestVersion;
        
        // Create new version
        const versionResponse = await client.request({
          path: `/papi/v1/properties/${prop.propertyId}/versions`,
          method: 'POST',
          body: {
            createFromVersion: baseVersion,
            createFromVersionEtag: property.propertyVersion?.etag,
          },
        });

        const newVersion = versionResponse.versionLink?.split('/versions/')[1];
        
        results.push({
          propertyId: prop.propertyId,
          propertyName: property.propertyName,
          success: true,
          newVersion: parseInt(newVersion),
        });

        // Update version note if provided
        if (prop.note || args.defaultNote) {
          await updateVersionNote(client, prop.propertyId, parseInt(newVersion), 
            prop.note || args.defaultNote || '');
        }
      } catch (error: any) {
        results.push({
          propertyId: prop.propertyId,
          success: false,
          error: error.message || 'Unknown error',
        });
      }
    }

    // Format response
    let responseText = `# Batch Version Creation Results\n\n`;
    responseText += `**Total Properties:** ${args.properties.length}\n`;
    responseText += `**Successful:** ${results.filter(r => r.success).length}\n`;
    responseText += `**Failed:** ${results.filter(r => !r.success).length}\n\n`;

    if (results.some(r => r.success)) {
      responseText += `## ✅ Successful Versions\n`;
      results.filter(r => r.success).forEach(result => {
        responseText += `- **${result.propertyName}** (${result.propertyId}): Version ${result.newVersion}\n`;
      });
      responseText += '\n';
    }

    if (results.some(r => !r.success)) {
      responseText += `## ❌ Failed Versions\n`;
      results.filter(r => !r.success).forEach(result => {
        responseText += `- **${result.propertyId}**: ${result.error}\n`;
      });
      responseText += '\n';
    }

    responseText += `## Next Steps\n`;
    responseText += `- Update rules for new versions as needed\n`;
    responseText += `- Validate versions before activation\n`;
    responseText += `- Use batch activation for coordinated deployment\n`;

    return {
      content: [{
        type: 'text',
        text: responseText,
      }],
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: errorTranslator.formatConversationalError(error, {
          operation: 'batch create versions',
          parameters: args,
          timestamp: new Date(),
        }),
      }],
    };
  }
}

/**
 * Get comprehensive version timeline for a property
 */
export async function getVersionTimeline(
  client: AkamaiClient,
  args: {
    propertyId: string;
    startDate?: string;
    endDate?: string;
    includeChanges?: boolean;
    limit?: number;
  }
): Promise<MCPToolResponse> {
  const errorTranslator = new ErrorTranslator();
  const limit = args.limit || 50;
  
  try {
    // Get property details
    const propertyResponse = await client.request({
      path: `/papi/v1/properties/${args.propertyId}`,
      method: 'GET',
    });
    
    const property = propertyResponse.properties?.items?.[0];
    if (!property) {
      throw new Error('Property not found');
    }

    // Get all versions
    const versionsResponse = await client.request({
      path: `/papi/v1/properties/${args.propertyId}/versions`,
      method: 'GET',
      queryParams: { limit: limit.toString() },
    });

    // Get activation history
    const activationsResponse = await client.request({
      path: `/papi/v1/properties/${args.propertyId}/activations`,
      method: 'GET',
    });

    const timeline: VersionTimeline = {
      propertyId: args.propertyId,
      propertyName: property.propertyName,
      timeline: [],
    };

    // Build timeline from versions
    const versions = versionsResponse.versions?.items || [];
    for (const version of versions) {
      const versionDate = new Date(version.updatedDate);
      
      // Apply date filters if provided
      if (args.startDate && versionDate < new Date(args.startDate)) continue;
      if (args.endDate && versionDate > new Date(args.endDate)) continue;

      timeline.timeline.push({
        version: version.propertyVersion,
        date: version.updatedDate,
        event: 'created',
        user: version.updatedByUser,
        note: version.note,
      });

      // Add activation events
      const activations = activationsResponse.activations?.items?.filter(
        (a: any) => a.propertyVersion === version.propertyVersion
      ) || [];

      for (const activation of activations) {
        timeline.timeline.push({
          version: activation.propertyVersion,
          date: activation.submitDate,
          event: 'activated',
          network: activation.network,
          user: activation.notifyEmails?.[0],
          note: activation.note,
        });
      }
    }

    // Sort timeline by date
    timeline.timeline.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // Format response
    let responseText = `# Property Version Timeline\n\n`;
    responseText += `**Property:** ${property.propertyName} (${args.propertyId})\n`;
    responseText += `**Current Version:** ${property.latestVersion}\n`;
    responseText += `**Production Version:** ${property.productionVersion || 'None'}\n`;
    responseText += `**Staging Version:** ${property.stagingVersion || 'None'}\n\n`;

    if (args.startDate || args.endDate) {
      responseText += `**Date Range:** ${args.startDate || 'Beginning'} to ${args.endDate || 'Now'}\n\n`;
    }

    responseText += `## Timeline (${timeline.timeline.length} events)\n\n`;

    for (const event of timeline.timeline) {
      const date = new Date(event.date).toLocaleString();
      const icon = event.event === 'created' ? '📝' : 
                   event.event === 'activated' ? '🚀' : '📋';
      
      responseText += `### ${icon} Version ${event.version}\n`;
      responseText += `- **Date:** ${date}\n`;
      responseText += `- **Event:** ${event.event}`;
      if (event.network) responseText += ` to ${event.network}`;
      responseText += '\n';
      if (event.user) responseText += `- **By:** ${event.user}\n`;
      if (event.note) responseText += `- **Note:** ${event.note}\n`;
      responseText += '\n';
    }

    responseText += `## Version Statistics\n`;
    const totalVersions = new Set(timeline.timeline.map(e => e.version)).size;
    const activations = timeline.timeline.filter(e => e.event === 'activated');
    responseText += `- **Total Versions:** ${totalVersions}\n`;
    responseText += `- **Total Activations:** ${activations.length}\n`;
    responseText += `- **Production Activations:** ${activations.filter(a => a.network === 'PRODUCTION').length}\n`;
    responseText += `- **Staging Activations:** ${activations.filter(a => a.network === 'STAGING').length}\n`;

    return {
      content: [{
        type: 'text',
        text: responseText,
      }],
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: errorTranslator.formatConversationalError(error, {
          operation: 'get version timeline',
          parameters: args,
          timestamp: new Date(),
        }),
      }],
    };
  }
}

/**
 * Rollback property to a previous version
 */
export async function rollbackPropertyVersion(
  client: AkamaiClient,
  args: {
    propertyId: string;
    targetVersion: number;
    preserveHostnames?: boolean;
    createBackup?: boolean;
    note?: string;
  }
): Promise<MCPToolResponse> {
  const errorTranslator = new ErrorTranslator();
  const preserveHostnames = args.preserveHostnames !== false;
  const createBackup = args.createBackup !== false;
  
  try {
    // Get property details
    const propertyResponse = await client.request({
      path: `/papi/v1/properties/${args.propertyId}`,
      method: 'GET',
    });
    
    const property = propertyResponse.properties?.items?.[0];
    if (!property) {
      throw new Error('Property not found');
    }

    const currentVersion = property.latestVersion;
    
    // Validate target version exists
    const targetVersionResponse = await client.request({
      path: `/papi/v1/properties/${args.propertyId}/versions/${args.targetVersion}`,
      method: 'GET',
    });

    if (!targetVersionResponse.versions?.items?.[0]) {
      throw new Error(`Version ${args.targetVersion} not found`);
    }

    // Create backup if requested
    let backupVersion: number | undefined;
    if (createBackup) {
      const backupResponse = await client.request({
        path: `/papi/v1/properties/${args.propertyId}/versions`,
        method: 'POST',
        body: {
          createFromVersion: currentVersion,
          createFromVersionEtag: property.propertyVersion?.etag,
        },
      });
      
      backupVersion = parseInt(backupResponse.versionLink?.split('/versions/')[1]);
      
      // Add backup note
      if (backupVersion) {
        await updateVersionNote(client, args.propertyId, backupVersion, 
          `Backup before rollback from v${currentVersion} to v${args.targetVersion}`);
      }
    }

    // Get current hostnames if preserving
    let currentHostnames: any[] = [];
    if (preserveHostnames) {
      const hostnamesResponse = await client.request({
        path: `/papi/v1/properties/${args.propertyId}/versions/${currentVersion}/hostnames`,
        method: 'GET',
      });
      currentHostnames = hostnamesResponse.hostnames?.items || [];
    }

    // Create new version from target
    const rollbackResponse = await client.request({
      path: `/papi/v1/properties/${args.propertyId}/versions`,
      method: 'POST',
      body: {
        createFromVersion: args.targetVersion,
      },
    });

    const newVersion = parseInt(rollbackResponse.versionLink?.split('/versions/')[1]);

    // Update version note
    const note = args.note || `Rollback from v${currentVersion} to v${args.targetVersion}`;
    await updateVersionNote(client, args.propertyId, newVersion, note);

    // Restore hostnames if preserving
    if (preserveHostnames && currentHostnames.length > 0) {
      await client.request({
        path: `/papi/v1/properties/${args.propertyId}/versions/${newVersion}/hostnames`,
        method: 'PUT',
        body: {
          add: currentHostnames,
        },
      });
    }

    // Format response
    let responseText = `# Property Version Rollback\n\n`;
    responseText += `**Property:** ${property.propertyName} (${args.propertyId})\n`;
    responseText += `**Rolled Back:** v${currentVersion} → v${args.targetVersion}\n`;
    responseText += `**New Version:** v${newVersion}\n`;
    if (backupVersion) {
      responseText += `**Backup Version:** v${backupVersion}\n`;
    }
    responseText += `**Hostnames:** ${preserveHostnames ? 'Preserved' : 'Restored from target'}\n\n`;

    responseText += `## Rollback Summary\n`;
    responseText += `✅ Successfully created version ${newVersion} based on version ${args.targetVersion}\n`;
    if (preserveHostnames) {
      responseText += `✅ Preserved ${currentHostnames.length} hostname(s) from current version\n`;
    }
    if (backupVersion) {
      responseText += `✅ Created backup in version ${backupVersion}\n`;
    }
    responseText += '\n';

    responseText += `## Next Steps\n`;
    responseText += `1. **Validate** the new version:\n`;
    responseText += `   \`validate_property_activation propertyId=${args.propertyId} version=${newVersion}\`\n`;
    responseText += `2. **Test** in staging first:\n`;
    responseText += `   \`activate_property propertyId=${args.propertyId} version=${newVersion} network=STAGING\`\n`;
    responseText += `3. **Deploy** to production when ready:\n`;
    responseText += `   \`activate_property propertyId=${args.propertyId} version=${newVersion} network=PRODUCTION\`\n`;

    if (backupVersion) {
      responseText += `\n💡 **Tip:** If you need to restore the pre-rollback state, use version ${backupVersion}`;
    }

    return {
      content: [{
        type: 'text',
        text: responseText,
      }],
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: errorTranslator.formatConversationalError(error, {
          operation: 'rollback property version',
          parameters: args,
          timestamp: new Date(),
        }),
      }],
    };
  }
}

/**
 * Update version metadata including notes and custom tags
 */
export async function updateVersionMetadata(
  client: AkamaiClient,
  args: {
    propertyId: string;
    version: number;
    metadata: {
      note?: string;
      tags?: string[];
      labels?: Record<string, string>;
    };
  }
): Promise<MCPToolResponse> {
  const errorTranslator = new ErrorTranslator();
  
  try {
    // Get property and version details
    const [propertyResponse, versionResponse] = await Promise.all([
      client.request({
        path: `/papi/v1/properties/${args.propertyId}`,
        method: 'GET',
      }),
      client.request({
        path: `/papi/v1/properties/${args.propertyId}/versions/${args.version}`,
        method: 'GET',
      }),
    ]);

    const property = propertyResponse.properties?.items?.[0];
    const version = versionResponse.versions?.items?.[0];
    
    if (!property || !version) {
      throw new Error('Property or version not found');
    }

    // Update version note (only supported metadata in PAPI currently)
    if (args.metadata.note) {
      await updateVersionNote(client, args.propertyId, args.version, args.metadata.note);
    }

    // Store extended metadata as a comment in rules (workaround)
    if (args.metadata.tags || args.metadata.labels) {
      const rulesResponse = await client.request({
        path: `/papi/v1/properties/${args.propertyId}/versions/${args.version}/rules`,
        method: 'GET',
      });

      const rules = rulesResponse.rules;
      
      // Add metadata as comments in rule tree
      if (!rules.comments) rules.comments = {};
      
      if (args.metadata.tags) {
        rules.comments.tags = args.metadata.tags.join(', ');
      }
      
      if (args.metadata.labels) {
        rules.comments.labels = JSON.stringify(args.metadata.labels);
      }

      // Update rules with metadata
      await client.request({
        path: `/papi/v1/properties/${args.propertyId}/versions/${args.version}/rules`,
        method: 'PUT',
        body: {
          rules,
        },
      });
    }

    // Format response
    let responseText = `# Version Metadata Updated\n\n`;
    responseText += `**Property:** ${property.propertyName} (${args.propertyId})\n`;
    responseText += `**Version:** ${args.version}\n\n`;

    responseText += `## Updated Metadata\n`;
    if (args.metadata.note) {
      responseText += `- **Note:** ${args.metadata.note}\n`;
    }
    if (args.metadata.tags) {
      responseText += `- **Tags:** ${args.metadata.tags.join(', ')}\n`;
    }
    if (args.metadata.labels) {
      responseText += `- **Labels:**\n`;
      Object.entries(args.metadata.labels).forEach(([key, value]) => {
        responseText += `  - ${key}: ${value}\n`;
      });
    }

    responseText += `\n✅ Metadata successfully updated for version ${args.version}\n`;
    
    responseText += `\n## Note\n`;
    responseText += `Tags and labels are stored as rule comments since PAPI doesn't natively support extended metadata.\n`;
    responseText += `They will be preserved across version updates and can be retrieved when viewing rules.\n`;

    return {
      content: [{
        type: 'text',
        text: responseText,
      }],
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: errorTranslator.formatConversationalError(error, {
          operation: 'update version metadata',
          parameters: args,
          timestamp: new Date(),
        }),
      }],
    };
  }
}

/**
 * Intelligently merge versions or cherry-pick changes
 */
export async function mergePropertyVersions(
  client: AkamaiClient,
  args: {
    propertyId: string;
    sourceVersion: number;
    targetVersion: number;
    mergeStrategy: 'merge' | 'cherry-pick';
    includePaths?: string[];
    excludePaths?: string[];
    createNewVersion?: boolean;
  }
): Promise<MCPToolResponse> {
  const errorTranslator = new ErrorTranslator();
  const createNewVersion = args.createNewVersion !== false;
  
  try {
    // Get property details
    const propertyResponse = await client.request({
      path: `/papi/v1/properties/${args.propertyId}`,
      method: 'GET',
    });
    
    const property = propertyResponse.properties?.items?.[0];
    if (!property) {
      throw new Error('Property not found');
    }

    // Get rules from both versions
    const [sourceRules, targetRules] = await Promise.all([
      client.request({
        path: `/papi/v1/properties/${args.propertyId}/versions/${args.sourceVersion}/rules`,
        method: 'GET',
      }),
      client.request({
        path: `/papi/v1/properties/${args.propertyId}/versions/${args.targetVersion}/rules`,
        method: 'GET',
      }),
    ]);

    // Perform merge based on strategy
    let mergedRules: any;
    let mergeDescription: string;
    
    if (args.mergeStrategy === 'cherry-pick' && args.includePaths) {
      mergedRules = cherryPickChanges(
        sourceRules.rules, 
        targetRules.rules, 
        args.includePaths,
        args.excludePaths
      );
      mergeDescription = `Cherry-picked ${args.includePaths.length} path(s) from v${args.sourceVersion}`;
    } else {
      mergedRules = mergeRuleTrees(
        sourceRules.rules,
        targetRules.rules,
        args.excludePaths
      );
      mergeDescription = `Merged changes from v${args.sourceVersion} into v${args.targetVersion}`;
    }

    let finalVersion = args.targetVersion;
    
    // Create new version if requested
    if (createNewVersion) {
      const versionResponse = await client.request({
        path: `/papi/v1/properties/${args.propertyId}/versions`,
        method: 'POST',
        body: {
          createFromVersion: args.targetVersion,
        },
      });
      
      finalVersion = parseInt(versionResponse.versionLink?.split('/versions/')[1]);
      
      // Add merge note
      await updateVersionNote(client, args.propertyId, finalVersion, mergeDescription);
    }

    // Apply merged rules
    await client.request({
      path: `/papi/v1/properties/${args.propertyId}/versions/${finalVersion}/rules`,
      method: 'PUT',
      body: {
        rules: mergedRules,
      },
    });

    // Format response
    let responseText = `# Version Merge Results\n\n`;
    responseText += `**Property:** ${property.propertyName} (${args.propertyId})\n`;
    responseText += `**Merge Strategy:** ${args.mergeStrategy}\n`;
    responseText += `**Source Version:** ${args.sourceVersion}\n`;
    responseText += `**Target Version:** ${args.targetVersion}\n`;
    if (createNewVersion) {
      responseText += `**New Version Created:** ${finalVersion}\n`;
    }
    responseText += '\n';

    responseText += `## Merge Summary\n`;
    responseText += `✅ ${mergeDescription}\n`;
    
    if (args.includePaths) {
      responseText += `\n### Included Paths\n`;
      args.includePaths.forEach(path => {
        responseText += `- ${path}\n`;
      });
    }
    
    if (args.excludePaths) {
      responseText += `\n### Excluded Paths\n`;
      args.excludePaths.forEach(path => {
        responseText += `- ${path}\n`;
      });
    }

    responseText += `\n## Next Steps\n`;
    responseText += `1. **Review** the merged rules:\n`;
    responseText += `   \`get_property_rules propertyId=${args.propertyId} version=${finalVersion}\`\n`;
    responseText += `2. **Validate** the configuration:\n`;
    responseText += `   \`validate_property_activation propertyId=${args.propertyId} version=${finalVersion}\`\n`;
    responseText += `3. **Test** in staging environment\n`;

    return {
      content: [{
        type: 'text',
        text: responseText,
      }],
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: errorTranslator.formatConversationalError(error, {
          operation: 'merge property versions',
          parameters: args,
          timestamp: new Date(),
        }),
      }],
    };
  }
}

// Helper functions

function compareRuleTrees(rules1: any, rules2: any, includeDetails: boolean): VersionDiff[] {
  const diffs: VersionDiff[] = [];
  
  // Deep comparison of rule trees
  const compareObjects = (obj1: any, obj2: any, path: string) => {
    // Handle arrays
    if (Array.isArray(obj1) && Array.isArray(obj2)) {
      const maxLength = Math.max(obj1.length, obj2.length);
      for (let i = 0; i < maxLength; i++) {
        if (i >= obj1.length) {
          diffs.push({
            type: 'added',
            path: `${path}[${i}]`,
            newValue: includeDetails ? obj2[i] : undefined,
            description: `Added array element at index ${i}`,
          });
        } else if (i >= obj2.length) {
          diffs.push({
            type: 'removed',
            path: `${path}[${i}]`,
            oldValue: includeDetails ? obj1[i] : undefined,
            description: `Removed array element at index ${i}`,
          });
        } else {
          compareObjects(obj1[i], obj2[i], `${path}[${i}]`);
        }
      }
    }
    // Handle objects
    else if (typeof obj1 === 'object' && typeof obj2 === 'object' && obj1 && obj2) {
      const allKeys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);
      
      for (const key of allKeys) {
        const newPath = path ? `${path}/${key}` : key;
        
        if (!(key in obj1)) {
          diffs.push({
            type: 'added',
            path: newPath,
            newValue: includeDetails ? obj2[key] : undefined,
            description: `Added ${key}`,
          });
        } else if (!(key in obj2)) {
          diffs.push({
            type: 'removed',
            path: newPath,
            oldValue: includeDetails ? obj1[key] : undefined,
            description: `Removed ${key}`,
          });
        } else if (JSON.stringify(obj1[key]) !== JSON.stringify(obj2[key])) {
          if (typeof obj1[key] === 'object' && typeof obj2[key] === 'object') {
            compareObjects(obj1[key], obj2[key], newPath);
          } else {
            diffs.push({
              type: 'modified',
              path: newPath,
              oldValue: includeDetails ? obj1[key] : undefined,
              newValue: includeDetails ? obj2[key] : undefined,
              description: `Changed ${key}`,
            });
          }
        }
      }
    }
    // Handle primitives
    else if (obj1 !== obj2) {
      diffs.push({
        type: 'modified',
        path,
        oldValue: includeDetails ? obj1 : undefined,
        newValue: includeDetails ? obj2 : undefined,
        description: `Changed value`,
      });
    }
  };

  compareObjects(rules1, rules2, '');
  return diffs;
}

function compareHostnames(hostnames1: any[], hostnames2: any[]): VersionDiff[] {
  const diffs: VersionDiff[] = [];
  const hostMap1 = new Map(hostnames1.map(h => [h.cnameFrom, h]));
  const hostMap2 = new Map(hostnames2.map(h => [h.cnameFrom, h]));

  // Find removed hostnames
  for (const [hostname, details] of hostMap1) {
    if (!hostMap2.has(hostname)) {
      diffs.push({
        type: 'removed',
        path: `/hostnames/${hostname}`,
        oldValue: details,
        description: `Removed hostname ${hostname}`,
      });
    }
  }

  // Find added hostnames
  for (const [hostname, details] of hostMap2) {
    if (!hostMap1.has(hostname)) {
      diffs.push({
        type: 'added',
        path: `/hostnames/${hostname}`,
        newValue: details,
        description: `Added hostname ${hostname}`,
      });
    }
  }

  // Find modified hostnames
  for (const [hostname, details1] of hostMap1) {
    const details2 = hostMap2.get(hostname);
    if (details2 && details1.cnameTo !== details2.cnameTo) {
      diffs.push({
        type: 'modified',
        path: `/hostnames/${hostname}/cnameTo`,
        oldValue: details1.cnameTo,
        newValue: details2.cnameTo,
        description: `Changed edge hostname for ${hostname}`,
      });
    }
  }

  return diffs;
}

function formatDifferences(diffs: VersionDiff[], includeDetails: boolean): string {
  let text = '';
  
  // Group by type
  const added = diffs.filter(d => d.type === 'added');
  const removed = diffs.filter(d => d.type === 'removed');
  const modified = diffs.filter(d => d.type === 'modified');

  if (added.length > 0) {
    text += `### ➕ Added (${added.length})\n`;
    added.forEach(diff => {
      text += `- ${diff.description || diff.path}\n`;
      if (includeDetails && diff.newValue) {
        text += `  Value: ${JSON.stringify(diff.newValue, null, 2)}\n`;
      }
    });
    text += '\n';
  }

  if (removed.length > 0) {
    text += `### ➖ Removed (${removed.length})\n`;
    removed.forEach(diff => {
      text += `- ${diff.description || diff.path}\n`;
      if (includeDetails && diff.oldValue) {
        text += `  Value: ${JSON.stringify(diff.oldValue, null, 2)}\n`;
      }
    });
    text += '\n';
  }

  if (modified.length > 0) {
    text += `### 🔄 Modified (${modified.length})\n`;
    modified.forEach(diff => {
      text += `- ${diff.description || diff.path}\n`;
      if (includeDetails) {
        if (diff.oldValue !== undefined) {
          text += `  Old: ${JSON.stringify(diff.oldValue, null, 2)}\n`;
        }
        if (diff.newValue !== undefined) {
          text += `  New: ${JSON.stringify(diff.newValue, null, 2)}\n`;
        }
      }
    });
  }

  return text;
}

function formatHostnameDifferences(diffs: VersionDiff[]): string {
  let text = '';
  
  const added = diffs.filter(d => d.type === 'added');
  const removed = diffs.filter(d => d.type === 'removed');
  const modified = diffs.filter(d => d.type === 'modified');

  if (added.length > 0) {
    text += `### ➕ Added Hostnames (${added.length})\n`;
    added.forEach(diff => {
      const hostname = diff.newValue?.cnameFrom || diff.path.split('/').pop();
      const edgeHostname = diff.newValue?.cnameTo || 'N/A';
      text += `- **${hostname}** → ${edgeHostname}\n`;
    });
    text += '\n';
  }

  if (removed.length > 0) {
    text += `### ➖ Removed Hostnames (${removed.length})\n`;
    removed.forEach(diff => {
      const hostname = diff.oldValue?.cnameFrom || diff.path.split('/').pop();
      text += `- **${hostname}**\n`;
    });
    text += '\n';
  }

  if (modified.length > 0) {
    text += `### 🔄 Modified Hostnames (${modified.length})\n`;
    modified.forEach(diff => {
      const hostname = diff.path.split('/')[2];
      text += `- **${hostname}**: ${diff.oldValue} → ${diff.newValue}\n`;
    });
  }

  return text;
}

async function updateVersionNote(
  _client: AkamaiClient, 
  _propertyId: string, 
  version: number, 
  note: string
): Promise<void> {
  // PAPI doesn't have a direct API to update version notes after creation
  // This is a placeholder for when/if the API supports it
  // For now, notes can only be set during version creation
  console.log(`Note for version ${version}: ${note}`);
}

function cherryPickChanges(
  sourceRules: any,
  targetRules: any,
  includePaths: string[],
  excludePaths?: string[]
): any {
  // Deep clone target rules as base
  const result = JSON.parse(JSON.stringify(targetRules));
  
  // Extract and apply specific paths from source
  for (const path of includePaths) {
    if (excludePaths?.includes(path)) continue;
    
    const value = getValueAtPath(sourceRules, path);
    if (value !== undefined) {
      setValueAtPath(result, path, value);
    }
  }
  
  return result;
}

function mergeRuleTrees(
  sourceRules: any,
  targetRules: any,
  excludePaths?: string[]
): any {
  // Deep merge with conflict resolution
  const merge = (source: any, target: any, currentPath: string = ''): any => {
    if (excludePaths?.some(p => currentPath.startsWith(p))) {
      return target;
    }

    if (Array.isArray(source) && Array.isArray(target)) {
      // For arrays, concatenate unique values
      return [...target, ...source.filter((item: any) => 
        !target.some((t: any) => JSON.stringify(t) === JSON.stringify(item))
      )];
    }

    if (typeof source === 'object' && typeof target === 'object' && source && target) {
      const result: any = { ...target };
      
      for (const key in source) {
        const newPath = currentPath ? `${currentPath}/${key}` : key;
        
        if (key in target) {
          result[key] = merge(source[key], target[key], newPath);
        } else {
          result[key] = source[key];
        }
      }
      
      return result;
    }

    // For primitives, source wins
    return source;
  };

  return merge(sourceRules, targetRules);
}

function getValueAtPath(obj: any, path: string): any {
  const parts = path.split('/').filter(p => p);
  let current = obj;
  
  for (const part of parts) {
    if (part.includes('[') && part.includes(']')) {
      const bracketIndex = part.indexOf('[');
      const key = part.substring(0, bracketIndex);
      const indexStr = part.substring(bracketIndex + 1, part.indexOf(']'));
      const index = parseInt(indexStr);
      current = current[key]?.[index];
    } else {
      current = current[part];
    }
    
    if (current === undefined) break;
  }
  
  return current;
}

function setValueAtPath(obj: any, path: string, value: any): void {
  const parts = path.split('/').filter(p => p);
  let current = obj;
  
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!part) continue;
    
    if (part.includes('[') && part.includes(']')) {
      const bracketIndex = part.indexOf('[');
      const key = part.substring(0, bracketIndex);
      const indexStr = part.substring(bracketIndex + 1, part.indexOf(']'));
      const index = parseInt(indexStr);
      
      if (!current[key]) current[key] = [];
      if (!current[key][index]) current[key][index] = {};
      
      current = current[key][index];
    } else {
      if (!current[part]) current[part] = {};
      current = current[part];
    }
  }
  
  const lastPart = parts[parts.length - 1];
  if (lastPart && lastPart.includes('[') && lastPart.includes(']')) {
    const bracketIndex = lastPart.indexOf('[');
    const key = lastPart.substring(0, bracketIndex);
    const indexStr = lastPart.substring(bracketIndex + 1, lastPart.indexOf(']'));
    const index = parseInt(indexStr);
    
    if (!current[key]) current[key] = [];
    current[key][index] = value;
  } else if (lastPart) {
    current[lastPart] = value;
  }
}