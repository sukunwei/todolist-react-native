#!/usr/bin/env bash
#
# 批量截取 App Store 上架用的 5 张截图。
#
# 用 iPhone 18 Pro Max（440x956 pt @3x = 1320x2868 px），
# 正好是 App Store 当前要求的 iPhone 6.9" 尺寸，直接可用无需裁剪。
#
# 依赖：idb（用于点击）
#   brew tap facebook/fb && brew trust facebook/fb && brew install idb-companion
#   /usr/bin/python3 -m venv ~/.local/share/idb-venv
#   ~/.local/share/idb-venv/bin/pip install fb-idb
#
# 用法：
#   ./scripts/capture-screenshots.sh            # 输出到 screenshots/
#   ./scripts/capture-screenshots.sh --udid <UDID>
#
set -euo pipefail

cd "$(dirname "$0")/.."

BUNDLE_ID="com.kunweisu.qingdanben"
PORT="${PORT:-8082}"
OUT_DIR="screenshots"
IDB="${IDB:-$HOME/.local/share/idb-venv/bin/idb}"

UDID_ARG=""
for ((i = 1; i <= $#; i++)); do
  if [[ "${!i}" == "--udid" ]]; then
    j=$((i + 1))
    UDID_ARG="${!j}"
  fi
done

# ---------------------------------------------------------------- 设备
if [[ -n "$UDID_ARG" ]]; then
  UDID="$UDID_ARG"
else
  UDID="$(xcrun simctl list devices available | grep 'iPhone 18 Pro Max (' | head -1 | grep -oE '[0-9A-Fa-f-]{20,}' | head -1)"
fi
echo "设备：iPhone 18 Pro Max  $UDID"

xcrun simctl boot "$UDID" 2>/dev/null || true
sleep 4

APP="$(ls -d "$HOME"/Library/Developer/Xcode/DerivedData/TODOLIST-*/Build/Products/Debug-iphonesimulator/TODOLIST.app 2>/dev/null | head -1 || true)"
if [[ -z "$APP" ]]; then
  echo "尚未编译，先执行 npm run ios" >&2
  exit 1
fi
xcrun simctl install "$UDID" "$APP"
xcrun simctl spawn "$UDID" defaults write "$BUNDLE_ID" RCT_jsLocation -string "localhost:${PORT}" || true

# 预热 idb companion：首次对某个 udid 调用 idb 时要拉起 companion，
# 那一次点击常被静默吞掉，先点一个无害位置把 companion 拉起来。
"$IDB" ui tap --udid "$UDID" 5 5 >/dev/null 2>&1 || true
sleep 2

mkdir -p "$OUT_DIR"

# ---------------------------------------------------------------- 工具函数
shot() {
  local name="$1"
  xcrun simctl io "$UDID" screenshot "${OUT_DIR}/${name}.png" >/dev/null 2>&1
  local size
  size="$(python3 -c "
from PIL import Image
im = Image.open('${OUT_DIR}/${name}.png')
print(f'{im.size[0]}x{im.size[1]}')
")"
  echo "  ✓ ${name}.png  (${size})"
}

# FAB 是否还在画面上（列表可见时右下角有一块蓝色）。
# 弹窗是全屏模态，会把 FAB 盖住，所以这个判据可以用来确认弹窗是否真的打开。
fab_visible() {
  local png="$1"
  python3 - "$png" <<'PY'
import sys
from PIL import Image
import numpy as np
a = np.array(Image.open(sys.argv[1]).convert("RGB"))
region = a[2526:2694, 1092:1260]
r, g, b = region[:, :, 0].astype(int), region[:, :, 1].astype(int), region[:, :, 2].astype(int)
blue = (abs(r - 37) < 20) & (abs(g - 99) < 20) & (abs(b - 235) < 20)
print("yes" if blue.sum() > 2000 else "no")
PY
}

tap() {
  # 坐标单位是「点」（point），不是像素。屏幕 440x956 pt。
  "$IDB" ui tap --udid "$UDID" "$1" "$2" >/dev/null 2>&1
  sleep 1.5
}

# 点 FAB 并确认弹窗真的打开了。
# idb 对某个 udid 的首次调用要拉起 companion，那一次常被静默吞掉，
# 所以这里做校验 + 重试。
tap_fab_and_verify() {
  local tmp="/tmp/todolist-fab-check.png"
  for attempt in 1 2 3; do
    tap $FAB_X $FAB_Y
    sleep 2
    xcrun simctl io "$UDID" screenshot "$tmp" >/dev/null 2>&1
    if [[ "$(fab_visible "$tmp")" == "no" ]]; then
      return 0
    fi
    echo "  (第 ${attempt} 次点击未生效，重试)"
  done
  echo "  ⚠️ 弹窗始终没打开，截图 2 可能不对" >&2
  return 1
}

restart_app() {
  xcrun simctl terminate "$UDID" "$BUNDLE_ID" 2>/dev/null || true
  sleep 1
  xcrun simctl launch "$UDID" "$BUNDLE_ID" >/dev/null
  sleep 14
}

# 坐标（pt）：由 1320x2868 的截图换算，1 px = 1/3 pt。
# FAB 圆心用颜色检测实测得出（px 1175,2609 → pt 391,869），不要目测。
FAB_X=391;   FAB_Y=869     # 右下角 ＋
TAB_DONE_X=342; TAB_DONE_Y=156 # 「已完成」
# 切回「全部」用重启 App 实现：filter 不持久化，重启后自然回到「全部」，
# 比再点一次坐标更稳。

echo "准备示例数据……"
python3 scripts/seed-tasks.py "$UDID" --count 6 >/dev/null
xcrun simctl ui "$UDID" appearance light
restart_app

echo "截图 1/5：主列表"
shot "01-主列表"

echo "截图 2/5：新建任务"
tap_fab_and_verify
shot "02-新建任务"

echo "截图 3/5：已完成筛选"
restart_app          # 复位到「全部」
tap $TAB_DONE_X $TAB_DONE_Y
sleep 2
shot "03-已完成筛选"

echo "截图 4/5：深色模式"
restart_app          # 复位到「全部」
xcrun simctl ui "$UDID" appearance dark
sleep 3
shot "04-深色模式"
xcrun simctl ui "$UDID" appearance light
sleep 2

echo "截图 5/5：空状态"
python3 scripts/seed-tasks.py "$UDID" --count 0 >/dev/null
restart_app
shot "05-空状态"

echo
echo "完成。共 5 张，输出在 ${OUT_DIR}/"
