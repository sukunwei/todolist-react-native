#!/usr/bin/env bash
#
# 检查签名 / 描述文件状态，判断是否已具备上传 App Store 的条件。
#
# 用法：
#   ./scripts/check-signing.sh
#
# 判定标准（App Store 上传要求全部满足）：
#   1. 证书是 Apple Distribution（不能是 Apple Development）
#   2. 描述文件是 App Store 分发类型（get-task-allow = false）
#   3. 描述文件的 App ID 是显式的（AppIDName 不是 "XC Wildcard"）
#
set -uo pipefail

cd "$(dirname "$0")/.."

PROFILE_DIR="$HOME/Library/Developer/Xcode/UserData/Provisioning Profiles"
ARCHIVE_APP="build/TODOLIST.xcarchive/Products/Applications/TODOLIST.app"

echo "=== 1. Xcode 里的团队 ==="
teams="$(defaults read com.apple.dt.Xcode IDEProvisioningTeamByIdentifier 2>/dev/null || true)"
if echo "$teams" | grep -q "Personal Team"; then
  echo "  ✗ 只有 Personal Team（免費），沒有付費開發者團隊"
  echo "    → Xcode → Settings → Accounts → + → 用有 Program 會員資格的 Apple ID 登入"
else
  echo "$teams" | grep -E "teamID|teamName|teamType" | sed 's/^/  /'
fi

echo
echo "=== 2. 簽名證書 ==="
security find-identity -v -p codesigning 2>/dev/null | sed 's/^/  /' || true
if security find-identity -v -p codesigning 2>/dev/null | grep -q "Apple Distribution"; then
  echo "  ✓ 有 Apple Distribution 證書"
else
  echo "  · 沒有 Apple Distribution 證書（自動簽名會在首次歸檔時自動建立）"
fi

echo
echo "=== 3. 描述文件 ==="
if [ -d "$PROFILE_DIR" ]; then
  for p in "$PROFILE_DIR"/*; do
    [ -f "$p" ] || continue
    info="$(security cms -D -i "$p" 2>/dev/null)"
    name="$(echo "$info" | plutil -extract Name raw -o - - 2>/dev/null)"
    appid="$(echo "$info" | plutil -extract AppIDName raw -o - - 2>/dev/null)"
    gta="$(echo "$info" | plutil -extract Entitlements.get-task-allow raw -o - - 2>/dev/null)"
    exp="$(echo "$info" | plutil -extract ExpirationDate raw -o - - 2>/dev/null)"
    echo "  ${name}"
    echo "    AppIDName = ${appid}   get-task-allow = ${gta}"
    echo "    到期 = ${exp}"
  done
else
  echo "  （還沒有描述文件）"
fi

echo
echo "=== 4. 最近一次歸檔的簽名 ==="
if [ -d "$ARCHIVE_APP" ]; then
  codesign -dv --verbose=2 "$ARCHIVE_APP" 2>&1 | grep -E "Identifier|Authority" | sed 's/^/  /'
  if [ -f "$ARCHIVE_APP/embedded.mobileprovision" ]; then
    info="$(security cms -D -i "$ARCHIVE_APP/embedded.mobileprovision" 2>/dev/null)"
    appid="$(echo "$info" | plutil -extract AppIDName raw -o - - 2>/dev/null)"
    gta="$(echo "$info" | plutil -extract Entitlements.get-task-allow raw -o - - 2>/dev/null)"
    echo "    描述文件 AppIDName = ${appid}   get-task-allow = ${gta}"
  fi
else
  echo "  （還沒有歸檔產物，執行 ./scripts/release.sh 產生）"
fi

echo
echo "=== 結論 ==="
ready=1
if [ -d "$ARCHIVE_APP" ]; then
  auth="$(codesign -dv --verbose=2 "$ARCHIVE_APP" 2>&1 | grep -c 'Apple Distribution' || true)"
  gta="$(security cms -D -i "$ARCHIVE_APP/embedded.mobileprovision" 2>/dev/null | plutil -extract Entitlements.get-task-allow raw -o - - 2>/dev/null)"
  appid="$(security cms -D -i "$ARCHIVE_APP/embedded.mobileprovision" 2>/dev/null | plutil -extract AppIDName raw -o - - 2>/dev/null)"
  [ "$auth" -gt 0 ] || { echo "  ✗ 簽名證書不是 Apple Distribution"; ready=0; }
  [ "$gta" = "false" ] || { echo "  ✗ 描述文件是開發者類型（get-task-allow=${gta}），需為 App Store 分發類型"; ready=0; }
  [ "$appid" != "XC Wildcard" ] || { echo "  ✗ 描述文件用的是通配符 App ID（XC Wildcard）"; ready=0; }
fi
if [ "$ready" = "1" ]; then
  echo "  ✓ 已具備上傳 App Store 的簽名條件"
  exit 0
fi

echo "  → 見下方「缺什麼 / 怎麼補」"
echo
echo "=== 缺什麼 / 怎麼補 ==="
cat <<'TXT'
  ① 註冊顯式 App ID（不能用通配符 *，通配符只能是開發型描述文件）
     https://developer.apple.com/account/resources/identifiers/list
     → + → App IDs → App → Explicit → com.kunweisu.todolist

  ② 建 Apple Distribution 證書
     https://developer.apple.com/account/resources/certificates/list
     → + → Apple Distribution → 上傳 CSR（./scripts/generate-csr.sh 產生）
     → 下載 .cer 後執行 ./scripts/import-cert.sh <路徑>

  ③ 建 App Store 分發描述文件
     https://developer.apple.com/account/resources/profiles/list
     → + → Distribution: App Store Connect
       Certificate = Apple Distribution: Kunwei SU (9NRVT8Q8MQ)
       App ID      = TODOLIST (com.kunweisu.todolist)
       Name        = TODOLIST App Store
     → 下載 .mobileprovision 後執行 ./scripts/import-profile.sh <路徑>

  ④ Release 改為手動簽名
     ./scripts/set-manual-signing.sh "TODOLIST App Store"

  ⑤ 打包上傳
     ./scripts/release.sh --upload
TXT
