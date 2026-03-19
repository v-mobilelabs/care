"use client";
import { ActionIcon, Transition } from "@mantine/core";
import { IconArrowDown } from "@tabler/icons-react";

interface ScrollToBottomFabProps {
    visible: boolean;
    onClick: () => void;
}

export function ScrollToBottomFab({ visible, onClick }: Readonly<ScrollToBottomFabProps>) {
    return (
        <Transition mounted={visible} transition="slide-up" duration={200}>
            {(styles) => (
                <ActionIcon
                    variant="filled"
                    color="primary"
                    size="lg"
                    radius="xl"
                    aria-label="Scroll to bottom"
                    onClick={onClick}
                    style={{
                        ...styles,
                        position: "absolute",
                        bottom: 16,
                        left: "50%",
                        transform: "translateX(-50%)",
                        zIndex: 20,
                        boxShadow: "0 2px 12px rgba(0,0,0,0.22)",
                    }}
                >
                    <IconArrowDown size={18} />
                </ActionIcon>
            )}
        </Transition>
    );
}
