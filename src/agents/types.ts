/**
 * Type definitions for agent responses
 */

export interface ApiResponse<T = any> {
  data: T;
  headers?: Record<string, string>;
  status?: number;
}

export interface PropertyVersionResponse {
  versionLink: string;
}

export interface PropertyResponse {
  property: any;
}

export interface ActivationResponse {
  activationLink: string;
}

export interface EdgeHostnameResponse {
  edgeHostnameLink: string;
}

export interface DnsZoneResponse {
  zone: string;
  versionId?: string;
}

export interface CertificateEnrollmentResponse {
  enrollment: string;
  location: string;
}

// PAPI response types
export interface PapiVersionResponse {
  versionLink: string;
}

export interface PapiRulesResponse {
  rules: any;
}

export interface PapiEdgeHostnameResponse {
  edgeHostnameLink: string;
}

export interface PapiActivationResponse {
  activationLink: string;
}

export interface PapiGroupsResponse {
  groups: {
    items: any[];
  };
}

export interface PapiVersionsResponse {
  versions: {
    items: any[];
  };
}

export interface PapiHostnamesResponse {
  hostnames: {
    items: any[];
  };
}

export interface PapiEdgeHostnamesResponse {
  edgeHostnames: {
    items: any[];
  };
}

export interface PapiActivationsResponse {
  activations: {
    items: any[];
  };
}

export interface PapiPropertyResponse {
  propertyLink: string;
}

export interface PapiErrorsResponse {
  errors?: any[];
}

export interface PapiEtagResponse {
  etag?: string;
  headers?: {
    etag?: string;
  };
}

// DNS response types
export interface DnsRecordsetsResponse {
  recordsets: any[];
}

// CPS response types
export interface CpsResultsResponse {
  results: any[];
}

export interface CpsLocationResponse {
  location?: string;
  headers?: {
    location?: string;
  };
}

// Helper type guard
export function isApiResponse(obj: unknown): obj is ApiResponse {
  return obj !== null && typeof obj === 'object' && 'data' in obj;
}

// Type assertion helper
export function asApiResponse<T>(response: unknown): ApiResponse<T> {
  return response as ApiResponse<T>;
}
