# RF4 · Contactos de emergencia

Historia: [issue #14](https://github.com/liusamfung/neighborgood-project/issues/14).
Esta revisión parte de `main` en `c64a25c` y sustituye la propuesta cerrada del PR #65.
No modifica el esquema de Supabase ni añade dependencias.

## Estado al 25/11/2026

Integrado por Liu en PR #73; issue #14 cerrado. El 24–25/11 se comprobó también
en HONOR CRT-LX3, Android 14, con la APK local de main `503bcf4` y Firebase incluido.
La aceptación del código y la cobertura de cada prueba se distinguen a continuación;
el apartado del 21–22/11 conserva la evidencia histórica del emulador.

Resultados físicos: rechazo de los tres campos vacíos; creación sin correo; límite de
tres contactos; rechazo de correo inválido y edición con `prueba@example.com`;
apertura del marcador con `+12025550102`, sin llamar; cancelar y confirmar una
eliminación; reutilizar la posición 3 liberada; y recuperar sesión y contador 3 de 3
después de reiniciar el proceso. La API confirmó posiciones 2 y 3 para los contactos
sintéticos. El borrado de prueba desde la app se comprobó también en el servidor.
Al terminar se retiraron únicamente los contactos creados en esta sesión y quedó el
contacto anterior, sin modificarlo.

Hubo esperas prolongadas de actualización en el HONOR. Se verificó la persistencia
antes de repetir una escritura y la interfaz se recuperó al volver a primer plano;
esta observación no identifica ni da por corregida su causa. Permanecen sin medir
el corte/restablecimiento de red, el aislamiento entre dos residentes diferentes e
iOS. No se presentan como aprobados por estas pruebas físicas.

## Alcance y criterios

El residente administra hasta tres contactos propios en **Perfil**. Nombre, teléfono y
relación son obligatorios; el correo es opcional. Puede crear, editar y eliminar con
confirmación. Al completar tres se oculta **Agregar contacto** y se indica **3 de 3**.
Eliminar una posición permite reutilizarla. La lista vuelve a consultarse al regresar
a Perfil o pulsar **Actualizar contactos**.

**Llamar** abre el marcador del dispositivo con el número preparado. La persona decide
si realiza la llamada. No se solicita `CALL_PHONE` ni se realiza una llamada automática.
Si no puede abrirse el marcador, se explica el fallo y el número continúa seleccionable.
No se implementa el envío de correos a contactos, RF26, fuera del alcance acordado.

## Correspondencia con la arquitectura

| Capa | Archivo | Responsabilidad |
|---|---|---|
| Presentación P8 | `src/app/residente/(tabs)/perfil.tsx` | Perfil, estados de consulta, formulario modal y confirmación de borrado. |
| Presentación | `src/componentes/contactos/TarjetaContacto.tsx` | Datos del contacto y acciones Llamar, Editar y Eliminar. |
| Lógica y caché | `src/hooks/useContactosEmergencia.ts` | Consulta por usuario, mutaciones e invalidación; no reintenta escrituras. |
| Datos | `src/repositorios/contactos.ts` | Único acceso del módulo a Supabase; filtra por propietario y comprueba filas afectadas. |
| Dispositivo | `src/servicios/llamadas.ts` | Adaptador de `Linking` para el marcador. |
| Reglas | `src/utilidades/contactosEmergencia.ts` | Validación, normalización, primera posición disponible y errores públicos. |
| Tipos | `src/tipos/contacto.ts` | Fila del modelo generado y borrador de campos editables. |
| Base existente | `supabase/migrations/` | RLS y restricciones de `contactos_emergencia`. |

Flujo: **Perfil → hook → repositorio → Supabase**. La sesión procede de
`SesionContext`. El botón Llamar usa el servicio del dispositivo, sin pasar por Supabase.
Se conservan los componentes `Boton`, `CampoTexto`, el tema compartido y Expo Router.
Los tipos generados de la base no se editaron.

## Persistencia, permisos y errores

- Cada operación incluye `usuario_id`; la clave de caché también lo incluye. RLS es la
  protección definitiva del servidor, no una condición de la interfaz.
- `CHECK (orden BETWEEN 1 AND 3)` y `UNIQUE (usuario_id, orden)` sostienen el límite.
  Crear busca una posición libre, incluso si se eliminó la segunda de tres.
- El borrador no permite cambiar `id`, `usuario_id` ni `orden`. Correo vacío se guarda
  como `NULL`; los demás campos se recortan antes de guardar.
- Editar o eliminar cero filas no se comunica como éxito. Los conflictos de posición
  piden actualizar; los fallos conservan el borrador y no muestran detalles de SQL.
- No se reintentan escrituras automáticamente: ante una conexión incierta primero se
  actualiza la lista para comprobar el resultado.
- El formulario bloquea el doble envío. Cancelar y Atrás no guardan un borrador.
- La app utiliza su configuración pública y una sesión de usuario. No se utiliza
  `service_role`, ni se incluyen cuentas, contraseñas o `.env` en esta entrega.

## Verificación reproducible

Con Node 24 y las dependencias del lockfile:

```text
npm ci
npm run test:contactos
npx tsc --noEmit
npx expo lint
```

Las cinco pruebas de reglas no acceden a red: campos obligatorios y correo opcional,
lista de campos editables, ocho combinaciones de posiciones, enlaces de teléfono
sin secuencias de control y mensajes de errores.

Para la comprobación nativa se requiere una **development build**, no Expo Go, y el
`.env` del equipo guardado localmente. Al incorporar `expo-sharing` de main se recompila
el cliente nativo, aunque RF4 no añade un módulo nativo nuevo.

Recorrido de aceptación:

1. Iniciar sesión como residente autorizado y abrir Perfil.
2. En un formulario vacío, guardar y comprobar los tres campos requeridos.
3. Crear contactos sintéticos sin correo hasta completar tres; verificar contador y límite.
4. Editar uno, comprobar correo inválido y guardar un valor válido.
5. Abrir el marcador con un número ficticio; regresar sin llamar.
6. Cancelar una eliminación, después confirmarla y volver a agregar en el hueco.
7. Recargar y comprobar persistencia con el servidor; comprobar cierre de sesión.
8. Interrumpir la conexión, actualizar, restablecerla y reintentar.
9. Comprobar teclado, desplazamiento y Atrás en el editor.

## Resultados observados · 21–22/11/2026

Entorno: Android 16, emulador Pixel 7 `x86_64`, development build SDK 58 y Supabase
compartido del equipo. El JavaScript probado corresponde a `b0c17b1`; el commit posterior
solo corrige un comentario y añade esta documentación. APK de desarrollo:
SHA-256 `7e019264660d559289295ef0e0e713e0de239c1733ae46289a9518ffdc83c4cb`.
El APK usa Metro para cargar el código: su hash no sustituye la referencia al commit.

| Comprobación | Resultado y alcance |
|---|---|
| Compilación Android | Correcta, con las dependencias nativas actuales de main. |
| TypeScript y lint | Sin errores. |
| Reglas de RF4 | 5 pruebas aprobadas, incluidas las 8 combinaciones de posiciones. |
| Inicio de sesión y consulta | Residente del entorno compartido; su contacto previo se conservó. |
| Campos obligatorios y correo opcional | Rechazo del formulario vacío; creación sin correo. |
| Límite visual | Contador 3 de 3, mensaje de límite y ausencia de Agregar contacto. |
| Edición | Formulario precargado; correo inválido rechazado y correo válido persistido. |
| Eliminación | Cancelar conserva el contacto; confirmar elimina únicamente el contacto de prueba. |
| Reutilizar el hueco | Tras borrar la posición 2 se creó otro contacto en 2; se comprobó también por API. |
| Persistencia | Sesión y contactos recuperados después de reiniciar el emulador y abrir de nuevo la app. |
| Marcador | Android abrió Teléfono con `+12025550101`; se regresó sin realizar una llamada. |
| Desplazamiento y Atrás | Desplazamiento táctil; Atrás cierra el editor sin guardar, que se reabre limpio. |
| Límite en el servidor compartido | Posición 4 rechazada con `23514`; posición duplicada con `23505`. |
| Acceso sin sesión | La API no permitió leer contactos. |

Evidencia nativa, con datos sintéticos:

- [Campos requeridos](pruebas/rf4/01-campos-obligatorios.png).
- [Lista completa y mensaje del límite](pruebas/rf4/02-limite-tres.png).
- [Número preparado en el marcador Android](pruebas/rf4/03-marcador.png).
- [Comprobaciones del servidor](pruebas/rf4/servidor-resultados.json).

No se acreditan todavía pruebas propias en un teléfono físico, iOS, aislamiento entre
dos residentes distintos ni el corte y restablecimiento de red desde la interfaz.
La prueba sin sesión no sustituye la de dos residentes. El recorrido anterior conserva
esos pasos para completar la aceptación; no se presentan como aprobados. Tampoco se
reutilizan como actuales los resultados SQL/Deno de la propuesta anterior.

La revisión y la decisión de integrar corresponden al equipo. No se cambió main ni se
ejecutaron migraciones, seeds o reinicios del Supabase compartido.
Al terminar se retiraron los dos contactos sintéticos restantes y se comprobó que el
contacto original continúa en el servidor. Las capturas documentan el estado de prueba.
