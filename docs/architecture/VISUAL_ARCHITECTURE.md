# ALECS Visual Architecture Guide

## System Overview

```mermaid
graph TB
    subgraph "Client Layer"
        CD[Claude Desktop]
        CU[Cursor IDE]
        LS[LM Studio]
        VS[VS Code]
        WS[Windsurf]
        CC[Claude Code]
    end
    
    subgraph "ALECS MCP Server"
        subgraph "Protocol Layer"
            MCP[MCP Server Core]
            STDIO[STDIO Transport]
            HTTP[HTTP Transport]
            WST[WebSocket Transport]
            SSE[SSE Transport]
        end
        
        subgraph "Application Layer"
            TR[Tool Registry]
            CM[Customer Manager]
            EH[Error Handler]
            CV[Cache Manager]
        end
        
        subgraph "Domain Services"
            PM[Property Manager]
            DNS[Edge DNS]
            SEC[Security]
            CERT[Certificates]
            FP[Fast Purge]
            REP[Reporting]
        end
        
        subgraph "Integration Layer"
            AC[Akamai Client]
            EG[EdgeGrid Auth]
            RL[Rate Limiter]
            RQ[Request Queue]
        end
    end
    
    subgraph "Akamai Platform"
        PAPI[Property API]
        DNSAPI[DNS API]
        SECAPI[Security API]
        CPSAPI[CPS API]
        CCUAPI[CCU API]
        REPAPI[Reporting API]
    end
    
    CD --> MCP
    CU --> MCP
    LS --> MCP
    VS --> MCP
    WS --> MCP
    CC --> MCP
    
    MCP --> STDIO
    MCP --> HTTP
    MCP --> WST
    MCP --> SSE
    
    MCP --> TR
    TR --> PM
    TR --> DNS
    TR --> SEC
    TR --> CERT
    TR --> FP
    TR --> REP
    
    PM --> AC
    DNS --> AC
    SEC --> AC
    CERT --> AC
    FP --> AC
    REP --> AC
    
    AC --> EG
    AC --> RL
    AC --> RQ
    
    AC --> PAPI
    AC --> DNSAPI
    AC --> SECAPI
    AC --> CPSAPI
    AC --> CCUAPI
    AC --> REPAPI
    
    CM --> AC
    EH --> PM
    EH --> DNS
    CV --> PM
    CV --> DNS
```

## Request Processing Flow

```mermaid
sequenceDiagram
    participant User
    participant AI as AI Assistant
    participant ALECS as ALECS Server
    participant Tool as Domain Tool
    participant Client as Akamai Client
    participant API as Akamai API
    participant Cache
    
    User->>AI: "List my properties"
    AI->>ALECS: tools/call: property_list
    ALECS->>ALECS: Validate MCP request
    ALECS->>Tool: Execute property_list(args)
    Tool->>Tool: Validate args with Zod
    Tool->>Cache: Check cache
    
    alt Cache Hit
        Cache-->>Tool: Return cached data
    else Cache Miss
        Tool->>Client: request(config)
        Client->>Client: Apply EdgeGrid auth
        Client->>Client: Check rate limits
        Client->>API: HTTPS request
        API-->>Client: Response
        Client-->>Tool: Parsed response
        Tool->>Tool: Validate response
        Tool->>Cache: Store in cache
    end
    
    Tool-->>ALECS: MCPToolResponse
    ALECS-->>AI: Formatted response
    AI-->>User: "Here are your properties..."
```

## Multi-Customer Architecture

```mermaid
graph LR
    subgraph ".edgerc Configuration"
        C1[Customer A]
        C2[Customer B]
        C3[Customer C]
    end
    
    subgraph "Customer Manager"
        CM[Config Manager]
        AS[Account Switcher]
        CV[Credential Validator]
    end
    
    subgraph "Isolated Contexts"
        AC1[Client A]
        AC2[Client B]
        AC3[Client C]
        
        CA1[Cache A]
        CA2[Cache B]
        CA3[Cache C]
    end
    
    C1 --> CM
    C2 --> CM
    C3 --> CM
    
    CM --> AS
    CM --> CV
    
    AS --> AC1
    AS --> AC2
    AS --> AC3
    
    AC1 --> CA1
    AC2 --> CA2
    AC3 --> CA3
```

## Tool Registration & Discovery

```mermaid
graph TB
    subgraph "Build Time"
        OAS[OpenAPI Spec]
        GEN[Code Generator]
        TS[TypeScript Source]
    end
    
    subgraph "Runtime"
        REG[Tool Registry]
        DISC[Tool Discovery]
        META[Tool Metadata]
        HAND[Tool Handlers]
    end
    
    subgraph "MCP Protocol"
        LIST[tools/list]
        CALL[tools/call]
    end
    
    OAS --> GEN
    GEN --> TS
    TS --> REG
    
    REG --> DISC
    REG --> META
    REG --> HAND
    
    LIST --> DISC
    CALL --> HAND
```

## Error Handling Flow

```mermaid
graph TD
    E[Error Occurs] --> EH{Error Handler}
    
    EH --> API{API Error?}
    EH --> VAL{Validation Error?}
    EH --> AUTH{Auth Error?}
    EH --> UNK{Unknown Error?}
    
    API --> A401{401?}
    API --> A403{403?}
    API --> A404{404?}
    API --> A429{429?}
    API --> A500{500+?}
    
    A401 --> R401[Re-authenticate]
    A403 --> R403[Check permissions]
    A404 --> R404[Resource not found]
    A429 --> R429[Rate limit retry]
    A500 --> R500[Server error message]
    
    VAL --> VALMSG[Show field errors]
    AUTH --> AUTHMSG[Check credentials]
    UNK --> UNKMSG[Generic error]
    
    R401 --> FMT[Format RFC 7807]
    R403 --> FMT
    R404 --> FMT
    R429 --> FMT
    R500 --> FMT
    VALMSG --> FMT
    AUTHMSG --> FMT
    UNKMSG --> FMT
    
    FMT --> RESP[MCPToolResponse]
```

## Caching Strategy

```mermaid
graph LR
    subgraph "Cache Layers"
        L1[Memory Cache]
        L2[Redis Cache]
        L3[Persistent Cache]
    end
    
    subgraph "Cache Keys"
        CK[customer:tool:params:hash]
    end
    
    subgraph "Invalidation"
        TTL[TTL Expiry]
        EVENT[Event-based]
        MANUAL[Manual Clear]
    end
    
    REQ[Request] --> L1
    L1 -->|miss| L2
    L2 -->|miss| L3
    L3 -->|miss| API[Akamai API]
    
    API --> L3
    L3 --> L2
    L2 --> L1
    L1 --> RESP[Response]
    
    TTL --> L1
    EVENT --> L1
    EVENT --> L2
    MANUAL --> L1
    MANUAL --> L2
    MANUAL --> L3
```

## Security Architecture

```mermaid
graph TB
    subgraph "Security Layers"
        subgraph "Authentication"
            EDGE[EdgeGrid Auth]
            ACCT[Account Switching]
            TOKEN[Token Management]
        end
        
        subgraph "Authorization"
            PERM[Permission Check]
            SCOPE[Scope Validation]
            CUST[Customer Isolation]
        end
        
        subgraph "Validation"
            INPUT[Input Validation]
            OUTPUT[Output Sanitization]
            SCHEMA[Schema Enforcement]
        end
        
        subgraph "Protection"
            RATE[Rate Limiting]
            AUDIT[Audit Logging]
            ERROR[Error Masking]
        end
    end
    
    REQ[Request] --> EDGE
    EDGE --> ACCT
    ACCT --> TOKEN
    TOKEN --> PERM
    PERM --> SCOPE
    SCOPE --> CUST
    CUST --> INPUT
    INPUT --> SCHEMA
    SCHEMA --> RATE
    RATE --> API[Process Request]
    API --> OUTPUT
    OUTPUT --> AUDIT
    AUDIT --> ERROR
    ERROR --> RESP[Response]
```

## Deployment Architecture

```mermaid
graph TB
    subgraph "Development"
        DEV[Local Dev]
        TEST[Test Suite]
        BUILD[TypeScript Build]
    end
    
    subgraph "CI/CD Pipeline"
        GH[GitHub Actions]
        LINT[Linting]
        UNIT[Unit Tests]
        INT[Integration Tests]
        DOCKER[Docker Build]
    end
    
    subgraph "Deployment Targets"
        subgraph "Local"
            NPM[NPM Package]
            BIN[Binary]
        end
        
        subgraph "Container"
            DH[Docker Hub]
            GCR[GitHub Registry]
        end
        
        subgraph "Cloud"
            K8S[Kubernetes]
            EDGE[Edge Workers]
            LAMBDA[Lambda]
        end
    end
    
    DEV --> TEST
    TEST --> BUILD
    BUILD --> GH
    
    GH --> LINT
    LINT --> UNIT
    UNIT --> INT
    INT --> DOCKER
    
    DOCKER --> NPM
    DOCKER --> BIN
    DOCKER --> DH
    DOCKER --> GCR
    
    DH --> K8S
    GCR --> EDGE
    NPM --> LAMBDA
```

## Performance Optimization

```mermaid
graph LR
    subgraph "Optimization Techniques"
        subgraph "Request Level"
            BATCH[Request Batching]
            COAL[Request Coalescing]
            PARA[Parallel Execution]
        end
        
        subgraph "Data Level"
            CACHE[Response Caching]
            COMP[Compression]
            PAGE[Pagination]
        end
        
        subgraph "Connection Level"
            POOL[Connection Pooling]
            KEEP[Keep-Alive]
            HTTP2[HTTP/2]
        end
    end
    
    REQ[Multiple Requests] --> BATCH
    BATCH --> COAL
    COAL --> PARA
    
    PARA --> POOL
    POOL --> KEEP
    KEEP --> HTTP2
    
    HTTP2 --> API[Akamai APIs]
    API --> COMP
    COMP --> CACHE
    CACHE --> PAGE
    PAGE --> RESP[Optimized Response]
```

## Tool Development Lifecycle

```mermaid
graph LR
    subgraph "Design Phase"
        REQ[Requirements]
        SPEC[API Spec]
        SCHEMA[Schema Design]
    end
    
    subgraph "Development Phase"
        subgraph "Manual"
            IMPL[Implementation]
            TEST[Testing]
            DOC[Documentation]
        end
        
        subgraph "Automated"
            GEN[OpenAPI Generator]
            AUTO[Auto Tests]
            ADOC[Auto Docs]
        end
    end
    
    subgraph "Integration Phase"
        REG[Registry Update]
        BUILD[Build System]
        VAL[Validation]
    end
    
    subgraph "Deployment"
        PROD[Production]
        MON[Monitoring]
        MAINT[Maintenance]
    end
    
    REQ --> SPEC
    SPEC --> SCHEMA
    
    SCHEMA --> IMPL
    IMPL --> TEST
    TEST --> DOC
    
    SPEC --> GEN
    GEN --> AUTO
    AUTO --> ADOC
    
    DOC --> REG
    ADOC --> REG
    REG --> BUILD
    BUILD --> VAL
    
    VAL --> PROD
    PROD --> MON
    MON --> MAINT
```

## Component Interaction Matrix

| Component | MCP Server | Tool Registry | Domain Tools | Akamai Client | Cache | Error Handler |
|-----------|------------|---------------|--------------|---------------|-------|---------------|
| **MCP Server** | - | Loads tools | - | - | - | - |
| **Tool Registry** | Registers | - | Instantiates | - | - | - |
| **Domain Tools** | - | Registered in | - | Uses | Uses | Uses |
| **Akamai Client** | - | - | Used by | - | - | - |
| **Cache** | - | - | Used by | - | - | - |
| **Error Handler** | - | - | Used by | - | - | - |

## Technology Stack

```mermaid
mindmap
  root((ALECS))
    Runtime
      Node.js 18+
      TypeScript 5.0
      ESM Modules
    Frameworks
      MCP SDK
      Express/Fastify
      Axios
    Validation
      Zod
      JSON Schema
    Testing
      Jest
      Supertest
    Building
      TSC
      Webpack
      Docker
    Protocols
      JSON-RPC
      HTTP/2
      WebSocket
      SSE
    Security
      EdgeGrid
      JWT
      TLS 1.3
```

This visual architecture guide provides comprehensive diagrams showing:

1. **System Overview** - How all components connect
2. **Request Flow** - Step-by-step request processing
3. **Multi-Customer** - Tenant isolation architecture
4. **Tool Discovery** - Registration and runtime discovery
5. **Error Handling** - Complete error flow with RFC 7807
6. **Caching** - Multi-layer cache strategy
7. **Security** - Defense in depth approach
8. **Deployment** - CI/CD and deployment options
9. **Performance** - Optimization techniques
10. **Development** - Tool creation lifecycle

Each diagram can be rendered using Mermaid in any Markdown viewer that supports it.