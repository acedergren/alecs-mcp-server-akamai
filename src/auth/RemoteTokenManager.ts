/**
 * Extended Token Manager for Remote MCP Access with Customer Context
 * 
 * CODE KAI: Secure remote authentication without exposing .edgerc credentials
 * 
 * This extends the base TokenManager to add:
 * - Customer context restrictions (which .edgerc sections)
 * - Tool-level permissions
 * - IP-based access control
 * - Rate limiting configuration
 * - Enhanced audit logging
 */

import { TokenManager, TokenMetadata, GeneratedToken } from './TokenManager';
import { logger } from '../utils/logger';
import { createHash } from 'crypto';

/**
 * Extended metadata for remote access tokens
 */
export interface RemoteTokenMetadata extends TokenMetadata {
  // Customer access control
  allowedCustomers?: string[];      // Which .edgerc sections can be used
  deniedCustomers?: string[];       // Explicitly denied customers
  
  // Tool permissions
  allowedTools?: string[];          // Specific tools that can be called
  allowedToolPatterns?: string[];   // Patterns like "property.*", "dns.read.*"
  deniedTools?: string[];           // Explicitly denied tools
  
  // Network restrictions
  allowedIPs?: string[];            // IP whitelist (CIDR notation)
  deniedIPs?: string[];             // IP blacklist
  
  // Rate limiting
  rateLimitPerHour?: number;        // Max requests per hour
  rateLimitPerMinute?: number;      // Max requests per minute
  
  // Usage tracking
  totalRequests?: number;           // Total requests made
  lastRequestIP?: string;           // Last request source
  requestsByCustomer?: Record<string, number>; // Requests per customer
  requestsByTool?: Record<string, number>;     // Requests per tool
}

/**
 * Token validation context for enhanced security checks
 */
export interface RemoteValidationContext {
  requestIP?: string;               // Client IP address
  requestedCustomer?: string;       // Which customer context is requested
  requestedTool?: string;           // Which tool is being called
  requestHeaders?: Record<string, string>; // Additional headers for context
}

/**
 * Enhanced validation result with detailed permissions
 */
export interface RemoteValidationResult {
  valid: boolean;
  tokenId?: string;
  metadata?: RemoteTokenMetadata;
  allowedCustomers?: string[];
  error?: string;
  errorCode?: 'EXPIRED' | 'INVALID' | 'DENIED_CUSTOMER' | 'DENIED_TOOL' | 'DENIED_IP' | 'RATE_LIMITED';
}

/**
 * Remote Token Manager with enhanced security features
 */
export class RemoteTokenManager extends TokenManager {
  private static remoteInstance: RemoteTokenManager;
  
  // Rate limiting cache (tokenId -> request timestamps)
  private rateLimitCache: Map<string, number[]> = new Map();
  
  /**
   * Get singleton instance of RemoteTokenManager
   */
  static getInstance(): RemoteTokenManager {
    if (!RemoteTokenManager.remoteInstance) {
      RemoteTokenManager.remoteInstance = new RemoteTokenManager();
    }
    return RemoteTokenManager.remoteInstance;
  }
  
  /**
   * Generate a remote access token with customer and tool restrictions
   */
  async generateRemoteToken(params: {
    description?: string;
    expiresInDays?: number;
    allowedCustomers?: string[];
    allowedTools?: string[];
    allowedToolPatterns?: string[];
    allowedIPs?: string[];
    rateLimitPerHour?: number;
    rateLimitPerMinute?: number;
  }): Promise<GeneratedToken> {
    // Generate base token
    const baseToken = await this.generateToken({
      description: params.description,
      expiresInDays: params.expiresInDays
    });
    
    // Extend metadata with remote access controls
    const metadata = await this.getTokenMetadata(baseToken.tokenId);
    if (metadata) {
      const remoteMetadata: RemoteTokenMetadata = {
        ...metadata,
        allowedCustomers: params.allowedCustomers,
        allowedTools: params.allowedTools,
        allowedToolPatterns: params.allowedToolPatterns,
        allowedIPs: params.allowedIPs,
        rateLimitPerHour: params.rateLimitPerHour || 1000,
        rateLimitPerMinute: params.rateLimitPerMinute || 60,
        totalRequests: 0,
        requestsByCustomer: {},
        requestsByTool: {}
      };
      
      // Update stored metadata
      await this.updateTokenMetadata(baseToken.tokenId, remoteMetadata);
      
      logger.info({
        tokenId: baseToken.tokenId,
        allowedCustomers: params.allowedCustomers,
        allowedTools: params.allowedTools?.length,
        rateLimitPerHour: remoteMetadata.rateLimitPerHour
      }, 'Generated remote access token');
    }
    
    return baseToken;
  }
  
  /**
   * Validate token with enhanced context checking
   */
  async validateRemoteToken(
    bearerToken: string, 
    context: RemoteValidationContext
  ): Promise<RemoteValidationResult> {
    // Basic token validation
    const baseResult = await this.validateToken(bearerToken);
    if (!baseResult.valid || !baseResult.tokenId) {
      return {
        valid: false,
        error: baseResult.error,
        errorCode: 'INVALID'
      };
    }
    
    // Get extended metadata
    const metadata = await this.getTokenMetadata(baseResult.tokenId) as RemoteTokenMetadata;
    if (!metadata) {
      return {
        valid: false,
        error: 'Token metadata not found',
        errorCode: 'INVALID'
      };
    }
    
    // Check IP restrictions
    if (context.requestIP && !this.isIPAllowed(context.requestIP, metadata)) {
      logger.warn({
        tokenId: baseResult.tokenId,
        requestIP: context.requestIP,
        allowedIPs: metadata.allowedIPs
      }, 'Token access denied - IP not allowed');
      
      return {
        valid: false,
        tokenId: baseResult.tokenId,
        error: 'Access denied from this IP address',
        errorCode: 'DENIED_IP'
      };
    }
    
    // Check customer restrictions
    if (context.requestedCustomer && !this.isCustomerAllowed(context.requestedCustomer, metadata)) {
      logger.warn({
        tokenId: baseResult.tokenId,
        requestedCustomer: context.requestedCustomer,
        allowedCustomers: metadata.allowedCustomers
      }, 'Token access denied - customer not allowed');
      
      return {
        valid: false,
        tokenId: baseResult.tokenId,
        error: `Access denied for customer: ${context.requestedCustomer}`,
        errorCode: 'DENIED_CUSTOMER'
      };
    }
    
    // Check tool permissions
    if (context.requestedTool && !this.isToolAllowed(context.requestedTool, metadata)) {
      logger.warn({
        tokenId: baseResult.tokenId,
        requestedTool: context.requestedTool,
        allowedTools: metadata.allowedTools
      }, 'Token access denied - tool not allowed');
      
      return {
        valid: false,
        tokenId: baseResult.tokenId,
        error: `Access denied for tool: ${context.requestedTool}`,
        errorCode: 'DENIED_TOOL'
      };
    }
    
    // Check rate limits
    const rateLimitResult = await this.checkRateLimit(baseResult.tokenId, metadata);
    if (!rateLimitResult.allowed) {
      logger.warn({
        tokenId: baseResult.tokenId,
        limit: rateLimitResult.limit,
        window: rateLimitResult.window
      }, 'Token rate limited');
      
      return {
        valid: false,
        tokenId: baseResult.tokenId,
        error: `Rate limit exceeded: ${rateLimitResult.limit} requests per ${rateLimitResult.window}`,
        errorCode: 'RATE_LIMITED'
      };
    }
    
    // Update usage statistics
    await this.recordTokenUsage(baseResult.tokenId, context);
    
    return {
      valid: true,
      tokenId: baseResult.tokenId,
      metadata: metadata,
      allowedCustomers: metadata.allowedCustomers || ['default']
    };
  }
  
  /**
   * Check if IP is allowed
   */
  private isIPAllowed(requestIP: string, metadata: RemoteTokenMetadata): boolean {
    // If no IP restrictions, allow all
    if (!metadata.allowedIPs || metadata.allowedIPs.length === 0) {
      return true;
    }
    
    // Check if IP is in allowed list (simplified - in production use proper CIDR matching)
    return metadata.allowedIPs.some(allowedIP => {
      if (allowedIP.includes('/')) {
        // CIDR notation - would need proper implementation
        logger.debug('CIDR matching not implemented in example');
        return true;
      }
      return allowedIP === requestIP;
    });
  }
  
  /**
   * Check if customer is allowed
   */
  private isCustomerAllowed(customer: string, metadata: RemoteTokenMetadata): boolean {
    // Check denied list first
    if (metadata.deniedCustomers?.includes(customer)) {
      return false;
    }
    
    // If no allowed list, allow all (except denied)
    if (!metadata.allowedCustomers || metadata.allowedCustomers.length === 0) {
      return true;
    }
    
    // Check allowed list
    return metadata.allowedCustomers.includes(customer);
  }
  
  /**
   * Check if tool is allowed
   */
  private isToolAllowed(tool: string, metadata: RemoteTokenMetadata): boolean {
    // Check denied list first
    if (metadata.deniedTools?.includes(tool)) {
      return false;
    }
    
    // Check exact tool matches
    if (metadata.allowedTools?.includes(tool)) {
      return true;
    }
    
    // Check pattern matches (e.g., "property.*" matches "property.list")
    if (metadata.allowedToolPatterns) {
      return metadata.allowedToolPatterns.some(pattern => {
        const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
        return regex.test(tool);
      });
    }
    
    // If no restrictions, allow all (except denied)
    return !metadata.allowedTools || metadata.allowedTools.length === 0;
  }
  
  /**
   * Check rate limits
   */
  private async checkRateLimit(
    tokenId: string, 
    metadata: RemoteTokenMetadata
  ): Promise<{ allowed: boolean; limit?: number; window?: string }> {
    const now = Date.now();
    
    // Get or create rate limit cache for this token
    let timestamps = this.rateLimitCache.get(tokenId) || [];
    
    // Clean old timestamps
    const oneHourAgo = now - (60 * 60 * 1000);
    const oneMinuteAgo = now - (60 * 1000);
    timestamps = timestamps.filter(ts => ts > oneHourAgo);
    
    // Check per-minute limit
    if (metadata.rateLimitPerMinute) {
      const recentRequests = timestamps.filter(ts => ts > oneMinuteAgo);
      if (recentRequests.length >= metadata.rateLimitPerMinute) {
        return { 
          allowed: false, 
          limit: metadata.rateLimitPerMinute, 
          window: 'minute' 
        };
      }
    }
    
    // Check per-hour limit
    if (metadata.rateLimitPerHour && timestamps.length >= metadata.rateLimitPerHour) {
      return { 
        allowed: false, 
        limit: metadata.rateLimitPerHour, 
        window: 'hour' 
      };
    }
    
    // Add current timestamp
    timestamps.push(now);
    this.rateLimitCache.set(tokenId, timestamps);
    
    return { allowed: true };
  }
  
  /**
   * Record token usage for analytics and audit
   */
  private async recordTokenUsage(
    tokenId: string, 
    context: RemoteValidationContext
  ): Promise<void> {
    const metadata = await this.getTokenMetadata(tokenId) as RemoteTokenMetadata;
    if (!metadata) return;
    
    // Update usage statistics
    metadata.totalRequests = (metadata.totalRequests || 0) + 1;
    metadata.lastUsedAt = new Date();
    metadata.lastRequestIP = context.requestIP;
    
    // Track by customer
    if (context.requestedCustomer) {
      metadata.requestsByCustomer = metadata.requestsByCustomer || {};
      metadata.requestsByCustomer[context.requestedCustomer] = 
        (metadata.requestsByCustomer[context.requestedCustomer] || 0) + 1;
    }
    
    // Track by tool
    if (context.requestedTool) {
      metadata.requestsByTool = metadata.requestsByTool || {};
      metadata.requestsByTool[context.requestedTool] = 
        (metadata.requestsByTool[context.requestedTool] || 0) + 1;
    }
    
    // Update stored metadata
    await this.updateTokenMetadata(tokenId, metadata);
    
    // Log usage for audit
    logger.info({
      tokenId,
      customer: context.requestedCustomer,
      tool: context.requestedTool,
      ip: context.requestIP,
      totalRequests: metadata.totalRequests
    }, 'Token usage recorded');
  }
  
  /**
   * Get token usage statistics
   */
  async getTokenStats(tokenId: string): Promise<{
    totalRequests: number;
    requestsByCustomer: Record<string, number>;
    requestsByTool: Record<string, number>;
    lastUsedAt?: Date;
    lastRequestIP?: string;
  } | null> {
    const metadata = await this.getTokenMetadata(tokenId) as RemoteTokenMetadata;
    if (!metadata) return null;
    
    return {
      totalRequests: metadata.totalRequests || 0,
      requestsByCustomer: metadata.requestsByCustomer || {},
      requestsByTool: metadata.requestsByTool || {},
      lastUsedAt: metadata.lastUsedAt,
      lastRequestIP: metadata.lastRequestIP
    };
  }
  
  /**
   * Helper methods that need to be exposed from base class
   */
  protected async getTokenMetadata(tokenId: string): Promise<TokenMetadata | null> {
    // This would need to be implemented or exposed in base TokenManager
    // For now, using a simplified approach
    const tokens = await this.listTokens();
    return tokens.find(t => t.tokenId === tokenId) || null;
  }
  
  protected async updateTokenMetadata(tokenId: string, metadata: RemoteTokenMetadata): Promise<void> {
    // This would need to be implemented in base TokenManager
    // For now, just logging
    logger.debug({ tokenId }, 'Would update token metadata');
  }
  
  protected async listTokens(): Promise<TokenMetadata[]> {
    // This would need to be exposed from base TokenManager
    return [];
  }
}