# Analytics V2

The standalone game loads the anonymous `https://games.orangely.xyz/analytics.js` client asynchronously **only** on `https://steady-hand.orangely.xyz` under the registry ID `stack`. The shared client reports page loads, focused/visible activeSeconds and the subset spent playing (playingSeconds), plus forwards the original start/finish events. The existing game triggers play on first real stick touch and finish after clearing all sticks or losing the third life. Camera rotation, inactive board, and finished rounds are not playing.

No duplicated old legacy beacon, cookies, analytics SDK, new database or D1 migration. Localhost and preview never post production events; offline failures are harmless. Pending start/finish events are capped at 16 and discarded on a script failure.

Run `npm run lint && npm run test:analytics && npm run build`. Tests use a fake browser with no production network access. Deploy the separately maintained games-analytics Worker allowlists manually and verify real values using `GET /stats?v=2` before enabling complete weekly reporting.
