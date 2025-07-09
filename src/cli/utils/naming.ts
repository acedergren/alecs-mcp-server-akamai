/**
 * Naming Utilities
 * 
 * Utilities for consistent naming conventions in generated code
 */

/**
 * Validate domain name
 */
export function validateDomainName(name: string): void {
  if (!name || typeof name !== 'string') {
    throw new Error('Domain name must be a non-empty string');
  }
  
  if (!/^[a-zA-Z][a-zA-Z0-9-]*$/.test(name)) {
    throw new Error('Domain name must start with a letter and contain only letters, numbers, and hyphens');
  }
  
  if (name.length > 50) {
    throw new Error('Domain name must be 50 characters or less');
  }
  
  // Check for reserved words
  const reservedWords = ['base', 'core', 'tool', 'mcp', 'server', 'client', 'akamai'];
  if (reservedWords.includes(name.toLowerCase())) {
    throw new Error(`Domain name '${name}' is reserved`);
  }
}

/**
 * Validate tool name
 */
export function validateToolName(name: string): void {
  if (!name || typeof name !== 'string') {
    throw new Error('Tool name must be a non-empty string');
  }
  
  if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(name)) {
    throw new Error('Tool name must start with a letter and contain only letters, numbers, underscores, and hyphens');
  }
  
  if (name.length > 50) {
    throw new Error('Tool name must be 50 characters or less');
  }
}

/**
 * Convert string to PascalCase
 */
export function toPascalCase(str: string): string {
  return str
    .replace(/[-_]/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

/**
 * Convert string to snake_case
 */
export function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .replace(/[-\s]/g, '_')
    .toLowerCase()
    .replace(/^_/, '');
}

/**
 * Convert string to camelCase
 */
export function toCamelCase(str: string): string {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/**
 * Convert string to kebab-case
 */
export function toKebabCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '-$1')
    .replace(/[_\s]/g, '-')
    .toLowerCase()
    .replace(/^-/, '');
}

/**
 * Pluralize a word
 */
export function pluralize(word: string): string {
  if (word.endsWith('s') || word.endsWith('x') || word.endsWith('z') || 
      word.endsWith('ch') || word.endsWith('sh')) {
    return word + 'es';
  }
  
  if (word.endsWith('y') && !/[aeiou]y$/.test(word)) {
    return word.slice(0, -1) + 'ies';
  }
  
  return word + 's';
}

/**
 * Singularize a word
 */
export function singularize(word: string): string {
  if (word.endsWith('ies')) {
    return word.slice(0, -3) + 'y';
  }
  
  if (word.endsWith('es') && word.length > 2) {
    return word.slice(0, -2);
  }
  
  if (word.endsWith('s') && word.length > 1) {
    return word.slice(0, -1);
  }
  
  return word;
}