/**
 * Pruebas de las reglas de RF4 con node:test, sin red ni credenciales.
 * Importan el TypeScript real con Node 24; comprueban límites, validación y números seguros.
 * La persistencia y el marcador se comprueban aparte con la aplicación Android.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  validarContacto,
  datosContacto,
  borradorContacto,
  siguienteOrdenContacto,
  enlaceTelefono,
  mensajeErrorContacto,
} = require('../../src/utilidades/contactosEmergencia.ts');

const contacto = {
  nombre: 'Contacto de prueba',
  telefono: '+51 900 000 001',
  parentesco: 'Familiar',
  correo: '',
};

test('nombre, teléfono y relación son obligatorios; el correo es opcional', () => {
  assert.deepEqual(validarContacto(contacto), {});
  assert.equal(datosContacto(contacto).correo, null);
  for (const campo of ['nombre', 'telefono', 'parentesco']) {
    assert.ok(validarContacto({ ...contacto, [campo]: '  ' })[campo]);
  }
  assert.ok(validarContacto({ ...contacto, correo: 'correo-incompleto' }).correo);
});

test('preparar el formulario conserva los datos originales y solo admite campos editables', () => {
  const original = { ...contacto, id: 'no-se-envía', usuario_id: 'no-se-envía', orden: 3 };
  const borrador = borradorContacto(original);
  borrador.nombre = 'Otro nombre';
  assert.equal(original.nombre, contacto.nombre);
  const datos = datosContacto({ ...original, nombre: '  Prueba  ' });
  assert.deepEqual(Object.keys(datos).sort(), ['correo', 'nombre', 'parentesco', 'telefono']);
  assert.equal(datos.nombre, 'Prueba');
});

test('las ocho combinaciones de posiciones reutilizan el primer hueco y rechazan un cuarto', () => {
  for (let mascara = 0; mascara < 8; mascara++) {
    const ocupados = [1, 2, 3].filter((orden) => mascara & (1 << (orden - 1)));
    const esperado = [1, 2, 3].find((orden) => !ocupados.includes(orden)) ?? null;
    assert.equal(siguienteOrdenContacto(ocupados.map((orden) => ({ orden }))), esperado);
  }
});

test('el marcador conserva el prefijo y rechaza URLs y secuencias de control', () => {
  assert.equal(enlaceTelefono('+51 (900) 000-001'), 'tel:+51900000001');
  assert.equal(enlaceTelefono('900000001'), 'tel:900000001');
  for (const telefono of ['javascript:alert(1)', '*123#', '900;123', '900,123', '+', '---', '']) {
    assert.equal(enlaceTelefono(telefono), null);
    assert.ok(validarContacto({ ...contacto, telefono }).telefono);
  }
});

test('conflictos, límites y fallos de red tienen mensajes utilizables', () => {
  assert.match(mensajeErrorContacto({ code: '23505' }), /otro dispositivo/);
  assert.match(mensajeErrorContacto({ code: '23514' }), /tres contactos/);
  assert.match(mensajeErrorContacto({ code: '42501' }), /permiso/);
  assert.match(mensajeErrorContacto(new TypeError('Failed to fetch')), /conexión/);
  assert.doesNotMatch(mensajeErrorContacto({ message: 'detalle SQL privado' }), /SQL privado/);
});
