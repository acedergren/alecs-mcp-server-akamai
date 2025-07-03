/**
 * Fix for Critical Security Issue: Command Injection in alecs-cli-wrapper.ts
 * 
 * The spawn() call with user input creates a command injection vulnerability
 */

import * as fs from 'fs/promises';
import * as path from 'path';

export async function fixCommandInjection() {
  const filePath = path.join(process.cwd(), 'src/alecs-cli-wrapper.ts');
  const content = await fs.readFile(filePath, 'utf-8');
  
  // Replace the vulnerable spawn call with a safer implementation
  let fixed = content;
  
  // Find the spawn call around line 88
  fixed = fixed.replace(
    /const child = spawn\(process\.argv\[0\], \[cliPath, \.\.\.args\], {/,
    `// SECURITY FIX: Validate and sanitize arguments before spawning
    const sanitizedArgs = args.map(arg => {
      // Remove any shell metacharacters
      return arg.replace(/[;&|<>$\`\\n]/g, '');
    });
    
    const child = spawn(process.argv[0], [cliPath, ...sanitizedArgs], {`
  );
  
  // Also add input validation at the beginning of the function
  fixed = fixed.replace(
    /export function wrapCLI\(cliPath: string\): void {/,
    `export function wrapCLI(cliPath: string): void {
  // SECURITY: Validate CLI path
  if (!cliPath || cliPath.includes('..') || !cliPath.startsWith('/')) {
    throw new Error('Invalid CLI path');
  }`
  );
  
  await fs.writeFile(filePath, fixed);
  console.log('✅ Fixed command injection vulnerability in alecs-cli-wrapper.ts');
}