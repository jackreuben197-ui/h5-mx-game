import sharp from 'sharp';
import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { scanConfigs } from './asset-config.mjs';
import { packImages } from './pack-images.mjs';
import { packMedia } from './pack-media.mjs';
const styleRoot=fileURLToPath(new URL('../',import.meta.url));
/** Called only by an explicit pack command or Vite production build. */
export async function packAssets(){
  const catalog=scanConfigs(styleRoot),dir=catalog.resourceRoot,out=join(dir,'generated');
  await mkdir(out,{recursive:true});
  const images=await packImages(catalog.images,dir,out);
  const media=await packMedia(catalog.media,dir,out,{packs:catalog.packs});
  // Full-screen backgrounds and their previews stay separate from small component sprites.
  const manifest=JSON.parse(await readFile(join(dir,'image-sources.json'),'utf8'));
  await sharp(join(dir,'raw',manifest.desk)).webp({quality:92}).toFile(join(out,'desk.webp'));
  for(const [id,file] of Object.entries(manifest.desks))await sharp(join(dir,'raw',file)).webp({quality:92}).toFile(join(out,`desk-style-${id}.webp`));
  const width=264,height=513,entries=Object.entries(manifest.desks);
  const thumbs=await Promise.all(entries.map(async([id,file])=>({input:await sharp(join(dir,'raw',file)).resize(width,height,{fit:'cover',position:'centre'}).png().toBuffer(),left:(Number(id)-1)%4*width,top:Math.floor((Number(id)-1)/4)*height})));
  await sharp({create:{width:width*4,height:height*Math.ceil(entries.length/4),channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(thumbs).webp({lossless:true}).toFile(join(out,'desk-thumbs.webp'));
  console.log(`Scanned ${catalog.files.length} component configs: ${Object.keys(images.frames).length} original image paths → ${images.pages.length} atlas pages; ${Object.keys(media).length} media paths.`);
}
