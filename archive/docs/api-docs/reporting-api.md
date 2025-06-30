# Akamai Reporting API for CDN Metrics

## Overview

The Akamai Reporting API provides comprehensive reporting capabilities for monitoring and optimizing CDN performance. It allows you to generate custom reports to track essential metrics across various Akamai services, with flexible time ranges and aggregation options.

**API Version**: v1  
**OpenAPI Specification**: 3.0.0  
**Base Documentation**: [https://techdocs.akamai.com/reporting-api/reference/api](https://techdocs.akamai.com/reporting-api/reference/api)  
**GitHub Repository**: [https://github.com/akamai/akamai-apis/tree/main/apis/reporting-api/v1](https://github.com/akamai/akamai-apis/tree/main/apis/reporting-api/v1)

## Key Endpoints

1. **List Available Reports**
   - `GET /reports` - Returns all available report types
   
2. **Get Report Versions**
   - `GET /reports/{name}/versions` - Lists versions of a specific report type
   
3. **Get Report Details**
   - `GET /reports/{name}/versions/{version}` - Returns details of a specific report version
   
4. **Generate Reports**
   - `POST /reports/{name}/versions/{version}/report-data` - Generate reports with custom parameters
   - `GET /reports/{name}/versions/{version}/report-data` - Alternative method for report generation

## Essential Day 0 Reports for CDN Monitoring

### 1. Traffic Volume Reports

**Key Metrics:**
- **Total Traffic Volume** - Complete data transferred through CDN
- **Edge Traffic** - Traffic from edge servers to end users
- **Midgress Traffic** - Traffic between CDN servers
- **Origin Traffic** - Traffic from origin servers to CDN
- **Incoming/Outgoing Traffic Volume** - Directional traffic metrics
- **Traffic Volume in Bytes** - Precise byte-level measurements

**Report Types:**
- `traffic` - Comprehensive traffic report with hits, volume, bandwidth, and offload data
- `ipatraffic-by-time` - IP Application Accelerator specific traffic metrics

**Example Metrics Structure:**
```json
{
  "metrics": [
    "incomingTrafficVolume",
    "outgoingTrafficVolume",
    "totalTrafficVolume",
    "trafficVolumeInBytes"
  ]
}
```

### 2. Cache Hit Ratio

**Key Performance Indicators:**
- **Cache Hit Ratio** - Percentage of requests served from edge cache
- **Offload Rate** - Fraction of total requests served from cache
- **Edge Hits per Second** - Rate of successful edge cache hits
- **Origin Hits per Second** - Rate of requests requiring origin fetch

**Calculation**: Cache Hit Ratio = Cache Hits / (Cache Hits + Cache Misses)

**Typical Metrics:**
- Edge success hits (multiple variants)
- Origin success hits (multiple variants)
- Offloaded hits percentage (typically ~99.8% for well-configured CDNs)

**Example Response Data:**
```json
{
  "edgeHitsPerSecond": 15642.56,
  "offloadedHits": 99.82,
  "originHitsPerSecond": 28.17
}
```

### 3. Error Rates

**HTTP Response Code Tracking:**
- **2xx Hits** - Successful responses (200-299)
- **3xx Hits** - Redirection responses (300-399)
- **4xx Hits/Sec** - Client errors (400-499)
- **5xx Hits/Sec** - Server errors (500-599)

**Error Monitoring Capabilities:**
- Error rate breakdowns by type
- Backend server error tracking
- Time-based error trending
- Error distribution across CP codes

### 4. Bandwidth Usage

**Bandwidth Metrics:**
- **Average Bandwidth** - Data transfer rates between CDN components
- **Incoming/Outgoing Traffic Throughput** - Directional bandwidth metrics
- **Throughput in Bits per Second** - Real-time data rates
- **Peak Total Throughput** - Maximum bandwidth utilization
- **Latest Total Throughput** - Current bandwidth usage

**Additional Performance Metrics:**
- Edge processing time
- Time to First Byte (TTFB)
- Origin response time/latency

## Data Aggregation Options

### Time Intervals

The API supports multiple aggregation intervals:
- **FIVE_MINUTES** - 5-minute granularity for real-time monitoring
- **HOUR** - Hourly aggregation for detailed analysis
- **DAY** - Daily summaries for trend analysis
- **WEEK** - Weekly aggregation for longer-term patterns
- **MONTH** - Monthly summaries for capacity planning

### Data Retention

- Standard retention: **92 days**
- Near real-time data population
- Historical data availability varies by report type

### Time Range Configuration

Time ranges can be specified using:
- Start and end timestamps (ISO 8601 format)
- Relative time periods
- Custom date ranges

**Example Time Range:**
```json
{
  "start": "2022-09-27T00:00:00Z",
  "end": "2022-09-27T23:59:59Z",
  "interval": "HOUR"
}
```

## Multi-Customer Report Filtering

### Account Management

- **Account Switch Key** - Enables operations across different customer accounts
- **Role-based Access Control** - Granular permissions for report access
- **Multi-tenant Support** - Separate data isolation per customer

### Filtering Capabilities

1. **Object-Level Filtering**
   - CP Codes (Content Provider codes)
   - Specific delivery configurations
   - Product-specific filtering

2. **Traffic Type Filtering**
   - Standard vs. Secure traffic
   - IP version (IPv4/IPv6)
   - Protocol-specific filtering

3. **Geographic Filtering**
   - Region-based reports
   - Country-level granularity
   - Edge location filtering

**Example Filter Configuration:**
```json
{
  "filters": [
    {
      "type": "ipVersion",
      "value": "ipv4"
    },
    {
      "type": "trafficType",
      "value": "standardSecure"
    }
  ],
  "objectIds": ["16399"],
  "objectType": "cpcode"
}
```

## Request/Response Formats

### Request Structure

```json
{
  "objectIds": ["cpcode1", "cpcode2"],
  "metrics": [
    "edgeHitsPerSecond",
    "originHitsPerSecond",
    "offloadedHits"
  ],
  "filters": [
    {
      "type": "delivery_type",
      "value": "secure"
    }
  ],
  "start": "2024-01-01T00:00:00Z",
  "end": "2024-01-31T23:59:59Z",
  "interval": "DAY"
}
```

### Response Formats

- **JSON** - Structured data with metadata and aggregated metrics
- **CSV** - Tabular format for spreadsheet analysis

### Response Structure Example

```json
{
  "metadata": {
    "name": "traffic-by-time",
    "version": "1",
    "groupBy": ["startdatetime"],
    "interval": "HOUR",
    "rowCount": 24
  },
  "data": [
    {
      "startdatetime": "2024-01-01T00:00:00Z",
      "cpcode": "16399",
      "edgeHitsPerSecond": 15642.56,
      "offloadedHits": 99.82,
      "originHitsPerSecond": 28.17
    }
  ],
  "summaryStatistics": {}
}
```

## Authentication and Authorization

### Authentication Requirements

- Requires Akamai EdgeGrid authentication
- API client credentials needed
- Specific roles required for report execution

### Required Roles

- **Pulsar IPA/SXL Read Only** - For IP Application Accelerator reports
- Product-specific roles for different report types
- Account-level permissions for multi-customer access

## Best Practices

1. **Efficient Data Retrieval**
   - Retrieve only recent time buckets for real-time monitoring
   - Use appropriate intervals based on analysis needs
   - Leverage caching for frequently accessed reports

2. **Performance Optimization**
   - Request only necessary metrics
   - Use filters to reduce data volume
   - Implement pagination for large datasets

3. **Monitoring Strategy**
   - Focus on cache hit ratio for cost optimization
   - Monitor error rates for quality assurance
   - Track bandwidth for capacity planning
   - Use traffic volume for billing reconciliation

4. **Integration Recommendations**
   - Integrate with monitoring platforms (Datadog, etc.)
   - Set up automated alerting based on thresholds
   - Create dashboards for real-time visualization
   - Export data for long-term storage and analysis

## Common Use Cases

1. **Performance Monitoring**
   - Track cache effectiveness
   - Monitor origin offload
   - Analyze response times

2. **Capacity Planning**
   - Predict bandwidth requirements
   - Identify traffic patterns
   - Plan for peak events

3. **Cost Optimization**
   - Maximize cache hit ratios
   - Reduce origin bandwidth
   - Optimize delivery configurations

4. **Troubleshooting**
   - Identify error spikes
   - Analyze traffic anomalies
   - Debug delivery issues

## Additional Resources

- [Akamai API Documentation](https://techdocs.akamai.com/reporting-api/reference/api)
- [GitHub API Specifications](https://github.com/akamai/akamai-apis)
- [Media Delivery Reports](https://techdocs.akamai.com/media-delivery-reports/reference/api) - For media-specific metrics
- [Traffic Reports Guide](https://techdocs.akamai.com/reporting/docs/traffic-rpts)