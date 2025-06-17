/**
 * Product Mapping Utilities
 * Maps Akamai product IDs to user-friendly names and handles product selection logic
 */

// Product ID to friendly name mapping
export const PRODUCT_NAME_MAP: Record<string, string> = {
  'prd_Site_Accel': 'DSA',
  'prd_fresca': 'Ion',
  'prd_Download_Delivery': 'DD',
  'prd_Adaptive_Media_Delivery': 'AMD',
  'prd_Dynamic_Site_Accelerator': 'DSA',
  'prd_Web_Application_Accelerator': 'WAA',
  'prd_Ion_Standard': 'Ion Standard',
  'prd_Ion_Premier': 'Ion Premier',
  'prd_Rich_Media_Accelerator': 'RMA',
};

// Reverse mapping from friendly names to product IDs
export const PRODUCT_ID_MAP: Record<string, string> = {
  'DSA': 'prd_Site_Accel',
  'Ion': 'prd_fresca',
  'DD': 'prd_Download_Delivery',
  'AMD': 'prd_Adaptive_Media_Delivery',
  'WAA': 'prd_Web_Application_Accelerator',
  'Ion Standard': 'prd_Ion_Standard',
  'Ion Premier': 'prd_Ion_Premier',
  'RMA': 'prd_Rich_Media_Accelerator',
};

// Ion product variants (preferred in order)
const ION_PRODUCTS = ['prd_fresca', 'prd_Ion_Premier', 'prd_Ion_Standard'];

// DSA product variants
const DSA_PRODUCTS = ['prd_Site_Accel', 'prd_Dynamic_Site_Accelerator'];

/**
 * Get friendly name for a product ID
 */
export function getProductFriendlyName(productId: string): string {
  return PRODUCT_NAME_MAP[productId] || productId;
}

/**
 * Get product ID from friendly name
 */
export function getProductId(friendlyName: string): string | null {
  // Direct lookup
  if (PRODUCT_ID_MAP[friendlyName]) {
    return PRODUCT_ID_MAP[friendlyName];
  }
  
  // Case-insensitive lookup
  const upperName = friendlyName.toUpperCase();
  for (const [key, value] of Object.entries(PRODUCT_ID_MAP)) {
    if (key.toUpperCase() === upperName) {
      return value;
    }
  }
  
  // Check if it's already a product ID
  if (friendlyName.startsWith('prd_')) {
    return friendlyName;
  }
  
  return null;
}

/**
 * Select the best product from available products
 * Prioritizes Ion over DSA unless user specifies otherwise
 */
export function selectBestProduct(
  availableProducts: Array<{ productId: string; productName: string }>,
  userPreference?: string
): { productId: string; productName: string; friendlyName: string } | null {
  if (!availableProducts || availableProducts.length === 0) {
    return null;
  }

  // If user specified a preference, try to match it
  if (userPreference) {
    const preferredId = getProductId(userPreference);
    if (preferredId) {
      const preferred = availableProducts.find(p => p.productId === preferredId);
      if (preferred) {
        return {
          ...preferred,
          friendlyName: getProductFriendlyName(preferred.productId)
        };
      }
    }
    
    // Try to match by product name
    const preferredByName = availableProducts.find(
      p => p.productName.toLowerCase().includes(userPreference.toLowerCase())
    );
    if (preferredByName) {
      return {
        ...preferredByName,
        friendlyName: getProductFriendlyName(preferredByName.productId)
      };
    }
  }

  // Check for Ion products first (preferred)
  for (const ionProduct of ION_PRODUCTS) {
    const ion = availableProducts.find(p => p.productId === ionProduct);
    if (ion) {
      return {
        ...ion,
        friendlyName: getProductFriendlyName(ion.productId)
      };
    }
  }

  // Fall back to DSA products
  for (const dsaProduct of DSA_PRODUCTS) {
    const dsa = availableProducts.find(p => p.productId === dsaProduct);
    if (dsa) {
      return {
        ...dsa,
        friendlyName: getProductFriendlyName(dsa.productId)
      };
    }
  }

  // Return the first available product as last resort
  const first = availableProducts[0];
  if (!first) {
    throw new Error('No products available');
  }
  return {
    productId: first.productId || '',
    productName: first.productName || '',
    friendlyName: getProductFriendlyName(first.productId || '')
  };
}

/**
 * Format product display with both ID and friendly name
 */
export function formatProductDisplay(productId: string, productName?: string): string {
  const friendlyName = getProductFriendlyName(productId);
  if (friendlyName !== productId) {
    return `${friendlyName} (${productId})${productName ? ` - ${productName}` : ''}`;
  }
  return productName ? `${productId} - ${productName}` : productId;
}