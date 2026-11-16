#!/usr/bin/env bash
#
# 打包 / 导出 / 上传 App Store。
#
# 用法：
#   ./scripts/release.sh --check                     # 只检查前置条件，不打包
#   ./scripts/release.sh                             # archive + 导出 IPA
#   ./scripts/release.sh --upload                    # 再上传到 App Store Connect
#   TEAM_ID=XXXXXXXXXX BUNDLE_ID=com.foo.todolist ./scripts/release.sh --upload
#
# 前置条件（都在 --check 里逐项校验）：
#   · Xcode 已登录付费开发者账号，且账号里有 Team（不是 Personal Team）
#   · Developer Portal 已注册对应 Bundle ID
#   · App Store Connect 已创建 App 记录
#   · 已签署付费应用程序协议并填好税务与银行信息
#
set -euo pipefail

cd "$(dirname "$0")/.."

BUNDLE_ID="${BUNDLE_ID:-com.example.todolist}"
TEAM_ID="${TEAM_ID:-}"
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

# ---------------------------------------------------------------- 前置检查
check() {
  local ok=0
  echo "检查前置条件……"

  # 1. 付费团队是否已出现在 Xcode
  local teams
  teams="$(defaults read com.apple.dt.Xcode IDEProvisioningTeamByIdentifier 2>/dev/null || true)"
  if echo "$teams" | grep -q "Personal Team"; then
    echo "  ✗ Xcode 里只有 Personal Team（免费），还没有付费开发者团队"
    echo "    → Xcode → Settings → Accounts → + → 用有 Program 成员资格的 Apple ID 登录"
    ok=1
  elif [ -n "$TEAM_ID" ] && echo "$teams" | grep -q "$TEAM_ID"; then
    echo "  ✓ Xcode 团队 ${TEAM_ID} 已就绪"
  else
    echo "  ? 未检测到付费团队（TEAM_ID 未设置或与 Xcode 中的不一致）"
    echo "    实际内容：${teams:-（读不到）}"
  fi

  # 2. 签名证书
  local idents
  idents="$(security find-identity -v -p codesigning 2>/dev/null | grep -c 'Apple Distribution' || true)"
  if [ "$idents" -gt 0 ]; then
    echo "  ✓ Apple Distribution 证书已存在（${idents} 张）"
  else
    echo "  · 还没有 Apple Distribution 证书 —— 没关系，自动签名会在首次 archive 时自动创建"
  fi

  # 3. Bundle ID 是否还是占位值
  if echo "$BUNDLE_ID" | grep -q "^com\.example\."; then
    echo "  ⚠ Bundle ID 仍是占位值 ${BUNDLE_ID}"
    echo "    上架前必须换成正式值（project.pbxproj / Info.plist / App Store Connect 三处一致）"
  else
    echo "  ✓ Bundle ID：${BUNDLE_ID}"
  fi

  # 4. 版本号
  local ver build_num
  ver="$(grep -m1 'MARKETING_VERSION' ios/TODOLIST.xcodeproj/project.pbxproj | sed 's/.*= //; s/;//')"
  build_num="$(grep -m1 'CURRENT_PROJECT_VERSION' ios/TODOLIST.xcodeproj/project.pbxproj | sed 's/.*= //; s/;//')"
  echo "  · 版本 ${ver} (build ${build_num})"

  # 5. 上传凭据
  if [ "$DO_UPLOAD" = "1" ]; then
    if [ -z "$APPLE_ID" ] || [ -z "$APP_PASSWORD" ]; then
      echo "  ✗ 上传需要 APPLE_ID 与 APP_PASSWORD（App 专用密码）环境变量"
      ok=1
    else
      echo "  ✓ 上传凭据已设置"
    fi
  fi

  if [ "$ok" = "1" ]; then
    echo
    echo "前置条件未满足，先处理上面标 ✗ 的项。"
    exit 1
  fi
  echo
}

check
if [ "$DO_CHECK_ONLY" = "1" ]; then
  exit 0
fi

# ---------------------------------------------------------------- Archive
echo "▶ Archive（Release，会把 JS bundle 打进包里）……"
mkdir -p build

ARCHIVE_ARGS=(
  -workspace ios/TODOLIST.xcworkspace
  -scheme TODOLIST
  -configuration Release
  -archivePath "$ARCHIVE"
  -destination 'generic/platform=iOS'
  archive
)
[ -n "$TEAM_ID" ] && ARCHIVE_ARGS+=("DEVELOPMENT_TEAM=$TEAM_ID")
[ "$BUNDLE_ID" != "com.example.todolist" ] && ARCHIVE_ARGS+=("PRODUCT_BUNDLE_IDENTIFIER=$BUNDLE_ID")

xcodebuild "${ARCHIVE_ARGS[@]}"

# 验证 bundle 已内嵌
if [ ! -f "$ARCHIVE/Products/Applications/TODOLIST.app/main.jsbundle" ]; then
  echo "✗ archive 里没有 main.jsbundle，JS 没被打进去" >&2
  exit 1
fi
echo "  ✓ main.jsbundle 已内嵌（$(du -h "$ARCHIVE/Products/Applications/TODOLIST.app/main.jsbundle" | cut -f1)）"

# ---------------------------------------------------------------- 导出 IPA
echo "▶ 导出 IPA……"
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
[ -f "$IPA" ] || { echo "✗ 没找到导出的 IPA：$IPA" >&2; exit 1; }
echo "  ✓ $IPA（$(du -h "$IPA" | cut -f1)）"

# ---------------------------------------------------------------- 上传
if [ "$DO_UPLOAD" = "1" ]; then
  echo "▶ 上传到 App Store Connect……"
  # 注意：Xcode 27 里参数是 --upload-package，旧的 --upload-file 已移除
  xcrun altool --upload-package "$IPA" -u "$APPLE_ID" -p "$APP_PASSWORD"
  echo "  ✓ 上传完成，去 App Store Connect → 我的 App → 该 App → 版本 里构建版本"
fi

echo
echo "完成。"
