#!/usr/bin/env python3
"""Repair the known stale top-level path references in the active Vortex candidate."""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

REPAIRS = {
    "90_候选工作区/current/候选实现/src/forward/model.ts": ("02-模拟程序/", "02_模拟程序/", 4),
    "90_候选工作区/current/候选实现/src/highFidelity/strip-wetting.ts": ("02-模拟程序/", "02_模拟程序/", 2),
    "90_候选工作区/current/候选实现/src/structure/equilibrium.ts": ("02-模拟程序/", "02_模拟程序/", 2),
    "90_候选工作区/current/候选实现/tests/applicability-gates.test.ts": ("02-模拟程序/", "02_模拟程序/", 1),
    "90_候选工作区/current/候选实现/tests/equilibrium-numerics.test.ts": ("02-模拟程序/", "02_模拟程序/", 1),
    "90_候选工作区/current/候选实现/tests/equilibrium.test.ts": ("02-模拟程序/", "02_模拟程序/", 1),
    "90_候选工作区/current/候选实现/tests/strip-wetting-boundaries.test.ts": ("02-模拟程序/", "02_模拟程序/", 1),
    "90_候选工作区/current/候选实现/tests/strip-wetting.test.ts": ("02-模拟程序/", "02_模拟程序/", 1),
    "90_候选工作区/current/候选实现/tests/wetting-contract.test.ts": ("02-模拟程序/", "02_模拟程序/", 1),
    "90_候选工作区/current/候选实现/tests/wetting.test.ts": ("02-模拟程序/", "02_模拟程序/", 1),
    "02_模拟程序/tests/cross-layer-artifacts.test.ts": ("03-项目资料/", "03_项目资料/", 2),
}


def main() -> int:
    failures: list[str] = []
    changed: list[str] = []

    for relative, (old, new, expected) in REPAIRS.items():
        path = ROOT / relative
        if not path.is_file():
            failures.append(f"missing repair target: {relative}")
            continue
        text = path.read_text(encoding="utf-8")
        old_count = text.count(old)
        new_count = text.count(new)
        if old_count == expected:
            path.write_text(text.replace(old, new), encoding="utf-8")
            changed.append(relative)
        elif old_count == 0 and new_count >= expected:
            continue
        else:
            failures.append(
                f"unexpected token count in {relative}: old={old_count}, new={new_count}, expected={expected}"
            )

    if failures:
        print("current path repair: FAIL")
        for failure in failures:
            print(f"- {failure}")
        return 1

    print("current path repair: PASS")
    for relative in changed:
        print(f"- repaired: {relative}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
