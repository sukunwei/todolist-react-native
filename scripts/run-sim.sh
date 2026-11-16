#!/usr/bin/env bash
#
# 一鍵啟動 iOS 模擬器並跑起 TODOLIST
#
#   ./scripts/run-sim.sh            # 啟動 App 並截圖
#   ./scripts/run-sim.sh --shot out.png
#   ./scripts/run-sim.sh --no-shot
#   ./scripts/run-sim.sh --dark     # 順便切到深色模式
#
# 說明：這臺機器沒有安裝 Simulator.app（Xcode 是精簡版），模擬器只能
# headless 運行，所以沒有可交互的窗口，只能用截圖看介面。
#
set -euo pipefail

cd "$(dirname "$0")/.."

BUNDLE_ID="com.kunweisu.todolist"
PORT="${PORT:-8082}"
SHOT="/tmp/todolist-sim.png"
DARK=0
DO_SHOT=1

while [[ $# -gt 0 ]]; do
  case "$1" in
    --shot) SHOT="$2"; shift 2 ;;
    --no-shot) DO_SHOT=0; shift ;;
    --dark) DARK=1; shift ;;
    *) echo "未知參數：$1" >&2; exit 1 ;;
  esac
done

# ---------- 1. 找模擬器 ----------
UDID="$(xcrun simctl list devices booted | grep -oE '\(([0-9A-Fa-f-]{20,})\)' | head -1 | tr -d '()')"

if [[ -z "$UDID" ]]; then
  echo "沒有已啟動的模擬器，正在啟動 iPhone 18 Pro……"
  UDID="$(xcrun simctl list devices available | grep 'iPhone 18 Pro (' | head -1 | grep -oE '[0-9A-Fa-f-]{20,}' | head -1)"
  if [[ -z "$UDID" ]]; then
    echo "找不到 iPhone 18 Pro 模擬器" >&2
    exit 1
  fi
  xcrun simctl boot "$UDID" || true
  sleep 8
fi
echo "模擬器：$UDID"

# ---------- 2. 確保 Metro 在跑 ----------
if ! curl -s --max-time 3 "http://localhost:${PORT}/status" | grep -q running; then
  echo "Metro 未啟動，正在後臺啟動（端口 ${PORT}）……"
  npm start -- --port "$PORT" >/tmp/todolist-metro.log 2>&1 &
  for _ in {1..30}; do
    sleep 1
    if curl -s --max-time 2 "http://localhost:${PORT}/status" | grep -q running; then
      break
    fi
  done
fi
curl -s --max-time 3 "http://localhost:${PORT}/status" | grep -q running \
  && echo "Metro：端口 ${PORT} 正常" \
  || { echo "Metro 啟動失敗，見 /tmp/todolist-metro.log" >&2; exit 1; }

# ---------- 3. 裝 App ----------
# RCT_METRO_PORT 是編譯期宏，App 運行時改不了；
# 真正能改的是 RCT_jsLocation（RN 讀 Metro 地址的 NSUserDefaults 鍵）。
xcrun simctl spawn "$UDID" defaults write "$BUNDLE_ID" RCT_jsLocation -string "localhost:${PORT}" 2>/dev/null || true

APP="$(ls -dt "$HOME"/Library/Developer/Xcode/DerivedData/TODOLIST-*/Build/Products/Debug-iphonesimulator/TODOLIST.app 2>/dev/null | head -1 || true)"
if [[ -z "$APP" ]]; then
  echo "尚未編譯，正在執行 npm run ios（首次較慢）……"
  npm run ios -- --port "$PORT"
  APP="$(ls -d "$HOME"/Library/Developer/Xcode/DerivedData/TODOLIST-*/Build/Products/Debug-iphonesimulator/TODOLIST.app | head -1)"
fi

# 只在沒裝過時才安裝：simctl install 會重建 App 的資料容器，
# 把本機存的待辦資料一併清掉。原生程式碼有改動時用 --reinstall 強制裝一次。
REINSTALL=0
[[ " $* " == *" --reinstall "* ]] && REINSTALL=1

INSTALLED=0
if xcrun simctl listapps "$UDID" 2>/dev/null | grep -q "$BUNDLE_ID"; then
  INSTALLED=1
fi

if [[ "$INSTALLED" == "0" || "$REINSTALL" == "1" ]]; then
  [[ "$REINSTALL" == "1" ]] && echo "強制重裝（會清空本機資料）……"
  xcrun simctl install "$UDID" "$APP"
else
  echo "App 已安裝，跳過安裝（保留本機資料）"
fi

# ---------- 4. 啟動 ----------
if [[ "$DARK" == "1" ]]; then
  xcrun simctl ui "$UDID" appearance dark
else
  xcrun simctl ui "$UDID" appearance light
fi

xcrun simctl terminate "$UDID" "$BUNDLE_ID" 2>/dev/null || true
sleep 1
xcrun simctl launch "$UDID" "$BUNDLE_ID"

# ---------- 4.5 打開原生模擬器窗口 ----------
# 這臺機器的 Xcode 是精簡安裝，沒有 Simulator.app；Xcode 16+ 已把模擬器裝置
# 窗口搬到了 DeviceHub.app（bundle id com.apple.dt.Devices），用它來開原生窗口。
DEVICE_HUB="/Applications/Xcode.app/Contents/Applications/DeviceHub.app"
if [[ -d "$DEVICE_HUB" ]]; then
  open -a "$DEVICE_HUB"
  open "devices://$UDID" 2>/dev/null || true
  echo "原生模擬器窗口已打開（Device Hub → iPhone 18 Pro）"
else
  echo "未找到 DeviceHub.app，跳過窗口打開"
fi

# ---------- 5. 截圖 ----------
if [[ "$DO_SHOT" == "1" ]]; then
  echo "等待 JS bundle 載入……"
  sleep 20
  xcrun simctl io "$UDID" screenshot "$SHOT" >/dev/null 2>&1
  echo "截圖：$SHOT"
fi
