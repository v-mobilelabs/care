import { redirect } from "next/navigation";

// ── Patient Portal Root ───────────────────────────────────────────────────────
// Redirects to the assistant page.

export default function PatientPage() {
    redirect("/patient/assistant");
}
