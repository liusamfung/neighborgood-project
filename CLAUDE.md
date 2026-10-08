# NeighborGood

App móvil de gestión de condominios y alerta comunitaria, hecha para el curso **Desarrollo Móvil** (UTP, 2026-II). Roles: **Directiva**, **Residente** y **Guardia**.

## Estado actual
Solo hay documentación en `docs/`. **Todavía no hay código de la app.** Antes de escribir código, lee los documentos de abajo y usa el modo Plan.

## Idioma y estilo
- Todo en español: respuestas, documentos, comentarios, mensajes de commit y diagramas. Solo cambia de idioma si el usuario lo pide.
- Los nombres del dominio siguen el modelo de datos (tablas y columnas en español, `snake_case`). Ejemplo: `pases_visita`, `unidad_id`.

## Stack (decidido)
- **App:** React Native + Expo SDK 57, con *development build* (`expo-dev-client` + EAS Build). **No usar Expo Go**: no soporta push remotas desde el SDK 53.
- **Backend:** Supabase (Auth con correo y Google, Postgres con RLS, Realtime, Storage, Edge Functions en Deno/TypeScript). **Sin NestJS.**
- **Estado en la app:** React Context (sesión y rol) + TanStack Query (consultas a Supabase).
- **Notificaciones:** Expo Push Service (→ FCM/APNs). Realtime para la app abierta; push para la app cerrada.
- **Dispositivo:** `expo-camera` (escáner QR), `react-native-qrcode-svg` (dibujar el QR), `expo-notifications`, `expo-image-picker`, `expo-haptics`/`Vibration`.
- **Migraciones:** SQL escrito a mano (con RLS), ejecutado en el SQL Editor de Supabase. **Sin Prisma.**

## Reglas que no se negocian
1. **Ningún secreto en el repo.** La `service_role key` vive solo en las Edge Functions (variables de entorno de Supabase). La app solo lleva la `anon key`.
2. **RLS activada en todas las tablas.** Los permisos por rol se imponen en la base, no solo en la app.
3. **El pase QR:** la Edge Function crea y valida el UUID v4 (`gen_random_uuid()`); la app solo dibuja el QR. El pase vale solo el día de la visita, hasta las 23:59 (zona `America/Lima`). El estado "vencido" no se guarda: se calcula al escanear.
4. **La alerta de pánico** guarda solo la ubicación del departamento (la unidad). Sin proveedor de mapas.
5. **El correo simulado de alerta está fuera de alcance** (próxima feature). No implementarlo.
6. Los residentes solo pueden registrarse si la directiva los dio de alta antes (`residentes_habilitados`).

## Dónde está cada cosa
| Qué | Dónde |
|---|---|
| Contexto completo del proyecto | `docs/CONTEXTO.md` |
| Requisitos funcionales y no funcionales | `docs/requisitos/REQUISITOS.md` |
| Sistema de diseño, mapa de pantallas y correcciones pendientes | `docs/design/DISENO.md` |
| Mockups (HTML) y capturas (PNG) | `docs/design/mockups/` y `docs/design/capturas/` |
| Flujos por rol (PlantUML) | `docs/Flujos/` |
| Arquitectura C4 (PlantUML) | `docs/Arquitectura/` |
| Diagramas de secuencia (PlantUML) | `docs/Arquitectura/secuencia/` |
| Modelo de datos (DBML) y diccionario de datos | `docs/db_diagram/` |

## Cómo trabajar
- Para cualquier cambio grande: primero modo Plan, luego aprobación, luego código.
- Una historia por rama; commits pequeños.
- Si una decisión cambia, actualiza `docs/CONTEXTO.md` (y este archivo si afecta las reglas) **en el mismo commit**.
- Si los mockups y el modelo de datos se contradicen, **manda el modelo de datos**. Las diferencias conocidas están en `docs/design/DISENO.md`.
- No inventes requisitos. Si algo no está en los documentos, pregunta.
