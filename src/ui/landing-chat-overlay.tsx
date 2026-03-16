"use client";
import { useState } from "react";
import { Paper, Box } from "@mantine/core";
import { InputBar } from "@/ui/chat/components/input-bar";

export function LandingChatOverlay() {
    // Minimal state for demo; in real use, lift state up or connect to chat logic
    const [input, setInput] = useState("");
    return (
        <Box
            style={{
                position: "fixed",
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 200,
                pointerEvents: "none",
            }}
        >
            <Box maw={600} mx="auto" pb={16} px={8} style={{ pointerEvents: "auto" }}>
                <Paper shadow="xl" radius="xl" p={0} style={{ overflow: "visible" }}>
                    <InputBar
                        input={input}
                        onInputChange={setInput}
                        isLoading={false}
                        pendingFreeText={null}
                        messages={[]}
                        status="idle"
                        onSend={() => { }}
                        onAnswerFreeText={() => { }}
                        creditsRemaining={10}
                    />
                </Paper>
            </Box>
        </Box>
    );
}
