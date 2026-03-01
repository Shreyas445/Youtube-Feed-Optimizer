document.addEventListener('DOMContentLoaded', async () => {
  const elements = {
    toggleActive: document.getElementById('toggleActive'),
    blockedKeywords: document.getElementById('blockedKeywords'),
    saveBtn: document.getElementById('saveBtn')
  };

  // Load settings
  const settings = await getSettings();
  elements.toggleActive.checked = settings.isActive !== false;
  elements.blockedKeywords.value = settings.blockedKeywords?.join(', ') || '';

  // Save settings when button is clicked
  elements.saveBtn.addEventListener('click', saveSettings);

  async function getSettings() {
    return new Promise(resolve => {
      chrome.storage.local.get(['isActive', 'blockedKeywords'], (data) => {
        console.log("Loaded settings:", data);
        resolve(data || {});
      });
    });
  }

  async function saveSettings() {
    const settings = {
      isActive: elements.toggleActive.checked,
      blockedKeywords: elements.blockedKeywords.value
        .split(',')
        .map(k => k.trim().toLowerCase()) // Convert all keywords to lowercase
        .filter(k => k.length > 0)
    };

    chrome.storage.local.set(settings, () => {
      console.log("Settings saved:", settings);
      elements.saveBtn.textContent = 'Saved!';
      setTimeout(() => {
        elements.saveBtn.textContent = 'Save Settings';
      }, 2000);
    });
  }
});
