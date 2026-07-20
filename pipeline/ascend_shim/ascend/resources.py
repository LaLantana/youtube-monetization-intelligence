"""Drop-in stand-in for Ascend's `ascend.resources` module.

The original platform is gone; this shim reproduces just enough of its API
that the hackathon components run unmodified. The @transform/@read decorators
don't execute anything — they attach the component's declared inputs and
tests to the function, and the runner reads that metadata to build the DAG.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable


@dataclass(frozen=True)
class Ref:
    name: str


@dataclass(frozen=True)
class Test:
    kind: str
    params: dict = field(default_factory=dict)


def ref(name: str) -> Ref:
    return Ref(name)


def test(kind: str, **params: Any) -> Test:
    return Test(kind, params)


def _decorate(fn: Callable, inputs: list, tests: list, kind: str) -> Callable:
    fn.__ascend_component__ = {
        "kind": kind,
        "inputs": [r.name for r in (inputs or [])],
        "tests": tests or [],
    }
    return fn


def transform(inputs: list | None = None, tests: list | None = None, **_ignored: Any):
    def wrap(fn: Callable) -> Callable:
        return _decorate(fn, inputs, tests, "transform")

    return wrap


def read(inputs: list | None = None, tests: list | None = None, **_ignored: Any):
    def wrap(fn: Callable) -> Callable:
        return _decorate(fn, inputs, tests, "read")

    return wrap
