# ALECS MCP Server: Architectural Learnings & Design Rationale

This document summarizes the key architectural patterns and design decisions within the ALECS MCP Server. It is intended to provide context for future development and to explain *why* the system is built the way it is, based on a deep analysis of the codebase and the underlying Akamai APIs.

## 1. Core Mission: An AI Abstraction Layer for Akamai

The primary mission of ALECS is to act as an **intelligent abstraction layer** between a Model Context Protocol (MCP) client (like an AI assistant) and the complex, powerful Akamai platform.

It translates high-level, natural language commands into the precise, often multi-step, API workflows required by Akamai. Its core value is hiding the complexity of the Akamai APIs and presenting them as a simple, consistent, and composable set of tools.

## 2. The "Domain-Driven" Architecture: A Mirror of the API Landscape

A foundational architectural principle of ALECS is its "domain-driven" structure, which is a direct response to the nature of Akamai's APIs.

*   **The "Why":** Akamai does not have a single, unified API. It has a collection of separate, siloed APIs for each major function (e.g., `/papi/v1` for properties, `/dns/v2` for DNS, `/cps/v2` for certificates). Each has its own resources, conventions, and sometimes even slightly different data models.

*   **The "How":** ALECS mirrors this reality. The `src/tools` directory is organized into subdirectories, each representing an Akamai **domain** (`property`, `dns`, `certificates`, `security`, etc.). This is not just for neatness; it is the core organizational principle of the server.

*   **The Result:** This structure allows for:
    *   **Clear Separation of Concerns:** Developers can work on DNS tools without needing to understand the complexities of the Property Manager API.
    *   **Modular Deployments:** The server can be configured to load only specific domains (e.g., a `DNSServer` instance), creating lightweight, specialized microservices. This is managed by the `dynamicDiscovery` configuration in `src/server.ts`.

## 3. Dynamic Tool Discovery: The Key to Scalability

The most innovative feature of the architecture is its **dynamic tool discovery** mechanism.

*   **The "Why":** With over 198 tools, a static, manually maintained registry would be brittle and a significant source of developer friction.

*   **The "How":** On startup, the server's discovery engine (`src/core/discovery.ts` and `src/tools/registry.ts`) scans the `src/tools` directory. It identifies each subdirectory as a "domain" and dynamically imports the `index.ts` file from each one. These `index.ts` files are expected to export the tool definitions for that domain.

*   **The Result:**
    *   **Zero-Configuration Tool Registration:** To add a new tool, a developer simply needs to add a file to the correct domain directory and export it from the `index.ts`. The server automatically picks it up on the next restart.
    *   **Eliminates Maintenance Overhead:** There is no central list of tools to update. The filesystem *is* the registry.

## 4. Abstracting Asynchronous Workflows: The Core Value Proposition

Many critical Akamai operations are **asynchronous and multi-step**. This is the most significant "quirk" of the platform that ALECS is designed to handle.

*   **The "Why":**
    *   **Property Activation:** A change to a CDN configuration isn't instantaneous. A user must create a new *version*, then *activate* it on the staging network, test it, and finally *activate* it on the production network. Each activation is an asynchronous job that can take several minutes and must be polled for completion.
    *   **DNS Zone Updates:** Changes to a DNS zone are made via a `changelist`. You create the changelist, add/remove records, and then `submit` it. This is another asynchronous process that can become "stale" if the underlying zone is modified by another process.
    *   **Certificate Provisioning:** Issuing a certificate involves an "enrollment" workflow with multiple stages, including external user actions (like creating a DNS record for domain validation). The process must be polled to check the status and retrieve the validation challenges.
    *   **Network List & EdgeWorker Activation:** Activating a network list or a new EdgeWorker code version are also asynchronous jobs that require polling a status endpoint.
    *   **Reporting:** Generating large or complex reports can be an asynchronous job. The API returns a `queryId` that must be polled to retrieve the data once the report is complete.

*   **The "How":** ALECS tools are designed to be **workflow-aware**. A tool like `property-activate` or `reporting-get-data` does not simply make one API call. Its handler function encapsulates the entire business logic:
    1.  It initiates the request.
    2.  It intelligently handles the response, determining if it's a final synchronous result or the start of an asynchronous job.
    3.  If asynchronous, it enters a polling loop, repeatedly checking the status endpoint.
    4.  It handles potential errors or timeouts during polling.
    5.  It only returns a final success or failure message to the AI once the entire process is complete.
    6.  For workflows requiring external action (like CPS), the tool presents the necessary information (e.g., the DNS validation token) to the user in a clear, actionable format.

*   **The Result:** ALECS transforms complex, stateful, asynchronous processes into simple, imperative tools that appear synchronous to the AI. This is the server's most critical function.

## 5. Clarifying Ambiguous Operations (The "Invalidate vs. Delete" Quirk)

*   **The "Why":** The Fast Purge API offers two ways to remove content: `invalidate` and `delete`. While they sound similar, they have vastly different impacts on origin server load. `invalidate` is a "soft" purge that checks for new content, while `delete` is a "hard" purge that forces a re-fetch.

*   **The "How":** ALECS exposes these as two distinct tools: `fastpurge-invalidate` and `fastpurge-delete`.

*   **The Result:** This design choice makes the consequence of the action explicit. It prevents users from accidentally using the more aggressive `delete` operation, guiding them toward the safer, more efficient `invalidate` for routine updates.

## 6. Normalizing Inconsistencies and Inter-API Dependencies

*   **The "Why":** The various Akamai APIs have minor inconsistencies in object models, identifier prefixes (`prp_`, `ctr_`, `grp_`), and response wrappers (`{"properties": {"items": [...]}}` vs. `{"zones": [...]}`). They also use different concurrency control mechanisms (`syncPoint` in Network Lists, ETags elsewhere). Furthermore, many APIs depend on information from others (e.g., creating a property requires a `contractId`).

*   **The "How":** ALECS normalizes these differences and manages dependencies.
    *   The `AkamaiClient` handles the construction of correct API requests.
    *   Tool handlers parse the varied API responses and map them to a single, consistent `MCPToolResponse` format.
    *   Concurrency control mechanisms like `syncPoint` are handled transparently by the tools.
    *   Simple, read-only tools like `contract-list` and `group-list` are provided so the AI or user can fetch the necessary prerequisite information for more complex operations.
    *   Zod schemas on each tool's input ensure that the correct types of identifiers and parameters are used from the start.

*   **The Result:** The AI agent interacts with a clean, consistent, and predictable set of tools, shielded from the minor but numerous inconsistencies of the underlying APIs.

## 7. Handling Different Data Interaction Patterns

*   **The "Why":** Not all APIs are for configuration. Some are for data retrieval, and others are for code deployment or real-time data feeds.
    *   **SIEM API:** Uses an `offset` cursor for continuous retrieval of security events.
    *   **GTM API:** Has a "Load Feedback" endpoint for pushing real-time server load data *to* Akamai.
    *   **EdgeWorkers API:** The primary unit of work is a `.tgz` code bundle, not a JSON object.

*   **The "How":** ALECS provides specialized tools that reflect these different patterns.
    *   A `siem-get-events` tool would be stateful, remembering the last `offset` to fetch only new events.
    *   A `gtm-load-feedback` tool would be designed for a "push" operation.
    *   An `edgeworker-upload-version` tool is designed to handle file uploads.

*   **The Result:** ALECS provides a comprehensive interface to the Akamai platform, handling not just configuration but also data retrieval, data pushing, and code deployment, all within the same consistent tool-based framework.

## 8. Multi-Tenancy as a First-Class Citizen

*   **The "Why":** Akamai is an enterprise platform, and users often manage many different accounts, contracts, and groups. The APIs support this via the `accountSwitchKey` parameter and different sections in the `.edgerc` credentials file.

*   **The "How":** The `AkamaiClient` is designed to be instantiated with a specific customer context. The `CallTool` request handler explicitly looks for a `customer` argument, ensuring that each tool execution is performed with the correct permissions and against the correct account.

*   **The Result:** ALECS is a powerful tool for multi-tenant environments, allowing a single AI assistant to manage a diverse portfolio of Akamai configurations securely and reliably.
