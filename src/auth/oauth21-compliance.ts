/**
 * OAuth 2.1 Compliance Layer
 * Implements OAuth 2.1 security best practices including PKCE, sender-constrained tokens,
 * and protection against malicious authorization servers.
 */

import crypto from 'crypto';

import { z } from 'zod';

import type { CacheService } from '../types/cache';
import { logger } from '../utils/logger';

/**
 * OAuth 2.1 token types
 */
export enum TokenType {
  ACCESS_TOKEN = 'access_token',
  REFRESH_TOKEN = 'refresh_token',
  ID_TOKEN = 'id_token',
}

/**
 * OAuth 2.1 grant types (implicit grant removed)
 */
export enum GrantType {
  AUTHORIZATION_CODE = 'authorization_code',
  REFRESH_TOKEN = 'refresh_token',
  CLIENT_CREDENTIALS = 'client_credentials',
}

/**
 * PKCE code challenge methods
 */
export enum CodeChallengeMethod {
  S256 = 'S256', // SHA256 - required by OAuth 2.1
  PLAIN = 'plain', // Deprecated, for backwards compatibility only
}

/**
 * Token binding types for sender-constrained tokens
 */
export enum TokenBindingType {
  TLS_CLIENT_CERT = 'tls_client_cert',
  DPoP = 'dpop', // Demonstrating Proof of Possession
  MTLS = 'mtls', // Mutual TLS
}

/**
 * OAuth 2.1 authorization _request parameters
 */
export interface OAuth21AuthorizationRequest {
  responseType: 'code'; // Only authorization code flow allowed
  clientId: string;
  redirectUri: string;
  scope: string;
  state: string;
  codeChallenge: string;
  codeChallengeMethod: CodeChallengeMethod;
  nonce?: string; // For OpenID Connect
  prompt?: string;
  maxAge?: number;
}

/**
 * OAuth 2.1 token _request parameters
 */
export interface OAuth21TokenRequest {
  grantType: GrantType;
  code?: string; // For authorization code grant
  redirectUri?: string; // For authorization code grant
  codeVerifier?: string; // PKCE verifier
  refreshToken?: string; // For refresh token grant
  clientId: string;
  clientSecret?: string; // Optional for public clients
  scope?: string;
  tokenBindingId?: string; // For sender-constrained tokens
}

/**
 * OAuth 2.1 token response
 */
export interface OAuth21TokenResponse {
  accessToken: string;
  tokenType: 'Bearer' | 'DPoP';
  expiresIn: number;
  refreshToken?: string;
  scope: string;
  idToken?: string; // For OpenID Connect
  tokenBinding?: {
    type: TokenBindingType;
    id: string;
  };
}

/**
 * Authorization server metadata (RFC 8414)
 */
export interface AuthorizationServerMetadata {
  issuer: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  jwksUri: string;
  registrationEndpoint?: string;
  scopesSupported: string[];
  responseTypesSupported: string[];
  grantTypesSupported: string[];
  codeChallengeMethodsSupported: string[];
  tokenEndpointAuthMethodsSupported: string[];
  revocationEndpoint?: string;
  introspectionEndpoint?: string;
  dpopSigningAlgValuesSupported?: string[];
  tlsClientCertificateBoundAccessTokens?: boolean;
}

/**
 * PKCE parameters
 */
export interface PKCEParameters {
  codeVerifier: string;
  codeChallenge: string;
  codeChallengeMethod: CodeChallengeMethod;
}

/**
 * OAuth 2.1 compliance configuration
 */
export interface OAuth21Config {
  /** Minimum code verifier length (43-128 characters as per RFC 7636) */
  minCodeVerifierLength: number;
  /** Maximum code verifier length */
  maxCodeVerifierLength: number;
  /** Authorization code TTL in seconds */
  authorizationCodeTTL: number;
  /** Access token TTL in seconds */
  accessTokenTTL: number;
  /** Refresh token TTL in seconds */
  refreshTokenTTL: number;
  /** Enable sender-constrained tokens */
  enableSenderConstrainedTokens: boolean;
  /** Token binding type to use */
  tokenBindingType?: TokenBindingType;
  /** Trusted authorization servers */
  trustedAuthServers: string[];
  /** Enable anti-phishing measures */
  enableAntiPhishing: boolean;
}

/**
 * Default OAuth 2.1 configuration
 */
const DEFAULT_CONFIG: OAuth21Config = {
  minCodeVerifierLength: 43,
  maxCodeVerifierLength: 128,
  authorizationCodeTTL: 60, // 1 minute
  accessTokenTTL: 3600, // 1 hour
  refreshTokenTTL: 2592000, // 30 days
  enableSenderConstrainedTokens: true,
  tokenBindingType: TokenBindingType.DPoP,
  trustedAuthServers: [],
  enableAntiPhishing: true,
};

/**
 * OAuth 2.1 Compliance Manager
 * Implements security best practices for OAuth 2.1
 */
export class OAuth21ComplianceManager {
  private config: OAuth21Config;
  private cache?: CacheService;
  private authServerMetadataCache: Map<string, AuthorizationServerMetadata> = new Map();

  constructor(config?: Partial<OAuth21Config>, cache?: CacheService) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.cache = cache;
    logger.info('OAuth 2.1 Compliance Manager initialized', { config: this.config });
  }

  /**
   * Generate PKCE parameters
   */
  generatePKCEParameters(): PKCEParameters {
    // Generate cryptographically secure code verifier
    const length = Math.floor(
      Math.random() * (this.config.maxCodeVerifierLength - this.config.minCodeVerifierLength + 1) +
        this.config.minCodeVerifierLength,
    );

    const codeVerifier = this.generateCodeVerifier(length);
    const codeChallenge = this.generateCodeChallenge(codeVerifier);

    return {
      codeVerifier,
      codeChallenge,
      codeChallengeMethod: CodeChallengeMethod.S256,
    };
  }

  /**
   * Generate code verifier for PKCE
   */
  private generateCodeVerifier(length: number): string {
    // Use URL-safe characters: [A-Z] [a-z] [0-9] - . _ ~
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    const randomBytes = crypto.randomBytes(length);

    let codeVerifier = '';
    for (let i = 0; i < length; i++) {
      codeVerifier += charset[randomBytes[i] % charset.length];
    }

    return codeVerifier;
  }

  /**
   * Generate code challenge from verifier
   */
  private generateCodeChallenge(codeVerifier: string): string {
    // OAuth 2.1 requires S256 method
    const hash = crypto.createHash('sha256').update(codeVerifier).digest();
    return this.base64urlEncode(hash);
  }

  /**
   * Base64 URL encode (no padding)
   */
  private base64urlEncode(buffer: Buffer): string {
    return buffer
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Validate PKCE parameters
   */
  async validatePKCE(
    codeVerifier: string,
    codeChallenge: string,
    codeChallengeMethod: CodeChallengeMethod,
  ): Promise<boolean> {
    try {
      // Validate code verifier length
      if (
        codeVerifier.length < this.config.minCodeVerifierLength ||
        codeVerifier.length > this.config.maxCodeVerifierLength
      ) {
        logger.warn('Invalid code verifier length', { length: codeVerifier.length });
        return false;
      }

      // Validate characters
      const validCharsRegex = /^[A-Za-z0-9\-._~]+$/;
      if (!validCharsRegex.test(codeVerifier)) {
        logger.warn('Invalid code verifier characters');
        return false;
      }

      // Generate expected challenge and compare
      let expectedChallenge: string;
      if (codeChallengeMethod === CodeChallengeMethod.S256) {
        expectedChallenge = this.generateCodeChallenge(codeVerifier);
      } else if (codeChallengeMethod === CodeChallengeMethod.PLAIN) {
        // Plain method is deprecated but supported for backwards compatibility
        logger.warn('Using deprecated PLAIN code challenge method');
        expectedChallenge = codeVerifier;
      } else {
        logger.error('Invalid code challenge method', { method: codeChallengeMethod });
        return false;
      }

      const isValid = crypto.timingSafeEqual(
        Buffer.from(expectedChallenge),
        Buffer.from(codeChallenge),
      );

      if (!isValid) {
        logger.warn('PKCE validation failed - code challenge mismatch');
      }

      return isValid;
    } catch (_error) {
      logger.error('PKCE validation error', { error: _error });
      return false;
    }
  }

  /**
   * Validate authorization server
   */
  async validateAuthorizationServer(issuer: string): Promise<boolean> {
    try {
      // Check if server is in trusted list
      if (!this.config.trustedAuthServers.includes(issuer)) {
        logger.warn('Authorization server not in trusted list', { issuer });
        return false;
      }

      // Fetch and validate metadata
      const metadata = await this.fetchAuthServerMetadata(issuer);

      // Validate required OAuth 2.1 support
      if (!metadata.codeChallengeMethodsSupported?.includes(CodeChallengeMethod.S256)) {
        logger.error('Authorization server does not support required S256 PKCE method', { issuer });
        return false;
      }

      // Ensure implicit grant is not supported (OAuth 2.1 requirement)
      if (metadata.responseTypesSupported?.includes('token')) {
        logger.error('Authorization server supports deprecated implicit grant', { issuer });
        return false;
      }

      return true;
    } catch (_error) {
      logger.error('Authorization server validation error', { issuer, _error: _error });
      return false;
    }
  }

  /**
   * Fetch authorization server metadata
   */
  private async fetchAuthServerMetadata(issuer: string): Promise<AuthorizationServerMetadata> {
    // Check cache first
    const cached = this.authServerMetadataCache.get(issuer);
    if (cached) {
      return cached;
    }

    // Construct well-known URL
    const metadataUrl = `${issuer}/.well-known/oauth-authorization-server`;

    try {
      const response = await fetch(metadataUrl, {
        headers: {
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch metadata: ${response.status}`);
      }

      const metadata = await response.json();

      // Validate metadata schema
      const validatedMetadata = AuthorizationServerMetadataSchema.parse(metadata);

      // Cache the metadata
      this.authServerMetadataCache.set(issuer, validatedMetadata);

      return validatedMetadata;
    } catch (_error) {
      logger.error('Failed to fetch authorization server metadata', { issuer, _error: _error });
      throw _error;
    }
  }

  /**
   * Generate state parameter for CSRF protection
   */
  generateState(): string {
    return this.base64urlEncode(crypto.randomBytes(32));
  }

  /**
   * Store state for validation
   */
  async storeState(state: string, data: Record<string, unknown>): Promise<void> {
    if (!this.cache) {
      throw new Error('Cache service required for state storage');
    }

    const key = `oauth2:state:${state}`;
    await this.cache.set(key, JSON.stringify(data), 600); // 10 minute TTL
  }

  /**
   * Validate and retrieve state
   */
  async validateState(state: string): Promise<Record<string, unknown> | null> {
    if (!this.cache) {
      throw new Error('Cache service required for state validation');
    }

    const key = `oauth2:state:${state}`;
    const data = await this.cache.get(key);

    if (!data) {
      logger.warn('State not found or expired', { state });
      return null;
    }

    // Delete state after use (one-time use)
    await this.cache.del(key);

    try {
      return JSON.parse(data);
    } catch (_error) {
      logger.error('Failed to parse state data', { error: _error });
      return null;
    }
  }

  /**
   * Generate nonce for OpenID Connect
   */
  generateNonce(): string {
    return this.base64urlEncode(crypto.randomBytes(32));
  }

  /**
   * Create DPoP proof for sender-constrained tokens
   */
  async createDPoPProof(
    htm: string, // HTTP method
    htu: string, // HTTP URI
    accessToken?: string,
  ): Promise<string> {
    // This is a simplified implementation
    // In production, use proper JWK and JWT libraries
    const header = {
      typ: 'dpop+jwt',
      alg: 'RS256',
      jwk: {
        kty: 'RSA',
        // Include public key components
      },
    };

    const payload = {
      jti: crypto.randomUUID(),
      htm,
      htu,
      iat: Math.floor(Date.now() / 1000),
      ath: accessToken ? this.base64urlEncode(crypto.createHash('sha256').update(accessToken).digest()) : undefined,
    };

    // Sign with private key (simplified)
    const encodedHeader = this.base64urlEncode(Buffer.from(JSON.stringify(header)));
    const encodedPayload = this.base64urlEncode(Buffer.from(JSON.stringify(payload)));

    // In production, properly sign this
    const signature = 'mock-signature';

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  /**
   * Check for phishing indicators
   */
  checkPhishingIndicators(redirectUri: string, _clientId: string): string[] {
    const warnings: string[] = [];

    // Check for suspicious redirect URIs
    const url = new URL(redirectUri);

    // Check for IP addresses
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(url.hostname)) {
      warnings.push('Redirect URI uses IP address instead of domain');
    }

    // Check for suspicious TLDs
    const suspiciousTLDs = ['.tk', '.ml', '.ga', '.cf'];
    if (suspiciousTLDs.some(tld => url.hostname.endsWith(tld))) {
      warnings.push('Redirect URI uses suspicious TLD');
    }

    // Check for homograph attacks
    if (/[^\\x00-\\x7F]/.test(url.hostname)) {
      warnings.push('Redirect URI contains non-ASCII characters (possible homograph attack)');
    }

    // Check for suspicious patterns
    if (url.hostname.includes('--') || url.hostname.includes('..')) {
      warnings.push('Redirect URI contains suspicious patterns');
    }

    return warnings;
  }

  /**
   * Build authorization URL with OAuth 2.1 compliance
   */
  buildAuthorizationUrl(
    authEndpoint: string,
    params: OAuth21AuthorizationRequest,
  ): string {
    const url = new URL(authEndpoint);

    // Add required OAuth 2.1 parameters
    url.searchParams.set('response_type', params.responseType);
    url.searchParams.set('client_id', params.clientId);
    url.searchParams.set('redirect_uri', params.redirectUri);
    url.searchParams.set('scope', params.scope);
    url.searchParams.set('state', params.state);
    url.searchParams.set('code_challenge', params.codeChallenge);
    url.searchParams.set('code_challenge_method', params.codeChallengeMethod);

    // Add optional parameters
    if (params.nonce) {
      url.searchParams.set('nonce', params.nonce);
    }
    if (params.prompt) {
      url.searchParams.set('prompt', params.prompt);
    }
    if (params.maxAge !== undefined) {
      url.searchParams.set('max_age', params.maxAge.toString());
    }

    return url.toString();
  }
}

/**
 * Zod schema for authorization server metadata validation
 */
const AuthorizationServerMetadataSchema = z.object({
  issuer: z.string().url(),
  authorizationEndpoint: z.string().url(),
  tokenEndpoint: z.string().url(),
  jwksUri: z.string().url(),
  registrationEndpoint: z.string().url().optional(),
  scopesSupported: z.array(z.string()),
  responseTypesSupported: z.array(z.string()),
  grantTypesSupported: z.array(z.string()),
  codeChallengeMethodsSupported: z.array(z.string()),
  tokenEndpointAuthMethodsSupported: z.array(z.string()),
  revocationEndpoint: z.string().url().optional(),
  introspectionEndpoint: z.string().url().optional(),
  dpopSigningAlgValuesSupported: z.array(z.string()).optional(),
  tlsClientCertificateBoundAccessTokens: z.boolean().optional(),
});
