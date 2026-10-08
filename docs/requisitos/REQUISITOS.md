# Requisitos de NeighborGood

Copia local del Google Doc "Requerimentos funcionales" (carpeta de Drive del proyecto), para que Claude Code pueda leerla sin acceso a Drive. Si el Google Doc cambia, actualiza este archivo.

> **Aviso sobre la numeración.** Los requisitos de abajo conservan la numeración **original del Google Doc**, que tiene errores: faltan el RF7, el RF23 y el RF30, y el **RF15 aparece dos veces** (uno de encuestas y otro de visitas). Los diagramas de secuencia (`docs/Arquitectura/secuencia/`) usan esta misma numeración. Para distinguir el duplicado se escribe **RF15-encuesta** y **RF15-visita**. Está pendiente renumerar todo de forma consecutiva y propagar el cambio a los diagramas.

## El caso

**Caso 4: Gestión de Condominios y Alerta Comunitaria.** La gestión de edificios y urbanizaciones cerradas suele hacerse por grupos de WhatsApp caóticos. La app centraliza la comunicación comunitaria, el registro de visitas y un botón de alerta vecinal para emergencias internas.

Enfoque académico móvil (aprovechar hardware y eventos del teléfono):
- **Seguridad y hardware:** vibración, sonido de alerta y alerta con ubicación.
- **Pases de visita:** invitaciones en formato imagen/QR para enviar a las visitas por fuera de la app.

## Requisitos funcionales

### Gestión de usuarios y accesos
- **RF1.** Registro de residentes con validación de la unidad/departamento asignado por la administración.
- **RF2.** Inicio de sesión con correo y contraseña, o con cuenta de Google. *(El Doc también menciona celular; el SMS quedó fuera de alcance.)*
- **RF3.** Tres roles diferenciados con permisos distintos: Directiva (administrador), Residente y Guardia de Seguridad.
- **RF4.** El residente registra hasta 3 contactos de emergencia con nombre, teléfono y relación.
- **RF5.** La directiva da de alta o de baja a un residente y lo asocia a su unidad.
- **RF6.** Registrar la hora de inicio de sesión.
- *(RF7 no existe: hueco en la numeración.)*

### Avisos y encuestas
- **RF8.** La directiva publica avisos con título, descripción, imagen adjunta y fecha de vigencia.
- **RF9.** La directiva crea encuestas con preguntas de opción única o múltiple. *(El Doc pedía evaluar Google Forms o pantallas nativas. Decidido: pantallas nativas en la app.)*
- **RF10.** Los residentes emiten un voto por encuesta activa, con **un voto por unidad**.
- **RF11.** Filtrar avisos por categoría (mantenimiento, seguridad, eventos, pagos, etc.).
- **RF12.** Registro e historial de avisos y encuestas anteriores, consultable.
- **RF13.** Mostrar los resultados de la encuesta en tiempo real o al cierre, según la configuración de la directiva.
- **RF14.** Segmentar el envío de avisos y encuestas por torre, pabellón o manzana, en lugar de enviarlos a todo el condominio.
- **RF15-encuesta.** Las encuestas con prioridad alta se marcan como obligatorias.

### Preautorización de visitas
- **RF15-visita.** El residente genera una invitación indicando nombre del invitado, fecha y hora estimada de llegada.
- **RF16.** Generar automáticamente un código QR único e irrepetible por invitación.
- **RF17.** Compartir el pase (imagen/QR) por WhatsApp, correo u otras apps del teléfono.
- **RF18.** El guardia escanea el QR con la cámara del dispositivo para validar el ingreso.
- **RF19.** Marcar el QR como "usado" tras su primer escaneo válido, invalidando reutilizaciones.
- **RF20.** Registrar la hora exacta de ingreso y de salida de cada visita autorizada.
- **RF21.** Notificar al residente cuando su visita ingresó (orientado a eventos).
- **RF22.** El residente puede cancelar o anular un pase antes de su uso.
- *(RF23 no existe: hueco en la numeración.)*

### Botón de alerta temprana
- **RF24.** Botón de pánico accesible desde la pantalla principal, con tres categorías: Médica, Incendio, Seguridad.
- **RF25.** Activar vibración y sonido de alerta al presionar el botón, tanto en el emisor como en los receptores.
- **RF26.** Notificar en tiempo real a los vecinos del mismo pabellón/manzana y a la directiva y seguridad.
- **RF27.** *(Fuera de alcance por ahora.)* Simular el envío de un correo con la ubicación a los contactos de emergencia. Queda como próxima feature; por eso `contactos_emergencia.correo` es opcional.
- **RF28.** El personal administrativo puede marcar "estoy en camino" o "alerta atendida" sobre una alerta activa.
- **RF29.** Registro histórico de alertas con fecha, tipo, unidad de origen y estado de resolución.
- *(RF30 no existe: hueco en la numeración.)*

### Reporte de incidencias
- **RF31.** El residente reporta una incidencia con foto, descripción y ubicación dentro del condominio (por defecto, su departamento).
- **RF32.** La directiva/mantenimiento actualiza el estado (Pendiente, En atención, Resuelto) y se notifica al residente que la reportó dentro de la app.
- **RF33.** La directiva ve la cantidad de incidencias **mensuales** en una gráfica.

## Requisitos no funcionales
1. **Rendimiento / tiempo real.** La notificación del botón de pánico llega a los vecinos afectados en **3 segundos en promedio**, con arquitectura orientada a eventos (en este proyecto: Supabase Realtime y Expo Push).
2. **Disponibilidad.** Mínimo 99 % para el módulo de alertas.
3. **Seguridad de los QR.** Los QR expiran pasado el día de la cita y no son predecibles (UUID v4, criptográficamente seguro). *(Resuelto: vale solo el día de la visita, hasta las 23:59 hora de Lima.)*
4. **Usabilidad.** El botón de pánico debe ser operable en pocos toques desde cualquier pantalla. **Pendiente:** el Doc no tiene el número ("menos de _ toques"); definirlo.
5. **Escalabilidad.** Hasta 500 unidades residenciales concurrentes sin degradación perceptible.
6. **Seguridad de datos.** Cifrado en tránsito y en reposo de los datos sensibles (contactos de emergencia, ubicación, credenciales).
7. **Mantenibilidad.** Arquitectura en capas (presentación, lógica de negocio, acceso a datos) que permita agregar módulos sin afectar los existentes.
8. **Accesibilidad.** Interfaz con tamaños definidos y funciones limitadas para simplificar el uso a adultos mayores.
