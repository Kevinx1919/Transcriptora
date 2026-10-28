# AGENTS.md

## Propósito

Este archivo contiene el contexto operativo para los agentes que trabajen en Transcriptora. El README está dirigido a las personas que usan o contribuyen al proyecto; aquí se documentan convenciones, verificaciones y decisiones de desarrollo.

## Contexto del producto

Transcriptora será una aplicación de escritorio para Windows que permite:

- Grabar micrófono y audio del sistema, siempre con consentimiento visible.
- Importar archivos de audio y vídeo.
- Transcribir localmente y conservar el idioma original.
- Guardar notas, títulos, archivos y transcripciones en el dispositivo.

La primera versión no debe requerir servicios de pago ni enviar audio a terceros por defecto.

## Entorno de desarrollo

- La stack de la aplicación todavía no se ha inicializado. Antes de añadir una dependencia o una herramienta de compilación, documentar la elección en el README o en la documentación técnica correspondiente.
- Preferir dependencias mantenidas, de código abierto y compatibles con Windows.
- Mantener separadas la captura de audio, el procesamiento/transcripción, el almacenamiento local y la interfaz de usuario.
- No incluir claves, tokens, audios personales, transcripciones privadas ni modelos descargados en Git.
- Usar rutas relativas y evitar asumir que todos los equipos tienen GPU NVIDIA.

## Convenciones de desarrollo

- Preservar la privacidad local como comportamiento predeterminado.
- Solicitar y comunicar claramente el consentimiento antes de habilitar la captura de llamadas o del audio del sistema.
- Conservar siempre el texto transcrito original; una traducción futura debe guardarse como contenido adicional, no sustituirlo.
- Incluir estados de carga, error y cancelación para las tareas largas de importación, grabación y transcripción.
- No prometer precisión perfecta: facilitar edición manual y, cuando exista, conservar marcas de tiempo.

## Pruebas y verificación

- Añadir o actualizar pruebas para el código que cambie.
- Ejecutar el formateador, linter, comprobación de tipos y pruebas definidos por la stack antes de hacer commit.
- Corregir todos los errores de pruebas o tipos antes de proponer una integración.
- Tras cambiar dependencias, rutas, importaciones o configuración de compilación, ejecutar una compilación de producción si el entorno ya está disponible.
- Cuando una función interactúe con audio, comprobar al menos los casos de permiso denegado, dispositivo no disponible, archivo inválido y cancelación.

## Git y pull requests

- `main` debe mantenerse estable y contener cambios revisados.
- Todo desarrollo nuevo se realiza en ramas `feature/<nombre>`.
- Mantener commits pequeños, descriptivos y centrados en un objetivo.
- No mezclar cambios no relacionados ni incluir artefactos generados.
- El título de un pull request debe describir el resultado para la persona usuaria, no solo la implementación.
