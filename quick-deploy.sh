#!/bin/bash

# Quick Deployment Script for Gay Highlight Reel Bot
# Run this on the old Mac

echo "🎬 Gay Highlight Reel Bot - Quick Deployment"
echo "========================================"

# Navigate to home directory
cd ~

# Create project directory
if [ -d "Video-stitcher-bot" ]; then
    echo "Removing existing directory..."
    rm -rf Video-stitcher-bot
fi

# Clone from GitHub
echo "Cloning from GitHub..."
git clone https://github.com/Robo-Ryan/video-stitcher-bot.git Video-stitcher-bot

# Navigate to project directory
cd Video-stitcher-bot

# Create necessary directories
echo "Creating necessary directories..."
mkdir -p videos/pending
mkdir -p videos/final
mkdir -p ffmpeg
mkdir -p logs

# Install dependencies
echo "Installing Node.js dependencies..."
npm install

# Set up environment configuration
echo "Setting up environment..."
cat > config/bot.env << ENV_CONFIG
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
ENV_CONFIG

# Install PM2 if not already installed
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    npm install -g pm2
fi

# Start the bot with PM2
echo "Starting bot with PM2..."
pm2 start ecosystem.config.js --name highlightreel

# Save PM2 process list
pm2 save

# Set up PM2 to start on boot
pm2 startup

echo "========================================"
echo "🎉 Deployment Complete!"
echo ""
echo "Bot is running and ready to accept videos at:"
echo "https://t.me/GayHighlightReelBot"
echo ""
echo "Useful commands:"
echo "  pm2 status                    # Check bot status"
echo "  pm2 logs highlightreel        # View bot logs"
echo "  pm2 restart highlightreel     # Restart the bot"
echo "  pm2 stop highlightreel        # Stop the bot"
echo ""
echo "The bot will automatically start on system boot!"