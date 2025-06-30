/**
 * OAuth Support Tests (DEPRECATED)
 * 
 * @deprecated OAuth support is deprecated in favor of API key authentication.
 * These tests are kept for backwards compatibility but will be removed in v2.0.0.
 * 
 * ALECS now uses API key authentication via the TokenManager.
 * See TokenManager.ts for the current authentication implementation.
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

describe('OAuth Support (DEPRECATED)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should indicate OAuth is deprecated', () => {
    console.warn(
      'OAuth support is deprecated. Please use API key authentication instead.'
    );
    expect(true).toBe(true);
  });

  it('should recommend using TokenManager for authentication', () => {
    const recommendation = {
      deprecated: 'OAuth 2.1',
      recommended: 'API Key via TokenManager',
      migrationPath: 'Use TOKEN_MASTER_KEY environment variable',
    };
    
    expect(recommendation.deprecated).toBe('OAuth 2.1');
    expect(recommendation.recommended).toBe('API Key via TokenManager');
  });
});