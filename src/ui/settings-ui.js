/**
 * Settings UI Handler
 * 
 * Manages all settings-related UI interactions and views
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Settings view elements
  const settingsIcon = document.getElementById('settingsIcon');
  const cookieSearchIcon = document.getElementById('cookieSearchIcon');
  const settingsView = document.getElementById('settingsView');
  const mainContentView = document.getElementById('mainContentView');
  const backButton = document.getElementById('backButton');
  const notificationsToggle = document.getElementById('notificationsToggle');
  const highlightingToggle = document.getElementById('highlightingToggle');
  const refreshAlertsToggle = document.getElementById('refreshAlertsToggle');
  
  // Pattern management elements
  const managePatternsBtn = document.getElementById('managePatternsBtn');
  const backToSettingsBtn = document.getElementById('backToSettingsBtn');
  const patternManagementView = document.getElementById('patternManagementView');
  
  // Alert/Notification management elements
  const manageNotificationsBtn = document.getElementById('manageNotificationsBtn');
  const notificationManagementView = document.getElementById('notificationManagementView');
  const managePausedSitesList = document.getElementById('managePausedSitesList');
  const backToSettingsFromNotificationsBtn = document.getElementById('backToSettingsFromNotificationsBtn');
  const pausedSitesCount = document.getElementById('pausedSitesCount');
  
  // Cookie Inspector elements
  const cookieInspectorView = document.getElementById('cookieInspectorView');
  const backFromInspectorBtn = document.getElementById('backFromInspectorBtn');
  const openInWindowBtn = document.getElementById('openInWindowBtn');

  // ===== View Navigation =====
  
  // Open Cookie Inspector in separate window
  openInWindowBtn.addEventListener('click', () => {
    chrome.windows.create({
      url: chrome.runtime.getURL('src/ui/cookie-inspector-window.html'),
      type: 'popup',
      width: 900,
      height: 650,
      focused: true
    });
    // Close the popup after opening the window
    window.close();
  });
  
  // Cookie search icon click handler
  cookieSearchIcon.addEventListener('click', () => {
    if (cookieInspectorView.style.display === 'block') {
      fadeOut(cookieInspectorView, () => {
        fadeIn(mainContentView);
      });
    } else {
      mainContentView.style.display = 'none';
      settingsView.style.display = 'none';
      patternManagementView.style.display = 'none';
      notificationManagementView.style.display = 'none';
      fadeIn(cookieInspectorView);
    }
  });
  
  // Back button from cookie inspector
  backFromInspectorBtn.addEventListener('click', () => {
    fadeOut(cookieInspectorView, () => {
      fadeIn(mainContentView);
    });
  });
  
  // Settings icon click handler
  settingsIcon.addEventListener('click', () => {
    if (settingsView.style.display === 'block') {
      fadeOut(settingsView, () => {
        fadeIn(mainContentView);
      });
    } else if (patternManagementView.style.display === 'block') {
      fadeOut(patternManagementView, () => {
        showSettingsView();
      });
    } else if (cookieInspectorView.style.display === 'block') {
      fadeOut(cookieInspectorView, () => {
        showSettingsView();
      });
    } else if (mainContentView.style.display === 'block') {
      fadeOut(mainContentView, () => {
        showSettingsView();
      });
    } else {
      mainContentView.style.display = 'none';
      patternManagementView.style.display = 'none';
      notificationManagementView.style.display = 'none';
      cookieInspectorView.style.display = 'none';
      showSettingsView();
    }
  });

  // Back button to return to main view from settings
  backButton.addEventListener('click', () => {
    fadeOut(settingsView, () => {
      fadeIn(mainContentView);
    });
  });

  // Pattern management navigation
  managePatternsBtn.addEventListener('click', () => {
    fadeOut(settingsView, () => {
      fadeIn(patternManagementView);
      
      if (typeof window.loadNetworks === 'function') {
        window.loadNetworks();
      }
    });
  });

  backToSettingsBtn.addEventListener('click', () => {
    fadeOut(patternManagementView, () => {
      fadeIn(settingsView);
    });
  });

  // ===== Notification Settings =====
  
  // Load notification setting on startup
  await loadNotificationSetting();
  loadHighlightingSetting();
  await loadRefreshAlertsSetting();
  
  // Handle notification toggle change
  notificationsToggle.addEventListener('change', async function() {
    await settingsManager.setNotificationEnabled(this.checked);
  });

  highlightingToggle.addEventListener('change', function() {
    // Send message to content script to toggle highlighting
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          command: 'toggleHighlighting',
          enabled: this.checked
        });
      }
    });
    // Also store the setting
    chrome.storage.local.set({ 'highlightAffiliateLinks': this.checked });
  });

  refreshAlertsToggle.addEventListener('change', async function() {
    await settingsManager.setShowRefreshAlerts(this.checked);
  });

  async function loadNotificationSetting() {
    const enabled = await settingsManager.getNotificationEnabled();
    notificationsToggle.checked = enabled;
  }

  function loadHighlightingSetting() {
    chrome.storage.local.get(['highlightAffiliateLinks'], (result) => {
      highlightingToggle.checked = result.highlightAffiliateLinks !== undefined ? result.highlightAffiliateLinks : true;
    });
  }

  async function loadRefreshAlertsSetting() {
    const enabled = await settingsManager.getShowRefreshAlerts();
    refreshAlertsToggle.checked = enabled;
  }

  // ===== Paused Sites Management =====
  
  // Initialize paused sites count
  await updatePausedSitesCount();

  async function updatePausedSitesCount() {
    const sites = await settingsManager.getPausedSites();
    if (pausedSitesCount) {
      pausedSitesCount.textContent = sites.length;
    }
  }

  // Show notification management view
  manageNotificationsBtn.addEventListener('click', showNotificationManagementView);
  
  function showNotificationManagementView() {
    settingsView.style.display = 'none';
    notificationManagementView.style.display = 'block';
    loadManagePausedSites();
    loadManageHighlightDisabledSites();
  }

  // Back to settings from notification management
  backToSettingsFromNotificationsBtn.addEventListener('click', () => {
    notificationManagementView.style.display = 'none';
    showSettingsView();
  });

  // Load and display paused sites
  async function loadManagePausedSites() {
    const sites = await settingsManager.getPausedSites();
    managePausedSitesList.innerHTML = '';
    
    if (sites.length === 0) {
      managePausedSitesList.innerHTML = `
        <li class="empty" style="text-align:center; color:var(--text-secondary); padding: 32px 0;">
          <span class="material-icons" style="font-size:32px; vertical-align:middle; color:var(--primary-color);">check_circle</span><br>
          No sites are currently paused.
        </li>
      `;
      await updatePausedSitesCount();
      return;
    }
    
    sites.forEach(domain => {
      const li = document.createElement('li');
      li.className = 'paused-site-item';
      li.style.display = 'flex';
      li.style.alignItems = 'center';
      li.style.justifyContent = 'space-between';
      li.style.background = 'var(--bg-secondary)';
      li.style.borderRadius = '8px';
      li.style.padding = '12px 16px';
      li.style.marginBottom = '12px';
      li.innerHTML = `
        <span style="display:flex; align-items:center; gap:10px;">
          <span class="material-icons" style="color:var(--primary-color); font-size: 22px;">pause_circle</span>
          <span class="paused-domain" style="font-size: 15px; font-weight: 500;">${domain}</span>
        </span>
        <button class="unpause-btn cyber-button mini" data-domain="${domain}" style="margin-left: 12px;">Unpause</button>
      `;
      managePausedSitesList.appendChild(li);
    });
    
    await updatePausedSitesCount();
  }

  // Handle unpause button clicks
  managePausedSitesList.addEventListener('click', async (e) => {
    if (e.target.classList.contains('unpause-btn')) {
      const domain = e.target.getAttribute('data-domain');
      await settingsManager.removePausedSite(domain);
      await loadManagePausedSites();
      await updatePausedSitesCount();

      if (typeof window.updateAllPauseButtons === 'function') {
        window.updateAllPauseButtons();
      }
    }
  });

  // ===== Highlight Disabled Sites Management =====

  const manageHighlightDisabledSitesList = document.getElementById('manageHighlightDisabledSitesList');

  async function loadManageHighlightDisabledSites() {
    if (!manageHighlightDisabledSitesList) return;
    const sites = await settingsManager.getHighlightDisabledSites();
    manageHighlightDisabledSitesList.innerHTML = '';

    if (sites.length === 0) {
      manageHighlightDisabledSitesList.innerHTML = `
        <li class="empty" style="text-align:center; color:var(--text-secondary); padding: 20px 0;">
          <span class="material-icons" style="font-size:32px; vertical-align:middle; color:var(--primary-color);">visibility</span><br>
          Highlighting is enabled on all sites.
        </li>
      `;
      return;
    }

    sites.forEach(domain => {
      const li = document.createElement('li');
      li.className = 'paused-site-item';
      li.style.display = 'flex';
      li.style.alignItems = 'center';
      li.style.justifyContent = 'space-between';
      li.style.background = 'var(--bg-secondary)';
      li.style.borderRadius = '8px';
      li.style.padding = '12px 16px';
      li.style.marginBottom = '12px';
      li.innerHTML = `
        <span style="display:flex; align-items:center; gap:10px;">
          <span class="material-icons" style="color:var(--primary-color); font-size: 22px;">visibility_off</span>
          <span style="font-size: 15px; font-weight: 500;">${domain}</span>
        </span>
        <button class="enable-highlight-btn cyber-button mini" data-domain="${domain}" style="margin-left: 12px;">Enable</button>
      `;
      manageHighlightDisabledSitesList.appendChild(li);
    });
  }

  if (manageHighlightDisabledSitesList) {
    manageHighlightDisabledSitesList.addEventListener('click', async (e) => {
      if (e.target.classList.contains('enable-highlight-btn')) {
        const domain = e.target.getAttribute('data-domain');
        await settingsManager.removeHighlightDisabledSite(domain);
        await loadManageHighlightDisabledSites();
        if (typeof window.settingsUI !== 'undefined' && window.settingsUI.updateHighlightSiteButton) {
          window.settingsUI.updateHighlightSiteButton();
        }
      }
    });
  }

  // ===== Helper Functions =====

  // Use shared UI utilities
  const { fadeOut, fadeIn } = window.uiUtils;

  function showSettingsView() {
    mainContentView.style.display = 'none';
    patternManagementView.style.display = 'none';
    notificationManagementView.style.display = 'none';
    settingsView.style.display = 'block';
    loadPausedSites();
  }

  async function loadPausedSites() {
    await updatePausedSitesCount();
  }

  // ===== Per-site Affiliate Link Highlighting =====

  const highlightSiteBtn = document.getElementById('highlightSiteBtn');

  async function getCurrentSiteHostname() {
    return new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs[0] && tabs[0].url) {
          try {
            const url = new URL(tabs[0].url);
            resolve(url.hostname.toLowerCase().replace(/^www\./, ''));
          } catch (e) {
            resolve(null);
          }
        } else {
          resolve(null);
        }
      });
    });
  }

  async function updateHighlightSiteButton() {
    if (!highlightSiteBtn) return;
    const hostname = await getCurrentSiteHostname();
    if (!hostname) {
      highlightSiteBtn.style.display = 'none';
      return;
    }
    const isDisabled = await settingsManager.isHighlightDisabledSite(hostname);
    const iconEl = highlightSiteBtn.querySelector('.material-icons');
    const textEl = highlightSiteBtn.querySelector('.btn-text');
    if (isDisabled) {
      if (iconEl) iconEl.textContent = 'visibility';
      if (textEl) textEl.textContent = 'Enable highlighting here';
      highlightSiteBtn.classList.remove('secondary');
      highlightSiteBtn.classList.add('success');
    } else {
      if (iconEl) iconEl.textContent = 'visibility_off';
      if (textEl) textEl.textContent = 'Disable highlighting here';
      highlightSiteBtn.classList.remove('success');
      highlightSiteBtn.classList.add('secondary');
    }
    highlightSiteBtn.style.display = 'block';
  }

  if (highlightSiteBtn) {
    highlightSiteBtn.addEventListener('click', async () => {
      const hostname = await getCurrentSiteHostname();
      if (!hostname) return;
      const isDisabled = await settingsManager.isHighlightDisabledSite(hostname);
      if (isDisabled) {
        await settingsManager.removeHighlightDisabledSite(hostname);
      } else {
        await settingsManager.addHighlightDisabledSite(hostname);
      }
      // Notify the active tab's content script to refresh
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, { command: 'refreshHighlightingForSite' });
        }
      });
      await updateHighlightSiteButton();
      await loadManageHighlightDisabledSites();
    });
  }

  // Initialize button state on popup open
  updateHighlightSiteButton();

  // Export functions for use by other scripts
  window.settingsUI = {
    updatePausedSitesCount,
    loadManagePausedSites,
    loadManageHighlightDisabledSites,
    showSettingsView,
    updateHighlightSiteButton
  };
});

