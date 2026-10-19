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

## Reglas
- Una historia por rama, commits pequeños y en español; todo entra a `main` por pull request con *merge commit*.
- Ningún secreto en el repo: la app solo lleva la `anon key`; la `service_role` vive en las Edge Functions.
- Instalar librerías con `npx expo install`.
