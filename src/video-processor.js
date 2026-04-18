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
    if (featureFlags.isSlowMotionEnabled() && options.slowMotionSegments && options.slowMotionSegments.length > 0) {
      // We'll use a complex filter chain to apply slow motion to specific time segments
      // First, we need to calculate the time ranges for each clip
      let currentTime = 0;
      const clipSegments = [];
      
      // Calculate the time ranges for each clip
      videoMetadata.forEach((meta, index) => {
        const duration = meta.duration || 10; // default to 10 seconds
        const segment = {
          index,
          start: currentTime,
          end: currentTime + duration,
          duration: duration,
          metadata: meta
        };
        clipSegments.push(segment);
        currentTime += duration;
      });
      
      // Build the filter complex
      // We'll use the select filter to split the video into segments,
      // apply slow motion to selected segments, then concat them back
      
      // For simplicity, we'll use a single filter complex that applies slow motion
      // to clips that are in the slowMotionClips array
      
      // Create a filter that applies slow motion based on time ranges
      const filterComplex = [];
      
      // Counter for filter labels
      let filterId = 0;
      
      // Create segments for processing
      // We need to split the timeline into segments that are either in slow motion or not
      const timelineSegments = [];
      let currentStart = 0;
      let currentEnd = currentTime; // total duration
      
      // Sort slow motion segments by start time
      const sortedSlowMotion = [...options.slowMotionSegments].sort((a, b) => a.startTime - b.startTime);
      
      // Add boundaries for all slow motion segments
      const boundaries = new Set();
      boundaries.add(currentStart);
      boundaries.add(currentEnd);
      
      sortedSlowMotion.forEach(segment => {
        boundaries.add(segment.startTime);
        boundaries.add(segment.endTime);
      });
      
      // Create timeline segments from boundaries
      const sortedBoundaries = Array.from(boundaries).sort((a, b) => a - b);
      
      for (let i = 0; i < sortedBoundaries.length - 1; i++) {
        const start = sortedBoundaries[i];
        const end = sortedBoundaries[i + 1];
        
        // Determine if this segment should be in slow motion
        const inSlowMotion = sortedSlowMotion.some(slowMo => 
          slowMo.startTime <= start && slowMo.endTime >= end
        );
        
        timelineSegments.push({
          start,
          end,
          duration: end - start,
          inSlowMotion
        });
      }
      
      // Process each timeline segment
      timelineSegments.forEach((segment, idx) => {
        const startLabel = `[in]trim=start=${segment.start}:end=${segment.end},setpts=PTS-STARTPTS[v${filterId}]`;
        
        if (segment.inSlowMotion) {
          // Apply slow motion (adjust speed factor from options, default to 0.5)
          const speedFactor = segment.speed || 0.5;
          const timeFactor = 1 / speedFactor;
          
          // Apply slow motion to video
          const slowMotionLabel = `[v${filterId}]setpts=PTS*${timeFactor}[a${filterId}]`;
          // Adjust audio tempo to match video speed
          const audioFilter = `[in]atrim=start=${segment.start}:end=${segment.end},asetpts=PTS-STARTPTS,atempo=${speedFactor}[b${filterId}]`;
          
          filterComplex.push(startLabel, slowMotionLabel, audioFilter);
        } else {
          // Just pass through
          const passThroughLabel = `[v${filterId}]copy[c${filterId}]`;
          const audioPassThrough = `[in]atrim=start=${segment.start}:end=${segment.end},asetpts=PTS-STARTPTS,atempo=1.0[d${filterId}]`;
          filterComplex.push(startLabel, passThroughLabel, audioPassThrough);
        }
        
        filterId++;
      });
      
      // Now concat all the processed segments
      // Create video and audio concat filters
      const videoInputs = [];
      const audioInputs = [];
      
      for (let i = 0; i < timelineSegments.length; i++) {
        const segment = timelineSegments[i];
        if (segment.inSlowMotion) {
          videoInputs.push(`[a${i}]`);
          audioInputs.push(`[b${i}]`);
        } else {
          videoInputs.push(`[c${i}]`);
          audioInputs.push(`[d${i}]`);
        }
      }
      
      // Add the concat filters
      filterComplex.push(`${videoInputs.join('')}concat=n=${timelineSegments.length}:v=1:a=0[outv]`);
      filterComplex.push(`${audioInputs.join('')}concat=n=${timelineSegments.length}:v=0:a=1[outa]`);
      
      // Apply the filter complex
      command = command
        .complexFilter(filterComplex.join(';'), ['outv', 'outa'])
        .map('[outv]')
        .map('[outa]');
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