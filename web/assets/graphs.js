/* VisuaLearn graph lessons: pictures, components, cycles, two-colouring, topological order, union-find,
   Bellman-Ford, Floyd-Warshall, minimum spanning trees, A*, max flow and matching. */
(() => {
  'use strict';
  const { rnd, pick, distinct, shuffle, row, rows, choice, numq, yesno, plural } = VLLab;
  const off = (title, need, time, steps, think) => ({ title, need, time, steps, think });
  const L = (i) => String.fromCharCode(65 + i);
  const INF = Infinity;

  const ring = (n) => Array.from({ length: n }, (_, i) => { const a = -Math.PI / 2 + (2 * Math.PI * i) / n; return { x: Math.round(300 + 215 * Math.cos(a)), y: Math.round(150 + 105 * Math.sin(a)) }; });
  const gv = (nodes, edges, lists, h) => ({ type: 'graph', h: h || 300, nodes, edges, lists: lists || [] });
  const key = (a, b) => (a < b ? `${a}-${b}` : `${b}-${a}`);
  function uf(n) { const p = Array.from({ length: n }, (_, i) => i); const find = (x) => (p[x] === x ? x : (p[x] = find(p[x]))); return { find, union: (a, b) => { a = find(a); b = find(b); if (a === b) return false; p[a] = b; return true; } }; }

  const ALGOS = {
    picture: {
      name: 'Graphs as pictures',
      blurb: 'A graph is dots (nodes) joined by lines (edges). To store one, write for every dot the list of its neighbours. Roads, friends and web links are all graphs.',
      facts: [['Dots', 'Nodes'], ['Lines', 'Edges'], ['Stored as', 'A list of neighbours']],
      code: ['for each dot, keep a list of neighbours', 'adding a line A–B: add B to A\'s list', 'and A to B\'s list', 'neighbours of a dot = its list'],
      offline: off('Draw the web', 'Paper and a pencil', '10 minutes', [
        'Draw 6 dots and name them A to F. Join some with lines.',
        'Next to each dot, write the names of the dots it touches. That is its neighbour list.',
        'Pick a dot and check: does each neighbour list it back?',
        'Count the lines. Add up all the neighbour list lengths. What do you notice?'], 'Why is the total of all the list lengths exactly twice the number of lines?'),
      make() {
        const n = 6, es = []; for (let i = 0; i < n; i++) es.push([i, (i + 1) % n]);
        const extra = distinct(3, 0, 5).map((a) => [a, (a + 2 + rnd(0, 1)) % n]).filter(([a, b]) => a !== b && !es.some((e) => key(e[0], e[1]) === key(a, b)));
        const seen = new Set(es.map((e) => key(e[0], e[1]))); const more = extra.filter(([a, b]) => { const k = key(a, b); if (seen.has(k)) return false; seen.add(k); return true; });
        return { n, es: shuffle([...es, ...more]) };
      },
      run(x, { n, es }) {
        const P = ring(n), adj = Array.from({ length: n }, () => []), shown = [];
        const view = (hl) => gv(P.map((p, i) => ({ id: i, ...p, t: L(i), c: hl && hl.includes(i) ? 'cur' : '' })), shown.map((e) => ({ a: e[0], b: e[1] })), adj.map((l, i) => ({ label: `${L(i)}:`, items: l.map(L) })));
        x.rec(view(), -1, `Six dots. Add the lines one at a time, and keep a neighbour list for each dot. Press play.`);
        let asked = 0;
        es.forEach(([a, b], k) => {
          shown.push([a, b]); adj[a].push(b); adj[b].push(a);
          x.rec(view([a, b]), 1, `Add the line ${L(a)}–${L(b)}: ${L(b)} goes in ${L(a)}'s list, and ${L(a)} in ${L(b)}'s.`,
            k >= 3 && asked < 2 ? (asked++, numq(`How many neighbours does ${L(a)} have now?`, adj[a].length, [adj[a].length + 1, Math.max(0, adj[a].length - 1), 1], `${L(a)}'s list is ${adj[a].map(L).join(', ')}.`)) : null);
        });
        const total = adj.reduce((s, l) => s + l.length, 0);
        x.rec(view(), 3, `${es.length} lines, and the lists add up to ${total}, exactly twice as many. Each line is listed from both ends.`);
        x.result = { n, adj: adj.map((l) => l.slice().sort((p, q) => p - q)), edges: es.length };
      },
    },

    components: {
      name: 'Connected components',
      blurb: 'A graph can fall into separate islands. Start anywhere, explore everything you can reach, and colour it. Then start again from a dot you have not reached. The number of fresh starts is the number of islands.',
      facts: [['Islands', 'Components'], ['Time', 'O(dots + lines)'], ['Uses', 'DFS or BFS']],
      code: ['for each dot', '  if it is not reached yet:', '    a new island! explore it all', '    mark everything reached with this colour', 'count the fresh starts'],
      offline: off('Count the islands', 'A drawing of 9 dots and some lines, and 3 coloured pencils', '10 minutes', [
        'Draw 9 dots and join some. Leave some dots cut off from others.',
        'Pick a dot and colour it. Then colour every dot you can reach by following lines.',
        'Pick an uncoloured dot with a new colour and repeat.',
        'The number of colours you used is the number of islands.'], 'Can two dots of different colours ever share a line?'),
      make() {
        const sizes = shuffle([2, 3, 4]); const nodes = [], es = []; const offs = [[-40, -40], [40, -40], [-40, 40], [40, 40]]; let id = 0;
        sizes.forEach((s, g) => { const base = id; for (let k = 0; k < s; k++) { nodes.push({ id: id++, x: 110 + g * 190 + offs[k][0], y: 150 + offs[k][1] }); } for (let k = 1; k < s; k++) es.push([base + k - 1, base + k]); if (s === 4 && Math.random() < 0.6) es.push([base, base + 3]); });
        if (Math.random() < 0.35) es.push([sizes[0] - 1, sizes[0]]); // sometimes two islands touch
        return { nodes, es };
      },
      run(x, { nodes, es }) {
        const n = nodes.length, adj = Array.from({ length: n }, () => []);
        es.forEach(([a, b]) => { adj[a].push(b); adj[b].push(a); });
        const comp = Array(n).fill(-1), cls = ['key', 'found', 'alt', 'done', 'swap'];
        const view = (cur) => gv(nodes.map((nd) => ({ ...nd, t: L(nd.id), c: nd.id === cur ? 'cur' : comp[nd.id] >= 0 ? cls[comp[nd.id] % cls.length] : '' })), es.map(([a, b]) => ({ a, b })), [], 270);
        let c = 0, asked = 0;
        x.rec(view(), -1, 'How many separate islands? Press play.', null, [['Islands', 0]]);
        for (let s = 0; s < n; s++) {
          if (comp[s] >= 0) continue;
          x.rec(view(s), 2, `${L(s)} has not been reached. A new island starts here.`, asked < 2 && s > 0 ? (asked++, yesno(`Has ${L(s)} already been reached by an earlier island?`, false, `No: ${L(s)} is still uncoloured, so nothing explored so far touches it.`)) : null, [['Islands', c + 1]]);
          const st = [s]; comp[s] = c;
          while (st.length) { const u = st.pop(); for (const v of adj[u]) if (comp[v] < 0) { comp[v] = c; st.push(v); } }
          x.rec(view(), 3, `Everything reachable from ${L(s)} is now the same colour.`, null, [['Islands', c + 1]]);
          c++;
        }
        x.rec(view(), 4, `${c} islands.`, null, [['Islands', c]]);
        x.result = { count: c, comp: comp.slice() };
      },
    },

    cycle: {
      name: 'Cycle detection in graphs',
      blurb: 'Walk the graph depth-first. If you meet a dot you have already visited, and it is not the one you just came from, you have found a way round: a cycle.',
      facts: [['Time', 'O(dots + lines)'], ['Cycle means', 'A way back to the start'], ['Tree', 'Has no cycle']],
      code: ['visit a dot, remember where we came from', 'for each neighbour', '  if it is the dot we came from: ignore', '  if it was already visited: a cycle!', '  else visit it', 'no repeat found: no cycle'],
      offline: off('Find the loop', 'A drawing of 6 dots and 5 or 6 lines, and a pencil', '10 minutes', [
        'Draw 6 dots joined by 5 lines so every dot is reachable. Walk from dot A, marking each dot you reach.',
        'Add one more line between two dots that are already joined by a path.',
        'Walk again. When a line leads to a marked dot (that you did not just come from), you have found the loop.'], 'Why does a connected graph with n dots and n − 1 lines never have a cycle?'),
      make() {
        const n = 6, es = []; for (let i = 1; i < n; i++) es.push([rnd(0, i - 1), i]);
        let extra = null;
        if (Math.random() < 0.6) { for (;;) { const a = rnd(0, n - 1), b = rnd(0, n - 1); if (a !== b && !es.some((e) => key(e[0], e[1]) === key(a, b))) { extra = [a, b]; es.push(extra); break; } } }
        return { n, es };
      },
      run(x, { n, es }) {
        const P = ring(n), adj = Array.from({ length: n }, () => []); es.forEach(([a, b], k) => { adj[a].push([b, k]); adj[b].push([a, k]); });
        const vis = new Set(), ec = {}; let found = null, asked = 0;
        const view = (cur) => gv(P.map((p, i) => ({ id: i, ...p, t: L(i), c: i === cur ? 'cur' : vis.has(i) ? 'seen' : '' })), es.map(([a, b], k) => ({ a, b, c: ec[k] || '' })), []);
        x.rec(view(), -1, 'Is there a cycle? Walk depth-first from A. Press play.');
        const dfs = (u, from) => {
          vis.add(u); x.rec(view(u), 0, `Visit ${L(u)}.`);
          for (const [v, k] of adj[u]) {
            if (found) return;
            if (v === from) continue;
            if (vis.has(v)) {
              ec[k] = 'cut'; found = [u, v];
              x.rec(view(u), 3, `${L(v)} was already visited, and it isn't where we came from. A cycle!`, asked < 2 ? (asked++, yesno(`${L(u)}'s neighbour ${L(v)}: visited already, and not the way we came?`, true, 'That means there are two different ways to reach it, which is a cycle.')) : null);
              return;
            }
            ec[k] = 'on';
            x.rec(view(u), 4, `${L(v)} is new. Go there.`, asked < 2 ? (asked++, yesno(`Has ${L(v)} been visited?`, false, `${L(v)} is new, so no cycle yet through this line.`)) : null);
            dfs(v, u);
            if (found) return;
            ec[k] = 'done';
          }
        };
        dfs(0, -1);
        if (!found) x.rec(view(), 5, 'Every line led to a new dot. There is no cycle: this graph is a tree.');
        x.result = found !== null;
      },
    },

    bipartite: {
      name: 'Two-colouring (bipartite)',
      blurb: 'Can you colour the dots with two colours so every line joins different colours? Colour one dot, then colour its neighbours the other colour, and so on. If a line joins two dots of the same colour, it cannot be done.',
      facts: [['Possible when', 'No odd-length loop'], ['Time', 'O(dots + lines)'], ['Uses', 'BFS']],
      code: ['colour the first dot green', 'take a dot from the queue', '  each neighbour gets the opposite colour', '  if a neighbour already has the same colour: impossible', 'every dot coloured: it works'],
      offline: off('Two crayons', 'A drawing of a loop of dots, and 2 crayons', '10 minutes', [
        'Draw a loop of 4 dots and join them in a ring. Colour one dot red.',
        'Colour its neighbours blue, then their neighbours red, going round the ring.',
        'Does it work? Now try a loop of 5.'], 'Why does an odd-length loop always fail?'),
      make() { return { n: rnd(4, 7) }; },
      run(x, { n }) {
        const P = ring(n), es = Array.from({ length: n }, (_, i) => [i, (i + 1) % n]), adj = Array.from({ length: n }, () => []);
        es.forEach(([a, b]) => { adj[a].push(b); adj[b].push(a); });
        const col = Array(n).fill(-1), ec = {}, names = ['Amber', 'Green'], cl = ['key', 'found'];
        const view = (cur) => gv(P.map((p, i) => ({ id: i, ...p, t: L(i), c: i === cur ? 'cur' : col[i] >= 0 ? cl[col[i]] : '' })), es.map(([a, b]) => ({ a, b, c: ec[key(a, b)] || '' })), []);
        x.rec(view(), -1, `A ring of ${n} dots. Colour them with two colours so no line joins the same colour. Press play.`);
        col[0] = 0; const q = [0]; let asked = 0;
        x.rec(view(0), 0, 'Colour A amber.');
        while (q.length) {
          const u = q.shift();
          for (const v of adj[u]) {
            const want = 1 - col[u];
            if (col[v] === -1) {
              col[v] = want; q.push(v); ec[key(u, v)] = 'on';
              x.rec(view(v), 2, `${L(v)} is next to ${L(u)} (${names[col[u]]}), so make it ${names[want]}.`, asked < 3 ? (asked++, choice(`${L(u)} is ${names[col[u]].toLowerCase()}. What colour should its neighbour ${L(v)} be?`, names[want], [names[col[u]]], 'A line must join two different colours.')) : null);
            } else if (col[v] === col[u]) {
              ec[key(u, v)] = 'cut';
              x.rec(view(v), 3, `${L(u)} and ${L(v)} are both ${names[col[u]].toLowerCase()}, and they share a line. It can't be done.`);
              x.result = false; return;
            }
          }
        }
        x.rec(view(), 4, 'Every line joins two different colours. It works.');
        x.result = true;
      },
    },

    topo: {
      name: 'Topological sort',
      blurb: 'Some jobs must wait for others. Count how many things each job is waiting for. Do any job that is waiting for nothing, then tell the jobs after it that one wait is over. Repeat.',
      facts: [['Needs', 'No loops'], ['Time', 'O(jobs + links)'], ['Result', 'A valid order']],
      code: ['count what each job is waiting for', 'queue every job waiting for nothing', 'take a job from the queue and do it', '  for each job after it: its count goes down by one', '  if a count reaches 0: add it to the queue', 'order done = a valid order'],
      offline: off('Getting ready', 'Cards for 6 jobs, and arrows drawn between them', '15 minutes', [
        'Write jobs on cards: Wake, Wash, Dress, Eat, Pack, Go. Draw an arrow from each job to one that must come after it.',
        'Next to each card write how many arrows point into it.',
        'Do a card with 0, write the order down, and cross out the arrows leaving it.',
        'Repeat until all cards are done.'], 'Can there be more than one valid order? What if two jobs wait for each other?'),
      make() {
        return pick([
          { names: ['Wake', 'Wash', 'Dress', 'Eat', 'Pack', 'Go'], pos: [[60, 80], [210, 40], [360, 40], [210, 160], [60, 220], [530, 130]], es: [[0, 1], [0, 3], [1, 2], [2, 5], [3, 5], [4, 5]] },
          { names: ['Flour', 'Water', 'Mix', 'Heat', 'Bake', 'Eat'], pos: [[60, 50], [60, 190], [220, 120], [220, 250], [380, 150], [530, 150]], es: [[0, 2], [1, 2], [2, 4], [3, 4], [4, 5]] },
        ]);
      },
      run(x, { names, pos, es }) {
        const n = names.length, indeg = Array(n).fill(0), adj = Array.from({ length: n }, () => []);
        es.forEach(([a, b]) => { indeg[b]++; adj[a].push(b); });
        const done = [], q = []; for (let i = 0; i < n; i++) if (indeg[i] === 0) q.push(i);
        const view = (cur) => gv(pos.map((p, i) => ({ id: i, x: p[0], y: p[1], t: names[i], s: `wait ${indeg[i]}`, c: i === cur ? 'cur' : done.includes(i) ? 'done' : q.includes(i) ? 'seen' : '' })), es.map(([a, b]) => ({ a, b, d: true, c: done.includes(a) ? 'dim' : '' })), [{ label: 'Ready', items: q.map((i) => names[i]) }, { label: 'Done', items: done.map((i) => names[i]) }], 280);
        x.rec(view(), -1, 'Each job shows how many jobs it is still waiting for. Press play.');
        x.rec(view(), 1, `Jobs waiting for nothing go in the ready line: ${q.map((i) => names[i]).join(', ')}.`);
        let asked = 0;
        while (q.length) {
          const u = q.shift();
          x.rec(view(u), 2, `Do ${names[u]}.`, asked < 3 && names.some((_, i) => i !== u && indeg[i] > 0 && !done.includes(i)) ? (asked++, choice('Which job can be done next?', names[u], names.filter((_, i) => i !== u && indeg[i] > 0 && !done.includes(i)), `${names[u]} is waiting for nothing; the others still wait for something.`)) : null);
          done.push(u);
          for (const v of adj[u]) { indeg[v]--; if (indeg[v] === 0) q.push(v); }
          x.rec(view(), 4, `${names[u]} is done. The jobs after it have one fewer wait.`);
        }
        x.rec(view(), 5, `A valid order: ${done.map((i) => names[i]).join(', ')}.`);
        x.result = { order: done.slice(), es };
      },
    },

    unionfind: {
      name: 'Union-find',
      blurb: 'Keep groups of things as small trees. Each item points to a parent, and the top of a tree names the group. To join two groups, hang one top under the other. Pointing items straight at the top makes later look-ups fast.',
      facts: [['Find', 'Follow parents to the top'], ['Union', 'Join two tops'], ['Speed-up', 'Path compression']],
      code: ['find(x): follow parents until an item is its own parent', '  point everything on the way straight at the top', 'union(a, b): find both tops', '  if they differ, hang one under the other', 'same top = same group'],
      offline: off('Friend circles', '8 name cards and some string', '15 minutes', [
        'Give each person a card and make each their own group (a card pointing at itself).',
        'To join two people: follow arrows from each up to their leader, then make one leader point at the other.',
        'After several joins, ask: are these two in the same group? Follow arrows to the leaders and compare.'], 'Why is it worth pointing everyone straight at the leader after looking them up?'),
      make() { const ps = []; while (ps.length < 5) { const a = rnd(0, 7), b = rnd(0, 7); if (a !== b) ps.push([a, b]); } return { ps }; },
      run(x, { ps }) {
        const n = 8, par = Array.from({ length: n }, (_, i) => i), size = Array(n).fill(1);
        const groups = () => { const m = new Map(); par.forEach((_, i) => { let r = i; while (par[r] !== r) r = par[r]; (m.get(r) || m.set(r, []).get(r)).push(i); }); return [...m.values()]; };
        const view = (marks) => ({ ...rows([row('item', par.map((_, i) => i), {}), row('parent', par, marks || {})]), lists: groups().map((g) => ({ label: 'Group', items: g })) });
        x.rec(view(), -1, 'Eight items, each its own group (each is its own parent). Join some pairs. Press play.');
        const find = (a) => { const path = [a]; while (par[path[path.length - 1]] !== path[path.length - 1]) path.push(par[path[path.length - 1]]); return path; };
        let asked = 0;
        ps.forEach(([a, b]) => {
          const pa = find(a), pb = find(b), ra = pa[pa.length - 1], rb = pb[pb.length - 1];
          x.rec(view(Object.fromEntries([...pa, ...pb].map((i) => [i, 'cur']))), 0, `Join ${a} and ${b}. The top of ${a}'s group is ${ra}; the top of ${b}'s group is ${rb}.`, asked < 3 ? (asked++, yesno(`Are ${a} and ${b} already in the same group?`, ra === rb, ra === rb ? `Both follow parents up to ${ra}, so they are already together.` : `Different tops (${ra} and ${rb}), so they are in different groups.`)) : null);
          if (ra === rb) { x.rec(view(), 3, 'Same top: already together. Nothing to do.'); return; }
          const [big, small] = size[ra] >= size[rb] ? [ra, rb] : [rb, ra];
          par[small] = big; size[big] += size[small];
          x.rec(view({ [small]: 'found' }), 3, `Hang ${small} under ${big}. The smaller group joins the bigger one.`);
          for (const p of [...pa, ...pb]) { const top = find(p).slice(-1)[0]; if (p !== top) par[p] = top; }
          x.rec(view(), 1, 'Point the items we walked through straight at their top, so the next look-up is quicker.');
        });
        x.result = groups().map((g) => g.slice().sort((p, q) => p - q)).sort((p, q) => p[0] - q[0]);
      },
    },

    bellman: {
      name: 'Bellman-Ford',
      blurb: 'Dijkstra needs every road to cost something. If a road can give you a refund (a negative length), try every road again and again. Each round, any road that gives a town a shorter way updates it. After enough rounds nothing changes.',
      facts: [['Handles', 'Negative roads'], ['Time', 'O(towns × roads)'], ['Rounds', 'Up to towns − 1']],
      code: ['start: 0 for Home, ∞ for every other town', 'repeat up to (towns − 1) times:', '  for every road u → v of length w:', '    if dist[u] + w < dist[v]: update dist[v]', 'if a whole round changes nothing: stop'],
      offline: off('Try every road', 'Paper, a pencil and a small map with one negative road', '15 minutes', [
        'Draw 5 towns and some one-way roads with lengths. Make one road a refund, like −2.',
        'Write 0 by Home and ∞ by the others.',
        'Go through every road in any order. If dist[start] + length beats dist[end], cross out and write the better number.',
        'Go through all roads again. Stop when a whole pass changes nothing.'], 'Why can the answer never need more than (towns − 1) rounds?'),
      make() { return { w: [[0, 1], [0, 2], [1, 2], [1, 3], [2, 3], [2, 4], [3, 4]].map(([a, b]) => [a, b, pick([-2, -1, 1, 2, 3, 4, 5, 6, 7])]) }; },
      run(x, { w }) {
        const P = [[50, 150], [200, 50], [200, 250], [390, 50], [550, 150]], n = 5, names = ['Home', 'A', 'B', 'C', 'End'], dist = Array(n).fill(INF); dist[0] = 0;
        const show = (d) => (d === INF ? '∞' : d);
        const view = (ei, ec) => gv(P.map((p, i) => ({ id: i, x: p[0], y: p[1], t: names[i], s: show(dist[i]), c: ei >= 0 && w[ei][1] === i ? 'cur' : dist[i] !== INF ? 'seen' : '' })), w.map(([a, b, len], k) => ({ a, b, w: len, d: true, c: k === ei ? (ec || 'on') : '' })), []);
        x.rec(view(-1), -1, 'Try every road, round after round, and keep any improvement. Press play.');
        let asked = 0;
        for (let round = 1; round < n; round++) {
          let changed = false;
          x.rec(view(-1), 1, `Round ${round}: look at every road.`);
          w.forEach(([a, b, len], k) => {
            const via = dist[a] === INF ? INF : dist[a] + len, better = via < dist[b];
            x.rec(view(k), 3, dist[a] === INF ? `${names[a]} has no distance yet, so this road can't help.` : `${names[a]} → ${names[b]}: ${dist[a]} + ${len} = ${via}, against ${show(dist[b])}.`,
              asked < 3 && dist[a] !== INF ? (asked++, yesno(`Does the road ${names[a]} → ${names[b]} (${len}) give ${names[b]} a shorter way?`, better, better ? `${via} < ${show(dist[b])}, so update.` : `${via} is not better than ${show(dist[b])}.`)) : null);
            if (better) { dist[b] = via; changed = true; x.rec(view(k, 'path'), 3, `Update ${names[b]} to ${via}.`); }
          });
          if (!changed) { x.rec(view(-1), 4, `Nothing changed in round ${round}. Done early.`); break; }
        }
        x.rec(view(-1), 4, `Shortest distances from Home: ${names.map((nm, i) => `${nm} ${show(dist[i])}`).join(', ')}.`);
        x.result = dist.map((d) => (d === INF ? null : d));
      },
    },

    floyd: {
      name: 'All-pairs shortest paths (Floyd-Warshall)',
      blurb: 'A table of the shortest way between every pair of towns. Try each town k in turn as a stop-over: if going i → k → j is shorter than the best way i → j known so far, update the table.',
      facts: [['Answers', 'Every pair at once'], ['Time', 'O(towns³)'], ['Idea', 'Allow one more stop-over']],
      code: ['table[i][j] ← direct road, or ∞', 'for each stop-over town k', '  for each pair i, j:', '    if table[i][k] + table[k][j] < table[i][j]:', '      table[i][j] ← that sum', 'table holds every shortest distance'],
      offline: off('The distance table', 'Paper (a 4 by 4 grid) and a small map', '20 minutes', [
        'Draw 4 towns with one-way roads. Fill a 4 by 4 table with the direct road lengths, ∞ where there is none, 0 on the diagonal.',
        'Pick town A as the stop-over. For every cell, check: is (row to A) + (A to column) smaller? If so, write it in.',
        'Repeat with B, then C, then D as the stop-over.',
        'The table now holds the shortest distance between every pair.'], 'Why does the order of the stop-over towns not matter, as long as you use each once?'),
      make() { const n = 4, m = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 0 : Math.random() < 0.65 ? rnd(1, 9) : INF))); return { m: m.map((r) => r.map((v) => (v === INF ? null : v))) }; },
      run(x, { m }) {
        const n = 4, D = m.map((r) => r.map((v) => (v === null ? INF : v)));
        const cell = (v) => (v === INF ? '∞' : v);
        const view = (marks, k) => ({ type: 'grid', cols: n + 1, cells: [{ t: k === undefined ? '' : `via ${L(k)}`, c: '' }, ...Array.from({ length: n }, (_, j) => ({ t: L(j), c: '' })), ...D.flatMap((r, i) => [{ t: L(i), c: '' }, ...r.map((v, j) => ({ t: cell(v), c: (marks && marks[`${i}${j}`]) || '' }))])], lists: [] });
        x.rec(view(), -1, 'Rows are "from", columns are "to". Each cell is the best distance known. Press play.');
        let asked = 0;
        for (let k = 0; k < n; k++) {
          const marks = {}; const changes = [];
          if (asked < 2) {
            const [i, j] = [[1, 2], [2, 3], [3, 0], [0, 1]][k];
            if (i !== k && j !== k && i !== j) { asked++; const via = D[i][k] + D[k][j]; x.rec(view({ [`${i}${j}`]: 'cur', [`${i}${k}`]: 'seen', [`${k}${j}`]: 'seen' }, k), 3, `Could going via ${L(k)} help ${L(i)} → ${L(j)}?`, yesno(`Is ${cell(D[i][k])} + ${cell(D[k][j])} smaller than the current ${cell(D[i][j])}?`, via < D[i][j], via < D[i][j] ? 'Yes, the stop-over gives a shorter way.' : 'No, the direct way is as good or better.')); }
          }
          for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const via = D[i][k] + D[k][j]; if (via < D[i][j]) { D[i][j] = via; marks[`${i}${j}`] = 'found'; changes.push(`${L(i)}→${L(j)} = ${via}`); } }
          x.rec(view(marks, k), 4, changes.length ? `Allow ${L(k)} as a stop-over. Improved: ${changes.join(', ')}.` : `Allow ${L(k)} as a stop-over. Nothing improves.`);
        }
        x.rec(view(), 5, 'The table now holds the shortest distance between every pair.');
        x.result = D.map((r) => r.map((v) => (v === INF ? null : v)));
      },
    },

    kruskal: {
      name: 'Minimum spanning trees',
      blurb: 'Join every town with the cheapest total road. Sort the roads from cheapest to dearest. Take a road only if it joins two towns that are not already connected, so it never makes a loop.',
      facts: [['Result', 'Cheapest way to join all'], ['Time', 'O(roads log roads)'], ['Uses', 'Union-find']],
      code: ['sort the roads, cheapest first', 'for each road', '  if its ends are in different groups:', '    take the road, join the groups', '  else skip it (it would make a loop)', 'total of the taken roads'],
      offline: off('Cheapest network', 'Paper, a pencil and a small map with road costs', '15 minutes', [
        'Draw 6 towns and 8 roads with different costs.',
        'List the roads from cheapest to dearest.',
        'Go down the list. Draw a road in colour only if it does not close a loop with roads already coloured.',
        'Stop when all 6 towns are joined (5 roads). Add up the costs.'], 'Why is it safe to always take the cheapest road that does not close a loop?'),
      make() {
        const n = 6, es = []; for (let i = 1; i < n; i++) es.push([rnd(0, i - 1), i]);
        while (es.length < 8) { const a = rnd(0, n - 1), b = rnd(0, n - 1); if (a !== b && !es.some((e) => key(e[0], e[1]) === key(a, b))) es.push([a, b]); }
        const w = distinct(8, 1, 15); return { n, es: es.map(([a, b], i) => [a, b, w[i]]) };
      },
      run(x, { n, es }) {
        const P = ring(n), sorted = es.map((e, i) => ({ a: e[0], b: e[1], w: e[2] })).sort((p, q) => p.w - q.w), u = uf(n), taken = {}; let total = 0, asked = 0, cnt = 0;
        const view = (cur) => gv(P.map((p, i) => ({ id: i, ...p, t: L(i) })), es.map(([a, b, w]) => ({ a, b, w, c: taken[key(a, b)] || (cur && key(cur.a, cur.b) === key(a, b) ? 'on' : '') })), [{ label: 'Cheapest first', items: sorted.map((e) => `${L(e.a)}${L(e.b)}:${e.w}`) }, { label: 'Total', items: [total] }]);
        x.rec(view(), -1, 'Join all the towns as cheaply as possible. Press play.', null, [['Roads taken', 0], ['Total', 0]]);
        for (const e of sorted) {
          const same = u.find(e.a) === u.find(e.b);
          x.rec(view(e), 1, `Next cheapest: ${L(e.a)}–${L(e.b)} costs ${e.w}.`, asked < 3 ? (asked++, yesno(`Would the road ${L(e.a)}–${L(e.b)} make a loop (are they already joined)?`, same, same ? 'They are already connected, so this road would close a loop.' : 'They are in different groups, so this road is safe.')) : null, [['Roads taken', cnt], ['Total', total]]);
          if (same) { taken[key(e.a, e.b)] = 'cut'; x.rec(view(), 4, `Skip ${L(e.a)}–${L(e.b)}: it would close a loop.`, null, [['Roads taken', cnt], ['Total', total]]); continue; }
          u.union(e.a, e.b); taken[key(e.a, e.b)] = 'path'; total += e.w; cnt++;
          x.rec(view(), 3, `Take it. Total ${total}.`, null, [['Roads taken', cnt], ['Total', total]]);
          if (cnt === n - 1) break;
        }
        x.rec(view(), 5, `All ${n} towns are joined for ${total}.`, null, [['Roads taken', cnt], ['Total', total]]);
        x.result = { total, count: cnt };
      },
    },

    astar: {
      name: 'A* search',
      blurb: 'Like breadth-first search, but with a nose for the goal. Rate each square by the steps taken so far (g) plus a guess of the steps left (h, the straight-line count). Always explore the square with the smallest total f = g + h.',
      facts: [['Finds', 'Shortest path'], ['Needs', 'A guess that never over-estimates'], ['Faster than', 'Blind searching']],
      code: ['open ← [start]', 'take the open square with the smallest f = g + h', 'if it is the goal: stop', 'for each neighbour: g ← g + 1, f ← g + h', 'add it to the open list', 'follow the way back to draw the path'],
      offline: off('Guided walk', 'Squared paper, a pencil and a pair of coloured pencils', '15 minutes', [
        'Draw a 5 by 7 grid. Shade a few walls. Mark start (top left) and goal (bottom right).',
        'For a square, g is the steps you have walked to reach it. h is the number of squares across plus down to the goal, ignoring walls.',
        'Write f = g + h in each square you reach. Always continue from the open square with the smallest f.',
        'When you reach the goal, trace the way back.'], 'Why does the guess h help, and what would happen if h were always 0?'),
      make() {
        const R = 5, C = 7;
        for (;;) {
          const walls = new Set(distinct(7, 1, R * C - 2)); const goal = R * C - 1, q = [0], seen = new Set([0]);
          while (q.length) { const c = q.shift(); const r = Math.floor(c / C), k = c % C; for (const [dr, dk] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nr = r + dr, nk = k + dk, id = nr * C + nk; if (nr >= 0 && nr < R && nk >= 0 && nk < C && !walls.has(id) && !seen.has(id)) { seen.add(id); q.push(id); } } }
          if (seen.has(goal)) return { R, C, walls: [...walls] };
        }
      },
      run(x, { R, C, walls }) {
        const W = new Set(walls), goal = R * C - 1, h = (id) => (R - 1 - Math.floor(id / C)) + (C - 1 - (id % C));
        const g = new Map([[0, 0]]), par = new Map(), open = [0], closed = new Set(); let path = [], asked = 0, exp = 0;
        const view = (cur) => ({ type: 'grid', cols: C, cells: Array.from({ length: R * C }, (_, id) => ({ t: W.has(id) ? '' : g.has(id) ? g.get(id) + h(id) : id === goal ? 'G' : '', c: W.has(id) ? 'wall' : path.includes(id) ? 'found' : id === cur ? 'cur' : open.includes(id) ? 'key' : closed.has(id) ? 'seen' : '' })), lists: [] });
        x.rec(view(-1), -1, 'Find a way from the top-left to G. Each square shows f = g + h once it is reached. Press play.', null, [['Squares explored', 0]]);
        while (open.length) {
          open.sort((p, q) => g.get(p) + h(p) - (g.get(q) + h(q)) || h(p) - h(q));
          const cur = open.shift(), f = g.get(cur) + h(cur);
          exp++;
          const qq = asked < 3 && open.length ? (asked++, numq('What is the smallest f among the open (yellow-brown) squares?', f, [f + 1, f + 2, Math.max(0, f - 1)], `A* always takes the open square with the smallest f, which is ${f}.`)) : null;
          closed.add(cur);
          if (cur === goal) { for (let k = cur; k !== undefined; k = par.get(k)) path.unshift(k); x.rec(view(cur), 2, `Reached the goal after exploring ${exp} squares. The path is ${path.length - 1} steps.`, null, [['Squares explored', exp]]); break; }
          x.rec(view(cur), 1, `Take the open square with the smallest f, which is ${f}.`, qq, [['Squares explored', exp]]);
          const r = Math.floor(cur / C), k = cur % C;
          for (const [dr, dk] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
            const nr = r + dr, nk = k + dk, id = nr * C + nk;
            if (nr < 0 || nr >= R || nk < 0 || nk >= C || W.has(id) || closed.has(id)) continue;
            const ng = g.get(cur) + 1;
            if (!g.has(id) || ng < g.get(id)) { g.set(id, ng); par.set(id, cur); if (!open.includes(id)) open.push(id); }
          }
          x.rec(view(cur), 3, 'Work out f for the neighbours and add them to the open list.', null, [['Squares explored', exp]]);
        }
        x.rec(view(-1), 5, `Shortest path: ${path.length - 1} steps.`, null, [['Squares explored', exp]]);
        x.result = { steps: path.length - 1, path };
      },
    },

    flow: {
      name: 'Network flow',
      blurb: 'Pipes with limits: how much can flow from the source S to the sink T? Find any route with spare room, push as much as fits, and repeat. When no route is left, you have found the most.',
      facts: [['Finds', 'The biggest flow'], ['Method', 'Keep finding routes with room'], ['Time', 'O(V·E²)']],
      code: ['flow ← 0', 'find a route S → T where every pipe has spare room', 'push as much as the tightest pipe allows', 'add it to the flow; use up that room', 'no route left: the flow is the most possible'],
      offline: off('Pipes and buckets', 'Paper, a pencil and a drawing of 6 dots joined by arrows with limits', '20 minutes', [
        'Draw S, A, B, C, T with arrows and write a limit on each arrow.',
        'Find a route from S to T. The most you can send is the smallest limit along it. Write that flow on each arrow and subtract it from the limits.',
        'Find another route using the room that is left. Repeat until none exists.',
        'Add up everything you sent.'], 'Why can the flow never be more than the total limit of the pipes leaving S?'),
      make() { return { c: [[0, 1, rnd(3, 9)], [0, 2, rnd(3, 9)], [1, 2, rnd(1, 4)], [1, 3, rnd(2, 7)], [2, 3, rnd(2, 7)], [2, 4, rnd(2, 7)], [3, 5, rnd(4, 10)], [4, 5, rnd(3, 8)], [3, 4, rnd(1, 3)]] }; },
      run(x, { c }) {
        const names = ['S', 'A', 'B', 'C', 'D', 'T'], P = [[40, 150], [190, 60], [190, 240], [370, 60], [370, 240], [550, 150]], n = 6;
        const cap = Array.from({ length: n }, () => Array(n).fill(0)); c.forEach(([a, b, k]) => { cap[a][b] += k; });
        const flow = Array.from({ length: n }, () => Array(n).fill(0)), res = (u, v) => cap[u][v] - flow[u][v] + flow[v][u];
        const view = (pathEdges) => gv(P.map((p, i) => ({ id: i, x: p[0], y: p[1], t: names[i] })), c.map(([a, b, k]) => ({ a, b, w: `${flow[a][b]}/${k}`, d: true, c: pathEdges && pathEdges.some(([u, v]) => (u === a && v === b) || (u === b && v === a)) ? 'on' : flow[a][b] === k ? 'path' : '' })), [], 300);
        x.rec(view(), -1, 'Each pipe shows flow/limit. Push as much as possible from S to T. Press play.', null, [['Flow', 0]]);
        let total = 0, asked = 0;
        for (;;) {
          const par = Array(n).fill(-1); par[0] = 0; const q = [0];
          while (q.length) { const u = q.shift(); for (let v = 0; v < n; v++) if (par[v] < 0 && res(u, v) > 0) { par[v] = u; q.push(v); } }
          if (par[5] < 0) break;
          const route = []; let bott = INF; for (let v = 5; v !== 0; v = par[v]) { route.unshift([par[v], v]); bott = Math.min(bott, res(par[v], v)); }
          x.rec(view(route), 1, `A route with room: ${['S', ...route.map(([, v]) => names[v])].join(' → ')}.`, asked < 3 ? (asked++, numq(`The spare room on this route's pipes limits it. How much can we push?`, bott, [bott + 1, bott + 2, Math.max(0, bott - 1)], `The tightest pipe on the route has ${bott} spare, so no more than ${bott} fits.`)) : null, [['Flow', total]]);
          route.forEach(([u, v]) => { const back = Math.min(flow[v][u], bott); flow[v][u] -= back; flow[u][v] += bott - back; });
          total += bott;
          x.rec(view(route), 3, `Push ${bott}. Total flow ${total}.`, null, [['Flow', total]]);
        }
        x.rec(view(), 4, `No route with spare room is left. The most that can flow is ${total}.`, null, [['Flow', total]]);
        x.result = { flow: total, c };
      },
    },

    matching: {
      name: 'Bipartite matching',
      blurb: 'Pair each person on the left with one different friend on the right, using only the links allowed. Try the first free partner. If it is taken, ask whether the person holding it can switch to another. That chain of switches is an augmenting path.',
      facts: [['Finds', 'The most pairs'], ['Method', 'Try, and ask to switch'], ['Time', 'O(V·E)']],
      code: ['for each person on the left', '  for each allowed partner on the right', '    if the partner is free: pair them', '    else ask their current partner to try someone else', '    if that works: pair them', 'count the pairs'],
      offline: off('Dance partners', '4 names on the left, 4 on the right, and lines for who may pair', '15 minutes', [
        'Draw 4 people on the left and 4 on the right. Draw lines for allowed pairs.',
        'Take the left people in order. Pair each with the first allowed partner who is free.',
        'If a left person has only taken partners, ask one of those partners\' current pairs to switch to another allowed partner.',
        'Count the pairs. Can you find a way to get more?'], 'Why does a chain of switches never leave anyone worse off?'),
      make() { const es = []; for (let i = 0; i < 4; i++) { const ks = distinct(rnd(1, 2), 0, 3); ks.forEach((k) => es.push([i, k])); } return { es }; },
      run(x, { es }) {
        const adj = Array.from({ length: 4 }, () => []); es.forEach(([a, b]) => adj[a].push(b));
        const LN = ['A', 'B', 'C', 'D'], RN = ['1', '2', '3', '4'], matchR = Array(4).fill(-1);
        const pos = (side, i) => ({ x: side ? 460 : 140, y: 40 + i * 62 });
        const view = (cur, tried) => gv([...LN.map((t, i) => ({ id: `L${i}`, ...pos(0, i), t, c: i === cur ? 'cur' : matchR.includes(i) ? 'done' : '' })), ...RN.map((t, i) => ({ id: `R${i}`, ...pos(1, i), t, c: matchR[i] >= 0 ? 'done' : tried === i ? 'cur' : '' }))],
          es.map(([a, b]) => ({ a: `L${a}`, b: `R${b}`, c: matchR[b] === a ? 'path' : '' })), [], 260);
        x.rec(view(-1), -1, 'Pair each letter with a different number, using only the lines. Press play.', null, [['Pairs', 0]]);
        let asked = 0;
        const tryAug = (u, vis) => {
          for (const v of adj[u]) {
            if (vis.has(v)) continue; vis.add(v);
            const holder = matchR[v];
            x.rec(view(u, v), holder < 0 ? 2 : 3, holder < 0 ? `${RN[v]} is free: pair ${LN[u]} with ${RN[v]}.` : `${RN[v]} is taken by ${LN[holder]}. Ask ${LN[holder]} to switch.`,
              asked < 3 ? (asked++, yesno(`Is ${RN[v]} already paired?`, holder >= 0, holder >= 0 ? `Yes, with ${LN[holder]}. We ask ${LN[holder]} to try another partner.` : 'No, so we can pair right away.')) : null, [['Pairs', matchR.filter((m) => m >= 0).length]]);
            if (holder < 0 || tryAug(holder, vis)) { matchR[v] = u; x.rec(view(u, v), 4, `${LN[u]} is paired with ${RN[v]}.`, null, [['Pairs', matchR.filter((m) => m >= 0).length]]); return true; }
          }
          return false;
        };
        for (let u = 0; u < 4; u++) { x.rec(view(u), 0, `Find a partner for ${LN[u]}.`, null, [['Pairs', matchR.filter((m) => m >= 0).length]]); if (!tryAug(u, new Set())) x.rec(view(u), 0, `${LN[u]} cannot be paired this time.`, null, [['Pairs', matchR.filter((m) => m >= 0).length]]); }
        const size = matchR.filter((m) => m >= 0).length;
        x.rec(view(-1), 5, `${size} pair${size === 1 ? '' : 's'} in total.`, null, [['Pairs', size]]);
        x.result = { size, match: matchR.slice(), es };
      },
    },
  };

  VLLab.define('graphs', ALGOS);
})();
