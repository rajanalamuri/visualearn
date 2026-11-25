"""Checks the on-device diary (progress.js) and the grade catalogue (catalog.js)."""
import json
from pathlib import Path

import quickjs

ASSETS = Path(__file__).resolve().parent.parent / "web" / "assets"
WEB = ASSETS.parent
FAKE_STORE = "var store = {}; var localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } };"


def boot(*names):
    ctx = quickjs.Context()
    ctx.eval(FAKE_STORE)
    for name in names:
        ctx.eval((ASSETS / name).read_text(encoding="utf-8"))
    return ctx


def call(ctx, expr):
    return json.loads(ctx.eval(f"JSON.stringify({expr})"))


def test_mark_counts_ideas_for_today():
    ctx = boot("progress.js")
    ctx.eval("VLProgress.mark('math:add'); VLProgress.mark('math:add'); VLProgress.mark('math:pi');")
    today = ctx.eval("VLProgress.dayKey()")
    log = call(ctx, "VLProgress.load()")
    assert log == {today: {"ideas": {"math:add": 2, "math:pi": 1}}}
    assert sorted(call(ctx, "VLProgress.everMet()")) == ["math:add", "math:pi"]


def test_minutes_come_from_the_time_limit_counter():
    ctx = boot("progress.js")
    ctx.eval("store['vl-used'] = JSON.stringify({ date: VLProgress.dayKey(), sec: 420, extra: 0 }); VLProgress.mark('math:sq');")
    days = call(ctx, "VLProgress.recent(3)")
    assert [d["sec"] for d in days] == [0, 0, 420]
    assert days[-1]["ideas"] == ["math:sq"]


def test_recent_is_oldest_first_and_fills_quiet_days():
    ctx = boot("progress.js")
    ctx.eval("store['vl-log'] = JSON.stringify({ '2026-03-01': { ideas: { 'math:div': 1 } }, '2026-03-03': { ideas: { 'math:eq': 2, 'math:neg': 1 } } });")
    days = call(ctx, "VLProgress.recent(4, new Date(2026, 2, 3))")
    assert [d["key"] for d in days] == ["2026-02-28", "2026-03-01", "2026-03-02", "2026-03-03"]
    assert [len(d["ideas"]) for d in days] == [0, 1, 0, 2]


def test_old_days_are_dropped_and_clear_empties_it():
    ctx = boot("progress.js")
    ctx.eval("""
      var old = {};
      for (let i = 0; i < 200; i++) old[new Date(2020, 0, 1 + i).toLocaleDateString('en-CA')] = { ideas: { 'math:add': 1 } };
      store['vl-log'] = JSON.stringify(old);
      VLProgress.mark('math:add');
    """)
    assert len(call(ctx, "VLProgress.load()")) == 120
    ctx.eval("VLProgress.clear()")
    assert call(ctx, "VLProgress.load()") == {}


def test_broken_storage_is_survivable():
    ctx = boot("progress.js")
    ctx.eval("store['vl-log'] = 'not json';")
    assert call(ctx, "VLProgress.load()") == {}
    ctx.eval("VLProgress.mark('math:add')")
    assert len(call(ctx, "VLProgress.load()")) == 1


def test_catalogue_covers_ten_grades_and_every_link_exists():
    ctx = boot("catalog.js", "arith.js")
    ideas = call(ctx, "VLCatalog.IDEAS")
    grades = call(ctx, "VLCatalog.GRADES")
    assert len(grades) == 10
    for topics in grades:
        assert len(topics) == 4
        assert topics[0][1:]  # every grade opens with something that can be played today
        for topic in topics:
            assert topic[0]
            if len(topic) > 1:
                assert topic[1] in ideas, topic
    for key, (name, href) in ideas.items():
        assert name
        page = href.split("#")[0]
        assert (WEB / page.strip("/") / "index.html").is_file(), href
    # every math cartoon is in the catalogue, and the catalogue invents none
    ops = call(ctx, "Object.keys(VLArith.OPS)")
    assert sorted(k.split(":")[1] for k in ideas if k.startswith("math:")) == sorted(ops)


def test_dsa_curriculum_is_complete_and_honest():
    ctx = boot("catalog.js")
    dsa = call(ctx, "VLCatalog.DSA")
    ideas = call(ctx, "VLCatalog.IDEAS")
    names = [t[0] for _, topics in dsa for t in topics]
    assert len(dsa) >= 8 and len(names) >= 40 and len(set(names)) == len(names)
    for track, topics in dsa:
        assert track and topics
        for t in topics:
            name, ref, nxt = (t + [None, None])[:3]
            assert name
            if ref:
                assert not nxt  # a ready topic is not "next"
                if ref.startswith("/"):
                    page, _, frag = ref.partition("#")
                    html = WEB / page.strip("/") / "index.html"
                    assert html.is_file(), ref
                    if frag:
                        assert f'id="{frag}"' in html.read_text(encoding="utf-8"), ref
                else:
                    assert ref in ideas, ref
    ready = [t for _, topics in dsa for t in topics if len(t) > 1 and t[1]]
    nxt = [t for _, topics in dsa for t in topics if len(t) > 2 and t[2]]
    assert len(ready) >= 10 and len(nxt) <= 10  # a finished curriculum has nothing left to mark "next"
    # every lesson that exists is on the map: all five sorts, both searches, both graph searches
    refs = {t[1] for t in ready}
    for want in ("sorting:bubble", "sorting:selection", "sorting:insertion", "sorting:merge", "sorting:quick",
                 "searching:linear", "searching:binary", "mazes:bfs", "mazes:dfs"):
        assert want in refs


def test_curriculum_page_has_what_the_script_needs():
    html = (WEB / "curriculum" / "index.html").read_text(encoding="utf-8")
    for i in ("curriculum", "cur-count", "cur-fill"):
        assert f'id="{i}"' in html
    assert "/assets/catalog.js" in html


# ---------- table of contents ----------

def test_toc_slugs_are_safe_and_unique():
    ctx = boot("toc.js")
    assert call(ctx, "(() => { const t = new Set(); return ['Trees', 'Trees', 'Search & order', '  Ünïcode!  ', '???'].map((x) => VLToc.slug(x, t)); })()") == [
        "trees", "trees-2", "search-and-order", "unicode", "section"]
    assert call(ctx, "VLToc.slug('Graphs', new Set(['graphs']))") == "graphs-2"  # never reuses an id already on the page


def test_toc_scroll_spy_picks_the_last_heading_passed():
    ctx = boot("toc.js")
    pick = lambda tops, line=100, bottom=False: call(ctx, f"VLToc.activeIndex({tops}, {line}, {str(bottom).lower()})")
    assert pick([300, 900, 1500]) == -1             # still above the first heading
    assert pick([40, 900, 1500]) == 0
    assert pick([-800, 60, 700]) == 1               # the heading under the line, not the one far above
    assert pick([-1500, -900, -20]) == 2
    assert pick([-800, -200, 500], 100, True) == 2  # at the bottom the last one wins, even if it never reaches the line
    assert pick([], 100, True) == -1


def test_curriculum_page_loads_the_toc_after_the_content():
    html = (WEB / "curriculum" / "index.html").read_text(encoding="utf-8")
    assert "data-toc" in html and "/assets/toc.css" in html
    assert html.index("/assets/catalog.js") < html.index("/assets/toc.js")  # headings are drawn first


# ---------- read aloud ----------

def test_read_aloud_turns_symbols_into_words():
    ctx = boot("speak.js")
    say = lambda t: call(ctx, f"VLSpeak.clean({json.dumps(t)})")
    assert say("3 × 4 = 12") == "3 times 4 = 12"
    assert say("12 ÷ 3") == "12 divided by 3"
    assert say("Home → A → School") == "Home to A to School"
    assert say("5 − 2") == "5 minus 2" and say("2 + 3") == "2 plus 3"
    assert say("At most log₂ n + 1 boxes") == "At most log base two n plus 1 boxes"
    assert say("Work: O(n²)") == "Work: order n squared"
    assert say("  plain   words  ") == "plain words"


def test_read_aloud_loads_only_where_there_is_a_player():
    for page in ("sorting", "searching", "mazes", "structures", "paths", "dp", "math/advanced"):
        html = (WEB / page / "index.html").read_text(encoding="utf-8")
        assert 'src="/assets/speak.js"' in html and 'class="knobs"' in html and 'id="note"' in html


# ---------- parents ----------

def test_diary_merge_never_double_counts_and_keeps_both_sides():
    ctx = boot("parents.js")
    a = {"2026-11-24": {"ideas": {"math:add": 2, "play:ten": 1}, "sec": 300}}
    b = {"2026-11-24": {"ideas": {"math:add": 3}, "sec": 120}, "2026-11-25": {"ideas": {"dp:coins": 1}}}
    m = call(ctx, f"VLParents.merge({json.dumps(a)}, {json.dumps(b)})")
    assert m["2026-11-24"] == {"ideas": {"math:add": 3, "play:ten": 1}, "sec": 300}
    assert m["2026-11-25"] == {"ideas": {"dp:coins": 1}}
    assert call(ctx, f"VLParents.merge({json.dumps(m)}, {json.dumps(m)})") == m  # syncing again changes nothing
    assert call(ctx, "VLParents.merge(null, {'x': 5, '2026-01-01': {'ideas': {'a': 'junk'}}})") == {"2026-01-01": {"ideas": {"a": 0}}}


def test_grown_up_gate_has_a_checkable_answer():
    ctx = boot("parents.js")
    for r in (0, 0.5, 0.99):
        g = call(ctx, f"VLParents.gate(() => {r})")
        a, b = (int(x) for x in g["text"].replace("What is ", "").replace("?", "").split(" × "))
        assert g["answer"] == a * b and 6 <= a <= 12 and 6 <= b <= 12


def test_parents_page_is_off_until_configured_and_kids_pages_load_no_firebase():
    cfg = (WEB / "assets" / "firebase-config.js").read_text(encoding="utf-8")
    assert "apiKey: ''" in cfg  # shipped switched off
    assert (WEB.parent / "firestore.rules").is_file()
    for html in WEB.rglob("*.html"):
        text = html.read_text(encoding="utf-8")
        assert "googleapis.com" not in text and "gstatic.com" not in text, html
        if html.parent.name != "parents":
            assert "parents.js" not in text and "firebase" not in text, html
    assert "gstatic.com/firebasejs" in (WEB / "assets" / "parents.js").read_text(encoding="utf-8")
