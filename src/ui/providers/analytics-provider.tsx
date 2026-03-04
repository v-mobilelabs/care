"use client";
import { useEffect } from "react";
import { initAnalytics } from "@/lib/analytics";

/**
 * Initializes Firebase Analytics (GA4) once the app mounts in the browser.
 * Must be rendered client-side only — place it in the root layout.
 */
export function AnalyticsProvider({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    useEffect(() => {
        initAnalytics();
    }, []);

    return <>{children}</>;
}
