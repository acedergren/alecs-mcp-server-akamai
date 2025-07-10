/**
 * GTM Domain Tools
 * 
 * Complete implementation of Akamai Global Traffic Management (GTM) tools
 * 
 * CODE KAI PRINCIPLES APPLIED:
 * Key: Production-grade GTM operations
 * Approach: Type-safe implementation with comprehensive error handling
 * Implementation: Full API coverage for Global Traffic Management
 * 
 * Generated on 2025-07-10T04:21:59.540Z using ALECSCore CLI
 */

import { type MCPToolResponse } from '../../types/mcp-protocol';
import { AkamaiClient } from '../../akamai-client';
import { createLogger } from '../../utils/pino-logger';
import { ToolErrorHandler } from '../../utils/error-handler';
import { 
  GTMEndpoints, 
  GTMToolSchemas,
  formatDatacenterLocation,
  formatPropertyType,
  formatTestProtocol,
  formatTrafficDistribution,
  DomainTypes
} from './gtm-api-implementation';
import type { z } from 'zod';

interface GTMResponse {
  domains?: any[];
  domain?: any;
  datacenters?: any[];
  properties?: any[];
  resources?: any[];
  maps?: any[];
  geographicMaps?: any[];
  cidrMaps?: any[];
  asMaps?: any[];
  status?: any;
  history?: any[];
  identity?: any;
  contracts?: any[];
  groups?: any[];
  datacenterId?: number;
  name?: string;
  type?: string;
  nickname?: string;
  lastModified?: string;
  lastModifiedBy?: string;
  propagationStatus?: string;
  message?: string;
  passingValidation?: boolean;
  links?: any[];
  comment?: string;
}

const logger = createLogger('gtm-tools');

/**
 * GTM Tools - Complete implementation
 * 
 * Provides all Global Traffic Management operations through a single class
 * following ALECSCore domain patterns
 */
export class GTMTools {
  private client: AkamaiClient;
  private errorHandler: ToolErrorHandler;

  constructor(customer: string = 'default') {
    this.client = new AkamaiClient(customer);
    this.errorHandler = new ToolErrorHandler({
      tool: 'gtm',
      operation: 'gtm-operation',
      customer
    });
  }

  /**
   * List GTM domains
   */
  async listDomains(args: z.infer<typeof GTMToolSchemas.listDomains>): Promise<MCPToolResponse> {
    try {
      logger.info({ args }, 'Listing GTM domains');
      
      const response = await this.client.request({
        method: 'GET',
        path: GTMEndpoints.listDomains()
      });

      const domains = (response as GTMResponse).domains || [];

      let text = `🌐 **GTM Domains**\n\n`;

      if (domains.length > 0) {
        text += `**Found ${domains.length} domains**\n\n`;
        
        domains.forEach((domain: any, index: number) => {
          text += `${index + 1}. **${domain.name}**\n`;
          text += `   • Type: ${DomainTypes[domain.type as keyof typeof DomainTypes] || domain.type}\n`;
          text += `   • Status: ${domain.status || 'Active'}\n`;
          text += `   • Modified: ${domain.lastModified} by ${domain.lastModifiedBy}\n`;
          if (domain.comment) {
            text += `   • Comment: ${domain.comment}\n`;
          }
          text += `\n`;
        });
      } else {
        text += '⚠️ No GTM domains found.\n';
        text += '\n💡 Create a domain using `gtm_create_domain`\n';
      }

      return {
        content: [{ type: 'text', text }]
      };
    } catch (error) {
      return this.errorHandler.handleError(error);
    }
  }

  /**
   * Create GTM domain
   */
  async createDomain(args: z.infer<typeof GTMToolSchemas.createDomain>): Promise<MCPToolResponse> {
    try {
      logger.info({ name: args.name }, 'Creating GTM domain');
      
      const domainConfig = {
        name: args.name,
        type: args.type,
        comment: args.comment,
        emailNotificationList: args.emailNotificationList || [],
        // Default values for domain creation
        loadImbalancePercentage: 10,
        defaultSslClientCertificate: null,
        defaultSslClientPrivateKey: null
      };
      
      const response = await this.client.request({
        method: 'POST',
        path: GTMEndpoints.createDomain(),
        body: domainConfig
      });

      const domain = response as GTMResponse;

      let text = `✅ **GTM Domain Created Successfully**\n\n`;
      text += `**Domain**: ${domain.name}\n`;
      text += `**Type**: ${DomainTypes[args.type as keyof typeof DomainTypes]}\n`;
      if ((domain as any).comment) {
        text += `**Comment**: ${(domain as any).comment}\n`;
      }
      text += `\n💡 Next steps:\n`;
      text += `1. Create datacenters using \`gtm_create_datacenter\`\n`;
      text += `2. Create properties using \`gtm_create_property\`\n`;
      text += `3. Configure traffic routing\n`;

      return {
        content: [{ type: 'text', text }]
      };
    } catch (error) {
      return this.errorHandler.handleError(error);
    }
  }

  /**
   * Get GTM domain details
   */
  async getDomain(args: z.infer<typeof GTMToolSchemas.getDomain>): Promise<MCPToolResponse> {
    try {
      logger.info({ domainName: args.domainName }, 'Getting GTM domain details');
      
      const response = await this.client.request({
        method: 'GET',
        path: GTMEndpoints.getDomain(args.domainName)
      });

      const domain = response as GTMResponse;

      let text = `🌐 **GTM Domain Details**\n\n`;
      text += `**Name**: ${domain.name}\n`;
      text += `**Type**: ${DomainTypes[domain.type as keyof typeof DomainTypes] || domain.type}\n`;
      text += `**Modified**: ${domain.lastModified} by ${domain.lastModifiedBy}\n`;
      
      // Domain configuration
      text += `\n**Configuration**:\n`;
      text += `• Load Imbalance: ${(domain as any).loadImbalancePercentage || 10}%\n`;
      text += `• Load Feedback: ${(domain as any).loadFeedback ? 'Enabled' : 'Disabled'}\n`;
      
      // Summary counts
      const datacenters = (domain as any).datacenters || [];
      const properties = (domain as any).properties || [];
      const resources = (domain as any).resources || [];
      
      text += `\n**Resources**:\n`;
      text += `• Datacenters: ${datacenters.length}\n`;
      text += `• Properties: ${properties.length}\n`;
      text += `• Resources: ${resources.length}\n`;
      
      // Email notifications
      const emails = (domain as any).emailNotificationList || [];
      if (emails.length > 0) {
        text += `\n**Email Notifications**: ${emails.join(', ')}\n`;
      }

      return {
        content: [{ type: 'text', text }]
      };
    } catch (error) {
      return this.errorHandler.handleError(error);
    }
  }

  /**
   * Update GTM domain
   */
  async updateDomain(args: z.infer<typeof GTMToolSchemas.updateDomain>): Promise<MCPToolResponse> {
    try {
      logger.info({ domainName: args.domainName }, 'Updating GTM domain');
      
      // First get the current domain to preserve existing values
      const currentDomain = await this.client.request({
        method: 'GET',
        path: GTMEndpoints.getDomain(args.domainName)
      }) as any;
      
      // Update only specified fields
      const updates = {
        ...currentDomain,
        ...(args.comment !== undefined && { comment: args.comment }),
        ...(args.emailNotificationList && { emailNotificationList: args.emailNotificationList }),
        ...(args.loadImbalancePercentage !== undefined && { loadImbalancePercentage: args.loadImbalancePercentage })
      };
      
      await this.client.request({
        method: 'PUT',
        path: GTMEndpoints.updateDomain(args.domainName),
        body: updates
      });

      let text = `✅ **GTM Domain Updated Successfully**\n\n`;
      text += `**Domain**: ${args.domainName}\n`;
      if (args.comment !== undefined) {
        text += `**Comment**: ${args.comment || '(removed)'}\n`;
      }
      if (args.loadImbalancePercentage !== undefined) {
        text += `**Load Imbalance**: ${args.loadImbalancePercentage}%\n`;
      }
      if (args.emailNotificationList) {
        text += `**Email Notifications**: ${args.emailNotificationList.join(', ')}\n`;
      }

      return {
        content: [{ type: 'text', text }]
      };
    } catch (error) {
      return this.errorHandler.handleError(error);
    }
  }

  /**
   * Get GTM domain status
   */
  async getDomainStatus(args: z.infer<typeof GTMToolSchemas.getDomainStatus>): Promise<MCPToolResponse> {
    try {
      logger.info({ domainName: args.domainName }, 'Getting GTM domain status');
      
      const response = await this.client.request({
        method: 'GET',
        path: GTMEndpoints.getDomainStatus(args.domainName)
      });

      const status = response as GTMResponse;

      let text = `📊 **GTM Domain Status**\n\n`;
      text += `**Domain**: ${args.domainName}\n`;
      text += `**Status**: ${status.propagationStatus || 'Unknown'}\n`;
      text += `**Validation**: ${status.passingValidation ? '✅ Passing' : '❌ Failing'}\n`;
      
      if (status.message) {
        text += `**Message**: ${status.message}\n`;
      }
      
      // Check links for more details
      const links = status.links || [];
      const propagationLink = links.find((l: any) => l.rel === 'propagation-status');
      if (propagationLink) {
        text += `\n💡 Check propagation details for more information\n`;
      }

      return {
        content: [{ type: 'text', text }]
      };
    } catch (error) {
      return this.errorHandler.handleError(error);
    }
  }

  /**
   * List datacenters
   */
  async listDatacenters(args: z.infer<typeof GTMToolSchemas.listDatacenters>): Promise<MCPToolResponse> {
    try {
      logger.info({ domainName: args.domainName }, 'Listing datacenters');
      
      const response = await this.client.request({
        method: 'GET',
        path: GTMEndpoints.listDatacenters(args.domainName)
      });

      const datacenters = (response as GTMResponse).datacenters || [];

      let text = `🏢 **GTM Datacenters**\n\n`;
      text += `**Domain**: ${args.domainName}\n\n`;

      if (datacenters.length > 0) {
        text += `**Found ${datacenters.length} datacenters**\n\n`;
        
        // Group by continent
        const byContinent: Record<string, any[]> = {};
        datacenters.forEach((dc: any) => {
          const continent = dc.continent || 'Other';
          if (!byContinent[continent]) {
            byContinent[continent] = [];
          }
          byContinent[continent].push(dc);
        });
        
        Object.entries(byContinent).forEach(([continent, dcs]) => {
          text += `### ${continent}\n`;
          dcs.forEach((dc: any, index: number) => {
            text += `${index + 1}. **${dc.nickname}** (ID: ${dc.datacenterId})\n`;
            text += `   • Location: ${formatDatacenterLocation(dc)}\n`;
            if (dc.latitude && dc.longitude) {
              text += `   • Coordinates: ${dc.latitude}, ${dc.longitude}\n`;
            }
            text += `   • Virtual: ${dc.virtual ? 'Yes' : 'No'}\n`;
            text += `\n`;
          });
        });
      } else {
        text += '⚠️ No datacenters found.\n';
        text += '\n💡 Create a datacenter using `gtm_create_datacenter`\n';
      }

      return {
        content: [{ type: 'text', text }]
      };
    } catch (error) {
      return this.errorHandler.handleError(error);
    }
  }

  /**
   * Create datacenter
   */
  async createDatacenter(args: z.infer<typeof GTMToolSchemas.createDatacenter>): Promise<MCPToolResponse> {
    try {
      logger.info({ domainName: args.domainName, nickname: args.nickname }, 'Creating datacenter');
      
      const datacenterConfig = {
        nickname: args.nickname,
        city: args.city || null,
        country: args.country || null,
        continent: args.continent || null,
        latitude: args.latitude || 0,
        longitude: args.longitude || 0,
        stateOrProvince: args.stateOrProvince || null,
        virtual: true,
        defaultLoadObject: {
          loadObject: null,
          loadObjectPort: 0,
          loadServers: null
        }
      };
      
      const response = await this.client.request({
        method: 'POST',
        path: GTMEndpoints.createDatacenter(args.domainName),
        body: datacenterConfig
      });

      const datacenter = response as GTMResponse;

      let text = `✅ **Datacenter Created Successfully**\n\n`;
      text += `**Nickname**: ${datacenter.nickname}\n`;
      text += `**ID**: ${datacenter.datacenterId}\n`;
      text += `**Location**: ${formatDatacenterLocation(datacenter)}\n`;
      if (args.latitude && args.longitude) {
        text += `**Coordinates**: ${args.latitude}, ${args.longitude}\n`;
      }
      text += `\n💡 Next step: Add this datacenter to properties for traffic routing\n`;

      return {
        content: [{ type: 'text', text }]
      };
    } catch (error) {
      return this.errorHandler.handleError(error);
    }
  }

  /**
   * Update datacenter
   */
  async updateDatacenter(args: z.infer<typeof GTMToolSchemas.updateDatacenter>): Promise<MCPToolResponse> {
    try {
      logger.info({ 
        domainName: args.domainName, 
        datacenterId: args.datacenterId 
      }, 'Updating datacenter');
      
      // First get the current datacenter
      const currentDc = await this.client.request({
        method: 'GET',
        path: GTMEndpoints.getDatacenter(args.domainName, args.datacenterId)
      }) as any;
      
      // Update only specified fields
      const updates = {
        ...currentDc,
        ...(args.nickname !== undefined && { nickname: args.nickname }),
        ...(args.city !== undefined && { city: args.city }),
        ...(args.country !== undefined && { country: args.country }),
        ...(args.latitude !== undefined && { latitude: args.latitude }),
        ...(args.longitude !== undefined && { longitude: args.longitude })
      };
      
      await this.client.request({
        method: 'PUT',
        path: GTMEndpoints.updateDatacenter(args.domainName, args.datacenterId),
        body: updates
      });

      let text = `✅ **Datacenter Updated Successfully**\n\n`;
      text += `**Datacenter ID**: ${args.datacenterId}\n`;
      if (args.nickname) {
        text += `**New Nickname**: ${args.nickname}\n`;
      }
      if (args.city || args.country) {
        text += `**New Location**: ${formatDatacenterLocation(updates)}\n`;
      }
      if (args.latitude !== undefined && args.longitude !== undefined) {
        text += `**New Coordinates**: ${args.latitude}, ${args.longitude}\n`;
      }

      return {
        content: [{ type: 'text', text }]
      };
    } catch (error) {
      return this.errorHandler.handleError(error);
    }
  }

  /**
   * Delete datacenter
   */
  async deleteDatacenter(args: z.infer<typeof GTMToolSchemas.deleteDatacenter>): Promise<MCPToolResponse> {
    try {
      if (!args.confirm) {
        return {
          content: [{
            type: 'text',
            text: '⚠️ **Deletion not confirmed**\n\nSet `confirm: true` to delete the datacenter.'
          }]
        };
      }
      
      logger.info({ 
        domainName: args.domainName, 
        datacenterId: args.datacenterId 
      }, 'Deleting datacenter');
      
      await this.client.request({
        method: 'DELETE',
        path: GTMEndpoints.deleteDatacenter(args.domainName, args.datacenterId)
      });

      let text = `✅ **Datacenter Deleted Successfully**\n\n`;
      text += `**Datacenter ID**: ${args.datacenterId}\n`;
      text += `\n⚠️ Note: This action cannot be undone.\n`;

      return {
        content: [{ type: 'text', text }]
      };
    } catch (error) {
      return this.errorHandler.handleError(error);
    }
  }

  /**
   * List properties
   */
  async listProperties(args: z.infer<typeof GTMToolSchemas.listProperties>): Promise<MCPToolResponse> {
    try {
      logger.info({ domainName: args.domainName }, 'Listing properties');
      
      const response = await this.client.request({
        method: 'GET',
        path: GTMEndpoints.listProperties(args.domainName)
      });

      const properties = (response as GTMResponse).properties || [];

      let text = `🎯 **GTM Properties**\n\n`;
      text += `**Domain**: ${args.domainName}\n\n`;

      if (properties.length > 0) {
        text += `**Found ${properties.length} properties**\n\n`;
        
        // Group by type
        const byType: Record<string, any[]> = {};
        properties.forEach((prop: any) => {
          const type = prop.type || 'Unknown';
          if (!byType[type]) {
            byType[type] = [];
          }
          byType[type].push(prop);
        });
        
        Object.entries(byType).forEach(([type, props]) => {
          text += `### ${formatPropertyType(type)}\n`;
          props.forEach((prop: any, index: number) => {
            text += `${index + 1}. **${prop.name}**\n`;
            text += `   • Score Aggregation: ${prop.scoreAggregationType || 'mean'}\n`;
            text += `   • Handout Mode: ${prop.handoutMode || 'normal'}\n`;
            
            const targets = prop.trafficTargets || [];
            const enabledTargets = targets.filter((t: any) => t.enabled);
            text += `   • Traffic Targets: ${enabledTargets.length}/${targets.length} active\n`;
            
            if (enabledTargets.length > 0) {
              text += `   • Distribution: ${formatTrafficDistribution(targets)}\n`;
            }
            
            const tests = prop.livenessTests || [];
            if (tests.length > 0) {
              text += `   • Liveness Tests: ${tests.length}\n`;
            }
            
            text += `\n`;
          });
        });
      } else {
        text += '⚠️ No properties found.\n';
        text += '\n💡 Create a property using `gtm_create_property`\n';
      }

      return {
        content: [{ type: 'text', text }]
      };
    } catch (error) {
      return this.errorHandler.handleError(error);
    }
  }

  /**
   * Create property
   */
  async createProperty(args: z.infer<typeof GTMToolSchemas.createProperty>): Promise<MCPToolResponse> {
    try {
      logger.info({ 
        domainName: args.domainName, 
        name: args.name, 
        type: args.type 
      }, 'Creating property');
      
      const propertyConfig = {
        name: args.name,
        type: args.type,
        scoreAggregationType: args.scoreAggregationType || 'mean',
        handoutMode: args.handoutMode || 'normal',
        ipv6: false,
        dynamicTTL: 300,
        staticTTL: 600,
        trafficTargets: args.trafficTargets.map(target => ({
          datacenterId: target.datacenterId,
          enabled: target.enabled !== false,
          weight: target.weight || 1,
          servers: target.servers || [],
          handoutCName: null
        })),
        livenessTests: [],
        mxRecords: []
      };
      
      await this.client.request({
        method: 'PUT',
        path: GTMEndpoints.updateProperty(args.domainName, args.name),
        body: propertyConfig
      });

      let text = `✅ **Property Created Successfully**\n\n`;
      text += `**Name**: ${args.name}\n`;
      text += `**Type**: ${formatPropertyType(args.type)}\n`;
      text += `**Score Aggregation**: ${args.scoreAggregationType || 'mean'}\n`;
      text += `**Handout Mode**: ${args.handoutMode || 'normal'}\n`;
      text += `\n**Traffic Targets**: ${args.trafficTargets.length}\n`;
      text += `**Distribution**: ${formatTrafficDistribution(args.trafficTargets)}\n`;
      text += `\n💡 Next steps:\n`;
      text += `1. Add liveness tests using \`gtm_update_property\`\n`;
      text += `2. Configure geographic or CIDR maps if needed\n`;
      text += `3. Test DNS resolution: \`dig ${args.name}.${args.domainName}\`\n`;

      return {
        content: [{ type: 'text', text }]
      };
    } catch (error) {
      return this.errorHandler.handleError(error);
    }
  }

  /**
   * Update property
   */
  async updateProperty(args: z.infer<typeof GTMToolSchemas.updateProperty>): Promise<MCPToolResponse> {
    try {
      logger.info({ 
        domainName: args.domainName, 
        propertyName: args.propertyName 
      }, 'Updating property');
      
      // First get the current property
      const currentProp = await this.client.request({
        method: 'GET',
        path: GTMEndpoints.getProperty(args.domainName, args.propertyName)
      }) as any;
      
      // Update only specified fields
      const updates = {
        ...currentProp,
        ...(args.trafficTargets && { trafficTargets: args.trafficTargets }),
        ...(args.livenessTests && { livenessTests: args.livenessTests })
      };
      
      await this.client.request({
        method: 'PUT',
        path: GTMEndpoints.updateProperty(args.domainName, args.propertyName),
        body: updates
      });

      let text = `✅ **Property Updated Successfully**\n\n`;
      text += `**Property**: ${args.propertyName}\n`;
      
      if (args.trafficTargets) {
        text += `\n**Traffic Targets Updated**: ${args.trafficTargets.length}\n`;
        text += `**Distribution**: ${formatTrafficDistribution(args.trafficTargets)}\n`;
      }
      
      if (args.livenessTests) {
        text += `\n**Liveness Tests Updated**: ${args.livenessTests.length}\n`;
        args.livenessTests.forEach((test: any, index: number) => {
          text += `${index + 1}. ${test.name}\n`;
          text += `   • Protocol: ${formatTestProtocol(test.testObjectProtocol)}\n`;
          text += `   • Test: ${test.testObjectProtocol}://${test.testObject}:${test.testObjectPort}\n`;
          text += `   • Interval: ${test.testInterval}s, Timeout: ${test.testTimeout}s\n`;
        });
      }

      return {
        content: [{ type: 'text', text }]
      };
    } catch (error) {
      return this.errorHandler.handleError(error);
    }
  }

  /**
   * Delete property
   */
  async deleteProperty(args: z.infer<typeof GTMToolSchemas.deleteProperty>): Promise<MCPToolResponse> {
    try {
      if (!args.confirm) {
        return {
          content: [{
            type: 'text',
            text: '⚠️ **Deletion not confirmed**\n\nSet `confirm: true` to delete the property.'
          }]
        };
      }
      
      logger.info({ 
        domainName: args.domainName, 
        propertyName: args.propertyName 
      }, 'Deleting property');
      
      await this.client.request({
        method: 'DELETE',
        path: GTMEndpoints.deleteProperty(args.domainName, args.propertyName)
      });

      let text = `✅ **Property Deleted Successfully**\n\n`;
      text += `**Property**: ${args.propertyName}\n`;
      text += `\n⚠️ Note: This action cannot be undone.\n`;

      return {
        content: [{ type: 'text', text }]
      };
    } catch (error) {
      return this.errorHandler.handleError(error);
    }
  }

  /**
   * Create geographic map
   */
  async createGeographicMap(args: z.infer<typeof GTMToolSchemas.createGeographicMap>): Promise<MCPToolResponse> {
    try {
      logger.info({ 
        domainName: args.domainName, 
        name: args.name 
      }, 'Creating geographic map');
      
      const mapConfig = {
        name: args.name,
        defaultDatacenter: {
          datacenterId: args.defaultDatacenterId,
          nickname: 'Default'
        },
        assignments: args.assignments.map(assignment => ({
          datacenterId: assignment.datacenterId,
          nickname: `DC ${assignment.datacenterId}`,
          countries: assignment.countries || [],
          continents: assignment.continents || []
        }))
      };
      
      await this.client.request({
        method: 'PUT',
        path: GTMEndpoints.updateGeographicMap(args.domainName, args.name),
        body: mapConfig
      });

      let text = `✅ **Geographic Map Created Successfully**\n\n`;
      text += `**Name**: ${args.name}\n`;
      text += `**Default Datacenter**: ${args.defaultDatacenterId}\n`;
      text += `\n**Assignments**: ${args.assignments.length}\n`;
      
      args.assignments.forEach((assignment, index) => {
        text += `${index + 1}. Datacenter ${assignment.datacenterId}\n`;
        if (assignment.countries && assignment.countries.length > 0) {
          text += `   • Countries: ${assignment.countries.join(', ')}\n`;
        }
        if (assignment.continents && assignment.continents.length > 0) {
          text += `   • Continents: ${assignment.continents.join(', ')}\n`;
        }
      });
      
      text += `\n💡 Assign this map to a property to enable geographic routing\n`;

      return {
        content: [{ type: 'text', text }]
      };
    } catch (error) {
      return this.errorHandler.handleError(error);
    }
  }

  /**
   * Update geographic map
   */
  async updateGeographicMap(args: z.infer<typeof GTMToolSchemas.updateGeographicMap>): Promise<MCPToolResponse> {
    try {
      logger.info({ 
        domainName: args.domainName, 
        mapName: args.mapName 
      }, 'Updating geographic map');
      
      // First get the current map
      const currentMap = await this.client.request({
        method: 'GET',
        path: GTMEndpoints.getGeographicMap(args.domainName, args.mapName)
      }) as any;
      
      // Update assignments
      const updates = {
        ...currentMap,
        assignments: args.assignments.map(assignment => ({
          datacenterId: assignment.datacenterId,
          nickname: `DC ${assignment.datacenterId}`,
          countries: assignment.countries || [],
          continents: assignment.continents || []
        }))
      };
      
      await this.client.request({
        method: 'PUT',
        path: GTMEndpoints.updateGeographicMap(args.domainName, args.mapName),
        body: updates
      });

      let text = `✅ **Geographic Map Updated Successfully**\n\n`;
      text += `**Map**: ${args.mapName}\n`;
      text += `**Assignments Updated**: ${args.assignments.length}\n\n`;
      
      args.assignments.forEach((assignment, index) => {
        text += `${index + 1}. Datacenter ${assignment.datacenterId}\n`;
        if (assignment.countries && assignment.countries.length > 0) {
          text += `   • Countries: ${assignment.countries.join(', ')}\n`;
        }
        if (assignment.continents && assignment.continents.length > 0) {
          text += `   • Continents: ${assignment.continents.join(', ')}\n`;
        }
      });

      return {
        content: [{ type: 'text', text }]
      };
    } catch (error) {
      return this.errorHandler.handleError(error);
    }
  }

  /**
   * List resources
   */
  async listResources(args: z.infer<typeof GTMToolSchemas.listResources>): Promise<MCPToolResponse> {
    try {
      logger.info({ domainName: args.domainName }, 'Listing resources');
      
      const response = await this.client.request({
        method: 'GET',
        path: GTMEndpoints.listResources(args.domainName)
      });

      const resources = (response as GTMResponse).resources || [];

      let text = `📦 **GTM Resources**\n\n`;
      text += `**Domain**: ${args.domainName}\n\n`;

      if (resources.length > 0) {
        text += `**Found ${resources.length} resources**\n\n`;
        
        resources.forEach((resource: any, index: number) => {
          text += `${index + 1}. **${resource.name}**\n`;
          text += `   • Type: ${resource.type}\n`;
          if (resource.hostHeader) {
            text += `   • Host Header: ${resource.hostHeader}\n`;
          }
          
          const instances = resource.resourceInstances || [];
          if (instances.length > 0) {
            text += `   • Instances: ${instances.length} datacenters\n`;
          }
          
          text += `\n`;
        });
      } else {
        text += '⚠️ No resources found.\n';
        text += '\n💡 Resources are used for load measurement and reporting\n';
      }

      return {
        content: [{ type: 'text', text }]
      };
    } catch (error) {
      return this.errorHandler.handleError(error);
    }
  }

  /**
   * Create resource
   */
  async createResource(args: z.infer<typeof GTMToolSchemas.createResource>): Promise<MCPToolResponse> {
    try {
      logger.info({ 
        domainName: args.domainName, 
        name: args.name 
      }, 'Creating resource');
      
      const resourceConfig = {
        name: args.name,
        type: args.type,
        hostHeader: args.hostHeader || null,
        resourceInstances: args.resourceInstances.map(instance => ({
          datacenterId: instance.datacenterId,
          useDefaultLoadObject: instance.useDefaultLoadObject,
          loadObject: instance.loadObject || null,
          loadServers: instance.loadServers || []
        }))
      };
      
      await this.client.request({
        method: 'PUT',
        path: GTMEndpoints.updateResource(args.domainName, args.name),
        body: resourceConfig
      });

      let text = `✅ **Resource Created Successfully**\n\n`;
      text += `**Name**: ${args.name}\n`;
      text += `**Type**: ${args.type}\n`;
      if (args.hostHeader) {
        text += `**Host Header**: ${args.hostHeader}\n`;
      }
      text += `\n**Resource Instances**: ${args.resourceInstances.length}\n`;
      
      args.resourceInstances.forEach((instance, index) => {
        text += `${index + 1}. Datacenter ${instance.datacenterId}\n`;
        if (instance.loadObject) {
          text += `   • Load Object: ${instance.loadObject}\n`;
        }
        if (instance.loadServers && instance.loadServers.length > 0) {
          text += `   • Load Servers: ${instance.loadServers.join(', ')}\n`;
        }
      });

      return {
        content: [{ type: 'text', text }]
      };
    } catch (error) {
      return this.errorHandler.handleError(error);
    }
  }
}

/**
 * Create GTM tools instance
 */
export const gtmTools = new GTMTools();