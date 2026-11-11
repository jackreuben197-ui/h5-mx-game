import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const dir = fileURLToPath(new URL('../src/assets/', import.meta.url));
const manifest = JSON.parse(await readFile(dir + 'image-sources.json','utf8'));
const transparent = { r:0,g:0,b:0,alpha:0 };
const ids = Object.keys(manifest.cards).map(Number);
const columns=9, rows=Math.ceil(ids.length/columns), width=120, height=176;
const cards = await Promise.all(ids.map(async (id,i) => ({
 input: await sharp(dir+'raw/'+manifest.cards[id]).resize(width,height,{fit:'fill'}).png().toBuffer(),
 left:i%columns*width, top:Math.floor(i/columns)*height,
})));
await sharp({create:{width:columns*width,height:rows*height,channels:4,background:transparent}}).composite(cards).webp({lossless:true}).toFile(dir+'cards.webp');
await writeFile(dir+'atlas.json',JSON.stringify({columns,rows,ids}));
const atlasWidth=2048;
let x=0,y=0,row=0; const frames={}, layers=[];
for (const [key,file] of Object.entries(manifest.ui)) {
 let input=sharp(dir+'raw/'+file);
 if(key==='border') input=input.resize(199,199,{fit:'fill'});
 if(key==='avatarAlt') input=input.resize(199,199,{fit:'inside',withoutEnlargement:true});
 const {data,info}=await input.png().toBuffer({resolveWithObject:true});
 if(x+info.width+4>atlasWidth){x=0;y+=row+4;row=0;}
 frames[key]={x:x+2,y:y+2,width:info.width,height:info.height,source:'src/assets/raw/'+file};
 layers.push({input:data,left:x+2,top:y+2}); x+=info.width+4;row=Math.max(row,info.height);
}
const atlasHeight=y+row+4;
await sharp({create:{width:atlasWidth,height:atlasHeight,channels:4,background:transparent}}).composite(layers).webp({lossless:true}).toFile(dir+'ui.webp');
await writeFile(dir+'ui-atlas.json',JSON.stringify({width:atlasWidth,height:atlasHeight,frames},null,2));
await sharp(dir+'raw/'+manifest.desk).webp({quality:92}).toFile(dir+'desk.webp');
console.log(`Packed ${ids.length} cards + ${Object.keys(frames).length} UI sprites + desk into 3 images`);

// Optional appearance assets remain separate from the first table preload.
const cards1 = await Promise.all(ids.map(async (id,i) => ({
 input: await sharp(dir+'raw/'+manifest.cards1[id]).resize(width,height,{fit:'fill'}).png().toBuffer(),
 left:i%columns*width, top:Math.floor(i/columns)*height,
})));
await sharp({create:{width:columns*width,height:rows*height,channels:4,background:transparent}}).composite(cards1).webp({lossless:true}).toFile(dir+'cards1.webp');
await Promise.all(Object.entries(manifest.desks).map(([id,file]) => sharp(dir+'raw/'+file).webp({quality:92}).toFile(dir+'desk-style-'+id+'.webp')));

// High-DPI settings previews. Keep the CC 88:171 image ratio and fetch one atlas on opening.
const thumbWidth=264,thumbHeight=513;
const thumbs=await Promise.all(Object.entries(manifest.desks).map(async([id,file])=>({
 input:await sharp(dir+'raw/'+file).resize(thumbWidth,thumbHeight,{fit:'cover',position:'centre'}).png().toBuffer(),
 left:(Number(id)-1)%4*thumbWidth,top:Math.floor((Number(id)-1)/4)*thumbHeight,
})));
await sharp({create:{width:thumbWidth*4,height:thumbHeight*4,channels:4,background:transparent}}).composite(thumbs).webp({lossless:true}).toFile(dir+'desk-thumbs.webp');
