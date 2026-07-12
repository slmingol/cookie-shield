#!/usr/bin/env bash
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

if ! command -v jq &>/dev/null; then
  echo -e "${RED}Error: jq is required. Install with: brew install jq${NC}"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
VERSION=$(jq -r '.version' "$SCRIPT_DIR/manifest.json")
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
ZIP_NAME="cookie-shield-v${VERSION}_${TIMESTAMP}.zip"
CRX_NAME="cookie-shield-v${VERSION}_${TIMESTAMP}.crx"
PEM_FILE="$SCRIPT_DIR/cookie-shield.pem"

echo -e "${CYAN}Building Cookie Shield v${VERSION}...${NC}"

mkdir -p "$SCRIPT_DIR/build"

# ── ZIP ──────────────────────────────────────────────────────────────────────

BUILD_DIR=$(mktemp -d)
rsync -a \
  --exclude='.git*' \
  --exclude='.github/' \
  --exclude='session.jsonl' \
  --exclude='CONTEXT.md' \
  --exclude='README.md' \
  --exclude='NOTES.md' \
  --exclude='*.pem' \
  --exclude='*.crx' \
  --exclude='build/' \
  "$SCRIPT_DIR/" "$BUILD_DIR/"
(cd "$BUILD_DIR" && zip -qr "$SCRIPT_DIR/build/$ZIP_NAME" . -x "*.DS_Store")
rm -rf "$BUILD_DIR"

SIZE=$(du -h "$SCRIPT_DIR/build/$ZIP_NAME" | cut -f1)
echo -e "${GREEN}ZIP: build/$ZIP_NAME (${SIZE})${NC}"

# ── CRX ──────────────────────────────────────────────────────────────────────

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
if [ -f "$CHROME" ]; then
  PACK_DIR=$(mktemp -d)
  rsync -a \
    --exclude='.git*' \
    --exclude='.github/' \
    --exclude='session.jsonl' \
    --exclude='CONTEXT.md' \
    --exclude='README.md' \
    --exclude='NOTES.md' \
    --exclude='*.pem' \
    --exclude='*.crx' \
    --exclude='build/' \
    "$SCRIPT_DIR/" "$PACK_DIR/cookie-shield/"

  if [ -f "$PEM_FILE" ]; then
    KEY_ARG="--pack-extension-key=$PEM_FILE"
  else
    KEY_ARG=""
    echo -e "${YELLOW}No cookie-shield.pem found; Chrome will generate a new key${NC}"
  fi

  "$CHROME" --pack-extension="$PACK_DIR/cookie-shield" $KEY_ARG --no-message-box 2>/dev/null || true

  if [ -f "$PACK_DIR/cookie-shield.crx" ]; then
    cp "$PACK_DIR/cookie-shield.crx" "$SCRIPT_DIR/build/$CRX_NAME"
    # Save generated pem if one was created
    if [ ! -f "$PEM_FILE" ] && [ -f "$PACK_DIR/cookie-shield.pem" ]; then
      cp "$PACK_DIR/cookie-shield.pem" "$PEM_FILE"
      echo -e "${YELLOW}Saved signing key to cookie-shield.pem (keep this safe, do not commit)${NC}"
    fi
    CRX_SIZE=$(du -h "$SCRIPT_DIR/build/$CRX_NAME" | cut -f1)
    echo -e "${GREEN}CRX: build/$CRX_NAME (${CRX_SIZE})${NC}"
  else
    echo -e "${YELLOW}CRX build failed, skipping${NC}"
  fi
  rm -rf "$PACK_DIR"
else
  echo -e "${YELLOW}Chrome not found at expected path, skipping CRX build${NC}"
fi

# ── Usage hints ──────────────────────────────────────────────────────────────

echo ""
echo -e "${YELLOW}To test in Chrome (ZIP):${NC}"
echo "  1. Unzip: unzip build/$ZIP_NAME -d /tmp/cookie-shield-test"
echo "  2. Open chrome://extensions -> Developer mode -> Load unpacked -> /tmp/cookie-shield-test"
echo ""
echo -e "${YELLOW}To test in Chrome (CRX):${NC}"
echo "  Drag build/$CRX_NAME onto chrome://extensions"
echo ""
echo -e "${YELLOW}To submit to Chrome Web Store:${NC}"
echo "  Upload build/$ZIP_NAME at https://chrome.google.com/webstore/devconsole"
