const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const path = require('path');
const fs = require('fs');
const winston = require('winston');
const featureFlags = require('./feature-flags');

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegStatic);

/**
 * Process and stitch videos with Phase 1 features
 * @param {string} playlistPath - Path to FFmpeg concat playlist
 * @param {string} outputPath - Output path for final video
 * @param {Array} videoMetadata - Array of metadata objects for each video
 * @param {Object} options - Processing options
 * @returns {Promise} Resolves when processing is complete
 */
async function processHighlightReel(playlistPath, outputPath, videoMetadata, options = {}) {
  return new Promise((resolve, reject) => {
    // Validate inputs
    if (!fs.existsSync(playlistPath)) {
      return reject(new Error(`Playlist file not found: ${playlistPath}`));
    }

    // Create FFmpeg command
    let command = ffmpeg()
      .input(playlistPath)
      .inputOptions(['-f', 'concat', '-safe', '0']);

    // Apply video and audio codecs
    command = command
      .videoCodec('libx264')
      .audioCodec('aac')
      .output(outputPath);

    // Add subtitle filter if feature is enabled
    if (videoMetadata && videoMetadata.length > 0 && featureFlags.isWhoMadePlayEnabled()) {
      const filters = [];
      
      // Calculate time offsets for each video
      let currentTime = 0;
      
      videoMetadata.forEach((meta, index) => {
        if (!meta.submitter) return;
        
        // Extract video duration from metadata file
        const duration = meta.duration || 10; // default to 10 seconds if not available
        
        // Create subtitle filter for this segment
        // Position at bottom center, semi-transparent black background
        const filter = 
          'drawtext=' +
          'text=\\\'Who made the play: ' + meta.submitter + '\\\':' +
          'fontsize=48:fontcolor=white:box=1:boxcolor=black@0.5:boxborderw=10:shadowcolor=black:shadowx=2:shadowy=2:' +
          'x=(w-text_w)/2:y=h-th-50:' +
          'enable=\\\'between(t,' + currentTime + ',' + (currentTime + duration) + ')\\\'';
          
        filters.push(filter);
        currentTime += duration;
      });
      
      if (filters.length > 0) {
        command = command.videoFilters(filters.join(','));
      }
    }

    // Handle slow motion requests
    if (options.slowMotionClips && options.slowMotionClips.length > 0) {
      // This would require a more complex filter approach
      // For now, we'll log that this feature is not yet implemented
      console.log('Slow motion processing not yet implemented');
    }

    // Event handlers
    command.on('start', (commandLine) => {
      console.log('FFmpeg command started:', commandLine);
    });

    command.on('progress', (progress) => {
      if (progress.timemark) {
        console.log(`Processing: ${progress.timemark} / ${progress.targetDuration}`);
      }
    });

    command.on('end', () => {
      console.log(`Highlight reel created: ${outputPath}`);
      resolve(outputPath);
    });

    command.on('error', (err) => {
      console.error('FFmpeg error:', err);
      reject(err);
    });

    // Start the command
    command.run();
  });
}

/**
 * Extract video duration from file
 * @param {string} videoPath - Path to video file
 * @returns {Promise<number>} Duration in seconds
 */
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

module.exports = {
  processHighlightReel,
  getVideoDuration
};