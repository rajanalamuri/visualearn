# VisuaLearn

Short lessons on how computers think, for ages 8 to 14. Watch, predict, then go offline.
Live at https://visualearn.org.

## Layout

```
web/                 static site, served by a Cloudflare Worker
  index.html         home page with the sorting visualiser
  404.html
  assets/style.css
  assets/sort.js     algorithms record every step as a frame; the player renders frames
  assets/limit.js    daily screen-time limit (localStorage only)
wrangler.jsonc       Worker config (assets only, no server code)
```

## Run locally

Any static server works:

```bash
python -m http.server 8080 --directory web
# open http://localhost:8080
```

## Deploy

Pushing to `main` deploys through Cloudflare Workers Builds.

## Adding an algorithm

In `web/assets/sort.js`, add an entry to `ALGOS` with its pseudocode lines and a
`run(x)` function. Inside `run`, mutate `x.a`, bump `x.c` (comparisons) and `x.w`
(array writes), and call `x.rec(marks, line, note, range)` after each step.
Marks map an index to one of `cmp`, `swap`, `key`, `pivot`.

## Licence

Proprietary. All rights reserved. See [LICENSE](LICENSE).
