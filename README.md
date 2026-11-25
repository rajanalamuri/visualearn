# VisuaLearn

Free visual lessons on algorithms and data structures, for children aged 8 to 14 and the
parents and teachers who learn with them. Watch, predict, then go offline.
Live at https://visualearn.org.

Design rules, in order:

1. **Free for everyone.** No child accounts, ads, tracking or paywalls. A grown-up may optionally sign in with Google (parents page) to sync the diary; children never do.
2. **Immersive, not addictive.** No streaks, points, badges, notifications or autoplay into
   the next lesson. A daily time limit covers the whole site.
3. **The screen is the shortest part.** Every algorithm ends with an activity done with
   cards, coins or paper, printable on one page.

## Layout

```
web/                    static site, served by a Cloudflare Worker (assets only)
  index.html            home: lesson library, teachers, grown-ups (time limit setting)
  sorting/              bubble, selection, insertion, merge, quick sort
  searching/            linear and binary search
  mazes/                breadth-first (queue) and depth-first (stack) search on a grid graph
  math/                 ten math cartoons (arith.js): + − × ÷, regrouping, negatives, fractions, powers, π, Fibonacci; math/advanced/ has the sieve and Euclid
  play/                 installable puzzle app: Ten, Balance, Share, Find, Line, Pile, Towers (play.js, play.css)
  structures/           arrays, hash tables, binary search trees (structures.js)
  paths/                Dijkstra's shortest path (paths.js)
  dp/                   dynamic programming: fewest coins, counting walks (dp.js)
  math/grades/          grade 1 to 10 map; progress/ is the on-device diary
  techniques/, trees/, graphs/, solve/, text/, numbers/, shapes/, big/   about 70 more lessons on the shared lab engine (assets/lab.js plus one script per page)
  parents/, privacy/    optional parent sign-in (Firebase, see below) and the privacy policy
  curriculum/           the whole DSA map: ready, next, to do (data lives in assets/catalog.js)
  manifest.webmanifest, sw.js, icons/   make /play/ installable and usable offline
  404.html
  _headers              security headers for every response
  assets/style.css
  assets/sort.js        sorting lesson with its own player
  assets/player.js      shared player for every other lesson: play, step, scrub, Predict mode, offline card
  assets/search.js, graph.js, math.js   one lesson each
  assets/lite.css, lite.js   quieter lesson pages: explanations fold away
  assets/toc.js, toc.css     floating table of contents with scroll spy: add data-toc to any long page
  assets/limit.js       daily screen-time limit (localStorage only)
wrangler.jsonc          Worker config
tests/                  pytest; runs the real lesson JavaScript in QuickJS
```

## Set up on a new computer

Needs only Git and Python 3.10+. Nothing else is required to run or test the site.

```bash
git clone https://github.com/rajanalamuri/visualearn.git
cd visualearn
pip install -r requirements-dev.txt
pytest -q
python -m http.server 8080 --directory web
```

To deploy by hand instead of through GitHub: `npx wrangler deploy` (log in to Cloudflare first).

## Run locally

```bash
python -m http.server 8080 --directory web
# open http://localhost:8080
```

## The Play app

`/play/` is a touch-first app shell: picture tiles, four short games (five puzzles each, then it
stops), no scores, streaks or timers. It installs from the browser on tablets, phones and
computers (Chrome: Install; iPad: Share, then Add to Home Screen) and opens offline.
A Play Store APK can be wrapped around the live site with PWABuilder or Bubblewrap, which need a
Google Play developer account and the Android SDK.

## Parent sign-in (optional)

`/parents/` lets a grown-up sign in with Google to sync the on-device diary. It is client-only:
Firebase Auth and Firestore load from Google on that page alone, after a grown-up check. To switch it on:

1. Create a Firebase project; enable Authentication > Google and a Firestore database.
2. Add `visualearn.org` under Authentication > Settings > Authorized domains.
3. Paste the web app config into `web/assets/firebase-config.js`.
4. Publish `firestore.rules` (Firestore > Rules).

Until the config is filled in, the page says sign-in is not switched on.

## Test

```bash
pip install -r requirements-dev.txt
pytest -q
```

## Deploy

Pushing to `main` deploys through Cloudflare Workers Builds, once the GitHub repository is
connected to the `visualearn` Worker and `visualearn.org` is added as its custom domain.

## Adding a lesson

The quickest way is the lab engine. Add an entry to `ALGOS` in one of `web/assets/{techniques,trees,graphs,solve,text,numbers,shapes,big}.js`:
`{ name, blurb, facts, code, offline, make(), run(x, input) }`. `run` records frames with `x.rec(view, line, note, question, stats)` and
sets `x.result`. Add a reference-checked test to `tests/test_lab.py`, then list the lesson in `web/assets/catalog.js` (`IDEAS` and `DSA`).
The older, hand-built way is below.

Copy one of `web/searching/index.html`, `web/mazes/index.html` or `web/math/index.html` and
write a lesson script that calls `VLPlayer.mount(lesson)`. See the comment at the top of
`web/assets/player.js` for what a lesson provides. Each algorithm records every step as a
frame up front. A frame can carry a question `q` that Predict mode asks before showing the
next frame. Every algorithm needs an `offline` activity. Expose the recording functions on
`globalThis` and add tests to `tests/test_lessons.py`.

For sorting, add an entry to `ALGOS` in `web/assets/sort.js` (see the comments there).

## Licence

Proprietary. All rights reserved. See [LICENSE](LICENSE). The website is free to use.
