#!/usr/bin/env python3

import re

def fix_test_utils():
    """Fix syntax errors in test-utils.ts"""
    file_path = 'src/testing/test-utils.ts'
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Fix the createTestServer function return type
    content = re.sub(r'export function createTestServer\(\): \{\s*getServer: \(\) => any;\s*,\s*callTool: \(name: string, args: any\) => Promise<any>;\s*\}', 
                     'export function createTestServer(): {\n  getServer: () => any;\n  callTool: (name: string, args: any) => Promise<any>;\n}', content)
    
    # Fix all invalid object syntax patterns like ){ instead of })
    content = re.sub(r'\)\s*\{\s*', ') {', content)
    content = re.sub(r'\}\s*\)\s*,', '}),', content)
    content = re.sub(r'\)\s*,\s*', '),\n', content)
    
    # Fix specific broken patterns
    content = re.sub(r'\(\{\s*,\s*', '({', content)
    content = re.sub(r'\{\s*,\s*', '{', content)
    content = re.sub(r',\s*\}\)\s*,', '}),', content)
    content = re.sub(r'\}\)\s*\)\s*,', '}),', content)
    
    # Fix the error scenarios object methods
    patterns_to_fix = [
        # Fix authenticationError
        (r'authenticationError: \(\) => \(\{,\s*response: \{\s*status: 401,\s*data: \{,\s*detail: \'Authentication failed\',\s*type: \'authentication_error\',\s*\}\)\),\s*\},\s*\}\),', 
         'authenticationError: () => ({\n    response: {\n      status: 401,\n      data: {\n        detail: \'Authentication failed\',\n        type: \'authentication_error\',\n      },\n    },\n  }),'),
        
        # Fix rateLimited
        (r'rateLimited: \(\) => \(\{,\s*response: \{\s*status: 429,\s*headers: \{[^}]*\},\s*data: \{,\s*detail: \'Rate limit exceeded\',\s*\}\)\),\s*\},\s*\}\),',
         'rateLimited: () => ({\n    response: {\n      status: 429,\n      headers: {\n        \'retry-after\': \'60\',\n        \'x-ratelimit-limit\': \'100\',\n        \'x-ratelimit-remaining\': \'0\',\n      },\n      data: {\n        detail: \'Rate limit exceeded\',\n      },\n    },\n  }),'),
        
        # Fix validationError
        (r'validationError: \(field: string\) => \(\{,\s*response: \{[^}]*\},\s*\}\),',
         'validationError: (field: string) => ({\n    response: {\n      status: 400,\n      data: {\n        type: \'validation_error\',\n        title: \'Validation failed\',\n        errors: [\n          {\n            type: \'invalid_field\',\n            detail: `Invalid value for ${field}`,\n            field,\n          },\n        ],\n      },\n    },\n  }),'),
    ]
    
    for pattern, replacement in patterns_to_fix:
        content = re.sub(pattern, replacement, content, flags=re.DOTALL)
    
    # Clean up any remaining malformed syntax
    content = re.sub(r',\s*\}\s*\)\s*,\s*', '}),\n\n  ', content)
    content = re.sub(r'\}\)\s*\)\s*,', '}),', content)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("Fixed test-utils.ts syntax errors")

if __name__ == "__main__":
    fix_test_utils()