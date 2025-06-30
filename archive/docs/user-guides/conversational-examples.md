# Natural Conversational Prompts for Property Onboarding

## 🗣️ How Real Users Would Ask

### Simple and Direct
"Can you help me set up code.solutionsedge.io on Akamai?"

"I need to onboard a new website code.solutionsedge.io with origin server at origin-code.solutionsedge.io"

"Please create a CDN property for code.solutionsedge.io"

### With Some Context
"We're launching a new site called code.solutionsedge.io and need to get it on the CDN. The origin is origin-code.solutionsedge.io"

"I want to set up code.solutionsedge.io with HTTPS and all the performance features. Origin is at origin-code.solutionsedge.io"

"Can you onboard code.solutionsedge.io? It's a web application and the backend is origin-code.solutionsedge.io"

### Asking for Help
"How do I add code.solutionsedge.io to Akamai?"

"What's the process to get code.solutionsedge.io working on the CDN?"

"I'm new to this - can you walk me through setting up code.solutionsedge.io?"

### With Specific Requirements
"Set up code.solutionsedge.io with the fastest performance settings, origin is origin-code.solutionsedge.io"

"I need code.solutionsedge.io configured for a web app with HTTPS redirect. Backend: origin-code.solutionsedge.io"

"Please onboard code.solutionsedge.io using Ion Standard, the origin server is origin-code.solutionsedge.io"

### Very Casual
"hey can u setup code.solutionsedge.io for me? origin is origin-code.solutionsedge.io"

"need to get code.solutionsedge.io on akamai asap"

"add code.solutionsedge.io to cdn pls"

### Business Context
"Our new developer portal code.solutionsedge.io needs CDN setup. Origin: origin-code.solutionsedge.io"

"Marketing wants code.solutionsedge.io live by Friday. Can you set it up? Origin is origin-code.solutionsedge.io"

"Client's site code.solutionsedge.io needs Akamai configuration. They're hosted at origin-code.solutionsedge.io"

## 🎯 What the AI Should Understand

All of these should trigger the property onboarding workflow with:
- Hostname: code.solutionsedge.io
- Origin: origin-code.solutionsedge.io (if provided)
- Use case: web-app (auto-detected or inferred)
- Product: Ion Standard (for best performance)
- Network: Enhanced TLS
- Certificate: Default DV

## 💡 Expected AI Response

"I'll help you set up code.solutionsedge.io on Akamai CDN. Let me create this for you with:
- Property name: code.solutionsedge.io
- Origin server: origin-code.solutionsedge.io
- Edge hostname: code.solutionsedge.io.edgekey.net
- Performance: Ion Standard with HTTP/3, caching, and acceleration
- Security: HTTPS-only with automatic redirect
- Certificate: Default DV (automatic provisioning)

This will take about 30 seconds to complete..."

[Then runs the onboarding workflow]

## 🚀 Test These Prompts

Try these with your MCP-enabled AI assistant:

1. "Set up code.solutionsedge.io on the CDN"
2. "I need to onboard code.solutionsedge.io with origin at origin-code.solutionsedge.io"
3. "Can you help me configure code.solutionsedge.io for web delivery?"
4. "Please create an Akamai property for code.solutionsedge.io"
5. "Get code.solutionsedge.io working on Akamai with all the bells and whistles"