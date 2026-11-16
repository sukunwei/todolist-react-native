#!/usr/bin/env python3
"""生成 TODOLIST 的 App 图标。

设计说明（不是随手画的，理由见开发计划）：
  · 刻意避开「蓝底白对勾」——那是待办类 App 最泛滥的默认解法，一眼就会被淹没。
  · 底色直接取 App 深色主题的背景色 #0F1115，主色取深色模式下的 primary
    #60A5FA，与 App 界面里的优先级色条（红 / 琥珀 / 绿）同一套视觉语言。
  · 图形语义是「清单的第一项已经被勾掉」：一个厚实圆头的对勾作为第一项的勾，
    与首行的内容横线并排，后面两行是未完成项。构图有前后层次，
    缩到 40px 仍能读出「勾 + 清单」。

用法：
    python3 scripts/generate-icon.py                # 输出 1024x1024
    python3 scripts/generate-icon.py --preview      # 额外输出各尺寸预览

App Store 对图标的硬性要求：
  * 1024 x 1024 像素
  * PNG 格式
  * 不含 Alpha 通道（带透明通道会被上传校验直接拒绝）
  * 不带圆角（系统会自动裁切成圆形 / 圆角方形，预置圆角会出现双重圆角）
"""

import argparse
import os

from PIL import Image, ImageDraw

SIZE = 1024

# 取自 src/theme/colors.ts 的深色主题
INK = (15, 17, 21)          # #0F1115  深色模式背景
BLUE = (96, 165, 250)       # #60A5FA  深色模式 primary
CREAM = (237, 234, 226)     # #EDEAE2  清单横线

# ---------------------------------------------------------------- 构图参数
# 内容以 1000x1000 为基准设计，最后统一居中缩放到画布。

SCALE = 1.22          # 整体放大倍率
CHECK_STROKE = 76     # 对勾笔画粗细
LINE_HEIGHT = 52      # 横线高度
ROW_GAP = 128         # 行距（行距决定构图接近正方形）

# 对勾三点：短撇起笔 → 拐角 → 长捺收笔
CHECK_POINTS = [(272, 330), (320, 378), (400, 295)]

# 清单横线：(左, 右, 上边 y)。首行让出对勾位置，后两行与对勾左缘对齐。
# 行位置由 ROW_GAP 递推，保证三行节奏完全一致。
_BASE_Y = 308
LINES = [
    (490, 800, _BASE_Y),
    (234, 800, _BASE_Y + ROW_GAP),
    (234, 630, _BASE_Y + ROW_GAP * 2),
]


def scaled(value: float) -> float:
    return value * SCALE


def content_bbox(points, lines, stroke, line_h):
    """给定几何，计算包围盒。"""
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

    # 先按 SCALE 放大，再把包围盒居中到画布
    points = [(x * SCALE, y * SCALE) for x, y in CHECK_POINTS]
    lines = [(x1 * SCALE, x2 * SCALE, y * SCALE) for x1, x2, y in LINES]
    stroke = scaled(CHECK_STROKE)
    line_h = scaled(LINE_HEIGHT)

    left, top, right, bottom = content_bbox(points, lines, stroke, line_h)
    dx = (SIZE - (right - left)) / 2 - left
    dy = (SIZE - (bottom - top)) / 2 - top

    points = [(x + dx, y + dy) for x, y in points]
    lines = [(x1 + dx, x2 + dx, y + dy) for x1, x2, y in lines]

    # 清单横线
    for x1, x2, y in lines:
        draw.rounded_rectangle(
            [x1, y, x2, y + line_h], radius=line_h / 2, fill=CREAM
        )

    # 对勾：粗线段 + 圆头
    draw.line(points, fill=BLUE, width=int(stroke), joint="curve")
    for x, y in points:
        draw.ellipse(
            [x - stroke / 2, y - stroke / 2, x + stroke / 2, y + stroke / 2],
            fill=BLUE,
        )

    return image


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--preview", action="store_true", help="额外输出小尺寸预览")
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
            print(f"  预览 {size}x{size} → {path}")


if __name__ == "__main__":
    main()
