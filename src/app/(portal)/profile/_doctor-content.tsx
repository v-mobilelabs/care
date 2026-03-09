"use client";
import { useState } from "react";
import {
    Autocomplete,
    Box,
    Button,
    Group,
    SimpleGrid,
    Skeleton,
    Stack,
    Text,
    Textarea,
    TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { IconCheck, IconPencil, IconUser, IconX } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type DoctorProfileDto } from "@/data/doctors";
import { type ProfileDto } from "@/data/profile";
import { colors } from "@/ui/tokens";
import { useAuth } from "@/ui/providers/auth-provider";
import { AvatarUpload } from "@/app/(portal)/chat/profile/_sections/avatar-upload";
import { getInitials } from "@/lib/get-initials";
import { iosCard, iosLargeTitle, iosSubtitle, ios, allKeyframes } from "@/ui/ios";

const DOCTOR_QUERY_KEY = ["doctor-profile"] as const;
const PROFILE_QUERY_KEY = ["profile"] as const;

const SPECIALTIES = [
    "Allergist / Immunologist", "Anaesthesiologist", "Cardiologist",
    "Cardiothoracic Surgeon", "Colorectal Surgeon", "Dermatologist",
    "Diabetologist", "Endocrinologist", "ENT Specialist", "Family Medicine / GP",
    "Gastroenterologist", "General Physician", "General Surgeon", "Geriatrician",
    "Gynaecologist", "Haematologist", "Hepatologist", "Infectious Disease Specialist",
    "Internal Medicine", "Interventional Radiologist", "Neonatologist",
    "Nephrologist", "Neurologist", "Neurosurgeon", "Obstetrician", "Oncologist",
    "Ophthalmologist", "Oral & Maxillofacial Surgeon", "Orthopaedic Surgeon",
    "Paediatrician", "Paediatric Surgeon", "Pain Medicine Specialist", "Pathologist",
    "Physiotherapist", "Plastic Surgeon", "Psychiatrist", "Pulmonologist",
    "Radiologist", "Rheumatologist", "Sleep Medicine Specialist",
    "Sports Medicine Specialist", "Urologist", "Vascular Surgeon",
    "Dentist", "Orthodontist", "Periodontist", "Prosthodontist", "Endodontist", "Oral Surgeon",
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

type ProfileFormValues = {
    name: string;
    phone: string;
    specialty: string;
    licenseNumber: string;
    bio: string;
};

export function DoctorProfileContent() {
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
        initialValues: { name: "", phone: "", specialty: "", licenseNumber: "", bio: "" },
        validate: {
            name: (v) => (v && v.length >= 2 ? null : "Full name is required (min 2 chars)"),
            phone: (v) => {
                if (!v?.trim()) return "Phone number is required";
                return /^\+?[\d\s\-().]{7,20}$/.test(v.trim()) ? null : "Enter a valid phone number (e.g. +1 555 000 0000)";
            },
            specialty: (v) => (v && v.length >= 2 ? null : "Specialty is required"),
            licenseNumber: (v) => (v && v.length >= 2 ? null : "License number is required"),
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

    return (
        <Stack gap="lg">
            <style>{allKeyframes}</style>

            {/* Header */}
            <Box style={{ animation: ios.animation.fadeSlideUp() }}>
                <Group justify="space-between" align="flex-start">
                    <Group gap="sm" align="center">
                        <Box
                            style={{
                                width: 36, height: 36, borderRadius: 10,
                                background: "light-dark(rgba(99,102,241,0.1), rgba(99,102,241,0.15))",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                color: "var(--mantine-color-primary-5)",
                            }}
                        >
                            <IconUser size={20} />
                        </Box>
                        <Box>
                            <Text style={iosLargeTitle}>My Profile</Text>
                            <Text style={iosSubtitle}>Your professional information displayed to patients.</Text>
                        </Box>
                    </Group>
                    {!isLoading && !editing && (
                        <Button
                            leftSection={<IconPencil size={16} />}
                            variant="light"
                            radius="xl"
                            onClick={handleEdit}
                            style={{ fontWeight: 600 }}
                        >
                            Edit Profile
                        </Button>
                    )}
                </Group>
            </Box>

            {/* Card */}
            <Box style={{ ...iosCard, padding: 0, overflow: "hidden", animation: ios.animation.fadeSlideUp("100ms") }}>
                {/* Gradient banner */}
                <Box style={{ height: 68, background: "linear-gradient(135deg, var(--mantine-color-primary-6) 0%, var(--mantine-color-primary-4) 100%)" }} />

                {editing ? (
                    <Box px="xl" pb="xl">
                        <AvatarUpload src={photoSrc} initials={initials} onUpdated={handleAvatarUpdated} />
                        <form onSubmit={form.onSubmit((v) => mutation.mutate(v))}>
                            <Stack gap="md" mt="sm">
                                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                                    <TextInput label="Full name" placeholder="Dr. Jane Smith" withAsterisk autoFocus radius={12} {...form.getInputProps("name")} />
                                    <TextInput label="Phone" placeholder="+1 555 000 0000" withAsterisk radius={12} {...form.getInputProps("phone")} />
                                    <Autocomplete
                                        label="Specialty" placeholder="e.g. Cardiologist, Dentist, GP"
                                        data={SPECIALTIES} limit={8} withAsterisk radius={12}
                                        comboboxProps={{ shadow: "md", radius: "md" }}
                                        {...form.getInputProps("specialty")}
                                    />
                                    <TextInput label="License number" placeholder="MD-123456" withAsterisk radius={12} {...form.getInputProps("licenseNumber")} />
                                </SimpleGrid>
                                <Textarea
                                    label="Bio" placeholder="A short description about yourself and your practice…"
                                    autosize minRows={3} maxRows={8} radius={12}
                                    {...form.getInputProps("bio")}
                                />
                                <Group justify="flex-end" gap="sm">
                                    <Button variant="default" radius="xl" onClick={handleCancel} disabled={mutation.isPending}>Cancel</Button>
                                    <Button type="submit" loading={mutation.isPending} leftSection={<IconCheck size={16} />} radius="xl" style={{ fontWeight: 600 }}>
                                        Save changes
                                    </Button>
                                </Group>
                            </Stack>
                        </form>
                    </Box>
                ) : (
                    <Box px="xl" pb="xl">
                        <AvatarUpload src={photoSrc} initials={initials} onUpdated={handleAvatarUpdated} />

                        <Group justify="space-between" align="flex-start" mt="xs" wrap="wrap" gap="xs">
                            <Stack gap={2}>
                                {isLoading ? (
                                    <>
                                        <Skeleton height={20} width={180} radius="md" />
                                        <Skeleton height={16} width={120} mt={4} radius="md" />
                                    </>
                                ) : (
                                    <>
                                        <Text fw={700} size="lg">{myProfile?.name ?? "—"}</Text>
                                        <Text c="dimmed" size="sm">{doctor?.specialty ?? "—"}</Text>
                                        {myProfile?.email && <Text size="xs" c="dimmed">{myProfile.email}</Text>}
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
                                            ? new Date(doctor.createdAt).toLocaleDateString([], { year: "numeric", month: "long", day: "numeric" })
                                            : "—",
                                    },
                                ].map(({ label, value }) => (
                                    <Stack key={label} gap={2}>
                                        <Text size="xs" c="dimmed" fw={500} tt="uppercase">{label}</Text>
                                        {isLoading
                                            ? <Skeleton height={16} width="60%" radius="md" />
                                            : <Text size="sm" fw={500}>{value ?? "—"}</Text>
                                        }
                                    </Stack>
                                ))}
                            </SimpleGrid>
                            {(isLoading || doctor?.bio) && (
                                <Stack gap={2}>
                                    <Text size="xs" c="dimmed" fw={500} tt="uppercase">Bio</Text>
                                    {isLoading ? <Skeleton height={16} width="80%" radius="md" /> : <Text size="sm">{doctor?.bio}</Text>}
                                </Stack>
                            )}
                        </Stack>
                    </Box>
                )}
            </Box>
        </Stack>
    );
}
