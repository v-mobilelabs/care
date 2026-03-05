// /doctor — the proxy handles all routing for this path.
// This page is a fallback that should never normally render.
import { redirect } from "next/navigation";

export default function DoctorIndexPage() {
    redirect("/doctor/dashboard");
}
