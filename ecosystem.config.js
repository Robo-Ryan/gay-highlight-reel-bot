module.exports = {
  apps: [
    {
      name: 'gay-highlight-reel-bot',
      script: 'src/bot.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        WEB_PORT: 3000,
        FEATURE_WHO_MADE_PLAY: 'true',
        FEATURE_SLOW_MOTION: 'true'
      },
      env_production: {
        NODE_ENV: 'production',
        WEB_PORT: 3000,
        FEATURE_WHO_MADE_PLAY: 'true',
        FEATURE_SLOW_MOTION: 'true'
      },
      error_file: 'logs/error.log',
      out_file: 'logs/app.log',
      log_file: 'logs/combined.log',
      time: true
    }
  ]
};