#!/usr/bin/env python3
"""
Generate favicon files from SVG source
需要安装: pip install pillow cairosvg
"""

import os
from cairosvg import svg2png
from PIL import Image
import io

def generate_favicon():
    # 读取SVG文件
    svg_path = "public/favicon.svg"
    if not os.path.exists(svg_path):
        print(f"SVG file not found: {svg_path}")
        return

    with open(svg_path, 'r') as f:
        svg_data = f.read()

    # 生成不同尺寸的PNG
    sizes = [16, 32, 48, 64, 128, 256]

    for size in sizes:
        # 使用cairosvg将SVG转换为PNG
        png_data = svg2png(bytestring=svg_data.encode('utf-8'),
                          output_width=size,
                          output_height=size)

        # 保存PNG文件
        png_path = f"public/favicon-{size}x{size}.png"
        with open(png_path, 'wb') as f:
            f.write(png_data)
        print(f"Generated: {png_path}")

    # 生成ICO文件（包含多个尺寸）
    try:
        # 创建ICO文件需要的尺寸
        ico_sizes = [16, 32, 48]
        images = []

        for size in ico_sizes:
            png_data = svg2png(bytestring=svg_data.encode('utf-8'),
                              output_width=size,
                              output_height=size)
            img = Image.open(io.BytesIO(png_data))
            images.append(img)

        # 保存ICO文件
        ico_path = "public/favicon.ico"
        images[0].save(ico_path, format='ICO', sizes=[(img.width, img.height) for img in images])
        print(f"Generated: {ico_path}")

    except Exception as e:
        print(f"Failed to generate ICO: {e}")

    print("Favicon generation completed!")

if __name__ == "__main__":
    generate_favicon()