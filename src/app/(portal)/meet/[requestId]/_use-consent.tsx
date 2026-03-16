"use client";
/**
 * _use-consent.ts — Hook for managing in-call health records consent flow.
 */
import { notifications } from "@mantine/notifications";
import { IconShieldCheck } from "@tabler/icons-react";
import { ref as dbRef, set as dbSet } from "firebase/database";
import { useEffect, useState } from "react";
import { getClientDatabase } from "@/lib/firebase/client";
import { useRTDBListener } from "@/lib/firebase/use-rtdb-listener";
import type { Participant } from "./_room-types";

interface UseConsentParams {
    requestId: string;
    userKind: "patient" | "doctor";
    localUserId: string;
    doctorId: string | null;
    remoteUser: Participant;
}

interface ConsentState {
    consentPending: boolean;
    acceptingConsent: boolean;
    handleAcceptConsent: () => Promise<void>;
    handleDeclineConsent: () => Promise<void>;
}

/**
 * Manages real-time consent invite flow during a call.
 * - Patient: listens for pending invite, can accept/decline
 * - Doctor: receives notification when patient accepts
 */
export function useConsent({
    requestId,
    userKind,
    localUserId,
    doctorId,
    remoteUser,
}: UseConsentParams): ConsentState {
    const [consentPending, setConsentPending] = useState(false);
    const [acceptingConsent, setAcceptingConsent] = useState(false);

    // ── Patient listener: /in-call-consent/{patientId}/{requestId} ──────────
    const consentPath = userKind === "patient"
        ? `in-call-consent/${localUserId}/${requestId}`
        : null;

    const { data: consentData } = useRTDBListener<{ doctorId: string; status: string }>(
        consentPath
    );

    useEffect(() => {
        if (!consentData) {
            setConsentPending(false);
            return;
        }
        setConsentPending(consentData.status === "pending");
    }, [consentData]);

    // ── Doctor listener: /in-call-consent-ack/{doctorId}/{requestId} ────────
    const ackPath = userKind === "doctor"
        ? `in-call-consent-ack/${localUserId}/${requestId}`
        : null;

    const { data: ackData } = useRTDBListener<{ status: string; patientName?: string }>(
        ackPath
    );

    useEffect(() => {
        if (userKind !== "doctor") return;
        if (!ackData) return;

        if (ackData.status === "accepted") {
            notifications.show({
                title: "Access granted",
                message: `${remoteUser.name} accepted your health records request.`,
                color: "teal",
                icon: <IconShieldCheck size={18} />,
                autoClose: 6000,
            });
            // Clear so it only fires once
            dbSet(dbRef(getClientDatabase(), `in-call-consent-ack/${localUserId}/${requestId}`), null);
        }
    }, [ackData, requestId, userKind, localUserId, remoteUser.name]);

    // ── Accept consent ──────────────────────────────────────────────────────
    const handleAcceptConsent = async () => {
        if (!doctorId) return;
        setAcceptingConsent(true);
        try {
            const res = await fetch(`/api/doctor-patients/invites/${doctorId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "accept" }),
            });
            if (!res.ok) throw new Error("Failed");
            const db = getClientDatabase();
            await Promise.all([
                // Clear the patient's pending node
                dbSet(dbRef(db, `in-call-consent/${localUserId}/${requestId}`), null),
                // Write an ack for the doctor to pick up
                dbSet(dbRef(db, `in-call-consent-ack/${doctorId}/${requestId}`), {
                    status: "accepted",
                }),
            ]);
            setConsentPending(false);
            notifications.show({
                title: "Access granted",
                message: `You've given ${remoteUser.name} access to your health records.`,
                color: "teal",
                icon: <IconShieldCheck size={18} />,
            });
        } catch {
            notifications.show({
                title: "Failed",
                message: "Could not accept the request. Please try again.",
                color: "red",
            });
        } finally {
            setAcceptingConsent(false);
        }
    };

    // ── Decline consent ─────────────────────────────────────────────────────
    const handleDeclineConsent = async () => {
        if (!doctorId) return;
        try {
            await fetch(`/api/doctor-patients/invites/${doctorId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "decline" }),
            });
        } catch { /* best-effort */ } finally {
            // Clear the pending node so the banner disappears
            void dbSet(
                dbRef(getClientDatabase(), `in-call-consent/${localUserId}/${requestId}`),
                null,
            );
            setConsentPending(false);
        }
    };

    return {
        consentPending,
        acceptingConsent,
        handleAcceptConsent,
        handleDeclineConsent,
    };
}
