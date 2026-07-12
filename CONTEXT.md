# cookie-shield — Project Context

## What this is

A clone/reimplementation of the Cookie Guard Chrome extension (https://chromewebstore.google.com/detail/cookie-guard/ifjhcahbhkfojdmkndpkmkffbjnefido).

## Cookie Guard overview

Cookie Guard is a Chrome extension with two main features:

1. **Cookie Notifications** -- alerts when sites set cookies
2. **Affiliate Link Highlighting** -- detects and visually flags affiliate links (e.g. Amazon Associates) with a red glow/border and a hover tooltip saying "Affiliate Link: Amazon Associates"

### Settings

- Cookie Notifications (toggle)
- Affiliate Link Highlighting (toggle, global only -- no per-site control)
- Cookie Refresh Alerts (toggle)
- Manage Cookie Patterns (manage page)
- Manage Alerts (per-domain pause for alerts, but NOT for affiliate highlighting)

### Known gaps in Cookie Guard

- Affiliate link highlighting is global only -- no per-site enable/disable
- Chrome's built-in per-site extension pause is the only workaround currently
- No public GitHub repo linked; dev contact is megalagbusiness@gmail.com
- Code is described as open, unminified, and unobfuscated (inspectable via chrome://extensions)

## Why cookie-shield

Built to clone Cookie Guard's functionality with the intent to add per-site control over affiliate link highlighting as a primary improvement.

## Visual behavior to replicate

- Affiliate links get a red box-shadow glow and red border
- Hovering shows a tooltip: "Affiliate Link: Amazon Associates"
- Observed on diskprices.com (Amazon affiliate links in the product column)

## Name rationale

Name candidates considered: crumb-guard, crumbguard, crumb-flag, crumb-lens, crumb-trap, crumbwall, cookie-shield.
Chose **cookie-shield** -- distinct from Cookie Guard but clearly in the same family.
