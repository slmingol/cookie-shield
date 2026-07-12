# Next Steps

## 1. Create GitHub repo and push

```bash
gh repo create cookie-shield --public --source=. --remote=origin --push
```

## 2. Wire up Chrome Web Store publishing

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

## 3. First submission to CWS (manual)

Automated publishing only works for **updates** to an existing listing. The first submission must be done manually:

1. Run `./build.sh` to create the ZIP
2. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
3. Click **New item**, upload the ZIP
4. Fill in store listing: description, screenshots, category (Productivity), privacy practices
5. Submit for review

After approval, the extension ID is in the dashboard URL -- add it as the `CHROME_EXTENSION_ID` secret. From that point on, pushing a `v*` tag triggers the full automated release.

## 4. Version workflow

- **Patch** (bug fixes): `fix: description` commit message or manual bump-version workflow
- **Minor** (new features): `feat: description` commit message
- **Major** (breaking change): `feat!:` or `BREAKING CHANGE` in commit
- **Manual**: GitHub Actions -> Manual Version Bump -> pick patch/minor/major

Each bump commits the new version to `manifest.json`, pushes a `vX.Y.Z` tag, and triggers the release workflow automatically.
