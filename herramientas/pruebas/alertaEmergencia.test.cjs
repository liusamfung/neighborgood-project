/**
 * Pruebas de las reglas del botón de pánico (RF23) con node:test, sin red ni credenciales.
 * Importan el TypeScript real con Node 24; comprueban los tipos, los textos, la hora de Lima y los errores.
 * El envío real, la vibración y el conteo de toques se comprueban aparte en el teléfono.
 * Se ejecutan con `npm run test:alerta`.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  TIPOS_ALERTA,
  TIPO_POR_DEFECTO,
  esTipoAlerta,
  textoConfirmar,
  tituloDeTipo,
  textoUbicacion,
  textoHoraAlerta,
  mensajeErrorAlerta,
} = require('../../src/utilidades/alertaEmergencia.ts');

test('hay tres tipos, en el orden del mockup, y Médica viene marcado', () => {
  assert.deepEqual(
    TIPOS_ALERTA.map((opcion) => opcion.tipo),
    ['medica', 'incendio', 'seguridad'],
  );
  assert.equal(TIPO_POR_DEFECTO, 'medica');
  for (const opcion of TIPOS_ALERTA) {
    assert.ok(opcion.titulo && opcion.descripcion && opcion.icono, `${opcion.tipo} está completo`);
  }
});

test('solo los tres tipos de la base son válidos', () => {
  for (const tipo of ['medica', 'incendio', 'seguridad']) assert.equal(esTipoAlerta(tipo), true);
  for (const malo of [undefined, null, '', 'Medica', 'robo', ['medica'], 3]) {
    assert.equal(esTipoAlerta(malo), false);
  }
  assert.equal(tituloDeTipo('incendio'), 'Incendio');
  assert.equal(tituloDeTipo('otra'), '');
});

test('el botón de confirmar nombra el tipo elegido', () => {
  assert.equal(textoConfirmar('medica'), 'Confirmar alerta médica');
  assert.equal(textoConfirmar('incendio'), 'Confirmar alerta de incendio');
  assert.equal(textoConfirmar('seguridad'), 'Confirmar alerta de seguridad');
});

test('la ubicación es sector y unidad, o solo la unidad, o vacía', () => {
  assert.equal(textoUbicacion({ codigo: '302', sectores: { nombre: 'Torre A' } }), 'Torre A · 302');
  assert.equal(textoUbicacion({ codigo: 'B-202', sectores: null }), 'B-202');
  assert.equal(textoUbicacion(null), '');
  assert.equal(textoUbicacion(undefined), '');
});

test('la hora usa Lima, dice "Hoy" solo si es el mismo día y no se rompe con fechas malas', () => {
  // 23:42 UTC del 23/11 son las 18:42 en Lima (UTC-5).
  const creada = '2026-11-23T23:42:00Z';
  const mismoDia = textoHoraAlerta(creada, new Date('2026-11-24T02:00:00Z')); // 21:00 en Lima, 23/11
  assert.match(mismoDia, /^Hoy, 6:42\s?p\.\s?m\.$/);
  // Pasada la medianoche de Lima (00:10 del 24/11) ya no es "hoy".
  const otroDia = textoHoraAlerta(creada, new Date('2026-11-24T05:10:00Z'));
  assert.match(otroDia, /^23\/11, 6:42\s?p\.\s?m\.$/);
  // Cerca de la medianoche UTC sigue siendo el mismo día en Lima.
  const noche = textoHoraAlerta('2026-11-24T04:30:00Z', new Date('2026-11-24T04:50:00Z'));
  assert.match(noche, /^Hoy, 11:30\s?p\.\s?m\.$/);
  assert.equal(textoHoraAlerta('no es una fecha'), '');
});

test('los errores se explican en español y no filtran detalles de SQL', () => {
  assert.match(mensajeErrorAlerta({ code: '42501', message: 'new row violates RLS' }), /permiso/);
  assert.match(mensajeErrorAlerta({ code: 'PGRST301' }), /permiso/);
  assert.match(
    mensajeErrorAlerta({ code: '23503', message: 'unidad' }),
    /unidad no está registrada/,
  );
  const generico = mensajeErrorAlerta(new TypeError('Network request failed'));
  assert.match(generico, /conexión/);
  assert.match(generico, /guardia/);
  assert.doesNotMatch(generico, /Network request failed/);
  assert.match(mensajeErrorAlerta(undefined), /No pudimos enviar la alerta/);
});
