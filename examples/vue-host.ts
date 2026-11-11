import { mountMxGame } from '../src/host/mx-host.js';
/** Vue onMounted: call immediately to start hidden preload.
 * Vue continues to own WS/login/navigation. Remove original CC runtime boot scripts. */
export function startMx(container: HTMLDivElement) {
  return mountMxGame(container, { layout: 'portrait' });
}
// <div ref="mxContainer" style="position:absolute;inset:0" />
// onMounted(() => { game = startMx(mxContainer.value!) })
// onBeforeUnmount(() => game?.destroy())
// Existing H5 enterTable / wsMessage calls continue through window.CocosBridge.
// To move UI: move game.element (one DIV) or move the supplied container.
