import { LayoutOriginal } from './LayoutOriginal.js';
import { portraitSideButtons } from './side-buttons-layout.js';
import type { TableLayoutProfile } from './TableLayoutProfile.js';
import type { TableSnapshot } from '../../../../core/types.js';
import type { LayoutContentOptions, LayoutContent, LayoutControls } from '../../../../ui/TableLayout.js';
/** Shared geometry for the default profile-based skins. */
export class LayoutProfile extends LayoutOriginal {
  override readonly id: string;
  override get compactRoomInfo(): boolean { return !this.landscape; }
  constructor(protected readonly profile: TableLayoutProfile, private readonly metrics: {
    boardWidth: number; separateDualPot: boolean;
  }) { super(); this.id=profile.id; }
  override positions(state: TableSnapshot, publicCardScale=1) {
    const result=super.positions(state);
    if(this.landscape)return result;
    const profile=this.profile;

      const unit=Math.min(this.width/profile.width,this.height/profile.height);
      const height=this.height;
      for(const [id,p] of result){
        const slot=(id-(state.mySeat||1)+state.seatCount)%state.seatCount;
        const [x,y]=profile.anchors[state.seatCount]![slot]!;
        const mine=id===state.mySeat;
        const player=state.players.find(player=>player.seat===id);
        const face=mine||player?.cards.some(card=>card>0);
        const local=199/profile.avatar;
        p.x=Math.max(34*unit,Math.min(this.width-34*unit,x/profile.width*this.width));
        p.y=y/profile.height*height;
        if(profile.id==='classic'&&slot===0){
          const bottomInset=mine?40:56;
          p.y=Math.min(p.y,this.viewportBottom/this.unit-bottomInset*unit);
        }
        p.scale=profile.avatar*unit/199;
        // Reserve space for the settlement popup and dealer above navigation, then anchor every
        // child to this adjusted avatar. Design distances scale with the existing seat unit.
        if(mine){
          const menuTop=(this.viewportBottom-2)/this.unit;
          const groupBottom=Math.max(profile.heroInfoY*local+76,profile.heroDealer[1]*local+38.5)*p.scale;
          p.y=profile.id==='balanced'
            ? menuTop-groupBottom
            : Math.min(p.y,Math.min(height-50/this.unit,menuTop)-groupBottom);
        }
        p.edge=x<220?'left':x>220?'right':slot===0?'bottom':'top';
        p.cardsX=face?0:14*local;
        p.cardsY=(mine?profile.heroCardsY:face?0:14)*local;
        p.cardScale=mine?profile.heroCardWidth*local/120:face?58*local/(390-270/Math.max(2,player?.cards.length??2)):18*local/65;
        p.handSpread=mine?profile.heroHandSpread:270;
        if(profile.backHandSpread!==undefined&&!mine){
          p.backHandSpread=profile.backHandSpread;
          if(!face){
            const avatarEdge=profile.avatar*local/2;
            p.cardsX=avatarEdge;
            p.cardsY=avatarEdge;
          }
        }
        if(!mine&&!face&&profile.id!=='balanced'){
          p.backHandSpread=56;
          const count=Math.max(2,player?.cards.length??2);
          const backWidth=(65+(count-1)*56/count)*18/65;
          p.cardsX=(profile.id==='classic'?backWidth-profile.avatar/2+2:x<220?profile.avatar/2:-profile.avatar/2)*local;
          p.cardsY=profile.avatar/2*local;
          // cardsX anchors the strip's right edge, so include its width on the right side.
          if(profile.id==='oval'&&x>220)p.cardsX+=backWidth*local;
        }
        // Both top seats bet below their own stack, rather than towards each other.
        const topSeat=!mine && x>30 && x<410;
        p.betX=(mine?(profile.id==='classic'?(state.actions?.length?-56:0):68):topSeat?0:x<220?56:x>220?-56:0)*local;
        p.betY=(mine?(profile.id==='classic'?-120:6):topSeat?60:profile.id==='classic'?40:0)*local;
        // Keep bets in the avatar coordinate system, outside either board's occupied band.
        const revealedCards=Math.max(state.community?.length??0,state.secondCommunity?.length??0);
        if(!mine&&revealedCards){
          const dual=!!state.secondCommunity?.length;
          const cardWidth=this.metrics.boardWidth*unit*publicCardScale;
          const cardHeight=cardWidth*71.02/50.59;
          const center=profile.boardY/profile.height*height;
          const gap=profile.id==='classic'?176/120*cardWidth+.01*unit:cardHeight+10*unit;
          const halfWidth=cardWidth*(profile.id==='classic'?5:revealedCards)/2;
          const top=center-cardHeight/2-(dual?gap/2:0),bottom=center+cardHeight/2+(dual?gap/2:0);
          const bx=p.x+p.betX*p.scale,by=p.y+p.betY*p.scale,halfBet=35*p.scale;
          if(bx+120*p.scale>this.width/2-halfWidth&&bx-120*p.scale<this.width/2+halfWidth&&by+halfBet>top-6*unit&&by-halfBet<bottom+6*unit){
            const above=top-halfBet-6*unit,below=bottom+halfBet+6*unit;
            p.betY=((Math.abs(by-above)<Math.abs(by-below)?above:below)-p.y)/p.scale;
          }
        }
        p.dealerX=(mine?profile.heroDealer[0]:profile.id==='classic'?profile.otherDealerX:(x<220?1:-1)*profile.otherDealerX)*local;
        p.dealerY=(mine?profile.heroDealer[1]:profile.otherDealerY)*local;
      }
      this.origin={x:this.width/2,y:profile.boardY/profile.height*height};
    return result;
  }
  override content(options: LayoutContentOptions): LayoutContent {
    if(this.landscape)return super.content(options);
    const {dual,boardSize}=options, l=this, profile=this.profile, m=this.metrics;
    const u=Math.min(l.width/440,l.height/782);
    const scale=m.boardWidth/120*u*boardSize;
    const y=profile.boardY/782*l.height, gap=profile.id==='classic'?88*scale:(71.02/50.59*120)*scale+10*u;
    const infoY=Math.max(profile.infoY/782*l.height,dual?y+gap/2+88*scale+75:0);
    const potY=dual&&m.separateDualPot?Math.max(profile.potY/782*l.height,infoY+100):profile.potY/782*l.height;
    return {
      board:{x:l.width/2,y:y-(dual?gap/2:0),scale}, secondBoard:{x:l.width/2,y:y+gap/2,scale},
      total:{x:l.width/2,y:potY},pool:{x:l.width/2,y:potY+22*u},info:{x:l.width/2,y:infoY},
      styles:{...portraitSideButtons(l.width*l.unit,this.viewportHeight,this.viewportBottom),'--mx-layout-unit':`${u}px`,'--mx-profile-avatar':String(profile.avatar),'--mx-jackpot-y':`${(profile.id==='classic'?18:58)*u}px`,'--mx-calltime-y':`${(profile.id==='classic'?48:95)*u}px`,'--mx-felt-bottom':`${208*u*l.unit}px`,
        '--mx-hero-card-height':`${120*profile.heroCardHeight/profile.heroCardWidth}px`,
        '--mx-ring-hand-type-y':`${(profile.heroCardsY+profile.heroCardHeight/2+12)*199/profile.avatar}px`,
        '--mx-hero-info-y':`${profile.heroInfoY*199/profile.avatar}px`},
    };
  }
  override controls(state: TableSnapshot, buttonSize: number): LayoutControls {
    if(this.landscape||!state.mySeat)return super.controls(state,buttonSize);
    const own=this.positions(state).get(state.mySeat);
    if(!own)return super.controls(state,buttonSize);
    const u=Math.min(this.width/440,this.height/782)*this.unit,profile=this.profile;
    const rowY=(own.controlsY??own.y)*this.unit+profile.heroOperationY*u;
    let upperY=profile.heroRaiseLift*u;
    const styles:Record<string,string>={};
    if(profile.id==='classic'){
      const handTop=(own.y+own.cardsY*own.scale)*this.unit-35.5*u;
      upperY=Math.max(65*u,rowY-handTop+(6+41.25*buttonSize/2)*u);
      styles['--mx-quick-lift']=`${upperY-65*u}px`;
    }else if(profile.id==='balanced'||profile.id==='oval'){
      styles['--mx-quick-lift']=`${16*u}px`;
    }
    return {scale:41.25/137*u*buttonSize,styles:{...styles,
      left:`calc(${own.x*this.unit}px - 35%)`,right:`calc(65% - ${own.x*this.unit}px)`,
      top:`${rowY-28}px`,'--mx-operation-row-y':`${rowY-28}px`,
      '--mx-raise-center-y':`${Math.max(160*u,rowY-180*u)}px`,
      '--mx-op-upper-y':`${upperY}px`,'--mx-op-fold-x':`${-103*u}px`,'--mx-op-main-x':`${103*u}px`,
    }};
  }
}
