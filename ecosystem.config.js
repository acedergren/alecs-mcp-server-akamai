module.exports = {
  apps: [
    {
      name: 'alecs-full',
      script: './dist/index-full.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        DEBUG: '0'
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3000,
        DEBUG: '1'
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log',
      time: true,
      max_memory_restart: '1G',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      watch: false,
      ignore_watch: ['node_modules', 'logs', '.git', 'dist']
    },
    {
      name: 'alecs-essentials',
      script: './dist/index-essential.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        DEBUG: '0'
      },
      error_file: './logs/pm2-essentials-error.log',
      out_file: './logs/pm2-essentials-out.log',
      log_file: './logs/pm2-essentials-combined.log',
      time: true,
      max_memory_restart: '512M',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      watch: false
    },
    {
      name: 'alecs-property',
      script: './dist/servers/property-server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3010,
        DEBUG: '0'
      },
      error_file: './logs/pm2-property-error.log',
      out_file: './logs/pm2-property-out.log',
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
        DEBUG: '0'
      },
      error_file: './logs/pm2-dns-error.log',
      out_file: './logs/pm2-dns-out.log',
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
        PORT: 3012,
        DEBUG: '0'
      },
      error_file: './logs/pm2-security-error.log',
      out_file: './logs/pm2-security-out.log',
      time: true,
      max_memory_restart: '256M',
      autorestart: true,
      watch: false
    },
    {
      name: 'alecs-websocket',
      script: './start-websocket-server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        ALECS_WS_PORT: process.env.ALECS_WS_PORT || '8082',
        ALECS_WS_HOST: process.env.ALECS_WS_HOST || '0.0.0.0',
        ALECS_WS_PATH: process.env.ALECS_WS_PATH || '/mcp',
        TOKEN_MASTER_KEY: process.env.TOKEN_MASTER_KEY,
        DEBUG: '0'
      },
      error_file: './logs/pm2-websocket-error.log',
      out_file: './logs/pm2-websocket-out.log',
      time: true,
      max_memory_restart: '512M',
      autorestart: true,
      watch: false
    },
    {
      name: 'alecs-sse',
      script: './start-sse-server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        ALECS_SSE_PORT: process.env.ALECS_SSE_PORT || '3013',
        ALECS_SSE_HOST: process.env.ALECS_SSE_HOST || '0.0.0.0',
        ALECS_SSE_PATH: process.env.ALECS_SSE_PATH || '/mcp',
        TOKEN_MASTER_KEY: process.env.TOKEN_MASTER_KEY,
        DEBUG: '0'
      },
      error_file: './logs/pm2-sse-error.log',
      out_file: './logs/pm2-sse-out.log',
      time: true,
      max_memory_restart: '512M',
      autorestart: true,
      watch: false
    }
  ],

  // Deployment configuration (optional)
  deploy: {
    production: {
      user: 'alex',
      host: 'localhost',
      ref: 'origin/main',
      repo: 'https://github.com/acedergren/alecs-mcp-server-akamai.git',
      path: '/var/www/mcp-akamai',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-deploy-local': 'echo "Deploying to production server"'
    }
  }
};