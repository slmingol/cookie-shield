// Created by MegaLag
// Copyright (c) 2024 MegaLag. All rights reserved.
// Cookie Shield Extension - Affiliate Cookie Monitor

// Import all dependencies
self.importScripts('patterns/cookiePatterns.js');
self.importScripts('managers/amazonDetector.js');
self.importScripts('managers/settingsManager.js');
self.importScripts('managers/iconAnimator.js');
self.importScripts('managers/pauseManager.js');
self.importScripts('managers/amazonTagManager.js');
self.importScripts('managers/notificationManager.js');
self.importScripts('managers/cookieManager.js');

// Initialize pause manager on startup
pauseManager.initializePauseManager();

// Initialize cookie state and scan on service worker load
// This ensures the badge is always up-to-date, even when service worker wakes from idle
(async () => {
  try {
    await cookieManager.initializeCookieState();
    await cookieManager.checkAllCookiesForAffiliate();
    console.log('Cookie Shield initialized and badge updated');
  } catch (error) {
    console.error('Error during service worker initialization:', error);
  }
})();

// Cookie change listener
chrome.cookies.onChanged.addListener(async (changeInfo) => {
  try {
    await cookieManager.handleCookieChange(changeInfo);
  } catch (error) {
    console.error('Error in cookie change handler:', error, changeInfo);
  }
});

// Tab update listener for Amazon affiliate URL detection
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    pauseManager.updateActiveTabDebounced();
  }
});

// Amazon affiliate detection via webNavigation API (more reliable than tabs.onUpdated)
chrome.webNavigation.onCompleted.addListener((details) => {
  if (details.frameId !== 0) return; // Only main frame
  
  try {
    const url = new URL(details.url);
    
    const urlCheck = amazonAffiliateDetector.checkAffiliateUrl(details.url);
    if (urlCheck) {
      notificationManager.notifyAmazonAffiliateUrl(url.hostname, urlCheck).catch(() => {});
    }
    
  } catch (err) {
    // Invalid URL, ignore
  }
});

// Note: Chrome notification handlers removed - now using injected HTML alerts

// Extension startup listeners
chrome.runtime.onStartup.addListener(async () => {
  try {
    await cookieManager.initializeCookieState();
    await amazonTagManager.clearExpiredAmazonTags();
    await cookieManager.checkAllCookiesForAffiliate();
  } catch (error) {
    console.error('Error during extension startup:', error);
  }
});

// Paused sites migrated from Cookie Guard on first install
const COOKIE_GUARD_PAUSED_SITES = [
  "diskprices.com",
  "www.amazon.com",
  "navidrome.lamolabs.org",
  "esl.org",
  "archive.is",
  "tooling-portal.apps.app1.rdu1.ocp.bandwidth.com",
  "newtab",
  "google.com"
];

chrome.runtime.onInstalled.addListener(async (details) => {
  try {
    // On first install only: seed paused sites from Cookie Guard export
    if (details.reason === 'install') {
      const existing = await new Promise(resolve =>
        chrome.storage.local.get(['pausedNotificationSites'], r =>
          resolve(r.pausedNotificationSites || [])
        )
      );
      if (existing.length === 0) {
        await chrome.storage.local.set({ pausedNotificationSites: COOKIE_GUARD_PAUSED_SITES });
        console.log('Cookie Shield: migrated paused sites from Cookie Guard');
      }
    }
    await cookieManager.initializeCookieState();
    await amazonTagManager.clearExpiredAmazonTags();
    await cookieManager.checkAllCookiesForAffiliate();
  } catch (error) {
    console.error('Error during extension installation:', error);
  }
});

// Periodic cleanup of expired Amazon tags (every 6 hours)
setInterval(async () => {
  await amazonTagManager.clearExpiredAmazonTags();
}, 6 * 60 * 60 * 1000);

// Message handler - routes commands to appropriate managers
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.command === 'scanAll') {
    (async () => {
      if (!cookieManager.getIsInitialized()) {
        await cookieManager.initializeCookieState();
      }
      
      const result = await cookieManager.checkAllCookiesForAffiliate();
      sendResponse(result);
    })();
    return true;
  }
  
  if (request.command === 'getStatus') {
    (async () => {
      if (!cookieManager.getIsInitialized()) {
        await cookieManager.initializeCookieState();
      }
      
      // Use checkAllCookiesForAffiliate to ensure badge stays in sync with internal state
      const result = await cookieManager.checkAllCookiesForAffiliate();
      
      sendResponse({
        hasAffiliateCookies: result.hasAffiliateCookies,
        cookies: result.cookies
      });
    })();
    return true;
  }

  if (request.command === 'clearAffiliateCookies') {
    (async () => {
      cookieManager.clearAffiliateCookies();
      sendResponse({ success: true });
    })();
    return true;
  }

  // Note: getPopupSource removed - alerts are now injected into pages, not shown in popup
  
  if (request.command === 'detectNetwork') {
    if (request.cookie) {
      cookieManager.detectAffiliateNetwork(request.cookie)
        .then(networkInfo => {
          sendResponse(networkInfo);
        })
        .catch(error => {
          sendResponse({ network: 'unknown', type: 'unknown' });
        });
      return true;
    } else {
      sendResponse({ network: 'unknown', type: 'unknown' });
      return true;
    }
  }

  if (request.command === 'getDefaultPatterns') {
    sendResponse({ patterns: cookieManager.getDefaultPatterns() });
    return true;
  }

  if (request.command === 'getAmazonTags') {
    (async () => {
      const tags = await amazonTagManager.getAmazonTags();
      sendResponse({ tags });
    })();
    return true;
  }

  if (request.command === 'clearAmazonTags') {
    chrome.storage.local.set({ [amazonTagManager.AMAZON_TAGS_KEY]: {} }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.command === 'getActiveAmazonTag') {
    (async () => {
      const tags = await amazonTagManager.getAmazonTags();
      const activeTag = Object.entries(tags).find(([tag, data]) => data.isActive);
      sendResponse({ 
        activeTag: activeTag ? { tag: activeTag[0], data: activeTag[1] } : null,
        allTags: tags 
      });
    })();
    return true;
  }

  if (request.command === 'pauseSite') {
    const domain = request.domain;
    if (domain) {
      pauseManager.addPausedSite(domain, () => {
        sendResponse({ success: true });
      });
    } else {
      sendResponse({ success: false, error: 'No domain provided' });
    }
    return true;
  }
});

chrome.action.onClicked.addListener(async () => {
  if (!cookieManager.getIsInitialized()) {
    await cookieManager.initializeCookieState();
  }
  
  await cookieManager.checkAllCookiesForAffiliate();
});

