#!/usr/bin/env node

/**
 * Generate "Add to Cursor" button for ALECS MCP Server
 * Based on Cursor's official deep link specification
 */

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
const deepLink = `cursor://anysphere.cursor-deeplink/mcp/install?name=alecs-akamai&config=${base64Config}`;

console.log('=== CURSOR DEEP LINK ===');
console.log(deepLink);
console.log('');

console.log('=== MARKDOWN BUTTON ===');
console.log(`[![Add to Cursor](https://img.shields.io/badge/Add%20to-Cursor-blue?style=for-the-badge&logo=cursor)](${deepLink})`);
console.log('');

console.log('=== HTML BUTTON ===');
console.log(`<a href="${deepLink}"><img src="https://img.shields.io/badge/Add%20to-Cursor-blue?style=for-the-badge&logo=cursor" alt="Add to Cursor"></a>`);
console.log('');

console.log('=== JSX BUTTON ===');
console.log(`<a href="${deepLink}">
  <img 
    src="https://img.shields.io/badge/Add%20to-Cursor-blue?style=for-the-badge&logo=cursor" 
    alt="Add to Cursor" 
  />
</a>`);
console.log('');

console.log('=== BASE64 CONFIG (for debugging) ===');
console.log(base64Config);
console.log('');

console.log('=== DECODED CONFIG (for verification) ===');
console.log(JSON.stringify(config, null, 2));