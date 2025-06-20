/**
 * OAuth 2.1 Token Validator
 * Implements token introspection, JWT validation, and caching with TTL
 */

import crypto from 'crypto';

import jwt from 'jsonwebtoken';
import type { Algorithm } from 'jsonwebtoken';
import { z } from 'zod';

import type { CacheService } from '../types/cache';
import { logger } from '../utils/logger';

/**
 * Token validation result
 */
export interface TokenValidationResult {
  valid: boolean;
  active?: boolean;
  claims?: TokenClaims;
  error?: string;
  cached?: boolean;
}

/**
 * Token claims (standard and custom)
 */
export interface TokenClaims {
  // Standard claims
  iss?: string; // Issuer
  sub?: string; // Subject
  aud?: string | string[]; // Audience
  exp?: number; // Expiration time
  nbf?: number; // Not before
  iat?: number; // Issued at
  jti?: string; // JWT ID

  // OAuth 2.0 claims
  scope?: string;
  client_id?: string;

  // Token binding claims
  cnf?: {
    'x5t#S256'?: string; // X.509 certificate SHA-256 thumbprint
    jkt?: string; // JWK thumbprint
  };

  // Custom claims
  [key: string]: unknown;
}

/**
 * Token introspection response (RFC 7662)
 */
export interface TokenIntrospectionResponse {
  active: boolean;
  scope?: string;
  client_id?: string;
  username?: string;
  token_type?: string;
  exp?: number;
  iat?: number;
  nbf?: number;
  sub?: string;
  aud?: string | string[];
  iss?: string;
  jti?: string;
  cnf?: Record<string, unknown>;
}

/**
 * JWKS (JSON Web Key Set) response
 */
export interface JWKSResponse {
  keys: JWK[];
}

/**
 * JSON Web Key
 */
export interface JWK {
  kty: string; // Key type
  use?: string; // Key use
  key_ops?: string[]; // Key operations
  alg?: string; // Algorithm
  kid?: string; // Key ID
  x5c?: string[]; // X.509 certificate chain
  x5t?: string; // X.509 certificate SHA-1 thumbprint
  'x5t#S256'?: string; // X.509 certificate SHA-256 thumbprint
  n?: string; // RSA modulus
  e?: string; // RSA exponent
  x?: string; // EC x coordinate
  y?: string; // EC y coordinate
  crv?: string; // EC curve
}

/**
 * Token validator configuration
 */
export interface TokenValidatorConfig {
  /** Introspection endpoint URL */
  introspectionEndpoint?: string;
  /** JWKS URI for JWT validation */
  jwksUri?: string;
  /** Client credentials for introspection */
  clientId?: string;
  clientSecret?: string;
  /** Cache TTL for valid tokens (seconds) */
  validTokenCacheTTL: number;
  /** Cache TTL for invalid tokens (seconds) */
  invalidTokenCacheTTL: number;
  /** JWKS cache TTL (seconds) */
  jwksCacheTTL: number;
  /** Clock skew tolerance (seconds) */
  clockSkewTolerance: number;
  /** Required token claims */
  requiredClaims?: string[];
  /** Allowed algorithms for JWT */
  allowedAlgorithms: Algorithm[];
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: TokenValidatorConfig = {
  validTokenCacheTTL: 300, // 5 minutes
  invalidTokenCacheTTL: 60, // 1 minute
  jwksCacheTTL: 3600, // 1 hour
  clockSkewTolerance: 30, // 30 seconds
  allowedAlgorithms: ['RS256', 'ES256'] as Algorithm[], // Only secure algorithms
};

/**
 * OAuth 2.1 Token Validator
 */
export class TokenValidator {
  private config: TokenValidatorConfig;
  private cache?: CacheService;
  private jwksCache: Map<string, JWK> = new Map();
  private jwksCacheExpiry?: number;

  constructor(config?: Partial<TokenValidatorConfig>, cache?: CacheService) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.cache = cache;
    logger.info('Token Validator initialized', { config: this.config });
  }

  /**
   * Validate access token
   */
  async validateAccessToken(token: string, requiredScopes?: string[]): Promise<TokenValidationResult> {
    try {
      // Check cache first
      const cachedResult = await this.getCachedValidation(token);
      if (cachedResult) {
        logger.debug('Token validation result from cache', { jti: cachedResult.claims?.jti });
        return { ...cachedResult, cached: true };
      }

      // Determine validation method
      let result: TokenValidationResult;

      if (this.isJWT(token)) {
        result = await this.validateJWT(token);
      } else if (this.config.introspectionEndpoint) {
        result = await this.introspectToken(token);
      } else {
        return {
          valid: false,
          error: 'No validation method available (neither JWT validation nor introspection configured)',
        };
      }

      // Check required scopes
      if (result.valid && requiredScopes?.length) {
        const tokenScopes = result.claims?.scope?.split(' ') || [];
        const hasRequiredScopes = requiredScopes.every(scope => tokenScopes.includes(scope));

        if (!hasRequiredScopes) {
          result = {
            ...result,
            valid: false,
            error: `Missing required scopes: ${requiredScopes.filter(s => !tokenScopes.includes(s)).join(', ')}`,
          };
        }
      }

      // Cache the result
      await this.cacheValidationResult(token, result);

      return result;
    } catch (error) {
      logger.error('Token validation error', { error: _error });
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Token validation failed',
      };
    }
  }

  /**
   * Check if token is a JWT
   */
  private isJWT(token: string): boolean {
    const parts = token.split('.');
    return parts.length === 3;
  }

  /**
   * Validate JWT token
   */
  private async validateJWT(token: string): Promise<TokenValidationResult> {
    try {
      // Decode without verification first to get header
      const decoded = jwt.decode(token, { complete: true });
      if (!decoded) {
        return { valid: false, error: 'Invalid JWT format' };
      }

      const { header } = decoded;

      // Check algorithm
      if (!this.config.allowedAlgorithms.includes(header.alg as Algorithm)) {
        return { valid: false, error: `Algorithm ${header.alg} not allowed` };
      }

      // Get signing key
      if (!header.kid) {
        return { valid: false, error: 'JWT missing kid header' };
      }

      const key = await this.getSigningKey(header.kid);
      if (!key) {
        return { valid: false, error: 'Signing key not found' };
      }

      // Verify JWT
      const verificationKey = this.jwkToPEM(key);
      const verified = jwt.verify(token, verificationKey, {
        algorithms: this.config.allowedAlgorithms,
        clockTolerance: this.config.clockSkewTolerance,
      }) as TokenClaims;

      // Validate required claims
      if (this.config.requiredClaims) {
        const missingClaims = this.config.requiredClaims.filter(claim => !(claim in verified));
        if (missingClaims.length > 0) {
          return {
            valid: false,
            error: `Missing required claims: ${missingClaims.join(', ')}`,
          };
        }
      }

      return {
        valid: true,
        active: true,
        claims: verified,
      };
    } catch (error) {
      if (_error instanceof jwt.TokenExpiredError) {
        return { valid: false, error: 'Token expired' };
      }
      if (_error instanceof jwt.NotBeforeError) {
        return { valid: false, error: 'Token not yet valid' };
      }
      if (_error instanceof jwt.JsonWebTokenError) {
        return { valid: false, error: error.message };
      }

      logger.error('JWT validation error', { error: error instanceof Error ? error.message : String(error) });
      return { valid: false, error: 'JWT validation failed' };
    }
  }

  /**
   * Introspect token using RFC 7662
   */
  private async introspectToken(token: string): Promise<TokenValidationResult> {
    if (!this.config.introspectionEndpoint) {
      return { valid: false, error: 'Introspection endpoint not configured' };
    }

    try {
      const auth = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64');

      const response = await fetch(this.config.introspectionEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${auth}`,
        },
        body: new URLSearchParams({
          token,
          token_type_hint: 'access_token',
        }),
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      if (!response.ok) {
        throw new Error(`Introspection failed: ${response.status}`);
      }

      const data = await response.json();
      const introspectionResponse = TokenIntrospectionResponseSchema.parse(data);

      if (!introspectionResponse.active) {
        return { valid: false, active: false, error: 'Token inactive' };
      }

      // Convert introspection response to claims
      const claims: TokenClaims = {
        iss: introspectionResponse.iss,
        sub: introspectionResponse.sub,
        aud: introspectionResponse.aud,
        exp: introspectionResponse.exp,
        iat: introspectionResponse.iat,
        nbf: introspectionResponse.nbf,
        jti: introspectionResponse.jti,
        scope: introspectionResponse.scope,
        client_id: introspectionResponse.client_id,
        cnf: introspectionResponse.cnf,
      };

      return {
        valid: true,
        active: true,
        claims,
      };
    } catch (error) {
      logger.error('Token introspection error', { error: _error });
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Introspection failed',
      };
    }
  }

  /**
   * Get signing key from JWKS
   */
  private async getSigningKey(kid: string): Promise<JWK | null> {
    // Check local cache
    if (this.jwksCacheExpiry && Date.now() < this.jwksCacheExpiry) {
      const key = this.jwksCache.get(kid);
      if (key) {
        return key;
      }
    }

    // Fetch JWKS
    if (!this.config.jwksUri) {
      logger.error('JWKS URI not configured');
      return null;
    }

    try {
      const response = await fetch(this.config.jwksUri, {
        headers: {
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch JWKS: ${response.status}`);
      }

      const jwks = await response.json() as JWKSResponse;

      // Update cache
      this.jwksCache.clear();
      for (const key of jwks.keys) {
        if (key.kid) {
          this.jwksCache.set(key.kid, key);
        }
      }
      this.jwksCacheExpiry = Date.now() + (this.config.jwksCacheTTL * 1000);

      return this.jwksCache.get(kid) || null;
    } catch (error) {
      logger.error('Failed to fetch JWKS', { error: _error });
      return null;
    }
  }

  /**
   * Convert JWK to PEM format
   */
  private jwkToPEM(jwk: JWK): string {
    if (jwk.kty !== 'RSA') {
      throw new Error('Only RSA keys supported');
    }

    if (!jwk.n || !jwk.e) {
      throw new Error('Invalid RSA key');
    }

    // This is a simplified implementation
    // In production, use a proper library like node-jose
    const modulus = Buffer.from(jwk.n, 'base64url');
    const exponent = Buffer.from(jwk.e, 'base64url');

    // Construct RSA public key (simplified)
    const pubKey = {
      key: {
        n: modulus,
        e: exponent,
      },
      format: 'jwk',
    };

    // In production, properly convert to PEM format
    return `-----BEGIN PUBLIC KEY-----
${Buffer.from(JSON.stringify(pubKey)).toString('base64')}
-----END PUBLIC KEY-----`;
  }

  /**
   * Get cached validation result
   */
  private async getCachedValidation(token: string): Promise<TokenValidationResult | null> {
    if (!this.cache) {
      return null;
    }

    const key = `token:validation:${this.hashToken(token)}`;
    const cached = await this.cache.get(key);

    if (!cached) {
      return null;
    }

    try {
      return JSON.parse(cached) as TokenValidationResult;
    } catch (error) {
      logger.error('Failed to parse cached validation result', { error: _error });
      return null;
    }
  }

  /**
   * Cache validation result
   */
  private async cacheValidationResult(token: string, result: TokenValidationResult): Promise<void> {
    if (!this.cache) {
      return;
    }

    const key = `token:validation:${this.hashToken(token)}`;
    const ttl = result.valid ? this.config.validTokenCacheTTL : this.config.invalidTokenCacheTTL;

    await this.cache.set(key, JSON.stringify(result), ttl);
  }

  /**
   * Hash token for cache key (security measure)
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Validate token binding
   */
  async validateTokenBinding(
    token: string,
    bindingType: string,
    bindingValue: string,
  ): Promise<boolean> {
    const result = await this.validateAccessToken(token);

    if (!result.valid || !result.claims?.cnf) {
      return false;
    }

    const cnf = result.claims.cnf;

    switch (bindingType) {
      case 'x5t#S256':
        // Certificate thumbprint binding
        return cnf['x5t#S256'] === bindingValue;

      case 'jkt':
        // JWK thumbprint binding
        return cnf.jkt === bindingValue;

      default:
        logger.warn('Unknown token binding type', { bindingType });
        return false;
    }
  }

  /**
   * Revoke token
   */
  async revokeToken(token: string, tokenTypeHint?: string): Promise<boolean> {
    // Clear from cache immediately
    if (this.cache) {
      const key = `token:validation:${this.hashToken(token)}`;
      await this.cache.del(key);
    }

    // If revocation endpoint is configured, call it
    // This would be implemented based on RFC 7009
    logger.info('Token revoked', { tokenType: tokenTypeHint });
    return true;
  }
}

/**
 * Zod schema for token introspection response
 */
const TokenIntrospectionResponseSchema = z.object({
  active: z.boolean(),
  scope: z.string().optional(),
  client_id: z.string().optional(),
  username: z.string().optional(),
  token_type: z.string().optional(),
  exp: z.number().optional(),
  iat: z.number().optional(),
  nbf: z.number().optional(),
  sub: z.string().optional(),
  aud: z.union([z.string(), z.array(z.string())]).optional(),
  iss: z.string().optional(),
  jti: z.string().optional(),
  cnf: z.record(z.unknown()).optional(),
});
