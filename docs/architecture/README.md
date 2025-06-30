# ALECS Architecture Overview

## System Design

ALECS implements the Model Context Protocol (MCP) to provide AI assistants with structured access to Akamai's CDN platform. The architecture emphasizes modularity, type safety, and clear separation of concerns.

## Core Architecture Diagram

```mermaid
graph TB
    subgraph "Client Layer"
        CD[Claude Desktop]
        API[Claude API]
        CLI[Claude CLI]
    end
    
    subgraph "MCP Transport Layer"
        STDIO[STDIO Transport]
        WS[WebSocket Transport]
        SSE[SSE Transport]
    end
    
    subgraph "ALECS Core"
        Server[MCP Server]
        Router[Tool Router]
        Context[Customer Context Manager]
        
        subgraph "Authentication"
            EdgeGrid[EdgeGrid Client]
            AccountSwitch[Account Switcher]
        end
    end
    
    subgraph "Service Modules"
        Property[Property Manager]
        DNS[Edge DNS]
        Certs[CPS/Certificates]
        Network[Network Lists]
        Purge[Fast Purge]
        Security[App Security]
        Report[Reporting]
    end
    
    subgraph "Infrastructure"
        Cache[Smart Cache]
        Logger[Pino Logger]
        Circuit[Circuit Breaker]
        Types[Type System]
    end
    
    subgraph "Akamai Platform"
        PAPI[Property API]
        DNSAPI[DNS API]
        CPSAPI[CPS API]
        NLAPI[Network Lists API]
        FPAPI[Fast Purge API]
        ASAPI[AppSec API]
    end
    
    CD & API & CLI --> STDIO & WS & SSE
    STDIO & WS & SSE --> Server
    Server --> Router
    Router --> Context
    Context --> EdgeGrid
    EdgeGrid --> AccountSwitch
    
    Router --> Property & DNS & Certs & Network & Purge & Security & Report
    
    Property --> Cache & Logger & Circuit
    DNS --> Cache & Logger & Circuit
    Certs --> Logger & Circuit
    Network --> Cache & Logger & Circuit
    Purge --> Logger & Circuit
    Security --> Cache & Logger & Circuit
    Report --> Cache & Logger
    
    Property --> PAPI
    DNS --> DNSAPI
    Certs --> CPSAPI
    Network --> NLAPI
    Purge --> FPAPI
    Security --> ASAPI
```

## Component Details

### 1. MCP Server Core

The heart of ALECS that implements the Model Context Protocol:

```typescript
class MCPServer {
  // Handles tool registration and routing
  registerTool(name: string, handler: ToolHandler)
  
  // Manages client connections
  handleConnection(transport: Transport)
  
  // Processes tool calls
  async callTool(name: string, params: any): Promise<ToolResult>
}
```

### 2. Multi-Customer Support

```mermaid
sequenceDiagram
    participant AI as AI Assistant
    participant ALECS
    participant EdgeGrid
    participant Akamai
    
    AI->>ALECS: Call tool with customer: "acme"
    ALECS->>ALECS: Load credentials from ~/.edgerc[acme]
    ALECS->>EdgeGrid: Create authenticated client
    EdgeGrid->>Akamai: API request with account-switch-key
    Akamai-->>EdgeGrid: Response for ACME account
    EdgeGrid-->>ALECS: Processed response
    ALECS-->>AI: Tool result
```

### 3. Service Module Pattern

Each service module follows a consistent pattern:

```typescript
interface ServiceModule {
  // Tool definitions
  tools: ToolDefinition[]
  
  // Shared client instance
  client: AkamaiClient
  
  // Service-specific methods
  list(): Promise<Item[]>
  get(id: string): Promise<Item>
  create(data: CreateData): Promise<Item>
  update(id: string, data: UpdateData): Promise<Item>
  delete(id: string): Promise<void>
}
```

### 4. Type Safety Architecture

```mermaid
graph LR
    subgraph "Input Layer"
        Raw[Raw Input]
        Schema[JSON Schema]
        Validator[Zod Validator]
    end
    
    subgraph "Type Layer"
        Types[TypeScript Types]
        Runtime[Runtime Validation]
        Guards[Type Guards]
    end
    
    subgraph "Output Layer"
        Response[API Response]
        Transform[Response Transform]
        Result[Tool Result]
    end
    
    Raw --> Schema
    Schema --> Validator
    Validator --> Types
    Types --> Runtime
    Runtime --> Guards
    Guards --> Response
    Response --> Transform
    Transform --> Result
```

### 5. Error Handling Flow

```mermaid
flowchart TD
    A[API Call] --> B{Success?}
    B -->|Yes| C[Return Result]
    B -->|No| D{Error Type?}
    
    D -->|401| E[Invalid Credentials]
    D -->|403| F[Permission Denied]
    D -->|404| G[Resource Not Found]
    D -->|429| H[Rate Limited]
    D -->|500+| I[Server Error]
    
    E --> J[Clear Error Message]
    F --> K[Suggest Solution]
    G --> L[Help User Find Resource]
    H --> M[Retry with Backoff]
    I --> N[Circuit Breaker]
    
    J & K & L & M & N --> O[User-Friendly Response]
```

## Data Flow

### 1. Tool Call Lifecycle

```mermaid
sequenceDiagram
    participant User
    participant AI
    participant MCP
    participant Tool
    participant Cache
    participant API
    
    User->>AI: "List my properties"
    AI->>MCP: property.list({customer: "default"})
    MCP->>Tool: Validate parameters
    Tool->>Cache: Check cache
    
    alt Cache Hit
        Cache-->>Tool: Cached data
    else Cache Miss
        Tool->>API: GET /properties
        API-->>Tool: Response
        Tool->>Cache: Store result
    end
    
    Tool-->>MCP: Formatted result
    MCP-->>AI: Tool response
    AI-->>User: "Here are your properties..."
```

### 2. Authentication Flow

```mermaid
flowchart LR
    A[Tool Request] --> B[Extract Customer]
    B --> C{Customer Exists?}
    C -->|No| D[Use Default]
    C -->|Yes| E[Load .edgerc Section]
    D --> F[Get Credentials]
    E --> F
    F --> G[Build Auth Headers]
    G --> H[Add Account Switch Key]
    H --> I[Sign Request]
    I --> J[Execute API Call]
```

## Design Principles

### 1. **Modularity**
- Each service is independent
- Tools can be loaded selectively
- Clear interfaces between components

### 2. **Type Safety**
- Full TypeScript coverage
- Runtime validation with Zod
- No `any` types in production code

### 3. **User Experience**
- Clear, actionable error messages
- Helpful suggestions on failures
- Progress indicators for long operations

### 4. **Performance**
- Smart caching with TTL
- Circuit breakers for resilience
- Concurrent request handling

### 5. **Security**
- Credentials never in code
- EdgeGrid authentication only
- Secure multi-tenant isolation

## Directory Structure

```
alecs-mcp-server-akamai/
├── src/
│   ├── index.ts              # Entry point
│   ├── server.ts             # MCP server implementation
│   ├── types/                # TypeScript types
│   ├── tools/                # Tool implementations
│   │   ├── property-tools.ts
│   │   ├── dns-tools.ts
│   │   ├── certs-tools.ts
│   │   └── ...
│   ├── services/             # Service modules
│   │   ├── property-manager/
│   │   ├── edge-dns/
│   │   └── ...
│   ├── utils/                # Utilities
│   │   ├── akamai-client.ts
│   │   ├── smart-cache.ts
│   │   └── logger.ts
│   └── auth/                 # Authentication
│       ├── edgegrid.ts
│       └── customer-context.ts
├── docs/                     # Documentation
├── __tests__/               # Test suite
└── scripts/                 # Build/deploy scripts
```

## Deployment Options

### 1. Claude Desktop (Recommended)
- Direct stdio communication
- No network overhead
- Instant responses

### 2. WebSocket Server
- Remote access capability
- Multiple concurrent clients
- Real-time communication

### 3. Docker Container
- Isolated environment
- Easy deployment
- Consistent dependencies

## Future Architecture Considerations

1. **Plugin System** - Dynamic tool loading
2. **Event Streaming** - Real-time updates
3. **Distributed Caching** - Redis integration
4. **Metrics Collection** - OpenTelemetry support
5. **GraphQL Gateway** - Unified query interface