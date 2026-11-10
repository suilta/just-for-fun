#!/usr/bin/env python3
"""把 index.html 和 qimen.js 打包成一个独立的 dist/qimen.html。"""
from pathlib import Path

root = Path(__file__).parent
html = (root / "index.html").read_text(encoding="utf-8")
js = (root / "qimen.js").read_text(encoding="utf-8")
tag = '<script src="qimen.js"></script>'
assert html.count(tag) == 1, "index.html 里找不到 qimen.js 的引用"
out = html.replace(tag, "<script>\n" + js.replace("</script", "<\\/script") + "\n</script>")
(root / "dist").mkdir(exist_ok=True)
(root / "dist" / "qimen.html").write_text(out, encoding="utf-8")
print("dist/qimen.html", len(out.encode("utf-8")), "bytes")
