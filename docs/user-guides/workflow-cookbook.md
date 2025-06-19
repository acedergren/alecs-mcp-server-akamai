# Workflow Cookbook

Complete integration patterns for common Akamai workflows. Copy and adapt these patterns for your specific use cases.

## 🏗️ Property Management Workflows

### Complete Property Setup
End-to-end property creation with configuration and activation.

```typescript
import { PropertyCreateTemplate } from './request-templates/property-manager/create-property';
import { withAkamaiErrorHandling } from './error-handling-templates/base-error-handler';

async function createAndConfigureProperty(params: {
  customer?: string;
  propertyName: string;
  originHostname: string;
  contractId?: string;
  groupId?: string;
}) {
  // Step 1: Discovery (if IDs not provided)
  let contractId = params.contractId;
  let groupId = params.groupId;
  
  if (!contractId || !groupId) {
    const discovery = await discoverAccountStructure(params.customer);
    contractId = contractId || discovery.defaultContract;
    groupId = groupId || discovery.defaultGroup;
  }

  // Step 2: Create property
  const propertyTemplate = new PropertyCreateTemplate({
    customer: params.customer,
    contractId: contractId!,
    groupId: groupId!,
    propertyName: params.propertyName,
    productId: 'prd_SPM' // Standard Property Manager
  });

  const propertyId = await withAkamaiErrorHandling(
    async () => {
      // Validate prerequisites
      const validation = await propertyTemplate.validatePrerequisites(client);
      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Create property
      const request = propertyTemplate.buildRequest();
      const response = await client.request(request);
      return propertyTemplate.parseResponse(response);
    },
    { operation: 'create property', customer: params.customer }
  );

  // Step 3: Configure rule tree
  await configurePropertyRules(propertyId, {
    customer: params.customer,
    originHostname: params.originHostname
  });

  // Step 4: Create and associate edge hostname
  const edgeHostname = await createEdgeHostname({
    customer: params.customer,
    contractId: contractId!,
    groupId: groupId!,
    hostname: `${params.propertyName}.edgekey.net`
  });

  await associateHostnames(propertyId, {
    customer: params.customer,
    hostnames: [
      {
        cnameFrom: params.propertyName,
        cnameTo: edgeHostname,
        certProvisioningType: 'DEFAULT'
      }
    ]
  });

  // Step 5: Activate to staging
  const stagingActivation = await activateProperty(propertyId, {
    customer: params.customer,
    network: 'STAGING',
    version: 1,
    note: 'Initial staging activation'
  });

  return {
    propertyId,
    edgeHostname,
    stagingActivationId: stagingActivation.activationId,
    message: 'Property created and activated to staging. Test before production activation.'
  };
}
```

### Property Rule Configuration
Template for common property configurations.

```typescript
async function configurePropertyRules(propertyId: string, config: {
  customer?: string;
  originHostname: string;
  cacheSettings?: 'aggressive' | 'moderate' | 'minimal';
  compressionEnabled?: boolean;
  securityEnabled?: boolean;
}) {
  const ruleTree = {
    name: 'default',
    children: [],
    behaviors: [
      // Origin configuration
      {
        name: 'origin',
        options: {
          hostname: config.originHostname,
          originType: 'CUSTOMER',
          httpPort: 80,
          httpsPort: 443,
          cacheKeyHostname: 'REQUEST_HOST_HEADER',
          compress: config.compressionEnabled ?? true,
          enableTrueClientIp: false
        }
      },
      
      // Caching behavior
      {
        name: 'caching',
        options: getCachingOptions(config.cacheSettings ?? 'moderate')
      },

      // Compression (if enabled)
      ...(config.compressionEnabled !== false ? [{
        name: 'gzipResponse',
        options: {
          behavior: 'ALWAYS'
        }
      }] : []),

      // Security headers (if enabled)
      ...(config.securityEnabled ? getSecurityBehaviors() : [])
    ],
    options: {
      is_secure: true
    }
  };

  return await withAkamaiErrorHandling(
    () => client.updatePropertyRules(propertyId, 1, ruleTree, config.customer),
    { operation: 'update property rules', customer: config.customer }
  );
}

function getCachingOptions(level: 'aggressive' | 'moderate' | 'minimal') {
  const options = {
    aggressive: {
      behavior: 'MAX_AGE',
      mustRevalidate: false,
      ttl: '7d'
    },
    moderate: {
      behavior: 'MAX_AGE', 
      mustRevalidate: false,
      ttl: '1d'
    },
    minimal: {
      behavior: 'NO_STORE',
      mustRevalidate: true,
      ttl: '0s'
    }
  };
  
  return options[level];
}

function getSecurityBehaviors() {
  return [
    {
      name: 'modifyOutgoingResponseHeader',
      options: {
        action: 'ADD',
        customHeaderName: 'X-Content-Type-Options',
        headerValue: 'nosniff'
      }
    },
    {
      name: 'modifyOutgoingResponseHeader',
      options: {
        action: 'ADD',
        customHeaderName: 'X-Frame-Options',
        headerValue: 'SAMEORIGIN'
      }
    }
  ];
}
```

## 🌐 DNS Management Workflows

### DNS Zone Migration
Complete workflow for migrating DNS from external provider.

```typescript
interface DNSRecord {
  name: string;
  type: string;
  ttl: number;
  rdata: string[];
}

async function migrateDNSZone(params: {
  customer?: string;
  zoneName: string;
  contractId: string;
  records: DNSRecord[];
  enableDNSSEC?: boolean;
}) {
  // Step 1: Create zone
  const zone = await withAkamaiErrorHandling(
    () => client.createZone({
      customer: params.customer,
      zone: params.zoneName,
      type: 'PRIMARY',
      contractId: params.contractId,
      signAndServe: params.enableDNSSEC ?? false
    }),
    { operation: 'create DNS zone', customer: params.customer }
  );

  // Step 2: Create changelist
  await client.createChangelist({
    customer: params.customer,
    zone: params.zoneName
  });

  // Step 3: Import records in batches
  const batchSize = 100;
  const recordBatches = chunk(params.records, batchSize);

  for (const [index, batch] of recordBatches.entries()) {
    console.log(`Importing batch ${index + 1}/${recordBatches.length} (${batch.length} records)`);
    
    await Promise.all(
      batch.map(record => 
        withAkamaiErrorHandling(
          () => client.upsertRecord({
            customer: params.customer,
            zone: params.zoneName,
            name: record.name,
            type: record.type,
            ttl: record.ttl,
            rdata: record.rdata
          }),
          { operation: `create ${record.type} record`, customer: params.customer }
        )
      )
    );

    // Rate limiting between batches
    if (index < recordBatches.length - 1) {
      await delay(1000);
    }
  }

  // Step 4: Submit changelist
  const activation = await withAkamaiErrorHandling(
    () => client.submitChangelist({
      customer: params.customer,
      zone: params.zoneName
    }),
    { operation: 'activate DNS changes', customer: params.customer }
  );

  // Step 5: Monitor activation
  await pollForCompletion(
    () => client.getZoneActivationStatus(params.zoneName, params.customer),
    (status) => status.activationState === 'ACTIVE',
    { maxAttempts: 20, interval: 30000 }
  );

  return {
    zone: params.zoneName,
    recordCount: params.records.length,
    activationId: activation.changeId,
    nameservers: await getZoneNameservers(params.zoneName, params.customer),
    message: 'DNS zone migrated successfully. Update nameservers at your registrar.'
  };
}

async function getZoneNameservers(zoneName: string, customer?: string): Promise<string[]> {
  const zone = await client.getZone({ zone: zoneName, customer });
  // Extract nameservers from zone configuration or NS records
  return zone.nameservers || ['ns1.akamai.net', 'ns2.akamai.net']; // Default Akamai nameservers
}
```

### DNS Record Automation
Automated record management for common scenarios.

```typescript
async function setupWebsiteDNS(params: {
  customer?: string;
  zoneName: string;
  webServerIP: string;
  edgeHostname: string;
  mailServer?: string;
  additionalSubdomains?: string[];
}) {
  const records: DNSRecord[] = [
    // Root A record
    {
      name: '@',
      type: 'A',
      ttl: 300,
      rdata: [params.webServerIP]
    },
    
    // WWW CNAME to edge hostname
    {
      name: 'www',
      type: 'CNAME',
      ttl: 300,
      rdata: [params.edgeHostname]
    }
  ];

  // Add mail records if specified
  if (params.mailServer) {
    records.push({
      name: '@',
      type: 'MX',
      ttl: 3600,
      rdata: [`10 ${params.mailServer}`]
    });
  }

  // Add additional subdomains
  if (params.additionalSubdomains) {
    for (const subdomain of params.additionalSubdomains) {
      records.push({
        name: subdomain,
        type: 'CNAME', 
        ttl: 300,
        rdata: [params.edgeHostname]
      });
    }
  }

  return await updateDNSRecords({
    customer: params.customer,
    zoneName: params.zoneName,
    records
  });
}
```

## 🔒 Certificate Management Workflows

### Automated Certificate Provisioning
Complete certificate lifecycle with DNS validation.

```typescript
async function provisionCertificateWithDNSValidation(params: {
  customer?: string;
  domains: string[];
  organizationInfo: {
    name: string;
    address: string;
    city: string;
    state: string;
    country: string;
    phone: string;
  };
  contacts: {
    admin: ContactInfo;
    tech: ContactInfo;
  };
  autoValidate?: boolean;
}) {
  // Step 1: Create certificate enrollment
  const enrollment = await withAkamaiErrorHandling(
    () => client.createDVEnrollment({
      customer: params.customer,
      ra: 'lets-encrypt',
      validationType: 'dv',
      certificateType: params.domains.some(d => d.startsWith('*.')) ? 'wildcard' : 'san',
      csr: {
        cn: params.domains[0],
        sans: params.domains.slice(1),
        c: params.organizationInfo.country,
        st: params.organizationInfo.state,
        l: params.organizationInfo.city,
        o: params.organizationInfo.name
      },
      adminContact: params.contacts.admin,
      techContact: params.contacts.tech,
      org: params.organizationInfo,
      networkConfiguration: {
        geography: 'core',
        secureNetwork: 'enhanced-tls',
        quicEnabled: true
      }
    }),
    { operation: 'create certificate enrollment', customer: params.customer }
  );

  const enrollmentId = extractEnrollmentId(enrollment);

  // Step 2: Monitor for validation challenges
  const challenges = await pollForValidationChallenges(enrollmentId, params.customer);

  // Step 3: Automatically create DNS validation records (if enabled)
  if (params.autoValidate) {
    await createDNSValidationRecords({
      customer: params.customer,
      challenges,
      domains: params.domains
    });
  }

  // Step 4: Monitor certificate issuance
  await pollForCertificateIssuance(enrollmentId, params.customer);

  return {
    enrollmentId,
    domains: params.domains,
    status: 'issued',
    validationRecords: challenges,
    message: params.autoValidate ? 
      'Certificate issued and ready for deployment' :
      'Certificate enrollment created. Complete DNS validation to proceed.'
  };
}

async function createDNSValidationRecords(params: {
  customer?: string;
  challenges: ValidationChallenge[];
  domains: string[];
}) {
  for (const challenge of params.challenges) {
    const zoneName = extractZoneFromDomain(challenge.domain);
    
    // Create changelist for the zone
    await client.createChangelist({
      customer: params.customer,
      zone: zoneName
    });

    // Add validation record
    await withAkamaiErrorHandling(
      () => client.upsertRecord({
        customer: params.customer,
        zone: zoneName,
        name: `_acme-challenge.${challenge.domain}`,
        type: 'TXT',
        ttl: 300,
        rdata: [challenge.token]
      }),
      { operation: 'create DNS validation record', customer: params.customer }
    );

    // Submit changelist
    await client.submitChangelist({
      customer: params.customer,
      zone: zoneName
    });
  }
}
```

## 🔄 Integration Workflows

### Property + Certificate + DNS Integration
Complete workflow combining all services.

```typescript
async function deploySecureWebsite(params: {
  customer?: string;
  siteName: string;
  domains: string[];
  originIP: string;
  contractId?: string;
  groupId?: string;
}) {
  const results = {
    property: null as any,
    certificate: null as any,
    dns: null as any,
    errors: [] as string[]
  };

  try {
    // Step 1: Create DNS zones for all domains
    console.log('Setting up DNS zones...');
    for (const domain of params.domains) {
      try {
        await client.createZone({
          customer: params.customer,
          zone: domain,
          type: 'PRIMARY',
          contractId: params.contractId!
        });
      } catch (error) {
        // Zone might already exist
        console.warn(`Zone ${domain} may already exist:`, error);
      }
    }

    // Step 2: Create property
    console.log('Creating property...');
    results.property = await createAndConfigureProperty({
      customer: params.customer,
      propertyName: params.siteName,
      originHostname: params.originIP,
      contractId: params.contractId,
      groupId: params.groupId
    });

    // Step 3: Create certificate
    console.log('Provisioning SSL certificate...');
    results.certificate = await provisionCertificateWithDNSValidation({
      customer: params.customer,
      domains: params.domains,
      organizationInfo: getDefaultOrgInfo(),
      contacts: getDefaultContacts(),
      autoValidate: true
    });

    // Step 4: Set up DNS records
    console.log('Configuring DNS records...');
    for (const domain of params.domains) {
      results.dns = await setupWebsiteDNS({
        customer: params.customer,
        zoneName: domain,
        webServerIP: params.originIP,
        edgeHostname: results.property.edgeHostname
      });
    }

    // Step 5: Associate certificate with property
    console.log('Associating certificate with property...');
    await associateCertificateWithProperty({
      customer: params.customer,
      propertyId: results.property.propertyId,
      enrollmentId: results.certificate.enrollmentId
    });

    // Step 6: Final activation to production
    console.log('Activating to production...');
    const productionActivation = await activateProperty(results.property.propertyId, {
      customer: params.customer,
      network: 'PRODUCTION',
      version: 1,
      note: 'Initial production deployment',
      notifyEmails: ['admin@example.com']
    });

    return {
      success: true,
      propertyId: results.property.propertyId,
      certificateId: results.certificate.enrollmentId,
      edgeHostname: results.property.edgeHostname,
      activationId: productionActivation.activationId,
      nameservers: await getZoneNameservers(params.domains[0], params.customer),
      message: 'Website deployed successfully! Update nameservers at your registrar.'
    };

  } catch (error) {
    results.errors.push(error instanceof Error ? error.message : String(error));
    
    // Attempt cleanup of partial deployment
    await cleanupPartialDeployment(results);
    
    throw new Error(`Deployment failed: ${results.errors.join(', ')}`);
  }
}
```

## 🛠️ Utility Functions

### Polling and Monitoring
```typescript
async function pollForCompletion<T>(
  checkFunction: () => Promise<T>,
  isComplete: (result: T) => boolean,
  options: { maxAttempts: number; interval: number }
): Promise<T> {
  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    const result = await checkFunction();
    
    if (isComplete(result)) {
      return result;
    }

    if (attempt < options.maxAttempts) {
      await delay(options.interval);
    }
  }

  throw new Error(`Operation did not complete within ${options.maxAttempts} attempts`);
}

function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

These workflows provide battle-tested patterns for complex Akamai integrations. Adapt the parameters and error handling to match your specific requirements.