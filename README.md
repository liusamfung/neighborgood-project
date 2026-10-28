# NeighborGood

App móvil de gestión de condominios y alerta comunitaria (curso Desarrollo de Aplicaciones Móviles, UTP, 2026-II). Roles: Directiva, Residente y Guardia.

Antes de programar, lee `CLAUDE.md` y `docs/CONTEXTO.md`.

## Requisitos
Node 24, Xcode con simulador iOS (para iOS) y `watchman`. Android se compila en la nube con EAS Build. No se usa Expo Go: la app es una *development build*.

## Primer arranque
```bash
npm install
cp .env.example .env   # y completa la URL y la anon key de Supabase
npx expo run:ios       # compila la development build y abre el simulador
```

## Día a día
```bash
npx expo start --dev-client   # servidor de desarrollo (i: simulador, r: recargar)
npx tsc --noEmit              # tipos
npx expo lint                 # eslint
npx expo-doctor               # diagnóstico del proyecto
```
Solo se recompila (`npx expo run:ios`) si cambia algo nativo: una librería con código nativo o los plugins de `app.json`.

## iPhone con una cuenta de Apple gratuita
1. En tu `.env` pon `NEIGHBORGOOD_SIN_PUSH_ONLY_IPHONE=1`. Quita el permiso de push remoto, que una cuenta gratuita no puede firmar; ese iPhone no recibe push remotas (las locales sí). No afecta a Android ni a EAS.
2. Activa el *Modo desarrollador* en el iPhone, conéctalo y confía en el Mac.
3. `npx expo prebuild --platform ios --clean` (si cambiaste la variable o `app.json`) y luego `npx expo run:ios --device`.
4. Cada día: `npx expo start --dev-client` con el iPhone en la misma Wi-Fi (o `--tunnel`).

La app instalada con cuenta gratuita **caduca a los 7 días**: repite el paso 3.

## Android con EAS Build
Solo Android se compila en la nube (iOS se compila en local con Xcode).
```bash
npx eas-cli login
npx eas-cli build --platform android --profile development   # APK con development client
npx eas-cli build --platform android --profile preview       # APK interno para demostraciones
```
- El primer build pide crear el *keystore* de forma interactiva; hazlo quien compile Android.
- Las claves de Supabase no están en git: se guardan como variables de EAS (`npx eas-cli env:set`) en los entornos `development` y `preview`.
- Las push de Android necesitan `google-services.json` (FCM). Se configura en el Sprint 5, cuando se implementen las alertas.

## Base de datos (Supabase)
El modelo completo vive en `supabase/migrations/` (6 partes que se ejecutan en orden), con datos de prueba (`supabase/seed.sql`, solo local), pruebas de RLS (`supabase/tests/`) y un script de verificación (`supabase/verificacion.sql`).

**Probar en tu máquina** (necesitas Docker Desktop abierto; la primera vez descarga unos GB):
```bash
npm run db:start      # arranca Supabase local
npm run db:reset      # aplica las 6 partes y el seed
npm run db:test       # pruebas pgTAP: RLS, restricciones y triggers
npm run db:tipos      # regenera src/tipos/base_de_datos.ts
```
Usuarios de prueba locales (contraseña `Prueba123!`): `directiva@`, `guardia@`, `residente1@`, `residente2@`, `residente3@` e `intruso@neighborgood.test`. **El seed nunca se ejecuta en el proyecto real.**

**Aplicar en el proyecto real:** en el SQL Editor de Supabase pega y ejecuta, en orden y una por una, las 6 partes de `supabase/migrations/`. Después ejecuta `supabase/verificacion.sql`: todas las filas deben decir `OK`. Si una parte falla a la mitad, `supabase/rollback.sql` (solo desarrollo, borra todos los datos) deja la base limpia para repetir.

**Datos y cuentas del proyecto real.** El proyecto real empieza vacío. Después de las 6 partes: (1) ejecuta `supabase/catalogo_inicial.sql` (sectores, unidades y categorías; sin usuarios); (2) crea las cuentas en Authentication → Add user (con "Auto Confirm User") y completa sus perfiles con `supabase/crear_personal.sql`. Los residentes se registran solos, pero solo si la directiva habilitó su correo en `residentes_habilitados`; para una demostración, la misma plantilla habilita un residente y el trigger le crea el perfil. Las contraseñas las eliges tú y se guardan en un gestor de contraseñas, nunca en el repositorio.

## Reglas
- Una historia por rama, commits pequeños y en español; todo entra a `main` por pull request con *merge commit*.
- Ningún secreto en el repo: la app solo lleva la `anon key`; la `service_role` vive en las Edge Functions.
- Instalar librerías con `npx expo install`.
