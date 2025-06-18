import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';

// Comprehensive API parameter definitions from Akamai documentation
const AkamaiAPICapabilities = {
  propertyManager: {
    listProperties: {
      query: {
        contractId: { type: 'string', required: false, description: 'Filter by contract' },
        groupId: { type: 'string', required: false, description: 'Filter by group' },
        hostname: { type: 'string', required: false, description: 'Filter by hostname' },
        propertyName: { type: 'string', required: false, description: 'Filter by property name' },
        includeCertStatus: { type: 'boolean', required: false, description: 'Include certificate status' },
      },
    },
    getProperty: {
      path: {
        propertyId: { type: 'string', required: true, format: 'prp_XXXXX' },
      },
      query: {
        contractId: { type: 'string', required: true },
        groupId: { type: 'string', required: true },
        validateHostnames: { type: 'boolean', required: false, description: 'Validate hostnames' },
      },
    },
    createPropertyVersion: {
      path: {
        propertyId: { type: 'string', required: true },
      },
      query: {
        contractId: { type: 'string', required: true },
        groupId: { type: 'string', required: true },
      },
      body: {
        createFromVersion: { type: 'number', required: true },
        createFromVersionEtag: { type: 'string', required: false },
      },
    },
    getRuleTree: {
      query: {
        validateRules: { type: 'boolean', required: false, default: true },
        validateMode: { type: 'enum', required: false, values: ['fast', 'full'], default: 'fast' },
        dryRun: { type: 'boolean', required: false },
        ruleFormat: { type: 'string', required: false },
      },
    },
    updateRuleTree: {
      query: {
        validateRules: { type: 'boolean', required: false, default: true },
        validateMode: { type: 'enum', required: false, values: ['fast', 'full'] },
        dryRun: { type: 'boolean', required: false },
      },
      body: {
        rules: { type: 'object', required: true },
        ruleFormat: { type: 'string', required: false },
        comments: { type: 'string', required: false },
      },
    },
    activateProperty: {
      body: {
        propertyVersion: { type: 'number', required: true },
        network: { type: 'enum', required: true, values: ['STAGING', 'PRODUCTION'] },
        activationType: { type: 'enum', required: false, values: ['ACTIVATE', 'DEACTIVATE'], default: 'ACTIVATE' },
        notifyEmails: { type: 'array', required: true },
        acknowledgeWarnings: { type: 'array', required: false },
        acknowledgeAllWarnings: { type: 'boolean', required: false },
        complianceRecord: { type: 'object', required: false },
        fastPush: { type: 'boolean', required: false },
        useFastFallback: { type: 'boolean', required: false },
      },
    },
  },
  edgeDNS: {
    listZones: {
      query: {
        search: { type: 'string', required: false },
        types: { type: 'string', required: false, description: 'Comma-separated: PRIMARY,SECONDARY,ALIAS' },
        contractIds: { type: 'string', required: false },
        showAll: { type: 'boolean', required: false },
        sortBy: { type: 'enum', required: false, values: ['NAME', 'LAST_MODIFIED'] },
        order: { type: 'enum', required: false, values: ['ASC', 'DESC'] },
        page: { type: 'number', required: false },
        pageSize: { type: 'number', required: false, min: 1, max: 100 },
        limit: { type: 'number', required: false },
        offset: { type: 'number', required: false },
      },
    },
    createZone: {
      body: {
        zone: { type: 'string', required: true },
        type: { type: 'enum', required: true, values: ['PRIMARY', 'SECONDARY', 'ALIAS'] },
        comment: { type: 'string', required: false, maxLength: 255 },
        signAndServe: { type: 'boolean', required: false },
        signAndServeAlgorithm: { type: 'string', required: false },
        tsigKey: { type: 'object', required: false },
        target: { type: 'string', required: false, description: 'For ALIAS zones' },
        masters: { type: 'array', required: false, description: 'For SECONDARY zones' },
        contractId: { type: 'string', required: false },
        groupId: { type: 'number', required: false },
        endCustomerId: { type: 'string', required: false },
      },
    },
    updateRecord: {
      path: {
        zone: { type: 'string', required: true },
        name: { type: 'string', required: true },
        type: { type: 'string', required: true },
      },
      body: {
        name: { type: 'string', required: true },
        type: { type: 'string', required: true },
        ttl: { type: 'number', required: true },
        rdata: { type: 'array', required: true },
        comments: { type: 'string', required: false },
        flags: { type: 'object', required: false, description: 'For CAA records' },
        priority: { type: 'number', required: false, description: 'For MX/SRV records' },
        weight: { type: 'number', required: false, description: 'For SRV records' },
        port: { type: 'number', required: false, description: 'For SRV records' },
      },
    },
  },
  certificates: {
    createEnrollment: {
      body: {
        csr: {
          cn: { type: 'string', required: true },
          c: { type: 'string', required: true, length: 2 },
          st: { type: 'string', required: true },
          l: { type: 'string', required: true },
          o: { type: 'string', required: true },
          ou: { type: 'string', required: false },
          sans: { type: 'array', required: false },
          preferredTrustChain: { type: 'string', required: false },
        },
        validationType: { type: 'enum', required: true, values: ['dv', 'ev', 'ov', 'third-party'] },
        certificateType: { type: 'enum', required: true, values: ['san', 'single', 'wildcard'] },
        networkConfiguration: {
          geography: { type: 'enum', required: false, values: ['core', 'china', 'russia'] },
          secureNetwork: { type: 'enum', required: false, values: ['standard-tls', 'enhanced-tls'] },
          sniOnly: { type: 'boolean', required: false },
          quicEnabled: { type: 'boolean', required: false },
          mustHaveCiphers: { type: 'string', required: false },
          preferredCiphers: { type: 'string', required: false },
          disallowedTlsVersions: { type: 'array', required: false },
          cloneDnsNames: { type: 'boolean', required: false },
        },
        signatureAlgorithm: { type: 'enum', required: false, values: ['SHA-256', 'SHA-384', 'SHA-512'] },
        changeManagement: { type: 'boolean', required: false },
        ra: { type: 'string', required: false, description: 'Registration Authority' },
        autoRenewalStartTime: { type: 'string', required: false },
        enableMultiStackedCertificates: { type: 'boolean', required: false },
      },
    },
  },
  security: {
    createSecurityPolicy: {
      body: {
        policyName: { type: 'string', required: true },
        policyPrefix: { type: 'string', required: true, maxLength: 4 },
        policyMode: { type: 'enum', required: false, values: ['ASE_AUTO', 'ASE_MANUAL'] },
        defaultSettings: { type: 'boolean', required: false },
        ipGeoFirewall: {
          block: { type: 'enum', required: false, values: ['blockSpecificIPGeo', 'blockAllIPGeoExcept'] },
          geoControls: {
            blockedIPNetworkLists: { type: 'array', required: false },
            blockedGeoNetworkLists: { type: 'array', required: false },
          },
          ipControls: {
            allowedIPNetworkLists: { type: 'array', required: false },
            blockedIPNetworkLists: { type: 'array', required: false },
          },
          ukraineGeoControl: { type: 'object', required: false },
        },
        protections: {
          apiPii: { enabled: { type: 'boolean', required: false } },
          botman: { enabled: { type: 'boolean', required: false } },
          ddos: { enabled: { type: 'boolean', required: false } },
          networkLayer: { enabled: { type: 'boolean', required: false } },
          ratePolicy: { enabled: { type: 'boolean', required: false } },
          reputation: { enabled: { type: 'boolean', required: false } },
          slowPost: { enabled: { type: 'boolean', required: false } },
          waf: { enabled: { type: 'boolean', required: false } },
          wafEvaluation: { enabled: { type: 'boolean', required: false } },
        },
      },
    },
    updateWAFMode: {
      query: {
        mode: { type: 'enum', required: true, values: ['KRS', 'AAG', 'ASE_AUTO', 'ASE_MANUAL'] },
        updateMode: { type: 'boolean', required: false },
      },
    },
  },
  reporting: {
    getReport: {
      query: {
        start: { type: 'string', required: true, format: 'ISO8601' },
        end: { type: 'string', required: true, format: 'ISO8601' },
        interval: { type: 'enum', required: false, values: ['MINUTE', 'HOUR', 'DAY', 'WEEK', 'MONTH'] },
        cpCodes: { type: 'string', required: false, description: 'Comma-separated' },
        products: { type: 'string', required: false },
        metrics: { type: 'string', required: false },
        groupBy: { type: 'array', required: false },
        filters: { type: 'object', required: false },
        limit: { type: 'number', required: false },
        offset: { type: 'number', required: false },
        dataStores: { type: 'array', required: false },
        enhancedData: { type: 'boolean', required: false },
        includeDeprecated: { type: 'boolean', required: false },
      },
    },
  },
};

// Analyze MCP function coverage
export async function generateParameterCoverageReport() {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalAPIParameters: 0,
      totalMCPParameters: 0,
      coveragePercentage: 0,
      missingParameters: [] as string[],
      incorrectlyMapped: [] as string[],
      unusedCapabilities: [] as string[],
    },
    details: {} as any,
    recommendations: [] as string[],
  };

  // Load MCP function definitions
  const mcpFunctions = await loadMCPFunctions();

  // Analyze each API service
  for (const [service, endpoints] of Object.entries(AkamaiAPICapabilities)) {
    report.details[service] = {
      endpoints: {} as any,
    };

    for (const [endpoint, definition] of Object.entries(endpoints)) {
      const analysis = analyzeEndpoint(
        service,
        endpoint,
        definition as any,
        mcpFunctions
      );

      report.details[service].endpoints[endpoint] = analysis;
      
      // Update summary
      report.summary.totalAPIParameters += analysis.totalAPIParameters;
      report.summary.totalMCPParameters += analysis.coveredParameters;
      report.summary.missingParameters.push(...analysis.missingParameters);
      report.summary.incorrectlyMapped.push(...analysis.incorrectlyMapped);
      report.summary.unusedCapabilities.push(...analysis.unusedCapabilities);
    }
  }

  // Calculate coverage
  report.summary.coveragePercentage = 
    (report.summary.totalMCPParameters / report.summary.totalAPIParameters) * 100;

  // Generate recommendations
  report.recommendations = generateRecommendations(report);

  return report;
}

// Analyze individual endpoint coverage
function analyzeEndpoint(
  service: string,
  endpoint: string,
  apiDefinition: any,
  mcpFunctions: Map<string, any>
): EndpointAnalysis {
  const analysis: EndpointAnalysis = {
    endpoint: `${service}.${endpoint}`,
    totalAPIParameters: 0,
    coveredParameters: 0,
    missingParameters: [],
    incorrectlyMapped: [],
    unusedCapabilities: [],
    parameterDetails: {},
  };

  // Find corresponding MCP function
  const mcpFunctionName = mapAPIToMCPFunction(service, endpoint);
  const mcpFunction = mcpFunctions.get(mcpFunctionName);

  // Analyze all parameter types
  const paramTypes = ['path', 'query', 'body'];
  
  for (const paramType of paramTypes) {
    const params = apiDefinition[paramType];
    if (!params) continue;

    for (const [paramName, paramDef] of Object.entries(params as any)) {
      analysis.totalAPIParameters++;

      const paramAnalysis = analyzeParameter(
        paramName,
        paramDef as any,
        mcpFunction,
        paramType
      );

      analysis.parameterDetails[`${paramType}.${paramName}`] = paramAnalysis;

      if (paramAnalysis.coverage === 'missing') {
        analysis.missingParameters.push(`${paramType}.${paramName}`);
      } else if (paramAnalysis.coverage === 'incorrect') {
        analysis.incorrectlyMapped.push(`${paramType}.${paramName}`);
      } else {
        analysis.coveredParameters++;
      }

      if (paramAnalysis.unused) {
        analysis.unusedCapabilities.push(paramAnalysis.unusedReason || '');
      }
    }
  }

  return analysis;
}

// Analyze individual parameter
function analyzeParameter(
  paramName: string,
  paramDef: any,
  mcpFunction: any,
  paramType: string
): ParameterAnalysis {
  const analysis: ParameterAnalysis = {
    name: paramName,
    type: paramDef.type,
    required: paramDef.required,
    coverage: 'missing',
    mcpMapping: null,
    issues: [],
    unused: false,
  };

  if (!mcpFunction) {
    analysis.coverage = 'missing';
    analysis.issues.push('MCP function not found');
    return analysis;
  }

  // Check if parameter exists in MCP function
  const mcpParam = findMCPParameter(mcpFunction, paramName);
  
  if (!mcpParam) {
    analysis.coverage = 'missing';
    
    // Check if it's an optional parameter we might want to add
    if (!paramDef.required && paramDef.description) {
      analysis.unused = true;
      analysis.unusedReason = `Optional parameter "${paramName}" (${paramDef.description}) not exposed`;
    }
  } else {
    analysis.mcpMapping = mcpParam;
    
    // Check if types match
    if (!typesMatch(paramDef.type, mcpParam.type)) {
      analysis.coverage = 'incorrect';
      analysis.issues.push(`Type mismatch: API expects ${paramDef.type}, MCP has ${mcpParam.type}`);
    } else {
      analysis.coverage = 'correct';
    }

    // Check if required status matches
    if (paramDef.required && !mcpParam.required) {
      analysis.issues.push('API requires this parameter but MCP marks it as optional');
    }

    // Check for enum mismatches
    if (paramDef.values && mcpParam.enum) {
      const missingValues = paramDef.values.filter((v: string) => !mcpParam.enum.includes(v));
      if (missingValues.length > 0) {
        analysis.issues.push(`Missing enum values: ${missingValues.join(', ')}`);
      }
    }
  }

  return analysis;
}

// Helper functions
async function loadMCPFunctions(): Promise<Map<string, any>> {
  const functions = new Map();
  
  // Load function definitions from server files
  const serverFiles = [
    'property-server.ts',
    'dns-server.ts',
    'certs-server.ts',
    'security-server.ts',
    'reporting-server.ts',
  ];

  for (const file of serverFiles) {
    const filePath = path.join(__dirname, '../../src/servers', file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Extract tool definitions (simplified parsing)
      const toolRegex = /name:\s*["']([^"']+)["'][\s\S]*?inputSchema:\s*({[\s\S]*?})\s*,/g;
      let match;
      
      while ((match = toolRegex.exec(content)) !== null) {
        const [, name, schema] = match;
        functions.set(name, { name, schema });
      }
    }
  }

  return functions;
}

function mapAPIToMCPFunction(service: string, endpoint: string): string {
  const mapping: Record<string, string> = {
    'propertyManager.listProperties': 'property.list',
    'propertyManager.getProperty': 'property.get',
    'propertyManager.createPropertyVersion': 'property.version.create',
    'propertyManager.getRuleTree': 'property.rules.get',
    'propertyManager.updateRuleTree': 'property.rules.update',
    'propertyManager.activateProperty': 'property.activate',
    'edgeDNS.listZones': 'dns.zone.list',
    'edgeDNS.createZone': 'dns.zone.create',
    'edgeDNS.updateRecord': 'dns.record.update',
    'certificates.createEnrollment': 'certs.enrollment.create',
    'security.createSecurityPolicy': 'security.policy.create',
    'security.updateWAFMode': 'security.waf.mode.update',
    'reporting.getReport': 'reporting.get',
  };

  return mapping[`${service}.${endpoint}`] || '';
}

function findMCPParameter(mcpFunction: any, paramName: string): any {
  // Simplified parameter search in schema
  if (!mcpFunction || !mcpFunction.schema) return null;
  
  const schema = mcpFunction.schema;
  if (schema.includes(paramName)) {
    return {
      name: paramName,
      type: 'string', // Simplified - would need proper parsing
      required: schema.includes(`${paramName}"`),
    };
  }
  
  return null;
}

function typesMatch(apiType: string, mcpType: string): boolean {
  // Type matching logic
  const typeMap: Record<string, string[]> = {
    string: ['string', 'text'],
    number: ['number', 'integer', 'int'],
    boolean: ['boolean', 'bool'],
    array: ['array', 'list'],
    object: ['object', 'map'],
  };

  const apiTypeNorm = apiType.toLowerCase();
  const mcpTypeNorm = mcpType.toLowerCase();

  if (apiTypeNorm === mcpTypeNorm) return true;

  for (const [key, values] of Object.entries(typeMap)) {
    if (values.includes(apiTypeNorm) && values.includes(mcpTypeNorm)) {
      return true;
    }
  }

  return false;
}

function generateRecommendations(report: any): string[] {
  const recommendations = [];

  // High coverage recommendations
  if (report.summary.coveragePercentage < 80) {
    recommendations.push(
      `Parameter coverage is ${report.summary.coveragePercentage.toFixed(1)}%. Consider adding missing parameters to improve API integration completeness.`
    );
  }

  // Missing required parameters
  const missingRequired = report.summary.missingParameters.filter((p: string) => 
    p.includes('required')
  );
  if (missingRequired.length > 0) {
    recommendations.push(
      `Add support for ${missingRequired.length} missing required parameters to ensure API calls succeed.`
    );
  }

  // Unused optional capabilities
  if (report.summary.unusedCapabilities.length > 10) {
    recommendations.push(
      `Consider exposing ${report.summary.unusedCapabilities.length} optional API capabilities to provide more flexibility to users.`
    );
  }

  // Type mismatches
  if (report.summary.incorrectlyMapped.length > 0) {
    recommendations.push(
      `Fix ${report.summary.incorrectlyMapped.length} parameter type mismatches to prevent runtime errors.`
    );
  }

  // Service-specific recommendations
  const services = Object.keys(report.details);
  for (const service of services) {
    const serviceDetails = report.details[service];
    const endpoints = Object.values(serviceDetails.endpoints) as any[];
    const avgCoverage = endpoints.reduce((sum, e) => sum + (e.coveredParameters / e.totalAPIParameters), 0) / endpoints.length * 100;
    
    if (avgCoverage < 70) {
      recommendations.push(
        `${service} has low parameter coverage (${avgCoverage.toFixed(1)}%). Focus on improving this service's integration.`
      );
    }
  }

  // Prioritized improvements
  const priorityParams = [
    'validateRules', 'validateMode', 'dryRun', // Property validation
    'signAndServe', 'tsigKey', // DNS security
    'acknowledgeAllWarnings', 'fastPush', // Activation options
    'enhancedData', 'groupBy', // Reporting capabilities
  ];

  const missingPriority = priorityParams.filter(p => 
    report.summary.missingParameters.some((mp: string) => mp.includes(p))
  );

  if (missingPriority.length > 0) {
    recommendations.push(
      `Priority: Add support for ${missingPriority.join(', ')} to enable important API features.`
    );
  }

  return recommendations;
}

// Types
interface EndpointAnalysis {
  endpoint: string;
  totalAPIParameters: number;
  coveredParameters: number;
  missingParameters: string[];
  incorrectlyMapped: string[];
  unusedCapabilities: string[];
  parameterDetails: Record<string, ParameterAnalysis>;
}

interface ParameterAnalysis {
  name: string;
  type: string;
  required: boolean;
  coverage: 'missing' | 'incorrect' | 'correct';
  mcpMapping: any;
  issues: string[];
  unused: boolean;
  unusedReason?: string;
}

// Generate HTML report
export async function generateHTMLReport(report: any): Promise<string> {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>API Parameter Coverage Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .summary { background: #f0f0f0; padding: 20px; border-radius: 5px; }
    .metric { display: inline-block; margin: 10px 20px 10px 0; }
    .metric-value { font-size: 24px; font-weight: bold; }
    .coverage-good { color: #28a745; }
    .coverage-medium { color: #ffc107; }
    .coverage-poor { color: #dc3545; }
    .endpoint { margin: 20px 0; padding: 15px; border: 1px solid #ddd; }
    .missing { color: #dc3545; }
    .incorrect { color: #ffc107; }
    .unused { color: #6c757d; }
    .recommendation { background: #e7f3ff; padding: 10px; margin: 5px 0; border-left: 3px solid #007bff; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #f8f9fa; }
  </style>
</head>
<body>
  <h1>API Parameter Coverage Report</h1>
  <p>Generated: ${report.timestamp}</p>
  
  <div class="summary">
    <h2>Summary</h2>
    <div class="metric">
      <div class="metric-value ${getCoverageClass(report.summary.coveragePercentage)}">
        ${report.summary.coveragePercentage.toFixed(1)}%
      </div>
      <div>Overall Coverage</div>
    </div>
    <div class="metric">
      <div class="metric-value">${report.summary.totalAPIParameters}</div>
      <div>Total API Parameters</div>
    </div>
    <div class="metric">
      <div class="metric-value">${report.summary.totalMCPParameters}</div>
      <div>Covered Parameters</div>
    </div>
    <div class="metric">
      <div class="metric-value missing">${report.summary.missingParameters.length}</div>
      <div>Missing Parameters</div>
    </div>
  </div>

  <h2>Recommendations</h2>
  ${report.recommendations.map((r: string) => `
    <div class="recommendation">${r}</div>
  `).join('')}

  <h2>Service Details</h2>
  ${Object.entries(report.details).map(([service, details]: [string, any]) => `
    <h3>${service}</h3>
    ${Object.entries(details.endpoints).map(([endpoint, analysis]: [string, any]) => `
      <div class="endpoint">
        <h4>${endpoint}</h4>
        <table>
          <tr>
            <th>Parameter</th>
            <th>Type</th>
            <th>Required</th>
            <th>Coverage</th>
            <th>Issues</th>
          </tr>
          ${Object.entries(analysis.parameterDetails).map(([param, details]: [string, any]) => `
            <tr>
              <td>${param}</td>
              <td>${details.type}</td>
              <td>${details.required ? 'Yes' : 'No'}</td>
              <td class="${details.coverage}">${details.coverage}</td>
              <td>${details.issues.join(', ')}</td>
            </tr>
          `).join('')}
        </table>
      </div>
    `).join('')}
  `).join('')}
</body>
</html>
`;

  return html;
}

function getCoverageClass(percentage: number): string {
  if (percentage >= 80) return 'coverage-good';
  if (percentage >= 60) return 'coverage-medium';
  return 'coverage-poor';
}

// Export report to file
export async function exportCoverageReport(format: 'json' | 'html' | 'markdown' = 'json') {
  const report = await generateParameterCoverageReport();
  const timestamp = new Date().toISOString().replace(/:/g, '-').slice(0, -5);
  
  switch (format) {
    case 'json':
      fs.writeFileSync(
        `coverage-report-${timestamp}.json`,
        JSON.stringify(report, null, 2)
      );
      break;
      
    case 'html':
      const html = await generateHTMLReport(report);
      fs.writeFileSync(`coverage-report-${timestamp}.html`, html);
      break;
      
    case 'markdown':
      const markdown = generateMarkdownReport(report);
      fs.writeFileSync(`coverage-report-${timestamp}.md`, markdown);
      break;
  }
}

function generateMarkdownReport(report: any): string {
  return `# API Parameter Coverage Report

Generated: ${report.timestamp}

## Summary

- **Overall Coverage**: ${report.summary.coveragePercentage.toFixed(1)}%
- **Total API Parameters**: ${report.summary.totalAPIParameters}
- **Covered Parameters**: ${report.summary.totalMCPParameters}
- **Missing Parameters**: ${report.summary.missingParameters.length}
- **Incorrectly Mapped**: ${report.summary.incorrectlyMapped.length}

## Recommendations

${report.recommendations.map((r: string) => `- ${r}`).join('\n')}

## Missing Parameters

${report.summary.missingParameters.map((p: string) => `- ${p}`).join('\n')}

## Unused API Capabilities

${report.summary.unusedCapabilities.slice(0, 20).map((c: string) => `- ${c}`).join('\n')}
${report.summary.unusedCapabilities.length > 20 ? `\n... and ${report.summary.unusedCapabilities.length - 20} more` : ''}
`;
}