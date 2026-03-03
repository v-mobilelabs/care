"use client";
import {
    createContext,
    useContext,
    useState,
    useCallback,
    useEffect,
    type ReactNode,
} from "react";
import { setActiveDependentId } from "@/app/chat/_query";

const STORAGE_KEY = "swiftdrive:activeProfile";

interface StoredProfile {
    dependentId: string | undefined;
    label: string;
}

function readStorage(): StoredProfile {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) return JSON.parse(raw) as StoredProfile;
    } catch { /* ignore */ }
    return { dependentId: undefined, label: "My Profile" };
}

function writeStorage(value: StoredProfile) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } catch { /* ignore */ }
}

interface ActiveProfileContextValue {
    /** `undefined` = the authenticated user's own profile ("self") */
    activeDependentId: string | undefined;
    /** Display label for the active profile ("My Profile" or dependent's first name) */
    activeProfileLabel: string;
    switchProfile: (dependentId: string | undefined, label?: string) => void;
}

const ActiveProfileContext = createContext<ActiveProfileContextValue | null>(null);

export function ActiveProfileProvider({ children }: Readonly<{ children: ReactNode }>) {
    const [activeDependentId, setLocal] = useState<string | undefined>(undefined);
    const [activeProfileLabel, setLabel] = useState("My Profile");

    // Rehydrate from localStorage on mount
    useEffect(() => {
        const stored = readStorage();
        if (stored.dependentId) {
            setLocal(stored.dependentId);
            setLabel(stored.label);
            setActiveDependentId(stored.dependentId);
        }
    }, []);

    const switchProfile = useCallback(
        (dependentId: string | undefined, label = "My Profile") => {
            setLocal(dependentId);
            setLabel(label);
            setActiveDependentId(dependentId);
            writeStorage({ dependentId, label });
        },
        [],
    );

    return (
        <ActiveProfileContext value={{ activeDependentId, activeProfileLabel, switchProfile }}>
            {children}
        </ActiveProfileContext>
    );
}

export function useActiveProfile(): ActiveProfileContextValue {
    const ctx = useContext(ActiveProfileContext);
    if (!ctx) throw new Error("useActiveProfile must be inside ActiveProfileProvider");
    return ctx;
}
