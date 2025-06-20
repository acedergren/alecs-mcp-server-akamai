/**
 * JSON-RPC 2.0 compliance middleware for MCP servers
 * Ensures proper request/response format and ID handling
 */

import {
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcError,
  JsonRpcErrorCode,
  createJsonRpcError,
  createJsonRpcSuccess,
  isValidRequestId,
} from '../types/jsonrpc';

/**
 * Middleware to ensure JSON-RPC 2.0 compliance
 */
export class JsonRpcMiddleware {
  /**
   * Wrap a handler to ensure JSON-RPC 2.0 compliance
   */
  static wrapHandler<T = any>(
    handler: (params: any) => Promise<T>,
  ): (_request: JsonRpcRequest) => Promise<JsonRpcResponse> {
    return async (_request: JsonRpcRequest): Promise<JsonRpcResponse> => {
      // Validate request ID
      if ('id' in request && !isValidRequestId(request.id)) {
        return createJsonRpcError(
          null,
          JsonRpcErrorCode.InvalidRequest,
          'Invalid request ID format',
        );
      }

      // Validate JSON-RPC version
      if (request.jsonrpc !== '2.0') {
        return createJsonRpcError(
          request.id ?? null,
          JsonRpcErrorCode.InvalidRequest,
          'Invalid JSON-RPC version, must be "2.0"',
        );
      }

      try {
        // Execute the handler
        const result = await handler(request.params);

        // Create success response with proper ID
        return createJsonRpcSuccess(
          request.id ?? null,
          result,
          request._meta, // Preserve metadata
        );
      } catch (_error) {
        // Handle errors and create proper error response
        return this.createErrorResponse(request.id ?? null, error, request._meta);
      }
    };
  }

  /**
   * Create error response from various error types
   */
  private static createErrorResponse(
    id: string | number | null,
    error: unknown,
    meta?: Record<string, unknown>,
  ): JsonRpcResponse {
    // Handle different error types
    if (error instanceof Error) {
      // Check for specific error types that map to JSON-RPC error codes
      if (error.message.includes('not found') || error.message.includes('unknown method')) {
        return createJsonRpcError(
          id,
          JsonRpcErrorCode.MethodNotFound,
          error.message,
          undefined,
          meta,
        );
      }

      if (error.message.includes('invalid') || error.message.includes('validation')) {
        return createJsonRpcError(
          id,
          JsonRpcErrorCode.InvalidParams,
          error.message,
          undefined,
          meta,
        );
      }

      // Default to internal error
      return createJsonRpcError(
        id,
        JsonRpcErrorCode.InternalError,
        error.message,
        error.stack,
        meta,
      );
    }

    // Handle custom error objects
    if (typeof error === 'object' && error !== null && 'code' in error) {
      const customError = error as any;
      return createJsonRpcError(
        id,
        customError.code || JsonRpcErrorCode.InternalError,
        customError.message || 'Unknown error',
        customError.data,
        meta,
      );
    }

    // Fallback for unknown error types
    return createJsonRpcError(
      id,
      JsonRpcErrorCode.InternalError,
      'An unknown error occurred',
      String(error),
      meta,
    );
  }

  /**
   * Validate incoming JSON-RPC request
   */
  static validateRequest(_request: unknown): JsonRpcRequest {
    if (!request || typeof request !== 'object') {
      throw new Error('Request must be an object');
    }

    const req = request as any;

    // Check required fields
    if (req.jsonrpc !== '2.0') {
      throw new Error('Invalid JSON-RPC version');
    }

    if (typeof req.method !== 'string') {
      throw new Error('Method must be a string');
    }

    // Validate ID if present
    if ('id' in req && !isValidRequestId(req.id)) {
      throw new Error('Invalid request ID');
    }

    return req as JsonRpcRequest;
  }

  /**
   * Add metadata to response
   */
  static addMetadata(
    response: JsonRpcResponse,
    metadata: Record<string, unknown>,
  ): JsonRpcResponse {
    return {
      ...response,
      _meta: {
        ...response._meta,
        ...metadata,
      },
    };
  }

  /**
   * Extract metadata from request
   */
  static extractMetadata(_request: JsonRpcRequest): Record<string, unknown> | undefined {
    return request._meta;
  }
}

/**
 * Request ID generator for unique IDs
 */
export class RequestIdGenerator {
  private counter = 0;
  private prefix: string;

  constructor(prefix = 'mcp') {
    this.prefix = prefix;
  }

  /**
   * Generate a unique request ID
   */
  generate(): string {
    const timestamp = Date.now();
    const count = ++this.counter;
    return `${this.prefix}-${timestamp}-${count}`;
  }

  /**
   * Reset the counter
   */
  reset(): void {
    this.counter = 0;
  }
}

/**
 * JSON-RPC batch request handler
 */
export class BatchRequestHandler {
  /**
   * Process batch requests according to JSON-RPC 2.0 spec
   */
  static async processBatch(
    requests: JsonRpcRequest[],
    handler: (_request: JsonRpcRequest) => Promise<JsonRpcResponse>,
  ): Promise<JsonRpcResponse[]> {
    const responses: JsonRpcResponse[] = [];

    for (const request of requests) {
      try {
        const response = await handler(request);
        // Only include responses for requests with IDs (not notifications)
        if ('id' in request && request.id !== undefined) {
          responses.push(response);
        }
      } catch (_error) {
        // Even errors should be included if the request had an ID
        if ('id' in request && request.id !== undefined) {
          responses.push(
            createJsonRpcError(
              request.id,
              JsonRpcErrorCode.InternalError,
              error instanceof Error ? error.message : 'Unknown error',
            ),
          );
        }
      }
    }

    return responses;
  }
}
