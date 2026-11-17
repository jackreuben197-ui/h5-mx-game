import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
export function componentStyles(styleRoot){
  const directory=join(styleRoot,'table/components'),declarations=[],files=[];
  for(const entry of readdirSync(directory,{withFileTypes:true}).filter(e=>e.isDirectory()).sort((a,b)=>a.name.localeCompare(b.name))){
    const file=join(directory,entry.name,'config.json'),config=JSON.parse(readFileSync(file,'utf8'));files.push(file);
    for(const [key,value] of Object.entries(config.layout?.css??{})){
      const scalar=typeof value==='string'&&value.startsWith('$')?config[value.slice(1)]:value;
      if(!/^-?(?:\d*\.\d+|\d+)(?:px|%|cqw|cqh|vw|vh|dvh|rem|em|fr|deg)?$/.test(String(scalar)))throw new Error(`Invalid component layout token: ${entry.name}.${key}`);
      declarations.push(`--mx-${entry.name}-${key}:${scalar}`);
    }
  }
  return {files,css:`.mx-game{${declarations.join(';')}}`};
}
