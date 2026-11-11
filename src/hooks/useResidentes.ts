/**
 * Hooks de TanStack Query para el alta y la baja de residentes (RF5).
 *
 * Qué hace: envuelve las funciones de `src/repositorios/residentes.ts` en consultas (con caché) y
 * mutaciones. Cada mutación invalida las listas para que la pantalla se actualice sola.
 * Se usa con: `src/app/directiva/residentes/index.tsx` (listas, quitar alta y dar de baja) y
 * `src/app/directiva/residentes/nuevo.tsx` (unidades y dar de alta).
 * Depende de: `src/repositorios/residentes.ts` y del `QueryClient` de `src/lib/queryClient.ts`.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  darDeAlta,
  darDeBaja,
  listarAltasPendientes,
  listarResidentes,
  listarUnidades,
  obtenerUnidad,
  quitarAlta,
} from '@/repositorios/residentes';

// Claves de caché: todas empiezan por 'residentes' para poder invalidarlas juntas.
const CLAVE = ['residentes'] as const;

/** Unidades habilitadas con su sector, para el selector del formulario de alta. */
export function useUnidades() {
  return useQuery({ queryKey: ['unidades'], queryFn: listarUnidades });
}

/**
 * Unidad del usuario con sesión, con el nombre de su sector.
 *
 * @param unidadId valor de `perfiles.unidad_id`; con `null` (directiva y guardia) no se consulta.
 */
export function useUnidad(unidadId: string | null | undefined) {
  return useQuery({
    queryKey: ['unidades', unidadId],
    queryFn: () => obtenerUnidad(unidadId as string),
    enabled: Boolean(unidadId),
    // La unidad de un residente casi nunca cambia: se reutiliza 10 minutos.
    staleTime: 10 * 60 * 1000,
  });
}

/** Altas que aún nadie usó para registrarse. */
export function useAltasPendientes() {
  return useQuery({ queryKey: [...CLAVE, 'pendientes'], queryFn: listarAltasPendientes });
}

/** Residentes ya registrados (activos y dados de baja). */
export function useResidentesRegistrados() {
  return useQuery({ queryKey: [...CLAVE, 'registrados'], queryFn: listarResidentes });
}

/** Mutación para dar de alta un correo con su unidad; al terminar refresca las listas. */
export function useDarDeAlta() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: darDeAlta,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CLAVE }),
  });
}

/** Mutación para quitar un alta pendiente; al terminar refresca las listas. */
export function useQuitarAlta() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: quitarAlta,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CLAVE }),
  });
}

/** Mutación para dar de baja a un residente (`activo = false`); al terminar refresca las listas. */
export function useDarDeBaja() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: darDeBaja,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CLAVE }),
  });
}
