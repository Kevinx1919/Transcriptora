import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  createNote as createStoredNote,
  listNotes,
  removeNote,
  renameNote as renameStoredNote,
  saveImportedMedia,
  setFavorite,
} from "./data/notes";
import "./App.css";

type Note = { id: number; title: string; updatedAt: string; favorite: boolean };
type PermissionState = "idle" | "requesting" | "granted" | "denied";
type ImportedMedia = { fileName: string; storedPath: string; mediaKind: string };
type ChatDialog = { mode: "create" } | { mode: "rename"; note: Note } | null;

const waveformHeights = [18, 31, 46, 60, 35, 72, 52, 29, 64, 40, 78, 48, 25, 56, 70, 38, 62, 44, 74, 32, 58, 28, 51, 68, 42, 22];
const initialNotes: Note[] = [
  { id: 1, title: "Reunión de producto", updatedAt: "Hoy, 09:42", favorite: true },
  { id: 2, title: "Ideas para la aplicación", updatedAt: "Ayer, 18:16", favorite: true },
  { id: 3, title: "Entrevista con cliente", updatedAt: "16 oct", favorite: false },
  { id: 4, title: "Notas de investigación", updatedAt: "12 oct", favorite: false },
];

function importErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  if (typeof error === "object" && error && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return "No pudimos importar el archivo. Revisa el detalle en la terminal de desarrollo.";
}

function localDataErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  if (typeof error === "object" && error && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  const paths: Record<string, ReactNode> = {
    add: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
    audio: <><rect x="5" y="3" width="14" height="18" rx="3" /><path d="M9 8h6M9 12h6M9 16h3" /></>,
    chevron: <path d="m9 18 6-6-6-6" />,
    close: <><path d="m6 6 12 12" /><path d="m18 6-12 12" /></>,
    document: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M8 13h8M8 17h6" /></>,
    dots: <><circle cx="5" cy="12" r="1" fill="currentColor" /><circle cx="12" cy="12" r="1" fill="currentColor" /><circle cx="19" cy="12" r="1" fill="currentColor" /></>,
    folder: <path d="M3 7a2 2 0 0 1 2-2h4l2 3h8a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />,
    microphone: <><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10a7 7 0 0 0 14 0M12 17v4M8 21h8" /></>,
    search: <><circle cx="11" cy="11" r="6" /><path d="m20 20-4.2-4.2" /></>,
    settings: <><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.15 2.15-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.55v.09h-3.04v-.09A1.7 1.7 0 0 0 10.65 18.7a1.7 1.7 0 0 0-1.88.34l-.06.06-2.15-2.15.06-.06A1.7 1.7 0 0 0 6.96 15a1.7 1.7 0 0 0-1.55-1.03h-.09v-3.04h.09A1.7 1.7 0 0 0 6.96 9.9a1.7 1.7 0 0 0-.34-1.88l-.06-.06L8.71 5.8l.06.06a1.7 1.7 0 0 0 1.88.34 1.7 1.7 0 0 0 1.03-1.55v-.09h3.04v.09a1.7 1.7 0 0 0 1.03 1.55 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.15 2.15-.06.06a1.7 1.7 0 0 0-.34 1.88 1.7 1.7 0 0 0 1.55 1.03h.09v3.04h-.09A1.7 1.7 0 0 0 19.4 15Z" /></>,
    star: <path d="m12 3 2.8 5.66 6.25.9-4.52 4.4 1.07 6.22L12 17.25l-5.6 2.93 1.07-6.22-4.52-4.4 6.25-.9Z" />,
    trash: <><path d="M4 7h16M10 11v6M14 11v6M9 7l1-3h4l1 3M6 7l1 14h10l1-14" /></>,
  };
  return <svg {...common}>{paths[name]}</svg>;
}

function App() {
  const [notes, setNotes] = useState(initialNotes);
  const [notesReady, setNotesReady] = useState(false);
  const [activeNoteId, setActiveNoteId] = useState<number | null>(null);
  const [menuNoteId, setMenuNoteId] = useState<number | null>(null);
  const [chatDialog, setChatDialog] = useState<ChatDialog>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [chatDialogError, setChatDialogError] = useState("");
  const [isSavingChat, setIsSavingChat] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [permission, setPermission] = useState<PermissionState>("idle");
  const [isRecording, setIsRecording] = useState(false);
  const [activeSource, setActiveSource] = useState<"record" | "file">("record");
  const [dataError, setDataError] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState("");
  const activeNote = useMemo(() => notes.find((note) => note.id === activeNoteId) ?? null, [activeNoteId, notes]);
  const favorites = notes.filter((note) => note.favorite);
  const recents = notes.filter((note) => !note.favorite);

  useEffect(() => {
    void loadNotes();
  }, []);

  useEffect(() => {
    if (chatDialog) window.setTimeout(() => titleInputRef.current?.select(), 0);
  }, [chatDialog]);

  async function loadNotes() {
    try {
      const storedNotes = await listNotes();
      setNotes(storedNotes);
      setDataError("");
    } catch {
      setDataError("La base local estará disponible al abrir Transcriptora en Windows.");
    } finally {
      setNotesReady(true);
    }
  }

  function openCreateChat() {
    if (!notesReady) return;
    setDraftTitle("");
    setChatDialogError("");
    setChatDialog({ mode: "create" });
  }
  function openRenameChat(note: Note) {
    setDraftTitle(note.title);
    setChatDialogError("");
    setMenuNoteId(null);
    setChatDialog({ mode: "rename", note });
  }
  function closeChatDialog() {
    if (!isSavingChat) setChatDialog(null);
  }
  async function saveChat() {
    const title = draftTitle.trim();
    if (!title) { setChatDialogError("Escribe un nombre para continuar."); return; }
    if (!chatDialog) return;
    setIsSavingChat(true);
    try {
      if (chatDialog.mode === "create") {
        const note = await createStoredNote(title);
        setNotes((current) => [note, ...current]);
        setActiveNoteId(note.id);
      } else {
        await renameStoredNote(chatDialog.note.id, title);
        setNotes((current) => current.map((item) => item.id === chatDialog.note.id ? { ...item, title, updatedAt: "Ahora" } : item));
      }
      setDataError("");
      setChatDialog(null);
    } catch (error) {
      console.error("No pudimos guardar el chat local", error);
      setChatDialogError(localDataErrorMessage(error, "No pudimos guardar el chat. Revisa la consola de desarrollo."));
    } finally {
      setIsSavingChat(false);
    }
  }
  async function renameNote(id: number) {
    const note = notes.find((item) => item.id === id);
    if (note) openRenameChat(note);
  }
  async function deleteNote(id: number) {
    const note = notes.find((item) => item.id === id);
    if (!note || !window.confirm(`Eliminar “${note.title}”?`)) return;
    try {
      await removeNote(id);
      setNotes((current) => current.filter((item) => item.id !== id));
      if (activeNoteId === id) setActiveNoteId(null);
    } catch {
      setDataError("No pudimos eliminar la nota.");
    }
    setMenuNoteId(null);
  }
  async function toggleFavorite(id: number) {
    const note = notes.find((item) => item.id === id);
    if (!note) return;
    try {
      await setFavorite(id, !note.favorite);
      setNotes((current) => current.map((item) => item.id === id ? { ...item, favorite: !item.favorite } : item));
    } catch {
      setDataError("No pudimos actualizar los favoritos.");
    }
    setMenuNoteId(null);
  }
  async function startRecording() {
    if (isRecording) { setIsRecording(false); return; }
    if (!navigator.mediaDevices?.getUserMedia) { setPermission("denied"); return; }
    setPermission("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setPermission("granted");
      setIsRecording(true);
    } catch { setPermission("denied"); }
  }
  async function importLocalFile() {
    setIsImporting(true);
    setImportMessage("");
    try {
      const media = await invoke<ImportedMedia | null>("import_local_media");
      if (!media) return;
      const title = media.fileName.replace(/\.[^.]+$/, "").trim() || "Archivo importado";
      const note = await createStoredNote(title);
      await saveImportedMedia({
        noteId: note.id,
        fileName: media.fileName,
        storedPath: media.storedPath,
        mediaKind: media.mediaKind,
      });
      setNotes((current) => [note, ...current]);
      setActiveNoteId(note.id);
      setImportMessage("Archivo guardado localmente y listo para transcribir.");
    } catch (error) {
      console.error("La importación local falló", error);
      setImportMessage(importErrorMessage(error));
    } finally {
      setIsImporting(false);
    }
  }
  function noteRow(note: Note) {
    return <div className={`note-row ${activeNoteId === note.id ? "is-active" : ""}`} key={note.id}>
      <button className="note-open" onClick={() => { setActiveNoteId(note.id); setMenuNoteId(null); }} aria-label={`Abrir ${note.title}`}><Icon name="document" size={16} /><span>{note.title}</span></button>
      <button className="note-menu-trigger" onClick={() => setMenuNoteId(menuNoteId === note.id ? null : note.id)} aria-label={`Opciones de ${note.title}`}><Icon name="dots" size={16} /></button>
      {menuNoteId === note.id && <div className="note-menu" role="menu">
        <button onClick={() => toggleFavorite(note.id)} role="menuitem"><Icon name="star" size={15} />{note.favorite ? "Quitar de favoritos" : "Añadir a favoritos"}</button>
        <button onClick={() => renameNote(note.id)} role="menuitem"><Icon name="document" size={15} />Renombrar</button>
        <button className="danger" onClick={() => deleteNote(note.id)} role="menuitem"><Icon name="trash" size={15} />Eliminar</button>
      </div>}
    </div>;
  }

  return <div className="app-shell" onClick={() => menuNoteId !== null && setMenuNoteId(null)}>
    <aside className="sidebar" onClick={(event) => event.stopPropagation()}>
      <div className="brand-row"><div className="brand-mark" aria-hidden="true"><span /><span /><span /></div><span className="brand-name">Transcriptora</span><button className="icon-button" aria-label="Ajustes"><Icon name="settings" size={17} /></button></div>
      <button className="new-note" onClick={openCreateChat} disabled={!notesReady}><Icon name="add" size={17} /><span className="new-note-label">{notesReady ? "Nuevo chat" : "Abriendo chats"}</span></button>
      <label className="search-control"><Icon name="search" size={16} /><input type="search" placeholder="Buscar notas" aria-label="Buscar notas" /><kbd>Ctrl K</kbd></label>
      <nav className="primary-nav" aria-label="Navegación principal"><button className={activeNoteId === null ? "nav-item is-active" : "nav-item"} onClick={() => setActiveNoteId(null)}><Icon name="audio" size={17} />Grabar</button><button className="nav-item"><Icon name="folder" size={17} />Todos los archivos</button></nav>
      <div className="sidebar-scroll">{favorites.length > 0 && <section className="note-section"><h2>Favoritos</h2>{favorites.map(noteRow)}</section>}<section className="note-section"><h2>Recientes</h2>{recents.map(noteRow)}</section></div>
      <div className={dataError ? "local-status has-error" : "local-status"}><span className="status-dot" />{dataError || "Tus datos se guardan en este equipo"}</div>
    </aside>
    <main className="workspace">
      <header className="topbar"><div className="crumb"><span>Mi espacio</span><Icon name="chevron" size={14} /><strong>{activeNote ? activeNote.title : "Grabación"}</strong></div><div className="topbar-actions"><span className="local-badge">Solo local</span><button className="icon-button" aria-label="Cerrar panel"><Icon name="close" size={17} /></button></div></header>
      {activeNote ? <section className="note-view"><div className="note-view-header"><div><p className="updated">Editado {activeNote.updatedAt}</p><h1>{activeNote.title}</h1></div><button className="quiet-action" onClick={() => renameNote(activeNote.id)}>Renombrar</button></div><div className="empty-transcript"><div className="empty-symbol"><Icon name="audio" size={22} /></div><h2>Esta nota aún no tiene transcripción</h2><p>Inicia una grabación o importa un archivo para añadir contenido.</p><button className="primary-action" onClick={() => setActiveNoteId(null)}><Icon name="microphone" size={18} />Iniciar una grabación</button></div></section> :
      <section className="recording-view"><div className="recording-heading"><p>Tu espacio de captura</p><h1>Graba una conversación</h1><span>El audio y las notas permanecen en tu equipo.</span></div><div className="capture-panel" data-recording={isRecording || undefined}><div className="capture-tabs" role="tablist" aria-label="Fuente de audio"><button className={activeSource === "file" ? "capture-tab is-selected" : "capture-tab"} onClick={() => { setActiveSource("file"); setImportMessage(""); }} role="tab" aria-selected={activeSource === "file"}>Archivo local</button><button className={activeSource === "record" ? "capture-tab is-selected" : "capture-tab"} onClick={() => setActiveSource("record")} role="tab" aria-selected={activeSource === "record"}>Grabar</button></div>{activeSource === "file" ? <div className="import-state"><Icon name="folder" size={28} /><h2>Importa un audio o video</h2><p>MP3, WAV, M4A, MP4, MOV y WebM.</p><button className="primary-action" onClick={importLocalFile} disabled={isImporting}><Icon name="folder" size={18} />{isImporting ? "Guardando archivo" : "Elegir archivo"}</button>{importMessage && <p className="import-message" role="status">{importMessage}</p>}</div> : <><div className="waveform" aria-hidden="true">{waveformHeights.map((height, index) => <span key={index} style={{ height }} />)}</div><p className="recording-time">{isRecording ? "Grabando · 00:00:00" : "00:00:00"}</p><button className="record-button" onClick={startRecording} disabled={permission === "requesting"}>{isRecording ? <Icon name="close" size={18} /> : <Icon name="microphone" size={18} />}{permission === "requesting" ? "Solicitando permiso" : isRecording ? "Detener grabación" : "Iniciar grabación"}</button><p className={permission === "denied" ? "permission-note is-error" : "permission-note"}>{permission === "idle" && "Al iniciar, te pediremos acceso al micrófono."}{permission === "requesting" && "Esperando la decisión de Windows."}{permission === "granted" && "Micrófono permitido. La captura está lista para guardarse localmente."}{permission === "denied" && "No pudimos usar el micrófono. Revisa los permisos de Windows e inténtalo de nuevo."}</p></>}</div><div className="capture-options"><div><strong>Micrófono</strong><span>Captura tu voz</span></div><div><strong>Audio del sistema</strong><span>Se conectará en el módulo de captura de Windows</span></div><button className="quiet-action">Configurar fuentes</button></div></section>}
    </main>
    {chatDialog && <div className="chat-dialog-backdrop" role="presentation" onMouseDown={closeChatDialog}>
      <section className="chat-dialog" role="dialog" aria-modal="true" aria-labelledby="chat-dialog-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="dialog-signal" aria-hidden="true"><span /><span /><span /><span /><span /></div>
        <p className="dialog-context">{chatDialog.mode === "create" ? "Nuevo chat" : "Editar chat"}</p>
        <h2 id="chat-dialog-title">{chatDialog.mode === "create" ? "Nombra esta conversación" : "Cambia el nombre del chat"}</h2>
        <label htmlFor="chat-title">Nombre</label>
        <input id="chat-title" ref={titleInputRef} value={draftTitle} onChange={(event) => { setDraftTitle(event.target.value); setChatDialogError(""); }} onKeyDown={(event) => { if (event.key === "Enter") void saveChat(); if (event.key === "Escape") closeChatDialog(); }} placeholder="Por ejemplo: Reunión de producto" maxLength={120} disabled={isSavingChat} />
        {chatDialogError && <p className="dialog-error" role="alert">{chatDialogError}</p>}
        <div className="dialog-actions"><button className="quiet-action" onClick={closeChatDialog} disabled={isSavingChat}>Cancelar</button><button className="primary-action" onClick={() => void saveChat()} disabled={isSavingChat}>{isSavingChat ? "Guardando" : chatDialog.mode === "create" ? "Crear chat" : "Guardar cambios"}</button></div>
      </section>
    </div>}
  </div>;
}

export default App;
