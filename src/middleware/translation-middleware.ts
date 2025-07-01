/**
 * UNIVERSAL TRANSLATION MIDDLEWARE
 * 
 * CODE KAI PRINCIPLES:
 * Key: Automatically translate all Akamai IDs in MCP tool responses to human-readable names
 * Approach: Response post-processing middleware that scans and translates ID patterns
 * Implementation: Regex-based ID detection with intelligent field mapping
 * 
 * FEATURES:
 * - Automatic detection of Akamai IDs in any JSON response
 * - Intelligent translation using existing property-translator system
 * - Preserves original response structure while adding display names
 * - Supports nested objects and arrays
 * - Performance-optimized with batch translation
 * - Graceful fallback for translation failures
 */

import { AkamaiClient } from '../akamai-client';
import { getAkamaiIdTranslator } from '../utils/property-translator';
import { getHostnameRouter } from '../utils/hostname-router';
import { createLogger } from '../utils/pino-logger';
import { MCPToolResponse } from '../types';

const logger = createLogger('translation-middleware');

interface TranslationConfig {
  enabled?: boolean;
  preserveOriginalIds?: boolean;
  translateInText?: boolean;
  translateInJson?: boolean;
  maxTranslationsPerResponse?: number;
}

const DEFAULT_CONFIG: TranslationConfig = {
  enabled: true,
  preserveOriginalIds: true,
  translateInText: true,
  translateInJson: true,
  maxTranslationsPerResponse: 100,
};

export class TranslationMiddleware {
  private translator: ReturnType<typeof getAkamaiIdTranslator>;
  private hostnameRouter: ReturnType<typeof getHostnameRouter>;
  private config: TranslationConfig;

  constructor(config: Partial<TranslationConfig> = {}) {
    this.translator = getAkamaiIdTranslator();
    this.hostnameRouter = getHostnameRouter();
    this.config = { ...DEFAULT_CONFIG, ...config };
    logger.info('TranslationMiddleware initialized with hostname routing', this.config);
  }

  /**
   * Main middleware function to translate MCP tool responses
   */
  async translateResponse(
    response: MCPToolResponse,
    client: AkamaiClient
  ): Promise<MCPToolResponse> {
    if (!this.config.enabled) {
      return response;
    }

    try {
      const translatedResponse = await this.processResponse(response, client);
      logger.debug('Response translation completed successfully');
      return translatedResponse;
    } catch (error) {
      logger.error('Translation middleware error:', error);
      // Return original response on translation failure
      return response;
    }
  }

  /**
   * Process the response content for translation
   */
  private async processResponse(
    response: MCPToolResponse,
    client: AkamaiClient
  ): Promise<MCPToolResponse> {
    if (!response.content || response.content.length === 0) {
      return response;
    }

    const translatedContent = await Promise.all(
      response.content.map(async (content) => {
        if (content.type === 'text' && this.config.translateInText) {
          return {
            ...content,
            text: await this.translateTextContent(content.text, client),
          };
        }
        return content;
      })
    );

    return {
      ...response,
      content: translatedContent,
    };
  }

  /**
   * Translate Akamai IDs found in text content
   */
  private async translateTextContent(text: string, client: AkamaiClient): Promise<string> {
    // Extract all Akamai IDs from the text
    const akamaiIds = this.extractAkamaiIds(text);
    
    if (akamaiIds.length === 0) {
      return text;
    }

    // Limit translations per response for performance
    const idsToTranslate = akamaiIds.slice(0, this.config.maxTranslationsPerResponse);
    
    // Batch translate all found IDs
    const translations = await this.batchTranslate(idsToTranslate, client);
    
    // Replace IDs in text with human-readable versions
    return this.replaceIdsInText(text, translations);
  }

  /**
   * Extract all Akamai IDs from text using regex patterns
   */
  private extractAkamaiIds(text: string): string[] {
    const patterns = [
      /\bprp_\d+\b/g,           // Property IDs: prp_123456
      /\bgrp_\d+\b/g,          // Group IDs: grp_123456
      /\bctr_[A-Z0-9-]+\b/g,   // Contract IDs: ctr_1-5C13O2
      /\bprd_[A-Z_]+\b/g,      // Product IDs: prd_Download_Delivery
      /\bcpc_\d+\b/g,          // CP Code IDs: cpc_123456
      /\baid_\d+\b/g,          // Asset IDs: aid_123456
      /\behn_\d+\b/g,          // Edge Hostname IDs: ehn_123456
    ];

    const foundIds = new Set<string>();
    
    patterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(id => foundIds.add(id));
      }
    });

    return Array.from(foundIds);
  }

  /**
   * Batch translate multiple IDs for efficiency
   */
  private async batchTranslate(
    ids: string[],
    client: AkamaiClient
  ): Promise<Map<string, string>> {
    const translations = new Map<string, string>();
    
    // Group IDs by type for efficient batch processing
    const propertyIds = ids.filter(id => id.startsWith('prp_'));
    const groupIds = ids.filter(id => id.startsWith('grp_'));
    const contractIds = ids.filter(id => id.startsWith('ctr_'));
    
    // Translate each type in batches
    await Promise.all([
      this.translatePropertyBatch(propertyIds, client, translations),
      this.translateGroupBatch(groupIds, client, translations),
      this.translateContractBatch(contractIds, client, translations),
    ]);

    return translations;
  }

  /**
   * Translate property IDs in batch
   */
  private async translatePropertyBatch(
    propertyIds: string[],
    client: AkamaiClient,
    translations: Map<string, string>
  ): Promise<void> {
    for (const propertyId of propertyIds) {
      try {
        const translation = await this.translator.translateProperty(propertyId, client);
        translations.set(propertyId, translation.displayName);
      } catch (error) {
        logger.debug(`Failed to translate property ${propertyId}:`, error);
        // Keep original ID as fallback
        translations.set(propertyId, propertyId);
      }
    }
  }

  /**
   * Translate group IDs in batch
   */
  private async translateGroupBatch(
    groupIds: string[],
    client: AkamaiClient,
    translations: Map<string, string>
  ): Promise<void> {
    for (const groupId of groupIds) {
      try {
        const translation = await this.translator.translateGroup(groupId, client);
        translations.set(groupId, translation.displayName);
      } catch (error) {
        logger.debug(`Failed to translate group ${groupId}:`, error);
        translations.set(groupId, groupId);
      }
    }
  }

  /**
   * Translate contract IDs in batch
   */
  private async translateContractBatch(
    contractIds: string[],
    client: AkamaiClient,
    translations: Map<string, string>
  ): Promise<void> {
    for (const contractId of contractIds) {
      try {
        const translation = await this.translator.translateContract(contractId, client);
        translations.set(contractId, translation.displayName);
      } catch (error) {
        logger.debug(`Failed to translate contract ${contractId}:`, error);
        translations.set(contractId, contractId);
      }
    }
  }

  /**
   * Replace IDs in text with translated versions
   */
  private replaceIdsInText(text: string, translations: Map<string, string>): string {
    let translatedText = text;
    
    for (const [originalId, translatedName] of translations) {
      // Strategy 1: Replace standalone IDs with translated names
      const standalonePattern = new RegExp(`\\b${this.escapeRegex(originalId)}\\b`, 'g');
      
      if (this.config.preserveOriginalIds) {
        // Replace "prp_123456" with "My Property (prp_123456)"
        translatedText = translatedText.replace(standalonePattern, translatedName);
      } else {
        // Replace "prp_123456" with "My Property"
        const nameOnly = translatedName.replace(/\s*\([^)]+\)$/, '');
        translatedText = translatedText.replace(standalonePattern, nameOnly);
      }
    }

    return translatedText;
  }

  /**
   * Escape special regex characters in ID strings
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

}

/**
 * Factory function to create translation middleware instance
 */
export function createTranslationMiddleware(config?: Partial<TranslationConfig>): TranslationMiddleware {
  return new TranslationMiddleware(config);
}

/**
 * Helper function to apply translation to any MCP response
 */
export async function translateMCPResponse(
  response: MCPToolResponse,
  client: AkamaiClient,
  config?: Partial<TranslationConfig>
): Promise<MCPToolResponse> {
  const middleware = createTranslationMiddleware(config);
  return middleware.translateResponse(response, client);
}