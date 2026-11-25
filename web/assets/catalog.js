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
    'play:line': ['Lines (queues)', '/play/#line'],
    'play:pile': ['Piles (stacks)', '/play/#pile'],
    'play:towers': ['Towers of Hanoi', '/play/#towers'],
    'structures:array': ['Arrays', '/structures/#array'],
    'structures:hash': ['Hash tables', '/structures/#hash'],
    'structures:bst': ['Binary search trees', '/structures/#bst'],
    'paths:dijkstra': ['Shortest paths (Dijkstra)', '/paths/#dijkstra'],
    'dp:coins': ['Fewest coins (dynamic programming)', '/dp/#coins'],
    'dp:grid': ['Counting walks (dynamic programming)', '/dp/#grid'],
    'techniques:twoptr': ['Two pointers', '/techniques/#twoptr'],
    'techniques:window': ['Sliding window', '/techniques/#window'],
    'techniques:prefix': ['Prefix sums', '/techniques/#prefix'],
    'techniques:bsans': ['Binary search on the answer', '/techniques/#bsans'],
    'techniques:counting': ['Counting sort', '/techniques/#counting'],
    'techniques:radix': ['Radix sort', '/techniques/#radix'],
    'techniques:monostack': ['Monotonic stacks', '/techniques/#monostack'],
    'techniques:deque': ['Deques', '/techniques/#deque'],
    'techniques:strings': ['Strings: palindromes', '/techniques/#strings'],
    'techniques:cycle': ['Cycle detection', '/techniques/#cycle'],
    'techniques:reverse': ['Linked lists: reverse', '/techniques/#reverse'],
    'techniques:spiral': ['Matrices and grids', '/techniques/#spiral'],
    'techniques:amortised': ['Amortised cost', '/techniques/#amortised'],
    'techniques:invariants': ['Invariants', '/techniques/#invariants'],
    'techniques:loops': ['Steps and loops', '/techniques/#loops'],
    'trees:pre': ['Preorder traversal', '/trees/#pre'],
    'trees:in': ['Inorder traversal', '/trees/#in'],
    'trees:post': ['Postorder traversal', '/trees/#post'],
    'trees:level': ['Level order traversal', '/trees/#level'],
    'trees:lca': ['Lowest common ancestor', '/trees/#lca'],
    'trees:heap': ['Heaps and priority queues', '/trees/#heap'],
    'trees:heapsort': ['Heap sort', '/trees/#heapsort'],
    'trees:trie': ['Tries', '/trees/#trie'],
    'trees:avl': ['Balanced trees (AVL)', '/trees/#avl'],
    'trees:segment': ['Segment trees', '/trees/#segment'],
    'trees:fenwick': ['Fenwick trees', '/trees/#fenwick'],
    'trees:sparse': ['Sparse tables', '/trees/#sparse'],
    'graphs:picture': ['Graphs as pictures', '/graphs/#picture'],
    'graphs:components': ['Connected components', '/graphs/#components'],
    'graphs:cycle': ['Cycle detection in graphs', '/graphs/#cycle'],
    'graphs:bipartite': ['Two-colouring (bipartite)', '/graphs/#bipartite'],
    'graphs:topo': ['Topological sort', '/graphs/#topo'],
    'graphs:unionfind': ['Union-find', '/graphs/#unionfind'],
    'graphs:bellman': ['Bellman-Ford', '/graphs/#bellman'],
    'graphs:floyd': ['All-pairs shortest paths (Floyd-Warshall)', '/graphs/#floyd'],
    'graphs:kruskal': ['Minimum spanning trees', '/graphs/#kruskal'],
    'graphs:astar': ['A* search', '/graphs/#astar'],
    'graphs:flow': ['Network flow', '/graphs/#flow'],
    'graphs:matching': ['Bipartite matching', '/graphs/#matching'],
    'solve:divide': ['Divide and conquer', '/solve/#divide'],
    'solve:greedy': ['Greedy choices', '/solve/#greedy'],
    'solve:intervals': ['Interval scheduling', '/solve/#intervals'],
    'solve:backtrack': ['Backtracking', '/solve/#backtrack'],
    'solve:nqueens': ['N-Queens', '/solve/#nqueens'],
    'solve:knapsack': ['Knapsack', '/solve/#knapsack'],
    'solve:lcs': ['Longest common subsequence', '/solve/#lcs'],
    'solve:lis': ['Longest increasing subsequence', '/solve/#lis'],
    'solve:edit': ['Edit distance', '/solve/#edit'],
    'solve:popcount': ['Bit tricks: counting 1s', '/solve/#popcount'],
    'solve:xor': ['Bit tricks: XOR', '/solve/#xor'],
    'text:naive': ['Pattern matching', '/text/#naive'],
    'text:rabin': ['Rolling hash (Rabin-Karp)', '/text/#rabin'],
    'text:kmp': ['KMP (prefix table)', '/text/#kmp'],
    'text:zalgo': ['Z-algorithm', '/text/#zalgo'],
    'text:suffix': ['Suffix arrays', '/text/#suffix'],
    'text:huffman': ['Compression (Huffman)', '/text/#huffman'],
    'text:bloom': ['Bloom filters', '/text/#bloom'],
    'text:sketch': ['Count-min sketch', '/text/#sketch'],
    'text:lru': ['Caches (LRU)', '/text/#lru'],
    'text:freq': ['Counting with hashes', '/text/#freq'],
    'numbers:modular': ['Modular arithmetic', '/numbers/#modular'],
    'numbers:fastpow': ['Fast powers', '/numbers/#fastpow'],
    'numbers:pascal': ['Counting (nCr)', '/numbers/#pascal'],
    'numbers:crt': ['Chinese remainder theorem', '/numbers/#crt'],
    'big:random': ['Randomised algorithms', '/big/#random'],
    'big:nim': ['Game theory (minimax)', '/big/#nim'],
    'big:hard': ['Easy and hard problems (P vs NP)', '/big/#hard'],
    'big:approx': ['Approximation', '/big/#approx'],
    'shapes:hull': ['Convex hull', '/shapes/#hull'],
    'shapes:sweep': ['Line sweep', '/shapes/#sweep'],
    'shapes:closest': ['Closest pair of points', '/shapes/#closest'],
    'techniques:cases': ['Best, worst and average case', '/techniques/#cases'],
    'techniques:spacetime': ['Space and time', '/techniques/#spacetime'],
    'techniques:sqrt': ['Sqrt decomposition', '/techniques/#sqrt'],
    'trees:btree': ['B-trees', '/trees/#btree'],
    'trees:skiplist': ['Skip lists', '/trees/#skiplist'],
    'trees:treedp': ['Tree DP', '/trees/#treedp'],
    'graphs:scc': ['Strongly connected components', '/graphs/#scc'],
    'graphs:bridges': ['Bridges and cut points', '/graphs/#bridges'],
    'graphs:euler': ['Euler circuits', '/graphs/#euler'],
    'solve:bitmask': ['Bitmask DP', '/solve/#bitmask'],
    'solve:meet': ['Meet in the middle', '/solve/#meet'],
    'solve:sudoku': ['Sudoku', '/solve/#sudoku'],
    'text:hll': ['HyperLogLog', '/text/#hll'],
    'trees:treap': ['Treaps', '/trees/#treap'],
    'trees:hld': ['Heavy-light decomposition', '/trees/#hld'],
    'graphs:hamilton': ['Hamilton paths', '/graphs/#hamilton'],
    'techniques:mo': ['Mo’s algorithm', '/techniques/#mo'],
    'text:aho': ['Aho-Corasick', '/text/#aho'],
    'techniques:recursion': ['Recursion', '/techniques/#recursion'],
    'techniques:fibtree': ['Recursion: the call tree', '/techniques/#fibtree'],
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
      ['Steps and loops', 'techniques:loops'], ['Big O', '/sorting/#compare'], ['Best, worst and average case', 'techniques:cases'], ['Space and time', 'techniques:spacetime'], ['Recursion', 'techniques:recursion'],
      ['Invariants', 'techniques:invariants'], ['Amortised cost', 'techniques:amortised'],
    ]],
    ['Search and order', [
      ['Linear search', 'searching:linear'], ['Binary search', 'searching:binary'], ['Binary search on the answer', 'techniques:bsans'],
      ['Bubble sort', 'sorting:bubble'], ['Selection sort', 'sorting:selection'], ['Insertion sort', 'sorting:insertion'],
      ['Merge sort', 'sorting:merge'], ['Quick sort', 'sorting:quick'], ['Heap sort', 'trees:heapsort'], ['Counting sort', 'techniques:counting'], ['Radix sort', 'techniques:radix'],
    ]],
    ['Lists and lines', [
      ['Arrays', 'structures:array'], ['Strings', 'techniques:strings'], ['Two pointers', 'techniques:twoptr'], ['Sliding window', 'techniques:window'], ['Prefix sums', 'techniques:prefix'], ['Linked lists', 'techniques:reverse'],
      ['Cycle detection', 'techniques:cycle'], ['Stacks', 'play:pile'], ['Queues', 'play:line'], ['Deques', 'techniques:deque'], ['Monotonic stacks', 'techniques:monostack'], ['Matrices and grids', 'techniques:spiral'],
    ]],
    ['Trees', [
      ['Binary trees', 'structures:bst'], ['Tree traversals', 'trees:in'], ['Lowest common ancestor', 'trees:lca'], ['Binary search trees', 'structures:bst'], ['Heaps and priority queues', 'trees:heap'],
      ['Tries', 'trees:trie'], ['Balanced trees (AVL)', 'trees:avl'], ['B-trees', 'trees:btree'], ['Fenwick trees', 'trees:fenwick'], ['Segment trees', 'trees:segment'], ['Sparse tables', 'trees:sparse'],
      ['Skip lists', 'trees:skiplist'], ['Treaps', 'trees:treap'], ['Heavy-light decomposition', 'trees:hld'],
    ]],
    ['Graphs', [
      ['Graphs as pictures', 'graphs:picture'], ['Breadth-first search', 'mazes:bfs'], ['Depth-first search', 'mazes:dfs'], ['Connected components', 'graphs:components'],
      ['Cycle detection in graphs', 'graphs:cycle'], ['Two-colouring (bipartite)', 'graphs:bipartite'], ['Topological sort', 'graphs:topo'], ['Union-find', 'graphs:unionfind'],
      ['Shortest paths (Dijkstra)', 'paths:dijkstra'], ['Bellman-Ford', 'graphs:bellman'], ['All-pairs shortest paths (Floyd-Warshall)', 'graphs:floyd'], ['A* search', 'graphs:astar'],
      ['Minimum spanning trees', 'graphs:kruskal'], ['Strongly connected components', 'graphs:scc'], ['Bridges and cut points', 'graphs:bridges'], ['Euler circuits', 'graphs:euler'], ['Hamilton paths', 'graphs:hamilton'],
      ['Network flow', 'graphs:flow'], ['Bipartite matching', 'graphs:matching'],
    ]],
    ['Ways to solve it', [
      ['Divide and conquer', 'solve:divide'], ['Greedy choices', 'solve:greedy'], ['Interval scheduling', 'solve:intervals'], ['Backtracking', 'solve:backtrack'], ['N-Queens', 'solve:nqueens'], ['Sudoku', 'solve:sudoku'],
      ['Dynamic programming', 'dp:coins'], ['Knapsack', 'solve:knapsack'], ['Longest common subsequence', 'solve:lcs'], ['Longest increasing subsequence', 'solve:lis'],
      ['Grid DP', 'dp:grid'], ['Tree DP', 'trees:treedp'], ['Bitmask DP', 'solve:bitmask'], ['Bit tricks', 'solve:popcount'], ['Meet in the middle', 'solve:meet'], ['Sqrt decomposition', 'techniques:sqrt'], ['Mo’s algorithm', 'techniques:mo'],
    ]],
    ['Hashing and text', [
      ['Hash tables', 'structures:hash'], ['Collisions', 'structures:hash'], ['Counting with hashes', 'text:freq'], ['Pattern matching', 'text:naive'], ['Rolling hash (Rabin-Karp)', 'text:rabin'],
      ['KMP', 'text:kmp'], ['Z-algorithm', 'text:zalgo'], ['Edit distance', 'solve:edit'], ['Compression (Huffman)', 'text:huffman'], ['Suffix arrays', 'text:suffix'], ['Aho-Corasick', 'text:aho'],
      ['Bloom filters', 'text:bloom'], ['Count-min sketch', 'text:sketch'], ['HyperLogLog', 'text:hll'], ['Caches (LRU)', 'text:lru'],
    ]],
    ['Number magic', [
      ['Primes (the sieve)', 'advanced:sieve'], ['Common factors (GCD)', 'advanced:euclid'], ['Modular arithmetic', 'numbers:modular'], ['Fast powers', 'numbers:fastpow'],
      ['Counting (nCr)', 'numbers:pascal'], ['Chinese remainder theorem', 'numbers:crt'],
    ]],
    ['Shapes and space', [
      ['Line sweep', 'shapes:sweep'], ['Convex hull', 'shapes:hull'], ['Closest pair of points', 'shapes:closest'],
    ]],
    ['The big questions', [
      ['Randomised algorithms', 'big:random'], ['Game theory (minimax)', 'big:nim'], ['Easy and hard problems (P vs NP)', 'big:hard'], ['Approximation', 'big:approx'],
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
