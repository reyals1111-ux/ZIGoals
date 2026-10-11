import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
/** OpenNext embeds .env files. Runtime secrets must instead come from Worker bindings. */
export function sanitizeAlphaEnv(outputDirectory) {
 const file=join(outputDirectory,'cloudflare/next-env.mjs');
 const lines=readFileSync(file,'utf8').trim().split('\n');
 const secrets=new Set();
 const modes=new Set();
 const sanitized=lines.map(line=>{
  const match=/^export const (production|development|test) = (\{.*\});$/.exec(line);
  if(!match||modes.has(match[1]))throw Error('Unexpected compiled environment format.');
  modes.add(match[1]);
  let values;try{values=JSON.parse(match[2]);}catch{throw Error('Unexpected compiled environment format.');}
  const secret=values.COINGECKO_DEMO_API_KEY;
  if(typeof secret==='string'&&secret.length)secrets.add(secret);
  delete values.COINGECKO_DEMO_API_KEY;
  return `export const ${match[1]} = ${JSON.stringify(values)};`;
 });
 if(modes.size!==3)throw Error('Unexpected compiled environment format.');
 writeFileSync(file,sanitized.join('\n')+'\n');
 const inspect=directory=>{for(const entry of readdirSync(directory,{withFileTypes:true})){
  const path=join(directory,entry.name);
  if(entry.isDirectory())inspect(path);
  else if(entry.isFile()){const bytes=readFileSync(path);for(const secret of secrets)if(bytes.includes(Buffer.from(secret)))throw Error('Runtime credential remains in an Alpha artifact; values suppressed.');}
 }};
 inspect(outputDirectory);
}
