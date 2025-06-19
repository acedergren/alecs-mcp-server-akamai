#!/bin/bash
# Onboarding Workflow Examples - Executable scripts for Akamai MCP Server

# Set up the MCP server command
MCP_SERVER="npx tsx src/index.ts"

echo "=== Onboarding Workflow Examples ==="
echo

# Example 1: Simple property onboarding
echo "1. Simple property onboarding:"
cat << EOF | $MCP_SERVER
{
  "method": "mcp__alecs-full__onboard-property",
  "params": {
    "hostname": "www.example.com",
    "originHostname": "origin.example.com",
    "contractId": "ctr_123456",
    "groupId": "grp_123456",
    "productId": "SPM"
  }
}
EOF
echo

# Example 2: Property onboarding with custom settings
echo "2. Property onboarding with custom settings:"
cat << EOF | $MCP_SERVER
{
  "method": "mcp__alecs-full__onboard-property",
  "params": {
    "hostname": "api.example.com",
    "originHostname": "api-origin.example.com",
    "contractId": "ctr_123456",
    "groupId": "grp_123456",
    "productId": "SPM",
    "settings": {
      "cpCode": {
        "name": "API Traffic"
      },
      "caching": {
        "defaultTtl": "5m",
        "honorOriginCacheControl": true
      },
      "performance": {
        "http2": "ENABLED",
        "gzip": "ALWAYS",
        "sureRoute": "ENABLED"
      }
    }
  }
}
EOF
echo

# Example 3: Onboarding with SSL certificate
echo "3. Onboarding with SSL certificate:"
cat << EOF | $MCP_SERVER
{
  "method": "mcp__alecs-full__onboard-property-with-ssl",
  "params": {
    "hostname": "secure.example.com",
    "originHostname": "secure-origin.example.com",
    "contractId": "ctr_123456",
    "groupId": "grp_123456",
    "productId": "SPM",
    "certificate": {
      "type": "DV",
      "sans": ["www.secure.example.com", "api.secure.example.com"],
      "adminContact": "admin@example.com",
      "techContact": "tech@example.com"
    }
  }
}
EOF
echo

# Example 4: Multi-domain onboarding
echo "4. Multi-domain onboarding:"
cat << EOF | $MCP_SERVER
{
  "method": "mcp__alecs-full__onboard-multiple-domains",
  "params": {
    "domains": [
      {
        "hostname": "www.example.com",
        "originHostname": "origin.example.com"
      },
      {
        "hostname": "www.example.co.uk",
        "originHostname": "origin.example.co.uk"
      },
      {
        "hostname": "www.example.de",
        "originHostname": "origin.example.de"
      }
    ],
    "contractId": "ctr_123456",
    "groupId": "grp_123456",
    "productId": "SPM",
    "sharedSettings": {
      "cpCode": {
        "name": "International Sites"
      }
    }
  }
}
EOF
echo

# Example 5: API endpoint onboarding
echo "5. API endpoint onboarding:"
cat << EOF | $MCP_SERVER
{
  "method": "mcp__alecs-full__onboard-api-endpoint",
  "params": {
    "hostname": "api.example.com",
    "originHostname": "api-origin.example.com",
    "contractId": "ctr_123456",
    "groupId": "grp_123456",
    "productId": "API_ACCEL",
    "apiSettings": {
      "rateLimiting": {
        "enabled": true,
        "requestsPerMinute": 1000
      },
      "cors": {
        "enabled": true,
        "allowedOrigins": ["https://www.example.com", "https://app.example.com"],
        "allowedMethods": ["GET", "POST", "PUT", "DELETE"],
        "allowedHeaders": ["Content-Type", "Authorization"]
      },
      "authentication": {
        "type": "JWT",
        "headerName": "Authorization"
      },
      "caching": {
        "GET": "5m",
        "POST": "no-cache",
        "PUT": "no-cache",
        "DELETE": "no-cache"
      }
    }
  }
}
EOF
echo

# Example 6: Complete site migration
echo "6. Complete site migration:"
cat << EOF | $MCP_SERVER
{
  "method": "mcp__alecs-full__migrate-site",
  "params": {
    "currentHostname": "www.oldsite.com",
    "newHostname": "www.newsite.com",
    "originHostname": "origin.newsite.com",
    "contractId": "ctr_123456",
    "groupId": "grp_123456",
    "migrationOptions": {
      "importDnsRecords": true,
      "copyCachingRules": true,
      "createRedirects": true,
      "preserveSsl": true
    }
  }
}
EOF
echo

# Example 7: Onboarding with WAF
echo "7. Onboarding with Web Application Firewall:"
cat << EOF | $MCP_SERVER
{
  "method": "mcp__alecs-full__onboard-with-waf",
  "params": {
    "hostname": "secure-app.example.com",
    "originHostname": "app-origin.example.com",
    "contractId": "ctr_123456",
    "groupId": "grp_123456",
    "productId": "SPM",
    "wafSettings": {
      "enabled": true,
      "mode": "AAG",
      "ruleSets": ["OWASP", "CRS"],
      "customRules": [
        {
          "name": "Block Bad Bots",
          "userAgentPatterns": ["badbot", "scraper", "crawler"]
        }
      ]
    }
  }
}
EOF
echo

# Example 8: Wizard-guided onboarding
echo "8. Wizard-guided onboarding:"
cat << EOF | $MCP_SERVER
{
  "method": "mcp__alecs-full__onboard-property-wizard",
  "params": {
    "interactive": true,
    "startingInfo": {
      "hostname": "www.example.com",
      "contractId": "ctr_123456"
    }
  }
}
EOF
echo

# Example 9: Check onboarding status
echo "9. Checking onboarding status:"
cat << EOF | $MCP_SERVER
{
  "method": "mcp__alecs-full__check-onboarding-status",
  "params": {
    "onboardingId": "onb_123456"
  }
}
EOF
echo

# Example 10: Production activation after onboarding
echo "10. Production activation after onboarding:"
cat << EOF | $MCP_SERVER
{
  "method": "mcp__alecs-full__activate-to-production",
  "params": {
    "propertyId": "prp_123456",
    "preChecks": {
      "validateOrigin": true,
      "testUrls": [
        "https://www.example.com/",
        "https://www.example.com/test-page.html"
      ],
      "checkSsl": true
    },
    "activationSettings": {
      "notificationEmails": ["devops@example.com", "oncall@example.com"],
      "acknowledgeWarnings": true,
      "note": "Initial production deployment after successful staging tests"
    }
  }
}
EOF
echo

echo "=== End of Onboarding Workflow Examples ==="