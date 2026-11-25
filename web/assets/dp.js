/* VisuaLearn dynamic-programming lesson: solve small problems first, write the answers in a table,
   and build each bigger answer from the ones already written down. Two cartoons: coins and a grid. */
(() => {
  'use strict';

  const rnd = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
  const s = (k) => (k === 1 ? '' : 's');
  const COINSETS = [[1, 3, 4], [1, 4, 5], [1, 5, 6], [1, 4, 6]];

  function numOpts(correct, extras) {
    const rest = [...new Set(extras)].filter((v) => v !== correct && v >= 0).slice(0, 3);
    const all = [correct, ...rest].sort((a, b) => a - b);
    return { options: all.map(String), answer: all.indexOf(correct) };
  }

  // ---------- coins: fewest coins that make an amount ----------
  function greedy(coins, amount) {
    let left = amount, n = 0;
    for (const c of [...coins].sort((a, b) => b - a)) { n += Math.floor(left / c); left %= c; }
    return n;
  }

  function recordCoins(inp) {
    const { coins, amount } = inp, dp = Array(amount + 1).fill(null), frames = [];
    let c = 0, asked = 0;
    const rec = (cur, from, line, note, q) => frames.push({ dp: dp.slice(), cur, from, c, line, note, q: q || null });
    dp[0] = 0;
    rec(-1, [], -1, `Coins of ${coins.join(', ')}. What is the fewest coins that make each amount, up to ${amount}? Press play.`);
    rec(0, [], 0, 'Making 0 takes 0 coins. That is the first answer in the table.');
    for (let a = 1; a <= amount; a++) {
      const tries = coins.filter((k) => k <= a).map((k) => ({ k, v: dp[a - k] + 1 }));
      const best = Math.min(...tries.map((t) => t.v));
      const q = a >= 4 && asked < 4 && (a % 2 === 0) ? (asked++, {
        text: `What is the fewest coins to make ${a}?`,
        ...numOpts(best, [best + 1, best - 1, best + 2]),
        why: `Try each coin: ${tries.map((t) => `${t.k} leaves ${a - t.k}, which took ${dp[a - t.k]}, so ${t.v}`).join('; ')}. The smallest is ${best}.`,
      }) : null;
      const winner = tries.find((t) => t.v === best);
      dp[a] = best;
      c++;
      rec(a, tries.map((t) => a - t.k), 1,
        `${a}: ${tries.map((t) => `coin ${t.k} → ${t.v}`).join(', ')}. Take the smallest: ${best} (use a ${winner.k}).`, q);
    }
    const g = greedy(coins, amount);
    rec(-1, [], 2, g > dp[amount]
      ? `${amount} needs ${dp[amount]} coin${s(dp[amount])}. Grabbing the biggest coin each time would use ${g}. The table finds the best answer.`
      : `${amount} needs ${dp[amount]} coin${s(dp[amount])}. Here the biggest-coin-first idea also gives ${g}, but with other coins it can fail. The table never does.`);
    return frames;
  }

  // ---------- grid: ways to walk from the top-left to the bottom-right ----------
  function ways(rows, cols, walls) {
    const w = new Set(walls), t = Array.from({ length: rows }, () => Array(cols).fill(0));
    for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) {
      if (w.has(r * cols + k)) continue;
      t[r][k] = r === 0 && k === 0 ? 1 : (r ? t[r - 1][k] : 0) + (k ? t[r][k - 1] : 0);
    }
    return t;
  }

  function makeGrid() {
    for (;;) {
      const rows = 4, cols = 5, walls = [];
      while (walls.length < 3) {
        const x = rnd(1, rows * cols - 2);
        if (!walls.includes(x)) walls.push(x);
      }
      if (ways(rows, cols, walls)[rows - 1][cols - 1] > 0) return { rows, cols, walls };
    }
  }

  function recordGrid(inp) {
    const { rows, cols } = inp, walls = new Set(inp.walls), frames = [];
    const table = Array(rows * cols).fill(null);
    let c = 0, asked = 0;
    const rec = (cur, line, note, q) => frames.push({ table: table.slice(), cur, c, line, note, q: q || null });
    rec(-1, -1, `Walk from the top-left to the bottom-right, moving only right or down. Dark squares are blocked. How many different walks? Press play.`);
    for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) {
      const id = r * cols + k;
      if (walls.has(id)) { table[id] = 0; continue; }
      const up = r ? table[id - cols] : 0, left = k ? table[id - 1] : 0;
      if (r === 0 && k === 0) { table[id] = 1; c++; rec(id, 0, 'One way to be at the start: stay put. Write 1.'); continue; }
      const v = up + left;
      const q = r && k && v > 0 && asked < 4 && (r + k) % 2 === 0 ? (asked++, {
        text: `How many ways to reach this square?`,
        ...numOpts(v, [up, left, v + 1, v - 1]),
        why: `You arrive from above (${up} ways) or from the left (${left} ways), so ${up} + ${left} = ${v}.`,
      }) : null;
      table[id] = v;
      c++;
      rec(id, 1, r === 0 || k === 0 ? `Only one direction leads here, so the count is ${v}.` : `${up} ways from above + ${left} from the left = ${v}.`, q);
    }
    const total = table[rows * cols - 1];
    rec(-1, 2, `${total} different walk${s(total)} to the finish, and we only filled in ${c} squares. Counting every walk one by one would take far longer.`);
    return frames;
  }

  const ALGOS = {
    coins: {
      name: 'Fewest coins',
      blurb: 'Solve the small problems first and write each answer in a table. Then build each bigger answer from answers you already wrote down. Nothing is worked out twice.',
      facts: [['Idea', 'Reuse answers'], ['Table size', 'One per amount'], ['Beats', 'Biggest-coin-first']],
      code: [
        'table[0] ← 0 coins',
        'for each amount a from 1 up',
        '  try each coin k: table[a − k] + 1',
        '  table[a] ← the smallest of those',
        'the answer is the last table entry',
      ],
      offline: {
        title: 'The coin table',
        need: 'Paper, a pencil and three kinds of coins, such as 1, 4 and 5 (real or drawn)',
        time: '15 minutes',
        steps: [
          'Draw a row of 11 boxes, numbered 0 to 10. Write 0 in box 0.',
          'For box 1: take away each coin that fits, look at the box that is left, and add 1. Write the smallest.',
          'Do the same for box 2, box 3, and on up to box 10. Always look back at boxes you have already filled.',
          'Check box 8. Is it what you get by grabbing the biggest coin first?',
        ],
        think: 'The table made every answer from smaller answers. Why is that quicker than trying every possible handful of coins from scratch?',
      },
    },
    grid: {
      name: 'Counting walks',
      blurb: 'To reach a square you must come from the square above or the square on the left. So its count is those two counts added. Fill the grid from the top left and the answer appears in the last corner.',
      facts: [['Idea', 'Add the two before'], ['Squares', 'rows × columns'], ['Without a table', 'Far slower']],
      code: [
        'start square ← 1 way',
        'blocked square ← 0 ways',
        'for each other square in order:',
        '  ways ← ways from above + ways from left',
        'the answer is the bottom-right square',
      ],
      offline: {
        title: 'Count the paths',
        need: 'Squared paper and a pencil',
        time: '10 minutes',
        steps: [
          'Draw a grid of 4 rows and 5 columns. Shade 3 squares as blocked, but not the start or the finish.',
          'Write 1 in the top-left square. Write 0 in every blocked square.',
          'Fill each remaining square, row by row, with the number above it plus the number to its left.',
          'Read the bottom-right square. That is how many different walks there are.',
        ],
        think: 'What happens to the numbers just after a blocked square? How would you count walks if you could also move diagonally?',
      },
    },
  };

  function make(key) {
    if (key === 'coins') return { coins: COINSETS[rnd(0, COINSETS.length - 1)], amount: rnd(8, 12) };
    return makeGrid();
  }
  const record = (key, inp) => (key === 'coins' ? recordCoins(inp) : recordGrid(inp));

  globalThis.VLDp = { ALGOS, record, make, ways, greedy };

  // ---------- page ----------
  if (typeof document === 'undefined') return;
  const $ = (id) => document.getElementById(id);
  const view = $('view');
  let inputs = {};
  const fresh = () => { inputs = { coins: make('coins'), grid: make('grid') }; };

  const lesson = {
    algos: ALGOS,
    record: (key) => record(key, inputs[key]),
    render(f, key) {
      if (key === 'coins') {
        const from = new Set(f.from);
        view.className = 'boxes small';
        view.innerHTML = f.dp.map((v, a) => {
          const cls = v === null ? 'box' : 'box open' + (a === f.cur ? ' cur' : from.has(a) ? ' found' : '');
          return `<div class="${cls}"><b>${v === null ? '?' : v}</b><small>${a}</small></div>`;
        }).join('');
        view.setAttribute('aria-label', 'Fewest coins for each amount: ' + f.dp.map((v, a) => `${a} takes ${v === null ? 'unknown' : v}`).join(', '));
      } else {
        const { rows, cols } = inputs.grid, walls = new Set(inputs.grid.walls);
        view.className = 'maze dpgrid';
        view.style.setProperty('--cols', cols);
        view.innerHTML = Array.from({ length: rows * cols }, (_, id) => {
          const cls = walls.has(id) ? 'cell wall' : id === f.cur ? 'cell cur' : f.table[id] === null ? 'cell' : 'cell seen';
          return `<div class="${cls}">${walls.has(id) || f.table[id] === null ? '' : f.table[id]}</div>`;
        }).join('');
        view.setAttribute('aria-label', `Grid of ${rows} rows and ${cols} columns, counts of walks in each square`);
      }
    },
    stats: (f, key) => [[key === 'coins' ? 'Amounts solved' : 'Squares filled', f.c]],
  };

  fresh();
  const player = VLPlayer.mount(lesson);
  $('b-new').addEventListener('click', () => { fresh(); player.restart(); });
})();
