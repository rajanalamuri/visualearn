"""Runs web/assets/sort.js in an embedded JavaScript engine and checks every algorithm.

    pip install -r requirements-dev.txt
    pytest
"""
import json
import random
from pathlib import Path

import pytest
import quickjs

SRC = (Path(__file__).resolve().parent.parent / "web" / "assets" / "sort.js").read_text(encoding="utf-8")
ALGOS = ["bubble", "selection", "insertion", "merge", "quick"]


@pytest.fixture(scope="module")
def js():
    ctx = quickjs.Context()
    ctx.eval(SRC)
    ctx.eval("""
      globalThis.run = (key, input) => JSON.stringify(VisuaLearn.record(key, input).map(f => ({
        a: f.a, m: f.m, s: [...f.s], line: f.line, note: f.note, c: f.c, w: f.w, q: f.q })));
      globalThis.offline = (key) => JSON.stringify(VisuaLearn.ALGOS[key].offline);
      globalThis.parse = (t) => JSON.stringify(VisuaLearn.parseCustom(t));
      globalThis.make = (n, shape) => JSON.stringify(VisuaLearn.makeArray(n, shape));
      globalThis.codeLen = (key) => VisuaLearn.ALGOS[key].code.length;
    """)
    return ctx


def frames(js, key, arr):
    return json.loads(js.eval(f"run({json.dumps(key)}, {json.dumps(arr)})"))


CASES = [
    [5, 1, 4, 2, 8],
    [1, 2, 3, 4, 5],
    [9, 7, 5, 3, 1],
    [3, 3, 1, 3, 1],
    [42, 7],
    [7],
    [],
]


@pytest.mark.parametrize("key", ALGOS)
@pytest.mark.parametrize("arr", CASES)
def test_ends_sorted(js, key, arr):
    fr = frames(js, key, arr)
    assert fr[-1]["a"] == sorted(arr)
    assert sorted(fr[-1]["s"]) == list(range(len(arr)))


@pytest.mark.parametrize("key", ALGOS)
def test_random_arrays(js, key):
    rng = random.Random(7)
    for _ in range(40):
        arr = [rng.randint(1, 99) for _ in range(rng.randint(2, 40))]
        assert frames(js, key, arr)[-1]["a"] == sorted(arr)


@pytest.mark.parametrize("key", ALGOS)
def test_frames_are_consistent(js, key):
    arr = [12, 88, 5, 40, 40, 73, 1, 64, 29, 50]
    fr = frames(js, key, arr)
    n_lines = js.eval(f"codeLen({json.dumps(key)})")
    prev_c = prev_w = 0
    for f in fr:
        assert -1 <= f["line"] < n_lines, f
        assert f["note"]
        assert all(0 <= int(i) < len(arr) for i in f["m"])
        assert f["m"] == {} or set(f["m"].values()) <= {"cmp", "swap", "key", "pivot"}
        assert f["c"] >= prev_c and f["w"] >= prev_w  # counters never go backwards
        prev_c, prev_w = f["c"], f["w"]
    # bubble, selection, insertion and quick only swap, so the values never change
    if key != "merge":
        assert all(sorted(f["a"]) == sorted(arr) for f in fr)


@pytest.mark.parametrize("key", ALGOS)
def test_sorted_positions_are_final(js, key):
    arr = [30, 10, 50, 20, 40, 60, 5]
    fr = frames(js, key, arr)
    final = fr[-1]["a"]
    for f in fr:
        for i in f["s"]:
            assert f["a"][i] == final[i], (key, f)


def test_comparison_counts(js):
    n = 10
    rev = list(range(n, 0, -1))
    asc = list(range(1, n + 1))
    full = n * (n - 1) // 2
    assert frames(js, "bubble", rev)[-1]["c"] == full
    assert frames(js, "bubble", asc)[-1]["c"] == n - 1  # one pass, then stops early
    assert frames(js, "selection", asc)[-1]["c"] == full
    assert frames(js, "insertion", asc)[-1]["c"] == n - 1
    assert frames(js, "insertion", rev)[-1]["c"] == full
    assert frames(js, "selection", rev)[-1]["w"] < frames(js, "bubble", rev)[-1]["w"]


def test_first_and_last_frames(js):
    fr = frames(js, "quick", [3, 1, 2])
    assert fr[0]["a"] == [3, 1, 2] and fr[0]["c"] == 0
    assert fr[-1]["note"].startswith("Sorted!")


@pytest.mark.parametrize("text,values", [
    ("42, 7, 19", [42, 7, 19]),
    ("1 2  3", [1, 2, 3]),
    ("5;4,3", [5, 4, 3]),
    (" 9 , 999 ", [9, 999]),
])
def test_parse_ok(js, text, values):
    assert json.loads(js.eval(f"parse({json.dumps(text)})")) == {"values": values}


@pytest.mark.parametrize("text", ["", "5", "1, x", "1, 2.5", "0, 4", "1, 1000", "-3, 4", ", ".join(["1"] * 65)])
def test_parse_rejects(js, text):
    assert "error" in json.loads(js.eval(f"parse({json.dumps(text)})"))


@pytest.mark.parametrize("shape", ["random", "nearly", "reversed", "few"])
def test_make_array(js, shape):
    a = json.loads(js.eval(f"make(30, {json.dumps(shape)})"))
    assert len(a) == 30 and all(1 <= v <= 99 for v in a)
    if shape == "reversed":
        assert a == sorted(a, reverse=True)
    if shape == "few":
        assert len(set(a)) <= 4


# ---------- Predict mode ----------

@pytest.mark.parametrize("key", ALGOS)
def test_every_comparison_asks_a_question(js, key):
    fr = frames(js, key, [12, 88, 5, 40, 40, 73, 1, 64, 29, 50])
    for prev, f in zip(fr, fr[1:]):
        if f["c"] > prev["c"]:
            q = f["q"]
            assert q, (key, f["note"])
            assert q["text"] and q["why"]
            assert len(q["options"]) == 2 and q["answer"] in (0, 1)
        else:
            assert f["q"] is None, (key, f["note"])


def _questions(fr):
    return [(f, fr[i + 1]) for i, f in enumerate(fr[:-1]) if f["q"]]


@pytest.mark.parametrize("key", ["bubble", "insertion"])
def test_answer_matches_whether_a_swap_follows(js, key):
    rng = random.Random(3)
    for _ in range(15):
        arr = [rng.randint(1, 30) for _ in range(12)]
        for f, nxt in _questions(frames(js, key, arr)):
            swapped = "swap" in nxt["m"].values()
            assert (f["q"]["answer"] == 0) == swapped, (key, arr, f["note"])


@pytest.mark.parametrize("key", ["selection", "quick"])
def test_answer_matches_the_yes_step(js, key):
    rng = random.Random(4)
    for _ in range(15):
        arr = [rng.randint(1, 30) for _ in range(12)]
        for f, nxt in _questions(frames(js, key, arr)):
            assert (f["q"]["answer"] == 0) == nxt["note"].startswith("Yes"), (key, arr, f["note"])


def test_merge_answer_is_the_value_written_next(js):
    rng = random.Random(5)
    for _ in range(15):
        arr = [rng.randint(1, 30) for _ in range(12)]
        for f, nxt in _questions(frames(js, "merge", arr)):
            q = f["q"]
            k = int(next(iter(f["m"])))
            picked = int(q["options"][q["answer"]].split()[0])
            assert nxt["a"][k] == picked
            assert q["either"] == (q["options"][0].split()[0] == q["options"][1].split()[0])


@pytest.mark.parametrize("key", ALGOS)
def test_offline_activity(js, key):
    o = json.loads(js.eval(f"offline({json.dumps(key)})"))
    assert o["title"] and o["need"] and o["time"] and o["think"]
    assert 3 <= len(o["steps"]) <= 6
