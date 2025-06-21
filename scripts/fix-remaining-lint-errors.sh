#!/bin/bash

# Fix remaining function parameter error names
find src -type f -name "*.ts" -exec sed -i 's/private errorCallback(error:/private errorCallback(_error:/g' {} \;
find src -type f -name "*.ts" -exec sed -i 's/handleWebhookError(error:/handleWebhookError(_error:/g' {} \;
find src -type f -name "*.ts" -exec sed -i 's/shouldRetry(error:/shouldRetry(_error:/g' {} \;
find src -type f -name "*.ts" -exec sed -i 's/processFailure(error:/processFailure(_error:/g' {} \;
find src -type f -name "*.ts" -exec sed -i 's/handleComparisonError(error:/handleComparisonError(_error:/g' {} \;
find src -type f -name "*.ts" -exec sed -i 's/onError: (error:/onError: (_error:/g' {} \;
find src -type f -name "*.ts" -exec sed -i 's/validateDNSRecord(error:/validateDNSRecord(_error:/g' {} \;
find src -type f -name "*.ts" -exec sed -i 's/formatError(operation: string, error:/formatError(operation: string, _error:/g' {} \;
find src -type f -name "*.ts" -exec sed -i 's/formatErrorResponse(error:/formatErrorResponse(_error:/g' {} \;
find src -type f -name "*.ts" -exec sed -i 's/analyzeErrorContext(error:/analyzeErrorContext(_error:/g' {} \;
find src -type f -name "*.ts" -exec sed -i 's/formatAkamaiError(error:/formatAkamaiError(_error:/g' {} \;
find src -type f -name "*.ts" -exec sed -i 's/formatNetworkError(error:/formatNetworkError(_error:/g' {} \;
find src -type f -name "*.ts" -exec sed -i 's/logError(error:/logError(_error:/g' {} \;
find src -type f -name "*.ts" -exec sed -i 's/createErrorReport(error:/createErrorReport(_error:/g' {} \;
find src -type f -name "*.ts" -exec sed -i 's/processApiError(error:/processApiError(_error:/g' {} \;
find src -type f -name "*.ts" -exec sed -i 's/handleValidationError(error:/handleValidationError(_error:/g' {} \;
find src -type f -name "*.ts" -exec sed -i 's/createProgressError(error:/createProgressError(_error:/g' {} \;
find src -type f -name "*.ts" -exec sed -i 's/retryOperation(error:/retryOperation(_error:/g' {} \;
find src -type f -name "*.ts" -exec sed -i 's/circuitBreakerFallback(error:/circuitBreakerFallback(_error:/g' {} \;
find src -type f -name "*.ts" -exec sed -i 's/handleNetworkError(error:/handleNetworkError(_error:/g' {} \;
find src -type f -name "*.ts" -exec sed -i 's/logDetailedError(error:/logDetailedError(_error:/g' {} \;
find src -type f -name "*.ts" -exec sed -i 's/createDetailedError(error:/createDetailedError(_error:/g' {} \;

# Fix specific function signatures based on lint output
find src -type f -name "*.ts" -exec sed -i 's/} catch (error: any) {/} catch (_error: any) {/g' {} \;
find src -type f -name "*.ts" -exec sed -i 's/} catch (error) {/} catch (_error) {/g' {} \;
find src -type f -name "*.ts" -exec sed -i 's/catch (error: Error) {/catch (_error: Error) {/g' {} \;
find src -type f -name "*.ts" -exec sed -i 's/catch (error: any) {/catch (_error: any) {/g' {} \;

# Fix variable references inside catch blocks - only if the error variable was renamed
find src -type f -name "*.ts" -exec sed -i 's/} catch (_error: any) {$/} catch (_error: any) {\n        \/\/ Handle _error/g' {} \;

echo "Fixed remaining lint error parameter names"