/** RF13: elección explícita de destinatarios compartida por P13/P14 y DestinoPublicacion.
 * Complementa las RPC existentes; la base sigue imponiendo permisos por RLS.
 */
export type ModoDestino = 'todos' | 'sectores';

/** Una selección vacía o desactualizada no debe convertirse en publicación para todos. */
export function errorDestino(modo: ModoDestino, ids: string[], disponibles: string[]) {
  if (modo === 'todos') return ids.length ? 'Vuelve a elegir los destinatarios.' : null;
  if (!ids.length) return 'Elige al menos un sector o selecciona Todo el condominio.';
  if (ids.some((id) => !disponibles.includes(id)))
    return 'Un sector ya no está disponible. Revisa los destinatarios.';
  return null;
}
