/**
 * Pruebas de las reglas del reporte de incidencias (RF29) con node:test, sin red ni credenciales.
 * Importan el TypeScript real con Node 24; comprueban el borrador, las fotos, la ruta en Storage, el id y
 * los mensajes de error. El envío, la cámara y la galería se comprueban aparte en el teléfono.
 * Se ejecutan con `npm run test:reporte`.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  MAX_FOTOS,
  MAXIMO_BYTES,
  extensionDeMime,
  validarFoto,
  rutaFoto,
  nuevoIdIncidencia,
  nuevoBorrador,
  validarBorrador,
  mensajeErrorReporte,
} = require('../../src/utilidades/reporteIncidencia.ts');

const foto = (n) => ({ uri: `file:///fotos/${n}.jpg`, mimeType: 'image/jpeg', extension: 'jpg' });
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

test('el máximo de fotos es 3 y el borrador nuevo trae la ubicación y ninguna foto', () => {
  assert.equal(MAX_FOTOS, 3);
  assert.deepEqual(nuevoBorrador('Torre A · A-101'), {
    ubicacion: 'Torre A · A-101',
    descripcion: '',
    fotos: [],
  });
});

test('solo se admiten JPEG, PNG y WebP', () => {
  assert.equal(extensionDeMime('image/jpeg'), 'jpg');
  assert.equal(extensionDeMime('image/png'), 'png');
  assert.equal(extensionDeMime('image/webp'), 'webp');
  for (const malo of ['image/gif', 'image/heic', 'application/pdf', '', null, undefined]) {
    assert.equal(extensionDeMime(malo), null);
    assert.match(validarFoto(malo, 1000), /JPEG, PNG o WebP/);
  }
  assert.equal(validarFoto('image/png', 1000), null);
});

test('una foto de 5 MB cabe y una de más no; sin peso informado se acepta', () => {
  assert.equal(validarFoto('image/jpeg', MAXIMO_BYTES), null);
  assert.match(validarFoto('image/jpeg', MAXIMO_BYTES + 1), /5 MB/);
  assert.equal(validarFoto('image/jpeg', undefined), null);
  assert.equal(validarFoto('image/jpeg', null), null);
});

test('la ruta de la foto es usuario/incidencia/orden.extensión', () => {
  assert.equal(rutaFoto('u-1', 'i-9', 2, 'png'), 'u-1/i-9/2.png');
});

test('el id de la incidencia es un UUID v4 distinto cada vez', () => {
  const ids = new Set();
  for (let i = 0; i < 200; i++) {
    const id = nuevoIdIncidencia();
    assert.match(id, UUID_V4);
    ids.add(id);
  }
  assert.equal(ids.size, 200);
});

test('sin crypto.randomUUID se genera igual un UUID v4 válido', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true });
  try {
    for (let i = 0; i < 100; i++) assert.match(nuevoIdIncidencia(), UUID_V4);
  } finally {
    if (original) Object.defineProperty(globalThis, 'crypto', original);
    else delete globalThis.crypto;
  }
});

test('el borrador pide ubicación, descripción y de 1 a 3 fotos', () => {
  const completo = { ubicacion: 'Pasillo', descripcion: 'Luz quemada', fotos: [foto(1)] };
  assert.deepEqual(validarBorrador(completo), { errores: {}, valido: true });

  const vacio = validarBorrador(nuevoBorrador('   '));
  assert.equal(vacio.valido, false);
  assert.match(vacio.errores.ubicacion, /dónde/);
  assert.match(vacio.errores.descripcion, /qué pasa/);
  assert.match(vacio.errores.fotos, /al menos una foto/);

  assert.equal(
    validarBorrador({ ...completo, descripcion: '   ' }).errores.descripcion,
    'Describe qué pasa.',
  );
  assert.equal(validarBorrador({ ...completo, fotos: [foto(1), foto(2), foto(3)] }).valido, true);
  const cuatro = validarBorrador({ ...completo, fotos: [foto(1), foto(2), foto(3), foto(4)] });
  assert.equal(cuatro.valido, false);
  assert.match(cuatro.errores.fotos, /hasta 3 fotos/);
});

test('los errores se explican en español y no filtran detalles internos', () => {
  const fallaFoto = new Error('boom');
  fallaFoto.name = 'ErrorFoto';
  assert.match(mensajeErrorReporte(fallaFoto), /subir una foto/);
  // La función de la base ya responde en español con este código y se muestra tal cual.
  assert.equal(
    mensajeErrorReporte({ code: '22023', message: 'La incidencia necesita de 1 a 3 fotos' }),
    'La incidencia necesita de 1 a 3 fotos',
  );
  assert.match(
    mensajeErrorReporte({ code: '42501', message: 'permission denied for table' }),
    /permiso/,
  );
  assert.match(mensajeErrorReporte({ code: 'PGRST301' }), /permiso/);
  assert.match(mensajeErrorReporte({ code: '23505' }), /ya se había enviado/);
  const sinRed = mensajeErrorReporte(new TypeError('Network request failed'));
  assert.match(sinRed, /conexión/);
  assert.doesNotMatch(sinRed, /Network request failed/);
  assert.match(mensajeErrorReporte({ code: 'XX000', message: 'interno' }), /No pudimos enviar/);
});
