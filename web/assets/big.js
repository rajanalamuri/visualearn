/* VisuaLearn big-questions lessons: randomised algorithms, game theory (minimax), easy and hard problems,
   and approximation. */
(() => {
  'use strict';
  const { rnd, pick, distinct, row, rows, choice, numq, yesno, plural } = VLLab;
  const off = (title, need, time, steps, think) => ({ title, need, time, steps, think });
  const L = (i) => String.fromCharCode(65 + i);

  const ALGOS = {
    random: {
      name: 'Randomised algorithms',
      blurb: 'Sometimes luck can answer a hard question. Throw darts at a square with a quarter-circle in it. The share that land inside tells you about the circle, and so about the number pi.',
      facts: [['Uses', 'Random choices'], ['More darts', 'Better answer'], ['Name', 'Monte Carlo']],
      code: ['inside ← 0', 'throw a dart at a random square', '  if it lands inside the quarter-circle: inside ← inside + 1', 'after n darts: π ≈ 4 × inside ÷ n'],
      offline: off('Dart board', 'Squared paper (10 by 10), a dice or coin to choose squares, and a ruler', '20 minutes', [
        'Draw a 10 by 10 grid and a quarter-circle of radius 10 from the bottom-left corner.',
        'Pick 20 random squares (roll a 10-sided dice twice, or draw numbers from a hat). Mark each one.',
        'Count how many fall inside the curve.',
        'Multiply that count by 4 and divide by 20. How close to 3.14 is it?'], 'What happens to your answer if you throw 1000 darts instead of 20?'),
      make() { return { darts: Array.from({ length: 16 }, () => [rnd(0, 9), rnd(0, 9)]) }; },
      run(x, { darts }) {
        const R = 10, inside = (p) => (p[0] + 0.5) ** 2 + (p[1] + 0.5) ** 2 < R * R;
        const cells = Array.from({ length: R * R }, () => ({ t: '', c: '' })); let hit = 0, asked = 0;
        const view = (cur) => ({ type: 'grid', cols: R, cells: cells.map((c, i) => ({ ...c, c: cur === i ? 'cur' : c.c })), lists: [{ label: 'Inside / thrown', items: [`${hit} / ${cells.filter((c) => c.t).length}`] }] });
        x.rec(view(-1), -1, `Throw ${darts.length} darts at the square. Count how many land inside the quarter-circle (the squares nearest the bottom-left). Press play.`, null, [['Estimate of π', '–']]);
        darts.forEach(([a, b], i) => {
          const id = (R - 1 - b) * R + a, ins = inside([a, b]);
          if (ins) hit++;
          cells[id] = { t: ins ? '●' : '○', c: ins ? 'found' : 'swap' };
          x.rec(view(id), 2, ins ? `Dart ${i + 1} lands inside the curve.` : `Dart ${i + 1} lands outside.`, asked < 3 && i >= 2 ? (asked++, yesno(`Does the dart at column ${a + 1}, row ${b + 1} (counting from the bottom-left) land inside the quarter-circle?`, ins, ins ? 'It is close enough to the corner to be inside the curve.' : 'It is too far from the corner: outside the curve.')) : null, [['Estimate of π', ((4 * hit) / (i + 1)).toFixed(2)]]);
        });
        const est = (4 * hit) / darts.length;
        x.rec(view(-1), 3, `${hit} of ${darts.length} darts landed inside: π ≈ 4 × ${hit} ÷ ${darts.length} = ${est.toFixed(2)}. More darts would get closer to 3.14.`, null, [['Estimate of π', est.toFixed(2)]]);
        x.result = { hit, n: darts.length, est, darts };
      },
    },

    nim: {
      name: 'Game theory (minimax)',
      blurb: 'Two players take turns removing 1, 2 or 3 stones. Whoever takes the last stone wins. Work backwards: a pile is a win if one move leaves your opponent a losing pile.',
      facts: [['Players', 'Both play perfectly'], ['Win', 'Some move leaves a loss'], ['Loss', 'Every move leaves a win']],
      code: ['a pile of 0: the player to move has lost', 'for each pile size n, smallest first', '  look at the piles after taking 1, 2 or 3', '  if any of them is a loss for the opponent: n is a win', '  else n is a loss'],
      offline: off('Play the stones', '13 coins or counters and a friend', '15 minutes', [
        'Put 13 coins in a pile. Take turns removing 1, 2 or 3. Whoever takes the last coin wins.',
        'Play a few games. Try to find a pile size that is always bad for whoever is about to move.',
        'Work out why multiples of 4 are the losing piles: whatever you take, your friend can take enough to leave another multiple of 4.'], 'If you go first with 13 coins, how many should you take?'),
      make() { return { n: 13 }; },
      run(x, { n }) {
        const W = Array(n).fill(null); W[0] = 'L'; let asked = 0;
        const view = (cur, from) => rows([row('stones left', Array.from({ length: n }, (_, i) => i), Object.fromEntries(Array.from({ length: n }, (_, i) => [i, cur === i ? 'cur' : (from || []).includes(i) ? 'key' : W[i] === 'L' ? 'swap' : W[i] === 'W' ? 'found' : ''])), {}), row('player to move', W.map((w) => (w === null ? '' : w === 'W' ? 'wins' : 'loses')), {})]);
        x.rec(view(-1), -1, `A pile of stones. Take 1, 2 or 3; the player who takes the last stone wins. For each pile size, does the player to move win (green) or lose (red) with perfect play? Press play.`);
        x.rec(view(0), 0, 'With no stones left, the player to move has already lost: the other player took the last one.');
        for (let k = 1; k < n; k++) {
          const nxt = [1, 2, 3].map((t) => k - t).filter((v) => v >= 0), win = nxt.some((v) => W[v] === 'L');
          W[k] = win ? 'W' : 'L';
          x.rec(view(k, nxt), win ? 3 : 4, win ? `Pile ${k}: taking ${k - nxt.find((v) => W[v] === 'L')} leaves ${nxt.find((v) => W[v] === 'L')}, a loss for the opponent. A win.` : `Pile ${k}: every move leaves a pile where the opponent wins. A loss.`,
            asked < 3 && k >= 3 ? (asked++, yesno(`With ${k} stones, can the player to move force a win?`, win, win ? 'Yes: some move leaves the opponent with a losing pile.' : `No: ${nxt.join(', ')} are all wins for the opponent.`)) : null);
        }
        x.rec(view(-1), 4, `The losing piles are ${W.map((w, i) => (w === 'L' ? i : null)).filter((v) => v !== null).join(', ')}: the multiples of 4. Leave your opponent a multiple of 4 and you always win.`);
        x.result = { W: W.slice(), n };
      },
    },

    hard: {
      name: 'Easy and hard problems (P vs NP)',
      blurb: 'Some problems are quick to check but seem slow to solve. Checking a guess takes one pass. Finding an answer may mean trying every set, and the number of sets doubles with each new number.',
      facts: [['Checking a guess', 'Fast'], ['Finding an answer', 'Maybe not'], ['Sets of n numbers', '2ⁿ']],
      code: ['to check a guess: add it up, compare with the target', 'to find one: try every set', 'with n numbers there are 2ⁿ sets', 'each new number doubles the work'],
      offline: off('Doubling sets', 'Paper and a pencil', '10 minutes', [
        'List all the sets you can make from the numbers {1}: there are 2 (empty, and {1}).',
        'Now from {1, 2}: 4 sets. From {1, 2, 3}: 8. List them all.',
        'Check a guess like {1, 3} with one addition. How many sets would you list for 20 numbers?'], 'If a computer could check a billion sets a second, how long would 60 numbers take?'),
      make() { return { max: 10 }; },
      run(x, { max }) {
        const check = [], search = [];
        const view = (k) => rows([row('numbers (n)', Array.from({ length: max }, (_, i) => i + 1), k >= 0 ? { [k]: 'cur' } : {}), row('check a guess', Array.from({ length: max }, (_, i) => check[i] ?? ''), {}), row('try every set', Array.from({ length: max }, (_, i) => search[i] ?? ''), Object.fromEntries(search.map((_, i) => [i, i >= 6 ? 'swap' : ''])))]);
        x.rec(view(-1), -1, 'For n numbers: how much work to check one guess, and how much to try every set? Press play.');
        let asked = 0;
        for (let n = 1; n <= max; n++) {
          check.push(n); search.push(2 ** n);
          x.rec(view(n - 1), 2, `${n} number${n === 1 ? '' : 's'}: checking one guess is ${n} additions at most; there are ${2 ** n} sets to try.`,
            asked < 3 && n >= 3 ? (asked++, numq(`With ${n} numbers, how many different sets are there?`, 2 ** n, [2 ** (n - 1), 2 ** (n + 1), n * n], `Each number is either in the set or out: 2 choices, ${n} times, 2^${n} = ${2 ** n}.`)) : null);
        }
        x.rec(view(max - 1), 3, `At ${max} numbers: ${max} to check, ${2 ** max} to search. Add 10 more numbers and the search is a thousand times bigger. This gap is the heart of "P versus NP".`);
        x.result = { check: check.slice(), search: search.slice() };
      },
    },

    approx: {
      name: 'Approximation',
      blurb: 'Some problems are too hard to solve perfectly in time. A good guess that is fast and never too far off is useful. Guard roads by putting guards at both ends of an unguarded road. You never use more than twice the best.',
      facts: [['Gives', 'Nearly the best'], ['Promise', 'At most twice as many'], ['Speed', 'Fast']],
      code: ['guards ← none', 'pick any road with no guard at either end', 'put guards at both ends', 'now every road touching those towns is guarded', 'repeat until every road is guarded'],
      offline: off('Guard the roads', 'Paper and a pencil, and a small map of 6 towns and 7 roads', '15 minutes', [
        'Draw 6 towns and 7 roads. A guard in a town protects every road that touches it.',
        'Pick any unguarded road. Put guards at both its ends. Cross out every road they now protect.',
        'Repeat until all roads are crossed out. Count the guards.',
        'Try to find a smaller set by thinking. Is yours less than half of what the quick method used?'], 'Why can the best possible answer never use fewer than half as many guards as this quick method?'),
      make() {
        const n = 6, es = []; for (let i = 1; i < n; i++) es.push([Math.floor(Math.random() * i), i]);
        while (es.length < 8) { const a = rnd(0, n - 1), b = rnd(0, n - 1); if (a !== b && !es.some((e) => (e[0] === a && e[1] === b) || (e[0] === b && e[1] === a))) es.push([a, b]); }
        return { n, es };
      },
      run(x, { n, es }) {
        const P = Array.from({ length: n }, (_, i) => { const a = -Math.PI / 2 + (2 * Math.PI * i) / n; return { x: Math.round(300 + 215 * Math.cos(a)), y: Math.round(150 + 105 * Math.sin(a)) }; });
        const guard = new Set(), covered = (e) => guard.has(e[0]) || guard.has(e[1]); let asked = 0;
        const view = (cur) => ({ type: 'graph', h: 300, nodes: P.map((p, i) => ({ id: i, ...p, t: L(i), c: guard.has(i) ? 'found' : '' })), edges: es.map((e) => ({ a: e[0], b: e[1], c: cur && cur === e ? 'on' : covered(e) ? 'path' : '' })), lists: [{ label: 'Guards', items: [...guard].sort().map(L) }] });
        x.rec(view(), -1, 'Guard every road, using as few guards as you can. A guard in a town protects every road touching it. Press play.', null, [['Guards', 0]]);
        for (const e of es) {
          const c = covered(e);
          x.rec(view(e), 1, `Road ${L(e[0])}–${L(e[1])}.`, asked < 3 ? (asked++, yesno(`Is the road ${L(e[0])}–${L(e[1])} already guarded (a guard at either end)?`, c, c ? 'A guard at one end already protects it.' : 'No guard at either end yet.')) : null, [['Guards', guard.size]]);
          if (c) continue;
          guard.add(e[0]); guard.add(e[1]);
          x.rec(view(), 2, `Put guards at both ${L(e[0])} and ${L(e[1])}. Every road touching them is now protected.`, null, [['Guards', guard.size]]);
        }
        x.rec(view(), 4, `Every road is guarded with ${guard.size} guards. The best possible uses at least ${Math.ceil(guard.size / 2)}, so this is never more than twice the best.`, null, [['Guards', guard.size]]);
        x.result = { guards: [...guard].sort((a, b) => a - b), es, n };
      },
    },
  };

  VLLab.define('big', ALGOS);
})();
