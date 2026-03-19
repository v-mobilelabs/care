import { Skeleton, Stack } from "@mantine/core";

export default function DoctorPatientsLoading() {
    return (
        <Stack gap="sm" p="md">
            {["a", "b", "c", "d", "e"].map((k) => (
                <Skeleton key={k} height={64} radius="lg" />
            ))}
        </Stack>
    );
}
