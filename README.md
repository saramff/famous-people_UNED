# Experimento 6 · Famosos

Experimento de aprendizaje y memoria con jsPsych 8. Las fotografías se cargan directamente desde [saramff/famosos_img](https://github.com/saramff/famosos_img), fijadas a una revisión para mantener constantes los estímulos. No hay que descargarlas.

## Iniciar

1. Instalar Node.js y abrir una terminal en esta carpeta.
2. Ejecutar `npm install` la primera vez.
3. Ejecutar `npm run dev` y abrir la dirección que indique la terminal.

En PowerShell, si la ejecución de scripts está deshabilitada, usar `npm.cmd` en lugar de `npm`. No abrir `index.html` con doble clic: el proyecto necesita el servidor. Requiere conexión a Internet para cargar las fotos y enviar los resultados.

`npm run build` crea la versión publicable en `dist`. `npm run preview` permite revisarla. `npm test` comprueba el diseño y la corrección de respuestas.

## Publicar en Netlify

Importar este repositorio desde GitHub en Netlify y seleccionar la rama `master`. [netlify.toml](netlify.toml) define automáticamente la compilación (`npm test && npm run build`), la carpeta publicada (`dist`), Node.js 22 y la conexión pública al Supabase del experimento. No es necesario subir el `.env` local. Estas opciones siguen la [configuración de Vite en Netlify](https://docs.netlify.com/build/frameworks/framework-setup-guides/vite/) y la [configuración por archivo](https://docs.netlify.com/build/configure-builds/file-based-configuration/).

La URL y la clave `anon` de ese archivo son configuración pública para el navegador; los resultados están protegidos por los permisos y RLS de la tabla. No contiene claves administrativas. Si se cambia de proyecto o se rota la clave, actualizar esos valores y volver a desplegar. Referencia: [claves de Supabase](https://supabase.com/docs/guides/getting-started/api-keys).

La compilación se detiene si faltan la URL o la clave pública, se utiliza una clave administrativa, la clave apunta a otro proyecto o se elige otra tabla. Así se evita publicar una versión sin guardado.

Cuando termine el despliegue, compartir la URL HTTPS que entrega Netlify. Cada participante entra directamente al consentimiento sin iniciar sesión; al terminar se envía su sesión a `public.famous_people_attribute`. Mantener abierta la pestaña hasta que finalice el envío; los reintentos siguen las condiciones descritas en «Datos y guardado».

## Recorrido

| Paso | Presentación | Avance |
| --- | --- | --- |
| Consentimiento y datos | Formularios con logotipos oficiales | Botón; campos obligatorios validados |
| Fase 1 | 48 famosos con nombre y objeto; escala de familiaridad 1–5 | Clic en la escala, sin límite de tiempo |
| Fase 2 | Las mismas 48 imágenes y nombres, en otro orden | Espacio, habilitado después de 5 segundos de observación |
| Fase 3 | Solo 48 frases: 24 verdaderas y 24 falsas | A = NO (izquierda), L = SÍ (derecha) |
| Intermedio | Tetris con líneas completas de la partida actual, sin reloj visible | Termina automáticamente a los 7 minutos |
| Fase 4 | Las 48 imágenes antiguas y 48 nuevas, mezcladas | A = Antiguo (izquierda), L = Nuevo (derecha) |

Hay instrucciones antes de cada fase, una cruz central de 500 ms antes de los estímulos de las fases 1–3 y de 2 segundos antes de cada imagen de reconocimiento. Se mantiene una pausa blanca de 1 segundo después de las imágenes de las fases 1 y 2. En la fase 1 se espera la respuesta de familiaridad: 1 = «Claro que sí», 3 = «Me suena», 5 = «Para nada», sin tiempo mínimo ni máximo. No se muestra feedback de acierto o error.

En la fase 2 se pide observar a la persona y, sobre todo, su objeto. Durante 5 segundos se ignoran las teclas y no aparece ninguna indicación de avance. Después aparece en azul marino «Pulsa la barra espaciadora para continuar.» La imagen permanece hasta una nueva pulsación de Espacio; mantenerlo pulsado desde antes no permite avanzar. Los nombres de ambas presentaciones usan una tipografía más grande. Las etiquetas NO/SÍ y Antiguo/Nuevo se sitúan al 25 % y al 75 % del ancho de la ventana, separadas también del borde inferior.

El participante no ve números ni nombres de fases, ni indicaciones para salir de pantalla completa. Las primeras instrucciones solo piden valorar la familiaridad. Tanto el ejemplo como las imágenes utilizan la misma escala de botones de radio del 1 al 5 unidos por una línea, con los anclajes «Claro que sí», «Me suena» y «Para nada». Al responder bajo una imagen, la opción elegida muestra una bolita azul oscuro durante 300 ms antes de avanzar. La primera selección queda bloqueada. El tiempo de respuesta se mide hasta la elección, sin sumar esa espera; su duración se configura en `TIMING.familiarityFeedback`.

Las imágenes de las tres fases visuales usan el mismo marco cuadrado, centrado en la ventana (hasta 500 × 500 px, reducido en pantallas pequeñas). Se mantiene la proporción original sin recortar objetos ni deformar las fotografías. Las pantallas experimentales y las pausas son blancas.

## Cambiar el experimento sin perderse

- `src/objects.js`: catálogo editable. Cada fila contiene el nombre de archivo, el objeto real y el objeto falso. Debajo están los 48 famosos nuevos. Los arrays `trueSentences` y `falseSentences` se generan a partir del catálogo y comparten índices.
- `src/design.js`: sorteos y evaluación de las teclas. Se sortean 24 famosos para frases verdaderas; los 24 restantes reciben su frase falsa. Nunca se seleccionan ambas frases del mismo famoso ni se repite un objeto falso.
- `src/config.js`: tiempos en milisegundos y versión del experimento.
- `src/main.js`: secuencia de pantallas, instrucciones y campos registrados, con comentarios en español.
- `consentA2.html` y `src/datos.html`: formularios HTML insertados por jsPsych. Hay una sola copia del consentimiento.
- `src/style.css`: aspecto visual y posición común de los estímulos.
- `src/tetris.js`: juego, contador de líneas y limpieza del teclado al terminar.
- `src/storage.js`: envío final al servidor.

Si se modifican objetos, comprobar las imágenes y mantener distintos los 96 objetos del catálogo. `npm test` detecta repeticiones literales; los sinónimos y la correspondencia visual necesitan revisión humana. Las frases falsas se refieren a lo visto en estas imágenes, no a hechos biográficos.

## Datos y guardado

El destino es la tabla nueva `public.famous_people_attribute` del mismo proyecto de Supabase que el experimento anterior. Se mantienen la URL y la clave pública de `.env`; `VITE_SUPABASE_TABLE=famous_people_attribute` selecciona la nueva tabla.

1. Abrir el **SQL Editor del proyecto anterior** y ejecutar una vez [supabase/crear_tabla.sql](supabase/crear_tabla.sql). Si ya existe una tabla con ese nombre, el script se cancela sin modificarla.
2. Comprobar que `.env` contiene la URL y la clave pública o `anon` de ese proyecto, además de la nueva tabla. [.env.example](.env.example) muestra los nombres de las variables; nunca usar una clave `service_role` o secreta en el navegador.
3. Reiniciar `npm run dev` o volver a ejecutar `npm run build` y publicar el nuevo `dist`. Vite incorpora estas variables al compilar.

El SQL crea una fila por sesión: UUID de sesión y participante, fecha de recepción, versión, edad, sexo y columna `data` JSONB con el registro completo. Los campos de análisis se generan desde `data`, para que no puedan diferir del JSON original. La clave primaria impide duplicar una sesión. RLS y los permisos permiten únicamente insertar la columna `data`: los participantes no pueden consultar, modificar ni borrar resultados. El equipo puede analizarlos desde el SQL Editor o Table Editor con su acceso administrativo. Referencia: [seguridad de la API de Supabase](https://supabase.com/docs/guides/api/securing-your-api).

Solo se solicitan y guardan edad y sexo como datos demográficos. No se piden ni guardan nombre, apellidos, centro asociado ni lengua materna. Se genera automáticamente un `participant_id` aleatorio (UUID) para cada participación, presente en el registro general, en `participant` y en todos los ensayos. Al recargar se genera otro identificador; no se intenta identificar a una persona entre sesiones. `session_id` conserva el mismo valor por compatibilidad con el formato anterior.

Al finalizar se envía un objeto JSON con `participant_id`, `session_id`, `participant`, `trials`, `interactions`, `orders`, versiones y tiempos del protocolo. `trials` contiene una fila por ensayo de jsPsych. El participante no dispone de opciones para descargar los datos.

| Campo | Significado |
| --- | --- |
| `participant_id` | Identificador aleatorio del participante en esta sesión |
| `session_id` | Mismo valor que `participant_id`; permite detectar duplicados tras reintentos de red |
| `sex`, `age` | Sexo y edad en años |
| `phase`, `task`, `order_in_phase` | Fase, tipo de ensayo y posición dentro de la fase |
| `stimulus_id`, `person_name`, `image_file`, `image_url` | Identidad estable y fotografía correspondiente |
| `familiarity` | Valor 1–5 de la primera fase |
| `sentence`, `sentence_index`, `sentence_is_true`, `sentence_type` | Frase realmente presentada, índice y condición verdadera/falsa de fase 3 |
| `actual_object`, `stated_object` | Objeto real y objeto mencionado en la frase |
| `response`, `response_meaning` | Tecla registrada y significado: SÍ/NO o Antiguo/Nuevo |
| `correct_response`, `correct_response_meaning` | Tecla y respuesta esperadas |
| `correct`, `accuracy` | Booleano de acierto y etiqueta Correcta/Incorrecta, calculados por separado en cada fase |
| `image_is_old`, `image_type` | Condición de la imagen en fase 4 |
| `phase3_sentence_is_true`, `phase3_sentence` | Condición previa del famoso antiguo; vacíos para los nuevos |
| `rt` | Tiempo de respuesta en milisegundos; en reexposición se mide desde que aparece la indicación de Espacio |
| `minimum_exposure_ms`, `rt_from_image_ms` | Tiempo mínimo de observación en reexposición y tiempo total hasta pulsar Espacio desde que aparece la imagen |
| `feedback_duration_ms` | Tiempo que permanece visible la selección de familiaridad antes de avanzar; no se suma a `rt` |
| `planned_duration_ms`, `observed_duration_ms` | Duración prevista cuando existe y duración observada del ensayo |
| `trial_index`, `time_elapsed`, `recorded_at` | Índice global, tiempo acumulado y fecha ISO |
| `lines`, `game_lines`, `best_game_lines` | Total de líneas del intermedio (solo en datos), líneas de la última partida y mejor partida |
| `games_started`, `game_overs` | Partidas iniciadas y perdidas en Tetris |
| `key_actions`, `active_ms`, `duration_ms` | Acciones del juego, tiempo con una partida en curso y duración del intermedio |

Para analizar, filtrar `task = verification` (fase 3) o `task = recognition` (fase 4). Unir ambas tablas por **`session_id` + `stimulus_id`**. La corrección en reconocimiento no depende de la respuesta anterior. La familiaridad se une con esas mismas claves. `response` de familiaridad conserva el índice 0–4 por compatibilidad; usar `familiarity` (1–5) para analizar la escala. Las fases siguen registradas en los datos, aunque no se muestran al participante.

Las respuestas se mantienen únicamente en memoria mientras la página está abierta. No se guardan copias locales ni se ofrecen descargas. Cada recarga comienza directamente desde el consentimiento, con una sesión y un sorteo nuevos, sin pantalla de recuperación ni aviso de confirmación. Al iniciar se elimina cualquier copia local dejada por la versión anterior, sin tocar otros datos del navegador.

Al finalizar se muestra únicamente el agradecimiento, con los logotipos. El envío se realiza en segundo plano, sin botones ni mensajes para el participante. Ante fallos temporales de red, tiempo de espera, límite de solicitudes o servidor, se hacen hasta tres intentos con la misma sesión, con pausas de 1 y 3 segundos y un máximo de 15 segundos por petición. Si se perdió la respuesta de un envío ya aceptado, la restricción única permite reconocerlo sin duplicar ni sobrescribir el resultado. Los errores de configuración o permisos no se reintentan. Si se agotan los intentos, se registra únicamente el código de error en la consola, sin incluir respuestas.

La pestaña debe permanecer abierta hasta que termine el envío. Los reintentos no sobreviven al cierre o a la recarga y no se crean copias locales. Las sesiones ya recibidas se conservan en el servidor.

Los cambios de foco/pantalla completa se registran en `interactions`; conviene revisarlos al analizar la calidad de los datos. El límite interno de 7 minutos del Tetris sigue corriendo entre partidas y al cambiar de ventana; el navegador puede retrasar la transición si suspende la pestaña. La duración observada queda registrada. El único marcador visible cuenta las líneas completas de la partida actual y vuelve a cero al pulsar «Volver a jugar». No se calculan puntos ni se muestra tiempo restante.

Antes de recoger participantes, el equipo responsable debe revisar el texto de consentimiento, ejecutar el SQL y verificar un envío autorizado en su destino real. Las pruebas automáticas interceptan el envío o usan una base local para no introducir participantes ficticios en Supabase.

Las pruebas de almacenamiento se ejecutan con `npm test`: comprueban el JSON enviado, los reintentos, la detección de duplicados, los errores de permisos y la cancelación por tiempo de espera. No contactan con la base real.

## Fuentes de los logotipos

Las copias locales de `public/logos` proceden de las webs oficiales de la [UNED](https://www.uned.es) y de su [Facultad de Psicología](https://www.uned.es/universidad/facultades/psicologia.html). Se usan solo en formularios y pantallas de instrucciones/finalización.
