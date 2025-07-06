/**
 * MCP Protocol Types - Manual Implementation
 * Based on MCP Specification 2025-06-18
 */

export interface MCPRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

export interface MCPResponse {
  jsonrpc: "2.0";
  id: string | number;
  result?: unknown;
  error?: MCPError;
}

export interface MCPNotification {
  jsonrpc: "2.0";
  method: string;
  params?: Record<string, unknown>;
}

export interface MCPError {
  code: number;
  message: string;
  data?: unknown;
}

export interface MCPToolRequest {
  name: string;
  arguments?: Record<string, unknown>;
}

export interface MCPToolResponse {
  content: Array<{
    type: "text" | "image" | "resource";
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface MCPPrompt {
  name: string;
  description?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
}

export interface MCPServerCapabilities {
  experimental?: Record<string, unknown>;
  logging?: object;
  prompts?: {
    listChanged?: boolean;
  };
  resources?: {
    subscribe?: boolean;
    listChanged?: boolean;
  };
  tools?: {
    listChanged?: boolean;
  };
}

export interface MCPClientCapabilities {
  experimental?: Record<string, unknown>;
  roots?: {
    listChanged?: boolean;
  };
  sampling?: object;
}

export interface MCPInitializeRequest extends MCPRequest {
  method: "initialize";
  params: {
    protocolVersion: string;
    capabilities: MCPClientCapabilities;
    clientInfo: {
      name: string;
      version: string;
    };
  };
}

export interface MCPInitializeResponse extends MCPResponse {
  result: {
    protocolVersion: string;
    capabilities: MCPServerCapabilities;
    serverInfo: {
      name: string;
      version: string;
    };
  };
}

// Tool-related types
export interface MCPListToolsRequest extends MCPRequest {
  method: "tools/list";
}

export interface MCPListToolsResponse extends MCPResponse {
  result: {
    tools: Array<{
      name: string;
      description?: string;
      inputSchema: {
        type: "object";
        properties?: Record<string, unknown>;
        required?: string[];
      };
    }>;
  };
}

export interface MCPCallToolRequest extends MCPRequest {
  method: "tools/call";
  params: {
    name: string;
    arguments?: Record<string, unknown>;
  };
}

export interface MCPCallToolResponse extends MCPResponse {
  result: MCPToolResponse;
}

// Resource-related types
export interface MCPListResourcesRequest extends MCPRequest {
  method: "resources/list";
}

export interface MCPListResourcesResponse extends MCPResponse {
  result: {
    resources: MCPResource[];
  };
}

export interface MCPReadResourceRequest extends MCPRequest {
  method: "resources/read";
  params: {
    uri: string;
  };
}

export interface MCPReadResourceResponse extends MCPResponse {
  result: {
    contents: Array<{
      uri: string;
      mimeType?: string;
      text?: string;
      blob?: string;
    }>;
  };
}

// Prompt-related types
export interface MCPListPromptsRequest extends MCPRequest {
  method: "prompts/list";
}

export interface MCPListPromptsResponse extends MCPResponse {
  result: {
    prompts: MCPPrompt[];
  };
}

export interface MCPGetPromptRequest extends MCPRequest {
  method: "prompts/get";
  params: {
    name: string;
    arguments?: Record<string, unknown>;
  };
}

export interface MCPGetPromptResponse extends MCPResponse {
  result: {
    description?: string;
    messages: Array<{
      role: "user" | "assistant";
      content: {
        type: "text" | "image";
        text?: string;
        data?: string;
        mimeType?: string;
      };
    }>;
  };
}

// Logging types
export interface MCPLoggingMessageNotification extends MCPNotification {
  method: "notifications/message";
  params: {
    level: "debug" | "info" | "notice" | "warning" | "error" | "critical" | "alert" | "emergency";
    message: string;
    data?: unknown;
  };
}

// Progress tracking
export interface MCPProgressNotification extends MCPNotification {
  method: "notifications/progress";
  params: {
    progressToken: string | number;
    progress: number;
    total?: number;
  };
}

// Error codes
export const MCPErrorCodes = {
  ParseError: -32700,
  InvalidRequest: -32600,
  MethodNotFound: -32601,
  InvalidParams: -32602,
  InternalError: -32603,
} as const;

// Transport types
export interface MCPTransport {
  start(): Promise<void>;
  send(message: MCPRequest | MCPResponse | MCPNotification): Promise<void>;
  close(): Promise<void>;
  onMessage(handler: (message: unknown) => void): void;
  onError(handler: (error: Error) => void): void;
  onClose(handler: () => void): void;
}

export interface MCPServer {
  capabilities: MCPServerCapabilities;
  name: string;
  version: string;
  setRequestHandler<T = unknown>(
    method: string,
    handler: (request: MCPRequest, extra?: unknown) => Promise<T>
  ): void;
  setNotificationHandler(
    method: string,
    handler: (notification: MCPNotification) => Promise<void>
  ): void;
  connect(transport: MCPTransport): Promise<void>;
  close(): Promise<void>;
}
