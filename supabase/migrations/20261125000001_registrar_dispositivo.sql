-- =====================================================================
-- NeighborGood · Parte 11: función registrar_dispositivo (push en Android, issue #7)
--
-- Guarda el token de Expo Push del teléfono de quien inició sesión en `dispositivos`, para que las Edge
-- Functions (validar-pase, notificar-alerta, notificar-incidencia) puedan avisarle aunque la app esté cerrada.
--
-- Por qué es una función y no un `insert` desde la app: `expo_push_token` es único y las políticas RLS de la
-- parte 5 solo dejan ver y cambiar las filas propias. Cuando un mismo teléfono cambia de cuenta (por
-- ejemplo, el guardia sale y entra la directiva), el token sigue en la fila de la cuenta anterior: la app
-- nueva no la ve, así que un `insert` fallaría por llave duplicada y un `update` no encontraría la fila.
-- Esta función mueve el token a quien llama, que es lo correcto: un teléfono tiene un solo dueño a la vez.
--
-- Es SECURITY DEFINER (a diferencia de crear_aviso o crear_incidencia, que son INVOKER) justamente para poder
-- mover una fila que RLS no deja ver. Por eso hace sus propias comprobaciones: exige sesión y un perfil
-- activo, valida el formato del token y solo escribe a nombre de `auth.uid()`; nunca recibe el usuario. El
-- riesgo que se acepta: quien ya conociera el token de otro teléfono podría reasignárselo; los tokens no son
-- públicos (solo viajan entre el teléfono, Supabase y Expo), así que se considera aceptable.
--
-- Quitar el token al cerrar sesión no necesita función: `delete` sobre las filas propias ya lo permite RLS.
--
-- Se relaciona con: la tabla dispositivos (parte 1), su política "cada usuario gestiona los suyos" (parte 5)
-- y privado.es_usuario_activo (parte 3). La app la llama desde src/repositorios/dispositivos.ts; los tokens
-- se leen en las Edge Functions. Se prueba en supabase/tests/database/13_registrar_dispositivo.test.sql.
-- =====================================================================
begin;

-- Registra (o mueve) el token del teléfono a nombre del usuario con sesión.
--   p_token: token de Expo Push, por ejemplo `ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]`.
--   p_plataforma: `android` o `ios`.
-- Si el token ya existe, pasa a ser de quien llama y se actualiza `actualizado_en`; si no, se crea.
-- Errores: 42501 si no hay sesión o el perfil no está activo; 22023 si el token no tiene el formato de Expo.
create or replace function public.registrar_dispositivo(
  p_token      text,
  p_plataforma public.plataforma_dispositivo
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_usuario uuid := (select auth.uid());
begin
  if v_usuario is null or not privado.es_usuario_activo() then
    raise exception 'Solo un usuario activo puede registrar su teléfono' using errcode = '42501';
  end if;
  -- Mismo formato que aceptan las Edge Functions antes de mandar un push.
  if p_token is null or p_token !~ '^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$' then
    raise exception 'El token de notificaciones no tiene el formato de Expo' using errcode = '22023';
  end if;
  if p_plataforma is null then
    raise exception 'Falta la plataforma del teléfono' using errcode = '22023';
  end if;

  insert into public.dispositivos (usuario_id, expo_push_token, plataforma)
  values (v_usuario, p_token, p_plataforma)
  on conflict (expo_push_token) do update
    set usuario_id     = excluded.usuario_id,
        plataforma     = excluded.plataforma,
        actualizado_en = now();
end;
$$;

-- Solo la usan las cuentas con sesión (la app). Nunca `anon` ni el público.
revoke execute on function public.registrar_dispositivo(text, public.plataforma_dispositivo) from public, anon;
grant  execute on function public.registrar_dispositivo(text, public.plataforma_dispositivo) to authenticated, service_role;

commit;
