"use client";
import { usePatientQuery } from "@/app/(portal)/patient/_query";
import { ConsentGate } from "@/ui/ai/components/consent-gate";
import { useState } from "react";

export function ConsentGuard({ children }: Readonly<{ children: React.ReactNode }>) {
    const { data: patient, isLoading } = usePatientQuery();
    const [accepted, setAccepted] = useState(false);

    // Still loading patient data — don't flash the gate
    if (isLoading) return null;

    // Patient has consented (server-persisted) or just accepted in this session
    if (patient?.consentedAt || accepted) {
        return <>{children}</>;
    }

    return <ConsentGate onAccept={() => setAccepted(true)} />;
}
