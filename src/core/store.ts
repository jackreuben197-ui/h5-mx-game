import type { TableSnapshot, TableUpdate } from './types.js';
/** Full snapshots replace state; patches cannot cross a hand boundary. */
export function applyUpdate(state: TableSnapshot, event: TableUpdate): TableSnapshot {
  if (event.type === 'closed') return state;
  const next = event.type === 'snapshot' ? event.snapshot : event;
  if (
    next.roomID !== state.roomID ||
    next.matchID !== state.matchID ||
    next.revision <= state.revision ||
    next.handNum < state.handNum
  )
    return state;
  if (event.type === 'snapshot')
    return { ...event.snapshot, presentation: event.snapshot.presentation ?? 'sync' };
  if (event.handNum !== state.handNum) return state;
  return {
    ...state,
    ...event.changes,
    revision: event.revision,
    presentation: event.presentation ?? 'live',
  };
}
