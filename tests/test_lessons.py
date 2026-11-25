"""Checks the searching, mazes and math lessons by running their JavaScript in an embedded engine."""
import json
import math
import random
from collections import deque
from pathlib import Path

import pytest
import quickjs

ASSETS = Path(__file__).resolve().parent.parent / "web" / "assets"


def load(*names):
    ctx = quickjs.Context()
    for name in names:
        ctx.eval((ASSETS / name).read_text(encoding="utf-8"))
    return ctx


def call(ctx, expr):
    return json.loads(ctx.eval(f"JSON.stringify({expr})"))


def check_question(q):
    assert q["text"] and q["why"]
    assert 2 <= len(q["options"]) <= 4
    assert 0 <= q["answer"] < len(q["options"])
    assert len(set(q["options"])) == len(q["options"])


def check_frames(fr, n_lines):
    assert len(fr) >= 3
    for f in fr:
        assert f["note"]
        assert -1 <= f["line"] < n_lines, f
        if f["q"]:
            check_question(f["q"])
    assert fr[0]["q"] is None  # the first frame never asks: the player shows it on load
    assert fr[-1]["q"] is None


def check_offline(o):
    assert o["title"] and o["need"] and o["time"] and o["think"]
    assert 3 <= len(o["steps"]) <= 6


# ---------- searching ----------

@pytest.fixture(scope="module")
def search():
    return load("search.js")


def run_search(ctx, key, a, t):
    return call(ctx, f"VLSearch.record({json.dumps(key)}, {json.dumps(a)}, {t})")


@pytest.mark.parametrize("key", ["linear", "binary"])
def test_search_finds_every_value_and_rejects_missing(search, key):
    rng = random.Random(11)
    for n in (1, 2, 7, 15, 31, 63):
        a = sorted(rng.sample(range(1, 100), n))
        for t in a:
            fr = run_search(search, key, a, t)
            assert fr[-1]["found"] == a.index(t)
        missing = next(v for v in range(1, 100) if v not in a)
        fr = run_search(search, key, a, missing)
        assert fr[-1]["found"] == -1
        check_frames(fr, len(call(search, f"VLSearch.ALGOS.{key}.code")))


def test_linear_opens_boxes_in_order(search):
    a = [3, 8, 15, 21, 40, 52, 77]
    fr = run_search(search, "linear", a, 40)
    assert fr[-1]["c"] == 5
    assert fr[-1]["open"] == [0, 1, 2, 3, 4]
    assert run_search(search, "linear", a, 9)[-1]["c"] == len(a)


def test_binary_never_opens_more_than_log_n_plus_one(search):
    rng = random.Random(12)
    for n in (7, 15, 31, 63):
        a = sorted(rng.sample(range(1, 100), n))
        limit = int(math.log2(n)) + 1
        assert call(search, f"VLSearch.most({n})") == limit
        for t in list(a) + [v for v in range(1, 100) if v not in a][:10]:
            assert run_search(search, "binary", a, t)[-1]["c"] <= limit


def test_binary_question_matches_the_half_kept(search):
    rng = random.Random(13)
    for _ in range(30):
        a = sorted(rng.sample(range(1, 100), 15))
        t = rng.randint(1, 99)
        fr = run_search(search, "binary", a, t)
        for f, nxt in zip(fr, fr[1:]):
            if f["q"] and f["cur"] >= 0:
                went_right = nxt["lo"] > f["lo"]
                assert (f["q"]["answer"] == 1) == went_right
                assert a[f["cur"]] != t


def test_start_question_answers_are_true(search):
    a = list(range(1, 16))
    lin = run_search(search, "linear", a, 99)
    q = lin[1]["q"]
    assert int(q["options"][q["answer"]]) == lin[-1]["c"]  # missing: every box opened
    q = run_search(search, "binary", a, 99)[1]["q"]
    assert int(q["options"][q["answer"]]) == 4


def test_make_boxes(search):
    for n in (7, 15, 31, 63):
        a = call(search, f"VLSearch.makeBoxes({n})")
        assert len(a) == n == len(set(a))
        assert a == sorted(a) and all(1 <= v <= 99 for v in a)


# ---------- mazes ----------

@pytest.fixture(scope="module")
def graph():
    return load("graph.js")


def py_shortest(rows, cols, walls):
    walls = set(walls)
    goal = rows * cols - 1
    dist = {0: 0}
    q = deque([0])
    while q:
        cur = q.popleft()
        r, c = divmod(cur, cols)
        for nr, nc in ((r - 1, c), (r, c - 1), (r + 1, c), (r, c + 1)):
            n = nr * cols + nc
            if 0 <= nr < rows and 0 <= nc < cols and n not in walls and n not in dist:
                dist[n] = dist[cur] + 1
                q.append(n)
    return dist.get(goal, -1)


def mazes(count, seed):
    rng = random.Random(seed)
    out = []
    while len(out) < count:
        rows, cols = rng.choice([(5, 7), (7, 11), (9, 15)])
        walls = [i for i in range(1, rows * cols - 1) if rng.random() < 0.3]
        if py_shortest(rows, cols, walls) > 0:
            out.append({"rows": rows, "cols": cols, "walls": walls})
    return out


def run_maze(ctx, key, maze):
    return call(ctx, f"VLGraph.record({json.dumps(key)}, {json.dumps(maze)})")


def check_route(maze, path):
    rows, cols, walls = maze["rows"], maze["cols"], set(maze["walls"])
    assert path[0] == 0 and path[-1] == rows * cols - 1
    assert not walls & set(path)
    assert len(set(path)) == len(path)
    for p, q in zip(path, path[1:]):
        (r1, c1), (r2, c2) = divmod(p, cols), divmod(q, cols)
        assert abs(r1 - r2) + abs(c1 - c2) == 1


@pytest.mark.parametrize("key", ["bfs", "dfs"])
def test_maze_finds_a_valid_route(graph, key):
    n_lines = len(call(graph, f"VLGraph.ALGOS.{key}.code"))
    for maze in mazes(25, 21):
        fr = run_maze(graph, key, maze)
        check_frames(fr, n_lines)
        path = fr[-1]["path"]
        check_route(maze, path)
        best = py_shortest(maze["rows"], maze["cols"], maze["walls"])
        if key == "bfs":
            assert len(path) - 1 == best
        else:
            assert len(path) - 1 >= best
        assert call(graph, f"VLGraph.shortest({json.dumps(maze)})") == best


@pytest.mark.parametrize("key", ["bfs", "dfs"])
def test_maze_questions_tell_the_truth(graph, key):
    for maze in mazes(10, 22):
        fr = run_maze(graph, key, maze)
        for i, f in enumerate(fr):
            q = f["q"]
            if not q:
                continue
            if q["options"] == ["0", "1", "2", "3"]:
                # the frame after the question shows the squares that joined
                joined = len(fr[i + 1]["frontier"]) - len(f["frontier"])
                assert q["answer"] == joined
            else:
                taken = fr[i + 1]["cur"]
                expected = f["frontier"][0] if key == "bfs" else f["frontier"][-1]
                assert taken == expected
                assert int(q["options"][q["answer"]]) == f["frontier"].index(taken) + 1


def test_maze_with_no_way_through(graph):
    maze = {"rows": 3, "cols": 3, "walls": [1, 3, 4]}
    fr = run_maze(graph, "bfs", maze)
    assert fr[-1]["path"] == [] and "no way" in fr[-1]["note"]


def test_make_maze_always_has_a_route(graph):
    for shape in ("small", "medium", "big"):
        for _ in range(10):
            m = call(graph, f"VLGraph.makeMaze({json.dumps(shape)})")
            assert py_shortest(m["rows"], m["cols"], m["walls"]) > 0


# ---------- math ----------

@pytest.fixture(scope="module")
def maths():
    return load("math.js")


def py_primes(n):
    return [k for k in range(2, n + 1) if all(k % d for d in range(2, int(k ** 0.5) + 1))]


@pytest.mark.parametrize("n", [2, 10, 30, 60, 100])
def test_sieve_finds_exactly_the_primes(maths, n):
    fr = call(maths, f"VLMath.recordSieve({n})")
    check_frames(fr, len(call(maths, "VLMath.ALGOS.sieve.code")))
    assert sorted(fr[-1]["primes"]) == py_primes(n)
    assert not set(fr[-1]["primes"]) & set(fr[-1]["crossed"])


def test_sieve_first_cross_out_is_p_squared(maths):
    fr = call(maths, "VLMath.recordSieve(100)")
    for i, f in enumerate(fr):
        q = f["q"]
        if q and q["options"] != ["Yes", "No"]:
            assert int(q["options"][q["answer"]]) == fr[i + 1]["hit"] == f["p"] ** 2
    assert fr[-2]["q"]["answer"] == 1  # "Is anything left to cross out?" No.


def test_sieve_never_crosses_out_a_prime(maths):
    fr = call(maths, "VLMath.recordSieve(100)")
    primes = set(py_primes(100))
    for f in fr:
        assert not primes & set(f["crossed"])


@pytest.mark.parametrize("a,b", [(21, 13), (48, 18), (60, 24), (7, 7), (1, 60), (60, 1), (13, 21), (59, 58), (36, 60)])
def test_euclid_gcd_and_tiling(maths, a, b):
    fr = call(maths, f"VLMath.recordEuclid({a}, {b})")
    check_frames(fr, len(call(maths, "VLMath.ALGOS.euclid.code")))
    last = fr[-1]
    g = math.gcd(a, b)
    assert f"is {g}." in last["note"]
    w, h = max(a, b), min(a, b)
    assert sum(s * s for _, _, s, _ in last["squares"]) == w * h  # the squares fill the rectangle
    for x, y, s, _ in last["squares"]:
        assert 0 <= x and x + s <= w and 0 <= y and y + s <= h
    assert min(s for _, _, s, _ in last["squares"]) == g


def test_euclid_question_counts_the_squares(maths):
    fr = call(maths, "VLMath.recordEuclid(45, 27)")
    asked = [f for f in fr if f["q"]]
    assert len(asked) == fr[-1]["c"]  # one question per round
    for f in asked:
        cut = sum(1 for sq in fr[-1]["squares"] if sq[3] == f["c"])  # squares cut in this round
        assert int(f["q"]["options"][f["q"]["answer"]]) == cut


# ---------- all lessons ----------

@pytest.mark.parametrize("glob,keys", [("VLSearch", ["linear", "binary"]), ("VLGraph", ["bfs", "dfs"]), ("VLMath", ["sieve", "euclid"])])
def test_every_algorithm_has_a_full_lesson(glob, keys):
    ctx = load("search.js", "graph.js", "math.js")
    algos = call(ctx, f"{glob}.ALGOS")
    assert list(algos) == keys
    for al in algos.values():
        assert al["name"] and al["blurb"] and al["code"]
        assert len(al["facts"]) == 3 and all(len(p) == 2 for p in al["facts"])
        check_offline(al["offline"])


# ---------- arithmetic playground ----------

@pytest.fixture(scope="module")
def arith():
    return load("arith.js")


def test_make_ten_never_loses_a_cookie(arith):
    for a in range(1, 10):
        for b in range(1, 10):
            m = call(arith, f"VLArith.makeTen({a}, {b})")
            assert m["first"] + m["second"] == m["sum"] == a + b
            assert m["first"] <= 10 and m["second"] >= 0 and m["moved"] >= 0
            if a + b >= 10:
                assert m["first"] == 10  # the first frame is filled before anything is counted


def test_skip_counting_ends_at_the_product(arith):
    for a in range(1, 10):
        for b in range(1, 10):
            s = call(arith, f"VLArith.skip({a}, {b})")
            assert len(s) == b and s[-1] == a * b
            assert all(y - x == a for x, y in zip(s, s[1:]))


def test_sharing_is_fair(arith):
    for a in range(1, 21):
        for b in range(1, 6):
            s = call(arith, f"VLArith.share({a}, {b})")
            assert (s["q"], s["r"]) == divmod(a, b)
            assert [s["order"].count(j) for j in range(b)] == [s["q"]] * b  # everyone gets the same


def test_answers_and_ranges(arith):
    ops = call(arith, "VLArith.OPS")
    assert list(ops)[:4] == ["add", "sub", "mul", "div"]
    for key, o in ops.items():
        assert o["off"] and (o.get("sym") or o.get("pre") or o.get("post"))
        for lo, hi, start in [r for r in (o["a"], o["b"]) if r]:
            assert lo <= start <= hi
    assert call(arith, "VLArith.answer('add', 8, 5)") == 13
    assert call(arith, "VLArith.answer('sub', 9, 4)") == 5
    assert call(arith, "VLArith.answer('mul', 4, 3)") == 12
    assert call(arith, "VLArith.answer('div', 14, 3)") == 4


def test_regrouping_keeps_the_total(arith):
    for a in range(10, 50):
        for b in range(10, 50):
            r = call(arith, f"VLArith.regroup({a}, {b})")
            assert r["tens"] * 10 + r["ones"] == r["sum"] == a + b
            assert 0 <= r["ones"] <= 9
            assert r["carry"] == (1 if a % 10 + b % 10 >= 10 else 0)
            assert r["first"] == (10 - a % 10 if r["carry"] else b % 10)


def test_simplify_gives_lowest_terms(arith):
    for d in range(2, 13):
        for n in range(1, d + 1):
            s = call(arith, f"VLArith.simplify({n}, {d})")
            assert math.gcd(s["n"], s["d"]) == 1 and s["g"] == math.gcd(n, d)
            assert s["n"] * d == n * s["d"]  # same amount of pizza


def test_powers_and_fibonacci(arith):
    assert call(arith, "VLArith.powers(2, 6)") == [1, 2, 4, 8, 16, 32, 64]
    assert call(arith, "VLArith.powers(3, 4)") == [1, 3, 9, 27, 81]
    assert call(arith, "VLArith.fib(10)") == [1, 1, 2, 3, 5, 8, 13, 21, 34, 55]
    assert call(arith, "VLArith.fib(1)") == [1]


def test_every_cartoon_stays_inside_what_it_can_draw(arith):
    ops = call(arith, "VLArith.OPS")
    assert len(ops) == 14
    for key, o in ops.items():
        for a in range(-2, 60):
            for b in range(-2, 25):
                ca, cb = call(arith, f"VLArith.clamp('{key}', {a}, {b})")
                assert o["a"][0] <= ca <= o["a"][1]
                if key == "sub":
                    assert cb <= ca
                if key == "neg":
                    assert -10 <= ca - cb
                if key == "frac":
                    assert 1 <= ca <= cb
                if key == "pow":
                    assert ca ** cb <= 81
    assert call(arith, "VLArith.answer('neg', 5, 8)") == -3
    assert call(arith, "VLArith.answer('frac', 4, 8)") == "1/2"
    assert call(arith, "VLArith.answer('frac', 6, 6)") == "1"
    assert call(arith, "VLArith.answer('pow', 2, 5)") == 32
    assert call(arith, "VLArith.answer('pi', 2, 0)") == "6.28"
    assert call(arith, "VLArith.answer('fib', 7, 0)") == 13
    assert call(arith, "VLArith.answer('big', 27, 15)") == 42


def test_percent_squares_balance_and_pythagoras(arith):
    assert call(arith, "VLArith.layers(5)") == [1, 3, 5, 7, 9]
    for a in range(1, 10):
        assert sum(call(arith, f"VLArith.layers({a})")) == a * a  # layers of odd numbers build the square
        assert call(arith, f"VLArith.answer('sq', {a}, 0)") == a * a
    assert call(arith, "VLArith.answer('pct', 35, 0)") == "0.35"
    assert call(arith, "VLArith.answer('eq', 3, 8)") == 5
    assert call(arith, "VLArith.answer('pyth', 3, 4)") == 25
    for a in range(1, 9):
        for b in range(1, 9):
            ca, cb = call(arith, f"VLArith.clamp('eq', {a}, {b})")
            assert cb >= ca  # x is never negative


# ---------- structures, shortest paths, dynamic programming ----------

@pytest.fixture(scope="module")
def structs():
    return load("structures.js")


def lesson_ok(ctx, glob, key, frames):
    al = call(ctx, f"{glob}.ALGOS.{key}")
    assert al["name"] and al["blurb"] and len(al["facts"]) == 3
    check_offline(al["offline"])
    check_frames(frames, len(al["code"]))


def test_array_insert_shifts_the_right_numbers(structs):
    rng = random.Random(31)
    for _ in range(30):
        a = rng.sample(range(10, 99), 5)
        val = next(v for v in range(10, 99) if v not in a)
        pos, read = rng.randint(0, 2), rng.randint(0, 4)
        inp = {"a": a, "val": val, "pos": pos, "read": read}
        fr = call(structs, f"VLStructures.record('array', {json.dumps(inp)})")
        lesson_ok(structs, "VLStructures", "array", fr)
        want = a[:pos] + [val] + a[pos:] + [None] * 2
        assert fr[-1]["cells"] == want and fr[-2]["cells"] == want
        assert fr[-1]["c"] == len(a) - pos
        for f in fr:
            if f["q"] and "must move" in f["q"]["text"]:
                assert int(f["q"]["options"][f["q"]["answer"]]) == len(a) - pos
            if f["q"] and "read slot" in f["q"]["text"]:
                assert f["q"]["options"][f["q"]["answer"]] == "1"


def test_hash_puts_every_number_on_its_shelf_and_finds_it(structs):
    rng = random.Random(32)
    for _ in range(30):
        keys = rng.sample(range(10, 99), 8)
        t = rng.choice(keys)
        fr = call(structs, f"VLStructures.record('hash', {json.dumps({'keys': keys, 'find': t})})")
        lesson_ok(structs, "VLStructures", "hash", fr)
        shelves = fr[-1]["shelves"]
        assert sorted(sum(shelves, [])) == sorted(keys)
        for b, items in enumerate(shelves):
            assert all(k % 7 == b for k in items)
        chain = shelves[t % 7]
        assert fr[-1]["c"] == chain.index(t) + 1
        for f in fr:  # a question about a shelf has the true remainder as its answer
            if f["q"] and "remainder" in f["q"]["text"]:
                k = int(f["q"]["text"].split()[0])
                assert int(f["q"]["options"][f["q"]["answer"]]) == k % 7


def test_tree_follows_the_rule_and_search_costs_depth_plus_one(structs):
    rng = random.Random(33)
    for _ in range(30):
        keys = rng.sample(range(10, 99), 7)
        t = rng.choice(keys)
        fr = call(structs, f"VLStructures.record('bst', {json.dumps({'keys': keys, 'target': t})})")
        lesson_ok(structs, "VLStructures", "bst", fr)
        assert sorted(fr[-1]["placed"]) == sorted(keys) and fr[-1]["found"] == t
        lay = call(structs, f"(() => {{ const L = VLStructures.layout({json.dumps(keys)}); return {{ d: [...L.depth], p: [...L.parent] }}; }})()")
        depth = dict(lay["d"])
        assert fr[-1]["c"] == depth[t] + 1
        for f in fr:  # left means smaller; the question compares the number being placed or searched
            if f["q"] and f["q"]["options"][0].startswith("Left"):
                v, n = (int(x) for x in f["q"]["text"].replace(":", "").split(" against ")[0:1] + f["q"]["text"].split(" against ")[1].split(":")[0:1])
                assert (f["q"]["answer"] == 0) == (v < n)


def test_every_structures_lesson_is_complete(structs):
    assert list(call(structs, "VLStructures.ALGOS")) == ["array", "hash", "bst"]
    for key in ("array", "hash", "bst"):
        for _ in range(5):
            inp = call(structs, f"VLStructures.make('{key}')")
            lesson_ok(structs, "VLStructures", key, call(structs, f"VLStructures.record('{key}', {json.dumps(inp)})"))


@pytest.fixture(scope="module")
def paths():
    return load("paths.js")


def reference_dijkstra(w, edges, n):
    adj = {i: [] for i in range(n)}
    for (a, b), x in zip(edges, w):
        adj[a].append((b, x)); adj[b].append((a, x))
    dist = [float("inf")] * n
    dist[0] = 0
    todo = set(range(n))
    while todo:
        u = min(todo, key=lambda i: dist[i])
        todo.remove(u)
        for v, x in adj[u]:
            dist[v] = min(dist[v], dist[u] + x)
    return dist


def test_dijkstra_matches_a_reference_and_the_route_adds_up(paths):
    edges = call(paths, "VLPaths.EDGES")
    rng = random.Random(34)
    for _ in range(60):
        w = [rng.randint(1, 9) for _ in edges]
        fr = call(paths, f"VLPaths.record({json.dumps({'w': w})})")
        lesson_ok(paths, "VLPaths", "dijkstra", fr)
        ref = reference_dijkstra(w, edges, 6)
        last = fr[-1]
        assert last["dist"][5] == ref[5]
        route = last["path"]
        assert route[0] == 0 and route[-1] == 5
        length = 0
        for a, b in zip(route, route[1:]):
            length += next(x for (p, q), x in zip(edges, w) if {p, q} == {a, b})
        assert length == ref[5]
        for f in fr:  # settled distances are final, and the quiz picks the true minimum
            for i, d in enumerate(f["dist"]):
                if f["done"][i]:
                    assert d == ref[i]
            if f["q"]:
                best = f["q"]["options"][f["q"]["answer"]]
                assert int(best.split("(")[1].rstrip(")")) == min(int(o.split("(")[1].rstrip(")")) for o in f["q"]["options"])


@pytest.fixture(scope="module")
def dp():
    return load("dp.js")


def test_coin_table_is_optimal_and_greedy_is_not_always(dp):
    for coins in ([1, 3, 4], [1, 4, 5], [1, 5, 6], [1, 4, 6]):
        for amount in range(8, 13):
            best = [0] + [10**9] * amount
            for a in range(1, amount + 1):
                best[a] = min(best[a - c] + 1 for c in coins if c <= a)
            fr = call(dp, f"VLDp.record('coins', {json.dumps({'coins': coins, 'amount': amount})})")
            lesson_ok(dp, "VLDp", "coins", fr)
            assert fr[-1]["dp"] == best
            for f in fr:
                if f["q"]:
                    a = int(f["q"]["text"].split("make ")[1].rstrip("?"))
                    assert int(f["q"]["options"][f["q"]["answer"]]) == best[a]
    assert call(dp, "VLDp.greedy([1, 3, 4], 6)") == 3  # 4 + 1 + 1, though 3 + 3 uses only 2


def test_grid_counts_every_walk(dp):
    rng = random.Random(35)
    for _ in range(40):
        inp = call(dp, "VLDp.make('grid')")
        rows, cols, walls = inp["rows"], inp["cols"], set(inp["walls"])
        assert 0 not in walls and rows * cols - 1 not in walls
        table = [[0] * cols for _ in range(rows)]
        for r in range(rows):
            for c in range(cols):
                if r * cols + c in walls:
                    continue
                table[r][c] = 1 if (r, c) == (0, 0) else (table[r - 1][c] if r else 0) + (table[r][c - 1] if c else 0)
        assert table[-1][-1] > 0
        fr = call(dp, f"VLDp.record('grid', {json.dumps(inp)})")
        lesson_ok(dp, "VLDp", "grid", fr)
        assert [v for row in table for v in row] == fr[-1]["table"]
    assert list(call(dp, "VLDp.ALGOS")) == ["coins", "grid"]


@pytest.mark.parametrize("page,script", [("structures", "structures.js"), ("paths", "paths.js"), ("dp", "dp.js")])
def test_new_lesson_pages_have_what_the_player_needs(page, script):
    html = (ASSETS.parent / page / "index.html").read_text(encoding="utf-8")
    for i in ("algos", "note", "code", "stats", "scrub", "b-play", "b-fwd", "b-reset", "b-back", "b-new", "b-print", "speed", "predict",
              "quiz", "quiz-q", "quiz-opts", "quiz-fb", "quiz-skip", "done", "done-text", "algo-name", "algo-blurb", "algo-facts",
              "off-title", "off-need", "off-time", "off-steps", "off-think", "off-algo", "view"):
        assert f'id="{i}"' in html, i
    assert f'src="/assets/{script}"' in html and 'src="/assets/player.js"' in html
    assert f"https://visualearn.org/{page}/" in html and "maze" not in html.lower()
