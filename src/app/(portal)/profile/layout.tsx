"use client";
import { ActiveProfileProvider } from "@/app/(portal)/patient/_context/active-profile-context";
import type { ReactNode } from "react";

/**
 * Standalone /profile layout.
 * Provides ActiveProfileProvider so the existing patient ProfileContent
 * can use useActiveProfile() without being nested inside the chat layout.
 */
export default function ProfileLayout({ children }: Readonly<{ children: ReactNode }>) {
    return <ActiveProfileProvider>{children}</ActiveProfileProvider>;
}
