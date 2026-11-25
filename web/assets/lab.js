/* VisuaLearn lab: one small engine behind many lessons.
   A lesson ("algo") is { name, blurb, facts, code, offline, make(), run(x, input) }.
   run() records frames with x.rec(view, line, note, question, stats). A view is one of
     { type: 'rows',  rows: [{ label, cells: [...], marks: { index: 'cur' }, ptr: { index: 'lo' } }] }
     { type: 'graph', h, nodes: [{ id, x, y, t, s, c }], edges: [{ a, b, w, c, d }], rows? }
     { type: 'grid',  cols, cells: [{ t, c }] }
   plus an optional lists: [{ label, items }] under any of them. Mark classes: cur found out done swap key seen alt.
   Every frame is recorded up front so the shared player can step back and ask questions first. */
(() => {
  'use strict';

  const rnd = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
  const pick = (a) => a[rnd(0, a.length - 1)];
  const plural = (k, w) => `${k} ${w}${k === 1 ? '' : 's'}`;
  const copy = (o) => JSON.parse(JSON.stringify(o));

  function distinct(n, lo, hi) {
    const out = [];
    while (out.length < n) { const v = rnd(lo, hi); if (!out.includes(v)) out.push(v); }
    return out;
  }
  const shuffle = (a) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = rnd(0, i); [b[i], b[j]] = [b[j], b[i]]; } return b; };

  // ---- questions ----
  const hash = (t) => [...String(t)].reduce((a, c) => a + c.charCodeAt(0), 0);
  // Several-choice question; the right answer's position depends on the wording so it isn't always first.
  function choice(text, correct, others, why) {
    const opts = [String(correct), ...[...new Set(others.map(String))].filter((o) => o !== String(correct))].slice(0, 4);
    const k = hash(text) % opts.length;
    const arr = opts.slice(1); arr.splice(k, 0, opts[0]);
    return { text, options: arr, answer: k, why };
  }
  // Number question: options are sorted so the order gives nothing away.
  function numq(text, correct, extras, why) {
    const rest = [...new Set(extras)].filter((v) => v !== correct && Number.isFinite(v) && v >= 0).slice(0, 3);
    const all = [correct, ...rest].sort((a, b) => a - b);
    return { text, options: all.map(String), answer: all.indexOf(correct), why };
  }
  const yesno = (text, yes, why) => ({ text, options: ['Yes', 'No'], answer: yes ? 0 : 1, why });

  // ---- recording ----
  function record(algo, input) {
    const frames = [];
    const x = {
      frames, result: null,
      rec(view, line, note, q, stats) { frames.push({ view: copy(view), line, note, q: q || null, stats: stats || [] }); },
    };
    algo.run(x, input);
    if (frames.length) { frames[0].q = null; frames[frames.length - 1].q = null; frames[frames.length - 1].result = x.result; }
    return frames;
  }

  // ---- small view builders for lessons ----
  const row = (label, cells, marks, ptr) => ({ label, cells: cells.slice(), marks: marks || {}, ptr: ptr || {} });
  const rows = (rs, lists) => ({ type: 'rows', rows: rs, lists: lists || [] });
  // x and y for a binary tree given as { v, l, r }: x by in-order rank, y by depth.
  function treePos(root, w = 600, top = 36, gap = 62) {
    const out = new Map();
    let rank = 0, count = 0, maxD = 0;
    (function size(n) { if (n) { size(n.l); count++; size(n.r); } })(root);
    (function walk(n, d) {
      if (!n) return;
      walk(n.l, d + 1);
      out.set(n, { x: 30 + (count <= 1 ? (w - 60) / 2 : (rank++ * (w - 60)) / (count - 1)), y: top + d * gap });
      maxD = Math.max(maxD, d);
      walk(n.r, d + 1);
    })(root, 0);
    return { pos: out, h: top * 2 + maxD * gap - 10 };
  }

  globalThis.VLLab = { rnd, pick, plural, copy, distinct, shuffle, choice, numq, yesno, record, row, rows, treePos, registry: {} };

  // Lets a lesson file register its algos and, on a page, mount the player.
  globalThis.VLLab.define = (page, ALGOS) => {
    globalThis.VLLab.registry[page] = ALGOS;
    if (typeof document !== 'undefined' && document.getElementById('view')) mount(ALGOS);
  };

  // ---- page ----
  if (typeof document === 'undefined') return;
  const $ = (id) => document.getElementById(id);
  const esc = (t) => String(t).replace(/[&<>]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
  const view = () => $('view');

  function drawRows(v) {
    return v.rows.map((r) => {
      const cells = r.cells.map((c, i) => {
        const cls = r.marks[i] ? ` ${r.marks[i]}` : '';
        const p = r.ptr[i] ? `<em>${esc(r.ptr[i])}</em>` : '<em></em>';
        return `<div class="lcell${cls}"><b>${esc(c === null || c === undefined ? '' : c)}</b>${p}</div>`;
      }).join('');
      return `<div class="lrow">${r.label ? `<span class="llab">${esc(r.label)}</span>` : ''}<div class="lcells">${cells}</div></div>`;
    }).join('');
  }
  function drawGrid(v) {
    return `<div class="maze labgrid" style="--cols:${v.cols}">${v.cells.map((c) => `<div class="cell${c.c ? ` ${c.c}` : ''}">${esc(c.t ?? '')}</div>`).join('')}</div>`;
  }
  function drawGraph(v) {
    const N = new Map(v.nodes.map((n) => [n.id, n]));
    let out = `<svg class="graph labgraph" viewBox="0 0 600 ${v.h || 300}" role="img" aria-label="Diagram"><defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" class="g-arrow"/></marker></defs>`;
    for (const e of v.edges || []) {
      const a = N.get(e.a), b = N.get(e.b);
      if (!a || !b) continue;
      let x2 = b.x, y2 = b.y;
      if (e.d) { const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1; x2 = b.x - (dx / L) * 20; y2 = b.y - (dy / L) * 20; }
      out += `<line class="g-edge${e.c ? ` ${e.c}` : ''}" x1="${a.x}" y1="${a.y}" x2="${x2}" y2="${y2}"${e.d ? ' marker-end="url(#ah)"' : ''}/>`;
      if (e.w !== undefined && e.w !== null) {
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        out += `<g class="g-len"><rect x="${mx - 12}" y="${my - 11}" width="24" height="22" rx="6"/><text x="${mx}" y="${my + 5}" text-anchor="middle">${esc(e.w)}</text></g>`;
      }
    }
    for (const n of v.nodes) {
      out += `<g class="g-node${n.c ? ` ${n.c}` : ''}"><circle cx="${n.x}" cy="${n.y}" r="19"/><text x="${n.x}" y="${n.y + (n.s ? -1 : 5)}" text-anchor="middle" class="nm">${esc(n.t ?? n.id)}</text>${n.s ? `<text x="${n.x}" y="${n.y + 13}" text-anchor="middle" class="ds">${esc(n.s)}</text>` : ''}</g>`;
    }
    return `${out}</svg>`;
  }
  function draw(v) {
    let html = '';
    if (v.type === 'graph') html += drawGraph(v);
    else if (v.type === 'grid') html += drawGrid(v);
    if (v.type === 'rows' || v.rows) html += `<div class="lrows">${drawRows(v)}</div>`;
    if (v.lists && v.lists.length) {
      html += `<div class="llists">${v.lists.map((l) => `<p><b>${esc(l.label)}</b> ${l.items.length ? l.items.map((i) => `<span class="chip">${esc(i)}</span>`).join('') : '<span class="quiet">empty</span>'}</p>`).join('')}</div>`;
    }
    return html;
  }
  function describe(v) {
    if (v.type === 'rows') return v.rows.map((r) => `${r.label || 'Row'}: ${r.cells.join(', ')}`).join('. ');
    if (v.type === 'grid') return `Grid of ${v.cells.length} squares`;
    return `Diagram with ${v.nodes.length} nodes`;
  }

  globalThis.VLLab.draw = draw;

  function mount(ALGOS) {
    const inputs = {};
    const fresh = () => { for (const k of Object.keys(ALGOS)) inputs[k] = ALGOS[k].make(); };
    fresh();
    const lesson = {
      algos: ALGOS,
      record: (key) => record(ALGOS[key], inputs[key]),
      render(f) {
        const el = view();
        el.className = 'labview';
        el.innerHTML = draw(f.view);
        el.setAttribute('aria-label', describe(f.view));
      },
      stats: (f) => f.stats,
    };
    const player = VLPlayer.mount(lesson);
    $('b-new').addEventListener('click', () => { fresh(); player.restart(); });
  }
})();
