class BackgroundService {
  constructor() {
    this.defaultSettings = {
      blockedKeywords: ['shorts', '#shorts'],
      distanceThreshold: 180,
      isActive: true,
      stats: {
        videosBlocked: 0,
        warningsTriggered: 0,
        lastReset: Date.now()
      }
    };
    this.init();
  }

  async init() {
    await this.setupStorage();
    this.setupAlarms();
    this.setupListeners();
    console.log('Background service initialized');
  }

  async setupStorage() {
    try {
      const current = await chrome.storage.local.get(null);
      this.settings = { ...this.defaultSettings, ...current };
      await chrome.storage.local.set(this.settings);
    } catch (error) {
      console.error('Storage setup failed:', error);
      this.settings = { ...this.defaultSettings };
    }
  }

  setupAlarms() {
    try {
      chrome.alarms.create('dailyReset', {
        when: this.getNextMidnight(),
        periodInMinutes: 1440
      });
    } catch (error) {
      console.error('Alarm setup failed:', error);
    }
  }

  getNextMidnight() {
    const now = new Date();
    return new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      0, 0, 0
    ).getTime();
  }

  setupListeners() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      try {
        switch (request.type) {
          case 'GET_SETTINGS':
            sendResponse(this.getPublicSettings());
            break;
            
          case 'UPDATE_SETTINGS':
            this.updateSettings(request.settings)
              .then(() => sendResponse({ success: true }))
              .catch(error => sendResponse({ success: false, error }));
            return true;
            
          case 'GET_STATS':
            sendResponse(this.settings.stats);
            break;
            
          case 'INCREMENT_STATS':
            this.incrementStats(request.data)
              .then(() => sendResponse({ success: true }))
              .catch(error => sendResponse({ success: false, error }));
            return true;
        }
      } catch (error) {
        console.error('Message handler error:', error);
        sendResponse({ success: false, error: error.message });
        return true;
      }
    });

    chrome.alarms.onAlarm.addListener(alarm => {
      if (alarm.name === 'dailyReset') {
        this.resetStats().catch(error => 
          console.error('Failed to reset stats:', error)
        );
      }
    });
  }

  getPublicSettings() {
    return {
      blockedKeywords: this.settings.blockedKeywords,
      distanceThreshold: this.settings.distanceThreshold,
      isActive: this.settings.isActive
    };
  }

  async updateSettings(newSettings) {
    try {
      this.settings = { ...this.settings, ...newSettings };
      await chrome.storage.local.set(this.settings);
      console.log('Settings updated:', this.settings);
    } catch (error) {
      console.error('Failed to update settings:', error);
      throw error;
    }
  }

  async incrementStats(data) {
    try {
      // Create new stats object with incremented values
      const newStats = { ...this.settings.stats };
      
      for (const [key, value] of Object.entries(data)) {
        newStats[key] = (newStats[key] || 0) + value;
      }
      
      // Update both in-memory and storage
      this.settings.stats = newStats;
      await chrome.storage.local.set({ stats: newStats });
      
      console.log('Stats incremented:', newStats);
    } catch (error) {
      console.error('Failed to increment stats:', error);
      throw error;
    }
  }

  async resetStats() {
    try {
      const newStats = {
        videosBlocked: 0,
        warningsTriggered: 0,
        lastReset: Date.now()
      };
      
      this.settings.stats = newStats;
      await chrome.storage.local.set({ stats: newStats });
      
      console.log('Stats reset:', newStats);
    } catch (error) {
      console.error('Failed to reset stats:', error);
      throw error;
    }
  }
}

// Initialize with error handling
try {
  new BackgroundService();
} catch (error) {
  console.error('Background service initialization failed:', error);
}