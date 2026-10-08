# Contexto del proyecto NeighborGood

Resumen para entender el proyecto de una sola lectura. Los detalles viven en los demás documentos de `docs/`; las reglas rápidas, en `CLAUDE.md`.

## 1. Qué es
**NeighborGood** es una app móvil para condominios y urbanizaciones cerradas. Reemplaza los grupos de WhatsApp con un solo lugar para avisos, encuestas, visitas, alertas de emergencia e incidencias. Es el proyecto del curso **Desarrollo Móvil** (UTP, 2026-II, "Caso 4: Gestión de Condominios y Alerta Comunitaria").

Está en la etapa de **Avance 2 (semana 10)**: se entrega documentación (caso, objetivos, requisitos, flujos y mockups, arquitectura, base de datos, planificación). **Aún no hay código.**

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
| **React Native + Expo SDK 57**, *development build* con EAS Build | Con Expo Go, las notificaciones push remotas dejaron de funcionar desde el SDK 53. El development build no depende de la versión de Expo Go. |
| **Supabase** (Postgres + RLS, Auth, Realtime, Storage, Edge Functions) | Cubre base de datos relacional, autenticación sin SMS (correo y Google), tiempo real y almacenamiento de fotos, con plan gratuito. |
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
- `perfiles.rol` ∈ `directiva | residente | guardia`; un residente siempre tiene `unidad_id`.
- Sectores: `torre | pabellon | manzana`. Avisos y encuestas usan `para_todos` más una tabla de sectores (separadas entre sí).
- Un voto por unidad y encuesta (`votos` único en `encuesta_id, unidad_id`).
- Máximo 3 contactos de emergencia por usuario (`orden` entre 1 y 3).
- Máximo 3 fotos por incidencia (`orden` entre 1 y 3); el mínimo de 1 lo valida la app.
- **Estados:** alertas `activa | en_camino | atendida`; incidencias `pendiente | en_atencion | resuelto`; pases `vigente | usado | anulado`.
- `alertas.sector_id` lo llena un trigger a partir de la unidad, para filtrar Realtime por sector.
- El reporte mensual de incidencias sale de una vista con `GROUP BY date_trunc('month', creada_en)`.
- En las políticas RLS, usar funciones `SECURITY DEFINER` para evitar recursión.

El diccionario de datos completo está en `docs/db_diagram/NeighborGood_Diccionario_de_Datos.xlsx`.

## 7. Diseño
Identidad **"Vecindario cálido"**: teal `#0F766E`, ámbar `#F59E0B`, tipografía Inter, sin logotipo (un ícono de casa con check sobre un cuadrado redondeado teal). Son 15 pantallas más 2 estados (P3b y P14b), en `docs/design/`. Detalle y mapa de pantallas en `docs/design/DISENO.md`.

## 8. Documentos y diagramas del repo
- **Flujos por rol:** `docs/Flujos/` (3 `.puml`).
- **C4:** `docs/Arquitectura/` (contexto, contenedores, componentes de la app, despliegue).
- **Secuencia:** 18 archivos `diagramaN_M_*.puml` (5 grupos: usuarios, avisos/encuestas, visitas, alertas, incidencias).
- Los diagramas usan la **numeración RF original** (con huecos y un duplicado; ver `REQUISITOS.md`).

## 9. Pendientes conocidos (antes de programar)
1. **Corregir la numeración de los RF** (huecos en 7, 23 y 30; RF15 duplicado) y propagarla a los diagramas de secuencia.
2. **Corregir dos diagramas:** `diagrama4_2_difusionTiempoReal.puml` aún incluye el correo simulado, y `diagrama4_1_activacionAlerta.puml` dice "obtener ubicación del dispositivo (RF27)"; la ubicación es la de la unidad y el correo está fuera de alcance.
3. **Escribir el SQL de migración con RLS**, a mano y en partes, a partir del DBML (tipos, tablas, restricciones, funciones, triggers, vista del reporte mensual y políticas RLS por rol). Aún no existe.
4. **Corregir los mockups** donde contradicen el modelo (lista en `DISENO.md`).
5. **Definir el número de toques** del RNF4.
6. **Decisiones técnicas por cerrar:** navegación (se asume Expo Router), librería de componentes (React Native Paper, por confirmar con SDK 57), librería de gráficos para el reporte mensual (RF33).
7. **Pantallas sin mockup** pero necesarias (lista en `DISENO.md`).

## 10. Riesgos
- **Supabase gratuito pausa el proyecto tras 7 días sin actividad.** Antes de cada demo hay que entrar al panel, o programar un ping semanal con GitHub Actions.
- **Push con la app cerrada** depende de las políticas de cada fabricante; probar en dispositivos reales desde temprano.

## 11. Fuera de alcance por ahora
- Correo simulado de alerta con la ubicación (RF27).
- Inicio de sesión por celular/SMS.
- Mapas: la ubicación de la alerta es la unidad.
