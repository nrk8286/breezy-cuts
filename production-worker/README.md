# Breezy Cuts production Worker

This is the source-controlled recovery of the live `breezy-cuts` Worker that owns `https://breezycutz.shop`. It preserves the current D1 booking system, approval controls, scheduled marketing workflow, secret, and static asset collection.

The SEO layer sends useful route-specific HTML before JavaScript loads, keeps `/admin` and `/portal` noindexed, and returns a real noindex 404 for unknown paths. The browser application still replaces the server-delivered route summary with the interactive booking experience after loading.

Run `npm test` and `npm run dry-run` here before publishing. Use `npm run deploy:version` to create a non-serving version and `npm run deploy:production` to publish it. The deployment script uses `keep_assets` and strict inherited bindings so it does not overwrite the unrecovered static asset collection. It reads `CLOUDFLARE_API_TOKEN` or the current Wrangler OAuth session and never prints credentials.

Do not deploy this Worker with plain `wrangler deploy`; the direct version workflow is intentional because Cloudflare retains the exact production assets. The previous deployment remains available as a rollback target.
