#!/usr/bin/env python3

def fix_test_utils_comprehensive():
    """Comprehensively fix test-utils.ts syntax issues"""
    file_path = 'src/testing/test-utils.ts'
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Read the file and split into sections
    lines = content.split('\n')
    
    # Find the start and end of the responses object
    start_line = None
    end_line = None
    brace_count = 0
    
    for i, line in enumerate(lines):
        if 'const responses: Record<string, (args: any) => any> = {' in line:
            start_line = i
            brace_count = 1
        elif start_line is not None:
            # Count braces to find the end
            brace_count += line.count('{') - line.count('}')
            if brace_count == 0:
                end_line = i
                break
    
    if start_line is None or end_line is None:
        print("Could not find responses object")
        return
    
    # Build a cleaner responses section
    print(f"Fixing responses section from line {start_line} to {end_line}")
    
    # Keep everything before and after the responses object
    before_responses = lines[:start_line]
    after_responses = lines[end_line + 1:]
    
    # Create a new responses section with proper syntax
    new_responses = [
        "  const responses: Record<string, (args: any) => any> = {",
        "    'agent.property.analysis': (args) => ({",
        "      content: [",
        "        {",
        "          type: 'text',",
        "          text: `# Property Analysis for ${args.context?.domain || 'domain'}",
        "",
        "## Recommended Product",
        "**Ion Standard** (prd_Fresca) - Best for general web acceleration",
        "",
        "## Configuration Recommendations",
        "- Origin server: ${args.context?.origin || 'origin.example.com'}",
        "- Caching: Standard web content",
        "- Compression: Enabled",
        "- HTTP/2 optimization: Enabled",
        "",
        "## Next Steps",
        "1. Create property with Ion Standard product",
        "2. Configure origin and hostnames",
        "3. Test on staging network",
        "4. Activate to production`,",
        "        },",
        "      ],",
        "    }),",
        "",
        "    'property.create': (args) => {",
        "      // Handle retry with corrected name first",
        "      if (args.propertyName === 'invalid-domain.com') {",
        "        return {",
        "          content: [",
        "            {",
        "              type: 'text',",
        "              text: `✅ **Property Created Successfully!**",
        "",
        "## Property Details",
        "- **Name:** ${args.propertyName}",
        "- **Property ID:** prp_124",
        "- **Product:** Ion Standard",
        "- **Contract:** Contract ${args.contractId}",
        "- **Group:** Group ${args.groupId}",
        "- **Status:** 🔵 NEW (Not yet activated)",
        "",
        "Successfully created property with corrected name.`,",
        "            },",
        "          ],",
        "        };",
        "      }",
        "      // Handle validation errors for invalid names",
        "      if (args.propertyName?.includes(' ') || args.propertyName?.includes('!@#')) {",
        "        return {",
        "          content: [",
        "            {",
        "              type: 'text',",
        "              text: `❌ Cannot create property - validation errors:",
        "",
        "- Property name contains invalid characters",
        "",
        "Property name can only contain letters, numbers, hyphens, dots, and underscores",
        "",
        "**Suggestion:** Try using a valid name instead, such as \"${args.propertyName?.replace(/[^a-zA-Z0-9.-_]/g, '-')}\"`,",
        "            },",
        "          ],",
        "        };",
        "      }",
        "      return {",
        "        content: [",
        "          {",
        "            type: 'text',",
        "            text: `✅ **Property Created Successfully!**",
        "",
        "## Property Details",
        "- **Name:** ${args.propertyName}",
        "- **Property ID:** prp_123",
        "- **Product:** Ion Standard",
        "- **Contract:** Contract ${args.contractId}",
        "- **Group:** Group ${args.groupId}",
        "- **Status:** 🔵 NEW (Not yet activated)`,",
        "          },",
        "        ],",
        "      };",
        "    },",
        "  };",
    ]
    
    # Combine all parts
    fixed_content = '\\n'.join(before_responses + new_responses + after_responses)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(fixed_content)
    
    print(f"Fixed test-utils.ts responses section")

if __name__ == "__main__":
    fix_test_utils_comprehensive()