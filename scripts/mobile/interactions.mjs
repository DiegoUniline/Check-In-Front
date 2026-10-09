import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const output = process.env.MOBILE_AUDIT_DIR || '/tmp/vulo-mobile-audit';
const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? {executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']} : {}) });
const context = await browser.newContext({ viewport: {width:320,height:844}, hasTouch:true, isMobile:true, reducedMotion:'reduce' });
await context.route('**/*', route => {
  const url = new URL(route.request().url());
  if (url.hostname !== 'vulo.test') return route.fulfill({status:204,body:''});
  const asset = ['/app.js','/app.css'].includes(url.pathname) ? url.pathname.slice(1) : 'index.html';
  return route.fulfill({status:200,contentType:asset.endsWith('.js')?'application/javascript; charset=utf-8':asset.endsWith('.css')?'text/css; charset=utf-8':'text/html; charset=utf-8',body:fs.readFileSync(path.join(output,asset))});
});
const page = await context.newPage();
page.setDefaultTimeout(7000);
let errors=[];
page.on('pageerror', e => errors.push(e.message));
const results=[];
async function test(name, fn) {
  if(process.env.MOBILE_CASES && !new RegExp(process.env.MOBILE_CASES,'i').test(name))return;
  errors=[];
  try { await fn(); assert.deepEqual(errors,[]); results.push({name,status:'passed'}); }
  catch(e) {results.push({name,status:'failed',error:e.message,errors});await page.screenshot({path:path.join(output,`failure-${results.length}.png`)}).catch(()=>{});}
  console.log(JSON.stringify(results.at(-1)));
  fs.writeFileSync(path.join(output,process.env.MOBILE_RESULTS_FILE||'interactions.json'), JSON.stringify(results,null,2));
}
async function go(route) {await page.goto('https://vulo.test'+route); await page.waitForTimeout(250);}
async function fits(locator=page.locator('body')) {
  await page.waitForTimeout(600);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
  assert.equal(overflow,false,'Page must not scroll horizontally');
  const elements=await locator.locator('input:not([type=hidden]),textarea,[role=combobox],[role=tab],button').evaluateAll(els=>els.flatMap(el=>{
    const r=el.getBoundingClientRect();
    if(!r.width||!r.height)return [];
    for(let a=el.parentElement;a&&a!==document.body;a=a.parentElement){if(['auto','scroll'].includes(getComputedStyle(a).overflowX)&&a.scrollWidth>a.clientWidth+1)return [];}
    return r.left < -1 || r.right>innerWidth+1 ? [el.textContent?.trim().slice(0,70)||el.getAttribute('aria-label')||el.outerHTML.slice(0,90)] : [];
  }));
  assert.deepEqual(elements,[],'Controls outside viewport');
}
async function inspectDialog() {
  const d=page.locator('[role=dialog]:visible').last();
  await d.waitFor();
  await fits(d);
  const r=await d.boundingBox();assert(r.x>=0&&r.x+r.width<=321&&r.y>=0&&r.y+r.height<=845,'Dialog fits viewport: '+JSON.stringify(r));
  const controls=d.locator('input:visible,textarea:visible,[role=combobox]:visible');
  for(let i=0;i<await controls.count();i++)await controls.nth(i).scrollIntoViewIfNeeded();
  const close=d.getByRole('button',{name:/^Cerrar$/}).last();
  await close.scrollIntoViewIfNeeded();await close.tap();
  await d.waitFor({state:'hidden'});
}
try {
 for (const [route,button] of [
  ['/clientes','Nuevo cliente'],['/habitaciones','Nueva habitación'],['/productos','Nuevo Producto'],['/usuarios','Nuevo Usuario'],['/temporadas','Nueva temporada'],['/proveedores','Nuevo proveedor'],['/gastos','Registrar gasto'],['/mantenimiento','Nuevo ticket'],['/inventario','Ajustar'],
 ]) await test(`${route}: abrir, recorrer campos y cerrar`,async()=>{await go(route);await page.getByRole('button',{name:button,exact:true}).first().tap();await inspectDialog();});
 for(const route of ['/catalogos','/configuracion','/reportes','/inventario']) await test(`${route}: todas las pestañas`,async()=>{
   await go(route);const names=await page.getByRole('tab').allTextContents();assert(names.length>0,'No tabs rendered');
   for(const name of names){const tab=page.getByRole('tab',{name:name.trim(),exact:true}).first();await tab.tap();await page.waitForTimeout(150);await fits();}
 });
 await test('Proveedor: error conserva datos y permite guardar otra vez',async()=>{
   await go('/proveedores');await page.getByRole('button',{name:'Nuevo proveedor',exact:true}).tap();
   const input=page.getByPlaceholder('Razón social o nombre comercial');await input.fill('Proveedor móvil de prueba');
   await page.evaluate(()=>{window.__failMobileWrites=true;});
   await page.getByRole('button',{name:'Crear proveedor',exact:true}).tap();await page.waitForTimeout(200);
   assert.equal(await input.inputValue(),'Proveedor móvil de prueba');assert.equal(await page.locator('[role=dialog]:visible').count(),1);
   assert(await page.evaluate(()=>window.__mobileCalls.some(c=>c.method==='createProveedor')),'Save reached API fixture');
   await page.evaluate(()=>{window.__failMobileWrites=false;});await page.getByRole('button',{name:'Crear proveedor',exact:true}).tap();
   await page.locator('[role=dialog]').waitFor({state:'hidden'});
 });
 await test('Reservación: calendario táctil, mes siguiente y selección de fecha',async()=>{
   await go('/reservas/nueva');const before=await page.locator('[data-reservation-focus=checkin]').innerText();await page.locator('[data-reservation-focus=checkin]').tap();
   const calendar=page.locator('[data-ui=calendar]:visible');await calendar.waitFor();await fits(calendar);
   await calendar.locator('.vulo-calendar-nav').last().tap();
   await calendar.locator('.vulo-calendar-day:not([disabled])').nth(10).tap();
   assert.notEqual(await page.locator('[data-reservation-focus=checkin]').innerText(),before);await page.keyboard.press('Escape');await fits();
 });
 await test('Calendario: tocar reserva abre acciones y expediente',async()=>{
   await go('/reservas');await page.getByRole('button',{name:'Calendario',exact:true}).tap();const bar=page.getByRole('button',{name:/^Reserva María/}).first();await bar.scrollIntoViewIfNeeded();await bar.tap();
   const view=page.getByRole('button',{name:'Ver expediente',exact:true});await view.waitFor();await fits(page.locator('[data-ui=popover]:visible'));
   await view.tap();await page.waitForTimeout(250);assert((await page.locator('body').innerText()).includes('PRUEBA-001'));
 });
 await test('Calendario: tocar habitación disponible prepara reservación',async()=>{
   await go('/reservas');await page.getByRole('button',{name:'Calendario',exact:true}).tap();const cell=page.getByRole('button',{name:/Reservar habitación 103/}).first();await cell.scrollIntoViewIfNeeded();await cell.tap();
   await page.waitForURL('**/reservas/nueva*');await fits();
 });
 await test('Chats: conversación, ficha de contacto y regreso',async()=>{
   await go('/chats');await page.getByRole('button',{name:/María Fernanda.*Consulta de prueba/}).tap();await fits();
   await page.getByRole('button',{name:/contacto/i}).tap();await fits(page.locator('[role=dialog]:visible'));
   await page.locator('[role=dialog]').getByRole('button',{name:'Cerrar',exact:true}).last().tap();
   await page.getByRole('button',{name:/Volver a conversaciones/}).tap();await page.getByText('Consulta de prueba').waitFor();
 });
 await test('Compras: abrir captura y regresar',async()=>{await go('/compras');await page.getByRole('button',{name:'Nueva orden',exact:true}).tap();await fits();await page.getByRole('button',{name:'Volver a órdenes'}).tap();});
 await test('Turnos: abrir cierre y recorrer formulario',async()=>{await go('/turnos');await page.getByRole('button',{name:'Revisar y cerrar turno'}).tap();await fits();await page.getByLabel('Efectivo contado en caja').fill('1000');await page.getByLabel('Pendientes del siguiente turno').fill('Seguimiento de prueba');await fits();await page.getByRole('button',{name:'Volver al turno'}).tap();});
 await test('Check-in y check-out: campos y acciones accesibles',async()=>{for(const route of ['/checkin/r1','/checkout/r2']){await go(route);await fits();const last=page.locator('main').getByRole('button').last();await last.scrollIntoViewIfNeeded();await fits();}});


 await test('Catálogos: formularios de las seis pestañas',async()=>{
   await go('/catalogos');
   for(const [tab,button] of [['Tipos de Habitación','Nuevo Tipo'],['Categorías Productos','Nueva Categoría'],['Entregables','Nuevo Entregable'],['Métodos de Pago','Nuevo Método'],['Descuentos','Nuevo descuento'],['Servicios extras','Nuevo servicio']]) {
     await page.getByRole('tab',{name:tab,exact:true}).tap();await page.getByRole('button',{name:button,exact:true}).tap();await inspectDialog();
   }
 });
 await test('Administración: cliente y plan en ventanas desplazables',async()=>{
   await go('/admin-plataforma');
   for(const name of ['Nuevo Cliente','Nuevo Plan']) {
     if(name==='Nuevo Plan')await page.getByRole('tab',{name:/Planes/}).tap();
     await page.getByRole('button',{name,exact:true}).tap();const d=page.locator('.vulo-modal-backdrop');await fits(d);
     const fields=d.locator('input:visible');await fields.last().scrollIntoViewIfNeeded();await d.getByRole('button',{name:'Cerrar',exact:true}).tap();await d.waitFor({state:'hidden'});
   }
 });
 const operations=[...fs.readFileSync('src/components/reservas/StayOperationsPanel.tsx','utf8').matchAll(/id: '([^']+)', label: '([^']+)'/g)].map(m=>({id:m[1],label:m[2]}));
 for(const op of operations) await test(`Estancia: ${op.label}, abrir y recorrer`,async()=>{
   const id=['early_checkin','no_show'].includes(op.id)?'r1':op.id==='reopen_checkout'?'r3':'r2';
   await go(`/reservas/detalle/${id}?operation=${op.id}`);
   if(op.id==='move_to_account') {await page.getByRole('button',{name:'Más operaciones',exact:true}).last().tap();await page.getByRole('button',{name:/^Mover entre subcuentas/}).tap();}
   await inspectDialog();
 });
 await test('Navegación: menú lateral, usuario y asistente',async()=>{
   await go('/dashboard');await page.getByRole('button',{name:'Menú de usuario'}).tap();await fits(page.locator('[role=menu]:visible'));await page.keyboard.press('Escape');
   await page.getByRole('button',{name:'Toggle Sidebar'}).tap();await fits(page.locator('[role=dialog]:visible'));await page.keyboard.press('Escape');
   await page.getByRole('button',{name:'Abrir asistente VULO'}).tap();await fits(page.locator('[role=dialog]:visible'));await page.keyboard.press('Escape');
 });
 await test('Tabla: desplazamiento horizontal táctil',async()=>{
   await go('/productos');const table=page.locator('[data-table-scroll]').first();await table.scrollIntoViewIfNeeded();
   const r=await table.boundingBox();const cdp=await context.newCDPSession(page);
   const y=Math.min(650,r.y+70);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:280,y}]});
   for(const x of [250,220,190,160,130,100])await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(200);
   assert(await table.evaluate(el=>el.scrollLeft)>0,'Table responds to swipe');await fits();
 });
 await test('Calendario: desplazar fechas mediante gesto táctil',async()=>{
   await go('/reservas');await page.getByRole('button',{name:'Calendario',exact:true}).tap();
   const scroller=page.locator('[data-timeline-scroll]');await scroller.scrollIntoViewIfNeeded();
   const before=await scroller.evaluate(el=>el.scrollLeft);const r=await scroller.boundingBox();const y=r.y+90;
   const cdp=await context.newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:285,y}]});
   for(const x of [265,245,225,205,185,165])await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(200);
   assert(await scroller.evaluate(el=>el.scrollLeft)>before,'Calendar responds to swipe');await fits();
 });
 await test('Firma: conservar trazo al cambiar ancho y borrar',async()=>{
   await go('/__mobile_components');const canvas=page.locator('canvas');const r=await canvas.boundingBox();
   const cdp=await context.newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+30,y:r.y+50}]});
   for(let i=0;i<6;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:r.x+40+i*20,y:r.y+50+(i%2)*20}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   assert.equal(await page.locator('[data-signature]').innerText(),'capturada');await page.setViewportSize({width:390,height:500});await page.waitForTimeout(600);
   assert(await canvas.evaluate(el=>el.getContext('2d').getImageData(0,0,el.width,el.height).data.some((v,i)=>i%4===3&&v>0)),'Signature survives resize');
   await page.getByRole('button',{name:'Borrar'}).tap();await page.waitForFunction(()=>document.querySelector('[data-signature]')?.textContent==='vacía');await page.setViewportSize({width:320,height:844});
 });
 await test('Fotos: reordenar con botones táctiles',async()=>{
   await go('/__mobile_components');const before=await page.getByRole('img',{name:'Foto 1',exact:true}).getAttribute('src');
   await page.getByRole('button',{name:'Mover foto 1 después',exact:true}).tap();
   assert.equal(await page.getByRole('img',{name:'Foto 2',exact:true}).getAttribute('src'),before);await fits();
 });
 await test('Formulario con viewport reducido conserva captura',async()=>{
   await go('/proveedores');await page.getByRole('button',{name:'Nuevo proveedor',exact:true}).tap();const input=page.getByPlaceholder('Razón social o nombre comercial');await input.fill('Captura conservada');
   await page.setViewportSize({width:320,height:400});await fits(page.locator('[role=dialog]:visible'));const r=await page.locator('[role=dialog]').boundingBox();assert(r.y+r.height<=401);
   assert.equal(await input.inputValue(),'Captura conservada');await page.setViewportSize({width:320,height:844});await inspectDialog();
 });
} finally {await browser.close();}
process.exitCode=results.some(r=>r.status==='failed')?1:0;
