use serde::Serialize;
use std::{fs, time::{SystemTime, UNIX_EPOCH}};
use tauri::{AppHandle, Manager};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_sql::{Migration, MigrationKind};

const DATABASE_URL: &str = "sqlite:transcriptora.db";

fn migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "create_notes_table",
            sql: r#"
            CREATE TABLE IF NOT EXISTS notes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                favorite INTEGER NOT NULL DEFAULT 0 CHECK (favorite IN (0, 1)),
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at DESC);
            CREATE INDEX IF NOT EXISTS idx_notes_favorite ON notes(favorite DESC, updated_at DESC);
        "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "create_media_items_table",
            sql: r#"
                CREATE TABLE IF NOT EXISTS media_items (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    note_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
                    file_name TEXT NOT NULL,
                    stored_path TEXT NOT NULL,
                    media_kind TEXT NOT NULL,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );

                CREATE INDEX IF NOT EXISTS idx_media_items_note_id ON media_items(note_id);
            "#,
            kind: MigrationKind::Up,
        },
    ]
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ImportedMedia {
    file_name: String,
    stored_path: String,
    media_kind: String,
}

#[tauri::command]
fn import_local_media(app: AppHandle) -> Result<Option<ImportedMedia>, String> {
    let selected = app
        .dialog()
        .file()
        .add_filter("Audio y vídeo", &["mp3", "wav", "m4a", "mp4", "mov", "webm"])
        .blocking_pick_file();

    let Some(selected) = selected else {
        return Ok(None);
    };
    let source = selected
        .as_path()
        .ok_or_else(|| "No pudimos leer el archivo seleccionado.".to_string())?;
    let extension = source
        .extension()
        .and_then(|value| value.to_str())
        .map(str::to_ascii_lowercase)
        .ok_or_else(|| "El archivo no tiene un formato compatible.".to_string())?;
    let allowed_extensions = ["mp3", "wav", "m4a", "mp4", "mov", "webm"];
    if !allowed_extensions.contains(&extension.as_str()) {
        return Err("Formato no compatible. Elige MP3, WAV, M4A, MP4, MOV o WebM.".to_string());
    }

    let original_name = source
        .file_name()
        .and_then(|value| value.to_str())
        .ok_or_else(|| "El archivo seleccionado no tiene un nombre válido.".to_string())?
        .to_string();
    let media_directory = app
        .path()
        .app_local_data_dir()
        .map_err(|error| format!("No pudimos preparar el almacenamiento local: {error}"))?
        .join("media");
    fs::create_dir_all(&media_directory)
        .map_err(|error| format!("No pudimos crear el almacenamiento local: {error}"))?;
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| format!("No pudimos preparar el archivo: {error}"))?
        .as_millis();
    let destination = media_directory.join(format!("{timestamp}.{extension}"));
    fs::copy(source, &destination)
        .map_err(|error| format!("No pudimos guardar una copia local del archivo: {error}"))?;

    Ok(Some(ImportedMedia {
        file_name: original_name,
        stored_path: destination.to_string_lossy().to_string(),
        media_kind: extension,
    }))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(DATABASE_URL, migrations())
                .build(),
        )
        .invoke_handler(tauri::generate_handler![import_local_media])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
