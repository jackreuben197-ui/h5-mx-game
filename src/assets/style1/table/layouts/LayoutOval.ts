import { LayoutProfile } from './LayoutProfile.js';
import { tableLayouts } from './TableLayoutProfile.js';
export class LayoutOval extends LayoutProfile {
  constructor() { super(tableLayouts.oval,{boardWidth:50.59,separateDualPot:false}); }
}
