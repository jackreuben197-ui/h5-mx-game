import { LayoutProfile } from './LayoutProfile.js';
import { tableLayouts } from './TableLayoutProfile.js';
export class LayoutBalanced extends LayoutProfile {
  constructor() { super(tableLayouts.balanced,{boardWidth:50.59,separateDualPot:false}); }
}
