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
    assert len(ready) >= 10 and 4 <= len(nxt) <= 10
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
