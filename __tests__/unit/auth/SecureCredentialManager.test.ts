/**
 * SecureCredentialManager Test Suite
 * Comprehensive tests for encryption, decryption, and rotation of EdgeGrid credentials
 */

import { SecureCredentialManager } from '@/auth/SecureCredentialManager';
import type { EdgeGridCredentials } from '@/types/config';
import type {
  EncryptedCredential,
  CredentialRotationSchedule,
  CredentialAuditLog,
} from '@/auth/oauth/types';
import { CredentialAction } from '@/auth/oauth/types';
import { logger } from '@/utils/logger';
import { CustomerConfigManager } from '@/utils/customer-config';
import crypto from 'crypto';

// Mock dependencies
jest.mock('@/utils/logger');
jest.mock('@/utils/customer-config');

describe('SecureCredentialManager', () => {
  let credentialManager: SecureCredentialManager;
  const mockLogger = logger as jest.Mocked<typeof logger>;
  const mockConfigManager = CustomerConfigManager as jest.Mocked<typeof CustomerConfigManager>;
  
  const masterKey = 'test-master-key-32-characters-long!!';
  const testCredentials: EdgeGridCredentials = {
    client_secret: 'test-client-secret',
    host: 'https://test.akamai.com',
    access_token: 'test-access-token',
    client_token: 'test-client-token',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    // Reset singleton
    (SecureCredentialManager as any).instance = undefined;
    
    // Set up environment
    process.env.CREDENTIAL_MASTER_KEY = masterKey;
    
    credentialManager = SecureCredentialManager.getInstance(masterKey);
  });

  afterEach(() => {
    delete process.env.CREDENTIAL_MASTER_KEY;
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('getInstance', () => {
    it('should return the same instance (singleton)', () => {
      const instance1 = SecureCredentialManager.getInstance();
      const instance2 = SecureCredentialManager.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should throw error when master key not provided on first initialization', () => {
      (SecureCredentialManager as any).instance = undefined;
      expect(() => SecureCredentialManager.getInstance()).toThrow(
        'Master key required for first initialization',
      );
    });
  });

  describe('encryptCredentials', () => {
    it('should encrypt credentials successfully', async () => {
      const customerId = 'customer-123';
      const credentialId = await credentialManager.encryptCredentials(
        testCredentials,
        customerId,
      );

      expect(credentialId).toMatch(/^cred_customer-123_[a-f0-9]{16}$/);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Credentials encrypted successfully',
        expect.objectContaining({
          customerId,
          credentialId,
        }),
      );
    });

    it('should encrypt credentials with rotation schedule', async () => {
      const customerId = 'customer-123';
      const rotationSchedule: CredentialRotationSchedule = {
        autoRotate: true,
        intervalDays: 30,
        nextRotation: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        notifications: {
          enabled: true,
          daysBeforeRotation: 7,
          recipients: ['admin@example.com'],
        },
      };

      const credentialId = await credentialManager.encryptCredentials(
        testCredentials,
        customerId,
        rotationSchedule,
      );

      expect(credentialId).toBeDefined();
      
      // Timer will be set internally when rotation schedule is provided
      // We can verify this indirectly by checking the credential has a rotation schedule
    });

    it('should schedule immediate rotation if rotation is due', async () => {
      const customerId = 'customer-123';
      const rotationSchedule: CredentialRotationSchedule = {
        autoRotate: true,
        intervalDays: 30,
        nextRotation: new Date(Date.now() - 1000), // Past date
      };

      // Mock the performAutoRotation method
      const performAutoRotationSpy = jest.spyOn(
        credentialManager as any,
        'performAutoRotation',
      );
      performAutoRotationSpy.mockImplementation(() => Promise.resolve());

      await credentialManager.encryptCredentials(
        testCredentials,
        customerId,
        rotationSchedule,
      );

      expect(performAutoRotationSpy).toHaveBeenCalled();
    });

    it('should log audit trail for successful encryption', async () => {
      const customerId = 'customer-123';
      await credentialManager.encryptCredentials(testCredentials, customerId);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Credential access audit',
        expect.objectContaining({
          userId: 'system',
          customerId,
          action: CredentialAction.CREATE,
          resource: expect.stringMatching(/^credential:cred_/),
          success: true,
        }),
      );
    });

    it('should handle encryption errors', async () => {
      const customerId = 'customer-123';
      
      // Mock crypto.createCipheriv to throw an error
      const originalCreateCipheriv = crypto.createCipheriv;
      (crypto as any).createCipheriv = jest.fn().mockImplementation(() => {
        throw new Error('Encryption failed');
      });

      await expect(
        credentialManager.encryptCredentials(testCredentials, customerId),
      ).rejects.toThrow('Encryption failed');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to encrypt credentials',
        expect.objectContaining({ customerId }),
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Credential access audit',
        expect.objectContaining({
          action: CredentialAction.CREATE,
          success: false,
          error: 'Encryption failed',
        }),
      );

      // Restore original implementation
      (crypto as any).createCipheriv = originalCreateCipheriv;
    });

    it('should encrypt different credentials with different outputs', async () => {
      const customerId = 'customer-123';
      
      const credentials1: EdgeGridCredentials = {
        ...testCredentials,
        client_secret: 'secret1',
      };
      
      const credentials2: EdgeGridCredentials = {
        ...testCredentials,
        client_secret: 'secret2',
      };

      const id1 = await credentialManager.encryptCredentials(credentials1, customerId);
      const id2 = await credentialManager.encryptCredentials(credentials2, customerId);

      // Get encrypted data
      const encrypted1 = (credentialManager as any).credentials.get(id1);
      const encrypted2 = (credentialManager as any).credentials.get(id2);

      expect(encrypted1.encryptedData).not.toBe(encrypted2.encryptedData);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
      expect(encrypted1.keyDerivation.salt).not.toBe(encrypted2.keyDerivation.salt);
    });
  });

  describe('decryptCredentials', () => {
    let credentialId: string;

    beforeEach(async () => {
      credentialId = await credentialManager.encryptCredentials(
        testCredentials,
        'customer-123',
      );
    });

    it('should decrypt credentials successfully', async () => {
      const decrypted = await credentialManager.decryptCredentials(
        credentialId,
        'user-123',
      );

      expect(decrypted).toEqual(testCredentials);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Credentials decrypted successfully',
        expect.objectContaining({
          credentialId,
          customerId: 'customer-123',
          userId: 'user-123',
        }),
      );
    });

    it('should throw error for non-existent credential', async () => {
      await expect(
        credentialManager.decryptCredentials('non-existent-id', 'user-123'),
      ).rejects.toThrow('Credential not found');
    });

    it('should log audit trail for successful decryption', async () => {
      await credentialManager.decryptCredentials(credentialId, 'user-123');

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Credential access audit',
        expect.objectContaining({
          userId: 'user-123',
          customerId: 'customer-123',
          action: CredentialAction.DECRYPT,
          resource: `credential:${credentialId}`,
          success: true,
        }),
      );
    });

    it('should log audit trail for failed decryption', async () => {
      // Corrupt the encrypted data
      const credential = (credentialManager as any).credentials.get(credentialId);
      credential.encryptedData = 'corrupted-data';

      await expect(
        credentialManager.decryptCredentials(credentialId, 'user-123'),
      ).rejects.toThrow();

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Credential access audit',
        expect.objectContaining({
          userId: 'user-123',
          customerId: 'customer-123',
          action: CredentialAction.DECRYPT,
          resource: `credential:${credentialId}`,
          success: false,
        }),
      );
    });

    it('should handle missing key derivation parameters', async () => {
      const credential = (credentialManager as any).credentials.get(credentialId);
      delete credential.keyDerivation;

      await expect(
        credentialManager.decryptCredentials(credentialId, 'user-123'),
      ).rejects.toThrow('Key derivation parameters missing');
    });

    it('should handle authentication tag verification failure', async () => {
      const credential = (credentialManager as any).credentials.get(credentialId);
      credential.authTag = Buffer.from('invalid-auth-tag').toString('base64');

      await expect(
        credentialManager.decryptCredentials(credentialId, 'user-123'),
      ).rejects.toThrow();
    });
  });

  describe('rotateCredentials', () => {
    let credentialId: string;

    beforeEach(async () => {
      credentialId = await credentialManager.encryptCredentials(
        testCredentials,
        'customer-123',
      );
    });

    it('should rotate credentials successfully', async () => {
      const newCredentials: EdgeGridCredentials = {
        ...testCredentials,
        client_secret: 'new-client-secret',
        access_token: 'new-access-token',
      };

      const newCredentialId = await credentialManager.rotateCredentials(
        credentialId,
        newCredentials,
        'user-123',
      );

      expect(newCredentialId).toMatch(/^cred_customer-123_[a-f0-9]{16}$/);
      expect(newCredentialId).not.toBe(credentialId);

      // Verify old credential is removed
      const oldCredential = (credentialManager as any).credentials.get(credentialId);
      expect(oldCredential).toBeUndefined();

      // Verify new credential exists
      const newCredential = (credentialManager as any).credentials.get(
        newCredentialId,
      );
      expect(newCredential).toBeDefined();
      expect(newCredential.version).toBe(2);
      expect(newCredential.lastRotatedAt).toBeDefined();

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Credentials rotated successfully',
        expect.objectContaining({
          oldCredentialId: credentialId,
          newCredentialId,
          customerId: 'customer-123',
        }),
      );
    });

    it('should preserve rotation schedule during rotation', async () => {
      const rotationSchedule: CredentialRotationSchedule = {
        autoRotate: true,
        intervalDays: 30,
        nextRotation: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };

      const originalId = await credentialManager.encryptCredentials(
        testCredentials,
        'customer-456',
        rotationSchedule,
      );

      const newCredentials: EdgeGridCredentials = {
        ...testCredentials,
        client_secret: 'rotated-secret',
      };

      const newId = await credentialManager.rotateCredentials(
        originalId,
        newCredentials,
        'user-123',
      );

      const newCredential = (credentialManager as any).credentials.get(newId);
      expect(newCredential.rotationSchedule).toEqual(rotationSchedule);
    });

    it('should cancel rotation timer for old credential', async () => {
      const rotationSchedule: CredentialRotationSchedule = {
        autoRotate: true,
        intervalDays: 30,
        nextRotation: new Date(Date.now() + 1000),
      };

      const originalId = await credentialManager.encryptCredentials(
        testCredentials,
        'customer-789',
        rotationSchedule,
      );

      // Verify timer was set by checking internal state
      const timer = (credentialManager as any).rotationTimers.get(originalId);
      expect(timer).toBeDefined();

      const newId = await credentialManager.rotateCredentials(
        originalId,
        testCredentials,
        'user-123',
      );

      // Verify timer was cancelled by checking it's no longer in the map
      const oldTimer = (credentialManager as any).rotationTimers.get(originalId);
      expect(oldTimer).toBeUndefined();
    });

    it('should throw error for non-existent credential', async () => {
      await expect(
        credentialManager.rotateCredentials(
          'non-existent-id',
          testCredentials,
          'user-123',
        ),
      ).rejects.toThrow('Credential not found');
    });

    it('should log audit trail for successful rotation', async () => {
      const newId = await credentialManager.rotateCredentials(
        credentialId,
        testCredentials,
        'user-123',
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Credential access audit',
        expect.objectContaining({
          userId: 'user-123',
          customerId: 'customer-123',
          action: CredentialAction.ROTATE,
          resource: `credential:${credentialId}`,
          success: true,
          metadata: {
            newCredentialId: newId,
            version: 2,
          },
        }),
      );
    });
  });

  describe('updateRotationSchedule', () => {
    let credentialId: string;

    beforeEach(async () => {
      credentialId = await credentialManager.encryptCredentials(
        testCredentials,
        'customer-123',
      );
    });

    it('should update rotation schedule successfully', async () => {
      const newSchedule: CredentialRotationSchedule = {
        autoRotate: true,
        intervalDays: 60,
        nextRotation: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        notifications: {
          enabled: true,
          daysBeforeRotation: 14,
          recipients: ['security@example.com'],
        },
      };

      await credentialManager.updateRotationSchedule(
        credentialId,
        newSchedule,
        'user-123',
      );

      const credential = (credentialManager as any).credentials.get(credentialId);
      expect(credential.rotationSchedule).toEqual(newSchedule);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Rotation schedule updated',
        expect.objectContaining({
          credentialId,
          customerId: 'customer-123',
          schedule: newSchedule,
        }),
      );
    });

    it('should cancel existing timer when updating schedule', async () => {
      const initialSchedule: CredentialRotationSchedule = {
        autoRotate: true,
        intervalDays: 30,
        nextRotation: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };

      const id = await credentialManager.encryptCredentials(
        testCredentials,
        'customer-456',
        initialSchedule,
      );

      const initialTimer = (credentialManager as any).rotationTimers.get(id);
      expect(initialTimer).toBeDefined();

      const newSchedule: CredentialRotationSchedule = {
        autoRotate: true,
        intervalDays: 60,
        nextRotation: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      };

      await credentialManager.updateRotationSchedule(id, newSchedule, 'user-123');

      // Verify old timer was cleared and new one was set
      const newTimer = (credentialManager as any).rotationTimers.get(id);
      expect(newTimer).toBeDefined();
      expect(newTimer).not.toBe(initialTimer);
    });

    it('should disable auto-rotation', async () => {
      const schedule: CredentialRotationSchedule = {
        autoRotate: false,
        intervalDays: 30,
        nextRotation: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };

      await credentialManager.updateRotationSchedule(
        credentialId,
        schedule,
        'user-123',
      );

      const timer = (credentialManager as any).rotationTimers.get(credentialId);
      expect(timer).toBeUndefined();
    });

    it('should throw error for non-existent credential', async () => {
      const schedule: CredentialRotationSchedule = {
        autoRotate: true,
        intervalDays: 30,
        nextRotation: new Date(),
      };

      await expect(
        credentialManager.updateRotationSchedule(
          'non-existent-id',
          schedule,
          'user-123',
        ),
      ).rejects.toThrow('Credential not found');
    });
  });

  describe('listCustomerCredentials', () => {
    it('should list all credentials for a customer', async () => {
      const customerId = 'customer-123';
      
      // Create multiple credentials
      const id1 = await credentialManager.encryptCredentials(
        testCredentials,
        customerId,
      );
      const id2 = await credentialManager.encryptCredentials(
        { ...testCredentials, client_secret: 'different-secret' },
        customerId,
      );
      const id3 = await credentialManager.encryptCredentials(
        testCredentials,
        'different-customer',
      );

      const credentials = credentialManager.listCustomerCredentials(customerId);

      expect(credentials).toHaveLength(2);
      expect(credentials.map((c) => c.id)).toContain(id1);
      expect(credentials.map((c) => c.id)).toContain(id2);
      expect(credentials.map((c) => c.id)).not.toContain(id3);
    });

    it('should return empty array for customer with no credentials', () => {
      const credentials = credentialManager.listCustomerCredentials(
        'non-existent-customer',
      );
      expect(credentials).toEqual([]);
    });
  });

  describe('deleteCredential', () => {
    let credentialId: string;

    beforeEach(async () => {
      credentialId = await credentialManager.encryptCredentials(
        testCredentials,
        'customer-123',
      );
    });

    it('should delete credential successfully', async () => {
      await credentialManager.deleteCredential(credentialId, 'user-123');

      const credential = (credentialManager as any).credentials.get(credentialId);
      expect(credential).toBeUndefined();

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Credential deleted',
        expect.objectContaining({
          credentialId,
          customerId: 'customer-123',
        }),
      );
    });

    it('should cancel rotation timer when deleting', async () => {
      const rotationSchedule: CredentialRotationSchedule = {
        autoRotate: true,
        intervalDays: 30,
        nextRotation: new Date(Date.now() + 1000),
      };

      const id = await credentialManager.encryptCredentials(
        testCredentials,
        'customer-456',
        rotationSchedule,
      );

      const timer = (credentialManager as any).rotationTimers.get(id);
      expect(timer).toBeDefined();

      await credentialManager.deleteCredential(id, 'user-123');

      // Verify timer was cleared by checking it's no longer in the map
      const deletedTimer = (credentialManager as any).rotationTimers.get(id);
      expect(deletedTimer).toBeUndefined();
    });

    it('should throw error for non-existent credential', async () => {
      await expect(
        credentialManager.deleteCredential('non-existent-id', 'user-123'),
      ).rejects.toThrow('Credential not found');
    });

    it('should log audit trail for deletion', async () => {
      await credentialManager.deleteCredential(credentialId, 'user-123');

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Credential access audit',
        expect.objectContaining({
          userId: 'user-123',
          customerId: 'customer-123',
          action: CredentialAction.DELETE,
          resource: `credential:${credentialId}`,
          success: true,
        }),
      );
    });
  });

  describe('Automatic rotation', () => {
    it('should perform automatic rotation', async () => {
      const rotationSchedule: CredentialRotationSchedule = {
        autoRotate: true,
        intervalDays: 30,
        nextRotation: new Date(Date.now() + 1000), // 1 second from now
      };

      // Mock CustomerConfigManager
      const mockGetSection = jest.fn().mockReturnValue(testCredentials);
      mockConfigManager.getInstance = jest.fn().mockReturnValue({
        getSection: mockGetSection,
      });

      const credentialId = await credentialManager.encryptCredentials(
        testCredentials,
        'customer-123',
        rotationSchedule,
      );

      // Fast-forward time
      jest.advanceTimersByTime(1001);

      // Wait for async rotation to complete
      await Promise.resolve();

      expect(mockGetSection).toHaveBeenCalledWith('customer-123');
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Automatic credential rotation completed',
        expect.objectContaining({
          credentialId,
          customerId: 'customer-123',
        }),
      );
    });

    it('should handle automatic rotation failure', async () => {
      const rotationSchedule: CredentialRotationSchedule = {
        autoRotate: true,
        intervalDays: 30,
        nextRotation: new Date(Date.now() + 1000),
      };

      // Mock CustomerConfigManager to throw error
      mockConfigManager.getInstance = jest.fn().mockReturnValue({
        getSection: jest.fn().mockImplementation(() => {
          throw new Error('Config error');
        }),
      });

      const credentialId = await credentialManager.encryptCredentials(
        testCredentials,
        'customer-123',
        rotationSchedule,
      );

      // Fast-forward time
      jest.advanceTimersByTime(1001);

      // Wait for async rotation to complete
      await Promise.resolve();

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Automatic credential rotation failed',
        expect.objectContaining({
          credentialId,
          error: expect.any(Error),
        }),
      );
    });

    it('should send rotation notification', async () => {
      const rotationSchedule: CredentialRotationSchedule = {
        autoRotate: true,
        intervalDays: 30,
        nextRotation: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days
        notifications: {
          enabled: true,
          daysBeforeRotation: 7,
          recipients: ['admin@example.com', 'security@example.com'],
        },
      };

      const credentialId = await credentialManager.encryptCredentials(
        testCredentials,
        'customer-123',
        rotationSchedule,
      );

      // Fast-forward to notification time (3 days before rotation)
      jest.advanceTimersByTime(3 * 24 * 60 * 60 * 1000);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Credential rotation notification',
        expect.objectContaining({
          credentialId,
          customerId: 'customer-123',
          recipients: ['admin@example.com', 'security@example.com'],
        }),
      );
    });
  });

  describe('Security features', () => {
    it('should use different IVs for each encryption', async () => {
      const customerId = 'customer-123';
      
      const id1 = await credentialManager.encryptCredentials(
        testCredentials,
        customerId,
      );
      const id2 = await credentialManager.encryptCredentials(
        testCredentials,
        customerId,
      );

      const cred1 = (credentialManager as any).credentials.get(id1);
      const cred2 = (credentialManager as any).credentials.get(id2);

      expect(cred1.iv).not.toBe(cred2.iv);
    });

    it('should use different salts for key derivation', async () => {
      const customerId = 'customer-123';
      
      const id1 = await credentialManager.encryptCredentials(
        testCredentials,
        customerId,
      );
      const id2 = await credentialManager.encryptCredentials(
        testCredentials,
        customerId,
      );

      const cred1 = (credentialManager as any).credentials.get(id1);
      const cred2 = (credentialManager as any).credentials.get(id2);

      expect(cred1.keyDerivation.salt).not.toBe(cred2.keyDerivation.salt);
    });

    it('should not decrypt with wrong master key', async () => {
      const credentialId = await credentialManager.encryptCredentials(
        testCredentials,
        'customer-123',
      );

      // Create new instance with different master key
      (SecureCredentialManager as any).instance = undefined;
      const wrongKeyManager = SecureCredentialManager.getInstance('wrong-master-key');

      // Copy encrypted credential to wrong manager
      const credential = (credentialManager as any).credentials.get(credentialId);
      (wrongKeyManager as any).credentials.set(credentialId, credential);

      // Attempt to decrypt with wrong key should fail
      await expect(
        wrongKeyManager.decryptCredentials(credentialId, 'user-123'),
      ).rejects.toThrow();
    });

    it('should store master key hash securely', () => {
      const masterKeyHash = (credentialManager as any).masterKeyHash;
      expect(masterKeyHash).toBeDefined();
      expect(masterKeyHash).not.toBe(masterKey);
      expect(masterKeyHash).toHaveLength(64); // SHA-256 hex string
    });
  });

  describe('Edge cases', () => {
    it('should handle very large credentials', async () => {
      const largeCredentials: EdgeGridCredentials = {
        client_secret: 'x'.repeat(10000),
        host: 'https://test.akamai.com',
        access_token: 'y'.repeat(10000),
        client_token: 'z'.repeat(10000),
      };

      const credentialId = await credentialManager.encryptCredentials(
        largeCredentials,
        'customer-123',
      );

      const decrypted = await credentialManager.decryptCredentials(
        credentialId,
        'user-123',
      );

      expect(decrypted).toEqual(largeCredentials);
    });

    it('should handle special characters in credentials', async () => {
      const specialCredentials: EdgeGridCredentials = {
        client_secret: '!@#$%^&*()_+-=[]{}|;:"<>,.?/~`',
        host: 'https://test.akamai.com',
        access_token: '\\n\\r\\t\\0',
        client_token: '🔐🔑🛡️',
      };

      const credentialId = await credentialManager.encryptCredentials(
        specialCredentials,
        'customer-123',
      );

      const decrypted = await credentialManager.decryptCredentials(
        credentialId,
        'user-123',
      );

      expect(decrypted).toEqual(specialCredentials);
    });

    it('should handle concurrent operations', async () => {
      const operations = Array(10)
        .fill(null)
        .map((_, i) =>
          credentialManager.encryptCredentials(
            { ...testCredentials, client_secret: `secret-${i}` },
            `customer-${i}`,
          ),
        );

      const credentialIds = await Promise.all(operations);

      expect(credentialIds).toHaveLength(10);
      expect(new Set(credentialIds).size).toBe(10); // All unique

      // Decrypt all concurrently
      const decryptOperations = credentialIds.map((id) =>
        credentialManager.decryptCredentials(id, 'user-123'),
      );

      const decryptedCredentials = await Promise.all(decryptOperations);
      expect(decryptedCredentials).toHaveLength(10);
    });
  });
});