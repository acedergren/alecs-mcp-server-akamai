/**
 * Token generation utilities for ALECS remote access
 */

import { randomBytes, createHash } from 'crypto';
import { logger } from './logger';

export interface ApiToken {
  id: string;
  token: string;
  createdAt: string;
  expiresAt?: string;
  name: string;
}

/**
 * Generate a secure API token
 */
export function generateApiToken(name: string = 'auto-generated'): ApiToken {
  // Generate a secure random token
  const tokenBytes = randomBytes(32);
  const token = `alecs_${tokenBytes.toString('base64url')}`;
  
  // Generate a shorter ID for the token
  const idBytes = randomBytes(8);
  const id = `tok_${idBytes.toString('hex')}`;
  
  const now = new Date();
  
  return {
    id,
    token,
    createdAt: now.toISOString(),
    name,
    // No expiration by default for auto-generated tokens
  };
}

/**
 * Generate a token hash for secure storage (if needed)
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Validate token format
 */
export function isValidTokenFormat(token: string): boolean {
  return /^alecs_[A-Za-z0-9_-]{43}$/.test(token);
}

/**
 * Display token information in a user-friendly format
 */
export function formatTokenDisplay(apiToken: ApiToken): string {
  const lines = [
    '',
    '🔑 API Token Generated',
    '═'.repeat(50),
    '',
    `Token ID: ${apiToken.id}`,
    `Token:    ${apiToken.token}`,
    `Created:  ${new Date(apiToken.createdAt).toLocaleString()}`,
    '',
    '📋 Usage Examples:',
    '',
    '• WebSocket connection:',
    `  ws://localhost:8082/mcp?token=${apiToken.token}`,
    '',
    '• SSE connection:',
    `  http://localhost:8083/mcp?token=${apiToken.token}`,
    '',
    '• Authorization header:',
    `  Authorization: Bearer ${apiToken.token}`,
    '',
    '⚠️  IMPORTANT: Save this token securely!',
    '   It will not be displayed again.',
    '',
    '═'.repeat(50),
    ''
  ];
  
  return lines.join('\n');
}

/**
 * Generate and display a new API token for remote access
 */
export function generateAndDisplayToken(name?: string): ApiToken {
  const token = generateApiToken(name || `Remote Access ${new Date().toLocaleDateString()}`);
  
  // Log token information
  logger.debug('API token generated for remote access', {
    tokenId: token.id,
    createdAt: token.createdAt,
    name: token.name,
  });
  
  // Display token to user
  console.log(formatTokenDisplay(token));
  
  return token;
}

/**
 * Simple token validation (in a real implementation, you'd check against stored tokens)
 */
export function validateApiToken(token: string): boolean {
  // For demo purposes, accept any properly formatted token
  // In production, you'd validate against a secure token store
  return isValidTokenFormat(token);
}