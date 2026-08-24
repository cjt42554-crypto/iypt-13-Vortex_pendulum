#!/usr/bin/env python3
"""Check Markdown math syntax used by the project."""

from __future__ import annotations

from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
SKIP_DIRS = {".git", "node_modules", "dist", "coverage"}
FENCE_RE = re.compile(r"^\s{0,3}(`{3,}|~{3,})")
DISPLAY_RE = re.compile(r"^\s*\$\$\s*$")
LEGACY_RE = re.compile(r"\\[()\[\]]")
TEX_COMMAND_RE = re.compile(r"\\[A-Za-z]+")
TEX_BAR_COLLISION_RE = re.compile(r"\\(?:lvert|rvert)[A-Za-z]")
ZERO_WIDTH_RE = re.compile("[\u200b\ufeff\u2060]")


def markdown_files() -> list[Path]:
    return sorted(
        path
        for path in ROOT.rglob("*.md")
        if not any(part in SKIP_DIRS for part in path.relative_to(ROOT).parts)
    )


def outside_code_spans(line: str) -> list[str]:
    """Return portions of a line outside matched backtick spans."""
    result: list[str] = []
    cursor = 0
    while cursor < len(line):
        opening = line.find("`", cursor)
        if opening < 0:
            result.append(line[cursor:])
            break
        result.append(line[cursor:opening])
        width = 1
        while opening + width < len(line) and line[opening + width] == "`":
            width += 1
        marker = "`" * width
        closing = line.find(marker, opening + width)
        if closing < 0:
            result.append(line[opening:])
            break
        cursor = closing + width
    return result or [""]


def unescaped_dollars(text: str) -> list[int]:
    positions: list[int] = []
    for index, char in enumerate(text):
        if char != "$":
            continue
        backslashes = 0
        cursor = index - 1
        while cursor >= 0 and text[cursor] == "\\":
            backslashes += 1
            cursor -= 1
        if backslashes % 2 == 0:
            positions.append(index)
    return positions


def main() -> int:
    errors: list[str] = []
    inline_formulas = 0
    display_formulas = 0
    files = markdown_files()

    for path in files:
        relative = path.relative_to(ROOT)
        lines = path.read_text(encoding="utf-8").splitlines()
        fence: tuple[str, int] | None = None
        display_start: int | None = None
        display_has_content = False

        for line_number, line in enumerate(lines, start=1):
            if ZERO_WIDTH_RE.search(line):
                errors.append(f"{relative}:{line_number}: forbidden zero-width character")

            fence_match = FENCE_RE.match(line)
            if fence_match:
                marker = fence_match.group(1)
                current = (marker[0], len(marker))
                if fence is None:
                    fence = current
                elif current[0] == fence[0] and current[1] >= fence[1]:
                    fence = None
                continue
            if fence is not None:
                continue

            if DISPLAY_RE.fullmatch(line):
                if display_start is None:
                    display_start = line_number
                    display_has_content = False
                else:
                    if not display_has_content:
                        errors.append(f"{relative}:{display_start}: empty display-math block")
                    display_formulas += 1
                    display_start = None
                continue

            if display_start is not None:
                if line.strip():
                    display_has_content = True
                collision = TEX_BAR_COLLISION_RE.search(line)
                if collision:
                    errors.append(
                        f"{relative}:{line_number}: TeX delimiter command "
                        f"{collision.group(0)!r} consumes the following symbol"
                    )
                if re.fullmatch(r"[=-]+", line.strip()):
                    errors.append(
                        f"{relative}:{line_number}: ambiguous standalone marker "
                        "inside display math"
                    )
                continue

            for segment in outside_code_spans(line):
                legacy = LEGACY_RE.search(segment)
                if legacy:
                    errors.append(
                        f"{relative}:{line_number}: legacy math delimiter "
                        f"{legacy.group(0)!r}; use $ or $$"
                    )

                positions = unescaped_dollars(segment)
                if len(positions) % 2:
                    errors.append(
                        f"{relative}:{line_number}: unpaired inline-math dollar delimiter"
                    )
                    continue

                outside_parts: list[str] = []
                cursor = 0
                for opening, closing in zip(positions[::2], positions[1::2]):
                    outside_parts.append(segment[cursor:opening])
                    formula = segment[opening + 1 : closing]
                    if not formula.strip():
                        errors.append(f"{relative}:{line_number}: empty inline-math span")
                    collision = TEX_BAR_COLLISION_RE.search(formula)
                    if collision:
                        errors.append(
                            f"{relative}:{line_number}: TeX delimiter command "
                            f"{collision.group(0)!r} consumes the following symbol"
                        )
                    if line.lstrip().startswith("|") and "|" in formula:
                        errors.append(
                            f"{relative}:{line_number}: literal | inside table math"
                        )
                    inline_formulas += 1
                    cursor = closing + 1
                outside_parts.append(segment[cursor:])

                raw_tex = TEX_COMMAND_RE.search("".join(outside_parts))
                if raw_tex:
                    errors.append(
                        f"{relative}:{line_number}: TeX command "
                        f"{raw_tex.group(0)!r} is outside a math span"
                    )

        if fence is not None:
            errors.append(f"{relative}: unclosed fenced code block")
        if display_start is not None:
            errors.append(f"{relative}:{display_start}: unclosed display-math block")

    if errors:
        print("MARKDOWN MATH FAIL")
        for error in errors:
            print(f"- {error}")
        return 1

    print(
        "MARKDOWN MATH PASS: "
        f"{len(files)} files, {inline_formulas} inline formulas, "
        f"{display_formulas} display formulas"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
