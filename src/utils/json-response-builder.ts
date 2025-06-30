/**
 * JSON Response Builder for Claude Desktop Optimization
 * 
 * CODE KAI PRINCIPLES:
 * - Structured data > Pre-formatted summaries for LLM consumption
 * - Consistent response formats across all tools
 * - Backward compatibility with format parameter
 * - Complete data for Claude's pattern recognition
 */

export interface StandardJsonResponse<T = any> {
  data: T;
  metadata: {
    total: number;
    shown: number;
    hasMore: boolean;
    executionTime: number;
    warnings: string[];
  };
  parameters: Record<string, any>;
  navigation?: {
    nextCursor?: string;
    prevCursor?: string;
    page?: number;
    perPage?: number;
  };
}

export interface JsonErrorResponse {
  error: {
    code: string;
    message: string;
    details: Record<string, any>;
  };
  resolution: {
    steps: string[];
    documentation?: string;
  };
  metadata: {
    timestamp: string;
    requestId: string;
  };
}

export interface ResponseBuilderOptions {
  executionStartTime?: number;
  requestId?: string;
  includeNavigation?: boolean;
  maxResponseSize?: number;
}

export class JsonResponseBuilder {
  private startTime: number;
  private requestId: string;
  // private _maxSize: number; // Not used currently

  constructor(options: ResponseBuilderOptions = {}) {
    this.startTime = options.executionStartTime || Date.now();
    this.requestId = options.requestId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    // this._maxSize = options.maxResponseSize || 1024 * 1024; // 1MB default - Not used currently
  }

  /**
   * Create a success response with structured data
   */
  success<T>(
    data: T, 
    parameters: Record<string, any> = {}, 
    metadata: Partial<StandardJsonResponse<T>['metadata']> = {}
  ): StandardJsonResponse<T> {
    const executionTime = Date.now() - this.startTime;
    
    // Handle array data
    if (Array.isArray(data)) {
      return {
        data,
        metadata: {
          total: data.length,
          shown: data.length,
          hasMore: false,
          executionTime,
          warnings: [],
          ...metadata,
        },
        parameters,
      };
    }

    // Handle object data
    return {
      data,
      metadata: {
        total: 1,
        shown: 1,
        hasMore: false,
        executionTime,
        warnings: [],
        ...metadata,
      },
      parameters,
    };
  }

  /**
   * Create a paginated response for large datasets
   */
  paginated<T>(
    allData: T[],
    parameters: Record<string, any> = {},
    pagination: { page?: number; perPage?: number; cursor?: string } = {}
  ): StandardJsonResponse<T[]> {
    const { page = 1, perPage = 50 } = pagination;
    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage;
    const pageData = allData.slice(startIndex, endIndex);
    const executionTime = Date.now() - this.startTime;

    return {
      data: pageData,
      metadata: {
        total: allData.length,
        shown: pageData.length,
        hasMore: endIndex < allData.length,
        executionTime,
        warnings: [],
      },
      parameters,
      navigation: {
        page,
        perPage,
        nextCursor: endIndex < allData.length ? `page_${page + 1}` : undefined,
        prevCursor: page > 1 ? `page_${page - 1}` : undefined,
      },
    };
  }

  /**
   * Create a summary response for oversized data
   */
  summary<_T>(
    summary: any,
    totalCount: number,
    parameters: Record<string, any> = {},
    suggestedQueries: string[] = []
  ): StandardJsonResponse<any> {
    const executionTime = Date.now() - this.startTime;

    return {
      data: summary,
      metadata: {
        total: totalCount,
        shown: 0,
        hasMore: true,
        executionTime,
        warnings: [
          'Full data too large for single response. Summary provided.',
          ...(suggestedQueries.length > 0 ? ['See suggested queries for specific data.'] : []),
        ],
      },
      parameters: {
        ...parameters,
        suggestedQueries,
      },
    };
  }

  /**
   * Create an error response
   */
  error(
    code: string,
    message: string,
    details: Record<string, any> = {},
    resolutionSteps: string[] = []
  ): JsonErrorResponse {
    return {
      error: {
        code,
        message,
        details,
      },
      resolution: {
        steps: resolutionSteps,
        documentation: 'https://techdocs.akamai.com/property-mgr/reference/api',
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: this.requestId,
      },
    };
  }
}

/**
 * Format conversion utility for backward compatibility
 */
export function formatResponse(
  jsonResponse: StandardJsonResponse | JsonErrorResponse,
  format: 'json' | 'text' = 'json'
): any {
  if (format === 'json') {
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(jsonResponse, null, 2),
        },
      ],
    };
  }

  // For text format, we need to convert back to markdown/text
  // This will be implemented per tool as they're converted
  return jsonResponse;
}

/**
 * Utility functions for common response patterns
 */
export const ResponsePatterns = {
  /**
   * Standard list response for entities
   */
  entityList<T extends { id?: string; name?: string }>(
    entities: T[],
    parameters: Record<string, any>,
    metadata: { entityType: string; searchTerm?: string } = { entityType: 'items' }
  ): StandardJsonResponse<T[]> {
    const builder = new JsonResponseBuilder();
    
    return builder.success(entities, parameters, {
      total: entities.length,
      shown: entities.length,
      hasMore: false,
      executionTime: Date.now() - Date.now(),
      warnings: metadata.searchTerm ? [`Filtered by: ${metadata.searchTerm}`] : [],
    });
  },

  /**
   * Standard single entity response
   */
  entity<T>(
    entity: T,
    parameters: Record<string, any>,
    _metadata: { entityType: string } = { entityType: 'item' }
  ): StandardJsonResponse<T> {
    const builder = new JsonResponseBuilder();
    return builder.success(entity, parameters);
  },

  /**
   * Standard operation result (create, update, delete)
   */
  operation(
    result: any,
    _operation: string,
    parameters: Record<string, any>,
    nextSteps: Array<{ action: string; description: string; command?: string }> = []
  ): StandardJsonResponse<any> {
    const builder = new JsonResponseBuilder();
    
    return builder.success(result, parameters, {
      total: 1,
      shown: 1,
      hasMore: false,
      executionTime: Date.now() - Date.now(),
      warnings: nextSteps.length > 0 ? ['Additional steps available'] : [],
    });
  },
};

/**
 * Validation helper for format parameter
 */
export function validateFormatParameter(format?: string): 'json' | 'text' {
  if (format === 'json' || format === 'text') {
    return format;
  }
  return 'text'; // Default to text for backward compatibility
}