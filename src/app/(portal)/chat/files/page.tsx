import { FilesContent } from "./_content";

// ── Files page ────────────────────────────────────────────────────────────────
// Shows all files uploaded by the current user across every session.
// Data is fetched client-side (no server prefetch needed —
// signed URLs are short-lived and must be fetched fresh on each visit).

export default function FilesPage() {
    return <FilesContent />;
}
