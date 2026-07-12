/**
 * Icon Animator
 * 
 * Plays animated icon when cookies are detected
 */

const DEBUG_ICON_ANIMATION = false; // Set to true for debugging

const TOTAL_FRAMES = 148;
const FPS = 30;
const DURATION_SECONDS = 4;
const FRAME_DURATION_MS = 1000 / FPS; // ~33.33ms per frame
const TOTAL_FRAMES_TO_PLAY = FPS * DURATION_SECONDS; // 120 frames

let isAnimating = false;
let animationTimer = null;
let currentFrame = 0;

function log(...args) {
  if (DEBUG_ICON_ANIMATION) console.log('[Icon Animation]', ...args);
}

/**
 * Play the cookie detection animation
 */
function playIconAnimation() {
  // If already animating, don't restart
  if (isAnimating) {
    log('Already animating, skipping');
    return;
  }

  log('Starting animation - 120 frames at 30fps');
  isAnimating = true;
  currentFrame = 0;

  const animate = () => {
    if (currentFrame >= TOTAL_FRAMES_TO_PLAY) {
      // Animation complete, reset to default icon
      log('Animation complete, resetting to default');
      resetIcon();
      return;
    }

    // Set icon to current frame using multiple sizes for better display
    const frameNumber = String(currentFrame).padStart(3, '0');
    const iconPath = `/img/animation/Alert_${frameNumber}.png`;

    chrome.action.setIcon({
      path: {
        16: iconPath,
        32: iconPath,
        48: iconPath,
        128: iconPath
      }
    }, () => {
      if (chrome.runtime.lastError) {
        console.error('[Icon Animation] Error setting icon frame', currentFrame, ':', chrome.runtime.lastError);
      }
    });

    currentFrame++;

    // Schedule next frame
    animationTimer = setTimeout(animate, FRAME_DURATION_MS);
  };

  // Start animation
  animate();
}

/**
 * Reset icon to default
 */
function resetIcon() {
  isAnimating = false;
  currentFrame = 0;

  if (animationTimer) {
    clearTimeout(animationTimer);
    animationTimer = null;
  }

  // Set back to default icon
  chrome.action.setIcon({
    path: {
      16: '/img/icon16.png',
      48: '/img/icon48.png',
      128: '/img/icon128.png'
    }
  }, () => {
    if (chrome.runtime.lastError) {
      console.error('[Icon Animation] Error resetting icon:', chrome.runtime.lastError);
    } else {
      log('Icon reset to default');
    }
  });
}

/**
 * Stop animation immediately
 */
function stopAnimation() {
  if (isAnimating) {
    resetIcon();
  }
}

// Export for service worker
if (typeof self !== 'undefined') {
  self.iconAnimator = {
    playIconAnimation,
    resetIcon,
    stopAnimation
  };
}

