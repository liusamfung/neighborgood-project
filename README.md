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

## Reglas
- Una historia por rama, commits pequeños y en español; todo entra a `main` por pull request con *merge commit*.
- Ningún secreto en el repo: la app solo lleva la `anon key`; la `service_role` vive en las Edge Functions.
- Instalar librerías con `npx expo install`.
