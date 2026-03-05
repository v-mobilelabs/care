"use client";
import { useState } from "react";
import {
    Autocomplete,
    Box,
    Button,
    Group,
    Paper,
    SimpleGrid,
    Skeleton,
    Stack,
    Text,
    Textarea,
    TextInput,
    Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { IconCheck, IconPencil, IconX } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type DoctorProfileDto } from "@/data/doctors";
import { type ProfileDto } from "@/data/profile";
import { colors } from "@/ui/tokens";
import { useAuth } from "@/ui/providers/auth-provider";
import { AvatarUpload } from "@/app/chat/profile/_sections/avatar-upload";
import { getInitials } from "@/lib/get-initials";

const DOCTOR_QUERY_KEY = ["doctor-profile"] as const;
const PROFILE_QUERY_KEY = ["profile"] as const;

const SPECIALTIES = [
    "Allergist / Immunologist",
    "Anaesthesiologist",
    "Cardiologist",
    "Cardiothoracic Surgeon",
    "Colorectal Surgeon",
    "Dermatologist",
    "Diabetologist",
    "Endocrinologist",
    "ENT Specialist",
    "Family Medicine / GP",
    "Gastroenterologist",
    "General Physician",
    "General Surgeon",
    "Geriatrician",
    "Gynaecologist",
    "Haematologist",
    "Hepatologist",
    "Infectious Disease Specialist",
    "Internal Medicine",
    "Interventional Radiologist",
    "Neonatologist",
    "Nephrologist",
    "Neurologist",
    "Neurosurgeon",
    "Obstetrician",
    "Oncologist",
    "Ophthalmologist",
    "Oral & Maxillofacial Surgeon",
    "Orthopaedic Surgeon",
    "Paediatrician",
    "Paediatric Surgeon",
    "Pain Medicine Specialist",
    "Pathologist",
    "Physiotherapist",
    "Plastic Surgeon",
    "Psychiatrist",
    "Pulmonologist",
    "Radiologist",
    "Rheumatologist",
    "Sleep Medicine Specialist",
    "Sports Medicine Specialist",
    "Urologist",
    "Vascular Surgeon",
    "Dentist",
    "Orthodontist",
    "Periodontist",
    "Prosthodontist",
    "Endodontist",
    "Oral Surgeon",
];

async function fetchDoctorProfile(): Promise<DoctorProfileDto> {
    const res = await fetch("/api/doctors/me");
    if (!res.ok) throw new Error("Could not load doctor profile.");
    return res.json() as Promise<DoctorProfileDto>;
}

async function fetchMyProfile(): Promise<ProfileDto> {
    const res = await fetch("/api/profile");
    if (!res.ok) throw new Error("Could not load profile.");
    return res.json() as Promise<ProfileDto>;
}

/** Combined form values — doctor fields go to PUT /api/doctors/me, identity fields to PUT /api/profile. */
type ProfileFormValues = {
    name: string;
    phone: string;
    specialty: string;
    licenseNumber: string;
    bio: string;
};

export default function DoctorProfilePage() {
    const qc = useQueryClient();
    const { user, refreshUser } = useAuth();
    const [editing, setEditing] = useState(false);

    const { data: doctor, isLoading: doctorLoading } = useQuery({
        queryKey: DOCTOR_QUERY_KEY,
        queryFn: fetchDoctorProfile,
    });

    const { data: myProfile, isLoading: profileLoading } = useQuery({
        queryKey: PROFILE_QUERY_KEY,
        queryFn: fetchMyProfile,
    });

    const isLoading = doctorLoading || profileLoading;
    const initials = getInitials(myProfile?.name ?? user?.displayName ?? null, myProfile?.email ?? user?.email ?? null);
    const photoSrc = myProfile?.photoUrl ?? user?.photoURL ?? null;

    function handleAvatarUpdated(url: string) {
        refreshUser();
        qc.setQueryData<ProfileDto>(PROFILE_QUERY_KEY, (prev) => prev ? { ...prev, photoUrl: url } : prev);
    }

    const form = useForm<ProfileFormValues>({
        initialValues: {
            name: "",
            phone: "",
            specialty: "",
            licenseNumber: "",
            bio: "",
        },
        validate: {
            name: (v) => (v && v.length >= 2 ? null : "Full name is required (min 2 chars)"),
            phone: (v) => {
                if (!v?.trim()) return "Phone number is required";
                return /^\+?[\d\s\-().]{7,20}$/.test(v.trim()) ? null : "Enter a valid phone number (e.g. +1 555 000 0000)";
            },
            specialty: (v) => (v && v.length >= 2 ? null : "Specialty is required (min 2 chars)"),
            licenseNumber: (v) => (v && v.length >= 2 ? null : "License number is required (min 2 chars)"),
        },
    });

    const mutation = useMutation({
        mutationFn: async (values: ProfileFormValues) => {
            const [doctorRes, profileRes] = await Promise.all([
                fetch("/api/doctors/me", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ specialty: values.specialty, licenseNumber: values.licenseNumber, bio: values.bio }),
                }),
                fetch("/api/profile", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name: values.name, phone: values.phone }),
                }),
            ]);
            const [doctorData, profileData] = await Promise.all([doctorRes.json(), profileRes.json()]);
            if (!doctorRes.ok) throw new Error((doctorData as { error?: { message?: string } }).error?.message ?? "Could not update doctor profile.");
            if (!profileRes.ok) throw new Error((profileData as { error?: { message?: string } }).error?.message ?? "Could not update profile.");
            return { doctor: doctorData as DoctorProfileDto, profile: profileData as ProfileDto };
        },
        onSuccess: ({ doctor, profile }) => {
            qc.setQueryData(DOCTOR_QUERY_KEY, doctor);
            qc.setQueryData(PROFILE_QUERY_KEY, profile);
            notifications.show({
                title: "Profile updated",
                message: "Your professional information has been saved.",
                color: colors.success,
                icon: <IconCheck size={18} />,
            });
            setEditing(false);
        },
        onError: (err: Error) => {
            notifications.show({
                title: "Update failed",
                message: err.message,
                color: colors.danger,
                icon: <IconX size={18} />,
            });
        },
    });

    function handleEdit() {
        form.setValues({
            name: myProfile?.name ?? "",
            phone: myProfile?.phone ?? "",
            specialty: doctor?.specialty ?? "",
            licenseNumber: doctor?.licenseNumber ?? "",
            bio: doctor?.bio ?? "",
        });
        setEditing(true);
    }

    function handleCancel() {
        form.reset();
        setEditing(false);
    }

    function handleSubmit(values: ProfileFormValues) {
        mutation.mutate(values);
    }

    return (
        <Stack gap="lg">
            <Group justify="space-between" align="flex-start">
                <Box>
                    <Title order={2}>My Profile</Title>
                    <Text c="dimmed" size="sm" mt={4}>
                        Your professional information displayed to patients.
                    </Text>
                </Box>
                {!isLoading && !editing && (
                    <Button
                        leftSection={<IconPencil size={16} />}
                        variant="light"
                        onClick={handleEdit}
                    >
                        Edit Profile
                    </Button>
                )}
            </Group>

            <Paper withBorder radius="lg" p={0} style={{ overflow: "hidden" }}>
                {/* Gradient banner */}
                <Box
                    style={{
                        height: 68,
                        background: "linear-gradient(135deg, var(--mantine-color-primary-6) 0%, var(--mantine-color-primary-4) 100%)",
                    }}
                />

                {editing ? (
                    <Box px="xl" pb="xl">
                        <AvatarUpload
                            src={photoSrc}
                            initials={initials}
                            onUpdated={handleAvatarUpdated}
                        />
                        <form onSubmit={form.onSubmit(handleSubmit)}>
                            <Stack gap="md" mt="sm">
                                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                                    <TextInput
                                        label="Full name"
                                        placeholder="Dr. Jane Smith"
                                        withAsterisk
                                        autoFocus
                                        {...form.getInputProps("name")}
                                    />
                                    <TextInput
                                        label="Phone"
                                        placeholder="+1 555 000 0000"
                                        withAsterisk
                                        {...form.getInputProps("phone")}
                                    />
                                    <Autocomplete
                                        label="Specialty"
                                        placeholder="e.g. Cardiologist, Dentist, GP"
                                        data={SPECIALTIES}
                                        limit={8}
                                        withAsterisk
                                        comboboxProps={{ shadow: "md", radius: "md" }}
                                        {...form.getInputProps("specialty")}
                                    />
                                    <TextInput
                                        label="License number"
                                        placeholder="MD-123456"
                                        withAsterisk
                                        {...form.getInputProps("licenseNumber")}
                                    />
                                </SimpleGrid>

                                <Textarea
                                    label="Bio"
                                    placeholder="A short description about yourself and your practice…"
                                    autosize
                                    minRows={3}
                                    maxRows={8}
                                    {...form.getInputProps("bio")}
                                />

                                <Group justify="flex-end" gap="sm">
                                    <Button variant="default" onClick={handleCancel} disabled={mutation.isPending}>
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        loading={mutation.isPending}
                                        leftSection={<IconCheck size={16} />}
                                    >
                                        Save changes
                                    </Button>
                                </Group>
                            </Stack>
                        </form>
                    </Box>
                ) : (
                    <Box px="xl" pb="xl">
                        <AvatarUpload
                            src={photoSrc}
                            initials={initials}
                            onUpdated={handleAvatarUpdated}
                        />

                        <Group justify="space-between" align="flex-start" mt="xs" wrap="wrap" gap="xs">
                            <Stack gap={2}>
                                {isLoading ? (
                                    <>
                                        <Skeleton height={20} width={180} />
                                        <Skeleton height={16} width={120} mt={4} />
                                    </>
                                ) : (
                                    <>
                                        <Title order={3}>{myProfile?.name ?? "—"}</Title>
                                        <Text c="dimmed" size="sm">{doctor?.specialty ?? "—"}</Text>
                                        {myProfile?.email && (
                                            <Text size="xs" c="dimmed">{myProfile.email}</Text>
                                        )}
                                    </>
                                )}
                            </Stack>
                        </Group>

                        <Stack gap="md" mt="md">
                            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                                {[
                                    { label: "License number", value: doctor?.licenseNumber },
                                    { label: "Phone", value: myProfile?.phone ?? "—" },
                                    {
                                        label: "Member since",
                                        value: doctor?.createdAt
                                            ? new Date(doctor.createdAt).toLocaleDateString([], {
                                                year: "numeric",
                                                month: "long",
                                                day: "numeric",
                                            })
                                            : "—",
                                    },
                                ].map(({ label, value }) => (
                                    <Stack key={label} gap={2}>
                                        <Text size="xs" c="dimmed" fw={500} tt="uppercase">{label}</Text>
                                        {isLoading ? (
                                            <Skeleton height={16} width="60%" />
                                        ) : (
                                            <Text size="sm" fw={500}>{value ?? "—"}</Text>
                                        )}
                                    </Stack>
                                ))}
                            </SimpleGrid>

                            {(isLoading || doctor?.bio) && (
                                <Stack gap={2}>
                                    <Text size="xs" c="dimmed" fw={500} tt="uppercase">Bio</Text>
                                    {isLoading ? (
                                        <Skeleton height={16} width="80%" />
                                    ) : (
                                        <Text size="sm">{doctor?.bio}</Text>
                                    )}
                                </Stack>
                            )}
                        </Stack>
                    </Box>
                )}
            </Paper>
        </Stack>
    );
}
