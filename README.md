# Gay Highlight Reel Bot

Telegram bot for collecting video clips and stitching them together into a highlight reel. Videos are automatically appended to a master playlist and can be rendered on demand with approval workflow.

## Features

- Accepts video messages from any user in Telegram
- Prompts submitter with "Who made the play?" after video upload
- Stores videos in `videos/pending/` with metadata
- Maintains master reel via FFmpeg playlist file
- Renders final video on command
- Sends rendered video to @RoboMonitorRemoteMacBot for approval
- Option to restart stitching process if needed
- Architecture designed to support future Phase 1 features:
  - Subtitles with speaker names
  - Slow-motion effects
  - Advanced editing capabilities

## Getting Started

### Prerequisites

- Node.js 16 or higher
- FFmpeg installed on the system
- pm2 for process management
- Tailscale for remote access (recommended)

### Installation

1. Clone the repository:
```bash
# This would be your GitHub repository
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp config/bot.env.example config/bot.env
```

4. Edit `config/bot.env` with your bot token and configuration

### Configuration

Create `config/bot.env` file with the following content:
```env
# Bot Configuration
telegram_bot_token=YOUR_TELEGRAM_BOT_TOKEN
approval_bot_username=RoboMonitorRemoteMacBot
approval_chat_id= # Will be set when we receive first message from approval bot

# Service Configuration
deployment_directory=/Users/ryanmerlini/Documents/RoboRyan/Video-stitcher-bot

# Video Processing
videos_pending_directory=videos/pending
videos_final_directory=videos/final
ffmpeg_playlist_path=ffmpeg/playlist.txt

# Security
allowed_users=all  # Accept videos from any user
```

### Running the Bot

#### Development Mode
```bash
npm start
```

#### Production Mode with PM2
```bash
# Start the bot
pm2 start ecosystem.config.js

# Check status
pm2 status

# View logs
pm2 logs highlightreel

# Restart bot
pm2 restart highlightreel

# Stop bot
pm2 stop highlightreel
```

## Bot Commands

- `/start` - Start the bot and see welcome message
- `/help` - Show available commands
- `/status` - Check bot status (pending videos, playlist entries)
- `/render` - Render the final highlight reel (currently available to all users, should be restricted in production)

## Workflow

1. User sends a video to the bot
2. Bot downloads the video to `videos/pending/` directory
3. Bot asks "Who made the play?"
4. User responds with the name of the person who made the play
5. Bot saves metadata and adds video to FFmpeg playlist
6. When `/render` is called, bot creates final video from all clips in playlist
7. Final video is saved to `videos/final/` directory

## Directory Structure

```
Video-stitcher-bot/
├── config/
│   └── bot.env
├── src/
│   └── bot.js
├── videos/
│   ├── pending/     # Incoming videos
│   └── final/       # Rendered highlight reels
├── ffmpeg/
│   └── playlist.txt # FFmpeg concat playlist
├── logs/
│   ├── app.log      # Application logs
│   ├── error.log    # Error logs
│   └── pm2.log      # PM2 logs
├── package.json
└── ecosystem.config.js
```

## FFmpeg Playlist Format

The bot uses FFmpeg's concat demuxer with a text file format. Each line in `ffmpeg/playlist.txt` contains:
```
file '/full/path/to/video.mp4'
```

This approach allows for fast appending without re-encoding, with final rendering done only when `/render` is called.

## Future Enhancements (Phase 1)

- **Subtitle Integration**: Add speaker names as subtitles at the bottom of each clip using FFmpeg `drawtext` filter
- **Slow Motion**: Implement slow-motion effects for key plays
- **Approval Workflow**: Complete integration with @RoboMonitorRemoteMacBot for approval before distribution
- **Video Editing**: Add trimming, reordering, and filtering capabilities
- **User Authentication**: Restrict rendering command to admin users only
- **Storage Management**: Implement automatic cleanup of old videos

## Deployment on Old Mac

1. Ensure Node.js and FFmpeg are installed:
```bash
# Check Node.js version
node -v

# Check FFmpeg installation
ffmpeg -version
```

2. Install pm2 globally:
```bash
npm install -g pm2
```

3. Set up the project directory:
```bash
mkdir -p ~/highlight-reel-bot
# Copy project files to ~/highlight-reel-bot/
```

4. Install dependencies and start service:
```bash
cd ~/highlight-reel-bot
npm install
pm2 start ecosystem.config.js
pm2 save
pm2 startup # Follow instructions to set up startup script
```

## Security Considerations

- Bot token is stored in environment variables and not committed to version control
- The config/bot.env file is gitignored
- Access to the server requires SSH key authentication
- In production, restrict the `/render` command to admin users only

## Troubleshooting

### Common Issues

**Bot not responding**
- Check if the service is running: `pm2 status`
- Check logs: `pm2 logs highlightreel`
- Restart the service: `pm2 restart highlightreel`

**Video download failures**
- Check network connectivity
- Verify the bot has write permissions to the videos/pending/ directory
- Check available disk space

**FFmpeg rendering errors**
- Verify FFmpeg is installed and accessible
- Check that all videos in the playlist exist and are not corrupted
- Ensure there is sufficient disk space for the output file

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -am 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a pull request

## License

MIT License