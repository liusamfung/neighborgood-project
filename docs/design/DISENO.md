# Diseño de NeighborGood

Sistema de diseño, mapa de pantallas y correcciones pendientes de los mockups.

## Cómo usar los mockups
- `mockups/*.dc.html`: una pantalla por archivo (390 × 844 px). Contienen los valores exactos (colores, tamaños, textos). Son **referencia visual**, no código para copiar: usan `div` y CSS, que no existen en React Native. Hay que traducirlos a componentes de React Native (React Native Paper, por confirmar) y `StyleSheet`.
- `capturas/<rol>/*.png`: la misma pantalla como imagen. `capturas/sistema/main.png` es la hoja del sistema de diseño.
- `mockups/canvas.json`: posiciones del lienzo de Claude Design. No hace falta para programar.
- Todos los datos de los mockups son **ficticios** (Condominio Los Álamos, María Rojas, Carlos Pérez, 38 de 60 unidades). No usarlos como datos reales.
- **Si un mockup contradice el modelo de datos o los requisitos, manda el modelo.** Las diferencias conocidas están en la sección "Correcciones pendientes".

## Sistema de diseño ("Vecindario cálido")

### Colores
| Uso | Valor |
|---|---|
| Principal (botones, íconos activos, enlaces) | `#0F766E` |
| Suave (fondos de íconos y pestaña activa) | `#D5EFEA` |
| Acento (insignia "Obligatoria") | `#F59E0B` |
| Fondo de pantalla | `#F6F8F7` |
| Tarjetas y campos | `#FFFFFF`, borde `#E2E8E6` (campos: `#CBD5D1`) |
| Texto | `#1F2937` |
| Texto secundario | `#5B6672` |
| Emergencia (botón de pánico, confirmar alerta) | `#DC2626` |
| Peligro suave (anular, cerrar sesión) | texto `#B91C1C`, borde `#DC2626` |

### Tipos de alerta
| Tipo | Color | Ícono |
|---|---|---|
| Médica | `#DC2626` | cruz |
| Incendio | `#C2410C` | llama |
| Seguridad | `#4338CA` | escudo |

### Estados (chips)
| Estado | Fondo | Texto |
|---|---|---|
| Incidencia **Pendiente** | `#FEF3C7` | `#92400E` |
| Incidencia **En atención** | `#DBEAFE` | `#1D4ED8` |
| Incidencia **Resuelto** | `#DCFCE7` | `#15803D` |
| Pase **Vigente** | `#DCFCE7` | `#15803D` |
| Pase **Usado** | `#E5E7EB` | `#374151` |
| Pase **Anulado** / resultados de escaneo inválidos | `#FEE2E2` | `#991B1B` |

Para los **estados de alerta** (`activa`, `en_camino`, `atendida`) ver la corrección 1 más abajo.

### Tipografía (Inter)
Título 22/700 · Subtítulo 16/600 · Cuerpo 14/400 · Etiqueta 12/600 en mayúsculas (color principal).

### Forma y espacio
Radios: campos y botones 12, tarjetas 16, chips 999. Margen lateral 20, separación entre tarjetas 12. Botones principales de 52–56 px de alto. Áreas táctiles mínimas de 44 px.

### Componentes
Botón primario / secundario (borde) / emergencia / deshabilitado · campo de texto con etiqueta · área de texto · chips de filtro y de sectores · radio y casilla · interruptor · tarjeta · barra de pestañas inferior (ícono + texto, pestaña activa con pastilla suave) · barra superior con flecha de volver.
Íconos de trazo de 2 px (set tipo Lucide/Feather); en React Native usar la familia de íconos de la librería de componentes elegida.

### Reglas de viabilidad (React Native + Expo)
Solo celular y modo claro. Barra inferior por rol; pantallas apiladas con flecha de volver para detalles y formularios. Dispositivo: cámara (escáner QR), galería (fotos), vibración y notificaciones push. Sin mapas.

## Navegación por rol
| Rol | Barra inferior |
|---|---|
| Residente | Inicio · Avisos · Visitas · Incidencias · Perfil |
| Guardia | Alertas · Escáner |
| Directiva | Panel · Avisos · Encuestas · Incidencias |

## Mapa de pantallas
Las rutas son una **propuesta** con Expo Router (la navegación aún no está cerrada). "Sin mockup" indica pantallas necesarias que todavía no se han diseñado.

### Residente
| ID | Pantalla | Mockup / captura | Ruta propuesta | Tablas principales | RF |
|---|---|---|---|---|---|
| P1 | Login y registro | `P01_Login` | `app/(auth)/login.tsx` | `auth.users`, `residentes_habilitados`, `perfiles`, `registros_sesion` | RF1, RF2, RF6 |
| P2 | Inicio | `P02_Inicio` | `app/(residente)/(tabs)/index.tsx` | `alertas`, `avisos`, `encuestas`, `pases_visita` | RF24 |
| P3 | Elegir tipo de alerta y confirmar | `P03_TipoAlerta` | `app/(residente)/alerta/tipo.tsx` | `alertas` | RF24–RF26 |
| P3b | Alerta enviada | `P03b_AlertaEnviada` | `app/(residente)/alerta/enviada.tsx` | `alertas` | RF24 |
| P4 | Avisos (lista y detalle) | `P04_Avisos` | `app/(residente)/(tabs)/avisos.tsx` | `avisos`, `categorias_aviso` | RF11, RF12 |
| P5 | Encuesta (votar) | `P05_Encuesta` | `app/(residente)/encuesta/[id].tsx` | `encuestas`, `encuesta_preguntas`, `encuesta_opciones`, `votos`, `voto_opciones` | RF10 |
| P6 | Visitas y pase QR | `P06_Visitas` | `app/(residente)/(tabs)/visitas.tsx` | `pases_visita` | RF15-visita–RF17, RF22 |
| P7 | Reportar incidencia | `P07_Incidencia` | `app/(residente)/incidencias/nueva.tsx` | `incidencias`, `incidencia_fotos` | RF31 |
| P8 | Perfil y contactos de emergencia | `P08_Perfil` | `app/(residente)/(tabs)/perfil.tsx` | `perfiles`, `contactos_emergencia` | RF4 |

### Guardia
| ID | Pantalla | Mockup / captura | Ruta propuesta | Tablas principales | RF |
|---|---|---|---|---|---|
| P9 | Alertas activas | `P09_AlertasGuardia` | `app/(guardia)/(tabs)/alertas.tsx` | `alertas` | RF26, RF29 |
| P10 | Detalle de la alerta | `P10_DetalleAlerta` | `app/(guardia)/alerta/[id].tsx` | `alertas`, `alerta_atenciones`, `contactos_emergencia` | RF28 |
| P11 | Escáner QR | `P11_EscanerQR` | `app/(guardia)/(tabs)/escaner.tsx` | `pases_visita` | RF18–RF20 |

### Directiva
| ID | Pantalla | Mockup / captura | Ruta propuesta | Tablas principales | RF |
|---|---|---|---|---|---|
| P12 | Panel | `P12_Panel` | `app/(directiva)/(tabs)/index.tsx` | `alertas`, `incidencias`, `encuestas`, `votos` | RF29, RF33 |
| P13 | Crear aviso | `P13_CrearAviso` | `app/(directiva)/avisos/nuevo.tsx` | `avisos`, `aviso_sectores` | RF8, RF14 |
| P14 | Crear encuesta | `P14_CrearEncuesta` | `app/(directiva)/encuestas/nueva.tsx` | `encuestas`, `encuesta_sectores`, `encuesta_preguntas`, `encuesta_opciones` | RF9, RF14, RF15-encuesta |
| P14b | Resultados de la encuesta | `P14b_Resultados` | `app/(directiva)/encuestas/[id]/resultados.tsx` | `votos`, `voto_opciones` | RF13 |
| P15 | Gestión de incidencias | `P15_Incidencias` | `app/(directiva)/(tabs)/incidencias.tsx` | `incidencias`, `incidencia_fotos` | RF32 |

### Pantallas sin mockup (necesarias)
- Crear cuenta (registro con correo habilitado).
- Residente: lista de mis incidencias (pestaña Incidencias) y su detalle con el estado; formulario para agregar o editar un contacto de emergencia; historial de avisos y encuestas pasadas (RF12).
- Directiva: lista de avisos (pestaña Avisos) y lista de encuestas (pestaña Encuestas); alta y baja de residentes habilitados (RF5); historial de alertas (RF29); gráfica mensual de incidencias (RF33).
- Guardia: registro de salida de una visita (RF20) y su historial.

## Correcciones pendientes de los mockups
Los mockups se hicieron antes de cruzarlos con el modelo de datos. Estas diferencias deben resolverse **a favor del modelo**:

| # | Pantalla | Mockup | Debe ser (modelo / requisitos) |
|---|---|---|---|
| 1 | P3b, P9, P10, P12 | Las alertas usan los estados *Pendiente*, *En atención* y *Resuelto*, y el guardia tiene un solo botón "Atender". | Estados de alerta: `activa`, `en_camino`, `atendida` (RF28). Etiquetas sugeridas: **Activa**, **En camino**, **Atendida**. El personal tiene dos acciones: "Estoy en camino" y "Marcar como atendida". "Resueltas hoy" pasa a "Atendidas hoy". |
| 2 | P6 | "Nuevo pase para hoy", solo con el nombre. | Pedir **nombre, fecha de la visita y hora estimada** (`nombre_visitante`, `fecha_visita`, `hora_estimada`; RF15-visita). |
| 3 | P7 | Sin campo de ubicación; "Puedes añadir varias" fotos. | Agregar **Ubicación**, precargada con la unidad y editable (`ubicacion`; RF31). Fotos: **mínimo 1 (lo valida la app) y máximo 3** (límite en la base). |
| 4 | P13 | Sin imagen ni fechas. | Agregar **imagen adjunta opcional** y **vigencia** desde/hasta (`imagen_path`, `vigente_desde`, `vigente_hasta`; RF8). La lista de categorías sale de `categorias_aviso`, no está fija. |
| 5 | P14 | Sin categoría, fechas ni opción de resultados en vivo. | Agregar **categoría** (`categoria_id`), **apertura y cierre** (`abre_en`, `cierra_en`) y el interruptor **Resultados en vivo** (`resultados_en_vivo`; RF13). "Obligatoria" equivale a `prioridad = alta`. "Todo el condominio" equivale a `para_todos = true`. |
| 6 | P8 | Botón "Agregar contacto" siempre visible. | Máximo **3 contactos**: mostrar "2 de 3" y ocultar el botón al llegar a 3. El correo es opcional (para la próxima feature). |
| 7 | P12 | Sin gráfica. | Agregar la **gráfica mensual de incidencias** (RF33), por ejemplo en el panel o en P15. |
| 8 | P1 | Solo correo. | Correcto por ahora: el inicio por celular/SMS quedó fuera de alcance. El enlace "Crear cuenta" existe, pero falta diseñar la pantalla de registro. |

Los mockups se corregirán en Claude Design y se volverán a exportar; hasta entonces, implementar según la columna "Debe ser".

## Ajustes de nombres de archivos de captura
Los PNG deben llamarse igual que su mockup: `P01_Login.png`, `P02_Inicio.png`, `P03_TipoAlerta.png`, `P03b_AlertaEnviada.png`, `P04_Avisos.png`, `P05_Encuesta.png`, `P06_Visitas.png`, `P07_Incidencia.png`, `P08_Perfil.png`, `P09_AlertasGuardia.png`, `P10_DetalleAlerta.png`, `P11_EscanerQR.png`, `P12_Panel.png`, `P13_CrearAviso.png`, `P14_CrearEncuesta.png`, `P14b_Resultados.png`, `P15_Incidencias.png`. Faltan por exportar: `P14b_Resultados.png` y `P15_Incidencias.png`.
