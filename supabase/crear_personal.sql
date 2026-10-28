-- =====================================================================
-- NeighborGood · crear cuentas en el proyecto REAL (plantilla)
--
-- Este archivo es una PLANTILLA: no guardes aquí correos ni contraseñas reales.
-- Elige tú las contraseñas (12 caracteres o más, guárdalas en tu gestor de contraseñas).
-- Antes de empezar ejecuta supabase/catalogo_inicial.sql (los residentes necesitan una unidad).
--
-- Las cuentas se crean en el panel: Authentication → Users → Add user → Create new user,
-- con el correo y la contraseña, y marcando "Auto Confirm User".
-- =====================================================================

-- ───────────── A. Directiva y guardia ─────────────
-- 1. Crea el usuario en el panel (ver arriba) y copia su UUID.
-- 2. Reemplaza los valores entre < > y ejecuta este bloque. Repítelo por cada cuenta.
insert into public.perfiles (id, nombre, apellido, telefono, rol)
values (
  '<UUID DEL USUARIO>',
  '<Nombre>',
  '<Apellido>',
  null,                       -- o '<teléfono>'
  '<directiva o guardia>'     -- escribe exactamente directiva o guardia
);

-- ───────────── B. Un residente para una demostración (sin la app) ─────────────
-- La directiva habilitará residentes desde la app más adelante. Mientras tanto:
-- 1. Habilita su correo con este bloque (el correo va en minúsculas y sin espacios).
--    Necesita que ya exista el perfil de la directiva (bloque A).
insert into public.residentes_habilitados (unidad_id, nombre, correo, creado_por)
values (
  (select u.id from public.unidades u where u.codigo = '<código de unidad, por ejemplo A-101>'),
  '<Nombre y apellido>',
  '<correo en minúsculas>',
  (select p.id from public.perfiles p where p.rol = 'directiva' order by p.creado_en limit 1)
);
-- 2. Crea el usuario en el panel con ESE mismo correo y "Auto Confirm User".
--    El trigger de la base le crea el perfil de residente en la unidad indicada.

-- ───────────── Comprobación ─────────────
-- Debe listar cada cuenta con su rol (un usuario sin perfil no puede entrar a la app).
select u.email, p.rol, p.nombre, p.apellido, p.activo
  from auth.users u
  left join public.perfiles p on p.id = u.id
 order by p.rol nulls last, u.email;
