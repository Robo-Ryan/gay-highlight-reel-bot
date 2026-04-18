// Video Highlight Reel Editor
// Handles frame selection and slow motion marker management

class VideoEditor {
    constructor() {
        this.video = document.getElementById('video');
        this.timeline = document.getElementById('timeline');
        this.markersContainer = document.getElementById('markers');
        this.currentTimeDisplay = document.getElementById('current-time');
        
        this.markers = [];
        this.isPlaying = false;
        this.playbackRate = 1.0;
        
        this.init();
    }

    init() {
        // Event listeners for video controls
        this.video.addEventListener('timeupdate', () => this.onTimeUpdate());
        this.video.addEventListener('play', () => this.isPlaying = true);
        this.video.addEventListener('pause', () => this.isPlaying = false);
        
        // Timeline click for seeking
        this.timeline.addEventListener('click', (e) => this.onTimelineClick(e));
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.onKeyPress(e));
        
        // Initialize UI
        this.updateCurrentTime();
    }

    onTimeUpdate() {
        this.updateCurrentTime();
        this.updateActiveMarker();
    }

    updateCurrentTime() {
        if (this.currentTimeDisplay) {
            const time = this.formatTime(this.video.currentTime);
            this.currentTimeDisplay.textContent = time;
        }
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    onTimelineClick(e) {
        const rect = this.timeline.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        const newTime = percent * this.video.duration;
        this.video.currentTime = newTime;
    }

    onKeyPress(e) {
        // Space: play/pause
        if (e.code === 'Space') {
            e.preventDefault();
            this.togglePlay();
        }
        
        // Arrow Right: forward 1 second
        if (e.code === 'ArrowRight') {
            this.video.currentTime += 1;
        }
        
        // Arrow Left: back 1 second
        if (e.code === 'ArrowLeft') {
            this.video.currentTime -= 1;
        }
        
        // K: add marker at current time
        if (e.code === 'KeyK') {
            e.preventDefault();
            this.addMarker();
        }
    }

    togglePlay() {
        if (this.video.paused) {
            this.video.play();
        } else {
            this.video.pause();
        }
    }

    addMarker() {
        const time = this.video.currentTime;
        const marker = {
            id: Date.now(),
            time: time,
            label: `Slow motion @ ${this.formatTime(time)}`
        };
        
        this.markers.push(marker);
        this.renderMarkers();
        this.saveMarkers();
    }

    // Set the video ID for API requests
    setVideoId(videoId) {
        this.videoId = videoId;
    }

    renderMarkers() {
        if (!this.markersContainer) return;
        
        this.markersContainer.innerHTML = '';
        
        this.markers.forEach(marker => {
            const markerEl = document.createElement('div');
            markerEl.className = 'marker';
            markerEl.style.left = `${(marker.time / this.video.duration) * 100}%`;
            
            const markerDot = document.createElement('div');
            markerDot.className = 'marker-dot';
            markerDot.title = marker.label;
            
            const markerLabel = document.createElement('div');
            markerLabel.className = 'marker-label';
            markerLabel.textContent = marker.label;
            
            markerEl.appendChild(markerDot);
            markerEl.appendChild(markerLabel);
            this.markersContainer.appendChild(markerEl);
        });
    }

    updateActiveMarker() {
        const currentTime = this.video.currentTime;
        
        // Find markers near current time
        const nearMarkers = this.markers.filter(m => 
            Math.abs(m.time - currentTime) < 0.1 // 100ms threshold
        );
        
        // Highlight active markers
        const markerElements = document.querySelectorAll('.marker');
        markerElements.forEach(el => {
            const markerTime = parseFloat(el.style.left) * this.video.duration / 100;
            const isActive = Math.abs(markerTime - currentTime) < 0.1;
            
            const dot = el.querySelector('.marker-dot');
            if (dot) {
                dot.classList.toggle('active', isActive);
            }
        });
    }

    saveMarkers() {
        const data = {
            version: '1.0',
            markers: this.markers,
            videoDuration: this.video.duration,
            timestamp: new Date().toISOString()
        };
        
        // Save to localStorage as fallback
        localStorage.setItem('video-markers', JSON.stringify(data));
        
        // Also save to server if available
        this.saveMarkersToServer(data);
    }

    async saveMarkersToServer(data) {
        if (!this.videoId) {
            console.error('Video ID not set. Cannot save markers.');
            return;
        }
        
        try {
            const response = await fetch(`/api/markers/${this.videoId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            
            if (!response.ok) {
                console.error('Failed to save markers to server');
            }
        } catch (error) {
            console.error('Error saving markers to server:', error);
            // Fall back to localStorage
        }
    }

    async loadMarkers() {
        try {
        // Try to load from server first
        try {
            const response = await fetch(`/api/markers/${this.videoId}`);
            
            if (response.ok) {
                const data = await response.json();
                this.markers = data.markers || [];
                this.renderMarkers();
                return;
            }
        } catch (error) {
            console.error('Error loading markers from server:', error);
        }
        
            if (response.ok) {
                const data = await response.json();
                this.markers = data.markers || [];
                this.renderMarkers();
                return;
            }
        } catch (error) {
            console.log('Using localStorage markers as fallback');
        }
        
        // Fall back to localStorage
        const saved = localStorage.getItem('video-markers');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                this.markers = data.markers || [];
                this.renderMarkers();
            } catch (e) {
                console.error('Failed to parse saved markers:', e);
            }
        }
    }
}

// Initialize editor when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.editor = new VideoEditor();
    
    // Load existing markers
    if (window.editor) {
        window.editor.loadMarkers();
    }
});