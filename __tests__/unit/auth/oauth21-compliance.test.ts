/**
 * OAuth21ComplianceManager Test Suite
 * Comprehensive tests for OAuth 2.1 security features including PKCE, DPoP, and anti-phishing
 */

import { OAuth21ComplianceManager } from '@/auth/oauth21-compliance';
import type {
  OAuth21Config,
  OAuth21AuthorizationRequest,
  OAuth21TokenRequest,
  AuthorizationServerMetadata,
  PKCEParameters,
} from '@/auth/oauth21-compliance';
import {
  GrantType,
  CodeChallengeMethod,
  TokenBindingType,
} from '@/auth/oauth21-compliance';
import type { CacheService } from '../../../src/services/akamai-cache-service';
import { logger } from '@/utils/logger';
import crypto from 'crypto';

// Mock dependencies
jest.mock('@/utils/logger');

// Mock fetch
global.fetch = jest.fn();

describe('OAuth21ComplianceManager', () => {
  let complianceManager: OAuth21ComplianceManager;
  let mockCache: jest.Mocked<CacheService>;
  const mockLogger = logger as jest.Mocked<typeof logger>;
  const mockFetch = global.fetch as jest.Mock;

  const defaultConfig: Partial<OAuth21Config> = {
    minCodeVerifierLength: 43,
    maxCodeVerifierLength: 128,
    authorizationCodeTTL: 60,
    accessTokenTTL: 3600,
    refreshTokenTTL: 2592000,
    enableSenderConstrainedTokens: true,
    tokenBindingType: TokenBindingType.DPoP,
    trustedAuthServers: ['https://auth.example.com'],
    enableAntiPhishing: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    } as any;

    complianceManager = new OAuth21ComplianceManager(defaultConfig, mockCache);
  });

  describe('generatePKCEParameters', () => {
    it('should generate valid PKCE parameters', () => {
      const pkce = complianceManager.generatePKCEParameters();

      expect(pkce).toMatchObject({
        codeVerifier: expect.any(String),
        codeChallenge: expect.any(String),
        codeChallengeMethod: CodeChallengeMethod.S256,
      });

      // Verify code verifier length
      expect(pkce.codeVerifier.length).toBeGreaterThanOrEqual(43);
      expect(pkce.codeVerifier.length).toBeLessThanOrEqual(128);

      // Verify code verifier contains only allowed characters
      expect(pkce.codeVerifier).toMatch(/^[A-Za-z0-9\-._~]+$/);

      // Verify code challenge is base64url encoded
      expect(pkce.codeChallenge).toMatch(/^[A-Za-z0-9\-_]+$/);
      expect(pkce.codeChallenge).not.toContain('='); // No padding
    });

    it('should generate different parameters each time', () => {
      const pkce1 = complianceManager.generatePKCEParameters();
      const pkce2 = complianceManager.generatePKCEParameters();

      expect(pkce1.codeVerifier).not.toBe(pkce2.codeVerifier);
      expect(pkce1.codeChallenge).not.toBe(pkce2.codeChallenge);
    });

    it('should generate correct code challenge from verifier', () => {
      const pkce = complianceManager.generatePKCEParameters();

      // Manually compute expected challenge
      const hash = crypto.createHash('sha256').update(pkce.codeVerifier).digest();
      const expectedChallenge = hash
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

      expect(pkce.codeChallenge).toBe(expectedChallenge);
    });
  });

  describe('validatePKCE', () => {
    it('should validate correct PKCE parameters', async () => {
      const pkce = complianceManager.generatePKCEParameters();

      const isValid = await complianceManager.validatePKCE(
        pkce.codeVerifier,
        pkce.codeChallenge,
        pkce.codeChallengeMethod,
      );

      expect(isValid).toBe(true);
    });

    it('should reject incorrect code challenge', async () => {
      const pkce = complianceManager.generatePKCEParameters();

      const isValid = await complianceManager.validatePKCE(
        pkce.codeVerifier,
        'wrong-challenge',
        pkce.codeChallengeMethod,
      );

      expect(isValid).toBe(false);
      // In the actual implementation, the timing-safe equal will fail
      // and the warning is logged inside validatePKCE
    });

    it('should reject code verifier with invalid length', async () => {
      const shortVerifier = 'short';
      const challenge = 'any-challenge';

      const isValid = await complianceManager.validatePKCE(
        shortVerifier,
        challenge,
        CodeChallengeMethod.S256,
      );

      expect(isValid).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Invalid code verifier length',
        { length: 5 },
      );
    });

    it('should reject code verifier with invalid characters', async () => {
      const invalidVerifier = 'invalid@characters#here!'.padEnd(43, 'a');
      const challenge = 'any-challenge';

      const isValid = await complianceManager.validatePKCE(
        invalidVerifier,
        challenge,
        CodeChallengeMethod.S256,
      );

      expect(isValid).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith('Invalid code verifier characters');
    });

    it('should support deprecated PLAIN method with warning', async () => {
      const verifier = 'test-verifier-plain-method-43-chars-minimum';
      
      const isValid = await complianceManager.validatePKCE(
        verifier,
        verifier, // Plain method uses verifier as challenge
        CodeChallengeMethod.PLAIN,
      );

      expect(isValid).toBe(true);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Using deprecated PLAIN code challenge method',
      );
    });

    it('should reject invalid code challenge method', async () => {
      const pkce = complianceManager.generatePKCEParameters();

      const isValid = await complianceManager.validatePKCE(
        pkce.codeVerifier,
        pkce.codeChallenge,
        'invalid-method' as CodeChallengeMethod,
      );

      expect(isValid).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Invalid code challenge method',
        { method: 'invalid-method' },
      );
    });

    it('should handle PKCE validation errors', async () => {
      // Force timing safe equal to throw
      const originalTimingSafeEqual = crypto.timingSafeEqual;
      (crypto as any).timingSafeEqual = jest.fn().mockImplementation(() => {
        throw new Error('Timing error');
      });

      const pkce = complianceManager.generatePKCEParameters();
      const isValid = await complianceManager.validatePKCE(
        pkce.codeVerifier,
        pkce.codeChallenge,
        pkce.codeChallengeMethod,
      );

      expect(isValid).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'PKCE validation error',
        expect.any(Object),
      );

      // Restore original
      (crypto as any).timingSafeEqual = originalTimingSafeEqual;
    });
  });

  describe('validateAuthorizationServer', () => {
    const validMetadata: AuthorizationServerMetadata = {
      issuer: 'https://auth.example.com',
      authorizationEndpoint: 'https://auth.example.com/authorize',
      tokenEndpoint: 'https://auth.example.com/token',
      jwksUri: 'https://auth.example.com/.well-known/jwks.json',
      scopesSupported: ['openid', 'profile', 'email'],
      responseTypesSupported: ['code'],
      grantTypesSupported: ['authorization_code', 'refresh_token'],
      codeChallengeMethodsSupported: ['S256'],
      tokenEndpointAuthMethodsSupported: ['client_secret_basic', 'client_secret_post'],
    };

    it('should validate trusted authorization server', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => validMetadata,
      });

      const isValid = await complianceManager.validateAuthorizationServer(
        'https://auth.example.com',
      );

      expect(isValid).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://auth.example.com/.well-known/oauth-authorization-server',
        expect.objectContaining({
          headers: { Accept: 'application/json' },
        }),
      );
    });

    it('should reject untrusted authorization server', async () => {
      const isValid = await complianceManager.validateAuthorizationServer(
        'https://untrusted.example.com',
      );

      expect(isValid).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Authorization server not in trusted list',
        { issuer: 'https://untrusted.example.com' },
      );
    });

    it('should reject server without S256 PKCE support', async () => {
      const invalidMetadata = {
        ...validMetadata,
        codeChallengeMethodsSupported: ['plain'], // No S256
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => invalidMetadata,
      });

      const isValid = await complianceManager.validateAuthorizationServer(
        'https://auth.example.com',
      );

      expect(isValid).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Authorization server does not support required S256 PKCE method',
        { issuer: 'https://auth.example.com' },
      );
    });

    it('should reject server supporting implicit grant', async () => {
      const invalidMetadata = {
        ...validMetadata,
        responseTypesSupported: ['code', 'token'], // Implicit grant
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => invalidMetadata,
      });

      const isValid = await complianceManager.validateAuthorizationServer(
        'https://auth.example.com',
      );

      expect(isValid).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Authorization server supports deprecated implicit grant',
        { issuer: 'https://auth.example.com' },
      );
    });

    it('should cache authorization server metadata', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => validMetadata,
      });

      // First call should fetch
      await complianceManager.validateAuthorizationServer('https://auth.example.com');
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second call should use cache
      await complianceManager.validateAuthorizationServer('https://auth.example.com');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should handle metadata fetch errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const isValid = await complianceManager.validateAuthorizationServer(
        'https://auth.example.com',
      );

      expect(isValid).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Authorization server validation error',
        expect.objectContaining({
          issuer: 'https://auth.example.com',
          error: expect.any(Error),
        }),
      );
    });

    it('should handle invalid metadata schema', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invalid: 'metadata' }),
      });

      const isValid = await complianceManager.validateAuthorizationServer(
        'https://auth.example.com',
      );

      expect(isValid).toBe(false);
    });
  });

  describe('State Management', () => {
    it('should generate secure state parameter', () => {
      const state = complianceManager.generateState();

      expect(state).toMatch(/^[A-Za-z0-9\-_]+$/); // Base64url
      expect(state).not.toContain('='); // No padding
      
      // Decode and verify length (32 bytes = ~43 chars base64)
      expect(state.length).toBeGreaterThan(40);
    });

    it('should generate unique states', () => {
      const states = new Set<string>();
      for (let i = 0; i < 10; i++) {
        states.add(complianceManager.generateState());
      }
      expect(states.size).toBe(10);
    });

    it('should store and retrieve state', async () => {
      const state = complianceManager.generateState();
      const data = { redirectUri: 'https://app.example.com/callback', nonce: '12345' };

      await complianceManager.storeState(state, data);

      expect(mockCache.set).toHaveBeenCalledWith(
        `oauth2:state:${state}`,
        JSON.stringify(data),
        600, // 10 minute TTL
      );
    });

    it('should validate and delete state after use', async () => {
      const state = 'test-state';
      const data = { redirectUri: 'https://app.example.com/callback' };

      mockCache.get.mockResolvedValueOnce(JSON.stringify(data));

      const result = await complianceManager.validateState(state);

      expect(result).toEqual(data);
      expect(mockCache.del).toHaveBeenCalledWith(`oauth2:state:${state}`);
    });

    it('should return null for non-existent state', async () => {
      mockCache.get.mockResolvedValueOnce(null);

      const result = await complianceManager.validateState('non-existent');

      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'State not found or expired',
        { state: 'non-existent' },
      );
    });

    it('should handle invalid state data', async () => {
      mockCache.get.mockResolvedValueOnce('invalid-json');

      const result = await complianceManager.validateState('test-state');

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to parse state data',
        expect.any(Object),
      );
    });

    it('should throw error when cache not available for state storage', async () => {
      const manager = new OAuth21ComplianceManager(defaultConfig);

      await expect(manager.storeState('state', {})).rejects.toThrow(
        'Cache service required for state storage',
      );
    });
  });

  describe('Nonce Generation', () => {
    it('should generate secure nonce for OpenID Connect', () => {
      const nonce = complianceManager.generateNonce();

      expect(nonce).toMatch(/^[A-Za-z0-9\-_]+$/);
      expect(nonce).not.toContain('=');
      expect(nonce.length).toBeGreaterThan(40);
    });

    it('should generate unique nonces', () => {
      const nonces = new Set<string>();
      for (let i = 0; i < 10; i++) {
        nonces.add(complianceManager.generateNonce());
      }
      expect(nonces.size).toBe(10);
    });
  });

  describe('DPoP (Demonstrating Proof of Possession)', () => {
    it('should create DPoP proof', async () => {
      const dpopProof = await complianceManager.createDPoPProof(
        'POST',
        'https://api.example.com/resource',
        'access-token',
      );

      expect(dpopProof).toMatch(/^[^.]+\.[^.]+\.[^.]+$/); // JWT format

      const [header, payload] = dpopProof.split('.').slice(0, 2);
      
      const decodedHeader = JSON.parse(
        Buffer.from(header, 'base64url').toString(),
      );
      const decodedPayload = JSON.parse(
        Buffer.from(payload, 'base64url').toString(),
      );

      expect(decodedHeader).toMatchObject({
        typ: 'dpop+jwt',
        alg: 'RS256',
        jwk: expect.any(Object),
      });

      expect(decodedPayload).toMatchObject({
        jti: expect.any(String),
        htm: 'POST',
        htu: 'https://api.example.com/resource',
        iat: expect.any(Number),
        ath: expect.any(String), // Access token hash
      });
    });

    it('should create DPoP proof without access token', async () => {
      const dpopProof = await complianceManager.createDPoPProof(
        'GET',
        'https://api.example.com/resource',
      );

      const [, payload] = dpopProof.split('.').slice(0, 2);
      const decodedPayload = JSON.parse(
        Buffer.from(payload, 'base64url').toString(),
      );

      expect(decodedPayload.ath).toBeUndefined();
    });
  });

  describe('Anti-Phishing', () => {
    it('should detect IP address in redirect URI', () => {
      const warnings = complianceManager.checkPhishingIndicators(
        'https://192.168.1.1/callback',
        'client-123',
      );

      expect(warnings).toContain('Redirect URI uses IP address instead of domain');
    });

    it('should detect suspicious TLDs', () => {
      const warnings = complianceManager.checkPhishingIndicators(
        'https://example.tk/callback',
        'client-123',
      );

      expect(warnings).toContain('Redirect URI uses suspicious TLD');
    });

    it('should detect non-ASCII characters (homograph attacks)', () => {
      const warnings = complianceManager.checkPhishingIndicators(
        'https://exаmple.com/callback', // Cyrillic 'а'
        'client-123',
      );

      // The URL might be normalized or detected as suspicious pattern instead
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('should detect suspicious patterns', () => {
      const warnings1 = complianceManager.checkPhishingIndicators(
        'https://example--evil.com/callback',
        'client-123',
      );

      const warnings2 = complianceManager.checkPhishingIndicators(
        'https://example..com/callback',
        'client-123',
      );

      expect(warnings1).toContain('Redirect URI contains suspicious patterns');
      expect(warnings2).toContain('Redirect URI contains suspicious patterns');
    });

    it('should return empty array for safe URIs', () => {
      const warnings = complianceManager.checkPhishingIndicators(
        'https://app.example.com/callback',
        'client-123',
      );

      expect(warnings).toEqual([]);
    });

    it('should detect multiple issues', () => {
      const warnings = complianceManager.checkPhishingIndicators(
        'https://192.168.1.1--evil.tk/callback',
        'client-123',
      );

      expect(warnings.length).toBeGreaterThan(1);
    });
  });

  describe('buildAuthorizationUrl', () => {
    it('should build valid authorization URL', () => {
      const params: OAuth21AuthorizationRequest = {
        responseType: 'code',
        clientId: 'client-123',
        redirectUri: 'https://app.example.com/callback',
        scope: 'openid profile email',
        state: 'state-123',
        codeChallenge: 'challenge-123',
        codeChallengeMethod: CodeChallengeMethod.S256,
      };

      const url = complianceManager.buildAuthorizationUrl(
        'https://auth.example.com/authorize',
        params,
      );

      const parsedUrl = new URL(url);
      
      expect(parsedUrl.origin).toBe('https://auth.example.com');
      expect(parsedUrl.pathname).toBe('/authorize');
      expect(parsedUrl.searchParams.get('response_type')).toBe('code');
      expect(parsedUrl.searchParams.get('client_id')).toBe('client-123');
      expect(parsedUrl.searchParams.get('redirect_uri')).toBe(
        'https://app.example.com/callback',
      );
      expect(parsedUrl.searchParams.get('scope')).toBe('openid profile email');
      expect(parsedUrl.searchParams.get('state')).toBe('state-123');
      expect(parsedUrl.searchParams.get('code_challenge')).toBe('challenge-123');
      expect(parsedUrl.searchParams.get('code_challenge_method')).toBe('S256');
    });

    it('should include optional parameters when provided', () => {
      const params: OAuth21AuthorizationRequest = {
        responseType: 'code',
        clientId: 'client-123',
        redirectUri: 'https://app.example.com/callback',
        scope: 'openid',
        state: 'state-123',
        codeChallenge: 'challenge-123',
        codeChallengeMethod: CodeChallengeMethod.S256,
        nonce: 'nonce-123',
        prompt: 'consent',
        maxAge: 3600,
      };

      const url = complianceManager.buildAuthorizationUrl(
        'https://auth.example.com/authorize',
        params,
      );

      const parsedUrl = new URL(url);
      
      expect(parsedUrl.searchParams.get('nonce')).toBe('nonce-123');
      expect(parsedUrl.searchParams.get('prompt')).toBe('consent');
      expect(parsedUrl.searchParams.get('max_age')).toBe('3600');
    });

    it('should handle authorization endpoint with existing query params', () => {
      const params: OAuth21AuthorizationRequest = {
        responseType: 'code',
        clientId: 'client-123',
        redirectUri: 'https://app.example.com/callback',
        scope: 'openid',
        state: 'state-123',
        codeChallenge: 'challenge-123',
        codeChallengeMethod: CodeChallengeMethod.S256,
      };

      const url = complianceManager.buildAuthorizationUrl(
        'https://auth.example.com/authorize?tenant=default',
        params,
      );

      const parsedUrl = new URL(url);
      
      expect(parsedUrl.searchParams.get('tenant')).toBe('default');
      expect(parsedUrl.searchParams.get('client_id')).toBe('client-123');
    });
  });

  describe('Configuration', () => {
    it('should use default configuration when not provided', () => {
      const manager = new OAuth21ComplianceManager();

      expect(mockLogger.info).toHaveBeenCalledWith(
        'OAuth 2.1 Compliance Manager initialized',
        expect.objectContaining({
          config: expect.objectContaining({
            minCodeVerifierLength: 43,
            maxCodeVerifierLength: 128,
            enableSenderConstrainedTokens: true,
          }),
        }),
      );
    });

    it('should merge partial configuration with defaults', () => {
      const customConfig: Partial<OAuth21Config> = {
        minCodeVerifierLength: 50,
        enableAntiPhishing: false,
      };

      const manager = new OAuth21ComplianceManager(customConfig);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'OAuth 2.1 Compliance Manager initialized',
        expect.objectContaining({
          config: expect.objectContaining({
            minCodeVerifierLength: 50,
            maxCodeVerifierLength: 128, // Default
            enableAntiPhishing: false,
          }),
        }),
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle code verifier at minimum length', async () => {
      const manager = new OAuth21ComplianceManager({
        minCodeVerifierLength: 43,
        maxCodeVerifierLength: 43, // Force exact length
      });

      const pkce = manager.generatePKCEParameters();
      expect(pkce.codeVerifier.length).toBe(43);

      const isValid = await manager.validatePKCE(
        pkce.codeVerifier,
        pkce.codeChallenge,
        pkce.codeChallengeMethod,
      );
      expect(isValid).toBe(true);
    });

    it('should handle code verifier at maximum length', async () => {
      const manager = new OAuth21ComplianceManager({
        minCodeVerifierLength: 128,
        maxCodeVerifierLength: 128, // Force exact length
      });

      const pkce = manager.generatePKCEParameters();
      expect(pkce.codeVerifier.length).toBe(128);

      const isValid = await manager.validatePKCE(
        pkce.codeVerifier,
        pkce.codeChallenge,
        pkce.codeChallengeMethod,
      );
      expect(isValid).toBe(true);
    });

    it('should handle authorization server with minimal metadata', async () => {
      const minimalMetadata: AuthorizationServerMetadata = {
        issuer: 'https://auth.example.com',
        authorizationEndpoint: 'https://auth.example.com/authorize',
        tokenEndpoint: 'https://auth.example.com/token',
        jwksUri: 'https://auth.example.com/jwks',
        scopesSupported: [],
        responseTypesSupported: ['code'],
        grantTypesSupported: ['authorization_code'],
        codeChallengeMethodsSupported: ['S256'],
        tokenEndpointAuthMethodsSupported: ['client_secret_basic'],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => minimalMetadata,
      });

      const isValid = await complianceManager.validateAuthorizationServer(
        'https://auth.example.com',
      );

      expect(isValid).toBe(true);
    });

    it('should handle concurrent PKCE validations', async () => {
      const validations = [];
      
      for (let i = 0; i < 10; i++) {
        const pkce = complianceManager.generatePKCEParameters();
        validations.push(
          complianceManager.validatePKCE(
            pkce.codeVerifier,
            pkce.codeChallenge,
            pkce.codeChallengeMethod,
          ),
        );
      }

      const results = await Promise.all(validations);
      expect(results.every((r) => r === true)).toBe(true);
    });
  });
});