-- =====================================================================
-- NeighborGood · Parte 9: función correo_habilitado (RF1)
--
-- Responde si un correo puede crear su cuenta de residente: si la directiva lo dio de alta en
-- residentes_habilitados (RF5), todavía no se usó para registrarse y su unidad está habilitada. Son
-- las mismas condiciones que usa el trigger privado.crear_perfil_al_registrarse (parte 3).
--
-- Por qué existe: el proyecto exige confirmar el correo. Sin esta comprobación, Supabase Auth crea la
-- cuenta de cualquier correo (sin perfil) y la app solo podía rechazarlo después, al iniciar sesión.
-- El criterio de aceptación de RF1 pide rechazar el registro en el momento, con el mensaje "Tu correo
-- no está habilitado. Contacta a la directiva". La app llama a esta función antes de crear la cuenta.
--
-- Es SECURITY DEFINER porque quien se registra todavía no tiene sesión (rol anon) y las políticas RLS no
-- le dejan leer residentes_habilitados (parte 5). Solo devuelve verdadero o falso: no revela el nombre,
-- la unidad ni ningún otro dato del alta.
--
-- Se relaciona con: la tabla residentes_habilitados y unidades (parte 1), el CHECK de correo normalizado
-- (parte 2) y el trigger de registro (parte 3). La app la llama desde src/repositorios/sesion.ts
-- (pantalla Crear cuenta). Se prueba en supabase/tests/database/09_correo_habilitado.test.sql.
-- =====================================================================
begin;

-- Devuelve true si p_correo tiene un alta sin usar y con la unidad habilitada.
--   p_correo: se normaliza igual que en residentes_habilitados (minúsculas, sin espacios a los lados).
create or replace function public.correo_habilitado(p_correo text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
      from public.residentes_habilitados h
      join public.unidades u on u.id = h.unidad_id and u.habilitada
     where h.correo = lower(btrim(p_correo))
       and not h.registrado
  );
$$;

-- Quien se registra todavía no tiene sesión (anon); también la puede llamar alguien con sesión.
revoke execute on function public.correo_habilitado(text) from public;
grant execute on function public.correo_habilitado(text) to anon, authenticated, service_role;

commit;
