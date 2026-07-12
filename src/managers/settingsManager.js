/**
 * Settings Manager
 * 
 * Centralized settings storage and retrieval for the extension
 */

// Settings keys
const SETTINGS_KEYS = {
  ENABLE_NOTIFICATIONS: 'enableNotifications',
  SHOW_REFRESH_ALERTS: 'showRefreshAlerts',
  PAUSED_SITES: 'pausedNotificationSites',
  CUSTOM_NETWORKS: 'customNetworks',
  CUSTOM_PATTERNS: 'customPatterns',
  HIGHLIGHT_DISABLED_SITES: 'highlightDisabledSites'
};

// Domain normalization helper
function normalizeDomain(domain) {
  if (!domain) return '';
  // Remove leading dot from cookie domains and convert to lowercase
  return domain.replace(/^\./, '').toLowerCase();
}

// Enhanced domain matching (matches base domains across TLDs and subdomains)
function domainMatches(domain1, domain2) {
  const d1 = normalizeDomain(domain1);
  const d2 = normalizeDomain(domain2);
  
  // Exact match
  if (d1 === d2) return true;
  
  // Subdomain matches
  if (d1.endsWith('.' + d2) || d2.endsWith('.' + d1)) return true;
  
  // Extract base domain names (the part before TLD)
  const parts1 = d1.split('.');
  const parts2 = d2.split('.');
  
  const base1 = parts1.length >= 2 ? parts1[parts1.length - 2] : '';
  const base2 = parts2.length >= 2 ? parts2[parts2.length - 2] : '';
  
  // Match if same base domain name (handles nordvpn.com vs go.nordvpn.net)
  if (base1 && base2 && base1 === base2) return true;
  
  // Check without www
  const withoutWww1 = d1.replace(/^www\./, '');
  const withoutWww2 = d2.replace(/^www\./, '');
  if (withoutWww1 === withoutWww2) return true;
  
  return false;
}

/**
 * Get a setting value
 */
function getSetting(key, defaultValue = null) {
  return new Promise((resolve) => {
    chrome.storage.local.get([key], (data) => {
      resolve(data[key] !== undefined ? data[key] : defaultValue);
    });
  });
}

/**
 * Set a setting value
 */
function setSetting(key, value) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: value }, resolve);
  });
}

/**
 * Get multiple settings at once
 */
function getSettings(keys) {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, resolve);
  });
}

/**
 * Set multiple settings at once
 */
function setSettings(settings) {
  return new Promise((resolve) => {
    chrome.storage.local.set(settings, resolve);
  });
}

/**
 * Remove a setting
 */
function removeSetting(key) {
  return new Promise((resolve) => {
    chrome.storage.local.remove(key, resolve);
  });
}

// Notification Settings
async function getNotificationEnabled() {
  return await getSetting(SETTINGS_KEYS.ENABLE_NOTIFICATIONS, true);
}

async function setNotificationEnabled(enabled) {
  return await setSetting(SETTINGS_KEYS.ENABLE_NOTIFICATIONS, enabled);
}

async function getShowRefreshAlerts() {
  return await getSetting(SETTINGS_KEYS.SHOW_REFRESH_ALERTS, true);
}

async function setShowRefreshAlerts(enabled) {
  return await setSetting(SETTINGS_KEYS.SHOW_REFRESH_ALERTS, enabled);
}

// Paused Sites
async function getPausedSites() {
  return await getSetting(SETTINGS_KEYS.PAUSED_SITES, []);
}

async function setPausedSites(sites) {
  return await setSetting(SETTINGS_KEYS.PAUSED_SITES, sites);
}

async function addPausedSite(domain) {
  const normalizedDomain = normalizeDomain(domain);
  const sites = await getPausedSites();
  
  // Check if already paused (using normalized comparison)
  const alreadyPaused = sites.some(site => normalizeDomain(site) === normalizedDomain);
  
  if (!alreadyPaused) {
    sites.push(normalizedDomain);
    await setPausedSites(sites);
  }
  return sites;
}

async function removePausedSite(domain) {
  const normalizedDomain = normalizeDomain(domain);
  const sites = await getPausedSites();
  const filtered = sites.filter(site => normalizeDomain(site) !== normalizedDomain);
  await setPausedSites(filtered);
  return filtered;
}

async function isPausedSite(domain) {
  const sites = await getPausedSites();
  return sites.some(pausedSite => domainMatches(domain, pausedSite));
}

// Custom Networks
async function getCustomNetworks() {
  return await getSetting(SETTINGS_KEYS.CUSTOM_NETWORKS, []);
}

async function setCustomNetworks(networks) {
  return await setSetting(SETTINGS_KEYS.CUSTOM_NETWORKS, networks);
}

async function addCustomNetwork(network) {
  const networks = await getCustomNetworks();
  networks.push(network);
  await setCustomNetworks(networks);
  return networks;
}

async function updateCustomNetwork(index, network) {
  const networks = await getCustomNetworks();
  if (index >= 0 && index < networks.length) {
    networks[index] = network;
    await setCustomNetworks(networks);
  }
  return networks;
}

async function removeCustomNetwork(index) {
  const networks = await getCustomNetworks();
  networks.splice(index, 1);
  await setCustomNetworks(networks);
  return networks;
}

async function clearCustomNetworks() {
  await removeSetting(SETTINGS_KEYS.CUSTOM_NETWORKS);
  await removeSetting(SETTINGS_KEYS.CUSTOM_PATTERNS);
}

// Per-site affiliate link highlighting
async function getHighlightDisabledSites() {
  return await getSetting(SETTINGS_KEYS.HIGHLIGHT_DISABLED_SITES, []);
}

async function setHighlightDisabledSites(sites) {
  return await setSetting(SETTINGS_KEYS.HIGHLIGHT_DISABLED_SITES, sites);
}

async function addHighlightDisabledSite(domain) {
  const normalizedDomain = normalizeDomain(domain);
  const sites = await getHighlightDisabledSites();
  const alreadyDisabled = sites.some(site => normalizeDomain(site) === normalizedDomain);
  if (!alreadyDisabled) {
    sites.push(normalizedDomain);
    await setHighlightDisabledSites(sites);
  }
  return sites;
}

async function removeHighlightDisabledSite(domain) {
  const normalizedDomain = normalizeDomain(domain);
  const sites = await getHighlightDisabledSites();
  const filtered = sites.filter(site => normalizeDomain(site) !== normalizedDomain);
  await setHighlightDisabledSites(filtered);
  return filtered;
}

async function isHighlightDisabledSite(domain) {
  const sites = await getHighlightDisabledSites();
  return sites.some(site => domainMatches(domain, site));
}

// Export for service worker (background.js)
if (typeof self !== 'undefined' && self.importScripts) {
  self.settingsManager = {
    SETTINGS_KEYS,
    getSetting,
    setSetting,
    getSettings,
    setSettings,
    removeSetting,
    getNotificationEnabled,
    setNotificationEnabled,
    getShowRefreshAlerts,
    setShowRefreshAlerts,
    getPausedSites,
    setPausedSites,
    addPausedSite,
    removePausedSite,
    isPausedSite,
    getCustomNetworks,
    setCustomNetworks,
    addCustomNetwork,
    updateCustomNetwork,
    removeCustomNetwork,
    clearCustomNetworks,
    getHighlightDisabledSites,
    setHighlightDisabledSites,
    addHighlightDisabledSite,
    removeHighlightDisabledSite,
    isHighlightDisabledSite
  };
}

// Export for popup/UI (browser context)
if (typeof window !== 'undefined') {
  window.settingsManager = {
    SETTINGS_KEYS,
    getSetting,
    setSetting,
    getSettings,
    setSettings,
    removeSetting,
    getNotificationEnabled,
    setNotificationEnabled,
    getShowRefreshAlerts,
    setShowRefreshAlerts,
    getPausedSites,
    setPausedSites,
    addPausedSite,
    removePausedSite,
    isPausedSite,
    getCustomNetworks,
    setCustomNetworks,
    addCustomNetwork,
    updateCustomNetwork,
    removeCustomNetwork,
    clearCustomNetworks,
    getHighlightDisabledSites,
    setHighlightDisabledSites,
    addHighlightDisabledSite,
    removeHighlightDisabledSite,
    isHighlightDisabledSite
  };
}

