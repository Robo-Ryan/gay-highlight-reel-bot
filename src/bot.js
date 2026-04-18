require('dotenv').config({ path: '../config/bot.env' });
const { Telegraf } = require('telegraf');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');
const winston = require('winston');
const featureFlags = require('./feature-flags');

// Web server dependencies
const express = require('express');
const cors = require('cors');

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegStatic);

// Setup Express web server
const app = express();
const PORT = process.env.WEB_PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('../web')); // Serve static files from web directory

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Import markers API routes
const markersRouter = require('./api/markers');

// Mount markers API
app.use('/api/markers', markersRouter);

// Render endpoint
app.post('/api/render', async (req, res) => {
    try {
        const { videoId, markers } = req.body;
        
        if (!videoId || !markers) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }
        
        // In a real implementation, you would:
        // 1. Queue the render job
        // 2. Process the video with the specified slow motion segments
        // 3. Return the result
        
        // For now, we'll simulate a successful render request
        logger.info(`Render request received for video ${videoId} with ${markers.slowMotionSegments?.length || 0} slow motion segments`);
        
        // This would normally trigger the video processing
        // VideoProcessor.processHighlightReel(playlistPath, outputPath, videoMetadata, { slowMotionSegments: markers.slowMotionSegments });
        
        res.json({ 
            success: true, 
            message: 'Render request submitted successfully. Processing will begin shortly.',
            videoId: videoId,
            jobId: Date.now()
        });
        
    } catch (error) {
        logger.error('Error processing render request:', error);
        res.status(500).json({ error: 'Failed to process render request' });
    }
});

// Setup logging
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: '../logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: '../logs/app.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Initialize bot
const bot = new Telegraf(process.env.telegram_bot_token);

// Constants
const PENDING_VIDEOS_DIR = process.env.videos_pending_directory || '../videos/pending';
const FINAL_VIDEOS_DIR = process.env.videos_final_directory || '../videos/final';
const FFMPG_PLAYLIST_PATH = process.env.ffmpeg_playlist_path || '../ffmpeg/playlist.txt';

// In-memory state for tracking who made the play
const playSubmissionState = new Map();

// Ensure directories exist
const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

ensureDir(PENDING_VIDEOS_DIR);
ensureDir(FINAL_VIDEOS_DIR);
ensureDir(path.dirname(FFMPG_PLAYLIST_PATH));

// Get video duration from file
function getVideoDuration(videoPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        reject(err);
      } else {
        resolve(parseFloat(metadata.format.duration));
      }
    });
  });
}

// Start command
bot.start((ctx) => {
  ctx.reply('Welcome to the Gay Highlight Reel Bot! 🎬\n' + 
          'Send me video clips and I\'ll stitch them together into a highlight reel.\n' + 
          'After sending a video, I\'ll ask \'Who made the play?\'');
});

// Help command
bot.help((ctx) => {
  ctx.reply('Available commands:\n' + 
          '/start - Start the bot\n' + 
          '/help - Show this message\n' + 
          '/status - Check bot status\n' + 
          '/render - Render final highlight reel (only for admin)');
});

// Status command
bot.command('status', (ctx) => {
  const pendingCount = fs.readdirSync(PENDING_VIDEOS_DIR).filter(f => f.endsWith('.mp4') || f.endsWith('.mov')).length;
  const playlistExists = fs.existsSync(FFMPG_PLAYLIST_PATH);
  const playlistLines = playlistExists ? fs.readFileSync(FFMPG_PLAYLIST_PATH, 'utf8').split('\n').filter(line => line.trim().startsWith('file ')).length : 0;
  
  ctx.reply('📊 Bot Status:\n' +
          '• Pending videos: ' + pendingCount + '\n' +
          '• Playlist entries: ' + playlistLines + '\n' +
          '• Service: Running\n\n' +
          'Use /render to create the final highlight reel.');
});

// Handle video messages
bot.on('video', async (ctx) => {
  try {
    const video = ctx.message.video;
    const fileId = video.file_id;
    const fileName = `${fileId}.mp4`;
    const filePath = path.join(PENDING_VIDEOS_DIR, fileName);
    
    // Store video info for who made the play prompt
    const state = {
      fileId,
      fileName,
      filePath,
      timestamp: new Date().toISOString()
    };
    
    playSubmissionState.set(ctx.from.id, state);
    
    // Download the video
    const fileLink = await ctx.telegram.getFileLink(fileId);
    const response = await fetch(fileLink);
    
    if (!response.ok) {
      throw new Error('Failed to download video: ' + response.statusText);
    }
    
    const fileStream = fs.createWriteStream(filePath);
    await new Promise((resolve, reject) => {
      response.body.pipe(fileStream);
      response.body.on('error', reject);
      fileStream.on('finish', resolve);
    });
    
    logger.info('Video downloaded: ' + filePath, { fileId, fileName });
    
    // Conditionally ask who made the play based on feature flag
    if (featureFlags.isWhoMadePlayEnabled()) {
      ctx.reply('Thanks for the video! Who made the play? 🏀');
    } else {
      // If feature is disabled, automatically add to playlist with default text
      const resolvedPath = path.resolve(state.filePath);
      const playlistEntry = 'file \'' + resolvedPath + '\'\n';
      fs.appendFileSync(FFMPG_PLAYLIST_PATH, playlistEntry);
      
      // Create default metadata
      const metadata = {
        filename: state.fileName,
        fileId: state.fileId,
        timestamp: state.timestamp,
        sender: ctx.from.username || ctx.from.first_name,
        submitter: 'Player Unknown',
        processed: false
      };
      
      const metadataPath = path.join(PENDING_VIDEOS_DIR, `${state.fileName}.json`);
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
      
      logger.info('Video added to playlist with default metadata: ' + metadataPath, { sender: metadata.sender });
      
      // Confirm addition
      ctx.reply('Your video has been added to the highlight reel queue.');
    }
    
  } catch (error) {
    logger.error('Error handling video:', error);
    ctx.reply('Sorry, there was an error processing your video. Please try again.');
  }
});

// Handle text messages (for who made the play)
bot.on('text', async (ctx) => {
  if (!featureFlags.isWhoMadePlayEnabled()) {
    return; // Ignore text messages if feature is disabled
  }
  
  const state = playSubmissionState.get(ctx.from.id);
  
  if (state) {
    const submitter = ctx.message.text.trim();
    
    // Create metadata
    const metadata = {
      filename: state.fileName,
      fileId: state.fileId,
      timestamp: state.timestamp,
      sender: ctx.from.username || ctx.from.first_name,
      submitter: submitter,
      processed: false
    };
    
    const metadataPath = path.join(PENDING_VIDEOS_DIR, `${state.fileName}.json`);
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    
    // Add to FFmpeg playlist
    const resolvedPath = path.resolve(state.filePath);
    const playlistEntry = 'file \'' + resolvedPath + '\'\n';
    fs.appendFileSync(FFMPG_PLAYLIST_PATH, playlistEntry);
    
    logger.info('Video metadata saved and added to playlist: ' + metadataPath, { submitter, sender: metadata.sender });
    
    // Clear state
    playSubmissionState.delete(ctx.from.id);
    
    // Confirm
    ctx.reply('Got it! Video saved with submitter: ' + submitter + ' 🎉\n' +
            'Your video has been added to the highlight reel queue.');
  }
});

// Render command - this would be used by admin to create final video
bot.command('render', async (ctx) => {
  // In a real implementation, you'd want to restrict this to admin users
  // For now, we'll just proceed
  
  try {
    const playlistExists = fs.existsSync(FFMPG_PLAYLIST_PATH);
    if (!playlistExists) {
      ctx.reply('No videos in the playlist yet. Send some videos first!');
      return;
    }
    
    const playlistContent = fs.readFileSync(FFMPG_PLAYLIST_PATH, 'utf8');
    const videoCount = playlistContent.split('\n').filter(line => line.trim().startsWith('file ')).length;
    
    if (videoCount === 0) {
      ctx.reply('Playlist is empty. Send some videos first!');
      return;
    }
    
    ctx.reply('🎯 Starting to render highlight reel with ' + videoCount + ' videos... This may take a while.');
    
    // Collect metadata for all videos in the playlist
    const videoMetadata = [];
    const pendingFiles = fs.readdirSync(PENDING_VIDEOS_DIR);
    
    // Extract video metadata from JSON files
    for (const file of pendingFiles) {
      if (file.endsWith('.json')) {
        try {
          const metadataPath = path.join(PENDING_VIDEOS_DIR, file);
          const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
          
          // Get video duration using ffprobe
          const videoPath = path.join(PENDING_VIDEOS_DIR, metadata.filename);
          if (fs.existsSync(videoPath)) {
            const duration = await getVideoDuration(videoPath);
            metadata.duration = duration;
          }
          
          videoMetadata.push(metadata);
        } catch (err) {
          logger.error('Error reading metadata file:', err);
        }
      }
    }
    
    // Create output filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputFileName = 'highlight-reel-' + timestamp + '.mp4';
    const outputPath = path.join(FINAL_VIDEOS_DIR, outputFileName);
    
    // Use the video processor to create the highlight reel with subtitles
    const videoProcessor = require('./video-processor');
    
    const options = {};
    if (featureFlags.isSlowMotionEnabled()) {
      // Add slow motion options when feature is enabled
      options.slowMotionClips = videoMetadata.filter((meta, index) => {
        // Example: apply slow motion to first video
        return index === 0;
      });
    }
    
    videoProcessor.processHighlightReel(
      FFMPG_PLAYLIST_PATH, 
      outputPath, 
      videoMetadata,
      options
    ).then((finalPath) => {
      logger.info('Highlight reel created: ' + finalPath);
      ctx.reply('✅ Rendering complete! Your highlight reel with ' + videoCount + ' videos is ready.');
    }).catch((error) => {
      logger.error('Error creating highlight reel:', error);
      ctx.reply('❌ Error rendering the highlight reel. Please try again later.');
    });
    
  } catch (error) {
    logger.error('Render command error:', error);
    ctx.reply('❌ Error starting render process.');
  }
});

// Error handling
bot.catch((err, ctx) => {
  logger.error('Error for ' + ctx.updateType, err);
});

// Launch bot
bot.launch();

logger.info('Gay Highlight Reel Bot is running...');

// Start Express server
app.listen(PORT, () => {
    logger.info(`Web interface server running on port ${PORT}`);
    logger.info(`Web interface available at http://localhost:${PORT}`);
});

// Enable graceful stop
process.once('SIGINT', () => {
    bot.stop('SIGINT');
    process.exit(0);
});
process.once('SIGTERM', () => {
    bot.stop('SIGTERM');
    process.exit(0);
});