import { writeFile } from 'node:fs/promises';
await writeFile(
  new URL('../dist/client/mx-game.d.ts', import.meta.url),
  "export * from './types/host-entry.js';\n",
);
