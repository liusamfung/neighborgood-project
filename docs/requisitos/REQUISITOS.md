# Requisitos de NeighborGood

Copia local del Google Doc "Requerimentos funcionales" (carpeta de Drive del proyecto), para que Claude Code pueda leerla sin acceso a Drive. **Esta versión es la oficial**: tiene la numeración corregida (RF1 a RF31). Si el Google Doc cambia, actualiza este archivo.

> **Numeración.** El Google Doc original tenía huecos (faltaban el RF7, el RF23 y el RF30) y el RF15 aparecía dos veces. Desde esta versión los RF van de 1 a 31, sin huecos. Los diagramas de secuencia (`docs/Arquitectura/secuencia/`) ya usan la numeración nueva. La tabla de equivalencias está al final de la sección de requisitos funcionales.

## El caso

**Caso 4: Gestión de Condominios y Alerta Comunitaria.** La gestión de edificios y urbanizaciones cerradas suele hacerse por grupos de WhatsApp caóticos. La app centraliza la comunicación comunitaria, el registro de visitas y un botón de alerta vecinal para emergencias internas.

Enfoque académico móvil (aprovechar hardware y eventos del teléfono):
- **Seguridad y hardware:** vibración, sonido de alerta y alerta con ubicación (la de la unidad).
- **Pases de visita:** invitaciones en formato imagen/QR para enviar a las visitas por fuera de la app.

## Requisitos funcionales

**Prioridad.** *Alta*: sin esto el módulo no funciona (accesos, visitas y alertas). *Media*: funcionalidad esperada del módulo (avisos, encuestas e incidencias). *Baja*: consulta, historial y reportes. Los criterios de aceptación se redactaron a partir de los diagramas de secuencia y de las restricciones del modelo de datos; cada uno responde qué hago, qué debe pasar y cómo sé que pasó.

### Gestión de usuarios y accesos (Sprint 3)
| ID | Nombre | Descripción | Actor | Prioridad | Criterio de aceptación | Estado |
|---|---|---|---|---|---|---|
| RF1 | Registro con validación de unidad | Registro de residentes con validación de la unidad/departamento asignado por la administración. | Residente | Alta | Cuando un correo dado de alta en `residentes_habilitados` crea su cuenta, entonces se crea su perfil con rol residente y su unidad. Si el correo no está habilitado, el registro se rechaza con el mensaje "Tu correo no está habilitado. Contacta a la directiva". | Definido |
| RF2 | Inicio de sesión | Inicio de sesión con correo y contraseña, o con cuenta de Google. El inicio por celular/SMS quedó fuera de alcance. | Residente, Guardia, Directiva | Alta | Cuando ingreso con correo y contraseña o con Google y tengo perfil, entonces se abre la sesión y veo la pantalla de mi rol. Con credenciales inválidas se muestra un error y no se abre sesión. | Definido |
| RF3 | Tres roles con permisos distintos | Tres roles diferenciados: Directiva (administrador), Residente y Guardia de Seguridad. | Sistema | Alta | Cuando inicia sesión un usuario, entonces ve solo la barra inferior de su rol, y las consultas a datos de otro rol son rechazadas por las políticas RLS de la base. | Definido |
| RF4 | Contactos de emergencia | El residente registra hasta 3 contactos de emergencia con nombre, teléfono y relación (correo opcional). | Residente | Media | Cuando un residente con 3 contactos intenta agregar otro, entonces la base lo rechaza (`orden` entre 1 y 3, único por usuario) y la app oculta el botón "Agregar contacto" y muestra "3 de 3". | Definido |
| RF5 | Alta y baja de residentes | La directiva da de alta o de baja a un residente y lo asocia a su unidad. | Directiva | Alta | Cuando la directiva da de alta un correo con su unidad, entonces queda en `residentes_habilitados` y ese correo puede registrarse. Al darlo de baja, su perfil queda con `activo = false`. | Definido |
| RF6 | Registro de inicio de sesión | Registrar la hora de inicio de sesión. | Sistema | Baja | Cuando un usuario inicia sesión, entonces se inserta una fila en `registros_sesion` con su `usuario_id` y `iniciado_en`. | Definido |

### Avisos y encuestas (Sprint 4)
| ID | Nombre | Descripción | Actor | Prioridad | Criterio de aceptación | Estado |
|---|---|---|---|---|---|---|
| RF7 | Publicar avisos | La directiva publica avisos con título, descripción, imagen adjunta y fecha de vigencia. | Directiva | Media | Cuando la directiva publica un aviso con título, descripción y vigencia (imagen opcional), entonces queda visible para los residentes destinatarios mientras esté vigente. Si `vigente_hasta` no es posterior a `vigente_desde`, se rechaza. | Definido |
| RF8 | Crear encuestas | La directiva crea encuestas con preguntas de opción única o múltiple (pantallas nativas en la app). | Directiva | Media | Cuando la directiva crea una encuesta con preguntas de selección única o múltiple, entonces se guardan las preguntas y opciones en su orden y la encuesta se publica. Si `cierra_en` no es posterior a `abre_en`, se rechaza. | Definido |
| RF9 | Un voto por unidad | Los residentes emiten un voto por encuesta activa, con **un voto por unidad**. | Residente | Media | Cuando dos residentes de la misma unidad votan en una encuesta, entonces solo el primer voto se registra y el segundo es rechazado por la llave única `(encuesta_id, unidad_id)`; la app muestra "Tu unidad ya votó". | Definido |
| RF10 | Filtrar avisos por categoría | Filtrar avisos por categoría (mantenimiento, seguridad, eventos, pagos, etc.). | Residente | Media | Cuando el residente elige una categoría, entonces la lista muestra solo los avisos de esa categoría. | Definido |
| RF11 | Historial de avisos y encuestas | Registro e historial de avisos y encuestas anteriores, consultable. | Residente, Directiva | Baja | Cuando consulto el historial, entonces veo los avisos y encuestas con vigencia o cierre ya pasados, además de los vigentes. | Definido |
| RF12 | Resultados en vivo o al cierre | Mostrar los resultados de la encuesta en tiempo real o al cierre, según la configuración de la directiva. | Residente, Directiva | Media | Cuando `resultados_en_vivo` es verdadero, entonces el conteo se actualiza mientras la encuesta está abierta. Cuando es falso, los resultados se muestran solo al llegar `cierra_en`. | Definido |
| RF13 | Segmentar por sector | Segmentar el envío de avisos y encuestas por torre, pabellón o manzana, en lugar de enviarlos a todo el condominio. | Directiva | Media | Cuando un aviso o encuesta tiene `para_todos = false`, entonces solo lo ven los residentes de los sectores elegidos. Cuando es verdadero, lo ven todos. | Definido |
| RF14 | Encuesta obligatoria | Las encuestas con prioridad alta se marcan como obligatorias. | Directiva | Media | Cuando la directiva marca una encuesta con prioridad alta, entonces se guarda `prioridad = alta` y el residente la ve con la insignia "Obligatoria". | Definido |

### Preautorización de visitas (Sprint 4)
| ID | Nombre | Descripción | Actor | Prioridad | Criterio de aceptación | Estado |
|---|---|---|---|---|---|---|
| RF15 | Crear invitación | El residente genera una invitación indicando nombre del invitado, fecha y hora estimada de llegada. | Residente | Alta | Cuando el residente indica nombre, fecha y hora estimada, entonces se crea un pase en estado `vigente` asociado a su unidad. | Definido |
| RF16 | QR único e irrepetible | Generar automáticamente un código QR único e irrepetible por invitación. | Sistema | Alta | Cuando se crea un pase, entonces la Edge Function lo inserta, Postgres genera su UUID v4 con `gen_random_uuid()` y la app dibuja el QR con ese UUID. Dos pases nunca comparten código. | Definido |
| RF17 | Compartir el pase | Compartir el pase (imagen/QR) por WhatsApp, correo u otras apps del teléfono. | Residente | Media | Cuando el residente toca "Compartir", entonces se abre el menú de compartir del teléfono con la imagen del QR. | Definido |
| RF18 | Escanear el QR | El guardia escanea el QR con la cámara del dispositivo para validar el ingreso. | Guardia | Alta | Cuando el guardia escanea un pase vigente y de hoy, entonces ve "Pase válido" con el nombre del visitante y la unidad. Con un código inexistente o vencido ve "Pase no válido o vencido". | Definido |
| RF19 | Marcar el pase como usado | Marcar el QR como "usado" tras su primer escaneo válido, invalidando reutilizaciones. | Sistema | Alta | Cuando un pase válido se escanea por primera vez, entonces pasa a `usado`. Al escanearlo otra vez se muestra "Pase ya usado". | Definido |
| RF20 | Ingreso y salida | Registrar la hora exacta de ingreso y de salida de cada visita autorizada. | Guardia | Alta | Cuando se valida el ingreso, entonces se guardan `ingreso_en` y `guardia_id`. Cuando el guardia registra la salida, se guarda `salida_en`, que no puede ser anterior al ingreso. | Definido |
| RF21 | Notificar el ingreso | Notificar al residente cuando su visita ingresó (orientado a eventos). | Sistema | Media | Cuando se registra el ingreso de una visita, entonces el residente que creó el pase recibe una notificación. | Definido |
| RF22 | Anular un pase | El residente puede cancelar o anular un pase antes de su uso. | Residente | Media | Cuando el residente anula un pase `vigente`, entonces pasa a `anulado` y se guarda `anulado_en`. Un pase `usado` no se puede anular, y al escanear uno anulado se muestra "Pase anulado". | Definido |

### Botón de alerta temprana (Sprint 5)
| ID | Nombre | Descripción | Actor | Prioridad | Criterio de aceptación | Estado |
|---|---|---|---|---|---|---|
| RF23 | Botón de pánico | Botón de pánico accesible desde la pantalla principal, con tres categorías: Médica, Incendio, Seguridad. | Residente | Alta | Cuando el residente toca "Enviar alerta de emergencia" en Inicio, elige un tipo y confirma, entonces se crea una alerta en estado `activa` con su unidad, en 3 toques o menos (RNF4). | Definido |
| RF24 | Vibración y sonido | Activar vibración y sonido de alerta al presionar el botón, tanto en el emisor como en los receptores. | Sistema | Alta | Cuando el residente confirma la alerta, entonces su teléfono vibra y suena. Cuando la alerta llega a un receptor, su teléfono también vibra y suena. | Definido |
| RF25 | Notificar en tiempo real | Notificar en tiempo real a los vecinos del mismo pabellón/manzana y a la directiva y seguridad. | Sistema | Alta | Cuando se crea una alerta, entonces la reciben los residentes del mismo sector, la directiva y los guardias, con un tiempo promedio de 3 segundos (RNF1). | Definido |
| RF26 | Correo simulado a contactos | *(Fuera de alcance por ahora.)* Simular el envío de un correo con la ubicación a los contactos de emergencia. Queda como próxima feature; por eso `contactos_emergencia.correo` es opcional. | Sistema | — | No se implementa en esta etapa. | Fuera de alcance |
| RF27 | "En camino" y "atendida" | El personal administrativo puede marcar "estoy en camino" o "alerta atendida" sobre una alerta activa. | Guardia, Directiva | Alta | Cuando el personal marca "Estoy en camino", entonces la alerta pasa a `en_camino`. Cuando marca "Marcar como atendida", pasa a `atendida`. Cada acción queda en `alerta_atenciones` con usuario y hora, y el emisor ve el cambio. | Definido |
| RF28 | Historial de alertas | Registro histórico de alertas con fecha, tipo, unidad de origen y estado de resolución. | Directiva, Guardia | Baja | Cuando la directiva o el guardia consulta el historial, entonces ve cada alerta con su fecha, tipo, unidad de origen y estado. | Definido |

### Reporte de incidencias (Sprint 5)
| ID | Nombre | Descripción | Actor | Prioridad | Criterio de aceptación | Estado |
|---|---|---|---|---|---|---|
| RF29 | Reportar una incidencia | El residente reporta una incidencia con foto, descripción y ubicación dentro del condominio (por defecto, su departamento). | Residente | Media | Cuando el residente envía descripción, de 1 a 3 fotos y ubicación (precargada con su unidad), entonces se crea la incidencia en estado `pendiente`. Sin foto la app no permite enviar, y una cuarta foto la rechaza la base. | Definido |
| RF30 | Actualizar el estado | La directiva/mantenimiento actualiza el estado (Pendiente, En atención, Resuelto) y se notifica al residente que la reportó dentro de la app. | Directiva | Media | Cuando la directiva cambia el estado a `en_atencion` o `resuelto`, entonces se guarda el nuevo estado y el residente que la reportó recibe la notificación. | Definido |
| RF31 | Gráfica mensual | La directiva ve la cantidad de incidencias **mensuales** en una gráfica. | Directiva | Baja | Cuando la directiva abre la gráfica, entonces ve la cantidad de incidencias por mes, calculada con `GROUP BY date_trunc('month', creada_en)`. | Definido |

### Equivalencias con la numeración original del Google Doc
| Numeración original | Numeración nueva |
|---|---|
| RF1 a RF6 | RF1 a RF6 (sin cambio) |
| RF8 a RF14 | RF7 a RF13 |
| RF15 (encuestas) | RF14 |
| RF15 (visitas) | RF15 |
| RF16 a RF22 | RF16 a RF22 (sin cambio) |
| RF24 a RF29 | RF23 a RF28 |
| RF31 a RF33 | RF29 a RF31 |

## Requisitos no funcionales

La **métrica** es el umbral que se puede comprobar. La **validación** es la prueba que lo demuestra; las pruebas de esta columna son propuestas hasta que se ejecuten en los sprints.

| ID | Categoría | Requerimiento | Métrica / umbral | Validación |
|---|---|---|---|---|
| RNF1 | Rendimiento / tiempo real | La notificación del botón de pánico llega a los vecinos afectados, con arquitectura orientada a eventos (Supabase Realtime y Expo Push). | Tiempo promedio ≤ 3 s entre la creación de la alerta y su recepción. | Prueba: enviar varias alertas entre dos dispositivos y promediar la diferencia entre `creada_en` y la hora de recepción. |
| RNF2 | Disponibilidad | Disponibilidad mínima para el módulo de alertas. | ≥ 99 %. | Por definir: depende del plan de Supabase; se revisará el registro de disponibilidad del proyecto. |
| RNF3 | Seguridad de los QR | Los QR no son predecibles y expiran pasado el día de la cita. | UUID v4 generado en el servidor; vale solo el día de la visita, hasta las 23:59 (`America/Lima`). | Prueba: escanear un pase del día anterior y comprobar que se rechaza; inspección de que ningún código es secuencial. |
| RNF4 | Usabilidad | El botón de pánico se activa en pocos toques desde la pantalla de inicio. | ≤ 3 toques: Inicio → elegir tipo → confirmar. | Prueba: recorrer el flujo P02 → P03 en la app y contar los toques. |
| RNF5 | Escalabilidad | Soportar unidades residenciales concurrentes sin degradación perceptible. | Hasta 500 unidades. | Por definir: prueba de carga con datos sintéticos sobre Supabase. |
| RNF6 | Seguridad de datos | Cifrado en tránsito y en reposo de los datos sensibles (contactos de emergencia, ubicación, credenciales); permisos por rol impuestos en la base. | HTTPS/WSS en todas las conexiones; RLS activada en el 100 % de las tablas; 0 secretos en el repositorio. | Inspección: revisar el SQL de migración y buscar secretos en el repositorio y su historial. El cifrado en reposo se verificará en el panel de Supabase. |
| RNF7 | Mantenibilidad | Arquitectura en capas (presentación, lógica de negocio, acceso a datos) que permita agregar módulos sin afectar los existentes. | Las pantallas nunca llaman a `supabase-js` directamente; solo lo hacen los repositorios. | Inspección: revisión de código en el pull request contra el diagrama de componentes. |
| RNF8 | Accesibilidad | Interfaz con tamaños definidos y funciones limitadas para simplificar el uso a adultos mayores. | Áreas táctiles ≥ 44 px; botones principales de 52 a 56 px de alto. | Inspección: revisar las pantallas contra el sistema de diseño (`docs/design/DISENO.md`). |
