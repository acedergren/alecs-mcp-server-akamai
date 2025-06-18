# Dependencies and Licenses

This document provides a comprehensive overview of all dependencies used in the ALECS MCP Server project.

## Direct Dependencies

### Production Dependencies

| Package | Version | License | Description |
|---------|---------|---------|-------------|
| [@modelcontextprotocol/sdk](https://www.npmjs.com/package/@modelcontextprotocol/sdk) | ^0.5.0 | MIT | Official MCP SDK from Anthropic |
| [akamai-edgegrid](https://www.npmjs.com/package/akamai-edgegrid) | ^3.4.0 | Apache-2.0 | Official Akamai EdgeGrid authentication library |
| [chokidar](https://www.npmjs.com/package/chokidar) | ^4.0.3 | MIT | File watching library |
| [minimatch](https://www.npmjs.com/package/minimatch) | ^10.0.3 | ISC | Glob pattern matching |
| [simple-git](https://www.npmjs.com/package/simple-git) | ^3.28.0 | MIT | Git operations library |
| [zod](https://www.npmjs.com/package/zod) | ^3.22.0 | MIT | TypeScript-first schema validation |

### Development Dependencies

| Package | Version | License | Description |
|---------|---------|---------|-------------|
| [@jest/globals](https://www.npmjs.com/package/@jest/globals) | ^29.7.0 | MIT | Jest global types |
| [@types/jest](https://www.npmjs.com/package/@types/jest) | ^29.5.14 | MIT | TypeScript definitions for Jest |
| [@types/minimatch](https://www.npmjs.com/package/@types/minimatch) | ^5.1.2 | MIT | TypeScript definitions for minimatch |
| [@types/node](https://www.npmjs.com/package/@types/node) | ^20.0.0 | MIT | TypeScript definitions for Node.js |
| [jest](https://www.npmjs.com/package/jest) | ^29.7.0 | MIT | JavaScript testing framework |
| [ts-jest](https://www.npmjs.com/package/ts-jest) | ^29.4.0 | MIT | TypeScript preprocessor for Jest |
| [tsx](https://www.npmjs.com/package/tsx) | ^4.0.0 | MIT | TypeScript execute and REPL |
| [typescript](https://www.npmjs.com/package/typescript) | ^5.0.0 | Apache-2.0 | TypeScript language |

## License Compliance

### Apache-2.0 Licensed Dependencies

The following dependencies are licensed under Apache License 2.0:

1. **akamai-edgegrid** - The official Akamai EdgeGrid authentication library
   - Copyright (c) Akamai Technologies, Inc.
   - Full license: https://www.apache.org/licenses/LICENSE-2.0

2. **typescript** - The TypeScript language (development only)
   - Copyright (c) Microsoft Corporation
   - Full license: https://github.com/microsoft/TypeScript/blob/main/LICENSE.txt

### MIT Licensed Dependencies

The majority of our dependencies use the MIT License, which is compatible with our project's MIT license.

### ISC Licensed Dependencies

**minimatch** uses the ISC License, which is functionally equivalent to the simplified BSD and MIT licenses.

## Transitive Dependencies

For a complete list of all transitive dependencies, run:

```bash
npm list --all
```

To generate a detailed license report:

```bash
npx license-checker --summary
```

## Security Auditing

To check for known vulnerabilities:

```bash
npm audit
```

To automatically fix vulnerabilities where possible:

```bash
npm audit fix
```

## Software Bill of Materials (SBOM)

To generate a complete SBOM in CycloneDX format:

```bash
npx @cyclonedx/cyclonedx-npm --output-file sbom.json
```

To generate SBOM in SPDX format:

```bash
npx spdx-sbom-generator -p . -o sbom-spdx.json
```

## Maintaining Dependencies

### Update Policy

1. **Security Updates**: Apply immediately when security vulnerabilities are discovered
2. **Patch Updates**: Apply monthly during maintenance windows
3. **Minor Updates**: Test thoroughly before applying, typically quarterly
4. **Major Updates**: Evaluate breaking changes, update during major releases

### Automated Tools

Consider using these tools for dependency management:

1. **Dependabot** (GitHub) - Automated dependency updates
2. **Renovate** - Automated dependency management
3. **Snyk** - Security vulnerability scanning
4. **npm-check-updates** - Interactive dependency updates

### Commands for Maintenance

```bash
# Check outdated packages
npm outdated

# Update packages interactively
npx npm-check-updates -i

# Update all packages to latest minor versions
npx npm-check-updates -u --target minor
npm install

# Generate license report
npx license-checker --out licenses.csv --csv
```

## Attribution Requirements

When using this software, the following attributions are required:

1. **Akamai EdgeGrid** - Include the Apache 2.0 license notice
2. **TypeScript** - Include the Apache 2.0 license notice (if distributing compiled code)

## License Compatibility

All dependencies are compatible with the MIT license used by this project. The Apache 2.0 license is compatible with MIT, allowing us to distribute this software under MIT while properly attributing Apache 2.0 licensed components.

## Contact

For questions about dependencies or licensing, please open an issue on our GitHub repository.