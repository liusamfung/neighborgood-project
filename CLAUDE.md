# NeighborGood

App móvil de gestión de condominios y alerta comunitaria, hecha para el curso **Desarrollo Móvil** (UTP, 2026-II). Roles: **Directiva**, **Residente** y **Guardia**.

## Estado actual
Hay documentación en `docs/` y el **proyecto Expo base** (SDK 58, TypeScript, Expo Router en `src/app/`), sin lógica de negocio todavía. Todo lo funcional se construye por Sprint (ver `docs/CONTEXTO.md`) y está repartido en issues de GitHub, con hitos Sprint 3 a Entrega final y el tablero "NeighborGood · Backlog". Antes de escribir código, lee los documentos de abajo y usa el modo Plan.

## Idioma y estilo
- Todo en español: respuestas, documentos, comentarios, mensajes de commit y diagramas. Solo cambia de idioma si el usuario lo pide.
- Los nombres del dominio siguen el modelo de datos (tablas y columnas en español, `snake_case`). Ejemplo: `pases_visita`, `unidad_id`.

## Stack (decidido)
- **App:** React Native + Expo **SDK 58** (`expo ~58.0`, React Native 0.88, React 19.3, Expo Router ~58), con *development build* (`expo-dev-client` + EAS Build). **No usar Expo Go**: no soporta push remotas desde el SDK 53.
- **Por qué SDK 58 y no 57:** iOS 27 cierra las apps que no adoptan el ciclo de vida `UIScene`. El SDK 57 no lo adopta; el SDK 58 sí (probado en un iPhone real). No volver al SDK 57.
- **Backend:** Supabase (Auth con correo y Google, Postgres con RLS, Realtime, Storage, Edge Functions en Deno/TypeScript). **Sin NestJS.**
- **Estado en la app:** React Context (sesión y rol) + TanStack Query (consultas a Supabase).
- **Notificaciones:** Expo Push Service (→ FCM/APNs). Realtime para la app abierta; push para la app cerrada.
- **Dispositivo:** `expo-camera` (escáner QR), `react-native-qrcode-svg` (dibujar el QR), `expo-notifications`, `expo-image-picker`, `expo-haptics`/`Vibration`.
- **Migraciones:** SQL escrito a mano (con RLS) en `supabase/migrations/`, probado en local con Docker (`supabase test db`) y ejecutado en el SQL Editor de Supabase. **Sin Prisma.**

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
| Migraciones SQL, datos de prueba, pruebas de RLS y verificación | `supabase/` |

## Reglas de Expo
- Instalar librerías **siempre** con `npx expo install <paquete>` (resuelve la versión del SDK), nunca con `npm install`.
- La versión de `expo`, `expo-router` y de todos los paquetes de Expo la fija el SDK 58: no las instales ni las cambies a mano con `@latest`. Para alinearlas usa `npx expo install --check` y `npx expo install --fix`.
- Las rutas viven en `src/app/`; el código que no es ruta (componentes, hooks, repositorios) va fuera de esa carpeta. Alias `@/*` → `src/*`.
- Nunca crear ni editar `ios/` y `android/` a mano (se generan): la configuración nativa va en `app.json` y plugins.
- Si algo de Expo, EAS o React Native no es seguro, leer la documentación de la versión instalada (`https://docs.expo.dev/versions/v58.0.0/`, índice en `https://docs.expo.dev/llms.txt`) en vez de responder de memoria.
- Antes de dar una tarea por hecha: `npx tsc --noEmit` y `npx expo lint`.
- `supabase/functions` es código Deno: queda fuera de `tsconfig.json` y de eslint.
- Si cambias `app.json` o plugins, regenera `ios/` con `npx expo prebuild --platform ios --clean`; el equipo de firma se redetecta con `npx expo run:ios --device`.
- **iPhone con cuenta de Apple gratuita:** pon `NEIGHBORGOOD_SIN_PUSH_ONLY_IPHONE=1` en tu `.env` (ignorado por git). Quita el permiso de push remoto de iOS para poder firmar; ese iPhone no recibe push remotas. Vacío o `0` no hace nada y nunca afecta a Android ni a EAS. La app instalada con cuenta gratuita caduca a los 7 días.

## Cómo trabajar
- Para cualquier cambio grande: primero modo Plan, luego aprobación, luego código.
- Una historia por rama; commits pequeños.
- Si una decisión cambia, actualiza `docs/CONTEXTO.md` (y este archivo si afecta las reglas) **en el mismo commit**.
- Si los mockups y el modelo de datos se contradicen, **manda el modelo de datos**. Las diferencias conocidas están en `docs/design/DISENO.md`.
- No inventes requisitos. Si algo no está en los documentos, pregunta.
