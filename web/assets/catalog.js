/* VisuaLearn catalogue: every idea on the site, and where each sits in grades 1 to 10.
   The grade map (/math/grades/) and the progress diary (/progress/) are both drawn from this. */
(() => {
  'use strict';

  // id -> [name, link]. The id is what VLProgress.mark() records.
  const IDEAS = {
    'math:add': ['Adding', '/math/#add'],
    'math:sub': ['Taking away', '/math/#sub'],
    'math:mul': ['Times', '/math/#mul'],
    'math:div': ['Sharing', '/math/#div'],
    'math:big': ['Adding with tens', '/math/#big'],
    'math:neg': ['Below zero', '/math/#neg'],
    'math:frac': ['Fractions', '/math/#frac'],
    'math:pct': ['Percent', '/math/#pct'],
    'math:pow': ['Powers', '/math/#pow'],
    'math:sq': ['Square numbers', '/math/#sq'],
    'math:eq': ['Solve for x', '/math/#eq'],
    'math:pi': ['Circles and π', '/math/#pi'],
    'math:pyth': ['Pythagoras', '/math/#pyth'],
    'math:fib': ['Fibonacci', '/math/#fib'],
    'advanced:sieve': ['Primes', '/math/advanced/#sieve'],
    'advanced:euclid': ['Common factors', '/math/advanced/#euclid'],
    'searching:linear': ['Linear search', '/searching/#linear'],
    'searching:binary': ['Binary search', '/searching/#binary'],
    'mazes:bfs': ['Breadth-first search', '/mazes/#bfs'],
    'mazes:dfs': ['Depth-first search', '/mazes/#dfs'],
    'play:ten': ['Fill the ten', '/play/#ten'],
    'play:balance': ['Balance the scale', '/play/#balance'],
    'play:share': ['Share the cookies', '/play/#share'],
    'play:guess': ['Find the number', '/play/#guess'],
    'sorting:bubble': ['Bubble sort', '/sorting/'],
    'sorting:selection': ['Selection sort', '/sorting/'],
    'sorting:insertion': ['Insertion sort', '/sorting/'],
    'sorting:merge': ['Merge sort', '/sorting/'],
    'sorting:quick': ['Quick sort', '/sorting/'],
  };

  // Each topic is [name, idea id] when there is a cartoon for it, or [name] when it is still to come.
  const GRADES = [
    [['Adding to 20', 'math:add'], ['Taking away', 'math:sub'], ['Counting in tens'], ['Shapes']],
    [['Adding bigger numbers', 'math:big'], ['Equal groups', 'math:mul'], ['Subtracting bigger numbers'], ['Telling the time']],
    [['Times tables', 'math:mul'], ['Sharing and remainders', 'math:div'], ['Parts of a whole', 'math:frac'], ['Area and perimeter']],
    [['Equal fractions', 'math:frac'], ['Factors and primes', 'advanced:sieve'], ['Decimals'], ['Angles']],
    [['Percent', 'math:pct'], ['Common factors', 'advanced:euclid'], ['Adding fractions'], ['Volume']],
    [['Below zero', 'math:neg'], ['Powers', 'math:pow'], ['Ratios'], ['Averages']],
    [['Solve for x', 'math:eq'], ['Circles and π', 'math:pi'], ['Square numbers', 'math:sq'], ['Chance']],
    [['Pythagoras', 'math:pyth'], ['Straight-line graphs'], ['Square roots'], ['Very big and very small numbers']],
    [['Number patterns', 'math:fib'], ['Quadratics'], ['Two equations at once'], ['Similar triangles']],
    [['Growth that doubles', 'math:pow'], ['Trigonometry'], ['Parabolas'], ['Statistics']],
  ];

  // The ultimate DSA curriculum. Each track runs from easiest to hardest.
  // A topic is [name, ref, next]. ref is an idea id above, or a page path, when a lesson is ready.
  // With no ref it is still to do ("tbd"); next = true marks what gets built soon.
  const DSA = [
    ['Think like a computer', [
      ['Steps and loops'], ['Big O', '/sorting/#compare'], ['Recursion', null, true], ['Invariants'],
    ]],
    ['Search and order', [
      ['Linear search', 'searching:linear'], ['Binary search', 'searching:binary'],
      ['Bubble sort', 'sorting:bubble'], ['Selection sort', 'sorting:selection'], ['Insertion sort', 'sorting:insertion'],
      ['Merge sort', 'sorting:merge'], ['Quick sort', 'sorting:quick'], ['Heap sort'], ['Counting sort'],
    ]],
    ['Lists and lines', [
      ['Arrays', null, true], ['Linked lists'], ['Stacks', null, true], ['Queues', null, true], ['Deques'],
    ]],
    ['Trees', [
      ['Binary trees', null, true], ['Binary search trees'], ['Heaps and priority queues'], ['Tries'], ['Balanced trees'], ['Segment trees'],
    ]],
    ['Graphs', [
      ['Breadth-first search', 'mazes:bfs'], ['Depth-first search', 'mazes:dfs'],
      ['Shortest paths (Dijkstra)', null, true], ['A* search'], ['Topological sort'], ['Minimum spanning trees'], ['Union-find'], ['Network flow'],
    ]],
    ['Ways to solve it', [
      ['Divide and conquer'], ['Greedy choices'], ['Backtracking'], ['Dynamic programming', null, true], ['Bit tricks'],
    ]],
    ['Hashing and text', [
      ['Hash tables', null, true], ['Pattern matching'], ['Edit distance'], ['Compression (Huffman)'], ['Bloom filters'], ['Caches (LRU)'],
    ]],
    ['Number magic', [
      ['Primes (the sieve)', 'advanced:sieve'], ['Common factors (GCD)', 'advanced:euclid'], ['Modular arithmetic'], ['Fast powers'],
    ]],
    ['The big questions', [
      ['Randomised algorithms'], ['Easy and hard problems (P vs NP)'], ['Approximation'],
    ]],
  ];

  globalThis.VLCatalog = { IDEAS, GRADES, DSA };
  if (typeof document === 'undefined') return;

  const $ = (id) => document.getElementById(id);
  const make = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const chip = (id, cls) => { const [name, href] = IDEAS[id] || [id, '/']; const a = make('a', cls, name); a.href = href; return a; };
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* ignore */ } },
  };

  // ---- grade map ----
  const picker = $('grade-picker'), list = $('grade-topics');
  if (picker && list) {
    const met = new Set(globalThis.VLProgress ? VLProgress.everMet() : []);
    const show = (g) => {
      store.set('vl-grade', String(g));
      for (const b of picker.children) b.setAttribute('aria-pressed', String(Number(b.textContent) === g));
      list.innerHTML = '';
      for (const [name, id] of GRADES[g - 1]) {
        const li = make('li');
        if (id) {
          const a = make('a', met.has(id) ? 'topic met' : 'topic', name);
          a.href = IDEAS[id][1];
          li.appendChild(a);
        } else {
          const s = make('span', 'topic soon', name);
          s.appendChild(make('small', '', 'coming'));
          li.appendChild(s);
        }
        list.appendChild(li);
      }
    };
    for (let g = 1; g <= GRADES.length; g++) {
      const b = make('button', '', g);
      b.type = 'button';
      b.setAttribute('aria-label', `Grade ${g}`);
      b.addEventListener('click', () => show(g));
      picker.appendChild(b);
    }
    const saved = Number(store.get('vl-grade'));
    show(saved >= 1 && saved <= GRADES.length ? saved : 1);
  }

  // ---- curriculum ----
  const curEl = $('curriculum');
  if (curEl) {
    const met = new Set(globalThis.VLProgress ? VLProgress.everMet() : []);
    let ready = 0, total = 0;
    for (const [track, topics] of DSA) {
      const sec = make('section', 'track');
      const head = make('h2', '', track);
      const list = make('ul', 'topics tl');
      let here = 0;
      for (const [name, ref, next] of topics) {
        total++;
        const li = make('li');
        if (ref) {
          here++; ready++;
          const a = make('a', met.has(ref) ? 'topic met' : 'topic', name);
          a.href = ref.startsWith('/') ? ref : IDEAS[ref][1];
          li.appendChild(a);
        } else {
          const sp = make('span', next ? 'topic soon next' : 'topic soon', name);
          sp.appendChild(make('small', '', next ? 'next' : 'tbd'));
          li.appendChild(sp);
        }
        list.appendChild(li);
      }
      head.appendChild(make('span', '', `${here} of ${topics.length}`));
      sec.append(head, list);
      curEl.appendChild(sec);
    }
    $('cur-count').textContent = `${ready} of ${total} ready`;
    $('cur-fill').style.width = `${Math.round((100 * ready) / total)}%`;
  }

  // ---- progress diary ----
  const cal = $('diary-days');
  if (cal && globalThis.VLProgress) {
    const draw = () => {
      const days = VLProgress.recent(28), today = days[days.length - 1];
      cal.innerHTML = '';
      for (const d of days) {
        const cell = make('li', `day n${Math.min(3, d.ideas.length)}${d === today ? ' today' : ''}`, d.date);
        cell.title = d.ideas.length ? d.ideas.map((id) => (IDEAS[id] || [id])[0]).join(', ') : 'Nothing that day';
        cal.appendChild(cell);
      }
      const todayEl = $('diary-today');
      todayEl.innerHTML = '';
      if (today.ideas.length) for (const id of today.ideas) todayEl.appendChild(chip(id, 'topic met'));
      else todayEl.appendChild(make('span', 'quiet', 'Nothing yet today. That is fine.'));
      $('diary-min').textContent = today.sec ? `${Math.max(1, Math.round(today.sec / 60))} min on screen today` : '';
      const met = new Set(VLProgress.everMet()), all = Object.keys(IDEAS);
      $('diary-count').textContent = `${all.filter((id) => met.has(id)).length} of ${all.length}`;
      const allEl = $('diary-all');
      allEl.innerHTML = '';
      for (const id of all) allEl.appendChild(chip(id, met.has(id) ? 'topic met' : 'topic'));
    };
    $('diary-clear').addEventListener('click', () => {
      if (confirm('Clear the diary on this device?')) { VLProgress.clear(); draw(); }
    });
    draw();
  }
})();
