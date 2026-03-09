"use client";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

interface MessagingContextValue {
    /** Whether the messaging drawer is open. */
    isOpen: boolean;
    /** Open the drawer (shows conversation list). */
    open: () => void;
    /** Close the drawer and reset active conversation. */
    close: () => void;
    /** Toggle the drawer open/closed. */
    toggle: () => void;
    /** The conversationId currently being viewed (null = list view). */
    activeConversationId: string | null;
    /** Navigate to a specific conversation (or back to list with null). */
    setActiveConversationId: (id: string | null) => void;
    /** Open the drawer and jump straight to a conversation. */
    openConversation: (convId: string) => void;
}

const MessagingContext = createContext<MessagingContextValue>({
    isOpen: false,
    open: () => { },
    close: () => { },
    toggle: () => { },
    activeConversationId: null,
    setActiveConversationId: () => { },
    openConversation: () => { },
});

export function useMessaging() {
    return useContext(MessagingContext);
}

export function MessagingProvider({
    children,
}: Readonly<{ children: ReactNode }>) {
    const [isOpen, setIsOpen] = useState(false);
    const [activeConversationId, setActiveConversationId] = useState<
        string | null
    >(null);

    function open() {
        setIsOpen(true);
    }

    function close() {
        setIsOpen(false);
        setActiveConversationId(null);
    }

    function toggle() {
        if (isOpen) {
            close();
        } else {
            open();
        }
    }

    function openConversation(convId: string) {
        setActiveConversationId(convId);
        setIsOpen(true);
    }

    const value = useMemo(
        () => ({
            isOpen,
            open,
            close,
            toggle,
            activeConversationId,
            setActiveConversationId,
            openConversation,
        }),
        [isOpen, activeConversationId]
    );

    return (
        <MessagingContext.Provider value={value}>
            {children}
        </MessagingContext.Provider>
    );
}
