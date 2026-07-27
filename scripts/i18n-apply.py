#!/usr/bin/env python3
"""Merge FR translations into messages.ts and wrap TSX UI strings with t()."""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path("/workspace")
MSG = ROOT / "src/lib/i18n/messages.ts"
FR_JSON = Path("/tmp/i18n-fr.json")

SKIP_DIRS = {"node_modules", ".next", "i18n"}
SKIP_FILES = {
    "LanguageSwitcher.tsx",
    "messages.ts",
    "locale.tsx",
}


def js_escape(s: str) -> str:
    return s.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")


def merge_messages(fr: dict[str, str]) -> int:
    text = MSG.read_text(encoding="utf-8")
    existing = set(re.findall(r'"((?:\\.|[^"\\])*)"\s*:', text))
    existing.update(re.findall(r"^\s*([A-Za-z_][A-Za-z0-9_]*)\s*:", text, re.M))

    additions = []
    for en, frv in sorted(fr.items(), key=lambda x: x[0].lower()):
        if not en or en in existing:
            continue
        if en == frv:
            continue  # skip untranslated / failed
        # skip keys that aren't valid as object keys with quotes
        additions.append(f'  "{js_escape(en)}": "{js_escape(frv)}",')
        existing.add(en)

    if not additions:
        print("No new message keys")
        return 0

    block = "\n  // Auto-generated bulk UI translations\n" + "\n".join(additions) + "\n"
    text = text.replace("\n};\n\nexport function translate", block + "\n};\n\nexport function translate", 1)
    MSG.write_text(text, encoding="utf-8")
    print(f"Added {len(additions)} keys to messages.ts")
    return len(additions)


ATTR_RE = re.compile(
    r'\b(placeholder|aria-label|title|alt|label)=("([^"]{2,200})"|\'([^\']{2,200})\')'
)


def should_translate_attr(val: str) -> bool:
    if not re.search(r"[A-Za-z]", val):
        return False
    if val.startswith("/") or val.startswith("http") or val.startswith("#"):
        return False
    if re.fullmatch(r"[\d\s$€.,%-]+", val):
        return False
    # technical
    if val in {"en", "fr", "ltr", "rtl", "dialog", "menu", "listbox"}:
        return False
    return True


def ensure_use_t(text: str, path: Path) -> str:
    if "useT(" in text or "const t = useT" in text:
        return text
    if "useI18n(" in text:
        return text
    # only client components / pages with jsx
    if path.suffix != ".tsx":
        return text
    if '"use client"' not in text and "'use client'" not in text:
        # server component — skip auto inject unless it's already a client file
        # Many pages are server components; wrapping with t requires client.
        # Convert lightly used pages by adding use client when we wrap.
        pass

    if "from \"@/lib/i18n/locale\"" not in text and "from '@/lib/i18n/locale'" not in text:
        # add import after first import block
        m = re.search(r"(import .+?\n)(?!import )", text, re.S)
        if m:
            insert_at = m.end()
            text = text[:insert_at] + 'import { useT } from "@/lib/i18n/locale";\n' + text[insert_at:]
        else:
            text = 'import { useT } from "@/lib/i18n/locale";\n' + text

    # inject const t = useT() into exported/default function components
    def inject_hook(match: re.Match) -> str:
        header = match.group(0)
        if "useT()" in header:
            return header
        # after opening brace of function body start
        return header + "\n  const t = useT();"

    # Prefer common component patterns
    patterns = [
        r"(export default function \w+\([^)]*\)\s*\{)",
        r"(function \w+\([^)]*\)\s*\{)",
        r"(export function \w+\([^)]*\)\s*\{)",
    ]
    injected = False
    for pat in patterns:
        new_text, n = re.subn(pat, inject_hook, text, count=1)
        if n:
            text = new_text
            injected = True
            break

    if injected and '"use client"' not in text and "'use client'" not in text:
        text = '"use client";\n\n' + text

    return text


def wrap_file(path: Path, known: set[str]) -> bool:
    if path.name in SKIP_FILES:
        return False
    if any(p in SKIP_DIRS for p in path.parts):
        return False
    text = path.read_text(encoding="utf-8")
    original = text

    # Wrap attribute values
    def attr_sub(m: re.Match) -> str:
        name = m.group(1)
        val = m.group(3) if m.group(3) is not None else m.group(4)
        if not should_translate_attr(val):
            return m.group(0)
        if val not in known and len(val.split()) < 1:
            return m.group(0)
        # Always wrap if looks like UI English
        if not should_translate_attr(val):
            return m.group(0)
        return f'{name}={{t("{js_escape(val)}")}}'

    text = ATTR_RE.sub(attr_sub, text)

    # Wrap JSX text nodes on their own line
    def jsx_line_sub(m: re.Match) -> str:
        indent = m.group(1)
        content = m.group(2).strip()
        # skip if already expression
        if content.startswith("{") or content.startswith("//") or content.startswith("/*"):
            return m.group(0)
        if "<" in content or ">" in content:
            return m.group(0)
        if not re.search(r"[A-Za-z]", content):
            return m.group(0)
        # Prefer known catalog strings, or title-case / sentence-like
        if content not in known and not re.match(r"^[A-Z0-9].*[.!?]?$", content):
            # still wrap short labels
            if len(content) > 40 or not re.search(r"[a-zA-Z]{3,}", content):
                return m.group(0)
        return f"{indent}{{t(\"{js_escape(content)}\")}}\n"

    text = re.sub(
        r"^([ \t]+)([A-Z][^<\n{}]{1,180})\n",
        jsx_line_sub,
        text,
        flags=re.M,
    )

    if text == original:
        return False

    # Only inject hook if we introduced t(
    if '{t("' in text or "t('" in text:
        # ensure not only in comments
        text = ensure_use_t(text, path)

    if text != original:
        path.write_text(text, encoding="utf-8")
        return True
    return False


def main():
    fr = json.loads(FR_JSON.read_text()) if FR_JSON.exists() else {}
    print(f"Loaded {len(fr)} translations")
    merge_messages(fr)
    known = set(fr.keys())
    # also load existing message keys
    msg = MSG.read_text(encoding="utf-8")
    known.update(re.findall(r'"((?:\\.|[^"\\])*)"\s*:', msg))

    changed = 0
    for folder in [ROOT / "src/app", ROOT / "src/components"]:
        for path in folder.rglob("*.tsx"):
            if wrap_file(path, known):
                changed += 1
                print("wrapped", path.relative_to(ROOT))
    print(f"Updated {changed} files")


if __name__ == "__main__":
    main()
