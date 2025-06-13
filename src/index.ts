#!/usr/bin/env node

/**
 * ALECS - MCP Server for Akamai
 * An MCP server that enables management of Akamai through AI
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
import { AkamaiClient } from './akamai-client.js';
import { 
  MCPToolResponse
} from './types.js';
import {
  listProperties,
  getProperty,
  createProperty,
  listGroups
} from './tools/property-tools.js';
import {
  listZones,
  getZone,
  createZone,
  listRecords,
  upsertRecord,
  deleteRecord
} from './tools/dns-tools.js';
import {
  createPropertyVersion,
  getPropertyRules,
  updatePropertyRules,
  createEdgeHostname,
  addPropertyHostname,
  removePropertyHostname,
  activateProperty,
  getActivationStatus,
  listPropertyActivations
} from './tools/property-manager-tools.js';
import {
  createDVEnrollment,
  getDVValidationChallenges,
  checkDVEnrollmentStatus,
  listCertificateEnrollments,
  linkCertificateToProperty
} from './tools/cps-tools.js';
import {
  importZoneViaAXFR,
  parseZoneFile,
  bulkImportRecords,
  convertZoneToPrimary,
  generateMigrationInstructions
} from './tools/dns-migration-tools.js';

// Tool schemas for validation
const ListPropertiesSchema = z.object({
  customer: z.string().optional(),
  contractId: z.string().optional(),
  groupId: z.string().optional(),
});

const GetPropertySchema = z.object({
  customer: z.string().optional(),
  propertyId: z.string(),
});

const CreatePropertySchema = z.object({
  customer: z.string().optional(),
  propertyName: z.string(),
  productId: z.string(),
  contractId: z.string(),
  groupId: z.string(),
  ruleFormat: z.string().optional(),
});

const ListGroupsSchema = z.object({
  customer: z.string().optional(),
  searchTerm: z.string().optional(),
});

// DNS Schemas
const ListZonesSchema = z.object({
  customer: z.string().optional(),
  contractIds: z.array(z.string()).optional(),
  includeAliases: z.boolean().optional(),
  search: z.string().optional(),
});

const GetZoneSchema = z.object({
  customer: z.string().optional(),
  zone: z.string(),
});

const CreateZoneSchema = z.object({
  customer: z.string().optional(),
  zone: z.string(),
  type: z.enum(['PRIMARY', 'SECONDARY', 'ALIAS']),
  comment: z.string().optional(),
  contractId: z.string().optional(),
  groupId: z.string().optional(),
  masters: z.array(z.string()).optional(),
  target: z.string().optional(),
});

const ListRecordsSchema = z.object({
  customer: z.string().optional(),
  zone: z.string(),
  search: z.string().optional(),
  types: z.array(z.string()).optional(),
});

const UpsertRecordSchema = z.object({
  customer: z.string().optional(),
  zone: z.string(),
  name: z.string(),
  type: z.string(),
  ttl: z.number(),
  rdata: z.array(z.string()),
  comment: z.string().optional(),
});

const DeleteRecordSchema = z.object({
  customer: z.string().optional(),
  zone: z.string(),
  name: z.string(),
  type: z.string(),
  comment: z.string().optional(),
});

// Property Manager Schemas
const CreatePropertyVersionSchema = z.object({
  customer: z.string().optional(),
  propertyId: z.string(),
  baseVersion: z.number().optional(),
  note: z.string().optional(),
});

const GetPropertyRulesSchema = z.object({
  customer: z.string().optional(),
  propertyId: z.string(),
  version: z.number().optional(),
  contractId: z.string().optional(),
  groupId: z.string().optional(),
});

const UpdatePropertyRulesSchema = z.object({
  customer: z.string().optional(),
  propertyId: z.string(),
  version: z.number().optional(),
  contractId: z.string(),
  groupId: z.string(),
  rules: z.any(),
  note: z.string().optional(),
});

const CreateEdgeHostnameSchema = z.object({
  customer: z.string().optional(),
  propertyId: z.string(),
  domainPrefix: z.string(),
  domainSuffix: z.string().optional(),
  productId: z.string().optional(),
  secure: z.boolean().optional(),
  ipVersion: z.enum(['IPV4', 'IPV6', 'IPV4_IPV6']).optional(),
  certificateEnrollmentId: z.number().optional(),
});

const AddPropertyHostnameSchema = z.object({
  customer: z.string().optional(),
  propertyId: z.string(),
  hostname: z.string(),
  edgeHostname: z.string(),
  version: z.number().optional(),
});

const RemovePropertyHostnameSchema = z.object({
  customer: z.string().optional(),
  propertyId: z.string(),
  hostname: z.string(),
  version: z.number().optional(),
});

const ActivatePropertySchema = z.object({
  customer: z.string().optional(),
  propertyId: z.string(),
  version: z.number().optional(),
  network: z.enum(['STAGING', 'PRODUCTION']),
  note: z.string().optional(),
  notifyEmails: z.array(z.string()).optional(),
  acknowledgeAllWarnings: z.boolean().optional(),
});

const GetActivationStatusSchema = z.object({
  customer: z.string().optional(),
  propertyId: z.string(),
  activationId: z.string(),
});

const ListPropertyActivationsSchema = z.object({
  customer: z.string().optional(),
  propertyId: z.string(),
  network: z.enum(['STAGING', 'PRODUCTION']).optional(),
});

// CPS Schemas
const CreateDVEnrollmentSchema = z.object({
  customer: z.string().optional(),
  commonName: z.string(),
  sans: z.array(z.string()).optional(),
  adminContact: z.object({
    firstName: z.string(),
    lastName: z.string(),
    email: z.string(),
    phone: z.string(),
  }),
  techContact: z.object({
    firstName: z.string(),
    lastName: z.string(),
    email: z.string(),
    phone: z.string(),
  }),
  contractId: z.string(),
  enhancedTLS: z.boolean().optional(),
  quicEnabled: z.boolean().optional(),
});

const GetDVValidationChallengesSchema = z.object({
  customer: z.string().optional(),
  enrollmentId: z.number(),
});

const CheckDVEnrollmentStatusSchema = z.object({
  customer: z.string().optional(),
  enrollmentId: z.number(),
});

const ListCertificateEnrollmentsSchema = z.object({
  customer: z.string().optional(),
  contractId: z.string().optional(),
});

const LinkCertificateToPropertySchema = z.object({
  customer: z.string().optional(),
  enrollmentId: z.number(),
  propertyId: z.string(),
  propertyVersion: z.number().optional(),
});

// DNS Migration Schemas
const ImportZoneViaAXFRSchema = z.object({
  customer: z.string().optional(),
  zone: z.string(),
  masterServer: z.string(),
  tsigKey: z.object({
    name: z.string(),
    algorithm: z.string(),
    secret: z.string(),
  }).optional(),
  createZone: z.boolean().optional(),
  contractId: z.string().optional(),
  groupId: z.string().optional(),
});

const ParseZoneFileSchema = z.object({
  customer: z.string().optional(),
  zoneFileContent: z.string(),
  zone: z.string(),
});

const BulkImportRecordsSchema = z.object({
  customer: z.string().optional(),
  zone: z.string(),
  batchId: z.string(),
  clearCache: z.boolean().optional(),
});

const ConvertZoneToPrimarySchema = z.object({
  customer: z.string().optional(),
  zone: z.string(),
  comment: z.string().optional(),
});

const GenerateMigrationInstructionsSchema = z.object({
  customer: z.string().optional(),
  zone: z.string(),
  targetProvider: z.enum(['route53', 'cloudflare', 'godaddy', 'namecheap', 'generic']).optional(),
});

/**
 * Main server class for Akamai MCP
 */
class AkamaiMCPServer {
  private server: Server;
  private client: AkamaiClient;

  constructor() {
    this.server = new Server({
      name: 'alecs-mcp-server-akamai',
      version: '1.0.0',
    }, {
      capabilities: {
        tools: {},
      },
    });

    this.client = new AkamaiClient();
    this.setupHandlers();
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'list_properties',
          description: 'List all Akamai CDN properties in your account',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              contractId: {
                type: 'string',
                description: 'Optional: Filter by contract ID',
              },
              groupId: {
                type: 'string',
                description: 'Optional: Filter by group ID',
              },
            },
          },
        },
        {
          name: 'get_property',
          description: 'Get detailed information about a specific property',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              propertyId: {
                type: 'string',
                description: 'The property ID (e.g., prp_12345)',
              },
            },
            required: ['propertyId'],
          },
        },
        {
          name: 'create_property',
          description: 'Create a new CDN property',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              propertyName: {
                type: 'string',
                description: 'Name for the new property',
              },
              productId: {
                type: 'string',
                description: 'Product ID (e.g., prd_Web_Accel)',
              },
              contractId: {
                type: 'string',
                description: 'Contract ID for billing',
              },
              groupId: {
                type: 'string',
                description: 'Group ID for organization',
              },
              ruleFormat: {
                type: 'string',
                description: 'Optional: Rule format version (defaults to latest)',
              },
            },
            required: ['propertyName', 'productId', 'contractId', 'groupId'],
          },
        },
        {
          name: 'list_groups',
          description: 'List all available groups and contracts in your account',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              searchTerm: {
                type: 'string',
                description: 'Optional: Search for groups by name or ID',
              },
            },
          },
        },
        // DNS Tools
        {
          name: 'list_zones',
          description: 'List all DNS zones in your account',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              contractIds: {
                type: 'array',
                items: { type: 'string' },
                description: 'Optional: Filter by contract IDs',
              },
              includeAliases: {
                type: 'boolean',
                description: 'Optional: Include alias zones',
              },
              search: {
                type: 'string',
                description: 'Optional: Search for zones by name',
              },
            },
          },
        },
        {
          name: 'get_zone',
          description: 'Get details of a specific DNS zone',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              zone: {
                type: 'string',
                description: 'The zone name (e.g., example.com)',
              },
            },
            required: ['zone'],
          },
        },
        {
          name: 'create_zone',
          description: 'Create a new DNS zone',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              zone: {
                type: 'string',
                description: 'The zone name (e.g., example.com)',
              },
              type: {
                type: 'string',
                enum: ['PRIMARY', 'SECONDARY', 'ALIAS'],
                description: 'Zone type',
              },
              comment: {
                type: 'string',
                description: 'Optional: Zone comment',
              },
              contractId: {
                type: 'string',
                description: 'Optional: Contract ID',
              },
              groupId: {
                type: 'string',
                description: 'Optional: Group ID',
              },
              masters: {
                type: 'array',
                items: { type: 'string' },
                description: 'Master servers (required for SECONDARY zones)',
              },
              target: {
                type: 'string',
                description: 'Target zone (required for ALIAS zones)',
              },
            },
            required: ['zone', 'type'],
          },
        },
        {
          name: 'list_records',
          description: 'List DNS records in a zone',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              zone: {
                type: 'string',
                description: 'The zone name (e.g., example.com)',
              },
              search: {
                type: 'string',
                description: 'Optional: Search for records by name',
              },
              types: {
                type: 'array',
                items: { type: 'string' },
                description: 'Optional: Filter by record types (e.g., ["A", "CNAME"])',
              },
            },
            required: ['zone'],
          },
        },
        {
          name: 'upsert_record',
          description: 'Create or update a DNS record',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              zone: {
                type: 'string',
                description: 'The zone name (e.g., example.com)',
              },
              name: {
                type: 'string',
                description: 'Record name (e.g., www.example.com)',
              },
              type: {
                type: 'string',
                description: 'Record type (e.g., A, AAAA, CNAME, MX, TXT)',
              },
              ttl: {
                type: 'number',
                description: 'Time to live in seconds',
              },
              rdata: {
                type: 'array',
                items: { type: 'string' },
                description: 'Record data (e.g., ["192.0.2.1"] for A record)',
              },
              comment: {
                type: 'string',
                description: 'Optional: Change comment',
              },
            },
            required: ['zone', 'name', 'type', 'ttl', 'rdata'],
          },
        },
        {
          name: 'delete_record',
          description: 'Delete a DNS record',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              zone: {
                type: 'string',
                description: 'The zone name (e.g., example.com)',
              },
              name: {
                type: 'string',
                description: 'Record name (e.g., www.example.com)',
              },
              type: {
                type: 'string',
                description: 'Record type (e.g., A, AAAA, CNAME)',
              },
              comment: {
                type: 'string',
                description: 'Optional: Change comment',
              },
            },
            required: ['zone', 'name', 'type'],
          },
        },
        // Property Manager Tools
        {
          name: 'create_property_version',
          description: 'Create a new version of a property',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              propertyId: {
                type: 'string',
                description: 'The property ID (e.g., prp_12345)',
              },
              baseVersion: {
                type: 'number',
                description: 'Optional: Version to base the new version on (defaults to latest)',
              },
              note: {
                type: 'string',
                description: 'Optional: Version notes',
              },
            },
            required: ['propertyId'],
          },
        },
        {
          name: 'get_property_rules',
          description: 'Get the rule tree for a property version',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              propertyId: {
                type: 'string',
                description: 'The property ID (e.g., prp_12345)',
              },
              version: {
                type: 'number',
                description: 'Optional: Version number (defaults to latest)',
              },
              contractId: {
                type: 'string',
                description: 'Optional: Contract ID',
              },
              groupId: {
                type: 'string',
                description: 'Optional: Group ID',
              },
            },
            required: ['propertyId'],
          },
        },
        {
          name: 'update_property_rules',
          description: 'Update the rule tree for a property version',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              propertyId: {
                type: 'string',
                description: 'The property ID (e.g., prp_12345)',
              },
              version: {
                type: 'number',
                description: 'Optional: Version number (defaults to latest)',
              },
              contractId: {
                type: 'string',
                description: 'Contract ID',
              },
              groupId: {
                type: 'string',
                description: 'Group ID',
              },
              rules: {
                type: 'object',
                description: 'The complete rule tree',
              },
              note: {
                type: 'string',
                description: 'Optional: Update notes',
              },
            },
            required: ['propertyId', 'contractId', 'groupId', 'rules'],
          },
        },
        {
          name: 'create_edge_hostname',
          description: 'Create a new edge hostname',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              propertyId: {
                type: 'string',
                description: 'The property ID to associate with',
              },
              domainPrefix: {
                type: 'string',
                description: 'Domain prefix (e.g., "www" for www.example.com.edgesuite.net)',
              },
              domainSuffix: {
                type: 'string',
                description: 'Optional: Domain suffix (defaults to .edgesuite.net)',
              },
              productId: {
                type: 'string',
                description: 'Optional: Product ID',
              },
              secure: {
                type: 'boolean',
                description: 'Optional: Enable HTTPS (defaults to true)',
              },
              ipVersion: {
                type: 'string',
                enum: ['IPV4', 'IPV6', 'IPV4_IPV6'],
                description: 'Optional: IP version support (defaults to IPV4)',
              },
              certificateEnrollmentId: {
                type: 'number',
                description: 'Optional: Certificate enrollment ID for HTTPS',
              },
            },
            required: ['propertyId', 'domainPrefix'],
          },
        },
        {
          name: 'add_property_hostname',
          description: 'Add a hostname to a property',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              propertyId: {
                type: 'string',
                description: 'The property ID',
              },
              hostname: {
                type: 'string',
                description: 'The hostname to add (e.g., www.example.com)',
              },
              edgeHostname: {
                type: 'string',
                description: 'The edge hostname to map to',
              },
              version: {
                type: 'number',
                description: 'Optional: Version number (defaults to latest)',
              },
            },
            required: ['propertyId', 'hostname', 'edgeHostname'],
          },
        },
        {
          name: 'remove_property_hostname',
          description: 'Remove a hostname from a property',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              propertyId: {
                type: 'string',
                description: 'The property ID',
              },
              hostname: {
                type: 'string',
                description: 'The hostname to remove',
              },
              version: {
                type: 'number',
                description: 'Optional: Version number (defaults to latest)',
              },
            },
            required: ['propertyId', 'hostname'],
          },
        },
        {
          name: 'activate_property',
          description: 'Activate a property version to staging or production',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              propertyId: {
                type: 'string',
                description: 'The property ID',
              },
              version: {
                type: 'number',
                description: 'Optional: Version to activate (defaults to latest)',
              },
              network: {
                type: 'string',
                enum: ['STAGING', 'PRODUCTION'],
                description: 'Target network',
              },
              note: {
                type: 'string',
                description: 'Optional: Activation notes',
              },
              notifyEmails: {
                type: 'array',
                items: { type: 'string' },
                description: 'Optional: Email addresses to notify',
              },
              acknowledgeAllWarnings: {
                type: 'boolean',
                description: 'Optional: Acknowledge all warnings',
              },
            },
            required: ['propertyId', 'network'],
          },
        },
        {
          name: 'get_activation_status',
          description: 'Get the status of a property activation',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              propertyId: {
                type: 'string',
                description: 'The property ID',
              },
              activationId: {
                type: 'string',
                description: 'The activation ID',
              },
            },
            required: ['propertyId', 'activationId'],
          },
        },
        {
          name: 'list_property_activations',
          description: 'List activations for a property',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              propertyId: {
                type: 'string',
                description: 'The property ID',
              },
              network: {
                type: 'string',
                enum: ['STAGING', 'PRODUCTION'],
                description: 'Optional: Filter by network',
              },
            },
            required: ['propertyId'],
          },
        },
        // CPS Tools
        {
          name: 'create_dv_enrollment',
          description: 'Create a new Default DV certificate enrollment',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              commonName: {
                type: 'string',
                description: 'Primary domain for the certificate',
              },
              sans: {
                type: 'array',
                items: { type: 'string' },
                description: 'Optional: Additional domains (Subject Alternative Names)',
              },
              adminContact: {
                type: 'object',
                properties: {
                  firstName: { type: 'string' },
                  lastName: { type: 'string' },
                  email: { type: 'string' },
                  phone: { type: 'string' },
                },
                required: ['firstName', 'lastName', 'email', 'phone'],
              },
              techContact: {
                type: 'object',
                properties: {
                  firstName: { type: 'string' },
                  lastName: { type: 'string' },
                  email: { type: 'string' },
                  phone: { type: 'string' },
                },
                required: ['firstName', 'lastName', 'email', 'phone'],
              },
              contractId: {
                type: 'string',
                description: 'Contract ID for billing',
              },
              enhancedTLS: {
                type: 'boolean',
                description: 'Optional: Deploy to Enhanced TLS network (default: true)',
              },
              quicEnabled: {
                type: 'boolean',
                description: 'Optional: Enable QUIC/HTTP3 support',
              },
            },
            required: ['commonName', 'adminContact', 'techContact', 'contractId'],
          },
        },
        {
          name: 'get_dv_validation_challenges',
          description: 'Get DV validation challenges for a certificate enrollment',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              enrollmentId: {
                type: 'number',
                description: 'Certificate enrollment ID',
              },
            },
            required: ['enrollmentId'],
          },
        },
        {
          name: 'check_dv_enrollment_status',
          description: 'Check the status of a DV certificate enrollment',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              enrollmentId: {
                type: 'number',
                description: 'Certificate enrollment ID',
              },
            },
            required: ['enrollmentId'],
          },
        },
        {
          name: 'list_certificate_enrollments',
          description: 'List all certificate enrollments',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              contractId: {
                type: 'string',
                description: 'Optional: Filter by contract ID',
              },
            },
          },
        },
        {
          name: 'link_certificate_to_property',
          description: 'Link a certificate to a property',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              enrollmentId: {
                type: 'number',
                description: 'Certificate enrollment ID',
              },
              propertyId: {
                type: 'string',
                description: 'Property ID to link to',
              },
              propertyVersion: {
                type: 'number',
                description: 'Optional: Property version (defaults to latest)',
              },
            },
            required: ['enrollmentId', 'propertyId'],
          },
        },
        // DNS Migration Tools
        {
          name: 'import_zone_via_axfr',
          description: 'Import a DNS zone via AXFR transfer',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              zone: {
                type: 'string',
                description: 'Zone to import',
              },
              masterServer: {
                type: 'string',
                description: 'Master DNS server to transfer from',
              },
              tsigKey: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  algorithm: { type: 'string' },
                  secret: { type: 'string' },
                },
                description: 'Optional: TSIG key for authentication',
              },
              createZone: {
                type: 'boolean',
                description: 'Optional: Create zone if it doesn\'t exist',
              },
              contractId: {
                type: 'string',
                description: 'Contract ID (required if createZone is true)',
              },
              groupId: {
                type: 'string',
                description: 'Group ID (required if createZone is true)',
              },
            },
            required: ['zone', 'masterServer'],
          },
        },
        {
          name: 'parse_zone_file',
          description: 'Parse a zone file and cache the records for import',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              zoneFileContent: {
                type: 'string',
                description: 'The zone file content to parse',
              },
              zone: {
                type: 'string',
                description: 'Zone name for the records',
              },
            },
            required: ['zoneFileContent', 'zone'],
          },
        },
        {
          name: 'bulk_import_records',
          description: 'Import cached records from a previous parse operation',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              zone: {
                type: 'string',
                description: 'Zone to import records into',
              },
              batchId: {
                type: 'string',
                description: 'Batch ID from parse operation',
              },
              clearCache: {
                type: 'boolean',
                description: 'Optional: Clear cache after import',
              },
            },
            required: ['zone', 'batchId'],
          },
        },
        {
          name: 'convert_zone_to_primary',
          description: 'Convert a secondary zone to primary',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              zone: {
                type: 'string',
                description: 'Zone to convert',
              },
              comment: {
                type: 'string',
                description: 'Optional: Conversion comment',
              },
            },
            required: ['zone'],
          },
        },
        {
          name: 'generate_migration_instructions',
          description: 'Generate DNS migration instructions for a zone',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              zone: {
                type: 'string',
                description: 'Zone name',
              },
              targetProvider: {
                type: 'string',
                enum: ['route53', 'cloudflare', 'godaddy', 'namecheap', 'generic'],
                description: 'Optional: Target DNS provider for specific instructions',
              },
            },
            required: ['zone'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request): Promise<any> => {
      const { name, arguments: args } = request.params;
      
      const client = this.client;

      try {
        switch (name) {
          // Property tools
          case 'list_properties':
            const listPropsArgs = ListPropertiesSchema.parse(args);
            return await listProperties(client, listPropsArgs);

          case 'get_property':
            const getPropArgs = GetPropertySchema.parse(args);
            return await getProperty(client, getPropArgs);

          case 'create_property':
            const createPropArgs = CreatePropertySchema.parse(args);
            return await createProperty(client, createPropArgs);

          case 'list_groups':
            const listGroupsArgs = ListGroupsSchema.parse(args);
            return await listGroups(client, listGroupsArgs);

          // DNS tools
          case 'list_zones':
            const listZonesArgs = ListZonesSchema.parse(args);
            return await listZones(client, listZonesArgs);

          case 'get_zone':
            const getZoneArgs = GetZoneSchema.parse(args);
            return await getZone(client, getZoneArgs);

          case 'create_zone':
            const createZoneArgs = CreateZoneSchema.parse(args);
            return await createZone(client, createZoneArgs);

          case 'list_records':
            const listRecordsArgs = ListRecordsSchema.parse(args);
            return await listRecords(client, listRecordsArgs);

          case 'upsert_record':
            const upsertRecordArgs = UpsertRecordSchema.parse(args);
            return await upsertRecord(client, upsertRecordArgs);

          case 'delete_record':
            const deleteRecordArgs = DeleteRecordSchema.parse(args);
            return await deleteRecord(client, deleteRecordArgs);

          // Property Manager tools
          case 'create_property_version':
            const createVersionArgs = CreatePropertyVersionSchema.parse(args);
            return await createPropertyVersion(client, createVersionArgs);

          case 'get_property_rules':
            const getRulesArgs = GetPropertyRulesSchema.parse(args);
            return await getPropertyRules(client, getRulesArgs);

          case 'update_property_rules':
            const updateRulesArgs = UpdatePropertyRulesSchema.parse(args);
            return await updatePropertyRules(client, updateRulesArgs);

          case 'create_edge_hostname':
            const createEdgeArgs = CreateEdgeHostnameSchema.parse(args);
            return await createEdgeHostname(client, createEdgeArgs);

          case 'add_property_hostname':
            const addHostnameArgs = AddPropertyHostnameSchema.parse(args);
            return await addPropertyHostname(client, addHostnameArgs);

          case 'remove_property_hostname':
            const removeHostnameArgs = RemovePropertyHostnameSchema.parse(args);
            return await removePropertyHostname(client, removeHostnameArgs);

          case 'activate_property':
            const activateArgs = ActivatePropertySchema.parse(args);
            return await activateProperty(client, activateArgs);

          case 'get_activation_status':
            const getStatusArgs = GetActivationStatusSchema.parse(args);
            return await getActivationStatus(client, getStatusArgs);

          case 'list_property_activations':
            const listActivationsArgs = ListPropertyActivationsSchema.parse(args);
            return await listPropertyActivations(client, listActivationsArgs);

          // CPS tools
          case 'create_dv_enrollment':
            const createDVArgs = CreateDVEnrollmentSchema.parse(args);
            return await createDVEnrollment(client, createDVArgs);

          case 'get_dv_validation_challenges':
            const getChallengesArgs = GetDVValidationChallengesSchema.parse(args);
            return await getDVValidationChallenges(client, getChallengesArgs);

          case 'check_dv_enrollment_status':
            const checkStatusArgs = CheckDVEnrollmentStatusSchema.parse(args);
            return await checkDVEnrollmentStatus(client, checkStatusArgs);

          case 'list_certificate_enrollments':
            const listCertsArgs = ListCertificateEnrollmentsSchema.parse(args);
            return await listCertificateEnrollments(client, listCertsArgs);

          case 'link_certificate_to_property':
            const linkCertArgs = LinkCertificateToPropertySchema.parse(args);
            return await linkCertificateToProperty(client, linkCertArgs);

          // DNS Migration tools
          case 'import_zone_via_axfr':
            const importAXFRArgs = ImportZoneViaAXFRSchema.parse(args);
            return await importZoneViaAXFR(client, importAXFRArgs);

          case 'parse_zone_file':
            const parseZoneArgs = ParseZoneFileSchema.parse(args);
            return await parseZoneFile(client, parseZoneArgs);

          case 'bulk_import_records':
            const bulkImportArgs = BulkImportRecordsSchema.parse(args);
            return await bulkImportRecords(client, bulkImportArgs);

          case 'convert_zone_to_primary':
            const convertZoneArgs = ConvertZoneToPrimarySchema.parse(args);
            return await convertZoneToPrimary(client, convertZoneArgs);

          case 'generate_migration_instructions':
            const genInstructionsArgs = GenerateMigrationInstructionsSchema.parse(args);
            return await generateMigrationInstructions(client, genInstructionsArgs);

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new McpError(
            ErrorCode.InvalidParams,
            `Invalid parameters: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`
          );
        }
        throw error;
      }
    });
  }

  async run() {
    console.error('🚀 ALECS - MCP Server for Akamai starting...');
    console.error('📍 Looking for credentials in ~/.edgerc');
    
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    console.error('✅ Server ready, waiting for connections...');
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.error('\n🛑 Shutting down...');
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      console.error('\n🛑 Shutting down...');
      process.exit(0);
    });
  }
}

// Start the server
const server = new AkamaiMCPServer();
server.run().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});