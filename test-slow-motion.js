const path = require('path');
const fs = require('fs');
const { processHighlightReel } = require('./src/video-processor');

// Test configuration
const TEST_PLAYLIST_PATH = path.join(__dirname, 'test-playlist.txt');
const TEST_OUTPUT_PATH = path.join(__dirname, 'test-output', 'test-slow-motion.mp4');
const TEST_VIDEOS_DIR = path.join(__dirname, 'test-videos');

// Create test videos directory if it doesn't exist
if (!fs.existsSync(TEST_VIDEOS_DIR)) {
    fs.mkdirSync(TEST_VIDEOS_DIR, { recursive: true });
}

// Create test output directory if it doesn't exist
if (!fs.existsSync(path.dirname(TEST_OUTPUT_PATH))) {
    fs.mkdirSync(path.dirname(TEST_OUTPUT_PATH), { recursive: true });
}

// Create a test playlist file
const testPlaylistContent = `
file '${path.join(TEST_VIDEOS_DIR, 'test1.mp4').replace(/\\/g, '/')}'
file '${path.join(TEST_VIDEOS_DIR, 'test2.mp4').replace(/\\/g, '/')}'
file '${path.join(TEST_VIDEOS_DIR, 'test3.mp4').replace(/\\/g, '/')}'
`;

fs.writeFileSync(TEST_PLAYLIST_PATH, testPlaylistContent);

// Create test video metadata
const videoMetadata = [
    {
        filename: 'test1.mp4',
        fileId: 'test1',
        timestamp: new Date().toISOString(),
        sender: 'test_sender',
        submitter: 'Player One',
        processed: false,
        duration: 10
    },
    {
        filename: 'test2.mp4',
        fileId: 'test2',
        timestamp: new Date().toISOString(),
        sender: 'test_sender',
        submitter: 'Player Two',
        processed: false,
        duration: 15
    },
    {
        filename: 'test3.mp4',
        fileId: 'test3',
        timestamp: new Date().toISOString(),
        sender: 'test_sender',
        submitter: 'Player Three',
        processed: false,
        duration: 12
    }
];

// Create test slow motion segments
const slowMotionSegments = [
    {
        id: '1',
        startTime: 5,
        endTime: 15,
        speed: 0.5
    },
    {
        id: '2',
        startTime: 25,
        endTime: 30,
        speed: 0.3
    }
];

// Create test video files (empty files for now - FFmpeg will fail but we can see the command)
[1, 2, 3].forEach(i => {
    const videoPath = path.join(TEST_VIDEOS_DIR, `test${i}.mp4`);
    if (!fs.existsSync(videoPath)) {
        fs.writeFileSync(videoPath, '');
    }
});

// Test the slow motion functionality
console.log('Testing slow motion functionality...');
console.log('Input playlist:', TEST_PLAYLIST_PATH);
console.log('Output path:', TEST_OUTPUT_PATH);
console.log('Slow motion segments:', slowMotionSegments);

processHighlightReel(
    TEST_PLAYLIST_PATH,
    TEST_OUTPUT_PATH,
    videoMetadata,
    { slowMotionSegments }
).then((outputPath) => {
    console.log('Test completed successfully! Output:', outputPath);
}).catch((error) => {
    console.error('Test failed:', error);
});