#!/usr/bin/env node

/**
 * Simple demonstration of ID Translation functionality
 * 
 * This shows how the ID translation service will work when integrated with BaseTool
 */

console.log('ID Translation Service - Integration Demo\n');
console.log('========================================\n');

// Example: Original API response from Akamai
const originalResponse = {
  properties: {
    items: [
      {
        propertyId: 'prp_123456',
        propertyName: 'www.example.com',
        contractId: 'ctr_C-1234567',
        groupId: 'grp_98765',
        productId: 'prd_Web_Accel',
        latestVersion: 5
      },
      {
        propertyId: 'prp_789012', 
        propertyName: 'api.example.com',
        contractId: 'ctr_C-1234567',
        groupId: 'grp_54321',
        productId: 'prd_API_Accel',
        latestVersion: 12
      }
    ]
  }
};

console.log('1. Original API Response (cryptic IDs):');
console.log('--------------------------------------');
console.log(JSON.stringify(originalResponse, null, 2));
console.log('\n');

// Simulated translation mappings
const translations = {
  'ctr_C-1234567': 'Web Performance Contract',
  'grp_98765': 'Production Properties',
  'grp_54321': 'API Properties',
  'prd_Web_Accel': 'Ion Standard',
  'prd_API_Accel': 'API Acceleration'
};

// Example: Response after ID translation
const translatedResponse = JSON.parse(JSON.stringify(originalResponse));

// Apply translations
translatedResponse.properties.items.forEach((item: any) => {
  // Add human-readable names alongside IDs
  item.contractName = translations[item.contractId] || item.contractId;
  item.groupName = translations[item.groupId] || item.groupId;
  item.productName = translations[item.productId] || item.productId;
});

console.log('2. Translated Response (with human-readable names):');
console.log('--------------------------------------------------');
console.log(JSON.stringify(translatedResponse, null, 2));
console.log('\n');

console.log('3. How it works in BaseTool:');
console.log('---------------------------');
console.log(`
When you use BaseTool.execute() with translation enabled:

1. Make API request to Akamai
2. Receive response with cryptic IDs
3. ID Translation Service automatically:
   - Identifies translatable IDs using path mappings
   - Looks up human-readable names (with caching)
   - Adds *Name fields alongside original IDs
4. Return enhanced response to user

Example tool configuration:

  return BaseTool.execute(
    'property',
    'property_list',
    args,
    async (client) => client.request({ ... }),
    {
      translation: {
        enabled: true,
        mappings: BaseTool.COMMON_TRANSLATIONS.property
      }
    }
  );
`);

console.log('4. Translation Mappings:');
console.log('-----------------------');
console.log(`
Common property mappings include:
  - propertyId → property name lookup
  - contractId → contract name lookup  
  - groupId → group name lookup
  - productId → product name lookup
  - cpCode → CP code name lookup

The service supports:
  - Nested paths (e.g., "properties.items.*.contractId")
  - Wildcards for arrays and deep nesting
  - Caching to minimize API calls
  - Batch translation for efficiency
  - Graceful fallback if translation fails
`);

console.log('\n5. Benefits:');
console.log('-----------');
console.log(`
✓ Users see "Web Performance Contract" instead of "ctr_C-1234567"
✓ Easier to understand which resources belong together
✓ Reduces need for manual ID lookups
✓ Maintains original IDs for API operations
✓ Transparent - happens automatically in BaseTool
`);

console.log('\nDemo complete!');