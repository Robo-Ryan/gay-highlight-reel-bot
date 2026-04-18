const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const path = require('path');
const fs = require('fs');

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegStatic);

// Create test directory
const testDir = path.join(__dirname, 'test-output');
if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir, { recursive: true });
}

// Test subtitle addition
async function testSubtitle() {
  try {
    console.log('Testing subtitle functionality...');
    
    const inputPath = path.join(testDir, 'test-input.mp4');
    const outputPath = path.join(testDir, 'with-subtitle.mp4');
    
    // Check if input file exists
    if (!fs.existsSync(inputPath)) {
      console.log('⚠️ Test input video not found. Creating test video...');
      // Create a simple test video
      await new Promise((resolve, reject) => {
        ffmpeg()
          .input('color=c=black:s=640x480:d=5')
          .inputFormat('lavfi')
          .input('sine=frequency=1000:sample_rate=44100')
          .inputFormat('lavfi')
          .output(inputPath)
          .outputOptions(['-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac'])
          .on('end', () => {
            console.log('✅ Created test video:', inputPath);
            resolve();
          })
          .on('error', reject)
          .run();
      });
    }
    
    // Test subtitle filter
    await new Promise((resolve, reject) => {
      const filter = 'drawtext=text=Who made the play: Test Player:fontcolor=white:fontsize=48:box=1:boxcolor=black@0.5:boxborderw=10:shadowcolor=black:shadowx=2:shadowy=2:x=(w-text_w)/2:y=h-th-50:enable=between(t,0,5)';
      
      console.log('✅ Generated filter string:');
      console.log(filter);
      
      ffmpeg(inputPath)
        .complexFilter([{
          filter: 'drawtext',
          options: {
            text: 'Who made the play: Test Player',
            fontcolor: 'white',
            fontsize: 48,
            box: 1,
            boxcolor: 'black@0.5',
            boxborderw: 10,
            shadowcolor: 'black',
            shadowx: 2,
            shadowy: 2,
            x: '(w-text_w)/2',
            y: 'h-th-50',
            enable: 'between(t,0,5)'
          }
        }])
        .output(outputPath)
        .on('start', (command) => {
          console.log('✅ Command started:');
          console.log(command);
        })
        .on('error', (err, stdout, stderr) => {
          console.log('❌ Error:');
          console.log(err);
          console.log('STDOUT:');
          console.log(stdout);
          console.log('STDERR:');
          console.log(stderr);
          reject(err);
        })
        .on('end', () => {
          console.log('✅ Subtitle test completed! Output saved to:', outputPath);
          resolve();
        })
        .run();
    });
    
  } catch (error) {
    console.log('❌ Test failed:', error);
    process.exit(1);
  }
}

testSubtitle();