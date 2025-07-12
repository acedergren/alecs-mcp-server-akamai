# 🍺 Homebrew Setup Guide for ALECS

This guide explains how to set up ALECS for Homebrew distribution.

## Current Status

- ✅ **NPM Package**: Available at `alecs-mcp-server-akamai`
- ✅ **Homebrew Formula**: Created (`alecs.rb`)
- ⏳ **Homebrew Core**: Not yet submitted
- ⏳ **Custom Tap**: Not yet created

## Installation Methods

### 1. Via NPM (Current)
```bash
# Install via npm using Homebrew's node
brew install node
npm install -g alecs-mcp-server-akamai
```

### 2. Via Custom Tap (Future)
```bash
# Once tap is created
brew tap acedergren/alecs
brew install alecs
```

### 3. Via Homebrew Core (Future)
```bash
# Once accepted into homebrew-core
brew install alecs
```

## Setting Up Homebrew Distribution

### Step 1: Create Custom Tap

```bash
# Create a new repository
gh repo create alecs-mcp-server-akamai-homebrew --public

# Clone and set up tap structure
git clone https://github.com/acedergren/alecs-mcp-server-akamai-homebrew.git
cd alecs-mcp-server-akamai-homebrew
mkdir Formula
cp ../alecs-mcp-server-akamai/alecs.rb Formula/
```

### Step 2: Update Formula SHA256

```bash
# Get the SHA256 of the npm package
curl -s https://registry.npmjs.org/alecs-mcp-server-akamai/1.7.4 | \
  jq -r '.dist.shasum'

# Update the formula with the correct SHA256
sed -i 's/PLACEHOLDER_SHA256/actual_sha256/' Formula/alecs.rb
```

### Step 3: Test the Formula

```bash
# Install from local tap
brew install --build-from-source Formula/alecs.rb

# Test installation
alecs --version
alecs --help

# Test integration scripts
alecs-install-claude-desktop --help
alecs-generate-cursor-button
```

### Step 4: Submit to Homebrew Core

1. **Fork homebrew-core**:
   ```bash
   gh repo fork Homebrew/homebrew-core
   ```

2. **Create formula**:
   ```bash
   cd homebrew-core
   cp ../alecs-mcp-server-akamai/alecs.rb Formula/
   ```

3. **Test extensively**:
   ```bash
   brew install --build-from-source Formula/alecs.rb
   brew test alecs
   brew audit --strict alecs
   ```

4. **Submit Pull Request**:
   - Follow [Homebrew contribution guidelines](https://docs.brew.sh/How-To-Open-a-Homebrew-Pull-Request)
   - Include test results
   - Provide clear description

## Formula Features

### Core Installation
- Installs ALECS via npm using `std_npm_args`
- Creates symlinks for `alecs` and `alecs-akamai` commands
- Installs to `libexec` to avoid global contamination

### Integration Scripts
- Installs all MCP client integration scripts
- Creates convenient command aliases:
  - `alecs-install-claude-desktop`
  - `alecs-install-cursor`
  - `alecs-install-lmstudio`
  - `alecs-install-vscode`
  - `alecs-install-windsurf`
  - `alecs-install-claude-code`
  - `alecs-generate-cursor-button`
  - `alecs-generate-lmstudio-button`

### User Experience
- Provides helpful caveats with setup instructions
- Includes links to documentation
- Shows available integration commands

## Requirements for Homebrew Core

### Package Quality
- ✅ Stable version (1.7.4)
- ✅ Comprehensive documentation
- ✅ Active maintenance
- ✅ Test coverage
- ✅ Clear license (AGPL-3.0)

### Formula Quality
- ✅ Follows Homebrew conventions
- ✅ Uses `std_npm_args`
- ✅ Includes proper tests
- ✅ Has meaningful description
- ✅ Specifies dependencies correctly

### Community Standards
- ✅ Open source
- ✅ Notable utility (MCP ecosystem)
- ✅ Cross-platform support
- ✅ Active development

## Maintenance

### Updating the Formula
```bash
# When releasing new version
1. Update package.json version
2. npm publish
3. Update formula URL and SHA256
4. Test installation
5. Update tap/submit PR
```

### Monitoring
- Watch for Homebrew CI failures
- Respond to user issues
- Keep formula updated with releases

## Alternative: GitHub Releases

If Homebrew Core rejects, consider:
1. **Custom tap**: `brew tap acedergren/alecs`
2. **GitHub releases**: Direct download links
3. **Package managers**: Snap, AppImage, etc.

## References

- [Homebrew Formula Cookbook](https://docs.brew.sh/Formula-Cookbook)
- [Node for Formula Authors](https://docs.brew.sh/Node-for-Formula-Authors)
- [Homebrew Core Guidelines](https://docs.brew.sh/Homebrew-Core-Guidelines)
- [Opening a Homebrew Pull Request](https://docs.brew.sh/How-To-Open-a-Homebrew-Pull-Request)