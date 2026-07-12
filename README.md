# Cookie Shield

[![Validate](https://github.com/slmingol/cookie-shield/actions/workflows/validate.yml/badge.svg)](https://github.com/slmingol/cookie-shield/actions/workflows/validate.yml)
[![Release](https://github.com/slmingol/cookie-shield/actions/workflows/release.yml/badge.svg)](https://github.com/slmingol/cookie-shield/actions/workflows/release.yml)

A Chrome extension for real-time detection of affiliate tracking cookies and affiliate link highlighting, with per-site control over link highlighting.

Cookie Shield is a fork of [Cookie Guard](https://chromewebstore.google.com/detail/cookie-guard/ifjhcahbhkfojdmkndpkmkffbjnefido) by MegaLag. It retains all original functionality and adds the ability to enable or disable affiliate link highlighting on a per-site basis -- the one gap in Cookie Guard's settings that had no workaround short of Chrome's own extension-level site toggle.

---

## What's different from Cookie Guard

| Feature | Cookie Guard | Cookie Shield |
|---|---|---|
| Affiliate link highlighting (global toggle) | Yes | Yes |
| Affiliate link highlighting per site | No | Yes |
| Cookie notifications | Yes | Yes |
| Cookie refresh alerts | Yes | Yes |
| Manage cookie patterns | Yes | Yes |
| Manage paused alert sites | Yes | Yes |
| Cookie inspector | Yes | Yes |

The per-site toggle appears in the popup as "Disable/Enable highlighting here" and takes effect immediately on the active tab without a page reload.

---

## Background: why cookie tracking matters

The following research findings are drawn verbatim from the academic [CookieGuard project](https://github.com/slmingol/cookieGuard) (Bahrami, Fass & Shafiq, IMC '25), which studied first-party cookie jar vulnerabilities at scale across 20,000 websites:

> CookieGuard is a security defense mechanism that addresses vulnerabilities created when websites embed third-party scripts. These scripts inherit first-party privileges and can access sensitive cookie data. The tool accomplishes this through:
>
> - Attribution of cookies to their creator domain
> - Filtering document.cookie and cookieStore access by domain
> - Maintaining compatibility with legitimate first-party scripts
> - Optional entity-group whitelisting for multi-domain scenarios

Key findings from that research:

> - "56% of sites include a script that exfiltrates a cookie it didn't set"
> - "32% include a script that overwrites or deletes such cookies"
> - The defense reduces cross-domain overwriting by approximately 82%, deletion by 86%, and exfiltration by 83%
> - Average page-load overhead remains modest at roughly 0.3 seconds
> - SSO breakage can be minimized to approximately 3% with entity grouping

Cookie Shield focuses on the user-visible side of this problem -- surfacing affiliate tracking cookies and flagging affiliate links in real time -- while the academic CookieGuard addresses the deeper script-level isolation problem.

---

## Installing (unpacked / developer mode)

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `cookie-shield` directory

---

## Attribution

Cookie Shield draws from two distinct upstream projects:

**Cookie Guard** (Chrome extension, affiliate tracking detection)
- Chrome Web Store -- https://chromewebstore.google.com/detail/cookie-guard/ifjhcahbhkfojdmkndpkmkffbjnefido
- Source repository -- https://github.com/pooneh-nb/cookieGuard
- Introducing Cookie Guard (dev.to) -- https://dev.to/arvindvyas/introducing-cookie-guard-a-simple-private-cookie-manager-for-chrome-29f9

All core detection logic, cookie pattern definitions, UI structure, and CSS are from Cookie Guard. Changes in this repo are limited to the per-site highlighting feature and branding.

**CookieGuard** (academic research, first-party cookie jar isolation)
- Paper (arXiv 2406.05310) -- https://arxiv.org/html/2406.05310v3
- Forked source -- https://github.com/slmingol/cookieGuard

```bibtex
@inproceedings{bahrami2025cookieguard,
  title     = {CookieGuard: Characterizing and Isolating the First-Party Cookie Jar},
  author    = {Pouneh Nikkhah Bahrami and Aurore Fass and Zubair Shafiq},
  booktitle = {Proceedings of the ACM Internet Measurement Conference (IMC '25)},
  year      = {2025},
  address   = {Madison, WI, USA},
  publisher = {ACM}
}
```
