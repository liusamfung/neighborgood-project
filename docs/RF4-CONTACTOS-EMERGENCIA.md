# RF4 · Perfil y contactos de emergencia

Implementación del [issue #14](https://github.com/liusamfung/neighborgood-project/issues/14), pantalla P8 del residente.

## Comportamiento

- Muestra el perfil de la sesión y sus contactos, ordenados por posición.
- Permite agregar, editar y eliminar con confirmación; nombre, teléfono y relación son obligatorios y el correo es opcional.
- Muestra el contador **n de 3** y oculta «Agregar contacto» al llegar a tres.
- Reutiliza los huecos de posiciones sin renumerar los otros contactos.
- Incluye carga, estado vacío, errores, actualización manual y conservación del borrador si falla el guardado.
- El botón **Llamar** prepara el número para la aplicación de teléfono; también permite seleccionar y copiar el número.

## Arquitectura y archivos

Se conserva la arquitectura en capas de RNF7 y del [diagrama de componentes](Arquitectura/DiagramaDeComponetes_C4Model.puml): presentación → lógica y caché → repositorios → Supabase. Los servicios del dispositivo son un grupo aparte.

| Archivo | Responsabilidad |
|---|---|
| `src/app/residente/(tabs)/perfil.tsx` | Pantalla, borrador y formulario modal interno, siguiendo el patrón de los otros formularios del proyecto. |
| `src/componentes/contactos/TarjetaContacto.tsx` | Presentación de una fila y acciones de contacto, equivalente a las tarjetas de otros módulos. |
| `src/hooks/useContactosEmergencia.ts` | Consulta por usuario y mutaciones con TanStack Query. |
| `src/repositorios/contactos.ts` | Operaciones de datos con filtros de propietario y comprobación de filas afectadas. |
| `src/tipos/contacto.ts` | Fila generada de Supabase y borrador editable. |
| `src/utilidades/contactosEmergencia.ts` | Reglas puras, normalización, posiciones libres y mensajes de error. |
| `src/lib/llamadas.ts` | Adaptador del teléfono del dispositivo mediante React Native Linking. |

Las pantallas no importan el cliente Supabase. La clave de caché incluye al usuario para separar agendas. Al volver a Perfil se consulta la lista y, después de cada escritura, se invalida la caché del propietario. No se reintentan escrituras automáticamente: una pérdida de conexión puede dejar incierto si el servidor recibió la anterior.

## Integridad y permisos

Se reutilizan las migraciones existentes: `CHECK (orden between 1 and 3)`, `UNIQUE (usuario_id, orden)`, permisos `GRANT` y RLS. No hace falta una nueva migración ni se usa una clave administradora en el cliente.

Al crear se consulta la primera posición libre; PostgreSQL sigue siendo la autoridad frente a dos dispositivos simultáneos. Una colisión no se reintenta automáticamente y se explica al usuario. Edición y eliminación filtran por id y usuario; cero filas no se anuncian como un éxito. Otro residente no puede leer, modificar, borrar, crear ni transferir contactos ajenos.

## Llamadas

Se conservan el prefijo internacional y los dígitos, retirando solo separadores de presentación. Se rechazan números inválidos y secuencias de control antes de crear `tel:`. El teléfono guardado no se modifica.

En Android/iOS se solicita abrir la aplicación de teléfono con `Linking.openURL`; la persona completa la acción en los controles del sistema. No se solicita `CALL_PHONE` ni se llama directamente. Si el sistema rechaza la apertura, se muestra una alternativa para recuperar el número. Se evita `canOpenURL`, que puede dar falsos negativos sin configuración adicional de visibilidad. Referencia: [React Native Linking](https://reactnative.dev/docs/linking).

En web se entrega un enlace `tel:` real y se explica que hace falta una aplicación compatible. El navegador no confirma de forma fiable si el marcador abrió o si una llamada se conectó. El número es seleccionable y Llamar continúa disponible para datos ya visibles aunque falle una recarga; esto no implica persistencia de la agenda al arrancar sin red. Referencia: [enlaces a otras aplicaciones en Expo](https://docs.expo.dev/linking/into-other-apps/).

## Validación

Con Node 24 y las dependencias del lockfile:

```sh
npx tsc --noEmit
npx expo lint
npm run test:contactos
```

`test:contactos` ejecuta doce pruebas con node:test: validación, correo opcional, normalización, las ocho combinaciones de posiciones, filtros por propietario, límite de tres, conflicto de inserción, cero filas y apertura/fallo del adaptador telefónico. No instala otro framework de pruebas.

Con Supabase local, Docker y una base de pruebas inicializada con el seed del repositorio:

```sh
npm run db:test
npm run fn:probar
```

La prueba `supabase/tests/database/09_contactos_emergencia.test.sql` agrega dieciocho comprobaciones pgTAP del CRUD, límite, posición intermedia y RLS. Sus escrituras terminan en rollback. El conjunto de base de datos tiene 280 comprobaciones en nueve archivos; las funciones existentes tienen 33 pruebas Deno. Nunca se ejecuta el seed ni un reinicio de base sobre el proyecto remoto para probar esta entrega.

### Recorrido de aceptación

1. Iniciar sesión con el primer residente del seed y abrir Perfil: dos contactos.
2. Guardar vacío o con correo inválido: se muestran los errores correspondientes.
3. Agregar un tercero sin correo: aparece **3 de 3** y se oculta «Agregar contacto».
4. Editarlo y recargar: los cambios persisten.
5. Entrar con otro residente: su agenda no muestra los contactos del primero.
6. Cancelar una eliminación, después confirmarla y recargar: vuelve a **2 de 3** y aparece el botón para agregar.
7. Comprobar que cada acción Llamar corresponde a su teléfono y que el número se puede seleccionar.

La interfaz se verificó en web a 390 y 360 píxeles; no hubo desbordamiento horizontal. Se conservan los contactos originales y se retira únicamente el contacto sintético creado para la prueba. La apertura del marcador nativo tiene pruebas con adaptador simulado; queda pendiente comprobarla en un teléfono Android/iOS real. No se han realizado llamadas reales durante las pruebas.
