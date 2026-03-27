"use client";
import {
    Button,
    Group,
    Modal,
    NumberInput,
    ScrollArea,
    Stack,
    Text,
    ThemeIcon,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { IconCheck, IconDroplet, IconHeartFilled, IconHeartbeat, IconLungs, IconPercentage, IconRulerMeasure, IconScale, IconTemperature, IconTestPipe } from "@tabler/icons-react";

import {
    useAddVitalMutation,
    type AddVitalPayload,
} from "@/app/(portal)/user/_query";
import { colors } from "@/ui/tokens";

interface VitalFormValues {
    weightKg: number | string;
    heightCm: number | string;
    systolicBp: number | string;
    diastolicBp: number | string;
    restingHr: number | string;
    spo2: number | string;
    temperatureC: number | string;
    respiratoryRate: number | string;
    glucoseMgdl: number | string;
}

export function VitalModal({ opened, onClose }: Readonly<{ opened: boolean; onClose: () => void }>) {
    const addMutation = useAddVitalMutation();

    const form = useForm<VitalFormValues>({
        initialValues: {
            weightKg: "",
            heightCm: "",
            systolicBp: "",
            diastolicBp: "",
            restingHr: "",
            spo2: "",
            temperatureC: "",
            respiratoryRate: "",
            glucoseMgdl: "",
        },
        validate: (values) => {
            const hasAny = Object.values(values).some((v) => v !== "" && v !== undefined);
            if (!hasAny) return { weightKg: "Enter at least one vital sign" };
            return {};
        },
    });

    function handleClose() {
        onClose();
        form.reset();
    }

    function handleSubmit(values: VitalFormValues) {
        const payload: AddVitalPayload = {};

        if (values.weightKg !== "" && values.weightKg !== undefined) payload.weightKg = Number(values.weightKg);
        if (values.heightCm !== "" && values.heightCm !== undefined) payload.heightCm = Number(values.heightCm);
        if (values.systolicBp !== "" && values.systolicBp !== undefined) payload.systolicBp = Number(values.systolicBp);
        if (values.diastolicBp !== "" && values.diastolicBp !== undefined) payload.diastolicBp = Number(values.diastolicBp);
        if (values.restingHr !== "" && values.restingHr !== undefined) payload.restingHr = Number(values.restingHr);
        if (values.spo2 !== "" && values.spo2 !== undefined) payload.spo2 = Number(values.spo2);
        if (values.temperatureC !== "" && values.temperatureC !== undefined) payload.temperatureC = Number(values.temperatureC);
        if (values.respiratoryRate !== "" && values.respiratoryRate !== undefined) payload.respiratoryRate = Number(values.respiratoryRate);
        if (values.glucoseMgdl !== "" && values.glucoseMgdl !== undefined) payload.glucoseMgdl = Number(values.glucoseMgdl);

        addMutation.mutate(payload, {
            onSuccess: () => {
                notifications.show({
                    title: "Vitals logged",
                    message: "Your vital signs have been recorded.",
                    color: colors.success,
                    icon: <IconCheck size={16} />,
                });
                handleClose();
            },
        });
    }

    return (
        <Modal
            opened={opened}
            onClose={handleClose}
            title={
                <Group gap="xs">
                    <ThemeIcon size={24} radius="md" color="red" variant="light">
                        <IconHeartFilled size={13} />
                    </ThemeIcon>
                    <Text fw={600} size="sm">Log Vitals</Text>
                </Group>
            }
            size="md"
            radius="lg"
            centered
            scrollAreaComponent={ScrollArea.Autosize}
        >
            <form onSubmit={form.onSubmit(handleSubmit)}>
                <Stack gap="md">
                    {/* Blood Pressure */}
                    <Group grow gap="sm">
                        <NumberInput
                            label="Systolic (mmHg)"
                            placeholder="120"
                            size="sm"
                            min={50}
                            max={300}
                            leftSection={<IconDroplet size={16} />}
                            key={form.key("systolicBp")}
                            {...form.getInputProps("systolicBp")}
                        />
                        <NumberInput
                            label="Diastolic (mmHg)"
                            placeholder="80"
                            size="sm"
                            min={20}
                            max={200}
                            leftSection={<IconDroplet size={16} />}
                            key={form.key("diastolicBp")}
                            {...form.getInputProps("diastolicBp")}
                        />
                    </Group>

                    {/* Heart Rate & SpO2 */}
                    <Group grow gap="sm">
                        <NumberInput
                            label="Heart Rate (bpm)"
                            placeholder="72"
                            size="sm"
                            min={20}
                            max={300}
                            leftSection={<IconHeartbeat size={16} />}
                            key={form.key("restingHr")}
                            {...form.getInputProps("restingHr")}
                        />
                        <NumberInput
                            label="SpO2 (%)"
                            placeholder="98"
                            size="sm"
                            min={50}
                            max={100}
                            leftSection={<IconPercentage size={16} />}
                            key={form.key("spo2")}
                            {...form.getInputProps("spo2")}
                        />
                    </Group>

                    {/* Temperature & Respiratory Rate */}
                    <Group grow gap="sm">
                        <NumberInput
                            label="Temperature (°C)"
                            placeholder="36.6"
                            size="sm"
                            min={30}
                            max={45}
                            decimalScale={1}
                            step={0.1}
                            leftSection={<IconTemperature size={16} />}
                            key={form.key("temperatureC")}
                            {...form.getInputProps("temperatureC")}
                        />
                        <NumberInput
                            label="Resp. Rate (breaths/min)"
                            placeholder="16"
                            size="sm"
                            min={4}
                            max={60}
                            leftSection={<IconLungs size={16} />}
                            key={form.key("respiratoryRate")}
                            {...form.getInputProps("respiratoryRate")}
                        />
                    </Group>

                    {/* Blood Glucose */}
                    <NumberInput
                        label="Blood Glucose (mg/dL)"
                        placeholder="100"
                        size="sm"
                        min={10}
                        max={800}
                        leftSection={<IconTestPipe size={16} />}
                        key={form.key("glucoseMgdl")}
                        {...form.getInputProps("glucoseMgdl")}
                    />

                    {/* Weight & Height */}
                    <Group grow gap="sm">
                        <NumberInput
                            label="Weight (kg)"
                            placeholder="70"
                            size="sm"
                            min={1}
                            max={500}
                            decimalScale={1}
                            step={0.1}
                            leftSection={<IconScale size={16} />}
                            key={form.key("weightKg")}
                            {...form.getInputProps("weightKg")}
                        />
                        <NumberInput
                            label="Height (cm)"
                            placeholder="170"
                            size="sm"
                            min={30}
                            max={300}
                            decimalScale={1}
                            step={0.1}
                            leftSection={<IconRulerMeasure size={16} />}
                            key={form.key("heightCm")}
                            {...form.getInputProps("heightCm")}
                        />
                    </Group>

                    <Button
                        type="submit"
                        loading={addMutation.isPending}
                        color="primary"
                        fullWidth
                        mt="xs"
                    >
                        Save Vitals
                    </Button>
                </Stack>
            </form>
        </Modal>
    );
}
