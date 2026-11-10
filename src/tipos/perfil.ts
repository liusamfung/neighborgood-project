/**
 * Tipos del perfil de usuario (rol y fila de `perfiles`).
 *
 * Qué hace: da nombres cortos a los tipos que genera Supabase para que el resto de la app no
 * repita `Database['public']...`. No contiene lógica.
 * Se usa con: `src/contexto/SesionContext.tsx` (sesión, perfil y rol), `src/app/index.tsx`
 * (a qué pantalla va cada rol) y `src/repositorios/perfiles.ts` (lo que devuelve la consulta).
 * Depende de: `src/tipos/base_de_datos.ts` (generado con `npm run db:tipos`).
 */
import type { Database, Tables } from '@/tipos/base_de_datos';

/** Rol de un usuario: viene del tipo enumerado `rol_usuario` de la base de datos. */
export type Rol = Database['public']['Enums']['rol_usuario'];

/** Los tres roles de la app; sirve para comprobar que un valor recibido es un rol válido. */
export const ROLES: readonly Rol[] = ['directiva', 'residente', 'guardia'];

/** Fila de la tabla `perfiles`, con los tipos generados por `supabase gen types`. */
export type Perfil = Tables<'perfiles'>;
