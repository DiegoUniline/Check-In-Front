import fs from 'node:fs';
import path from 'node:path';
import {build} from 'esbuild';
const root=process.cwd(), fixture=path.join(root,'scripts/mobile/fixtures.ts');
const output=process.env.MOBILE_AUDIT_DIR||'/tmp/vulo-mobile-audit';
fs.mkdirSync(output,{recursive:true});
const provider=(name,context, value)=>`import React from 'react';import {${context}} from './${name==='AuthProvider'?'auth-context':'shift-context'}';import {${value}} from '${fixture}';export function ${name}({children}) {return <${context}.Provider value={${value}}>{children}</${context}.Provider>}`;
await build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import {BrowserRouter} from 'react-router-dom';import App from './src/App';import {ComponentFixtures} from './scripts/mobile/ComponentFixtures';import {HelmetProvider} from 'react-helmet-async';localStorage.setItem('hotel_id','h1');createRoot(document.getElementById('root')).render(<HelmetProvider><BrowserRouter>{location.pathname === "/__mobile_components" ? <ComponentFixtures/> : <App/>}</BrowserRouter></HelmetProvider>);`,resolveDir:root,loader:'tsx'},bundle:true,format:'iife',outfile:path.join(output,'app.js'),jsx:'automatic',alias:{'@':path.join(root,'src')},define:{'import.meta.env.VITE_API_URL':'""','import.meta.env.BASE_URL':'"/"','import.meta.env.DEV':'false','import.meta.env.PROD':'false','import.meta.env.MODE':'"test"','import.meta.env.VITE_SUPABASE_URL':'"https://blocked.example.test"','import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY':'"fixture"'},loader:{'.png':'dataurl','.jpg':'dataurl','.webp':'dataurl','.svg':'dataurl'},plugins:[{name:'isolated-mobile-fixtures',setup(b){
 b.onLoad({filter:/src\/contexts\/AuthContext.tsx$/},()=>({contents:provider('AuthProvider','AuthContext','auth'),loader:'tsx',resolveDir:path.join(root,'src/contexts')}));
 b.onLoad({filter:/src\/contexts\/ShiftContext.tsx$/},()=>({contents:provider('ShiftProvider','ShiftContext','shiftContext'),loader:'tsx',resolveDir:path.join(root,'src/contexts')}));
 b.onLoad({filter:/src\/integrations\/supabase\/client.ts$/},()=>({contents:`export {supabase} from '${fixture}';`,loader:'ts'}));
 b.onLoad({filter:/src\/lib\/api.ts$/},()=>{let s=fs.readFileSync(path.join(root,'src/lib/api.ts'),'utf8');s=s.slice(0,s.indexOf('const apiClient = new ApiClient();'))+`\nexport {api,api as default} from '${fixture}';`;return {contents:s,loader:'ts',resolveDir:path.join(root,'src/lib')}});
}}]});
const css=fs.readdirSync('dist/assets').find(f=>f.endsWith('.css'));
fs.copyFileSync('dist/assets/'+css,path.join(output,'app.css'));
fs.writeFileSync(path.join(output,'index.html'),'<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/app.css"></head><body><div id="root"></div><script src="/app.js"></script></body></html>');
console.log(output);
