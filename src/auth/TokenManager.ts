/**
 * Simple Token Authentication Manager for MCP Remote Access
 * Provides basic bearer token authentication without external IDPs
 */

import { createHash, randomBytes } from 'crypto';
import { SecureCredentialManager } from './SecureCredentialManager';
import { logger } from '../utils/logger';

/**
 * Token metadata stored securely
 */
export interface TokenMetadata {
  tokenId: string;
  tokenHash: string;  // SHA-256 hash of the actual token
  description?: string;
  createdAt: Date;
  lastUsedAt?: Date;
  expiresAt?: Date;
  isActive: boolean;
}

/**
 * Token validation result
 */
export interface TokenValidationResult {
  valid: boolean;
  tokenId?: string;
  error?: string;
}

/**
 * Token generation result
 */
export interface GeneratedToken {
  token: string;
  tokenId: string;
  expiresAt?: Date;
}

/**
 * Token rotation result
 */
export interface TokenRotationResult {
  success: boolean;
  newToken?: GeneratedToken;
  oldTokenId?: string;
  error?: string;
}

/**
 * Simple token-based authentication manager
 * Uses SecureCredentialManager for secure token storage
 */
export class TokenManager {
  private static instance: TokenManager;
  private credentialManager: SecureCredentialManager;
  
  // In-memory cache for performance (token hash -> metadata)
  private tokenCache: Map<string, TokenMetadata> = new Map();
  
  private constructor() {
    // Initialize with master key from environment or generate one
    const masterKey = process.env.TOKEN_MASTER_KEY || this.generateMasterKey();
    this.credentialManager = SecureCredentialManager.getInstance(masterKey);
    
    // Load tokens from storage on startup
    this.loadTokensFromStorage();
  }
  
  /**
   * Get singleton instance
   */
  static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager();
    }
    return TokenManager.instance;
  }
  
  /**
   * Generate a new API token
   */
  async generateToken(params: {
    description?: string;
    expiresInDays?: number;
  }): Promise<GeneratedToken> {
    try {
      // Generate cryptographically secure token
      const tokenValue = this.generateSecureToken();
      const tokenId = `tok_${randomBytes(8).toString('hex')}`;
      const tokenHash = this.hashToken(tokenValue);
      
      // Calculate expiration
      const expiresAt = params.expiresInDays 
        ? new Date(Date.now() + params.expiresInDays * 24 * 60 * 60 * 1000)
        : undefined;
      
      // Create token metadata
      const metadata: TokenMetadata = {
        tokenId,
        tokenHash,
        description: params.description,
        createdAt: new Date(),
        expiresAt,
        isActive: true,
      };
      
      // Store encrypted token metadata
      await this.credentialManager.storeCredentials(tokenId, {
        client_token: tokenHash,  // Store hash
        client_secret: JSON.stringify(metadata),  // Store metadata as JSON
        access_token: '',  // Not used
        host: '',  // Not used
      }, 'tokens');  // Use a fixed namespace for all tokens
      
      // Update cache
      this.tokenCache.set(tokenHash, metadata);
      
      logger.info('Generated new API token', {
        tokenId,
        description: params.description,
        expiresAt: expiresAt?.toISOString(),
      });
      
      return {
        token: tokenValue,
        tokenId,
        expiresAt,
      };
    } catch (error) {
      logger.error('Failed to generate token', { error });
      throw new Error('Failed to generate token');
    }
  }
  
  /**
   * Validate a bearer token
   */
  async validateToken(bearerToken: string): Promise<TokenValidationResult> {
    try {
      // Extract token from "Bearer <token>" format if present
      const token = bearerToken.startsWith('Bearer ') 
        ? bearerToken.substring(7)
        : bearerToken;
      
      // Hash the token for lookup
      const tokenHash = this.hashToken(token);
      
      // Check cache first
      let metadata = this.tokenCache.get(tokenHash);
      
      if (!metadata) {
        // Not in cache, check storage
        metadata = await this.findTokenInStorage(tokenHash);
        if (!metadata) {
          return { valid: false, error: 'Invalid token' };
        }
      }
      
      // Check if token is active
      if (!metadata.isActive) {
        return { valid: false, error: 'Token is deactivated' };
      }
      
      // Check expiration
      if (metadata.expiresAt && new Date() > metadata.expiresAt) {
        return { valid: false, error: 'Token has expired' };
      }
      
      // Update last used timestamp
      metadata.lastUsedAt = new Date();
      
      logger.info('Token validated successfully', {
        tokenId: metadata.tokenId,
      });
      
      return {
        valid: true,
        tokenId: metadata.tokenId,
      };
    } catch (error) {
      logger.error('Token validation failed', { error });
      return { valid: false, error: 'Token validation failed' };
    }
  }
  
  /**
   * List all tokens
   */
  async listTokens(): Promise<TokenMetadata[]> {
    try {
      const tokens: TokenMetadata[] = [];
      
      // Get all credentials
      const allCreds = await this.credentialManager.listCredentials();
      
      for (const credInfo of allCreds) {
        // Only process token entries
        if (credInfo.customerId !== 'tokens') {
          continue;
        }
        
        // Retrieve and parse metadata
        const creds = await this.credentialManager.getCredentials(credInfo.credentialId);
        if (creds && creds.client_secret) {
          try {
            const metadata = JSON.parse(creds.client_secret) as TokenMetadata;
            tokens.push(metadata);
          } catch (_e) {
            // Skip invalid entries
          }
        }
      }
      
      return tokens;
    } catch (error) {
      logger.error('Failed to list tokens', { error });
      return [];
    }
  }
  
  /**
   * Rotate a token (create new, revoke old)
   */
  async rotateToken(oldTokenId: string): Promise<TokenRotationResult> {
    try {
      // Get old token metadata
      const oldCreds = await this.credentialManager.getCredentials(oldTokenId);
      if (!oldCreds || !oldCreds.client_secret) {
        return {
          success: false,
          error: 'Token not found',
        };
      }
      
      const oldMetadata = JSON.parse(oldCreds.client_secret) as TokenMetadata;
      
      // Check if token is active
      if (!oldMetadata.isActive) {
        return {
          success: false,
          error: 'Token is already revoked',
        };
      }
      
      // Generate new token with same metadata
      const newToken = await this.generateToken({
        description: `Rotated from ${oldTokenId}: ${oldMetadata.description || 'No description'}`,
        expiresInDays: oldMetadata.expiresAt 
          ? Math.ceil((oldMetadata.expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
          : undefined,
      });
      
      // Revoke old token
      await this.revokeToken(oldTokenId);
      
      logger.info('Token rotated successfully', {
        oldTokenId,
        newTokenId: newToken.tokenId,
      });
      
      return {
        success: true,
        newToken,
        oldTokenId,
      };
    } catch (error) {
      logger.error('Failed to rotate token', { error, oldTokenId });
      return {
        success: false,
        error: 'Failed to rotate token',
      };
    }
  }
  
  /**
   * Revoke a token
   */
  async revokeToken(tokenId: string): Promise<boolean> {
    try {
      // Get token metadata
      const creds = await this.credentialManager.getCredentials(tokenId);
      if (!creds || !creds.client_secret) {
        return false;
      }
      
      const metadata = JSON.parse(creds.client_secret) as TokenMetadata;
      metadata.isActive = false;
      
      // Update storage
      await this.credentialManager.storeCredentials(tokenId, {
        ...creds,
        client_secret: JSON.stringify(metadata),
      }, 'tokens');
      
      // Remove from cache
      this.tokenCache.delete(metadata.tokenHash);
      
      logger.info('Token revoked', {
        tokenId,
      });
      
      return true;
    } catch (error) {
      logger.error('Failed to revoke token', { error, tokenId });
      return false;
    }
  }
  
  /**
   * Generate a cryptographically secure token
   */
  private generateSecureToken(): string {
    // Generate 32 bytes of random data (256 bits)
    const buffer = randomBytes(32);
    // Convert to URL-safe base64
    return buffer.toString('base64url');
  }
  
  /**
   * Hash a token using SHA-256
   */
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
  
  /**
   * Generate a master key for token encryption
   */
  private generateMasterKey(): string {
    const key = randomBytes(32).toString('hex');
    logger.warn('Generated new token master key. Set TOKEN_MASTER_KEY environment variable for production!');
    return key;
  }
  
  /**
   * Load tokens from storage into cache
   */
  private async loadTokensFromStorage(): Promise<void> {
    try {
      const allTokens = await this.listTokens();
      for (const token of allTokens) {
        if (token.isActive) {
          this.tokenCache.set(token.tokenHash, token);
        }
      }
      logger.info(`Loaded ${this.tokenCache.size} active tokens into cache`);
    } catch (error) {
      logger.error('Failed to load tokens from storage', { error });
    }
  }
  
  /**
   * Find token in storage by hash
   */
  private async findTokenInStorage(tokenHash: string): Promise<TokenMetadata | null> {
    try {
      const allTokens = await this.listTokens();
      return allTokens.find(t => t.tokenHash === tokenHash) || null;
    } catch (error) {
      logger.error('Failed to find token in storage', { error });
      return null;
    }
  }
}