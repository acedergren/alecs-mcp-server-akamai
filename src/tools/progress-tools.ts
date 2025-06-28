/**
 * Progress Tracking Tools
 * 
 * Provides tools for checking progress of long-running operations
 */

import { type AkamaiClient } from '../akamai-client';
import { type MCPToolResponse } from '../types';
import { ProgressManager } from '../utils/mcp-progress';

/**
 * Get progress status for a progress token
 */
export async function getProgress(
  _client: AkamaiClient,
  args: {
    token: string;
  }
): Promise<MCPToolResponse> {
  const progressManager = ProgressManager.getInstance();
  const progressToken = progressManager.getToken(args.token);

  if (!progressToken) {
    return {
      content: [
        {
          type: 'text',
          text: `[ERROR] Progress token not found: ${args.token}\n\nThis could mean:\n- The operation has completed and the token expired\n- The token ID is incorrect\n- The server was restarted`,
        },
      ],
    };
  }

  const status = progressToken.getStatus();
  
  let text = `# Progress Status\n\n`;
  text += `**Token:** ${status.token}\n`;
  text += `**Status:** ${status.status.toUpperCase()}\n`;
  text += `**Progress:** ${status.progress}%\n`;
  text += `**Message:** ${status.message}\n`;

  if (status.metadata) {
    text += '\n## Details\n';
    if (status.metadata.activationId) {
      text += `**Activation ID:** ${status.metadata.activationId}\n`;
    }
    if (status.metadata.propertyId) {
      text += `**Property ID:** ${status.metadata.propertyId}\n`;
    }
    if (status.metadata.network) {
      text += `**Network:** ${status.metadata.network}\n`;
    }
    if (status.metadata.estimatedTimeRemaining && status.metadata.estimatedTimeRemaining > 0) {
      const minutes = Math.ceil(status.metadata.estimatedTimeRemaining / 60);
      text += `**Estimated Time Remaining:** ${minutes} minute${minutes !== 1 ? 's' : ''}\n`;
    }
  }

  // Add progress bar visualization
  const barLength = 40;
  const filledLength = Math.floor((status.progress / 100) * barLength);
  const emptyLength = barLength - filledLength;
  const progressBar = '[' + '=' .repeat(filledLength) + '-'.repeat(emptyLength) + ']';
  
  text += `\n## Progress\n${progressBar} ${status.progress}%\n`;

  // Add status-specific guidance
  switch (status.status) {
    case 'completed':
      text += '\n[SUCCESS] Operation completed successfully!';
      break;
    case 'failed':
      text += '\n[ERROR] Operation failed. Check the error message above.';
      break;
    case 'in_progress':
      text += '\n[INFO] Operation is still in progress. Check again in a few moments.';
      break;
    case 'pending':
      text += '\n[INFO] Operation is pending start.';
      break;
  }

  return {
    content: [
      {
        type: 'text',
        text,
      },
    ],
  };
}

/**
 * List all active progress tokens
 */
export async function listActiveProgress(
  _client: AkamaiClient,
  _args: {}
): Promise<MCPToolResponse> {
  const progressManager = ProgressManager.getInstance();
  const activeTokens = progressManager.getActiveTokens();

  if (activeTokens.length === 0) {
    return {
      content: [
        {
          type: 'text',
          text: '[INFO] No active operations in progress.',
        },
      ],
    };
  }

  let text = `# Active Operations (${activeTokens.length})\n\n`;

  activeTokens.forEach((token, index) => {
    const status = token.getStatus();
    text += `## ${index + 1}. ${status.message}\n`;
    text += `- **Token:** ${status.token}\n`;
    text += `- **Progress:** ${status.progress}%\n`;
    text += `- **Status:** ${status.status}\n`;
    
    if (status.metadata?.activationId) {
      text += `- **Activation ID:** ${status.metadata.activationId}\n`;
    }
    
    text += '\n';
  });

  text += '[TIP] Check specific progress with: "Get progress [token]"';

  return {
    content: [
      {
        type: 'text',
        text,
      },
    ],
  };
}