"""Stand-in for Ascend's ComponentExecutionContext.

The only context feature the components use is `context.vaults` — Ascend's
secret store. Here it reads plain environment variables instead
(e.g. YOUTUBE_API_KEY), which is how the GitHub Actions job supplies them.
"""
from __future__ import annotations

import os


class _EnvVault:
    def get(self, key: str, default=None):
        return os.environ.get(key, default)


class _Vaults:
    def get(self, _vault_name: str) -> _EnvVault:
        return _EnvVault()


class ComponentExecutionContext:
    def __init__(self) -> None:
        self.vaults = _Vaults()
