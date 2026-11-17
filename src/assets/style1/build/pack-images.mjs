import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { resourcePath } from './asset-config.mjs';
export async function packImages(entries,root,out,{width=2048,maxHeight=4096}={}) {
  await mkdir(out,{recursive:true});
  const pages=[],frames={};let x=0,y=0,row=0,layers=[];
  async function flush(){
    if(!layers.length)return;
    const height=y+row+4,file=`images-${pages.length}.webp`;
    await sharp({create:{width,height,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(layers).webp({lossless:true}).toFile(join(out,file));
    pages.push({file,width,height});layers=[];x=0;y=0;row=0;
  }
  for(const [path,rule] of [...entries].sort(([a],[b])=>a.localeCompare(b))){
    if(rule.pack===false)continue;
    let input=sharp(resourcePath(root,path));
    if(rule.resize)input=input.resize(rule.resize);
    const {data,info}=await input.png().toBuffer({resolveWithObject:true});
    if(info.width+4>width||info.height+4>maxHeight)throw new Error(`Image exceeds atlas page: ${path} (${info.width}x${info.height})`);
    if(x+info.width+4>width){x=0;y+=row+4;row=0;}
    if(y+Math.max(row,info.height)+4>maxHeight)await flush();
    frames[path]={page:pages.length,x:x+2,y:y+2,width:info.width,height:info.height};
    layers.push({input:data,left:x+2,top:y+2});x+=info.width+4;row=Math.max(row,info.height);
  }
  await flush();
  const result={pages,frames};
  await writeFile(join(out,'images.json'),JSON.stringify(result,null,2)+'\n');
  return result;
}
