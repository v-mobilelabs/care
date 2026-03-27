import { redirect } from "next/navigation";

export default function VitalsRedirect() {
    redirect("/user/health/vitals");
}
