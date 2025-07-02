module.exports = {
  apps: [
    {
      name: 'alecs-property',
      script: './dist/servers/property-server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3010,
        MCP_TRANSPORT: 'stdio'
      },
      error_file: './logs/property-error.log',
      out_file: './logs/property-out.log',
      time: true,
      max_memory_restart: '256M',
      autorestart: true,
      watch: false
    },
    {
      name: 'alecs-dns',
      script: './dist/servers/dns-server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3011,
        MCP_TRANSPORT: 'stdio'
      },
      error_file: './logs/dns-error.log',
      out_file: './logs/dns-out.log',
      time: true,
      max_memory_restart: '256M',
      autorestart: true,
      watch: false
    },
    {
      name: 'alecs-certs',
      script: './dist/servers/certs-server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3012,
        MCP_TRANSPORT: 'stdio'
      },
      error_file: './logs/certs-error.log',
      out_file: './logs/certs-out.log',
      time: true,
      max_memory_restart: '256M',
      autorestart: true,
      watch: false
    },
    {
      name: 'alecs-security',
      script: './dist/servers/security-server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3013,
        MCP_TRANSPORT: 'stdio'
      },
      error_file: './logs/security-error.log',
      out_file: './logs/security-out.log',
      time: true,
      max_memory_restart: '256M',
      autorestart: true,
      watch: false
    },
    {
      name: 'alecs-reporting',
      script: './dist/servers/reporting-server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3014,
        MCP_TRANSPORT: 'stdio'
      },
      error_file: './logs/reporting-error.log',
      out_file: './logs/reporting-out.log',
      time: true,
      max_memory_restart: '256M',
      autorestart: true,
      watch: false
    },
    {
      name: 'alecs-appsec',
      script: './dist/servers/appsec-server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3015,
        MCP_TRANSPORT: 'stdio'
      },
      error_file: './logs/appsec-error.log',
      out_file: './logs/appsec-out.log',
      time: true,
      max_memory_restart: '256M',
      autorestart: true,
      watch: false
    },
    {
      name: 'alecs-fastpurge',
      script: './dist/servers/fastpurge-server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3016,
        MCP_TRANSPORT: 'stdio'
      },
      error_file: './logs/fastpurge-error.log',
      out_file: './logs/fastpurge-out.log',
      time: true,
      max_memory_restart: '256M',
      autorestart: true,
      watch: false
    },
    {
      name: 'alecs-network-lists',
      script: './dist/servers/network-lists-server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3017,
        MCP_TRANSPORT: 'stdio'
      },
      error_file: './logs/network-lists-error.log',
      out_file: './logs/network-lists-out.log',
      time: true,
      max_memory_restart: '256M',
      autorestart: true,
      watch: false
    }
  ]
};