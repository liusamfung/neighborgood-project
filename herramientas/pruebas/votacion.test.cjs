/** Pruebas RF9 del TypeScript real con Node 24: plazos y respuestas, sin red ni credenciales. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  encuestaAbierta,
  idEncuestaValido,
  alternarRespuesta,
  prepararVoto,
  mensajeErrorVoto,
} = require('../../src/utilidades/votacion.ts');
const p = {
  id: 'p1',
  texto: 'Una',
  orden: 1,
  seleccion: 'unica',
  opciones: [
    { id: 'a', texto: 'A', orden: 1 },
    { id: 'b', texto: 'B', orden: 2 },
  ],
};
const m = { ...p, id: 'p2', seleccion: 'multiple' };
test('el voto admite apertura exacta y rechaza cierre exacto o fechas inválidas', () => {
  const abre = '2026-11-22T10:00:00Z',
    cierra = '2026-11-22T11:00:00Z';
  assert.equal(encuestaAbierta(abre, cierra, Date.parse(abre) - 1), false);
  assert.equal(encuestaAbierta(abre, cierra, Date.parse(abre)), true);
  assert.equal(encuestaAbierta(abre, cierra, Date.parse(cierra)), false);
  assert.equal(encuestaAbierta('inválida', cierra, Date.now()), false);
});
test('selección única reemplaza y múltiple alterna sin modificar el borrador original', () => {
  const original = { p1: ['a'], p2: ['a'] };
  assert.deepEqual(alternarRespuesta(original, p, 'b').p1, ['b']);
  assert.deepEqual(alternarRespuesta(original, m, 'b').p2, ['a', 'b']);
  assert.deepEqual(alternarRespuesta(original, m, 'a').p2, []);
  assert.deepEqual(original, { p1: ['a'], p2: ['a'] });
  assert.equal(alternarRespuesta(original, p, 'ajena'), original);
});
test('no se envían encuestas vacías, preguntas sin contestar ni opciones ajenas', () => {
  assert.throws(() => prepararVoto([], {}));
  assert.throws(() => prepararVoto([p, m], { p1: ['a'] }), /pregunta 2/);
  assert.throws(() => prepararVoto([p], { p1: ['a', 'b'] }), /una sola/);
  assert.throws(() => prepararVoto([p], { p1: ['ajena'] }), /opciones cambiaron/);
  assert.deepEqual(prepararVoto([p, m], { p1: ['a'], p2: ['a', 'b', 'a'], ajena: ['x'] }), [
    { pregunta_id: 'p1', opcion_id: 'a' },
    { pregunta_id: 'p2', opcion_id: 'a' },
    { pregunta_id: 'p2', opcion_id: 'b' },
  ]);
});
test('ruta y errores no revelan detalles del servidor ni permiten una segunda unidad desde el cliente', () => {
  assert.equal(idEncuestaValido('a'.repeat(8) + '-aaaa-aaaa-aaaa-' + 'a'.repeat(12)), true);
  assert.equal(idEncuestaValido(['id']), false);
  assert.equal(idEncuestaValido('no-uuid'), false);
  assert.match(mensajeErrorVoto({ code: '23505' }), /Tu unidad ya votó/);
  assert.match(mensajeErrorVoto({ code: '42501' }), /permiso/);
  assert.doesNotMatch(mensajeErrorVoto({ message: 'SQL privado' }), /SQL privado/);
});
