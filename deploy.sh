#!/bin/bash

# Deployment script for Gay Highlight Reel Bot
# Run this script on the old Mac to deploy the bot

echo "Starting deployment of Gay Highlight Reel Bot..."

# Create deployment directory if it doesn't exist
DEPLOY_DIR="$HOME/highlight-reel-bot"
if [ ! -d "$DEPLOY_DIR" ]; then
  echo "Creating deployment directory: $DEPLOY_DIR"
  mkdir -p "$DEPLOY_DIR"
fi

# Copy files to deployment directory
echo "Copying files to $DEPLOY_DIR..."
cp -r /Users/ryanmerlini/Documents/RoboRyan/Video-stitcher-bot/* "$DEPLOY_DIR/"

# Change to deployment directory
cd "$DEPLOY_DIR"

# Install Node.js dependencies
echo "Installing Node.js dependencies..."
npm install

# Set up PM2 to start on system boot
echo "Setting up PM2 startup script..."
pm2 startup

# Start the bot with PM2
echo "Starting bot with PM2..."
pm2 start ecosystem.config.js --name highlightreel

# Save current PM2 process list
pm2 save

echo "Deployment complete!"
echo "Bot is running with PM2. Use the following commands to manage it:"
echo "  pm2 status                    # Check bot status"
echo "  pm2 logs highlightreel        # View bot logs"
echo "  pm2 restart highlightreel     # Restart the bot"
echo "  pm2 stop highlightreel        # Stop the bot"

echo "\nThe Gay Highlight Reel Bot is now ready to receive videos at https://t.me/GayHighlightReelBot"