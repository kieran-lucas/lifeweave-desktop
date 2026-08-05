"""Focused tests for the fetch( detection regex in verify_security."""
from __future__ import annotations

import re
import unittest

# The pattern under test — must match the one in verify_security.py exactly.
FETCH_PATTERN = re.compile(r"(?<!\w)fetch\(")


class FetchRegexTests(unittest.TestCase):
    def _matches(self, text: str) -> bool:
        return bool(FETCH_PATTERN.search(text))

    def test_bare_fetch_rejected(self) -> None:
        self.assertTrue(self._matches("fetch(url)"))

    def test_window_fetch_rejected(self) -> None:
        self.assertTrue(self._matches("window.fetch(url)"))

    def test_globalThis_fetch_rejected(self) -> None:
        self.assertTrue(self._matches("globalThis.fetch(url)"))

    def test_refetch_allowed(self) -> None:
        self.assertFalse(self._matches("query.refetch()"))

    def test_prefetch_allowed(self) -> None:
        self.assertFalse(self._matches("prefetch(url)"))
