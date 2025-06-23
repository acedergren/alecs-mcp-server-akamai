/**
 * Simple Token Authentication Manager for MCP Remote Access
 * Provides basic bearer token authentication without external IDPs
 */

import { createHash, randomBytes, createCipheriv, createDecipheriv, scrypt } from 'crypto';
import { logger } from '../utils/logger';
import { promisify } from 'util';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const scryptAsync = promisify(scrypt);

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
  private masterKey: string;
  private storageDir: string;
  
  // In-memory cache for performance (token hash -> metadata)
  private tokenCache: Map<string, TokenMetadata> = new Map();
  
  // Encryption configuration
  private readonly algorithm = 'aes-256-gcm';
  private readonly saltLength = 32;
  private readonly ivLength = 16;
  private readonly tagLength = 16;
  private readonly keyLength = 32;
  
  private constructor() {
    // Initialize with master key from environment or generate one
    this.masterKey = process.env.TOKEN_MASTER_KEY || this.generateMasterKey();
    this.storageDir = process.env.TOKEN_STORAGE_DIR || join(process.cwd(), '.tokens');
    
    // Ensure storage directory exists
    this.ensureStorageDir();
    
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
      await this.storeTokenMetadata(metadata);
      
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
        await this.loadTokensFromStorage();
        metadata = this.tokenCache.get(tokenHash);
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
      // Reload from storage to ensure fresh data
      await this.loadTokensFromStorage();
      return Array.from(this.tokenCache.values());
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
      const oldMetadata = await this.getTokenMetadata(oldTokenId);
      if (!oldMetadata) {
        return {
          success: false,
          error: 'Token not found',
        };
      }
      
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
      const metadata = await this.getTokenMetadata(tokenId);
      if (!metadata) {
        return false;
      }
      
      metadata.isActive = false;
      
      // Update storage
      await this.storeTokenMetadata(metadata);
      
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
   * Ensure storage directory exists
   */
  private async ensureStorageDir(): Promise<void> {
    if (!existsSync(this.storageDir)) {
      await mkdir(this.storageDir, { recursive: true });
    }
  }
  
  /**
   * Derive encryption key from master key
   */
  private async deriveKey(salt: Buffer): Promise<Buffer> {
    return (await scryptAsync(this.masterKey, salt, this.keyLength)) as Buffer;
  }
  
  /**
   * Encrypt data
   */
  private async encrypt(data: string): Promise<{ encrypted: string; salt: string; iv: string; authTag: string }> {
    const salt = randomBytes(this.saltLength);
    const iv = randomBytes(this.ivLength);
    const key = await this.deriveKey(salt);
    
    const cipher = createCipheriv(this.algorithm, key, iv);
    const encrypted = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);
    const authTag = (cipher as any).getAuthTag();
    
    return {
      encrypted: encrypted.toString('base64'),
      salt: salt.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
    };
  }
  
  /**
   * Decrypt data
   */
  private async decrypt(encryptedData: { encrypted: string; salt: string; iv: string; authTag: string }): Promise<string> {
    const salt = Buffer.from(encryptedData.salt, 'base64');
    const iv = Buffer.from(encryptedData.iv, 'base64');
    const authTag = Buffer.from(encryptedData.authTag, 'base64');
    const encrypted = Buffer.from(encryptedData.encrypted, 'base64');
    
    const key = await this.deriveKey(salt);
    const decipher = createDecipheriv(this.algorithm, key, iv);
    (decipher as any).setAuthTag(authTag);
    
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  }
  
  /**
   * Store token metadata
   */
  private async storeTokenMetadata(metadata: TokenMetadata): Promise<void> {
    const filename = join(this.storageDir, `${metadata.tokenId}.json`);
    const encryptedData = await this.encrypt(JSON.stringify(metadata));
    await writeFile(filename, JSON.stringify(encryptedData), 'utf8');
  }
  
  /**
   * Get token metadata by ID
   */
  private async getTokenMetadata(tokenId: string): Promise<TokenMetadata | null> {
    try {
      const filename = join(this.storageDir, `${tokenId}.json`);
      const data = await readFile(filename, 'utf8');
      const encryptedData = JSON.parse(data);
      const decrypted = await this.decrypt(encryptedData);
      const metadata = JSON.parse(decrypted) as TokenMetadata;
      
      // Convert date strings back to Date objects
      metadata.createdAt = new Date(metadata.createdAt);
      if (metadata.lastUsedAt) {metadata.lastUsedAt = new Date(metadata.lastUsedAt);}
      if (metadata.expiresAt) {metadata.expiresAt = new Date(metadata.expiresAt);}
      
      return metadata;
    } catch (error) {
      // Token not found or decryption failed
      return null;
    }
  }
  
  /**
   * Load tokens from storage into cache
   */
  private async loadTokensFromStorage(): Promise<void> {
    try {
      this.tokenCache.clear();
      
      // Ensure directory exists
      await this.ensureStorageDir();
      
      // Read directory contents
      const { readdir } = await import('fs/promises');
      const dirFiles = await readdir(this.storageDir).catch(() => []);
      
      for (const file of dirFiles) {
        if (file.endsWith('.json')) {
          try {
            const data = await readFile(join(this.storageDir, file), 'utf8');
            const encryptedData = JSON.parse(data);
            const decrypted = await this.decrypt(encryptedData);
            const metadata = JSON.parse(decrypted) as TokenMetadata;
            
            // Convert date strings back to Date objects
            metadata.createdAt = new Date(metadata.createdAt);
            if (metadata.lastUsedAt) {metadata.lastUsedAt = new Date(metadata.lastUsedAt);}
            if (metadata.expiresAt) {metadata.expiresAt = new Date(metadata.expiresAt);}
            
            if (metadata.isActive) {
              this.tokenCache.set(metadata.tokenHash, metadata);
            }
          } catch (error) {
            logger.warn(`Failed to load token file ${file}`, { error });
          }
        }
      }
      
      logger.info(`Loaded ${this.tokenCache.size} active tokens into cache`);
    } catch (error) {
      logger.error('Failed to load tokens from storage', { error });
    }
  }
}