/**
 * Cache Management Tools
 * Tools for managing the property cache
 */

import { z } from 'zod';
import { type AkamaiClient } from '../akamai-client';
import { type MCPToolResponse } from '../types';
import { logger } from '../utils/logger';

/**
 * Preload property cache
 */
export async function preloadPropertyCache(
  client: AkamaiClient,
  args: {
    force?: boolean;
    maxGroups?: number;
    customer?: string;
  }
): Promise<MCPToolResponse> {
  try {
    const cache = (client as any).propertyCache;
    
    if (!cache) {
      return {
        content: [{
          type: 'text',
          text: '❌ Property cache is not configured. Make sure Valkey/Redis is running and VALKEY_HOST is set.',
        }],
      };
    }
    
    logger.info('Starting property cache preload...', args);
    
    const stats = await cache.preloadProperties({
      force: args.force,
      maxGroups: args.maxGroups,
    });
    
    let text = '# Property Cache Preload Complete\n\n';
    text += '## Statistics\n';
    text += `- **Properties Cached:** ${stats.totalProperties}\n`;
    text += `- **Groups Processed:** ${stats.totalGroups}\n`;
    text += `- **Contracts Found:** ${stats.totalContracts}\n`;
    text += `- **Duration:** ${Math.round(stats.duration / 1000)} seconds\n`;
    text += `- **Errors:** ${stats.errors}\n\n`;
    
    if (stats.totalProperties > 0) {
      text += '✅ **Cache is now populated!**\n\n';
      text += 'Property lookups by name will now be instant.\n\n';
      text += '**Example usage:**\n';
      text += '```\n';
      text += 'get property my-property-name  # This will be fast!\n';
      text += '```';
    } else {
      text += '⚠️ **No properties were cached.** Check your API credentials and permissions.';
    }
    
    return {
      content: [{ type: 'text', text }],
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: `❌ Failed to preload cache: ${error.message || 'Unknown error'}`,
      }],
    };
  }
}

/**
 * Get cache status
 */
export async function getCacheStatus(
  client: AkamaiClient,
  args: { customer?: string }
): Promise<MCPToolResponse> {
  try {
    const cache = (client as any).propertyCache;
    
    if (!cache) {
      return {
        content: [{
          type: 'text',
          text: '❌ Property cache is not configured. Make sure Valkey/Redis is running and VALKEY_HOST is set.',
        }],
      };
    }
    
    const stats = await cache.getCacheStats();
    
    let text = '# Property Cache Status\n\n';
    text += `- **Status:** ${stats.cacheStatus}\n`;
    text += `- **Cached Properties:** ${stats.totalCachedProperties}\n`;
    
    if (stats.lastPreload) {
      const age = Date.now() - stats.lastPreload.getTime();
      const ageMinutes = Math.round(age / 60000);
      const ageHours = Math.round(age / 3600000);
      
      text += `- **Last Preload:** ${stats.lastPreload.toLocaleString()}`;
      if (ageMinutes < 60) {
        text += ` (${ageMinutes} minutes ago)\n`;
      } else {
        text += ` (${ageHours} hours ago)\n`;
      }
    } else {
      text += `- **Last Preload:** Never\n`;
    }
    
    text += '\n## Cache Benefits\n';
    text += '- ⚡ Instant property lookups by name\n';
    text += '- 🚀 No more timeouts on property searches\n';
    text += '- 💾 Reduced API calls to Akamai\n\n';
    
    if (stats.totalCachedProperties === 0) {
      text += '**To populate the cache, run:**\n';
      text += '```\n';
      text += 'preload property cache\n';
      text += '```';
    }
    
    return {
      content: [{ type: 'text', text }],
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: `❌ Failed to get cache status: ${error.message || 'Unknown error'}`,
      }],
    };
  }
}

/**
 * Clear property cache
 */
export async function clearPropertyCache(
  client: AkamaiClient,
  args: { 
    propertyId?: string;
    propertyName?: string;
    customer?: string;
  }
): Promise<MCPToolResponse> {
  try {
    const cache = (client as any).propertyCache;
    
    if (!cache) {
      return {
        content: [{
          type: 'text',
          text: '❌ Property cache is not configured.',
        }],
      };
    }
    
    if (args.propertyId || args.propertyName) {
      // Clear specific property
      await cache.invalidateProperty(args.propertyId || '', args.propertyName);
      
      return {
        content: [{
          type: 'text',
          text: `✅ Cleared cache for property: ${args.propertyId || args.propertyName}`,
        }],
      };
    } else {
      // Clear all (by invalidating the main key)
      await cache.invalidateProperty('*');
      
      return {
        content: [{
          type: 'text',
          text: '✅ Cleared entire property cache. Run "preload property cache" to repopulate.',
        }],
      };
    }
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: `❌ Failed to clear cache: ${error.message || 'Unknown error'}`,
      }],
    };
  }
}

// Tool schemas
export const PreloadPropertyCacheSchema = z.object({
  force: z.boolean().optional().describe('Force reload even if recently cached'),
  maxGroups: z.number().optional().describe('Maximum number of groups to process'),
  customer: z.string().optional().describe('Customer section name'),
});

export const GetCacheStatusSchema = z.object({
  customer: z.string().optional().describe('Customer section name'),
});

export const ClearPropertyCacheSchema = z.object({
  propertyId: z.string().optional().describe('Specific property ID to clear'),
  propertyName: z.string().optional().describe('Specific property name to clear'),
  customer: z.string().optional().describe('Customer section name'),
});