import { ProfileContent } from "./_content";

// ── Profile page (SSR) ────────────────────────────────────────────────────────
// Profile data comes from the Firebase Auth client SDK (no server prefetch
// needed). This shell keeps the page a server component for consistency.

export default function ProfilePage() {
    return <ProfileContent />;
}
