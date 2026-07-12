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

VERSION=$(jq -r '.version' manifest.json)
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
ZIP_NAME="cookie-shield-v${VERSION}_${TIMESTAMP}.zip"
BUILD_DIR=$(mktemp -d)

echo -e "${CYAN}Building Cookie Shield v${VERSION}...${NC}"

rsync -a \
  --exclude='.git*' \
  --exclude='.github/' \
  --exclude='src_orig/' \
  --exclude='session.jsonl' \
  --exclude='CONTEXT.md' \
  --exclude='README.md' \
  --exclude='build/' \
  . "$BUILD_DIR/"

mkdir -p build
(cd "$BUILD_DIR" && zip -r "$OLDPWD/build/$ZIP_NAME" . -x "*.DS_Store")
rm -rf "$BUILD_DIR"

SIZE=$(du -h "build/$ZIP_NAME" | cut -f1)
echo -e "${GREEN}Built: build/$ZIP_NAME (${SIZE})${NC}"
echo ""
echo -e "${YELLOW}To test in Chrome:${NC}"
echo "  1. Unzip: unzip build/$ZIP_NAME -d /tmp/cookie-shield-test"
echo "  2. Open chrome://extensions"
echo "  3. Enable Developer mode"
echo "  4. Click 'Load unpacked' -> select /tmp/cookie-shield-test"
echo ""
echo -e "${YELLOW}To submit to Chrome Web Store:${NC}"
echo "  Upload build/$ZIP_NAME at https://chrome.google.com/webstore/devconsole"
