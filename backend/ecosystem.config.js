module.exports = {
  apps: [
    {
      name: 'screen-monitor-backend',
      script: 'npm',
      args: 'run start:dev',
      cwd: '/home/ubuntu/screen-monitoring-system/backend',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 3003
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3003
      },
      log_file: '/home/ubuntu/screen-monitoring-system/backend/logs/combined.log',
      out_file: '/home/ubuntu/screen-monitoring-system/backend/logs/out.log',
      error_file: '/home/ubuntu/screen-monitoring-system/backend/logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      time: true
    }
  ]
};