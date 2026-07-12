/**
 * Pause Manager
 * 
 * Manages paused notification sites and active tab tracking
 */

// Track current active tab for pause functionality
let currentActiveTab = null;
let tabUpdateTimeout = null;

// Site notification pause management
const PAUSED_SITES_KEY = 'pausedNotificationSites';

function getPausedSites(callback) {
  chrome.storage.local.get([PAUSED_SITES_KEY], (data) => {
    callback(data[PAUSED_SITES_KEY] || []);
  });
}

function addPausedSite(domain, callback) {
  // Normalize domain before storing
  const normalizedDomain = normalizeDomain(domain);
  
  getPausedSites((sites) => {
    // Check if domain already exists (using normalized comparison)
    const alreadyPaused = sites.some(site => normalizeDomain(site) === normalizedDomain);
    
    if (!alreadyPaused) {
      sites.push(normalizedDomain);
      chrome.storage.local.set({ [PAUSED_SITES_KEY]: sites }, () => {
        if (callback) callback();
      });
    } else {
      if (callback) callback();
    }
  });
}

function normalizeDomain(domain) {
  if (!domain) return '';
  
  // Remove leading dot from cookie domains
  let normalized = domain.startsWith('.') ? domain.substring(1) : domain;
  
  // Convert to lowercase for comparison
  normalized = normalized.toLowerCase();
  
  return normalized;
}

function domainMatches(cookieDomain, pausedDomain) {
  const normalizedCookieDomain = normalizeDomain(cookieDomain);
  const normalizedPausedDomain = normalizeDomain(pausedDomain);
  
  // Exact match
  if (normalizedCookieDomain === normalizedPausedDomain) {
    return true;
  }
  
  // Check if cookie domain is subdomain of paused domain
  // e.g., go.nordvpn.net matches paused go.nordvpn.net
  if (normalizedCookieDomain.endsWith('.' + normalizedPausedDomain)) {
    return true;
  }
  
  // Check if paused domain is subdomain of cookie domain
  // e.g., nordvpn.com matches paused go.nordvpn.net
  if (normalizedPausedDomain.endsWith('.' + normalizedCookieDomain)) {
    return true;
  }
  
  // Extract root domains (last two parts: example.com from go.example.com)
  const getRootDomain = (domain) => {
    const parts = domain.split('.');
    if (parts.length >= 2) {
      return parts.slice(-2).join('.');
    }
    return domain;
  };
  
  const cookieRoot = getRootDomain(normalizedCookieDomain);
  const pausedRoot = getRootDomain(normalizedPausedDomain);
  
  // Match if root domains are the same
  // e.g., go.nordvpn.net (root: nordvpn.net) matches nordvpn.com (root: nordvpn.com)
  // Actually wait, this won't work for .net vs .com
  
  // Better: Check if either contains the other as a subdomain
  const cookieParts = normalizedCookieDomain.split('.');
  const pausedParts = normalizedPausedDomain.split('.');
  
  // Check if they share the same base domain (ignoring subdomains)
  // nordvpn.com, go.nordvpn.net -> both contain "nordvpn"
  const cookieBase = cookieParts.length >= 2 ? cookieParts[cookieParts.length - 2] : '';
  const pausedBase = pausedParts.length >= 2 ? pausedParts[pausedParts.length - 2] : '';
  
  if (cookieBase && pausedBase && cookieBase === pausedBase) {
    return true;
  }
  
  // Also check without www
  const cookieWithoutWww = normalizedCookieDomain.replace(/^www\./, '');
  const pausedWithoutWww = normalizedPausedDomain.replace(/^www\./, '');
  
  if (cookieWithoutWww === pausedWithoutWww) {
    return true;
  }
  
  return false;
}

function isSitePaused(domain, callback) {
  getPausedSites((sites) => {
    const isPaused = sites.some(pausedSite => domainMatches(domain, pausedSite));
    callback(isPaused);
  });
}

function isCurrentTabPaused(callback) {
  if (!currentActiveTab) {
    callback(false);
    return;
  }
  
  getPausedSites((sites) => {
    const isPaused = sites.some(pausedSite => domainMatches(currentActiveTab.domain, pausedSite));
    callback(isPaused);
  });
}

// Track active tab for pause functionality
function updateActiveTab() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs && tabs[0] && tabs[0].url) {
      try {
        const url = new URL(tabs[0].url);
        currentActiveTab = {
          id: tabs[0].id,
          url: tabs[0].url,
          hostname: url.hostname,
          domain: normalizeDomain(url.hostname)
        };
      } catch (e) {
        currentActiveTab = null;
      }
    } else {
      currentActiveTab = null;
    }
  });
}

// Debounced tab update
function updateActiveTabDebounced() {
  if (tabUpdateTimeout) {
    clearTimeout(tabUpdateTimeout);
  }
  tabUpdateTimeout = setTimeout(updateActiveTab, 100);
}

// Clean up duplicate paused sites (with and without leading dots)
function cleanupPausedSites() {
  getPausedSites((sites) => {
    const uniqueSites = new Set();
    const normalizedMap = new Map(); // normalized -> original
    
    // Keep the first occurrence of each normalized domain
    sites.forEach(site => {
      const normalized = normalizeDomain(site);
      if (!uniqueSites.has(normalized)) {
        uniqueSites.add(normalized);
        normalizedMap.set(normalized, site);
      }
    });
    
    // Convert back to array using normalized domains
    const cleanedSites = Array.from(uniqueSites);
    
    // Only update if we removed duplicates
    if (cleanedSites.length < sites.length) {
      console.log(`[PauseManager] Cleaned up duplicates: ${sites.length} → ${cleanedSites.length} sites`);
      chrome.storage.local.set({ [PAUSED_SITES_KEY]: cleanedSites });
    }
  });
}

// Initialize active tab tracking
function initializePauseManager() {
  // Initialize active tab on startup
  updateActiveTab();
  
  // Clean up any duplicate paused sites on startup
  cleanupPausedSites();
  
  // Listen for tab changes
  chrome.tabs.onActivated.addListener(() => {
    updateActiveTabDebounced();
  });

  chrome.windows.onFocusChanged.addListener(() => {
    updateActiveTabDebounced();
  });
}

// Export for service worker
if (typeof self !== 'undefined') {
  self.pauseManager = {
    getPausedSites,
    addPausedSite,
    normalizeDomain,
    domainMatches,
    isSitePaused,
    isCurrentTabPaused,
    updateActiveTab,
    updateActiveTabDebounced,
    initializePauseManager,
    getCurrentActiveTab: () => currentActiveTab
  };
}

