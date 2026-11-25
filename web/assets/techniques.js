/* VisuaLearn techniques lessons: two pointers, sliding window, prefix sums, binary search on the answer,
   counting and radix sort, monotonic stacks, deques, linked lists, strings, grids and a few ideas about cost. */
(() => {
  'use strict';
  const { rnd, pick, distinct, row, rows, choice, numq, yesno, plural } = VLLab;
  const off = (title, need, time, steps, think) => ({ title, need, time, steps, think });
  const mk = (cells, marks, ptr, label) => rows([row(label || '', cells, marks, ptr)]);

  const ALGOS = {
    twoptr: {
      name: 'Two pointers',
      blurb: 'On a sorted row, put one finger at each end. If the pair adds up to too little, move the left finger right. Too much, move the right finger left. You never check every pair.',
      facts: [['Needs', 'A sorted row'], ['Time', 'O(n)'], ['Instead of', 'Trying every pair']],
      code: ['left ← first; right ← last', 'while left < right', '  sum ← a[left] + a[right]', '  if sum = target: found', '  if sum is too small: left → right', '  else: right → left', 'no pair adds up'],
      offline: off('Pair up', 'Number cards in order, and a target number', '10 minutes', [
        'Lay 8 number cards face up in order, smallest on the left.',
        'Pick a target. Put one finger on the first card and one on the last.',
        'Add the two cards. Too small? Move the left finger right. Too big? Move the right finger left.',
        'Stop when they add to the target, or when your fingers meet.'], 'Why can you safely ignore a card once its finger has moved past it?'),
      make() {
        const a = distinct(8, 1, 40).sort((p, q) => p - q);
        let t;
        if (Math.random() < 0.75) { const i = rnd(0, 6), j = rnd(i + 1, 7); t = a[i] + a[j]; } else t = rnd(4, 70);
        return { a, t };
      },
      run(x, { a, t }) {
        let l = 0, h = a.length - 1, c = 0, asked = 0;
        const v = (m) => mk(a, Object.fromEntries(a.map((_, i) => [i, i < l || i > h ? 'out' : ''])), l === h ? { [l]: 'both' } : { [l]: 'left', [h]: 'right' });
        const view = (extra) => { const r = v(); Object.assign(r.rows[0].marks, extra || {}); return r; };
        x.rec(view(), -1, `Sorted row. Find two numbers that add up to ${t}.`, null, [['Pairs checked', 0]]);
        while (l < h) {
          const s = a[l] + a[h]; c++;
          if (s === t) { x.rec(view({ [l]: 'found', [h]: 'found' }), 3, `${a[l]} + ${a[h]} = ${s}. That's ${t}. Found, after ${plural(c, 'pair')}.`, null, [['Pairs checked', c]]); x.rec(view({ [l]: 'found', [h]: 'found' }), 3, `Only ${plural(c, 'pair')} checked, out of ${(a.length * (a.length - 1)) / 2} possible.`, null, [['Pairs checked', c]]); x.result = [l, h]; return; }
          const q = asked < 3 ? (asked++, choice(`${a[l]} + ${a[h]} = ${s}, and we want ${t}. Which pointer moves?`, s < t ? 'Left pointer moves right' : 'Right pointer moves left',
            [s < t ? 'Right pointer moves left' : 'Left pointer moves right'], s < t ? `${s} is too small. Only moving the left pointer right can make the sum bigger.` : `${s} is too big. Only moving the right pointer left can make the sum smaller.`)) : null;
          x.rec(view({ [l]: 'cur', [h]: 'cur' }), s < t ? 4 : 5, `${a[l]} + ${a[h]} = ${s}. ${s < t ? 'Too small' : 'Too big'}.`, q, [['Pairs checked', c]]);
          if (s < t) l++; else h--;
        }
        x.rec(view(), 6, `The pointers met. No two numbers add up to ${t}. We checked only ${plural(c, 'pair')}.`, null, [['Pairs checked', c]]);
        x.result = null;
      },
    },

    window: {
      name: 'Sliding window',
      blurb: 'To find the best run of 3 in a row, do not re-add every run. Slide the window one step: add the number that comes in, take away the one that leaves.',
      facts: [['Time', 'O(n)'], ['Window', 'Fixed size k'], ['Instead of', 'Re-adding each run']],
      code: ['sum ← first k numbers; best ← sum', 'for each next number', '  sum ← sum + new − the one leaving', '  best ← the larger of best and sum', 'answer is best'],
      offline: off('Slide the frame', 'A strip of squared paper with numbers, and a card with a 3-square window cut out', '10 minutes', [
        'Write 9 numbers in a row on the strip.',
        'Put the window over the first 3 and add them.',
        'Slide the window one place. Do not add again: add the new number, take away the one that left.',
        'Keep the best total. Slide to the end.'], 'How many additions does each slide need, compared with adding all 3 from scratch? What if the window were 100 wide?'),
      make() { return { a: Array.from({ length: 9 }, () => rnd(1, 9)), k: 3 }; },
      run(x, { a, k }) {
        let sum = a.slice(0, k).reduce((p, q) => p + q, 0), best = sum, bestAt = 0, asked = 0;
        const view = (i, done) => {
          const marks = {};
          for (let j = bestAt; j < bestAt + k; j++) marks[j] = 'done';
          for (let j = i; j < i + k; j++) marks[j] = 'cur';
          const r = mk(a, marks); r.lists = [{ label: 'Window sum', items: [sum] }, { label: 'Best so far', items: [best] }]; return r;
        };
        x.rec(view(0), -1, `Find the biggest total of ${k} numbers in a row. Press play.`, null, [['Best', best]]);
        x.rec(view(0), 0, `Add the first ${k}: ${a.slice(0, k).join(' + ')} = ${sum}.`, null, [['Best', best]]);
        for (let i = 1; i + k <= a.length; i++) {
          const gone = a[i - 1], come = a[i + k - 1], was = sum;
          sum = sum - gone + come;
          const q = asked < 3 && i >= 2 ? (asked++, numq(`The window slides. ${gone} leaves, ${come} comes in. What is the new sum?`, sum, [was, was + come, was - gone], `${was} − ${gone} + ${come} = ${sum}.`)) : null;
          if (sum > best) { best = sum; bestAt = i; }
          x.rec(view(i), 2, `Slide: ${was} − ${gone} + ${come} = ${sum}.${sum === best && bestAt === i ? ' A new best!' : ''}`, q, [['Best', best]]);
        }
        x.rec(view(bestAt), 4, `The best ${k} in a row add up to ${best}.`, null, [['Best', best]]);
        x.result = best;
      },
    },

    prefix: {
      name: 'Prefix sums',
      blurb: 'Add up the row once, keeping a running total. After that, the sum of any stretch is just one subtraction: the total at the end minus the total just before the start.',
      facts: [['Build', 'O(n) once'], ['Each question', 'O(1)'], ['Instead of', 'Re-adding every time']],
      code: ['P[0] ← 0', 'for each i: P[i+1] ← P[i] + a[i]', 'sum of a[l..r] ← P[r+1] − P[l]'],
      offline: off('Running total', 'Paper and a pencil', '10 minutes', [
        'Write 8 numbers in a row. Under them, write a running total: each box is the box before plus the number above.',
        'Pick two positions. The sum between them is the running total at the end minus the running total just before the start.',
        'Check by adding the numbers one by one. They agree.'], 'If you had to answer 1000 questions about the same row, why is the running total worth building first?'),
      make() { const a = Array.from({ length: 8 }, () => rnd(1, 9)); const l = rnd(0, 4), r = rnd(l + 1, 7); return { a, l, r }; },
      run(x, { a, l, r }) {
        const P = Array(a.length + 1).fill(null); P[0] = 0;
        const view = (i, marks2) => rows([row('numbers', a, i >= 0 ? { [i]: 'cur' } : {}), row('totals', P.map((v) => (v === null ? '' : v)), marks2 || {})]);
        x.rec(view(-1), -1, 'Build a row of running totals, then answer a question quickly. Press play.');
        x.rec(view(-1, { 0: 'done' }), 0, 'The total before any numbers is 0.');
        for (let i = 0; i < a.length; i++) {
          P[i + 1] = P[i] + a[i];
          x.rec(view(i, { [i + 1]: 'cur' }), 1, `${P[i]} + ${a[i]} = ${P[i + 1]}.`);
        }
        const s = P[r + 1] - P[l];
        const marks = {}; for (let i = l; i <= r; i++) marks[i] = 'key';
        const m2 = { [l]: 'swap', [r + 1]: 'found' };
        x.rec(rows([row('numbers', a, marks), row('totals', P, m2)]), 2, `Question: what is the sum of the numbers in positions ${l + 1} to ${r + 1}?`,
          numq(`Positions ${l + 1} to ${r + 1}: P[${r + 1}] − P[${l}] = ? `, s, [P[r + 1], P[l], s + 1, s - 1], `${P[r + 1]} − ${P[l]} = ${s}. No adding of the stretch needed.`));
        x.rec(rows([row('numbers', a, marks), row('totals', P, m2)]), 2, `${P[r + 1]} − ${P[l]} = ${s}. One subtraction.`);
        x.result = { P, sum: s, l, r };
      },
    },

    bsans: {
      name: 'Binary search on the answer',
      blurb: 'You can binary-search more than a sorted list. If you can test a guess (is this speed fast enough?) and bigger guesses never do worse, halve the range of possible answers.',
      facts: [['Needs', 'A yes/no test'], ['Time', 'O(log range)'], ['Instead of', 'Trying every guess']],
      code: ['low ← 1; high ← biggest possible', 'while low < high', '  mid ← the middle guess', '  if mid works: high ← mid', '  else: low ← mid + 1', 'answer is low'],
      offline: off('Slowest speed that works', 'Paper, a pencil and 4 piles of coins', '15 minutes', [
        'Make 4 piles of coins. You may eat from one pile per hour, up to your speed. You have H hours.',
        'Guess a speed in the middle. Work out how many hours it takes (each pile needs its size divided by speed, rounded up).',
        'Fast enough? Try a slower speed. Too slow? Try faster. Always guess the middle of what is left.',
        'Stop when only one speed is left.'], 'Why can you throw away half the speeds after each test?'),
      make() { const piles = distinct(4, 3, 20); return { piles, H: piles.length + rnd(2, 5) }; },
      run(x, { piles, H }) {
        const M = Math.max(...piles), hours = (s) => piles.reduce((p, q) => p + Math.ceil(q / s), 0);
        let lo = 1, hi = M, c = 0, asked = 0;
        const speeds = Array.from({ length: M }, (_, i) => i + 1);
        const view = (mid) => {
          const marks = {}; speeds.forEach((s, i) => { if (s < lo || s > hi) marks[i] = 'out'; });
          if (mid) marks[mid - 1] = 'cur';
          if (lo === hi) marks[lo - 1] = 'found';
          return rows([row('speeds', speeds, marks, mid ? { [mid - 1]: 'mid' } : {})]);
        };
        x.rec(view(0), -1, `Piles of ${piles.join(', ')}. Eat the whole lot within ${H} hours. What is the slowest speed per hour that works?`, null, [['Tests', 0]]);
        while (lo < hi) {
          const mid = (lo + hi) >> 1, need = hours(mid); c++;
          const ok = need <= H;
          const q = asked < 3 ? (asked++, yesno(`At speed ${mid}, do the piles take at most ${H} hours?`, ok, `At ${mid} per hour the piles need ${piles.map((p) => Math.ceil(p / mid)).join(' + ')} = ${need} hours. ${ok ? 'That fits.' : 'Too slow.'}`)) : null;
          x.rec(view(mid), 2, `Test the middle speed, ${mid}. It needs ${need} hours.`, q, [['Tests', c]]);
          if (ok) { hi = mid; x.rec(view(0), 3, `${need} ≤ ${H}, so ${mid} works. Maybe something slower does too. Keep ${lo} to ${hi}.`, null, [['Tests', c]]); }
          else { lo = mid + 1; x.rec(view(0), 4, `${need} > ${H}, so ${mid} is too slow, and so is everything slower. Keep ${lo} to ${hi}.`, null, [['Tests', c]]); }
        }
        x.rec(view(0), 5, `The slowest speed that works is ${lo}. We tested only ${plural(c, 'speed')} out of ${M}.`, null, [['Tests', c]]);
        x.result = lo;
      },
    },

    counting: {
      name: 'Counting sort',
      blurb: 'When the numbers are small, you do not need to compare at all. Count how many times each number appears, then write each number out as many times as you counted.',
      facts: [['Time', 'O(n + range)'], ['Compares?', 'Never'], ['Needs', 'Small numbers']],
      code: ['counts ← zeros for 0 … max', 'for each number: counts[number] += 1', 'for each value 0 … max', '  write it counts[value] times'],
      offline: off('Sort by counting', '20 playing cards, or numbers 0 to 5 on paper slips', '10 minutes', [
        'Draw 6 boxes labelled 0 to 5.',
        'Take each number in turn and put a tally mark in its box.',
        'Read the boxes from 0 to 5. Write each number as many times as it has tally marks.',
        'The list is sorted, and you never compared two numbers.'], 'Why would this stop working for numbers up to a billion?'),
      make() { return { a: Array.from({ length: 9 }, () => rnd(0, 5)) }; },
      run(x, { a }) {
        const K = 6, counts = Array(K).fill(0), out = Array(a.length).fill(null);
        const idx = Array.from({ length: K }, (_, i) => String(i));
        const view = (i, ck, oi) => rows([row('numbers', a, i >= 0 ? { [i]: 'cur' } : {}), row('counts', counts, ck >= 0 ? { [ck]: 'key' } : {}, Object.fromEntries(idx.map((s, k) => [k, s]))), row('sorted', out, oi >= 0 ? { [oi]: 'found' } : {})]);
        x.rec(view(-1, -1, -1), -1, 'Count each number. No comparing. Press play.');
        a.forEach((v, i) => { counts[v]++; x.rec(view(i, v, -1), 1, `${v} appears: its count goes up to ${counts[v]}.`); });
        let w = 0, asked = 0;
        for (let v = 0; v < K; v++) {
          const q = asked < 2 && counts[v] > 0 ? (asked++, numq(`How many times will ${v} be written out?`, counts[v], [counts[v] + 1, Math.max(0, counts[v] - 1), 1], `The count for ${v} is ${counts[v]}.`)) : null;
          if (counts[v] === 0) continue;
          x.rec(view(-1, v, -1), 3, `${v} was counted ${counts[v]} time${counts[v] === 1 ? '' : 's'}. Write it that many times.`, q);
          for (let k = 0; k < counts[v]; k++) { out[w] = v; x.rec(view(-1, v, w), 3, `Write ${v} in place ${w + 1}.`); w++; }
        }
        x.rec(view(-1, -1, -1), 3, 'Sorted, without ever comparing two numbers.');
        x.result = out.slice();
      },
    },

    radix: {
      name: 'Radix sort',
      blurb: 'Sort by the last digit first, using ten buckets and keeping the order. Then sort by the tens digit the same way. After the last digit, the whole row is sorted.',
      facts: [['Time', 'O(n × digits)'], ['Compares?', 'Never'], ['Key', 'Keep the order inside buckets']],
      code: ['for each digit place, last digit first:', '  put each number in the bucket for its digit', '  collect the buckets in order, 0 to 9', 'sorted after the last place'],
      offline: off('Bucket shuffle', 'Ten cups labelled 0 to 9 and 8 two-digit number cards', '15 minutes', [
        'Put each card in the cup that matches its last digit. Add cards on top, so the order inside a cup is kept.',
        'Collect the cards cup by cup, from 0 to 9, keeping each cup in order.',
        'Now put each card in the cup for its first digit, and collect again.',
        'The cards are in order.'], 'Why must the second round keep the order from the first round inside each cup?'),
      make() { return { a: distinct(7, 10, 99) }; },
      run(x, { a }) {
        let arr = a.slice();
        x.rec(mk(arr, {}, {}, 'numbers'), -1, 'Sort by the last digit, then by the tens digit. No comparing. Press play.');
        let asked = 0;
        for (const [place, name] of [[1, 'ones'], [10, 'tens']]) {
          const digit = (n) => Math.floor(n / place) % 10;
          const ptr = Object.fromEntries(arr.map((n, i) => [i, String(digit(n))]));
          const probe = 2;
          const q = asked < 2 ? (asked++, numq(`Looking at the ${name} digit, which bucket does ${arr[probe]} go in?`, digit(arr[probe]), [(digit(arr[probe]) + 1) % 10, (digit(arr[probe]) + 3) % 10, (digit(arr[probe]) + 7) % 10], `The ${name} digit of ${arr[probe]} is ${digit(arr[probe])}.`)) : null;
          x.rec(mk(arr, { [probe]: 'cur' }, ptr, 'numbers'), 0, `Look at the ${name} digit of each number (shown under it).`, q);
          const buckets = Array.from({ length: 10 }, () => []);
          for (const n of arr) buckets[digit(n)].push(n);
          const lists = buckets.map((b, d) => ({ label: `Bucket ${d}`, items: b })).filter((l) => l.items.length);
          x.rec({ ...mk(arr, {}, ptr, 'numbers'), lists }, 1, `Drop each number into its bucket, keeping the order they came in.`);
          arr = buckets.flat();
          x.rec(mk(arr, {}, {}, 'numbers'), 2, `Collect the buckets from 0 to 9. Now sorted by the ${name} digit.`);
        }
        x.rec(mk(arr, Object.fromEntries(arr.map((_, i) => [i, 'done'])), {}, 'numbers'), 3, 'Sorted, without comparing any two numbers.');
        x.result = arr.slice();
      },
    },

    monostack: {
      name: 'Monotonic stacks',
      blurb: 'For each number, find the next bigger number to its right. Keep a stack of numbers still waiting. A new number that is bigger than the top answers it, and lets it leave.',
      facts: [['Time', 'O(n)'], ['Stack holds', 'Numbers still waiting'], ['Instead of', 'Looking right every time']],
      code: ['stack ← empty', 'for each number n, left to right', '  while the top is smaller than n:', '    answer for the top ← n; pop it', '  push n', 'whatever is left has no bigger number'],
      offline: off('Waiting in line', 'A row of 7 number cards and a small pile area', '10 minutes', [
        'Turn over the cards one at a time from the left. Keep a pile of cards still waiting for something bigger.',
        'When the new card is bigger than the top of the pile, the top has found its answer. Take it off, write the new card next to it.',
        'Keep taking cards off while the new card is bigger. Then put the new card on the pile.',
        'Cards left on the pile never found a bigger one.'], 'Each card goes on the pile once and off once. What does that tell you about how much work it is?'),
      make() { return { a: distinct(7, 1, 30) }; },
      run(x, { a }) {
        const res = Array(a.length).fill(null), st = []; let asked = 0;
        const view = (i, pops) => ({ ...rows([row('numbers', a, i >= 0 ? { [i]: 'cur' } : {}), row('next bigger', res.map((r) => (r === null ? '?' : r === -1 ? '–' : r)), Object.fromEntries((pops || []).map((p) => [p, 'found'])))]), lists: [{ label: 'Stack (top on the right)', items: st.map((j) => a[j]) }] });
        x.rec(view(-1), -1, 'For each number, find the next bigger one to its right. Press play.');
        for (let i = 0; i < a.length; i++) {
          if (st.length) {
            const top = a[st[st.length - 1]], pops = a[i] > top;
            x.rec(view(i), 1, `Next number is ${a[i]}. The top of the stack is ${top}.`, asked < 3 ? (asked++, yesno(`Is ${a[i]} bigger than ${top}, so ${top} is answered?`, pops, pops ? `${a[i]} > ${top}, so ${a[i]} is the next bigger number for ${top}.` : `${a[i]} is not bigger than ${top}, so ${top} keeps waiting.`)) : null);
          } else x.rec(view(i), 1, `Next number is ${a[i]}. The stack is empty.`);
          while (st.length && a[st[st.length - 1]] < a[i]) {
            const j = st.pop(); res[j] = a[i];
            x.rec(view(i, [j]), 3, `${a[i]} is bigger than ${a[j]}. The next bigger for ${a[j]} is ${a[i]}. Pop it.`);
          }
          st.push(i);
          x.rec(view(i), 4, `Push ${a[i]}: it is waiting for a bigger number.`);
        }
        st.forEach((j) => { res[j] = -1; });
        x.rec(view(-1), 5, `Numbers left on the stack (shown –) have nothing bigger to their right.`);
        x.result = res.slice();
      },
    },

    deque: {
      name: 'Deques',
      blurb: 'A deque is a line you can add to or take from at both ends. It finds the biggest number in every window of 3 by keeping only candidates, the big ones, and dropping the small ones behind them.',
      facts: [['Ends', 'Both open'], ['Time', 'O(n)'], ['Used for', 'Window maximum']],
      code: ['deque ← empty (holds positions)', 'for each number n', '  drop from the BACK while the back is ≤ n', '  add n at the back', '  drop from the FRONT if it left the window', '  the front is the window maximum'],
      offline: off('Candidates in a queue', '9 number cards and a strip of paper', '15 minutes', [
        'Lay 9 cards in a row. We want the biggest in every 3 in a row.',
        'Keep a short queue of candidates. A new card removes any smaller cards from the back, then joins the back.',
        'If the front card has slid out of the window, remove it.',
        'The front card is the biggest in the window. Write it down.'], 'Why can a smaller card behind a bigger one never be the biggest again?'),
      make() { return { a: distinct(9, 1, 40), k: 3 }; },
      run(x, { a, k }) {
        const dq = [], out = []; let asked = 0;
        const view = (i) => { const marks = {}; for (let j = Math.max(0, i - k + 1); j <= i; j++) marks[j] = 'cur'; return { ...rows([row('numbers', a, i >= 0 ? marks : {}), row('window max', Array(a.length - k + 1).fill(0).map((_, j) => (j < out.length ? out[j] : '')), {})]), lists: [{ label: 'Deque (front on the left)', items: dq.map((j) => a[j]) }] }; };
        x.rec(view(-1), -1, `Find the biggest number in every window of ${k}. Press play.`);
        for (let i = 0; i < a.length; i++) {
          if (dq.length) {
            const back = a[dq[dq.length - 1]], drop = back <= a[i];
            x.rec(view(i), 2, `New number ${a[i]}. The back of the deque is ${back}.`, asked < 3 ? (asked++, yesno(`Does ${a[i]} push ${back} off the back of the deque?`, drop, drop ? `${back} ≤ ${a[i]}, and ${back} is older, so it can never be a window maximum again.` : `${back} is bigger, so it may still be the maximum later. Keep it.`)) : null);
          }
          while (dq.length && a[dq[dq.length - 1]] <= a[i]) dq.pop();
          dq.push(i);
          x.rec(view(i), 3, `Add ${a[i]} at the back.`);
          if (dq[0] <= i - k) { dq.shift(); x.rec(view(i), 4, 'The front number slid out of the window. Remove it.'); }
          if (i >= k - 1) { out.push(a[dq[0]]); x.rec(view(i), 5, `The front of the deque, ${a[dq[0]]}, is the biggest in this window.`); }
        }
        x.rec(view(-1), 5, `The window maximums are ${out.join(', ')}.`);
        x.result = out.slice();
      },
    },

    strings: {
      name: 'Strings: palindromes',
      blurb: 'A palindrome reads the same backwards. Check it with two pointers: compare the first and last letters, then move inward. One mismatch ends it.',
      facts: [['Time', 'O(n)'], ['Pointers', 'Both ends inward'], ['Stops at', 'First mismatch']],
      code: ['left ← first; right ← last', 'while left < right', '  if letters differ: not a palindrome', '  left ← left + 1; right ← right − 1', 'every pair matched: palindrome'],
      offline: off('Mirror words', 'Letter tiles or paper slips', '10 minutes', [
        'Spell RACECAR with tiles in a row.',
        'Point at the first and last tile. Do they match? Move both fingers inward.',
        'Try PENCIL and LEVEL. Stop at the first mismatch.'], 'How many comparisons does a word of 100 letters need at most?'),
      make() { return { w: pick(['racecar', 'level', 'radar', 'pencil', 'garden', 'noon', 'planet', 'refer']).split('') }; },
      run(x, { w }) {
        let l = 0, r = w.length - 1, asked = 0;
        const view = (m) => mk(w, m || {}, l >= r ? { [l]: 'both' } : { [l]: 'left', [r]: 'right' });
        x.rec(view(), -1, `Is ${w.join('').toUpperCase()} a palindrome? Press play.`);
        while (l < r) {
          const same = w[l] === w[r];
          x.rec(view({ [l]: 'cur', [r]: 'cur' }), 2, `Compare ${w[l].toUpperCase()} and ${w[r].toUpperCase()}.`, asked < 3 ? (asked++, yesno(`Do ${w[l].toUpperCase()} and ${w[r].toUpperCase()} match?`, same, same ? 'They match, so move both pointers inward.' : 'They differ, so the word is not a palindrome.')) : null);
          if (!same) { x.rec(view({ [l]: 'swap', [r]: 'swap' }), 2, `${w[l].toUpperCase()} ≠ ${w[r].toUpperCase()}. Not a palindrome.`); x.result = false; return; }
          l++; r--;
          x.rec(view({}), 3, 'Move both pointers inward.');
        }
        x.rec(view(Object.fromEntries(w.map((_, i) => [i, 'done']))), 4, 'Every pair matched. It is a palindrome.');
        x.result = true;
      },
    },

    cycle: {
      name: 'Cycle detection',
      blurb: 'Is a chain of links a loop? Send a slow walker (1 step) and a fast walker (2 steps). On a loop the fast one laps the slow one and they meet. On a straight chain the fast one runs off the end.',
      facts: [['Memory', 'O(1)'], ['Time', 'O(n)'], ['Also called', "Floyd's tortoise and hare"]],
      code: ['slow ← head; fast ← head', 'while fast and fast.next exist', '  slow ← slow.next', '  fast ← fast.next.next', '  if slow = fast: a cycle!', 'fast ran off the end: no cycle'],
      offline: off('Tortoise and hare', 'A drawing of 7 dots joined by arrows, and two coins', '10 minutes', [
        'Draw 7 dots with arrows between them. Make the last arrow go back to an earlier dot, or leave it out.',
        'Put two coins on the first dot. Each turn, move one coin one arrow and the other coin two arrows.',
        'If the coins meet, there is a loop. If one coin runs off the end, there is not.'], 'Why must the fast coin catch the slow one if there is a loop?'),
      make() { return { n: 7, back: Math.random() < 0.6 ? rnd(0, 4) : -1 }; },
      run(x, { n, back }) {
        const next = (i) => (i < n - 1 ? i + 1 : back >= 0 ? back : null);
        const nodes = (s, f, cls) => Array.from({ length: n }, (_, i) => ({ id: i, x: 55 + i * 82, y: i % 2 ? 110 : 190, t: i + 1, s: [i === s ? 'S' : '', i === f ? 'F' : ''].join('') , c: (cls && cls.includes(i)) ? 'found' : i === s ? 'cur' : i === f ? 'alt' : '' }));
        const edges = Array.from({ length: n }, (_, i) => (next(i) === null ? null : { a: i, b: next(i), d: true })).filter(Boolean);
        const view = (s, f, cls) => ({ type: 'graph', h: 270, nodes: nodes(s, f, cls), edges, lists: [] });
        let s = 0, f = 0, c = 0, asked = 0;
        x.rec(view(0, 0), -1, 'S is the slow walker (1 step), F the fast walker (2 steps). Both start at the first dot.', null, [['Steps', 0]]);
        for (let guard = 0; guard < 40; guard++) {
          const n1 = next(f), n2 = n1 === null ? null : next(n1);
          if (n1 === null || n2 === null) { x.rec(view(s, f), 5, 'The fast walker ran off the end. There is no loop.', null, [['Steps', c]]); x.result = false; return; }
          const q = asked < 2 ? (asked++, choice(`F moves two arrows. Which dot does it land on?`, n2 + 1, [n1 + 1, f + 1, ((n2 + 1) % n) + 1], `From dot ${f + 1}, one arrow leads to dot ${n1 + 1} and the next to dot ${n2 + 1}.`)) : null;
          s = next(s); f = n2; c++;
          if (s === f) { x.rec(view(s, f, [s]), 4, `S and F are on the same dot. They met, so there is a loop.`, null, [['Steps', c]]); x.result = true; return; }
          x.rec(view(s, f), 3, `S moves 1 step, F moves 2.`, q, [['Steps', c]]);
        }
      },
    },

    reverse: {
      name: 'Linked lists: reverse',
      blurb: 'A linked list is a chain of boxes, each knowing only the next one. To reverse it, walk along and turn each arrow around to point at the box behind it.',
      facts: [['Time', 'O(n)'], ['Extra memory', 'O(1)'], ['Each box', 'Knows only its next']],
      code: ['previous ← nothing; current ← head', 'while current exists', '  next ← current.next (remember it!)', '  current.next ← previous', '  previous ← current; current ← next', 'previous is the new head'],
      offline: off('Turn the arrows', '5 cards in a row and string or pencil arrows', '10 minutes', [
        'Lay 5 cards in a row with an arrow from each card to the next.',
        'Start at the first card. Remember where its arrow pointed, then turn its arrow to point backward.',
        'Move to the card you remembered and repeat.',
        'When you finish, the chain runs the other way.'], 'What goes wrong if you turn an arrow before remembering where it pointed?'),
      make() { return { v: distinct(5, 1, 9) }; },
      run(x, { v }) {
        const n = v.length, nxt = v.map((_, i) => (i < n - 1 ? i + 1 : null));
        const view = (cur, prev, nx) => ({ type: 'graph', h: 160, nodes: v.map((t, i) => ({ id: i, x: 70 + i * 115, y: 80, t, s: i === prev ? 'prev' : i === cur ? 'cur' : '', c: i === cur ? 'cur' : i === prev ? 'done' : i === nx ? 'seen' : '' })), edges: nxt.map((b, a) => (b === null ? null : { a, b, d: true })).filter(Boolean), lists: [] });
        let prev = null, cur = 0, asked = 0;
        x.rec(view(null, null, null), -1, `The list: ${v.join(' → ')}. Turn every arrow around. Press play.`);
        while (cur !== null) {
          const nx = nxt[cur];
          x.rec(view(cur, prev, nx), 2, `Remember that ${v[cur]} points to ${nx === null ? 'nothing' : v[nx]}.`);
          const q = asked < 3 ? (asked++, choice(`Where should ${v[cur]}'s arrow point now?`, prev === null ? 'Nothing (it becomes the end)' : String(v[prev]), [nx === null ? 'Nothing (it becomes the end)' : String(v[nx]), String(v[(cur + 2) % n])], `Reversing means pointing backward, at the box we just left${prev === null ? ', and there is none, so it ends the list' : ''}.`)) : null;
          nxt[cur] = prev;
          x.rec(view(cur, prev, nx), 3, `Point ${v[cur]} back at ${prev === null ? 'nothing' : v[prev]}.`, q);
          prev = cur; cur = nx;
        }
        const order = []; for (let p = prev; p !== null; p = nxt[p]) order.push(v[p]);
        x.rec(view(null, prev, null), 5, `Reversed: ${order.join(' → ')}.`);
        x.result = order;
      },
    },

    spiral: {
      name: 'Matrices and grids',
      blurb: 'A grid is a list of lists. To walk all of it in a spiral, go right until the edge, then down, left, and up, turning each time you hit the edge or a square you have already visited.',
      facts: [['Squares', 'rows × columns'], ['Time', 'O(rows × columns)'], ['Turns at', 'Edges and visited squares']],
      code: ['direction ← right', 'repeat rows × columns times', '  visit this square', '  if the next square is off the grid or visited: turn clockwise', '  step forward'],
      offline: off('Spiral walk', 'Squared paper (3 rows by 4 columns) and a pencil', '10 minutes', [
        'Draw a grid 4 across and 3 down and write 1 to 12 in order.',
        'Start in the top-left. Go right until you cannot, then down, then left, then up.',
        'Cross out squares as you visit them. Turn whenever the next square is crossed out or is off the grid.',
        'Write the numbers in the order you visited them.'], 'How does the spiral know when it has finished?'),
      make() { return { r: 3, c: 4 }; },
      run(x, { r, c }) {
        const cells = Array.from({ length: r * c }, (_, i) => ({ t: i + 1, c: '' }));
        const seen = new Set(), order = [], D = [[0, 1, 'Right'], [1, 0, 'Down'], [0, -1, 'Left'], [-1, 0, 'Up']];
        let y = 0, xx = 0, d = 0, asked = 0;
        const view = (cur) => ({ type: 'grid', cols: c, cells: cells.map((cl, i) => ({ t: cl.t, c: i === cur ? 'cur' : seen.has(i) ? 'done' : '' })), lists: [{ label: 'Order', items: order.map((i) => i + 1) }] });
        x.rec(view(-1), -1, 'Walk the whole grid in a spiral. Press play.');
        for (let k = 0; k < r * c; k++) {
          const id = y * c + xx; seen.add(id); order.push(id);
          x.rec(view(id), 2, `Visit ${id + 1}.`);
          if (k === r * c - 1) break;
          const ny = y + D[d][0], nx = xx + D[d][1];
          const blocked = ny < 0 || ny >= r || nx < 0 || nx >= c || seen.has(ny * c + nx);
          if (blocked) {
            const nd = (d + 1) % 4;
            const q = asked < 3 ? (asked++, choice(`${D[d][2]} is blocked. Which way next?`, D[nd][2], D.map((z) => z[2]).filter((z) => z !== D[nd][2] && z !== D[d][2]), 'A spiral always turns clockwise: right, down, left, up.')) : null;
            d = nd;
            x.rec(view(id), 3, `Blocked. Turn to face ${D[d][2].toLowerCase()}.`, q);
          }
          y += D[d][0]; xx += D[d][1];
        }
        x.rec(view(-1), 4, `All ${r * c} squares visited: ${order.map((i) => i + 1).join(', ')}.`);
        x.result = order.map((i) => i + 1);
      },
    },

    amortised: {
      name: 'Amortised cost',
      blurb: 'A growing list is stored in a box with spare room. Adding is cheap until the box is full; then everything is copied to a box twice as big. That copy is rare enough that the average cost per add stays small.',
      facts: [['One add', 'Usually 1 step'], ['Average add', 'Under 3 steps'], ['Trick', 'Double when full']],
      code: ['if the box is full:', '  make a box twice as big', '  copy everything across', 'put the new item in', 'average cost = total work ÷ adds'],
      offline: off('The doubling shelf', 'Paper cups and small objects', '10 minutes', [
        'Start with a row of 1 cup. Put an object in.',
        'When the row is full and you want to add another, lay out a row twice as long and carry every object across. Count each carry.',
        'Add 9 objects in all. Count every placement and every carry.',
        'Divide the total by 9.'], 'Why is it better to double the space than to add just one more cup each time?'),
      make() { return { n: 9 }; },
      run(x, { n }) {
        let cap = 1, len = 0, total = 0;
        const view = (hl) => ({ ...rows([row('box', Array.from({ length: cap }, (_, i) => (i < len ? i + 1 : '')), hl || {})]), lists: [] });
        x.rec(view(), -1, `Add ${n} items to a box that starts with room for 1. Press play.`, null, [['Work so far', 0], ['Adds', 0]]);
        for (let i = 1; i <= n; i++) {
          const full = len === cap;
          x.rec(view(full ? { [len - 1]: 'swap' } : {}), 0, full ? 'The box is full.' : `There is room (${cap - len} free).`,
            i >= 3 && i % 2 === 1 ? yesno(`Adding item ${i}: is the box full, so everything must be copied?`, full, full ? `${len} items fill a box of ${cap}. Copy them across to a box of ${cap * 2}.` : `${len} items in a box of ${cap}: there is room.`) : null, [['Work so far', total], ['Adds', i - 1]]);
          if (full) { total += len; cap *= 2; x.rec(view(Object.fromEntries(Array.from({ length: len }, (_, k) => [k, 'cur']))), 2, `Copy ${len} item${len === 1 ? '' : 's'} into a box of ${cap}. That costs ${len}.`, null, [['Work so far', total], ['Adds', i - 1]]); }
          len++; total += 1;
          x.rec(view({ [len - 1]: 'found' }), 3, `Put item ${i} in. Total work so far: ${total}.`, null, [['Work so far', total], ['Adds', i]]);
        }
        x.rec(view(), 4, `${total} steps for ${n} adds, about ${(total / n).toFixed(1)} each. Small, even though a few adds were expensive.`, null, [['Work so far', total], ['Adds', n]]);
        x.result = { total, n };
      },
    },

    invariants: {
      name: 'Invariants',
      blurb: 'An invariant is a promise that stays true every time round a loop. In insertion sort the promise is: everything to the left of the arrow is already in order. If it holds at the start and every step keeps it, the end is sorted.',
      facts: [['Promise', 'Left part is sorted'], ['Start', 'True for 1 number'], ['End', 'Whole row sorted']],
      code: ['invariant: a[0 … i−1] is sorted', 'for i = 1 … n−1', '  take a[i] out', '  slide bigger numbers right', '  drop it in the gap', '  (invariant: a[0 … i] is sorted)'],
      offline: off('Keep the promise', 'A hand of 6 playing cards', '10 minutes', [
        'Hold the cards in a row. The first card on its own is already "sorted".',
        'Take the next card and slide it left into place among the cards already sorted.',
        'After each card, check: is everything to the left of my finger in order?',
        'When your finger reaches the end, all cards are in order.'], 'What would break if you inserted a card into the wrong place once?'),
      make() { return { a: distinct(6, 1, 30) }; },
      run(x, { a }) {
        const arr = a.slice();
        const view = (i, cur) => mk(arr, { ...Object.fromEntries(arr.map((_, k) => [k, k < i ? 'done' : ''])), ...(cur !== undefined ? { [cur]: 'cur' } : {}) }, { [i]: 'i' });
        x.rec(view(1), 0, 'Promise: everything left of the arrow is sorted. At the start, one number on its own is sorted.');
        for (let i = 1; i < arr.length; i++) {
          const key = arr[i]; let j = i - 1;
          x.rec(view(i, i), 2, `Take ${key} out. Everything to its left (green) is sorted.`, i >= 2 ? numq(`After placing ${key}, how many numbers on the left are sorted?`, i + 1, [i, i + 2, 1], `The promise: after step ${i}, the first ${i + 1} numbers are sorted.`) : null);
          while (j >= 0 && arr[j] > key) { arr[j + 1] = arr[j]; j--; }
          arr[j + 1] = key;
          x.rec(view(i + 1, j + 1), 4, `Drop ${key} into place. The first ${i + 1} numbers are sorted again.`);
        }
        x.rec(mk(arr, Object.fromEntries(arr.map((_, k) => [k, 'done']))), 5, 'The promise held every step, so the whole row is sorted.');
        x.result = arr.slice();
      },
    },

    loops: {
      name: 'Steps and loops',
      blurb: 'A computer does one small step at a time. A loop repeats the same steps. Adding 1 to 6 is a loop: take the next number, add it to a running total, repeat.',
      facts: [['Loop', 'Repeat steps'], ['Total', 'Remembered between steps'], ['Stops when', 'Numbers run out']],
      code: ['total ← 0', 'for each number from 1 to n', '  total ← total + number', 'the answer is total'],
      offline: off('Be the loop', 'Paper and a pencil', '5 minutes', [
        'Write total = 0 on paper.',
        'Add 1, cross out the old total, write the new one. Then add 2, then 3, up to 6.',
        'You are the loop: same step, repeated, with a memory.'], 'How many steps would adding 1 to 1,000 take?'),
      make() { return { n: 6 }; },
      run(x, { n }) {
        let total = 0;
        const nums = Array.from({ length: n }, (_, i) => i + 1);
        const view = (i) => ({ ...mk(nums, i >= 0 ? { [i]: 'cur' } : {}, {}, 'numbers'), lists: [{ label: 'Total', items: [total] }] });
        x.rec(view(-1), 0, `Add the numbers 1 to ${n}, one step at a time. Press play.`);
        for (let i = 0; i < n; i++) {
          const was = total; total += nums[i];
          x.rec(view(i), 2, `${was} + ${nums[i]} = ${total}.`, i >= 2 ? numq(`The total is ${was}. After adding ${nums[i]}, what is it?`, total, [was, total + 1, total - 1], `${was} + ${nums[i]} = ${total}.`) : null, [['Steps', i + 1]]);
        }
        x.rec(view(-1), 3, `The answer is ${total}.`, null, [['Steps', n]]);
        x.result = total;
      },
    },
  };

  ALGOS.cases = {
    name: 'Best, worst and average case',
    blurb: 'The same method can be quick or slow depending on the luck of the input. Searching boxes one by one is quickest if the target is in the first box (best case), slowest if it is last or missing (worst case), and about half the boxes on average.',
    facts: [['Best', 'Found first'], ['Worst', 'Last, or missing'], ['Average', 'About half']],
    code: ['for each box from the left', '  open it', '  if it holds the target: stop', 'not found: every box was opened'],
    offline: off('Luck of the draw', '8 cards face down in a row, and a friend', '10 minutes', [
      'Lay 8 cards in a row, face down. Pick a target card.',
      'Open from the left until you find it. Count the cards opened.',
      'Repeat 8 times with the target in a different place each time (first, second, … last).',
      'Add up the counts and divide by 8. That is the average case.'], 'Why do we usually plan for the worst case, even though it is the least likely?'),
    make() { return { a: distinct(8, 1, 40) }; },
    run(x, { a }) {
      const n = a.length, mid = rnd(2, 5), open = (k) => mk(a, Object.fromEntries(a.map((_, i) => [i, i < k ? 'seen' : '']).concat(k > 0 ? [[k - 1, 'cur']] : [])));
      x.rec(mk(a, {}), -1, 'Look for a target by opening boxes from the left. How many boxes are opened in a lucky case, an unlucky case, and on average? Press play.');
      x.rec(open(1), 1, `Best case: the target is in box 1. Only 1 box is opened.`, numq(`The target is in box ${mid + 1}. How many boxes do we open?`, mid + 1, [mid, mid + 2, n], `We open boxes 1 to ${mid + 1}: that is ${mid + 1}.`));
      x.rec(open(mid + 1), 1, `A middle case: the target is in box ${mid + 1}. That is ${mid + 1} boxes.`);
      x.rec(open(n), 1, `Worst case: the target is in box ${n}. All ${n} boxes are opened.`, null, [['Opened', n]]);
      x.rec(open(n), 3, `Also the worst case: the target is not there at all. All ${n} boxes are opened to be sure.`, null, [['Opened', n]]);
      const avg = (n + 1) / 2;
      x.rec({ ...mk(a, {}), lists: [{ label: 'Boxes opened for each position', items: a.map((_, i) => i + 1) }, { label: 'Average', items: [avg] }] }, 3, `Add up 1 + 2 + … + ${n} and divide by ${n}: the average is ${avg}, about half.`);
      x.result = { best: 1, worst: n, avg };
    },
  };

  ALGOS.spacetime = {
    name: 'Space and time',
    blurb: 'You can often trade memory for speed. Testing whether a number is prime by dividing takes many steps each time. Spend some memory once to write down all the answers in a table, and every later question takes one look.',
    facts: [['Table', 'Costs space once'], ['Each question', 'One look'], ['Without', 'Many steps every time']],
    code: ['slow way: test by dividing, every question', 'fast way: build a table of answers first', 'each question: look it up in the table', 'more memory, less time'],
    offline: off('The answer sheet', 'Paper and a pencil', '15 minutes', [
      'Pick 5 numbers up to 30. For each, test whether it is prime by dividing by 2, 3, 4, 5 and counting your divisions.',
      'Now write a list of all the primes up to 30 once (your table).',
      'Check the same 5 numbers by looking in the table. Count your looks.',
      'Which was faster for 5 questions? For 5,000?'], 'When is it not worth building the table?'),
    make() { return { qs: distinct(5, 4, 30) }; },
    run(x, { qs }) {
      const steps = (n) => { let c = 0; for (let d = 2; d * d <= n; d++) { c++; if (n % d === 0) break; } return Math.max(c, 1); };
      const isPrime = (n) => { for (let d = 2; d * d <= n; d++) if (n % d === 0) return false; return n > 1; };
      const nums = Array.from({ length: 30 }, (_, i) => i + 1);
      let slow = 0, fast = 0, asked = 0;
      const view = (q) => ({ ...rows([row('numbers 1 to 30', nums, Object.fromEntries(nums.map((v) => [v - 1, q === v ? 'cur' : table && isPrime(v) ? 'found' : ''])))]), lists: [{ label: 'Steps by dividing', items: [slow] }, { label: 'Steps by table', items: [fast] }] });
      let table = false;
      x.rec(view(0), -1, 'Five questions: is this number prime? Answer them two ways. Press play.', null, [['Dividing', 0], ['Table', 0]]);
      qs.forEach((q) => {
        const s = steps(q); slow += s;
        x.rec(view(q), 0, `Is ${q} prime? Dividing: ${s} division${s === 1 ? '' : 's'} (${isPrime(q) ? 'no divisor found: prime' : 'a divisor was found: not prime'}).`,
          asked < 2 ? (asked++, numq(`How many divisions to test whether ${q} is prime (stopping at the first divisor or when d × d is over ${q})?`, s, [s + 1, s + 2, Math.max(1, s - 1)], `We try 2, 3, … up to the square root of ${q}, stopping early if one divides it: ${s}.`)) : null, [['Dividing', slow], ['Table', fast]]);
      });
      table = true; x.rec(view(0), 1, 'Now build the table once: mark every prime up to 30 (this uses memory).', null, [['Dividing', slow], ['Table', fast]]);
      qs.forEach((q) => { fast += 1; x.rec(view(q), 2, `Is ${q} prime? Look it up: ${isPrime(q) ? 'marked, so prime' : 'not marked, so not prime'}. One look.`, null, [['Dividing', slow], ['Table', fast]]); });
      x.rec(view(0), 3, `${slow} divisions against ${fast} look-ups. For many more questions, the table wins by far.`, null, [['Dividing', slow], ['Table', fast]]);
      x.result = { qs, slow, fast, steps: qs.map(steps) };
    },
  };

  ALGOS.sqrt = {
    name: 'Sqrt decomposition',
    blurb: 'Cut a long row into blocks of about the square root of its length, and write down each block\'s total. A sum over any stretch then adds a few single numbers at the ragged ends and whole blocks in the middle, instead of every number.',
    facts: [['Blocks', 'About √n numbers each'], ['Query', 'About √n steps'], ['Update', 'Fix one block total']],
    code: ['split the row into blocks of 3; write each block\'s total', 'query(l, r):', '  add single numbers until the start of a block', '  add whole block totals while a block fits', '  add single numbers for the ragged end'],
    offline: off('Chunked sums', 'Paper with 9 numbers in three boxes of three', '10 minutes', [
      'Write 9 numbers. Draw a box round each group of 3 and write the group total beneath it.',
      'Pick a stretch such as the 2nd to the 8th number.',
      'Add the loose numbers at each end one by one, and use the written total for any full box in between.',
      'Check with a slow sum.'], 'How many additions does this use compared with adding the whole stretch?'),
    make() { const l = rnd(1, 2), r = rnd(6, 7); return { a: Array.from({ length: 9 }, () => rnd(1, 9)), l, r }; },
    run(x, { a, l, r }) {
      const B = 3, nb = a.length / B, bs = Array.from({ length: nb }, (_, b) => a.slice(b * B, b * B + B).reduce((p, q) => p + q, 0));
      let total = 0, adds = 0;
      const view = (marks, bm) => ({ ...rows([row('numbers', a, marks || {}, Object.fromEntries(a.map((_, i) => [i, i % B === 0 ? `block ${i / B + 1}` : '']))), row('block totals', bs, bm || {})]), lists: [{ label: 'Sum so far', items: [total] }] });
      x.rec(view(), -1, `Blocks of ${B}, each with its total below. Add up positions ${l + 1} to ${r + 1}. Press play.`, null, [['Additions', 0]]);
      const marks = {}, bm = {};
      let i = l, asked = 0;
      while (i <= r) {
        if (i % B === 0 && i + B - 1 <= r) {
          const b = i / B; total += bs[b]; adds++; for (let k = 0; k < B; k++) marks[i + k] = 'found'; bm[b] = 'found';
          x.rec(view({ ...marks }, { ...bm }), 3, `Positions ${i + 1} to ${i + B} are a whole block: add its total, ${bs[b]}. Sum ${total}.`, asked < 2 ? (asked++, yesno(`Positions ${i + 1} to ${i + B} are a whole block that fits inside the stretch. Use the block total?`, true, 'A full block that fits can be added in one step using its written total.')) : null, [['Additions', adds]]);
          i += B;
        } else { total += a[i]; adds++; marks[i] = 'key'; x.rec(view({ ...marks }, { ...bm }), 2, `Add the single number ${a[i]}. Sum ${total}.`, null, [['Additions', adds]]); i++; }
      }
      x.rec(view({ ...marks }, { ...bm }), 4, `The sum of positions ${l + 1} to ${r + 1} is ${total}, in ${adds} additions instead of ${r - l + 1}.`, null, [['Additions', adds]]);
      x.result = { sum: total, l, r, adds };
    },
  };

  ALGOS.mo = {
    name: "Mo's algorithm",
    blurb: 'Many questions each ask about a stretch of a row, like "how many different numbers are in this stretch?" Instead of starting afresh each time, keep a window and slide its ends. Answer the questions in a clever order, grouped by block, so the window moves as little as possible.',
    facts: [['Window', 'Slides, never restarts'], ['Order', 'By block, then right end'], ['Total moves', 'About n√q']],
    code: ['sort the questions by (block of the left end, right end)', 'for each question in that order', '  move the left end to the question\'s left, adding or removing one number at a time', '  move the right end the same way', '  the window now holds exactly the question\'s stretch: read the answer'],
    offline: off('Sliding frame', 'A strip of 9 numbers from 1 to 4, and a card with a window', '20 minutes', [
      'Write 9 numbers from 1 to 4. Make a tally of which numbers are in the window.',
      'Take 4 questions of the form "how many different numbers are between place l and place r?".',
      'Instead of re-counting each from scratch, slide the window ends from the last question to the next, adding or removing one number each step and updating the tally.',
      'Count your steps and compare with counting every stretch from scratch.'], 'Why does sorting the questions make the window move less overall?'),
    make() { const a = Array.from({ length: 9 }, () => rnd(1, 4)), qs = []; while (qs.length < 4) { const l = rnd(0, 6), r = rnd(l + 1, 8); qs.push([l, r]); } return { a, qs }; },
    run(x, { a, qs }) {
      const B = 3, order = qs.map((q, i) => i).sort((p, q) => Math.floor(qs[p][0] / B) - Math.floor(qs[q][0] / B) || qs[p][1] - qs[q][1]);
      const cnt = Array(5).fill(0); let curL = 0, curR = -1, distinct = 0, moves = 0, asked = 0; const ans = Array(qs.length).fill(null);
      const view = (hi) => ({ ...rows([row('numbers', a, Object.fromEntries(a.map((_, i) => [i, hi === i ? 'cur' : i >= curL && i <= curR ? 'key' : ''])), {}), row('tally of 1 to 4', cnt.slice(1), {})]), lists: [{ label: 'Different numbers in the window', items: [distinct] }, { label: 'Answers (in question order)', items: ans.map((v, i) => `Q${i + 1} = ${v === null ? '?' : v}`) }] });
      const add = (i) => { if (cnt[a[i]]++ === 0) distinct++; moves++; };
      const del = (i) => { if (--cnt[a[i]] === 0) distinct--; moves++; };
      x.rec(view(), -1, `Four questions: how many different numbers between two places? Sort them by block, then slide one window. Press play.`, null, [['Window moves', 0]]);
      x.rec(view(), 0, `Order to answer: ${order.map((i) => `Q${i + 1} (${qs[i][0] + 1}–${qs[i][1] + 1})`).join(', ')}.`, null, [['Window moves', 0]]);
      for (const qi of order) {
        const [l, r] = qs[qi];
        x.rec(view(), 2, `Question ${qi + 1}: positions ${l + 1} to ${r + 1}. The window is now ${curR < curL ? 'empty' : `${curL + 1} to ${curR + 1}`}.`, null, [['Window moves', moves]]);
        while (curL > l) { curL--; add(curL); x.rec(view(curL), 2, `Add place ${curL + 1} (${a[curL]}) on the left.`, null, [['Window moves', moves]]); }
        while (curR < r) { curR++; add(curR); x.rec(view(curR), 3, `Add place ${curR + 1} (${a[curR]}) on the right.`, null, [['Window moves', moves]]); }
        while (curL < l) { del(curL); x.rec(view(curL), 2, `Remove place ${curL + 1} (${a[curL]}) on the left.`, null, [['Window moves', moves]]); curL++; }
        while (curR > r) { del(curR); x.rec(view(curR), 3, `Remove place ${curR + 1} (${a[curR]}) on the right.`, null, [['Window moves', moves]]); curR--; }
        ans[qi] = distinct;
        x.rec(view(), 4, `The window is exactly ${l + 1} to ${r + 1}: ${distinct} different number${distinct === 1 ? '' : 's'}.`, asked < 2 ? (asked++, numq(`How many different numbers are in positions ${l + 1} to ${r + 1}?`, distinct, [distinct + 1, Math.max(1, distinct - 1), r - l + 1], `Count the tallies above zero in the window: ${distinct}.`)) : null, [['Window moves', moves]]);
      }
      const naive = qs.reduce((s, [l, r]) => s + (r - l + 1), 0);
      x.rec(view(), 4, `All answered in ${moves} window moves. Counting each stretch afresh would take ${naive} steps here. With thousands of questions, sliding one window in a good order wins by far.`, null, [['Window moves', moves]]);
      x.result = { ans: ans.slice(), moves, naive, qs, a };
    },
  };

  VLLab.define('techniques', ALGOS);
})();
