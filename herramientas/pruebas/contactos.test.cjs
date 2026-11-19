/**
 * Pruebas RF4 con node:test, sin instalar dependencias ni iniciar un navegador.
 * Transpila las funciones puras con el TypeScript del proyecto. El repositorio se ejecuta con un
 * cliente simulado para comprobar filtros y errores; pgTAP prueba por separado RLS real y límites.
 * Ejecutar con Node 24: node --test herramientas/pruebas/contactos.test.cjs.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { runInNewContext } = require('node:vm');
const ts = require('typescript');
const raiz = resolve(__dirname, '../..');

/** Carga el archivo real; solo sustituye sus dependencias de red, nunca su lógica de negocio. */
function cargar(archivo, dependencias = {}) {
  const codigo = ts.transpileModule(readFileSync(resolve(raiz, archivo), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const modulo = { exports: {} };
  runInNewContext(
    codigo,
    {
      exports: modulo.exports,
      module: modulo,
      Error,
      TypeError,
      Set,
      require(nombre) {
        if (!(nombre in dependencias)) throw new Error(`Dependencia no prevista: ${nombre}`);
        return dependencias[nombre];
      },
    },
    { filename: archivo },
  );
  return modulo.exports;
}
const reglas = cargar('src/utilidades/contactosEmergencia.ts');
const borrador = {
  nombre: '  Rosa García  ',
  telefono: ' +51 (987) 654-321 ',
  parentesco: ' Hermana ',
  correo: ' ',
};

test('prepara enlaces telefónicos locales e internacionales sin cambiar el número guardado', () => {
  assert.equal(reglas.enlaceTelefono(' +51 (987) 654-321 '), 'tel:+51987654321');
  assert.equal(reglas.enlaceTelefono('988111111'), 'tel:988111111');
  assert.equal(reglas.enlaceTelefono('01 234-5678'), 'tel:012345678');
  assert.equal(borrador.telefono, ' +51 (987) 654-321 ');
});

test('rechaza teléfonos vacíos, URL, controles de marcado y prefijos inválidos', () => {
  for (const valor of [
    '',
    '   ',
    '+()-',
    'tel:988111111',
    'javascript:alert(1)',
    '999;123',
    '*123#',
    '999?x=1',
    '++51999',
    '999\n123',
    'texto',
  ]) {
    assert.equal(reglas.enlaceTelefono(valor), null, valor);
  }
});

test('el servicio pide abrir tel: y no usa permisos ni APIs de llamada directa', async () => {
  const enlaces = [];
  const servicio = cargar('src/lib/llamadas.ts', {
    'react-native': {
      Linking: {
        openURL: async (url) => {
          enlaces.push(url);
        },
      },
    },
    '@/utilidades/contactosEmergencia': reglas,
  });
  await servicio.abrirMarcador('+51 987-654-321');
  assert.deepEqual(enlaces, ['tel:+51987654321']);
  await assert.rejects(servicio.abrirMarcador('999;123'), /Revisa el teléfono/);
  assert.equal(enlaces.length, 1);
});

test('si no existe marcador o el sistema rechaza abrirlo se explica cómo recuperar el número', async () => {
  const servicio = cargar('src/lib/llamadas.ts', {
    'react-native': {
      Linking: {
        openURL: async () => {
          throw new Error('No activity found');
        },
      },
    },
    '@/utilidades/contactosEmergencia': reglas,
  });
  await assert.rejects(servicio.abrirMarcador('988111111'), /seleccionar y copiar/);
});

test('valida nombre, teléfono y relación requeridos y correo opcional', () => {
  assert.equal(Object.keys(reglas.validarContacto(borrador)).length, 0);
  const errores = reglas.validarContacto({ nombre: ' ', telefono: '', parentesco: '', correo: '' });
  assert.deepEqual(Object.keys(errores).sort(), ['nombre', 'parentesco', 'telefono']);
  assert.ok(reglas.validarContacto({ ...borrador, telefono: 'llámame' }).telefono);
  assert.ok(reglas.validarContacto({ ...borrador, telefono: ' +() - ' }).telefono);
  assert.ok(reglas.validarContacto({ ...borrador, correo: 'rosa@' }).correo);
  assert.equal(
    Object.keys(
      reglas.validarContacto({ ...borrador, telefono: '988111111', correo: 'rosa@example.test' }),
    ).length,
    0,
  );
});

test('normaliza únicamente campos editables, convierte correo vacío a null y conserva el borrador', () => {
  const antes = JSON.stringify(borrador);
  const datos = reglas.datosContacto({ ...borrador, usuario_id: 'otro', orden: 4 });
  assert.equal(datos.nombre, 'Rosa García');
  assert.equal(datos.telefono, '+51 (987) 654-321');
  assert.equal(datos.parentesco, 'Hermana');
  assert.equal(datos.correo, null);
  assert.deepEqual(Object.keys(datos).sort(), ['correo', 'nombre', 'parentesco', 'telefono']);
  assert.equal(JSON.stringify(borrador), antes);
  assert.throws(() => reglas.datosContacto({ ...borrador, nombre: ' ' }));
});

test('encuentra el primer hueco para las ocho combinaciones posibles de tres posiciones', () => {
  const casos = [
    [[], 1],
    [[1], 2],
    [[2], 1],
    [[3], 1],
    [[1, 2], 3],
    [[1, 3], 2],
    [[2, 3], 1],
    [[1, 2, 3], null],
  ];
  for (const [ocupados, esperado] of casos) {
    assert.equal(reglas.siguienteOrdenContacto(ocupados.map((orden) => ({ orden }))), esperado);
  }
});

test('el borrador no modifica la fila original y los mensajes explican conflicto y pérdida de conexión', () => {
  const fila = { ...borrador, id: 'propio', orden: 2, correo: null, parentesco: null };
  const copia = reglas.borradorContacto(fila);
  copia.nombre = 'Cambiado';
  assert.notEqual(fila.nombre, copia.nombre);
  assert.equal(copia.correo, '');
  assert.match(reglas.mensajeErrorContacto({ code: '23505' }), /otro dispositivo/);
  assert.match(reglas.mensajeErrorContacto({ code: '42501' }), /permiso/);
  assert.match(reglas.mensajeErrorContacto(new TypeError('Failed to fetch')), /conexión/);
});

/** Cliente de prueba con una cola de respuestas; registra filtros y escrituras del repositorio real. */
function preparar(respuestas) {
  const llamadas = [];
  const cliente = {
    from(tabla) {
      const llamada = { tabla, filtros: [] };
      llamadas.push(llamada);
      const respuesta = respuestas.shift();
      assert.ok(respuesta, 'El repositorio realizó una consulta no esperada');
      const cadena = {
        select(columnas) {
          llamada.columnas = columnas;
          return this;
        },
        order(columna) {
          llamada.orden = columna;
          return this;
        },
        eq(columna, valor) {
          llamada.filtros.push([columna, valor]);
          return this;
        },
        insert(datos) {
          llamada.insert = datos;
          return this;
        },
        update(datos) {
          llamada.update = datos;
          return this;
        },
        delete() {
          llamada.delete = true;
          return this;
        },
        single() {
          return Promise.resolve(respuesta);
        },
        maybeSingle() {
          return Promise.resolve(respuesta);
        },
        then(bien, mal) {
          return Promise.resolve(respuesta).then(bien, mal);
        },
      };
      return cadena;
    },
  };
  return {
    llamadas,
    repo: cargar('src/repositorios/contactos.ts', {
      '@/lib/supabase': { supabase: cliente },
      '@/utilidades/contactosEmergencia': reglas,
    }),
  };
}

test('al crear consulta al dueño y reutiliza la posición libre, sin aceptar un orden del formulario', async () => {
  const { repo, llamadas } = preparar([
    { data: [{ orden: 1 }, { orden: 3 }], error: null },
    { data: { id: 'nuevo' }, error: null },
  ]);
  await repo.crearContacto('dueño', borrador);
  assert.deepEqual(llamadas[0].filtros, [['usuario_id', 'dueño']]);
  assert.equal(llamadas[1].insert.orden, 2);
  assert.equal(llamadas[1].insert.usuario_id, 'dueño');
});

test('con tres contactos no envía un INSERT adicional', async () => {
  const { repo, llamadas } = preparar([
    { data: [{ orden: 1 }, { orden: 2 }, { orden: 3 }], error: null },
  ]);
  await assert.rejects(repo.crearContacto('dueño', borrador), /3 de 3/);
  assert.equal(llamadas.length, 1);
});

test('un conflicto concurrente se propaga sin repetir la escritura', async () => {
  const conflicto = { code: '23505' };
  const { repo, llamadas } = preparar([
    { data: [{ orden: 1 }, { orden: 2 }], error: null },
    { data: null, error: conflicto },
  ]);
  await assert.rejects(repo.crearContacto('dueño', borrador), (error) => error === conflicto);
  assert.equal(llamadas.length, 2);
});

test('edición y borrado filtran tanto id como propietario y no declaran éxito con cero filas', async () => {
  for (const accion of ['editarContacto', 'eliminarContacto']) {
    const { repo, llamadas } = preparar([{ data: null, error: null }]);
    await assert.rejects(repo[accion]('dueño', 'id-ajeno', borrador), /ya no está disponible/);
    assert.deepEqual(llamadas[0].filtros, [
      ['id', 'id-ajeno'],
      ['usuario_id', 'dueño'],
    ]);
    if (accion === 'editarContacto') {
      assert.equal(llamadas[0].update.usuario_id, undefined);
      assert.equal(llamadas[0].update.orden, undefined);
    }
  }
});
