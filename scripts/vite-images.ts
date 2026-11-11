import type { Plugin } from 'vite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
/** Resolve only the chosen mode's imports: production never emits the raw PNGs. */
export function imageResources(): Plugin {
  let dev = false;
  return {
    name: 'mx-image-resources',
    configResolved(config) { dev = config.command === 'serve'; },
    resolveId(id) { if (id === 'virtual:mx-images') return '\0mx-images'; },
    handleHotUpdate(ctx) {
      if (ctx.file === root + 'src/assets/image-sources.json') {
        const module = ctx.server.moduleGraph.getModuleById('\0mx-images');
        if (module) { ctx.server.moduleGraph.invalidateModule(module); return [module]; }
      }
    },
    load(id) {
      if (id !== '\0mx-images') return;
      this.addWatchFile(root + 'src/assets/image-sources.json');
      const manifest = JSON.parse(readFileSync(root + 'src/assets/image-sources.json', 'utf8'));
      const imports: string[] = [];
      const asset = (file: string) => {
        const name = `image${imports.length}`;
        imports.push(`import ${name} from ${JSON.stringify(root + 'src/assets/' + file + '?url')};`);
        return dev ? `new URL(${name}, import.meta.url).href` : name;
      };
      const desk = asset(dev ? 'raw/' + manifest.desk : 'desk.webp');
      if (!dev) {
        const cards = asset('cards.webp'), ui = asset('ui.webp'), cards1 = asset('cards1.webp'), deskThumbs = asset('desk-thumbs.webp');
        const desks = '{' + Object.keys(manifest.desks).map(id => JSON.stringify(id)+':'+asset('desk-style-'+id+'.webp')).join(',') + '}';
        return imports.join('\n') + `\nexport const resources = { mode:'atlas', desk:${desk}, cards:${cards}, ui:${ui}, cards1:${cards1}, deskThumbs:${deskThumbs}, desks:${desks}, rawCards1:{}, rawCards:{}, rawUI:{}, preload:[${desk},${cards},${ui}] };`;
      }
      const map = (files: Record<string,string>) => '{' + Object.entries(files).map(([key,file]) => `${JSON.stringify(key)}:${asset('raw/' + file)}`).join(',') + '}';
      const cards = map(manifest.cards), ui = map(manifest.ui), cards1 = map(manifest.cards1), desks = map(manifest.desks);
      return imports.join('\n') + `\nconst rawCards=${cards}, rawUI=${ui}; export const resources={mode:'raw',desk:${desk},cards:'',ui:'',rawCards,rawUI,rawCards1:${cards1},cards1:'',deskThumbs:'',desks:${desks},preload:[${desk},...Object.values(rawCards),...Object.values(rawUI)]};`;
    },
  };
}
