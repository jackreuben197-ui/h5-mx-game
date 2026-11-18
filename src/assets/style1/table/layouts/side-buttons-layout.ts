/** Viewport anchors shared by the modern portrait tables. Calibrated to the
 * existing classic layout; no current player, seat or action state is used. */
export function portraitSideButtons(width:number,viewportHeight:number,viewportBottom:number):Record<string,string> {
  const height=Math.min(viewportHeight,(viewportHeight-44)*782/738);
  const unit=width/height>.75?height/2688:width/1440;
  const designUnit=Math.min(width/440,height/782);
  const actionY=Math.min(
    height*683/782,
    viewportBottom-40*designUnit,
    Math.min(height-50,viewportBottom-2)-48.15*designUnit,
  )-73*designUnit;
  return {
    '--mx-side-add-center-y':`${actionY+19.5*width/440}px`,
    '--mx-side-watch-bottom':`${Math.max(360*unit,viewportHeight-viewportBottom)}px`,
  };
}
