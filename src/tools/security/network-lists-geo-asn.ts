/**
 * Network Lists Geographic and ASN Management Tools
 * Provides utilities for geographic location and ASN validation and management
 */

import {
  type MCPToolResponse,
  type GeographicLocation,
  type ASNInfo,
  type AkamaiError,
} from '../../types';

/**
 * Common geographic location codes and names
 */
const COMMON_GEO_CODES = {
  // Major countries
  US: 'United States',
  CA: 'Canada',
  GB: 'United Kingdom',
  DE: 'Germany',
  FR: 'France',
  IT: 'Italy',
  ES: 'Spain',
  JP: 'Japan',
  CN: 'China',
  IN: 'India',
  BR: 'Brazil',
  AU: 'Australia',
  RU: 'Russia',
  KR: 'South Korea',
  MX: 'Mexico',
  NL: 'Netherlands',
  SE: 'Sweden',
  NO: 'Norway',
  CH: 'Switzerland',
  SG: 'Singapore',

  // Common subdivisions
  'US-CA': 'California, United States',
  'US-NY': 'New York, United States',
  'US-TX': 'Texas, United States',
  'US-FL': 'Florida, United States',
  'CA-ON': 'Ontario, Canada',
  'CA-BC': 'British Columbia, Canada',
  'GB-ENG': 'England, United Kingdom',
  'DE-BY': 'Bavaria, Germany',
  'FR-IDF': 'Île-de-France, France',
  'IT-LM': 'Lombardy, Italy',
  'ES-MD': 'Madrid, Spain',
  'JP-13': 'Tokyo, Japan',
  'AU-NSW': 'New South Wales, Australia',
  'BR-SP': 'São Paulo, Brazil',
};

/**
 * Common ASN information
 */
const COMMON_ASNS = {
  // Major cloud providers
  '16509': { name: 'Amazon.com, Inc.', description: 'Amazon Web Services' },
  '8075': { name: 'Microsoft Corporation', description: 'Microsoft Azure' },
  '15169': { name: 'Google LLC', description: 'Google Cloud Platform' },
  '13335': { name: 'Cloudflare, Inc.', description: 'Cloudflare CDN' },

  // Major ISPs
  '7922': {
    name: 'Comcast Cable Communications, LLC',
    description: 'Comcast residential/business',
  },
  '20115': { name: 'Charter Communications Inc', description: 'Charter/Spectrum' },
  '22773': { name: 'Cox Communications Inc.', description: 'Cox Cable' },
  '7018': { name: 'AT&T Services, Inc.', description: 'AT&T Internet' },
  '701': { name: 'Verizon Business', description: 'Verizon Enterprise' },

  // International providers
  '3356': { name: 'Level 3 Parent, LLC', description: 'Level 3 Communications' },
  '174': { name: 'Cogent Communications', description: 'Cogent backbone' },
  '6453': { name: 'TATA COMMUNICATIONS (AMERICA) INC', description: 'TATA Communications' },
  '1299': { name: 'Telia Company AB', description: 'Telia Carrier' },
  '3491': { name: 'PCCW Global, Inc.', description: 'PCCW Global' },
};

/**
 * Validate and get information about geographic codes
 */
export async function validateGeographicCodes(
  codes: string[],
  _customer = 'default',
): Promise<MCPToolResponse> {
  try {
    const validCodes: GeographicLocation[] = [];
    const invalidCodes: string[] = [];

    let output = '🗺️ **Geographic Code Validation**\n\n';
    output += `Validating ${codes.length} geographic codes...\n\n`;

    for (const code of codes) {
      const upperCode = code.toUpperCase();

      // Basic format validation
      const geoCodeRegex = /^[A-Z]{2}(-[A-Z0-9]{1,3})?$/;
      if (!geoCodeRegex.test(upperCode)) {
        invalidCodes.push(code);
        continue;
      }

      // Check against common codes
      const name = COMMON_GEO_CODES[upperCode as keyof typeof COMMON_GEO_CODES];
      if (name) {
        const parts = upperCode.split('-');
        const countryCode = parts[0] || '';
        const subdivisionCode = parts[1];
        validCodes.push({
          countryCode: countryCode,
          countryName: subdivisionCode
            ? COMMON_GEO_CODES[countryCode as keyof typeof COMMON_GEO_CODES] || countryCode
            : name,
          subdivisionCode: subdivisionCode,
          subdivisionName: subdivisionCode ? name : undefined,
        });
      } else {
        // Assume valid if format is correct but not in our database
        const parts2 = upperCode.split('-');
        const countryCode2 = parts2[0] || '';
        const subdivisionCode2 = parts2[1];
        validCodes.push({
          countryCode: countryCode2,
          countryName: `Unknown country: ${countryCode2}`,
          subdivisionCode: subdivisionCode2,
          subdivisionName: subdivisionCode2
            ? `Unknown subdivision: ${subdivisionCode2}`
            : undefined,
        });
      }
    }

    if (validCodes.length > 0) {
      output += `✅ **Valid Codes (${validCodes.length}):**\n`;
      for (const geo of validCodes) {
        if (geo.subdivisionCode) {
          output += `🏛️ ${geo.countryCode}-${geo.subdivisionCode}: ${geo.subdivisionName}\n`;
        } else {
          output += `🌍 ${geo.countryCode}: ${geo.countryName}\n`;
        }
      }
      output += '\n';
    }

    if (invalidCodes.length > 0) {
      output += `❌ **Invalid Codes (${invalidCodes.length}):**\n`;
      for (const code of invalidCodes) {
        output += `- ${code}\n`;
      }
      output += '\n';
    }

    output += '**Format Requirements:**\n';
    output += '- Country codes: Two-letter ISO 3166-1 alpha-2 (e.g., US, GB, DE)\n';
    output += '- Subdivision codes: Country-Subdivision format (e.g., US-CA, GB-ENG)\n';
    output += '- All codes must be uppercase\n';

    return {
      content: [
        {
          type: 'text',
          text: output,
        },
      ],
    };
  } catch (_error) {
    const akamaiError = _error as AkamaiError;
    return {
      content: [
        {
          type: 'text',
          text: `Error validating geographic codes: ${akamaiError.title || akamaiError.detail || 'Unknown _error'}`,
        },
      ],
    };
  }
}

/**
 * Get information about ASNs (Autonomous System Numbers)
 */
export async function getASNInformation(
  asns: string[],
  _customer = 'default',
): Promise<MCPToolResponse> {
  try {
    const validASNs: ASNInfo[] = [];
    const invalidASNs: string[] = [];

    let output = '🏢 **ASN Information Lookup**\n\n';
    output += `Looking up ${asns.length} ASN${asns.length !== 1 ? 's' : ''}...\n\n`;

    for (const asnInput of asns) {
      // Normalize ASN format
      const asnStr = asnInput.toUpperCase().startsWith('AS') ? asnInput.slice(2) : asnInput;

      // Validate ASN format
      const asnRegex = /^\d+$/;
      if (!asnRegex.test(asnStr)) {
        invalidASNs.push(asnInput);
        continue;
      }

      const asnNumber = parseInt(asnStr, 10);

      // Check against common ASNs
      const asnInfo = COMMON_ASNS[asnStr as keyof typeof COMMON_ASNS];
      if (asnInfo) {
        validASNs.push({
          asn: asnNumber,
          name: asnInfo.name,
          description: asnInfo.description,
        });
      } else {
        validASNs.push({
          asn: asnNumber,
          name: `AS${asnNumber}`,
          description: 'Unknown ASN - verify before use',
        });
      }
    }

    if (validASNs.length > 0) {
      output += `✅ **Valid ASNs (${validASNs.length}):**\n`;
      for (const asn of validASNs) {
        output += `🏢 AS${asn.asn}: ${asn.name}\n`;
        if (asn.description && asn.description !== asn.name) {
          output += `   Description: ${asn.description}\n`;
        }
      }
      output += '\n';
    }

    if (invalidASNs.length > 0) {
      output += `❌ **Invalid ASNs (${invalidASNs.length}):**\n`;
      for (const asn of invalidASNs) {
        output += `- ${asn}\n`;
      }
      output += '\n';
    }

    output += '**Format Requirements:**\n';
    output += '- ASN numbers only (e.g., 16509, 15169)\n';
    output += '- Or with AS prefix (e.g., AS16509, AS15169)\n';
    output += '- Valid range: 1-4294967295 (32-bit)\n';

    return {
      content: [
        {
          type: 'text',
          text: output,
        },
      ],
    };
  } catch (_error) {
    const akamaiError = _error as AkamaiError;
    return {
      content: [
        {
          type: 'text',
          text: `Error looking up ASN information: ${akamaiError.title || akamaiError.detail || 'Unknown _error'}`,
        },
      ],
    };
  }
}

/**
 * Generate geographic blocking recommendations
 */
export async function generateGeographicBlockingRecommendations(
  _customer = 'default',
  options: {
    purpose?: 'compliance' | 'security' | 'licensing' | 'performance';
    allowedRegions?: string[];
    blockedRegions?: string[];
  } = {},
): Promise<MCPToolResponse> {
  try {
    let output = '🛡️ **Geographic Blocking Recommendations**\n\n';

    const purpose = options.purpose || 'security';
    output += `**Purpose:** ${purpose.charAt(0).toUpperCase() + purpose.slice(1)}\n\n`;

    switch (purpose) {
      case 'compliance':
        output += '**GDPR Compliance Recommendations:**\n';
        output += '- Allow EU countries: DE, FR, IT, ES, NL, SE, etc.\n';
        output += '- Consider data residency requirements\n';
        output += '- Review CCPA requirements for US-CA\n\n';

        output += '**Common Compliance Blocks:**\n';
        output += '- High-risk countries per financial regulations\n';
        output += '- Countries with data localization laws\n';
        output += '- Sanctioned territories\n';
        break;

      case 'security':
        output += '**Security-focused Blocking:**\n';
        output += '- Countries with high bot/fraud activity\n';
        output += '- Regions not serving legitimate users\n';
        output += '- Consider temporary blocks during attacks\n\n';

        output += '**Common Security Blocks:**\n';
        output += '- Known bot farms and click farms\n';
        output += '- Countries with high malware activity\n';
        output += '- Regions with limited business presence\n';
        break;

      case 'licensing':
        output += '**Content Licensing Considerations:**\n';
        output += '- Media content geographic restrictions\n';
        output += '- Software licensing limitations\n';
        output += '- Sports broadcast territories\n\n';

        output += '**Implementation Strategy:**\n';
        output += '- Define primary service regions\n';
        output += '- Block unlicensed territories\n';
        output += '- Provide appropriate error messages\n';
        break;

      case 'performance':
        output += '**Performance Optimization:**\n';
        output += '- Block regions with poor connectivity\n';
        output += '- Redirect to appropriate CDN regions\n';
        output += '- Consider latency-based routing\n\n';

        output += '**Optimization Strategy:**\n';
        output += '- Analyze current traffic patterns\n';
        output += '- Identify underperforming regions\n';
        output += '- Implement smart routing\n';
        break;
    }

    if (options.allowedRegions && options.allowedRegions.length > 0) {
      output += '**Currently Allowed Regions:**\n';
      for (const region of options.allowedRegions) {
        const name = COMMON_GEO_CODES[region as keyof typeof COMMON_GEO_CODES] || region;
        output += `✅ ${region}: ${name}\n`;
      }
      output += '\n';
    }

    if (options.blockedRegions && options.blockedRegions.length > 0) {
      output += '**Currently Blocked Regions:**\n';
      for (const region of options.blockedRegions) {
        const name = COMMON_GEO_CODES[region as keyof typeof COMMON_GEO_CODES] || region;
        output += `❌ ${region}: ${name}\n`;
      }
      output += '\n';
    }

    output += '**Best Practices:**\n';
    output += '1. Start with allow-lists for critical regions\n';
    output += '2. Monitor traffic patterns and adjust\n';
    output += '3. Provide clear error messages for blocked users\n';
    output += '4. Review and update lists regularly\n';
    output += '5. Test changes in staging environment first\n';
    output += '6. Document business justification for blocks\n';

    return {
      content: [
        {
          type: 'text',
          text: output,
        },
      ],
    };
  } catch (_error) {
    const akamaiError = _error as AkamaiError;
    return {
      content: [
        {
          type: 'text',
          text: `Error generating recommendations: ${akamaiError.title || akamaiError.detail || 'Unknown _error'}`,
        },
      ],
    };
  }
}

/**
 * Generate common ASN blocking lists for security
 */
export async function generateASNSecurityRecommendations(
  _customer = 'default',
  options: {
    includeCloudProviders?: boolean;
    includeVPNProviders?: boolean;
    includeResidentialISPs?: boolean;
    purpose?: 'bot-protection' | 'fraud-prevention' | 'compliance';
  } = {},
): Promise<MCPToolResponse> {
  try {
    let output = '🛡️ **ASN Security Recommendations**\n\n';

    const purpose = options.purpose || 'bot-protection';
    output += `**Purpose:** ${purpose.replace('-', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}\n\n`;

    // Cloud providers
    if (options.includeCloudProviders !== false) {
      output += '**☁️ Cloud Provider ASNs:**\n';
      output += 'These may host both legitimate services and malicious bots:\n';
      output += '- AS16509: Amazon Web Services\n';
      output += '- AS8075: Microsoft Azure\n';
      output += '- AS15169: Google Cloud Platform\n';
      output += '- AS13335: Cloudflare\n';
      output += '- AS14061: DigitalOcean\n';
      output += '- AS16276: OVH\n';
      output +=
        '\n**Recommendation:** Monitor rather than block - many legitimate services use these.\n\n';
    }

    // Common VPN/proxy providers (this would be a longer list in practice)
    if (options.includeVPNProviders) {
      output += '**🔒 Common VPN/Proxy Provider ASNs:**\n';
      output += 'Consider blocking if VPN traffic is not desired:\n';
      output += '- AS63023: AS-DFRI (Often used by VPN services)\n';
      output += '- AS49981: WorldStream (Hosting/VPN provider)\n';
      output += '- AS60068: Datacamp (Hosting/VPN provider)\n';
      output += '\n**Note:** VPN detection requires specialized databases.\n\n';
    }

    // Residential ISPs
    if (options.includeResidentialISPs) {
      output += '**🏠 Major Residential ISP ASNs:**\n';
      output += 'Generally legitimate traffic, block only if necessary:\n';
      output += '- AS7922: Comcast\n';
      output += '- AS20115: Charter/Spectrum\n';
      output += '- AS22773: Cox Communications\n';
      output += '- AS7018: AT&T\n';
      output += '- AS701: Verizon\n';
      output += '\n**Caution:** Blocking residential ISPs affects real users.\n\n';
    }

    switch (purpose) {
      case 'bot-protection':
        output += '**🤖 Bot Protection Strategy:**\n';
        output += '1. Focus on hosting providers with poor abuse handling\n';
        output += '2. Monitor cloud providers for unusual patterns\n';
        output += '3. Use rate limiting in addition to ASN blocking\n';
        output += '4. Implement CAPTCHA for suspicious ASNs\n';
        break;

      case 'fraud-prevention':
        output += '**🚫 Fraud Prevention Strategy:**\n';
        output += '1. Block known fraud-hosting ASNs\n';
        output += '2. Monitor anonymization services\n';
        output += '3. Flag transactions from VPN/proxy ASNs\n';
        output += '4. Combine with geolocation analysis\n';
        break;

      case 'compliance':
        output += '**📋 Compliance Strategy:**\n';
        output += '1. Document ASN blocking rationale\n';
        output += '2. Regular review of blocked ASNs\n';
        output += '3. Appeal process for false positives\n';
        output += '4. Audit trail for all changes\n';
        break;
    }

    output += '\n**Implementation Best Practices:**\n';
    output += '1. Start with monitoring/logging only\n';
    output += '2. Analyze traffic patterns before blocking\n';
    output += '3. Implement graduated responses (rate limit → CAPTCHA → block)\n';
    output += '4. Maintain whitelist for known good sources\n';
    output += '5. Regular review and updates\n';
    output += '6. Monitor false positive rates\n';

    return {
      content: [
        {
          type: 'text',
          text: output,
        },
      ],
    };
  } catch (_error) {
    const akamaiError = _error as AkamaiError;
    return {
      content: [
        {
          type: 'text',
          text: `Error generating ASN recommendations: ${akamaiError.title || akamaiError.detail || 'Unknown _error'}`,
        },
      ],
    };
  }
}

/**
 * List common geographic codes for reference
 */
export async function listCommonGeographicCodes(): Promise<MCPToolResponse> {
  let output = '🗺️ **Common Geographic Codes Reference**\n\n';

  output += '**Major Countries (ISO 3166-1 alpha-2):**\n';
  const countries = Object.entries(COMMON_GEO_CODES)
    .filter(([code]) => !code.includes('-'))
    .sort(([, nameA], [, nameB]) => nameA.localeCompare(nameB));

  for (const [code, name] of countries) {
    output += `${code}: ${name}\n`;
  }

  output += '\n**Common Subdivisions:**\n';
  const subdivisions = Object.entries(COMMON_GEO_CODES)
    .filter(([code]) => code.includes('-'))
    .sort(([, nameA], [, nameB]) => nameA.localeCompare(nameB));

  for (const [code, name] of subdivisions) {
    output += `${code}: ${name}\n`;
  }

  output += '\n**Usage Examples:**\n';
  output += '- Block entire country: US, CN, RU\n';
  output += '- Block specific state/province: US-CA, CA-ON, GB-ENG\n';
  output += '- Multiple codes: US,CA,MX (NAFTA countries)\n';
  output += '- EU countries: DE,FR,IT,ES,NL,SE,PL,etc.\n';

  return {
    content: [
      {
        type: 'text',
        text: output,
      },
    ],
  };
}
