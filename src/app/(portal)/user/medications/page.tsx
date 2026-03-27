import { redirect } from "next/navigation";

export default function MedicationsRedirect() {
    redirect("/user/health/medications");
}
