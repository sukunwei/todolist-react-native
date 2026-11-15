#!/usr/bin/env bash
#
# 一键启动 iOS 模拟器并跑起 TODOLIST
#
#   ./scripts/run-sim.sh            # 启动 App 并截图
#   ./scripts/run-sim.sh --shot out.png
#   ./scripts/run-sim.sh --no-shot
#   ./scripts/run-sim.sh --dark     # 顺便切到深色模式
#
# 说明：这台机器没有安装 Simulator.app（Xcode 是精简版），模拟器只能
# headless 运行，所以没有可交互的窗口，只能用截图看界面。
#
set -euo pipefail

cd "$(dirname "$0")/.."

BUNDLE_ID="com.example.todolist"
PORT="${PORT:-8082}"
SHOT="/tmp/todolist-sim.png"
DARK=0
DO_SHOT=1

while [[ $# -gt 0 ]]; do
  case "$1" in
    --shot) SHOT="$2"; shift 2 ;;
    --no-shot) DO_SHOT=0; shift ;;
    --dark) DARK=1; shift ;;
    *) echo "未知参数：$1" >&2; exit 1 ;;
  esac
done

# ---------- 1. 找模拟器 ----------
UDID="$(xcrun simctl list devices booted | grep -oE '\(([0-9A-Fa-f-]{20,})\)' | head -1 | tr -d '()')"

if [[ -z "$UDID" ]]; then
  echo "没有已启动的模拟器，正在启动 iPhone 18 Pro……"
  UDID="$(xcrun simctl list devices available | grep 'iPhone 18 Pro (' | head -1 | grep -oE '[0-9A-Fa-f-]{20,}' | head -1)"
  if [[ -z "$UDID" ]]; then
    echo "找不到 iPhone 18 Pro 模拟器" >&2
    exit 1
  fi
  xcrun simctl boot "$UDID" || true
  sleep 8
fi
echo "模拟器：$UDID"

# ---------- 2. 确保 Metro 在跑 ----------
if ! curl -s --max-time 3 "http://localhost:${PORT}/status" | grep -q running; then
  echo "Metro 未启动，正在后台启动（端口 ${PORT}）……"
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
  || { echo "Metro 启动失败，见 /tmp/todolist-metro.log" >&2; exit 1; }

# ---------- 3. 装 App ----------
# RCT_METRO_PORT 是编译期宏，App 运行时改不了；
# 真正能改的是 RCT_jsLocation（RN 读 Metro 地址的 NSUserDefaults 键）。
xcrun simctl spawn "$UDID" defaults write "$BUNDLE_ID" RCT_jsLocation -string "localhost:${PORT}" 2>/dev/null || true

APP="$(ls -d "$HOME"/Library/Developer/Xcode/DerivedData/TODOLIST-*/Build/Products/Debug-iphonesimulator/TODOLIST.app 2>/dev/null | head -1 || true)"
if [[ -z "$APP" ]]; then
  echo "尚未编译，正在执行 npm run ios（首次较慢）……"
  npm run ios -- --port "$PORT"
  APP="$(ls -d "$HOME"/Library/Developer/Xcode/DerivedData/TODOLIST-*/Build/Products/Debug-iphonesimulator/TODOLIST.app | head -1)"
fi

# 只在没装过时才安装：simctl install 会重建 App 的数据容器，
# 把本地存的待办数据一并清掉。原生代码有改动时用 --reinstall 强制装一次。
REINSTALL=0
[[ " $* " == *" --reinstall "* ]] && REINSTALL=1

INSTALLED=0
if xcrun simctl listapps "$UDID" 2>/dev/null | grep -q "$BUNDLE_ID"; then
  INSTALLED=1
fi

if [[ "$INSTALLED" == "0" || "$REINSTALL" == "1" ]]; then
  [[ "$REINSTALL" == "1" ]] && echo "强制重装（会清空本地数据）……"
  xcrun simctl install "$UDID" "$APP"
else
  echo "App 已安装，跳过安装（保留本地数据）"
fi

# ---------- 4. 启动 ----------
if [[ "$DARK" == "1" ]]; then
  xcrun simctl ui "$UDID" appearance dark
else
  xcrun simctl ui "$UDID" appearance light
fi

xcrun simctl terminate "$UDID" "$BUNDLE_ID" 2>/dev/null || true
sleep 1
xcrun simctl launch "$UDID" "$BUNDLE_ID"

# ---------- 4.5 打开原生模拟器窗口 ----------
# 这台机器的 Xcode 是精简安装，没有 Simulator.app；Xcode 16+ 已把模拟器设备
# 窗口搬到了 DeviceHub.app（bundle id com.apple.dt.Devices），用它来开原生窗口。
DEVICE_HUB="/Applications/Xcode.app/Contents/Applications/DeviceHub.app"
if [[ -d "$DEVICE_HUB" ]]; then
  open -a "$DEVICE_HUB"
  open "devices://$UDID" 2>/dev/null || true
  echo "原生模拟器窗口已打开（Device Hub → iPhone 18 Pro）"
else
  echo "未找到 DeviceHub.app，跳过窗口打开"
fi

# ---------- 5. 截图 ----------
if [[ "$DO_SHOT" == "1" ]]; then
  echo "等待 JS bundle 加载……"
  sleep 20
  xcrun simctl io "$UDID" screenshot "$SHOT" >/dev/null 2>&1
  echo "截图：$SHOT"
fi
