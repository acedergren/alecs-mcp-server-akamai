#!/bin/bash

# Fix specific lint errors based on the output

# src/services/certificate-validation-monitor.ts:156:5
sed -i 's/domain: string,/&_domain: string,/g' src/services/certificate-validation-monitor.ts
sed -i 's/domain: string) {/_domain: string) {/g' src/services/certificate-validation-monitor.ts

# src/tools/dns-tools.ts:570:27
sed -i '570s/error: any)/_error: any)/g' src/tools/dns-tools.ts

# src/tools/includes-tools.ts:599:34  
sed -i '599s/error: any)/_error: any)/g' src/tools/includes-tools.ts

# src/tools/property-activation-advanced.ts:140:39
sed -i '140s/error: any)/_error: any)/g' src/tools/property-activation-advanced.ts

# src/tools/property-activation-advanced.ts:590:29
sed -i '590s/error: any)/_error: any)/g' src/tools/property-activation-advanced.ts

# src/tools/property-manager-tools.ts:342:32
sed -i '342s/error: any)/_error: any)/g' src/tools/property-manager-tools.ts

# src/tools/secure-by-default-onboarding.ts:697:56
sed -i '697s/error: any)/_error: any)/g' src/tools/secure-by-default-onboarding.ts

# Fix utils files
sed -i 's/error: Error)/_error: Error)/g' src/utils/enhanced-error-handling.ts
sed -i 's/error: any)/_error: any)/g' src/utils/enhanced-error-handling.ts
sed -i 's/error) {/_error) {/g' src/utils/enhanced-error-handling.ts

sed -i 's/error: Error)/_error: Error)/g' src/utils/error-handling.ts
sed -i 's/error: any)/_error: any)/g' src/utils/error-handling.ts

sed -i 's/error: Error)/_error: Error)/g' src/utils/errors.ts
sed -i 's/error: any)/_error: any)/g' src/utils/errors.ts
sed -i 's/error) {/_error) {/g' src/utils/errors.ts

sed -i 's/error: Error)/_error: Error)/g' src/utils/resilience-manager.ts
sed -i 's/error: any)/_error: any)/g' src/utils/resilience-manager.ts

sed -i 's/error: Error)/_error: Error)/g' src/utils/response-parsing.ts
sed -i 's/error: any)/_error: any)/g' src/utils/response-parsing.ts

sed -i 's/error: Error)/_error: Error)/g' src/utils/tool-error-handling.ts
sed -i 's/error: any)/_error: any)/g' src/utils/tool-error-handling.ts

echo "Applied specific lint error fixes"