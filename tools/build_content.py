"""Builds the pages that are generated from the lessons themselves:

  web/assets/lessons.json        every lesson's text (name, idea, steps, paper activity, level)
  web/learn/<lesson>/index.html  one readable, shareable page per lesson (own title, description, social card)
  web/activities/index.html      every paper activity in one printable pack
  web/teachers/index.html        the page for teachers and parents

Run:  python tools/build_content.py            (writes the files)
      python tools/build_content.py --check    (fails if the committed files are out of date; also run by pytest)
"""
import html
import json
import re
import sys
from pathlib import Path

import quickjs

ROOT = Path(__file__).resolve().parent.parent
WEB = ROOT / "web"
ASSETS = WEB / "assets"
SITE = "https://visualearn.org"
MAIL = "rajanalamuri@gmail.com"
LAB_PAGES = ["techniques", "trees", "graphs", "solve", "text", "numbers", "big", "shapes"]
LEVEL_NAME = {1: "Starter", 2: "Builder", 3: "Advanced"}
LEVEL_AGE = {1: "ages 8+", 2: "ages 10+", 3: "ages 13+"}
PAGE_TITLE = {
    "sorting": "Sorting", "searching": "Searching", "mazes": "Mazes and maps", "structures": "Arrays, hashing and trees", "paths": "Shortest paths",
    "dp": "Dynamic programming", "math/advanced": "Advanced math", "techniques": "Arrays and techniques", "trees": "Trees", "graphs": "Graphs",
    "solve": "Ways to solve it", "text": "Hashing and text", "numbers": "Number magic", "big": "The big questions", "shapes": "Shapes and space",
}
# older lessons: (script, global with ALGOS, page path)
OLD = [("sort.js", "VisuaLearn", "sorting"), ("search.js", "VLSearch", "searching"), ("graph.js", "VLGraph", "mazes"), ("structures.js", "VLStructures", "structures"),
       ("paths.js", "VLPaths", "paths"), ("dp.js", "VLDp", "dp"), ("math.js", "VLMath", "math/advanced")]
esc = html.escape


def read(name):
    return (ASSETS / name).read_text(encoding="utf-8")


def facts_of(a):
    """Three quick facts: written by hand for most lessons; for the sorting lessons they come from their complexity table."""
    if a.get("facts"):
        return a["facts"]
    cx = a["cx"]
    return [["Best case", cx["best"]], ["Worst case", cx["worst"]], ["Keeps equal items in order?", cx["stable"]]]


def collect():
    """Lesson records, read by running the lesson scripts (no browser needed)."""
    cat = quickjs.Context()
    cat.eval(read("catalog.js"))
    level_of = lambda idea: json.loads(cat.eval(f"JSON.stringify(VLCatalog.levelOfIdea({json.dumps(idea)}))")) or 2
    topic_of = lambda idea: json.loads(cat.eval(f"JSON.stringify(VLCatalog.topicFor({json.dumps(idea)}))"))
    out = []

    def add(page, algos):
        last = page.split("/")[-1]
        for key, a in algos.items():
            out.append({"id": f"{last}:{key}", "page": page, "key": key, "slug": f"{page.replace('/', '-')}-{key}", "pageTitle": PAGE_TITLE[page],
                        "name": a["name"], "blurb": a["blurb"], "facts": facts_of(a), "code": a["code"], "offline": a["offline"],
                        "level": level_of(f"{last}:{key}"), "topic": topic_of(f"{last}:{key}")})

    meta = "JSON.stringify(Object.fromEntries(Object.entries(%s).map(([k, a]) => [k, { name: a.name, blurb: a.blurb, facts: a.facts, cx: a.cx, code: a.code, offline: a.offline }])))"
    for page in LAB_PAGES:
        ctx = quickjs.Context()
        ctx.eval(read("lab.js"))
        ctx.eval(read(f"{page}.js"))
        add(page, json.loads(ctx.eval(meta % f"VLLab.registry['{page}']")))
    for script, glob, page in OLD:
        ctx = quickjs.Context()
        ctx.eval(read(script))
        add(page, json.loads(ctx.eval(meta % f"{glob}.ALGOS")))
    return out


# ---------- shared page frame ----------
def frame_parts():
    cur = (WEB / "curriculum" / "index.html").read_text(encoding="utf-8")
    header = re.search(r'<header class="top">.*?</header>', cur, re.S).group(0)
    footer = re.search(r'<footer class="foot">.*?</footer>', cur, re.S).group(0)
    return header.replace(' aria-current="page"', ""), footer


def page(path, title, desc, body, *, nav_current=None, ld=None, extra_scripts=""):
    header, footer = frame_parts()
    if nav_current:
        header = header.replace(f'<a href="{nav_current}"', f'<a aria-current="page" href="{nav_current}"', 1)
    url = f"{SITE}/{path}"
    card = f"{SITE}/assets/og.png"
    ldj = f'\n<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False).replace("</", "<\\/")}</script>' if ld else ""
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{esc(title)}</title>
<meta name="description" content="{esc(desc, quote=True)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="VisuaLearn">
<meta property="og:title" content="{esc(title, quote=True)}">
<meta property="og:description" content="{esc(desc, quote=True)}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{card}">
<meta name="twitter:card" content="summary_large_image">
<link rel="canonical" href="{url}">
<meta name="theme-color" content="#fffbea">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preload" href="/assets/fonts/atkinson-hyperlegible-400.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/fonts.css">
<link rel="stylesheet" href="/assets/style.css">
<link rel="stylesheet" href="/assets/home.css">
<link rel="stylesheet" href="/assets/arith.css">
<script src="/assets/progress.js" defer></script>
<script src="/assets/profile.js" defer></script>
<link rel="manifest" href="/manifest.webmanifest">
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
<script src="/assets/app.js" defer></script>{extra_scripts}
<link rel="stylesheet" href="/assets/genz.css">{ldj}
</head>
<body class="home">
{header}

{body}

{footer}
</body>
</html>
"""


def mail(subject, body=""):
    from urllib.parse import quote
    return f"mailto:{MAIL}?subject={quote(subject)}&body={quote(body)}"


def activity_card(l, link=True):
    o = l["offline"]
    steps = "".join(f"<li>{esc(s)}</li>" for s in o["steps"])
    lv = LEVEL_NAME[l["level"]]
    head = f'<a href="/learn/{l["slug"]}/">{esc(l["name"])}</a>' if link else esc(l["name"])
    return (f'<article class="act" data-level="{l["level"]}"><p class="act-lesson">{head} <span class="lv lv{l["level"]}">{lv}</span></p>'
            f'<h3>{esc(o["title"])}</h3><p class="act-need"><b>You need</b> {esc(o["need"])} · <b>Time</b> {esc(o["time"])}</p>'
            f'<ol>{steps}</ol><p class="act-think"><b>Think about it.</b> {esc(o["think"])}</p></article>')


# ---------- generated pages ----------
def lesson_page(l, prev, nxt):
    lv, age = LEVEL_NAME[l["level"]], LEVEL_AGE[l["level"]]
    play = f"/{l['page']}/#{l['key']}"
    desc = l["blurb"] if len(l["blurb"]) <= 200 else l["blurb"][:197].rsplit(" ", 1)[0] + "…"
    code = "".join(f"<li><code>{esc(c)}</code></li>" for c in l["code"])
    facts = "".join(f"<li><b>{esc(a)}</b><span>{esc(b)}</span></li>" for a, b in l["facts"])
    nav = ""
    if prev or nxt:
        nav = '<nav class="lesson-nav" aria-label="More in this group">' + (f'<a class="btn" href="/learn/{prev["slug"]}/">← {esc(prev["name"])}</a>' if prev else "") + (f'<a class="btn" href="/learn/{nxt["slug"]}/">{esc(nxt["name"])} →</a>' if nxt else "") + "</nav>"
    body = f"""<main class="wrap ar pg legal lesson-doc">
  <p class="eyebrow"><a href="/curriculum/">Roadmap</a> · {esc(l['pageTitle'])}</p>
  <h1>{esc(l['name'])}</h1>
  <p class="lvl lvl{l['level']}">{lv} · {age}</p>
  <p class="lede">{esc(l['blurb'])}</p>
  <p><a class="btn primary" href="{play}">Play this lesson</a></p>
  <h2>How it works</h2>
  <ol class="doc-code">{code}</ol>
  <ul class="doc-facts">{facts}</ul>
  <h2>Try it on paper</h2>
  {activity_card(l, link=False)}
  <p><button class="btn" type="button" data-print>Print this activity</button></p>
  {nav}
  <p class="fine">Was something confusing? <a href="{mail('VisuaLearn feedback: ' + l['name'], 'Lesson: ' + l['id'] + chr(10) + chr(10) + 'What was confusing or missing?' + chr(10))}">Tell us</a>. We read every message.</p>
</main>"""
    ld = {"@context": "https://schema.org", "@type": "LearningResource", "name": l["name"], "description": l["blurb"], "inLanguage": "en", "isAccessibleForFree": True,
          "educationalLevel": f"{lv} ({age})", "learningResourceType": "interactive lesson", "url": f"{SITE}/learn/{l['slug']}/",
          "provider": {"@type": "Organization", "name": "VisuaLearn", "url": SITE}}
    if l["topic"]:
        ld["teaches"] = l["topic"]
    return page(f"learn/{l['slug']}/", f"{l['name']} · {l['pageTitle']} · VisuaLearn", desc, body, nav_current="/#lessons", ld=ld,
                extra_scripts='\n<script src="/assets/print.js" defer></script>')


def activities_page(lessons):
    cards = "\n".join(activity_card(l) for l in sorted(lessons, key=lambda x: (x["level"], x["pageTitle"], x["name"])))
    body = f"""<main class="wrap ar pg legal act-pack">
  <h1>Paper activities</h1>
  <p class="lede">Every lesson ends with something to do away from the screen. Pick a level, then print.</p>
  <div class="seg no-print" id="act-levels" role="group" aria-label="Show activities for">
    <button type="button" data-level="0" aria-pressed="true">All ({len(lessons)})</button>
    <button type="button" data-level="1" aria-pressed="false">Starter · 8+</button>
    <button type="button" data-level="2" aria-pressed="false">Builder · 10+</button>
    <button type="button" data-level="3" aria-pressed="false">Advanced · 13+</button>
    <button class="btn primary" type="button" data-print>Print these</button>
  </div>
  <div class="act-grid" id="acts">
{cards}
  </div>
</main>"""
    return page("activities/", "Printable paper activities · VisuaLearn", "Every VisuaLearn lesson ends with a paper activity. Pick a level and print the pack for a class or for home.", body,
                nav_current="/#lessons", extra_scripts='\n<script src="/assets/print.js" defer></script>\n<script src="/assets/activities.js" defer></script>')


def teachers_page(lessons):
    n = len(lessons)
    body = f"""<main class="wrap ar pg legal teachers">
  <h1>For teachers and parents</h1>
  <p class="lede">{n} short visual lessons on how computers think. Children guess first, watch it happen, then do a paper activity.</p>

  <h2>Run it in 45 minutes</h2>
  <ol class="plan">
    <li><b>10 min, together.</b> Project one lesson. The class votes on each "guess first" question before the answer shows.</li>
    <li><b>25 min, in groups.</b> Hand out the printed paper activity for that lesson.</li>
    <li><b>10 min, share.</b> Compare what each group found, and talk about the "think about it" question.</li>
  </ol>
  <p class="plan-links"><a class="btn primary" href="/activities/">Print the activities</a> <a class="btn" href="/curriculum/?level=1#start">Starter path (8+)</a> <a class="btn" href="/curriculum/?level=2">Builder (10+)</a> <a class="btn" href="/curriculum/?level=3">Advanced (13+)</a></p>

  <h2>What you can rely on</h2>
  <ul class="plain">
    <li>Every lesson's answers are checked by automated tests against independent reference code.</li>
    <li>The lesson explanations are written at about a grade 4 to 5 reading level.</li>
    <li>Pages you have already opened keep working without a connection.</li>
    <li>No ads, no tracking, and no email or password for children.</li>
  </ul>

  <h2>What we do not know yet</h2>
  <p>This has not been through a classroom trial. If you try it with a class, <a href="{mail('VisuaLearn in my class', 'What worked, and what confused the children?' + chr(10))}">tell us what happened</a>.</p>

  <h2>Screen time and privacy</h2>
  <p>A grown-up can set a daily limit on the <a href="/#grown-ups">home page</a>. Progress stays on the device. Read the <a href="/privacy/">privacy page</a>.</p>
</main>"""
    return page("teachers/", "For teachers and parents · VisuaLearn", "Run a visual algorithms lesson in 45 minutes, print the paper activities, and pick a path by age. Free, no ads, no tracking.", body, nav_current="/#lessons")


def generate():
    lessons = collect()
    files = {"web/assets/lessons.json": json.dumps(lessons, ensure_ascii=False, indent=1) + "\n"}
    by_page = {}
    for l in lessons:
        by_page.setdefault(l["page"], []).append(l)
    for group in by_page.values():
        for i, l in enumerate(group):
            files[f"web/learn/{l['slug']}/index.html"] = lesson_page(l, group[i - 1] if i else None, group[i + 1] if i + 1 < len(group) else None)
    files["web/activities/index.html"] = activities_page(lessons)
    files["web/teachers/index.html"] = teachers_page(lessons)
    # the sitemap lists these pages too
    sm = (WEB / "sitemap.xml").read_text(encoding="utf-8")
    sm = re.sub(r"  <url><loc>https://visualearn\.org/(?:learn|activities|teachers)/[^<]*</loc></url>\n", "", sm)
    extra = "".join(f"  <url><loc>{SITE}/{p}</loc></url>\n" for p in ["teachers/", "activities/"] + [f"learn/{l['slug']}/" for l in lessons])
    files["web/sitemap.xml"] = sm.replace("</urlset>", extra + "</urlset>")
    return files


def main():
    files = generate()
    if "--check" in sys.argv:
        stale = [p for p, t in files.items() if not (ROOT / p).is_file() or (ROOT / p).read_text(encoding="utf-8").replace("\r\n", "\n") != t]
        for p in stale:
            print("STALE", p)
        sys.exit(1 if stale else 0)
    for p, t in files.items():
        f = ROOT / p
        f.parent.mkdir(parents=True, exist_ok=True)
        f.write_text(t, encoding="utf-8", newline="\n")
    print(f"wrote {len(files)} files ({sum(1 for p in files if p.startswith('web/learn/'))} lesson pages)")


if __name__ == "__main__":
    main()
