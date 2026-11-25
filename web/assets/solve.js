/* VisuaLearn "ways to solve it" lessons: divide and conquer, greedy, interval scheduling, backtracking,
   N-Queens, knapsack, longest common subsequence, longest increasing subsequence, edit distance and bit tricks. */
(() => {
  'use strict';
  const { rnd, pick, distinct, shuffle, row, rows, choice, numq, yesno, plural } = VLLab;
  const off = (title, need, time, steps, think) => ({ title, need, time, steps, think });
  const mk = (cells, marks, ptr, label) => rows([row(label || '', cells, marks, ptr)]);
  const bits = (n, w = 8) => n.toString(2).padStart(w, '0').split('');

  const ALGOS = {
    divide: {
      name: 'Divide and conquer',
      blurb: 'Split a big problem into two halves, solve each half the same way, then combine the answers. Here the problem is the best run of numbers in a row. It is in the left half, in the right half, or across the middle.',
      facts: [['Steps', 'Split, solve, combine'], ['Time', 'O(n log n)'], ['Smallest piece', 'One number']],
      code: ['solve(range): if one number, that is the answer', 'split the range in the middle', 'best of the left half', 'best of the right half', 'best run straddling the middle', 'answer ← the biggest of the three'],
      offline: off('Halve and combine', 'Paper and 8 numbers, some negative', '15 minutes', [
        'Write 8 numbers, some below zero. We want the biggest total of numbers next to each other.',
        'Split into two halves of 4. Find the best run in each half the same way (split again until one number).',
        'Now find the best run that crosses the middle: the best run ending at the middle, plus the best run starting after it.',
        'The answer is the biggest of the three.'], 'Why do you need the crossing case? What would you miss without it?'),
      make() { return { a: Array.from({ length: 8 }, () => rnd(-5, 9)) }; },
      run(x, { a }) {
        const view = (l, r, lists) => ({ ...mk(a, Object.fromEntries(a.map((_, i) => [i, l <= i && i <= r ? 'cur' : 'out']))), lists: lists || [] });
        x.rec(mk(a, {}), -1, 'Find the biggest total of numbers in a row. Split the row, solve each half, combine. Press play.');
        let asked = 0;
        const solve = (l, r) => {
          if (l === r) return a[l];
          const m = (l + r) >> 1;
          x.rec(view(l, r), 1, `Split positions ${l + 1} to ${r + 1} in the middle.`);
          const L = solve(l, m), R = solve(m + 1, r);
          let s = 0, bl = -Infinity; for (let i = m; i >= l; i--) { s += a[i]; bl = Math.max(bl, s); }
          s = 0; let br = -Infinity; for (let i = m + 1; i <= r; i++) { s += a[i]; br = Math.max(br, s); }
          const C = bl + br, best = Math.max(L, R, C);
          x.rec(view(l, r, [{ label: 'Left half', items: [L] }, { label: 'Right half', items: [R] }, { label: 'Straddling the middle', items: [C] }]), 5, `Left ${L}, right ${R}, crossing ${C}. The best here is ${best}.`,
            asked < 2 && r - l >= 3 ? (asked++, numq(`Left half ${L}, right half ${R}, crossing the middle ${C}. What is the best for the whole range?`, best, [L + R, Math.min(L, R, C), best + 1], `Take the biggest of the three: ${best}.`)) : null);
          return best;
        };
        const res = solve(0, a.length - 1);
        x.rec(mk(a, {}), 5, `The best run in a row adds up to ${res}.`);
        x.result = res;
      },
    },

    greedy: {
      name: 'Greedy choices',
      blurb: 'A greedy method always takes the best-looking choice right now and never looks back. Giving change with the biggest coins first works for many coins. But with some coins it gives a worse answer.',
      facts: [['Idea', 'Best choice now'], ['Speed', 'Very fast'], ['Risk', 'Can be wrong']],
      code: ['coins taken ← none; left ← the amount', 'repeat while something is left:', '  take the biggest coin that fits', '  subtract it from what is left', 'count the coins; compare with the best possible'],
      offline: off('Change maker', 'Coins or paper discs worth 25, 10, 5 and 1 (or 4, 3 and 1)', '10 minutes', [
        'Pick an amount, like 63. Always take the biggest coin that still fits.',
        'Count your coins.',
        'Now try coins worth 4, 3 and 1 for the amount 6. Greedy takes 4 + 1 + 1. Can you do it with fewer?'], 'For which coins does "biggest first" always give the fewest coins?'),
      make() { return pick([{ coins: [25, 10, 5, 1], amt: rnd(41, 99) }, { coins: [4, 3, 1], amt: 6 }, { coins: [6, 5, 1], amt: 10 }]); },
      run(x, { coins, amt }) {
        const taken = []; let left = amt, asked = 0;
        const view = (cur) => ({ ...mk(coins, cur !== undefined ? { [coins.indexOf(cur)]: 'cur' } : {}, {}, 'coins'), lists: [{ label: 'Taken', items: taken }, { label: 'Left', items: [left] }] });
        x.rec(view(), -1, `Make ${amt} with coins worth ${coins.join(', ')}. Always take the biggest coin that fits. Press play.`);
        while (left > 0) {
          const c = coins.find((k) => k <= left);
          const q = asked < 3 ? (asked++, choice(`${left} is left. Which coin does the greedy method take next?`, c, coins.filter((k) => k !== c), `Greedy takes the biggest coin that is not more than ${left}: ${c}.`)) : null;
          taken.push(c); left -= c;
          x.rec(view(c), 2, `Take ${c}. ${left} left.`, q, [['Coins', taken.length]]);
        }
        const dp = [0]; for (let v = 1; v <= amt; v++) dp[v] = 1 + Math.min(...coins.filter((k) => k <= v).map((k) => dp[v - k]));
        x.rec(view(), 4, taken.length === dp[amt] ? `${taken.length} coins, and that is the fewest possible. Greedy worked here.` : `${taken.length} coins, but ${dp[amt]} is possible. Greedy was fooled by these coins.`, null, [['Coins', taken.length]]);
        x.result = { taken: taken.slice(), amt, optimal: dp[amt] };
      },
    },

    intervals: {
      name: 'Interval scheduling',
      blurb: 'Many meetings want one room. To fit the most, sort them by when they end. Take the first, then the next one that starts after the last one ended. Finishing early leaves the most room.',
      facts: [['Sort by', 'Finish time'], ['Time', 'O(n log n)'], ['Method', 'Greedy']],
      code: ['sort meetings by finish time', 'chosen ← none; last end ← 0', 'for each meeting in order', '  if it starts after the last end: choose it', '  else skip it'],
      offline: off('Fit the meetings', 'Paper strips of different lengths and a long line marked 1 to 12', '15 minutes', [
        'Cut 7 strips and place each along the line where a meeting would run.',
        'Sort the strips by where they end.',
        'Take the first. Then take the next that begins after the last one chosen ends. Skip any that overlap.',
        'Count the meetings you fit.'], 'Why sort by the end time and not by the start time or length?'),
      make() { return { v: Array.from({ length: 7 }, () => { const s = rnd(0, 9); return [s, Math.min(12, s + rnd(1, 5))]; }) }; },
      run(x, { v }) {
        const T = 12, sorted = v.map((m, i) => ({ s: m[0], e: m[1], i })).sort((p, q) => p.e - q.e || p.s - q.s), chosen = [], skipped = new Set();
        const names = sorted.map((_, i) => String.fromCharCode(65 + i));
        let lastEnd = 0, asked = 0;
        const view = (cur) => ({ type: 'grid', cols: T + 1, cells: sorted.flatMap((m, k) => [{ t: names[k], c: '' }, ...Array.from({ length: T }, (_, t) => ({ t: '', c: t >= m.s && t < m.e ? (k === cur ? 'cur' : chosen.includes(k) ? 'found' : skipped.has(k) ? 'out' : 'key') : '' }))]), lists: [{ label: 'Chosen', items: chosen.map((k) => names[k]) }] });
        x.rec(view(-1), -1, `Seven meetings, shown sorted by finish time (earliest end first). Fit in as many as possible. Time runs left to right, 1 to ${T}. Press play.`);
        sorted.forEach((m, k) => {
          const fits = m.s >= lastEnd;
          x.rec(view(k), 3, `Meeting ${names[k]} runs from ${m.s} to ${m.e}. The last chosen meeting ends at ${lastEnd}.`, asked < 3 ? (asked++, yesno(`Does ${names[k]} start at or after ${lastEnd}, when the last chosen meeting ended?`, fits, fits ? `${m.s} ≥ ${lastEnd}: no overlap, so choose it.` : `${m.s} < ${lastEnd}: it overlaps, so skip it.`)) : null);
          if (fits) { chosen.push(k); lastEnd = m.e; x.rec(view(-1), 3, `Choose ${names[k]}. The room is busy until ${lastEnd}.`, null, [['Chosen', chosen.length]]); }
          else { skipped.add(k); x.rec(view(-1), 4, `Skip ${names[k]}: it overlaps.`, null, [['Chosen', chosen.length]]); }
        });
        x.rec(view(-1), 4, `${chosen.length} meetings fit.`, null, [['Chosen', chosen.length]]);
        x.result = { count: chosen.length, v };
      },
    },

    backtrack: {
      name: 'Backtracking',
      blurb: 'Try a choice. If it leads nowhere, undo it and try another. For each number, take it or leave it. As soon as the total goes over the target, give up on that branch.',
      facts: [['Idea', 'Try, undo, try again'], ['Saves time by', 'Giving up early'], ['Used for', 'Puzzles, mazes, Sudoku']],
      code: ['for each number, in order:', '  try taking it', '  if the total is over the target: give up (backtrack)', '  if the total equals the target: found!', '  then try leaving it out', 'every choice tried: no answer'],
      offline: off('Pick and undo', 'Paper, a pencil and 5 number cards', '15 minutes', [
        'Pick a target. Lay out 5 cards. Find cards that add exactly to the target.',
        'Go card by card: take it (add it up) or leave it.',
        'If your total goes over the target, stop and undo the last card you took. Try leaving it out instead.',
        'Write down each take and undo so you can see the search.'], 'Why does giving up early on a bad branch save so much work?'),
      make() { const a = distinct(5, 1, 12), sub = a.filter(() => Math.random() < 0.5); const t = Math.random() < 0.8 && sub.length ? sub.reduce((p, q) => p + q, 0) : rnd(8, 30); return { a, t }; },
      run(x, { a, t }) {
        const chosen = []; let sum = 0, found = null, asked = 0, steps = 0;
        const view = (i, marks) => ({ ...mk(a, { ...Object.fromEntries(chosen.map((k) => [k, 'key'])), ...(marks || {}) }, i >= 0 && i < a.length ? { [i]: 'next' } : {}), lists: [{ label: 'Total', items: [sum] }, { label: 'Target', items: [t] }] });
        x.rec(view(0), -1, `Find numbers that add up to exactly ${t}. For each number: take it, or leave it. Press play.`, null, [['Tries', 0]]);
        const go = (i) => {
          if (found) return;
          if (sum === t) { found = chosen.map((k) => a[k]); x.rec(view(-1, Object.fromEntries(chosen.map((k) => [k, 'found']))), 3, `The total is ${t}. Found: ${found.join(' + ')}.`, null, [['Tries', steps]]); return; }
          if (i === a.length) return;
          steps++;
          chosen.push(i); sum += a[i];
          const over = sum > t;
          x.rec(view(i, { [i]: 'cur' }), 1, `Try taking ${a[i]}. The total is ${sum}.`, asked < 3 ? (asked++, yesno(`The total is ${sum} and the target is ${t}. Is it already over, so we should give up on this branch?`, over, over ? `${sum} > ${t}: adding more can only make it bigger. Backtrack.` : `${sum} ≤ ${t}: still possible, so keep going.`)) : null, [['Tries', steps]]);
          if (over) { x.rec(view(i, { [i]: 'swap' }), 2, `Over the target. Undo ${a[i]} and give up on this branch.`, null, [['Tries', steps]]); } else go(i + 1);
          if (found) return;
          chosen.pop(); sum -= a[i];
          x.rec(view(i + 1), 4, `Undo ${a[i]}. Now try leaving it out. The total is ${sum}.`, null, [['Tries', steps]]);
          go(i + 1);
        };
        go(0);
        if (!found) x.rec(view(-1), 5, `Every choice was tried. No numbers add up to ${t}.`, null, [['Tries', steps]]);
        x.result = found;
      },
    },

    nqueens: {
      name: 'N-Queens',
      blurb: 'Place queens on a board so none can capture another. Put one queen in each row. If a row has no safe square, go back to the row above and move its queen.',
      facts: [['Goal', 'No two queens attack'], ['Method', 'Backtracking'], ['Rows', 'One queen each']],
      code: ['for each row', '  for each column: is it safe?', '    safe: place a queen, go to the next row', '    no safe column: go back and move the queen above', 'every row has a queen: solved'],
      offline: off('Queens on paper', 'A 5 by 5 grid on paper, and 5 coins', '20 minutes', [
        'Place a coin in the top row. A queen attacks along its row, column and both diagonals.',
        'In the next row, put a coin on the first square no coin attacks.',
        'If a row has no safe square, pick up the last coin and move it one square along. This is backtracking.',
        'Continue until each row has a coin.'], 'How does moving back one row cut out thousands of silly positions at once?'),
      make() { return { n: pick([4, 5, 5]) }; },
      run(x, { n }) {
        const cols = []; let tries = 0, asked = 0, solved = false;
        const view = (tr, bad) => ({ type: 'grid', cols: n, cells: Array.from({ length: n * n }, (_, id) => { const r = Math.floor(id / n), c = id % n; const q = cols[r] === c; return { t: q ? '♛' : '', c: q ? (solved ? 'found' : 'key') : tr && tr[0] === r && tr[1] === c ? (bad ? 'swap' : 'cur') : (r + c) % 2 ? 'seen' : '' }; }), lists: [] });
        const safe = (r, c) => cols.every((cc, rr) => cc !== c && Math.abs(cc - c) !== r - rr);
        x.rec(view(), -1, `Place ${n} queens so none attack each other. Press play.`, null, [['Squares tried', 0]]);
        const place = (r) => {
          if (r === n) { solved = true; return true; }
          for (let c = 0; c < n; c++) {
            const ok = safe(r, c); tries++;
            x.rec(view([r, c], !ok), 1, ok ? `Row ${r + 1}, column ${c + 1}: safe.` : `Row ${r + 1}, column ${c + 1}: a queen attacks it.`, asked < 3 ? (asked++, yesno(`Is a queen safe at row ${r + 1}, column ${c + 1}?`, ok, ok ? 'No queen on the same column or diagonal.' : 'Another queen is in the same column or on a diagonal.')) : null, [['Squares tried', tries]]);
            if (!ok) continue;
            cols.push(c);
            x.rec(view(), 2, `Place a queen at row ${r + 1}, column ${c + 1}.`, null, [['Squares tried', tries]]);
            if (place(r + 1)) return true;
            cols.pop();
            x.rec(view(), 3, `Dead end below. Take the queen back from row ${r + 1} and try the next column.`, null, [['Squares tried', tries]]);
          }
          return false;
        };
        place(0);
        x.rec(view(), 4, `Solved after trying ${tries} squares. A try-everything search would look at far more.`, null, [['Squares tried', tries]]);
        x.result = { n, cols: cols.slice() };
      },
    },

    knapsack: {
      name: 'Knapsack',
      blurb: 'A bag can only hold so much weight. Which items give the most value? Fill a table. For each item, either leave it, or take it and add its value to the best for the room that is left.',
      facts: [['Table', 'items × bag sizes'], ['Time', 'O(items × size)'], ['Method', 'Dynamic programming']],
      code: ['table[0][size] ← 0 (no items, no value)', 'for each item i, each bag size s', '  leave it: table[i−1][s]', '  take it (if it fits): value + table[i−1][s − weight]', '  table[i][s] ← the bigger of the two', 'the answer is the last cell'],
      offline: off('Pack the bag', 'Paper, a pencil and 4 items with weights and values', '20 minutes', [
        'Pick 4 items, each with a weight (1 to 5) and a value. The bag holds weight 8.',
        'Draw a table: a row for each item added so far, a column for each bag size from 0 to 8.',
        'Fill row by row. For each cell compare "leave the item" (the cell above) and "take it" (its value plus the cell above and to the left by its weight).',
        'The last cell is the best value.'], 'Why does each cell only need to look at the row above?'),
      make() { return { items: Array.from({ length: 4 }, () => [rnd(1, 5), rnd(2, 9)]), cap: 8 }; },
      run(x, { items, cap }) {
        const n = items.length, T = Array.from({ length: n + 1 }, () => Array(cap + 1).fill(null));
        for (let s = 0; s <= cap; s++) T[0][s] = 0;
        const view = (rowi, marks) => ({ type: 'grid', cols: cap + 2, cells: [{ t: 'size', c: '' }, ...Array.from({ length: cap + 1 }, (_, s) => ({ t: s, c: '' })), ...T.flatMap((r, i) => [{ t: i === 0 ? 'none' : `${i}: w${items[i - 1][0]} v${items[i - 1][1]}`, c: '' }, ...r.map((v, s) => ({ t: v === null ? '' : v, c: (marks && marks[`${i},${s}`]) || (i === rowi ? 'cur' : '') }))])], lists: [] });
        x.rec(view(-1), -1, `Four items (w = weight, v = value) and a bag that holds ${cap}. Fill the table. Press play.`);
        x.rec(view(0), 0, 'With no items the best value is 0, whatever the bag size.');
        let asked = 0;
        for (let i = 1; i <= n; i++) {
          const [w, val] = items[i - 1], marks = {};
          for (let s = 0; s <= cap; s++) { const leave = T[i - 1][s], take = s >= w ? val + T[i - 1][s - w] : -1; T[i][s] = Math.max(leave, take); if (take > leave) marks[`${i},${s}`] = 'found'; }
          const s0 = rnd(w, cap);
          x.rec(view(i, marks), 4, `Item ${i} (weight ${w}, value ${val}). Green cells are where taking it beats leaving it.`,
            asked < 2 ? (asked++, numq(`Item ${i} fits a bag of size ${s0}. Leaving it gives ${T[i - 1][s0]}; taking it gives ${val} + ${T[i - 1][s0 - w]}. What is the best?`, T[i][s0], [T[i - 1][s0], val + T[i - 1][s0 - w] + 1, val], `Take the bigger of ${T[i - 1][s0]} and ${val + T[i - 1][s0 - w]}.`)) : null);
        }
        x.rec(view(-1, { [`${n},${cap}`]: 'found' }), 5, `The best value for a bag of ${cap} is ${T[n][cap]}.`);
        x.result = { best: T[n][cap], items, cap };
      },
    },

    lcs: {
      name: 'Longest common subsequence',
      blurb: 'Two words can share letters in the same order, even if the letters are not side by side. Fill a table. If two letters match, add 1 to the cell up-left. If not, copy the bigger of the cell above and the cell to the left.',
      facts: [['Compares', 'Two sequences'], ['Time', 'O(m × n)'], ['Used for', 'File diffs, DNA']],
      code: ['table[0][·] and table[·][0] are 0', 'for each letter pair (i, j)', '  if the letters match: table[i][j] ← table[i−1][j−1] + 1', '  else: table[i][j] ← the bigger of the cell above and the cell to the left', 'the last cell is the length'],
      offline: off('Shared letters', 'Two short words on paper and a grid', '15 minutes', [
        'Write one word across the top and one down the side of a grid. Fill the first row and column with 0.',
        'For each cell: if the two letters match, write one more than the cell up and to the left.',
        'If not, write the bigger of the cell above and the cell to the left.',
        'The bottom-right number is the length of the longest shared sequence.'], 'Is a shared sequence allowed to skip letters? Is it allowed to reorder them?'),
      make() { return pick([['PLANET', 'PLATE'], ['STONE', 'LONELY'], ['GARDEN', 'DANGER'], ['BREAD', 'BEARD'], ['SUNDAY', 'SATURDAY']].map(([a, b]) => ({ a, b }))); },
      run(x, { a, b }) {
        const m = a.length, n = b.length, T = Array.from({ length: m + 1 }, () => Array(n + 1).fill(null));
        for (let i = 0; i <= m; i++) T[i][0] = 0; for (let j = 0; j <= n; j++) T[0][j] = 0;
        const view = (marks) => ({ type: 'grid', cols: n + 2, cells: [{ t: '', c: '' }, { t: '', c: '' }, ...[...b].map((ch) => ({ t: ch, c: '' })), ...T.flatMap((r, i) => [{ t: i === 0 ? '' : a[i - 1], c: '' }, ...r.map((v, j) => ({ t: v === null ? '' : v, c: (marks && marks[`${i},${j}`]) || '' }))])], lists: [] });
        x.rec(view(), -1, `Find the longest sequence of letters that ${a} and ${b} share, in order. Press play.`);
        let asked = 0;
        for (let i = 1; i <= m; i++) {
          const marks = {};
          for (let j = 1; j <= n; j++) {
            if (a[i - 1] === b[j - 1]) { T[i][j] = T[i - 1][j - 1] + 1; marks[`${i},${j}`] = 'found'; } else T[i][j] = Math.max(T[i - 1][j], T[i][j - 1]);
          }
          const j0 = rnd(1, n), match = a[i - 1] === b[j0 - 1];
          x.rec(view(marks), match ? 2 : 3, `Row for ${a[i - 1]}. Green cells are where letters match.`,
            asked < 3 && i >= 2 ? (asked++, numq(`${a[i - 1]} against ${b[j0 - 1]}: ${match ? `they match, so one more than the diagonal cell (${T[i - 1][j0 - 1]})` : `no match, so the bigger of above (${T[i - 1][j0]}) and left (${T[i][j0 - 1]})`}. What goes in the cell?`, T[i][j0], [T[i - 1][j0 - 1], T[i][j0] + 1, Math.max(0, T[i][j0] - 1)], match ? `${T[i - 1][j0 - 1]} + 1 = ${T[i][j0]}.` : `The bigger of ${T[i - 1][j0]} and ${T[i][j0 - 1]} is ${T[i][j0]}.`)) : null);
        }
        x.rec(view({ [`${m},${n}`]: 'found' }), 4, `The longest shared sequence has ${T[m][n]} letters.`);
        x.result = { length: T[m][n], a, b };
      },
    },

    lis: {
      name: 'Longest increasing subsequence',
      blurb: 'Pick numbers from a row, left to right, so each one is bigger than the last. For each number, its best chain is 1 more than the best chain that ends at a smaller number before it.',
      facts: [['Time', 'O(n²) here'], ['Table', 'One cell per number'], ['Method', 'Dynamic programming']],
      code: ['best[i] ← 1 for every number', 'for each number i, left to right', '  for each earlier number j with a[j] < a[i]', '    best[i] ← the bigger of best[i] and best[j] + 1', 'the answer is the biggest best[i]'],
      offline: off('Climbing the row', 'Paper and 8 numbers in a row', '10 minutes', [
        'Write 8 numbers. Under each, write 1.',
        'Go left to right. For each number look at the numbers before it that are smaller.',
        'Under this number write one more than the biggest number under those smaller ones.',
        'The biggest number written is the length of the longest climb.'], 'Why does a number\'s answer only depend on numbers to its left?'),
      make() { return { a: Array.from({ length: 8 }, () => rnd(1, 20)) }; },
      run(x, { a }) {
        const n = a.length, best = Array(n).fill(null);
        const view = (i, from) => rows([row('numbers', a, { [i]: 'cur', ...(from !== undefined ? { [from]: 'found' } : {}) }), row('best chain', best.map((b) => (b === null ? '' : b)), {})]);
        x.rec(rows([row('numbers', a, {}), row('best chain', best.map(() => ''), {})]), -1, 'Find the longest chain of numbers that keeps going up. Press play.');
        let asked = 0;
        for (let i = 0; i < n; i++) {
          best[i] = 1; let from;
          for (let j = 0; j < i; j++) if (a[j] < a[i] && best[j] + 1 > best[i]) { best[i] = best[j] + 1; from = j; }
          const sm = a.slice(0, i).filter((v) => v < a[i]).length;
          x.rec(view(i, from), 3, sm ? `${a[i]} can follow ${sm} smaller number${sm === 1 ? '' : 's'}. The best chain ending here has ${best[i]}.` : `Nothing smaller to the left, so ${a[i]} starts a chain: 1.`,
            asked < 3 && i >= 3 ? (asked++, numq(`What is the longest chain that ends at ${a[i]}?`, best[i], [best[i] + 1, Math.max(1, best[i] - 1), 1], `It is 1 plus the longest chain ending at the best smaller number before it: ${best[i]}.`)) : null);
        }
        x.rec(rows([row('numbers', a, {}), row('best chain', best, Object.fromEntries(best.map((b, i) => [i, b === Math.max(...best) ? 'found' : ''])))]), 4, `The longest increasing chain has ${Math.max(...best)} numbers.`);
        x.result = { length: Math.max(...best), a };
      },
    },

    edit: {
      name: 'Edit distance',
      blurb: 'How many edits turn one word into another? An edit is adding, removing or changing one letter. A table stores the cheapest way to turn each start of one word into each start of the other.',
      facts: [['Edits', 'Add, remove, change'], ['Time', 'O(m × n)'], ['Used for', 'Spell-checkers']],
      code: ['table[i][0] ← i; table[0][j] ← j', 'for each letter pair (i, j)', '  if the letters match: copy the cell up-left', '  else: 1 + the smallest of up, left and up-left', 'the last cell is the distance'],
      offline: off('Fix the word', 'Two short words, paper and a pencil', '15 minutes', [
        'Pick two words like CAT and CUT. Draw a grid with a blank row and column first.',
        'The first row counts 0, 1, 2, … and so does the first column.',
        'Each cell: if the letters match, copy the cell up and to the left. If not, add 1 to the smallest of the cell above, the cell to the left and the cell up-left.',
        'The last cell is the fewest edits.'], 'Why does the distance never exceed the length of the longer word?'),
      make() { return pick([['CAT', 'CUT'], ['BOOK', 'BACK'], ['PLAN', 'PLANE'], ['FLAW', 'LAWN'], ['HORSE', 'ROSE']].map(([a, b]) => ({ a, b }))); },
      run(x, { a, b }) {
        const m = a.length, n = b.length, T = Array.from({ length: m + 1 }, () => Array(n + 1).fill(null));
        for (let i = 0; i <= m; i++) T[i][0] = i; for (let j = 0; j <= n; j++) T[0][j] = j;
        const view = (marks) => ({ type: 'grid', cols: n + 2, cells: [{ t: '', c: '' }, { t: '', c: '' }, ...[...b].map((ch) => ({ t: ch, c: '' })), ...T.flatMap((r, i) => [{ t: i === 0 ? '' : a[i - 1], c: '' }, ...r.map((v, j) => ({ t: v === null ? '' : v, c: (marks && marks[`${i},${j}`]) || '' }))])], lists: [] });
        x.rec(view(), -1, `How many edits turn ${a} into ${b}? Press play.`);
        x.rec(view(), 0, 'The first row and column: turning a word into nothing (or nothing into a word) costs one edit per letter.');
        let asked = 0;
        for (let i = 1; i <= m; i++) {
          const marks = {};
          for (let j = 1; j <= n; j++) {
            if (a[i - 1] === b[j - 1]) { T[i][j] = T[i - 1][j - 1]; marks[`${i},${j}`] = 'found'; } else T[i][j] = 1 + Math.min(T[i - 1][j], T[i][j - 1], T[i - 1][j - 1]);
          }
          const j0 = rnd(1, n), match = a[i - 1] === b[j0 - 1];
          x.rec(view(marks), match ? 2 : 3, `Row for ${a[i - 1]}. Green cells are matches: copy the cell up-left.`,
            asked < 3 && i >= 2 ? (asked++, numq(`${a[i - 1]} against ${b[j0 - 1]}. ${match ? `They match: copy up-left (${T[i - 1][j0 - 1]})` : `No match: 1 + the smallest of up (${T[i - 1][j0]}), left (${T[i][j0 - 1]}), up-left (${T[i - 1][j0 - 1]})`}. What goes in the cell?`, T[i][j0], [T[i][j0] + 1, Math.max(0, T[i][j0] - 1), T[i - 1][j0 - 1] + 2], match ? 'A matching letter costs nothing extra.' : 'A change, add or remove costs 1 on top of the cheapest earlier answer.')) : null);
        }
        x.rec(view({ [`${m},${n}`]: 'found' }), 4, `${T[m][n]} edit${T[m][n] === 1 ? '' : 's'} turn ${a} into ${b}.`);
        x.result = { distance: T[m][n], a, b };
      },
    },

    popcount: {
      name: 'Bit tricks: counting 1s',
      blurb: 'Computers store numbers as bits. Subtracting 1 flips the last 1 bit to 0. So n AND (n minus 1) removes exactly one 1 bit. Count how many times until you reach 0.',
      facts: [['Trick', 'n AND (n − 1)'], ['Time', 'One step per 1-bit'], ['Used for', 'Fast counting and checks']],
      code: ['count ← 0', 'while n is not 0', '  n ← n AND (n − 1)  (removes the lowest 1)', '  count ← count + 1', 'count is the number of 1-bits'],
      offline: off('Flip the last 1', 'Paper and a pencil', '10 minutes', [
        'Write a number in binary, like 10110100.',
        'Subtract 1 in binary. Notice the lowest 1 becomes 0 and the zeros after it become 1s.',
        'Line up the old and new numbers and keep a 1 only where both have a 1 (AND). The lowest 1 has vanished.',
        'Repeat until you reach 0. Count the repeats.'], 'Why does this loop run once per 1-bit and not once per bit?'),
      make() { return { n: rnd(20, 255) }; },
      run(x, { n }) {
        let v = n, c = 0, asked = 0;
        const view = (hl) => ({ ...rows([row('n', bits(v), hl || {}), row('n − 1', v > 0 ? bits(v - 1) : bits(0), {})]), lists: [{ label: 'As a number', items: [v] }] });
        x.rec(view(), -1, `Count the 1s in the binary form of ${n}. Press play.`, null, [['Count', 0]]);
        while (v) {
          const next = v & (v - 1), lowest = 7 - Math.log2(v & -v);
          x.rec(view({ [lowest]: 'cur' }), 2, `The lowest 1 is the one highlighted. n AND (n − 1) will remove it.`,
            asked < 3 ? (asked++, numq(`How many 1-bits will ${v} have after n AND (n − 1)?`, bits(next).filter((b) => b === '1').length, [bits(v).filter((b) => b === '1').length, bits(v).filter((b) => b === '1').length - 2, bits(v).filter((b) => b === '1').length + 1], 'Exactly one 1-bit (the lowest) is removed each time.')) : null, [['Count', c]]);
          v = next; c++;
          x.rec(view(), 3, `Now the number is ${v}. That was 1-bit number ${c}.`, null, [['Count', c]]);
        }
        x.rec(view(), 4, `${n} has ${c} one-bits.`, null, [['Count', c]]);
        x.result = { n, count: c };
      },
    },

    xor: {
      name: 'Bit tricks: XOR',
      blurb: 'XOR gives 1 only where two bits are different, and a number XOR itself is 0. If every number appears twice except one, XOR them all. The pairs cancel and the loner is left.',
      facts: [['Rule', 'a XOR a = 0'], ['Time', 'One pass'], ['Extra memory', 'None']],
      code: ['answer ← 0', 'for each number n', '  answer ← answer XOR n', 'pairs cancel to 0, so answer is the number with no partner'],
      offline: off('Cancelling pairs', 'Paper and 7 numbers (3 pairs and 1 single)', '10 minutes', [
        'Write 7 numbers from 1 to 15: three numbers twice, and one number once. Shuffle them.',
        'Write each in 4 bits. Start with 0000.',
        'XOR each number in: where the bits differ, the result bit is 1.',
        'When you finish, the pairs have cancelled and the single number is left.'], 'Why does the order of the numbers not matter?'),
      make() { const u = distinct(4, 1, 15); return { a: shuffle([u[0], u[0], u[1], u[1], u[2], u[2], u[3]]) }; },
      run(x, { a }) {
        let acc = 0, asked = 0;
        const view = (i) => ({ ...rows([row('numbers', a, i >= 0 ? { [i]: 'cur' } : {}), row('running XOR (bits)', bits(acc, 4), {})]), lists: [{ label: 'As a number', items: [acc] }] });
        x.rec(view(-1), -1, 'Every number appears twice except one. Find it with XOR. Press play.');
        a.forEach((v, i) => {
          const was = acc; acc ^= v;
          x.rec(view(i), 2, `${was} XOR ${v} = ${acc}.`, asked < 3 && i >= 1 ? (asked++, numq(`${was} XOR ${v} = ?  (Bits: ${bits(was, 4).join('')} XOR ${bits(v, 4).join('')}; the result has a 1 where the bits differ.)`, acc, [was + v, was | v, Math.abs(was - v)], `${bits(was, 4).join('')} XOR ${bits(v, 4).join('')} = ${bits(acc, 4).join('')}, which is ${acc}.`)) : null);
        });
        x.rec(view(-1), 3, `${acc} is the number with no partner. All the pairs cancelled.`);
        x.result = { single: acc, a };
      },
    },
  };

  ALGOS.bitmask = {
    name: 'Bitmask DP',
    blurb: 'A bitmask is a row of 0s and 1s that shows which jobs are taken. Store the cheapest cost for every mask. Build each answer from a smaller mask plus one more job.',
    facts: [['Masks', '2ⁿ states'], ['Each', 'One cell per set'], ['Good for', 'Small sets (about 20)']],
    code: ['best[000] ← 0 (no jobs taken)', 'for each mask, smallest first', '  worker ← the number of jobs taken', '  for each job j in the mask: best[mask without j] + cost[worker][j]', '  best[mask] ← the smallest of those', 'the answer is best[111]'],
    offline: off('Jobs and workers', 'A 3 by 3 table of costs, paper and a pencil', '20 minutes', [
      'Write a 3 by 3 table: the cost of each worker doing each job.',
      'List all 8 subsets of jobs as 000, 001, … 111 (1 means the job is taken).',
      'For each subset, the number of 1s tells you how many workers are done. Try removing each job in turn: previous best + that cost for the next worker. Keep the smallest.',
      'The cost for 111 is the cheapest way to give every worker a different job.'], 'How many ways are there to give 20 workers 20 different jobs? How many masks are there?'),
    make() { return { c: Array.from({ length: 3 }, () => Array.from({ length: 3 }, () => rnd(1, 9))) }; },
    run(x, { c }) {
      const N = 3, dp = Array(1 << N).fill(null), pc = (m) => m.toString(2).split('1').length - 1, bs = (m) => m.toString(2).padStart(N, '0');
      dp[0] = 0; let asked = 0;
      const view = (cur, from) => ({ ...rows([row('jobs taken (mask)', dp.map((_, m) => bs(m)), { [cur ?? -1]: 'cur', ...Object.fromEntries((from || []).map((f) => [f, 'key'])) }), row('cheapest cost', dp.map((d) => (d === null ? '' : d)), {})]), lists: [{ label: 'Costs (row = worker, column = job)', items: c.map((r) => r.join(' ')) }] });
      x.rec(view(), -1, 'Give 3 workers 3 different jobs as cheaply as possible. Each mask says which jobs are taken. Press play.');
      x.rec(view(0), 0, 'With no jobs taken the cost is 0.');
      for (let m = 1; m < 1 << N; m++) {
        const w = pc(m) - 1, opts = []; for (let j = 0; j < N; j++) if (m >> j & 1) opts.push({ j, from: m ^ (1 << j), v: dp[m ^ (1 << j)] + c[w][j] });
        dp[m] = Math.min(...opts.map((o) => o.v));
        x.rec(view(m, opts.map((o) => o.from)), 4, `Mask ${bs(m)}: worker ${w + 1} takes one of the jobs. ${opts.map((o) => `${dp[o.from] !== null ? dp[o.from] : 0} + ${c[w][o.j]} = ${o.v}`).join(', ')}. The smallest is ${dp[m]}.`,
          asked < 2 && opts.length >= 2 ? (asked++, numq(`Mask ${bs(m)}: the options cost ${opts.map((o) => o.v).join(' or ')}. What is stored?`, dp[m], [Math.max(...opts.map((o) => o.v)), dp[m] + 1, dp[m] - 1], 'We keep the cheapest option.')) : null);
      }
      x.rec(view(7), 5, `The cheapest way to give every worker a different job costs ${dp[7]}.`);
      x.result = { best: dp[7], c };
    },
  };

  ALGOS.meet = {
    name: 'Meet in the middle',
    blurb: 'Trying every subset of 8 numbers means 256 sets. Instead split the numbers in half. List the sums of each half, sort them, and use two pointers to find a pair that adds up to the target.',
    facts: [['Halves', 'Two small problems'], ['Sums per half', '2ⁿ/²'], ['Then', 'Two pointers']],
    code: ['split the numbers into a left half and a right half', 'list every subset sum of each half; sort both lists', 'left pointer at the smallest left sum, right pointer at the biggest right sum', 'if the two add to the target: found', 'if too small move the left pointer up; if too big move the right pointer down'],
    offline: off('Halve the search', 'Paper and 6 numbers', '20 minutes', [
      'Write 6 numbers and a target. Split them into two groups of 3.',
      'For each group, list all 8 subset sums (including the empty set, 0). Sort each list.',
      'Put a finger at the start of the left list and another at the end of the right list. Add the two. Too small: move the left finger right. Too big: move the right finger left.',
      'If the fingers add to the target, you have found a subset.'], 'For 40 numbers, how many sets would you try one by one? How many sums per half here?'),
    make() { const a = distinct(8, 1, 20), sub = a.filter(() => Math.random() < 0.5); return { a, t: Math.random() < 0.75 && sub.length ? sub.reduce((p, q) => p + q, 0) : rnd(10, 70) }; },
    run(x, { a, t }) {
      const sums = (h) => { let s = [0]; for (const v of h) s = s.concat(s.map((z) => z + v)); return s.sort((p, q) => p - q); };
      const A = sums(a.slice(0, 4)), B = sums(a.slice(4));
      let i = 0, j = B.length - 1, steps = 0, asked = 0, found = null;
      const view = () => rows([row('left sums', A, { [i]: found ? 'found' : 'cur' }, { [i]: 'i' }), row('right sums', B, { [j]: found ? 'found' : 'cur' }, { [j]: 'j' })]);
      x.rec(rows([row('numbers', a, {})]), -1, `Is there a set of these numbers adding to ${t}? Split into two halves of 4. Press play.`);
      x.rec(view(), 1, `Each half has 16 subset sums (including 0). Sorted. That is 32 numbers to handle, not all 256 sets.`);
      while (i < A.length && j >= 0) {
        const s = A[i] + B[j]; steps++;
        const note = s === t ? `${A[i]} + ${B[j]} = ${s}. That is ${t}: found!` : `${A[i]} + ${B[j]} = ${s}, ${s < t ? 'too small, so move the left pointer up' : 'too big, so move the right pointer down'}.`;
        if (s === t) { found = [A[i], B[j]]; x.rec(view(), 3, note); break; }
        x.rec(view(), s < t ? 4 : 4, note, asked < 3 ? (asked++, choice(`${A[i]} + ${B[j]} = ${s}, and the target is ${t}. What now?`, s < t ? 'Move the left pointer up' : 'Move the right pointer down', [s < t ? 'Move the right pointer down' : 'Move the left pointer up'], s < t ? 'Too small: only a bigger left sum can help.' : 'Too big: only a smaller right sum can help.')) : null, [['Steps', steps]]);
        if (s < t) i++; else j--;
      }
      x.rec(view(), 3, found ? `Found: a left-half sum ${found[0]} and a right-half sum ${found[1]} make ${t}, in ${steps} steps.` : `The pointers ran out. No set adds to ${t}. It took ${steps} steps, not 256.`);
      x.result = { found: found !== null, t, a };
    },
  };

  ALGOS.sudoku = {
    name: 'Sudoku',
    blurb: 'Fill a 4 by 4 grid so every row, column and 2 by 2 box has 1 to 4 once. Try a digit in each empty square. If a square has nothing that fits, go back and change the last digit.',
    facts: [['Rule', 'No repeats in row, column or box'], ['Method', 'Try, back up'], ['Bigger sudokus', 'Same idea']],
    code: ['find the next empty square', 'for each digit 1 to 4: does it break a rule?', '  fits: write it, go on to the next empty square', '  nothing fits: go back and change the last digit', 'no empty squares: solved'],
    offline: off('Mini sudoku', 'A 4 by 4 grid on paper with a few digits filled in, and a pencil', '15 minutes', [
      'Draw a 4 by 4 grid in four 2 by 2 boxes and fill in a few digits.',
      'Go to the first empty square. Write the smallest digit that does not repeat in its row, column or box (lightly, in pencil).',
      'Move to the next. If no digit fits, rub out your last digit and try the next one up.',
      'Continue until the grid is full.'], 'Why does rubbing out one digit fix many mistakes at once?'),
    make() {
      const base = [[1, 2, 3, 4], [3, 4, 1, 2], [2, 1, 4, 3], [4, 3, 2, 1]], perm = shuffle([1, 2, 3, 4]);
      const rowsOrd = [...shuffle([0, 1]), ...shuffle([2, 3])], colsOrd = [...shuffle([0, 1]), ...shuffle([2, 3])];
      const sol = rowsOrd.map((r) => colsOrd.map((c) => perm[base[r][c] - 1]));
      const blank = distinct(8, 0, 15), g = sol.flat().map((v, i) => (blank.includes(i) ? 0 : v));
      return { g };
    },
    run(x, { g }) {
      const grid = g.slice(), given = g.map((v) => v !== 0), N = 4;
      const ok = (i, d) => { const r = Math.floor(i / N), c = i % N; for (let k = 0; k < N; k++) { if (grid[r * N + k] === d && r * N + k !== i) return false; if (grid[k * N + c] === d && k * N + c !== i) return false; } const br = r - (r % 2), bc = c - (c % 2); for (let y = 0; y < 2; y++) for (let z = 0; z < 2; z++) { const j = (br + y) * N + bc + z; if (grid[j] === d && j !== i) return false; } return true; };
      const view = (cur, bad) => ({ type: 'grid', cols: N, cells: grid.map((v, i) => ({ t: v || '', c: i === cur ? (bad ? 'swap' : 'cur') : given[i] ? 'seen' : v ? 'found' : '' })), lists: [] });
      let tries = 0, asked = 0;
      x.rec(view(), -1, 'Fill the empty squares so no row, column or 2 by 2 box repeats a digit. Press play.', null, [['Digits tried', 0]]);
      const solve = (i) => {
        while (i < N * N && grid[i]) i++;
        if (i === N * N) return true;
        for (let d = 1; d <= N; d++) {
          const fits = ok(i, d); tries++;
          grid[i] = d;
          x.rec(view(i, !fits), 1, fits ? `Try ${d} at row ${Math.floor(i / N) + 1}, column ${(i % N) + 1}: it fits.` : `Try ${d} at row ${Math.floor(i / N) + 1}, column ${(i % N) + 1}: it repeats in its row, column or box.`,
            asked < 3 ? (asked++, yesno(`Can ${d} go at row ${Math.floor(i / N) + 1}, column ${(i % N) + 1}?`, fits, fits ? 'No repeat in its row, column or box.' : 'That digit is already in its row, column or box.')) : null, [['Digits tried', tries]]);
          if (fits && solve(i + 1)) return true;
          grid[i] = 0;
        }
        x.rec(view(i), 3, `No digit fits at row ${Math.floor(i / N) + 1}, column ${(i % N) + 1}. Go back and change the previous digit.`, null, [['Digits tried', tries]]);
        return false;
      };
      solve(0);
      x.rec(view(), 4, `Solved after ${tries} tries.`, null, [['Digits tried', tries]]);
      x.result = { grid: grid.slice(), given: g };
    },
  };

  VLLab.define('solve', ALGOS);
})();
