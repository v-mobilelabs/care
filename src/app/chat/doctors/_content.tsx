"use client";
import {
    ActionIcon,
    Alert,
    Autocomplete,
    Badge,
    Box,
    Button,
    Divider,
    Drawer,
    Group,
    Loader,
    NumberInput,
    Paper,
    ScrollArea,
    SimpleGrid,
    Skeleton,
    Stack,
    Text,
    TextInput,
    ThemeIcon,
    Title,
    Tooltip,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure, useDebouncedCallback } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import {
    IconBuildingHospital,
    IconCheck,
    IconClock,
    IconInfoCircle,
    IconMapPin,
    IconPhone,
    IconPlus,
    IconSearch,
    IconStar,
    IconStethoscope,
    IconTrash,
    IconUser,
    IconWorld,
    IconX,
} from "@tabler/icons-react";
import { useState } from "react";

import {
    useDoctorsQuery,
    useAddDoctorMutation,
    useDeleteDoctorMutation,
    useClinicLookupMutation,
    type DoctorRecord,
    type ClinicInfo,
    type ClinicLookupResult,
} from "@/app/chat/_query";
import { colors } from "@/ui/tokens";

// ── Medical specialties list ──────────────────────────────────────────────────

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

// ── Address helpers ───────────────────────────────────────────────────────────

interface AddressFields {
    door: string;
    street: string;
    area: string;
    city: string;
    zip: string;
}

function composeAddress(a: AddressFields): string {
    const parts = [
        a.door.trim(),
        a.street.trim(),
        a.area.trim(),
        a.city.trim(),
        a.zip.trim(),
    ].filter(Boolean);
    return parts.join(", ");
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

// ── Clinic confirmation / edit form ───────────────────────────────────────────

interface ClinicFormValues {
    name: string;
    address: string;
    phone: string;
    website: string;
    hours: string;
    rating: number | string;
}

function clinicResultToForm(result: ClinicLookupResult): ClinicFormValues {
    return {
        name: result.clinicName,
        address: result.address,
        phone: result.phone ?? "",
        website: result.website ?? "",
        hours: result.hours ?? "",
        rating: result.rating ?? "",
    };
}

function clinicFormToInfo(values: ClinicFormValues): ClinicInfo {
    return {
        name: values.name,
        address: values.address,
        phone: values.phone || undefined,
        website: values.website || undefined,
        hours: values.hours || undefined,
        rating: typeof values.rating === "number" && values.rating > 0 ? values.rating : undefined,
    };
}

// ── Doctor card ───────────────────────────────────────────────────────────────

function DoctorCard({ doctor, onDelete }: Readonly<{ doctor: DoctorRecord; onDelete: () => void }>) {
    const [hovered, setHovered] = useState(false);
    const { clinic } = doctor;

    return (
        <Paper
            withBorder
            radius="lg"
            p="lg"
            style={{
                transition: "box-shadow 200ms ease",
                boxShadow: hovered ? "0 4px 20px rgba(0,0,0,0.1)" : undefined,
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <Group justify="space-between" wrap="nowrap" mb={clinic ? "sm" : 0}>
                <Group gap="sm" wrap="nowrap">
                    <ThemeIcon size={40} radius="md" color="primary" variant="light">
                        <IconStethoscope size={20} />
                    </ThemeIcon>
                    <Box style={{ minWidth: 0 }}>
                        <Text fw={700} size="sm" style={{ lineHeight: 1.3 }}>
                            {doctor.name}
                        </Text>
                        <Badge size="xs" variant="light" color="primary" mt={2}>
                            {doctor.specialty}
                        </Badge>
                    </Box>
                </Group>
                <Tooltip label="Remove doctor">
                    <ActionIcon
                        variant="subtle"
                        color="red"
                        size="sm"
                        onClick={onDelete}
                        aria-label="Delete doctor"
                    >
                        <IconTrash size={14} />
                    </ActionIcon>
                </Tooltip>
            </Group>

            {/* Address */}
            <Group gap={6} mt="xs">
                <IconMapPin size={13} color="var(--mantine-color-dimmed)" />
                <Text size="xs" c="dimmed">{doctor.address}</Text>
            </Group>

            {clinic && (
                <>
                    <Divider my="sm" />
                    <Stack gap={6}>
                        <Group gap={6}>
                            <IconBuildingHospital size={13} color="var(--mantine-color-dimmed)" />
                            <Text size="xs" fw={600}>{clinic.name}</Text>
                        </Group>
                        {clinic.address && clinic.address !== doctor.address && (
                            <Group gap={6}>
                                <IconMapPin size={13} color="var(--mantine-color-dimmed)" />
                                <Text size="xs" c="dimmed">{clinic.address}</Text>
                            </Group>
                        )}
                        {clinic.phone && (
                            <Group gap={6}>
                                <IconPhone size={13} color="var(--mantine-color-dimmed)" />
                                <Text size="xs" c="dimmed">{clinic.phone}</Text>
                            </Group>
                        )}
                        {clinic.website && (
                            <Group gap={6}>
                                <IconWorld size={13} color="var(--mantine-color-dimmed)" />
                                <Text
                                    size="xs"
                                    c="blue"
                                    component="a"
                                    href={clinic.website.startsWith("http") ? clinic.website : `https://${clinic.website}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ wordBreak: "break-all" }}
                                >
                                    {clinic.website}
                                </Text>
                            </Group>
                        )}
                        {clinic.hours && (
                            <Group gap={6}>
                                <IconClock size={13} color="var(--mantine-color-dimmed)" />
                                <Text size="xs" c="dimmed">{clinic.hours}</Text>
                            </Group>
                        )}
                        {clinic.rating && (
                            <Group gap={6}>
                                <IconStar size={13} color="var(--mantine-color-yellow-5)" />
                                <Text size="xs" c="dimmed">{clinic.rating.toFixed(1)} / 5.0</Text>
                            </Group>
                        )}
                    </Stack>
                </>
            )}

            {doctor.notes && (
                <Text size="xs" c="dimmed" mt="xs" fs="italic">
                    {doctor.notes}
                </Text>
            )}

            <Text size="10px" c="dimmed" mt="sm">
                Added {formatDate(doctor.createdAt)}
            </Text>
        </Paper>
    );
}

// ── Add Doctor drawer ─────────────────────────────────────────────────────────

interface AddDoctorDrawerProps {
    opened: boolean;
    onClose: () => void;
}

function AddDoctorDrawer({ opened, onClose }: Readonly<AddDoctorDrawerProps>) {
    const addDoctor = useAddDoctorMutation();
    const clinicLookup = useClinicLookupMutation();

    // Step 1: doctor basic info
    const doctorForm = useForm({
        initialValues: {
            name: "",
            specialty: "",
            door: "",
            street: "",
            area: "",
            city: "",
            zip: "",
            notes: "",
        },
        validate: {
            name: (v) => (v.trim().length < 2 ? "Enter the doctor's full name" : null),
            specialty: (v) => (v.trim().length < 2 ? "Enter the doctor's specialty" : null),
            street: (v) => (v.trim().length < 2 ? "Enter the street name" : null),
            city: (v) => (v.trim().length < 2 ? "Enter the city" : null),
        },
    });

    // Step 2: clinic confirmation
    const [lookupResult, setLookupResult] = useState<ClinicLookupResult | null>(null);
    const [step, setStep] = useState<"form" | "confirm">("form");
    const clinicForm = useForm<ClinicFormValues>({
        initialValues: {
            name: "",
            address: "",
            phone: "",
            website: "",
            hours: "",
            rating: "",
        },
    });

    // Debounced lookup — fires when name, specialty, and enough address data are filled
    const triggerLookup = useDebouncedCallback(
        (name: string, specialty: string, addr: AddressFields) => {
            const address = composeAddress(addr);
            if (name.trim().length >= 2 && specialty.trim().length >= 2 && address.length >= 5) {
                clinicLookup.mutate(
                    { name: name.trim(), specialty: specialty.trim(), address },
                    {
                        onSuccess: (result) => {
                            setLookupResult(result);
                            clinicForm.setValues(clinicResultToForm(result));
                        },
                    },
                );
            }
        },
        900,
    );

    function getAddressFields(): AddressFields {
        const v = doctorForm.values;
        return { door: v.door, street: v.street, area: v.area, city: v.city, zip: v.zip };
    }

    function handleNameChange(value: string) {
        doctorForm.setFieldValue("name", value);
        triggerLookup(value, doctorForm.values.specialty, getAddressFields());
    }

    function handleSpecialtyChange(value: string) {
        doctorForm.setFieldValue("specialty", value);
        triggerLookup(doctorForm.values.name, value, getAddressFields());
    }

    function handleAddressFieldChange(field: "door" | "street" | "area" | "city" | "zip", value: string) {
        doctorForm.setFieldValue(field, value);
        const updated = { ...getAddressFields(), [field]: value };
        triggerLookup(doctorForm.values.name, doctorForm.values.specialty, updated);
    }

    function handleClose() {
        doctorForm.reset();
        clinicForm.reset();
        setLookupResult(null);
        setStep("form");
        onClose();
    }

    function handleProceedToConfirm() {
        const validation = doctorForm.validate();
        if (validation.hasErrors) return;
        if (!lookupResult && !clinicLookup.isPending) {
            // Save without clinic if lookup hasn't run yet
            handleSave(undefined);
            return;
        }
        setStep("confirm");
    }

    function handleSave(clinic: ClinicInfo | undefined) {
        const doctorValues = doctorForm.values;
        const address = composeAddress({
            door: doctorValues.door,
            street: doctorValues.street,
            area: doctorValues.area,
            city: doctorValues.city,
            zip: doctorValues.zip,
        });
        addDoctor.mutate(
            {
                name: doctorValues.name.trim(),
                specialty: doctorValues.specialty.trim(),
                address,
                notes: doctorValues.notes.trim() || undefined,
                clinic,
            },
            {
                onSuccess: () => {
                    notifications.show({
                        title: "Doctor added",
                        message: `${doctorValues.name} has been saved to your doctors list.`,
                        color: colors.success,
                        icon: <IconCheck size={18} />,
                    });
                    handleClose();
                },
                onError: (err) => {
                    notifications.show({
                        title: "Failed to save",
                        message: err instanceof Error ? err.message : "Something went wrong.",
                        color: colors.danger,
                    });
                },
            },
        );
    }

    function handleConfirmAndSave() {
        const clinic = clinicFormToInfo(clinicForm.values);
        handleSave(clinic);
    }

    function handleSkipClinic() {
        handleSave(undefined);
    }

    return (
        <Drawer
            opened={opened}
            onClose={handleClose}
            title={
                <Group gap="xs">
                    <ThemeIcon size={28} radius="md" color="primary" variant="light">
                        <IconStethoscope size={16} />
                    </ThemeIcon>
                    <Text fw={700} size="sm">Add Doctor</Text>
                </Group>
            }
            position="right"
            size="md"
            padding="xl"
        >
            <ScrollArea h="calc(100vh - 80px)" offsetScrollbars>
                {step === "form" && (
                    <Stack gap="md">
                        <TextInput
                            label="Doctor's Name"
                            placeholder="e.g. Dr. Sarah Johnson"
                            leftSection={<IconUser size={15} />}
                            {...doctorForm.getInputProps("name")}
                            onChange={(e) => handleNameChange(e.currentTarget.value)}
                            required
                        />
                        <Autocomplete
                            label="Specialty"
                            placeholder="e.g. Cardiologist, Dentist, GP"
                            leftSection={<IconStethoscope size={15} />}
                            data={SPECIALTIES}
                            limit={8}
                            {...doctorForm.getInputProps("specialty")}
                            onChange={handleSpecialtyChange}
                            required
                        />
                        {/* Structured address */}
                        <Box>
                            <Text size="sm" fw={500} mb={6}>
                                Address <Text component="span" c="red" size="sm"> *</Text>
                            </Text>
                            <Stack gap="xs">
                                <TextInput
                                    placeholder="Door / Flat no. (optional)"
                                    leftSection={<IconMapPin size={14} />}
                                    {...doctorForm.getInputProps("door")}
                                    onChange={(e) => handleAddressFieldChange("door", e.currentTarget.value)}
                                />
                                <TextInput
                                    placeholder="Street *"
                                    {...doctorForm.getInputProps("street")}
                                    onChange={(e) => handleAddressFieldChange("street", e.currentTarget.value)}
                                />
                                <TextInput
                                    placeholder="Area / Locality"
                                    {...doctorForm.getInputProps("area")}
                                    onChange={(e) => handleAddressFieldChange("area", e.currentTarget.value)}
                                />
                                <SimpleGrid cols={2} spacing="xs">
                                    <TextInput
                                        placeholder="City *"
                                        {...doctorForm.getInputProps("city")}
                                        onChange={(e) => handleAddressFieldChange("city", e.currentTarget.value)}
                                    />
                                    <TextInput
                                        placeholder="PIN / ZIP"
                                        {...doctorForm.getInputProps("zip")}
                                        onChange={(e) => handleAddressFieldChange("zip", e.currentTarget.value)}
                                    />
                                </SimpleGrid>
                            </Stack>
                        </Box>
                        <TextInput
                            label="Notes (optional)"
                            placeholder="e.g. Primary care doctor, For consultation only"
                            {...doctorForm.getInputProps("notes")}
                        />

                        {/* Lookup status */}
                        {clinicLookup.isPending && (
                            <Alert
                                icon={<Loader size={14} />}
                                color="blue"
                                variant="light"
                                radius="md"
                            >
                                <Text size="xs">Searching for clinic details with AI…</Text>
                            </Alert>
                        )}

                        {lookupResult && !clinicLookup.isPending && (
                            <Alert
                                icon={<IconCheck size={14} />}
                                color="teal"
                                variant="light"
                                radius="md"
                                title="Clinic details found"
                            >
                                <Text size="xs">Found <strong>{lookupResult.clinicName}</strong>. You can review and edit on the next step.</Text>
                            </Alert>
                        )}

                        {clinicLookup.isError && (
                            <Alert
                                icon={<IconInfoCircle size={14} />}
                                color="orange"
                                variant="light"
                                radius="md"
                            >
                                <Text size="xs">Could not auto-fetch clinic details. You can still save the doctor and add clinic info later.</Text>
                            </Alert>
                        )}

                        <Group justify="flex-end" mt="sm">
                            <Button variant="subtle" color="gray" onClick={handleClose}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleProceedToConfirm}
                                loading={addDoctor.isPending}
                                disabled={clinicLookup.isPending}
                                rightSection={lookupResult ? <IconCheck size={15} /> : undefined}
                            >
                                {lookupResult ? "Review Clinic Details" : "Save Doctor"}
                            </Button>
                        </Group>
                    </Stack>
                )}

                {step === "confirm" && (
                    <Stack gap="md">
                        <Alert icon={<IconSearch size={14} />} color="blue" variant="light" radius="md">
                            <Text size="xs">
                                AI found these clinic details based on your input. Please review and edit if anything looks wrong.
                            </Text>
                        </Alert>

                        <Paper withBorder radius="md" p="md" style={{ background: "light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-7))" }}>
                            <Text size="xs" c="dimmed" fw={600} mb="xs" style={{ textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                Doctor
                            </Text>
                            <Group gap="xs">
                                <ThemeIcon size={24} radius="md" color="primary" variant="light">
                                    <IconStethoscope size={12} />
                                </ThemeIcon>
                                <Text size="sm" fw={600}>{doctorForm.values.name}</Text>
                                <Badge size="xs" variant="light">{doctorForm.values.specialty}</Badge>
                            </Group>
                        </Paper>

                        <Text size="sm" fw={600} mt="xs">Clinic Details</Text>
                        <Stack gap="sm">
                            <TextInput
                                label="Clinic Name"
                                leftSection={<IconBuildingHospital size={15} />}
                                {...clinicForm.getInputProps("name")}
                                required
                            />
                            <TextInput
                                label="Clinic Address"
                                leftSection={<IconMapPin size={15} />}
                                {...clinicForm.getInputProps("address")}
                                required
                            />
                            <TextInput
                                label="Phone"
                                leftSection={<IconPhone size={15} />}
                                placeholder="e.g. +91 98765 43210"
                                {...clinicForm.getInputProps("phone")}
                            />
                            <TextInput
                                label="Website"
                                leftSection={<IconWorld size={15} />}
                                placeholder="e.g. https://clinic.example.com"
                                {...clinicForm.getInputProps("website")}
                            />
                            <TextInput
                                label="Business Hours"
                                leftSection={<IconClock size={15} />}
                                placeholder="e.g. Mon–Fri 9am–5pm"
                                {...clinicForm.getInputProps("hours")}
                            />
                            <NumberInput
                                label="Google Rating"
                                leftSection={<IconStar size={15} />}
                                placeholder="e.g. 4.5"
                                min={0}
                                max={5}
                                step={0.1}
                                decimalScale={1}
                                {...clinicForm.getInputProps("rating")}
                            />
                        </Stack>

                        <Group justify="space-between" mt="sm">
                            <Button
                                variant="subtle"
                                color="gray"
                                size="sm"
                                leftSection={<IconX size={14} />}
                                onClick={() => setStep("form")}
                            >
                                Back
                            </Button>
                            <Group gap="xs">
                                <Button
                                    variant="default"
                                    size="sm"
                                    onClick={handleSkipClinic}
                                    loading={addDoctor.isPending}
                                >
                                    Skip Clinic
                                </Button>
                                <Button
                                    size="sm"
                                    leftSection={<IconCheck size={15} />}
                                    onClick={handleConfirmAndSave}
                                    loading={addDoctor.isPending}
                                    disabled={!clinicForm.values.name.trim() || !clinicForm.values.address.trim()}
                                >
                                    Confirm & Save
                                </Button>
                            </Group>
                        </Group>
                    </Stack>
                )}
            </ScrollArea>
        </Drawer>
    );
}

// ── Main content ──────────────────────────────────────────────────────────────

export function DoctorsContent() {
    const { data: doctors = [], isLoading } = useDoctorsQuery();
    const deleteDoctor = useDeleteDoctorMutation();
    const [drawerOpened, { open: openDrawer, close: closeDrawer }] = useDisclosure(false);

    function doctorCountLabel() {
        if (doctors.length === 0) return "Manage your healthcare providers";
        const plural = doctors.length === 1 ? "" : "s";
        return `${doctors.length} healthcare provider${plural}`;
    }

    function handleDelete(doctor: DoctorRecord) {
        modals.openConfirmModal({
            title: "Remove doctor?",
            children: (
                <Text size="sm">
                    This will remove <strong>{doctor.name}</strong> from your doctors list. This cannot be undone.
                </Text>
            ),
            labels: { confirm: "Remove", cancel: "Cancel" },
            confirmProps: { color: "red" },
            onConfirm: () => {
                deleteDoctor.mutate(doctor.id, {
                    onSuccess: () => {
                        notifications.show({
                            title: "Doctor removed",
                            message: `${doctor.name} has been removed.`,
                            color: colors.success,
                            icon: <IconCheck size={18} />,
                        });
                    },
                    onError: (err) => {
                        notifications.show({
                            title: "Failed to remove",
                            message: err instanceof Error ? err.message : "Something went wrong.",
                            color: colors.danger,
                        });
                    },
                });
            },
        });
    }

    return (
        <>
            <AddDoctorDrawer opened={drawerOpened} onClose={closeDrawer} />

            <Box style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
                {/* Header */}
                <Box
                    px={{ base: "md", sm: "xl" }}
                    py="md"
                    style={{
                        flexShrink: 0,
                        borderBottom: "1px solid light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))",
                        background: "light-dark(white, var(--mantine-color-dark-8))",
                    }}
                >
                    <Group justify="space-between" align="center" wrap="nowrap">
                        <Group gap="sm">
                            <ThemeIcon size={36} radius="md" color="primary" variant="light">
                                <IconStethoscope size={20} />
                            </ThemeIcon>
                            <Box>
                                <Title order={4} lh={1.2}>My Doctors</Title>
                                <Text size="xs" c="dimmed">
                                    {doctorCountLabel()}
                                </Text>
                            </Box>
                        </Group>
                        <Button
                            leftSection={<IconPlus size={15} />}
                            size="sm"
                            color="primary"
                            variant="light"
                            onClick={openDrawer}
                        >
                            Add
                        </Button>
                    </Group>
                </Box>

                {/* Content */}
                <Box style={{ flex: 1, overflow: "hidden" }}>
                    <ScrollArea style={{ height: "100%" }}>
                        <Box px={{ base: "md", sm: "xl" }} py="lg" maw={800} mx="auto">
                            {/* Loading skeletons */}
                            {isLoading && (
                                <Stack gap="md">
                                    {["a", "b", "c"].map((k) => (
                                        <Skeleton key={k} height={130} radius="lg" />
                                    ))}
                                </Stack>
                            )}

                            {/* Empty state */}
                            {!isLoading && doctors.length === 0 && (
                                <Box py={80} style={{ textAlign: "center" }}>
                                    <ThemeIcon size={64} radius="xl" color="primary" variant="light" mx="auto" mb="md">
                                        <IconStethoscope size={32} />
                                    </ThemeIcon>
                                    <Text fw={600} size="sm" mb={6}>No doctors yet</Text>
                                    <Text size="sm" c="dimmed" maw={300} mx="auto" lh={1.6} mb="lg">
                                        Add your healthcare providers so CareAI can give you more personalised advice.
                                    </Text>
                                    <Button
                                        leftSection={<IconPlus size={15} />}
                                        color="primary"
                                        variant="light"
                                        onClick={openDrawer}
                                    >
                                        Add your first doctor
                                    </Button>
                                </Box>
                            )}

                            {/* Doctor cards */}
                            {!isLoading && doctors.length > 0 && (
                                <Stack gap="md">
                                    {doctors.map((doctor) => (
                                        <DoctorCard
                                            key={doctor.id}
                                            doctor={doctor}
                                            onDelete={() => handleDelete(doctor)}
                                        />
                                    ))}
                                </Stack>
                            )}
                        </Box>
                    </ScrollArea>
                </Box>
            </Box>
        </>
    );
}
