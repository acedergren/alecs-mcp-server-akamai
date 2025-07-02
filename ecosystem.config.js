module.exports = {
  apps: [
    {
      name: 'alecs-mcp-server',
      script: './dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        MCP_TRANSPORT: process.env.MCP_TRANSPORT || 'stdio'
      },
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      time: true,
      max_memory_restart: '1G',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      watch: false,
      ignore_watch: ['node_modules', 'logs', '.git', 'dist', '.archive']
    }
  ]
};