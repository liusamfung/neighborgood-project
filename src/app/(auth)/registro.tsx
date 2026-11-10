/**
 * Ruta `/registro` (rol sin sesión): Crear cuenta (sin mockup, ver docs/design/DISENO.md).
 * Provisional: hoy muestra un marcador con `PantallaMarcador`. Implementará RF1: solo con un correo habilitado por la directiva (Sprint 3).
 * Se usa con: `src/componentes/PantallaMarcador.tsx` y `(auth)/_layout.tsx`.
 */
import { PantallaMarcador } from '@/componentes/PantallaMarcador';

export default function Registro() {
  return (
    <PantallaMarcador
      titulo="Crear cuenta"
      requisitos="RF1: solo con un correo habilitado por la directiva"
    />
  );
}
