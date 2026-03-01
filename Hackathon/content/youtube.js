chrome.storage.local.get(['isActive', 'blockedKeywords'], (data) => {
  if (!data.isActive) return;

  const blockedKeywords = (data.blockedKeywords || []).map(k => k.toLowerCase());

  function hideBlockedVideos() {
      console.log("🔍 Checking for videos & shorts to block...");

      const videoElements = document.querySelectorAll(`
          ytd-video-renderer, 
          ytd-grid-video-renderer, 
          ytd-rich-item-renderer, 
          ytd-reel-item-renderer, 
          ytd-reel-video-renderer
      `);

      videoElements.forEach((video) => {
          let titleElement =
              video.querySelector('#video-title') || 
              video.querySelector('#video-title-link') || 
              video.querySelector('.ytd-reel-item-renderer a#video-title') || 
              video.querySelector('h3') || 
              video.querySelector('#overlay'); // Shorts sometimes store text in overlay

          if (!titleElement) return;

          const videoTitle = titleElement.innerText.toLowerCase().trim();
          console.log("🎬 Found video:", videoTitle);

          if (blockedKeywords.some(keyword => videoTitle.includes(keyword))) {
              console.log("🚫 Blocking:", videoTitle);
              video.style.display = 'none';
          }
      });
  }

  // Run on initial page load
  setTimeout(hideBlockedVideos, 3000);

  // Observe for dynamically loaded content (infinite scrolling)
  const observer = new MutationObserver(() => {
      console.log("🔄 Detected new content, filtering again...");
      hideBlockedVideos();
  });

  observer.observe(document.body, { childList: true, subtree: true });
}); 