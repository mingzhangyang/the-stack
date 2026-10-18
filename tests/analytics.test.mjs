import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const js = ts.transpileModule(
  readFileSync(new URL('../src/utils/analytics.ts', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
).outputText;
function browser(origin) {
  const scripts = [], sent = [], bindings = [], win = { location: { origin } };
  const doc = {
    createElement() {
      return {
        dataset: {}, handlers: new Map(),
        addEventListener(name, callback) { this.handlers.set(name, callback); },
        fire(name) { this.handlers.get(name)?.(); },
      };
    },
    head: { append(s) { scripts.push(s); } },
  };
  const exports = {};
  runInNewContext(js, { exports, window: win, document: doc, Map });
  return { api: exports, scripts, sent, bindings, win,
    ready() {
      win.hubTrack = (game, event) => sent.push({ game, event });
      win.hubAnalytics = { bindPlaying: (game, read) => bindings.push({ game, read }) };
      scripts[0].fire('load');
    },
  };
}
test('production host loads the shared script once and forwards real events', () => {
  const b = browser('https://steady-hand.orangely.xyz');
  let active = false;
  b.api.initAnalytics(() => active);
  b.api.initAnalytics(() => active);
  assert.equal(b.scripts.length, 1);
  assert.equal(b.scripts[0].src, 'https://games.orangely.xyz/analytics.js');
  assert.equal(b.scripts[0].dataset.analyticsGame, 'stack');
  assert.equal(b.scripts[0].dataset.analyticsExternal, 'true');
  b.api.track('play');
  b.api.track('finish');
  assert.deepEqual(b.sent, []);
  active = true;
  assert.equal(b.win.__gamesAnalyticsPlaying.get('stack')(), true);
  b.ready();
  assert.deepEqual(b.sent, [{ game: 'stack', event: 'play' }, { game: 'stack', event: 'finish' }]);
  assert.equal(b.bindings.at(-1).read(), true);
  b.api.initAnalytics(() => false);
  assert.equal(b.win.__gamesAnalyticsPlaying.get('stack')(), false);
  assert.equal(b.scripts.length, 1);
});
test('preview hosts and localhost cannot write production analytics', () => {
  for (const origin of ['http://localhost:3000', 'http://127.0.0.1:4173',
    'https://preview.example.workers.dev', 'https://other.orangely.xyz']) {
    const b = browser(origin);
    b.api.initAnalytics(() => true);
    b.api.track('play');
    assert.equal(b.scripts.length, 0, origin);
    assert.deepEqual(b.sent, []);
  }
});
test('failed client load and invalid playback getter are nonblocking', () => {
  const b = browser('https://steady-hand.orangely.xyz');
  b.api.initAnalytics(() => { throw new Error('broken playing getter'); });
  assert.equal(b.win.__gamesAnalyticsPlaying.get('stack')(), false);
  b.api.track('play');
  b.scripts[0].fire('error');
  b.api.track('finish');
  assert.deepEqual(b.sent, []);
});
test('queued play events are bounded before shared script loads', () => {
  const b = browser('https://steady-hand.orangely.xyz');
  b.api.initAnalytics(() => true);
  for (let i = 0; i < 24; i++) b.api.track('play');
  b.ready();
  assert.equal(b.sent.length, 16);
});
