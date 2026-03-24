"use client";
import {
    createContext,
    useContext,
    useCallback,
    useMemo,
    type ReactNode,
} from "react";

interface ActiveProfileContextValue {
    /** `undefined` = the authenticated user's own profile ("self") */
    activeProfileId: string | undefined;
    /** Display label for the active profile. */
    activeProfileLabel: string;
    switchProfile: (profileId: string | undefined, label?: string) => void;
}

const ActiveProfileContext = createContext<ActiveProfileContextValue | null>(null);

export function ActiveProfileProvider({ children }: Readonly<{ children: ReactNode }>) {
    const activeProfileId = undefined;
    const activeProfileLabel = "My Profile";

    const switchProfile = useCallback(
        (_profileId: string | undefined, _label = "My Profile") => {
            // Multi-profile switching removed — force self profile only.
        },
        [],
    );

    const value = useMemo(
        () => ({ activeProfileId, activeProfileLabel, switchProfile }),
        [activeProfileId, activeProfileLabel, switchProfile],
    );

    return (
        <ActiveProfileContext value={value}>
            {children}
        </ActiveProfileContext>
    );
}

export function useActiveProfile(): ActiveProfileContextValue {
    const ctx = useContext(ActiveProfileContext);
    if (!ctx) throw new Error("useActiveProfile must be inside ActiveProfileProvider");
    return ctx;
}
