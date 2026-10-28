# Agent Guide

## Proyecto

Transcriptora es una aplicación de escritorio para Windows que permite grabar micrófono y audio del sistema, importar archivos de audio o vídeo y guardarlos junto con su transcripción local.

## Principios

- Mantener los datos en el dispositivo del usuario por defecto.
- No añadir servicios de pago ni enviar audio a terceros sin una decisión explícita del usuario.
- Solicitar y comunicar claramente el consentimiento antes de capturar una llamada o el audio del sistema.
- Priorizar una interfaz accesible en español y conservar el texto original de cada transcripción.

## Desarrollo

- Antes de añadir dependencias, justificar por qué son necesarias y preferir alternativas mantenidas y de código abierto.
- Separar la captura de audio, el procesamiento/transcripción, el almacenamiento local y la interfaz de usuario.
- No incluir claves, tokens, archivos de audio personales ni modelos descargados en Git.
- Añadir pruebas o verificación proporcional a cada cambio funcional.

## Git

- `main` debe mantenerse estable y documentado.
- El trabajo nuevo se desarrolla en ramas `feature/<nombre>`.
- Los commits deben ser pequeños, descriptivos y no mezclar cambios no relacionados.
