/**
 * Consulta y escrituras RF4 con TanStack Query, consumidas por la pantalla Perfil.
 * Las claves incluyen al usuario para no mostrar contactos de otra cuenta en la misma app.
 * Usa el repositorio contactos; después de cada escritura, incluso un conflicto, actualiza la lista.
 * No reintenta escrituras: una pérdida de conexión no permite saber si la anterior se guardó.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  crearContacto,
  editarContacto,
  eliminarContacto,
  listarContactos,
} from '@/repositorios/contactos';
import type { BorradorContacto, ContactoEmergencia } from '@/tipos/contacto';

/** Operaciones admitidas por el formulario y las tarjetas, sin exponer usuario ni orden editables. */
type CambioContacto =
  | { accion: 'crear'; borrador: BorradorContacto }
  | { accion: 'editar'; id: string; borrador: BorradorContacto }
  | { accion: 'eliminar'; id: string };

/** Devuelve estados de consulta y una mutación; requiere el id del perfil activo de useSesion. */
export function useContactosEmergencia(usuarioId: string | undefined) {
  const cliente = useQueryClient();
  const clave = ['contactos-emergencia', usuarioId] as const;
  const consulta = useQuery({
    queryKey: clave,
    queryFn: () => {
      if (!usuarioId) throw new Error('Inicia sesión para consultar tus contactos.');
      return listarContactos(usuarioId);
    },
    enabled: Boolean(usuarioId),
    staleTime: 0,
  });
  const cambio = useMutation({
    retry: false,
    mutationFn: async (operacion: CambioContacto): Promise<ContactoEmergencia | void> => {
      if (!usuarioId) throw new Error('Inicia sesión para administrar tus contactos.');
      switch (operacion.accion) {
        case 'crear':
          return crearContacto(usuarioId, operacion.borrador);
        case 'editar':
          return editarContacto(usuarioId, operacion.id, operacion.borrador);
        case 'eliminar':
          return eliminarContacto(usuarioId, operacion.id);
      }
    },
    onSettled: () => cliente.invalidateQueries({ queryKey: clave }),
  });
  return { consulta, cambio };
}
