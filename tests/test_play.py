"""Checks the puzzle generators, the app manifest, and the service worker's cache list."""
import json
import math
import re
from pathlib import Path

import quickjs

WEB = Path(__file__).resolve().parent.parent / "web"


def play():
    ctx = quickjs.Context()
    ctx.eval((WEB / "assets" / "play.js").read_text(encoding="utf-8"))
    return ctx


def call(ctx, expr):
    return json.loads(ctx.eval(f"JSON.stringify({expr})"))


def test_every_set_is_five_puzzles():
    ctx = play()
    for name in ("tenSet", "balanceSet", "shareSet", "guessSet"):
        for _ in range(50):
            assert len(call(ctx, f"VLPlay.{name}()")) == 5


def test_ten_puzzles_are_distinct_and_correct():
    ctx = play()
    for _ in range(100):
        s = call(ctx, "VLPlay.tenSet()")
        assert len({p["a"] for p in s}) == 5
        assert all(1 <= p["a"] <= 9 and p["a"] + p["need"] == 10 for p in s)


def test_balance_puzzles_have_exactly_one_right_answer():
    ctx = play()
    for _ in range(200):
        for i, p in enumerate(call(ctx, "VLPlay.balanceSet()")):
            assert p["a"] + p["x"] == p["b"] and p["x"] >= 1 and p["a"] >= 1
            assert p["b"] <= (10 if i < 2 else 15 if i < 4 else 20)
            assert len(set(p["options"])) == 3 and p["x"] in p["options"]
            assert all(o >= 1 for o in p["options"])
            assert sum(1 for o in p["options"] if p["a"] + o == p["b"]) == 1


def test_share_puzzles_can_be_solved():
    ctx = play()
    for _ in range(200):
        for i, p in enumerate(call(ctx, "VLPlay.shareSet()")):
            assert p["n"] == p["k"] * p["q"] + p["r"] and 0 <= p["r"] < p["k"]
            assert (p["r"] == 0) if i < 2 else (p["r"] >= 1)  # early ones divide exactly
            fair = [p["q"]] * p["k"]
            assert call(ctx, f"VLPlay.shareSolved({json.dumps(fair)}, 0)") is True
            assert call(ctx, f"VLPlay.shareSolved({json.dumps(fair[:-1] + [fair[-1] + 1])}, 0)") is False
            assert call(ctx, f"VLPlay.shareSolved({json.dumps(fair)}, 1)") is False  # cookies still on the pile


def test_guessing_always_ends_within_par_when_halving():
    ctx = play()
    for _ in range(40):
        for p in call(ctx, "VLPlay.guessSet()"):
            assert 1 <= p["target"] <= p["max"]
            assert p["par"] == math.floor(math.log2(p["max"])) + 1
            for target in range(1, p["max"] + 1):
                lo, hi, used = 1, p["max"], 0
                while True:
                    g = (lo + hi) // 2
                    used += 1
                    r = call(ctx, f"VLPlay.narrow({lo}, {hi}, {g}, {target})")
                    if r["hit"]:
                        break
                    lo, hi = r["lo"], r["hi"]
                    assert lo <= target <= hi  # the answer is never ruled out
                assert used <= p["par"], (p, target)
            break  # one set per outer loop is plenty


def test_every_game_has_an_offline_activity():
    ctx = play()
    off = call(ctx, "VLPlay.OFFLINE")
    assert sorted(off) == ["balance", "guess", "line", "pile", "share", "ten", "towers"] and all(off.values())


def test_manifest_is_installable():
    m = json.loads((WEB / "manifest.webmanifest").read_text(encoding="utf-8"))
    assert m["name"] and m["short_name"] and m["display"] == "standalone"
    assert (WEB / m["start_url"].strip("/") / "index.html").is_file()
    sizes = {}
    for icon in m["icons"]:
        f = WEB / icon["src"].lstrip("/")
        assert f.is_file(), icon
        b = f.read_bytes()
        assert b[:8] == b"\x89PNG\r\n\x1a\n"
        w, h = int.from_bytes(b[16:20], "big"), int.from_bytes(b[20:24], "big")
        assert f"{w}x{h}" == icon["sizes"]
        sizes[icon["purpose"]] = max(sizes.get(icon["purpose"], 0), w)
    assert sizes.get("any", 0) >= 512 and sizes.get("maskable", 0) >= 512
    assert (WEB / "icons" / "apple-touch-icon.png").is_file()
    for sc in m["shortcuts"]:
        assert sc["url"].startswith("/play/#")


def test_service_worker_only_caches_files_that_exist():
    sw = (WEB / "sw.js").read_text(encoding="utf-8")
    core = re.search(r"const CORE = \[(.*?)\];", sw, re.S).group(1)
    for path in re.findall(r"'(/[^']*)'", core):
        f = WEB / path.strip("/")
        assert f.is_file() or (f / "index.html").is_file(), path


def test_play_page_has_what_the_script_needs():
    html = (WEB / "play" / "index.html").read_text(encoding="utf-8")
    js = (WEB / "assets" / "play.js").read_text(encoding="utf-8")
    ids = set(re.findall(r"\$\('([a-z-]+)'\)", js))
    for i in ids:
        assert f'id="{i}"' in html, i
    assert 'rel="manifest"' in html and 'viewport-fit=cover' in html
    for game in ("ten", "balance", "share", "guess", "line", "pile", "towers"):
        assert f'data-game="{game}"' in html


def test_queue_serves_the_longest_waiter_and_stack_the_newest():
    ctx = play()
    ops = [{"t": "out"}, {"t": "in", "c": 3}]
    q = call(ctx, f"VLPlay.runContainer('queue', [0, 1, 2], {json.dumps(ops)})")
    s = call(ctx, f"VLPlay.runContainer('stack', [0, 1, 2], {json.dumps(ops)})")
    assert q == {"final": [1, 2, 3], "out": [0], "answer": 1}
    assert s == {"final": [0, 1, 3], "out": [2], "answer": 3}


def test_container_puzzles_are_well_formed():
    ctx = play()
    for mode in ("queue", "stack"):
        for _ in range(150):
            for i, p in enumerate(call(ctx, f"VLPlay.containerSet('{mode}')")):
                assert p["mode"] == mode and len(p["start"]) == 3 and len(p["ops"]) == 2 + (i >> 1)
                coloured = p["start"] + [o["c"] for o in p["ops"] if o["t"] == "in"]
                assert len(set(coloured)) == len(coloured) and all(0 <= c <= 4 for c in coloured)
                assert any(o["t"] == "in" for o in p["ops"]) and any(o["t"] == "out" for o in p["ops"])
                r = call(ctx, f"VLPlay.runContainer('{mode}', {json.dumps(p['start'])}, {json.dumps(p['ops'])})")
                assert r["answer"] == p["answer"] and r["final"] == p["final"] and len(r["final"]) >= 2
                assert p["answer"] in coloured


def test_hanoi_solution_is_legal_and_shortest():
    ctx = play()
    for n in range(1, 7):
        moves = call(ctx, f"VLPlay.hanoiMoves({n})")
        assert len(moves) == 2 ** n - 1
        pegs = call(ctx, f"VLPlay.hanoiStart({n})")
        for a, b in moves:
            assert call(ctx, f"VLPlay.hanoiLegal({json.dumps(pegs)}, {a}, {b})") is True
            pegs[b].append(pegs[a].pop())
        assert call(ctx, f"VLPlay.hanoiSolved({json.dumps(pegs)}, {n})") is True
    assert [p["n"] for p in call(ctx, "VLPlay.towersSet()")] == [2, 3, 3, 4, 4]


def test_hanoi_rejects_bad_moves():
    ctx = play()
    pegs = json.dumps([[3, 2], [1], []])
    assert call(ctx, f"VLPlay.hanoiLegal({pegs}, 0, 1)") is False   # big on small
    assert call(ctx, f"VLPlay.hanoiLegal({pegs}, 1, 0)") is True
    assert call(ctx, f"VLPlay.hanoiLegal({pegs}, 2, 0)") is False   # nothing to lift
    assert call(ctx, f"VLPlay.hanoiLegal({pegs}, 0, 0)") is False   # same peg
