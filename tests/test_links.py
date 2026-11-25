"""Fails the build when a page links to something that no longer exists (see tools/check_links.py)."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "tools"))
import check_links  # noqa: E402


def test_every_internal_link_anchor_and_asset_resolves():
    assert check_links.internal_problems() == []


def test_every_file_listed_in_manifests_sitemap_and_cache_exists():
    assert check_links.listed_file_problems() == []


def test_the_checker_actually_catches_a_broken_link(tmp_path, monkeypatch):
    (tmp_path / "index.html").write_text('<a href="/nope/">x</a><a href="#missing">y</a><img src="/a.png">', encoding="utf-8")
    monkeypatch.setattr(check_links, "WEB", tmp_path)
    found = check_links.internal_problems()
    assert len(found) == 3 and any("#missing" in p for p in found) and any("/nope/" in p for p in found)
