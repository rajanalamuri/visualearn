"""Runs web/assets/limit.js against a tiny fake DOM to check the daily time limit."""
import json
from pathlib import Path

import quickjs

SRC = (Path(__file__).resolve().parent.parent / "web" / "assets" / "limit.js").read_text(encoding="utf-8")

FAKE_DOM = r"""
var timers = [], store = {}, events = [], listeners = {};
function el(id) {
  return { id, hidden: true, textContent: '', value: '', classList: { toggle() {} },
    _h: {}, addEventListener(t, f) { this._h[t] = f; }, click() { this._h.click && this._h.click(); },
    querySelector() { return { focus() {} }; }, focus() {} };
}
var els = {};
['timer', 'rest', 'limit-min', 'rest-more', 'rest-bye', 'rest-body', 'rest-done', 'rest-print'].forEach(i => els[i] = el(i));
els['limit-min'].value = '15';
var localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } };
var document = {
  visibilityState: 'visible',
  body: { classList: { add() {}, remove() {} } },
  getElementById: id => els[id] || null,
  addEventListener: (t, f) => { listeners[t] = f; },
  dispatchEvent: e => events.push(e.type),
};
function CustomEvent(type) { this.type = type; }
function setInterval(f) { timers.push(f); }
var window = { print() {} };
function tick(n) { for (let k = 0; k < n; k++) timers[0](); }
"""


def boot(preset=None, limit=None):
    ctx = quickjs.Context()
    ctx.eval(FAKE_DOM)
    if preset is not None:
        ctx.eval(f"store['vl-used'] = JSON.stringify(Object.assign({{date: new Date().toLocaleDateString('en-CA')}}, {json.dumps(preset)}));")
    if limit is not None:
        ctx.eval(f"store['vl-limit-min'] = '{limit}';")
    ctx.eval(SRC)
    return ctx


def test_counts_down_and_rests_at_the_limit():
    ctx = boot(limit=1)
    assert ctx.eval("els.timer.textContent") == "1:00 left today"
    ctx.eval("tick(30)")
    assert ctx.eval("els.timer.textContent") == "0:30 left today"
    assert ctx.eval("els.rest.hidden") is True
    ctx.eval("tick(30)")
    assert ctx.eval("els.rest.hidden") is False
    assert ctx.eval("events.includes('vl:rest')") is True


def test_hidden_tab_does_not_count():
    ctx = boot(limit=1)
    ctx.eval("document.visibilityState = 'hidden'; tick(90); document.visibilityState = 'visible';")
    assert ctx.eval("els.rest.hidden") is True
    assert ctx.eval("els.timer.textContent") == "1:00 left today"


def test_five_more_minutes_twice_then_no_more():
    ctx = boot(limit=1)
    ctx.eval("tick(60)")
    assert ctx.eval("els['rest-more'].hidden") is False
    ctx.eval("els['rest-more'].click()")
    assert ctx.eval("els.rest.hidden") is True
    assert ctx.eval("els.timer.textContent") == "5:00 left today"
    ctx.eval("tick(300); els['rest-more'].click(); tick(300)")
    assert ctx.eval("els.rest.hidden") is False
    assert ctx.eval("els['rest-more'].hidden") is True


def test_time_is_remembered_for_today():
    ctx = boot(preset={"sec": 15 * 60, "extra": 0})
    assert ctx.eval("els.rest.hidden") is False


def test_yesterday_does_not_count():
    ctx = quickjs.Context()
    ctx.eval(FAKE_DOM)
    ctx.eval("store['vl-used'] = JSON.stringify({date: '2000-01-01', sec: 99999, extra: 0});")
    ctx.eval(SRC)
    assert ctx.eval("els.rest.hidden") is True
    assert ctx.eval("els.timer.textContent") == "15:00 left today"


def test_no_limit_option():
    ctx = boot(limit=0)
    ctx.eval("tick(5000)")
    assert ctx.eval("els.timer.hidden") is True
    assert ctx.eval("els.rest.hidden") is True


def test_grown_up_can_change_the_limit():
    ctx = boot(limit=1)
    ctx.eval("tick(60)")
    assert ctx.eval("els.rest.hidden") is False
    ctx.eval("els['limit-min'].value = '20'; els['limit-min']._h.change();")
    assert ctx.eval("els.rest.hidden") is True
    assert ctx.eval("store['vl-limit-min']") == "20"
