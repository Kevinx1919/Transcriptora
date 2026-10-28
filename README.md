# Transcriptora

Aplicación de escritorio para Windows orientada a grabar, importar y transcribir audio y vídeo de forma local.

## Objetivo de la primera versión

- Grabar micrófono y audio del sistema con consentimiento visible.
- Importar MP3, WAV, M4A, MP4, MOV y WebM.
- Detectar el idioma hablado y transcribirlo conservando el idioma original.
- Guardar notas, títulos y transcripciones en el equipo.
- Permitir editar títulos y texto en una interfaz inspirada en un bloc de notas moderno.

La primera versión no dependerá de una API de pago ni de sincronización en la nube. La dirección técnica elegida es Tauri 2, React, TypeScript y Rust; las notas y transcripciones se almacenarán en SQLite y las grabaciones en una carpeta local administrada por la app. La transcripción se integrará posteriormente con un motor Whisper ejecutado en el dispositivo. La traducción automática y los resúmenes se evaluarán en fases posteriores.

## Privacidad y consentimiento

La persona que use la aplicación es responsable de obtener el consentimiento de quienes participen en una llamada o grabación. Los audios, las transcripciones y las notas se guardarán exclusivamente de forma local en la primera versión.

## Estado

El repositorio se está inicializando. La siguiente fase se desarrollará en `feature/integraciones`.
