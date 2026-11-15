#!/usr/bin/env python3
"""生成 App 图标（占位版）。

用法：
    python3 scripts/generate-icon.py

产出：
    ios/TODOLIST/Images.xcassets/AppIcon.appiconset/AppIcon.png  (1024x1024, RGB 无 alpha)

App Store 对图标的硬性要求：
  * 1024 x 1024 像素
  * PNG 格式
  * 不含 Alpha 通道（带透明通道会被上传校验直接拒绝）
  * 不带圆角（系统会自动裁切成圆形/圆角方形，预置圆角会出现双重圆角）

这是一个可直接跑起来的占位图标，正式上架前建议替换成设计稿。
"""

import os

from PIL import Image, ImageDraw

SIZE = 1024
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT = os.path.join(
    ROOT, "ios", "TODOLIST", "Images.xcassets", "AppIcon.appiconset", "AppIcon.png"
)

TOP_COLOR = (37, 99, 235)      # #2563EB
BOTTOM_COLOR = (29, 78, 216)   # #1D4ED8
CHECK_COLOR = (255, 255, 255)


def lerp(a: int, b: int, t: float) -> int:
    return round(a + (b - a) * t)


def build() -> Image.Image:
    # 垂直渐变底
    image = Image.new("RGB", (SIZE, SIZE), TOP_COLOR)
    draw = ImageDraw.Draw(image)
    for y in range(SIZE):
        t = y / (SIZE - 1)
        draw.line(
            [(0, y), (SIZE, y)],
            fill=(
                lerp(TOP_COLOR[0], BOTTOM_COLOR[0], t),
                lerp(TOP_COLOR[1], BOTTOM_COLOR[1], t),
                lerp(TOP_COLOR[2], BOTTOM_COLOR[2], t),
            ),
        )

    # 白色对勾：两条圆头粗线段
    stroke = 96
    draw.line([(258, 530), (430, 700)], fill=CHECK_COLOR, width=stroke)
    draw.line([(430, 700), (770, 320)], fill=CHECK_COLOR, width=stroke)
    # 圆头
    for cx, cy in ((258, 530), (430, 700), (770, 320)):
        draw.ellipse(
            [cx - stroke // 2, cy - stroke // 2, cx + stroke // 2, cy + stroke // 2],
            fill=CHECK_COLOR,
        )

    return image


def main() -> None:
    image = build()
    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
    # RGB 模式保存 —— 不含 alpha 通道
    image.save(OUTPUT, format="PNG", optimize=True)
    print(f"wrote {OUTPUT} ({image.size[0]}x{image.size[1]}, mode={image.mode})")


if __name__ == "__main__":
    main()
