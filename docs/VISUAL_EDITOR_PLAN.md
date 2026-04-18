# Visual Editor for Highlight Reel: Frame-Accurate Slow Motion Controls

## Overview

A web-based visual editor that allows users to precisely select and apply slow motion effects to specific segments of the highlight reel before final rendering.

## User Workflow

1. User sends videos to @GayHighlightReelBot
2. Videos are queued and metadata is collected
3. User initiates `/edit` command when ready to create final reel
4. System generates short preview (10-15 seconds) with all clips
5. User accesses web interface to mark slow motion segments
6. User confirms edits and triggers final rendering

## Architecture

### Frontend Components

1. **Video Timeline**
   - Frame-accurate scrubber
   - Clip boundaries visible
   - Playhead position display

2. **Selection Tools**
   - Click and drag to select segments
   - Precision controls (frame-by-frame navigation)
   - Multiple segment selection
   - Speed factor dropdown (0.2x, 0.3x, 0.5x, 0.8x)

3. **Preview Window**
   - Real-time slow motion preview
   - Audio pitch correction toggle
   - Duration display

4. **Control Panel**
   - Save/Load edit session
   - Reset all edits
   - Apply to final render

## Technical Implementation

### Backend Services

1. **REST API Endpoints**
   - `GET /api/preview` - Generate short preview video
   - `GET /api/timeline` - Get video structure and metadata
   - `POST /api/slowmotion` - Save slow motion markers
   - `POST /api/render` - Trigger final rendering with edits

2. **FFmpeg Processing**
   ```bash
   # Extract segment
   ffmpeg -i input.mp4 -ss 00:00:12.5 -to 00:00:15.7 -c copy segment.mp4
   
   # Apply slow motion
   ffmpeg -i segment.mp4 -filter:v "setpts=2.0*PTS" -filter:a "atempo=0.5" slow_segment.mp4
   
   # Recombine
   ffmpeg -f concat -i list.txt -c copy output.mp4
   ```

3. **Marker Storage**
   - JSON format with precise timing
   ```json
   {
     "slow_motion_segments": [
       {
         "start": 12.5,
         "end": 15.7,
         "speed_factor": 0.5,
         "pitch_correct": true
       }
     ]
   }
   ```

## Integration with Current System

1. **Authentication**
   - Use Telegram login widget
   - Verify user via bot communication

2. **Deployment**
   - Run web server on old Mac
   - Use Tailscale for secure access
   - Port forwarding through Tailscale Funnel

3. **Workflow Integration**
   - Bot sends edit link via Telegram
   - Status updates sent to user
   - Final render notification

## Security Considerations

- All access controlled through Telegram authentication
- Video files stored with restricted permissions
- No public exposure of media files
- Tailscale encryption for all data transfer

## Future Enhancements

- Mobile-responsive interface
- Social sharing options
- Comment annotations
- Multiple preset speed profiles
- Export to different formats

## Implementation Roadmap

1. Phase 1: Basic timeline with single segment selection
2. Phase 2: Multiple segments and speed options
3. Phase 3: Real-time preview and audio controls
4. Phase 4: Save/load sessions and collaboration