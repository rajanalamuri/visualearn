/* VisuaLearn number-magic lessons: modular arithmetic, fast powers, Pascal's triangle (nCr) and the
   Chinese remainder theorem. */
(() => {
  'use strict';
  const { rnd, pick, row, rows, choice, numq, yesno } = VLLab;
  const off = (title, need, time, steps, think) => ({ title, need, time, steps, think });

  const ALGOS = {
    modular: {
      name: 'Modular arithmetic',
      blurb: 'Clock arithmetic: numbers wrap around. On a 12-hour clock, 9 o\'clock plus 5 hours is 2 o\'clock. "Mod 12" means: keep only the remainder after dividing by 12. Computers use it to keep numbers small.',
      facts: [['Wraps at', 'The modulus'], ['Written', 'a mod m'], ['Used for', 'Hashing, clocks, codes']],
      code: ['start at a on a clock with m numbers (0 to m − 1)', 'move forward b steps, one at a time', 'past m − 1? wrap round to 0', 'where you stop is (a + b) mod m'],
      offline: off('Be a clock', 'A paper clock with the numbers 0 to 6 (or 0 to 11)', '10 minutes', [
        'Draw a clock with the numbers 0 to 6 round the edge.',
        'Put a coin on 5. Move it forward 4 steps, one number at a time, wrapping from 6 to 0.',
        'Where did it land? Check: (5 + 4) divided by 7, remainder.',
        'Try a few more sums.'], 'What is 100 hours after 3 o\'clock on a 12-hour clock?'),
      make() { const m = pick([7, 12]); return { m, a: rnd(3, m - 1), b: rnd(5, 14) }; },
      run(x, { m, a, b }) {
        let pos = a, wraps = 0, asked = 0; const nums = Array.from({ length: m }, (_, i) => i);
        const view = (cur, st) => ({ ...rows([row('clock', nums, { [cur]: 'cur' })]), lists: [{ label: 'Steps taken', items: [st] }] });
        x.rec(view(a, 0), -1, `A clock with the numbers 0 to ${m - 1}. Start at ${a} and move ${b} steps. Press play.`);
        for (let s = 1; s <= b; s++) {
          const wrap = pos === m - 1;
          pos = (pos + 1) % m; if (wrap) wraps++;
          x.rec(view(pos, s), 2, wrap ? `Step ${s}: past ${m - 1}, so wrap round to 0.` : `Step ${s}: move to ${pos}.`,
            s === 1 ? numq(`Start at ${a} and move ${b} steps round a clock of ${m}. Where will you end up?`, (a + b) % m, [a + b, (a + b + 1) % m, (a + b + m - 1) % m], `${a} + ${b} = ${a + b}. Divide by ${m}: the remainder is ${(a + b) % m}.`)
              : asked < 3 && s < b && pos >= m - 2 ? (asked++, yesno(`Now at ${pos}. After one more step, do we wrap round to 0?`, pos === m - 1, `The numbers stop at ${m - 1}. ${pos} + 1 = ${pos + 1}${pos + 1 === m ? `, which is ${m}, so it wraps to 0` : ', so no wrap'}.`)) : null);
        }
        x.rec(view(pos, b), 3, `${a} + ${b} = ${a + b}, and ${a + b} mod ${m} = ${pos}. We wrapped ${wraps} time${wraps === 1 ? '' : 's'}.`);
        x.result = { m, a, b, pos };
      },
    },

    fastpow: {
      name: 'Fast powers',
      blurb: 'You do not need 12 multiplications to work out 3 to the power 13. Write the power in binary. Square your answer for every bit, and also multiply by 3 when the bit is 1.',
      facts: [['Steps', 'About log₂ of the power'], ['Idea', 'Square, and sometimes multiply'], ['Used for', 'Codes and security']],
      code: ['result ← 1', 'for each bit of the power, from the left', '  square the result (keep the remainder)', '  if the bit is 1: multiply by the base', 'result is base^power'],
      offline: off('Square and multiply', 'Paper and a calculator (optional)', '15 minutes', [
        'Write 13 in binary: 1101.',
        'Start with 1. For the first bit (1): square, then multiply by 3. That gives 3.',
        'Next bit (1): square → 9, multiply by 3 → 27. Next bit (0): just square → 729. Last bit (1): square, then multiply by 3.',
        'Count the multiplications and compare with 12.'], 'How many multiplications does a power of one million need this way?'),
      make() { return { b: pick([2, 3, 5, 7]), e: rnd(9, 29), mod: 97 }; },
      run(x, { b, e, mod }) {
        const bitsE = e.toString(2).split('').map(Number); let r = 1, ops = 0, asked = 0;
        const view = (i, lists) => ({ ...rows([row('power in binary', bitsE, i >= 0 ? { [i]: 'cur' } : {})]), lists: lists || [{ label: `Result (remainder after ${mod})`, items: [r] }] });
        x.rec(view(-1), -1, `Work out ${b}^${e} (keeping remainders after dividing by ${mod}). ${e} in binary is ${bitsE.join('')}. Press play.`, null, [['Multiplications', 0]]);
        bitsE.forEach((bit, i) => {
          const sq = (r * r) % mod; ops++;
          x.rec(view(i), 2, `Bit ${bit}: square the result: ${r} × ${r} = ${r * r}, remainder ${sq}.`, asked < 3 && r > 1 ? (asked++, numq(`Square ${r}, then keep the remainder after dividing by ${mod}. What is it?`, sq, [r * r, (sq + 1) % mod, (sq + 7) % mod], `${r} × ${r} = ${r * r}, and ${r * r} mod ${mod} = ${sq}.`)) : null, [['Multiplications', ops]]);
          r = sq;
          if (bit) { const nr = (r * b) % mod; ops++; x.rec(view(i, [{ label: 'Result', items: [nr] }]), 3, `The bit is 1, so multiply by ${b}: ${r} × ${b} = ${r * b}, remainder ${nr}.`, null, [['Multiplications', ops]]); r = nr; }
        });
        x.rec(view(-1), 4, `${b}^${e} leaves remainder ${r} after dividing by ${mod}. It took ${ops} multiplications, not ${e - 1}.`, null, [['Multiplications', ops]]);
        x.result = { r, b, e, mod, ops };
      },
    },

    pascal: {
      name: 'Counting (nCr)',
      blurb: 'How many ways can you choose 2 friends from 5? Pascal\'s triangle answers it. Each number is the sum of the two above it. The number in row n, place k is "n choose k".',
      facts: [['Rule', 'Add the two above'], ['Reads as', 'n choose k'], ['Edges', 'Always 1']],
      code: ['row 0 is just 1', 'each row starts and ends with 1', 'every other number ← the number above-left + above', 'n choose k is the number in row n, place k'],
      offline: off('Build the triangle', 'Paper and a pencil', '10 minutes', [
        'Write 1 at the top. Below it write 1 1. Then 1 2 1. Each new row starts and ends with 1.',
        'Each number in the middle is the two numbers above it added up.',
        'Go to row 5 and read place 2: that is the number of ways to pick 2 things from 5.',
        'Check by listing the pairs from A, B, C, D, E.'], 'Why does choosing 2 from 5 give the same number as choosing 3 from 5?'),
      make() { const n = rnd(5, 6); return { n, k: rnd(2, 3) }; },
      run(x, { n, k }) {
        const C = Array.from({ length: n + 1 }, () => Array(n + 1).fill(null)); let asked = 0;
        const view = (marks) => ({ type: 'grid', cols: n + 2, cells: [{ t: 'k →', c: '' }, ...Array.from({ length: n + 1 }, (_, j) => ({ t: j, c: '' })), ...C.flatMap((r, i) => [{ t: `n=${i}`, c: '' }, ...r.map((v, j) => ({ t: v === null ? (j > i ? '' : '') : v, c: (marks && marks[`${i},${j}`]) || (j > i ? 'out' : '') }))])], lists: [] });
        x.rec(view(), -1, `Build Pascal's triangle, then read off ${n} choose ${k}. Press play.`);
        for (let i = 0; i <= n; i++) {
          const marks = {};
          for (let j = 0; j <= i; j++) { C[i][j] = j === 0 || j === i ? 1 : C[i - 1][j - 1] + C[i - 1][j]; marks[`${i},${j}`] = 'seen'; }
          const j0 = rnd(1, Math.max(1, i - 1));
          x.rec(view(marks), i === 0 ? 0 : 2, i === 0 ? 'Row 0 is just 1.' : i === 1 ? 'Every row starts and ends with 1.' : `Row ${i}: each middle number is the two above it added.`,
            asked < 3 && i >= 3 ? (asked++, numq(`Row ${i}, place ${j0}: the numbers above are ${C[i - 1][j0 - 1]} and ${C[i - 1][j0]}. What goes here?`, C[i][j0], [C[i - 1][j0], C[i][j0] + 1, Math.max(0, C[i][j0] - 1)], `${C[i - 1][j0 - 1]} + ${C[i - 1][j0]} = ${C[i][j0]}.`)) : null);
        }
        x.rec(view({ [`${n},${k}`]: 'found' }), 3, `${n} choose ${k} = ${C[n][k]}: there are ${C[n][k]} ways to pick ${k} from ${n}.`);
        x.result = { n, k, value: C[n][k] };
      },
    },

    crt: {
      name: 'Chinese remainder theorem',
      blurb: 'Say a number leaves remainder 2 when divided by 3, and remainder 3 when divided by 5. Mark the numbers that fit the first clue, then the second. The number in both lists is the answer.',
      facts: [['Needs', 'Moduli with no common factor'], ['Unique below', 'Their product'], ['Used for', 'Big-number tricks, codes']],
      code: ['list the numbers 0 up to the product of the moduli − 1', 'mark those with the first remainder', 'mark those with the second remainder', 'the number marked twice is the answer'],
      offline: off('Two clues', 'A number line from 0 to 14 on paper, and two coloured pencils', '10 minutes', [
        'Draw the numbers 0 to 14.',
        'Clue 1: the number leaves remainder 2 when divided by 3. Colour all numbers that do (2, 5, 8, 11, 14).',
        'Clue 2: remainder 3 when divided by 5. Colour with the other pencil (3, 8, 13).',
        'The number with both colours is the answer.'], 'Why do the clues pick out exactly one number below 15?'),
      make() { const [m1, m2] = pick([[3, 5], [3, 4], [4, 5], [5, 7]]); const t = rnd(0, m1 * m2 - 1); return { m1, m2, r1: t % m1, r2: t % m2 }; },
      run(x, { m1, m2, r1, r2 }) {
        const N = m1 * m2, nums = Array.from({ length: N }, (_, i) => i);
        const view = (a, b) => rows([row('numbers', nums, Object.fromEntries(nums.map((v) => [v, a && b && v % m1 === r1 && v % m2 === r2 ? 'found' : a && v % m1 === r1 ? 'key' : b && v % m2 === r2 ? 'alt' : ''])))]);
        x.rec(view(false, false), -1, `A number leaves remainder ${r1} when divided by ${m1}, and remainder ${r2} when divided by ${m2}. Which number below ${N}? Press play.`);
        const first = nums.filter((v) => v % m1 === r1), second = nums.filter((v) => v % m2 === r2);
        x.rec(view(true, false), 1, `Numbers with remainder ${r1} after dividing by ${m1}: ${first.join(', ')}.`, numq(`How many numbers below ${N} leave remainder ${r1} when divided by ${m1}?`, first.length, [first.length + 1, Math.max(1, first.length - 1), m1], `They are ${m1} apart, so there are ${first.length} of them below ${N}.`));
        x.rec(view(true, true), 2, `Numbers with remainder ${r2} after dividing by ${m2}: ${second.join(', ')}.`);
        const both = nums.filter((v) => v % m1 === r1 && v % m2 === r2);
        x.rec(view(true, true), 3, `Only ${both[0]} is in both lists. That is the number.`);
        x.result = { answer: both[0], count: both.length, m1, m2, r1, r2 };
      },
    },
  };

  VLLab.define('numbers', ALGOS);
})();
