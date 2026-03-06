"use client";
/**
 * MeetSessionContext — global context that keeps a video call alive across
 * page navigations.
 *
 * The PersistentMeetOverlay reads from this context to render or hide the
 * MeetingRoom component. Because the overlay lives in the root layout, it
 * survives route changes — so the Chime WebRTC session is never torn down
 * just because the user navigated away.
 *
 * Usage:
 *  - `startMeet(data, opts?)` → start a new call and show the room full-screen
 *  - `expand()`               → bring a hidden (but active) room back to full-screen
 *  - `minimize()`             → hide the room visually while keeping audio alive
 *  - `endMeet()`              → terminate the session and clean up overlay state
 */
import { createContext, useContext, useState, type ReactNode } from "react";
import type { MeetSessionData } from "@/app/meet/[requestId]/_keys";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MeetOverlayState {
    sessionData: MeetSessionData | null;
    mode: "hidden" | "expanded";
    initialMicOn: boolean;
    initialCameraOn: boolean;
    initialAudioDeviceId: string | null;
    initialVideoDeviceId: string | null;
}

interface MeetSessionContextValue {
    state: MeetOverlayState;
    /** Start a new meeting and show the room overlay in expanded mode. */
    startMeet: (data: MeetSessionData, opts?: { micOn?: boolean; cameraOn?: boolean; audioDeviceId?: string | null; videoDeviceId?: string | null }) => void;
    /** Show an already-active room overlay as full-screen. */
    expand: () => void;
    /** Hide the room overlay but keep the Chime session alive (audio continues). */
    minimize: () => void;
    /** Completely end the meeting and remove the overlay. */
    endMeet: () => void;
}

// ── Context ───────────────────────────────────────────────────────────────────

const MeetSessionContext = createContext<MeetSessionContextValue | null>(null);

export function useMeetSession() {
    const ctx = useContext(MeetSessionContext);
    if (!ctx) throw new Error("useMeetSession must be used within <MeetSessionProvider>");
    return ctx;
}

// ── Provider ──────────────────────────────────────────────────────────────────

const INITIAL_STATE: MeetOverlayState = {
    sessionData: null,
    mode: "hidden",
    initialMicOn: true,
    initialCameraOn: true,
    initialAudioDeviceId: null,
    initialVideoDeviceId: null,
};

export function MeetSessionProvider({ children }: Readonly<{ children: ReactNode }>) {
    const [state, setState] = useState<MeetOverlayState>(INITIAL_STATE);

    const startMeet = (data: MeetSessionData, opts?: { micOn?: boolean; cameraOn?: boolean; audioDeviceId?: string | null; videoDeviceId?: string | null }) => {
        setState({
            sessionData: data,
            mode: "expanded",
            initialMicOn: opts?.micOn ?? true,
            initialCameraOn: opts?.cameraOn ?? true,
            initialAudioDeviceId: opts?.audioDeviceId ?? null,
            initialVideoDeviceId: opts?.videoDeviceId ?? null,
        });
    };

    const expand = () => {
        setState((prev) => (prev.sessionData ? { ...prev, mode: "expanded" } : prev));
    };

    const minimize = () => {
        setState((prev) => (prev.sessionData ? { ...prev, mode: "hidden" } : prev));
    };

    const endMeet = () => {
        setState(INITIAL_STATE);
    };

    return (
        <MeetSessionContext.Provider value={{ state, startMeet, expand, minimize, endMeet }}>
            {children}
        </MeetSessionContext.Provider>
    );
}
