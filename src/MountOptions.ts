import type { ClientState, RoomHost } from './core/types.js';
import type { TableComponents } from './table/TableComponents.js';
export interface MountOptions {
  host: RoomHost;
  brand?: string;
  preferences?: import('./data/TexasGamePersonalSettings.js').TexasGamePersonalSettings;
  /** Minimum foreground loading display; defaults to 0 in all modes. */
  minimumLoadingMs?: number;
  /** Defaults to auto; portrait keeps the host’s portrait-only embedding contract. */
  layout?: 'portrait' | 'auto';
  components?: TableComponents;
  /** Offline demo entry only; no synthetic controls are installed by the H5 host. */
  demoScenarios?: readonly { label: string; run: () => void }[];
  onState?: (state: ClientState) => void;
  onLeave?: () => void;
  onNavigate?: (action: 'report' | 'replay' | 'emoji' | 'effect' | 'voice' | 'camera') => void;
}
