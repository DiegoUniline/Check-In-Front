// Run: node --test scripts/test-reservation-dates.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';

async function loadSource(name) {
  const source = await readFile(new URL(`../src/lib/${name}.ts`, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } });
  const url = `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`;
  return { module: await import(url), url };
}
const { module: dates } = await loadSource('reservationDates');
const { module: pagination } = await loadSource('fetchAllRows');
const { module: occupancy } = await loadSource('stayOccupancy');
const { url: formatterUrl } = await loadSource('dateFormat');

test('moves an expired same-day reservation from yesterday to today', () => {
  assert.equal(dates.checkoutAfterArrivalChange('2026-10-01', '2026-10-01', '2026-10-02'), '2026-10-02');
});
test('preserves duration when the new arrival exceeds the old departure', () => {
  assert.equal(dates.checkoutAfterArrivalChange('2026-09-28', '2026-09-30', '2026-10-02'), '2026-10-04');
  assert.equal(dates.checkoutAfterArrivalChange('2026-12-29', '2026-12-31', '2027-01-01'), '2027-01-03');
  assert.equal(dates.checkoutAfterArrivalChange('2028-02-26', '2028-02-28', '2028-02-29'), '2028-03-02');
});
test('leaves a valid departure untouched, including same-day and earlier corrections', () => {
  assert.equal(dates.checkoutAfterArrivalChange('2026-10-01', '2026-10-03', '2026-10-02'), '2026-10-03');
  assert.equal(dates.checkoutAfterArrivalChange('2026-10-01', '2026-10-02', '2026-10-02'), '2026-10-02');
  assert.equal(dates.checkoutAfterArrivalChange('2026-10-02', '2026-10-03', '2026-10-01'), '2026-10-03');
});
test('does not invent dates while a field is empty or invalid', () => {
  assert.equal(dates.checkoutAfterArrivalChange('2026-10-01', '2026-10-01', ''), '2026-10-01');
  assert.equal(dates.checkoutAfterArrivalChange('', '2026-10-01', '2026-10-02'), '2026-10-01');
});
test('history shows both exact changes without inventing changes for partial records', () => {
  const before = { fecha_checkin: '2026-10-01', fecha_checkout: '2026-10-01' };
  const after = { fecha_checkin: '2026-10-02', fecha_checkout: '2026-10-03' };
  assert.deepEqual(dates.reservationDateChanges(before, after), [
    { key: 'fecha_checkin', label: 'Entrada', before: '2026-10-01', after: '2026-10-02' },
    { key: 'fecha_checkout', label: 'Salida', before: '2026-10-01', after: '2026-10-03' },
  ]);
  assert.deepEqual(dates.reservationDateChanges(before, before), []);
  assert.deepEqual(dates.reservationDateChanges(null, after), []);
  assert.deepEqual(dates.reservationDateChanges({}, after), []);
});
test('audit timestamps follow the device timezone while calendar dates stay fixed', () => {
  for (const [timezone, expected] of [
    ['America/Mexico_City', '02/10/2026 08:49'],
    ['Europe/Madrid', '02/10/2026 16:49'],
    ['UTC', '02/10/2026 14:49'],
  ]) {
    const output = execFileSync(process.execPath, ['--input-type=module', '-e',
      `const f = await import(${JSON.stringify(formatterUrl)}); console.log(JSON.stringify([f.formatDateTime('2026-10-02T14:49:00+00:00'), f.formatDate('2026-10-01')]));`
    ], { env: { ...process.env, TZ: timezone }, encoding: 'utf8' });
    assert.deepEqual(JSON.parse(output), [expected, '01/10/2026']);
  }
});
test('availability retains overdue in-house stays and same-day occupancy', () => {
  const stay = { fecha_checkin: '2026-09-29', fecha_checkout: '2026-10-01', estado: 'CheckIn', checkin_realizado: true, checkout_realizado: false };
  assert.equal(occupancy.occupiesNight(stay, '2026-10-02', '2026-10-02'), true);
  assert.equal(occupancy.occupiesNight({ ...stay, estado: 'CheckOut', checkout_realizado: true }, '2026-10-02', '2026-10-02'), false);
  assert.equal(occupancy.occupiesNight({ fecha_checkin: '2026-10-02', fecha_checkout: '2026-10-02', estado: 'Confirmada' }, '2026-10-02', '2026-10-02'), true);
});
test('loads all availability/history rows past the 1,000-row API cap', async () => {
  const rows = Array.from({ length: 2001 }, (_, id) => ({ id }));
  const requests = [];
  const result = await pagination.fetchAllRows(async (from, to) => {
    requests.push([from, to]);
    return { data: rows.slice(from, to + 1), error: null };
  });
  assert.deepEqual(result, rows);
  assert.deepEqual(requests, [[0, 999], [1000, 1999], [2000, 2999]]);
});
test('a later-page error fails availability instead of reporting a room as free', async () => {
  await assert.rejects(pagination.fetchAllRows(async (from) => from === 0
    ? { data: Array(1000).fill({}), error: null }
    : { data: null, error: { message: 'Connection lost' } }), /Connection lost/);
});
