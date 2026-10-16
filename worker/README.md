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