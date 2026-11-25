# Contexto del proyecto NeighborGood

Resumen para entender el proyecto de una sola lectura. Los detalles viven en los demás documentos de `docs/`; las reglas rápidas, en `CLAUDE.md`.

## Integración y comprobaciones de Eduardo · 25/11/2026

Liu integró los PR #73–#80 y cerró los issues #14, #19, #21, #22, #23, #36, #39
y #40. La base de la comprobación es main `503bcf4` (v1.0.0). No debe confundirse
el merge con haber ejecutado todos los casos de aceptación en todos los dispositivos.

| Requisito | Evidencia de esta sesión | Casos aún pendientes |
|---|---|---|
| RF4 | CRUD de contactos sintéticos, validación, límite, marcador sin llamar y persistencia en HONOR Android 14. | Corte de red, dos residentes distintos e iOS. |
| RF9 | Voto simple/múltiple desde HONOR; revisión/cancelación; un voto persistido y duplicado rechazado por API. | Dos residentes de la misma unidad y concurrencia entre dispositivos. |
| RF11 | Historial del HONOR: tipos, categoría y encuestas vigentes/finalizadas; accesos de creación conservados en directiva. | Más de 20 filas, cambio de cuenta y desconexión. |
| RF12 | Conteos en HONOR coincidentes con RPC; reserva antes del cierre y habilitación automática después. | Otro votante con pantalla abierta, sector ajeno y desconexión. |
| RF13 | Selector de P13/P14 en emulador; publicación P14 a un sector y lectura desde HONOR del sector. | Residente de sector ajeno y publicación P13 positiva. |
| RF27 | Historial/detalle de solo lectura del residente en HONOR y acceso a atención en directiva/emulador. | Emisión coordinada y recorrido completo de atención con dos roles. |
| RF30 | Reporte y foto sintéticos desde HONOR; gestión en emulador; aviso abierto y push recibido minimizado/cerrado. | Carreras, cuenta/token distintos y recuperación privada de eventos inciertos. |
| RF31 | Emulador: seis/doce meses, orden y ceros; agregado del servidor coincidente. | Visual de directiva en HONOR, letra ampliada y cambio de mes. |

Los documentos RF4/RF9/RF11/RF12/RF13/RF27/RF30/RF31 separan preparación histórica,
integración y evidencia actual. Las capturas privadas y las cuentas del equipo quedan
fuera de Git. El HONOR usa una APK local con JavaScript y Firebase incluidos; el
emulador usa development build. Liu informó la activación del servidor el 23/11;
esta sesión no ejecutó migraciones ni cambió secretos o permisos de Supabase.

La revisión también conserva Cerrar sesión en Incidencias de directiva mediante el
componente compartido, siguiendo la regla de no perder la salida al sustituir un
marcador. No se modifica la arquitectura ni se agregan dependencias.

Resumen transportable: [validacion-eduardo-20261125.json](pruebas/validacion-eduardo-20261125.json).
Se retiraron los contactos y las dos encuestas sin votos creados para la prueba. La
encuesta sintética con un voto quedó cerrada (la FK impide borrarla con una cuenta
normal) y el reporte sintético quedó Resuelto; su limpieza administrativa queda
identificada para Liu. No se intentó ampliar permisos para retirarlos.

## 1. Qué es
**NeighborGood** es una app móvil para condominios y urbanizaciones cerradas. Reemplaza los grupos de WhatsApp con un solo lugar para avisos, encuestas, visitas, alertas de emergencia e incidencias. Es el proyecto del curso **Desarrollo Móvil** (UTP, 2026-II, "Caso 4: Gestión de Condominios y Alerta Comunitaria").

La documentación original corresponde al **Avance 2 (semana 10)**: caso, objetivos,
requisitos, flujos, mockups, arquitectura, base de datos y planificación. Desde entonces
main incorporó los recorridos de los tres roles, publicaciones, votos, visitas,
alertas, incidencias y push de Android. El estado de validación de los requisitos de
Eduardo se detalla en la tabla anterior y en cada documento RF, sin dar por terminadas
las pruebas que allí figuran pendientes.

RF4 incorpora la administración de hasta tres contactos propios en Perfil, con formulario,
confirmación de eliminación y apertura del marcador del dispositivo. Sigue la separación
pantalla → hook → repositorio y conserva RLS como protección del servidor. La evidencia
y los límites de validación de esta implementación están en [RF4.md](RF4.md).

RF9 incorpora la votación por unidad en P5 con la RPC existente, validación de respuestas,
confirmación y caché por sesión. La guía y los límites de validación de esta implementación
están en [RF9.md](RF9.md).

RF23 incorpora el botón de pánico: la pantalla Inicio (P2) con la tarjeta roja, la pantalla para elegir
el tipo de alerta y confirmar (P3, con Médica marcada como en el mockup) y la pantalla Alerta enviada
(P3b, con la vibración y el sonido de RF24). La alerta se crea con un insert directo que permite RLS (sin
Edge Function): la app solo envía emisor, unidad y tipo, y los triggers de la base fijan sector, estado
`activa` y hora. Avisar a la guardia y a los vecinos es RF25 (issue #35), integrado en
main con Realtime y Expo Push; la configuración de Android se explica en PUSH_ANDROID.md.

Cerrar sesión: el componente `BotonCerrarSesion` (con confirmación) está en las pestañas reales del guardia
(Alertas y Escáner) y de la directiva (Avisos y Encuestas); el residente la cierra desde Perfil. El marcador
`PantallaMarcador` trae su propio botón, así que **la pantalla real que reemplace a un marcador debe incluir
`BotonCerrarSesion`** (por ejemplo, el Panel y las Incidencias de la directiva) o ese rol no podrá salir de su
cuenta ni cambiar de rol, algo necesario en la demostración final.

## 2. Roles

| Rol | Qué hace |
|---|---|
| **Residente** | Recibe avisos, vota encuestas (un voto por unidad), crea pases de visita con QR, activa alertas de pánico, reporta incidencias y administra hasta 3 contactos de emergencia. |
| **Guardia** | Recibe alertas y responde ("estoy en camino" / "atendida"), escanea el QR de las visitas y registra ingreso y salida. |
| **Directiva** | Da de alta a los residentes, publica avisos y encuestas (por sector), gestiona incidencias y consulta alertas, historial y reportes. |

## 3. Módulos
1. Gestión de usuarios y accesos.
2. Avisos y encuestas (segmentados por sector).
3. Preautorización de visitas con QR.
4. Botón de alerta temprana (Médica, Incendio, Seguridad).
5. Reporte de incidencias (con fotos y estados).

Los requisitos completos están en `docs/requisitos/REQUISITOS.md`.

## 4. Stack y por qué
| Decisión | Razón |
|---|---|
| **React Native + Expo SDK 58**, *development build* con EAS Build | Con Expo Go, las notificaciones push remotas dejaron de funcionar desde el SDK 53. El development build no depende de la versión de Expo Go. |
| **Supabase** (Postgres + RLS, Auth, Realtime, Storage, Edge Functions) | Cubre base de datos relacional, autenticación sin SMS (correo y contraseña; Google quedó fuera de alcance), tiempo real y almacenamiento de fotos, con plan gratuito. |
| **Sin NestJS** | Las Edge Functions bastan para la lógica de servidor de este alcance. |
| **Supabase sobre Firebase** | En Firebase, Storage y las Cloud Functions con HTTP saliente exigen plan pago. |
| **SQL a mano con RLS, sin Prisma** | Las políticas RLS son parte central del diseño y se controlan mejor escritas directamente. |
| **React Context + TanStack Query** | Context para sesión y rol; Query para las consultas y el caché de Supabase. |
| **Expo Push Service** (→ FCM/APNs) | Notificaciones con la app cerrada. Con la app abierta se usa Supabase Realtime. |

**Arquitectura en capas dentro de la app** (RNF7): presentación, lógica de negocio (Context + Query), acceso a datos (repositorios sobre `supabase-js`) y servicios del dispositivo (cámara, QR, vibración, notificaciones, galería).

## 5. Flujos clave
- **Alerta de pánico:** el residente elige el tipo y confirma → se inserta una fila en `alertas` (la ubicación es la de su unidad) → Realtime avisa a las apps abiertas del mismo sector, de la directiva y de los guardias; una Edge Function envía push a las apps cerradas → el personal marca "en camino" y luego "atendida" (queda en `alerta_atenciones`). Objetivo: ~3 s de llegada. Con la app cerrada, la alerta es una notificación del sistema (título, texto, sonido, canal); las pantallas a pantalla completa o los Critical Alerts de iOS necesitan permisos especiales de Apple (por verificar).
- **Pase de visita:** el residente crea el pase (nombre, fecha, hora estimada) → una Edge Function lo inserta y Postgres genera el UUID v4 (`gen_random_uuid()`) → la app **dibuja** el QR con ese UUID y lo comparte como imagen → el guardia escanea con la cámara → la Edge Function valida (vigente, de hoy, no usado ni anulado), marca `usado` y guarda `guardia_id` e `ingreso_en` → se notifica al residente. La salida se registra en `salida_en`.
- **Encuesta:** la directiva crea la encuesta (preguntas de opción única o múltiple, sectores, prioridad, apertura y cierre) → un residente envía un solo voto por unidad con sus respuestas a todas las preguntas → los resultados se ven en vivo o al cierre según `resultados_en_vivo`.
- **Registro:** la directiva da de alta un correo en `residentes_habilitados` con su unidad → solo ese correo puede crear cuenta; un trigger sobre `auth.users` lo verifica antes de crear el `perfil`.

## 6. Modelo de datos
Fuente de verdad: `docs/db_diagram/diagrama-database_dbdiagramio` (DBML para dbdiagram.io). **21 tablas propias + `auth.users`**, en seis grupos:

| Grupo | Tablas |
|---|---|
| A. Estructura | `sectores`, `unidades` |
| B. Usuarios y accesos | `residentes_habilitados`, `perfiles`, `registros_sesion`, `contactos_emergencia`, `dispositivos` |
| C. Avisos y encuestas | `categorias_aviso`, `avisos`, `aviso_sectores`, `encuestas`, `encuesta_sectores`, `encuesta_preguntas`, `encuesta_opciones`, `votos`, `voto_opciones` |
| D. Visitas | `pases_visita` |
| E. Alertas | `alertas`, `alerta_atenciones` |
| F. Incidencias | `incidencias`, `incidencia_fotos` |

Reglas del modelo que importan al programar:
- **Cómo está implementado** (`supabase/migrations/`): los helpers de RLS viven en el esquema `privado` (no expuesto por la API) como funciones `SECURITY DEFINER`; la app solo habla con `public`. Cinco funciones RPC: `crear_aviso` (guarda el aviso y sus sectores en una transacción; la imagen opcional se sube antes al bucket privado `avisos` y la función solo guarda su ruta) y `crear_encuesta` (guarda la encuesta con sus sectores, preguntas y opciones en una transacción) y `crear_incidencia` (RF29: guarda la incidencia en estado `pendiente` y sus 1 a 3 fotos en una transacción; la app genera el id, sube las fotos antes a `{usuario}/{incidencia}/{n}.ext` del bucket privado `incidencias` y la función comprueba que cada ruta empiece por la carpeta del residente y de esa incidencia; el mockup P7 traía "Título", pero la tabla no tiene esa columna y no se pide; el `INSERT` directo en `incidencias` e `incidencia_fotos` está limitado por columnas, así que un residente no puede fijar el estado ni el responsable); las tres corren con los permisos de quien las llama, así que RLS sigue aplicando, `emitir_voto` (vota por la unidad en una transacción) y `resultados_encuesta` (conteos, según `resultados_en_vivo`). Los pases los crean y validan Edge Functions (service role): `crear-pase` (RF15) ya existe; deduce el residente y la unidad del token, rechaza fechas anteriores a hoy en Lima y deja que Postgres fije el estado `vigente` y el UUID v4. `validar-pase` (RF18) revisa el pase que escanea el guardia: calcula "vencido" con el día de Lima y responde el motivo si lo rechaza; si es válido lo marca `usado` con `ingreso_en` y `guardia_id` (RF19), con `accion: salida` guarda `salida_en` (RF20) y avisa al residente por Expo Push (RF21). `pases_visita` también está en Realtime para el aviso con la app abierta. Las alertas de pánico (RF25) llegan con la app abierta por Realtime (`alertas` ya está publicada; RLS deja ver a cada residente solo las de su sector) y con la app cerrada por push: después de crear la alerta, la app llama a `notificar-alerta`, que solo acepta la alerta activa y reciente del propio emisor y avisa a los vecinos del sector, la directiva y los guardias. Se llama desde la app en vez de un Database Webhook para no configurar el webhook ni guardar una clave en él. **Push en Android (issue #7):** la app registra el token de Expo Push de cada teléfono con `registrar_dispositivo` al iniciar sesión y lo quita de `dispositivos` al cerrarla. Es `SECURITY DEFINER` (única excepción a las funciones INVOKER): el token es único y RLS oculta la fila de la cuenta anterior, así que cuando el mismo teléfono cambia de cuenta un `insert` fallaría; la función mueve el token a quien llama. Con la app abierta, una push cuyo `data.tipo` es `alerta`, `incidencia` o `ingreso_visita` no se muestra como banner porque su aviso ya llega por Realtime. Android necesita Firebase (FCM): `google-services.json` se mantiene fuera de git como variable de archivo secreta `GOOGLE_SERVICES_JSON` de EAS (la lee `app.config.js`) y la clave de cuenta de servicio se sube a EAS; iOS con cuenta gratuita queda fuera. Guía de instalación en `docs/PUSH_ANDROID.md`.
- **Registro "suave":** un trigger sobre `auth.users` crea el `perfil` solo si el correo confirmado está en `residentes_habilitados`. Si no, no hay perfil: RLS no deja ver nada y la app cierra la sesión con "Tu correo no está habilitado". La directiva y los guardias se crean a mano.
- **Alertas:** la app solo informa unidad, tipo y emisor; el estado, el sector y la hora los fijan triggers. El personal responde insertando en `alerta_atenciones` y un trigger actualiza `alertas.estado`.
- `perfiles.rol` ∈ `directiva | residente | guardia`; un residente siempre tiene `unidad_id`.
- Sectores: `torre | pabellon | manzana`. Avisos y encuestas usan `para_todos` más una tabla de sectores (separadas entre sí).
- Un voto por unidad y encuesta (`votos` único en `encuesta_id, unidad_id`).
- Máximo 3 contactos de emergencia por usuario (`orden` entre 1 y 3).
- Máximo 3 fotos por incidencia (`orden` entre 1 y 3); el mínimo de 1 lo valida la app.
- **Estados:** alertas `activa | en_camino | atendida`; incidencias `pendiente | en_atencion | resuelto`; pases `vigente | usado | anulado`.
- `alertas.sector_id` lo llena un trigger a partir de la unidad, para filtrar Realtime por sector.
- **Historial de alertas (RF28):** la directiva y el guardia lo abren con "Ver historial" de Atención de alertas. Lee `alertas` y `alerta_atenciones` directo, porque RLS ya les deja ver todas, y filtra por tipo y estado.
- El reporte mensual de incidencias sale de una vista con `GROUP BY date_trunc('month', creada_en)`.
- En las políticas RLS, usar funciones `SECURITY DEFINER` para evitar recursión.

El diccionario de datos completo está en `docs/db_diagram/NeighborGood_Diccionario_de_Datos.xlsx`.

## 7. Diseño
Identidad **"Vecindario cálido"**: teal `#0F766E`, ámbar `#F59E0B`, tipografía Inter, sin logotipo (un ícono de casa con check sobre un cuadrado redondeado teal). Son 15 pantallas más 2 estados (P3b y P14b), en `docs/design/`. Detalle y mapa de pantallas en `docs/design/DISENO.md`.

## 8. Documentos y diagramas del repo
- **Flujos por rol:** `docs/Flujos/` (3 `.puml`).
- **C4:** `docs/Arquitectura/` (contexto, contenedores, componentes de la app, despliegue).
- **Secuencia:** 18 archivos `diagramaN_M_*.puml` (5 grupos: usuarios, avisos/encuestas, visitas, alertas, incidencias).
- Los diagramas usan la **numeración RF corregida** (RF1 a RF31, sin huecos). La tabla de equivalencias con el Google Doc original está en `REQUISITOS.md`.

## 9. Pendientes conocidos (antes de programar)
1. **Inicio de sesión con Google: fuera de alcance** (issue #4, cerrado como "no planificado" el 24/11/2026). Decisión de Liu: no hubo tiempo para configurar OAuth en Google Cloud y en Supabase, y se le avisará al profesor. El inicio de sesión con correo y contraseña ya funciona (RF2): la migración está ejecutada y verificada en el proyecto real, las cuentas de directiva, guardia y residente existen, y la app lee el rol real desde `perfiles`. El rol de desarrollo `EXPO_PUBLIC_ROL_DEV` se eliminó.
2. **Corregir los mockups** donde contradicen el modelo (lista en `DISENO.md`).
3. **Notificaciones push de Android:** FCM y las credenciales de EAS ya están configurados y probados en un Android real (issue #7, PR #93). Falta decidir qué hacer con el plugin `NEIGHBORGOOD_SIN_PUSH_ONLY_IPHONE` cuando haya cuenta de pago.
4. **Decisiones técnicas por cerrar:** navegación (Expo Router, ya instalado, con rutas en `src/app/`), librería de componentes (React Native Paper, por confirmar con SDK 58), librería de gráficos para el reporte mensual (RF31).
5. **Pantallas sin mockup** pero necesarias (lista en `DISENO.md`).

## 10. Riesgos
- **Supabase gratuito pausa el proyecto tras 7 días sin actividad de base de datos** (pasó el 21 nov. 2026). Mitigación: el workflow `latido-supabase.yml` llama cada 3 días a `public.latido()` (migración 9); necesita los secretos `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY`. Un ping a Auth no cuenta como actividad.
- **Push con la app cerrada** depende de las políticas de cada fabricante; probar en dispositivos reales desde temprano.
- **Push en iOS** exige una cuenta de Apple Developer (de pago) para APNs. La plataforma objetivo es multiplataforma; en Android las push usan FCM sin costo. Decidir antes del Sprint 5 cómo se demostrará en iOS.

## 11. Fuera de alcance por ahora
- Correo simulado de alerta con la ubicación (RF26).
- Inicio de sesión por celular/SMS.
- Mapas: la ubicación de la alerta es la unidad.

## Preparación RF30 — 22/11/2026 (histórica, integrada en PR #79)

RF30 integra la cola técnica `incidencia_notificaciones`, privada y con RLS sin acceso
del cliente. El trigger inserta el evento en la misma transacción; el webhook de INSERT
llama a `notificar-incidencia` con un secreto de servidor. La reserva evita reenviar al
duplicar el webhook. Liu confirmó su activación el 23/11; la recepción real del HONOR
se comprobó el 24–25/11. Ver `docs/RF30.md` para alcance, recibos y recuperación de
resultados inciertos. No se deben editar a mano los tipos generados.

## Preparación RF31 — 22/11/2026 (histórica, integrada en PR #80)

RF31 usa barras nativas View/Text y texto accesible sin librería adicional. Consulta
la vista existente por mes de Lima con RLS. PR #92 añadió el mes actual primero; el
contraste con la vista real y sus límites se registran en `docs/RF31.md`. Se conserva
el enlace de atención de alertas de RF27 junto a la gráfica.
