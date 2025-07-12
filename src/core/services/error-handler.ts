/**
 * Unified Error Handling Service
 * 
 * Provides a standardized, robust, and type-safe way to handle errors across the entire application.
 * This service replaces all previous error handling implementations.
 */

import { z } from 'zod';
import { createLogger } from '../../utils/pino-logger';

const logger = createLogger('error-handler');

export enum ErrorType {
  Validation = 'VALIDATION_ERROR',
  Authentication = 'AUTHENTICATION_ERROR',
  Authorization = 'AUTHORIZATION_ERROR',
  NotFound = 'NOT_FOUND_ERROR',
  Conflict = 'CONFLICT_ERROR',
  ApiError = 'API_ERROR',
  Internal = 'INTERNAL_ERROR',
  Unknown = 'UNKNOWN_ERROR',
}

const ErrorContextSchema = z.object({
  operation: z.string(),
  parameters: z.record(z.any()).optional(),
  context: z.string().optional(),
  customer: z.string().optional(),
});

type ErrorContext = z.infer<typeof ErrorContextSchema>;

export class UnifiedErrorHandler {
  handle(error: unknown, context: ErrorContext): { type: ErrorType; message: string; details?: any } {
    const validatedContext = ErrorContextSchema.parse(context);
    logger.error({ error, ...validatedContext }, `Error during operation: ${validatedContext.operation}`);

    if (error instanceof z.ZodError) {
      return {
        type: ErrorType.Validation,
        message: 'Invalid input parameters.',
        details: error.errors,
      };
    }

    // Assuming a structure for Akamai API errors
    if (typeof error === 'object' && error !== null && 'status' in error) {
      const status = (error as any).status;
      switch (status) {
        case 400:
          return { type: ErrorType.Validation, message: 'Bad request to Akamai API.', details: error };
        case 401:
          return { type: ErrorType.Authentication, message: 'Authentication with Akamai API failed.', details: error };
        case 403:
          return { type: ErrorType.Authorization, message: 'Authorization denied by Akamai API.', details: error };
        case 404:
          return { type: ErrorType.NotFound, message: 'Resource not found in Akamai.', details: error };
        case 409:
          return { type: ErrorType.Conflict, message: 'Conflict with existing resource in Akamai.', details: error };
        default:
          return { type: ErrorType.ApiError, message: `Akamai API returned status ${status}.`, details: error };
      }
    }

    if (error instanceof Error) {
      return {
        type: ErrorType.Internal,
        message: error.message,
        details: { stack: error.stack },
      };
    }

    return {
      type: ErrorType.Unknown,
      message: 'An unknown error occurred.',
      details: error,
    };
  }
}

export const errorHandler = new UnifiedErrorHandler();
