#!/bin/bash

# Fix unused caught errors by prefixing with underscore
echo "Fixing unused caught errors in TypeScript files..."

# Find all TypeScript files and fix common patterns
find src -name "*.ts" -type f | while read -r file; do
  # Fix catch (error) patterns
  sed -i 's/catch (error)/catch (_error)/g' "$file"
  sed -i 's/catch (err)/catch (_err)/g' "$file"
  sed -i 's/catch (e)/catch (_e)/g' "$file"
  sed -i 's/catch (productError)/catch (_productError)/g' "$file"
  sed -i 's/catch (activationError)/catch (_activationError)/g' "$file"
  sed -i 's/catch (rollbackError)/catch (_rollbackError)/g' "$file"
  
  # Fix .catch((error) patterns
  sed -i 's/\.catch((error)/\.catch((_error)/g' "$file"
  sed -i 's/\.catch((err)/\.catch((_err)/g' "$file"
  sed -i 's/\.catch((e)/\.catch((_e)/g' "$file"
done

echo "Done fixing unused caught errors!"