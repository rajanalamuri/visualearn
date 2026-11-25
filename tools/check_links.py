"""Link checker for the static site.

  python tools/check_links.py              check every internal link, asset, anchor and listed file
  python tools/check_links.py --external   also request every https:// address the site mentions

Internal checks (no network) also run as a pytest test, so a stale link fails CI.
"""
import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urldefrag, urlparse

ROOT = Path(__file__).resolve().parent.parent
WEB = ROOT / "web"
SITE = "https://visualearn.org"


class Collector(HTMLParser):
    def __init__(self):
        super().__init__()
        self.refs, self.ids = [], set()

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if a.get("id"):
            self.ids.add(a["id"])
        if tag == "a" and a.get("name"):
            self.ids.add(a["name"])
        for k in ("href", "src", "poster", "action"):
            if a.get(k) and not (tag == "link" and a.get("rel") == "canonical" and False):
                self.refs.append((tag, k, a[k]))
        if tag == "meta" and a.get("property") in ("og:url", "og:image") and a.get("content"):
            self.refs.append((tag, "content", a["content"]))


def parse(path):
    c = Collector()
    c.feed(path.read_text(encoding="utf-8"))
    return c


def resolve(page, ref):
    """Map a reference found in `page` (a Path under web/) to a file under web/, or None if external."""
    ref = ref.strip()
    if ref.startswith(("mailto:", "tel:", "javascript:", "data:", "#")):
        return None
    if ref.startswith("//"):
        return None
    u = urlparse(ref)
    if u.scheme in ("http", "https"):
        if u.netloc == "visualearn.org":
            path = u.path or "/"
        else:
            return None
    else:
        path = u.path
    path = unquote(path)
    base = WEB if path.startswith("/") else page.parent
    target = (base / path.lstrip("/")).resolve() if path.startswith("/") else (page.parent / path).resolve()
    if target.is_dir() or path.endswith("/") or path == "":
        target = target / "index.html"
    return target


def scripts_text(html_path):
    """All the JavaScript a page loads, so a #fragment that names a lesson (built in JS) can be checked."""
    text = ""
    for tag, k, ref in parse(html_path).refs:
        if tag == "script":
            t = resolve(html_path, ref)
            if t and t.is_file():
                text += t.read_text(encoding="utf-8")
    return text


def internal_problems():
    bad = []
    pages = sorted(WEB.rglob("*.html"))
    ids = {p: parse(p).ids for p in pages}
    for page in pages:
        rel = page.relative_to(WEB)
        c = parse(page)
        js = None
        for tag, k, ref in c.refs:
            if ref.startswith("#"):
                frag = ref[1:]
                if frag and frag not in c.ids:
                    bad.append(f"{rel}: #{frag} has no matching id on the same page")
                continue
            target = resolve(page, ref)
            if target is None:
                continue
            if not str(target).startswith(str(WEB.resolve())):
                bad.append(f"{rel}: {ref} points outside the site")
                continue
            if not target.is_file():
                bad.append(f"{rel}: {ref} -> missing {target.relative_to(WEB.resolve()) if str(target).startswith(str(WEB.resolve())) else target}")
                continue
            frag = urldefrag(ref)[1]
            if frag and target.suffix == ".html":
                if frag not in ids.get(target, parse(target).ids):
                    js = js if js is not None else None
                    text = scripts_text(target)
                    if not re.search(r"\b" + re.escape(unquote(frag)) + r"\b", text):
                        bad.append(f"{rel}: {ref} -> no id or lesson named #{frag}")
    return bad


def listed_file_problems():
    bad = []

    def need(where, ref):
        u = urlparse(ref)
        if u.scheme in ("http", "https") and u.netloc != "visualearn.org":
            return
        path = unquote(u.path)
        if not path.startswith("/"):
            return
        f = WEB / path.lstrip("/")
        if path.endswith("/") or f.is_dir():
            f = f / "index.html"
        if not f.is_file():
            bad.append(f"{where}: {ref} does not exist")

    m = json.loads((WEB / "manifest.webmanifest").read_text(encoding="utf-8"))
    for k in ("start_url",):
        need("manifest", m[k])
    for i in m["icons"]:
        need("manifest icon", i["src"])
    for s in m.get("shortcuts", []):
        need("manifest shortcut", s["url"])
    sw = (WEB / "sw.js").read_text(encoding="utf-8")
    core = re.search(r"const CORE = \[(.*?)\];", sw, re.S)
    for ref in re.findall(r"'(/[^']*)'", core.group(1)):
        need("sw.js precache", ref)
    sm = (WEB / "sitemap.xml").read_text(encoding="utf-8")
    for loc in re.findall(r"<loc>([^<]+)</loc>", sm):
        need("sitemap", loc)
    css = [p for p in (WEB / "assets").rglob("*.css")]
    for p in css:
        for ref in re.findall(r"url\(['\"]?([^)'\"]+)['\"]?\)", p.read_text(encoding="utf-8")):
            if not ref.startswith(("data:", "#")):
                need(p.name, ref)
    twa = json.loads((ROOT / "twa-manifest.json").read_text(encoding="utf-8"))
    for k in ("iconUrl", "maskableIconUrl"):
        need("twa-manifest", twa[k])
    return bad


def external_urls():
    found = {}
    for p in list(WEB.rglob("*")) + list((ROOT / "docs").rglob("*.md")) + [ROOT / "README.md"]:
        if p.is_file() and p.suffix in (".html", ".js", ".css", ".md", ".xml", ".json", ".webmanifest", ".txt"):
            for u in re.findall(r"https?://[^\s'\"<>)\]]+", p.read_text(encoding="utf-8", errors="ignore")):
                u = u.rstrip(".,;`")
                if "visualearn.org" in u or "www.w3.org" in u or "localhost" in u or "${" in u or "{" in u or u.endswith("/firebasejs/"):
                    continue
                found.setdefault(u, str(p.relative_to(ROOT)))
    return found


def check_external():
    import urllib.request
    bad = []
    for u, where in sorted(external_urls().items()):
        req = urllib.request.Request(u, method="GET", headers={"User-Agent": "Mozilla/5.0 link-check"})
        try:
            with urllib.request.urlopen(req, timeout=20) as r:
                code = r.status
        except Exception as e:  # noqa: BLE001
            code = getattr(e, "code", repr(e))
        ok = isinstance(code, int) and code < 400
        print(("ok   " if ok else "BAD  ") + str(code), u, f"({where})")
        if not ok:
            bad.append((u, code, where))
    return bad


if __name__ == "__main__":
    problems = internal_problems() + listed_file_problems()
    for p in problems:
        print("BAD ", p)
    print(f"internal: {len(problems)} problem(s) in {len(list(WEB.rglob('*.html')))} pages")
    rc = 1 if problems else 0
    if "--external" in sys.argv:
        rc = rc or (1 if check_external() else 0)
    sys.exit(rc)
