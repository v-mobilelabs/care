import { redirect } from "next/navigation";

export default function PrescriptionsRedirect() {
    redirect("/user/health/prescriptions");
}
