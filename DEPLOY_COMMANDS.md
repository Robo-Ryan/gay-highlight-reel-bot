# Gay Highlight Reel Bot - Quick Deployment Commands

## Run these commands on your old Mac

1. **Clone the repository from GitHub:**
```bash
cd ~
git clone https://github.com/Robo-Ryan/video-stitcher-bot.git Video-stitcher-bot
cd Video-stitcher-bot
```

2. **Create necessary directories:**
```bash
mkdir -p videos/pending videos/final ffmpeg logs
```

3. **Install Node.js dependencies:**
```bash
npm install
```

4. **Create environment configuration file:**
```bash
cat > config/bot.env << 'EOF'
telegram_bot_token=8321483772:AAFmEUGa7sLsTqkc9sY9XOUBebkFEozKuq0
approval_bot_username=RoboMonitorRemoteMacBot
application_chat_id=
deployment_directory=$HOME/Video-stitcher-bot
videos_pending_directory=videos/pending
videos_final_directory=videos/final
ffmpeg_playlist_path=ffmpeg/playlist.txt
FEATURE_WHO_MADE_PLAY=true
FEATURE_SLOW_MOTION=false
allowed_users=all
NODE_ENV=production
EOF
```

5. **Install PM2 globally (if not already installed):**
```bash
npm install -g pm2
```

6. **Update the ecosystem configuration file:**
```bash
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'highlightreel',
      script: 'src/bot.js',
      cwd: '$HOME/Video-stitcher-bot',
      env: {
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
EOF
```

7. **Start the bot with PM2:**
```bash
pm2 start ecosystem.config.js --name highlightreel
pm2 save
pm2 startup
```

8. **Verify the bot is running:**
```bash
pm2 status
pm2 logs highlightreel
```

## Your bot is now live! 🎉

**Access your bot at:** https://t.me/GayHighlightReelBot

## Useful PM2 Commands

```bash
# Check bot status
pm2 status

# View logs
pm2 logs highlightreel

# Restart bot
pm2 restart highlightreel

# Stop bot
pm2 stop highlightreel

# Restart with environment variable changes
pm2 restart highlightreel --update-env
```

## Testing the System

1. **Send a test video** to @GayHighlightReelBot
2. **Answer** "Who made the play?" prompt
3. **Check status** with `/status` command
4. **Render final reel** with `/render` command
5. **Monitor logs** with `pm2 logs highlightreel`

## Troubleshooting

If you encounter any issues:

1. **Check logs:** `pm2 logs highlightreel`
2. **Verify FFmpeg:** `ffmpeg -version`
3. **Check Node.js:** `node -v`
4. **Restart PM2:** `pm2 restart highlightreel`

The bot will automatically start on system boot thanks to PM2!