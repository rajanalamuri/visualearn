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


# ---------- solve ----------

def test_divide_and_conquer_matches_kadane():
    for _ in range(50):
        inp, fr = run("solve", "divide")
        best = cur = -math.inf
        cur = 0
        best = -math.inf
        for v in inp["a"]:
            cur = max(v, cur + v)
            best = max(best, cur)
        assert fr[-1]["result"] == best


def test_greedy_change_and_when_it_fails():
    fails = set()
    for _ in range(60):
        inp, fr = run("solve", "greedy")
        res = fr[-1]["result"]
        assert sum(res["taken"]) == res["amt"]
        assert all(c in inp["coins"] for c in res["taken"])
        dp = [0] + [10**9] * res["amt"]
        for v in range(1, res["amt"] + 1):
            dp[v] = 1 + min(dp[v - c] for c in inp["coins"] if c <= v)
        assert res["optimal"] == dp[res["amt"]] <= len(res["taken"])
        fails.add(len(res["taken"]) > res["optimal"])
    assert fails == {True, False}  # the lesson shows both: greedy right, and greedy fooled


def test_interval_scheduling_is_optimal():
    for _ in range(40):
        inp, fr = run("solve", "intervals")
        v = inp["v"]
        best = 0
        for mask in range(1 << len(v)):
            ch = sorted(v[i] for i in range(len(v)) if mask >> i & 1)
            if all(ch[k][1] <= ch[k + 1][0] for k in range(len(ch) - 1)):
                best = max(best, len(ch))
        assert fr[-1]["result"]["count"] == best


def test_backtracking_subset_sum_and_queens():
    found = set()
    for _ in range(60):
        inp, fr = run("solve", "backtrack")
        a, t = inp["a"], inp["t"]
        possible = any(sum(c) == t for r in range(len(a) + 1) for c in itertools.combinations(a, r))
        res = fr[-1]["result"]
        assert (res is not None) == possible
        if res:
            assert sum(res) == t and all(x in a for x in res)
        found.add(res is not None)
    assert found == {True, False}
    for _ in range(10):
        inp, fr = run("solve", "nqueens")
        cols = fr[-1]["result"]["cols"]
        n = inp["n"]
        assert len(cols) == n and len(set(cols)) == n
        assert all(abs(cols[i] - cols[j]) != j - i for i in range(n) for j in range(i + 1, n))


def test_dynamic_programming_tables_match_references():
    for _ in range(30):
        inp, fr = run("solve", "knapsack")
        items, cap = inp["items"], inp["cap"]
        best = max(sum(items[i][1] for i in range(4) if m >> i & 1) for m in range(16) if sum(items[i][0] for i in range(4) if m >> i & 1) <= cap)
        assert fr[-1]["result"]["best"] == best
        inp, fr = run("solve", "lcs")
        a, b = inp["a"], inp["b"]
        T = [[0] * (len(b) + 1) for _ in range(len(a) + 1)]
        for i in range(1, len(a) + 1):
            for j in range(1, len(b) + 1):
                T[i][j] = T[i - 1][j - 1] + 1 if a[i - 1] == b[j - 1] else max(T[i - 1][j], T[i][j - 1])
        assert fr[-1]["result"]["length"] == T[-1][-1]
        inp, fr = run("solve", "lis")
        a = inp["a"]
        L = [1] * len(a)
        for i in range(len(a)):
            for j in range(i):
                if a[j] < a[i]:
                    L[i] = max(L[i], L[j] + 1)
        assert fr[-1]["result"]["length"] == max(L)
        inp, fr = run("solve", "edit")
        a, b = inp["a"], inp["b"]
        D = [[i + j if i * j == 0 else 0 for j in range(len(b) + 1)] for i in range(len(a) + 1)]
        for i in range(1, len(a) + 1):
            for j in range(1, len(b) + 1):
                D[i][j] = D[i - 1][j - 1] if a[i - 1] == b[j - 1] else 1 + min(D[i - 1][j], D[i][j - 1], D[i - 1][j - 1])
        assert fr[-1]["result"]["distance"] == D[-1][-1]


def test_bit_tricks():
    for _ in range(40):
        inp, fr = run("solve", "popcount")
        assert fr[-1]["result"]["count"] == bin(inp["n"]).count("1")
        inp, fr = run("solve", "xor")
        c = Counter(inp["a"])
        assert fr[-1]["result"]["single"] == next(k for k, v in c.items() if v == 1)


# ---------- text and hashing ----------

def find_all(t, p):
    return [i for i in range(len(t) - len(p) + 1) if t.startswith(p, i)]


def test_pattern_matchers_agree_with_python():
    for _ in range(40):
        for key in ("naive", "rabin", "kmp"):
            inp, fr = run("text", key)
            assert fr[-1]["result"]["hits"] == find_all(inp["t"], inp["p"]), key
        inp, fr = run("text", "kmp")
        p, lps = inp["p"], [0] * len(inp["p"])
        k = 0
        for i in range(1, len(p)):
            while k and p[i] != p[k]:
                k = lps[k - 1]
            if p[i] == p[k]:
                k += 1
            lps[i] = k
        assert fr[-1]["result"]["lps"] == lps


def test_z_array_and_suffix_array():
    for _ in range(30):
        inp, fr = run("text", "zalgo")
        s = inp["s"]
        want = [next((k for k in range(len(s) - i + 1) if k == len(s) - i or s[k] != s[i + k]), 0) for i in range(len(s))]
        assert fr[-1]["result"]["z"][1:] == want[1:]
        inp, fr = run("text", "suffix")
        s, res = inp["s"], fr[-1]["result"]
        assert res["sa"] == sorted(range(len(s)), key=lambda i: s[i:])
        assert res["occ"] == find_all(s, res["pat"])


def test_huffman_is_optimal_and_prefix_free():
    import heapq
    for _ in range(40):
        inp, fr = run("text", "huffman")
        res = fr[-1]["result"]
        codes = res["codes"]
        assert set(codes) == {l for l, _ in inp["f"]}
        assert not any(a != b and codes[b].startswith(codes[a]) for a in codes for b in codes)
        h = [w for _, w in inp["f"]]
        heapq.heapify(h)
        cost = 0
        while len(h) > 1:
            a, b = heapq.heappop(h), heapq.heappop(h)
            cost += a + b
            heapq.heappush(h, a + b)
        assert res["bits"] == cost == sum(w * len(codes[l]) for l, w in inp["f"])


def test_bloom_never_forgets_and_sketch_never_undercounts():
    def bh(w, i):
        return (sum(map(ord, w)) * (i + 2) + i * 5) % 16
    for _ in range(40):
        inp, fr = run("text", "bloom")
        res = fr[-1]["result"]
        on = {bh(w, i) for w in inp["add"] for i in range(3)}
        assert [k for k, b in enumerate(res["bits"]) if b] == sorted(on)
        for w, said in res["answers"].items():
            assert said == all(bh(w, i) in on for i in range(3))
            if w in inp["add"]:
                assert said  # no false negatives
        inp, fr = run("text", "sketch")
        res = fr[-1]["result"]
        assert all(res["est"][c] >= res["truth"][c] for c in res["truth"])
        assert res["truth"] == dict(Counter(inp["stream"]))


def test_lru_and_counting():
    from collections import OrderedDict
    for _ in range(40):
        inp, fr = run("text", "lru")
        c, hits, misses = OrderedDict(), 0, 0
        for k in inp["seq"]:
            if k in c:
                hits += 1
                c.move_to_end(k)
            else:
                misses += 1
                if len(c) == 3:
                    c.popitem(last=False)
                c[k] = 1
        res = fr[-1]["result"]
        assert (res["hits"], res["misses"], res["cache"]) == (hits, misses, list(c))
        inp, fr = run("text", "freq")
        cnt = Counter(inp["w"])
        assert fr[-1]["result"]["first"] == next((ch for ch in inp["w"] if cnt[ch] == 1), None)


# ---------- numbers ----------

def test_number_lessons():
    for _ in range(40):
        inp, fr = run("numbers", "modular")
        assert fr[-1]["result"]["pos"] == (inp["a"] + inp["b"]) % inp["m"]
        inp, fr = run("numbers", "fastpow")
        res = fr[-1]["result"]
        assert res["r"] == pow(inp["b"], inp["e"], inp["mod"])
        assert res["ops"] <= 2 * inp["e"].bit_length() < inp["e"] * 2
        inp, fr = run("numbers", "pascal")
        assert fr[-1]["result"]["value"] == math.comb(inp["n"], inp["k"])
        inp, fr = run("numbers", "crt")
        res = fr[-1]["result"]
        assert res["count"] == 1 and res["answer"] % inp["m1"] == inp["r1"] and res["answer"] % inp["m2"] == inp["r2"]


# ---------- shapes ----------

def hull_ref(pts):
    pts = sorted(map(tuple, pts))
    def cr(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    out = []
    for seq in (pts, pts[::-1]):
        h = []
        for p in seq:
            while len(h) >= 2 and cr(h[-2], h[-1], p) <= 0:
                h.pop()
            h.append(p)
        out += h[:-1]
    return set(out)


def test_shape_lessons():
    for _ in range(40):
        inp, fr = run("shapes", "hull")
        assert {tuple(p) for p in fr[-1]["result"]["hull"]} == hull_ref(inp["pts"])
        inp, fr = run("shapes", "sweep")
        v = inp["v"]
        most = max(sum(1 for s, e in v if s <= t < e) for t in range(12))
        assert fr[-1]["result"]["most"] == most
        inp, fr = run("shapes", "closest")
        pts = inp["pts"]
        best = min((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 for a, b in itertools.combinations(pts, 2))
        assert fr[-1]["result"]["best"] == best
        i, j = fr[-1]["result"]["pair"]
        assert (pts[i][0] - pts[j][0]) ** 2 + (pts[i][1] - pts[j][1]) ** 2 == best


# ---------- the big questions ----------

def test_big_question_lessons():
    for _ in range(40):
        inp, fr = run("big", "random")
        res = fr[-1]["result"]
        assert res["hit"] == sum(1 for a, b in inp["darts"] if (a + .5) ** 2 + (b + .5) ** 2 < 100)
        assert abs(res["est"] - 4 * res["hit"] / res["n"]) < 1e-9
        inp, fr = run("big", "nim")
        W = fr[-1]["result"]["W"]
        assert [i for i, w in enumerate(W) if w == "L"] == [i for i in range(13) if i % 4 == 0]
        inp, fr = run("big", "hard")
        assert fr[-1]["result"]["search"] == [2 ** n for n in range(1, 11)]
        inp, fr = run("big", "approx")
        res = fr[-1]["result"]
        g, es, n = set(res["guards"]), inp["es"], inp["n"]
        assert all(a in g or b in g for a, b in es)
        opt = min(len(c) for r in range(n + 1) for c in itertools.combinations(range(n), r) if all(a in c or b in c for a, b in es))
        assert len(g) <= 2 * opt


# ---------- the last lessons ----------

def test_cost_and_range_lessons():
    inp, fr = run("techniques", "cases")
    assert fr[-1]["result"] == {"best": 1, "worst": 8, "avg": 4.5}
    for _ in range(30):
        inp, fr = run("techniques", "spacetime")
        res = fr[-1]["result"]

        def steps(n):
            c = 0
            d = 2
            while d * d <= n:
                c += 1
                if n % d == 0:
                    break
                d += 1
            return max(c, 1)
        assert res["steps"] == [steps(q) for q in inp["qs"]] and res["slow"] == sum(res["steps"]) and res["fast"] == len(inp["qs"])
        inp, fr = run("techniques", "sqrt")
        res = fr[-1]["result"]
        assert res["sum"] == sum(inp["a"][inp["l"]:inp["r"] + 1]) and res["adds"] < inp["r"] - inp["l"] + 1


def test_btree_skiplist_and_tree_dp():
    for _ in range(40):
        inp, fr = run("trees", "btree")
        res = fr[-1]["result"]
        assert res["inorder"] == sorted(inp["v"]) and len(set(res["depths"])) == 1 and res["maxKeys"] <= 2
        inp, fr = run("trees", "skiplist")
        res = fr[-1]["result"]
        assert res["found"] == (inp["t"] in inp["keys"])
        inp, fr = run("trees", "treedp")
        root = bst_nodes(inp["v"])
        par = {}
        def link(n):
            for k in (n["l"], n["r"]):
                if k:
                    par[k["v"]] = n["v"]
                    link(k)
        link(root)
        best = 0
        for m in range(1 << 7):
            chosen = {v for i, v in enumerate(inp["v"]) if m >> i & 1}
            if all(not (c in chosen and p in chosen) for c, p in par.items()):
                best = max(best, sum(inp["w"][str(v)] for v in chosen))
        assert fr[-1]["result"]["best"] == best


def test_scc_bridges_and_euler():
    for _ in range(40):
        inp, fr = run("graphs", "scc")
        n, es = inp["n"], inp["es"]
        reach = [[i == j for j in range(n)] for i in range(n)]
        for a, b in es:
            reach[a][b] = True
        for k in range(n):
            for i in range(n):
                for j in range(n):
                    reach[i][j] = reach[i][j] or (reach[i][k] and reach[k][j])
        comp = fr[-1]["result"]["comp"]
        for i in range(n):
            for j in range(n):
                assert (comp[i] == comp[j]) == (reach[i][j] and reach[j][i])
        inp, fr = run("graphs", "bridges")
        n, es = inp["n"], inp["es"]
        def connected(skip):
            seen, st = {0}, [0]
            while st:
                u = st.pop()
                for k, (a, b) in enumerate(es):
                    if k == skip:
                        continue
                    for p, q in ((a, b), (b, a)):
                        if p == u and q not in seen:
                            seen.add(q)
                            st.append(q)
            return len(seen) == n
        want = sorted([min(a, b), max(a, b)] for k, (a, b) in enumerate(es) if not connected(k))
        assert fr[-1]["result"]["bridges"] == want
        inp, fr = run("graphs", "euler")
        circ, es = fr[-1]["result"]["circuit"], [tuple(sorted(e)) for e in inp["es"]]
        used = sorted(tuple(sorted(p)) for p in zip(circ, circ[1:]))
        assert used == sorted(es) and circ[0] == circ[-1]


def test_bitmask_meet_in_the_middle_and_sudoku():
    for _ in range(40):
        inp, fr = run("solve", "bitmask")
        c = inp["c"]
        assert fr[-1]["result"]["best"] == min(sum(c[i][p[i]] for i in range(3)) for p in itertools.permutations(range(3)))
        inp, fr = run("solve", "meet")
        a, t = inp["a"], inp["t"]
        has = any(sum(c) == t for r in range(len(a) + 1) for c in itertools.combinations(a, r))
        assert fr[-1]["result"]["found"] == has
    for _ in range(20):
        inp, fr = run("solve", "sudoku")
        g, given = fr[-1]["result"]["grid"], inp["g"]
        assert all(given[i] in (0, g[i]) for i in range(16))
        rowsG = [g[r * 4:r * 4 + 4] for r in range(4)]
        assert all(sorted(r) == [1, 2, 3, 4] for r in rowsG)
        assert all(sorted(rowsG[r][c] for r in range(4)) == [1, 2, 3, 4] for c in range(4))
        for br, bc in itertools.product((0, 2), repeat=2):
            assert sorted(rowsG[br + y][bc + z] for y in (0, 1) for z in (0, 1)) == [1, 2, 3, 4]


def test_hyperloglog_counter():
    for _ in range(30):
        inp, fr = run("text", "hll")
        res = fr[-1]["result"]
        def lead(h):
            return 8 - h.bit_length()
        assert res["best"] == max(lead((v * 37 + 11) % 256) for v in inp["v"])
        assert res["est"] == 2 ** (res["best"] + 1)


# ---------- drawing ----------

@pytest.fixture(scope="module")
def drawing():
    """The lab engine with a stub page, so its real drawing code can be run on every frame."""
    ctx = quickjs.Context()
    ctx.eval("globalThis.document = { getElementById: () => null, querySelector: () => null };")
    ctx.eval((ASSETS / "lab.js").read_text(encoding="utf-8"))
    for p in PAGES:
        ctx.eval((ASSETS / f"{p}.js").read_text(encoding="utf-8"))
    return ctx


def test_every_frame_of_every_lesson_draws_cleanly(page_key, drawing):
    page, key = page_key
    out = drawing.eval(f"""JSON.stringify((() => {{
      const a = VLLab.registry['{page}']['{key}'], bad = [];
      for (let r = 0; r < 4; r++) {{
        const fr = VLLab.record(a, a.make());
        fr.forEach((f, i) => {{ const h = VLLab.draw(f.view); if (!h || /undefined|NaN|null|[[]object/.test(h)) bad.push([i, h.slice(0, 200)]); }});
      }}
      return bad;
    }})())""")
    assert json.loads(out) == []
