Cómo usarlo
Exportar a SQL: en Export, elige PostgreSQL. Antes de ejecutar el SQL en Supabase, borra el CREATE TABLE "auth"."users" y sus líneas asociadas. Esa tabla ya existe y solo la dibujé para que se vea la relación.

Estas piezas van en el SQL de migración:

Los CHECK que dejé como notas.
Los triggers: crear el perfil al registrarse, copiar el sector a la alerta, y validar la selección única de los votos.
La vista del reporte mensual de incidencias.
Las políticas RLS por rol y la función SECURITY DEFINER que consulta el rol.

Estado de la migración (octubre de 2026)
Todo lo de esta lista ya está escrito en supabase/migrations/ (6 partes), con datos de prueba en supabase/seed.sql, pruebas en supabase/tests/ y un script de verificación en supabase/verificacion.sql. Se probó en un Supabase local con Docker (supabase test db: 192 pruebas). Falta ejecutarlo en el proyecto real (ver el README).
Añadido respecto al modelo: el esquema privado con las funciones auxiliares de RLS, las funciones emitir_voto y resultados_encuesta, y los buckets de Storage avisos e incidencias con sus políticas.
