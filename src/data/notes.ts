import Database from "@tauri-apps/plugin-sql";

const DATABASE_URL = "sqlite:transcriptora.db";

type NoteRow = {
  id: number;
  title: string;
  favorite: number;
  created_at: string;
  updated_at: string;
};

export type StoredNote = {
  id: number;
  title: string;
  favorite: boolean;
  createdAt: string;
  updatedAt: string;
};

export type StoredMedia = {
  noteId: number;
  fileName: string;
  storedPath: string;
  mediaKind: string;
};

let databasePromise: Promise<Database> | undefined;

function database() {
  databasePromise ??= Database.load(DATABASE_URL);
  return databasePromise;
}

function toNote(row: NoteRow): StoredNote {
  return {
    id: row.id,
    title: row.title,
    favorite: Boolean(row.favorite),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listNotes(): Promise<StoredNote[]> {
  const db = await database();
  const rows = await db.select<NoteRow[]>(`
    SELECT id, title, favorite, created_at, updated_at
    FROM notes
    ORDER BY favorite DESC, datetime(updated_at) DESC, id DESC
  `);
  return rows.map(toNote);
}

export async function createNote(title = "Nota sin título"): Promise<StoredNote> {
  const db = await database();
  const result = await db.execute(
    "INSERT INTO notes (title, favorite, created_at, updated_at) VALUES ($1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
    [title],
  );
  const rows = await db.select<NoteRow[]>(
    "SELECT id, title, favorite, created_at, updated_at FROM notes WHERE id = $1",
    [result.lastInsertId],
  );
  const note = rows[0];
  if (!note) throw new Error("No se pudo crear la nota local.");
  return toNote(note);
}

export async function renameNote(id: number, title: string): Promise<void> {
  const db = await database();
  await db.execute(
    "UPDATE notes SET title = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
    [title, id],
  );
}

export async function setFavorite(id: number, favorite: boolean): Promise<void> {
  const db = await database();
  await db.execute(
    "UPDATE notes SET favorite = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
    [favorite ? 1 : 0, id],
  );
}

export async function removeNote(id: number): Promise<void> {
  const db = await database();
  await db.execute("DELETE FROM notes WHERE id = $1", [id]);
}

export async function saveImportedMedia(media: StoredMedia): Promise<void> {
  const db = await database();
  await db.execute(
    "INSERT INTO media_items (note_id, file_name, stored_path, media_kind) VALUES ($1, $2, $3, $4)",
    [media.noteId, media.fileName, media.storedPath, media.mediaKind],
  );
}
