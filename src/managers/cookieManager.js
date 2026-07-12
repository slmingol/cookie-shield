/**
 * Cookie Manager
 * 
 * Handles cookie state storage, detection, and change processing
 */

// Performance debugging
const DEBUG_PERF = false;
let perfStats = {
  getAllCalls: 0,
  storageWrites: 0,
  badgeUpdates: 0,
  firstAlertTime: null,
  lastAlertTime: null
};

function logPerf(message) {
  if (DEBUG_PERF) console.log(`[PERF] ${message}`, perfStats);
}

let currentAffiliateCookies = [];
let isInitialized = false;
let initializationPromise = null; // Guard against concurrent initialization
const STORAGE_KEY = 'cookieStates';

// In-memory cache and debounced persistence
let cookieStatesCache = null;  // { [identityKey]: { value, network, timestamp } }
let cacheLoadPromise = null;  // Guard against concurrent cache loads
const affiliatesByKey = new Map();  // identityKey -> last cookie object

const PERSIST_MS = 1000;
let persistTimer = null;

// Badge throttling
const BADGE_THROTTLE_MS = 250;
let badgeTimer = null;

// Storage operation queue (legacy - kept for compatibility)
let storageQueue = Promise.resolve();

// Create a unique key for a cookie including all identifying properties except value
function getCookieIdentityKey(cookie) {
  const domainKey = cookie.domain || '';
  return `${domainKey}|${cookie.path || '/'}|${cookie.name}`;
}

// Helper: previous identity key format for backwards compatibility
function getLegacyIdentityKey(cookie) {
  const normalizedDomain = cookie.domain.startsWith('.') ? cookie.domain.substring(1) : cookie.domain;
  return `${normalizedDomain}|${cookie.path || '/'}|${cookie.name}`;
}

// Create a full unique key for a cookie including value for exact matching
function getCookieKey(cookie) {
  return `${getCookieIdentityKey(cookie)}|${cookie.value}`;
}

// Backward compatibility function
function getCookieKeyWithoutValue(cookie) {
  return getCookieIdentityKey(cookie);
}

// Load cache from storage with concurrency guard
async function loadCookieStatesCache() {
  // If cache already loaded, return immediately
  if (cookieStatesCache) return cookieStatesCache;
  
  // If cache load is in progress, wait for it
  if (cacheLoadPromise) return cacheLoadPromise;
  
  // Start cache load and store the promise
  cacheLoadPromise = new Promise(resolve => {
    chrome.storage.local.get([STORAGE_KEY], r => {
      cookieStatesCache = r[STORAGE_KEY] || {};
      resolve(cookieStatesCache);
      cacheLoadPromise = null; // Clear after completion
    });
  });
  
  return cacheLoadPromise;
}

// Schedule debounced persistence
function schedulePersist() {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    if (!cookieStatesCache) return;
    chrome.storage.local.set({ [STORAGE_KEY]: cookieStatesCache }, () => {
      perfStats.storageWrites++;
      logPerf('Storage write completed');
    });
    persistTimer = null;
  }, PERSIST_MS);
}

// Throttled badge update
function scheduleBadgeUpdate() {
  if (badgeTimer) return;
  badgeTimer = setTimeout(() => {
    updateBadge(affiliatesByKey.size);
    perfStats.badgeUpdates++;
    logPerf('Badge updated');
    badgeTimer = null;
  }, BADGE_THROTTLE_MS);
}

// Helper functions for storage operations - now using cache
async function getCookieStates() {
  return loadCookieStatesCache();
}

async function setCookieState(identityKey, state) {
  await loadCookieStatesCache();
  cookieStatesCache[identityKey] = state;
  schedulePersist();
}

async function removeCookieState(identityKey) {
  await loadCookieStatesCache();
  delete cookieStatesCache[identityKey];
  schedulePersist();
}

async function clearAllCookieStates() {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEY]: {} }, resolve);
  });
}

/**
 * Checks if a cookie matches any known affiliate pattern.
 * Returns an object with the match type if found, false otherwise.
 */
function isAffiliateCookie(cookie) {
  return new Promise(resolve => {
    // Safety check to ensure affiliateCookiePatterns is loaded
    if (typeof affiliateCookiePatterns === 'undefined') {
      console.error('affiliateCookiePatterns is not loaded');
      resolve(false);
      return;
    }
    
    // Micro-optimization: compute lowercase once
    const nameLower = cookie.name?.toLowerCase() || '';
    
    // Get custom networks
    chrome.storage.local.get('customNetworks', (data) => {
      const customNetworks = data.customNetworks || [];
      
      // Create a map of excluded networks for quick lookup - case insensitive
      const excludedNetworks = {};
      customNetworks.forEach(network => {
        if (network.excluded) {
          excludedNetworks[network.network.toLowerCase()] = true;
        }
      });
      
      // Create a map of custom networks for quick lookup - case insensitive
      const customNetworkMap = {};
      customNetworks.forEach(network => {
        if (!network.excluded) {
          customNetworkMap[network.network.toLowerCase()] = network;
        }
      });
      
      // Check custom networks first
      for (const network of customNetworks) {
        // Skip excluded networks
        if (network.excluded) continue;
        
        // Check first-party patterns
        if (network.firstParty && network.firstParty.patterns) {
          const matchesFirstPartyPattern = network.firstParty.patterns.some(pattern => 
            nameLower.startsWith(pattern.toLowerCase())
          );
          
          if (matchesFirstPartyPattern) {
            resolve({ 
              isAffiliate: true, 
              type: 'firstParty', 
              network: network.network 
            });
            return;
          }
        }
        
        // Check third-party patterns
        if (network.thirdParty && network.thirdParty.patterns) {
          const matchesThirdPartyPattern = network.thirdParty.patterns.some(pattern => 
            nameLower.startsWith(pattern.toLowerCase())
          );
          
          if (matchesThirdPartyPattern) {
            const domains = network.thirdParty.domains || [];
            const matchesDomain = domains.length === 0 || 
              domains.some(domain => cookie.domain.includes(domain));
            
            if (matchesDomain) {
              resolve({ 
                isAffiliate: true, 
                type: 'thirdParty', 
                network: network.network 
              });
              return;
            }
          }
        }
      }
      
      // If no match in custom networks, check defaults
      for (const [network, data] of Object.entries(affiliateCookiePatterns)) {
        const networkLower = network.toLowerCase();
        
        // Skip excluded networks completely
        if (excludedNetworks[networkLower]) {
          continue;
        }
        
        // Skip if we have a custom override for this network
        if (customNetworkMap[networkLower]) {
          continue;
        }
        
        // Check if this network is excluded in customs
        const isNetworkExcluded = customNetworks.some(n => 
          n.network.toLowerCase() === networkLower && n.excluded
        );
        
        if (isNetworkExcluded) continue;
        
        // Check third-party patterns first (higher priority)
        if (data.thirdParty) {
          const matchesThirdPartyPattern = data.thirdParty.patterns.some(pattern => {
            // Check if this pattern is excluded in custom networks
            const isPatternExcluded = customNetworks.some(n => 
              n.network === network && n.thirdParty && n.thirdParty.patterns &&
              n.thirdParty.patterns.includes(pattern) && n.excluded
            );
            
            return !isPatternExcluded && 
              nameLower.startsWith(pattern.toLowerCase());
          });
          
          if (matchesThirdPartyPattern) {
            const matchesThirdPartyDomain = !data.thirdParty.domains || 
              data.thirdParty.domains.length === 0 ||
              data.thirdParty.domains.some(domain => cookie.domain.includes(domain));
            
            if (matchesThirdPartyDomain) {
              resolve({ 
                isAffiliate: true, 
                type: 'thirdParty', 
                network: network 
              });
              return;
            }
          }
        }
        
        // Then check first-party patterns
        if (data.firstParty) {
          const matchesFirstPartyPattern = data.firstParty.patterns.some(pattern => {
            // Skip empty patterns
            if (!pattern) return false;
            
            // Check if this pattern is excluded in custom networks
            const isPatternExcluded = customNetworks.some(n => 
              n.network === network && n.firstParty && n.firstParty.patterns &&
              n.firstParty.patterns.includes(pattern) && n.excluded
            );
            
            return !isPatternExcluded && 
              nameLower.startsWith(pattern.toLowerCase());
          });
          
          if (matchesFirstPartyPattern) {
            resolve({ 
              isAffiliate: true, 
              type: 'firstParty', 
              network: network 
            });
            return;
          }
        }
      }
      
      resolve(false);
    });
  });
}

/**
 * Detects the affiliate network and whether it's first or third party
 */
function detectAffiliateNetwork(cookie) {
  return new Promise(async (resolve) => {
    const affiliateInfo = await isAffiliateCookie(cookie);
    if (!affiliateInfo) {
      resolve({ network: 'unknown', type: 'unknown' });
    } else {
      resolve(affiliateInfo);
    }
  });
}

async function handleCookieChange(changeInfo) {
  // Add safety check to prevent processing during initialization or with invalid data
  if (!changeInfo || !changeInfo.cookie) {
    console.warn('handleCookieChange: Invalid changeInfo received', changeInfo);
    return;
  }
  
  const { cookie, removed } = changeInfo;
  const identityKey = getCookieIdentityKey(cookie);

  if (removed) {
    const removalCause = changeInfo.cause || '';
    if (removalCause === 'overwrite' || removalCause === 'expired_overwrite') {
      return;
    }

    // Incremental removal
    affiliatesByKey.delete(identityKey);
    await removeCookieState(identityKey);
    scheduleBadgeUpdate();
    return;
  }

  // Check if it's an affiliate cookie we should track
  const affiliateInfo = await isAffiliateCookie(cookie);
  
  if (!affiliateInfo || !affiliateInfo.isAffiliate) {
    // If it's not affiliate but was tracked before, remove it (handles demotions)
    if (affiliatesByKey.has(identityKey)) {
      affiliatesByKey.delete(identityKey);
      await removeCookieState(identityKey);
      scheduleBadgeUpdate();
    }
    return;
  }

  // Check state BEFORE initialization to avoid race condition
  const cookieStatesBeforeInit = await getCookieStates();
  const legacyKey = getLegacyIdentityKey(cookie);
  const existingStateBeforeInit = cookieStatesBeforeInit[identityKey] || cookieStatesBeforeInit[legacyKey];

  // Ensure initialization is complete (or wait for it)
  if (!isInitialized) {
    await initializeCookieState();
  }

  let changeType;
  let oldValue = null;

  // Use the state from BEFORE initialization to determine if this is truly new
  if (!existingStateBeforeInit) {
    changeType = self.notificationManager.COOKIE_EVENTS.NEW;
  } else {
    oldValue = existingStateBeforeInit.value;
    changeType = (existingStateBeforeInit.value === cookie.value)
      ? self.notificationManager.COOKIE_EVENTS.REFRESHED
      : self.notificationManager.COOKIE_EVENTS.ALTERED;
  }
  
  // Safety check to ensure changeType is valid
  if (!changeType) {
    console.error('handleCookieChange: changeType is undefined', {
      existingStateBeforeInit: existingStateBeforeInit,
      COOKIE_EVENTS: self.notificationManager.COOKIE_EVENTS
    });
    changeType = 'Unknown'; // Fallback value
  }

  // Incremental state update
  await setCookieState(identityKey, {
    value: cookie.value,
    network: affiliateInfo.network,
    timestamp: Date.now()
  });
  
  affiliatesByKey.set(identityKey, cookie);

  // Cleanup: remove legacy key entry if it exists
  if (legacyKey !== identityKey) {
    await removeCookieState(legacyKey);
  }

  // Throttled badge update
  scheduleBadgeUpdate();

  // Create notification payload
  const cookieData = {
    ...cookie,
    type: changeType,
    network: affiliateInfo.network,
    cookieType: affiliateInfo.type,
    oldValue,
    timestamp: Date.now()
  };

  // Add defensive check to ensure cookieData is valid before adding to notifications
  if (!cookieData.type || !cookieData.network || !cookieData.name) {
    console.error('handleCookieChange: Invalid cookieData created', {
      type: cookieData.type,
      network: cookieData.network,
      name: cookieData.name,
      cookie: cookie,
      affiliateInfo: affiliateInfo
    });
    return;
  }

  // Check if we should suppress refresh alerts
  if (changeType === self.notificationManager.COOKIE_EVENTS.REFRESHED) {
    const showRefreshAlerts = await self.settingsManager.getShowRefreshAlerts();
    if (!showRefreshAlerts) {
      // Skip adding to notifications, but still play icon animation
      // Check if site is paused and if notifications are enabled before animating
      self.pauseManager.isCurrentTabPaused((paused) => {
        if (paused) return;
        
        chrome.storage.local.get('enableNotifications', function(data) {
          const enableNotifications = data.enableNotifications !== undefined ? 
            data.enableNotifications : true;
            
          if (enableNotifications) {
            // Play icon animation even though we're not showing the alert
            self.iconAnimator.playIconAnimation();
          }
        });
      });
      
      return;
    }
  }

  // Track alert timing for perf
  if (!perfStats.firstAlertTime) perfStats.firstAlertTime = Date.now();
  perfStats.lastAlertTime = Date.now();

  self.notificationManager.addToPendingNotifications(cookieData);
  // REMOVED: updateCookiesList() - no more global rescans!
}

// Helper function to update cookies list (now only used on-demand, not per-event)
function updateCookiesList() {
  perfStats.getAllCalls++;
  logPerf('updateCookiesList called (full rescan)');
  
  chrome.cookies.getAll({}, async cookies => {
    // Create an array of promises for checking each cookie
    const checkPromises = cookies.map(cookie => isAffiliateCookie(cookie));
    
    // Wait for all promises to resolve
    const results = await Promise.all(checkPromises);
    
    // Filter cookies based on results with proper affiliate check
    const affiliateCookies = [];
    for (let i = 0; i < cookies.length; i++) {
      const affiliateInfo = results[i];
      if (affiliateInfo && affiliateInfo.isAffiliate) {
        affiliateCookies.push(cookies[i]);
      }
    }
    
    currentAffiliateCookies = affiliateCookies;
    
    // Update affiliatesByKey for consistency
    affiliatesByKey.clear();
    for (const cookie of affiliateCookies) {
      affiliatesByKey.set(getCookieIdentityKey(cookie), cookie);
    }
    
    updateBadge(currentAffiliateCookies.length);
  });
}

function updateBadge(count) {
  chrome.action.setBadgeText({ text: count > 0 ? count.toString() : '' });
  chrome.action.setBadgeBackgroundColor({ color: '#f44336' });
}

/**
 * Check all cookies in the browser for affiliate patterns
 */
function checkAllCookiesForAffiliate() {
  perfStats.getAllCalls++;
  logPerf('checkAllCookiesForAffiliate called (full rescan)');
  
  return new Promise(async (resolve) => {
    const cookies = await chrome.cookies.getAll({});
    
    // Create an array of promises for checking each cookie
    const checkPromises = cookies.map(cookie => isAffiliateCookie(cookie));
    
    // Wait for all promises to resolve
    const results = await Promise.all(checkPromises);
    
    // Filter cookies based on results
    const affiliateCookies = [];
    for (let i = 0; i < cookies.length; i++) {
      const affiliateInfo = results[i];
      if (affiliateInfo && affiliateInfo.isAffiliate) {
        affiliateCookies.push(cookies[i]);
      }
    }
    
    currentAffiliateCookies = affiliateCookies;
    
    // Update affiliatesByKey for consistency
    affiliatesByKey.clear();
    for (const cookie of affiliateCookies) {
      affiliatesByKey.set(getCookieIdentityKey(cookie), cookie);
    }
    
    updateBadge(affiliateCookies.length);
    
    // Create network summary - use async/await to handle promises
    const cookiesByNetwork = {};
    
    for (const cookie of affiliateCookies) {
      const info = await detectAffiliateNetwork(cookie);
      
      if (!cookiesByNetwork[info.network]) {
        cookiesByNetwork[info.network] = {
          thirdParty: [],
          firstParty: [],
          unknown: [] // Add unknown type as fallback
        };
      }
      
      // Make sure we have a valid type with fallback
      const type = (info.type === 'firstParty' || info.type === 'thirdParty') 
        ? info.type 
        : 'unknown';
        
      cookiesByNetwork[info.network][type].push(cookie);
    }

    resolve({
      hasAffiliateCookies: affiliateCookies.length > 0,
      cookies: affiliateCookies,
      networkSummary: cookiesByNetwork
    });
  });
}

// Initialize cookie state storage with proper concurrency guard
async function initializeCookieState() {
  // If already initialized, return immediately
  if (isInitialized) {
    return;
  }
  
  // If initialization is in progress, wait for it to complete
  if (initializationPromise) {
    return initializationPromise;
  }
  
  // Start initialization and store the promise
  initializationPromise = (async () => {
    try {
      console.log('Initializing cookie state...');
      perfStats.getAllCalls++;
      logPerf('initializeCookieState called (full rescan)');
      
      // Ensure required dependencies are loaded
      if (typeof affiliateCookiePatterns === 'undefined') {
        console.error('affiliateCookiePatterns not loaded, cannot initialize');
        return;
      }
      
      const cookies = await chrome.cookies.getAll({});
      const cookieStates = await getCookieStates();
      
      affiliatesByKey.clear(); // Ensure clean start
      let affiliateCount = 0;
      
      for (const cookie of cookies) {
        try {
          const affiliateInfo = await isAffiliateCookie(cookie);
          if (affiliateInfo && affiliateInfo.isAffiliate) {
            affiliateCount++;
            const identityKey = getCookieIdentityKey(cookie);
            
            // Populate affiliatesByKey map
            affiliatesByKey.set(identityKey, cookie);
            
            if (!cookieStates[identityKey]) {
              await setCookieState(identityKey, {
                value: cookie.value,
                network: affiliateInfo.network,
                timestamp: Date.now()
              });
            }
          }
        } catch (cookieError) {
          console.warn('Error processing cookie during initialization:', cookieError, cookie);
        }
      }
      
      console.log(`Cookie state initialized with ${affiliateCount} affiliate cookies`);
      updateBadge(affiliatesByKey.size); // Use map size for accuracy
      isInitialized = true;
      
    } catch (error) {
      console.error('Error initializing cookie state:', error);
      isInitialized = false;
    } finally {
      // Clear the promise so future calls can proceed
      initializationPromise = null;
    }
  })();
  
  return initializationPromise;
}

// Convert patterns to format for pattern management
function getDefaultPatterns() {
  const patterns = [];
  
  for (const [network, data] of Object.entries(affiliateCookiePatterns)) {
    if (data.thirdParty && data.thirdParty.patterns) {
      data.thirdParty.patterns.forEach(pattern => {
        patterns.push({
          network,
          pattern,
          type: 'thirdParty',
          domain: data.thirdParty.domains ? data.thirdParty.domains.join(', ') : '',
          custom: false
        });
      });
    }
    
    if (data.firstParty && data.firstParty.patterns) {
      data.firstParty.patterns.forEach(pattern => {
        if (!pattern) return;
        
        patterns.push({
          network,
          pattern,
          type: 'firstParty',
          domain: '',
          custom: false
        });
      });
    }
  }
  
  return patterns;
}

function clearAffiliateCookies() {
  // Use affiliatesByKey Map (our current source of truth)
  const cookiesToClear = Array.from(affiliatesByKey.values());
  
  // Remove each cookie from the browser
  cookiesToClear.forEach(cookie => {
    chrome.cookies.remove({
      url: `http${cookie.secure ? 's' : ''}://${cookie.domain}${cookie.path}`,
      name: cookie.name
    });
  });
  
  // Clear all tracking structures
  currentAffiliateCookies = [];
  affiliatesByKey.clear();
  
  // Clear cache and force immediate storage write
  cookieStatesCache = {};
  if (persistTimer) clearTimeout(persistTimer);
  chrome.storage.local.set({ [STORAGE_KEY]: {} });
  
  // Reset initialization
  isInitialized = false;
  initializationPromise = null;
  cacheLoadPromise = null;
  
  // Update badge
  updateBadge(0);
}

function getCurrentAffiliateCookies() {
  // Return from Map (our source of truth) for consistency
  return Array.from(affiliatesByKey.values());
}

function getIsInitialized() {
  return isInitialized;
}

function setIsInitialized(value) {
  isInitialized = value;
}

// Export for service worker
if (typeof self !== 'undefined') {
  self.cookieManager = {
    getCookieIdentityKey,
    getLegacyIdentityKey,
    getCookieKey,
    getCookieKeyWithoutValue,
    getCookieStates,
    setCookieState,
    removeCookieState,
    clearAllCookieStates,
    isAffiliateCookie,
    detectAffiliateNetwork,
    handleCookieChange,
    updateCookiesList,
    updateBadge,
    checkAllCookiesForAffiliate,
    initializeCookieState,
    getDefaultPatterns,
    clearAffiliateCookies,
    getCurrentAffiliateCookies,
    getIsInitialized,
    setIsInitialized,
    STORAGE_KEY
  };
}

