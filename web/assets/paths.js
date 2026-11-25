/* VisuaLearn shortest-path lesson: Dijkstra's algorithm on a small map of towns joined by roads with lengths.
   Always settle the closest unsettled town; then see whether it gives its neighbours a shorter way. */
(() => {
  'use strict';

  const NAMES = ['Home', 'A', 'B', 'C', 'D', 'School'];
  const POS = [[50, 150], [200, 55], [200, 245], [390, 55], [390, 245], [550, 150]];
  const EDGES = [[0, 1], [0, 2], [1, 2], [1, 3], [1, 4], [2, 4], [3, 4], [3, 5], [4, 5]];
  const rnd = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
  const s = (k) => (k === 1 ? '' : 's');

  function make() {
    return { w: EDGES.map(() => rnd(1, 9)) };
  }

  function adjacency(w) {
    const adj = NAMES.map(() => []);
    EDGES.forEach(([a, b], k) => { adj[a].push([b, w[k], k]); adj[b].push([a, w[k], k]); });
    return adj;
  }

  function record(inp) {
    const adj = adjacency(inp.w), n = NAMES.length, END = n - 1;
    const dist = Array(n).fill(null), prev = Array(n).fill(-1), done = Array(n).fill(false);
    const frames = [];
    let c = 0, path = [], edge = -1;
    const rec = (cur, line, note, q) => frames.push({
      dist: dist.slice(), prev: prev.slice(), done: done.slice(), cur, edge, path: path.slice(), c, line, note, q: q || null,
    });

    dist[0] = 0;
    rec(-1, -1, 'Roads have lengths. Find the shortest way from Home to School. Press play.');
    rec(0, 0, 'Home is 0 away from itself. Every other town is "?" for now: we have not found any way there yet.');
    for (;;) {
      let u = -1;
      for (let i = 0; i < n; i++) if (!done[i] && dist[i] !== null && (u < 0 || dist[i] < dist[u])) u = i;
      if (u < 0) break;
      const cands = [];
      for (let i = 0; i < n; i++) if (!done[i] && dist[i] !== null && (i === u || dist[i] !== dist[u])) cands.push(i);
      const pick = [u, ...cands.filter((i) => i !== u).slice(0, 3)].sort((x, y) => x - y);
      const q = pick.length >= 2 ? {
        text: 'Which town do we settle next?',
        options: pick.map((i) => `${NAMES[i]} (${dist[i]})`),
        answer: pick.indexOf(u),
        why: `${NAMES[u]} has the smallest distance so far, ${dist[u]}. Nothing can reach it by a shorter way, because every other road starts from somewhere farther.`,
      } : null;
      edge = -1;
      rec(u, 1, `Settle ${NAMES[u]}: it is the closest town we have not settled. Its distance, ${dist[u]}, is final.`, q);
      done[u] = true;
      c++;
      if (u === END) break;
      for (const [v, len, k] of adj[u]) {
        if (done[v]) continue;
        const via = dist[u] + len;
        edge = k;
        if (dist[v] === null || via < dist[v]) {
          const was = dist[v];
          dist[v] = via; prev[v] = u;
          rec(v, 3, was === null ? `Road ${NAMES[u]} to ${NAMES[v]} is ${len}, so ${NAMES[v]} is ${dist[u]} + ${len} = ${via} away. First way found.`
            : `${dist[u]} + ${len} = ${via} beats ${was}. A shorter way to ${NAMES[v]}!`);
        } else {
          rec(v, 3, `${dist[u]} + ${len} = ${via}, not better than ${dist[v]}. Keep the old way to ${NAMES[v]}.`);
        }
      }
    }
    edge = -1;
    for (let k = END; k !== -1; k = prev[k]) path.unshift(k);
    rec(-1, 5, `School is ${dist[END]} away. The shortest way: ${path.map((i) => NAMES[i]).join(' → ')}.`);
    rec(-1, 5, `We settled ${c} town${s(c)} and never needed to try every possible route.`);
    return frames;
  }

  const ALGOS = {
    dijkstra: {
      name: "Dijkstra's shortest path",
      blurb: 'Keep the best distance found so far to each town. Always settle the closest town you have not settled, because nothing can beat it now. Then see if its roads give a neighbour a shorter way.',
      facts: [['Finds', 'Shortest way'], ['Roads', 'Never negative'], ['Work', 'O(E log V)']],
      code: [
        'Home is 0; every other town is ?',
        'pick the closest unsettled town, u',
        'its distance is now final',
        'for each road u – v of length len:',
        '  if dist[u] + len is shorter, update v',
        'follow the arrows back from School',
      ],
      offline: {
        title: 'Shortest way to school',
        need: 'Paper, a pencil and a ruler',
        time: '20 minutes',
        steps: [
          'Draw six dots as towns and join them with roads. Write a length on each road, 1 to 9.',
          'Write 0 next to Home and a question mark next to every other town.',
          'Circle the unsettled town with the smallest number. Its number is final.',
          'For each road leaving it, add the road length to its number. If that beats the neighbour\'s number, cross it out and write the smaller one.',
          'Repeat until School is circled. Trace the route back by following the roads that gave each final number.',
        ],
        think: 'Why is it safe to say a town\'s number is final the moment it is the smallest? What would go wrong if a road could have a negative length?',
      },
    },
  };

  globalThis.VLPaths = { ALGOS, record, make, adjacency, NAMES, EDGES };

  // ---------- page ----------
  if (typeof document === 'undefined') return;
  const $ = (id) => document.getElementById(id);
  const view = $('view');
  let input = make();

  const lesson = {
    algos: ALGOS,
    record: () => record(input),
    render(f) {
      const onPath = new Set();
      for (let i = 0; i + 1 < f.path.length; i++) onPath.add([f.path[i], f.path[i + 1]].sort().join('-'));
      let out = '<svg class="graph" viewBox="0 0 600 300" role="img" aria-label="Map of towns and roads">';
      EDGES.forEach(([a, b], k) => {
        const [x1, y1] = POS[a], [x2, y2] = POS[b];
        const on = onPath.has([a, b].sort().join('-'));
        out += `<line class="g-edge${on ? ' path' : k === f.edge ? ' now' : ''}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
        out += `<g class="g-len"><rect x="${(x1 + x2) / 2 - 12}" y="${(y1 + y2) / 2 - 11}" width="24" height="22" rx="6"/><text x="${(x1 + x2) / 2}" y="${(y1 + y2) / 2 + 5}" text-anchor="middle">${input.w[k]}</text></g>`;
      });
      NAMES.forEach((name, i) => {
        const [x, y] = POS[i];
        const cls = f.path.includes(i) ? 'path' : i === f.cur ? 'cur' : f.done[i] ? 'done' : f.dist[i] !== null ? 'seen' : '';
        out += `<g class="g-node ${cls}"><circle cx="${x}" cy="${y}" r="26"/><text x="${x}" y="${y - 2}" text-anchor="middle" class="nm">${name}</text>`
          + `<text x="${x}" y="${y + 13}" text-anchor="middle" class="ds">${f.dist[i] === null ? '?' : f.dist[i]}</text></g>`;
      });
      view.className = 'graphwrap';
      view.innerHTML = out + '</svg>';
      view.setAttribute('aria-label', 'Distances from Home: ' + NAMES.map((nm, i) => `${nm} ${f.dist[i] === null ? 'unknown' : f.dist[i]}`).join(', '));
    },
    stats: (f) => [['Towns settled', f.c], ['School', f.dist[NAMES.length - 1] === null ? '?' : f.dist[NAMES.length - 1]]],
  };

  const player = VLPlayer.mount(lesson);
  $('b-new').addEventListener('click', () => { input = make(); player.restart(); });
})();
