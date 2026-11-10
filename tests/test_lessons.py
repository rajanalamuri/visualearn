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
