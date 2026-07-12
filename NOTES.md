# Next Steps

## 1. ~~Create GitHub repo and push~~ (done)

## 2. Add CRX signing key secret

The release workflow builds both a ZIP and a CRX. The CRX is signed with `cookie-shield.pem`
(gitignored, lives in the project root). To use the same key in CI:

```bash
# Base64-encode the pem and add it as a GitHub secret
base64 -i cookie-shield.pem | pbcopy   # copies to clipboard
```

Then in GitHub repo **Settings -> Secrets and variables -> Actions**, add:

| Secret | Value |
|---|---|
| `CHROME_EXTENSION_KEY` | Paste the base64-encoded PEM from clipboard |

Without this secret the workflow still runs but generates a new throwaway key each time
(CRX won't be consistently signed across releases).

## 3. Wire up Chrome Web Store publishing

The `release.yml` workflow has the CWS publish step ready but commented out. To enable it:

### Get OAuth credentials (one-time setup)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project (or reuse one from your other extensions)
3. Enable the **Chrome Web Store API**
4. Create **OAuth 2.0 credentials** (Desktop app type)
5. Note the `CLIENT_ID` and `CLIENT_SECRET`
6. Run this to get a refresh token (same flow you did for the other 3 extensions):

```bash
# Authorize and get refresh token
curl -s "https://accounts.google.com/o/oauth2/auth?response_type=code&scope=https://www.googleapis.com/auth/chromewebstore&client_id=YOUR_CLIENT_ID&redirect_uri=urn:ietf:wg:oauth:2.0:oob"
# Open that URL in browser, approve, copy the code, then:
curl -s -X POST https://oauth2.googleapis.com/token \
  -d "code=PASTE_CODE&client_id=YOUR_CLIENT_ID&client_secret=YOUR_CLIENT_SECRET&redirect_uri=urn:ietf:wg:oauth:2.0:oob&grant_type=authorization_code" \
  | jq -r '.refresh_token'
```

### Set repo secrets

In GitHub repo Settings -> Secrets and variables -> Actions, add:

| Secret | Value |
|---|---|
| `CHROME_EXTENSION_ID` | From CWS dashboard URL after first manual submission |
| `CHROME_CLIENT_ID` | From Google Cloud Console |
| `CHROME_CLIENT_SECRET` | From Google Cloud Console |
| `CHROME_REFRESH_TOKEN` | From the curl above |

### Uncomment the publish step

In `.github/workflows/release.yml`, uncomment the `# - name: Publish to Chrome Web Store` block.

## 4. First submission to CWS (manual)

Automated publishing only works for **updates** to an existing listing. The first submission must be done manually:

1. Download `cookie-shield-v1.0.zip` from the [GitHub release](https://github.com/slmingol/cookie-shield/releases/tag/v1.0)
2. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
3. Click **+ New item**, upload the ZIP
4. Fill in the listing using the copy below
5. Submit for review

After approval, the extension ID is in the dashboard URL -- add it as the `CHROME_EXTENSION_ID` secret. From that point on, pushing a `v*` tag triggers the full automated release.

---

### Store listing copy

**Name**
```
Cookie Shield
```

**Summary** (132 char max)
```
Real-time affiliate cookie detection and per-site affiliate link highlighting control.
```

**Description**
```
Cookie Shield monitors your browser for affiliate tracking cookies and highlights affiliate links on any page -- so you always know when a site is earning a referral commission from your clicks.

Built as a fork of Cookie Guard, Cookie Shield adds one key feature: per-site control over affiliate link highlighting. Cookie Guard only has a global toggle. Cookie Shield lets you disable highlighting on specific sites (like Amazon or price-comparison tools where it gets noisy) while keeping it active everywhere else.

Features:
- Real-time affiliate cookie detection across all major networks (Amazon Associates, CJ, Rakuten, Awin, Impact, ShareASale, and more)
- Affiliate link highlighting with a per-site enable/disable toggle
- In-page alerts when affiliate cookies are detected, with network identification
- Cookie inspector to browse and clear detected affiliate cookies
- Manage which sites skip cookie notifications
- Customize cookie detection patterns

The per-site highlight toggle appears in the popup as "Disable/Enable highlighting here" and takes effect immediately -- no page reload required.

All processing is local. No data is collected, transmitted, or shared.
```

**Category**
```
Productivity
```

**Language**
```
English
```

---

### Privacy practices (form answers)

**Does your extension collect any user data?**
No

**Single purpose description** (what the one core thing this extension does)
```
Detects affiliate tracking cookies and highlights affiliate links in real time.
```

---

### Permissions justification

The dashboard may ask you to justify each permission:

| Permission | Justification |
|---|---|
| `cookies` | Required to read and monitor browser cookies for affiliate tracking patterns |
| `tabs` | Required to get the current tab's URL/hostname for per-site highlighting control |
| `storage` | Required to save user settings (paused sites, highlight preferences, cookie patterns) |
| `windows` | Required to open the cookie inspector in a separate window |
| `webNavigation` | Required to detect Amazon affiliate tag parameters during page navigation |
| `host_permissions` (`http://*/*`, `https://*/*`) | Required to inject the content script that scans links and cookies on every page |

## 5. Version workflow

- **Patch** (bug fixes): `fix: description` commit message or manual bump-version workflow
- **Minor** (new features): `feat: description` commit message
- **Major** (breaking change): `feat!:` or `BREAKING CHANGE` in commit
- **Manual**: GitHub Actions -> Manual Version Bump -> pick patch/minor/major

Each bump commits the new version to `manifest.json`, pushes a `vX.Y.Z` tag, and triggers the release workflow automatically.
