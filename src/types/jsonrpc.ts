/**
 * JSON-RPC 2.0 message types for MCP 2025-06-18 specification compliance
 */

/**
 * JSON-RPC 2.0 Request interface
 */
export interface JsonRpcRequest {
  /** JSON-RPC version (must be "2.0") */
  jsonrpc: '2.0';
  /** Request method name */
  method: string;
  /** Request parameters */
  params?: unknown;
  /** Request ID (string, number, or null) */
  id: string | number | null;
  /** Optional metadata field (2025-06-18 spec) */
  _meta?: Record<string, unknown>;
}

/**
 * JSON-RPC 2.0 Response interface
 */
export interface JsonRpcResponse {
  /** JSON-RPC version (must be "2.0") */
  jsonrpc: '2.0';
  /** Result data (mutually exclusive with _error) */
  result?: unknown;
  /** Error object (mutually exclusive with result) */
  error?: JsonRpcError;
  /** Request ID that this response corresponds to */
  id: string | number | null;
  /** Optional metadata field (2025-06-18 spec) */
  _meta?: Record<string, unknown>;
}

/**
 * JSON-RPC 2.0 Error object
 */
export interface JsonRpcError {
  /** Error code */
  code: number;
  /** Error message */
  message: string;
  /** Additional error data */
  data?: unknown;
}

/**
 * JSON-RPC 2.0 Notification (request without id)
 */
export interface JsonRpcNotification {
  /** JSON-RPC version (must be "2.0") */
  jsonrpc: '2.0';
  /** Notification method name */
  method: string;
  /** Notification parameters */
  params?: unknown;
  /** Optional metadata field (2025-06-18 spec) */
  _meta?: Record<string, unknown>;
}

/**
 * Standard JSON-RPC 2.0 error codes
 */
export enum JsonRpcErrorCode {
  /** Invalid JSON was received by the server */
  ParseError = -32700,
  /** The JSON sent is not a valid Request object */
  InvalidRequest = -32600,
  /** The method does not exist / is not available */
  MethodNotFound = -32601,
  /** Invalid method parameter(s) */
  InvalidParams = -32602,
  /** Internal JSON-RPC error */
  InternalError = -32603,
  /** Server error (reserved for implementation-defined server errors) */
  ServerError = -32000,
}

/**
 * Type guard for JSON-RPC request
 */
export function isJsonRpcRequest(message: unknown): message is JsonRpcRequest {
  return (
    typeof message === 'object' &&
    message !== null &&
    'jsonrpc' in message &&
    (message as any).jsonrpc === '2.0' &&
    'method' in message &&
    typeof (message as any).method === 'string' &&
    ('id' in message || !('id' in message)) // id is optional for notifications
  );
}

/**
 * Type guard for JSON-RPC response
 */
export function isJsonRpcResponse(message: unknown): message is JsonRpcResponse {
  return (
    typeof message === 'object' &&
    message !== null &&
    'jsonrpc' in message &&
    (message as any).jsonrpc === '2.0' &&
    'id' in message &&
    (('result' in message && !('error' in message)) ||
      (!('result' in message) && 'error' in message))
  );
}

/**
 * Type guard for JSON-RPC notification
 */
export function isJsonRpcNotification(message: unknown): message is JsonRpcNotification {
  return (
    isJsonRpcRequest(message) &&
    !('id' in message)
  );
}

/**
 * Create a JSON-RPC 2.0 error response
 */
export function createJsonRpcError(
  id: string | number | null,
  code: number,
  message: string,
  data?: unknown,
  meta?: Record<string, unknown>,
): JsonRpcResponse {
  const response: JsonRpcResponse = {
    jsonrpc: '2.0',
    error: {
      code,
      message,
      ...(data !== undefined && { data },
    },
    id,
  };

  if (meta) {
    response._meta = meta;
  }

  return response;
}

/**
 * Create a JSON-RPC 2.0 success response
 */
export function createJsonRpcSuccess(
  id: string | number | null,
  result: unknown,
  meta?: Record<string, unknown>,
): JsonRpcResponse {
  const response: JsonRpcResponse = {
    jsonrpc: '2.0',
    result,
    id,
  };

  if (meta) {
    response._meta = meta;
  }

  return response;
}

/**
 * Validate request ID according to JSON-RPC 2.0 spec
 */
export function isValidRequestId(id: unknown): id is string | number | null {
  return (
    id === null ||
    typeof id === 'string' ||
    (typeof id === 'number' && Number.isFinite(id))
  );
}

/**
 * Request context for internal use
 */
export interface RequestContext {
  id: string | number;
  timestamp: number;
  transport: string;
  authenticated?: boolean;
  token?: string;
  scopes?: string[];
}
