#!/usr/bin/env python3
"""把页面和它引用的本地脚本打包成独立的单文件，输出到 dist/。

    index.html  -> dist/qimen.html   （奇门遁甲）
    liuren.html -> dist/liuren.html  （大六壬）
    taiyi.html  -> dist/taiyi.html   （太乙神数）
"""
import re
from pathlib import Path

root = Path(__file__).parent
PAGES = {"index.html": "qimen.html", "liuren.html": "liuren.html", "taiyi.html": "taiyi.html"}


def inline(match):
    src = match.group(1)
    js = (root / src).read_text(encoding="utf-8")
    return "<script>\n" + js.replace("</script", "<\\/script") + "\n</script>"


(root / "dist").mkdir(exist_ok=True)
for page, out in PAGES.items():
    html = (root / page).read_text(encoding="utf-8")
    bundled, n = re.subn(r'<script src="([\w.-]+\.js)"></script>', inline, html)
    assert n >= 1, f"{page} 里没有找到本地脚本"
    (root / "dist" / out).write_text(bundled, encoding="utf-8")
    print(f"dist/{out}", len(bundled.encode("utf-8")), "bytes,", n, "scripts inlined")
