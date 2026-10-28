import type { Database, Tables } from '@/tipos/base_de_datos';

/** Rol de un usuario: viene del tipo enumerado `rol_usuario` de la base de datos. */
export type Rol = Database['public']['Enums']['rol_usuario'];

export const ROLES: readonly Rol[] = ['directiva', 'residente', 'guardia'];

/** Fila de la tabla `perfiles`, con los tipos generados por `supabase gen types`. */
export type Perfil = Tables<'perfiles'>;
