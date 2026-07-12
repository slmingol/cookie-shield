# Privacy Policy — Cookie Shield

**Last updated: July 2026**

## What Cookie Shield does

Cookie Shield is a browser extension that detects affiliate tracking cookies and highlights affiliate links on web pages. All processing happens locally inside your browser.

## Data collection

Cookie Shield does not collect, transmit, or share any user data. Specifically:

- No personally identifiable information is collected
- No browsing history is recorded or sent anywhere
- No cookies or cookie contents are transmitted off your device
- No page content, URLs, or link data leaves your browser
- No analytics or telemetry of any kind is collected

## Local storage

Cookie Shield stores the following data locally on your device using `chrome.storage.local`:

- Your extension settings (notification toggles, highlight toggle)
- The list of sites where you have paused cookie notifications
- The list of sites where you have disabled affiliate link highlighting
- Custom cookie detection patterns you have added

This data never leaves your device and is not accessible to any third party.

## Permissions

Cookie Shield requests the following browser permissions solely to deliver its core functionality:

- **cookies** — to read browser cookies locally and identify affiliate tracking patterns
- **tabs** — to get the current tab's hostname for per-site settings
- **storage** — to save your settings locally on your device
- **windows** — to open the cookie inspector in a separate window
- **webNavigation** — to detect Amazon affiliate tags in page URLs during navigation
- **host permissions (http://* and https://**)** — to inject the content script that scans and highlights affiliate links on any page you visit

None of these permissions are used to collect or transmit data.

## Third-party services

Cookie Shield does not use any third-party services, APIs, or analytics platforms.

## Contact

This extension is maintained by [g33kaboo](https://github.com/slmingol). For questions, open an issue at https://github.com/slmingol/cookie-shield/issues.
