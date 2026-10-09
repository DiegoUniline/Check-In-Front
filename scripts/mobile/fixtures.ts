// Isolated UI fixtures. This file is imported only by the mobile audit bundler.
// No real authentication, network, hotel data or business writes are used.
const today = new Date().toISOString().slice(0, 10);
const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
export const user = { id: 'u1', nombre: 'Usuario de prueba', apellidoPaterno: 'Móvil', email: 'diego.leon@uniline.mx', rol: 'Admin', hotelNombre: 'Hotel de prueba' };
export const hotel = { id: 'h1', nombre: 'Hotel de prueba', slug: 'demo', moneda: 'MXN', timezone: 'America/Mexico_City', hora_checkin: '15:00', hora_checkout: '12:00', permite_reservas_online: true, impuestos_default: [] };
const tipo = { id: 't1', codigo: 'STD', nombre: 'Estándar matrimonial', capacidad_adultos: 2, capacidad_ninos: 1, capacidad_maxima: 3, precio_base: 900, amenidades: [], fotos: [], activo: true };
export const rooms = [1,2,3].map(i => ({id: 'room'+i, numero: String(100+i), piso: 1, tipo_habitacion_id: 't1', tipo_nombre: tipo.nombre, tipos_habitacion: tipo, estado_habitacion: i===2?'Ocupada':'Disponible', estado_limpieza:'Limpia',estado_mantenimiento:'OK', precio_base:900, precio_noche:900, capacidad_adultos:2,capacidad_ninos:1,activo:true}));
const cliente = { id:'c1',nombre:'María Fernanda',apellido_paterno:'Huésped de prueba',email:'huesped@example.test',telefono:'3170000000',tipo_documento:'INE',numero_documento:'PRUEBA',nacionalidad:'Mexicana',activo:true };
export const reservation = { id:'r1',hotel_id:'h1',numero_reserva:'PRUEBA-001',cliente_id:'c1',cliente_nombre:cliente.nombre,cliente_apellido_paterno:cliente.apellido_paterno,cliente_telefono:cliente.telefono,cliente_email:cliente.email,cliente,clientes:cliente,habitacion_id:'room1',habitacion_numero:'101',habitacion:rooms[0],habitaciones:rooms[0],tipo_habitacion_id:'t1',tipo_nombre:tipo.nombre,fecha_checkin:today,fecha_checkout:tomorrow,estado:'Confirmada',adultos:2,ninos:0,noches:1,tarifa_noche:900,subtotal:900,total:900,total_pagado:0,saldo_pendiente:900,impuestos:[],cargos:[],pagos:[],checkin_realizado:false,checkout_realizado:false,hotel };
export const occupied = {...reservation,id:'r2',numero_reserva:'PRUEBA-002',habitacion_id:'room2',habitacion_numero:'102',habitacion:rooms[1],habitaciones:rooms[1],estado:'CheckIn',checkin_realizado:true,cargos:[{id:'charge1',concepto:'Agua',cantidad:1,precio_unitario:25,total:25,estado:'Activo'},{id:'charge2',concepto:'Desayuno',cantidad:1,precio_unitario:100,total:100,estado:'Cancelado'}],pagos:[{id:'payment1',monto:100,metodo_pago:'Efectivo',estado:'Activo'},{id:'payment2',monto:50,metodo_pago:'Efectivo',estado:'Cancelado'}]};
export const shift = {id:'shift1',hotel_id:'h1',usuario_id:'u1',usuario_nombre:user.nombre,abierto_at:new Date().toISOString(),fecha_apertura:new Date().toISOString(),estado:'Abierto',fondo_inicial:1000};
const method = { id:'m1',nombre:'Efectivo',tipo:'Efectivo',activo:true,orden:0 };
const product = {id:'p1',codigo:'AGUA',nombre:'Agua natural',categoria_id:'cat1',categoria_nombre:'Bebidas',precio_venta:25,precio_compra:10,stock_actual:20,stock_minimo:5,activo:true};
const chat = { id:'chat1',hotel_id:'h1',phone:'3170000000',wa_id:'prueba',nombre:cliente.nombre,ultima_actividad:new Date().toISOString(),ultimo_mensaje:'Consulta de prueba',no_leidos:1,cliente_id:'c1',estado_bot:'bot',etiquetas:[] };
const summary = {efectivo:0,tarjeta:0,transferencia:0,otros:0,egresosEfectivo:0,movimientos:[],totalIngresos:0,totalEgresos:0,efectivoEsperado:1000};
const control = { score:100, alerts:[],criticalCount:0,warningCount:0,openShift:shift,dayClosure:null,pendingLog:0,storageMode:'central',updatedAt:new Date().toISOString() };
const tables:Record<string, any[]> = {hoteles:[hotel],habitaciones:rooms,tipos_habitacion:[tipo],clientes:[cliente],reservas:[reservation,occupied],metodos_pago:[method],productos:[product],categorias:[{id:'cat1',nombre:'Bebidas'}],categorias_productos:[{id:'cat1',nombre:'Bebidas'}],usuarios:[user],profiles:[user],chats:[chat],whatsapp_chats:[chat],wa_chats:[chat]};
const reads:Record<string,any> = {
 getHotel:hotel,getHotelId:'h1',getTiposHabitacion:[tipo],getHabitaciones:rooms,getHabitacionesDisponibles:rooms.filter(r=>r.estado_habitacion==='Disponible'),getClientes:[cliente],getReservas:[reservation,occupied],getCheckinsHoy:[reservation],getCheckoutsHoy:[occupied],getDashboardCheckinsHoy:[reservation],getDashboardCheckoutsHoy:[occupied],getCategorias:tables.categorias,getProductos:[product],getUsuarios:[user],getHotelesSaas:[hotel],getMetodosPago:[method],getMiSuscripcion:{dias_restantes:30},getConfigHotel:{},getPermisosHotel:{},getOperationalControl:control,getOpenShift:shift,getShiftFinancialSummary:summary,getDashboardStats:{},getDashboardVentasHoy:{total:0,count:0},getLimpiezaModo:'simple',getMetricasPlataforma:{},getNightAuditSnapshot:{date:today,checks:[],closure:null,storageMode:'central',totals:{ingresos:0,gastos:0,ventas:0,saldoPendiente:0}},getRoles:['Admin','Recepcion'],getEntregables:[{id:'e1',nombre:'Llave',activo:true,requiere_devolucion:true,costo_reposicion:100}],getCuentas:[],getStayAccounts:[{id:'a1',nombre:'Principal',estado:'Abierta'}],getPagosReserva:[],getShiftHistory:[shift],getTransacciones:[],getPoliticasReserva:[],
};
const calls:any[] = [];
(globalThis as any).__mobileCalls = calls;
const functions = new Map();
export const api = new Proxy({}, {get:(_target, prop:string) => {
 if(prop==='then') return undefined;
 if(prop==='isDemoMode') return true;
 if(!functions.has(prop)) functions.set(prop, (...args:any[]) => {
   calls.push({method:prop,args});
   if(prop==='getHotelId')return 'h1';
   if(prop==='getReserva')return Promise.resolve(args[0]==='r2'?occupied:args[0]==='r3'?{...occupied,id:'r3',estado:'CheckOut',checkout_realizado:true}:reservation);
   if(prop==='getConfigHotel')return Promise.resolve(args[0]==='moneda'?{codigo:'MXN',simbolo:'$'}:{});
   if(prop.startsWith('contar'))return Promise.resolve(0);
   if(prop in reads)return Promise.resolve(structuredClone(reads[prop]));
   if(/^(get|url)/.test(prop))return Promise.resolve([]);
   if((globalThis as any).__failMobileWrites)return Promise.reject(new Error('Error de validación de prueba. Revisa los datos.'));
   return Promise.resolve({id:'created-fixture',...args[0]});
 });
 return functions.get(prop);
}});
function query(table:string) {
 let rows=[...(tables[table]||[])],single=false;
 const builder:any = new Proxy({}, {get:(_target,prop:string)=>{
   if(prop==='then')return (resolve:any,reject:any)=>Promise.resolve({data:single?(rows[0]||null):rows,error:null,count:rows.length}).then(resolve,reject);
   return (...args:any[])=>{
     if(prop==='single'||prop==='maybeSingle')single=true;
     if(prop==='eq'&&rows.some(r=>args[0] in r))rows=rows.filter(r=>r[args[0]]===args[1]);
     if(['insert','update','delete','upsert'].includes(prop))calls.push({method:table+'.'+prop,args});
     return builder;
   };
 }});return builder;
}
const channel:any={on:()=>channel,subscribe:(fn?:any)=>{fn?.('SUBSCRIBED');return channel},unsubscribe:()=>Promise.resolve()};
export const supabase:any={from:query,channel:()=>channel,removeChannel:()=>Promise.resolve(),rpc:async()=>({data:[],error:null}),auth:{getUser:async()=>({data:{user},error:null}),getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},functions:{invoke:async()=>({data:{},error:null})},storage:{from:()=>({getPublicUrl:()=>({data:{publicUrl:''}})})}};
export const auth = {user,isAuthenticated:!/^\/(login|signup|forgot-password|reset-password)$/.test(location.pathname),isLoading:false,permisosVersion:0,login:async()=>true,logout(){},refreshUser:async()=>{}};
export const shiftContext = {openShift:shift,hasOpenShift:true,shiftRequired:true,loading:false,viewOnlyMode:false,refreshShift:async()=>shift,continueWithoutShift(){},exitViewOnlyMode(){}};
