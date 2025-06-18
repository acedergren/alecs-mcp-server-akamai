/**
 * Test data factories for Akamai API responses
 * Uses the factory pattern to generate consistent test data
 */

import { 
  Property, 
  PropertyVersion, 
  PropertyActivation,
  DnsZone,
  DnsRecord,
  Certificate,
  NetworkList,
  Contract,
  Group,
  Product,
  EdgeHostname,
  CpCode
} from '../../../src/types/akamai';

/**
 * Base factory class for creating test data
 */
export abstract class BaseFactory<T> {
  protected sequence = 0;
  
  protected getNextId(): number {
    return ++this.sequence;
  }
  
  abstract create(overrides?: Partial<T>): T;
  
  createMany(count: number, overrides?: Partial<T>): T[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }
  
  reset(): void {
    this.sequence = 0;
  }
}

/**
 * Property factory
 */
export class PropertyFactory extends BaseFactory<Property> {
  create(overrides?: Partial<Property>): Property {
    const id = this.getNextId();
    
    return {
      propertyId: `prp_${100000 + id}`,
      propertyName: `test-property-${id}`,
      contractId: `ctr_C-${1000000 + id}`,
      groupId: `grp_${10000 + id}`,
      productId: 'prd_Web_Accel',
      latestVersion: 1,
      productionVersion: 1,
      stagingVersion: 1,
      hostnames: [`example${id}.com`, `www.example${id}.com`],
      createdDate: new Date().toISOString(),
      modifiedDate: new Date().toISOString(),
      ...overrides,
    };
  }
}

/**
 * Property version factory
 */
export class PropertyVersionFactory extends BaseFactory<PropertyVersion> {
  create(overrides?: Partial<PropertyVersion>): PropertyVersion {
    const id = this.getNextId();
    
    return {
      propertyId: `prp_${100000 + id}`,
      version: id,
      note: `Version ${id} - Test`,
      productId: 'prd_Web_Accel',
      productionStatus: 'INACTIVE',
      stagingStatus: 'INACTIVE',
      ruleFormat: 'v2023-01-05',
      createdByUser: 'test-user@example.com',
      createdDate: new Date().toISOString(),
      ...overrides,
    };
  }
}

/**
 * Property activation factory
 */
export class PropertyActivationFactory extends BaseFactory<PropertyActivation> {
  create(overrides?: Partial<PropertyActivation>): PropertyActivation {
    const id = this.getNextId();
    
    return {
      activationId: `atv_${1000000 + id}`,
      propertyId: `prp_${100000 + id}`,
      version: 1,
      network: 'STAGING',
      status: 'PENDING',
      submitDate: new Date().toISOString(),
      updateDate: new Date().toISOString(),
      note: 'Test activation',
      notifyEmails: ['test@example.com'],
      ...overrides,
    };
  }
}

/**
 * DNS zone factory
 */
export class DnsZoneFactory extends BaseFactory<DnsZone> {
  create(overrides?: Partial<DnsZone>): DnsZone {
    const id = this.getNextId();
    
    return {
      zone: `example${id}.com`,
      type: 'PRIMARY',
      contractId: `ctr_C-${1000000 + id}`,
      comment: `Test zone ${id}`,
      signAndServe: false,
      activationState: 'ACTIVE',
      lastModifiedDate: new Date().toISOString(),
      versionId: `${id}`,
      ...overrides,
    };
  }
}

/**
 * DNS record factory
 */
export class DnsRecordFactory extends BaseFactory<DnsRecord> {
  create(overrides?: Partial<DnsRecord>): DnsRecord {
    const id = this.getNextId();
    
    return {
      name: `test${id}`,
      type: 'A',
      ttl: 300,
      rdata: [`192.0.2.${id}`],
      active: true,
      ...overrides,
    };
  }
}

/**
 * Certificate factory
 */
export class CertificateFactory extends BaseFactory<Certificate> {
  create(overrides?: Partial<Certificate>): Certificate {
    const id = this.getNextId();
    
    return {
      enrollmentId: 10000 + id,
      cn: `example${id}.com`,
      sans: [`www.example${id}.com`],
      certificateType: 'DV',
      validationType: 'DV',
      status: 'ACTIVE',
      networkConfiguration: {
        geography: 'CORE',
        secureNetwork: 'ENHANCED_TLS',
        mustHaveCiphers: ['ak-akamai-default-2022q1'],
        preferredCiphers: ['ak-akamai-default-2022q1'],
      },
      ...overrides,
    };
  }
}

/**
 * Network list factory
 */
export class NetworkListFactory extends BaseFactory<NetworkList> {
  create(overrides?: Partial<NetworkList>): NetworkList {
    const id = this.getNextId();
    
    return {
      listId: `${100000 + id}_TESTLIST`,
      name: `Test List ${id}`,
      type: 'IP',
      elementCount: 2,
      list: ['192.0.2.0/24', '198.51.100.0/24'],
      syncPoint: 1,
      description: `Test network list ${id}`,
      ...overrides,
    };
  }
}

/**
 * Contract factory
 */
export class ContractFactory extends BaseFactory<Contract> {
  create(overrides?: Partial<Contract>): Contract {
    const id = this.getNextId();
    
    return {
      contractId: `ctr_C-${1000000 + id}`,
      contractTypeName: 'AKAMAI_INTERNAL',
      ...overrides,
    };
  }
}

/**
 * Group factory
 */
export class GroupFactory extends BaseFactory<Group> {
  create(overrides?: Partial<Group>): Group {
    const id = this.getNextId();
    
    return {
      groupId: `grp_${10000 + id}`,
      groupName: `Test Group ${id}`,
      contractIds: [`ctr_C-${1000000 + id}`],
      ...overrides,
    };
  }
}

/**
 * Product factory
 */
export class ProductFactory extends BaseFactory<Product> {
  create(overrides?: Partial<Product>): Product {
    const id = this.getNextId();
    const products = ['Web_Accel', 'Ion', 'Dynamic_Site_Accelerator', 'Download_Delivery'];
    
    return {
      productId: `prd_${products[id % products.length]}`,
      productName: products[id % products.length].replace(/_/g, ' '),
      ...overrides,
    };
  }
}

/**
 * Edge hostname factory
 */
export class EdgeHostnameFactory extends BaseFactory<EdgeHostname> {
  create(overrides?: Partial<EdgeHostname>): EdgeHostname {
    const id = this.getNextId();
    
    return {
      edgeHostnameId: `ehn_${1000000 + id}`,
      domainPrefix: `example${id}`,
      domainSuffix: 'edgekey.net',
      productId: 'prd_Web_Accel',
      ipVersionBehavior: 'IPV4',
      secure: true,
      edgeHostnameLink: `/papi/v1/edgehostnames/${1000000 + id}`,
      ...overrides,
    };
  }
}

/**
 * CP Code factory
 */
export class CpCodeFactory extends BaseFactory<CpCode> {
  create(overrides?: Partial<CpCode>): CpCode {
    const id = this.getNextId();
    
    return {
      cpcodeId: `${100000 + id}`,
      cpcodeName: `Test CP Code ${id}`,
      productIds: ['prd_Web_Accel'],
      createdDate: new Date().toISOString(),
      ...overrides,
    };
  }
}

/**
 * Main factory export with all sub-factories
 */
export const akamaiResponseFactory = {
  property: new PropertyFactory(),
  propertyVersion: new PropertyVersionFactory(),
  propertyActivation: new PropertyActivationFactory(),
  dnsZone: new DnsZoneFactory(),
  dnsRecord: new DnsRecordFactory(),
  certificate: new CertificateFactory(),
  networkList: new NetworkListFactory(),
  contract: new ContractFactory(),
  group: new GroupFactory(),
  product: new ProductFactory(),
  edgeHostname: new EdgeHostnameFactory(),
  cpCode: new CpCodeFactory(),
  
  // Reset all factories
  resetAll() {
    Object.values(this).forEach(factory => {
      if (factory instanceof BaseFactory) {
        factory.reset();
      }
    });
  },
};