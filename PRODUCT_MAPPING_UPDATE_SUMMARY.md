# Product Mapping Update Summary

## Overview
Updated all files that reference Akamai product IDs to use the new product-mapping utility (`src/utils/product-mapping.ts`). This provides:
- Friendly names for product IDs (e.g., "Ion" for prd_fresca, "DSA" for prd_Site_Accel)
- Auto-selection logic that prefers Ion over DSA
- Consistent product display formatting across all tools

## Files Updated

### 1. property-tools.ts
- Added import for product-mapping utilities
- Updated product display in property details to show friendly names
- Updated error messages to show both product ID and friendly name
- Changed product reference examples to prefer Ion (prd_fresca)

### 2. secure-by-default-onboarding.ts
- Added import for product-mapping utilities
- Implemented auto-selection of best available product when not specified
- Changed default from prd_Site_Accel to prd_fresca
- Added product display with friendly names in output
- Added product selection feedback in steps

### 3. product-tools.ts
- Added import for product-mapping utilities
- Enhanced product listing to show friendly names
- Added "Recommended Product" section that auto-selects Ion when available
- Updated examples to use the best available product dynamically
- Enhanced product details display with friendly names

### 4. debug-secure-onboarding.ts
- Added import for product-mapping utilities
- Added product selection step in debug output
- Implemented auto-selection with detailed feedback
- Changed defaults from prd_Site_Accel to prd_fresca
- Enhanced error messages with product information

### 5. cpcode-tools.ts
- Added import for product-mapping utilities
- Updated CP code listings to show product friendly names
- Implemented auto-selection for CP code creation when product not specified
- Changed default from prd_Site_Accel to prd_fresca
- Enhanced product display in CP code details

### 6. index.ts
- Updated tool descriptions to reflect auto-selection behavior
- Changed product ID examples to include both Ion and DSA
- Updated default descriptions from "prd_Site_Accel" to "auto-selected, prefers Ion"

## Key Changes

### Product Selection Logic
All tools now implement the following logic when a product is not specified:
1. Query available products for the contract
2. Use `selectBestProduct()` which prefers Ion products in this order:
   - prd_fresca (Ion)
   - prd_Ion_Premier
   - prd_Ion_Standard
3. Fall back to DSA products if no Ion available:
   - prd_Site_Accel (DSA)
   - prd_Dynamic_Site_Accelerator
4. Use prd_fresca as ultimate fallback if product lookup fails

### Display Formatting
All product displays now use `formatProductDisplay()` which shows:
- Friendly name with product ID: "Ion (prd_fresca)"
- Or just product ID if no friendly name exists

### Default Product
Changed all hardcoded defaults from `prd_Site_Accel` (DSA) to `prd_fresca` (Ion) to align with Akamai's recommendation to use Ion for new properties.

## Benefits
1. **Better UX**: Users see friendly product names instead of cryptic IDs
2. **Smart Defaults**: Automatically selects Ion when available (preferred by Akamai)
3. **Consistency**: All tools use the same product mapping and selection logic
4. **Future-Proof**: Easy to add new products to the mapping
5. **Fallback Safety**: Graceful handling when product lookup fails