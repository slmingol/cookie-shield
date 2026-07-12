/**
 * Notification Manager
 * 
 * Handles all notification logic including batch processing and display
 */

const DEBUG_NOTIFICATIONS = false; // Set to true for debugging

// Batch notification processing with de-duplication
let pendingCookieNotifications = [];
let pendingMap = new Map(); // key -> cookieData (de-duplicates within batch)
let batchNotificationTimeout = null;
const BATCH_WINDOW = 1000; // Changed from 2000ms to 1000ms for faster alerts

let lastAlertData = null;

function log(...args) {
  if (DEBUG_NOTIFICATIONS) console.log('[Notification Manager]', ...args);
}


// Define cookie event types as constants for consistency
const COOKIE_EVENTS = {
  NEW: 'New',
  ALTERED: 'Altered',
  REFRESHED: 'Refreshed'
};

/**
 * Add a cookie to the pending notifications and set/reset the batch timer
 * Uses Map to de-duplicate cookies within the same batch window
 */
function addToPendingNotifications(cookieData) {
  // Create unique key for de-duplication: domain|name|path
  const key = `${cookieData.domain}|${cookieData.name}|${cookieData.path || '/'}`;
  
  // Store in map (overwrites if same cookie seen multiple times in batch)
  pendingMap.set(key, cookieData);
  
  // Reset the batch timer
  if (batchNotificationTimeout) {
    clearTimeout(batchNotificationTimeout);
  }
  
  // Set new timer to process all pending notifications after batch window
  batchNotificationTimeout = setTimeout(() => {
    processPendingNotifications();
  }, BATCH_WINDOW);
}

/**
 * Process all pending notifications and inject alerts into the active tab
 */
function processPendingNotifications() {
  // Rebuild array from map (de-duplicated)
  pendingCookieNotifications = Array.from(pendingMap.values());
  pendingMap.clear();
  
  if (pendingCookieNotifications.length === 0) return;
  
  // Add defensive check to filter out invalid entries
  const validCookieNotifications = pendingCookieNotifications.filter(cookie => 
    cookie && typeof cookie === 'object' && cookie.network
  );
  
  if (validCookieNotifications.length === 0) {
    console.warn('No valid cookie notifications found, clearing pending array');
    pendingCookieNotifications = [];
    return;
  }
  
  const cookiesByNetwork = {};
  validCookieNotifications.forEach(cookie => {
    if (!cookiesByNetwork[cookie.network]) {
      cookiesByNetwork[cookie.network] = [];
    }
    cookiesByNetwork[cookie.network].push(cookie);
  });
  
  const totalCookies = validCookieNotifications.length;
  const networkNames = Object.keys(cookiesByNetwork);
  const networkCount = networkNames.length;
  
  let cookieData;
    
  if (totalCookies === 1) {
    cookieData = validCookieNotifications[0];
  } else {
    cookieData = {
      type: 'Multiple',
      totalCookies: totalCookies,
      networkCount: networkCount,
      networks: networkNames,
      cookies: [...validCookieNotifications],
      cookiesByNetwork: cookiesByNetwork,
      domain: validCookieNotifications[0].domain || 'unknown',
      network: networkCount > 1 ? 'multiple' : networkNames[0],
      timestamp: Date.now()
    };
  }
  
  lastAlertData = {
    source: 'alert',
    cookieData: cookieData
  };
  
  self.pauseManager.isCurrentTabPaused((paused) => {
    if (paused) return;
    
    chrome.storage.local.get('enableNotifications', function(data) {
      const enableNotifications = data.enableNotifications !== undefined ? 
        data.enableNotifications : true;
        
      if (enableNotifications) {
        // Play icon animation
        self.iconAnimator.playIconAnimation();
        
        // Inject alert into active tab
        injectAlert(cookieData);
      }
    });
  });
  
  pendingCookieNotifications = [];
}

/**
 * Inject alert into the active tab
 */
function injectAlert(cookieData, retryCount = 0) {
  // Add defensive check to prevent TypeError
  if (!cookieData || typeof cookieData !== 'object') {
    console.error('[Alert] cookieData is invalid', cookieData);
    return;
  }
  
  // Get active tab and send message to content script
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs || !tabs[0]) {
      log('No active tab found');
      return;
    }
    
    const tab = tabs[0];
    
    // Skip restricted URLs that can't run content scripts
    const restrictedPrefixes = [
      'chrome://',
      'chrome-extension://',
      'about:',
      'edge://',
      'file://',
      'view-source:',
      'data:',
      'blob:'
    ];
    
    if (!tab.url || restrictedPrefixes.some(prefix => tab.url.startsWith(prefix))) {
      // Silent skip - these pages can't have content scripts
      log('Skipping restricted page:', tab.url);
      return;
    }
    
    // If tab is still loading, wait and retry (max 2 retries)
    if (tab.status === 'loading' && retryCount < 2) {
      log('Tab still loading, retrying...');
      setTimeout(() => injectAlert(cookieData, retryCount + 1), 500);
      return;
    }
    
    // Send message to content script
    chrome.tabs.sendMessage(tab.id, {
      command: 'showAlert',
      cookieData: cookieData
    }, (response) => {
      if (chrome.runtime.lastError) {
        // Content script not ready - normal for new tabs, just log for debugging
        log('Could not inject alert:', chrome.runtime.lastError.message);
      } else {
        log('Alert injected successfully');
      }
    });
  });
}

/**
 * Shows an injected alert for a direct Amazon affiliate URL
 */
async function notifyAmazonAffiliateUrl(domain, urlData) {
  const sitePaused = await new Promise(resolve => self.pauseManager.isCurrentTabPaused(resolve));
  if (sitePaused) return;
  
  log('Processing tag:', urlData.affiliateId, 'on domain:', domain);
  
  const notificationCheck = await self.amazonTagManager.shouldNotifyForAmazonTag(urlData.affiliateId, domain);
  
  log('Notification decision:', notificationCheck.shouldNotify, 'Reason:', notificationCheck.reason);
  
  // Update lastSeen even if we don't notify (tracks usage without changing active state)
  await self.amazonTagManager.updateLastSeen(urlData.affiliateId);
  
  // Only store as active if we're going to notify
  if (!notificationCheck.shouldNotify) {
    log('Suppressing notification -', notificationCheck.message);
    return;
  }
  
  // Store tag as active and show notification
  await self.amazonTagManager.storeAmazonTag(urlData.affiliateId, domain, {
    type: 'direct_url',
    source: urlData.source
  });
  
  log('Tag stored as active, showing notification');
  
  const cookieInfo = {
    type: notificationCheck.reason === 'new_tag' ? 'New' : 'Updated',
    network: 'amazon',
    domain: domain,
    name: 'Amazon affiliate link',
    details: `Amazon affiliate link (${urlData.affiliateId})`,
    value: urlData.source.substring(0, 100) + (urlData.source.length > 100 ? '...' : ''),
    cookieType: 'thirdParty',
    notificationReason: notificationCheck.reason
  };
  
  lastAlertData = {
    source: 'alert',
    cookieData: cookieInfo
  };
  
  showAmazonAlert(cookieInfo);
}

/**
 * Shows Amazon alert via injected HTML
 */
function showAmazonAlert(alertData) {
  chrome.storage.local.get('enableNotifications', function(data) {
    const enableNotifications = data.enableNotifications !== undefined ? 
      data.enableNotifications : true;
      
    if (enableNotifications) {
      // Play icon animation for Amazon alerts too
      self.iconAnimator.playIconAnimation();
      
      injectAlert(alertData);
    }
  });
}

function getLastAlertData() {
  return lastAlertData;
}

function clearLastAlertData() {
  lastAlertData = null;
}

// Export for service worker
if (typeof self !== 'undefined') {
  self.notificationManager = {
    addToPendingNotifications,
    processPendingNotifications,
    injectAlert,
    notifyAmazonAffiliateUrl,
    showAmazonAlert,
    getLastAlertData,
    clearLastAlertData,
    COOKIE_EVENTS
  };
}

