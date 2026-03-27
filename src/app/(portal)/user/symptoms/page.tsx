import { redirect } from "next/navigation";

export default function SymptomsRedirect() {
    redirect("/user/health/symptoms");
}
