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
// import { 
//   MCPToolResponse
// } from './types.js';
import {
  listProperties,
  getProperty,
  createProperty,
  listGroups,
  listContracts
} from './tools/property-tools.js';
import {
  listProducts,
  getProduct,
  listUseCases
} from './tools/product-tools.js';
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
  listPropertyActivations,
  updatePropertyWithDefaultDV,
  updatePropertyWithCPSCertificate
} from './tools/property-manager-tools.js';
import {
  listEdgeHostnames,
  getEdgeHostname,
  cloneProperty,
  removeProperty,
  listPropertyVersions,
  getPropertyVersion,
  getLatestPropertyVersion,
  cancelPropertyActivation,
  searchProperties,
  listAllHostnames,
  listPropertyVersionHostnames
} from './tools/property-manager-advanced-tools.js';
import {
  listAvailableBehaviors,
  listAvailableCriteria,
  patchPropertyRules,
  bulkSearchProperties,
  getBulkSearchResults,
  generateDomainValidationChallenges,
  resumeDomainValidation,
  getPropertyAuditHistory
} from './tools/property-manager-rules-tools.js';
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
import {
  onboardSecureByDefaultProperty,
  quickSecureByDefaultSetup,
  checkSecureByDefaultStatus
} from './tools/secure-by-default-onboarding.js';
import {
  debugSecurePropertyOnboarding,
  testBasicPropertyCreation
} from './tools/debug-secure-onboarding.js';
import {
  listCPCodes,
  getCPCode,
  createCPCode,
  searchCPCodes
} from './tools/cpcode-tools.js';
import {
  getZonesDNSSECStatus,
  getSecondaryZoneTransferStatus,
  getZoneContract,
  getRecordSet,
  updateTSIGKeyForZones,
  submitBulkZoneCreateRequest,
  getZoneVersion,
  getVersionRecordSets,
  reactivateZoneVersion,
  getVersionMasterZoneFile,
  createMultipleRecordSets
} from './tools/dns-advanced-tools.js';

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
  force: z.boolean().optional(),
});

const DeleteRecordSchema = z.object({
  customer: z.string().optional(),
  zone: z.string(),
  name: z.string(),
  type: z.string(),
  comment: z.string().optional(),
  force: z.boolean().optional(),
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

// Secure Property Onboarding Schemas
const OnboardSecurePropertySchema = z.object({
  customer: z.string().optional(),
  propertyName: z.string(),
  hostnames: z.array(z.string()),
  originHostname: z.string(),
  contractId: z.string(),
  groupId: z.string(),
  productId: z.string().optional(),
  cpCode: z.number().optional(),
  notificationEmails: z.array(z.string()).optional(),
});

const QuickSecurePropertySetupSchema = z.object({
  customer: z.string().optional(),
  domain: z.string(),
  originHostname: z.string(),
  contractId: z.string(),
  groupId: z.string(),
});

const CheckSecurePropertyStatusSchema = z.object({
  customer: z.string().optional(),
  propertyId: z.string(),
  enrollmentId: z.number().optional(),
});

// Contract Schema
const ListContractsSchema = z.object({
  customer: z.string().optional(),
  searchTerm: z.string().optional(),
});

// Product Schemas
const ListProductsSchema = z.object({
  customer: z.string().optional(),
  contractId: z.string(),
});

const GetProductSchema = z.object({
  customer: z.string().optional(),
  productId: z.string(),
  contractId: z.string(),
});

const ListUseCasesSchema = z.object({
  customer: z.string().optional(),
  productId: z.string(),
  contractId: z.string().optional(),
});

// CP Code Schemas
const ListCPCodesSchema = z.object({
  customer: z.string().optional(),
  contractId: z.string().optional(),
  groupId: z.string().optional(),
});

const GetCPCodeSchema = z.object({
  customer: z.string().optional(),
  cpcodeId: z.string(),
});

const CreateCPCodeSchema = z.object({
  customer: z.string().optional(),
  cpcodeName: z.string(),
  contractId: z.string(),
  groupId: z.string(),
  productId: z.string().optional(),
  timeZone: z.string().optional(),
});

const SearchCPCodesSchema = z.object({
  customer: z.string().optional(),
  searchTerm: z.string(),
  contractId: z.string().optional(),
  groupId: z.string().optional(),
});

// Advanced Property Manager Schemas
const ListEdgeHostnamesSchema = z.object({
  customer: z.string().optional(),
  contractId: z.string().optional(),
  groupId: z.string().optional(),
});

const GetEdgeHostnameSchema = z.object({
  customer: z.string().optional(),
  edgeHostnameId: z.string(),
});

const ClonePropertySchema = z.object({
  customer: z.string().optional(),
  sourcePropertyId: z.string(),
  propertyName: z.string(),
  contractId: z.string().optional(),
  groupId: z.string().optional(),
  cloneHostnames: z.boolean().optional(),
});

const RemovePropertySchema = z.object({
  customer: z.string().optional(),
  propertyId: z.string(),
});

const ListPropertyVersionsSchema = z.object({
  customer: z.string().optional(),
  propertyId: z.string(),
  limit: z.number().optional(),
});

const GetPropertyVersionSchema = z.object({
  customer: z.string().optional(),
  propertyId: z.string(),
  version: z.number(),
});

const GetLatestPropertyVersionSchema = z.object({
  customer: z.string().optional(),
  propertyId: z.string(),
  activatedOn: z.enum(['PRODUCTION', 'STAGING', 'LATEST']).optional(),
});

const CancelPropertyActivationSchema = z.object({
  customer: z.string().optional(),
  propertyId: z.string(),
  activationId: z.string(),
});

const SearchPropertiesSchema = z.object({
  customer: z.string().optional(),
  searchTerm: z.string(),
  searchBy: z.enum(['name', 'hostname', 'edgeHostname']).optional(),
});

const ListAllHostnamesSchema = z.object({
  customer: z.string().optional(),
  contractId: z.string().optional(),
  groupId: z.string().optional(),
  includeDetails: z.boolean().optional(),
});

const ListPropertyVersionHostnamesSchema = z.object({
  customer: z.string().optional(),
  propertyId: z.string(),
  version: z.number().optional(),
  validateCnames: z.boolean().optional(),
});

// Rules and Validation Schemas
const ListAvailableBehaviorsSchema = z.object({
  customer: z.string().optional(),
  propertyId: z.string(),
  version: z.number().optional(),
  productId: z.string().optional(),
  ruleFormat: z.string().optional(),
});

const ListAvailableCriteriaSchema = z.object({
  customer: z.string().optional(),
  propertyId: z.string(),
  version: z.number().optional(),
  productId: z.string().optional(),
  ruleFormat: z.string().optional(),
});

const PatchPropertyRulesSchema = z.object({
  customer: z.string().optional(),
  propertyId: z.string(),
  version: z.number().optional(),
  patches: z.array(z.object({
    op: z.enum(['add', 'remove', 'replace', 'move', 'copy', 'test']),
    path: z.string(),
    value: z.any().optional(),
    from: z.string().optional(),
  })),
  validateRules: z.boolean().optional(),
});

const BulkSearchPropertiesSchema = z.object({
  customer: z.string().optional(),
  jsonPath: z.string(),
  network: z.enum(['PRODUCTION', 'STAGING', 'LATEST']).optional(),
  contractIds: z.array(z.string()).optional(),
  groupIds: z.array(z.string()).optional(),
});

const GetBulkSearchResultsSchema = z.object({
  customer: z.string().optional(),
  bulkSearchId: z.string(),
});

const GenerateDomainValidationChallengesSchema = z.object({
  customer: z.string().optional(),
  domains: z.array(z.string()),
  validationMethod: z.enum(['HTTP', 'DNS']).optional(),
});

const ResumeDomainValidationSchema = z.object({
  customer: z.string().optional(),
  enrollmentId: z.number(),
  domains: z.array(z.string()).optional(),
});

const GetPropertyAuditHistorySchema = z.object({
  customer: z.string().optional(),
  propertyId: z.string(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.number().optional(),
});

// Certificate Hostname Schemas
const UpdatePropertyWithDefaultDVSchema = z.object({
  customer: z.string().optional(),
  propertyId: z.string(),
  hostname: z.string(),
  version: z.number().optional(),
  ipVersion: z.enum(['IPV4', 'IPV6', 'IPV4_IPV6']).optional(),
});

const UpdatePropertyWithCPSCertificateSchema = z.object({
  customer: z.string().optional(),
  propertyId: z.string(),
  hostname: z.string(),
  certificateEnrollmentId: z.number(),
  version: z.number().optional(),
  ipVersion: z.enum(['IPV4', 'IPV6', 'IPV4_IPV6']).optional(),
  tlsVersion: z.enum(['STANDARD_TLS', 'ENHANCED_TLS']).optional(),
});

// Advanced DNS Schemas
const GetZonesDNSSECStatusSchema = z.object({
  customer: z.string().optional(),
  zones: z.array(z.string()),
});

const GetSecondaryZoneTransferStatusSchema = z.object({
  customer: z.string().optional(),
  zones: z.array(z.string()),
});

const GetZoneContractSchema = z.object({
  customer: z.string().optional(),
  zone: z.string(),
});

const GetRecordSetSchema = z.object({
  customer: z.string().optional(),
  zone: z.string(),
  name: z.string(),
  type: z.string(),
});

const UpdateTSIGKeyForZonesSchema = z.object({
  customer: z.string().optional(),
  zones: z.array(z.string()),
  tsigKey: z.object({
    name: z.string(),
    algorithm: z.string(),
    secret: z.string(),
  }),
});

const SubmitBulkZoneCreateRequestSchema = z.object({
  customer: z.string().optional(),
  zones: z.array(z.object({
    zone: z.string(),
    type: z.enum(['PRIMARY', 'SECONDARY', 'ALIAS']),
    comment: z.string().optional(),
    masters: z.array(z.string()).optional(),
    target: z.string().optional(),
  })),
  contractId: z.string(),
  groupId: z.string(),
});

const GetZoneVersionSchema = z.object({
  customer: z.string().optional(),
  zone: z.string(),
  versionId: z.string(),
});

const GetVersionRecordSetsSchema = z.object({
  customer: z.string().optional(),
  zone: z.string(),
  versionId: z.string(),
  offset: z.number().optional(),
  limit: z.number().optional(),
});

const ReactivateZoneVersionSchema = z.object({
  customer: z.string().optional(),
  zone: z.string(),
  versionId: z.string(),
  comment: z.string().optional(),
});

const GetVersionMasterZoneFileSchema = z.object({
  customer: z.string().optional(),
  zone: z.string(),
  versionId: z.string(),
});

const CreateMultipleRecordSetsSchema = z.object({
  customer: z.string().optional(),
  zone: z.string(),
  recordSets: z.array(z.object({
    name: z.string(),
    type: z.string(),
    ttl: z.number(),
    rdata: z.array(z.string()),
  })),
  comment: z.string().optional(),
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
                description: 'The property ID (e.g., prp_12345), property name, or hostname to search for',
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
        {
          name: 'list_contracts',
          description: 'List all available contracts in your account for billing and property creation',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              searchTerm: {
                type: 'string',
                description: 'Optional: Search for contracts by ID or type',
              },
            },
          },
        },
        // Product Tools
        {
          name: 'list_products',
          description: 'List all products available under a contract for property and CP code creation',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              contractId: {
                type: 'string',
                description: 'Contract ID to list products for',
              },
            },
            required: ['contractId'],
          },
        },
        {
          name: 'get_product',
          description: 'Get details about a specific product',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              productId: {
                type: 'string',
                description: 'Product ID (e.g., prd_Site_Accel)',
              },
              contractId: {
                type: 'string',
                description: 'Contract ID containing the product',
              },
            },
            required: ['productId', 'contractId'],
          },
        },
        {
          name: 'list_use_cases',
          description: 'List Akamai-provided use case scenarios for optimal traffic mapping',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              productId: {
                type: 'string',
                description: 'Product ID to get use cases for',
              },
              contractId: {
                type: 'string',
                description: 'Optional: Contract ID',
              },
            },
            required: ['productId'],
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
              force: {
                type: 'boolean',
                description: 'Optional: Force discard of existing changelist without confirmation',
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
              force: {
                type: 'boolean',
                description: 'Optional: Force discard of existing changelist without confirmation',
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
        // Certificate Hostname Update Tools
        {
          name: 'update_property_with_default_dv',
          description: 'Update property with secure edge hostname using Default DV certificate',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              propertyId: {
                type: 'string',
                description: 'The property ID to update',
              },
              hostname: {
                type: 'string',
                description: 'The hostname to secure (e.g., www.example.com)',
              },
              version: {
                type: 'number',
                description: 'Optional: Property version (defaults to latest)',
              },
              ipVersion: {
                type: 'string',
                enum: ['IPV4', 'IPV6', 'IPV4_IPV6'],
                description: 'Optional: IP version support (defaults to IPV4_IPV6)',
              },
            },
            required: ['propertyId', 'hostname'],
          },
        },
        {
          name: 'update_property_with_cps_certificate',
          description: 'Update property with edge hostname secured by CPS-managed certificate',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              propertyId: {
                type: 'string',
                description: 'The property ID to update',
              },
              hostname: {
                type: 'string',
                description: 'The hostname to secure (e.g., www.example.com)',
              },
              certificateEnrollmentId: {
                type: 'number',
                description: 'CPS certificate enrollment ID',
              },
              version: {
                type: 'number',
                description: 'Optional: Property version (defaults to latest)',
              },
              ipVersion: {
                type: 'string',
                enum: ['IPV4', 'IPV6', 'IPV4_IPV6'],
                description: 'Optional: IP version support (defaults to IPV4_IPV6)',
              },
              tlsVersion: {
                type: 'string',
                enum: ['STANDARD_TLS', 'ENHANCED_TLS'],
                description: 'Optional: TLS version (defaults to ENHANCED_TLS)',
              },
            },
            required: ['propertyId', 'hostname', 'certificateEnrollmentId'],
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
        // Secure Property Onboarding Tools
        {
          name: 'onboard_secure_property',
          description: 'Complete workflow for onboarding a Secure by Default property with automatic DefaultDV certificate',
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
              hostnames: {
                type: 'array',
                items: { type: 'string' },
                description: 'Hostnames to be served by this property',
              },
              originHostname: {
                type: 'string',
                description: 'Origin server hostname',
              },
              contractId: {
                type: 'string',
                description: 'Contract ID for billing',
              },
              groupId: {
                type: 'string',
                description: 'Group ID for organization',
              },
              productId: {
                type: 'string',
                description: 'Optional: Product ID (default: prd_Site_Accel)',
              },
              cpCode: {
                type: 'number',
                description: 'Optional: CP Code for reporting',
              },
              notificationEmails: {
                type: 'array',
                items: { type: 'string' },
                description: 'Optional: Email addresses for notifications',
              },
            },
            required: ['propertyName', 'hostnames', 'originHostname', 'contractId', 'groupId'],
          },
        },
        {
          name: 'quick_secure_property_setup',
          description: 'Quick setup for secure property with minimal inputs and sensible defaults',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              domain: {
                type: 'string',
                description: 'Primary domain (e.g., example.com)',
              },
              originHostname: {
                type: 'string',
                description: 'Origin server hostname',
              },
              contractId: {
                type: 'string',
                description: 'Contract ID for billing',
              },
              groupId: {
                type: 'string',
                description: 'Group ID for organization',
              },
            },
            required: ['domain', 'originHostname', 'contractId', 'groupId'],
          },
        },
        {
          name: 'check_secure_property_status',
          description: 'Check the status of secure property onboarding including certificate validation',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              propertyId: {
                type: 'string',
                description: 'Property ID to check',
              },
              enrollmentId: {
                type: 'number',
                description: 'Optional: Certificate enrollment ID to check status',
              },
            },
            required: ['propertyId'],
          },
        },
        // Debug Tools
        {
          name: 'debug_secure_property_onboarding',
          description: 'Debug version of secure property onboarding with detailed error reporting',
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
              hostnames: {
                type: 'array',
                items: { type: 'string' },
                description: 'Hostnames to be served by this property',
              },
              originHostname: {
                type: 'string',
                description: 'Origin server hostname',
              },
              contractId: {
                type: 'string',
                description: 'Contract ID for billing',
              },
              groupId: {
                type: 'string',
                description: 'Group ID for organization',
              },
              productId: {
                type: 'string',
                description: 'Optional: Product ID (default: prd_Site_Accel)',
              },
            },
            required: ['propertyName', 'hostnames', 'originHostname', 'contractId', 'groupId'],
          },
        },
        {
          name: 'test_basic_property_creation',
          description: 'Simple test for basic API connectivity and property creation',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              propertyName: {
                type: 'string',
                description: 'Name for the test property',
              },
              contractId: {
                type: 'string',
                description: 'Contract ID for billing',
              },
              groupId: {
                type: 'string',
                description: 'Group ID for organization',
              },
            },
            required: ['propertyName', 'contractId', 'groupId'],
          },
        },
        // CP Code Tools
        {
          name: 'list_cpcodes',
          description: 'List all CP Codes in your account for reporting and billing analysis',
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
          name: 'get_cpcode',
          description: 'Get detailed information about a specific CP Code',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              cpcodeId: {
                type: 'string',
                description: 'CP Code ID (e.g., 12345 or cpc_12345)',
              },
            },
            required: ['cpcodeId'],
          },
        },
        {
          name: 'create_cpcode',
          description: 'Create a new CP Code for traffic reporting and billing analysis',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              cpcodeName: {
                type: 'string',
                description: 'Name for the new CP Code',
              },
              contractId: {
                type: 'string',
                description: 'Contract ID for billing',
              },
              groupId: {
                type: 'string',
                description: 'Group ID for organization',
              },
              productId: {
                type: 'string',
                description: 'Optional: Product ID (default: prd_Site_Accel)',
              },
              timeZone: {
                type: 'string',
                description: 'Optional: Time zone for reporting (default: GMT)',
              },
            },
            required: ['cpcodeName', 'contractId', 'groupId'],
          },
        },
        {
          name: 'search_cpcodes',
          description: 'Search CP Codes by name or ID',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              searchTerm: {
                type: 'string',
                description: 'Search term (name or ID)',
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
            required: ['searchTerm'],
          },
        },
        {
          name: 'list_edge_hostnames',
          description: 'List edge hostnames associated with a property',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              contractId: {
                type: 'string',
                description: 'Contract ID',
              },
              groupId: {
                type: 'string',
                description: 'Group ID',
              },
              options: {
                type: 'string',
                description: 'Optional: Comma-separated list of options (e.g., "mapDetails")',
              },
            },
            required: ['contractId', 'groupId'],
          },
        },
        {
          name: 'get_edge_hostname',
          description: 'Get details of a specific edge hostname',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              edgeHostnameId: {
                type: 'string',
                description: 'Edge hostname ID (e.g., ehn_12345)',
              },
              contractId: {
                type: 'string',
                description: 'Contract ID',
              },
              groupId: {
                type: 'string',
                description: 'Group ID',
              },
              options: {
                type: 'string',
                description: 'Optional: Comma-separated list of options',
              },
            },
            required: ['edgeHostnameId', 'contractId', 'groupId'],
          },
        },
        {
          name: 'clone_property',
          description: 'Clone an existing property',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              propertyId: {
                type: 'string',
                description: 'Source property ID to clone from',
              },
              propertyName: {
                type: 'string',
                description: 'Name for the new cloned property',
              },
              propertyVersion: {
                type: 'number',
                description: 'Optional: Specific version to clone (default: latest)',
              },
              contractId: {
                type: 'string',
                description: 'Contract ID for the new property',
              },
              groupId: {
                type: 'string',
                description: 'Group ID for the new property',
              },
              productId: {
                type: 'string',
                description: 'Optional: Product ID for the new property',
              },
              ruleFormat: {
                type: 'string',
                description: 'Optional: Rule format version',
              },
            },
            required: ['propertyId', 'propertyName', 'contractId', 'groupId'],
          },
        },
        {
          name: 'remove_property',
          description: 'Remove/delete a property',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              propertyId: {
                type: 'string',
                description: 'Property ID to remove',
              },
              contractId: {
                type: 'string',
                description: 'Contract ID',
              },
              groupId: {
                type: 'string',
                description: 'Group ID',
              },
            },
            required: ['propertyId', 'contractId', 'groupId'],
          },
        },
        {
          name: 'list_property_versions',
          description: 'List all versions of a property',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              propertyId: {
                type: 'string',
                description: 'Property ID',
              },
              contractId: {
                type: 'string',
                description: 'Contract ID',
              },
              groupId: {
                type: 'string',
                description: 'Group ID',
              },
              limit: {
                type: 'number',
                description: 'Optional: Maximum number of versions to return',
              },
              offset: {
                type: 'number',
                description: 'Optional: Offset for pagination',
              },
            },
            required: ['propertyId', 'contractId', 'groupId'],
          },
        },
        {
          name: 'get_property_version',
          description: 'Get details of a specific property version',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              propertyId: {
                type: 'string',
                description: 'Property ID',
              },
              propertyVersion: {
                type: 'number',
                description: 'Property version number',
              },
              contractId: {
                type: 'string',
                description: 'Contract ID',
              },
              groupId: {
                type: 'string',
                description: 'Group ID',
              },
            },
            required: ['propertyId', 'propertyVersion', 'contractId', 'groupId'],
          },
        },
        {
          name: 'get_latest_property_version',
          description: 'Get the latest version of a property',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              propertyId: {
                type: 'string',
                description: 'Property ID',
              },
              contractId: {
                type: 'string',
                description: 'Contract ID',
              },
              groupId: {
                type: 'string',
                description: 'Group ID',
              },
              activatedOn: {
                type: 'string',
                description: 'Optional: Network to get latest activated version from (STAGING or PRODUCTION)',
              },
            },
            required: ['propertyId', 'contractId', 'groupId'],
          },
        },
        {
          name: 'cancel_property_activation',
          description: 'Cancel a pending property activation',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              propertyId: {
                type: 'string',
                description: 'Property ID',
              },
              activationId: {
                type: 'string',
                description: 'Activation ID to cancel',
              },
              contractId: {
                type: 'string',
                description: 'Contract ID',
              },
              groupId: {
                type: 'string',
                description: 'Group ID',
              },
            },
            required: ['propertyId', 'activationId', 'contractId', 'groupId'],
          },
        },
        {
          name: 'search_properties',
          description: 'Search for properties by various criteria',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              propertyName: {
                type: 'string',
                description: 'Optional: Property name to search for',
              },
              hostname: {
                type: 'string',
                description: 'Optional: Hostname to search for',
              },
              edgeHostname: {
                type: 'string',
                description: 'Optional: Edge hostname to search for',
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
            required: [],
          },
        },
        {
          name: 'list_all_hostnames',
          description: 'List all hostnames across all properties',
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
              options: {
                type: 'string',
                description: 'Optional: Comma-separated list of options',
              },
            },
            required: [],
          },
        },
        {
          name: 'list_property_version_hostnames',
          description: 'List hostnames for a specific property version',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              propertyId: {
                type: 'string',
                description: 'Property ID',
              },
              propertyVersion: {
                type: 'number',
                description: 'Property version number',
              },
              contractId: {
                type: 'string',
                description: 'Contract ID',
              },
              groupId: {
                type: 'string',
                description: 'Group ID',
              },
              validateHostnames: {
                type: 'boolean',
                description: 'Optional: Validate hostnames (default: false)',
              },
              includeCertStatus: {
                type: 'boolean',
                description: 'Optional: Include certificate status (default: false)',
              },
            },
            required: ['propertyId', 'propertyVersion', 'contractId', 'groupId'],
          },
        },
        {
          name: 'list_available_behaviors',
          description: 'List available behaviors for property rules',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              propertyId: {
                type: 'string',
                description: 'Optional: Property ID for context',
              },
              propertyVersion: {
                type: 'number',
                description: 'Optional: Property version for context',
              },
              contractId: {
                type: 'string',
                description: 'Contract ID',
              },
              groupId: {
                type: 'string',
                description: 'Group ID',
              },
              productId: {
                type: 'string',
                description: 'Optional: Product ID',
              },
              ruleFormat: {
                type: 'string',
                description: 'Optional: Rule format version',
              },
            },
            required: ['contractId', 'groupId'],
          },
        },
        {
          name: 'list_available_criteria',
          description: 'List available criteria for property rules',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              propertyId: {
                type: 'string',
                description: 'Optional: Property ID for context',
              },
              propertyVersion: {
                type: 'number',
                description: 'Optional: Property version for context',
              },
              contractId: {
                type: 'string',
                description: 'Contract ID',
              },
              groupId: {
                type: 'string',
                description: 'Group ID',
              },
              productId: {
                type: 'string',
                description: 'Optional: Product ID',
              },
              ruleFormat: {
                type: 'string',
                description: 'Optional: Rule format version',
              },
            },
            required: ['contractId', 'groupId'],
          },
        },
        {
          name: 'patch_property_rules',
          description: 'Apply JSON patch operations to property rules',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              propertyId: {
                type: 'string',
                description: 'Property ID',
              },
              propertyVersion: {
                type: 'number',
                description: 'Property version number',
              },
              contractId: {
                type: 'string',
                description: 'Contract ID',
              },
              groupId: {
                type: 'string',
                description: 'Group ID',
              },
              patches: {
                type: 'array',
                description: 'Array of JSON patch operations',
                items: {
                  type: 'object',
                  properties: {
                    op: {
                      type: 'string',
                      description: 'Operation type (add, remove, replace, move, copy, test)',
                    },
                    path: {
                      type: 'string',
                      description: 'JSON pointer path',
                    },
                    value: {
                      description: 'Value for the operation',
                    },
                    from: {
                      type: 'string',
                      description: 'Source path for move/copy operations',
                    },
                  },
                  required: ['op', 'path'],
                },
              },
              validateRules: {
                type: 'boolean',
                description: 'Optional: Validate rules after patching (default: true)',
              },
            },
            required: ['propertyId', 'propertyVersion', 'contractId', 'groupId', 'patches'],
          },
        },
        {
          name: 'bulk_search_properties',
          description: 'Initiate a bulk search for properties',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              contractId: {
                type: 'string',
                description: 'Contract ID',
              },
              groupId: {
                type: 'string',
                description: 'Group ID',
              },
            },
            required: ['contractId', 'groupId'],
          },
        },
        {
          name: 'get_bulk_search_results',
          description: 'Get results from a bulk property search',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              bulkSearchId: {
                type: 'string',
                description: 'Bulk search ID',
              },
              contractId: {
                type: 'string',
                description: 'Contract ID',
              },
              groupId: {
                type: 'string',
                description: 'Group ID',
              },
            },
            required: ['bulkSearchId', 'contractId', 'groupId'],
          },
        },
        {
          name: 'generate_domain_validation_challenges',
          description: 'Generate domain validation challenges for certificates',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              enrollmentId: {
                type: 'string',
                description: 'Certificate enrollment ID',
              },
              contractId: {
                type: 'string',
                description: 'Contract ID',
              },
            },
            required: ['enrollmentId', 'contractId'],
          },
        },
        {
          name: 'resume_domain_validation',
          description: 'Resume domain validation for certificates',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              enrollmentId: {
                type: 'string',
                description: 'Certificate enrollment ID',
              },
              contractId: {
                type: 'string',
                description: 'Contract ID',
              },
            },
            required: ['enrollmentId', 'contractId'],
          },
        },
        {
          name: 'get_property_audit_history',
          description: 'Get audit history for a property',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              propertyId: {
                type: 'string',
                description: 'Property ID',
              },
              contractId: {
                type: 'string',
                description: 'Contract ID',
              },
              groupId: {
                type: 'string',
                description: 'Group ID',
              },
              startDate: {
                type: 'string',
                description: 'Optional: Start date for audit history (ISO 8601)',
              },
              endDate: {
                type: 'string',
                description: 'Optional: End date for audit history (ISO 8601)',
              },
              limit: {
                type: 'number',
                description: 'Optional: Maximum number of entries to return',
              },
              offset: {
                type: 'number',
                description: 'Optional: Offset for pagination',
              },
            },
            required: ['propertyId', 'contractId', 'groupId'],
          },
        },
        // Advanced DNS Tools
        {
          name: 'get_zones_dnssec_status',
          description: 'Get DNSSEC status for one or more zones',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              zones: {
                type: 'array',
                items: { type: 'string' },
                description: 'Array of zone names to check',
              },
            },
            required: ['zones'],
          },
        },
        {
          name: 'get_secondary_zone_transfer_status',
          description: 'Get transfer status for secondary zones',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              zones: {
                type: 'array',
                items: { type: 'string' },
                description: 'Array of secondary zone names',
              },
            },
            required: ['zones'],
          },
        },
        {
          name: 'get_zone_contract',
          description: 'Get contract information for a zone',
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
            },
            required: ['zone'],
          },
        },
        {
          name: 'get_record_set',
          description: 'Get a single record set by name and type',
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
              name: {
                type: 'string',
                description: 'Record name',
              },
              type: {
                type: 'string',
                description: 'Record type (A, AAAA, CNAME, etc.)',
              },
            },
            required: ['zone', 'name', 'type'],
          },
        },
        {
          name: 'update_tsig_key_for_zones',
          description: 'Update TSIG key for multiple zones',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              zones: {
                type: 'array',
                items: { type: 'string' },
                description: 'Array of zone names to update',
              },
              tsigKey: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  algorithm: { type: 'string' },
                  secret: { type: 'string' },
                },
                required: ['name', 'algorithm', 'secret'],
                description: 'TSIG key configuration',
              },
            },
            required: ['zones', 'tsigKey'],
          },
        },
        {
          name: 'submit_bulk_zone_create_request',
          description: 'Submit a request to create multiple zones asynchronously',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              zones: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    zone: { type: 'string' },
                    type: { type: 'string', enum: ['PRIMARY', 'SECONDARY', 'ALIAS'] },
                    comment: { type: 'string' },
                    masters: { type: 'array', items: { type: 'string' } },
                    target: { type: 'string' },
                  },
                  required: ['zone', 'type'],
                },
                description: 'Array of zones to create',
              },
              contractId: {
                type: 'string',
                description: 'Contract ID',
              },
              groupId: {
                type: 'string',
                description: 'Group ID',
              },
            },
            required: ['zones', 'contractId', 'groupId'],
          },
        },
        {
          name: 'get_zone_version',
          description: 'Get details about a specific zone version',
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
              versionId: {
                type: 'string',
                description: 'Version ID',
              },
            },
            required: ['zone', 'versionId'],
          },
        },
        {
          name: 'get_version_record_sets',
          description: 'Get record sets for a specific zone version',
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
              versionId: {
                type: 'string',
                description: 'Version ID',
              },
              offset: {
                type: 'number',
                description: 'Optional: Offset for pagination',
              },
              limit: {
                type: 'number',
                description: 'Optional: Limit for pagination',
              },
            },
            required: ['zone', 'versionId'],
          },
        },
        {
          name: 'reactivate_zone_version',
          description: 'Reactivate a previous zone version',
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
              versionId: {
                type: 'string',
                description: 'Version ID to reactivate',
              },
              comment: {
                type: 'string',
                description: 'Optional: Comment for the reactivation',
              },
            },
            required: ['zone', 'versionId'],
          },
        },
        {
          name: 'get_version_master_zone_file',
          description: 'Download zone file for a specific version',
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
              versionId: {
                type: 'string',
                description: 'Version ID',
              },
            },
            required: ['zone', 'versionId'],
          },
        },
        {
          name: 'create_multiple_record_sets',
          description: 'Create multiple DNS records in a single operation',
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
              recordSets: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    type: { type: 'string' },
                    ttl: { type: 'number' },
                    rdata: { type: 'array', items: { type: 'string' } },
                  },
                  required: ['name', 'type', 'ttl', 'rdata'],
                },
                description: 'Array of record sets to create',
              },
              comment: {
                type: 'string',
                description: 'Optional: Change comment',
              },
            },
            required: ['zone', 'recordSets'],
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

          case 'list_contracts':
            const listContractsArgs = ListContractsSchema.parse(args);
            return await listContracts(client, listContractsArgs);

          // Product tools
          case 'list_products':
            const listProductsArgs = ListProductsSchema.parse(args);
            return await listProducts(client, listProductsArgs);

          case 'get_product':
            const getProductArgs = GetProductSchema.parse(args);
            return await getProduct(client, getProductArgs);

          case 'list_use_cases':
            const listUseCasesArgs = ListUseCasesSchema.parse(args);
            return await listUseCases(client, listUseCasesArgs);

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
            return await updatePropertyRules(client, {
              propertyId: updateRulesArgs.propertyId,
              version: updateRulesArgs.version,
              rules: updateRulesArgs.rules,
              note: updateRulesArgs.note,
            });

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

          // Certificate Hostname Update tools
          case 'update_property_with_default_dv':
            const updateDefaultDVArgs = UpdatePropertyWithDefaultDVSchema.parse(args);
            return await updatePropertyWithDefaultDV(client, updateDefaultDVArgs);

          case 'update_property_with_cps_certificate':
            const updateCPSCertArgs = UpdatePropertyWithCPSCertificateSchema.parse(args);
            return await updatePropertyWithCPSCertificate(client, updateCPSCertArgs);

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

          // Secure Property Onboarding tools
          case 'onboard_secure_property':
            const onboardArgs = OnboardSecurePropertySchema.parse(args);
            return await onboardSecureByDefaultProperty(client, onboardArgs);

          case 'quick_secure_property_setup':
            const quickSetupArgs = QuickSecurePropertySetupSchema.parse(args);
            return await quickSecureByDefaultSetup(client, quickSetupArgs);

          case 'check_secure_property_status':
            const checkStatusSecureArgs = CheckSecurePropertyStatusSchema.parse(args);
            return await checkSecureByDefaultStatus(client, checkStatusSecureArgs);

          // Debug tools
          case 'debug_secure_property_onboarding':
            const debugArgs = OnboardSecurePropertySchema.parse(args);
            return await debugSecurePropertyOnboarding(client, debugArgs);

          case 'test_basic_property_creation':
            const testArgs = z.object({
              customer: z.string().optional(),
              propertyName: z.string(),
              contractId: z.string(),
              groupId: z.string(),
            }).parse(args);
            return await testBasicPropertyCreation(client, testArgs);

          // CP Code tools
          case 'list_cpcodes':
            const listCPCodesArgs = ListCPCodesSchema.parse(args);
            return await listCPCodes(client, listCPCodesArgs);

          case 'get_cpcode':
            const getCPCodeArgs = GetCPCodeSchema.parse(args);
            return await getCPCode(client, getCPCodeArgs);

          case 'create_cpcode':
            const createCPCodeArgs = CreateCPCodeSchema.parse(args);
            return await createCPCode(client, createCPCodeArgs);

          case 'search_cpcodes':
            const searchCPCodesArgs = SearchCPCodesSchema.parse(args);
            return await searchCPCodes(client, searchCPCodesArgs);

          // Edge Hostname tools
          case 'list_edge_hostnames':
            const listEdgeHostnamesArgs = ListEdgeHostnamesSchema.parse(args);
            return await listEdgeHostnames(client, listEdgeHostnamesArgs);

          case 'get_edge_hostname':
            const getEdgeHostnameArgs = GetEdgeHostnameSchema.parse(args);
            return await getEdgeHostname(client, getEdgeHostnameArgs);

          // Property management tools
          case 'clone_property':
            const clonePropertyArgs = ClonePropertySchema.parse(args);
            return await cloneProperty(client, clonePropertyArgs);

          case 'remove_property':
            const removePropertyArgs = RemovePropertySchema.parse(args);
            return await removeProperty(client, removePropertyArgs);

          case 'list_property_versions':
            const listPropertyVersionsArgs = ListPropertyVersionsSchema.parse(args);
            return await listPropertyVersions(client, listPropertyVersionsArgs);

          case 'get_property_version':
            const getPropertyVersionArgs = GetPropertyVersionSchema.parse(args);
            return await getPropertyVersion(client, getPropertyVersionArgs);

          case 'get_latest_property_version':
            const getLatestPropertyVersionArgs = GetLatestPropertyVersionSchema.parse(args);
            return await getLatestPropertyVersion(client, getLatestPropertyVersionArgs);

          case 'cancel_property_activation':
            const cancelPropertyActivationArgs = CancelPropertyActivationSchema.parse(args);
            return await cancelPropertyActivation(client, cancelPropertyActivationArgs);

          case 'search_properties':
            const searchPropertiesArgs = SearchPropertiesSchema.parse(args);
            return await searchProperties(client, searchPropertiesArgs);

          // Hostname tools
          case 'list_all_hostnames':
            const listAllHostnamesArgs = ListAllHostnamesSchema.parse(args);
            return await listAllHostnames(client, listAllHostnamesArgs);

          case 'list_property_version_hostnames':
            const listPropertyVersionHostnamesArgs = ListPropertyVersionHostnamesSchema.parse(args);
            return await listPropertyVersionHostnames(client, listPropertyVersionHostnamesArgs);

          // Rule format tools
          case 'list_available_behaviors':
            const listAvailableBehaviorsArgs = ListAvailableBehaviorsSchema.parse(args);
            return await listAvailableBehaviors(client, listAvailableBehaviorsArgs);

          case 'list_available_criteria':
            const listAvailableCriteriaArgs = ListAvailableCriteriaSchema.parse(args);
            return await listAvailableCriteria(client, listAvailableCriteriaArgs);

          case 'patch_property_rules':
            const patchPropertyRulesArgs = PatchPropertyRulesSchema.parse(args);
            return await patchPropertyRules(client, patchPropertyRulesArgs);

          // Bulk search tools
          case 'bulk_search_properties':
            const bulkSearchPropertiesArgs = BulkSearchPropertiesSchema.parse(args);
            return await bulkSearchProperties(client, bulkSearchPropertiesArgs);

          case 'get_bulk_search_results':
            const getBulkSearchResultsArgs = GetBulkSearchResultsSchema.parse(args);
            return await getBulkSearchResults(client, getBulkSearchResultsArgs);

          // Certificate tools
          case 'generate_domain_validation_challenges':
            const generateDomainValidationChallengesArgs = GenerateDomainValidationChallengesSchema.parse(args);
            return await generateDomainValidationChallenges(client, generateDomainValidationChallengesArgs);

          case 'resume_domain_validation':
            const resumeDomainValidationArgs = ResumeDomainValidationSchema.parse(args);
            return await resumeDomainValidation(client, resumeDomainValidationArgs);

          // Audit tools
          case 'get_property_audit_history':
            const getPropertyAuditHistoryArgs = GetPropertyAuditHistorySchema.parse(args);
            return await getPropertyAuditHistory(client, getPropertyAuditHistoryArgs);

          // Advanced DNS tools
          case 'get_zones_dnssec_status':
            const getZonesDNSSECStatusArgs = GetZonesDNSSECStatusSchema.parse(args);
            return await getZonesDNSSECStatus(client, getZonesDNSSECStatusArgs);

          case 'get_secondary_zone_transfer_status':
            const getSecondaryZoneTransferStatusArgs = GetSecondaryZoneTransferStatusSchema.parse(args);
            return await getSecondaryZoneTransferStatus(client, getSecondaryZoneTransferStatusArgs);

          case 'get_zone_contract':
            const getZoneContractArgs = GetZoneContractSchema.parse(args);
            return await getZoneContract(client, getZoneContractArgs);

          case 'get_record_set':
            const getRecordSetArgs = GetRecordSetSchema.parse(args);
            return await getRecordSet(client, getRecordSetArgs);

          case 'update_tsig_key_for_zones':
            const updateTSIGKeyForZonesArgs = UpdateTSIGKeyForZonesSchema.parse(args);
            return await updateTSIGKeyForZones(client, updateTSIGKeyForZonesArgs);

          case 'submit_bulk_zone_create_request':
            const submitBulkZoneCreateRequestArgs = SubmitBulkZoneCreateRequestSchema.parse(args);
            return await submitBulkZoneCreateRequest(client, submitBulkZoneCreateRequestArgs);

          case 'get_zone_version':
            const getZoneVersionArgs = GetZoneVersionSchema.parse(args);
            return await getZoneVersion(client, getZoneVersionArgs);

          case 'get_version_record_sets':
            const getVersionRecordSetsArgs = GetVersionRecordSetsSchema.parse(args);
            return await getVersionRecordSets(client, getVersionRecordSetsArgs);

          case 'reactivate_zone_version':
            const reactivateZoneVersionArgs = ReactivateZoneVersionSchema.parse(args);
            return await reactivateZoneVersion(client, reactivateZoneVersionArgs);

          case 'get_version_master_zone_file':
            const getVersionMasterZoneFileArgs = GetVersionMasterZoneFileSchema.parse(args);
            return await getVersionMasterZoneFile(client, getVersionMasterZoneFileArgs);

          case 'create_multiple_record_sets':
            const createMultipleRecordSetsArgs = CreateMultipleRecordSetsSchema.parse(args);
            return await createMultipleRecordSets(client, createMultipleRecordSetsArgs);

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