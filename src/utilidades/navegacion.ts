/**
 * Utilidades de navegación compartidas por los formularios.
 *
 * Qué hace: `volverA` cierra un formulario después de guardar. Vuelve a la pantalla anterior y, si no
 * hay ninguna (se llegó por un enlace directo o se recargó la página en web), abre la lista indicada.
 * Así el formulario siempre se descarta al terminar y no queda abierto con los mismos datos.
 * Se usa con: `src/app/directiva/avisos/nuevo.tsx`, `src/app/directiva/encuestas/nueva.tsx` y
 * `src/app/directiva/residentes/nuevo.tsx`.
 * Depende de: el `router` de `expo-router`.
 */
import type { Href, useRouter } from 'expo-router';

/** El objeto que devuelve `useRouter()` (su tipo exportado es genérico y más incómodo de usar). */
type Enrutador = ReturnType<typeof useRouter>;

/**
 * Cierra la pantalla actual y vuelve a la lista de la que salió.
 *
 * @param router el que devuelve `useRouter()` en la pantalla.
 * @param respaldo ruta de la lista, que se abre solo si no hay una pantalla anterior.
 */
export function volverA(router: Enrutador, respaldo: Href): void {
  if (router.canGoBack()) router.back();
  else router.replace(respaldo);
}
