// Run: node --test scripts/test-online-reservations.mjs
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import React, { act } from 'react';
import ts from 'typescript';

const repo = resolve(import.meta.dirname, '..');
const temp = await mkdtemp(join(repo, 'node_modules/.online-reservation-test-'));
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost', pretendToBeVisual: true });
for (const name of ['window', 'document', 'navigator', 'HTMLElement', 'HTMLInputElement', 'HTMLButtonElement', 'Element', 'Node', 'NodeFilter', 'Event', 'MouseEvent', 'KeyboardEvent', 'CustomEvent', 'MutationObserver', 'DocumentFragment', 'localStorage', 'sessionStorage', 'getComputedStyle']) {
  Object.defineProperty(globalThis, name, { configurable: true, value: dom.window[name] });
}
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
// JSDOM does not implement matchMedia; these existing tests cover desktop behavior.
dom.window.matchMedia = (media) => ({ media, matches: false, addEventListener() {}, removeEventListener() {} });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { createRoot } = await import('react-dom/client');
const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query');
const { MemoryRouter } = await import('react-router-dom');

const mocks = {
  '@/lib/api': "export default globalThis.__onlineApi; export const todayLocal = () => '2026-10-02';",
  '@/components/layout/MainLayout': 'export const MainLayout = ({children}) => children;',
  '@/contexts/useAuth': "export const useAuth = () => ({ user: { rol: 'Admin' } });",
  '@/contexts/useShift': 'export const useShift = () => ({ viewOnlyMode: false });',
  '@/hooks/useRealtimeSync': 'export const useRealtimeSync = () => {};',
  '@/hooks/use-toast': 'export const useToast = () => ({ toast() {} });',
  '@/components/reservas/PoliticasReservaPanel': 'export const PoliticasReservaPanel = () => null;',
  '@/lib/permissions': 'export const canAccess = () => false;',
};
async function bundle(entry, output, overrides) {
  const outfile = join(temp, output);
  await build({ entryPoints: [join(repo, entry)], outfile, bundle: true, platform: 'node', format: 'esm', packages: 'external', jsx: 'automatic', tsconfig: join(repo, 'tsconfig.app.json'),
    plugins: [{ name: 'test-boundaries', setup(b) {
      b.onResolve({ filter: /^@\// }, (args) => args.path in overrides ? { path: args.path, namespace: 'mock' } : null);
      b.onLoad({ filter: /.*/, namespace: 'mock' }, (args) => ({ contents: overrides[args.path], loader: 'js' }));
    } }],
  });
  return import(pathToFileURL(outfile).href);
}
const source = await readFile(join(repo, 'src/lib/onlineReservations.ts'), 'utf8');
const helpers = await import(`data:text/javascript;base64,${Buffer.from(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText).toString('base64')}`);
const reservation = { id: 'r1', hotel_id: 'hotel1', origen: 'Web', estado: 'Pendiente', fecha_checkin: '2026-10-04', fecha_checkout: '2026-10-05', tipo_habitacion_id: 'type1', habitacion_id: 'room1', adultos: 2, ninos: 0, total: 849, total_pagado: 849, cliente_nombre: 'JOSÉ LUIS FLORES', numero_reserva: 'RES-2026-0021', tipo_nombre: 'King Size', habitacion_numero: '248', updated_at: '2026-10-02T14:00:00Z' };
const room = { id: 'room1', numero: '248', tipo_habitacion_id: 'type1', tipo_nombre: 'King Size', estado_habitacion: 'Disponible', estado_mantenimiento: 'OK' };
globalThis.__onlineApi = { getHotelId: () => 'hotel1', getBloqueos: async () => [], getReservasOnline: async () => [reservation], getDisponibilidadReservaOnline: async () => ({ reserva: reservation, habitaciones: [room] }), confirmarReservaOnline: async () => ({}) };
const { TimelineGrid } = await bundle('src/components/reservas/TimelineGrid.tsx', 'timeline.mjs', mocks);
const { default: OnlinePage } = await bundle('src/pages/ReservasOnline.tsx', 'online.mjs', mocks);
const { AdjacentReservationDialog } = await bundle('src/components/reservas/AdjacentReservationDialog.tsx', 'adjacent.mjs', mocks);
const apiMocks = {
  '@/integrations/supabase/client': 'export const supabase = { from: (...args) => globalThis.__supabaseFrom(...args) };',
  '@/lib/shiftAccess': 'export const assertShiftWriteAllowed = () => {};',
  '@/lib/auditoria': 'export const registrarAuditoria = async () => {};',
  '@/lib/notificaciones': 'export const crearNotificacion = async () => {};',
};
const { default: api } = await bundle('src/lib/api.ts', 'api.mjs', apiMocks);
api.setHotelId('hotel1');

async function mount(element) {
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => { root.render(element); });
  return { host, async close() { await act(async () => root.unmount()); host.remove(); } };
}
async function mouse(target, name, x = 480) {
  await act(async () => { target.dispatchEvent(new MouseEvent(name, { bubbles: true, cancelable: true, button: 0, clientX: x })); });
}
async function click(target) {
  assert.ok(target, 'Expected action exists');
  await mouse(target, 'mousedown'); await mouse(target, 'mouseup'); await mouse(target, 'click');
}
const button = (text) => Array.from(document.querySelectorAll('button')).find((node) => node.textContent.trim() === text);

test('adjacent selection offers existing-reservation actions and creates another only on explicit choice', async () => {
  const actions = [], created = [];
  const view = await mount(React.createElement(AdjacentReservationDialog, {
    selection: { habitacion: room, fechaCheckin: new Date(2026, 9, 5), fechaCheckout: new Date(2026, 9, 8), reservas: [reservation] },
    canExtend: true, canCancel: true, onClose() {}, onCreate: () => created.push(true), onAction: (r, action) => actions.push([r, action]),
  }));
  try {
    assert.match(document.body.textContent, /JOSÉ LUIS FLORES/);
    assert.match(document.body.textContent, /RES-2026-0021/);
    await click(button('Extender esta reserva'));
    await click(button('Ver expediente'));
    await click(button('Cancelar esta reserva'));
    assert.deepEqual(actions, [[reservation, 'extend_stay'], [reservation, 'view'], [reservation, 'cancel']]);
    assert.equal(created.length, 0);
    await click(button('Crear otra reserva'));
    assert.equal(created.length, 1);
  } finally { await view.close(); }
});

for (const action of ['Ver expediente', 'Editar', 'Cancelar reserva']) {
  test(`calendar ${action} acts on the existing reservation without opening a new one`, async () => {
    const created = [], opened = [], actions = [];
    const view = await mount(React.createElement(TimelineGrid, { habitaciones: [room], reservas: [{ ...reservation, estado: 'Confirmada' }], startDate: new Date(2026, 9, 2), daysToShow: 7, groupBy: 'none', canCreate: true,
      onCreateReservation: (...args) => created.push(args), onReservationClick: (r) => opened.push(r.id), onReservationAction: (r, action) => actions.push([r.id, action]),
    }));
    try {
      const bar = view.host.querySelector('[data-reservation-id="r1"]');
      await mouse(bar, 'contextmenu');
      await click(button(action));
      assert.equal(created.length, 0, 'An existing reservation action must never create a reservation');
      if (action === 'Ver expediente') assert.deepEqual(opened, ['r1']);
      else assert.deepEqual(actions, [['r1', action === 'Editar' ? 'edit' : 'cancel']]);
    } finally { await view.close(); }
  });
}
test('single click and keyboard open the exact existing reservation, with its guest and payments intact', async () => {
  const opened = [], created = [];
  const view = await mount(React.createElement(TimelineGrid, { habitaciones: [room], reservas: [reservation], startDate: new Date(2026, 9, 2), daysToShow: 7, groupBy: 'none', canCreate: true,
    onCreateReservation: () => created.push(true), onReservationClick: (r) => opened.push(r),
  }));
  try {
    const bar = view.host.querySelector('[data-reservation-id="r1"]');
    await click(bar);
    await act(async () => { bar.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' })); });
    assert.deepEqual(opened, [reservation, reservation]);
    assert.equal(created.length, 0);
  } finally { await view.close(); }
});
test('online filters combine guest search, status, type and inclusive arrival range', () => {
  const rows = [reservation, { ...reservation, id: 'r2', estado: 'Cancelada' }, { ...reservation, id: 'r3', fecha_checkin: '2026-10-06' }];
  assert.deepEqual(helpers.filterOnlineReservations(rows, { search: 'jose', status: 'Pendiente', roomType: 'type1', from: '2026-10-04', to: '2026-10-04' }).map((r) => r.id), ['r1']);
  assert.equal(helpers.filterOnlineReservations(rows, { search: '0021', status: 'all', roomType: 'all', from: '', to: '' }).length, 3);
});
test('expired dates block approval, while same-day today and overdue arrival with future departure remain valid', () => {
  assert.ok(helpers.onlineReservationDateError({ fecha_checkin: '2026-10-01', fecha_checkout: '2026-10-02' }, '2026-10-02'));
  assert.equal(helpers.onlineReservationDateError({ fecha_checkin: '2026-10-02', fecha_checkout: '2026-10-02' }, '2026-10-02'), null);
  assert.equal(helpers.onlineReservationDateError({ fecha_checkin: '2026-10-01', fecha_checkout: '2026-10-03' }, '2026-10-02'), null);
});
function queryResult(result) {
  const calls = [];
  const query = new Proxy({}, { get(_, key) {
    if (key === 'maybeSingle') return async () => result;
    return (...args) => { calls.push([key, ...args]); return query; };
  } });
  globalThis.__supabaseFrom = () => query;
  return calls;
}
test('approval revalidates availability and writes the selected room with tenant and pending-state guards', async () => {
  let checks = 0;
  api.getDisponibilidadReservaOnline = async () => { checks++; return { reserva: reservation, habitaciones: [room] }; };
  const calls = queryResult({ data: { ...reservation, estado: 'Confirmada' }, error: null });
  const result = await api.confirmarReservaOnline('r1', 'room1', helpers.onlineReservationSnapshot(reservation));
  assert.equal(checks, 1); assert.equal(result.estado, 'Confirmada');
  assert.equal(calls.find(([name]) => name === 'update')[1].habitacion_id, 'room1');
  assert.ok(calls.some(([name, key, value]) => name === 'eq' && key === 'hotel_id' && value === 'hotel1'));
  assert.ok(calls.some(([name, key, value]) => name === 'eq' && key === 'estado' && value === 'Pendiente'));
  assert.ok(calls.some(([name, key, value]) => name === 'eq' && key === 'updated_at' && value === reservation.updated_at));
});
test('approval refuses a room that became unavailable or a reservation changed since review', async () => {
  globalThis.__supabaseFrom = () => { throw new Error('Must not write'); };
  api.getDisponibilidadReservaOnline = async () => ({ reserva: reservation, habitaciones: [] });
  await assert.rejects(api.confirmarReservaOnline('r1', 'room1', helpers.onlineReservationSnapshot(reservation)), /ya no está libre/);
  api.getDisponibilidadReservaOnline = async () => ({ reserva: { ...reservation, total: 1000 }, habitaciones: [room] });
  await assert.rejects(api.confirmarReservaOnline('r1', 'room1', helpers.onlineReservationSnapshot(reservation)), /cambió mientras/);
});
test('zero-row approval or rejection is an error, not false success after another user acted', async () => {
  api.getDisponibilidadReservaOnline = async () => ({ reserva: reservation, habitaciones: [room] });
  queryResult({ data: null, error: null });
  await assert.rejects(api.confirmarReservaOnline('r1', 'room1', helpers.onlineReservationSnapshot(reservation)), /ya fue procesada/);
  await assert.rejects(api.rechazarReservaOnline('r1', 'Sin disponibilidad'), /ya fue procesada/);
});
test('online review cannot accept until availability returns; no rooms keeps acceptance blocked', async () => {
  let resolveAvailability;
  globalThis.__onlineApi.getDisponibilidadReservaOnline = () => new Promise((resolve) => { resolveAvailability = resolve; });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const view = await mount(React.createElement(QueryClientProvider, { client }, React.createElement(MemoryRouter, {}, React.createElement(OnlinePage))));
  try {
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)); });
    await click(button('Revisar'));
    assert.equal(button('Aceptar reserva').disabled, true);
    await act(async () => { resolveAvailability({ reserva: reservation, habitaciones: [] }); await new Promise((resolve) => setTimeout(resolve, 20)); });
    assert.equal(button('Aceptar reserva').disabled, true);
    assert.match(document.body.textContent, /No hay habitaciones libres/);
    assert.ok(document.querySelector('a[href="/reservas/detalle/r1?editar=1"]'));
  } finally { await view.close(); client.clear(); }
});
after(async () => { dom.window.close(); await rm(temp, { recursive: true, force: true }); });
