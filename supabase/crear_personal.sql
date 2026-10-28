-- =====================================================================
-- NeighborGood · crear una cuenta de directiva o de guardia
--
-- Los residentes se registran solos (si la directiva habilitó su correo); el personal no.
-- 1. En el panel de Supabase: Authentication → Users → Add user → Create new user.
--    Escribe el correo y una contraseña, y marca "Auto Confirm User".
-- 2. Copia el UUID del usuario que se creó.
-- 3. Reemplaza los valores entre < > y ejecuta este bloque en el SQL Editor.
--
-- Este archivo es una plantilla: no guardes aquí correos ni contraseñas reales.
-- =====================================================================
insert into public.perfiles (id, nombre, apellido, telefono, rol)
values (
  '<UUID DEL USUARIO>',
  '<Nombre>',
  '<Apellido>',
  '<Teléfono o null>',
  '<directiva o guardia>'
);
