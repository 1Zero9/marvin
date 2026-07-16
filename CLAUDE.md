@AGENTS.md

# Marvin

- IMPORTANT: Bump `version` in package.json (semver: minor for features, patch for fixes) with every deploy — the footer displays it.
- Deploys happen automatically on `git push origin main` (Vercel).
- Bump the cache name in `public/sw.js` (e.g. `marvin-static-v3`) when static assets or UI change, so installed PWAs pick up the update.
