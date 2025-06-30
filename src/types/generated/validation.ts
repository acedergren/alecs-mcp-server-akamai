/**
 * Type validation utilities for Akamai API responses
 */

import type { paths as PropertyManagerPaths } from './property-manager';
import type { paths as EdgeDNSPaths } from './edge-dns';

// Type guard generators
export function createTypeGuard<T>(validator: (value: unknown) => value is T) {
  return validator;
}

// Response type extractors
export type ExtractResponse<
  TPath extends keyof PropertyManagerPaths,
  TMethod extends keyof PropertyManagerPaths[TPath],
  TStatus = 200
> = PropertyManagerPaths[TPath][TMethod] extends { responses: infer R }
  ? R extends Record<number, any>
    ? TStatus extends keyof R
      ? R[TStatus] extends { content: { 'application/json': infer JsonContent } }
        ? JsonContent
        : never
      : never
    : never
  : never;

export type ExtractDNSResponse<
  TPath extends keyof EdgeDNSPaths,
  TMethod extends keyof EdgeDNSPaths[TPath],
  TStatus = 200
> = EdgeDNSPaths[TPath][TMethod] extends { responses: infer R }
  ? R extends Record<number, any>
    ? TStatus extends keyof R
      ? R[TStatus] extends { content: { 'application/json': infer JsonContent } }
        ? JsonContent
        : never
      : never
    : never
  : never;

// Runtime validation helpers
export function isApiResponse<T>(
  value: unknown,
  validator: (v: unknown) => v is T
): value is T {
  return validator(value);
}
