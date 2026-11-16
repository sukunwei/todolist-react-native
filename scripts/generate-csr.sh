#!/usr/bin/env bash
#
# 生成 Apple Distribution 證書的 CSR（憑證簽署請求）。
#
# 為什麼要手動生成：Developer Portal 對 Apple Distribution 只提供
# 「Upload a Certificate Signing Request」流程，得先有一個 CSR。
# 私鑰必須與後面下載的 .cer 配對，所以私鑰要先放進登入鑰匙串。
#
# 用法：
#   ./scripts/generate-csr.sh                  # 預設 CN=Kunwei SU / OU=<TeamID>
#   ./scripts/generate-csr.sh "Your Name" TEAMID1234
#
# 產物：
#   ~/Desktop/todolist-distribution.csr   → 上傳到 Developer Portal
#   私鑰在 ~/Library/Keychains/login.keychain-db（匯入 .cer 後自動配成可用身分）
#
set -euo pipefail

CN="${1:-Kunwei SU}"
TEAM_ID="${2:-9NRVT8Q8MQ}"
ORG="${3:-Kunwei SU}"
CSR_OUT="${CSR_OUT:-$HOME/Desktop/todolist-distribution.csr}"
KEY_TMP="$(mktemp -t todolist-dist).key"
KEYCHAIN="$HOME/Library/Keychains/login.keychain-db"

echo "① 生成 RSA 2048 私鑰 → $KEY_TMP"
openssl genrsa -out "$KEY_TMP" 2048 2>/dev/null

echo "② 匯入登入鑰匙串（配好 codesign 的存取權限）"
# -T /usr/bin/codeswin 是重點：沒它，codesign 無法取用這把私鑰
security import "$KEY_TMP" -k "$KEYCHAIN" \
  -T /usr/bin/codesign -T /usr/bin/security

echo "③ 用私鑰生成 CSR → $CSR_OUT"
openssl req -new -key "$KEY_TMP" -out "$CSR_OUT" \
  -subj "/CN=${CN}/OU=${TEAM_ID}/O=${ORG}/C=US" 2>/dev/null

echo
echo "=== CSR 內容與校驗 ==="
openssl req -in "$CSR_OUT" -noout -subject -verify 2>&1 | head -3
echo
ls -la "$CSR_OUT"

echo
cat <<TXT
下一步：
  1) Developer Portal → Certificates → ➕ → Apple Distribution
  2) Upload a Certificate Signing Request File → 選 $CSR_OUT
  3) 下載 .cer，執行 ./scripts/import-cert.sh <.cer 路徑>
TXT

# 私鑰留在鑰匙串裡即可，暫存檔可刪
rm -f "$KEY_TMP"
