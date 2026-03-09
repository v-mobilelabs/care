"use client";
import { ActiveProfileProvider } from "@/app/(portal)/chat/_context/active-profile-context";
import type { ReactNode } from "react";

export default function PatientLayout({ children }: Readonly<{ children: ReactNode }>) {
    return <ActiveProfileProvider>{children}</ActiveProfileProvider>;
}
