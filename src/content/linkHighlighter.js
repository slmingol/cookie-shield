/**
 * Affiliate Link Highlighter Content Script
 * Scans the page for affiliate links and highlights them
 * Uses cookie patterns and Amazon detector for focused detection
 *
 * Created by MegaLag - Copyright (c) 2024
 */

// affiliateCookiePatterns and amazonAffiliateDetector are available globally

// Configuration
const HIGHLIGHT_ENABLED_KEY = 'highlightAffiliateLinks';
let isHighlightingEnabled = true; // Default to enabled
let highlightedElements = new Set();

// Unique class names to avoid conflicts
const HIGHLIGHT_CLASS = 'cookie-shield-affiliate-highlight';
const POTENTIAL_CLASS = 'cookie-shield-affiliate-potential';
const TOOLTIP_CLASS = 'cookie-shield-affiliate-tooltip';

/**
 * Extract URL parameter patterns from cookie patterns
 */
function getUrlParameterPatterns() {
  const urlParams = new Set();

  // Extract patterns from cookie patterns that are commonly used as URL parameters
  for (const [network, data] of Object.entries(affiliateCookiePatterns)) {
    if (data.thirdParty && data.thirdParty.patterns) {
      data.thirdParty.patterns.forEach(pattern => {
        // Remove cookie prefixes/suffixes and keep URL parameter patterns
        const cleanPattern = pattern.replace(/^_/, '').replace(/_$/, '').toLowerCase();
        if (cleanPattern.length > 2) { // Avoid single character patterns
          urlParams.add(cleanPattern);
        }
      });
    }
  }

  // Add common affiliate URL parameters that aren't in cookie patterns
  const commonParams = [
    'cjevent', 'cjdata', 'cje', 'cid',  // CJ
    'ranMID', 'ranSiteID', 'ranEAID', 'siteID', // Rakuten
    'sscid', 'afftrack', // ShareASale
    'irclickid', 'irgwc', 'irpid', // Impact
    'awc', 'awn', 'awinaffid', // Awin
    'skimId', 'xcust', // Skimlinks
    'vglnk', // VigLink
    'clickref', 'clickrefid', // Partnerize
    'tduid', // Tradedoubler
    'hop', 'tid' // ClickBank
  ];

  commonParams.forEach(param => urlParams.add(param.toLowerCase()));

  return Array.from(urlParams);
}



/**
 * Get affiliate network info for a URL
 */
function getAffiliateNetworkInfo(url) {
  try {
    const urlObj = new URL(url, window.location.href);
    const hostname = urlObj.hostname.toLowerCase();
    const currentHostname = window.location.hostname.toLowerCase();

    // Check Amazon links - different handling for potential vs confirmed affiliates
    if (hostname === 'amzn.to' ||
        hostname.includes('amazon.') ||
        hostname === 'smile.amazon.com') {

      // Skip potential affiliate detection on Amazon itself
      if (currentHostname.includes('amazon.')) {
        return null;
      }

      // Check if it has affiliate parameters (confirmed affiliate)
      if (typeof amazonAffiliateDetector !== 'undefined' &&
          amazonAffiliateDetector.checkAffiliateUrl(url)) {
        return {
          network: 'Amazon Associates',
          type: 'amazon_confirmed'
        };
      }

      // No parameters - potential affiliate link
      return {
        network: 'Potential Amazon Affiliate',
        type: 'amazon_potential'
      };
    }

    // Check other affiliate networks - any link from these domains is considered affiliate
    for (const [network, data] of Object.entries(affiliateCookiePatterns)) {
      if (data.thirdParty && data.thirdParty.domains) {
        const hasMatchingDomain = data.thirdParty.domains.some(domain =>
          hostname === domain.toLowerCase() ||
          hostname.endsWith('.' + domain.toLowerCase()) ||
          hostname.includes(domain.toLowerCase())
        );

        if (hasMatchingDomain) {
          return {
            network: network,
            type: 'affiliate_domain'
          };
        }
      }
    }
  } catch (e) {
    // Invalid URL
  }

  return null;
}

const HIGHLIGHT_DISABLED_SITES_KEY = 'highlightDisabledSites';

function getCurrentHostname() {
  return window.location.hostname.toLowerCase().replace(/^www\./, '');
}

function isSiteInDisabledList(disabledSites) {
  const hostname = getCurrentHostname();
  return disabledSites.some(site => {
    const s = site.toLowerCase().replace(/^www\./, '').replace(/^\./, '');
    return hostname === s || hostname.endsWith('.' + s);
  });
}

/**
 * Initialize the highlighter
 */
async function init() {
  // Check global toggle and per-site disabled list
  chrome.storage.local.get([HIGHLIGHT_ENABLED_KEY, HIGHLIGHT_DISABLED_SITES_KEY], (result) => {
    const globalEnabled = result[HIGHLIGHT_ENABLED_KEY] !== undefined ? result[HIGHLIGHT_ENABLED_KEY] : true;
    const siteDisabled = isSiteInDisabledList(result[HIGHLIGHT_DISABLED_SITES_KEY] || []);
    isHighlightingEnabled = globalEnabled && !siteDisabled;

    if (isHighlightingEnabled) {
      scanAndHighlightPage();
      observePageChanges();
    }
  });

  // Listen for storage changes (global toggle or per-site list updated)
  chrome.storage.onChanged.addListener((changes) => {
    if (changes[HIGHLIGHT_ENABLED_KEY] || changes[HIGHLIGHT_DISABLED_SITES_KEY]) {
      chrome.storage.local.get([HIGHLIGHT_ENABLED_KEY, HIGHLIGHT_DISABLED_SITES_KEY], (result) => {
        const globalEnabled = result[HIGHLIGHT_ENABLED_KEY] !== undefined ? result[HIGHLIGHT_ENABLED_KEY] : true;
        const siteDisabled = isSiteInDisabledList(result[HIGHLIGHT_DISABLED_SITES_KEY] || []);
        const shouldEnable = globalEnabled && !siteDisabled;

        if (shouldEnable && !isHighlightingEnabled) {
          isHighlightingEnabled = true;
          scanAndHighlightPage();
          observePageChanges();
        } else if (!shouldEnable && isHighlightingEnabled) {
          isHighlightingEnabled = false;
          removeAllHighlights();
        }
      });
    }
  });

  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.command === 'scanForAffiliateLinks') {
      const results = scanPage();
      sendResponse(results);
      return true;
    }

    if (request.command === 'toggleHighlighting') {
      if (request.enabled) {
        isHighlightingEnabled = true;
        scanAndHighlightPage();
        observePageChanges();
      } else {
        isHighlightingEnabled = false;
        removeAllHighlights();
      }
      sendResponse({ success: true, enabled: isHighlightingEnabled });
      return true;
    }

    // Per-site toggle: the popup has already updated storage; content script just reacts
    if (request.command === 'refreshHighlightingForSite') {
      chrome.storage.local.get([HIGHLIGHT_ENABLED_KEY, HIGHLIGHT_DISABLED_SITES_KEY], (result) => {
        const globalEnabled = result[HIGHLIGHT_ENABLED_KEY] !== undefined ? result[HIGHLIGHT_ENABLED_KEY] : true;
        const siteDisabled = isSiteInDisabledList(result[HIGHLIGHT_DISABLED_SITES_KEY] || []);
        const shouldEnable = globalEnabled && !siteDisabled;

        if (shouldEnable && !isHighlightingEnabled) {
          isHighlightingEnabled = true;
          scanAndHighlightPage();
          observePageChanges();
        } else if (!shouldEnable && isHighlightingEnabled) {
          isHighlightingEnabled = false;
          removeAllHighlights();
        }
        sendResponse({ success: true, enabled: isHighlightingEnabled });
      });
      return true;
    }
  });
}


/**
 * Scan the entire page for affiliate links
 */
function scanPage() {
  const results = {
    totalLinks: 0,
    affiliateLinks: 0,
    confirmedAffiliates: 0,
    potentialAffiliates: 0,
    elements: []
  };

  // Scan <a> tags
  const links = document.querySelectorAll('a[href]');
  results.totalLinks += links.length;

  links.forEach(link => {
    const href = link.href;
    const info = getAffiliateNetworkInfo(href);
    if (info) {
      results.affiliateLinks++;
      if (info.type === 'amazon_potential') {
        results.potentialAffiliates++;
      } else {
        results.confirmedAffiliates++;
      }
      results.elements.push({
        type: 'link',
        element: link.tagName,
        url: href,
        text: link.textContent.substring(0, 50),
        info: info
      });
    }
  });

  return results;
}

/**
 * Scan and highlight affiliate links on the page
 */
function scanAndHighlightPage() {
  if (!isHighlightingEnabled) return;

  // Scan <a> tags - this includes images wrapped in anchor tags
  const links = document.querySelectorAll('a[href]');
  links.forEach(link => {
    // Check the anchor href
    highlightElementIfAffiliate(link, link.href);

    // Also check images within the anchor tag
    const images = link.querySelectorAll('img[src]');
    images.forEach(img => {
      highlightElementIfAffiliate(link, img.src);
    });
  });

  // Scan for onclick handlers that might contain affiliate links
  const clickableElements = document.querySelectorAll('[onclick]');
  clickableElements.forEach(el => {
    const onclick = el.getAttribute('onclick');
    const urlMatch = onclick.match(/(?:window\.location|location\.href|open)\s*[=(]\s*['"]([^'"]+)['"]/);
    if (urlMatch) {
      highlightElementIfAffiliate(el, urlMatch[1]);
    }
  });

  // Scan iframes for affiliate URLs
  const iframes = document.querySelectorAll('iframe[src]');
  iframes.forEach(iframe => {
    highlightElementIfAffiliate(iframe, iframe.src);
  });

  // Scan meta refresh tags
  const metaRefresh = document.querySelectorAll('meta[http-equiv="refresh"][content]');
  metaRefresh.forEach(meta => {
    const content = meta.getAttribute('content');
    const urlMatch = content.match(/url=([^;\s]+)/i);
    if (urlMatch) {
      highlightElementIfAffiliate(meta, urlMatch[1]);
    }
  });

  // Scan form actions
  const forms = document.querySelectorAll('form[action]');
  forms.forEach(form => {
    highlightElementIfAffiliate(form, form.action);
  });
}

/**
 * Highlight an element if it contains an affiliate link
 */
function highlightElementIfAffiliate(element, url) {
  if (!element || !url) return;

  // Skip if already highlighted
  if (highlightedElements.has(element)) return;

  const info = getAffiliateNetworkInfo(url);
  if (info) {
    // Add appropriate highlight class based on type
    const classToAdd = info.type === 'amazon_potential' ? POTENTIAL_CLASS : HIGHLIGHT_CLASS;
    element.classList.add(classToAdd);
    highlightedElements.add(element);

    // Add tooltip on hover
    element.addEventListener('mouseenter', (e) => showTooltip(e, info));
    element.addEventListener('mouseleave', hideTooltip);

    // Store info as data attribute
    element.setAttribute('data-affiliate-network', info.network);
    element.setAttribute('data-affiliate-type', info.type);
  }
}

/**
 * Show tooltip with affiliate info
 */
function showTooltip(event, info) {
  // Remove any existing tooltips first to prevent duplicates
  hideTooltip();
  
  const element = event.target;
  const rect = element.getBoundingClientRect();
  
  // Create tooltip
  const tooltip = document.createElement('div');
  tooltip.className = TOOLTIP_CLASS;
  tooltip.textContent = `Affiliate Link: ${info.network}`;
  tooltip.id = 'cookie-shield-temp-tooltip';
  
  // Position tooltip above element
  tooltip.style.left = rect.left + (rect.width / 2) + 'px';
  tooltip.style.top = (rect.top - 40 + window.scrollY) + 'px';
  tooltip.style.transform = 'translateX(-50%)';
  
  document.body.appendChild(tooltip);
  
  // Trigger animation
  setTimeout(() => {
    if (tooltip.parentNode) {
      tooltip.classList.add('visible');
    }
  }, 10);
}

/**
 * Hide tooltip
 */
function hideTooltip() {
  // Find all tooltips (in case there are duplicates)
  const tooltips = document.querySelectorAll('.' + TOOLTIP_CLASS);
  tooltips.forEach(tooltip => {
    tooltip.classList.remove('visible');
    setTimeout(() => {
      if (tooltip.parentNode) {
        tooltip.remove();
      }
    }, 300);
  });
}

/**
 * Remove all highlights
 */
function removeAllHighlights() {
  highlightedElements.forEach(element => {
    element.classList.remove(HIGHLIGHT_CLASS, POTENTIAL_CLASS);
    element.removeAttribute('data-affiliate-network');
    element.removeAttribute('data-affiliate-type');
  });
  highlightedElements.clear();

  // Remove any lingering tooltips
  const tooltips = document.querySelectorAll('.' + TOOLTIP_CLASS);
  tooltips.forEach(t => t.remove());
}

/**
 * Observe page changes and highlight new links
 */
function observePageChanges() {
  if (!isHighlightingEnabled) return;

  const observer = new MutationObserver((mutations) => {
    if (!isHighlightingEnabled) return;

    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // Check the node itself
          if (node.tagName === 'A' && node.href) {
            highlightElementIfAffiliate(node, node.href);
            // Check images within this anchor
            const images = node.querySelectorAll('img[src]');
            images.forEach(img => highlightElementIfAffiliate(node, img.src));
          }

          if (node.tagName === 'IFRAME' && node.src) {
            highlightElementIfAffiliate(node, node.src);
          }

          if (node.hasAttribute && node.hasAttribute('onclick')) {
            const onclick = node.getAttribute('onclick');
            const urlMatch = onclick.match(/(?:window\.location|location\.href|open)\s*[=(]\s*['"]([^'"]+)['"]/);
            if (urlMatch) {
              highlightElementIfAffiliate(node, urlMatch[1]);
            }
          }

          // Check children
          const links = node.querySelectorAll ? node.querySelectorAll('a[href]') : [];
          links.forEach(link => {
            highlightElementIfAffiliate(link, link.href);
            // Check images within child anchors
            const childImages = link.querySelectorAll('img[src]');
            childImages.forEach(img => highlightElementIfAffiliate(link, img.src));
          });

          // Check for iframes in children
          const iframes = node.querySelectorAll ? node.querySelectorAll('iframe[src]') : [];
          iframes.forEach(iframe => highlightElementIfAffiliate(iframe, iframe.src));

          // Check for onclick elements in children
          const clickables = node.querySelectorAll ? node.querySelectorAll('[onclick]') : [];
          clickables.forEach(el => {
            const onclick = el.getAttribute('onclick');
            const urlMatch = onclick.match(/(?:window\.location|location\.href|open)\s*[=(]\s*['"]([^'"]+)['"]/);
            if (urlMatch) {
              highlightElementIfAffiliate(el, urlMatch[1]);
            }
          });

          // Check for forms in children
          const forms = node.querySelectorAll ? node.querySelectorAll('form[action]') : [];
          forms.forEach(form => highlightElementIfAffiliate(form, form.action));

          // Check for meta refresh tags in children (rare but possible)
          const metas = node.querySelectorAll ? node.querySelectorAll('meta[http-equiv="refresh"][content]') : [];
          metas.forEach(meta => {
            const content = meta.getAttribute('content');
            const urlMatch = content.match(/url=([^;\s]+)/i);
            if (urlMatch) {
              highlightElementIfAffiliate(meta, urlMatch[1]);
            }
          });
        }
      });
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Store observer reference for cleanup
  window._cookieShieldObserver = observer;
}

// Expose detection functions globally for testing/debugging
if (typeof window !== 'undefined') {
  window.getAffiliateNetworkInfo = getAffiliateNetworkInfo;
  window.scanAndHighlightPage = scanAndHighlightPage;
  window.isHighlightingEnabled = () => isHighlightingEnabled;
}

// Clean up tooltips when page is about to navigate away
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    hideTooltip();
  }
});

// Clean up tooltips before page unload (navigation, back button, etc)
window.addEventListener('pagehide', hideTooltip);
window.addEventListener('beforeunload', hideTooltip);

// Clean up tooltips when page becomes hidden (tab switch, minimize, etc)
document.addEventListener('blur', hideTooltip, true);

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
