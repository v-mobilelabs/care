"use client";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { getAuth, onAuthStateChanged, type User } from "firebase/auth";
import { firebaseApp } from "@/lib/firebase/client";
import { trackEvent } from "@/lib/analytics";

interface AuthContextValue {
    user: User | null;
    loading: boolean;
    /** Force a re-render with the latest Firebase Auth user (e.g. after updateProfile). */
    refreshUser: () => void;
}

const AuthContext = createContext<AuthContextValue>({ user: null, loading: true, refreshUser: () => { } });

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }: Readonly<{ children: React.ReactNode }>) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const prevUserRef = useRef<User | null>(null);

    useEffect(() => {
        const auth = getAuth(firebaseApp);
        const unsubscribe = onAuthStateChanged(auth, (u) => {
            if (prevUserRef.current && !u) {
                trackEvent({ name: "logout" });
            }
            prevUserRef.current = u;
            setUser(u);
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    const refreshUser = () => {
        const auth = getAuth(firebaseApp);
        // Snapshot the current user object so React re-renders with the latest data.
        setUser(auth.currentUser ? { ...auth.currentUser } as User : null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
}
