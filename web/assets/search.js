/* VisuaLearn searching lesson: linear search and binary search over a row of closed boxes.
   Each box hides a number. Opening a box is the only way to see it, so "boxes opened" is the cost. */
(() => {
  'use strict';

  const most = (n) => Math.floor(Math.log2(n)) + 1; // most boxes binary search can open
  const plural = (k, word) => `${k} ${word}${k === 1 ? '' : 'es'}`;

  const ALGOS = {
    linear: {
      name: 'Linear search',
      blurb: 'Open the boxes one by one, from the first to the last, until you find the number. Simple, and it works even when the boxes are in no order at all.',
      facts: [['Fewest opens', '1'], ['Most opens', 'n'], ['Needs order?', 'No']],
      code: [
        'for i = 1 … n',
        '  open box i',
        '  if it is the target: found!',
        'the target is not here',
      ],
      offline: {
        title: 'Find the ace',
        need: '10 playing cards with one ace, and a friend',
        time: '10 minutes',
        steps: [
          'Your friend shuffles the cards and lays them face down in a row.',
          'Turn over the cards one at a time, starting from the left.',
          'Make a tally mark for every card you turn. Stop when you find the ace.',
          'Swap roles and play five rounds. Write down how many cards you turned each time.',
        ],
        think: 'What is the most cards you could ever turn? What is the average? What would it be with a whole deck of 52?',
      },
      run(x) {
        const { a, n, t } = x;
        for (let i = 0; i < n; i++) {
          x.c++;
          x.open.add(i);
          if (a[i] === t) {
            x.found = i;
            x.rec({ cur: i }, 2, `Box ${i + 1} holds ${t}. Found it after opening ${plural(x.c, 'box')}.`);
            return;
          }
          x.rec({ cur: i }, 1, `Box ${i + 1} holds ${a[i]}. That's not ${t}, so keep going.`);
        }
        x.rec({}, 3, `${t} isn't in any box. We had to open all ${n} to be sure.`);
      },
    },

    binary: {
      name: 'Binary search',
      blurb: 'When the boxes are in order, open the middle one. If your number is bigger, it must be on the right; if smaller, on the left. Each box you open throws away half of what is left.',
      facts: [['Fewest opens', '1'], ['Most opens', 'log₂ n + 1'], ['Needs order?', 'Yes']],
      code: [
        'lo ← first box; hi ← last box',
        'while lo ≤ hi',
        '  open the middle box, mid',
        '  if it is the target: found!',
        '  if it is smaller: lo ← mid + 1',
        '  else: hi ← mid − 1',
        'the target is not here',
      ],
      offline: {
        title: 'Guess my number',
        need: 'Two people. Nothing else.',
        time: '10 minutes',
        steps: [
          'One person thinks of a whole number from 1 to 100 and keeps it secret.',
          'The other person guesses. The answer is only ever "higher", "lower" or "yes!".',
          'Always guess the middle of what is left. Start with 50. If the answer is "higher", the next guess is 75.',
          'Count the guesses. Then swap roles.',
        ],
        think: 'Seven guesses are always enough for 1 to 100. How many would you need for 1 to 1,000? For every person on Earth?',
      },
      run(x) {
        const { a, n, t } = x;
        let lo = 0, hi = n - 1;
        x.rec({ lo, hi }, 0, `The boxes are in order, smallest to biggest. ${t} could be in any of them.`);
        while (lo <= hi) {
          const mid = (lo + hi) >> 1;
          const v = a[mid];
          x.c++;
          x.open.add(mid);
          if (v === t) {
            x.found = mid;
            x.rec({ lo, hi, cur: mid }, 3, `The middle box holds ${t}. Found it after opening ${plural(x.c, 'box')}.`);
            return;
          }
          x.rec({ lo, hi, cur: mid }, 2, `Open the middle box, box ${mid + 1}. It holds ${v}.`, {
            text: `The middle box holds ${v}. Is ${t} to its left or to its right?`,
            options: ['Left (smaller)', 'Right (bigger)'],
            answer: v < t ? 1 : 0,
            why: v < t ? `${t} is bigger than ${v}, so it can only be on the right.` : `${t} is smaller than ${v}, so it can only be on the left.`,
          });
          if (v < t) {
            lo = mid + 1;
            x.rec({ lo, hi }, 4, `${v} is smaller than ${t}. Forget box ${mid + 1} and everything on its left.`);
          } else {
            hi = mid - 1;
            x.rec({ lo, hi }, 5, `${v} is bigger than ${t}. Forget box ${mid + 1} and everything on its right.`);
          }
        }
        x.rec({ lo, hi }, 6, `No boxes are left to check, so ${t} isn't here. We only opened ${x.c} of ${n}.`);
      },
    },
  };

  function startQuestion(key, n) {
    if (most(n) >= Math.ceil(n / 2)) return null; // too few boxes for the two answers to differ
    if (key === 'linear') {
      return {
        text: `At most, how many boxes might you have to open?`,
        options: [String(most(n)), String(n)], answer: 1,
        why: `If the number is in the last box, or not there at all, you open all ${n}.`,
      };
    }
    return {
      text: `The boxes are in order. At most, how many will binary search open?`,
      options: [String(most(n)), String(Math.ceil(n / 2))], answer: 0,
      why: `Each box you open throws away half of what's left, so ${most(n)} are always enough for ${n} boxes.`,
    };
  }

  // Runs a search and returns its frames. Exposed for testing.
  function record(key, a, t) {
    const x = {
      a, n: a.length, t, c: 0, open: new Set(), found: -1, frames: [],
      rec(m, line, note, q) {
        this.frames.push({
          open: [...this.open], cur: m.cur ?? -1, lo: m.lo ?? 0, hi: m.hi ?? this.n - 1,
          found: this.found, line, note, c: this.c, q: q || null,
        });
      },
    };
    x.rec({}, -1, `Press play to look for ${t}.`);
    x.rec({}, -1, `Find ${t}. First, a guess.`, startQuestion(key, a.length));
    ALGOS[key].run(x);
    return x.frames;
  }

  const rnd = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
  function makeBoxes(n) {
    const pool = Array.from({ length: 99 }, (_, k) => k + 1);
    for (let k = pool.length - 1; k > 0; k--) { const j = rnd(0, k); [pool[k], pool[j]] = [pool[j], pool[k]]; }
    return pool.slice(0, n).sort((p, q) => p - q);
  }
  function pickTarget(a) {
    if (Math.random() < 0.8) return a[rnd(0, a.length - 1)];
    const missing = Array.from({ length: 99 }, (_, k) => k + 1).filter((v) => !a.includes(v));
    return missing[rnd(0, missing.length - 1)];
  }

  globalThis.VLSearch = { ALGOS, record, makeBoxes, most };

  // ---------- page ----------
  if (typeof document === 'undefined') return;
  const $ = (id) => document.getElementById(id);
  const view = $('view'), size = $('size'), find = $('find'), target = $('target'), err = $('find-err');
  const input = { a: [], t: 0 };
  let boxEls = [];

  function newBoxes() {
    input.a = makeBoxes(Number(size.value));
    input.t = pickTarget(input.a);
    find.value = String(input.t);
    err.textContent = '';
  }

  const lesson = {
    algos: ALGOS,
    record: (key) => record(key, input.a, input.t),
    setup() {
      target.textContent = input.t;
      view.innerHTML = '';
      view.className = 'boxes' + (input.a.length > 31 ? ' tiny' : input.a.length > 15 ? ' small' : '');
      boxEls = input.a.map((_, k) => {
        const d = document.createElement('div');
        d.className = 'box';
        const v = document.createElement('b');
        const i = document.createElement('small');
        i.textContent = k + 1;
        d.append(v, i);
        view.appendChild(d);
        return d;
      });
    },
    render(f, key) {
      const open = new Set(f.open);
      boxEls.forEach((el, k) => {
        const isOpen = open.has(k);
        let cls = 'box';
        if (isOpen) cls += ' open';
        if (k === f.found) cls += ' found';
        else if (k === f.cur) cls += ' cur';
        else if (key === 'binary' ? (k < f.lo || k > f.hi) : isOpen) cls += ' out';
        el.className = cls;
        el.firstChild.textContent = isOpen ? input.a[k] : '?';
      });
      view.setAttribute('aria-label', `${input.a.length} boxes. Open: ${f.open.map((k) => `box ${k + 1} holds ${input.a[k]}`).join(', ') || 'none yet'}.`);
    },
    stats: (f) => [['Boxes opened', f.c]],
  };

  newBoxes();
  const player = VLPlayer.mount(lesson);

  size.addEventListener('change', () => { newBoxes(); player.restart(); });
  $('b-new').addEventListener('click', () => { newBoxes(); player.restart(); });
  $('find-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = Number(find.value);
    if (!Number.isInteger(v) || v < 1 || v > 99) { err.textContent = 'Pick a whole number from 1 to 99.'; return; }
    err.textContent = '';
    input.t = v;
    player.restart();
  });
})();
