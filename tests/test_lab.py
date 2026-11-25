"""Checks the lab lessons (techniques, trees, graphs, ...) by running their JavaScript and comparing each result with a plain Python answer."""
import itertools
import json
import math
from collections import Counter, deque
from pathlib import Path

import pytest
import quickjs

ASSETS = Path(__file__).resolve().parent.parent / "web" / "assets"
WEB = ASSETS.parent
PAGES = ["techniques", "trees", "graphs", "solve", "text", "numbers", "big", "shapes"]


def load(page):
    ctx = quickjs.Context()
    ctx.eval((ASSETS / "lab.js").read_text(encoding="utf-8"))
    ctx.eval((ASSETS / f"{page}.js").read_text(encoding="utf-8"))
    return ctx


_ctx = {}


def ctx_for(page):
    if page not in _ctx:
        _ctx[page] = load(page)
    return _ctx[page]


def run(page, key, inp=None):
    """One lesson run: returns (input, frames). Uses the lesson's own random input unless one is given."""
    ctx = ctx_for(page)
    arg = "null" if inp is None else json.dumps(inp)
    out = ctx.eval(f"JSON.stringify((() => {{ const a = VLLab.registry['{page}']['{key}']; const i = {arg} || a.make(); return {{ i, f: VLLab.record(a, i) }}; }})())")
    d = json.loads(out)
    return d["i"], d["f"]


def algos(page):
    return json.loads(ctx_for(page).eval(f"JSON.stringify(Object.fromEntries(Object.entries(VLLab.registry['{page}']).map(([k, a]) => [k, {{ name: a.name, blurb: a.blurb, facts: a.facts, code: a.code, offline: a.offline }}])))"))


def check_question(q):
    assert q["text"] and q["why"]
    assert 2 <= len(q["options"]) <= 4
    assert 0 <= q["answer"] < len(q["options"])
    assert len(set(q["options"])) == len(q["options"]), q


def check_view(v):
    assert v["type"] in ("rows", "graph", "grid")
    if v["type"] == "rows":
        assert v["rows"] and all(r["cells"] for r in v["rows"])
    if v["type"] == "graph":
        ids = {n["id"] for n in v["nodes"]}
        assert (v["nodes"] or v.get("rows")) and all(e["a"] in ids and e["b"] in ids for e in v["edges"])
    if v["type"] == "grid":
        assert v["cells"] and len(v["cells"]) % v["cols"] == 0


def check_lesson(page, key, runs=6):
    al = algos(page)[key]
    assert al["name"] and al["blurb"] and len(al["facts"]) == 3
    o = al["offline"]
    assert o["title"] and o["need"] and o["time"] and o["think"] and 3 <= len(o["steps"]) <= 6
    for _ in range(runs):
        inp, fr = run(page, key)
        assert len(fr) >= 3
        assert fr[0]["q"] is None and fr[-1]["q"] is None
        for f in fr:
            assert f["note"]
            assert -1 <= f["line"] < len(al["code"]), (key, f["line"])
            check_view(f["view"])
            if f["q"]:
                check_question(f["q"])
        assert sum(1 for f in fr if f["q"]) >= 1 or len(fr) < 6, f"{key} never asks anything"


def every(page):
    return list(algos(page))


def pytest_generate_tests(metafunc):
    if "page_key" in metafunc.fixturenames:
        cases = []
        for p in PAGES:
            if (ASSETS / f"{p}.js").is_file():
                cases += [(p, k) for k in algos(p)]
        metafunc.parametrize("page_key", cases, ids=[f"{p}:{k}" for p, k in cases])


def test_every_lab_lesson_is_a_full_lesson(page_key):
    check_lesson(*page_key)


# ---------- techniques ----------

def test_two_pointers_finds_a_pair_iff_one_exists():
    for _ in range(40):
        inp, fr = run("techniques", "twoptr")
        a, t = inp["a"], inp["t"]
        has = any(a[i] + a[j] == t for i in range(len(a)) for j in range(i + 1, len(a)))
        res = fr[-1]["result"]
        assert (res is not None) == has
        if res:
            assert a[res[0]] + a[res[1]] == t and res[0] < res[1]
        for f in fr:
            if f["q"] and "pointer" in f["q"]["options"][0].lower():
                pass
        assert len(fr) <= 2 * len(a) + 2  # never more than a pass over the row


def test_sliding_window_best_sum():
    for _ in range(30):
        inp, fr = run("techniques", "window")
        a, k = inp["a"], inp["k"]
        assert fr[-1]["result"] == max(sum(a[i:i + k]) for i in range(len(a) - k + 1))


def test_prefix_sums_answer_the_range_question():
    for _ in range(30):
        inp, fr = run("techniques", "prefix")
        a = inp["a"]
        res = fr[-1]["result"]
        assert res["P"] == [0] + list(itertools.accumulate(a))
        assert res["sum"] == sum(a[inp["l"]:inp["r"] + 1])
        q = next(f["q"] for f in fr if f["q"])
        assert int(q["options"][q["answer"]]) == res["sum"]


def test_binary_search_on_the_answer_is_the_slowest_speed_that_works():
    for _ in range(40):
        inp, fr = run("techniques", "bsans")
        piles, H = inp["piles"], inp["H"]
        best = next(s for s in range(1, max(piles) + 1) if sum(math.ceil(p / s) for p in piles) <= H)
        assert fr[-1]["result"] == best
        assert sum(1 for f in fr if "Test the middle" in f["note"]) <= math.ceil(math.log2(max(piles))) + 1


def test_counting_and_radix_sort_really_sort():
    for _ in range(30):
        inp, fr = run("techniques", "counting")
        assert fr[-1]["result"] == sorted(inp["a"])
        inp, fr = run("techniques", "radix")
        assert fr[-1]["result"] == sorted(inp["a"])
        for f in fr:
            if f["q"]:
                assert f["q"]["options"][f["q"]["answer"]].isdigit()


def test_monotonic_stack_next_bigger():
    for _ in range(40):
        inp, fr = run("techniques", "monostack")
        a = inp["a"]
        want = [next((b for b in a[i + 1:] if b > a[i]), -1) for i in range(len(a))]
        assert fr[-1]["result"] == want


def test_deque_window_maximum():
    for _ in range(40):
        inp, fr = run("techniques", "deque")
        a, k = inp["a"], inp["k"]
        assert fr[-1]["result"] == [max(a[i:i + k]) for i in range(len(a) - k + 1)]


def test_palindrome_check():
    for _ in range(30):
        inp, fr = run("techniques", "strings")
        w = "".join(inp["w"])
        assert fr[-1]["result"] == (w == w[::-1])


def test_cycle_detection_and_reversal():
    seen = set()
    for _ in range(60):
        inp, fr = run("techniques", "cycle")
        assert fr[-1]["result"] == (inp["back"] >= 0)
        seen.add(inp["back"] >= 0)
    assert seen == {True, False}
    for _ in range(20):
        inp, fr = run("techniques", "reverse")
        assert fr[-1]["result"] == inp["v"][::-1]


def test_spiral_visits_every_square_once_in_spiral_order():
    inp, fr = run("techniques", "spiral")
    assert fr[-1]["result"] == [1, 2, 3, 4, 8, 12, 11, 10, 9, 5, 6, 7]


def test_amortised_cost_stays_under_three_per_add():
    inp, fr = run("techniques", "amortised")
    res = fr[-1]["result"]
    assert res["total"] == res["n"] + 1 + 2 + 4 + 8 and res["total"] < 3 * res["n"]


def test_invariant_and_loop_lessons():
    for _ in range(20):
        inp, fr = run("techniques", "invariants")
        assert fr[-1]["result"] == sorted(inp["a"])
    inp, fr = run("techniques", "loops")
    assert fr[-1]["result"] == 21


# ---------- trees ----------

def bst_nodes(vals):
    root = None
    for v in vals:
        n = {"v": v, "l": None, "r": None}
        if root is None:
            root = n
            continue
        c = root
        while True:
            k = "l" if v < c["v"] else "r"
            if c[k] is None:
                c[k] = n
                break
            c = c[k]
    return root


def walk(n, kind, out=None):
    out = [] if out is None else out
    if n is None:
        return out
    if kind == "pre":
        out.append(n["v"])
    walk(n["l"], kind, out)
    if kind == "in":
        out.append(n["v"])
    walk(n["r"], kind, out)
    if kind == "post":
        out.append(n["v"])
    return out


def test_traversals_match_the_textbook_orders():
    for _ in range(25):
        for kind in ("pre", "in", "post"):
            inp, fr = run("trees", kind)
            assert fr[-1]["result"] == walk(bst_nodes(inp["v"]), kind)
        inp, fr = run("trees", "level")
        root, q, want = bst_nodes(inp["v"]), None, []
        q = [root]
        while q:
            c = q.pop(0)
            want.append(c["v"])
            q += [k for k in (c["l"], c["r"]) if k]
        assert fr[-1]["result"] == want
        assert fr[-1]["result"] != [] and len(fr[-1]["result"]) == 7
        for f in fr:
            if f["q"]:
                assert f["q"]["options"][f["q"]["answer"]].isdigit()


def test_inorder_of_a_search_tree_is_sorted():
    for _ in range(20):
        inp, fr = run("trees", "in")
        assert fr[-1]["result"] == sorted(inp["v"])


def test_lca():
    for _ in range(40):
        inp, fr = run("trees", "lca")
        root = bst_nodes(inp["v"])
        def path(n, t, p=()):
            if n is None:
                return None
            p = p + (n["v"],)
            if n["v"] == t:
                return p
            return path(n["l"], t, p) or path(n["r"], t, p)
        pa, pb = path(root, inp["a"]), path(root, inp["b"])
        common = [x for x, y in zip(pa, pb) if x == y]
        assert fr[-1]["result"] == common[-1]


def test_heap_and_heap_sort():
    for _ in range(30):
        inp, fr = run("trees", "heap")
        res = fr[-1]["result"]
        assert res["out"] == sorted(inp["v"])[:2]
        h = res["heap"]
        assert all(h[(i - 1) // 2] <= h[i] for i in range(1, len(h)))
        assert sorted(h + res["out"]) == sorted(inp["v"])
        inp, fr = run("trees", "heapsort")
        assert fr[-1]["result"] == sorted(inp["a"])


def test_trie_prefix_search():
    for _ in range(20):
        inp, fr = run("trees", "trie")
        res = fr[-1]["result"]
        assert sorted(res["words"]) == sorted(w for w in inp["words"] if w.startswith(res["prefix"]))


def test_avl_keeps_ascending_inserts_balanced():
    for _ in range(30):
        inp, fr = run("trees", "avl")
        res = fr[-1]["result"]
        assert res["inorder"] == sorted(inp["v"]) and res["balanced"]
        assert res["height"] <= 4 < len(inp["v"])  # a plain stick of 6 would be 6 tall
    # ascending inserts must have triggered at least one rotation
    assert any("Rotate" in f["note"] for f in fr)


def test_range_structures_agree_with_plain_python():
    for _ in range(40):
        inp, fr = run("trees", "segment")
        assert fr[-1]["result"]["sum"] == sum(inp["a"][inp["l"]:inp["r"] + 1])
        inp, fr = run("trees", "fenwick")
        res = fr[-1]["result"]
        assert res["sum"] == sum(inp["a"][:inp["k"]])
        for i, t in enumerate(res["T"], 1):
            assert t == sum(inp["a"][i - (i & -i):i])
        inp, fr = run("trees", "sparse")
        assert fr[-1]["result"]["min"] == min(inp["a"][inp["l"]:inp["r"] + 1])


# ---------- graphs ----------

def test_graph_picture_lists_are_symmetric_and_twice_the_edges():
    for _ in range(20):
        inp, fr = run("graphs", "picture")
        r = fr[-1]["result"]
        adj = r["adj"]
        assert all(i in adj[j] for i, l in enumerate(adj) for j in l)
        assert sum(map(len, adj)) == 2 * r["edges"] == 2 * len(inp["es"])


def reach_components(n, es):
    p = list(range(n))
    def find(a):
        while p[a] != a:
            p[a] = p[p[a]]
            a = p[a]
        return a
    for a, b in es:
        p[find(a)] = find(b)
    return len({find(i) for i in range(n)}), [find(i) for i in range(n)]


def test_components_count_and_labels():
    for _ in range(40):
        inp, fr = run("graphs", "components")
        n = len(inp["nodes"])
        count, roots = reach_components(n, inp["es"])
        res = fr[-1]["result"]
        assert res["count"] == count
        for i in range(n):
            for j in range(n):
                assert (res["comp"][i] == res["comp"][j]) == (roots[i] == roots[j])


def test_cycle_detection_and_two_colouring():
    seen = set()
    for _ in range(60):
        inp, fr = run("graphs", "cycle")
        n, es = inp["n"], inp["es"]
        assert fr[-1]["result"] == (len(es) >= n)  # connected: a tree has n - 1 edges, one more makes a cycle
        seen.add(fr[-1]["result"])
    assert seen == {True, False}
    for _ in range(30):
        inp, fr = run("graphs", "bipartite")
        assert fr[-1]["result"] == (inp["n"] % 2 == 0)


def test_topological_order_respects_every_dependency():
    for _ in range(20):
        inp, fr = run("graphs", "topo")
        res = fr[-1]["result"]
        pos = {v: i for i, v in enumerate(res["order"])}
        assert len(pos) == len(inp["names"])
        assert all(pos[a] < pos[b] for a, b in res["es"])


def test_union_find_groups_match_a_reference():
    for _ in range(40):
        inp, fr = run("graphs", "unionfind")
        _, roots = reach_components(8, inp["ps"])
        want = {}
        for i, r in enumerate(roots):
            want.setdefault(r, []).append(i)
        assert fr[-1]["result"] == sorted((sorted(g) for g in want.values()), key=lambda g: g[0])


def test_bellman_ford_and_floyd_warshall():
    for _ in range(40):
        inp, fr = run("graphs", "bellman")
        n = 5
        dist = [math.inf] * n
        dist[0] = 0
        for _ in range(n):
            for a, b, w in inp["w"]:
                if dist[a] + w < dist[b]:
                    dist[b] = dist[a] + w
        assert fr[-1]["result"] == [None if d == math.inf else d for d in dist]
        inp, fr = run("graphs", "floyd")
        m = [[math.inf if v is None else v for v in r] for r in inp["m"]]
        for k in range(4):
            for i in range(4):
                for j in range(4):
                    m[i][j] = min(m[i][j], m[i][k] + m[k][j])
        assert fr[-1]["result"] == [[None if v == math.inf else v for v in r] for r in m]


def test_kruskal_total_is_the_minimum_spanning_tree_weight():
    for _ in range(40):
        inp, fr = run("graphs", "kruskal")
        n, es = inp["n"], inp["es"]
        # Prim as an independent check
        inside, total = {0}, 0
        while len(inside) < n:
            e = min((w, a, b) for a, b, w in es if (a in inside) != (b in inside))
            total += e[0]
            inside |= {e[1], e[2]}
        assert fr[-1]["result"]["total"] == total and fr[-1]["result"]["count"] == n - 1


def test_astar_path_is_as_short_as_breadth_first_search():
    for _ in range(30):
        inp, fr = run("graphs", "astar")
        R, C, walls = inp["R"], inp["C"], set(inp["walls"])
        dist, q = {0: 0}, deque([0])
        while q:
            c = q.popleft()
            r, k = divmod(c, C)
            for dr, dk in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nr, nk = r + dr, k + dk
                i = nr * C + nk
                if 0 <= nr < R and 0 <= nk < C and i not in walls and i not in dist:
                    dist[i] = dist[c] + 1
                    q.append(i)
        res = fr[-1]["result"]
        assert res["steps"] == dist[R * C - 1]
        assert all(p not in walls for p in res["path"]) and res["path"][0] == 0


def max_flow(c, n=6, s=0, t=5):
    cap = [[0] * n for _ in range(n)]
    for a, b, k in c:
        cap[a][b] += k
    total = 0
    while True:
        par = [-1] * n
        par[s] = s
        q = deque([s])
        while q:
            u = q.popleft()
            for v in range(n):
                if par[v] < 0 and cap[u][v] > 0:
                    par[v] = u
                    q.append(v)
        if par[t] < 0:
            return total
        b, v = math.inf, t
        while v != s:
            b = min(b, cap[par[v]][v])
            v = par[v]
        v = t
        while v != s:
            cap[par[v]][v] -= b
            cap[v][par[v]] += b
            v = par[v]
        total += b


def test_flow_is_the_maximum_and_matching_is_the_largest():
    for _ in range(60):
        inp, fr = run("graphs", "flow")
        assert fr[-1]["result"]["flow"] == max_flow(inp["c"])
    for _ in range(60):
        inp, fr = run("graphs", "matching")
        es = inp["es"]
        best = max(sum(1 for a, b in zip(range(4), perm) if [a, b] in es) for perm in itertools.permutations(range(4)))
        res = fr[-1]["result"]
        assert res["size"] == best
        used = [m for m in res["match"] if m >= 0]
        assert len(used) == len(set(used)) == res["size"]
        for r, l in enumerate(res["match"]):
            assert l < 0 or [l, r] in es
