"""Checks the on-device diary (progress.js) and the grade catalogue (catalog.js)."""
import json
import re
from pathlib import Path

import quickjs

ASSETS = Path(__file__).resolve().parent.parent / "web" / "assets"
WEB = ASSETS.parent
FAKE_STORE = "var store = {}; var localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };"


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


def test_grown_up_gate_asks_something_a_child_cannot_just_guess():
    ctx = boot("parents.js")
    seen = set()
    for r in [0.0, 0.2, 0.49, 0.5, 0.7, 0.99]:
        g = call(ctx, f"VLParents.gate((() => {{ let i = 0; const seq = [{r}, 0.3, 0.6, 0.9]; return () => seq[i++ % 4]; }})())")
        seen.add(g["kind"])
        if g["kind"] == "sum":
            a, b, c = (int(x) for x in re.search(r"\((\d+) × (\d+)\) \+ (\d+)", g["text"]).groups())
            assert g["answer"] == a * b + c and 13 <= a <= 19 and 12 <= b <= 19 and g["answer"] >= 167  # too big to guess, hard to do in a young head
        else:
            n = g["answer"]
            assert 101 <= n <= 999 and call(ctx, f"VLParents.words({n})") in g["text"]
    assert seen == {"sum", "words"}


def test_numbers_are_spelled_correctly():
    ctx = boot("parents.js")
    want = {0: "zero", 7: "seven", 13: "thirteen", 20: "twenty", 42: "forty-two", 100: "one hundred", 101: "one hundred and one", 340: "three hundred and forty",
            347: "three hundred and forty-seven", 815: "eight hundred and fifteen", 999: "nine hundred and ninety-nine"}
    for n, w in want.items():
        assert call(ctx, f"VLParents.words({n})") == w
    all_words = [call(ctx, f"VLParents.words({n})") for n in range(0, 1000)]
    assert len(set(all_words)) == 1000  # no two numbers share a spelling


def test_wrong_guesses_lock_the_check_and_a_pass_is_remembered():
    ctx = boot("parents.js")
    step = lambda st, right, now: call(ctx, f"VLParents.afterAnswer({json.dumps(st)}, {str(right).lower()}, {now})")
    status = lambda st, now: call(ctx, f"VLParents.gateStatus({json.dumps(st)}, {now})")
    st = {}
    st = step(st, False, 1000)
    st = step(st, False, 2000)
    assert not status(st, 2500)["locked"]  # two misses are forgiven
    st = step(st, False, 3000)
    s = status(st, 3500)
    assert s["locked"] and s["wait"] == 60 and not s["passed"]  # the third locks for a minute
    assert status(st, 3000 + 59_000)["locked"] and not status(st, 3000 + 61_000)["locked"]
    ok = step({"fails": 2}, True, 10_000)
    assert ok == {"fails": 0, "okAt": 10_000}
    assert status(ok, 10_000 + 19 * 60_000)["passed"] and not status(ok, 10_000 + 21 * 60_000)["passed"]  # the pass lasts the visit
    assert status({}, 5) == {"passed": False, "locked": False, "wait": 0} and status(None, 5)["passed"] is False


def test_email_addresses_are_checked_before_asking_for_a_link():
    ctx = boot("parents.js")
    good = ["a@b.co", "parent.name+tag@example.com", "x_y@sub.domain.org"]
    bad = ["", "nope", "a@b", "a b@c.com", "@x.com", "a@.com", "a@b.c", "a@@b.com", "x" * 250 + "@b.com", None]
    for e in good:
        assert call(ctx, f"VLParents.isEmail({json.dumps(e)})") is True, e
    for e in bad:
        assert call(ctx, f"VLParents.isEmail({json.dumps(e)})") is False, e


def test_parent_sign_in_is_fully_configured_and_kids_pages_load_no_firebase():
    import re
    cfg = (WEB / "assets" / "firebase-config.js").read_text(encoding="utf-8")
    vals = dict(re.findall(r"(apiKey|authDomain|projectId|appId): '([^']*)'", cfg))
    assert set(vals) == {"apiKey", "authDomain", "projectId", "appId"}
    assert all(vals.values()) or not any(vals.values()), "fill in all four values, or none"  # half a config would break sign-in
    if vals["projectId"]:
        assert vals["authDomain"].startswith(vals["projectId"]) and vals["appId"].startswith("1:")
    assert "measurementId" not in cfg and "analytics" not in cfg.lower()  # this site promises no tracking
    assert (WEB.parent / "firestore.rules").is_file()
    for html in WEB.rglob("*.html"):
        text = html.read_text(encoding="utf-8")
        assert "googleapis.com" not in text and "gstatic.com" not in text, html
        if html.parent.name != "parents":
            assert "parents.js" not in text and "firebase" not in text, html
    assert "gstatic.com/firebasejs" in (WEB / "assets" / "parents.js").read_text(encoding="utf-8")


# ---------- profiles (sign-up) ----------

def signup(ctx, name, color="null"):
    return call(ctx, f"VLProgress.signUp({json.dumps(name)}, {color})")


def test_nickname_rules_keep_real_details_out():
    ctx = boot("progress.js")
    bad = {"": "Pick", "   ": "Pick", "abcdefghijklmn": "12", "a@b.com": "letters", "<script>": "letters", "0412345678": "numbers", "Nova!": "letters"}
    for name, why in bad.items():
        r = signup(ctx, name)
        assert r["ok"] is False and why.lower() in r["why"].lower(), (name, r)
    for name in ["Nova", "  Ava   Mae ", "Zoë", "李雷", "Jo-Jo", "O'Neil", "Max 7"]:
        assert call(ctx, f"VLProgress.checkName({json.dumps(name)})")["ok"], name
    assert call(ctx, "VLProgress.checkName('  Ava   Mae ')")["name"] == "Ava Mae"  # tidy spacing
    assert call(ctx, "VLProgress.profiles()") == []  # nothing was created by the rejects


def test_sign_up_creates_an_active_profile_with_its_own_diary():
    ctx = boot("progress.js")
    ctx.eval("VLProgress.mark('math:add');")  # a diary from before profiles existed
    r = signup(ctx, "Nova", "'#5be3b0'")
    assert r["ok"] and r["profile"]["name"] == "Nova" and r["profile"]["color"] == "#5be3b0"
    assert call(ctx, "VLProgress.active().name") == "Nova"
    assert call(ctx, "VLProgress.everMet()") == ["math:add"]  # the first profile adopts the old diary
    assert "vl-log" not in call(ctx, "Object.keys(store)")  # and the shared key is gone
    ctx.eval("VLProgress.mark('trees:heap');")
    assert sorted(call(ctx, "VLProgress.everMet()")) == ["math:add", "trees:heap"]


def test_profiles_never_see_each_others_diaries():
    ctx = boot("progress.js")
    a = signup(ctx, "Ava")["profile"]
    ctx.eval("VLProgress.mark('play:ten');")
    b = signup(ctx, "Ben")["profile"]
    assert call(ctx, "VLProgress.everMet()") == []  # Ben starts fresh
    ctx.eval("VLProgress.mark('graphs:topo');")
    assert call(ctx, "VLProgress.everMet()") == ["graphs:topo"]
    assert call(ctx, f"VLProgress.switchTo('{a['id']}')") is True
    assert call(ctx, "VLProgress.everMet()") == ["play:ten"]
    assert call(ctx, "VLProgress.switchTo('nobody')") is False
    assert call(ctx, "VLProgress.active().name") == "Ava"
    assert b["id"] != a["id"]


def test_duplicate_names_the_limit_and_removal():
    ctx = boot("progress.js")
    assert signup(ctx, "Ava")["ok"]
    assert "already" in signup(ctx, "ava")["why"]  # not case-sensitive
    for n in ["Ben", "Cy", "Di", "Ed"]:
        assert signup(ctx, n)["ok"]
    assert "5 profiles" in signup(ctx, "Flo")["why"]
    me = call(ctx, "VLProgress.active().id")
    ctx.eval("VLProgress.mark('math:pi');")
    assert call(ctx, f"VLProgress.remove('{me}')") is True
    assert not any(k.endswith(me) for k in call(ctx, "Object.keys(store)") if k.startswith("vl-log:"))  # the diary went with them
    assert call(ctx, "VLProgress.active().name") == "Ava"  # falls back to someone who is still here
    assert call(ctx, "VLProgress.remove('nobody')") is False


def test_a_broken_profile_list_is_survivable():
    ctx = boot("progress.js")
    ctx.eval("store['vl-profiles'] = '{not json'; store['vl-active'] = 'x';")
    assert call(ctx, "VLProgress.profiles()") == [] and call(ctx, "VLProgress.active()") is None
    ctx.eval("VLProgress.mark('math:add');")  # still works, in the shared diary
    assert call(ctx, "VLProgress.everMet()") == ["math:add"]
    assert signup(ctx, "Nova")["ok"]


# ---------- the end-of-lesson card ----------

def test_finish_card_text():
    ctx = boot("finish.js")
    idea = lambda b: call(ctx, f"VLFinish.idea({json.dumps(b)})")
    assert idea("Open the middle box. Each box you open throws away half.") == "Open the middle box."
    assert idea("No full stop here") == "No full stop here" and idea("") == ""
    assert idea("A. B.") == "A."
    prog = lambda n, m, t: call(ctx, f"VLFinish.progressLine({json.dumps(n)}, {m}, {t})")
    assert prog("Nova", 12, 108) == "Nova, you have explored 12 of 108 ideas on this device."
    assert prog(None, 0, 108) == "You have explored 0 of 108 ideas on this device."
    assert "every idea" in prog("Nova", 108, 108)
    btns = [{"key": k, "name": k.upper(), "pressed": i == 1} for i, k in enumerate("abc")]
    assert call(ctx, f"VLFinish.nextLesson({json.dumps(btns)})")["key"] == "c"
    btns[1]["pressed"], btns[2]["pressed"] = False, True
    assert call(ctx, f"VLFinish.nextLesson({json.dumps(btns)})") is None  # the last lesson on a page points to the roadmap


def test_every_pages_with_a_lesson_gets_the_card_and_the_profile_chip():
    for page in WEB.rglob("*.html"):
        html = page.read_text(encoding="utf-8")
        if page.name.startswith("_"):
            continue
        assert "/assets/profile.js" in html, page
        assert html.index("/assets/progress.js") < html.index("/assets/profile.js"), page
        if 'id="done"' in html and 'id="algos"' in html:
            assert "/assets/finish.js" in html and "/assets/catalog.js" in html, page


def test_the_diary_page_has_the_sign_up_form():
    html = (WEB / "progress" / "index.html").read_text(encoding="utf-8")
    for i in ("people", "join", "nick", "swatches", "join-msg", "add-person", "greet"):
        assert f'id="{i}"' in html, i


# ---------- keep a copy: export and import ----------

def imp(ctx, text):
    return call(ctx, f"VLProgress.importText({json.dumps(text)})")


def make_file(people, **over):
    d = {"app": "visualearn", "version": 1, "exported": "2026-11-26", "people": people}
    d.update(over)
    return json.dumps(d)


def test_export_holds_everyone_and_round_trips_exactly():
    ctx = boot("progress.js")
    signup(ctx, "Ava", "'#ff9ec7'")
    ctx.eval("VLProgress.mark('play:ten'); VLProgress.mark('play:ten');")
    signup(ctx, "Ben")
    ctx.eval("VLProgress.mark('graphs:topo');")
    d = call(ctx, "VLProgress.exportData()")
    assert d["app"] == "visualearn" and d["version"] == 1 and [p["name"] for p in d["people"]] == ["Ava", "Ben"]
    assert d["people"][0]["color"] == "#ff9ec7"
    text = ctx.eval("VLProgress.exportText()")
    other = boot("progress.js")  # a brand new device
    r = imp(other, text)
    assert r == {"ok": True, "added": 2, "merged": 0}
    assert call(other, "VLProgress.exportData()")["people"] == d["people"]  # nothing lost or changed
    assert call(other, "VLProgress.active().name") == "Ava"


def test_a_device_with_no_profiles_exports_its_diary_as_one_person():
    ctx = boot("progress.js")
    ctx.eval("VLProgress.mark('math:add');")
    d = call(ctx, "VLProgress.exportData()")
    assert len(d["people"]) == 1 and d["people"][0]["name"] == "Me" and list(d["people"][0]["log"].values())[0]["ideas"] == {"math:add": 1}


def test_loading_a_file_twice_never_double_counts_and_keeps_both_sides():
    ctx = boot("progress.js")
    signup(ctx, "Ava")
    ctx.eval("VLProgress.mark('play:ten'); VLProgress.mark('play:ten');")
    mine = call(ctx, "VLProgress.everMet()")
    f = make_file([{"name": "ava", "color": "#ffd93d", "log": {"2026-01-05": {"ideas": {"graphs:flow": 2}, "sec": 300}, "2026-01-06": {"ideas": {"play:ten": 1}}}}])
    r = imp(ctx, f)
    assert r["ok"] and r["merged"] == 1 and r["added"] == 0  # the same nickname merges, in any capitals
    again = imp(ctx, f)
    assert again["ok"]
    log = call(ctx, "VLProgress.load()")
    assert log["2026-01-05"] == {"ideas": {"graphs:flow": 2}, "sec": 300}  # not 4
    assert sorted(call(ctx, "VLProgress.everMet()")) == sorted(set(mine) | {"graphs:flow"})
    assert call(ctx, "VLProgress.profiles()").__len__() == 1


def test_the_first_profile_made_by_a_file_keeps_the_old_shared_diary():
    ctx = boot("progress.js")
    ctx.eval("VLProgress.mark('math:pi');")  # a diary from before profiles
    r = imp(ctx, make_file([{"name": "Nova", "log": {"2026-02-02": {"ideas": {"dp:grid": 1}}}}]))
    assert r["ok"] and r["added"] == 1
    assert sorted(call(ctx, "VLProgress.everMet()")) == ["dp:grid", "math:pi"]
    assert "vl-log" not in call(ctx, "Object.keys(store)")


def test_bad_hostile_or_oversized_files_are_refused_and_change_nothing():
    ctx = boot("progress.js")
    signup(ctx, "Ava")
    before = call(ctx, "JSON.stringify(store)")
    person = {"name": "Zed", "log": {}}
    cases = {
        "": "empty", "   ": "empty", "not json": "does not look", "[]": "does not look", "{}": "does not look",
        make_file([person], app="other"): "does not look", make_file([person], version=2): "does not look", make_file([]): "does not look",
        make_file([{"name": "a@b.com", "log": {}}]): "not allowed", make_file([{"name": "<img src=x>", "log": {}}]): "not allowed",
        make_file([{"name": "", "log": {}}]): "not allowed", make_file([{"name": "Averyveryverylongname", "log": {}}]): "not allowed",
        make_file([{"name": f"P{i}", "log": {}} for i in range(6)]): "at most 5",
        "x" * 300_001: "too big",
    }
    for text, why in cases.items():
        r = imp(ctx, text)
        assert r["ok"] is False and why in r["why"], (text[:40], r)
    assert call(ctx, "JSON.stringify(store)") == before


def test_loading_cleans_the_diary_so_a_file_cannot_smuggle_junk_in():
    ctx = boot("progress.js")
    junk = {"2026-03-03": {"ideas": {"graphs:flow": 5, "../../etc:passwd": 2, "<script>": 1, "play:ten": -3, "math:add": "lots", "dp:grid": 99999999}, "sec": 10**9},
            "yesterday": {"ideas": {"graphs:flow": 1}}, "2026-03-04": "nope", "2026-03-05": {"ideas": {}}}
    r = imp(ctx, make_file([{"name": "Nova", "color": "javascript:alert(1)", "log": junk}]))
    assert r["ok"]
    assert call(ctx, "VLProgress.active().color") in call(ctx, "VLProgress.COLORS")  # an unknown colour is replaced, never kept
    log = call(ctx, "VLProgress.load()")
    assert log == {"2026-03-03": {"ideas": {"graphs:flow": 5, "dp:grid": 1000}}}  # one clean day; huge counts capped; no absurd minutes


def test_the_limit_of_five_people_applies_to_loading_too():
    ctx = boot("progress.js")
    for n in ["Ava", "Ben", "Cy", "Di"]:
        assert signup(ctx, n)["ok"]
    r = imp(ctx, make_file([{"name": "Ed", "log": {}}, {"name": "Flo", "log": {}}]))
    assert r["ok"] is False and "5 people" in r["why"] and r["added"] == 1  # Ed fits, Flo does not: the user is told
    assert len(call(ctx, "VLProgress.profiles()")) == 5


def test_diary_merging_is_identical_for_files_and_for_cloud_sync():
    both = boot("progress.js", "parents.js")
    a = {"2026-11-24": {"ideas": {"math:add": 2, "play:ten": 1}, "sec": 300}}
    b = {"2026-11-24": {"ideas": {"math:add": 3}, "sec": 120}, "2026-11-25": {"ideas": {"dp:coins": 1}}}
    args = f"{json.dumps(a)}, {json.dumps(b)}"
    assert call(both, f"VLProgress.mergeLogs({args})") == call(both, f"VLParents.merge({args})")
    assert call(both, f"VLProgress.mergeLogs({json.dumps(b)}, {json.dumps(a)})") == call(both, f"VLProgress.mergeLogs({args})")  # order does not matter


def test_the_diary_page_has_save_and_load():
    html = (WEB / "progress" / "index.html").read_text(encoding="utf-8")
    for i in ("save-file", "load-file", "copy-msg"):
        assert f'id="{i}"' in html, i
    assert 'accept="application/json,.json"' in html
