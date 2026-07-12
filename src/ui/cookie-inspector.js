/**
 * Cookie Inspector
 * Provides cookie search and monitoring functionality
 */

window.cookieInspector = (function() {
  let currentCookies = [];
  let cookieActivity = [];
  let ignoredDomains = ['.google.com', 'chatgpt.com'];

  function init() {
    // Tab switching functionality - works in both popup and standalone window
    const tabButtons = document.querySelectorAll('.tab-button');
    const searchTab = document.getElementById('searchTab');
    const activityTab = document.getElementById('activityTab');
    
    if (!tabButtons.length || !searchTab || !activityTab) {
      console.error('Cookie Inspector: Required elements not found');
      return;
    }
    
    const switchTab = (tabId) => {
      tabButtons.forEach(button => {
        button.classList.toggle('active', button.dataset.tab === tabId);
      });
      
      if (tabId === 'search') {
        searchTab.style.display = 'block';
        activityTab.style.display = 'none';
      } else {
        searchTab.style.display = 'none';
        activityTab.style.display = 'block';
      }
    };
    
    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        switchTab(button.dataset.tab);
      });
    });
    
    // Cookie search functionality
    const domainInput = document.getElementById('domainFilter');
    const nameInput = document.getElementById('nameFilter');
    const valueInput = document.getElementById('valueFilter');
    const searchBtn = document.getElementById('searchBtn');
    const clearBtn = document.getElementById('clearBtn');
    const cookieTableBody = document.querySelector('#cookieTable tbody');

    const searchCookies = () => {
      const domainFilter = domainInput.value.trim().toLowerCase();
      const nameFilter = nameInput.value.trim().toLowerCase();
      const valueFilter = valueInput.value.trim().toLowerCase();
      
      cookieTableBody.innerHTML = '';

      chrome.cookies.getAll({}, (cookies) => {
        let filteredCookies = cookies;
        
        // Apply domain filtering if specified (contains match)
        if (domainFilter) {
          filteredCookies = filteredCookies.filter(cookie => 
            cookie.domain.toLowerCase().includes(domainFilter)
          );
        }
        
        // Apply name filtering if specified (starts-with match)
        if (nameFilter) {
          filteredCookies = filteredCookies.filter(cookie => 
            cookie.name.toLowerCase().startsWith(nameFilter)
          );
        }
        
        // Apply value filtering if specified (contains match)
        if (valueFilter) {
          filteredCookies = filteredCookies.filter(cookie => 
            cookie.value.toLowerCase().includes(valueFilter)
          );
        }
        
        currentCookies = filteredCookies;
        
        // Display filtered cookies
        if (filteredCookies.length === 0) {
          const row = document.createElement('tr');
          row.innerHTML = '<td colspan="5" style="text-align: center; color: var(--text-secondary); padding: 20px;">No cookies found matching your filters</td>';
          cookieTableBody.appendChild(row);
        } else {
          filteredCookies.forEach((cookie) => {
            const row = document.createElement('tr');

            // Domain cell
            const domainCell = document.createElement('td');
            domainCell.textContent = cookie.domain;
            row.appendChild(domainCell);

            // Name cell
            const nameCell = document.createElement('td');
            nameCell.textContent = cookie.name;
            row.appendChild(nameCell);

            // Value cell
            const valueCell = document.createElement('td');
            const displayValue = cookie.value.length > 30 
              ? cookie.value.substring(0, 30) + '...' 
              : cookie.value;
            valueCell.textContent = displayValue;
            valueCell.title = cookie.value; // Show full value on hover
            row.appendChild(valueCell);

            // Path cell
            const pathCell = document.createElement('td');
            pathCell.textContent = cookie.path;
            row.appendChild(pathCell);

            // Expires cell
            const expiresCell = document.createElement('td');
            expiresCell.textContent = cookie.expirationDate 
              ? new Date(cookie.expirationDate * 1000).toLocaleString() 
              : 'Session';
            row.appendChild(expiresCell);

            cookieTableBody.appendChild(row);
          });
        }
      });
    };

    const clearFilteredCookies = async () => {
      if (!currentCookies.length) {
        showDeleteDialog(
          'No cookies to clear. Please search for cookies first.',
          null,
          true // Single button mode
        );
        return;
      }

      showDeleteDialog(
        `Are you sure you want to delete ${currentCookies.length} cookie(s)?`,
        async () => {
          for (const cookie of currentCookies) {
            await chrome.cookies.remove({
              url: `http${cookie.secure ? 's' : ''}://${cookie.domain}${cookie.path}`,
              name: cookie.name
            });
          }
          searchCookies(); // Refresh the list
        }
      );
    };

    // Custom delete confirmation modal
    const showDeleteDialog = (message, onConfirm, singleButton = false) => {
      const dialog = document.getElementById('cookieDeleteDialog');
      const messageEl = document.getElementById('cookieDeleteMessage');
      const yesBtn = document.getElementById('cookieDeleteYesBtn');
      const noBtn = document.getElementById('cookieDeleteNoBtn');
      const closeBtn = document.getElementById('closeCookieDeleteDialog');
      
      if (!dialog || !messageEl || !yesBtn || !noBtn) {
        // Fallback to native confirm if modal elements don't exist
        if (singleButton) {
          alert(message);
          return;
        }
        if (confirm(message) && onConfirm) {
          onConfirm();
        }
        return;
      }
      
      messageEl.textContent = message;
      
      // Show/hide buttons based on mode
      if (singleButton) {
        yesBtn.style.display = 'none';
        noBtn.querySelector('.btn-text').textContent = 'OK';
        noBtn.querySelector('.material-icons').textContent = 'check';
      } else {
        yesBtn.style.display = 'flex';
        noBtn.querySelector('.btn-text').textContent = 'Cancel';
        noBtn.querySelector('.material-icons').textContent = 'close';
      }
      
      dialog.style.display = 'flex';
      
      // Handle Yes/Delete button
      const handleYes = async () => {
        dialog.style.display = 'none';
        if (onConfirm) await onConfirm();
        cleanup();
      };
      
      // Handle No/Cancel button
      const handleNo = () => {
        dialog.style.display = 'none';
        cleanup();
      };
      
      // Cleanup event listeners
      const cleanup = () => {
        yesBtn.removeEventListener('click', handleYes);
        noBtn.removeEventListener('click', handleNo);
        closeBtn.removeEventListener('click', handleNo);
      };
      
      yesBtn.addEventListener('click', handleYes);
      noBtn.addEventListener('click', handleNo);
      closeBtn.addEventListener('click', handleNo);
    };

    searchBtn.addEventListener('click', searchCookies);
    clearBtn.addEventListener('click', clearFilteredCookies);

    // Activity monitor functionality
    const activityTableBody = document.querySelector('#activityTable tbody');
    const clearActivityBtn = document.getElementById('clearActivityBtn');
    
    // Ignore list functionality
    const showIgnoreListBtn = document.getElementById('showIgnoreListBtn');
    const closeIgnoreListBtn = document.getElementById('closeIgnoreListBtn');
    const ignoreListPanel = document.getElementById('ignoreListPanel');
    const ignoreInput = document.getElementById('ignoreInput');
    const addIgnoreBtn = document.getElementById('addIgnoreBtn');
    const ignoreListElement = document.getElementById('ignoreList');
    
    // Load ignore list from storage if available
    const loadIgnoreList = () => {
      chrome.storage.local.get('cookieInspectorIgnoredDomains', (result) => {
        if (result.cookieInspectorIgnoredDomains) {
          ignoredDomains = result.cookieInspectorIgnoredDomains;
        } else {
          // Save default list if none exists
          chrome.storage.local.set({ cookieInspectorIgnoredDomains: ignoredDomains });
        }
        renderIgnoreList();
      });
    };
    
    // Save ignore list to storage
    const saveIgnoreList = () => {
      chrome.storage.local.set({ cookieInspectorIgnoredDomains: ignoredDomains });
    };
    
    // Render the ignore list in the UI
    const renderIgnoreList = () => {
      ignoreListElement.innerHTML = '';
      
      if (ignoredDomains.length === 0) {
        const li = document.createElement('li');
        li.textContent = 'No ignored domains';
        li.style.color = 'var(--text-secondary)';
        li.style.fontStyle = 'italic';
        ignoreListElement.appendChild(li);
        return;
      }
      
      ignoredDomains.forEach((domain) => {
        const li = document.createElement('li');
        
        const domainText = document.createElement('span');
        domainText.textContent = domain;
        li.appendChild(domainText);
        
        const removeBtn = document.createElement('button');
        removeBtn.textContent = '×';
        removeBtn.className = 'remove-btn';
        removeBtn.addEventListener('click', () => {
          ignoredDomains = ignoredDomains.filter(d => d !== domain);
          saveIgnoreList();
          renderIgnoreList();
        });
        li.appendChild(removeBtn);
        
        ignoreListElement.appendChild(li);
      });
    };
    
    // Check if a domain should be ignored
    const shouldIgnoreDomain = (domain) => {
      return ignoredDomains.some(ignoredDomain => 
        domain.includes(ignoredDomain) || domain.endsWith(ignoredDomain)
      );
    };
    
    // Toggle ignore list panel
    showIgnoreListBtn.addEventListener('click', () => {
      const isHidden = ignoreListPanel.style.display === 'none';
      ignoreListPanel.style.display = isHidden ? 'block' : 'none';
    });
    
    closeIgnoreListBtn.addEventListener('click', () => {
      ignoreListPanel.style.display = 'none';
    });
    
    // Add new domain to ignore list
    addIgnoreBtn.addEventListener('click', () => {
      const domain = ignoreInput.value.trim();
      if (domain && !ignoredDomains.includes(domain)) {
        ignoredDomains.push(domain);
        saveIgnoreList();
        renderIgnoreList();
        ignoreInput.value = '';
      }
    });
    
    // Allow pressing Enter to add a domain
    ignoreInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        addIgnoreBtn.click();
      }
    });
    
    // Start monitoring cookie changes
    const startCookieMonitoring = () => {
      chrome.cookies.onChanged.addListener((changeInfo) => {
        if (changeInfo.removed === false) { // Only track new cookie additions
          const cookie = changeInfo.cookie;
          
          // Skip if domain is in the ignore list
          if (shouldIgnoreDomain(cookie.domain)) {
            return;
          }
          
          const timestamp = new Date().toLocaleTimeString();
          
          // Add to activity log
          cookieActivity.unshift({
            time: timestamp,
            domain: cookie.domain,
            name: cookie.name,
            value: cookie.value
          });
          
          // Keep only last 100 entries
          if (cookieActivity.length > 100) {
            cookieActivity = cookieActivity.slice(0, 100);
          }
          
          // Update the activity table if it's visible
          updateActivityTable();
        }
      });
    };
    
    const updateActivityTable = () => {
      activityTableBody.innerHTML = '';
      
      if (cookieActivity.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="4" style="text-align: center; color: var(--text-secondary); padding: 20px;">No cookie activity yet</td>';
        activityTableBody.appendChild(row);
        return;
      }
      
      cookieActivity.forEach((activity) => {
        const row = document.createElement('tr');
        
        // Time cell
        const timeCell = document.createElement('td');
        timeCell.textContent = activity.time;
        row.appendChild(timeCell);
        
        // Domain cell
        const domainCell = document.createElement('td');
        domainCell.textContent = activity.domain;
        row.appendChild(domainCell);
        
        // Name cell
        const nameCell = document.createElement('td');
        const displayName = activity.name.length > 20 
          ? activity.name.substring(0, 20) + '...' 
          : activity.name;
        nameCell.textContent = displayName;
        nameCell.title = activity.name; // Show full name on hover
        row.appendChild(nameCell);
        
        // Value cell
        const valueCell = document.createElement('td');
        const displayValue = activity.value.length > 30 
          ? activity.value.substring(0, 30) + '...' 
          : activity.value;
        valueCell.textContent = displayValue;
        valueCell.title = activity.value; // Show full value on hover
        row.appendChild(valueCell);
        
        activityTableBody.appendChild(row);
      });
    };
    
    clearActivityBtn.addEventListener('click', () => {
      cookieActivity = [];
      updateActivityTable();
    });
    
    // Initialize the cookie monitoring and ignore list
    loadIgnoreList();
    startCookieMonitoring();
    updateActivityTable();
  }

  // Public API
  return {
    init: init
  };
})();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.cookieInspector.init();
  });
} else {
  // For immediate execution or standalone windows
  setTimeout(() => {
    window.cookieInspector.init();
  }, 0);
}

