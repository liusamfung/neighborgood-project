/**
 * Hooks de TanStack Query para los contactos de emergencia (RF4).
 *
 * Qué hace: entrega la lista de contactos del usuario con sesión y las mutaciones para agregar, editar
 * y borrar; cada mutación refresca la lista.
 * Se usa con: `src/app/residente/(tabs)/perfil.tsx`.
 * Depende de: `src/repositorios/contactos.ts` y de `QueryClientProvider` (`src/app/_layout.tsx`).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  agregarContacto,
  borrarContacto,
  editarContacto,
  listarContactos,
  type DatosContacto,
} from '@/repositorios/contactos';

/**
 * Contactos del usuario.
 *
 * @param usuarioId id del perfil con sesión; con `undefined` la consulta no se ejecuta.
 */
export function useContactos(usuarioId: string | undefined) {
  return useQuery({
    queryKey: ['contactos', usuarioId],
    queryFn: () => listarContactos(usuarioId as string),
    enabled: Boolean(usuarioId),
  });
}

/**
 * Mutación para guardar un contacto: con `contactoId` edita ese contacto; sin él agrega uno nuevo.
 *
 * @param usuarioId id del perfil con sesión (dueño de los contactos).
 */
export function useGuardarContacto(usuarioId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ contactoId, datos }: { contactoId: string | null; datos: DatosContacto }) =>
      contactoId ? editarContacto(contactoId, datos) : agregarContacto(usuarioId as string, datos),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contactos'] }),
  });
}

/** Mutación para borrar un contacto por su id. */
export function useBorrarContacto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: borrarContacto,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contactos'] }),
  });
}
