#!/usr/bin/env python3
"""生成 TODOLIST 的 App 圖示。

設計說明（不是隨手畫的，理由見開發計劃）：
  · 刻意避開「藍底白對勾」——那是待辦類 App 最氾濫的預設解法，一眼就會被淹沒。
  · 底色直接取 App 深色主題的背景色 #0F1115，主色取深色模式下的 primary
    #60A5FA，與 App 介面裡的優先級色條（紅 / 琥珀 / 綠）同一套視覺語言。
  · 圖形語義是「清單的第一項已經被勾掉」：一個厚實圓頭的對勾作為第一項的勾，
    與首行的內容橫線並排，後面兩行是未完成項。構圖有前後層次，
    縮到 40px 仍能讀出「勾 + 清單」。

用法：
    python3 scripts/generate-icon.py                # 輸出 1024x1024
    python3 scripts/generate-icon.py --preview      # 額外輸出各尺寸預覽

App Store 對圖示的硬性要求：
  * 1024 x 1024 像素
  * PNG 格式
  * 不含 Alpha 通道（帶透明通道會被上傳校驗直接拒絕）
  * 不帶圓角（系統會自動裁切成圓形 / 圓角方形，預置圓角會出現雙重圓角）
"""

import argparse
import os

from PIL import Image, ImageDraw

SIZE = 1024

# 取自 src/theme/colors.ts 的深色主題
INK = (15, 17, 21)          # #0F1115  深色模式背景
BLUE = (96, 165, 250)       # #60A5FA  深色模式 primary
CREAM = (237, 234, 226)     # #EDEAE2  清單橫線

# ---------------------------------------------------------------- 構圖參數
# 內容以 1000x1000 為基準設計，最後統一居中縮放到畫布。

SCALE = 1.22          # 整體放大倍率
CHECK_STROKE = 76     # 對勾筆畫粗細
LINE_HEIGHT = 52      # 橫線高度
ROW_GAP = 128         # 行距（行距決定構圖接近正方形）

# 對勾三點：短撇起筆 → 拐角 → 長捺收筆
CHECK_POINTS = [(272, 330), (320, 378), (400, 295)]

# 清單橫線：(左, 右, 上邊 y)。首行讓出對勾位置，後兩行與對勾左緣對齊。
# 行位置由 ROW_GAP 遞推，保證三行節奏完全一致。
_BASE_Y = 308
LINES = [
    (490, 800, _BASE_Y),
    (234, 800, _BASE_Y + ROW_GAP),
    (234, 630, _BASE_Y + ROW_GAP * 2),
]


def scaled(value: float) -> float:
    return value * SCALE


def content_bbox(points, lines, stroke, line_h):
    """給定幾何，計算包圍盒。"""
    xs = [p[0] for p in points] + [l[0] for l in lines] + [l[1] for l in lines]
    ys = (
        [p[1] for p in points]
        + [l[2] for l in lines]
        + [l[2] + line_h for l in lines]
    )
    half = stroke / 2
    return (
        min(xs) - half,
        min(ys) - half,
        max(xs) + half,
        max(ys) + half,
    )


def build() -> Image.Image:
    image = Image.new("RGB", (SIZE, SIZE), INK)
    draw = ImageDraw.Draw(image)

    # 先按 SCALE 放大，再把包圍盒居中到畫布
    points = [(x * SCALE, y * SCALE) for x, y in CHECK_POINTS]
    lines = [(x1 * SCALE, x2 * SCALE, y * SCALE) for x1, x2, y in LINES]
    stroke = scaled(CHECK_STROKE)
    line_h = scaled(LINE_HEIGHT)

    left, top, right, bottom = content_bbox(points, lines, stroke, line_h)
    dx = (SIZE - (right - left)) / 2 - left
    dy = (SIZE - (bottom - top)) / 2 - top

    points = [(x + dx, y + dy) for x, y in points]
    lines = [(x1 + dx, x2 + dx, y + dy) for x1, x2, y in lines]

    # 清單橫線
    for x1, x2, y in lines:
        draw.rounded_rectangle(
            [x1, y, x2, y + line_h], radius=line_h / 2, fill=CREAM
        )

    # 對勾：粗線段 + 圓頭
    draw.line(points, fill=BLUE, width=int(stroke), joint="curve")
    for x, y in points:
        draw.ellipse(
            [x - stroke / 2, y - stroke / 2, x + stroke / 2, y + stroke / 2],
            fill=BLUE,
        )

    return image


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--preview", action="store_true", help="額外輸出小尺寸預覽")
    args = parser.parse_args()

    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    out_dir = os.path.join(
        root, "ios", "TODOLIST", "Images.xcassets", "AppIcon.appiconset"
    )
    output = os.path.join(out_dir, "AppIcon.png")

    image = build()
    os.makedirs(out_dir, exist_ok=True)
    # RGB 模式保存 —— 不含 alpha 通道
    image.save(output, format="PNG", optimize=True)
    print(f"已生成 {output}  ({image.size[0]}x{image.size[1]}, mode={image.mode})")

    if args.preview:
        preview_dir = os.path.join(root, "preview")
        os.makedirs(preview_dir, exist_ok=True)
        for size in (180, 120, 76, 60, 40):
            scaled_img = image.resize((size, size), Image.LANCZOS)
            path = os.path.join(preview_dir, f"icon-{size}.png")
            scaled_img.save(path)
            print(f"  預覽 {size}x{size} → {path}")


if __name__ == "__main__":
    main()
