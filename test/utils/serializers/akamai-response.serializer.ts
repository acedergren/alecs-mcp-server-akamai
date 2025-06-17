/**
 * Jest snapshot serializer for Akamai API responses
 * Ensures consistent snapshots by normalizing dynamic values
 */

export const test = (value: any): boolean => {
  return (
    value &&
    typeof value === 'object' &&
    (isAkamaiResponse(value) || isMcpResponse(value))
  );
};

export const serialize = (
  value: any,
  config: any,
  indentation: string,
  depth: number,
  refs: any,
  printer: any
): string => {
  const normalized = normalizeResponse(value);
  return printer(normalized, config, indentation, depth, refs);
};

/**
 * Check if value looks like an Akamai API response
 */
function isAkamaiResponse(value: any): boolean {
  const akamaiPatterns = [
    'propertyId',
    'contractId',
    'groupId',
    'activationId',
    'enrollmentId',
    'listId',
    'zone',
    'edgeHostnameId',
  ];
  
  return akamaiPatterns.some(pattern => pattern in value);
}

/**
 * Check if value looks like an MCP response
 */
function isMcpResponse(value: any): boolean {
  return 'success' in value && typeof value.success === 'boolean';
}

/**
 * Normalize dynamic values in responses
 */
function normalizeResponse(value: any): any {
  if (Array.isArray(value)) {
    return value.map(normalizeResponse);
  }

  if (value === null || typeof value !== 'object') {
    return value;
  }

  const normalized: any = {};

  for (const [key, val] of Object.entries(value)) {
    normalized[key] = normalizeValue(key, val);
  }

  return normalized;
}

/**
 * Normalize individual values based on their key
 */
function normalizeValue(key: string, value: any): any {
  // Normalize timestamps
  if (isTimestampField(key) && typeof value === 'string') {
    return normalizeTimestamp(value);
  }

  // Normalize IDs
  if (isIdField(key) && typeof value === 'string') {
    return normalizeId(key, value);
  }

  // Normalize URLs
  if (isUrlField(key) && typeof value === 'string') {
    return normalizeUrl(value);
  }

  // Normalize version numbers
  if (key === 'version' && typeof value === 'number') {
    return '[VERSION]';
  }

  // Normalize arrays
  if (Array.isArray(value)) {
    return value.map(v => normalizeValue(key, v));
  }

  // Normalize nested objects
  if (value && typeof value === 'object') {
    return normalizeResponse(value);
  }

  return value;
}

/**
 * Check if field name represents a timestamp
 */
function isTimestampField(key: string): boolean {
  const timestampPatterns = [
    'date',
    'Date',
    'time',
    'Time',
    'created',
    'modified',
    'updated',
    'timestamp',
    'submitDate',
    'updateDate',
  ];
  
  return timestampPatterns.some(pattern => key.includes(pattern));
}

/**
 * Check if field name represents an ID
 */
function isIdField(key: string): boolean {
  const idPatterns = [
    'Id',
    'ID',
    '_id',
    'requestId',
    'versionId',
    'etag',
    'nonce',
    'signature',
  ];
  
  return idPatterns.some(pattern => key.includes(pattern));
}

/**
 * Check if field name represents a URL
 */
function isUrlField(key: string): boolean {
  const urlPatterns = [
    'url',
    'URL',
    'link',
    'Link',
    'href',
    'endpoint',
    'host',
  ];
  
  return urlPatterns.some(pattern => key.includes(pattern));
}

/**
 * Normalize timestamp to a consistent format
 */
function normalizeTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    if (!isNaN(date.getTime())) {
      return '[TIMESTAMP]';
    }
  } catch {
    // Not a valid date
  }
  
  // Check for Unix timestamps
  if (/^\d{10,13}$/.test(timestamp)) {
    return '[UNIX_TIMESTAMP]';
  }
  
  return timestamp;
}

/**
 * Normalize ID values based on their pattern
 */
function normalizeId(key: string, id: string): string {
  // Property IDs
  if (id.startsWith('prp_')) {
    return 'prp_[PROPERTY_ID]';
  }
  
  // Contract IDs
  if (id.startsWith('ctr_')) {
    return 'ctr_[CONTRACT_ID]';
  }
  
  // Group IDs
  if (id.startsWith('grp_')) {
    return 'grp_[GROUP_ID]';
  }
  
  // Activation IDs
  if (id.startsWith('atv_')) {
    return 'atv_[ACTIVATION_ID]';
  }
  
  // Edge hostname IDs
  if (id.startsWith('ehn_')) {
    return 'ehn_[EDGE_HOSTNAME_ID]';
  }
  
  // CP Code IDs (usually just numbers)
  if (key.includes('cpcode') || key.includes('cpCode')) {
    return '[CPCODE_ID]';
  }
  
  // Network list IDs
  if (key.includes('listId') && /^\d+_/.test(id)) {
    return '[NETWORK_LIST_ID]';
  }
  
  // Generic UUID pattern
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return '[UUID]';
  }
  
  // Request IDs
  if (key === 'requestId' || key === 'X-Request-ID') {
    return '[REQUEST_ID]';
  }
  
  // ETags
  if (key === 'etag' || key === 'ETag') {
    return '[ETAG]';
  }
  
  return id;
}

/**
 * Normalize URLs to remove dynamic parts
 */
function normalizeUrl(url: string): string {
  // Normalize Akamai API URLs
  if (url.includes('.akamai.com') || url.includes('.akamaiapis.net')) {
    return url
      .replace(/\/\d+/g, '/[ID]')
      .replace(/prp_\d+/g, 'prp_[PROPERTY_ID]')
      .replace(/ctr_[A-Z]-\d+/g, 'ctr_[CONTRACT_ID]')
      .replace(/grp_\d+/g, 'grp_[GROUP_ID]')
      .replace(/atv_\d+/g, 'atv_[ACTIVATION_ID]')
      .replace(/ehn_\d+/g, 'ehn_[EDGE_HOSTNAME_ID]');
  }
  
  // Normalize query parameters
  if (url.includes('?')) {
    const [base, query] = url.split('?');
    const params = new URLSearchParams(query);
    
    // Normalize common query parameters
    if (params.has('timestamp')) params.set('timestamp', '[TIMESTAMP]');
    if (params.has('nonce')) params.set('nonce', '[NONCE]');
    if (params.has('signature')) params.set('signature', '[SIGNATURE]');
    if (params.has('version')) params.set('version', '[VERSION]');
    
    return `${base}?${params.toString()}`;
  }
  
  return url;
}

// Export for Jest
module.exports = { test, serialize };