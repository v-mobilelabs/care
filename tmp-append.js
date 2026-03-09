const fs = require("fs");
const path = require("path");

const target = path.join(__dirname, "src/app/chat/health-records/_content.tsx");
const content = fs.readFileSync(target, "utf8");

const append = `
// ── Root component ────────────────────────────────────────────────────────────

const TAB_DATA = [
    { label: "Overview", value: "overview" },
    { label: "Conditions", value: "conditions" },
    { label: "SOAP Notes", value: "soap-notes" },
    { label: "Blood Tests", value: "blood-tests" },
];

export function HealthRecordsContent() {
    const { profile } = useActiveProfile();
    const userId = profile?.userId;
    const [activeTab, setActiveTab] = useState("overview");
    const router = useRouter();

    if (!userId) {
        return (
            <Center h="100%">
                <Stack align="center" gap="sm">
                    <ThemeIcon size={52} radius={26} variant="light" color="gray">
                        <IconHeartbeat size={24} />
                    </ThemeIcon>
                    <Text fw={600}>No profile selected</Text>
                    <Text size="sm" c="dimmed">Select a profile to view health records.</Text>
                </Stack>
            </Center>
        );
    }

    return (
        <Box style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", background: ios.pageBg }}>
            {/* ─── Frosted glass header ─── */}
            <Box
                px={{ base: "md", sm: "xl" }}
                pt="lg"
                pb="sm"
                style={{
                    flexShrink: 0,
                    background: "light-dark(rgba(242,242,247,0.85), rgba(0,0,0,0.85))",
                    backdropFilter: "blur(20px)",
                    WebkitBackdropFilter: "blur(20px)",
                    borderBottom: ios.separator,
                }}
            >
                <Box maw={800} mx="auto">
                    <Group gap="sm" mb="md" wrap="nowrap">
                        <Box
                            style={{
                                width: 40, height: 40, borderRadius: 12,
                                background: "light-dark(rgba(99,102,241,0.12), rgba(129,140,248,0.15))",
                                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                            }}
                        >
                            <IconHeartbeat size={20} color="light-dark(#4f46e5, #a5b4fc)" />
                        </Box>
                        <Box style={{ minWidth: 0, flex: 1 }}>
                            <Text fw={700} size="lg" lh={1.2}>Health Records</Text>
                            <Text size="xs" c="dimmed">Your complete medical history and test results</Text>
                        </Box>
                    </Group>

                    <SegmentedControl
                        value={activeTab}
                        onChange={(v) => setActiveTab(v)}
                        data={TAB_DATA}
                        fullWidth
                        radius="xl"
                        size="xs"
                    />
                </Box>
            </Box>

            {/* ─── Scrollable content ─── */}
            <ScrollArea style={{ flex: 1 }} styles={{ viewport: { height: "100%" } }}>
                <Box maw={800} mx="auto" px={{ base: "md", sm: "xl" }} py="md">
                    {(() => {
                        switch (activeTab) {
                            case "overview": return <OverviewPanel userId={userId} />;
                            case "conditions": return <ConditionsPanel userId={userId} />;
                            case "soap-notes": return <SoapNotesPanel userId={userId} />;
                            case "blood-tests": return <BloodTestsPanel userId={userId} />;
                            default: return null;
                        }
                    })()}
                </Box>
            </ScrollArea>
        </Box>
    );
}
`;

fs.writeFileSync(target, content + append);
console.log("Chunk 4 done. Lines:", (content + append).split("\n").length);
