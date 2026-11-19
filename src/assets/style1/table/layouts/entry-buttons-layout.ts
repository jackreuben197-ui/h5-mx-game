import infoConfig from '../components/RoomInfoView/config.json' with {type:'json'};
import seatConfig from '../components/SeatIdentityView/config.json' with {type:'json'};
import squidConfig from '../components/SquidView/config.json' with {type:'json'};
import mttConfig from '../components/MttTableStateView/config.json' with {type:'json'};

type Bounds={left:number;right:number;top:number;bottom:number};
/** Bridge measured component bounds to stage coordinates without changing their owners. */
export function entryButtonsLayout(input:{
  info:Bounds;stage:{left:number;top:number};avatarTop:number;unit:number;seatScale:number;
  join:boolean;returning:boolean;mtt:boolean;mttScale:number;obstacles:readonly Bounds[];
}):Record<string,string>{
  const {info,stage,unit}=input,gap=infoConfig.layout.entryGap;
  const n=(value:string)=>Number.parseFloat(value);
  const joinHeight=n(squidConfig.layout.css['mx-squid-join-height'])*unit;
  const returnScale=input.mtt?input.mttScale:input.seatScale;
  const returnHeight=n(input.mtt?mttConfig.layout.css['mx-mtt-cancel-height']:seatConfig.layout.css['mx-return-game-height'])*returnScale*unit;
  const width=Math.max(input.join?n(squidConfig.layout.css['mx-squid-join-width'])*unit:0,
    input.returning?n(input.mtt?mttConfig.layout.css['mx-mtt-cancel-width']:seatConfig.layout.css['mx-return-game-width'])*returnScale*unit:0);
  const height=(input.join?joinHeight:0)+(input.returning?returnHeight:0);
  const between=input.join&&input.returning?gap:0,center=(info.left+info.right)/2;
  let top=info.bottom+gap;
  for(const obstacle of [...input.obstacles].sort((a,b)=>a.top-b.top)){
    if(center+width/2>obstacle.left&&center-width/2<obstacle.right&&top<obstacle.bottom&&top+height+between>obstacle.top)top=obstacle.bottom+gap;
  }
  const available=Math.max(0,input.avatarTop-gap-top-between);
  const fit=height?Math.min(1,available/height):1;
  return {
    '--mx-entry-center-x':`${(center-stage.left)/unit}px`,
    '--mx-entry-join-top':`${(top-stage.top)/unit}px`,
    '--mx-entry-return-top':`${(top+(input.join?joinHeight*fit+between:0)-stage.top)/unit}px`,
    '--mx-entry-fit':String(fit),
    '--mx-entry-mtt-scale':String(input.mttScale),
  };
}
