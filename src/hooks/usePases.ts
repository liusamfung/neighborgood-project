/**
 * Hooks de TanStack Query para los pases de visita (RF15 a RF22).
 *
 * Qué hace: entrega la lista de pases del residente y las mutaciones para crear y anular; para el
 * guardia, la lista de visitas de hoy y las mutaciones de validar ingreso y registrar salida. Cada
 * mutación refresca las listas (clave `['pases']`).
 * Se usa con: `src/app/residente/(tabs)/visitas.tsx`, `src/app/guardia/(tabs)/escaner.tsx` y
 * `src/app/guardia/visitas.tsx`.
 * Depende de: `src/repositorios/pases.ts` y de `QueryClientProvider` (`src/app/_layout.tsx`).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  anularPase,
  crearPase,
  listarMisPases,
  listarVisitasDeHoy,
  registrarSalida,
  validarPase,
} from '@/repositorios/pases';

/**
 * Pases del residente.
 *
 * @param residenteId id del perfil con sesión; con `undefined` la consulta no se ejecuta.
 */
export function useMisPases(residenteId: string | undefined) {
  return useQuery({
    queryKey: ['pases', 'mios', residenteId],
    queryFn: () => listarMisPases(residenteId as string),
    enabled: Boolean(residenteId),
  });
}

/** Mutación que crea un pase con la Edge Function `crear-pase` (RF15). */
export function useCrearPase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: crearPase,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pases'] }),
  });
}

/** Mutación que anula un pase vigente (RF22). */
export function useAnularPase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: anularPase,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pases'] }),
  });
}

/** Visitas de hoy que ya ingresaron (pantalla del guardia para registrar la salida, RF20). */
export function useVisitasDeHoy() {
  return useQuery({ queryKey: ['pases', 'hoy'], queryFn: listarVisitasDeHoy });
}

/** Mutación que valida el ingreso de un pase escaneado (RF18, RF19, RF20). */
export function useValidarPase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: validarPase,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pases'] }),
  });
}

/** Mutación que registra la salida de una visita (RF20). */
export function useRegistrarSalida() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: registrarSalida,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pases'] }),
  });
}
