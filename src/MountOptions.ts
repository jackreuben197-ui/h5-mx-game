import type { ClientState, RoomHost } from './core/types.js';
import type { TableComponents } from './table/TableComponents.js';
export interface MountOptions {
  host: RoomHost;
  /** Minimum foreground loading display; defaults to 0 in all modes. */
  minimumLoadingMs?: number;
  /** First integration uses portrait. Set auto when enabling landscape later. */
  layout?: 'portrait' | 'auto';
  components?: TableComponents;
  /** Offline demo entry only; no synthetic controls are installed by the H5 host. */
  demoScenarios?: readonly { label: string; run: () => void }[];
  onState?: (state: ClientState) => void;
  onLeave?: () => void;
  onNavigate?: (action: 'report' | 'replay' | 'emoji' | 'effect' | 'voice' | 'camera') => void;
}
