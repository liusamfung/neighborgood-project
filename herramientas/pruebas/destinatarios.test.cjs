/** RF13: impide convertir una selección incompleta en publicación para todo el condominio.
 * Ejecuta la regla compartida por P13/P14; el acceso por sector se verifica además con RLS local.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { errorDestino } = require('../../src/utilidades/destinoPublicacion.ts');

test('RF13 permite todos solo con elección coherente y explícita', () => {
  assert.equal(errorDestino('todos', [], ['a','b']), null);
  assert.ok(errorDestino('todos', ['a'], ['a','b']));
});
test('RF13 quitar el último sector exige revisar el destino, incluso sin catálogo', () => {
  assert.ok(errorDestino('sectores', [], ['a','b']));
  assert.ok(errorDestino('sectores', [], []));
});
test('RF13 admite varios sectores existentes y rechaza los que desaparecieron', () => {
  assert.equal(errorDestino('sectores', ['a','b'], ['a','b']), null);
  assert.ok(errorDestino('sectores', ['a','b'], ['a']));
});
