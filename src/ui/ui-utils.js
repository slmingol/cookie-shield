/**
 * UI Utilities
 * 
 * Shared utility functions for UI components
 */

/**
 * Fade out an element with callback
 */
function fadeOut(element, callback) {
  element.classList.add('fade-out');
  setTimeout(() => {
    element.style.display = 'none';
    element.classList.remove('fade-out');
    if (callback) callback();
  }, 300);
}

/**
 * Fade in an element
 */
function fadeIn(element) {
  element.style.display = 'block';
  element.classList.add('fade-out');
  
  void element.offsetWidth;
  
  element.classList.remove('fade-out');
  element.classList.add('fade-in');
  
  setTimeout(() => {
    element.classList.remove('fade-in');
  }, 300);
}

/**
 * Domain normalization (matches background.js pauseManager)
 */
function normalizeDomain(domain) {
  if (!domain) return '';
  return domain.toLowerCase().replace(/^www\./, '').replace(/^\./, '');
}

// Export for use in popup scripts
if (typeof window !== 'undefined') {
  window.uiUtils = {
    fadeOut,
    fadeIn,
    normalizeDomain
  };
}

