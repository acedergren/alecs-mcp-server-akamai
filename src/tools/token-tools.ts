/**
 * Token Management Tools
 * MCP tools for creating and managing API tokens for remote access
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { TokenManager } from '../auth/TokenManager';
import { logger } from '../utils/logger';

/**
 * Generate a new API token
 */
export const generateApiToken: Tool = {
  name: 'generate-api-token',
  description: 'Generate a new API token for remote MCP access',
  inputSchema: {
    type: 'object',
    properties: {
      description: {
        type: 'string',
        description: 'Description of what this token is for',
      },
      expiresInDays: {
        type: 'number',
        description: 'Number of days until token expires (optional)',
      },
    },
  },
};

export async function handleGenerateApiToken(args: any) {
  try {
    const tokenManager = TokenManager.getInstance();
    
    const result = await tokenManager.generateToken({
      description: args.description,
      expiresInDays: args.expiresInDays,
    });
    
    return {
      content: [
        {
          type: 'text',
          text: `✅ API Token Generated Successfully

**Token ID:** ${result.tokenId}
**Description:** ${args.description || 'N/A'}
**Expires:** ${result.expiresAt ? result.expiresAt.toISOString() : 'Never'}

## Your API Token

\`\`\`
${result.token}
\`\`\`

⚠️ **IMPORTANT:** Save this token securely. It will not be shown again.

## Usage

Include this token in your HTTP requests:

\`\`\`bash
curl -H "Authorization: Bearer ${result.token}" \\
     -H "Content-Type: application/json" \\
     -d '{"jsonrpc":"2.0","method":"list-properties","params":{},"id":1}' \\
     http://localhost:3000/jsonrpc
\`\`\`

## Next Steps

1. Store this token in your client's secure configuration
2. Use it for all remote MCP requests
3. Monitor token usage with \`list-api-tokens\`
4. Revoke when no longer needed with \`revoke-api-token\``,
        },
      ],
    };
  } catch (error) {
    logger.error('Failed to generate API token', { error });
    return {
      content: [
        {
          type: 'text',
          text: `❌ Failed to generate API token: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
    };
  }
}

/**
 * List API tokens
 */
export const listApiTokens: Tool = {
  name: 'list-api-tokens',
  description: 'List all API tokens',
  inputSchema: {
    type: 'object',
    properties: {},
  },
};

export async function handleListApiTokens(_args: any) {
  try {
    const tokenManager = TokenManager.getInstance();
    const tokens = await tokenManager.listTokens();
    
    if (tokens.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `No API tokens found.`,
          },
        ],
      };
    }
    
    const tokenList = tokens.map(token => {
      const status = !token.isActive ? '🔴 Revoked' : 
                    (token.expiresAt && new Date() > token.expiresAt) ? '🟡 Expired' : 
                    '🟢 Active';
      
      return `### ${token.tokenId}
**Status:** ${status}
**Description:** ${token.description || 'N/A'}
**Created:** ${token.createdAt.toISOString()}
**Last Used:** ${token.lastUsedAt ? token.lastUsedAt.toISOString() : 'Never'}
**Expires:** ${token.expiresAt ? token.expiresAt.toISOString() : 'Never'}`;
    }).join('\n\n');
    
    return {
      content: [
        {
          type: 'text',
          text: `## API Tokens (${tokens.length})

${tokenList}

## Token Management

- Generate new token: \`generate-api-token\`
- Revoke token: \`revoke-api-token --tokenId <id>\`
- Validate token: \`validate-api-token --token <token>\``,
        },
      ],
    };
  } catch (error) {
    logger.error('Failed to list API tokens', { error });
    return {
      content: [
        {
          type: 'text',
          text: `❌ Failed to list API tokens: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
    };
  }
}

/**
 * Revoke an API token
 */
export const revokeApiToken: Tool = {
  name: 'revoke-api-token',
  description: 'Revoke an API token to prevent further use',
  inputSchema: {
    type: 'object',
    properties: {
      tokenId: {
        type: 'string',
        description: 'The token ID to revoke',
      },
    },
    required: ['tokenId'],
  },
};

export async function handleRevokeApiToken(args: any) {
  try {
    const tokenManager = TokenManager.getInstance();
    const success = await tokenManager.revokeToken(args.tokenId);
    
    if (success) {
      return {
        content: [
          {
            type: 'text',
            text: `✅ Token ${args.tokenId} has been revoked successfully.

The token can no longer be used for authentication.`,
          },
        ],
      };
    } else {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Failed to revoke token ${args.tokenId}. Token may not exist.`,
          },
        ],
      };
    }
  } catch (error) {
    logger.error('Failed to revoke API token', { error });
    return {
      content: [
        {
          type: 'text',
          text: `❌ Failed to revoke API token: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
    };
  }
}

/**
 * Validate an API token
 */
export const validateApiToken: Tool = {
  name: 'validate-api-token',
  description: 'Validate an API token and show its details',
  inputSchema: {
    type: 'object',
    properties: {
      token: {
        type: 'string',
        description: 'The API token to validate',
      },
    },
    required: ['token'],
  },
};

export async function handleValidateApiToken(args: any) {
  try {
    const tokenManager = TokenManager.getInstance();
    const result = await tokenManager.validateToken(args.token);
    
    if (result.valid) {
      return {
        content: [
          {
            type: 'text',
            text: `✅ Token is valid

**Token ID:** ${result.tokenId}

This token can be used for API access.`,
          },
        ],
      };
    } else {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Token is invalid

**Error:** ${result.error || 'Unknown validation error'}

This token cannot be used for API access.`,
          },
        ],
      };
    }
  } catch (error) {
    logger.error('Failed to validate API token', { error });
    return {
      content: [
        {
          type: 'text',
          text: `❌ Failed to validate API token: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
    };
  }
}

/**
 * Rotate an API token
 */
export const rotateApiToken: Tool = {
  name: 'rotate-api-token',
  description: 'Rotate an API token (generate new, revoke old)',
  inputSchema: {
    type: 'object',
    properties: {
      tokenId: {
        type: 'string',
        description: 'The token ID to rotate',
      },
    },
    required: ['tokenId'],
  },
};

export async function handleRotateApiToken(args: any) {
  try {
    const tokenManager = TokenManager.getInstance();
    const result = await tokenManager.rotateToken(args.tokenId);
    
    if (result.success && result.newToken) {
      return {
        content: [
          {
            type: 'text',
            text: `✅ Token Rotated Successfully

**Old Token ID:** ${result.oldTokenId} (revoked)
**New Token ID:** ${result.newToken.tokenId}
**Expires:** ${result.newToken.expiresAt ? result.newToken.expiresAt.toISOString() : 'Never'}

## Your New API Token

\`\`\`
${result.newToken.token}
\`\`\`

⚠️ **IMPORTANT:** Save this token securely. The old token has been revoked and can no longer be used.

## Update Your Applications

Replace the old token with this new token in all your applications and scripts.`,
          },
        ],
      };
    } else {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Failed to rotate token: ${result.error || 'Unknown error'}`,
          },
        ],
      };
    }
  } catch (error) {
    logger.error('Failed to rotate API token', { error });
    return {
      content: [
        {
          type: 'text',
          text: `❌ Failed to rotate API token: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
    };
  }
}

/**
 * All token management tools
 */
export const tokenTools = [
  generateApiToken,
  listApiTokens,
  revokeApiToken,
  validateApiToken,
  rotateApiToken,
];