/**
 * Hooks de TanStack Query para los pases de visita (RF15 a RF22).
 *
 * Qué hace: entrega la lista de pases del residente y las mutaciones para crear y anular; para el
 * guardia, la lista de visitas de hoy y las mutaciones de validar ingreso y registrar salida. Cada
 * mutación refresca las listas (clave `['pases']`).
 * Cómo funciona: anular y registrar la salida, además de refrescar, corrigen la lista guardada en
 * caché en el mismo instante. Así el botón de esa fila desaparece de inmediato y no se puede repetir
 * la acción mientras llega la lista nueva.
 * `useAvisoDeIngreso` es distinto: no consulta nada, escucha por Realtime y avisa al residente cuando
 * su visita ingresa (RF21).
 * Se usa con: `src/app/residente/_layout.tsx` (`useAvisoDeIngreso`), `src/app/residente/(tabs)/index.tsx`,
 * `src/app/residente/(tabs)/visitas.tsx`, `src/app/guardia/(tabs)/escaner.tsx` y
 * `src/app/guardia/visitas.tsx`.
 * Depende de: `src/repositorios/pases.ts`, `useSesion`, `useMensaje` y `QueryClientProvider`
 * (`src/app/_layout.tsx`).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useEffectEvent } from 'react';

import { useMensaje } from '@/contexto/MensajeContext';
import { useSesion } from '@/contexto/SesionContext';
import {
  anularPase,
  crearPase,
  escucharMisPases,
  listarMisPases,
  listarVisitasDeHoy,
  registrarSalida,
  validarPase,
  type Pase,
  type PaseGuardia,
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
    onSuccess: (_resultado, paseId) => {
      // El pase queda anulado en la caché al instante; la consulta de abajo trae `anulado_en`.
      queryClient.setQueriesData<Pase[]>({ queryKey: ['pases', 'mios'] }, (pases) =>
        pases?.map((p) => (p.id === paseId ? { ...p, estado: 'anulado' as const } : p)),
      );
      return queryClient.invalidateQueries({ queryKey: ['pases'] });
    },
  });
}

/**
 * Avisa al residente cuando una de sus visitas ingresa (RF21, con la app abierta).
 *
 * Cómo funciona: mientras el layout del residente está montado, escucha por Realtime los cambios de
 * sus pases. Cuando el guardia valida el ingreso, el pase pasa a `usado`: aparece la franja "Tu visita
 * ingresó" en la pantalla que esté abierta y las listas de pases se refrescan. Al salir del layout
 * (cerrar sesión) deja de escuchar.
 * Se usa con: `src/app/residente/_layout.tsx`. Con la app cerrada el aviso llega por push: lo envía
 * la Edge Function `validar-pase`.
 */
export function useAvisoDeIngreso() {
  const { perfil } = useSesion();
  const { mostrarMensaje } = useMensaje();
  const queryClient = useQueryClient();
  const residenteId = perfil?.id;

  // `useEffectEvent` deja leer siempre la versión más reciente de `mostrarMensaje` sin que el efecto
  // de abajo tenga que volver a suscribirse cada vez que la pantalla se redibuja.
  const alCambiar = useEffectEvent((pase: Pase) => {
    // Ingreso recién registrado: el pase está `usado`, tiene hora de ingreso y aún no tiene salida.
    if (pase.estado === 'usado' && pase.ingreso_en && !pase.salida_en) {
      mostrarMensaje(`🔔 Tu visita ${pase.nombre_visitante} ingresó al condominio`, 'info');
    }
    queryClient.invalidateQueries({ queryKey: ['pases'] });
  });

  useEffect(() => {
    if (!residenteId) return;
    return escucharMisPases(residenteId, (pase) => alCambiar(pase));
  }, [residenteId]);
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
    onSuccess: (pase) => {
      // La visita queda con su hora de salida en la caché al instante: su botón desaparece.
      queryClient.setQueriesData<PaseGuardia[]>({ queryKey: ['pases', 'hoy'] }, (visitas) =>
        visitas?.map((v) => (v.id === pase.id ? { ...v, salida_en: pase.salida_en } : v)),
      );
      return queryClient.invalidateQueries({ queryKey: ['pases'] });
    },
  });
}
