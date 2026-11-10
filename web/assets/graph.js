/* VisuaLearn mazes lesson: breadth-first search (a queue) and depth-first search (a stack)
   finding a way from home to school on a grid. Each grid square is a node; neighbours are its edges. */
(() => {
  'use strict';

  const SHAPES = { small: [5, 7], medium: [7, 11], big: [9, 15] }; // rows, cols
  const s = (k) => (k === 1 ? '' : 's');

  function neighbours(id, rows, cols) {
    const r = Math.floor(id / cols), c = id % cols, out = [];
    // Pushed in this order, so a stack tries right first, then down: toward school.
    if (r > 0) out.push(id - cols);
    if (c > 0) out.push(id - 1);
    if (r < rows - 1) out.push(id + cols);
    if (c < cols - 1) out.push(id + 1);
    return out;
  }

  // Length of the shortest walk from home to school, or -1 if there is none.
  function shortest(maze) {
    const { rows, cols } = maze, walls = new Set(maze.walls), goal = rows * cols - 1;
    const dist = new Map([[0, 0]]), q = [0];
    while (q.length) {
      const cur = q.shift();
      if (cur === goal) return dist.get(cur);
      for (const n of neighbours(cur, rows, cols)) {
        if (!walls.has(n) && !dist.has(n)) { dist.set(n, dist.get(cur) + 1); q.push(n); }
      }
    }
    return -1;
  }

  const ALGOS = {
    bfs: {
      name: 'Breadth-first search',
      word: 'queue',
      blurb: 'Keep a queue of squares to visit, like the line at a shop. Always take the square that has waited longest. The search spreads out like ripples, so the first route it finds is the shortest.',
      facts: [['Shortest route?', 'Always'], ['Waiting line', 'Queue'], ['Work', 'O(V + E)']],
      code: [
        'queue ← [home]',
        'while the queue is not empty',
        '  square ← take from the FRONT',
        '  if square is school: stop',
        '  for each new open neighbour',
        '    mark it seen; add to BACK',
        'follow the arrows back home',
      ],
      offline: {
        title: 'Ripple map',
        need: 'Squared paper and a pencil',
        time: '15 minutes',
        steps: [
          'Draw a map on squared paper. Shade some squares as walls. Mark one square as home and one as school.',
          'Write 0 in the home square.',
          'Write 1 in every open square touching the 0. Then write 2 in every empty open square touching a 1, and so on, like ripples in a pond.',
          'Stop when you write a number in the school square. That number is the length of the shortest walk.',
          'Walk back from school, always stepping to a number one smaller, and draw the route.',
        ],
        think: 'Why can there never be a shorter walk than the number you wrote in the school square?',
      },
    },

    dfs: {
      name: 'Depth-first search',
      word: 'stack',
      blurb: 'Keep a stack of squares to visit, like a pile of plates. Always take the newest one off the top. The search dives down one path as far as it can, then backs up. It finds a route, but not always the shortest.',
      facts: [['Shortest route?', 'Not always'], ['Waiting line', 'Stack'], ['Work', 'O(V + E)']],
      code: [
        'stack ← [home]',
        'while the stack is not empty',
        '  square ← take from the TOP',
        '  if square is school: stop',
        '  for each new open neighbour',
        '    mark it seen; put on TOP',
        'follow the arrows back home',
      ],
      offline: {
        title: 'Explore and back up',
        need: 'A maze drawn on paper, and a few coins',
        time: '10 minutes',
        steps: [
          'Draw a maze, or ask someone to draw one for you. Put your finger on the start.',
          'Each time you reach a fork, put a coin on it, then take a way you have not tried.',
          'At a dead end, go back to the last coin you put down and try another way from there.',
          'When every way from a coin has been tried, pick the coin up and go back to the one before.',
          'Keep going until you reach the exit.',
        ],
        think: 'Your coins are a stack: the last one down is the first one up. Did you find the shortest way out, or just a way?',
      },
    },
  };

  // Runs a search and returns its frames. Exposed for testing.
  function record(key, maze) {
    const { rows, cols } = maze, walls = new Set(maze.walls), goal = rows * cols - 1;
    const al = ALGOS[key], word = al.word, bfs = key === 'bfs';
    const seen = new Set([0]), done = new Set(), parent = new Map(), frontier = [0], frames = [];
    let c = 0, path = [];
    const rec = (cur, line, note, q) => frames.push({
      seen: [...seen], done: [...done], frontier: frontier.slice(), cur, path: path.slice(),
      line, note, c, q: q || null,
    });

    rec(-1, -1, 'Press play to find a way from home to school.');
    rec(-1, 0, `Home goes into the ${word}. Numbers show the order squares are waiting in.`);
    let asks = 0;
    while (frontier.length) {
      let q = null;
      if (frontier.length >= 2 && asks < 3) {
        asks++;
        q = {
          text: `${frontier.length} squares are waiting. Which number comes out of the ${word} next?`,
          options: ['1', String(frontier.length)],
          answer: bfs ? 0 : 1,
          why: bfs ? 'A queue is like the line at a shop: whoever waited longest goes first.'
            : 'A stack is like a pile of plates: the last one put on top comes off first.',
        };
        rec(-1, 1, `${frontier.length} squares are waiting in the ${word}.`, q);
      }
      const n = frontier.length;
      const cur = bfs ? frontier.shift() : frontier.pop();
      c++;
      done.add(cur);
      if (cur === goal) {
        for (let k = cur; k !== undefined; k = parent.get(k)) path.unshift(k);
        rec(cur, 3, `School! The search reached it after visiting ${c} square${s(c)}.`);
        const steps = path.length - 1, best = shortest(maze);
        rec(-1, 6, bfs || steps === best
          ? `Follow the arrows back home: the route is ${steps} steps. That's the shortest there is.`
          : `Follow the arrows back home: the route is ${steps} steps. The shortest is only ${best}. Depth-first search took the first way it saw.`);
        return frames;
      }
      rec(cur, 2, bfs ? `Take the square at the front of the queue (number 1).`
        : `Take the square on top of the stack (number ${n}).`);
      const fresh = neighbours(cur, rows, cols).filter((k) => !walls.has(k) && !seen.has(k));
      if (c <= 6 || c % 5 === 0) {
        rec(cur, 4, 'Look at the squares next to it.', {
          text: `How many new squares will join the ${word}?`,
          options: ['0', '1', '2', '3'],
          answer: fresh.length,
          why: fresh.length ? `${fresh.length} square${s(fresh.length)} next to it ${fresh.length === 1 ? 'is' : 'are'} open and not seen yet.`
            : 'Every square next to it is a wall, the edge, or already seen.',
        });
      }
      for (const k of fresh) { seen.add(k); parent.set(k, cur); frontier.push(k); }
      rec(cur, 5, fresh.length ? `${fresh.length} new square${s(fresh.length)} join${fresh.length === 1 ? 's' : ''} the ${word}.`
        : 'A dead end: nothing new to add.');
    }
    rec(-1, 1, `The ${word} is empty. There's no way to school.`);
    return frames;
  }

  const rnd = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
  function makeMaze(shape) {
    const [rows, cols] = SHAPES[shape] || SHAPES.medium;
    for (let tries = 0; tries < 500; tries++) {
      const walls = [];
      for (let id = 1; id < rows * cols - 1; id++) if (Math.random() < 0.3) walls.push(id);
      const maze = { rows, cols, walls };
      if (shortest(maze) > 0) return maze;
    }
    return { rows, cols, walls: [] };
  }

  globalThis.VLGraph = { ALGOS, record, makeMaze, shortest, neighbours };

  // ---------- page ----------
  if (typeof document === 'undefined') return;
  const $ = (id) => document.getElementById(id);
  const view = $('view'), shapeSel = $('shape');
  let maze = makeMaze(shapeSel.value);
  let cellEls = [];

  const lesson = {
    algos: ALGOS,
    record: (key) => record(key, maze),
    setup() {
      view.innerHTML = '';
      view.style.setProperty('--cols', maze.cols);
      const walls = new Set(maze.walls);
      cellEls = [];
      for (let id = 0; id < maze.rows * maze.cols; id++) {
        const d = document.createElement('div');
        d.dataset.base = walls.has(id) ? 'wall' : id === 0 ? 'home' : id === maze.rows * maze.cols - 1 ? 'school' : '';
        view.appendChild(d);
        cellEls.push(d);
      }
    },
    render(f) {
      const seen = new Set(f.seen), done = new Set(f.done), path = new Set(f.path);
      const order = new Map(f.frontier.map((id, k) => [id, k + 1]));
      cellEls.forEach((el, id) => {
        const base = el.dataset.base;
        let cls = 'cell';
        if (base) cls += ' ' + base;
        if (base !== 'wall') {
          if (path.has(id)) cls += ' path';
          else if (id === f.cur) cls += ' cur';
          else if (order.has(id)) cls += ' wait';
          else if (done.has(id)) cls += ' seen';
          else if (seen.has(id)) cls += ' wait';
        }
        el.className = cls;
        el.textContent = base === 'home' ? '⌂' : base === 'school' ? '★' : order.has(id) && !path.has(id) ? order.get(id) : '';
      });
      view.setAttribute('aria-label', `Maze, ${maze.rows} by ${maze.cols}. ${f.frontier.length} squares waiting. ${f.path.length ? `Route found: ${f.path.length - 1} steps.` : ''}`);
    },
    stats: (f) => [['Visited', f.c], ['Waiting', f.frontier.length], ['Route', f.path.length ? f.path.length - 1 : '–']],
  };

  const player = VLPlayer.mount(lesson);
  const rebuild = () => { maze = makeMaze(shapeSel.value); player.restart(); };
  shapeSel.addEventListener('change', rebuild);
  $('b-new').addEventListener('click', rebuild);
})();
