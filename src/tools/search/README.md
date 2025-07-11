# Universal Search Engine Tools

## Overview

The Universal Search Engine provides advanced search capabilities across all Akamai resources with intelligent features like fuzzy matching, cross-domain search, and smart suggestions.

## Key Features

### 1. Cross-Domain Search
- Search across properties, DNS zones, certificates, network lists, and security policies
- Unified result format with consistent ranking
- Parallel search execution for performance

### 2. Fuzzy Matching
- Typo-tolerant search using Levenshtein distance algorithm
- Automatically corrects common misspellings
- Configurable similarity threshold

### 3. Advanced Filtering
- Filter by contract IDs, group IDs, status
- Date range filtering (modified before/after)
- Tag-based filtering
- Custom filters per resource type

### 4. Search Analytics
- Tracks search history for suggestions
- Popular search terms
- Average search performance metrics
- Click-through tracking (when integrated)

### 5. Intelligent Suggestions
- History-based suggestions
- Popular search suggestions
- Spell corrections
- Type-ahead completions

## Available Tools

### search_all
Universal search across all resource types.

**Example:**
```bash
mcp search_all --query "example.com" --fuzzyMatch true --resourceTypes ["property", "dns", "certificate"]
```

### search_properties
Specialized property search with deep inspection.

**Example:**
```bash
mcp search_properties --query "prod-*" --filters.contractIds ["ctr_12345"] --sortBy "modified"
```

### search_dns_zones
Search DNS zones by domain name or comment.

**Example:**
```bash
mcp search_dns_zones --query "example" --fuzzyMatch true
```

### search_certificates
Search certificates by common name or enrollment ID.

**Example:**
```bash
mcp search_certificates --query "*.example.com" --filters.status ["active"]
```

### search_suggestions
Get intelligent search suggestions based on partial queries.

**Example:**
```bash
mcp search_suggestions --query "prop" --maxSuggestions 10
```

## Search Query Types

The search engine automatically detects query types:

- **Property ID**: `prp_123456`
- **Contract ID**: `ctr_ABC-123`
- **Group ID**: `grp_123456`
- **CP Code**: `123456` or `cp_123456`
- **Edge Hostname**: `example.edgekey.net`
- **Domain**: `www.example.com`
- **DNS Zone**: `example.com`
- **Certificate**: `crt_12345` or domain name
- **Network List**: `nl_12345`

## Integration with ID Translation

All search results automatically translate cryptic IDs to human-readable names:
- Property IDs → Property Names
- Contract IDs → Contract Names
- Group IDs → Group Names
- Certificate IDs → Common Names

## Performance Optimization

1. **Caching**: Frequently searched items are cached
2. **Parallel Execution**: Cross-domain searches run in parallel
3. **Smart Routing**: Automatically chooses between bulk search and traditional search
4. **Result Limiting**: Configurable result limits to prevent overwhelming responses

## Error Handling

The search engine handles errors gracefully:
- Individual resource type failures don't fail the entire search
- Fallback to cached results when API fails
- Clear error messages with suggestions for resolution

## Future Enhancements

1. **Machine Learning**: Improve relevance ranking based on user behavior
2. **Natural Language Processing**: Support for natural language queries
3. **Saved Searches**: Allow users to save and share search configurations
4. **Search Alerts**: Notify when new resources match saved searches
5. **Export Functionality**: Export search results to various formats