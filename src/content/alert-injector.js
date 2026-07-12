/**
 * Alert Injector Content Script
 * 
 * Injects HTML alerts into pages for cookie and Amazon link detection
 */

(function() {
  'use strict';

  // Prevent multiple injections
  if (window.cookieShieldInjected) {
    return;
  }
  window.cookieShieldInjected = true;

  // Load Space Mono font
  if (!document.querySelector('link[href*="Space+Mono"]')) {
    const fontLink = document.createElement('link');
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap';
    fontLink.rel = 'stylesheet';
    document.head.appendChild(fontLink);
  }

  const DEBUG_ALERTS = false; // Set to true for debugging

  let currentAlert = null;
  let inspectModeActive = false;
  let alertTemplate = null;
  let restoredRecentAlert = false; // Track if we just restored an alert
  
  const ALERT_STORAGE_KEY = 'cookieShieldActiveAlert';
  const ALERT_TIMEOUT_MS = 10000; // Persist alerts for up to 10 seconds across redirects
  const ALERT_DEDUPE_MS = 2000; // Prevent duplicate alerts within 2 seconds after restoration

  function log(...args) {
    if (DEBUG_ALERTS) console.log('[CookieShield Alert]', ...args);
  }

  /**
   * Escape HTML to prevent XSS attacks
   */
  function escapeHtml(unsafe) {
    if (!unsafe) return '';
    const str = String(unsafe);
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /**
   * Load alert template
   */
  async function loadTemplate() {
    if (alertTemplate) return alertTemplate;
    
    try {
      const response = await fetch(chrome.runtime.getURL('src/content/alert.html'));
      alertTemplate = await response.text();
      return alertTemplate;
    } catch (error) {
      console.error('[CookieShield Alert] Failed to load template:', error);
      return null;
    }
  }

  /**
   * Truncate long values for display (with HTML escaping)
   */
  function truncateValue(value, maxLength = 50) {
    if (!value) return 'N/A';
    const str = String(value);
    const truncated = str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
    return escapeHtml(truncated);
  }

  /**
   * Create the alert HTML structure
   */
  async function createAlertHTML(cookieData) {
    const template = await loadTemplate();
    if (!template) return null;

    const isMultiple = cookieData.type === 'Multiple';
    
    let alertMessage = '';
    let alertIcon = '⚠️';
    let alertSubtitle = '';
    let cookiesHTML = '';

    if (isMultiple) {
      // Multiple cookies alert - analyze types to determine message
      const allCookies = cookieData.cookies || [];
      const typeCounts = { New: 0, Altered: 0, Refreshed: 0 };
      
      allCookies.forEach(cookie => {
        const type = cookie.type || 'New';
        if (typeCounts[type] !== undefined) {
          typeCounts[type]++;
        }
      });
      
      const totalCookies = allCookies.length;
      
      // Check for cookie stuffing event (5+ cookies)
      if (totalCookies >= 5) {
        alertIcon = '🚨';
        alertMessage = 'Cookie Stuffing Event Detected';
        alertSubtitle = `${totalCookies} cookies were loaded`;
      } else {
        // Determine message based on predominant type (normal batch)
        if (typeCounts.New === totalCookies) {
          alertMessage = totalCookies > 1 ? 'New Cookies Detected' : 'New Cookie Detected';
        } else if (typeCounts.Altered === totalCookies) {
          alertMessage = totalCookies > 1 ? 'Cookies Altered' : 'Cookie Altered';
        } else if (typeCounts.Refreshed === totalCookies) {
          alertMessage = totalCookies > 1 ? 'Cookies Refreshed' : 'Cookie Refreshed';
        } else if (typeCounts.New > 0 && (typeCounts.Altered > 0 || typeCounts.Refreshed > 0)) {
          // Mixed with new cookies - emphasize new
          alertMessage = 'New Cookies Detected';
        } else {
          // Mixed altered/refreshed
          alertMessage = 'Cookies Updated';
        }
      }

      // Create cookie cards
      const networks = cookieData.networks || [];
      networks.forEach((network, idx) => {
        const networkCookies = cookieData.cookiesByNetwork[network] || [];
        if (idx > 0) {
          cookiesHTML += `<div class="cg-network-separator" data-network="${escapeHtml(network)}"></div>`;
        }
        
        networkCookies.forEach(cookie => {
          cookiesHTML += createCookieCard(cookie);
        });
      });

    } else {
      // Single cookie alert
      const action = cookieData.type || 'New';
      
      if (action === 'Altered') {
        alertMessage = 'Cookie Altered';
      } else if (action === 'Refreshed') {
        alertMessage = 'Cookie Refreshed';
      } else {
        alertMessage = 'New Cookie Detected';
      }

      // Special case for Amazon affiliate links
      if (cookieData.network === 'amazon' && (cookieData.name.includes('affiliate link') || cookieData.amazonLink)) {
        alertMessage = 'Amazon Affiliate Link Detected';
      }

      cookiesHTML = createCookieCard(cookieData);
    }

    // Replace template placeholders
    return template
      .replace(/\{\{LOGO_URL\}\}/g, chrome.runtime.getURL('img/icon48.png'))
      .replace(/\{\{ALERT_ICON\}\}/g, alertIcon)
      .replace(/\{\{ALERT_MESSAGE\}\}/g, alertMessage)
      .replace(/\{\{ALERT_SUBTITLE\}\}/g, alertSubtitle)
      .replace(/\{\{COOKIES_HTML\}\}/g, cookiesHTML);
  }

  /**
   * Create a cookie card HTML
   */
  function createCookieCard(cookie) {
    const typeClass = cookie.type ? escapeHtml(cookie.type.toLowerCase()) : 'new';
    let cookieValueHTML = '';
    
    if (cookie.network === 'amazon' && (cookie.name.includes('affiliate link') || cookie.amazonLink)) {
      let affiliateTag = 'unknown';
      
      if (cookie.amazonLink && cookie.amazonLink.affiliateId) {
        affiliateTag = cookie.amazonLink.affiliateId;
      } else if (cookie.details) {
        const tagMatch = cookie.details.match(/\((.*?)\)/);
        if (tagMatch && tagMatch[1]) {
          affiliateTag = tagMatch[1];
        }
      }
      
      cookieValueHTML = `
        <div><strong>Tag:</strong> ${escapeHtml(affiliateTag)}</div>
        ${cookie.totalLinks ? `<div><strong>Count:</strong> ${escapeHtml(cookie.totalLinks)} link(s) detected</div>` : ''}
      `;
    } else if (cookie.type === 'Altered' && cookie.oldValue) {
      cookieValueHTML = `
        <div class="cg-cookie-value-change">
          <div class="cg-old-value">Old: ${truncateValue(cookie.oldValue)}</div>
          <div class="cg-new-value">New: ${truncateValue(cookie.value || 'N/A')}</div>
        </div>
      `;
    } else {
      cookieValueHTML = `<div><strong>Value:</strong> ${truncateValue(cookie.value || 'N/A')}</div>`;
    }

    const networkName = escapeHtml((cookie.network || 'unknown').charAt(0).toUpperCase() + (cookie.network || 'unknown').slice(1));
    const cookieType = escapeHtml(cookie.type || 'New');
    const cookieName = escapeHtml(cookie.name || 'N/A');
    const cookieDomain = escapeHtml(cookie.domain || 'N/A');

    return `
      <div class="cg-alert-cookie-card">
        <div class="cg-cookie-card-header">
          <span class="cg-cookie-network-badge">${networkName}</span>
          <span class="cg-cookie-type-badge cg-${typeClass}">${cookieType}</span>
        </div>
        <div class="cg-cookie-card-details">
          <div><strong>Name:</strong> ${cookieName}</div>
          <div><strong>Domain:</strong> ${cookieDomain}</div>
          ${cookieValueHTML}
        </div>
      </div>
    `;
  }

  /**
   * Show the alert
   */
  async function showAlert(cookieData, isRestoration = false) {
    log('showAlert called with:', cookieData, 'isRestoration:', isRestoration);
    
    // If we just restored an alert and a new one comes in very quickly, it's likely
    // the same cookie being detected again. Skip to prevent flickering.
    if (restoredRecentAlert && !isRestoration) {
      log('Skipping new alert - just restored one recently');
      return;
    }
    
    // Remove existing alert if any (but don't clear storage if we're showing a new one)
    if (currentAlert) {
      currentAlert.classList.remove('cg-show');
      setTimeout(() => {
        if (currentAlert && currentAlert.parentNode) {
          currentAlert.parentNode.removeChild(currentAlert);
        }
        currentAlert = null;
      }, 300);
    }

    // Store alert data for persistence across redirects (but not if we're restoring)
    if (!isRestoration) {
      storeAlertData(cookieData);
    }

    // Create and inject alert
    const alertHTML = await createAlertHTML(cookieData);
    if (!alertHTML) {
      console.error('[CookieShield Alert] Failed to create alert HTML');
      return;
    }
    
    log('Alert HTML created, injecting into page');
    
    document.body.insertAdjacentHTML('beforeend', alertHTML);
    currentAlert = document.getElementById('cookieShieldAlert');

    // Force browser to compute initial styles before animating
    // Double RAF ensures initial state is rendered before transition
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (currentAlert) {
          currentAlert.classList.add('cg-show');
          log('Animation triggered');
        }
      });
    });

    // Attach event listeners
    attachEventListeners(cookieData);
  }

  /**
   * Store alert data in sessionStorage for persistence across redirects
   */
  function storeAlertData(cookieData) {
    try {
      sessionStorage.setItem(ALERT_STORAGE_KEY, JSON.stringify({
        cookieData: cookieData,
        timestamp: Date.now()
      }));
    } catch (e) {
      console.error('[CookieShield Alert] Failed to store alert data:', e);
    }
  }

  /**
   * Clear stored alert data
   */
  function clearStoredAlert() {
    try {
      sessionStorage.removeItem(ALERT_STORAGE_KEY);
    } catch (e) {
      // Ignore errors
    }
  }

  /**
   * Check for and restore a recent alert after page load
   */
  function restoreRecentAlert() {
    try {
      const stored = sessionStorage.getItem(ALERT_STORAGE_KEY);
      if (!stored) return;

      const { cookieData, timestamp } = JSON.parse(stored);
      const age = Date.now() - timestamp;

      // Only restore if alert is less than ALERT_TIMEOUT_MS old
      if (age < ALERT_TIMEOUT_MS) {
        log('Restoring alert after redirect (age: ' + age + 'ms)');
        restoredRecentAlert = true;
        showAlert(cookieData, true); // Pass true to indicate this is a restoration
        
        // After a short delay, allow new alerts again
        setTimeout(() => {
          restoredRecentAlert = false;
          log('Alert deduplication window expired, new alerts allowed');
        }, ALERT_DEDUPE_MS);
      } else {
        // Alert is too old, clear it
        clearStoredAlert();
      }
    } catch (e) {
      console.error('[CookieShield Alert] Failed to restore alert:', e);
      clearStoredAlert();
    }
  }

  /**
   * Remove the alert
   */
  function removeAlert() {
    // Clear stored alert when user explicitly closes it
    clearStoredAlert();
    
    if (currentAlert) {
      currentAlert.classList.remove('cg-show');
      setTimeout(() => {
        if (currentAlert && currentAlert.parentNode) {
          currentAlert.parentNode.removeChild(currentAlert);
        }
        currentAlert = null;
        inspectModeActive = false;
      }, 300);
    }
  }

  /**
   * Toggle inspect mode
   */
  function toggleInspectMode() {
    const initialView = document.getElementById('cgAlertInitial');
    const expandedView = document.getElementById('cgAlertExpanded');
    const cookiesContainer = document.getElementById('cgCookiesContainer');
    const actionsContainer = document.querySelector('.cg-alert-actions');
    const alertSection = document.getElementById('cgAlertSection');

    if (!initialView || !expandedView) return;

    if (!inspectModeActive) {
      // Swap to expanded view
      initialView.style.display = 'none';
      expandedView.style.display = 'block';
      
      // Hide entire actions container (including padding)
      if (actionsContainer) {
        actionsContainer.style.display = 'none';
      }
      
      // Add bottom margin to section to compensate for hidden actions
      if (alertSection) {
        alertSection.classList.add('cg-inspect-mode');
      }
      
      // Animate cookie cards
      if (cookiesContainer) {
        setTimeout(() => {
          const cards = cookiesContainer.querySelectorAll('.cg-alert-cookie-card');
          cards.forEach((card, index) => {
            card.style.setProperty('--card-index', index);
            card.classList.add('cg-visible');
          });
        }, 100);
      }

      inspectModeActive = true;

    } else {
      // Swap back to initial view
      expandedView.style.display = 'none';
      initialView.style.display = 'block';
      
      // Show actions container again
      if (actionsContainer) {
        actionsContainer.style.display = 'block';
      }
      
      // Remove bottom margin from section
      if (alertSection) {
        alertSection.classList.remove('cg-inspect-mode');
      }
      
      // Remove animations from cards
      if (cookiesContainer) {
        const cards = cookiesContainer.querySelectorAll('.cg-alert-cookie-card');
        cards.forEach(card => card.classList.remove('cg-visible'));
      }

      inspectModeActive = false;
    }
  }

  /**
   * Attach event listeners to alert buttons
   */
  function attachEventListeners(cookieData) {
    // Close button
    const closeBtn = document.getElementById('cgCloseBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', removeAlert);
    }

    // Inspect button
    const inspectBtn = document.getElementById('cgInspectBtn');
    if (inspectBtn) {
      inspectBtn.addEventListener('click', toggleInspectMode);
    }

    // Back button
    const backBtn = document.getElementById('cgBackBtn');
    if (backBtn) {
      backBtn.addEventListener('click', toggleInspectMode);
    }

    // Pause button
    const pauseBtn = document.getElementById('cgPauseBtn');
    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => {
        let domain = cookieData.domain || window.location.hostname;
        
        // Normalize domain: remove leading dot if present
        if (domain && domain.startsWith('.')) {
          domain = domain.substring(1);
        }
        
        // Send message to background to pause site
        chrome.runtime.sendMessage({
          command: 'pauseSite',
          domain: domain
        }, (response) => {
          if (response && response.success) {
            // Show confirmation and close alert
            const pauseBtn = document.getElementById('cgPauseBtn');
            if (pauseBtn) {
              pauseBtn.innerHTML = '<span class="cg-icon">✓</span><span class="cg-btn-text">Paused!</span>';
              pauseBtn.style.pointerEvents = 'none';
            }
            
            // Clear stored alert since site is now paused
            clearStoredAlert();
            setTimeout(removeAlert, 1500);
          }
        });
      });
    }

    // Close on escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        removeAlert();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
  }

  /**
   * Listen for messages from background script
   */
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.command === 'showAlert') {
      log('Showing alert for:', request.cookieData);
      showAlert(request.cookieData);
      sendResponse({ success: true });
    }
    return true;
  });

  log('Content script loaded and ready');

  // Restore alert if page was redirected and alert is recent
  restoreRecentAlert();

  // Expose test function for debugging
  window.testCookieShieldAlert = function() {
    log('Manual test triggered');
    showAlert({
      type: 'New',
      network: 'test',
      name: 'test_cookie',
      domain: window.location.hostname,
      value: 'test_value_12345'
    });
  };
  
  log('Test function available: window.testCookieShieldAlert()');

})();

