/**
 * Amazon Tag Manager
 * 
 * Manages Amazon affiliate tag storage, expiration, and notification logic
 */

const DEBUG_AMAZON_TAGS = false; // Set to true for debugging

const AMAZON_TAGS_KEY = 'amazonAffiliateTags';

function log(...args) {
  if (DEBUG_AMAZON_TAGS) console.log('[Amazon Tag]', ...args);
}

// Amazon affiliate tag storage and management
async function getAmazonTags() {
  return new Promise((resolve) => {
    chrome.storage.local.get([AMAZON_TAGS_KEY], (result) => {
      const tags = result[AMAZON_TAGS_KEY] || {};
      
      // Clean up expired tags (older than 24 hours)
      const now = Date.now();
      const validTags = {};
      
      for (const [tag, data] of Object.entries(tags)) {
        if (now - data.timestamp < 24 * 60 * 60 * 1000) {
          validTags[tag] = data;
        }
      }
      
      // Save cleaned tags back to storage if we removed any
      if (Object.keys(validTags).length !== Object.keys(tags).length) {
        chrome.storage.local.set({ [AMAZON_TAGS_KEY]: validTags });
      }
      
      resolve(validTags);
    });
  });
}

async function storeAmazonTag(tag, domain, details = {}) {
  const tags = await getAmazonTags();
  const now = Date.now();
  const previousTag = tags[tag];
  
  tags[tag] = {
    domain,
    timestamp: previousTag ? previousTag.timestamp : now,
    count: (previousTag?.count || 0) + 1,
    lastSeen: now,
    isActive: true,
    ...details
  };
  
  // Mark all other tags as inactive
  Object.keys(tags).forEach(existingTag => {
    if (existingTag !== tag) {
      tags[existingTag].isActive = false;
    }
  });
  
  return new Promise((resolve) => {
    chrome.storage.local.set({ [AMAZON_TAGS_KEY]: tags }, resolve);
  });
}

async function updateLastSeen(tag) {
  const tags = await getAmazonTags();
  if (tags[tag]) {
    tags[tag].lastSeen = Date.now();
    await new Promise((resolve) => {
      chrome.storage.local.set({ [AMAZON_TAGS_KEY]: tags }, resolve);
    });
  }
}

async function clearExpiredAmazonTags() {
  const tags = await getAmazonTags(); // This automatically cleans up expired tags
  return tags;
}

async function shouldNotifyForAmazonTag(newTag, domain) {
  const existingTags = await getAmazonTags();
  const existingTag = existingTags[newTag];
  const now = Date.now();
  const twentyFourHours = 24 * 60 * 60 * 1000;
  
  // Find the currently active tag
  const activeTag = Object.entries(existingTags).find(([tag, data]) => data.isActive);
  
  log('Checking notification for tag:', newTag);
  log('Existing tags:', existingTags);
  log('Currently active tag:', activeTag);
  
  // Case 1: Tag is completely new
  if (!existingTag) {
    log('Case 1: New tag');
    return {
      shouldNotify: true,
      reason: 'new_tag',
      message: 'New Amazon affiliate tag detected'
    };
  }
  
  // Case 2: Tag exists but has expired (past 24 hours)
  if (now - existingTag.timestamp > twentyFourHours) {
    log('Case 2: Tag expired, renewing');
    return {
      shouldNotify: true,
      reason: 'tag_renewed',
      message: 'Amazon affiliate tag renewed after expiry'
    };
  }
  
  // Case 3: Different tag is currently active (this tag is overwriting another)
  if (activeTag && activeTag[0] !== newTag) {
    log('Case 3: Different tag active, switching from', activeTag[0], 'to', newTag);
    return {
      shouldNotify: true,
      reason: 'tag_overwritten',
      message: `Amazon affiliate tag changed from ${activeTag[0]} to ${newTag}`,
      previousTag: activeTag[0]
    };
  }
  
  // Case 4: Same tag is already active and not expired - don't notify
  if (activeTag && activeTag[0] === newTag && now - existingTag.timestamp <= twentyFourHours) {
    log('Case 4: Same tag already active, suppressing notification');
    return {
      shouldNotify: false,
      reason: 'tag_already_active',
      message: 'Amazon affiliate tag is already active and not expired'
    };
  }
  
  // Default: notify (fallback case)
  log('Fallback case: Notifying');
  return {
    shouldNotify: true,
    reason: 'fallback',
    message: 'Amazon affiliate tag detected'
  };
}

// Export for service worker
if (typeof self !== 'undefined') {
  self.amazonTagManager = {
    getAmazonTags,
    storeAmazonTag,
    updateLastSeen,
    clearExpiredAmazonTags,
    shouldNotifyForAmazonTag,
    AMAZON_TAGS_KEY
  };
}

