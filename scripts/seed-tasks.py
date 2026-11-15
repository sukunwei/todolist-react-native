#!/usr/bin/env python3
"""往模拟器里灌入一批示例任务。

用途：
  * 快速验证列表渲染（优先级色条、勾选态、排序按钮、筛选计数、统计摘要）
  * 生成 App Store 截图用的真实感内容

用法：
    python3 scripts/seed-tasks.py                 # 自动找已启动的模拟器
    python3 scripts/seed-tasks.py <SIMULATOR_UDID>
    python3 scripts/seed-tasks.py --no-relaunch   # 只写数据，不重启 App

原理：
    AsyncStorage 在 iOS 上把键值对存在
      <数据容器>/Library/Application Support/<BundleID>/RCTAsyncLocalStorage_V1/manifest.json
    其中小值直接内联。zustand persist 的落盘格式是
      {"state": {...被持久化的部分...}, "version": N}
    本项目的持久化部分只有 {"tasks": [...]}。

注意：写完必须重启 App，内存里的 AsyncStorage 缓存才会重新读盘。
"""

import json
import os
import re
import subprocess
import sys
import time

BUNDLE_ID = "com.example.todolist"
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


def build_tasks():
    """示例任务。order 小的排在上面。"""
    return [
        make_task("seed-1", "买牛奶和鸡蛋", "high", "active", 0, 12 * MINUTE),
        make_task(
            "seed-2",
            "写完这周的项目周报",
            "medium",
            "active",
            1,
            2 * HOUR,
            notes="重点写清楚灰度发布的结论",
        ),
        make_task("seed-3", "预约下周的体检", "low", "active", 2, 5 * HOUR),
        make_task("seed-4", "读完《设计中的设计》第三章", "medium", "active", 3, 1 * DAY),
        make_task("seed-5", "给妈妈打个电话", "high", "done", 4, 2 * DAY),
        make_task("seed-6", "交房租", "medium", "done", 5, 3 * DAY),
    ]


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
        # 设备名里可能带空格和括号，所以要匹配第一组形如 UUID 的括号
        match = re.search(r"\(([0-9A-Fa-f-]{20,})\)", line)
        if match:
            return match.group(1)
    raise SystemExit("找不到已启动的模拟器。请先启动一个，或显式传入 UDID。")


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    relaunch = "--no-relaunch" not in sys.argv

    udid = find_udid(args[0] if args else None)
    container = run(
        ["xcrun", "simctl", "get_app_container", udid, BUNDLE_ID, "data"]
    )
    storage_path = os.path.join(
        container, "Library", "Application Support", BUNDLE_ID, STORAGE_DIR
    )
    manifest_path = os.path.join(storage_path, "manifest.json")

    if not os.path.isdir(storage_path):
        raise SystemExit(
            f"找不到 AsyncStorage 目录：{storage_path}\n"
            "App 可能还没启动过。先跑一次 App 再执行本脚本。"
        )

    payload = json.dumps(
        {"state": {"tasks": build_tasks()}, "version": 1},
        ensure_ascii=False,
        separators=(",", ":"),
    )
    manifest = {STORAGE_KEY: payload}

    # 先停 App，避免它退出时用内存里的旧值覆盖我们写入的内容
    subprocess.run(
        ["xcrun", "simctl", "terminate", udid, BUNDLE_ID],
        capture_output=True,
        text=True,
    )

    with open(manifest_path, "w", encoding="utf-8") as handle:
        json.dump(manifest, handle, ensure_ascii=False)

    print(f"已写入 {len(build_tasks())} 条示例任务 → {manifest_path}")

    if relaunch:
        run(["xcrun", "simctl", "launch", udid, BUNDLE_ID])
        print(f"已重启 App（模拟器 {udid}）")


if __name__ == "__main__":
    main()
