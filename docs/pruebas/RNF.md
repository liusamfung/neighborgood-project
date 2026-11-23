# Evidencias de los requisitos no funcionales (Sprint 6)

Cómo se verificó cada RNF de `docs/requisitos/REQUISITOS.md`, con qué resultado y qué falta. Fecha de la
verificación: 22 nov. 2026, sobre `main` en `c64a25c` (después de los PR #66, #67 y #68).

| RNF | Estado | Resumen |
|---|---|---|
| RNF1 · Rendimiento | ⏳ Bloqueado | Necesita el botón de pánico y Realtime (RF23, RF25) |
| RNF2 · Disponibilidad | 🟡 Mitigado | Latido automático contra la pausa del plan gratuito |
| RNF3 · Seguridad de los QR | 🟡 Parcial | UUID v4 comprobado; falta probar el rechazo de un pase vencido |
| RNF4 · Usabilidad | ⏳ Bloqueado | Necesita el botón de pánico (RF23) |
| RNF5 · Escalabilidad | ⏳ Pendiente | Prueba de carga con datos sintéticos |
| RNF6 · Seguridad de datos | ✅ Cumple | 21/21 tablas con RLS, 0 secretos, cifrado en reposo AES-256 |
| RNF7 · Mantenibilidad | ✅ Cumple | Ninguna pantalla usa Supabase; ahora lo impone el lint |
| RNF8 · Accesibilidad | ✅ Cumple | Todas las áreas táctiles ≥ 44 px (se corrigió "Crear cuenta") |

## RNF6 · Seguridad de datos

Umbral: HTTPS/WSS en todas las conexiones, RLS en el 100 % de las tablas y 0 secretos en el repositorio.

| Comprobación | Comando | Resultado |
|---|---|---|
| Tablas propias creadas | `grep -c "^create table public\." supabase/migrations/*.sql` | 21 |
| Tablas con RLS activado | `grep "enable row level security" supabase/migrations/*.sql \| wc -l` | 21 (100 %) |
| `.env` en todo el historial | `git log --all --oneline -- .env` | 0 commits |
| Claves en todo el historial | `git log --all -p` buscando JWT (`eyJhbGciOi…`), `sb_secret_`, `sb_publishable_` y `service_role` | 0 coincidencias |
| `.env` ignorado | `.gitignore`, líneas `.env` y `.env.*` | Sí |
| Conexiones | La app usa `supabase-js` con la URL `https://` del proyecto; Realtime va por `wss://` | HTTPS/WSS |

La sesión se guarda cifrada en el llavero del teléfono (`expo-secure-store`, `src/lib/supabase.ts`). La
`service_role` solo existe en el servidor (Edge Functions). Las políticas se prueban en
`supabase/tests/database/04_politicas_por_rol.test.sql`.

Cifrado en reposo: lo da Supabase en todos sus planes. Según su página de seguridad
(https://supabase.com/security), todos los datos de los clientes se cifran en reposo con AES-256 y en
tránsito con TLS, sin configuración adicional.

## RNF7 · Mantenibilidad

Umbral: las pantallas nunca llaman a `supabase-js` directamente; solo lo hacen los repositorios.

- Inspección: fuera de `src/repositorios` y `src/lib`, el único archivo que menciona Supabase es
  `src/contexto/SesionContext.tsx`, y solo con `import type { Session }` (un tipo, desaparece al compilar).
- **Desde ahora lo comprueba el lint.** `eslint.config.js` prohíbe importar `@/lib/supabase` y
  `@supabase/supabase-js` en `src/app`, `src/componentes`, `src/hooks`, `src/servicios` y `src/utilidades`.
  `npx expo lint` falla con el mensaje "RNF7: solo src/repositorios y src/lib hablan con Supabase".
  Se probó con un archivo de prueba en `src/app` que importaba el cliente: el lint lo rechazó.

## RNF8 · Accesibilidad

Umbral: áreas táctiles ≥ 44 px; botones principales de 52 a 56 px de alto (`src/tema/espaciado.ts`).

| Elemento tocable | Archivo | Alto mínimo |
|---|---|---|
| Botón principal (`Boton`) | `src/componentes/formulario/Boton.tsx` | 56 px |
| Enlace de pantalla provisional | `src/componentes/PantallaMarcador.tsx` | 56 px |
| Chips (categoría, sectores) | `src/componentes/formulario/ChipsSeleccion.tsx` | 44 px |
| Campos de fecha y hora | `src/componentes/formulario/CampoFecha.tsx` | 44 px |
| "Quitar" y "+ Agregar opción" | `src/componentes/encuestas/TarjetaPregunta.tsx` | 44 px |
| "+ Agregar pregunta" | `src/app/directiva/encuestas/nueva.tsx` | 44 px |
| "Compartir" del pase | `src/componentes/visitas/BotonCompartirPase.tsx` | 44 px |
| Tarjeta de encuesta (P4) | `src/app/residente/(tabs)/avisos.tsx` | más de 44 px (dos líneas + 16 px de relleno) |
| Pestañas inferiores | `src/componentes/navegacion/opciones.tsx` | 44 px |
| Interruptores | `Switch` nativo | 48 dp (estándar de Android) |
| **"Crear cuenta" (login)** | `src/app/(auth)/login.tsx` | **antes ~20 px** (texto dentro de un párrafo) → **ahora 44 px** |

Hallazgo corregido: "Crear cuenta" era un enlace dentro de un texto, así que su área táctil era solo la
altura de la letra. Ahora es un botón de texto de 44 px (`Link asChild` + `Pressable`).

## RNF2 · Disponibilidad

Umbral: ≥ 99 % para el módulo de alertas. El plan gratuito de Supabase no tiene un SLA de disponibilidad,
así que el 99 % no se puede garantizar contractualmente. El riesgo real que se observó fue otro: **el 21 nov.
2026 el proyecto estaba pausado por inactividad** y la app no podía conectar (el dominio daba `NXDOMAIN`)
hasta que se restauró a mano desde el panel.

Supabase pausa los proyectos gratuitos que pasan una semana sin actividad **de base de datos**; un ping a
Auth no cuenta. Mitigación:

- Migración 9 (`supabase/migrations/20261122000001_latido.sql`): `public.latido()`, una consulta mínima que
  devuelve 1 y no lee tablas. La puede ejecutar `anon`, que sigue sin poder leer ninguna tabla. Probado en
  Postgres 16 y en `supabase/tests/database/09_latido.test.sql`.
- Workflow `.github/workflows/latido-supabase.yml`: llama a `latido()` cada 3 días. Si falla, GitHub avisa.

**Pendiente (dueño del repo y del proyecto):** ejecutar la parte 9 en el SQL Editor del proyecto real y crear
los secretos `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY` en GitHub. Para medir la disponibilidad real se
puede usar el historial del workflow (cada ejecución verde es una comprobación exitosa).

## RNF3 · Seguridad de los QR

Umbral: UUID v4 generado en el servidor; el pase vale solo el día de la visita, hasta las 23:59 (Lima).

- **No predecible (cumple):** `supabase/tests/database/08_pases_visita.test.sql` comprueba que el código es un
  UUID v4 (dígito 15 = `4`, variante RFC 4122) generado por Postgres y distinto en cada pase. En dispositivo
  real (moto g54, 21 nov. 2026), Google Lens leyó del QR compartido `becfda62-fa94-433b-9bc2-eeea1532c74c`:
  versión 4 y variante `9`.
- **En la app:** desde el PR #68 no se ofrece compartir un pase de un día que ya pasó.
- **Pendiente:** escanear un pase del día anterior y comprobar que el guardia lo rechaza. Depende de la Edge
  Function de validación (RF18 a RF20), que todavía no está en `main`.

## RNF1, RNF4 y RNF5

- **RNF1 (≤ 3 s) y RNF4 (≤ 3 toques):** bloqueados hasta que existan el botón de pánico (RF23) y la
  notificación en tiempo real (RF25). Hoy P3 y P3b son pantallas provisionales. Método previsto: RNF1, enviar
  10 alertas entre dos teléfonos y promediar `creada_en` contra la hora de recepción; RNF4, contar los
  toques de Inicio → tipo → confirmar.
- **RNF5 (500 unidades):** pendiente. Método previsto: en el Supabase local (`npm run db:start`), generar 500
  unidades con residentes y medir con `explain analyze` las consultas de avisos, alertas y pases.
