# VisuaLearn

Free visual lessons on algorithms and data structures, for children aged 8 to 14 and the
parents and teachers who learn with them. Watch, predict, then go offline.
Live at https://visualearn.org.

Design rules, in order:

1. **Free for everyone.** No accounts, ads, tracking or paywalls.
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
  math/                 + − × ÷ as four cartoons (arith.js); math/advanced/ has the sieve and Euclid
  404.html
  _headers              security headers for every response
  assets/style.css
  assets/sort.js        sorting lesson with its own player
  assets/player.js      shared player for every other lesson: play, step, scrub, Predict mode, offline card
  assets/search.js, graph.js, math.js   one lesson each
  assets/limit.js       daily screen-time limit (localStorage only)
wrangler.jsonc          Worker config
tests/                  pytest; runs the real lesson JavaScript in QuickJS
```

## Run locally

```bash
python -m http.server 8080 --directory web
# open http://localhost:8080
```

## Test

```bash
pip install -r requirements-dev.txt
pytest -q
```

## Deploy

Pushing to `main` deploys through Cloudflare Workers Builds, once the GitHub repository is
connected to the `visualearn` Worker and `visualearn.org` is added as its custom domain.

## Adding a lesson

Copy one of `web/searching/index.html`, `web/mazes/index.html` or `web/math/index.html` and
write a lesson script that calls `VLPlayer.mount(lesson)`. See the comment at the top of
`web/assets/player.js` for what a lesson provides. Each algorithm records every step as a
frame up front. A frame can carry a question `q` that Predict mode asks before showing the
next frame. Every algorithm needs an `offline` activity. Expose the recording functions on
`globalThis` and add tests to `tests/test_lessons.py`.

For sorting, add an entry to `ALGOS` in `web/assets/sort.js` (see the comments there).

## Licence

Proprietary. All rights reserved. See [LICENSE](LICENSE). The website is free to use.
