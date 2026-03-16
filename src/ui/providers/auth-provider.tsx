"use client";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { getAuth, onAuthStateChanged, signInWithCustomToken, type User } from "firebase/auth";
import { firebaseApp } from "@/lib/firebase/client";
import { trackEvent } from "@/lib/analytics";
import { PresenceSync } from "@/ui/providers/presence-sync";
import { NotificationPermissionSync } from "@/ui/providers/notification-permission-sync";
import type { UserKind } from "@/lib/auth/jwt";

interface AuthContextValue {
    user: User | null;
    loading: boolean;
    /** The kind resolved from the session cookie ("user" | "doctor"). Null while loading. */
    kind: UserKind | null;
    /** Force a re-render with the latest Firebase Auth user (e.g. after updateProfile). */
    refreshUser: () => void;
}

const AuthContext = createContext<AuthContextValue>({ user: null, loading: true, kind: null, refreshUser: () => { } });

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }: Readonly<{ children: React.ReactNode }>) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [kind, setKind] = useState<UserKind | null>(null);
    const prevUserRef = useRef<User | null>(null);

    useEffect(() => {
        const auth = getAuth(firebaseApp);
        const unsubscribe = onAuthStateChanged(auth, (u) => {
            if (prevUserRef.current && !u) {
                trackEvent({ name: "logout" });
            }
            prevUserRef.current = u;

            if (u) {
                // Firebase client Auth already has a session — nothing to do.
                setUser(u);
                setLoading(false);
                // If kind is not yet known (e.g. page refresh with persisted Auth),
                // resolve it from the ID token claims.
                if (!kind) {
                    void u.getIdTokenResult().then((result) => {
                        const claimed = result.claims["kind"] as UserKind | undefined;
                        setKind(claimed ?? "user");
                    }).catch(() => setKind("user"));
                }
            } else {
                // No Firebase client session — bridge from server session cookie.
                fetch("/api/auth/firebase-token")
                    .then((res) => (res.ok ? res.json() : null))
                    .then(async (data: { customToken?: string; kind?: UserKind } | null) => {
                        if (data?.customToken) {
                            // kind is returned directly from the server — no need for
                            // an async getIdTokenResult() call after signIn.
                            if (data.kind) setKind(data.kind);
                            try {
                                await signInWithCustomToken(auth, data.customToken);
                                // onAuthStateChanged fires again with the real user.
                            } catch {
                                setUser(null);
                                setKind(null);
                                setLoading(false);
                            }
                        } else {
                            // No session cookie — genuinely signed out.
                            setUser(null);
                            setKind(null);
                            setLoading(false);
                        }
                    })
                    .catch(() => {
                        setUser(null);
                        setKind(null);
                        setLoading(false);
                    });
            }
        });
        return unsubscribe;
    }, []);

    const refreshUser = () => {
        const auth = getAuth(firebaseApp);
        // Snapshot the current user object so React re-renders with the latest data.
        setUser(auth.currentUser ? { ...auth.currentUser } as User : null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, kind, refreshUser }}>
            {/* Keeps /presence/{uid} in RTDB in sync for the session lifetime. */}
            <PresenceSync />
            {/* Requests browser notification permission after sign-in. */}
            <NotificationPermissionSync />
            {children}
        </AuthContext.Provider>
    );
}
