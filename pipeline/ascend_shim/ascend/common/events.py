"""Stand-in for Ascend's logging helper."""
from __future__ import annotations

import sys


def log(message: str) -> None:
    print(f"[component] {message}", file=sys.stderr)
