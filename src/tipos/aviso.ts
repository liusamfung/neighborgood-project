/**
 * Tipos de los avisos: el borrador que llena la directiva en la pantalla P13 y la imagen adjunta.
 *
 * Qué hace: define lo que se edita en pantalla antes de publicar un aviso (RF7). No contiene lógica.
 * Las categorías y los sectores están en `src/tipos/catalogos.ts`.
 * Se usa con: `src/utilidades/borradorAviso.ts` (crea y valida borradores), `src/repositorios/avisos.ts`
 * (sube la imagen y envía el aviso a Supabase), `src/componentes/formulario/SelectorImagen.tsx` (produce la
 * `ImagenElegida`), `src/hooks/useCrearAviso.ts` y la pantalla `src/app/directiva/avisos/nuevo.tsx`.
 */

/** Imagen que la directiva eligió de su galería, lista para subirse al bucket `avisos`. */
export type ImagenElegida = {
  /** Ruta local del archivo en el teléfono (la devuelve el selector de imágenes). */
  uri: string;
  /** Tipo del archivo: el bucket solo admite `image/jpeg`, `image/png` e `image/webp`. */
  mimeType: string;
  /** Extensión sin punto (`jpg`, `png` o `webp`); se usa para nombrar el archivo en Storage. */
  extension: string;
};

/** Lo que la directiva llena en la pantalla P13 antes de publicar el aviso. */
export type BorradorAviso = {
  titulo: string;
  /** El "Mensaje" del mockup. Es obligatorio (`avisos.descripcion` no admite nulos). */
  descripcion: string;
  /** `null` mientras no elige una categoría. */
  categoriaId: string | null;
  /** Sectores destino (RF13). Vacío = todo el condominio. */
  sectorIds: string[];
  /** Desde cuándo lo ven los residentes. */
  vigenteDesde: Date;
  /** Hasta cuándo está vigente; debe ser posterior a `vigenteDesde`. */
  vigenteHasta: Date;
  /** Imagen adjunta opcional (RF7). */
  imagen: ImagenElegida | null;
};
