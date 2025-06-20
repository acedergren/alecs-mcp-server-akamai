/**
 * Secure Credential Manager
 * Handles encryption, decryption, and rotation of EdgeGrid credentials
 */

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scrypt,
  createHash,
} from 'crypto';
import { promisify } from 'util';

import {
  EncryptedCredential,
  CredentialRotationSchedule,
  CredentialAuditLog,
  CredentialAction,
} from './oauth/types';

import type { EdgeGridCredentials } from '@/types/config';
import { CustomerConfigManager } from '@/utils/customer-config';
import { logger } from '@/utils/logger';

const scryptAsync = promisify(scrypt);

/**
 * Encryption configuration
 */
interface EncryptionConfig {
  algorithm: string;
  keyLength: number;
  saltLength: number;
  ivLength: number;
  tagLength: number;
  iterations: number;
}

/**
 * Default encryption configuration using AES-256-GCM
 */
const DEFAULT_ENCRYPTION_CONFIG: EncryptionConfig = {
  algorithm: 'aes-256-gcm',
  keyLength: 32,
  saltLength: 32,
  ivLength: 16,
  tagLength: 16,
  iterations: 100000,
};

/**
 * Secure credential manager for handling encrypted EdgeGrid credentials
 */
export class SecureCredentialManager {
  private static instance: SecureCredentialManager;
  private readonly encryptionConfig: EncryptionConfig;
  private readonly masterKeyHash: string;
  private credentials: Map<string, EncryptedCredential> = new Map();
  private rotationTimers: Map<string, NodeJS.Timeout> = new Map();

  private constructor(masterKey: string, config?: Partial<EncryptionConfig>) {
    this.encryptionConfig = { ...DEFAULT_ENCRYPTION_CONFIG, ...config };

    // Store hash of master key for verification
    this.masterKeyHash = createHash('sha256').update(masterKey).digest('hex');

    // Initialize credential storage
    this.loadStoredCredentials();
  }

  /**
   * Get singleton instance
   */
  static getInstance(masterKey?: string): SecureCredentialManager {
    if (!SecureCredentialManager.instance) {
      if (!masterKey) {
        throw new Error('Master key required for first initialization');
      }
      SecureCredentialManager.instance = new SecureCredentialManager(masterKey);
    }
    return SecureCredentialManager.instance;
  }

  /**
   * Encrypt EdgeGrid credentials
   */
  async encryptCredentials(
    credentials: EdgeGridCredentials,
    customerId: string,
    rotationSchedule?: CredentialRotationSchedule,
  ): Promise<string> {
    try {
      // Generate encryption parameters
      const salt = randomBytes(this.encryptionConfig.saltLength);
      const iv = randomBytes(this.encryptionConfig.ivLength);

      // Derive encryption key from master key
      const key = await this.deriveKey(this.getMasterKey(), salt);

      // Create cipher
      const cipher = createCipheriv(this.encryptionConfig.algorithm, key, iv);

      // Encrypt credentials
      const credentialData = JSON.stringify(credentials);
      const encrypted = Buffer.concat([
        cipher.update(credentialData, 'utf8'),
        cipher.final(),
      ]);

      // Get authentication tag for GCM
      const authTag = (cipher as any).getAuthTag();

      // Create encrypted credential object
      const encryptedCredential: EncryptedCredential = {
        id: this.generateCredentialId(customerId),
        customerId,
        encryptedData: encrypted.toString('base64'),
        algorithm: this.encryptionConfig.algorithm,
        keyDerivation: {
          algorithm: 'scrypt',
          iterations: this.encryptionConfig.iterations,
          salt: salt.toString('base64'),
        },
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64'),
        version: 1,
        createdAt: new Date(),
        rotationSchedule,
      };

      // Store encrypted credential
      this.credentials.set(encryptedCredential.id, encryptedCredential);

      // Set up rotation if scheduled
      if (rotationSchedule?.autoRotate) {
        this.scheduleRotation(encryptedCredential.id, rotationSchedule);
      }

      // Audit log
      await this.logCredentialAccess({
        userId: 'system',
        customerId,
        action: CredentialAction.CREATE,
        resource: `credential:${encryptedCredential.id}`,
        success: true,
      });

      logger.info('Credentials encrypted successfully', {
        customerId,
        credentialId: encryptedCredential.id,
      });

      return encryptedCredential.id;
    } catch (_error) {
      logger.error('Failed to encrypt credentials', { customerId, error });

      await this.logCredentialAccess({
        userId: 'system',
        customerId,
        action: CredentialAction.CREATE,
        resource: 'credential',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  /**
   * Decrypt EdgeGrid credentials
   */
  async decryptCredentials(
    credentialId: string,
    userId: string,
  ): Promise<EdgeGridCredentials> {
    try {
      const encryptedCredential = this.credentials.get(credentialId);
      if (!encryptedCredential) {
        throw new Error('Credential not found');
      }

      // Verify key derivation parameters exist
      if (!encryptedCredential.keyDerivation) {
        throw new Error('Key derivation parameters missing');
      }

      // Derive decryption key
      const salt = Buffer.from(encryptedCredential.keyDerivation.salt, 'base64');
      const key = await this.deriveKey(this.getMasterKey(), salt);

      // Create decipher
      const iv = Buffer.from(encryptedCredential.iv, 'base64');
      const decipher = createDecipheriv(encryptedCredential.algorithm, key, iv);

      // Set authentication tag for GCM
      if (encryptedCredential.authTag) {
        const authTag = Buffer.from(encryptedCredential.authTag, 'base64');
        (decipher as any).setAuthTag(authTag);
      }

      // Decrypt data
      const encryptedData = Buffer.from(encryptedCredential.encryptedData, 'base64');
      const decrypted = Buffer.concat([
        decipher.update(encryptedData),
        decipher.final(),
      ]);

      // Parse credentials
      const credentials = JSON.parse(decrypted.toString('utf8')) as EdgeGridCredentials;

      // Audit log
      await this.logCredentialAccess({
        userId,
        customerId: encryptedCredential.customerId,
        action: CredentialAction.DECRYPT,
        resource: `credential:${credentialId}`,
        success: true,
      });

      logger.info('Credentials decrypted successfully', {
        credentialId,
        customerId: encryptedCredential.customerId,
        userId,
      });

      return credentials;
    } catch (_error) {
      logger.error('Failed to decrypt credentials', { credentialId, error });

      const encryptedCredential = this.credentials.get(credentialId);
      await this.logCredentialAccess({
        userId,
        customerId: encryptedCredential?.customerId || 'unknown',
        action: CredentialAction.DECRYPT,
        resource: `credential:${credentialId}`,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  /**
   * Rotate credentials
   */
  async rotateCredentials(
    credentialId: string,
    newCredentials: EdgeGridCredentials,
    userId: string,
  ): Promise<string> {
    try {
      const oldCredential = this.credentials.get(credentialId);
      if (!oldCredential) {
        throw new Error('Credential not found');
      }

      // Create new encrypted credential
      const newCredentialId = await this.encryptCredentials(
        newCredentials,
        oldCredential.customerId,
        oldCredential.rotationSchedule,
      );

      // Update rotation timestamp
      const newCredential = this.credentials.get(newCredentialId);
      if (newCredential) {
        newCredential.lastRotatedAt = new Date();
        newCredential.version = (oldCredential.version || 1) + 1;
      }

      // Remove old credential
      this.credentials.delete(credentialId);

      // Cancel old rotation timer
      const timer = this.rotationTimers.get(credentialId);
      if (timer) {
        clearTimeout(timer);
        this.rotationTimers.delete(credentialId);
      }

      // Audit log
      await this.logCredentialAccess({
        userId,
        customerId: oldCredential.customerId,
        action: CredentialAction.ROTATE,
        resource: `credential:${credentialId}`,
        success: true,
        metadata: {
          newCredentialId,
          version: newCredential?.version,
        },
      });

      logger.info('Credentials rotated successfully', {
        oldCredentialId: credentialId,
        newCredentialId,
        customerId: oldCredential.customerId,
      });

      return newCredentialId;
    } catch (_error) {
      logger.error('Failed to rotate credentials', { credentialId, error });

      const credential = this.credentials.get(credentialId);
      await this.logCredentialAccess({
        userId,
        customerId: credential?.customerId || 'unknown',
        action: CredentialAction.ROTATE,
        resource: `credential:${credentialId}`,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  /**
   * Update rotation schedule
   */
  async updateRotationSchedule(
    credentialId: string,
    schedule: CredentialRotationSchedule,
    userId: string,
  ): Promise<void> {
    const credential = this.credentials.get(credentialId);
    if (!credential) {
      throw new Error('Credential not found');
    }

    credential.rotationSchedule = schedule;

    // Cancel existing timer
    const existingTimer = this.rotationTimers.get(credentialId);
    if (existingTimer) {
      clearTimeout(existingTimer);
      this.rotationTimers.delete(credentialId);
    }

    // Set up new rotation if enabled
    if (schedule.autoRotate) {
      this.scheduleRotation(credentialId, schedule);
    }

    await this.logCredentialAccess({
      userId,
      customerId: credential.customerId,
      action: CredentialAction.UPDATE,
      resource: `credential:${credentialId}`,
      success: true,
      metadata: { rotationSchedule: schedule },
    });

    logger.info('Rotation schedule updated', {
      credentialId,
      customerId: credential.customerId,
      schedule,
    });
  }

  /**
   * Schedule automatic rotation
   */
  private scheduleRotation(
    credentialId: string,
    schedule: CredentialRotationSchedule,
  ): void {
    const msUntilRotation = schedule.nextRotation.getTime() - Date.now();

    if (msUntilRotation <= 0) {
      // Rotation is due immediately
      this.performAutoRotation(credentialId);
      return;
    }

    const timer = setTimeout(() => {
      this.performAutoRotation(credentialId);
    }, msUntilRotation);

    this.rotationTimers.set(credentialId, timer);

    // Schedule notification if configured
    if (schedule.notifications?.enabled) {
      const notifyMs = msUntilRotation - schedule.notifications.daysBeforeRotation * 24 * 60 * 60 * 1000;
      if (notifyMs > 0) {
        setTimeout(() => {
          this.sendRotationNotification(credentialId);
        }, notifyMs);
      }
    }
  }

  /**
   * Perform automatic rotation
   */
  private async performAutoRotation(credentialId: string): Promise<void> {
    try {
      const credential = this.credentials.get(credentialId);
      if (!credential) {
        return;
      }

      // Get current credentials from customer config
      const currentCreds = CustomerConfigManager.getInstance().getSection(
        credential.customerId,
      );

      // In a real implementation, this would generate new credentials
      // For now, we'll just re-encrypt the existing ones
      await this.rotateCredentials(credentialId, currentCreds, 'system');

      logger.info('Automatic credential rotation completed', {
        credentialId,
        customerId: credential.customerId,
      });
    } catch (_error) {
      logger.error('Automatic credential rotation failed', {
        credentialId,
        error,
      });
    }
  }

  /**
   * Send rotation notification
   */
  private async sendRotationNotification(credentialId: string): Promise<void> {
    const credential = this.credentials.get(credentialId);
    if (!credential || !credential.rotationSchedule?.notifications) {
      return;
    }

    // In a real implementation, this would send emails/notifications
    logger.info('Credential rotation notification', {
      credentialId,
      customerId: credential.customerId,
      recipients: credential.rotationSchedule.notifications.recipients,
    });
  }

  /**
   * Derive encryption key from master key
   */
  private async deriveKey(masterKey: string, salt: Buffer): Promise<Buffer> {
    return (await scryptAsync(
      masterKey,
      salt,
      this.encryptionConfig.keyLength,
    )) as Buffer;
  }

  /**
   * Get master key (in production, this would be from a secure key management service)
   */
  private getMasterKey(): string {
    // In production, this would retrieve from KMS/HSM
    return process.env.CREDENTIAL_MASTER_KEY || 'default-insecure-key';
  }

  /**
   * Generate credential ID
   */
  private generateCredentialId(customerId: string): string {
    return `cred_${customerId}_${randomBytes(8).toString('hex')}`;
  }

  /**
   * Load stored credentials (from database in production)
   */
  private loadStoredCredentials(): void {
    // In production, this would load from secure storage
    logger.info('Loading stored encrypted credentials');
  }

  /**
   * Log credential access
   */
  private async logCredentialAccess(
    log: Omit<CredentialAuditLog, 'id' | 'timestamp'>,
  ): Promise<void> {
    const auditLog: CredentialAuditLog = {
      ...log,
      id: randomBytes(16).toString('hex'),
      timestamp: new Date(),
    };

    // In production, persist to audit log storage
    logger.info('Credential access audit', auditLog);
  }

  /**
   * List credentials for customer
   */
  listCustomerCredentials(customerId: string): EncryptedCredential[] {
    return Array.from(this.credentials.values()).filter(
      (cred) => cred.customerId === customerId,
    );
  }

  /**
   * Delete credential
   */
  async deleteCredential(credentialId: string, userId: string): Promise<void> {
    const credential = this.credentials.get(credentialId);
    if (!credential) {
      throw new Error('Credential not found');
    }

    this.credentials.delete(credentialId);

    // Cancel rotation timer
    const timer = this.rotationTimers.get(credentialId);
    if (timer) {
      clearTimeout(timer);
      this.rotationTimers.delete(credentialId);
    }

    await this.logCredentialAccess({
      userId,
      customerId: credential.customerId,
      action: CredentialAction.DELETE,
      resource: `credential:${credentialId}`,
      success: true,
    });

    logger.info('Credential deleted', {
      credentialId,
      customerId: credential.customerId,
    });
  }
}
