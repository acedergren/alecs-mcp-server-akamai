/**
 * MCP Evaluation Suite: Property Management
 * 
 * This evaluation suite tests the property management capabilities
 * of the ALECS MCP Server using LLM-based evaluation.
 * 
 * Based on the MCP Evals framework pattern
 */

import { EvalFunction, EvalConfig, grade } from './mcp-eval-framework';
// import { openai } from '@ai-sdk/openai';
const openai = (model: string) => model; // Mock for testing
import { ALECSFullServer } from '../../src/index-full';

/**
 * Evaluation scoring criteria (1-5 scale):
 * - Accuracy: Does the tool return correct information?
 * - Completeness: Does it cover all necessary details?
 * - Relevance: Is the output appropriate for the query?
 * - Clarity: Is the response clear and well-formatted?
 * - Reasoning: Does it provide logical explanations?
 */

export const propertyListEval: EvalFunction = {
  name: 'Property List Evaluation',
  description: 'Evaluates the list-properties tool for accuracy and completeness',
  run: async (server: ALECSFullServer) => {
    const prompt = `
    Using the list-properties tool, retrieve all CDN properties.
    The response should include:
    1. Property names and IDs
    2. Current version information
    3. Production/staging status
    4. Associated contracts and groups
    
    Evaluate based on:
    - Accuracy of property information
    - Completeness of the listing
    - Clarity of formatting
    - Helpfulness of next steps guidance
    `;
    
    const response = await server.handleToolCall('list-properties', {});
    
    return await grade(openai('gpt-4'), prompt, response);
  }
};

export const propertyCreationEval: EvalFunction = {
  name: 'Property Creation Evaluation',
  description: 'Evaluates the create-property tool workflow',
  run: async (server: ALECSFullServer) => {
    const prompt = `
    Test creating a new CDN property with these requirements:
    - Property name: eval-test.example.com
    - Product: Ion Standard
    - Use appropriate contract and group
    
    Evaluate the tool's ability to:
    1. Validate input parameters
    2. Create the property successfully
    3. Return clear confirmation with property ID
    4. Provide next steps for configuration
    `;
    
    // First get contracts and groups
    const contracts = await server.handleToolCall('list-contracts', {});
    const groups = await server.handleToolCall('list-groups', {});
    
    // Extract IDs from responses (this would be done by the LLM in real eval)
    const testData = {
      propertyName: 'eval-test.example.com',
      productId: 'prd_Fresca',
      contractId: 'ctr_1-ABC123', // Would be extracted from contracts response
      groupId: 'grp_12345' // Would be extracted from groups response
    };
    
    const response = await server.handleToolCall('create-property', testData);
    
    return await grade(openai('gpt-4'), prompt, response);
  }
};

export const propertyActivationEval: EvalFunction = {
  name: 'Property Activation Workflow',
  description: 'Evaluates the complete property activation process',
  run: async (server: ALECSFullServer) => {
    const prompt = `
    Test the property activation workflow:
    1. Get property details for prp_12345
    2. Activate version 1 to STAGING
    3. Check activation status
    4. Activate to PRODUCTION after staging success
    
    Evaluate:
    - Correct handling of activation networks (STAGING/PRODUCTION)
    - Clear status reporting
    - Proper error handling for invalid versions
    - Guidance on DNS configuration and testing
    `;
    
    // Step 1: Get property
    const propertyResponse = await server.handleToolCall('get-property', {
      propertyId: 'prp_12345'
    });
    
    // Step 2: Activate to staging
    const stagingResponse = await server.handleToolCall('activate-property', {
      propertyId: 'prp_12345',
      version: 1,
      network: 'STAGING',
      note: 'Evaluation test activation'
    });
    
    // Step 3: Check status
    const statusResponse = await server.handleToolCall('get-activation-status', {
      propertyId: 'prp_12345',
      activationId: 'atv_12345'
    });
    
    const allResponses = {
      property: propertyResponse,
      staging: stagingResponse,
      status: statusResponse
    };
    
    return await grade(openai('gpt-4'), prompt, allResponses);
  }
};

export const edgeHostnameEval: EvalFunction = {
  name: 'Edge Hostname Configuration',
  description: 'Evaluates edge hostname creation and certificate setup',
  run: async (server: ALECSFullServer) => {
    const prompt = `
    Test edge hostname creation with SSL:
    1. Create edge hostname for test.example.com
    2. Use Enhanced TLS network
    3. Configure with appropriate certificate
    
    Evaluate:
    - Correct domain suffix selection
    - SSL/TLS configuration options
    - Clear explanation of DNS CNAME requirements
    - Certificate provisioning guidance
    `;
    
    const response = await server.handleToolCall('create-edge-hostname', {
      domainPrefix: 'test-eval',
      domainSuffix: 'edgesuite.net',
      productId: 'prd_Fresca',
      secure: true,
      ipVersionBehavior: 'IPV4'
    });
    
    return await grade(openai('gpt-4'), prompt, response);
  }
};

export const errorHandlingEval: EvalFunction = {
  name: 'Error Handling Evaluation',
  description: 'Tests how well the tools handle error scenarios',
  run: async (server: ALECSFullServer) => {
    const prompt = `
    Test error handling for various scenarios:
    1. Invalid property ID
    2. Missing required parameters
    3. Unauthorized access attempts
    4. Network timeout simulation
    
    Evaluate:
    - Clear error messages
    - Helpful recovery suggestions
    - Appropriate error categorization
    - No exposure of sensitive information
    `;
    
    const errorScenarios = [
      // Invalid property ID
      server.handleToolCall('get-property', { propertyId: 'invalid-id' }),
      
      // Missing parameters
      server.handleToolCall('create-property', { propertyName: 'incomplete.com' }),
      
      // Invalid activation
      server.handleToolCall('activate-property', {
        propertyId: 'prp_12345',
        version: 999,
        network: 'INVALID'
      })
    ];
    
    const responses = await Promise.all(errorScenarios);
    
    return await grade(openai('gpt-4'), prompt, responses);
  }
};

export const searchCapabilityEval: EvalFunction = {
  name: 'Universal Search Evaluation',
  description: 'Evaluates the akamai.search tool capabilities',
  run: async (server: ALECSFullServer) => {
    const prompt = `
    Test the universal search functionality:
    1. Search for a hostname: "www.example.com"
    2. Search for a property ID: "prp_12345"
    3. Search for an edge hostname
    4. Search with partial matches
    
    Evaluate:
    - Search accuracy and relevance
    - Speed of results (mentioned in response)
    - Comprehensiveness of results
    - Clear categorization of found items
    `;
    
    const searches = [
      server.handleToolCall('akamai.search', { query: 'www.example.com' }),
      server.handleToolCall('akamai.search', { query: 'prp_12345' }),
      server.handleToolCall('akamai.search', { query: 'edgesuite.net' }),
      server.handleToolCall('akamai.search', { query: 'test', detailed: true })
    ];
    
    const responses = await Promise.all(searches);
    
    return await grade(openai('gpt-4'), prompt, responses);
  }
};

// Configuration for running all evaluations
const config: EvalConfig = {
  model: openai('gpt-4'),
  evals: [
    propertyListEval,
    propertyCreationEval,
    propertyActivationEval,
    edgeHostnameEval,
    errorHandlingEval,
    searchCapabilityEval
  ],
  options: {
    parallel: false, // Run sequentially to avoid rate limits
    timeout: 30000, // 30 second timeout per eval
    retries: 2,
    output: {
      format: 'json',
      file: 'property-management-eval-results.json',
      console: true
    }
  }
};

export default config;