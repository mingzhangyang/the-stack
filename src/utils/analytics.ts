// Shared Analytics V2 owns event transport, anonymous opens and time sampling.
// Game-owned play/finish events are only forwarded; no parallel legacy beacons.
const GAME_ID = 'stack';
const ORIGIN = 'https://steady-hand.orangely.xyz';
const CLIENT = 'https://games.orangely.xyz/analytics.js';
export type TrackEvent = 'play' | 'finish';
type Browser = Window & {
  hubTrack?: (game: string, event: TrackEvent) => void;
  hubAnalytics?: { bindPlaying?: (game: string, check: () => boolean) => void };
  __gamesAnalyticsPlaying?: Map<string, () => boolean>;
};
let status: 'idle' | 'loading' | 'ready' | 'disabled' = 'idle';
let livePredicate: () => boolean = () => false;
const queue: TrackEvent[] = [];
function production(): boolean {
  return typeof window !== 'undefined' && window.location.origin === ORIGIN;
}
function playing(): boolean {
  try { return Boolean(livePredicate()); } catch { return false; }
}
function deliver(event: TrackEvent): void {
  try { (window as Browser).hubTrack?.(GAME_ID, event); } catch { /* optional */ }
}
export function initAnalytics(predicate: () => boolean): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  livePredicate = predicate;
  const browser = window as Browser;
  const registry = browser.__gamesAnalyticsPlaying instanceof Map
    ? browser.__gamesAnalyticsPlaying : new Map<string, () => boolean>();
  registry.set(GAME_ID, playing);
  browser.__gamesAnalyticsPlaying = registry;
  try { browser.hubAnalytics?.bindPlaying?.(GAME_ID, playing); } catch { /* optional */ }
  if (status !== 'idle') return;
  if (!production()) { status = 'disabled'; return; }
  status = 'loading';
  try {
    const script = document.createElement('script');
    script.src = CLIENT;
    script.async = true;
    script.dataset.analyticsGame = GAME_ID;
    script.dataset.analyticsExternal = 'true';
    script.addEventListener('load', () => {
      status = 'ready';
      try { browser.hubAnalytics?.bindPlaying?.(GAME_ID, playing); } catch { /* optional */ }
      for (const event of queue.splice(0)) deliver(event);
    }, { once: true });
    script.addEventListener('error', () => {
      status = 'disabled';
      queue.length = 0;
    }, { once: true });
    document.head.append(script);
  } catch {
    status = 'disabled';
    queue.length = 0;
  }
}
export function track(event: TrackEvent): void {
  if (!production()) return;
  if (status === 'ready') deliver(event);
  else if (status === 'loading' && queue.length < 16) queue.push(event);
}
