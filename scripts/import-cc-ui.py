"""Import original CC sprites into one UI atlas; preserve source manifest for review."""
from pathlib import Path
from PIL import Image
import json,sys
src=Path(sys.argv[1] if len(sys.argv)>1 else '../h5-cc-game')
out=Path(__file__).resolve().parents[1]/'src/assets'
files={
 'avatar':'textures/widget/common/default_avatar.png',
 'avatarAlt':'textures/widget/common/default_avatar_r.png',
 'border':'textures/scene/table/seat/border.png',
 'empty':'textures/scene/table/icon/table_bg_empty_seat.png',
 'info':'textures/scene/table/other/table_bg_user_info.png',
 'line':'textures/scene/table/other/table_sprite_line.png',
 'dealer':'textures/scene/table/icon/table_icon_dealer.png',
 'chip':'textures/scene/table/icon/table_icon_chips.png',
 'fold':'textures/scene/table/operation/table_bg_action_fold.png',
 'call':'textures/scene/table/operation/table_bg_action_call.png',
 'raise':'textures/scene/table/operation/table_bg_action_raise.png',
 'setting':'textures/scene/table/icon/table_icon_setting.png',
 'chat':'textures/scene/table/icon/chatbg.png',
 'pool':'textures/scene/table/other/table_bg_pool.png',
 'report':'textures/scene/table/icon/table_icon_report.png',
 'replay':'textures/scene/table/icon/table_icon_replay.png',
 'emoji':'textures/scene/table/icon/table_icon_emoji.png',
 'cert':'textures/scene/table/icon/cert.png',
 'addChips':'textures/scene/table/other/table_node_add_chip.png',
}
width=1024;x=y=row=0;entries={};images=[]
for name,path in files.items():
 im=Image.open(src/'assets'/path).convert('RGBA')
 if name=='border':im=im.resize((199,199),Image.Resampling.LANCZOS)
 if name=='avatarAlt':im.thumbnail((199,199),Image.Resampling.LANCZOS)
 if x+im.width+4>width:x=0;y+=row+4;row=0
 entries[name]={'x':x+2,'y':y+2,'width':im.width,'height':im.height,'source':'assets/'+path}
 images.append((im,x+2,y+2));x+=im.width+4;row=max(row,im.height)
height=y+row+4
atlas=Image.new('RGBA',(width,height))
for im,x,y in images:atlas.paste(im,(x,y))
atlas.save(out/'ui.webp',lossless=True)
(out/'ui-atlas.json').write_text(json.dumps({'width':width,'height':height,'frames':entries},ensure_ascii=False,indent=2))
# Full CC background, without tint/oval; original stretch semantics are kept in CSS.
Image.open(src/'assets/resources/dynamic/table/desk0.png').save(out/'desk.webp',quality=92)
print('Imported original UI sprites and full-resolution desk0.')
