/**
 * Property Templates for Akamai CDN Configuration
 *
 * These templates provide pre-configured rule trees for common use cases,
 * enabling quick provisioning of CDN properties with best practices.
 */

export interface PropertyTemplate {
  id: string;
  name: string;
  description: string;
  category: 'web' | 'api' | 'media' | 'security';
  requiredInputs: TemplateInput[];
  optionalInputs: TemplateInput[];
  ruleTree: unknown; // PAPI rule tree structure
  edgeHostnameConfig: EdgeHostnameConfig;
  certificateRequirements?: CertificateRequirements;
  recommendedDNSRecords?: DNSRecordTemplate[];
}

export interface TemplateInput {
  key: string;
  label: string;
  description: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'multiselect' | 'url' | 'domain';
  validation?: InputValidation;
  defaultValue?: unknown;
  options?: SelectOption[]; // For select/multiselect types
  placeholder?: string;
}

export interface InputValidation {
  required?: boolean;
  pattern?: string; // Regex pattern
  min?: number;
  max?: number;
  customValidator?: (value: unknown) => boolean | string; // Return true or error message
}

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
}

export interface EdgeHostnameConfig {
  domainPrefix?: string;
  domainSuffix: string; // e.g., '.edgesuite.net', '.edgekey.net'
  ipVersionBehavior: 'IPV4' | 'IPV6' | 'IPV4_IPV6';
  certificateType: 'STANDARD_TLS' | 'ENHANCED_TLS' | 'SHARED_CERT';
}

export interface CertificateRequirements {
  type: 'DV' | 'OV' | 'EV' | 'THIRD_PARTY';
  sans?: string[]; // Subject Alternative Names
  networkDeployment: 'STANDARD_TLS' | 'ENHANCED_TLS';
  sniOnly: boolean;
  quicEnabled?: boolean;
}

export interface DNSRecordTemplate {
  type: 'CNAME' | 'A' | 'AAAA' | 'TXT' | 'CAA';
  name: string; // Can include placeholders like {{hostname}}
  value: string; // Can include placeholders like {{edgeHostname}}
  ttl: number;
  description: string;
}

/**
 * Static Website Template
 * Optimized for static content delivery with aggressive caching
 */
export const staticWebsiteTemplate: PropertyTemplate = {
  id: 'static-website',
  name: 'Static Website',
  description:
    'Optimized for static websites with HTML, CSS, JS, and images. Includes aggressive caching, compression, and HTTP/2 optimization.',
  category: 'web',
  requiredInputs: [
    {
      key: 'hostname',
      label: 'Website Hostname',
      description: 'The primary hostname for your website (e.g., www.example.com)',
      type: 'domain',
      validation: {
        required: true,
        pattern: '^([a-zA-Z0-9-]+\\.)+[a-zA-Z]{2,}$',
      },
      placeholder: 'www.example.com',
    },
    {
      key: 'originHostname',
      label: 'Origin Server Hostname',
      description: 'The hostname of your origin server',
      type: 'domain',
      validation: {
        required: true,
        pattern: '^([a-zA-Z0-9-]+\\.)+[a-zA-Z]{2,}$',
      },
      placeholder: 'origin.example.com',
    },
  ],
  optionalInputs: [
    {
      key: 'additionalHostnames',
      label: 'Additional Hostnames',
      description: 'Additional hostnames that should point to this property',
      type: 'multiselect',
      placeholder: 'example.com, cdn.example.com',
    },
    {
      key: 'cachingStrategy',
      label: 'Caching Strategy',
      description: 'How aggressively to cache content',
      type: 'select',
      defaultValue: 'standard',
      options: [
        {
          value: 'aggressive',
          label: 'Aggressive (30 days)',
          description: 'Maximum performance, requires cache busting for updates',
        },
        {
          value: 'standard',
          label: 'Standard (7 days)',
          description: 'Good balance of performance and freshness',
        },
        {
          value: 'conservative',
          label: 'Conservative (1 day)',
          description: 'More frequent origin checks',
        },
      ],
    },
    {
      key: 'compressionEnabled',
      label: 'Enable Compression',
      description: 'Compress text-based content (HTML, CSS, JS)',
      type: 'boolean',
      defaultValue: true,
    },
    {
      key: 'http2Enabled',
      label: 'Enable HTTP/2',
      description: 'Enable HTTP/2 for better performance',
      type: 'boolean',
      defaultValue: true,
    },
  ],
  edgeHostnameConfig: {
    domainSuffix: '.edgesuite.net',
    ipVersionBehavior: 'IPV4_IPV6',
    certificateType: 'ENHANCED_TLS',
  },
  certificateRequirements: {
    type: 'DV',
    networkDeployment: 'ENHANCED_TLS',
    sniOnly: true,
    quicEnabled: true,
  },
  recommendedDNSRecords: [
    {
      type: 'CNAME',
      name: '{{hostname}}',
      value: '{{edgeHostname}}',
      ttl: 300,
      description: 'Points your hostname to Akamai edge servers',
    },
    {
      type: 'CAA',
      name: '{{hostname}}',
      value: '0 issue "digicert.com"',
      ttl: 3600,
      description: 'Authorizes DigiCert to issue certificates for this domain',
    },
  ],
  ruleTree: {
    name: 'default',
    children: [
      {
        name: 'Performance',
        children: [
          {
            name: 'Compressible Objects',
            criteria: [
              {
                name: 'contentType',
                options: {
                  matchOperator: 'IS_ONE_OF',
                  values: [
                    'text/*',
                    'application/javascript',
                    'application/x-javascript',
                    'application/json',
                    'application/xml',
                  ],
                },
              },
            ],
            behaviors: [
              {
                name: 'gzipResponse',
                options: { behavior: 'ALWAYS' },
              },
            ],
          },
        ],
        behaviors: [
          {
            name: 'http2',
            options: { enabled: '{{http2Enabled}}' },
          },
          {
            name: 'allowTransferEncoding',
            options: { enabled: true },
          },
          {
            name: 'removeVary',
            options: { enabled: true },
          },
        ],
      },
      {
        name: 'Offload',
        children: [
          {
            name: 'Static Content',
            criteria: [
              {
                name: 'fileExtension',
                options: {
                  matchOperator: 'IS_ONE_OF',
                  values: [
                    'jpg',
                    'jpeg',
                    'png',
                    'gif',
                    'webp',
                    'css',
                    'js',
                    'woff',
                    'woff2',
                    'ttf',
                    'eot',
                    'svg',
                    'ico',
                  ],
                },
              },
            ],
            behaviors: [
              {
                name: 'caching',
                options: {
                  behavior: 'MAX_AGE',
                  mustRevalidate: false,
                  ttl: '{{cachingStrategy === "aggressive" ? "30d" : cachingStrategy === "standard" ? "7d" : "1d"}}',
                },
              },
              {
                name: 'prefreshCache',
                options: {
                  enabled: true,
                  prefreshval: 90,
                },
              },
            ],
          },
          {
            name: 'HTML Pages',
            criteria: [
              {
                name: 'fileExtension',
                options: {
                  matchOperator: 'IS_ONE_OF',
                  values: ['html', 'htm'],
                },
              },
            ],
            behaviors: [
              {
                name: 'caching',
                options: {
                  behavior: 'MAX_AGE',
                  mustRevalidate: true,
                  ttl: '10m',
                },
              },
              {
                name: 'cacheKeyQueryParams',
                options: {
                  behavior: 'IGNORE',
                  exactMatch: true,
                  parameters: [
                    'utm_source',
                    'utm_medium',
                    'utm_campaign',
                    'utm_content',
                    'fbclid',
                    'gclid',
                  ],
                },
              },
            ],
          },
        ],
        behaviors: [
          {
            name: 'caching',
            options: {
              behavior: 'NO_STORE',
            },
          },
          {
            name: 'tieredDistribution',
            options: {
              enabled: true,
            },
          },
        ],
      },
    ],
    behaviors: [
      {
        name: 'origin',
        options: {
          cacheKeyHostname: 'REQUEST_HOST_HEADER',
          compress: true,
          enableTrueClientIp: true,
          forwardHostHeader: 'REQUEST_HOST_HEADER',
          hostname: '{{originHostname}}',
          httpPort: 80,
          httpsPort: 443,
          originSni: true,
          originType: 'CUSTOMER',
          verificationMode: 'PLATFORM_SETTINGS',
        },
      },
      {
        name: 'cpCode',
        options: {
          value: {
            id: '{{cpCode}}',
          },
        },
      },
    ],
  },
};

/**
 * Dynamic Web Application Template
 * Optimized for dynamic content with API-driven backends
 */
export const dynamicWebApplicationTemplate: PropertyTemplate = {
  id: 'dynamic-web-app',
  name: 'Dynamic Web Application',
  description:
    'Optimized for modern web applications with API backends. Includes intelligent caching, API acceleration, and security headers.',
  category: 'web',
  requiredInputs: [
    {
      key: 'hostname',
      label: 'Application Hostname',
      description: 'The primary hostname for your application',
      type: 'domain',
      validation: {
        required: true,
        pattern: '^([a-zA-Z0-9-]+\\.)+[a-zA-Z]{2,}$',
      },
    },
    {
      key: 'originHostname',
      label: 'Origin Server Hostname',
      description: 'The hostname of your origin server',
      type: 'domain',
      validation: {
        required: true,
      },
    },
    {
      key: 'apiPath',
      label: 'API Path Pattern',
      description: 'Path pattern for API endpoints (e.g., /api/*, /graphql)',
      type: 'string',
      defaultValue: '/api/*',
      validation: {
        required: true,
        pattern: '^/.*',
      },
    },
  ],
  optionalInputs: [
    {
      key: 'corsOrigins',
      label: 'CORS Allowed Origins',
      description: 'Allowed origins for CORS requests',
      type: 'multiselect',
      placeholder: 'https://app.example.com, https://mobile.example.com',
    },
    {
      key: 'sessionAffinity',
      label: 'Enable Session Affinity',
      description: 'Sticky sessions for stateful applications',
      type: 'boolean',
      defaultValue: false,
    },
    {
      key: 'webSocketSupport',
      label: 'Enable WebSocket Support',
      description: 'Support for WebSocket connections',
      type: 'boolean',
      defaultValue: true,
    },
    {
      key: 'cachePersonalized',
      label: 'Cache Personalized Content',
      description: 'Cache content based on user segments',
      type: 'boolean',
      defaultValue: false,
    },
  ],
  edgeHostnameConfig: {
    domainSuffix: '.edgekey.net',
    ipVersionBehavior: 'IPV4_IPV6',
    certificateType: 'ENHANCED_TLS',
  },
  certificateRequirements: {
    type: 'DV',
    networkDeployment: 'ENHANCED_TLS',
    sniOnly: true,
    quicEnabled: true,
  },
  recommendedDNSRecords: [
    {
      type: 'CNAME',
      name: '{{hostname}}',
      value: '{{edgeHostname}}',
      ttl: 300,
      description: 'Points your hostname to Akamai edge servers',
    },
  ],
  ruleTree: {
    name: 'default',
    children: [
      {
        name: 'API Acceleration',
        criteria: [
          {
            name: 'path',
            options: {
              matchOperator: 'MATCHES_ONE_OF',
              values: ['{{apiPath}}'],
            },
          },
        ],
        children: [
          {
            name: 'CORS Support',
            behaviors: [
              {
                name: 'corsSupport',
                options: {
                  enabled: true,
                  allowOrigins: 'SPECIFIED',
                  origins: '{{corsOrigins}}',
                  allowMethods: 'GET HEAD POST PUT DELETE OPTIONS PATCH',
                  allowHeaders: ['Authorization', 'Content-Type', 'X-Requested-With'],
                  exposeHeaders: ['X-Total-Count', 'X-Page-Count'],
                  allowCredentials: true,
                  preflightMaxAge: 86400,
                },
              },
            ],
          },
          {
            name: 'GraphQL Caching',
            criteria: [
              {
                name: 'path',
                options: {
                  matchOperator: 'MATCHES_ONE_OF',
                  values: ['/graphql', '/graphql/*'],
                },
              },
            ],
            behaviors: [
              {
                name: 'graphqlCaching',
                options: {
                  enabled: true,
                  cacheResponsesWithErrors: false,
                },
              },
            ],
          },
        ],
        behaviors: [
          {
            name: 'caching',
            options: {
              behavior: 'BYPASS_CACHE',
            },
          },
          {
            name: 'apiPrioritization',
            options: {
              enabled: true,
              priorityType: 'DYNAMIC',
            },
          },
          {
            name: 'adaptiveAcceleration',
            options: {
              enabled: true,
              source: 'mPulse',
              enablePush: true,
              enablePreconnect: true,
            },
          },
        ],
      },
      {
        name: 'Static Assets',
        criteria: [
          {
            name: 'path',
            options: {
              matchOperator: 'MATCHES_ONE_OF',
              values: ['/static/*', '/assets/*', '/dist/*'],
            },
          },
        ],
        behaviors: [
          {
            name: 'caching',
            options: {
              behavior: 'MAX_AGE',
              ttl: '365d',
              mustRevalidate: false,
            },
          },
          {
            name: 'removeVary',
            options: { enabled: true },
          },
        ],
      },
      {
        name: 'Security Headers',
        behaviors: [
          {
            name: 'modifyOutgoingResponseHeader',
            options: {
              action: 'ADD',
              standardHeaderName: 'OTHER',
              customHeaderName: 'X-Frame-Options',
              headerValue: 'SAMEORIGIN',
            },
          },
          {
            name: 'modifyOutgoingResponseHeader',
            options: {
              action: 'ADD',
              standardHeaderName: 'OTHER',
              customHeaderName: 'X-Content-Type-Options',
              headerValue: 'nosniff',
            },
          },
          {
            name: 'modifyOutgoingResponseHeader',
            options: {
              action: 'ADD',
              standardHeaderName: 'OTHER',
              customHeaderName: 'Strict-Transport-Security',
              headerValue: 'max-age=31536000; includeSubDomains',
            },
          },
        ],
      },
    ],
    behaviors: [
      {
        name: 'origin',
        options: {
          cacheKeyHostname: 'REQUEST_HOST_HEADER',
          compress: true,
          enableTrueClientIp: true,
          forwardHostHeader: 'REQUEST_HOST_HEADER',
          hostname: '{{originHostname}}',
          httpPort: 80,
          httpsPort: 443,
          originSni: true,
          originType: 'CUSTOMER',
          verificationMode: 'PLATFORM_SETTINGS',
        },
      },
      {
        name: 'cpCode',
        options: {
          value: {
            id: '{{cpCode}}',
          },
        },
      },
      {
        name: 'sureRoute',
        options: {
          enabled: true,
          type: 'PERFORMANCE',
          testObjectUrl: '/akamai-sureroute-test.html',
        },
      },
    ],
  },
};

/**
 * API Acceleration Template
 * Optimized for RESTful APIs and microservices
 */
export const apiAccelerationTemplate: PropertyTemplate = {
  id: 'api-acceleration',
  name: 'API Acceleration',
  description:
    'Optimized for RESTful APIs and microservices. Includes rate limiting, authentication caching, and API-specific optimizations.',
  category: 'api',
  requiredInputs: [
    {
      key: 'hostname',
      label: 'API Hostname',
      description: 'The hostname for your API (e.g., api.example.com)',
      type: 'domain',
      validation: {
        required: true,
        pattern: '^([a-zA-Z0-9-]+\\.)+[a-zA-Z]{2,}$',
      },
    },
    {
      key: 'originHostname',
      label: 'Origin API Server',
      description: 'The hostname of your origin API server',
      type: 'domain',
      validation: {
        required: true,
      },
    },
    {
      key: 'apiVersion',
      label: 'API Version Path',
      description: 'API version in path (e.g., /v1, /v2)',
      type: 'string',
      defaultValue: '/v1',
      validation: {
        pattern: '^/v\\d+$',
      },
    },
  ],
  optionalInputs: [
    {
      key: 'rateLimitRequests',
      label: 'Rate Limit (requests/minute)',
      description: 'Maximum requests per minute per client',
      type: 'number',
      defaultValue: 1000,
      validation: {
        min: 1,
        max: 100000,
      },
    },
    {
      key: 'authCaching',
      label: 'Cache Authentication Results',
      description: 'Cache successful authentication for performance',
      type: 'boolean',
      defaultValue: true,
    },
    {
      key: 'jsonCompression',
      label: 'Enable JSON Compression',
      description: 'Compress JSON responses',
      type: 'boolean',
      defaultValue: true,
    },
    {
      key: 'allowedMethods',
      label: 'Allowed HTTP Methods',
      description: 'HTTP methods to allow',
      type: 'multiselect',
      defaultValue: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      options: [
        { value: 'GET', label: 'GET' },
        { value: 'POST', label: 'POST' },
        { value: 'PUT', label: 'PUT' },
        { value: 'DELETE', label: 'DELETE' },
        { value: 'PATCH', label: 'PATCH' },
        { value: 'HEAD', label: 'HEAD' },
        { value: 'OPTIONS', label: 'OPTIONS' },
      ],
    },
  ],
  edgeHostnameConfig: {
    domainSuffix: '.edgekey.net',
    ipVersionBehavior: 'IPV4_IPV6',
    certificateType: 'ENHANCED_TLS',
  },
  certificateRequirements: {
    type: 'DV',
    networkDeployment: 'ENHANCED_TLS',
    sniOnly: true,
  },
  recommendedDNSRecords: [
    {
      type: 'CNAME',
      name: '{{hostname}}',
      value: '{{edgeHostname}}',
      ttl: 300,
      description: 'Points your API hostname to Akamai edge servers',
    },
  ],
  ruleTree: {
    name: 'default',
    children: [
      {
        name: 'API Version Routing',
        criteria: [
          {
            name: 'path',
            options: {
              matchOperator: 'MATCHES_ONE_OF',
              values: ['{{apiVersion}}/*'],
            },
          },
        ],
        children: [
          {
            name: 'GET Requests',
            criteria: [
              {
                name: 'requestMethod',
                options: {
                  matchOperator: 'IS',
                  value: 'GET',
                },
              },
            ],
            behaviors: [
              {
                name: 'caching',
                options: {
                  behavior: 'MAX_AGE',
                  ttl: '5m',
                  mustRevalidate: true,
                },
              },
              {
                name: 'cacheKeyQueryParams',
                options: {
                  behavior: 'INCLUDE_ALL_PRESERVE_ORDER',
                },
              },
            ],
          },
          {
            name: 'Non-GET Requests',
            criteria: [
              {
                name: 'requestMethod',
                options: {
                  matchOperator: 'IS_NOT',
                  value: 'GET',
                },
              },
            ],
            behaviors: [
              {
                name: 'caching',
                options: {
                  behavior: 'BYPASS_CACHE',
                },
              },
            ],
          },
        ],
        behaviors: [
          {
            name: 'apiRateLimiting',
            options: {
              enabled: true,
              algorithm: 'FIXED_WINDOW',
              requestsPerMinute: '{{rateLimitRequests}}',
              keyType: 'CLIENT_IP',
              responseCode: 429,
            },
          },
        ],
      },
      {
        name: 'Authentication Caching',
        criteria: [
          {
            name: 'path',
            options: {
              matchOperator: 'MATCHES_ONE_OF',
              values: ['/auth/*', '/oauth/*', '/token'],
            },
          },
        ],
        behaviors: [
          {
            name: 'caching',
            options: {
              behavior: '{{authCaching ? "MAX_AGE" : "BYPASS_CACHE"}}',
              ttl: '5m',
            },
          },
          {
            name: 'cacheKeyCustomization',
            options: {
              includeHeaders: ['Authorization'],
            },
          },
        ],
      },
      {
        name: 'API Documentation',
        criteria: [
          {
            name: 'path',
            options: {
              matchOperator: 'MATCHES_ONE_OF',
              values: ['/docs', '/docs/*', '/swagger', '/swagger/*', '/openapi.json'],
            },
          },
        ],
        behaviors: [
          {
            name: 'caching',
            options: {
              behavior: 'MAX_AGE',
              ttl: '1h',
            },
          },
        ],
      },
    ],
    behaviors: [
      {
        name: 'origin',
        options: {
          cacheKeyHostname: 'REQUEST_HOST_HEADER',
          compress: '{{jsonCompression}}',
          enableTrueClientIp: true,
          forwardHostHeader: 'REQUEST_HOST_HEADER',
          hostname: '{{originHostname}}',
          httpPort: 80,
          httpsPort: 443,
          originSni: true,
          originType: 'CUSTOMER',
          verificationMode: 'PLATFORM_SETTINGS',
        },
      },
      {
        name: 'cpCode',
        options: {
          value: {
            id: '{{cpCode}}',
          },
        },
      },
      {
        name: 'allowedMethods',
        options: {
          methods: '{{allowedMethods}}',
        },
      },
      {
        name: 'responseCode',
        options: {
          statusCode: 405,
          reasonPhrase: 'Method Not Allowed',
          enabled: true,
        },
      },
    ],
  },
};

// Export all templates as a collection
export const propertyTemplates: PropertyTemplate[] = [
  staticWebsiteTemplate,
  dynamicWebApplicationTemplate,
  apiAccelerationTemplate,
];

// Helper function to get template by ID
export function getTemplateById(id: string): PropertyTemplate | undefined {
  return propertyTemplates.find((template) => template.id === id);
}

// Helper function to validate inputs against template requirements
export function validateTemplateInputs(
  template: PropertyTemplate,
  inputs: Record<string, unknown>,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check required inputs
  for (const input of template.requiredInputs) {
    if (!inputs[input.key]) {
      errors.push(`Missing required input: ${input.label}`);
      continue;
    }

    // Validate input value
    if (input.validation) {
      const value = inputs[input.key];

      if (input.validation.pattern) {
        const regex = new RegExp(input.validation.pattern);
        if (!regex.test(String(value))) {
          errors.push(`Invalid format for ${input.label}`);
        }
      }

      if (input.type === 'number') {
        if (input.validation.min !== undefined && (value as any) < input.validation.min) {
          errors.push(`${input.label} must be at least ${input.validation.min}`);
        }
        if (input.validation.max !== undefined && (value as any) > input.validation.max) {
          errors.push(`${input.label} must be at most ${input.validation.max}`);
        }
      }

      if (input.validation.customValidator) {
        const result = input.validation.customValidator(value);
        if (result !== true) {
          errors.push(typeof result === 'string' ? result : `Invalid value for ${input.label}`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Helper function to apply inputs to template rule tree
export function applyTemplateInputs(template: PropertyTemplate, inputs: Record<string, unknown>): unknown {
  // Deep clone the rule tree
  const ruleTree = JSON.parse(JSON.stringify(template.ruleTree));

  // Replace placeholders with actual values
  const replacePlaceholders = (obj: unknown): unknown => {
    if (typeof obj === 'string') {
      // Handle template expressions like {{variable}}
      return obj.replace(/\{\{([^}]+)\}\}/g, (match, expression) => {
        // Handle conditional expressions
        if (expression.includes('?')) {
          // Simple ternary operator support
          try {
            // This is a simplified evaluation - in production, use a proper expression parser
            const evalExpression = new Function(...Object.keys(inputs), `return ${expression}`);
            return evalExpression(...Object.values(inputs));
          } catch (_e) {
            console.warn(`Failed to evaluate expression: ${expression}`);
            return match;
          }
        }

        // Simple variable replacement
        return inputs[expression.trim()] || match;
      });
    } else if (Array.isArray(obj)) {
      return obj.map(replacePlaceholders);
    } else if (typeof obj === 'object' && obj !== null) {
      const result: unknown = {};
      for (const [key, value] of Object.entries(obj)) {
        (result as any)[key] = replacePlaceholders(value);
      }
      return result;
    }
    return obj;
  };

  return replacePlaceholders(ruleTree);
}
