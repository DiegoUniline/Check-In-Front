import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const output=process.env.MOBILE_AUDIT_DIR||'/tmp/vulo-mobile-audit';
const launch={headless:true};
if(process.env.CHROMIUM_PATH){launch.executablePath=process.env.CHROMIUM_PATH;launch.args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'];}
const browser=await chromium.launch(launch);
const source=fs.readFileSync('src/App.tsx','utf8');
const routes=[...new Set([...source.matchAll(/path="([^"]+)"/g)].map(m=>m[1]).filter(r=>r!=='*').flatMap(r=>r.includes(':vista')?['/reservas/checkin','/reservas/checkout']:r.replace(':slug','demo').replace(':id',r.startsWith('/checkout')?'r2':'r1')))];
const widths=(process.env.MOBILE_WIDTHS||'320,360,375,390,414,430,768,1024,1440').split(',').map(Number);
const selected=process.env.MOBILE_ROUTES?.split(',')||routes;
const results=[];
try{
 const context=await browser.newContext({hasTouch:true,isMobile:true,viewport:{width:390,height:844},reducedMotion:'reduce'});
 await context.route('**/*',async route=>{
   const url=new URL(route.request().url());
   if(url.hostname!=='vulo.test')return route.fulfill({status:204,body:''});
   const asset=['/app.js','/app.css'].includes(url.pathname)?url.pathname.slice(1):'index.html';
   return route.fulfill({status:200,contentType:asset.endsWith('.js')?'application/javascript; charset=utf-8':asset.endsWith('.css')?'text/css; charset=utf-8':'text/html; charset=utf-8',body:fs.readFileSync(path.join(output,asset))});
 });
 const page=await context.newPage();
 let errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error')errors.push(e.text());});
 for(const route of selected){
   errors=[];
   await page.goto('https://vulo.test'+route,{waitUntil:'load'});
   await page.waitForTimeout(400);
   for(const width of widths){
     await page.setViewportSize({width,height:844});
     await page.waitForTimeout(90);
     const result=await page.evaluate(()=>{
       const clipped=[];
       for(const el of document.querySelectorAll('button,input,select,textarea,[role="tab"],h1,h2,table,section')){
         const rect=el.getBoundingClientRect();
         if(!rect.width||!rect.height||rect.top>innerHeight||rect.bottom<0)continue;
         if(rect.left>=-1&&rect.right<=innerWidth+1)continue;
         let allowed=false;
         for(let a=el.parentElement;a&&a!==document.body;a=a.parentElement){
           const style=getComputedStyle(a);
           if((['auto','scroll'].includes(style.overflowX)&&a.scrollWidth>a.clientWidth+1)||style.visibility==='hidden'||style.display==='none'||a.getAttribute('aria-hidden')==='true'){allowed=true;break;}
         }
         if(!allowed)clipped.push({tag:el.tagName,text:(el.getAttribute('aria-label')||el.textContent||'').trim().slice(0,65),left:Math.round(rect.left),right:Math.round(rect.right),class:el.className});
       }
       return {title:document.querySelector('h1')?.textContent||'',textLength:document.body.innerText.length,pageOverflow:document.documentElement.scrollWidth>innerWidth+1,clipped:clipped.slice(0,15)};
     });
     results.push({route,width,...result,errors:[...new Set(errors)]});
     if(width===390&&['/dashboard','/reservas','/catalogos','/reservas/nueva','/checkin/r1','/checkout/r2','/reportes','/configuracion','/chats'].includes(route))await page.screenshot({path:path.join(output,route.replaceAll('/','_')+'.png')});
   }
   const failures=results.filter(r=>r.route===route&&(r.clipped.length||r.errors.length||r.pageOverflow));
   console.log(route, failures.length?JSON.stringify(failures.map(f=>({w:f.width,errors:f.errors,clipped:f.clipped.map(c=>c.text)}))):'OK');
 }
}finally{await browser.close();fs.writeFileSync(path.join(output,process.env.MOBILE_RESULTS_FILE||'routes.json'),JSON.stringify(results,null,2));}

process.exitCode=results.some(r=>r.pageOverflow||r.clipped.length||r.errors.length||r.textLength<20)?1:0;
