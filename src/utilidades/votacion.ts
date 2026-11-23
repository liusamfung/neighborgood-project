/**
 * Reglas puras de RF9: selección única/múltiple, plazo y envío de todas las preguntas.
 * Las consumen la pantalla P5, el repositorio y las pruebas sin red.
 * No calculan la unidad ni confían en un bloqueo visual: la RPC valida el voto definitivo.
 */
import type { OpcionVoto, PreguntaVotacion, SeleccionesVoto } from '@/tipos/votacion';

/** Comprueba los límites exactos: apertura incluida y cierre excluido, igual que la RPC. */
export function encuestaAbierta(abre: string, cierra: string, ahora = Date.now()): boolean {
  return Date.parse(abre) <= ahora && ahora < Date.parse(cierra);
}

/** Rechaza parámetros de ruta incompletos antes de consultar una columna UUID. */
export function idEncuestaValido(id: unknown): id is string {
  return typeof id === 'string' && /^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i.test(id);
}

/** Cambia una opción publicada sin mutar el borrador ni admitir opciones ajenas. */
export function alternarRespuesta(
  actual: SeleccionesVoto,
  pregunta: PreguntaVotacion,
  opcionId: string,
): SeleccionesVoto {
  if (!pregunta.opciones.some((o) => o.id === opcionId)) return actual;
  const elegidas = actual[pregunta.id] ?? [];
  const siguiente =
    pregunta.seleccion === 'unica'
      ? [opcionId]
      : elegidas.includes(opcionId)
        ? elegidas.filter((id) => id !== opcionId)
        : [...elegidas, opcionId];
  return { ...actual, [pregunta.id]: siguiente };
}

/** Exige una respuesta válida por pregunta; no envía ids adicionales del estado local. */
export function prepararVoto(
  preguntas: readonly PreguntaVotacion[],
  seleccion: SeleccionesVoto,
): OpcionVoto[] {
  if (!preguntas.length) throw new Error('Esta encuesta todavía no tiene preguntas disponibles.');
  return preguntas.flatMap((p, indice) => {
    const ids = [...new Set(seleccion[p.id] ?? [])];
    if (!ids.length) throw new Error(`Responde la pregunta ${indice + 1}.`);
    if (p.seleccion === 'unica' && ids.length !== 1)
      throw new Error(`Elige una sola opción en la pregunta ${indice + 1}.`);
    if (ids.some((id) => !p.opciones.some((o) => o.id === id)))
      throw new Error('Las opciones cambiaron. Actualiza la encuesta y revisa tus respuestas.');
    return ids.map((opcion_id) => ({ pregunta_id: p.id, opcion_id }));
  });
}

/** Traduce fallos del servidor sin mostrar consultas SQL ni detalles de otras unidades. */
export function mensajeErrorVoto(error: unknown): string {
  const codigo = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
  if (codigo === '23505') return 'Tu unidad ya votó en esta encuesta.';
  if (codigo === '42501')
    return 'No tienes permiso para votar en esta encuesta. Actualiza tu sesión.';
  if (codigo === 'P0002') return 'La encuesta ya no está disponible.';
  if (codigo === '22023' || codigo === '23514')
    return 'La encuesta está cerrada o las respuestas cambiaron. Actualiza y revísalas.';
  return 'No pudimos confirmar el envío. Actualiza la encuesta antes de volver a intentarlo.';
}
