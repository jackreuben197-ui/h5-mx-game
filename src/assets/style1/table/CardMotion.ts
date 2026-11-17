import { MotionScope, motion, easing } from './motion.js';
import { CardView } from './components/CardView/CardView.js';
/** CC CardView.animateFlipToFront: switch texture at scaleX=0, never layer a back over a face. */
export class CardMotion {
  async flip(node: HTMLElement, value: number, scope: MotionScope): Promise<void> {
    if (value === 0 || scope.reduced()) return;
    const face = node.matches('.mx-card') ? node : node.querySelector<HTMLElement>('.mx-card');
    if (!face) return;
    const cleanup = scope.cleanup(() => CardView.paint(face, value));
    CardView.paint(face, 0);
    const half = motion.flip / 2;
    const folded = await scope.play(node,[
      {transform:'scale(1,1) rotate(0deg)'},
      {transform:'scale(0,1.05) rotate(5deg)'},
    ],{duration:half,easing:easing.in});
    if (!folded) { cleanup(); return; }
    CardView.paint(face, value);
    await scope.play(node,[
      {transform:'scale(0,1.05) rotate(5deg)',offset:0,easing:easing.out},
      {transform:'scale(1,1) rotate(0deg)',offset:.75},
      {transform:'scale(1.03,.97)',offset:.875},
      {transform:'scale(1,1)',offset:1},
    ],{duration:half+2*motion.bounce});
    cleanup();
  }
}
