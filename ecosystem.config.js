module.exports = {
  apps: [
    {
      name: 'highlightreel',
      script: 'src/bot.js',
      cwd: '/Users/ryanmerlini/Documents/RoboRyan/Video-stitcher-bot',
      env: {
        NODE_ENV: 'development',
        TELEGRAM_BOT_TOKEN: '8321483772:AAFmEUGa7sLsTqkc9sY9XOUBebkFEozKuq0'
      },
      env_production: {
        NODE_ENV: 'production'
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      out_file: 'logs/app.log',
      error_file: 'logs/error.log',
      log_file: 'logs/pm2.log',
      time: true
    }
  ]
};