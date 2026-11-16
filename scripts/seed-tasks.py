#!/usr/bin/env python3
"""往模擬器裡灌入一批示例任務。

用途：
  * 快速驗證列表渲染（優先級色條、勾選態、排序按鈕、篩選計數、統計摘要）
  * 生成 App Store 截圖用的真實感內容

用法：
    python3 scripts/seed-tasks.py                 # 自動找已啟動的模擬器
    python3 scripts/seed-tasks.py <SIMULATOR_UDID>
    python3 scripts/seed-tasks.py --no-relaunch   # 只寫資料，不重啟 App

原理：
    AsyncStorage 在 iOS 上把鍵值對存在
      <資料容器>/Library/Application Support/<BundleID>/RCTAsyncLocalStorage_V1/manifest.json
    其中小值直接內聯。zustand persist 的落盤格式是
      {"state": {...被持久化的部分...}, "version": N}
    本項目的持久化部分只有 {"tasks": [...]}。

注意：寫完必須重啟 App，記憶體裡的 AsyncStorage 快取才會重新讀盤。
"""

import json
import os
import re
import subprocess
import sys
import time

BUNDLE_ID = "com.kunweisu.qingdanben"
STORAGE_DIR = "RCTAsyncLocalStorage_V1"
STORAGE_KEY = "@todolist/tasks/v1"

NOW = int(time.time() * 1000)
MINUTE = 60 * 1000
HOUR = 60 * MINUTE
DAY = 24 * HOUR


def make_task(task_id, title, priority, status, order, created_offset, notes=None):
    created_at = NOW - created_offset
    task = {
        "id": task_id,
        "title": title,
        "priority": priority,
        "status": status,
        "order": order,
        "createdAt": created_at,
        "updatedAt": created_at,
    }
    if notes:
        task["notes"] = notes
    if status == "done":
        task["completedAt"] = created_at + HOUR
    return task


def build_tasks(count=6):
    """示例任務。order 小的排在上面。"""
    presets = [
        make_task("seed-1", "買牛奶和雞蛋", "high", "active", 0, 12 * MINUTE),
        make_task(
            "seed-2",
            "寫完這周的項目週報",
            "medium",
            "active",
            1,
            2 * HOUR,
            notes="重點寫清楚灰度發佈的結論",
        ),
        make_task("seed-3", "預約下週的體檢", "low", "active", 2, 5 * HOUR),
        make_task("seed-4", "讀完《設計中的設計》第三章", "medium", "active", 3, 1 * DAY),
        make_task("seed-5", "給媽媽打個電話", "high", "done", 4, 2 * DAY),
        make_task("seed-6", "交房租", "medium", "done", 5, 3 * DAY),
    ]

    if count <= len(presets):
        return presets[:count]

    # 超出預置數量時批量補齊，用於壓測長列表性能
    tasks = list(presets)
    fillers = ["整理桌面", "回覆郵件", "取快遞", "跑步 3 公里", "讀 30 頁書"]
    for i in range(count - len(presets)):
        status = "done" if i % 4 == 3 else "active"
        tasks.append(
            make_task(
                f"bulk-{i}",
                f"{fillers[i % len(fillers)]} #{i + 1}",
                ["high", "medium", "low"][i % 3],
                status,
                len(tasks),
                (i + 1) * 7 * MINUTE,
            )
        )
    return tasks


def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True, check=True).stdout.strip()


def find_udid(explicit=None):
    if explicit:
        return explicit
    out = run(["xcrun", "simctl", "list", "devices", "booted"])
    for line in out.splitlines():
        if "(Booted)" not in line:
            continue
        # 行格式形如：  iPhone 18 Pro (5AD63204-1068-4D07-B530-59C6BD0353C7) (Booted)
        # 裝置名裡可能帶空格和括號，所以要匹配第一組形如 UUID 的括號
        match = re.search(r"\(([0-9A-Fa-f-]{20,})\)", line)
        if match:
            return match.group(1)
    raise SystemExit("找不到已啟動的模擬器。請先啟動一個，或顯式傳入 UDID。")


def main():
    raw = sys.argv[1:]
    relaunch = "--no-relaunch" not in raw

    # --count N：生成 N 條任務（預設 6）。用於壓測長列表性能。
    count = 6
    positional = []
    i = 0
    while i < len(raw):
        token = raw[i]
        if token == "--count":
            count = int(raw[i + 1])
            i += 2
            continue
        if token.startswith("--"):
            i += 1
            continue
        positional.append(token)
        i += 1

    udid = find_udid(positional[0] if positional else None)
    container = run(
        ["xcrun", "simctl", "get_app_container", udid, BUNDLE_ID, "data"]
    )
    storage_path = os.path.join(
        container, "Library", "Application Support", BUNDLE_ID, STORAGE_DIR
    )
    manifest_path = os.path.join(storage_path, "manifest.json")

    if not os.path.isdir(storage_path):
        raise SystemExit(
            f"找不到 AsyncStorage 目錄：{storage_path}\n"
            "App 可能還沒啟動過。先跑一次 App 再執行本腳本。"
        )

    payload = json.dumps(
        {"state": {"tasks": build_tasks(count)}, "version": 1},
        ensure_ascii=False,
        separators=(",", ":"),
    )
    manifest = {STORAGE_KEY: payload}

    # 先停 App，避免它退出時用記憶體裡的舊值覆蓋我們寫入的內容
    subprocess.run(
        ["xcrun", "simctl", "terminate", udid, BUNDLE_ID],
        capture_output=True,
        text=True,
    )

    with open(manifest_path, "w", encoding="utf-8") as handle:
        json.dump(manifest, handle, ensure_ascii=False)

    print(f"已寫入 {len(build_tasks(count))} 條示例任務 → {manifest_path}")

    if relaunch:
        run(["xcrun", "simctl", "launch", udid, BUNDLE_ID])
        print(f"已重啟 App（模擬器 {udid}）")


if __name__ == "__main__":
    main()
