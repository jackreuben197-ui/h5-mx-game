/** Cross-component animation bridge. Views receive an anchor provider, never inspect siblings. */
export class TableEffectAnchors {
  constructor(private table: HTMLElement, private seatForUser:(id:number)=>number|undefined) {}
  avatar = (userRID:number): HTMLElement|null => {
    const seat=this.seatForUser(userRID);
    return seat?this.table.querySelector<HTMLElement>(`.mx-seat[data-seat="${seat}"] .mx-avatar-fallback`):null;
  };
}
