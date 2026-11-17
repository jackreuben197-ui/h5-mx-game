import {resources} from 'virtual:mx-images';
/** Direct URLs are reserved for native img/media/fonts and sliced/repeating backgrounds. */
export function resourceURL(path:string):string {
  const url=resources.rawImages[path]??resources.files[path];
  if(!url)throw new Error(`Resource needs a standalone URL; configure images.<name>.pack:false: ${path}`);
  return url;
}
