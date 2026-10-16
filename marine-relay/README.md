# AIS Marine Relay (not active by default)

A single persistent Node.js WebSocket client subscribes to AISStream with a **server-side secret** and caches last-seen vessel positions for 15 minutes in memory. This avoids opening one AISStream connection per website visitor. The frontend is disabled by default, and only activates after an HTTPS URL is configured in \`assets/js/marine-config.js\`.

## Prerequisites

1. Create an AISStream account and obtain your personal API key from [AISStream](https://www.aisstream.io/documentation/). Do not commit the key, log it or put it into the browser.
2. Review and confirm permitted public redisplay/commercial use of the feed.
3. Provide a long-running Node.js 20+ HTTPS host. **GitHub Pages and a short-lived Cloudflare Worker request cannot host this persistent WebSocket service.**

## Run locally

\`\`\`sh
cd marine-relay
npm install
AISSTREAM_API_KEY="secret-goes-here" PORT=8788 npm start
\`\`\`

The process subscribes to a coastal Algeria bounding box, verifies coordinates, deduplicates vessels by MMSI, drops positions older than 15 minutes and reconnects with backoff. It serves \`/health\` and \`/api/vessels\`. The 60-second frontend refresh reads a cached **snapshot**, not raw AIS messages.

Do not expose a direct production server to the Internet without HTTPS, origin-level rate limiting, authentication of administrative operations, abuse protection, monitoring, health checks and back-pressure validation. In-memory data is lost on restart.

Once running under your HTTPS domain, configure:
\`\`\`js
window.DZ_SEA_API = "https://your-approved-relay.example/api/vessels";
\`\`\`
in \`assets/js/marine-config.js\`.

AISStream requires a server-side key and specifies **at most 3 subscribed connections**, first subscription within 3 seconds, and message compression support. The dataset is incomplete by nature and must never be used for navigation or safety.
