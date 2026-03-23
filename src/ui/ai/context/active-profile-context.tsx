"use client";
import {
    createContext,
    useContext,
    useState,
    useCallback,
    useEffect,
    type ReactNode,
} from "react";
import { setActiveDependentId as setActiveDependentIdExternal } from "@/ui/ai/query";

const STORAGE_KEY = "careai:activeProfile";

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
    const [activeDependentId, setActiveDependentId] = useState<string | undefined>(
        () => readStorage().dependentId
    );
    const [activeProfileLabel, setActiveProfileLabel] = useState(
        () => readStorage().label ?? "My Profile"
    );

    // Sync the external query-key store on mount (not React state)
    useEffect(() => {
        const stored = readStorage();
        if (stored.dependentId) {
            setActiveDependentIdExternal(stored.dependentId);
        }
    }, []);

    const switchProfile = useCallback(
        (dependentId: string | undefined, label = "My Profile") => {
            setActiveDependentId(dependentId);
            setActiveProfileLabel(label);
            setActiveDependentIdExternal(dependentId);
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
