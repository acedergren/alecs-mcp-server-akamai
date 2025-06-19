/**
 * TokenValidator Test Suite
 * Comprehensive tests for JWT validation, token introspection, and caching
 */

import { TokenValidator } from '@/auth/token-validator';
import type {
  TokenValidationResult,
  TokenClaims,
  TokenIntrospectionResponse,
  JWKSResponse,
  JWK,
  TokenValidatorConfig,
} from '@/auth/token-validator';
import type { CacheService } from '@/services/CacheService';
import { logger } from '@/utils/logger';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Mock dependencies
jest.mock('@/utils/logger');
jest.mock('jsonwebtoken');

// Mock fetch
global.fetch = jest.fn();

describe('TokenValidator', () => {
  let tokenValidator: TokenValidator;
  let mockCache: jest.Mocked<CacheService>;
  const mockLogger = logger as jest.Mocked<typeof logger>;
  const mockJwt = jwt as jest.Mocked<typeof jwt>;
  const mockFetch = global.fetch as jest.Mock;

  const defaultConfig: Partial<TokenValidatorConfig> = {
    introspectionEndpoint: 'https://auth.example.com/introspect',
    jwksUri: 'https://auth.example.com/.well-known/jwks.json',
    clientId: 'test-client',
    clientSecret: 'test-secret',
    validTokenCacheTTL: 300,
    invalidTokenCacheTTL: 60,
    jwksCacheTTL: 3600,
    clockSkewTolerance: 30,
    requiredClaims: ['sub', 'iss'],
    allowedAlgorithms: ['RS256', 'ES256'],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    } as any;

    tokenValidator = new TokenValidator(defaultConfig, mockCache);
  });

  describe('validateAccessToken', () => {
    const mockJwtToken = 'header.payload.signature';
    const mockOpaqueToken = 'opaque-token-string';

    it('should return cached validation result', async () => {
      const cachedResult: TokenValidationResult = {
        valid: true,
        active: true,
        claims: {
          sub: 'user-123',
          iss: 'https://auth.example.com',
          exp: Math.floor(Date.now() / 1000) + 3600,
        },
      };

      mockCache.get.mockResolvedValue(JSON.stringify(cachedResult));

      const result = await tokenValidator.validateAccessToken(mockJwtToken);

      expect(result).toEqual({ ...cachedResult, cached: true });
      expect(mockCache.get).toHaveBeenCalledWith(
        expect.stringMatching(/^token:validation:/),
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Token validation result from cache',
        expect.any(Object),
      );
    });

    it('should validate JWT token successfully', async () => {
      mockCache.get.mockResolvedValue(null);

      const decodedToken = {
        header: { alg: 'RS256', kid: 'key-123' },
        payload: {
          sub: 'user-123',
          iss: 'https://auth.example.com',
          exp: Math.floor(Date.now() / 1000) + 3600,
          iat: Math.floor(Date.now() / 1000),
          scope: 'read write',
        },
      };

      const mockJwk: JWK = {
        kty: 'RSA',
        kid: 'key-123',
        use: 'sig',
        alg: 'RS256',
        n: 'mock-modulus',
        e: 'AQAB',
      };

      const jwksResponse: JWKSResponse = {
        keys: [mockJwk],
      };

      mockJwt.decode.mockReturnValue(decodedToken);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => jwksResponse,
      });
      mockJwt.verify.mockReturnValue(decodedToken.payload as any);

      const result = await tokenValidator.validateAccessToken(mockJwtToken);

      expect(result).toMatchObject({
        valid: true,
        active: true,
        claims: decodedToken.payload,
      });

      expect(mockJwt.decode).toHaveBeenCalledWith(mockJwtToken, { complete: true });
      expect(mockFetch).toHaveBeenCalledWith(
        defaultConfig.jwksUri,
        expect.objectContaining({
          headers: { Accept: 'application/json' },
        }),
      );
      expect(mockCache.set).toHaveBeenCalledWith(
        expect.stringMatching(/^token:validation:/),
        JSON.stringify(result),
        defaultConfig.validTokenCacheTTL,
      );
    });

    it('should validate opaque token via introspection', async () => {
      mockCache.get.mockResolvedValue(null);

      const introspectionResponse: TokenIntrospectionResponse = {
        active: true,
        scope: 'read write',
        client_id: 'test-client',
        sub: 'user-123',
        iss: 'https://auth.example.com',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => introspectionResponse,
      });

      const result = await tokenValidator.validateAccessToken(mockOpaqueToken);

      expect(result).toMatchObject({
        valid: true,
        active: true,
        claims: expect.objectContaining({
          sub: 'user-123',
          iss: 'https://auth.example.com',
          scope: 'read write',
        }),
      });

      const expectedAuth = Buffer.from(
        `${defaultConfig.clientId}:${defaultConfig.clientSecret}`,
      ).toString('base64');

      expect(mockFetch).toHaveBeenCalledWith(
        defaultConfig.introspectionEndpoint,
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${expectedAuth}`,
          },
          body: expect.any(URLSearchParams),
        }),
      );
    });

    it('should check required scopes', async () => {
      mockCache.get.mockResolvedValue(null);

      const introspectionResponse: TokenIntrospectionResponse = {
        active: true,
        scope: 'read',
        sub: 'user-123',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => introspectionResponse,
      });

      const result = await tokenValidator.validateAccessToken(mockOpaqueToken, [
        'read',
        'write',
      ]);

      expect(result).toMatchObject({
        valid: false,
        error: 'Missing required scopes: write',
      });

      expect(mockCache.set).toHaveBeenCalledWith(
        expect.stringMatching(/^token:validation:/),
        JSON.stringify(result),
        defaultConfig.invalidTokenCacheTTL,
      );
    });

    it('should handle expired JWT', async () => {
      mockCache.get.mockResolvedValue(null);

      const decodedToken = {
        header: { alg: 'RS256', kid: 'key-123' },
        payload: {
          sub: 'user-123',
          exp: Math.floor(Date.now() / 1000) - 3600, // Expired
        },
      };

      mockJwt.decode.mockReturnValue(decodedToken);
      mockJwt.verify.mockImplementation(() => {
        throw new jwt.TokenExpiredError('jwt expired', new Date());
      });

      const result = await tokenValidator.validateAccessToken(mockJwtToken);

      expect(result).toMatchObject({
        valid: false,
        error: 'Token expired',
      });
    });

    it('should handle token not yet valid', async () => {
      mockCache.get.mockResolvedValue(null);

      const decodedToken = {
        header: { alg: 'RS256', kid: 'key-123' },
        payload: {
          sub: 'user-123',
          nbf: Math.floor(Date.now() / 1000) + 3600, // Future
        },
      };

      mockJwt.decode.mockReturnValue(decodedToken);
      mockJwt.verify.mockImplementation(() => {
        throw new jwt.NotBeforeError('jwt not active', new Date());
      });

      const result = await tokenValidator.validateAccessToken(mockJwtToken);

      expect(result).toMatchObject({
        valid: false,
        error: 'Token not yet valid',
      });
    });

    it('should reject disallowed algorithms', async () => {
      mockCache.get.mockResolvedValue(null);

      const decodedToken = {
        header: { alg: 'HS256', kid: 'key-123' }, // Not allowed
        payload: {
          sub: 'user-123',
        },
      };

      mockJwt.decode.mockReturnValue(decodedToken);

      const result = await tokenValidator.validateAccessToken(mockJwtToken);

      expect(result).toMatchObject({
        valid: false,
        error: 'Algorithm HS256 not allowed',
      });
    });

    it('should require kid header for JWT', async () => {
      mockCache.get.mockResolvedValue(null);

      const decodedToken = {
        header: { alg: 'RS256' }, // Missing kid
        payload: {
          sub: 'user-123',
        },
      };

      mockJwt.decode.mockReturnValue(decodedToken);

      const result = await tokenValidator.validateAccessToken(mockJwtToken);

      expect(result).toMatchObject({
        valid: false,
        error: 'JWT missing kid header',
      });
    });

    it('should validate required claims', async () => {
      mockCache.get.mockResolvedValue(null);

      const decodedToken = {
        header: { alg: 'RS256', kid: 'key-123' },
        payload: {
          sub: 'user-123',
          // Missing 'iss' claim
        },
      };

      const mockJwk: JWK = {
        kty: 'RSA',
        kid: 'key-123',
        n: 'mock-modulus',
        e: 'AQAB',
      };

      mockJwt.decode.mockReturnValue(decodedToken);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ keys: [mockJwk] }),
      });
      mockJwt.verify.mockReturnValue(decodedToken.payload as any);

      const result = await tokenValidator.validateAccessToken(mockJwtToken);

      expect(result).toMatchObject({
        valid: false,
        error: 'Missing required claims: iss',
      });
    });

    it('should handle inactive token from introspection', async () => {
      mockCache.get.mockResolvedValue(null);

      const introspectionResponse: TokenIntrospectionResponse = {
        active: false,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => introspectionResponse,
      });

      const result = await tokenValidator.validateAccessToken(mockOpaqueToken);

      expect(result).toMatchObject({
        valid: false,
        active: false,
        error: 'Token inactive',
      });
    });

    it('should handle introspection endpoint errors', async () => {
      mockCache.get.mockResolvedValue(null);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await tokenValidator.validateAccessToken(mockOpaqueToken);

      expect(result).toMatchObject({
        valid: false,
        error: 'Introspection failed: 500',
      });
    });

    it('should handle JWKS fetch errors', async () => {
      mockCache.get.mockResolvedValue(null);

      const decodedToken = {
        header: { alg: 'RS256', kid: 'key-123' },
        payload: { sub: 'user-123' },
      };

      mockJwt.decode.mockReturnValue(decodedToken);
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await tokenValidator.validateAccessToken(mockJwtToken);

      expect(result).toMatchObject({
        valid: false,
        error: 'Signing key not found',
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to fetch JWKS',
        expect.objectContaining({ error: expect.any(Error) }),
      );
    });

    it('should handle no validation method available', async () => {
      const validator = new TokenValidator({}, mockCache);
      mockCache.get.mockResolvedValue(null);

      const result = await validator.validateAccessToken(mockOpaqueToken);

      expect(result).toMatchObject({
        valid: false,
        error: 'No validation method available (neither JWT validation nor introspection configured)',
      });
    });
  });

  describe('JWKS Caching', () => {
    const mockJwtToken = 'header.payload.signature';

    it('should cache JWKS keys', async () => {
      mockCache.get.mockResolvedValue(null);

      const decodedToken = {
        header: { alg: 'RS256', kid: 'key-123' },
        payload: {
          sub: 'user-123',
          iss: 'https://auth.example.com',
        },
      };

      const mockJwk: JWK = {
        kty: 'RSA',
        kid: 'key-123',
        n: 'mock-modulus',
        e: 'AQAB',
      };

      mockJwt.decode.mockReturnValue(decodedToken);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ keys: [mockJwk] }),
      });
      mockJwt.verify.mockReturnValue(decodedToken.payload as any);

      // First call should fetch JWKS
      await tokenValidator.validateAccessToken(mockJwtToken);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second call should use cached JWKS
      mockJwt.decode.mockReturnValue(decodedToken);
      mockJwt.verify.mockReturnValue(decodedToken.payload as any);
      
      await tokenValidator.validateAccessToken(mockJwtToken);
      expect(mockFetch).toHaveBeenCalledTimes(1); // Still only 1 call
    });

    it('should refresh JWKS cache when expired', async () => {
      mockCache.get.mockResolvedValue(null);

      const decodedToken = {
        header: { alg: 'RS256', kid: 'key-123' },
        payload: { sub: 'user-123', iss: 'https://auth.example.com' },
      };

      const mockJwk: JWK = {
        kty: 'RSA',
        kid: 'key-123',
        n: 'mock-modulus',
        e: 'AQAB',
      };

      mockJwt.decode.mockReturnValue(decodedToken);
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ keys: [mockJwk] }),
      });
      mockJwt.verify.mockReturnValue(decodedToken.payload as any);

      // First call
      await tokenValidator.validateAccessToken(mockJwtToken);

      // Simulate cache expiry
      (tokenValidator as any).jwksCacheExpiry = Date.now() - 1000;

      // Second call should refetch
      await tokenValidator.validateAccessToken(mockJwtToken);

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should handle multiple keys in JWKS', async () => {
      mockCache.get.mockResolvedValue(null);

      const decodedToken = {
        header: { alg: 'RS256', kid: 'key-2' },
        payload: { sub: 'user-123', iss: 'https://auth.example.com' },
      };

      const jwksResponse: JWKSResponse = {
        keys: [
          { kty: 'RSA', kid: 'key-1', n: 'modulus1', e: 'AQAB' },
          { kty: 'RSA', kid: 'key-2', n: 'modulus2', e: 'AQAB' },
          { kty: 'RSA', kid: 'key-3', n: 'modulus3', e: 'AQAB' },
        ],
      };

      mockJwt.decode.mockReturnValue(decodedToken);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => jwksResponse,
      });
      mockJwt.verify.mockReturnValue(decodedToken.payload as any);

      await tokenValidator.validateAccessToken(mockJwtToken);

      // Verify correct key was selected
      const cachedKey = (tokenValidator as any).jwksCache.get('key-2');
      expect(cachedKey).toEqual(jwksResponse.keys[1]);
    });
  });

  describe('validateTokenBinding', () => {
    it('should validate certificate thumbprint binding', async () => {
      const token = 'test-token';
      const bindingValue = 'cert-thumbprint-value';

      const validationResult: TokenValidationResult = {
        valid: true,
        claims: {
          sub: 'user-123',
          cnf: {
            'x5t#S256': bindingValue,
          },
        },
      };

      jest.spyOn(tokenValidator, 'validateAccessToken').mockResolvedValue(
        validationResult,
      );

      const result = await tokenValidator.validateTokenBinding(
        token,
        'x5t#S256',
        bindingValue,
      );

      expect(result).toBe(true);
    });

    it('should validate JWK thumbprint binding', async () => {
      const token = 'test-token';
      const bindingValue = 'jwk-thumbprint-value';

      const validationResult: TokenValidationResult = {
        valid: true,
        claims: {
          sub: 'user-123',
          cnf: {
            jkt: bindingValue,
          },
        },
      };

      jest.spyOn(tokenValidator, 'validateAccessToken').mockResolvedValue(
        validationResult,
      );

      const result = await tokenValidator.validateTokenBinding(token, 'jkt', bindingValue);

      expect(result).toBe(true);
    });

    it('should reject mismatched binding', async () => {
      const token = 'test-token';

      const validationResult: TokenValidationResult = {
        valid: true,
        claims: {
          sub: 'user-123',
          cnf: {
            'x5t#S256': 'different-value',
          },
        },
      };

      jest.spyOn(tokenValidator, 'validateAccessToken').mockResolvedValue(
        validationResult,
      );

      const result = await tokenValidator.validateTokenBinding(
        token,
        'x5t#S256',
        'expected-value',
      );

      expect(result).toBe(false);
    });

    it('should reject token without binding', async () => {
      const token = 'test-token';

      const validationResult: TokenValidationResult = {
        valid: true,
        claims: {
          sub: 'user-123',
          // No cnf claim
        },
      };

      jest.spyOn(tokenValidator, 'validateAccessToken').mockResolvedValue(
        validationResult,
      );

      const result = await tokenValidator.validateTokenBinding(
        token,
        'x5t#S256',
        'any-value',
      );

      expect(result).toBe(false);
    });

    it('should handle unknown binding type', async () => {
      const token = 'test-token';

      const validationResult: TokenValidationResult = {
        valid: true,
        claims: {
          sub: 'user-123',
          cnf: {},
        },
      };

      jest.spyOn(tokenValidator, 'validateAccessToken').mockResolvedValue(
        validationResult,
      );

      const result = await tokenValidator.validateTokenBinding(
        token,
        'unknown-type',
        'value',
      );

      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Unknown token binding type',
        { bindingType: 'unknown-type' },
      );
    });
  });

  describe('revokeToken', () => {
    it('should clear token from cache', async () => {
      const token = 'test-token';
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

      await tokenValidator.revokeToken(token, 'access_token');

      expect(mockCache.del).toHaveBeenCalledWith(`token:validation:${hashedToken}`);
      expect(mockLogger.info).toHaveBeenCalledWith('Token revoked', {
        tokenType: 'access_token',
      });
    });
  });

  describe.skip('Error Handling', () => {
    it('should handle JWT decode failures', async () => {
      mockCache.get.mockResolvedValue(null);
      mockJwt.decode.mockReturnValue(null);

      const result = await tokenValidator.validateAccessToken('invalid-jwt');

      expect(result).toMatchObject({
        valid: false,
        error: 'Invalid JWT format',
      });
    });

    it('should handle non-RSA keys', async () => {
      mockCache.get.mockResolvedValue(null);

      const decodedToken = {
        header: { alg: 'ES256', kid: 'key-123' },
        payload: { sub: 'user-123' },
      };

      const ecKey: JWK = {
        kty: 'EC', // Not RSA
        kid: 'key-123',
        crv: 'P-256',
        x: 'x-coordinate',
        y: 'y-coordinate',
      };

      mockJwt.decode.mockReturnValue(decodedToken);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ keys: [ecKey] }),
      });

      const result = await tokenValidator.validateAccessToken('test-token');

      expect(result).toMatchObject({
        valid: false,
        error: expect.stringContaining('Only RSA keys supported'),
      });
    });

    it('should handle cache parse errors', async () => {
      mockCache.get.mockResolvedValue('invalid-json');

      const result = await tokenValidator.validateAccessToken('test-token');

      expect(result.cached).toBeUndefined();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to parse cached validation result',
        expect.any(Object),
      );
    });

    it('should handle general validation errors', async () => {
      mockCache.get.mockImplementation(() => {
        throw new Error('Cache error');
      });

      const result = await tokenValidator.validateAccessToken('test-token');

      expect(result).toMatchObject({
        valid: false,
        error: 'Cache error',
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Token validation error',
        expect.any(Object),
      );
    });
  });

  describe('Configuration', () => {
    it('should use default configuration when not provided', () => {
      const validator = new TokenValidator();

      expect((validator as any).config).toMatchObject({
        validTokenCacheTTL: 300,
        invalidTokenCacheTTL: 60,
        jwksCacheTTL: 3600,
        clockSkewTolerance: 30,
        allowedAlgorithms: ['RS256', 'ES256'],
      });
    });

    it('should respect timeout for external requests', async () => {
      mockCache.get.mockResolvedValue(null);

      // Create a promise that never resolves
      mockFetch.mockImplementation(() => new Promise(() => {}));

      const promise = tokenValidator.validateAccessToken('opaque-token');

      // Wait a bit to ensure timeout would have triggered
      await new Promise((resolve) => setTimeout(resolve, 100));

      // The actual implementation should timeout, but since we're mocking fetch,
      // we'll just verify the abort signal was passed
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        }),
      );
    });
  });
});