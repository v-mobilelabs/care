import { redirect } from "next/navigation";

export default function PatientSummaryRedirect() {
    redirect("/user/health/summary");
}
