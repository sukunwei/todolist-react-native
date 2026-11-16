#!/usr/bin/env bash
#
# 打包 / 導出 / 上傳 App Store。
#
# 用法：
#   ./scripts/release.sh --check                     # 只檢查前置條件，不打包
#   ./scripts/release.sh                             # archive + 導出 IPA
#   ./scripts/release.sh --upload                    # 再上傳到 App Store Connect
#   TEAM_ID=XXXXXXXXXX BUNDLE_ID=com.foo.todolist ./scripts/release.sh --upload
#
# 前置條件（都在 --check 裡逐項校驗）：
#   · Xcode 已登錄付費開發者賬號，且賬號裡有 Team（不是 Personal Team）
#   · Developer Portal 已註冊對應 Bundle ID
#   · App Store Connect 已創建 App 記錄
#   · 已簽署付費應用程序協議並填好稅務與銀行資訊
#
set -euo pipefail

cd "$(dirname "$0")/.."

BUNDLE_ID="${BUNDLE_ID:-com.kunweisu.qingdanben}"
TEAM_ID="${TEAM_ID:-9NRVT8Q8MQ}"
METHOD="${METHOD:-app-store}"      # app-store | development | ad-hoc
DO_UPLOAD=0
DO_CHECK_ONLY=0
APPLE_ID="${APPLE_ID:-}"
APP_PASSWORD="${APP_PASSWORD:-}"

for arg in "$@"; do
  case "$arg" in
    --upload) DO_UPLOAD=1 ;;
    --check)  DO_CHECK_ONLY=1 ;;
  esac
done

ARCHIVE="build/TODOLIST.xcarchive"
EXPORT_DIR="build/export"

# ---------------------------------------------------------------- 前置檢查
check() {
  local ok=0
  echo "檢查前置條件……"

  # 1. 付費團隊是否已出現在 Xcode
  local teams
  teams="$(defaults read com.apple.dt.Xcode IDEProvisioningTeamByIdentifier 2>/dev/null || true)"
  if echo "$teams" | grep -q "Personal Team"; then
    echo "  ✗ Xcode 裡只有 Personal Team（免費），還沒有付費開發者團隊"
    echo "    → Xcode → Settings → Accounts → + → 用有 Program 成員資格的 Apple ID 登錄"
    ok=1
  elif [ -n "$TEAM_ID" ] && echo "$teams" | grep -q "$TEAM_ID"; then
    echo "  ✓ Xcode 團隊 ${TEAM_ID} 已就緒"
  else
    echo "  ? 未檢測到付費團隊（TEAM_ID 未設定或與 Xcode 中的不一致）"
    echo "    實際內容：${teams:-（讀不到）}"
  fi

  # 2. 簽名證書
  local idents
  idents="$(security find-identity -v -p codesigning 2>/dev/null | grep -c 'Apple Distribution' || true)"
  if [ "$idents" -gt 0 ]; then
    echo "  ✓ Apple Distribution 證書已存在（${idents} 張）"
  else
    echo "  · 還沒有 Apple Distribution 證書 —— 沒關係，自動簽名會在首次 archive 時自動創建"
  fi

  # 3. Bundle ID 是否還是佔位值
  if echo "$BUNDLE_ID" | grep -q "^com\.example\."; then
    echo "  ⚠ Bundle ID 仍是佔位值 ${BUNDLE_ID}"
    echo "    上架前必須換成正式值（project.pbxproj / Info.plist / App Store Connect 三處一致）"
  else
    echo "  ✓ Bundle ID：${BUNDLE_ID}"
  fi

  # 4. 版本號
  local ver build_num
  ver="$(grep -m1 'MARKETING_VERSION' ios/TODOLIST.xcodeproj/project.pbxproj | sed 's/.*= //; s/;//')"
  build_num="$(grep -m1 'CURRENT_PROJECT_VERSION' ios/TODOLIST.xcodeproj/project.pbxproj | sed 's/.*= //; s/;//')"
  echo "  · 版本 ${ver} (build ${build_num})"

  # 5. 上傳憑據
  if [ "$DO_UPLOAD" = "1" ]; then
    if [ -z "$APPLE_ID" ] || [ -z "$APP_PASSWORD" ]; then
      echo "  ✗ 上傳需要 APPLE_ID 與 APP_PASSWORD（App 專用密碼）環境變數"
      ok=1
    else
      echo "  ✓ 上傳憑據已設定"
    fi
  fi

  if [ "$ok" = "1" ]; then
    echo
    echo "前置條件未滿足，先處理上面標 ✗ 的項。"
    exit 1
  fi
  echo
}

check
if [ "$DO_CHECK_ONLY" = "1" ]; then
  exit 0
fi

# ---------------------------------------------------------------- Archive
echo "▶ Archive（Release，會把 JS bundle 打進包裡）……"
mkdir -p build

ARCHIVE_ARGS=(
  -workspace ios/TODOLIST.xcworkspace
  -scheme TODOLIST
  -configuration Release
  -archivePath "$ARCHIVE"
  -destination 'generic/platform=iOS'
  archive
  # -allowProvisioningUpdates 讓 Xcode 自動註冊 App ID / 創建證書與描述文件；
  # -allowProvisioningDeviceRegistration 允許它把連著的真機註冊進賬號
  # （賬號下沒有任何裝置時，Development 描述文件無法生成）。
  -allowProvisioningUpdates
  -allowProvisioningDeviceRegistration
)
[ -n "$TEAM_ID" ] && ARCHIVE_ARGS+=("DEVELOPMENT_TEAM=$TEAM_ID")
[ "$BUNDLE_ID" != "com.kunweisu.qingdanben" ] && ARCHIVE_ARGS+=("PRODUCT_BUNDLE_IDENTIFIER=$BUNDLE_ID")

xcodebuild "${ARCHIVE_ARGS[@]}"

# 驗證 bundle 已內嵌
if [ ! -f "$ARCHIVE/Products/Applications/TODOLIST.app/main.jsbundle" ]; then
  echo "✗ archive 裡沒有 main.jsbundle，JS 沒被打進去" >&2
  exit 1
fi
echo "  ✓ main.jsbundle 已內嵌（$(du -h "$ARCHIVE/Products/Applications/TODOLIST.app/main.jsbundle" | cut -f1)）"

# ---------------------------------------------------------------- 導出 IPA
echo "▶ 導出 IPA……"
EXPORT_OPTIONS="$(mktemp -t ExportOptions).plist"
cat > "$EXPORT_OPTIONS" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>method</key>
	<string>${METHOD}</string>
	<key>teamID</key>
	<string>${TEAM_ID}</string>
	<key>signingStyle</key>
	<string>automatic</string>
	<key>destination</key>
	<string>upload</string>
	<key>stripSwiftSymbols</key>
	<true/>
	<key>uploadSymbols</key>
	<true/>
</dict>
</plist>
PLIST

rm -rf "$EXPORT_DIR"
xcodebuild -exportArchive \
  -archivePath "$ARCHIVE" \
  -exportPath "$EXPORT_DIR" \
  -exportOptionsPlist "$EXPORT_OPTIONS"

IPA="$EXPORT_DIR/TODOLIST.ipa"
[ -f "$IPA" ] || { echo "✗ 沒找到導出的 IPA：$IPA" >&2; exit 1; }
echo "  ✓ $IPA（$(du -h "$IPA" | cut -f1)）"

# ---------------------------------------------------------------- 上傳
if [ "$DO_UPLOAD" = "1" ]; then
  echo "▶ 上傳到 App Store Connect……"
  # 注意：Xcode 27 裡參數是 --upload-package，舊的 --upload-file 已移除
  xcrun altool --upload-package "$IPA" -u "$APPLE_ID" -p "$APP_PASSWORD"
  echo "  ✓ 上傳完成，去 App Store Connect → 我的 App → 該 App → 版本 裡構建版本"
fi

echo
echo "完成。"
