"use client";
import { Button, Text, UnstyledButton } from "@mantine/core";
import { modals } from "@mantine/modals";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth/sign-out";
import { colors } from "@/ui/tokens";

export function SignOutButton() {
    const router = useRouter();

    async function handleSignOut() {
        await signOut();
        router.replace("/auth/login");
    }

    function onClick() {
        modals.openConfirmModal({
            title: "Sign out?",
            children: <Text size="sm">Are you sure you want to sign out?</Text>,
            labels: { confirm: "Sign out", cancel: "Cancel" },
            confirmProps: { color: colors.danger },
            onConfirm: () => void handleSignOut(),
        });
    }

    return (
        <Text
            c={colors.danger}
            variant="transparent"
            onClick={onClick}
            size="sm"
        >
            Sign out
        </Text>
    );
}
