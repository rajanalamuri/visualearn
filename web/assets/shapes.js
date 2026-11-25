/* VisuaLearn shapes lessons: convex hull, line sweep and the closest pair of points. */
(() => {
  'use strict';
  const { rnd, pick, distinct, row, rows, choice, numq, yesno, plural } = VLLab;
  const off = (title, need, time, steps, think) => ({ title, need, time, steps, think });
  const L = (i) => String.fromCharCode(65 + i);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const px = (p) => ({ x: 45 + p[0] * 46, y: 270 - p[1] * 46 });

  function points(n) {
    const out = [];
    while (out.length < n) { const p = [rnd(0, 11), rnd(0, 5)]; if (!out.some((q) => q[0] === p[0] || (q[0] === p[0] && q[1] === p[1]))) out.push(p); }
    return out;
  }

  const ALGOS = {
    hull: {
      name: 'Convex hull',
      blurb: 'Stretch a rubber band around a set of points. The points it touches form the convex hull. Walk the points from left to right keeping a chain; whenever the last three do not turn the right way, drop the middle one.',
      facts: [['Result', 'The outer boundary'], ['Time', 'O(n log n)'], ['Test', 'Which way do three points turn?']],
      code: ['sort the points from left to right', 'build the lower chain: add each point', '  while the last three turn the wrong way: drop the middle one', 'build the upper chain the same way, right to left', 'join the two chains'],
      offline: off('Rubber band', 'A board, 8 pins or coins, and a loop of string or a rubber band', '15 minutes', [
        'Place 8 pins on a board in a scatter.',
        'Stretch the band around all of them and let it settle.',
        'The pins the band touches are the hull. Write down their order going round.',
        'Try moving one pin inside the band. Does the hull change?'], 'Can a point in the middle ever be on the hull?'),
      make() { return { pts: points(8).sort((a, b) => a[0] - b[0] || a[1] - b[1]) }; },
      run(x, { pts }) {
        const n = pts.length, chain = [], gone = new Set(), hullE = [];
        const view = (cur, bad) => ({ type: 'graph', h: 300, nodes: pts.map((p, i) => ({ id: i, ...px(p), t: L(i), c: bad === i ? 'swap' : cur === i ? 'cur' : chain.includes(i) ? 'key' : gone.has(i) ? 'out' : '' })), edges: [...hullE, ...chain.slice(1).map((v, i) => ({ a: chain[i], b: v, c: 'on' }))], lists: [] });
        x.rec(view(), -1, `Find the points on the outside of this scatter, like a rubber band. Press play.`);
        let asked = 0;
        const build = (order, label) => {
          const st = [];
          for (const i of order) {
            while (st.length >= 2) {
              const o = pts[st[st.length - 2]], a = pts[st[st.length - 1]], b = pts[i], wrong = cross(o, a, b) <= 0;
              chain.length = 0; chain.push(...st, i);
              x.rec(view(i, wrong ? st[st.length - 1] : undefined), 2, `${L(st[st.length - 2])} → ${L(st[st.length - 1])} → ${L(i)}: ${wrong ? `turns the wrong way, so ${L(st[st.length - 1])} is inside.` : 'turns the right way. Keep it.'}`,
                asked < 3 ? (asked++, yesno(`Do ${L(st[st.length - 2])}, ${L(st[st.length - 1])} and ${L(i)} turn the wrong way, so we drop ${L(st[st.length - 1])}?`, wrong, wrong ? 'The middle point is not on the outside, so it comes out.' : 'The path bends outward, so the middle point stays.')) : null);
              if (!wrong) break;
              st.pop();
            }
            st.push(i);
          }
          chain.length = 0; chain.push(...st);
          x.rec(view(), 1, `${label} chain done: ${st.map(L).join(', ')}.`);
          return st;
        };
        const lower = build(pts.map((_, i) => i), 'Lower');
        hullE.push(...chain.slice(1).map((v, i) => ({ a: chain[i], b: v, c: 'done' })));
        const upper = build(pts.map((_, i) => n - 1 - i), 'Upper');
        const hull = [...lower.slice(0, -1), ...upper.slice(0, -1)];
        chain.length = 0;
        x.rec({ ...view(), nodes: view().nodes.map((nd) => ({ ...nd, c: hull.includes(nd.id) ? 'found' : 'out' })), edges: hull.map((v, i) => ({ a: v, b: hull[(i + 1) % hull.length], c: 'done' })) }, 4, `The hull has ${hull.length} points: ${hull.map(L).join(', ')}.`);
        x.result = { hull: hull.map((i) => pts[i]), pts };
      },
    },

    sweep: {
      name: 'Line sweep',
      blurb: 'Sweep an imaginary line across time from left to right, and only stop where something starts or ends. Add one when a meeting starts, take one away when it ends, and note the biggest count. That is how many meetings overlap at once.',
      facts: [['Stops at', 'Starts and ends only'], ['Time', 'O(n log n)'], ['Answer', 'Most at the same time']],
      code: ['list every start (+1) and end (−1) as an event', 'sort the events by time (ends before starts at a tie)', 'sweep through the events', '  add its +1 or −1 to the running count', '  remember the biggest count'],
      offline: off('Sweep the timeline', 'Paper strips marking meetings on a timeline from 0 to 12', '15 minutes', [
        'Draw 6 meetings as bars along a timeline.',
        'Write a + at each start and a − at each end, in order along the timeline.',
        'Walk along the line keeping a count: add 1 at a +, subtract 1 at a −.',
        'The biggest count is the number of rooms you need.'], 'Why can you ignore all the times when nothing starts or ends?'),
      make() { return { v: Array.from({ length: 6 }, () => { const s = rnd(0, 9); return [s, Math.min(12, s + rnd(1, 5))]; }) }; },
      run(x, { v }) {
        const T = 12, ev = v.flatMap(([s, e]) => [[s, 1], [e, -1]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]), busy = Array(T).fill(null);
        let cnt = 0, best = 0, prev = 0, asked = 0;
        const grid = (cur) => ({ type: 'grid', cols: T + 1, cells: v.flatMap((m, k) => [{ t: String.fromCharCode(65 + k), c: '' }, ...Array.from({ length: T }, (_, t) => ({ t: '', c: t >= m[0] && t < m[1] ? 'key' : '' }))]), lists: [] });
        const view = (cur) => ({ ...grid(), rows: [row('busy', busy.map((b) => (b === null ? '' : b)), Object.fromEntries(busy.map((b, i) => [i, b !== null && b === best && best > 0 ? 'found' : cur === i ? 'cur' : ''])))], lists: [{ label: 'Events (time, +1/−1)', items: ev.map(([t, d]) => `${t}:${d > 0 ? '+' : '−'}`) }, { label: 'Running count', items: [cnt] }] });
        x.rec(view(-1), -1, 'How many meetings overlap at the busiest moment? Sweep a line along the timeline. Press play.', null, [['Busiest', 0]]);
        for (const [t, d] of ev) {
          for (let k = prev; k < t; k++) busy[k] = cnt;
          const was = cnt; cnt += d; best = Math.max(best, cnt, ...busy.filter((b) => b !== null)); prev = t;
          x.rec(view(t), 3, `At time ${t} a meeting ${d > 0 ? 'starts' : 'ends'}: ${was} ${d > 0 ? '+ 1' : '− 1'} = ${cnt}.`, asked < 3 ? (asked++, numq(`At time ${t} a meeting ${d > 0 ? 'starts' : 'ends'}. The count was ${was}. What is it now?`, cnt, [was, was + 1, Math.max(0, was - 1)], `${d > 0 ? 'A start adds 1' : 'An end takes away 1'}: ${cnt}.`)) : null, [['Busiest', Math.max(best, cnt)]]);
        }
        const most = Math.max(...busy.filter((b) => b !== null), 0);
        x.rec(view(-1), 4, `At most ${most} meeting${most === 1 ? '' : 's'} overlap. We only looked at ${ev.length} events, not every minute.`, null, [['Busiest', most]]);
        x.result = { most, v };
      },
    },

    closest: {
      name: 'Closest pair of points',
      blurb: 'Which two points are nearest? Checking every pair is slow. Sort the points left to right. For each point, only look at points to its right, and stop as soon as the gap across is bigger than the best distance found.',
      facts: [['Naive', 'O(n²)'], ['With sorting', 'Much faster in practice'], ['Trick', 'Stop when the x-gap is too big']],
      code: ['sort the points by x', 'best ← the distance of the first pair', 'for each point i', '  look at later points j', '  stop if the x-gap is already at least best', '  update best if the pair is closer'],
      offline: off('Nearest neighbours', 'Squared paper with 7 dots', '15 minutes', [
        'Draw 7 dots on squared paper. Number them left to right.',
        'Start with dot 1 and dot 2 as your best pair. Measure the gap.',
        'For each dot, check the dots to its right. Stop looking as soon as a dot is further away sideways than your best gap.',
        'Mark the closest pair.'], 'Why can you stop looking once the sideways gap is as big as the best distance?'),
      make() { return { pts: points(7).sort((a, b) => a[0] - b[0] || a[1] - b[1]) }; },
      run(x, { pts }) {
        const n = pts.length, d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
        let best = d2(pts[0], pts[1]), bp = [0, 1], checks = 0, asked = 0;
        const view = (cur, bestPair) => ({ type: 'graph', h: 300, nodes: pts.map((p, i) => ({ id: i, ...px(p), t: L(i), c: bestPair && bestPair.includes(i) ? 'found' : cur && cur.includes(i) ? 'cur' : '' })), edges: [{ a: bp[0], b: bp[1], c: 'path' }, ...(cur ? [{ a: cur[0], b: cur[1], c: 'on' }] : [])], lists: [{ label: 'Best so far (squared distance)', items: [best] }] });
        x.rec(view(), -1, 'Find the two closest points. Squared distances are used (no square roots). Press play.', null, [['Pairs checked', 0]]);
        x.rec(view(null, bp), 1, `Start with ${L(0)} and ${L(1)}: squared distance ${best}.`, null, [['Pairs checked', 0]]);
        for (let i = 0; i < n; i++) {
          for (let j = i + 1; j < n; j++) {
            const dx = pts[j][0] - pts[i][0];
            if (dx * dx >= best) { x.rec(view(null, bp), 4, `${L(j)} is ${dx} across from ${L(i)}: ${dx}² = ${dx * dx} is already at least ${best}. Stop looking at points further right.`, asked < 3 ? (asked++, yesno(`The sideways gap squared is ${dx * dx}; the best is ${best}. Can we stop looking at points further right?`, true, `If the sideways gap alone is already as big as the best distance, the real distance is at least that big. Nothing right of here can win.`)) : null, [['Pairs checked', checks]]); break; }
            const d = d2(pts[i], pts[j]); checks++;
            const better = d < best;
            if (better) { best = d; bp = [i, j]; }
            x.rec(view([i, j]), 5, better ? `${L(i)}–${L(j)}: squared distance ${d}. Closer! New best.` : `${L(i)}–${L(j)}: squared distance ${d}. Not closer.`, null, [['Pairs checked', checks]]);
          }
        }
        x.rec(view(null, bp), 5, `The closest pair is ${L(bp[0])} and ${L(bp[1])}. We checked ${checks} pairs out of ${(n * (n - 1)) / 2}.`, null, [['Pairs checked', checks]]);
        x.result = { best, pair: bp.slice(), pts };
      },
    },
  };

  VLLab.define('shapes', ALGOS);
})();
