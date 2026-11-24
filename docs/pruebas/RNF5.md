# RNF5 · Escalabilidad: prueba de carga con 500 unidades

Fecha: 24 nov. 2026, sobre `main` en `9b076df` (después del PR #93) más la migración 12 de este cambio.
Requisito (`docs/requisitos/REQUISITOS.md`): _soportar unidades residenciales concurrentes sin degradación
perceptible, hasta 500 unidades._

**Resultado:** la prueba encontró un problema real de rendimiento en las políticas RLS (hasta 2,2 s por
consulta con un año de datos), se corrigió con la migración 12 y, después, todas las consultas de la app
tardan menos de 20 ms y 50 usuarios simultáneos no producen ningún error. **RNF5 cumple**, con los límites que
se anotan al final.

## Método

- **Datos sintéticos** (`supabase/carga/generar_datos.sql`, determinista, solo para el Supabase local): 512
  unidades (500 nuevas + 12 del seed), 1 003 residentes, 303 avisos, 50 001 pases de visita (unos 137 por día),
  10 000 alertas con 19 930 respuestas y 10 001 incidencias: un año completo de un condominio de 500 unidades.
- **Entorno:** Supabase local en Docker (Postgres 17.11, 8 CPU y 4 GB para Docker, MacBook con Apple M3).
- **Consultas:** las de los repositorios de la app (`src/repositorios`), escritas en SQL, repetidas 50 veces
  cada una como el rol `authenticated` con el JWT del usuario, igual que PostgREST. **Las políticas RLS cuentan
  en el tiempo.** La primera repetición es de calentamiento y no se anota (`supabase/carga/medir.sql`).
- **Concurrencia:** `pgbench` con 20 y 50 clientes simultáneos durante 30 s (`concurrencia.pgbench`). Cada
  cliente repite acciones completas sin pausa: 70 % residente (alertas del sector, pases y avisos), 20 %
  guardia (visitas de hoy y alertas), 8 % directiva (reporte mensual e historial) y 2 % residente que emite una
  alerta.
- **Criterio:** que cada consulta responda en menos de 1 s como "fluido" y, como máximo, en menos de 3 s (el
  umbral del RNF1), medido con el percentil 95.

Cómo repetirla (con Docker abierto):

```bash
npm run db:start && npm run db:reset
npm run carga:preparar        # genera los datos
npm run carga:medir           # tiempos por consulta y planes de ejecución
npm run carga:concurrencia -- 50 30   # 50 clientes durante 30 s
```

## Hallazgo: las políticas RLS se evaluaban una vez por fila

Primera medición, **antes** de la corrección (p95 en milisegundos; la medición completa tardó 4 min 45 s):

| Rol       | Consulta                              | Filas | p95 antes |
| --------- | ------------------------------------- | ----- | --------- |
| Guardia   | Visitas de hoy (RF20)                 | 157   | **2 540** |
| Residente | Mis pases de visita (últimos 30)      | 30    | **2 100** |
| Residente | Alertas de mi sector (página de 20)   | 20    | 724       |
| Directiva | Reporte mensual de incidencias (RF31) | 12    | 219       |
| Directiva | Historial de alertas con respuestas   | 20    | 226       |
| Guardia   | Alertas (página de 20)                | 20    | 232       |
| Residente | Mis incidencias                       | 9     | 219       |

El plan de ejecución de "visitas de hoy" lo explica: Postgres leía **300 968 bloques** para devolver 157
filas, porque las políticas llamaban a `privado.es_directiva()`, `es_guardia()`, `hoy_lima()` y
`sector_actual()` **por cada fila**. Son funciones `security definer`: Postgres no las incluye en la consulta y
cada llamada repite una lectura de `perfiles`. Con pocos datos no se nota (el seed tiene 12 unidades); con un
año de un condominio de 500 unidades, sí.

## Corrección: migración 12

`supabase/migrations/20261126000001_rls_rendimiento.sql` reescribe las políticas de lectura de
`pases_visita`, `alertas`, `alerta_atenciones` e `incidencias` escribiendo `(select privado.es_directiva())`
en vez de `privado.es_directiva()`. Postgres evalúa esa subconsulta **una sola vez por consulta**. El
significado de las políticas no cambia, porque las funciones dependen de la sesión y no de la fila.

- **Quién ve qué no cambió:** pasan las pruebas existentes de RLS (`04_politicas_por_rol`) y las nuevas
  (`14_rls_rendimiento`, que además impide volver a escribir la llamada suelta). Suite completa de pgTAP:
  17 archivos, **393 pruebas, todas pasan**.
- **Se descartó un índice:** se probó uno por `fecha_visita` para el guardia, pero Postgres no lo usa (la
  política es un `or`) y recorrer 50 000 pases ya tarda unos 3 ms, así que no se agregó.

## Resultado después de la corrección

Mismos datos y mismas consultas (50 repeticiones, ms; la medición completa tarda ahora 5 s):

| Rol       | Consulta                                 | Filas | Promedio | p95  | Antes (p95) | Veredicto |
| --------- | ---------------------------------------- | ----- | -------- | ---- | ----------- | --------- |
| Guardia   | Visitas de hoy (RF20)                    | 157   | 13,8     | 15,9 | 2 540       | OK        |
| Guardia   | Alertas (página de 20)                   | 20    | 13,2     | 14,0 | 232         | OK        |
| Guardia   | Buscar un pase por su QR                 | 1     | 0,09     | 0,11 | —           | OK        |
| Residente | Avisos (lista completa)                  | 234   | 17,3     | 19,1 | —           | OK        |
| Residente | Mis alertas (página de 20)               | 16    | 0,50     | 0,53 | —           | OK        |
| Residente | Alertas de mi sector (página de 20)      | 20    | 11,5     | 12,5 | 724         | OK        |
| Residente | Mis pases de visita (últimos 30)         | 30    | 1,97     | 2,09 | 2 100       | OK        |
| Residente | Mis incidencias (página de 20)           | 9     | 1,35     | 2,05 | 219         | OK        |
| Residente | Emitir una alerta (INSERT, con triggers) | 1     | 0,10     | 0,13 | —           | OK        |
| Directiva | Reporte mensual de incidencias (RF31)    | 12    | 5,9      | 6,0  | 219         | OK        |
| Directiva | Historial de alertas con respuestas      | 20    | 12,6     | 13,1 | 226         | OK        |
| Directiva | Incidencias pendientes (página de 20)    | 20    | 0,55     | 0,57 | —           | OK        |
| Directiva | Avisos (lista completa)                  | 303   | 6,3      | 6,4  | —           | OK        |

Plan de "visitas de hoy" después: 968 bloques leídos (antes 300 968) y 3,2 ms (antes 2 120 ms).

### Carga concurrente (pgbench, 30 s cada una)

| Clientes simultáneos | Transacciones | Fallidas | Latencia media | Transacciones por segundo |
| -------------------- | ------------- | -------- | -------------- | ------------------------- |
| 20                   | 4 844         | **0**    | 124 ms         | 161                       |
| 50                   | 4 502         | **0**    | 335 ms         | 149                       |

Cada "transacción" es una acción completa (por ejemplo, el residente abre alertas, pases y avisos). Los
clientes no hacen pausas, así que 50 clientes equivalen a muchos más usuarios reales: la capacidad medida
(unas 150 acciones por segundo, cerca de 9 000 por minuto) está muy por encima de lo que genera un condominio
de 500 unidades. Al pasar de 20 a 50 clientes la latencia sube de forma proporcional (la base trabaja al
máximo) pero la consulta más lenta promedia 222 ms, muy por debajo de 3 s.

## Límites de esta prueba (qué no demuestra)

- **Es un Supabase local**, no el plan gratuito del proyecto real (CPU compartida y menos memoria). En el
  proyecto real los tiempos serán mayores, pero la mejora de la migración 12 es relativa al número de filas
  y se mantiene.
- **No incluye la red.** Desde Lima, una llamada trivial al proyecto real tardó entre 0,45 y 0,9 s. Ese
  costo se suma a cada consulta y no depende del volumen de datos.
- **No mide las Edge Functions** (crear pase, validar pase, notificar) ni Realtime y las push, que no
  se ejercitan con `pgbench`. Realtime se midió aparte en un teléfono real: la alerta llegó en 0,68 s y la
  push de Android en unos 2 s.
- **No incluye encuestas ni votos** (volumen bajo y sin pantalla pesada) ni las fotos del Storage.
- **La lista de avisos sigue sin paginar** y su política (`avisos: lectura`) todavía llama a las funciones por
  fila. Con 303 avisos tarda 17 ms (222 ms con 50 clientes simultáneos), así que no hace falta cambiarla ahora;
  sería la siguiente mejora si crecieran mucho los avisos.
- Los datos son sintéticos y repartidos de forma uniforme; un condominio real tiene picos (por ejemplo, un
  corte de luz que dispara muchas alertas a la vez).
