#!/usr/bin/env bash
#
# 匯入 App Store 分發描述文件（.mobileprovision），並印出它的名稱。
#
# 為什麼需要手動匯入：Xcode 的自動簽名在這個帳號上一直落到 development 型別，
# 必須改用「手動簽名 + 明確指定 App Store 描述文件」。
#
# 用法：
#   ./scripts/import-profile.sh /path/to/TODOLIST.mobileprovision
#
set -euo pipefail

PROFILE="${1:-}"
if [[ -z "$PROFILE" || ! -f "$PROFILE" ]]; then
  echo "用法：$0 <描述檔.mobileprovision 路徑>" >&2
  exit 1
fi

PROFILE_DIR="$HOME/Library/Developer/Xcode/UserData/Provisioning Profiles"
mkdir -p "$PROFILE_DIR"

# 描述檔要放在「名稱 = UUID」的目錄下，Xcode 才認得
UUID="$(security cms -D -i "$PROFILE" 2>/dev/null | plutil -extract UUID raw -o - -)"
NAME="$(security cms -D -i "$PROFILE" 2>/dev/null | plutil -extract Name raw -o - -)"
APPID="$(security cms -D -i "$PROFILE" 2>/dev/null | plutil -extract AppIDName raw -o - -)"
GTA="$(security cms -D -i "$PROFILE" 2>/dev/null | plutil -extract Entitlements.get-task-allow raw -o - - 2>/dev/null || echo false)"

cp "$PROFILE" "${PROFILE_DIR}/${UUID}.mobileprovision"

echo "✓ 已匯入到 ${PROFILE_DIR}/${UUID}.mobileprovision"
echo
echo "  Name             = ${NAME}"
echo "  AppIDName        = ${APPID}"
echo "  get-task-allow   = ${GTA}"
echo
if [[ "$GTA" == "false" ]]; then
  echo "  ✓ 這是分發型描述文件（get-task-allow=false），可用於 App Store 上傳"
else
  echo "  ⚠ 這是開發型描述文件，不能用於 App Store 上傳"
fi
echo
echo "接著把 Release 設定改成手動簽名，PROVISIONING_PROFILE_SPECIFIER 填："
echo "    ${NAME}"
