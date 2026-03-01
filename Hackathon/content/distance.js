class DistanceMonitor {
  constructor() {
    this.warningActive = false;
    this.videoElement = null;
    this.warningElement = null;
    this.mouseFallbackActive = false;
    this.statsBuffer = { warningsTriggered: 0 };
    this.init();
  }

  async init() {
    try {
      await this.injectStyles();
      this.settings = await this.getSettings();
      this.setupWarningElement(); // Create warning first
      
      try {
        await this.loadFaceAPI();
        await this.setupCamera();
        this.startDetection();
      } catch (error) {
        console.error('AI setup failed:', error);
        this.setupMouseFallback();
      }
      
      setInterval(() => this.flushStats(), 30000);
    } catch (error) {
      console.error('Initialization failed:', error);
      this.setupMouseFallback();
    }
  }

  async getSettings() {
    return new Promise(resolve => {
      chrome.runtime.sendMessage(
        { type: 'GET_SETTINGS' },
        response => resolve(response || { 
          distanceThreshold: 150,
          isActive: true 
        })
      );
    });
  }

  async injectStyles() {
    if (document.head.querySelector('#fg-distance-styles')) return;

    const style = document.createElement('style');
    style.id = 'fg-distance-styles';
    style.textContent = `
      .fg-distance-warning {
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #fff3e0;
        color: #e65100;
        padding: 12px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 99999;
        font-weight: 600;
        display: none;
        align-items: center;
      }
      .fg-camera-feed {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 120px;
        height: 90px;
        border-radius: 8px;
        border: 2px solid #4285f4;
        z-index: 99998;
        opacity: 0;
        object-fit: cover;
        display: none;
      }
    `;
    document.head.appendChild(style);
  }

  async loadFaceAPI() {
    if (!window.faceapi) {
      // Dynamically load face-api.js if not available
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('assets/face-api.min.js');
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }
    
    await faceapi.nets.tinyFaceDetector.loadFromUri(
      chrome.runtime.getURL('assets/models')
    );
  }

  async setupCamera() {
    this.videoElement = document.createElement('video');
    this.videoElement.className = 'fg-camera-feed';
    this.videoElement.autoplay = true;
    this.videoElement.muted = true;
    this.videoElement.playsInline = true;
    document.body.appendChild(this.videoElement);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' } 
      });
      this.videoElement.srcObject = stream;
      this.videoElement.style.display = 'block';
    } catch (error) {
      this.videoElement.remove();
      throw error;
    }
  }

  setupWarningElement() {
    if (this.warningElement) return;
    
    this.warningElement = document.createElement('div');
    this.warningElement.className = 'fg-distance-warning';
    this.warningElement.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" style="margin-right: 8px;">
        <path fill="#e65100" d="M12 2L1 21h22L12 2zm0 3.5L19.5 19h-15L12 5.5z"/>
        <circle cx="12" cy="16.5" r="1" fill="#e65100"/>
        <path fill="#e65100" d="M12 8v5"/>
      </svg>
      You're too close! Move back.
    `;
    document.body.appendChild(this.warningElement);
  }

  startDetection() {
    this.detectionInterval = setInterval(async () => {
      if (!this.settings.isActive || !this.videoElement) {
        this.hideWarning();
        return;
      }

      try {
        const detections = await faceapi.detectAllFaces(
          this.videoElement,
          new faceapi.TinyFaceDetectorOptions({ inputSize: 160 })
        );

        if (detections.length > 0 && 
            detections[0].box.width > (this.settings.distanceThreshold || 150)) {
          this.showWarning();
        } else {
          this.hideWarning();
        }
      } catch (error) {
        console.error('Detection error:', error);
        this.handleDetectionError();
      }
    }, 1000);
  }

  showWarning() {
    if (this.warningActive || !this.warningElement) return;
    
    try {
      this.warningElement.style.display = 'flex';
      this.warningActive = true;
      
      if (navigator.vibrate) {
        navigator.vibrate(200).catch(() => {});
      }
      
      this.statsBuffer.warningsTriggered++;
    } catch (error) {
      console.error('Failed to show warning:', error);
    }
  }

  hideWarning() {
    if (!this.warningActive || !this.warningElement) return;
    
    try {
      this.warningElement.style.display = 'none';
      this.warningActive = false;
    } catch (error) {
      console.error('Failed to hide warning:', error);
    }
  }

  setupMouseFallback() {
    if (this.mouseFallbackActive) return;
    this.mouseFallbackActive = true;
    
    const handler = (e) => {
      if (e.clientY < 50) {
        this.showWarning();
        setTimeout(() => this.hideWarning(), 2000);
      }
    };
    
    document.addEventListener('mousemove', handler);
    this.mouseMoveHandler = handler;
  }

  handleDetectionError() {
    clearInterval(this.detectionInterval);
    if (this.videoElement?.srcObject) {
      this.videoElement.srcObject.getTracks().forEach(track => track.stop());
      this.videoElement.remove();
    }
    this.setupMouseFallback();
  }

  flushStats() {
    if (this.statsBuffer.warningsTriggered > 0) {
      chrome.runtime.sendMessage({
        type: 'INCREMENT_STATS',
        data: { warningsTriggered: this.statsBuffer.warningsTriggered }
      }).catch(() => {});
      this.statsBuffer.warningsTriggered = 0;
    }
  }
}

// Initialize with protection
if (!window.focusGuardDistanceMonitor) {
  window.focusGuardDistanceMonitor = new DistanceMonitor();
}