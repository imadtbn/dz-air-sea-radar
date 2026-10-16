# Aircraft API gateway (prepared, not deployed)

This Worker is deliberately **disabled by default** (`UPSTREAM_ALLOWED = "false"`).
Do not enable a public relay until ADSB.lol permits the production/redistribution use case.

- GET /health — no upstream request, reports feature gate
- GET /api/aircraft?lat=36.7&lon=3.1 — responds 503 until authorized
- After approval, validates latitude/longitude, quantizes in 0.25 degree cells, caps radius at 250 NM, caches responses in Cloudflare cache for 60 seconds.
- Restricts browser CORS to https://imadtbn.github.io; this is not authentication or a complete abuse defense.
- On cache miss multiple simultaneous users could still cause duplicate upstream calls. Add Durable Object coordination and per-IP limits before high traffic.
- No provider secrets or keys are stored in the repo.
- Cloudflare Cache API storage is per colo, not a guaranteed globally shared cache.
- Deploy only after licensing confirmation: `cd worker && npx wrangler deploy`.
- Then set `UPSTREAM_ALLOWED` true in Wrangler (after consent), deploy, and point `window.DZ_AIR_API` (configured in `assets/js/air-config.js`) to the actual Worker hostname.
- During disabled mode the website can retain the direct-client source for browser compatibility testing; this does **not** imply public production approval.

Inspect and comply with https://api.adsb.lol/docs and https://www.adsb.lol/terms/ before publication. Source attribution: ADSB.lol, ODbL 1.0.

## Test and deployment status — 2026-10-16

Cloudflare Worker uploaded and workers.dev route enabled: https://dz-air-sea-aircraft-api.imadtbn-prayer.workers.dev/health . Health endpoint was verified via a remote browser and returned `{ "status": "ready", "upstream_enabled": false }`. Upstream data forwarding remains **disabled pending explicit production-use permission**. Website is not configured to use this Worker yet; the live ADSB.lol browser endpoint still displays an unavailable-data error in the tested sessions. Cloudflare remote browser successfully loaded the site/map at 390×844 mobile and 1440×900 desktop viewports, but aircraft requests failed; no real aircraft markers were confirmed. A request for permitted use has been saved as a Gmail draft addressed to info@adsb.lol and has NOT been sent.

Do not claim the aircraft radar is production-ready until the provider grants permission, Worker is activated, and API payloads are verified end-to-end from mobile and desktop.


## Weather API

`GET /api/metar?icao=DAAG` (DAAG, DAOO, DABC, DABB, DAAE, DAON) retrieves a METAR JSON observation from Aviation Weather Center with a 10-minute edge cache, validated ICAO and sanitized data. Weather works even while aircraft upstream is disabled, subject to real upstream availability. Credit: Aviation Weather Center; see https://aviationweather.gov/data/api/ (100 requests/minute upstream limit).


## Two upstream sources, gated independently

- `UPSTREAM_ALLOWED=false` — ADSB.lol v2 primary; ODbL 1.0. Confirm the production application with the operator.
- `ADSBFI_ALLOWED=false` — adsb.fi OpenData v3 fallback; *personal non-commercial*; **do not enable for a public redisplay site without permission**.
- Fallback only after server timeout/429/5xx/invalid or stale responses. Do not try to bypass primary 400/401/403 errors.
- Data returned includes `source`, `attribution`, `license`, `now`, `retrievedAt` and `ac`, so UI can credit the correct data provider and adjust aircraft freshness.
- Local-per-Colo Cache API TTL 60 seconds with 0.25° geo bucketing and a provider-permission-scoped cache key.
- Neither provider is contacted while both permission flags are false.

To authorize after verifying terms, change the relevant variable in `worker/wrangler.toml` and deploy. **Do not publish a key or token in the frontend.**
