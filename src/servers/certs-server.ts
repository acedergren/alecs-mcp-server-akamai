#!/usr/bin/env node

/**
 * ALECS Certificates Server - SSL/TLS Certificate Management Module
 * Handles DV certificate enrollment, validation, and lifecycle management
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

import { AkamaiClient } from '../akamai-client';

// Certificate Tools
import {
  enrollCertificateWithValidation,
  validateCertificateEnrollment,
  deployCertificateToNetwork,
  monitorCertificateEnrollment,
  getCertificateDeploymentStatus,
  renewCertificate,
  cleanupValidationRecords,
  getCertificateValidationHistory,
} from '../tools/certificate-enrollment-tools';
import {
  createDVEnrollment,
  getDVValidationChallenges,
  checkDVEnrollmentStatus,
  listCertificateEnrollments,
  linkCertificateToProperty,
} from '../tools/cps-tools';

// Edge Hostname Certificate Tools
import {
  validateEdgeHostnameCertificate,
  associateCertificateWithEdgeHostname,
} from '../tools/edge-hostname-management';

// Property Certificate Integration
import {
  generateDomainValidationChallenges,
  resumeDomainValidation,
} from '../tools/property-manager-rules-tools';
import {
  updatePropertyWithDefaultDV,
  updatePropertyWithCPSCertificate,
} from '../tools/property-manager-tools';

// Domain Validation Tools

// Secure Property Certificate Tools
import {
  onboardSecureByDefaultProperty,
  quickSecureByDefaultSetup,
  checkSecureByDefaultStatus,
} from '../tools/secure-by-default-onboarding';

const log = (level: string, message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [CERTS] [${level}] ${message}`;
  if (data) {
    console.error(logMessage, JSON.stringify(data, null, 2));
  } else {
    console.error(logMessage);
  }
};

class CertsALECSServer {
  private server: Server;
  private client: AkamaiClient;

  constructor() {
    log('INFO', '🔐 ALECS Certificates Server starting...');
    log('INFO', 'Node version:', { version: process.version });
    log('INFO', 'Working directory:', { cwd: process.cwd() });

    this.server = new Server(
      {
        name: 'alecs-certs',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );

    try {
      log('INFO', 'Initializing Akamai client...');
      this.client = new AkamaiClient();
      log('INFO', '✅ Akamai client initialized successfully');
    } catch (_error) {
      log('ERROR', '❌ Failed to initialize Akamai client', {
        error: _error instanceof Error ? _error.message : String(_error),
      });
      throw _error;
    }

    this.setupHandlers();
  }

  private setupHandlers() {
    log('INFO', 'Setting up request handlers...');

    // List all certificate tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      log('INFO', '📋 Tools list requested');
      const tools = [
        // Basic DV Certificate Tools
        {
          name: 'create-dv-enrollment',
          description: 'Create a Domain Validated (DV) certificate enrollment',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string', description: 'Optional: Customer section name' },
              cn: { type: 'string', description: 'Common name (primary domain)' },
              sans: {
                type: 'array',
                items: { type: 'string' },
                description: 'Subject alternative names',
              },
              adminContact: {
                type: 'object',
                properties: {
                  firstName: { type: 'string' },
                  lastName: { type: 'string' },
                  email: { type: 'string' },
                  phone: { type: 'string' },
                },
                description: 'Admin contact information',
              },
              techContact: {
                type: 'object',
                properties: {
                  firstName: { type: 'string' },
                  lastName: { type: 'string' },
                  email: { type: 'string' },
                  phone: { type: 'string' },
                },
                description: 'Technical contact information',
              },
              org: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  addressLineOne: { type: 'string' },
                  city: { type: 'string' },
                  region: { type: 'string' },
                  postalCode: { type: 'string' },
                  countryCode: { type: 'string' },
                  phone: { type: 'string' },
                },
                description: 'Organization information',
              },
              networkConfiguration: {
                type: 'object',
                properties: {
                  networkType: {
                    type: 'string',
                    enum: ['STANDARD_TLS', 'ENHANCED_TLS'],
                    default: 'ENHANCED_TLS',
                  },
                  sniOnly: { type: 'boolean', default: true },
                },
                description: 'Network configuration',
              },
            },
            required: ['cn', 'adminContact', 'techContact', 'org'],
          },
        },
        {
          name: 'check-dv-enrollment-status',
          description: 'Check the status of a DV certificate enrollment',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string', description: 'Optional: Customer section name' },
              enrollmentId: { type: 'number', description: 'Enrollment ID' },
            },
            required: ['enrollmentId'],
          },
        },
        {
          name: 'get-dv-validation-challenges',
          description: 'Get domain validation challenges for a DV certificate',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string', description: 'Optional: Customer section name' },
              enrollmentId: { type: 'number', description: 'Enrollment ID' },
            },
            required: ['enrollmentId'],
          },
        },
        {
          name: 'list-certificate-enrollments',
          description: 'List all certificate enrollments',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string', description: 'Optional: Customer section name' },
              contractId: { type: 'string', description: 'Optional: Filter by contract' },
              status: { type: 'string', description: 'Optional: Filter by status' },
            },
          },
        },
        {
          name: 'link-certificate-to-property',
          description: 'Link a certificate to a property',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string', description: 'Optional: Customer section name' },
              enrollmentId: { type: 'number', description: 'Certificate enrollment ID' },
              propertyId: { type: 'string', description: 'Property ID' },
              propertyVersion: { type: 'number', description: 'Property version' },
            },
            required: ['enrollmentId', 'propertyId', 'propertyVersion'],
          },
        },
        // Advanced Certificate Enrollment
        {
          name: 'enroll-certificate-with-validation',
          description: 'Enroll certificate with automatic domain validation',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string', description: 'Optional: Customer section name' },
              domains: {
                type: 'array',
                items: { type: 'string' },
                description: 'Domains to include',
              },
              validationMethod: {
                type: 'string',
                enum: ['dns-01', 'http-01'],
                description: 'Validation method',
              },
              adminContact: { type: 'object', description: 'Admin contact' },
              techContact: { type: 'object', description: 'Tech contact' },
              org: { type: 'object', description: 'Organization details' },
              autoValidate: {
                type: 'boolean',
                description: 'Automatically validate domains',
                default: true,
              },
            },
            required: ['domains', 'validationMethod', 'adminContact', 'techContact', 'org'],
          },
        },
        {
          name: 'validate-certificate-enrollment',
          description: 'Validate certificate enrollment configuration',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string', description: 'Optional: Customer section name' },
              domains: {
                type: 'array',
                items: { type: 'string' },
                description: 'Domains to validate',
              },
              validationMethod: {
                type: 'string',
                enum: ['dns-01', 'http-01'],
                description: 'Validation method',
              },
              checkDNS: { type: 'boolean', description: 'Check DNS configuration', default: true },
            },
            required: ['domains', 'validationMethod'],
          },
        },
        {
          name: 'deploy-certificate-to-network',
          description: 'Deploy certificate to network',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string', description: 'Optional: Customer section name' },
              enrollmentId: { type: 'number', description: 'Enrollment ID' },
              network: {
                type: 'string',
                enum: ['STAGING', 'PRODUCTION'],
                description: 'Target network',
              },
              allowedNetworks: {
                type: 'array',
                items: { type: 'string' },
                description: 'Allowed networks',
              },
            },
            required: ['enrollmentId', 'network'],
          },
        },
        {
          name: 'monitor-certificate-enrollment',
          description: 'Monitor certificate enrollment progress',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string', description: 'Optional: Customer section name' },
              enrollmentId: { type: 'number', description: 'Enrollment ID' },
              waitForCompletion: {
                type: 'boolean',
                description: 'Wait for completion',
                default: false,
              },
              timeout: { type: 'number', description: 'Timeout in seconds', default: 300 },
            },
            required: ['enrollmentId'],
          },
        },
        {
          name: 'get-certificate-deployment-status',
          description: 'Get certificate deployment status',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string', description: 'Optional: Customer section name' },
              enrollmentId: { type: 'number', description: 'Enrollment ID' },
              network: {
                type: 'string',
                enum: ['STAGING', 'PRODUCTION'],
                description: 'Network to check',
              },
            },
            required: ['enrollmentId'],
          },
        },
        {
          name: 'renew-certificate',
          description: 'Renew an existing certificate',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string', description: 'Optional: Customer section name' },
              enrollmentId: { type: 'number', description: 'Current enrollment ID' },
              addDomains: {
                type: 'array',
                items: { type: 'string' },
                description: 'Domains to add',
              },
              removeDomains: {
                type: 'array',
                items: { type: 'string' },
                description: 'Domains to remove',
              },
              autoValidate: {
                type: 'boolean',
                description: 'Auto-validate new domains',
                default: true,
              },
            },
            required: ['enrollmentId'],
          },
        },
        {
          name: 'cleanup-validation-records',
          description: 'Clean up domain validation records',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string', description: 'Optional: Customer section name' },
              enrollmentId: { type: 'number', description: 'Enrollment ID' },
              domains: {
                type: 'array',
                items: { type: 'string' },
                description: 'Specific domains to clean',
              },
              validationType: {
                type: 'string',
                enum: ['dns-01', 'http-01'],
                description: 'Validation type',
              },
            },
            required: ['enrollmentId'],
          },
        },
        {
          name: 'get-certificate-validation-history',
          description: 'Get certificate validation history',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string', description: 'Optional: Customer section name' },
              enrollmentId: { type: 'number', description: 'Enrollment ID' },
              includeDetails: {
                type: 'boolean',
                description: 'Include validation details',
                default: true,
              },
            },
            required: ['enrollmentId'],
          },
        },
        // Domain Validation
        {
          name: 'generate-domain-validation-challenges',
          description: 'Generate domain validation challenges',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string', description: 'Optional: Customer section name' },
              domains: {
                type: 'array',
                items: { type: 'string' },
                description: 'Domains to validate',
              },
              validationType: {
                type: 'string',
                enum: ['dns-01', 'http-01'],
                description: 'Validation type',
              },
            },
            required: ['domains', 'validationType'],
          },
        },
        {
          name: 'resume-domain-validation',
          description: 'Resume paused domain validation',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string', description: 'Optional: Customer section name' },
              enrollmentId: { type: 'number', description: 'Enrollment ID' },
              domains: {
                type: 'array',
                items: { type: 'string' },
                description: 'Domains to resume',
              },
            },
            required: ['enrollmentId'],
          },
        },
        // Property Integration
        {
          name: 'update-property-with-default-dv',
          description: 'Update property with Default DV certificate',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string', description: 'Optional: Customer section name' },
              propertyId: { type: 'string', description: 'Property ID' },
              propertyVersion: { type: 'number', description: 'Property version' },
              hostname: { type: 'string', description: 'Hostname to secure' },
            },
            required: ['propertyId', 'propertyVersion', 'hostname'],
          },
        },
        {
          name: 'update-property-with-cps-certificate',
          description: 'Update property with CPS certificate',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string', description: 'Optional: Customer section name' },
              propertyId: { type: 'string', description: 'Property ID' },
              propertyVersion: { type: 'number', description: 'Property version' },
              enrollmentId: { type: 'number', description: 'Certificate enrollment ID' },
            },
            required: ['propertyId', 'propertyVersion', 'enrollmentId'],
          },
        },
        // Edge Hostname Certificate
        {
          name: 'validate-edge-hostname-certificate',
          description: 'Validate edge hostname certificate configuration',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string', description: 'Optional: Customer section name' },
              edgeHostname: { type: 'string', description: 'Edge hostname' },
              certificateType: {
                type: 'string',
                enum: ['DEFAULT', 'CPS'],
                description: 'Certificate type',
              },
            },
            required: ['edgeHostname'],
          },
        },
        {
          name: 'associate-certificate-with-edge-hostname',
          description: 'Associate certificate with edge hostname',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string', description: 'Optional: Customer section name' },
              edgeHostnameId: { type: 'string', description: 'Edge hostname ID' },
              enrollmentId: { type: 'number', description: 'Certificate enrollment ID' },
            },
            required: ['edgeHostnameId', 'enrollmentId'],
          },
        },
        // Secure by Default
        {
          name: 'onboard-secure-property',
          description: 'Onboard property with Secure by Default',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string', description: 'Optional: Customer section name' },
              propertyName: { type: 'string', description: 'Property name' },
              hostnames: { type: 'array', items: { type: 'string' }, description: 'Hostnames' },
              contractId: { type: 'string', description: 'Contract ID' },
              groupId: { type: 'string', description: 'Group ID' },
              productId: { type: 'string', description: 'Product ID' },
              cpCodeName: { type: 'string', description: 'CP code name' },
              edgeHostnameSuffix: {
                type: 'string',
                description: 'Edge hostname suffix',
                default: 'edgesuite.net',
              },
              certificateType: {
                type: 'string',
                enum: ['DEFAULT_DV', 'CPS'],
                description: 'Certificate type',
                default: 'DEFAULT_DV',
              },
            },
            required: ['propertyName', 'hostnames', 'contractId', 'groupId', 'productId'],
          },
        },
        {
          name: 'quick-secure-property-setup',
          description: 'Quick setup for secure property',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string', description: 'Optional: Customer section name' },
              hostnames: {
                type: 'array',
                items: { type: 'string' },
                description: 'Hostnames to secure',
              },
              contractId: { type: 'string', description: 'Contract ID' },
              groupId: { type: 'string', description: 'Group ID' },
            },
            required: ['hostnames', 'contractId', 'groupId'],
          },
        },
        {
          name: 'check-secure-property-status',
          description: 'Check secure property status',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string', description: 'Optional: Customer section name' },
              propertyId: { type: 'string', description: 'Property ID' },
              includeValidation: {
                type: 'boolean',
                description: 'Include validation status',
                default: true,
              },
            },
            required: ['propertyId'],
          },
        },
      ];

      log('INFO', `✅ Returning ${tools.length} tools`);
      return { tools };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request): Promise<any> => {
      const { name, arguments: args } = request.params;

      log('INFO', `🔧 Tool called: ${name}`, { args });

      const startTime = Date.now();
      const client = this.client;

      try {
        let result;

        switch (name) {
          // Basic DV Certificate Tools
          case 'create-dv-enrollment':
            result = await createDVEnrollment(client, args as any);
            break;
          case 'check-dv-enrollment-status':
            result = await checkDVEnrollmentStatus(client, args as any);
            break;
          case 'get-dv-validation-challenges':
            result = await getDVValidationChallenges(client, args as any);
            break;
          case 'list-certificate-enrollments':
            result = await listCertificateEnrollments(client, args as any);
            break;
          case 'link-certificate-to-property':
            result = await linkCertificateToProperty(client, args as any);
            break;

          // Advanced Certificate Enrollment
          case 'enroll-certificate-with-validation':
            result = await enrollCertificateWithValidation(client, args as any);
            break;
          case 'validate-certificate-enrollment':
            result = await validateCertificateEnrollment(client, args as any);
            break;
          case 'deploy-certificate-to-network':
            result = await deployCertificateToNetwork(client, args as any);
            break;
          case 'monitor-certificate-enrollment':
            result = await monitorCertificateEnrollment(client, args as any);
            break;
          case 'get-certificate-deployment-status':
            result = await getCertificateDeploymentStatus(client, args as any);
            break;
          case 'renew-certificate':
            result = await renewCertificate(client, args as any);
            break;
          case 'cleanup-validation-records':
            result = await cleanupValidationRecords(client, args as any);
            break;
          case 'get-certificate-validation-history':
            result = await getCertificateValidationHistory(client, args as any);
            break;

          // Domain Validation
          case 'generate-domain-validation-challenges':
            result = await generateDomainValidationChallenges(client, args as any);
            break;
          case 'resume-domain-validation':
            result = await resumeDomainValidation(client, args as any);
            break;

          // Property Integration
          case 'update-property-with-default-dv':
            result = await updatePropertyWithDefaultDV(client, args as any);
            break;
          case 'update-property-with-cps-certificate':
            result = await updatePropertyWithCPSCertificate(client, args as any);
            break;

          // Edge Hostname Certificate
          case 'validate-edge-hostname-certificate':
            result = await validateEdgeHostnameCertificate(client, args as any);
            break;
          case 'associate-certificate-with-edge-hostname':
            result = await associateCertificateWithEdgeHostname(client, args as any);
            break;

          // Secure by Default
          case 'onboard-secure-property':
            result = await onboardSecureByDefaultProperty(client, args as any);
            break;
          case 'quick-secure-property-setup':
            result = await quickSecureByDefaultSetup(client, args as any);
            break;
          case 'check-secure-property-status':
            result = await checkSecureByDefaultStatus(client, args as any);
            break;

          default:
            throw new McpError(ErrorCode.MethodNotFound, `Tool not found: ${name}`);
        }

        const duration = Date.now() - startTime;
        log('INFO', `✅ Tool ${name} completed in ${duration}ms`);

        return result;
      } catch (_error) {
        const duration = Date.now() - startTime;
        log('ERROR', `❌ Tool ${name} failed after ${duration}ms`, {
          error:
            _error instanceof Error
              ? {
                  message: _error.message,
                  stack: _error.stack,
                }
              : String(error),
        });

        if (_error instanceof z.ZodError) {
          throw new McpError(
            ErrorCode.InvalidParams,
            `Invalid parameters: ${_error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
          );
        }

        if (_error instanceof McpError) {
          throw _error;
        }

        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${_error instanceof Error ? _error.message : String(_error)}`,
        );
      }
    });

    log('INFO', '✅ Request handlers set up successfully');
  }

  async start() {
    log('INFO', '📍 Starting server connection...');

    const transport = new StdioServerTransport();

    // Add error handling for transport
    transport.onerror = (_error: Error) => {
      log('ERROR', '❌ Transport error', {
        message: _error.message,
        stack: _error.stack,
      });
    };

    transport.onclose = () => {
      log('INFO', '🔌 Transport closed, shutting down...');
      process.exit(0);
    };

    try {
      await this.server.connect(transport);
      log('INFO', '✅ Server connected and ready for MCP connections');
      log('INFO', '📊 Server stats', {
        toolCount: 22,
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime(),
      });
    } catch (_error) {
      log('ERROR', '❌ Failed to connect server', {
        error:
          _error instanceof Error
            ? {
                message: _error.message,
                stack: _error.stack,
              }
            : String(error),
      });
      throw _error;
    }
  }
}

// Main entry point
async function main() {
  log('INFO', '🎯 ALECS Certificates Server main() started');

  try {
    const server = new CertsALECSServer();
    await server.start();

    // Set up periodic status logging
    setInterval(() => {
      log('DEBUG', '💓 Server heartbeat', {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        pid: process.pid,
      });
    }, 30000); // Every 30 seconds
  } catch (_error) {
    log('ERROR', '❌ Failed to start server', {
      error:
        _error instanceof Error
          ? {
              message: _error.message,
              stack: _error.stack,
            }
          : String(error),
    });
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (_error) => {
  log('ERROR', '❌ Uncaught exception', {
    error: {
      message: _error.message,
      stack: _error.stack,
    },
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log('ERROR', '❌ Unhandled rejection', {
    reason:
      reason instanceof Error
        ? {
            message: reason.message,
            stack: reason.stack,
          }
        : String(reason),
    promise: String(promise),
  });
  process.exit(1);
});

// Handle signals
process.on('SIGTERM', () => {
  log('INFO', '📛 SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  log('INFO', '📛 SIGINT received, shutting down gracefully...');
  process.exit(0);
});

// Start the server
log('INFO', '🚀 Initiating ALECS Certificates Server...');
main();
