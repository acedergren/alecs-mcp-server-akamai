#!/bin/bash

# Script to generate Software Bill of Materials (SBOM)
# Supports multiple formats: CycloneDX, SPDX, and custom JSON

set -e

echo "🔍 Generating Software Bill of Materials (SBOM)..."

# Create SBOM directory if it doesn't exist
mkdir -p sbom

# Generate timestamp
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
VERSION=$(node -p "require('./package.json').version")

# 1. Generate CycloneDX format SBOM
echo "📋 Generating CycloneDX SBOM..."
npx @cyclonedx/cyclonedx-npm --output-file sbom/sbom-cyclonedx.json --output-reproducible 2>/dev/null || {
    echo "⚠️  CycloneDX generator not found. Installing..."
    npm install --no-save @cyclonedx/cyclonedx-npm
    npx @cyclonedx/cyclonedx-npm --output-file sbom/sbom-cyclonedx.json --output-reproducible
}

# 2. Generate license report
echo "📜 Generating license report..."
npx license-checker --json --out sbom/licenses.json 2>/dev/null || {
    echo "⚠️  license-checker not found. Installing..."
    npm install --no-save license-checker
    npx license-checker --json --out sbom/licenses.json
}

# 3. Generate CSV license report
echo "📊 Generating CSV license report..."
npx license-checker --csv --out sbom/licenses.csv

# 4. Generate custom SBOM summary
echo "📝 Generating custom SBOM summary..."
cat > sbom/sbom-summary.json << EOF
{
  "name": "alecs-mcp-server-akamai",
  "version": "$VERSION",
  "generated": "$TIMESTAMP",
  "format": "custom-summary-1.0",
  "dependencies": {
    "production": $(npm list --prod --json | jq '.dependencies | length'),
    "development": $(npm list --dev --json | jq '.dependencies | length'),
    "total": $(npm list --json | jq '.dependencies | length')
  },
  "licenses": {
    "summary": $(npx license-checker --summary --json 2>/dev/null | jq -c '.')
  },
  "security": {
    "lastAudit": "$TIMESTAMP",
    "vulnerabilities": $(npm audit --json 2>/dev/null | jq '.metadata.vulnerabilities' || echo '{}')
  }
}
EOF

# 5. Generate dependency tree
echo "🌳 Generating dependency tree..."
npm list --all > sbom/dependency-tree.txt

# 6. Generate Markdown report
echo "📄 Generating Markdown report..."
cat > sbom/SBOM-REPORT.md << EOF
# Software Bill of Materials Report

Generated on: $TIMESTAMP  
Version: $VERSION

## Summary

- **Total Dependencies**: $(npm list --json | jq '.dependencies | length')
- **Production Dependencies**: $(npm list --prod --json | jq '.dependencies | length')
- **Development Dependencies**: $(npm list --dev --json | jq '.dependencies | length')

## License Summary

\`\`\`
$(npx license-checker --summary)
\`\`\`

## Security Summary

\`\`\`
$(npm audit || echo "No vulnerabilities found")
\`\`\`

## Files Generated

- \`sbom-cyclonedx.json\` - CycloneDX format SBOM
- \`licenses.json\` - Detailed license information
- \`licenses.csv\` - License information in CSV format
- \`sbom-summary.json\` - Custom summary format
- \`dependency-tree.txt\` - Full dependency tree

## Validation

To validate the CycloneDX SBOM:

\`\`\`bash
npx @cyclonedx/cyclonedx-cli validate --input-file sbom/sbom-cyclonedx.json
\`\`\`
EOF

echo "✅ SBOM generation complete!"
echo ""
echo "📁 Files generated in ./sbom/:"
ls -la sbom/
echo ""
echo "💡 To update SBOM, run: npm run sbom"