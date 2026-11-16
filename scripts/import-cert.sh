#!/usr/bin/env bash
#
# 匯入 Apple 簽名證書 .cer 到登入鑰匙串。
#
# 用途：Apple Distribution 證書是 App Store 上傳的必要條件。
# 當自動簽名一直落到 development 證書時，可以手動建一張發行證書：
#   1) Developer Portal → Certificates → + → Apple Distribution
#   2) 選「Generate a Certificate for you」（由 Apple 生成金鑰，最省事）
#   3) 下載 .cer，存到本機
#   4) 執行本腳本匯入
#
# 用法：
#   ./scripts/import-cert.sh /path/to/AppleDistribution.cer
#
set -euo pipefail

CERT="${1:-}"
if [[ -z "$CERT" || ! -f "$CERT" ]]; then
  echo "用法：$0 <證書.cer 路徑>" >&2
  exit 1
fi

KEYCHAIN="$HOME/Library/Keychains/login.keychain-db"

echo "匯入 $CERT …"
security import "$CERT" -k "$KEYCHAIN" -T /usr/bin/codesign -T /usr/bin/security

echo
echo "=== 目前的簽名身分 ==="
security find-identity -v -p codesigning

echo
if security find-identity -v -p codesigning | grep -q "Apple Distribution"; then
  echo "✓ 已有 Apple Distribution 證書，可以重新嘗試歸檔："
  echo "    ./scripts/release.sh"
else
  echo "✗ 還是沒有 Apple Distribution 證書"
fi
