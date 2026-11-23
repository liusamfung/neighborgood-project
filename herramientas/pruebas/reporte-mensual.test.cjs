/** RF31: límites de calendario de Lima, meses vacíos y rechazo de conteos incoherentes.
 * Ejecuta la utilidad TypeScript real con Node 24; no simula la recepción de datos del servidor.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mesActualLima, mesesReporte, completarReporte, etiquetaMes } = require('../../src/utilidades/reporteMensual.ts');

test('RF31 usa el mes de Lima cuando UTC ya cambió de año', () => {
  assert.equal(mesActualLima(new Date('2027-01-01T04:59:59Z')), '2026-12');
  assert.equal(mesActualLima(new Date('2027-01-01T05:00:00Z')), '2027-01');
});
test('RF31 ordena seis/doce meses a través de diciembre y enero', () => {
  assert.deepEqual(mesesReporte('2027-02', 6), ['2026-09','2026-10','2026-11','2026-12','2027-01','2027-02']);
  const doce = mesesReporte('2027-01', 12);
  assert.equal(doce.length, 12);
  assert.equal(doce[0], '2026-02');
  assert.equal(doce[11], '2027-01');
});
test('RF31 completa meses ausentes sin perder el conteo ni el mes civil', () => {
  const fila = { mes:'2026-12-01', total:3, pendientes:1, en_atencion:1, resueltas:1 };
  const datos = completarReporte(['2026-11','2026-12','2027-01'], [fila]);
  assert.deepEqual(datos.map((d) => d.total), [0,3,0]);
  assert.equal(datos[1].mes, '2026-12');
  assert.match(etiquetaMes('2026-12'), /dic.*2026/i);
});
test('RF31 rechaza nulos, negativos, fracciones y totales incompatibles', () => {
  const fila = { mes:'2026-12-01', total:3, pendientes:1, en_atencion:1, resueltas:1 };
  for (const cambios of [{ total:null },{ total:-1 },{ total:3.2 },{ total:4 }]) {
    assert.throws(() => completarReporte(['2026-12'], [{ ...fila, ...cambios }]));
  }
});
