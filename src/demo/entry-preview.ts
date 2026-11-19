import settings from '../data/TexasGamePersonalSettings.js';
import { ProtocolRuntime } from '../net/ProtocolRuntime.js';
import { ProtocolFixtureHost } from './ProtocolFixtureHost.js';
import { mountMxGame } from '../host/mx-host.js';
import './entry-preview.css';
// Both dev and built preview start muted until the user saves a sound choice.
if (!settings.hasSavedSoundPreference) settings.soundOn = false;
const status = document.querySelector<HTMLElement>('#entry-status')!;
const pb = await new ProtocolRuntime().load();
const fixture = new ProtocolFixtureHost(pb, (message) => {
  status.textContent = message;
});
const game = mountMxGame(document.querySelector<HTMLDivElement>('#slot-a')!, {
  runtime: pb,
  timeoutMs: 500,
  layout: 'portrait',
  onState: (state) => {
    status.textContent = `${state.phase} · ${Math.round(state.progress * 100)}%`;
  },
});
document.querySelector<HTMLButtonElement>('#wire-enter')!.onclick = () => fixture.enter();
document.querySelector<HTMLButtonElement>('#wire-sync')!.onclick = () => {
  fixture.reconnect();
};
document.querySelector<HTMLButtonElement>('#wire-move')!.onclick = () => {
  const next = game.element.parentElement?.id === 'slot-a' ? 'slot-b' : 'slot-a';
  document.getElementById(next)!.append(game.element);
  status.textContent = `整个 UI DIV 已移到 ${next}`;
};
document.querySelector<HTMLButtonElement>('#wire-leave')!.onclick = () => game.leave();
// Explicitly synthetic inspection seam for the browser regression script.
(globalThis as typeof globalThis & { mxEntryPreview?: unknown }).mxEntryPreview = { game, fixture };
window.addEventListener(
  'pagehide',
  () => {
    game.destroy();
    fixture.destroy();
  },
  { once: true },
);
