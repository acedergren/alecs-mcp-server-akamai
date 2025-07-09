#!/usr/bin/env node

// ALECS MCP Server - LM Studio Deep Link Button Generator
// Generates one-click "Add to LM Studio" buttons using lmstudio:// protocol

const config = {
  "alecs-akamai": {
    "command": "alecs",
    "args": [],
    "env": {
      "MCP_TRANSPORT": "stdio"
    }
  }
};

const base64Config = Buffer.from(JSON.stringify(config)).toString('base64');
const deepLink = `lmstudio://mcp/install?name=alecs-akamai&config=${base64Config}`;

console.log("=== LM STUDIO DEEP LINK ===");
console.log(deepLink);
console.log("");

console.log("=== MARKDOWN BUTTON ===");
console.log(`[![Add to LM Studio](https://img.shields.io/badge/Add%20to-LM%20Studio-orange?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTMuMDkgOC4yNkwyMCA5TDEzLjA5IDE1Ljc0TDEyIDIyTDEwLjkxIDE1Ljc0TDQgOUwxMC45MSA4LjI2TDEyIDJaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K)](${deepLink})`);
console.log("");

console.log("=== HTML BUTTON ===");
console.log(`<a href="${deepLink}"><img src="https://img.shields.io/badge/Add%20to-LM%20Studio-orange?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTMuMDkgOC4yNkwyMCA5TDEzLjA5IDE1Ljc0TDEyIDIyTDEwLjkxIDE1Ljc0TDQgOUwxMC45MSA4LjI2TDEyIDJaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K" alt="Add to LM Studio"></a>`);
console.log("");

console.log("=== JSX BUTTON ===");
console.log(`<a href="${deepLink}">`);
console.log(`  <img`);
console.log(`    src="https://img.shields.io/badge/Add%20to-LM%20Studio-orange?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTMuMDkgOC4yNkwyMCA5TDEzLjA5IDE1Ljc0TDEyIDIyTDEwLjkxIDE1Ljc0TDQgOUwxMC45MSA4LjI2TDEyIDJaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K"`);
console.log(`    alt="Add to LM Studio"`);
console.log(`  />`);
console.log(`</a>`);
console.log("");

console.log("=== BASE64 CONFIG (for debugging) ===");
console.log(base64Config);
console.log("");

console.log("=== DECODED CONFIG (for verification) ===");
console.log(JSON.stringify(config, null, 2));