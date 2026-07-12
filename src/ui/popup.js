document.addEventListener('DOMContentLoaded', () => {
  const activityList = document.getElementById('cookieActivity');
  const viewActiveCookiesBtn = document.getElementById('viewActiveCookies');
  const hideActiveCookiesBtn = document.getElementById('hideActiveCookies');
  const activeCookiesContainer = document.getElementById('activeCookiesContainer');
  const activeCookiesList = document.getElementById('activeCookiesList');
  const clearAllCookiesBtn = document.getElementById('clearAllCookies');
  const monitoringState = document.getElementById('monitoringState');
  const alertState = document.getElementById('alertState');
  const alertMessage = document.getElementById('alertMessage');
  const alertDetails = document.getElementById('alertDetails');
  const recentActivity = document.getElementById('recentActivity');
  
  // Main view reference (needed for popup logic)
  const mainContentView = document.getElementById('mainContentView');
  
  // Use shared UI utilities
  const { fadeOut, fadeIn, normalizeDomain } = window.uiUtils;

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

  function addActivityItem(cookieInfo) {
    if (cookieInfo.type === 'Multiple' && cookieInfo.cookies) {
      cookieInfo.cookies.forEach(cookie => {
        addSingleActivityItem(cookie);
      });
    } else {
      addSingleActivityItem(cookieInfo);
    }
  }

  function addSingleActivityItem(cookieInfo) {
    const item = document.createElement('div');
    item.className = 'activity-item';
    
    const timestamp = new Date().toLocaleTimeString();
    const network = escapeHtml(cookieInfo.network || 'Unknown Network');
    const type = cookieInfo.type ? escapeHtml(cookieInfo.type.toLowerCase()) : 'new';
    const cookieType = escapeHtml(cookieInfo.type || 'New');
    const cookieDomain = escapeHtml(cookieInfo.domain);
    const cookieName = escapeHtml(cookieInfo.name);
    const cookieValue = escapeHtml(cookieInfo.value || 'N/A');
    const cookieDetails = cookieInfo.details ? escapeHtml(cookieInfo.details) : '';
    
    item.innerHTML = `
      <div class="activity-status ${type}">
        ${cookieType} Cookie
      </div>
      <div class="activity-content">
        <strong>${network}</strong>
        <div class="activity-details">
          <div>Domain: ${cookieDomain}</div>
          <div>Name: ${cookieName}</div>
          ${cookieDetails ? `<div class="details">${cookieDetails}</div>` : ''}
          <div>Value: ${cookieValue}</div>
        </div>
        <div class="timestamp">${escapeHtml(timestamp)}</div>
      </div>
    `;

    const existingItems = activityList.children.length;
    item.style.setProperty('animation-delay', `${existingItems * 0.05}s`);

    activityList.insertBefore(item, activityList.firstChild);
    
    while (activityList.children.length > 5) {
      activityList.removeChild(activityList.lastChild);
    }


  }

// Format cookie value display based on cookie type
function formatCookieValue(data) {
  if (data.type === 'Altered' && data.oldValue) {
    return `
      <div class="cookie-change">
        <div class="old-value"><span>Old:</span>${truncateValue(data.oldValue)}</div>
        <div class="new-value"><span>New:</span>${truncateValue(data.value)}</div>
      </div>
    `;
  } else {
    return `<div>Value: ${truncateValue(data.value || 'N/A')}</div>`;
  }
}

const pauseSiteBtn = document.getElementById('pauseSiteBtn');
let currentAlertDomain = null;

function setPopupState(state, data = null) {
  if (state === 'alert') {
    monitoringState.style.display = 'none';
    alertState.style.display = 'block';
    recentActivity.innerHTML = '';
    
    if (data) {
      if (data.type === 'Multiple' && data.cookies && data.cookies.length > 0) {
        const newCookies = data.cookies.filter(c => c.type === 'New').length;
        const alteredCookies = data.cookies.filter(c => c.type === 'Altered').length;
        const refreshedCookies = data.cookies.filter(c => c.type === 'Refreshed').length;
        
        let alertText = '';
        if (newCookies > 0) {
          alertText = newCookies === 1 ? 'New Cookie Detected' : 'New Cookies Detected';
        } else if (alteredCookies > 0) {
          alertText = alteredCookies === 1 ? 'Cookie Altered' : 'Cookies Altered';
        } else if (refreshedCookies > 0) {
          alertText = refreshedCookies === 1 ? 'Cookie Refreshed' : 'Cookies Refreshed';
        } else {
          alertText = data.totalCookies === 1 ? 'Cookie Detected' : 'Cookies Detected';
        }
        
        alertMessage.textContent = alertText;
        
        let summaryText = '';
        if (data.networkCount === 1) {
          const networkName = data.networks[0];
          if (data.totalCookies === 1) {
            summaryText = `1 cookie detected from the ${networkName} network`;
          } else {
            summaryText = `${data.totalCookies} cookies detected from the ${networkName} network`;
          }
        } else {
          if (data.totalCookies === 1) {
            summaryText = `1 cookie detected across ${data.networkCount} networks`;
          } else {
            summaryText = `${data.totalCookies} cookies detected across ${data.networkCount} networks`;
          }
        }
        document.getElementById('alertSummary').textContent = summaryText;
        
        const alertCookiesList = document.getElementById('alertCookiesList');
        alertCookiesList.innerHTML = '';
      
        let lastNetwork = null;
        data.cookies.forEach((cookie, index) => {
          if (data.networkCount > 1 && cookie.network !== lastNetwork) {
            if (index > 0) {
              const separator = document.createElement('div');
              separator.className = 'network-separator';
              separator.setAttribute('data-network', escapeHtml(cookie.network.toUpperCase()));
              alertCookiesList.appendChild(separator);
            }
            lastNetwork = cookie.network;
          }
          
          const cookieCard = document.createElement('div');
          cookieCard.className = 'alert-cookie-card';
          
          const typeClass = cookie.type ? escapeHtml(cookie.type.toLowerCase()) : 'new';
          const cookieType = escapeHtml(cookie.type || 'New');
          const cookieNetwork = escapeHtml(cookie.network.toUpperCase());
          const cookieDomain = escapeHtml(cookie.domain || 'Unknown');
          const cookieName = escapeHtml(cookie.name || 'Unknown');
          
          let cookieValueHTML = '';
          if (cookie.type === 'Altered' && cookie.oldValue) {
            cookieValueHTML = `
              <div class="cookie-value-change">
                <div class="old-value">Old: ${truncateValue(cookie.oldValue)}</div>
                <div class="new-value">New: ${truncateValue(cookie.value || 'N/A')}</div>
              </div>
            `;
          } else {
            cookieValueHTML = `<div><strong>Value:</strong> ${truncateValue(cookie.value || 'N/A')}</div>`;
          }
          
          cookieCard.innerHTML = `
            <div class="cookie-card-header">
              <span class="cookie-network-badge">${cookieNetwork}</span>
              <span class="cookie-type-badge ${typeClass}">${cookieType}</span>
            </div>
            <div class="cookie-card-details">
              <div><strong>Domain:</strong> ${cookieDomain}</div>
              <div><strong>Name:</strong> ${cookieName}</div>
              ${cookieValueHTML}
            </div>
          `;
          
          alertCookiesList.appendChild(cookieCard);
        });
        
        currentAlertDomain = data.domain;
        
      } else {
        const action = data.type || 'New';
        
        if (action === 'Altered') {
          alertMessage.textContent = 'Cookie Altered';
        } else if (action === 'Refreshed') {
          alertMessage.textContent = 'Cookie Refreshed';
        } else {
          alertMessage.textContent = 'New Cookie Detected';
        }
      
        const alertCookiesList = document.getElementById('alertCookiesList');
        alertCookiesList.innerHTML = '';
        
        const cookieCard = document.createElement('div');
        cookieCard.className = 'alert-cookie-card';
        
        const typeClass = data.type ? escapeHtml(data.type.toLowerCase()) : 'new';
        const cookieType = escapeHtml(data.type || 'New');
        const cookieNetwork = escapeHtml((data.network || 'Unknown').toUpperCase());
        const cookieDomain = escapeHtml(data.domain || 'Unknown');
        const cookieName = escapeHtml(data.name || 'Unknown');
        
        let cookieValueHTML = '';
        
        if (data.network === 'amazon' && (data.name.includes('affiliate link') || data.amazonLink)) {
          alertMessage.textContent = 'Amazon Affiliate Link Detected';
          
          let affiliateTag = 'unknown';
          
          if (data.amazonLink && data.amazonLink.affiliateId) {
            affiliateTag = data.amazonLink.affiliateId;
          } else if (data.details) {
            const tagMatch = data.details.match(/\((.*?)\)/);
            if (tagMatch && tagMatch[1]) {
              affiliateTag = tagMatch[1];
            }
          }
          
          cookieValueHTML = `
            <div><strong>Tag:</strong> ${escapeHtml(affiliateTag)}</div>
            ${data.totalLinks ? `<div><strong>Count:</strong> ${escapeHtml(data.totalLinks)} link(s) detected</div>` : ''}
          `;
        } else if (data.type === 'Altered' && data.oldValue) {
          cookieValueHTML = `
            <div class="cookie-value-change">
              <div class="old-value">Old: ${truncateValue(data.oldValue)}</div>
              <div class="new-value">New: ${truncateValue(data.value || 'N/A')}</div>
            </div>
          `;
        } else {
          cookieValueHTML = `<div><strong>Value:</strong> ${truncateValue(data.value || 'N/A')}</div>`;
        }
        
        cookieCard.innerHTML = `
          <div class="cookie-card-header">
            <span class="cookie-network-badge">${cookieNetwork}</span>
            <span class="cookie-type-badge ${typeClass}">${cookieType}</span>
          </div>
          <div class="cookie-card-details">
            <div><strong>Domain:</strong> ${cookieDomain}</div>
            <div><strong>Name:</strong> ${cookieName}</div>
            ${cookieValueHTML}
          </div>
        `;
        
        alertCookiesList.appendChild(cookieCard);
      
        document.getElementById('alertSummary').textContent = '';
        
        currentAlertDomain = data.domain;
      }
      
      if (currentAlertDomain) {
        settingsManager.isPausedSite(currentAlertDomain).then(paused => {
          pauseSiteBtn.style.display = paused ? 'none' : 'block';
        });
      } else {
        pauseSiteBtn.style.display = 'none';
      }
    }
  } else {
    monitoringState.style.display = 'block';
    alertState.style.display = 'none';
    pauseSiteBtn.style.display = 'none';
    currentAlertDomain = null;
  }
}

  // Always show main monitoring view (alerts are now injected into pages)
  showHeaderForManualOpen();
  setPopupState('monitoring');

  // Hide header elements for notification view
  function hideHeaderForNotification() {
    const header = document.querySelector('.header');
    const settingsIcon = document.getElementById('settingsIcon');
    const controls = document.querySelector('.controls');
    const controlsCompact = document.querySelector('.controls-compact');
    
    if (header) {
      header.style.display = 'none';
    }
    if (settingsIcon) {
      settingsIcon.style.display = 'none';
    }
    if (controls) {
      controls.style.display = 'none';
    }
    if (controlsCompact) {
      controlsCompact.style.display = 'none';
    }
    
    const container = document.querySelector('.container');
    if (container) {
      container.style.paddingTop = '20px';
    }
    
    setupNotificationLayout();
  }

  // Show header elements for manual open
  function showHeaderForManualOpen() {
    const header = document.querySelector('.header');
    const settingsIcon = document.getElementById('settingsIcon');
    const controls = document.querySelector('.controls');
    const controlsCompact = document.querySelector('.controls-compact');
    
    if (header) {
      header.style.display = 'flex';
    }
    if (settingsIcon) {
      settingsIcon.style.display = 'flex';
    }
    if (controls) {
      controls.style.display = 'flex';
    }
    if (controlsCompact) {
      controlsCompact.style.display = 'flex';
    }
    
    const container = document.querySelector('.container');
    if (container) {
      container.style.paddingTop = '20px';
    }
  }

  // Setup notification layout with branding inside alert box
  function setupNotificationLayout() {
    const alertSection = document.querySelector('.alert-section');
    if (!alertSection) return;
    
    const brandingSection = document.createElement('div');
    brandingSection.className = 'alert-branding';
    brandingSection.innerHTML = `
      <div class="alert-logo-container">
        <img src="../../img/icon48.png" alt="Logo" class="alert-logo">
        <div class="alert-logo-glow"></div>
      </div>
      <h2 class="alert-title">Cookie<span class="accent">Guard</span></h2>
    `;
    
    alertSection.insertBefore(brandingSection, alertSection.firstChild);
    
    const inspectButton = document.createElement('button');
    inspectButton.id = 'inspectButton';
    inspectButton.className = 'cyber-button inspect-btn';
    inspectButton.textContent = 'Inspect';
    inspectButton.style.marginTop = '15px';
    
    const alertSummary = document.getElementById('alertSummary');
    if (alertSummary && alertSummary.parentNode) {
      alertSummary.parentNode.insertBefore(inspectButton, alertSummary.nextSibling);
    }
    
    let detailsVisible = false;
    let originalAlertContent = null;
    
    const handleInspectClick = () => {
      const alertCookiesContainer = document.querySelector('.alert-cookies-container');
      const alertSection = document.querySelector('.alert-section');
      
      if (detailsVisible) {
        alertSection.classList.add('collapsing');
        
        setTimeout(() => {
          if (originalAlertContent && alertSection) {
            alertSection.innerHTML = originalAlertContent;
            
            // Re-add the inspect button after restoring content
            const newInspectButton = alertSection.querySelector('#inspectButton');
            if (newInspectButton) {
              newInspectButton.addEventListener('click', handleInspectClick);
            }
            
            // Remove animation class
            alertSection.classList.remove('collapsing');
          }
          detailsVisible = false;
        }, 200); // Halfway through the animation
        
      } else {
        // Show details with smooth animation
        if (alertSection && alertCookiesContainer) {
          // Store original content before replacing
          originalAlertContent = alertSection.innerHTML;
          
          // Add expanding animation
          alertSection.classList.add('expanding');
          
          // Clear alert section and add branding + cookie data
          alertSection.innerHTML = `
            <div class="alert-branding">
              <div class="alert-logo-container">
                <img src="../../img/icon48.png" alt="Logo" class="alert-logo">
                <div class="alert-logo-glow"></div>
              </div>
              <h2 class="alert-title">Cookie<span class="accent">Guard</span></h2>
            </div>
          `;
          
          // Move cookie data from container to alert section with animation
          const cookiesList = alertCookiesContainer.querySelector('#alertCookiesList');
          if (cookiesList) {
            const cookiesClone = cookiesList.cloneNode(true);
            cookiesClone.className += ' inspect-content';
            cookiesClone.style.maxHeight = '300px';
            cookiesClone.style.overflowY = 'auto';
            cookiesClone.style.marginTop = '15px';
            
            // Add staggered animation to cookie cards
            const cookieCards = cookiesClone.querySelectorAll('.alert-cookie-card');
            cookieCards.forEach((card, index) => {
              card.style.setProperty('--card-index', index);
            });
            
            alertSection.appendChild(cookiesClone);
            
            // Trigger content animation
            setTimeout(() => {
              cookiesClone.classList.add('visible');
            }, 100);
          }
          
          // Add back button with slight delay
          setTimeout(() => {
            const backButton = document.createElement('button');
            backButton.id = 'inspectButton';
            backButton.className = 'cyber-button inspect-btn inspect-content';
            backButton.textContent = 'Back';
            backButton.style.marginTop = '15px';
            backButton.addEventListener('click', handleInspectClick);
            alertSection.appendChild(backButton);
            
            // Animate button in
            setTimeout(() => {
              backButton.classList.add('visible');
            }, 50);
          }, 150);
          
          // Remove expanding class after animation
          setTimeout(() => {
            alertSection.classList.remove('expanding');
          }, 400);
        }
        detailsVisible = true;
      }
    };
    
    // Attach the event listener to the initial button
    inspectButton.addEventListener('click', handleInspectClick);
    
    // Initially hide the detailed cookie information container
    const alertCookiesContainer = document.querySelector('.alert-cookies-container');
    if (alertCookiesContainer) {
      alertCookiesContainer.style.display = 'none';
    }
  }

  // ✨ FIXED: Move processCookieData function outside to avoid scope issues
  function processCookieData(response) {
    if (response.hasAffiliateCookies) {
      // Group cookies by network using the cookie's network property or request it
      const cookiesByNetwork = {};
      
      // Process each cookie
      const processCookies = async () => {
        for (const cookie of response.cookies) {
          let network = cookie.network;
          
          // Make sure we handle asynchronous responses properly
          if (!network) {
            try {
              // Request network info from background script
              network = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage(
                  { command: 'detectNetwork', cookie: cookie },
                  response => {
                    if (chrome.runtime.lastError) {
                      reject(chrome.runtime.lastError);
                    } else if (response && response.network) {
                      resolve(response.network);
                    } else {
                      resolve('unknown');
                    }
                  }
                );
              });
              
              // Add the network to the cookie object for future reference
              cookie.network = network;
            } catch (error) {
              network = 'unknown';
            }
          }
          
          // Continue with the rest of the cookie processing
          if (!cookiesByNetwork[network]) cookiesByNetwork[network] = [];
          cookiesByNetwork[network].push(cookie);
        }
        
        // Clear previous content
        activeCookiesList.innerHTML = '';
        
        // Create elements for each network group
        Object.entries(cookiesByNetwork).forEach(([network, cookies], networkIndex) => {
          const networkGroup = document.createElement('div');
          networkGroup.className = 'cookie-network-group';
          
          let cookieItemsHTML = '';
          cookies.forEach((cookie, cookieIndex) => {
            // Add animation delay index as a CSS variable
            const itemIndex = networkIndex + cookieIndex;
            const cookieDomain = escapeHtml(cookie.domain);
            const cookieName = escapeHtml(cookie.name);
            const cookieValue = truncateValue(cookie.value);
            
            cookieItemsHTML += `
              <div class="cookie-item" style="--item-index: ${itemIndex}">
                <div class="activity-details">
                  <div>Domain: ${cookieDomain}</div>
                  <div>Name: ${cookieName}</div>
                  <div>Value: ${cookieValue}</div>
                </div>
              </div>
            `;
          });
          
          const networkName = escapeHtml(network.toUpperCase());
          const cookieCount = escapeHtml(cookies.length);
          
          networkGroup.innerHTML = `
            <div class="network-header">${networkName} (${cookieCount})</div>
            ${cookieItemsHTML}
          `;
          
          activeCookiesList.appendChild(networkGroup);
        });
        
        // Buttons already updated in click handler
      };
      
      processCookies();
    } else {
      // Handle case where no cookies are found
      activeCookiesList.innerHTML = `
        <div class="cookie-item">
          <div class="activity-details">No active affiliate cookies found</div>
        </div>
      `;
      
      // Buttons already updated in click handler
    }
  }

  viewActiveCookiesBtn.addEventListener('click', () => {
    // Start animation immediately - don't wait for data
    fadeOut(monitoringState, () => {
      fadeIn(activeCookiesContainer);
    });
    
    // Update button states immediately
    hideActiveCookiesBtn.style.display = 'block';
    viewActiveCookiesBtn.style.display = 'none';
    
    // Hide pause button when viewing cookies
    quickPauseBtn.style.display = 'none';
    
    // Show loading state
    activeCookiesList.innerHTML = `
      <div class="cookie-item">
        <div class="activity-details">Loading cookies...</div>
      </div>
    `;
    
    // Load data in parallel
    chrome.runtime.sendMessage({ command: 'getStatus' }, (response) => {
      processCookieData(response);
    });
  });

  // Also update the hideActiveCookiesBtn click handler
  hideActiveCookiesBtn.addEventListener('click', () => {
    fadeOut(activeCookiesContainer, () => {
      fadeIn(monitoringState);
      
      // Update buttons
      hideActiveCookiesBtn.style.display = 'none';
      viewActiveCookiesBtn.style.display = 'block';
      
      // Show pause button again
      updateQuickPauseButton();
    });
  });

  // Replace the clearAllCookiesBtn click handler
  clearAllCookiesBtn.addEventListener('click', () => {
    // Show custom confirmation dialog instead of browser confirm
    const clearCookiesDialog = document.getElementById('clearCookiesDialog');
    const clearYesBtn = document.getElementById('clearYesBtn');
    const clearNoBtn = document.getElementById('clearNoBtn');
    const closeClearDialog = document.getElementById('closeClearDialog');
    
    // Show the dialog
    clearCookiesDialog.style.display = 'block';
    
    // Handle Yes button click
    clearYesBtn.onclick = function() {
      clearCookiesDialog.style.display = 'none';
      
      // Call the clear affiliate cookies command
      chrome.runtime.sendMessage({ command: 'clearAffiliateCookies' }, () => {
        // Show a message in the cookie list
        activeCookiesList.innerHTML = `
          <div class="cookie-item">
            <div class="activity-details">Affiliate tracking cookies have been cleared</div>
          </div>
        `;
        
        // Add a notification to the activity list
        addActivityItem({
          type: 'Cleared',
          network: 'All Networks',
          domain: 'All Domains',
          name: 'Affiliate Cookies',
          details: 'Detected affiliate tracking cookies have been cleared from your browser',
          value: '',
        });
        
        // Hide the active cookies container and show monitoring state
        setTimeout(() => {
          fadeOut(activeCookiesContainer, () => {
            fadeIn(monitoringState);
            hideActiveCookiesBtn.style.display = 'none';
            viewActiveCookiesBtn.style.display = 'block';
          });
        }, 1500); // Give user time to read the message
      });
    };
    
    // Handle No button click and close button
    clearNoBtn.onclick = closeClearDialog.onclick = function() {
      clearCookiesDialog.style.display = 'none';
    };
  });

  function truncateValue(value) {
    const truncated = value.length > 50 ? value.substring(0, 47) + '...' : value;
    return escapeHtml(truncated);
  }

  // Notification settings now handled by settings-ui.js
  // Network management now handled by network-manager.js
  
  // Quick pause button reference
  const quickPauseBtn = document.getElementById('quickPauseBtn');

  // Current site management
  let currentSiteUrl = null;

  function getCurrentSiteDomain() {
    return new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs[0] && tabs[0].url) {
          try {
            const url = new URL(tabs[0].url);
            const normalizedDomain = normalizeDomain(url.hostname);
            currentSiteUrl = normalizedDomain;
            resolve(normalizedDomain);
          } catch (e) {
            resolve(null);
          }
        } else {
          resolve(null);
        }
      });
    });
  }



  async function toggleCurrentSitePause() {
    if (!currentSiteUrl) return;
    
    const isPaused = await settingsManager.isPausedSite(currentSiteUrl);
    
    if (isPaused) {
      // Resume alerts
      await settingsManager.removePausedSite(currentSiteUrl);
    } else {
      // Pause alerts
      await settingsManager.addPausedSite(currentSiteUrl);
    }
    
    // Update UI
    if (typeof window.settingsUI !== 'undefined') {
      await window.settingsUI.loadManagePausedSites();
      await window.settingsUI.updatePausedSitesCount();
    }
    updateAllPauseButtons();
  }
  
  // ✨ Update all pause buttons consistently
  function updateAllPauseButtons() {
    updateQuickPauseButton();
    updateAlertPagePauseButton();
  }
  
  async function updateAlertPagePauseButton() {
    const domain = await getCurrentSiteDomain();
    if (domain && pauseSiteBtn) {
      const isPaused = await settingsManager.isPausedSite(domain);
      
      if (isPaused) {
        updateButtonContent(pauseSiteBtn, 'play_circle', 'Resume alerts on this site', 'success');
      } else {
        updateButtonContent(pauseSiteBtn, 'pause_circle', 'Pause alerts on this site', 'warning');
      }
    }
  }

  // ✨ UNIFIED BUTTON MANAGEMENT SYSTEM
  function updateButtonContent(button, icon, text, variant = 'primary') {
    if (!button) return;
    
    const iconElement = button.querySelector('.material-icons');
    const textElement = button.querySelector('.btn-text');
    
    if (iconElement) iconElement.textContent = icon;
    if (textElement) textElement.textContent = text;
    
    // Update variant classes
    button.classList.remove('primary', 'warning', 'secondary', 'success');
    button.classList.add(variant);
  }

  async function updateQuickPauseButton() {
    const domain = await getCurrentSiteDomain();
    if (domain) {
      const isPaused = await settingsManager.isPausedSite(domain);
      
      if (isPaused) {
        updateButtonContent(quickPauseBtn, 'play_circle', 'Resume alerts on this site', 'success');
      } else {
        updateButtonContent(quickPauseBtn, 'pause_circle', 'Pause alerts on this site', 'warning');
      }
      quickPauseBtn.style.display = 'block';
    } else {
      quickPauseBtn.style.display = 'none';
    }
  }

  // Pause management now handled by settings-ui.js
  
  // ✨ UNIFIED PAUSE BUTTON HANDLER
  function handlePauseClick() {
    getCurrentSiteDomain().then(domain => {
      if (domain) {
        currentSiteUrl = domain;
        toggleCurrentSitePause();
      }
    });
  }

  // Quick pause button in main controls (home page)
  quickPauseBtn.addEventListener('click', handlePauseClick);
  
  // Pause button on alert page (using existing pauseSiteBtn variable)
  if (pauseSiteBtn) {
    pauseSiteBtn.addEventListener('click', handlePauseClick);
  }
  
  // ✨ Initialize all buttons and counters on popup open
  updateAllPauseButtons();

  // Listen for paused sites changes to update button states in real-time
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes.pausedNotificationSites) {
      // Paused sites changed - update buttons
      updateAllPauseButtons();
    }
  });

  // Export functions for use by other scripts (settings-ui.js)
  window.updateAllPauseButtons = updateAllPauseButtons;

});
