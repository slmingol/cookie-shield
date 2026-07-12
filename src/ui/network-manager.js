// Network management functionality

window.addEventListener('DOMContentLoaded', function() {
  
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
  
  // Element references
  const networkList = document.getElementById('networkList');
  const addNetworkBtn = document.getElementById('addNetworkBtn');
  const networkEditModal = document.getElementById('networkEditModal');
  const closeNetworkModal = document.getElementById('closeNetworkModal');
  const networkForm = document.getElementById('networkForm');
  const networkName = document.getElementById('networkName');
  const networkDomains = document.getElementById('networkDomains');
  const firstPartyPatternList = document.getElementById('firstPartyPatternList');
  const thirdPartyPatternList = document.getElementById('thirdPartyPatternList');
  const cancelNetworkEdit = document.getElementById('cancelNetworkEdit');
  const restoreDefaultsBtn = document.getElementById('restoreDefaultsBtn');
  const patternManagementView = document.getElementById('patternManagementView');
  

  
  if (addNetworkBtn) {
    addNetworkBtn.addEventListener('click', function() {
      openNetworkModal();
    });
  }
  
  if (closeNetworkModal) {
    closeNetworkModal.addEventListener('click', function() {
      networkEditModal.style.display = 'none';
    });
  }
  
  if (cancelNetworkEdit) {
    cancelNetworkEdit.addEventListener('click', function() {
      networkEditModal.style.display = 'none';
    });
  }
  
  if (restoreDefaultsBtn) {
    restoreDefaultsBtn.addEventListener('click', function() {
      const customConfirmDialog = document.getElementById('customConfirmDialog');
      const confirmYesBtn = document.getElementById('confirmYesBtn');
      const confirmNoBtn = document.getElementById('confirmNoBtn');
      const closeConfirmDialog = document.getElementById('closeConfirmDialog');
      
      customConfirmDialog.style.display = 'block';
      
      confirmYesBtn.onclick = function() {
        customConfirmDialog.style.display = 'none';
        chrome.storage.local.remove(['customNetworks', 'customPatterns'], function() {
          loadNetworks();
        });
      };
      
      confirmNoBtn.onclick = closeConfirmDialog.onclick = function() {
        customConfirmDialog.style.display = 'none';
      };
    });
  }
  
  if (networkForm) {
    networkForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const network = networkName.value.trim().toLowerCase();
      
      const domainsText = networkDomains.value.trim();
      const domains = domainsText 
        ? domainsText.split(',')
            .map(d => d.trim())
            .filter(d => d.length > 0)
        : [];
      
      const firstPartyText = firstPartyPatternList.value.trim();
      const firstPartyPatternsArray = firstPartyText
        ? firstPartyText.split(',')
            .map(p => p.trim())
            .filter(p => p.length > 0)
        : [];
      
      const thirdPartyText = thirdPartyPatternList.value.trim();
      const thirdPartyPatternsArray = thirdPartyText
        ? thirdPartyText.split(',')
            .map(p => p.trim())
            .filter(p => p.length > 0)
        : [];
      
      const networkData = {
        network,
        firstParty: {
          patterns: firstPartyPatternsArray
        },
        thirdParty: {
          patterns: thirdPartyPatternsArray,
          domains: domains
        },
        custom: true
      };
      
      const editingNetwork = networkForm.getAttribute('data-editing');
      
      if (editingNetwork) {
        const editData = JSON.parse(editingNetwork);
        const oldNetwork = editData.network;
        const isDefault = editData.isDefault || false;
        
        updateNetwork(oldNetwork, networkData, isDefault);
      } else {
        addNetwork(networkData);
      }
      
      networkEditModal.style.display = 'none';
      loadNetworks();
    });
  }
  
  window.loadNetworks = loadNetworks;
  
  if (patternManagementView && patternManagementView.style.display !== 'none') {
    loadNetworks();
  }
  
  // Helper functions
  function openNetworkModal(networkData = null) {
    const modalTitle = document.getElementById('networkModalTitle');
    modalTitle.textContent = networkData ? 'Edit Network' : 'Add Network';
    
    networkForm.reset();
    networkForm.removeAttribute('data-editing');
    
    if (networkData) {
      networkName.value = networkData.network;
      
      if (networkData.firstParty && networkData.firstParty.patterns && networkData.firstParty.patterns.length > 0) {
        firstPartyPatternList.value = networkData.firstParty.patterns.join(', ');
      }
      
      if (networkData.thirdParty && networkData.thirdParty.patterns && networkData.thirdParty.patterns.length > 0) {
        thirdPartyPatternList.value = networkData.thirdParty.patterns.join(', ');
      }
      
      if (networkData.thirdParty && networkData.thirdParty.domains && networkData.thirdParty.domains.length > 0) {
        networkDomains.value = networkData.thirdParty.domains.join(', ');
      }
      
      networkForm.setAttribute('data-editing', JSON.stringify({ 
        network: networkData.network,
        isDefault: !networkData.custom 
      }));
    }
    
    networkEditModal.style.display = 'block';
  }
  
  function addNetwork(networkData) {
    chrome.storage.local.get('customNetworks', (data) => {
      const customNetworks = data.customNetworks || [];
      customNetworks.push(networkData);
      chrome.storage.local.set({ customNetworks });
    });
  }
  
  function updateNetwork(oldNetworkName, newNetworkData, isDefault = false) {
    chrome.storage.local.get('customNetworks', (data) => {
      let customNetworks = data.customNetworks || [];
      
      if (isDefault) {
        newNetworkData.custom = true;
        
        customNetworks = customNetworks.filter(
          n => n.network.toLowerCase() !== oldNetworkName.toLowerCase()
        );
        
        customNetworks.push(newNetworkData);
      } else {
        const networkIndex = customNetworks.findIndex(
          n => n.network.toLowerCase() === oldNetworkName.toLowerCase()
        );
        
        if (networkIndex >= 0) {
          customNetworks[networkIndex] = newNetworkData;
        } else {
          customNetworks.push(newNetworkData);
        }
      }
      
      chrome.storage.local.set({ customNetworks }, () => {
        setTimeout(loadNetworks, 100);
      });
    });
  }
  
  function deleteNetwork(network, callback) {
    chrome.storage.local.get('customNetworks', (data) => {
      if (chrome.runtime.lastError) {
        if (callback) callback(false);
        return;
      }
      
      let customNetworks = data.customNetworks || [];
      
      if (network.custom) {
        const originalLength = customNetworks.length;
        customNetworks = customNetworks.filter(n => 
          n.network.toLowerCase() !== network.network.toLowerCase()
        );
        

      } else {
        const existingExclusion = customNetworks.find(
          n => n.network.toLowerCase() === network.network.toLowerCase() && n.excluded
        );
        
        if (!existingExclusion) {
          const exclusion = {
            network: network.network,
            excluded: true,
            custom: true
          };
          
          customNetworks.push(exclusion);
        }
      }
      
      chrome.storage.local.set({ customNetworks }, () => {
        if (chrome.runtime.lastError) {
          if (callback) callback(false);
          return;
        }
        
        setTimeout(loadNetworks, 100);
        if (callback) callback(true);
      });
    });
  }
  
  window.deleteNetwork = deleteNetwork;

  function loadNetworks() {
    if (!networkList) {
      return;
    }
    
    networkList.innerHTML = '<div class="loading">Loading networks...</div>';
    
    chrome.storage.local.get('customNetworks', (data) => {
      const customNetworks = data.customNetworks || [];
      
      chrome.runtime.sendMessage({ command: 'getDefaultPatterns' }, (response) => {
        if (!response || !response.patterns) {
          networkList.innerHTML = '<div class="error">Error loading patterns</div>';
          return;
        }
        const defaultPatterns = response.patterns;
        
        const defaultNetworks = {};
        
        defaultPatterns.forEach(pattern => {
          if (!pattern.network) return;
          
          if (!defaultNetworks[pattern.network]) {
            defaultNetworks[pattern.network] = {
              network: pattern.network,
              firstParty: { patterns: [] },
              thirdParty: { patterns: [], domains: [] },
              custom: false
            };
          }
          
          if (pattern.type === 'firstParty') {
            defaultNetworks[pattern.network].firstParty.patterns.push(pattern.pattern);
          } else if (pattern.type === 'thirdParty') {
            defaultNetworks[pattern.network].thirdParty.patterns.push(pattern.pattern);
            
            if (pattern.domain) {
              const domainArray = pattern.domain.split(',').map(d => d.trim()).filter(d => d);
              defaultNetworks[pattern.network].thirdParty.domains = [
                ...new Set([
                  ...defaultNetworks[pattern.network].thirdParty.domains,
                  ...domainArray
                ])
              ];
            }
          }
        });
        
        const networkMap = {};
        
        Object.values(defaultNetworks).forEach(network => {
          networkMap[network.network.toLowerCase()] = network;
        });
        
        customNetworks.forEach(network => {
          const networkKey = network.network.toLowerCase();
          if (network.excluded) {
            delete networkMap[networkKey];
          } else {
            networkMap[networkKey] = network;
          }
        });
        
        const allNetworks = Object.values(networkMap).sort((a, b) => 
          a.network.localeCompare(b.network)
        );
        
        networkList.innerHTML = '';
        
        if (allNetworks.length === 0) {
          networkList.innerHTML = '<div class="no-networks">No networks defined. Click "Add New Network" to create one.</div>';
          return;
        }
        
        allNetworks.forEach(network => {
          try {
            const card = createNetworkCard(network);
            networkList.appendChild(card);
          } catch (error) {
          }
        });
      });
    });
  }
  
  function createNetworkCard(network) {
    const networkCard = document.createElement('div');
    networkCard.className = 'network-card';
    
    const firstPartyCount = network.firstParty?.patterns?.length || 0;
    const thirdPartyCount = network.thirdParty?.patterns?.length || 0;
    const domainCount = network.thirdParty?.domains?.length || 0;
    
    let firstPartyHTML = '';
    if (firstPartyCount > 0) {
      network.firstParty.patterns.forEach(pattern => {
        firstPartyHTML += `<span class="pattern-tag">${escapeHtml(pattern)}</span>`;
      });
    } else {
      firstPartyHTML = '<em class="no-patterns">No patterns defined</em>';
    }
    
    let thirdPartyHTML = '';
    if (thirdPartyCount > 0) {
      network.thirdParty.patterns.forEach(pattern => {
        thirdPartyHTML += `<span class="pattern-tag">${escapeHtml(pattern)}</span>`;
      });
    } else {
      thirdPartyHTML = '<em class="no-patterns">No patterns defined</em>';
    }
    
    let domainsHTML = '';
    if (domainCount > 0) {
      domainsHTML = `
        <div class="domains-section">
          <h4>Domains (${escapeHtml(domainCount)})</h4>
          <div class="domains-list cyber-scroll">
            ${network.thirdParty.domains.map(domain => 
              `<span class="domain-tag">${escapeHtml(domain)}</span>`
            ).join('')}
          </div>
        </div>
      `;
    }
    
    const networkNameEscaped = escapeHtml(network.network);
    const sourceType = escapeHtml(network.custom ? 'Custom' : 'Default');
    const sourceClass = network.custom ? 'custom' : 'default';
    
    networkCard.innerHTML = `
      <div class="network-card-header">
        <div class="network-name">
          ${networkNameEscaped}
          <span class="network-source ${sourceClass}">
            ${sourceType}
          </span>
        </div>
        <div class="network-actions">
          <button class="pattern-btn edit" title="Edit Network">
            <span class="material-icons">edit</span>
          </button>
          <button class="pattern-btn delete" title="Delete Network">
            <span class="material-icons">delete</span>
          </button>
        </div>
      </div>
      <div class="network-content">
        <div class="pattern-section">
          <h4>First-Party Patterns (${escapeHtml(firstPartyCount)})</h4>
          <div class="pattern-list">
            ${firstPartyHTML}
          </div>
        </div>
        <div class="pattern-section">
          <h4>Third-Party Patterns (${escapeHtml(thirdPartyCount)})</h4>
          <div class="pattern-list">
            ${thirdPartyHTML}
          </div>
        </div>
        ${domainsHTML}
      </div>
    `;
    
    const editBtn = networkCard.querySelector('.edit');
    const deleteBtn = networkCard.querySelector('.delete');
    
    editBtn.addEventListener('click', () => {
      openNetworkModal(network);
    });
    
    deleteBtn.addEventListener('click', () => {
      const deleteConfirmDialog = document.getElementById('deleteConfirmDialog');
      const deleteMessage = document.getElementById('deleteMessage');
      const deleteYesBtn = document.getElementById('deleteYesBtn');
      const deleteNoBtn = document.getElementById('deleteNoBtn');
      const closeDeleteDialog = document.getElementById('closeDeleteDialog');
      
      // Use textContent to safely set message (no HTML escaping needed)
      const confirmMsg = network.custom ? 
        `Are you sure you want to delete the "${network.network}" network?` :
        `Are you sure you want to hide the default "${network.network}" network?`;
      
      deleteMessage.textContent = confirmMsg;
      
      deleteConfirmDialog.style.display = 'block';
      
      deleteYesBtn.onclick = function() {
        deleteConfirmDialog.style.display = 'none';
        deleteNetwork(network);
      };
      
      deleteNoBtn.onclick = closeDeleteDialog.onclick = function() {
        deleteConfirmDialog.style.display = 'none';
      };
    });
    
    return networkCard;
  }
});
