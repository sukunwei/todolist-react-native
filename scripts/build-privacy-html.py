#!/usr/bin/env python3
"""把 隐私政策.md 轉成可部署的靜態 HTML 頁。

為什麼要轉：App Store 要求隱私政策必須是**可公開訪問的真實網址**，
Markdown 檔案不能直接當網頁用。轉出來之後丟到 GitHub Pages /
Netlify / Vercel 任一靜態託管即可。

用法：
    python3 scripts/build-privacy-html.py
    open privacy-policy.html        # 本機預覽
"""

import html
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "隐私政策.md"
DST = ROOT / "docs" / "index.html"

CSS = """
:root {
  color-scheme: light dark;
  --bg: #fbfbf9;
  --surface: #ffffff;
  --text: #1a1a18;
  --muted: #5f5d57;
  --rule: #e4e2dc;
  --accent: #2563eb;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #14150f;
    --surface: #1c1d17;
    --text: #eceae3;
    --muted: #9d9b93;
    --rule: #2c2d26;
    --accent: #7aa5f5;
  }
}
* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: -apple-system, BlinkMacSystemFont, "PingFang TC", "Noto Sans TC",
               "Microsoft JhengHei", system-ui, sans-serif;
  font-size: 17px;
  line-height: 1.85;
  -webkit-font-smoothing: antialiased;
}
main {
  max-width: 46rem;
  margin: 0 auto;
  padding: 4rem 1.5rem 6rem;
  background: var(--surface);
  border-left: 1px solid var(--rule);
  border-right: 1px solid var(--rule);
  min-height: 100vh;
}
h1 {
  font-size: 1.85rem;
  line-height: 1.35;
  font-weight: 700;
  letter-spacing: -0.01em;
  margin: 0 0 1.5rem;
}
h2 {
  font-size: 1.15rem;
  font-weight: 650;
  margin: 3rem 0 1rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--rule);
}
h3 { font-size: 1rem; font-weight: 650; margin: 2rem 0 .75rem; }
p { margin: 0 0 1.1rem; }
strong { font-weight: 650; }
code {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: .875em;
  background: color-mix(in srgb, var(--text) 7%, transparent);
  padding: .15em .4em;
  border-radius: 4px;
}
ul, ol { margin: 0 0 1.1rem; padding-left: 1.4rem; }
li { margin: .3rem 0; }
hr { border: 0; border-top: 1px solid var(--rule); margin: 2.5rem 0; }
blockquote {
  margin: 0 0 1.5rem;
  padding: 1rem 1.25rem;
  background: color-mix(in srgb, var(--accent) 7%, transparent);
  border-left: 3px solid var(--accent);
  border-radius: 0 6px 6px 0;
  font-size: .95rem;
}
blockquote p:last-child { margin-bottom: 0; }
blockquote ul { margin-bottom: .5rem; }
table {
  width: 100%;
  border-collapse: collapse;
  margin: 0 0 1.5rem;
  font-size: .93rem;
}
th, td {
  text-align: left;
  padding: .6rem .75rem;
  border-bottom: 1px solid var(--rule);
  vertical-align: top;
}
th { font-weight: 650; }
th:first-child, td:first-child { padding-left: 0; }
th:last-child, td:last-child { padding-right: 0; }
em { color: var(--muted); }
@media (max-width: 40rem) {
  body { font-size: 16px; }
  main { padding: 2.5rem 1.25rem 4rem; border: 0; }
  table { font-size: .88rem; }
  th, td { padding: .5rem .5rem; }
}
"""


def inline(text: str) -> str:
    """行內格式：先跳過程式碼片段，再處理粗體與 code。"""
    parts = re.split(r"(`[^`]+`)", text)
    out = []
    for part in parts:
        if part.startswith("`") and part.endswith("`") and len(part) > 1:
            out.append(f"<code>{html.escape(part[1:-1])}</code>")
            continue
        part = html.escape(part)
        part = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", part)
        part = re.sub(r"(?<!\*)\*([^*]+?)\*(?!\*)", r"<em>\1</em>", part)
        out.append(part)
    return "".join(out)


def convert(md: str) -> str:
    lines = md.split("\n")
    html_parts = []
    i = 0

    def flush_paragraph(buf):
        if buf:
            html_parts.append(f"<p>{inline(' '.join(buf))}</p>")
            buf.clear()

    paragraph = []

    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        # 表格
        if stripped.startswith("|") and i + 1 < len(lines) and re.match(
            r"^\|[\s:|-]+\|$", lines[i + 1].strip()
        ):
            flush_paragraph(paragraph)
            headers = [c.strip() for c in stripped.strip("|").split("|")]
            html_parts.append("<table><thead><tr>")
            html_parts.extend(f"<th>{inline(h)}</th>" for h in headers)
            html_parts.append("</tr></thead><tbody>")
            i += 2
            while i < len(lines) and lines[i].strip().startswith("|"):
                cells = [c.strip() for c in lines[i].strip().strip("|").split("|")]
                html_parts.append("<tr>")
                html_parts.extend(f"<td>{inline(c)}</td>" for c in cells)
                html_parts.append("</tr>")
                i += 1
            html_parts.append("</tbody></table>")
            continue

        # 引用區塊
        if stripped.startswith(">"):
            flush_paragraph(paragraph)
            quote = []
            while i < len(lines) and lines[i].strip().startswith(">"):
                quote.append(lines[i].strip().lstrip(">").strip())
                i += 1
            body = "\n".join(quote).split("\n")
            inner = []
            for b in body:
                if b.startswith(("- ", "* ")):
                    inner.append(f"<li>{inline(b[2:])}</li>")
                elif b:
                    inner.append(f"<p>{inline(b)}</p>")
            # 連續的 li 包成 ul
            out = []
            in_list = False
            for item in inner:
                is_li = item.startswith("<li>")
                if is_li and not in_list:
                    out.append("<ul>")
                    in_list = True
                elif not is_li and in_list:
                    out.append("</ul>")
                    in_list = False
                out.append(item)
            if in_list:
                out.append("</ul>")
            html_parts.append("<blockquote>" + "".join(out) + "</blockquote>")
            continue

        # 分隔線
        if stripped in ("---", "***"):
            flush_paragraph(paragraph)
            html_parts.append("<hr>")
            i += 1
            continue

        # 標題
        m = re.match(r"^(#{1,6})\s+(.*)$", stripped)
        if m:
            flush_paragraph(paragraph)
            level = len(m.group(1))
            html_parts.append(f"<h{level}>{inline(m.group(2))}</h{level}>")
            i += 1
            continue

        # 無序列表
        if re.match(r"^[-*]\s+", stripped):
            flush_paragraph(paragraph)
            html_parts.append("<ul>")
            while i < len(lines) and re.match(r"^\s*[-*]\s+", lines[i]):
                html_parts.append(f"<li>{inline(re.sub(r'^\s*[-*]\s+', '', lines[i]))}</li>")
                i += 1
            html_parts.append("</ul>")
            continue

        # 有序列表
        if re.match(r"^\d+\.\s+", stripped):
            flush_paragraph(paragraph)
            html_parts.append("<ol>")
            while i < len(lines) and re.match(r"^\s*\d+\.\s+", lines[i]):
                html_parts.append(f"<li>{inline(re.sub(r'^\s*\d+\.\s+', '', lines[i]))}</li>")
                i += 1
            html_parts.append("</ol>")
            continue

        # 程式碼區塊
        if stripped.startswith("```"):
            flush_paragraph(paragraph)
            i += 1
            code = []
            while i < len(lines) and not lines[i].strip().startswith("```"):
                code.append(lines[i])
                i += 1
            i += 1
            html_parts.append("<pre><code>" + html.escape("\n".join(code)) + "</code></pre>")
            continue

        # 空行
        if not stripped:
            flush_paragraph(paragraph)
            i += 1
            continue

        # 一般段落
        paragraph.append(stripped)
        i += 1

    flush_paragraph(paragraph)
    return "\n".join(html_parts)


def strip_internal_notes(md: str) -> str:
    """剔除給開發者看的內部說明區塊。

    原始 .md 同時是「內部工作文件」與「對外發布的政策」兩用，
    文首那塊 🔴 佔位符提醒只給自己看，不能出現在給使用者讀的政策頁上。
    """
    out = []
    skipping = False
    for line in md.split("\n"):
        stripped = line.strip()
        if stripped.startswith(">"):
            block = stripped.lstrip(">").strip()
            if block.startswith("🔴"):
                skipping = True
                continue
            if skipping:
                # 區塊結束（出現非引用行）時恢復
                continue
        elif skipping:
            skipping = False
        out.append(line)
    return "\n".join(out)


def main():
    md = SRC.read_text(encoding="utf-8")
    body = convert(strip_internal_notes(md))

    page = f"""<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>TODOLIST 待辦清單 — 隱私政策</title>
<meta name="description" content="TODOLIST 的隱私政策。本 App 不收集、不上傳、不共享任何使用者資料，所有待辦僅儲存於裝置本機。">
<meta name="robots" content="index">
<style>{CSS}</style>
</head>
<body>
<main>
{body}
</main>
</body>
</html>
"""

    DST.parent.mkdir(parents=True, exist_ok=True)
    DST.write_text(page, encoding="utf-8")
    print(f"已產生 {DST.relative_to(ROOT)}  ({len(page):,} bytes)")
    print()
    print("部署方式：推上 GitHub 後在 Settings → Pages 選 main 分支 /docs 目錄，")
    print("網址即為 https://sukunwei.github.io/todolist-react-native/")
    print("拿到網址後填回 隐私政策.md 與 App Store Connect 的「隱私政策網址」")


if __name__ == "__main__":
    main()
