const express = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Directory to store marker data
const MARKERS_DIR = path.join(__dirname, '../../data/markers');

// Ensure markers directory exists
if (!fs.existsSync(MARKERS_DIR)) {
    fs.mkdirSync(MARKERS_DIR, { recursive: true });
}

// Helper to get marker file path for a video
function getMarkerFilePath(videoId) {
    return path.join(MARKERS_DIR, `${videoId}.json`);
}

// GET /api/markers/:videoId - Get markers for a specific video
router.get('/:videoId', (req, res) => {
    try {
        const videoId = req.params.videoId;
        const markerFile = getMarkerFilePath(videoId);
        
        if (fs.existsSync(markerFile)) {
            const data = fs.readFileSync(markerFile, 'utf8');
            const markers = JSON.parse(data);
            res.json(markers);
        } else {
            // Return default empty structure if no markers exist
            res.json({
                version: '1.0',
                markers: [],
                videoDuration: 0,
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error('Error reading markers:', error);
        res.status(500).json({ error: 'Failed to read markers' });
    }
});

// POST /api/markers/:videoId - Save markers for a specific video
router.post('/:videoId', (req, res) => {
    try {
        const videoId = req.params.videoId;
        const markerFile = getMarkerFilePath(videoId);
        
        // Validate request body
        if (!req.body || !Array.isArray(req.body.markers)) {
            return res.status(400).json({ error: 'Invalid markers data' });
        }
        
        // Add/update timestamp
        const data = {
            ...req.body,
            timestamp: new Date().toISOString()
        };
        
        // Save to file
        fs.writeFileSync(markerFile, JSON.stringify(data, null, 2), 'utf8');
        
        res.json({ success: true, message: 'Markers saved successfully' });
    } catch (error) {
        console.error('Error saving markers:', error);
        res.status(500).json({ error: 'Failed to save markers' });
    }
});

// GET /api/markers/:videoId/export - Export markers for processing
router.get('/:videoId/export', (req, res) => {
    try {
        const videoId = req.params.videoId;
        const markerFile = getMarkerFilePath(videoId);
        
        if (fs.existsSync(markerFile)) {
            const data = fs.readFileSync(markerFile, 'utf8');
            const markers = JSON.parse(data);
            
            // Convert to format suitable for FFmpeg processing
            const exportData = {
                videoId: videoId,
                duration: markers.videoDuration,
                slowMotionSegments: markers.markers.map(marker => ({
                    id: marker.id || uuidv4(),
                    startTime: marker.time,
                    endTime: marker.time + 2, // Default 2 seconds duration
                    speed: 0.5 // 50% speed
                }))
            };
            
            res.json(exportData);
        } else {
            res.status(404).json({ error: 'No markers found for this video' });
        }
    } catch (error) {
        console.error('Error exporting markers:', error);
        res.status(500).json({ error: 'Failed to export markers' });
    }
});

module.exports = router;