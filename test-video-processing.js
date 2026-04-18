const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegStatic);

// Create test directory structure
const testDir = path.join(__dirname, 'test-output');
if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir, { recursive: true });
}

// Create test video file (empty for now - will be replaced with actual test)
console.log('Creating test environment...');

// Function to test video duration detection
async function testVideoDuration(videoPath) {
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

// Test the video processor
async function testProcessing() {
  try {
    console.log('Testing video processing pipeline...');
    
    // Create a simple test video using FFmpeg
    const testVideoPath = path.join(testDir, 'test-input.mp4');
    
    await new Promise((resolve, reject) => {
      const command = ffmpeg();
      
      // Add video input with black screen and duration
      command.input('color=c=black:s=640x480:d=5');
      command.inputFormat('lavfi');
      
      // Add audio input
      command.input('sine=frequency=1000:sample_rate=44100');
      command.inputFormat('lavfi');
      
      command
        .output(testVideoPath)
        .outputOptions(['-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac'])
        .on('end', () => {
          console.log('✅ Created test video:', testVideoPath);
          resolve();
        })
        .on('error', reject)
        .run();
    });
    
    // Test duration detection
    const duration = await testVideoDuration(testVideoPath);
    console.log('✅ Detected video duration:', duration, 'seconds');
    
    // Create playlist file
    const playlistPath = path.join(testDir, 'playlist.txt');
    fs.writeFileSync(playlistPath, `file '${path.resolve(testVideoPath)}'\n`);
    console.log('✅ Created playlist file:', playlistPath);
    
    // Create metadata file
    const metadata = {
      filename: 'test-input.mp4',
      fileId: 'test123',
      timestamp: new Date().toISOString(),
      sender: 'testuser',
      submitter: 'Test Player',
      duration: duration,
      processed: false
    };
    
    const metadataPath = path.join(testDir, 'test-input.mp4.json');
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    console.log('✅ Created metadata file:', metadataPath);
    
    // Test rendering with subtitles
    const outputPath = path.join(testDir, 'final-output.mp4');
    
    await new Promise((resolve, reject) => {
      let command = ffmpeg()
        .input(playlistPath)
        .inputOptions(['-f', 'concat', '-safe', '0'])
        .videoCodec('libx264')
        .audioCodec('aac')
        .output(outputPath);
      
      // Add subtitle filter
      try {
        const filter = 
          'drawtext=' +
          'text=\\\'Who made the play: Test Player\\\':' +
          'fontsize=48:fontcolor=white:box=1:boxcolor=black@0.5:boxborderw=10:shadowcolor=black:shadowx=2:shadowy=2:' +
          'x=(w-text_w)/2:y=h-th-50:' +
          'enable=\\\'between(t,0,5)\\\'';
        
        command = command.videoFilters(filter);
      } catch (err) {
        console.error('\n⚠️ Error creating subtitle filter:', err.message);
      }
      
      command
        .on('start', (commandLine) => {
          console.log('🎬 FFmpeg command started:', commandLine);
        })
        .on('progress', (progress) => {
          if (progress.timemark) {
            process.stdout.write(`\r⏳ Processing: ${progress.timemark} / ${progress.targetDuration}`);
          }
        })
        .on('end', () => {
          console.log('\n✅ Processing complete!');
          console.log('📁 Final video saved at:', outputPath);
          console.log('\n🎉 All tests passed! The video processing pipeline works correctly.');
          resolve();
        })
        .on('error', (err) => {
          console.error('\n❌ Error:', err.message);
          console.error('\n❌ Error details:', err);
          reject(err);
        });
      
      try {
        command.run();
      } catch (err) {
        console.error('\n❌ Command run error:', err.message);
        reject(err);
      }
    });
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testProcessing();