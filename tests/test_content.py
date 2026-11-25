"""Checks what makes the site broadly usable: levels, generated pages, search and sharing tags, colour-blind safety, feedback."""
import html
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WEB = ROOT / "web"
sys.path.insert(0, str(ROOT / "tools"))
sys.path.insert(0, str(ROOT / "tests"))
import build_content  # noqa: E402
from test_progress import boot, call  # noqa: E402


# ---------- levels ----------

def test_every_topic_has_a_level_and_the_start_path_is_gentle_and_playable():
    ctx = boot("catalog.js")
    dsa = call(ctx, "VLCatalog.DSA")
    names = [t[0] for _, topics in dsa for t in topics]
    for n in call(ctx, "VLCatalog.STARTER") + call(ctx, "VLCatalog.ADVANCED"):
        assert n in names, f"{n} is in a level list but not on the roadmap"
    levels = {n: call(ctx, f"VLCatalog.levelOf({json.dumps(n)})") for n in names}
    assert set(levels.values()) == {1, 2, 3}
    assert sum(1 for v in levels.values() if v == 1) >= 15 and sum(1 for v in levels.values() if v == 3) >= 25
    ready = {t[0] for _, topics in dsa for t in topics if t[1]}
    path = call(ctx, "VLCatalog.START_PATH")
    assert len(path) == 10 and all(p in ready for p in path)
    assert all(levels[p] <= 2 for p in path)  # nothing university-level in "start here"


def test_a_lesson_knows_who_it_is_for():
    ctx = boot("catalog.js")
    assert call(ctx, "VLCatalog.levelOfIdea('sorting:bubble')") == 1
    assert call(ctx, "VLCatalog.levelOfIdea('graphs:flow')") == 3
    assert call(ctx, "VLCatalog.levelOfIdea('trees:pre')") == 0  # not a roadmap topic: callers fall back to Builder
    assert call(ctx, "VLCatalog.topicFor('graphs:kruskal')") == "Minimum spanning trees"


# ---------- generated pages ----------

def test_generated_pages_are_up_to_date():
    files = build_content.generate()
    stale = [p for p, t in files.items() if not (ROOT / p).is_file() or (ROOT / p).read_text(encoding="utf-8").replace("\r\n", "\n") != t]  # Git may convert line endings on Windows
    assert stale == [], f"run: python tools/build_content.py  ({len(stale)} stale, e.g. {stale[:3]})"


def test_every_lesson_has_its_own_readable_page():
    lessons = json.loads((WEB / "assets" / "lessons.json").read_text(encoding="utf-8"))
    assert len(lessons) >= 100
    titles, descs = set(), set()
    for l in lessons:
        p = WEB / "learn" / l["slug"] / "index.html"
        assert p.is_file(), l["id"]
        h = p.read_text(encoding="utf-8")
        title = html.unescape(re.search(r"<title>(.*?)</title>", h).group(1))
        assert l["name"].split(" (")[0].split(":")[0][:8] in title and title not in titles
        titles.add(title)
        d = re.search(r'<meta name="description" content="(.*?)">', h).group(1)
        assert 40 <= len(d) <= 230
        descs.add(d)
        for must in ('rel="canonical"', 'property="og:image"', 'name="twitter:card"', "application/ld+json", f'href="/{l["page"]}/#{l["key"]}"', "Try it on paper"):
            assert must in h, (l["id"], must)
        ld = json.loads(re.search(r'<script type="application/ld\+json">(.*?)</script>', h, re.S).group(1))
        assert ld["@type"] == "LearningResource" and ld["isAccessibleForFree"] is True
        assert len(re.sub(r"<[^>]+>", " ", h).split()) > 120  # real text for search engines, not an empty shell
    assert len(descs) > len(lessons) * 0.95  # descriptions are not copy-pasted


def test_activity_pack_and_teacher_page():
    lessons = json.loads((WEB / "assets" / "lessons.json").read_text(encoding="utf-8"))
    pack = (WEB / "activities" / "index.html").read_text(encoding="utf-8")
    assert pack.count('<article class="act"') == len(lessons)
    assert all(f'data-level="{n}"' in pack for n in (1, 2, 3))
    t = (WEB / "teachers" / "index.html").read_text(encoding="utf-8")
    for must in ("45 minutes", "/activities/", "level=1", "level=3", "not been through a classroom trial", "mailto:"):
        assert must in t, must
    assert "CONTACT-EMAIL" not in t


def test_sitemap_lists_every_lesson_page():
    sm = (WEB / "sitemap.xml").read_text(encoding="utf-8")
    lessons = json.loads((WEB / "assets" / "lessons.json").read_text(encoding="utf-8"))
    for l in lessons:
        assert f"/learn/{l['slug']}/" in sm
    assert "/teachers/" in sm and "/activities/" in sm


# ---------- sharing ----------

def test_every_public_page_has_a_social_card():
    for page in WEB.rglob("*.html"):
        if page.name.startswith("_") or page.name == "404.html":
            continue
        h = page.read_text(encoding="utf-8")
        if "noindex" in h:
            continue
        assert "og:image" in h and "twitter:card" in h, page.relative_to(WEB)
    assert (WEB / "assets" / "og.png").stat().st_size > 5000


# ---------- colour-blind safety ----------

def _lum(h):
    h = h.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    f = lambda v: v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2])


def _ratio(a, b):
    la, lb = sorted([_lum(a), _lum(b)], reverse=True)
    return (la + 0.05) / (lb + 0.05)


def test_swapped_and_done_differ_in_brightness_not_just_hue():
    css = (WEB / "assets" / "genz.css").read_text(encoding="utf-8")
    light = re.search(r":root\{(.*?)\}", css, re.S).group(1)
    dark = re.search(r"prefers-color-scheme: dark\)\{\s*:root\{(.*?)\}", css, re.S).group(1)
    tok = lambda block, name: re.search(rf"--{name}:\s*(#[0-9a-fA-F]{{6}})", block).group(1)
    assert _ratio(tok(light, "swap"), tok(light, "done")) >= 1.9
    assert _ratio(tok(dark, "swap"), tok(dark, "done")) >= 2.0
    assert _ratio("#ffffff", tok(light, "swap")) >= 4.5  # white text on swapped items stays readable
    # and the picture says it with shapes too
    lab = (WEB / "assets" / "lab.js").read_text(encoding="utf-8")
    assert "✓" in lab and "✕" in lab and "ring" in lab
    assert "✓" in css and "✕" in css


# ---------- feedback ----------

def test_feedback_link_and_lesson_page_address():
    ctx = boot("finish.js")
    assert call(ctx, "VLFinish.slugFor('/techniques/', 'twoptr')") == "techniques-twoptr"
    assert call(ctx, "VLFinish.slugFor('math/advanced', 'sieve')") == "math-advanced-sieve"
    link = call(ctx, "VLFinish.feedbackLink('Two pointers', 'techniques:twoptr')")
    assert link.startswith("mailto:rajanalamuri@gmail.com?subject=VisuaLearn%20feedback%3A%20Two%20pointers")
    assert "techniques%3Atwoptr" in link
    for n in ("techniques-twoptr", "math-advanced-sieve", "sorting-bubble"):
        assert (WEB / "learn" / n / "index.html").is_file()  # the address the end card builds really exists
