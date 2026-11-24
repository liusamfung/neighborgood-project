/**
 * Pruebas de la regla de primer plano de las notificaciones push (issue #7) con node:test, sin red ni
 * credenciales. Importan el TypeScript real con Node 24; comprueban que la push de una alerta, de una
 * incidencia o de un ingreso de visita no se muestra dos veces con la app abierta, y que las notificaciones
 * locales de la app (RF24) siguen mostrándose. El envío real se comprueba aparte en el teléfono.
 * Se ejecutan con `npm run test:notificaciones`.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  TIPOS_CON_AVISO_PROPIO,
  debeMostrarEnPrimerPlano,
} = require('../../src/utilidades/notificaciones.ts');

test('los tres tipos de push que ya avisan por Realtime no se muestran en primer plano', () => {
  assert.deepEqual([...TIPOS_CON_AVISO_PROPIO].sort(), ['alerta', 'incidencia', 'ingreso_visita']);
  for (const tipo of TIPOS_CON_AVISO_PROPIO) {
    assert.equal(debeMostrarEnPrimerPlano({ tipo, alerta_id: 'x' }), false, tipo);
  }
});

test('una notificación local de la app (sin tipo) sí se muestra', () => {
  assert.equal(debeMostrarEnPrimerPlano({}), true);
});

test('sin datos, con datos nulos o que no son un objeto, se muestra', () => {
  for (const datos of [undefined, null, 'alerta', 42, true]) {
    assert.equal(debeMostrarEnPrimerPlano(datos), true, String(datos));
  }
});

test('un tipo desconocido o que no es texto se muestra', () => {
  assert.equal(debeMostrarEnPrimerPlano({ tipo: 'promocion' }), true);
  assert.equal(debeMostrarEnPrimerPlano({ tipo: 42 }), true);
  assert.equal(debeMostrarEnPrimerPlano({ tipo: null }), true);
  assert.equal(debeMostrarEnPrimerPlano({ tipo: ['alerta'] }), true);
});
