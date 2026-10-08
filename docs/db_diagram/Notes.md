Cómo usarlo
Exportar a SQL: en Export, elige PostgreSQL. Antes de ejecutar el SQL en Supabase, borra el CREATE TABLE "auth"."users" y sus líneas asociadas. Esa tabla ya existe y solo la dibujé para que se vea la relación.

Estas piezas van en el SQL de migración:

Los CHECK que dejé como notas.
Los triggers: crear el perfil al registrarse, copiar el sector a la alerta, y validar la selección única de los votos.
La vista del reporte mensual de incidencias.
Las políticas RLS por rol y la función SECURITY DEFINER que consulta el rol.
