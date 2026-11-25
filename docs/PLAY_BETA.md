# Google Play beta: checklist

Target: closed beta live **Friday 4 December 2026**. English only.

A closed or internal test can go live in days. A public production release is slower: a new personal
developer account must first run a closed test with about 12 testers for 14 days. Plan production for
mid to late December at the earliest.

## What is already in the repo
- Installable PWA: `web/manifest.webmanifest`, `web/sw.js`, icons.
- `twa-manifest.json`: Bubblewrap settings (package `org.visualearn.app`, starts at `/play/`).
- `web/.well-known/assetlinks.json`: placeholder; needs the real fingerprint (step 5).
- Privacy policy at `/privacy/`; no third-party requests from any child-facing page.

## Steps (you, in this order)
1. **Developer account.** https://play.google.com/console, one-off fee, verify identity. Start today: verification can take days.
2. **Contact email.** Done: the privacy page lists the contact address.
3. **Build the app.** Needs Node 18+ and a JDK:
   `npm i -g @bubblewrap/cli`, then `bubblewrap init --manifest=https://visualearn.org/manifest.webmanifest`
   (accept the values in `twa-manifest.json`), then `bubblewrap build`. This makes `app-release-bundle.aab`.
   Keep `android.keystore` and its passwords safe and out of Git. Losing it means you cannot update the app.
4. **Create the app in Play Console.** Name VisuaLearn, English (United States), App, Free.
5. **Upload to Closed testing** (Testing > Closed testing > Create track), turn on Play App Signing, then copy the
   **App signing key SHA-256** (Setup > App signing) into `web/.well-known/assetlinks.json` and push.
   Check `https://visualearn.org/.well-known/assetlinks.json` returns the JSON (if it 404s, tell me; the Cloudflare
   asset config may need a tweak). Without this the app shows a browser address bar.
6. **Testers.** Add a Google Group or email list. Recruit at least 12 people now so the 14-day clock starts.
7. **Store listing** (text below), screenshots (phone, at least 2, 16:9 or 9:16, from `/play/` and a lesson), feature graphic 1024x500.
8. **Policy forms.**
   - Target audience: ages 5-8 and 9-12. This puts the app in the Families programme (extra review).
   - Ads: No. Data safety: collects no data (the optional parent sign-in is on the website, not in the app screens children use; declare it if the app links to `/parents/`).
   - Privacy policy URL: `https://visualearn.org/privacy/`.
   - Content rating questionnaire: educational, no violence, no user content.
9. **Release** to the closed track and share the opt-in link with testers.

## Store listing (draft)
**Title (30 max):** VisuaLearn: Think Puzzles
**Short (80):** Calm picture puzzles that teach children how to think. No ads, no email needed.
**Full:**
Short picture puzzles and ten-minute lessons on how computers think: searching, sorting, mazes, trees, shortest paths and more.
Children guess first, then watch it happen, then try it away from the screen with paper, cards or coins.
- No ads, no tracking, no child accounts
- No streaks, points or notifications
- Daily time limit set by a grown-up
- Read aloud with the device voice
- Works offline

## Known gaps for the beta
- Voice input (talking to the app) is deliberately not included; it would send children's audio to a speech service.
- Parent sign-in needs the Firebase config (README, "Parent sign-in").
